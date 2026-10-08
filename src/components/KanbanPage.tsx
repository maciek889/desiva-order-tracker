"use client";
import { useFetch, useAuth, useSSE } from "@/lib/client";
import { Loader } from "@/components/ui";
import KanbanBoard from "@/components/KanbanBoard";
import type { PaginatedOrders, Stage, Category, Color, GlobalTimer } from "@/lib/types";

interface KanbanPageProps {
  type: "office" | "factory";
}

export default function KanbanPage({ type }: KanbanPageProps) {
  const { user } = useAuth();
  const { data: ordersData, loading: lo, refetch: refetchOrders } = useFetch<PaginatedOrders>("/api/orders?status=active&limit=0");
  const { data: stages, loading: ls } = useFetch<Stage[]>("/api/stages");
  const { data: categories } = useFetch<Category[]>("/api/categories");
  const { data: colors } = useFetch<Color[]>("/api/colors");
  const { data: allActiveTimers, refetch: refetchTimers } = useFetch<GlobalTimer[]>("/api/timer/active-all");

  // Real-time sync via SSE
  useSSE((event) => {
    if (event === "timers:changed") {
      refetchTimers();
    }
    if (event === "orders:changed") {
      refetchOrders();
      refetchTimers();
    }
  });

  const orders = ordersData?.orders;

  if (lo || ls || !orders || !stages || !categories || !colors) return <Loader />;

  return (
    <KanbanBoard type={type} stages={stages} orders={orders}
      categories={categories} colors={colors} onRefresh={() => { refetchOrders(); refetchTimers(); }}
      userRole={user?.role} activeTimers={allActiveTimers || []} />
  );
}
