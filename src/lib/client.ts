"use client";
import { useState, useEffect, useCallback, useContext, createContext, useRef } from "react";
// Note: AuthProvider lives in src/app/providers.tsx (needs .tsx for JSX)
import type { User, UserRole } from "@/lib/types";

// --- API helper ---
export async function api(path: string, options?: RequestInit) {
  const isFormData = options?.body instanceof FormData;
  const headers: Record<string, string> = isFormData ? {} : { "Content-Type": "application/json" };
  const res = await fetch(path, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Błąd serwera");
  return data;
}

// --- Auth Context ---
export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

// --- Hooks ---
export function useFetch<T>(path: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const depsKey = JSON.stringify(deps);

  const refetch = useCallback(() => {
    setLoading(true);
    api(path).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [path]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refetch(); }, [refetch, depsKey]);

  return { data, loading, refetch };
}

export function useSSE(onEvent: (event: string) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let retryDelay = 1000;

    function connect() {
      es = new EventSource("/api/events/stream");

      es.onmessage = (e) => {
        retryDelay = 1000;
        onEventRef.current(e.data);
      };

      es.onerror = () => {
        es?.close();
        retryTimeout = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000);
          connect();
        }, retryDelay);
      };
    }

    connect();

    return () => {
      es?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);
}

// --- Formatters ---
export function fmtPLN(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n);
}

export function fmtDate(d: string | Date) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
}

export function fmtTime(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// --- Lookup helpers ---
export function lookupName(items: { id: string; name: string }[], id: string): string {
  return items.find((item) => item.id === id)?.name || id;
}

// --- Field visibility ---
const RESTRICTED_FIELDS: Record<string, string[]> = {
  client: ["Admin", "Office"],
  price: ["Admin", "Office"],
  notatki: ["Admin", "Office"],
  laborCost: ["Admin"],
};

export function canViewField(field: string, role?: UserRole): boolean {
  const allowed = RESTRICTED_FIELDS[field];
  if (!allowed) return true;
  return !!role && allowed.includes(role);
}
