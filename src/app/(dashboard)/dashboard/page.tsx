"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { api, fmtPLN, fmtDate } from "@/lib/client";
import { Card, Loader } from "@/components/ui";
import {
  Search, Package, CheckCircle2, AlertTriangle, TrendingUp,
  DollarSign, Wrench, Calendar,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// --- Types ---
interface StatsData {
  period: { from: string; to: string };
  kpis: {
    activeOrders: number;
    completedOrders: number;
    overdueOrders: number;
    totalRevenue: number;
    totalLaborCost: number;
    laborMargin: number;
    laborMarginPercent: number;
    avgCompletionDays: number;
  };
  stageBreakdown: {
    stageId: string; name: string; type: string;
    orderCount: number; totalTime: number; totalCost: number;
  }[];
  workerUtilization: {
    userId: string; login: string; totalTime: number;
    totalCost: number; orderCount: number; hourlyRate: number;
  }[];
  topCategories: {
    categoryId: string; name: string; orderCount: number; revenue: number;
  }[];
  topClients: {
    client: string; orderCount: number; revenue: number;
  }[];
  overdueOrders: {
    id: string; name: string; client: string;
    dueDate: string; stageName: string; daysOverdue: number;
  }[];
  trends: {
    date: string; created: number; completed: number; revenue: number;
  }[];
}

type Preset = "today" | "7d" | "30d" | "month" | null;

function getPresetDates(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];
  let from: Date;

  switch (preset) {
    case "today":
      from = new Date(now);
      break;
    case "7d":
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      break;
    case "month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "30d":
    default:
      from = new Date(now);
      from.setDate(from.getDate() - 30);
      break;
  }

  return { from: from.toISOString().split("T")[0], to };
}

// --- Tooltip Style ---
const tooltipStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 12,
};

// --- Main Component ---
export default function DashboardPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>("30d");
  const [from, setFrom] = useState(() => getPresetDates("30d").from);
  const [to, setTo] = useState(() => getPresetDates("30d").to);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const overdueRef = useRef<HTMLDivElement>(null);

  const fetchStats = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (search) params.set("search", search);
    api(`/api/stats?${params.toString()}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [from, to, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const handlePreset = (p: Preset) => {
    setPreset(p);
    const dates = getPresetDates(p);
    setFrom(dates.from);
    setTo(dates.to);
  };

  const handleCustomDate = (field: "from" | "to", value: string) => {
    setPreset(null);
    if (field === "from") setFrom(value);
    else setTo(value);
  };

  const presets: { id: Preset; label: string }[] = [
    { id: "today", label: "Dziś" },
    { id: "7d", label: "7 dni" },
    { id: "30d", label: "30 dni" },
    { id: "month", label: "Ten miesiąc" },
  ];

  if (loading && !data) return <Loader />;
  if (!data) return <Loader />;

  const { kpis, stageBreakdown, workerUtilization, topCategories, topClients, overdueOrders, trends } = data;

  const maxStageOrders = Math.max(...stageBreakdown.map((s) => s.orderCount), 1);

  return (
    <div className="space-y-6">
      {/* ========== CONTROL BAR ========== */}
      <div
        className="sticky top-[65px] z-20 -mx-6 px-6 py-3 flex flex-wrap items-center gap-3"
        style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border)" }}
      >
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            placeholder="Szukaj zamówienia..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm"
            style={{ width: 220 }}
          />
        </div>

        {/* Presets */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePreset(p.id)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: preset === p.id ? "var(--accent)" : "transparent",
                color: preset === p.id ? "#fff" : "var(--text-secondary)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={from}
            onChange={(e) => handleCustomDate("from", e.target.value)}
            className="text-xs py-1.5 px-2"
            style={{ width: 140 }}
          />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
          <input
            type="date"
            value={to}
            onChange={(e) => handleCustomDate("to", e.target.value)}
            className="text-xs py-1.5 px-2"
            style={{ width: 140 }}
          />
        </div>
      </div>

      {/* Loading overlay for refetches */}
      {loading && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      )}

      {/* ========== PRIMARY KPI CARDS ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: "rgba(59,130,246,0.1)" }}>
              <Package size={20} style={{ color: "var(--blue)" }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Aktywne zamówienia</div>
              <div className="text-2xl font-bold mt-0.5">{kpis.activeOrders}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: "rgba(34,197,94,0.1)" }}>
              <CheckCircle2 size={20} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Zrealizowane</div>
              <div className="text-2xl font-bold mt-0.5" style={{ color: "var(--green)" }}>{kpis.completedOrders}</div>
            </div>
          </div>
        </Card>

        <Card
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => overdueRef.current?.scrollIntoView({ behavior: "smooth" })}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)" }}>
              <AlertTriangle size={20} style={{ color: "var(--red)" }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Przeterminowane</div>
              <div className="text-2xl font-bold mt-0.5" style={{ color: "var(--red)" }}>{kpis.overdueOrders}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.06)" }}>
              <TrendingUp size={20} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Marża robocizny</div>
              <div className="text-2xl font-bold mt-0.5">{kpis.laborMarginPercent}%</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{fmtPLN(kpis.laborMargin)}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* ========== SECONDARY KPI CARDS ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.06)" }}>
              <DollarSign size={18} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Przychód</div>
              <div className="text-lg font-bold">{fmtPLN(kpis.totalRevenue)}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)" }}>
              <Wrench size={18} style={{ color: "var(--red)" }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Koszt robocizny</div>
              <div className="text-lg font-bold">{fmtPLN(kpis.totalLaborCost)}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: "rgba(59,130,246,0.1)" }}>
              <Calendar size={18} style={{ color: "var(--blue)" }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Śr. czas realizacji</div>
              <div className="text-lg font-bold">{kpis.avgCompletionDays} dni</div>
            </div>
          </div>
        </Card>
      </div>

      {/* ========== TRENDS CHART ========== */}
      <Card>
        <h3 className="text-sm font-semibold mb-4">Trend zamówień</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              tickFormatter={(d: string) => {
                const parts = d.split("-");
                return `${parts[2]}.${parts[1]}`;
              }}
            />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(d: string) => fmtDate(d)}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  created: "Utworzone",
                  completed: "Zrealizowane",
                };
                return [value, labels[name] || name];
              }}
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="var(--green)"
              fill="var(--green)"
              fillOpacity={0.15}
              strokeWidth={2}
              name="completed"
            />
            <Area
              type="monotone"
              dataKey="created"
              stroke="var(--accent)"
              fill="var(--accent)"
              fillOpacity={0.05}
              strokeWidth={2}
              name="created"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* ========== STAGES + WORKERS ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stage Breakdown */}
        <Card>
          <h3 className="text-sm font-semibold mb-4">Etapy produkcji — kolejka</h3>
          <div className="space-y-2">
            {stageBreakdown.map((s) => {
              const isBottleneck = s.orderCount === maxStageOrders && s.orderCount > 0;
              return (
                <div key={s.stageId}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--text-secondary)" }}>
                      {s.name}
                      <span
                        className="ml-1.5 text-[10px] uppercase font-medium"
                        style={{ color: s.type === "office" ? "var(--blue)" : "var(--orange)" }}
                      >
                        {s.type === "office" ? "biuro" : "produkcja"}
                      </span>
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: isBottleneck ? "var(--red)" : "var(--text-primary)" }}
                    >
                      {s.orderCount}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "var(--bg-secondary)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(s.orderCount / maxStageOrders) * 100}%`,
                        background: isBottleneck
                          ? "var(--red)"
                          : s.type === "office"
                          ? "var(--blue)"
                          : "var(--orange)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Worker Utilization */}
        <Card>
          <h3 className="text-sm font-semibold mb-4">Wykorzystanie pracowników</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Pracownik", "Godziny", "Koszt", "Zamówienia"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-xs font-semibold uppercase"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workerUtilization.map((w) => (
                  <tr key={w.userId} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: "var(--accent)", color: "#fff" }}
                        >
                          {w.login[0]}
                        </div>
                        <span className="font-medium">{w.login}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">{(w.totalTime / 60).toFixed(1)}h</td>
                    <td className="px-3 py-2.5" style={{ color: "var(--accent)" }}>
                      {fmtPLN(w.totalCost)}
                    </td>
                    <td className="px-3 py-2.5">{w.orderCount}</td>
                  </tr>
                ))}
                {workerUtilization.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-sm" style={{ color: "var(--text-muted)" }}>
                      Brak danych
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ========== CATEGORIES + CLIENTS ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Categories */}
        <Card>
          <h3 className="text-sm font-semibold mb-4">Top kategorie</h3>
          {topCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [fmtPLN(v), "Przychód"]}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {topCategories.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? "var(--accent)" : "var(--text-muted)"}
                      fillOpacity={i === 0 ? 1 : 0.4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Brak danych</p>
          )}
        </Card>

        {/* Top Clients */}
        <Card>
          <h3 className="text-sm font-semibold mb-4">Top klienci</h3>
          <div className="overflow-y-auto" style={{ maxHeight: 232 }}>
            {topClients.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Klient", "Zamówienia", "Przychód"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-2 text-xs font-semibold uppercase sticky top-0"
                        style={{ color: "var(--text-muted)", background: "var(--bg-card)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topClients.map((c, i) => (
                    <tr key={c.client} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-3 py-2.5 font-medium">
                        <span className="text-xs mr-2" style={{ color: "var(--text-muted)" }}>{i + 1}.</span>
                        {c.client}
                      </td>
                      <td className="px-3 py-2.5">{c.orderCount}</td>
                      <td className="px-3 py-2.5" style={{ color: "var(--accent)" }}>
                        {fmtPLN(c.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Brak danych</p>
            )}
          </div>
        </Card>
      </div>

      {/* ========== OVERDUE ORDERS ========== */}
      {overdueOrders.length > 0 && (
        <div ref={overdueRef}>
          <Card>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--red)" }}>
              <AlertTriangle size={14} className="inline mr-1.5 -mt-0.5" />
              Przeterminowane zamówienia ({overdueOrders.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["ID", "Nazwa", "Klient", "Etap", "Termin", "Dni po terminie"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-2 text-xs font-semibold uppercase"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overdueOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="transition-colors"
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: "rgba(239,68,68,0.04)",
                      }}
                    >
                      <td className="px-3 py-2.5 font-mono text-xs">{o.id}</td>
                      <td className="px-3 py-2.5 font-medium">{o.name}</td>
                      <td className="px-3 py-2.5">{o.client}</td>
                      <td className="px-3 py-2.5">{o.stageName}</td>
                      <td className="px-3 py-2.5">{fmtDate(o.dueDate)}</td>
                      <td className="px-3 py-2.5 font-bold" style={{ color: "var(--red)" }}>
                        {o.daysOverdue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
