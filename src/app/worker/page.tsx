"use client";
import { useState, useEffect } from "react";
import { useFetch, useAuth, api, canViewField, useSSE } from "@/lib/client";
import { Badge, Loader } from "@/components/ui";
import { Clock, Users, AlertTriangle } from "lucide-react";
import WorkerOrderModal from "@/components/WorkerOrderModal";
import type { PaginatedOrders, Stage, Category, Color, Order, TimeEntry, GlobalTimer } from "@/lib/types";

export default function WorkerPage() {
  const { user } = useAuth();
  const { data: stages } = useFetch<Stage[]>("/api/stages");
  const { data: ordersData, refetch: refetchOrders } = useFetch<PaginatedOrders>("/api/orders?status=active&limit=0");
  const { data: activeTimers, refetch: refetchTimers } = useFetch<TimeEntry[]>("/api/timer/active");
  const { data: allActiveTimers, refetch: refetchAllTimers } = useFetch<GlobalTimer[]>("/api/timer/active-all");
  const { data: categories } = useFetch<Category[]>("/api/categories");
  const { data: colors } = useFetch<Color[]>("/api/colors");
  const [selected, setSelected] = useState<Order | null>(null);
  const [detail, setDetail] = useState<Order | null>(null);
  const [tick, setTick] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  // Tick every second for timer display
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // Real-time sync via SSE
  useSSE((event) => {
    if (event === "timers:changed") {
      refetchTimers();
      refetchAllTimers();
    }
    if (event === "orders:changed") {
      refetchOrders();
      refetchAllTimers();
    }
  });

  const orders = ordersData?.orders;
  if (!stages || !orders || !activeTimers || !allActiveTimers) return <Loader />;

  const factoryStages = stages.filter((s) => s.type === "factory").sort((a, b) => a.position - b.position);
  const activeOrders = orders.filter((o) => factoryStages.some((s) => s.id === o.stageId));

  // My personal timer (for start/pause/complete controls)
  const isOverdue = (order: Order) => {
    if (!order.dueDate) return false;
    return new Date(order.dueDate) < new Date(new Date().toDateString());
  };

  const getActiveTimer = (orderId: string) => activeTimers.find((t) => t.orderId === orderId);

  // All workers currently active on a given order
  const getGlobalWorkers = (orderId: string): GlobalTimer[] =>
    allActiveTimers.filter((t) => t.orderId === orderId);

  const getTimerDisplay = (orderId: string) => {
    const timer = getActiveTimer(orderId);
    if (!timer) return null;
    const elapsed = Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleStart = async (orderId: string) => {
    setActionLoading(true);
    try {
      await api("/api/timer/start", { method: "POST", body: JSON.stringify({ orderId }) });
      await Promise.all([refetchTimers(), refetchAllTimers()]);
    } catch (e) { alert(e instanceof Error ? e.message : "Błąd"); }
    setActionLoading(false);
  };

  const handlePause = async (orderId: string) => {
    setActionLoading(true);
    try {
      await api("/api/timer/pause", { method: "POST", body: JSON.stringify({ orderId }) });
      await Promise.all([refetchTimers(), refetchAllTimers()]);
    } catch (e) { alert(e instanceof Error ? e.message : "Błąd"); }
    setActionLoading(false);
  };

  const handleComplete = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await api("/api/timer/complete", { method: "POST", body: JSON.stringify({ orderId }) });
      await Promise.all([refetchTimers(), refetchAllTimers()]);
      await refetchOrders();
      setSelected(null);
      if (res.completed) alert("Zamówienie zakończone i przeniesione do archiwum!");
    } catch (e) { alert(e instanceof Error ? e.message : "Błąd"); }
    setActionLoading(false);
  };


  const openDetail = async (order: Order) => {
    setSelected(order);
    try {
      const d = await api(`/api/orders/${order.id}`);
      setDetail(d);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-6">
      <style>{`
        @media (min-width: 768px) and (orientation: landscape) {
          .worker-kanban { grid-template-columns: repeat(${factoryStages.length}, minmax(200px, 1fr)) !important; }
        }
      `}</style>
      <div className="worker-kanban grid gap-4 grid-cols-1">
        {factoryStages.map((stage) => {
          const stageOrders = activeOrders.filter((o) => o.stageId === stage.id);
          return (
            <div key={stage.id} className="rounded-xl p-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{stage.name}</span>
                <Badge>{stageOrders.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {stageOrders.map((order) => {
                  const myTimer = !!getActiveTimer(order.id);
                  const timerText = getTimerDisplay(order.id);
                  const globalWorkers = getGlobalWorkers(order.id);
                  const anyoneWorking = globalWorkers.length > 0;
                  const overdue = isOverdue(order);
                  return (
                    <div key={order.id} className="rounded-lg p-3 cursor-pointer transition-all hover:scale-[1.02]"
                      style={{ background: "var(--bg-card)", border: overdue ? "1px solid var(--red, #ef4444)" : anyoneWorking ? "1px solid var(--green)" : "1px solid var(--border)" }}
                      onClick={() => openDetail(order)}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm font-medium flex-1">{order.name}</span>
                        {overdue && <AlertTriangle size={14} style={{ color: "var(--red, #ef4444)" }} />}
                      </div>
                      {order.internalCode && <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{order.internalCode}</div>}
                      {order.isCustomOrder && <span className="text-xs font-bold text-red-600">NZ</span>}
                      {canViewField("client", user?.role) && <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{order.client}</div>}
                      {order.uwagi && <div className="text-xs mb-2 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{order.uwagi}</div>}
                      <div className="flex items-center justify-between gap-2">
                        {/* My personal timer display */}
                        {timerText ? (
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} style={{ color: "var(--green)" }} />
                            <span className="text-xs font-mono" style={{ color: "var(--green)" }}>{timerText}</span>
                          </div>
                        ) : <div />}
                        {/* Global workers indicator — bottom right */}
                        {anyoneWorking && (
                          <div className="flex items-center gap-1" style={{ maxWidth: "55%" }}>
                            <Users size={11} className="flex-shrink-0" style={{ color: "var(--green)" }} />
                            <span className="text-xs truncate" style={{ color: "var(--green)", maxWidth: 120 }}>
                              {globalWorkers.length <= 2
                                ? globalWorkers.map(w => w.user.login).join(", ")
                                : `${globalWorkers.slice(0, 2).map(w => w.user.login).join(", ")} +${globalWorkers.length - 2}`
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {stageOrders.length === 0 && (
                  <div className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>Brak zamówień</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <WorkerOrderModal
          order={selected}
          detail={detail}
          stages={stages}
          categories={categories!}
          colors={colors!}
          userRole={user?.role}
          hasTimer={!!getActiveTimer(selected.id)}
          timerText={getTimerDisplay(selected.id)}
          globalWorkers={getGlobalWorkers(selected.id)}
          actionLoading={actionLoading}
          onClose={() => { setSelected(null); setDetail(null); }}
          onStart={handleStart}
          onPause={handlePause}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
