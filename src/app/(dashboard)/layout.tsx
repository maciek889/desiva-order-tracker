"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/client";
import { Loader } from "@/components/ui";
import {
  LogOut, Menu, X, Building2, Factory, ClipboardList,
  Archive, LayoutDashboard, Settings, Users
} from "lucide-react";

const NAV = [
  { id: "office", path: "/office", label: "Śledzenie biuro", icon: Building2, roles: ["Admin", "Office"] },
  { id: "production", path: "/production", label: "Śledzenie produkcja", icon: Factory, roles: ["Admin", "Office"] },
  { id: "orders", path: "/orders", label: "Zamówienia", icon: ClipboardList, roles: ["Admin", "Office"] },
  { id: "archive", path: "/archive", label: "Archiwum", icon: Archive, roles: ["Admin"] },
  { id: "dashboard", path: "/dashboard", label: "Statystyki", icon: LayoutDashboard, roles: ["Admin"] },
  { id: "leady", path: "/leady", label: "Leady", icon: Users, roles: ["Admin"] },
  { id: "settings", path: "/settings", label: "Ustawienia", icon: Settings, roles: ["Admin"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user?.role === "Worker") router.push("/worker");
  }, [user, loading, router]);

  if (loading || !user) return <Loader />;

  const navItems = NAV.filter(n => n.roles.includes(user.role));

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed z-40 top-0 left-0 h-full transition-all duration-300 flex flex-col ${sidebarOpen ? "w-64" : "w-0 overflow-hidden"}`}
        style={{ background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)" }}>
        <div className="p-5 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: "var(--accent)" }}>DV</div>
          <div>
            <div className="font-semibold text-sm">Desiva</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Zarządzanie</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(n => {
            const active = pathname === n.path;
            return (
              <button key={n.id} onClick={() => router.push(n.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
                style={{ background: active ? "var(--bg-active)" : "transparent", color: active ? "var(--accent)" : "var(--text-secondary)", fontWeight: active ? 600 : 400 }}>
                <n.icon size={18} /><span>{n.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--accent)", color: "#fff" }}>
              {user.login[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.login}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{user.role}</div>
            </div>
            <button onClick={logout} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: "var(--text-muted)" }}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <header className="sticky top-0 z-30 flex items-center gap-3 px-6 py-4"
          style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg" style={{ color: "var(--text-muted)" }}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <h1 className="text-lg font-semibold">{navItems.find(n => pathname === n.path)?.label || ""}</h1>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
