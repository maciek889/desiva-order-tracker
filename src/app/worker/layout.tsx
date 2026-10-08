"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/client";
import { Loader } from "@/components/ui";
import { LogOut } from "lucide-react";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "Worker") router.push("/office");
  }, [user, loading, router]);

  if (loading || !user) return <Loader />;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <header className="flex items-center justify-between px-6 py-4" style={{ background: "var(--bg-sidebar)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: "var(--accent)" }}>DV</div>
          <div>
            <span className="font-semibold text-sm">Widok Pracownika</span>
            <span className="text-xs ml-3" style={{ color: "var(--text-muted)" }}>{user.login}</span>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>
          <LogOut size={16} /> Wyloguj
        </button>
      </header>
      {children}
    </div>
  );
}
