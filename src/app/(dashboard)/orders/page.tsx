"use client";
import { useState, useEffect, useRef } from "react";
import { useFetch, useAuth, fmtPLN, fmtDate, canViewField, lookupName } from "@/lib/client";
import { Badge, Card, Btn, Loader } from "@/components/ui";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import OrderDetailModal from "@/components/OrderDetailModal";
import type { PaginatedOrders, Stage, Category, Color, Order } from "@/lib/types";

export default function OrdersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data: ordersData, loading, refetch } = useFetch<PaginatedOrders>(`/api/orders?status=active&search=${debouncedSearch}&page=${page}&limit=50`, [debouncedSearch, page]);
  const { data: stages } = useFetch<Stage[]>("/api/stages");
  const { data: categories } = useFetch<Category[]>("/api/categories");
  const { data: colors } = useFetch<Color[]>("/api/colors");
  const [selected, setSelected] = useState<Order | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const orders = ordersData?.orders;
  const totalPages = ordersData?.totalPages || 1;
  const total = ordersData?.total || 0;

  if (!orders || !stages || !categories || !colors) return <Loader />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj zamówień..."
            className="pl-10" style={{ background: "var(--bg-secondary)" }} />
        </div>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {[
                  { key: "id", label: "ID" }, { key: "name", label: "Nazwa" },
                  { key: "internalCode", label: "Kod wewnętrzny" },
                  { key: "client", label: "Klient" }, { key: "category", label: "Kategoria" },
                  { key: "stage", label: "Etap" }, { key: "price", label: "Cena" },
                  { key: "date", label: "Data" },
                ].filter(c => canViewField(c.key, user?.role)).map(c => (
                  <th key={c.key} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order: Order) => (
                <tr key={order.id} className="cursor-pointer transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                  onClick={() => setSelected(order)}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>{order.id}</td>
                  <td className="px-4 py-3 font-medium">{order.name}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>{order.internalCode || "—"}</td>
                  {canViewField("client", user?.role) && <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{order.client}</td>}
                  <td className="px-4 py-3"><Badge>{lookupName(categories, order.categoryId)}</Badge></td>
                  <td className="px-4 py-3"><Badge color="var(--blue)">{lookupName(stages, order.stageId)}</Badge></td>
                  {canViewField("price", user?.role) && <td className="px-4 py-3 font-semibold" style={{ color: "var(--accent)" }}>{fmtPLN(order.price)}</td>}
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{fmtDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>Brak zamówień</div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {total} zamówień · Strona {page} z {totalPages}
            </span>
            <div className="flex gap-2">
              <Btn size="sm" variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft size={14} />
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                <ChevronRight size={14} />
              </Btn>
            </div>
          </div>
        )}
      </Card>

      {selected && (
        <OrderDetailModal
          order={selected}
          stages={stages}
          categories={categories}
          colors={colors}
          userRole={user?.role}
          allowDelete
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); refetch(); }}
        />
      )}
    </div>
  );
}
