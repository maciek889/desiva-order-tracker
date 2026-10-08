"use client";
import { useState, useEffect } from "react";
import { useFetch, useAuth, api, fmtPLN, fmtDate, fmtTime, canViewField, lookupName } from "@/lib/client";
import { Card, Modal, Btn, Loader } from "@/components/ui";
import { Search, Archive as ArchiveIcon, Trash2 } from "lucide-react";
import type { PaginatedOrders, Stage, Order, TimeEntry } from "@/lib/types";

export default function ArchivePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { data: ordersData, loading, refetch } = useFetch<PaginatedOrders>(`/api/orders?status=completed&search=${debouncedSearch}&limit=0`, [debouncedSearch]);
  const { data: stages } = useFetch<Stage[]>("/api/stages");
  const [selected, setSelected] = useState<Order | null>(null);
  const [detail, setDetail] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const orders = ordersData?.orders;
  if (!orders || !stages) return <Loader />;

  const openDetail = async (order: Order) => {
    setSelected(order);
    try {
      const d = await api(`/api/orders/${order.id}`);
      setDetail(d);
    } catch (e) { console.error(e); }
  };


  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj w archiwum..."
            className="pl-10" style={{ background: "var(--bg-secondary)" }} />
        </div>
      </div>

      {orders.length === 0 ? (
        <Card className="text-center py-16">
          <ArchiveIcon size={40} style={{ color: "var(--text-muted)", margin: "0 auto" }} />
          <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>Archiwum jest puste</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order: Order) => (
            <Card key={order.id} className="cursor-pointer hover:opacity-90 transition-opacity" onClick={() => openDetail(order)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{order.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{order.client} · {order.id}{order.internalCode ? ` · ${order.internalCode}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold" style={{ color: "var(--accent)" }}>{fmtPLN(order.price)}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Koszt: {fmtPLN(order.totalCost || 0)} · Czas: {fmtTime((order.totalOfficeTime || 0) + (order.totalFactoryTime || 0))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && detail && (
        <Modal title={`Archiwum: ${selected.name}`} onClose={() => { setSelected(null); setDetail(null); setDeleting(false); }} width={600}>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="text-center"><div className="text-xs" style={{ color: "var(--text-muted)" }}>Czas biuro</div><div className="text-lg font-bold mt-1">{fmtTime(detail.totalOfficeTime || 0)}</div></Card>
            <Card className="text-center"><div className="text-xs" style={{ color: "var(--text-muted)" }}>Czas produkcja</div><div className="text-lg font-bold mt-1">{fmtTime(detail.totalFactoryTime || 0)}</div></Card>
            <Card className="text-center"><div className="text-xs" style={{ color: "var(--text-muted)" }}>Koszt</div><div className="text-lg font-bold mt-1" style={{ color: "var(--accent)" }}>{fmtPLN(detail.totalCost || 0)}</div></Card>
          </div>
          <div className="space-y-3 mb-6">
            {detail.internalCode && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Kod wewnętrzny</span><span className="font-mono text-xs">{detail.internalCode}</span></div>}
            {detail.uwagi && <div className="text-sm"><span style={{ color: "var(--text-muted)" }}>Uwagi</span><div className="mt-1 text-xs whitespace-pre-wrap break-words">{detail.uwagi}</div></div>}
            {canViewField("notatki", user?.role) && detail.notatki && <div className="text-sm"><span style={{ color: "var(--text-muted)" }}>Notatki</span><div className="mt-1 text-xs whitespace-pre-wrap break-words">{detail.notatki}</div></div>}
          </div>
          {(detail.timeEntries?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Historia pracy</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {detail.timeEntries!.map((te: TimeEntry) => (
                  <div key={te.id} className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                    <div>
                      <span className="font-medium">{te.user?.login}</span>
                      <span className="mx-2" style={{ color: "var(--text-muted)" }}>·</span>
                      <span style={{ color: "var(--text-muted)" }}>{lookupName(stages!, te.stageId)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{fmtTime(te.duration)}</span>
                      <span style={{ color: "var(--accent)" }}>{fmtPLN(te.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {deleting ? (
            <div className="flex gap-3 mt-6">
              <Btn variant="ghost" onClick={() => setDeleting(false)} className="flex-1">Anuluj</Btn>
              <Btn variant="danger" onClick={async () => {
                try {
                  await api(`/api/orders/${selected.id}`, { method: "DELETE" });
                  setSelected(null); setDetail(null); setDeleting(false); refetch();
                } catch (e) { console.error(e); setDeleting(false); }
              }} className="flex-1"><Trash2 size={16} /> Potwierdź usunięcie</Btn>
            </div>
          ) : (
            <Btn variant="danger" onClick={() => setDeleting(true)} className="w-full mt-6"><Trash2 size={16} /> Usuń zamówienie</Btn>
          )}
        </Modal>
      )}
    </div>
  );
}
