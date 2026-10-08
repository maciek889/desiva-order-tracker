"use client";
import { fmtPLN, canViewField, lookupName } from "@/lib/client";
import { Badge, Modal, Btn } from "@/components/ui";
import { Play, Pause, CheckCircle, Users } from "lucide-react";
import type { Order, Stage, Category, Color, UserRole, OrderFile, GlobalTimer } from "@/lib/types";

interface WorkerOrderModalProps {
  order: Order;
  detail: Order | null;
  stages: Stage[];
  categories: Category[];
  colors: Color[];
  userRole?: UserRole;
  hasTimer: boolean;
  timerText: string | null;
  globalWorkers: GlobalTimer[];
  actionLoading: boolean;
  onClose: () => void;
  onStart: (orderId: string) => void;
  onPause: (orderId: string) => void;
  onComplete: (orderId: string) => void;
}

export default function WorkerOrderModal({
  order, detail, stages, categories, colors, userRole,
  hasTimer, timerText, globalWorkers, actionLoading,
  onClose, onStart, onPause, onComplete,
}: WorkerOrderModalProps) {
  return (
    <Modal title={order.name} onClose={onClose}>
      <div className="space-y-3 mb-6">
        {canViewField("client", userRole) && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Klient</span><span>{order.client}</span></div>}
        {order.internalCode && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Kod wewnętrzny</span><span className="font-mono text-xs">{order.internalCode}</span></div>}
        {order.isCustomOrder && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Typ</span><span className="font-bold text-red-600">Na zamówienie</span></div>}
        {canViewField("price", userRole) && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Cena</span><span style={{ color: "var(--accent)" }}>{fmtPLN(order.price)}</span></div>}
        <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Kategoria</span><span>{lookupName(categories, order.categoryId)}</span></div>
        <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Etap</span><Badge>{lookupName(stages, order.stageId)}</Badge></div>
        <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Kolor</span><span className="text-xs">{lookupName(colors, order.colorId)}</span></div>
        {order.uwagi && <div className="text-sm"><span style={{ color: "var(--text-muted)" }}>Uwagi</span><div className="mt-1 text-xs whitespace-pre-wrap break-words">{order.uwagi}</div></div>}
      </div>

      {globalWorkers.length > 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: "var(--bg-secondary)", border: "1px solid var(--green)" }}>
          <Users size={14} className="flex-shrink-0" style={{ color: "var(--green)" }} />
          <div className="flex flex-wrap gap-1.5">
            {globalWorkers.map((w) => (
              <span key={w.id} className="text-xs px-2 py-0.5 rounded-full truncate" style={{ background: "var(--green)", color: "#fff", maxWidth: 120 }}>
                {w.user.login}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">Pliki ({detail?.files?.length || 0})</h3>
        {detail?.files?.map((f: OrderFile) => (
          <div key={f.id} className="flex items-center justify-between text-xs p-2 rounded-lg mb-1" style={{ background: "var(--bg-secondary)" }}>
            <a href={`/api/files/${f.id}`} download={f.filename} className="hover:underline" style={{ color: "var(--accent)" }}>{f.filename}</a>
            <span style={{ color: "var(--text-muted)" }}>{(f.size / 1024).toFixed(1)} KB</span>
          </div>
        ))}
        {(!detail?.files || detail.files.length === 0) && (
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>Brak plików</div>
        )}
      </div>

      <div className="text-center py-6 rounded-xl mb-6" style={{ background: "var(--bg-secondary)" }}>
        <div className="text-4xl font-mono font-bold mb-1" style={{ color: hasTimer ? "var(--green)" : "var(--text-primary)" }}>
          {timerText || "00:00:00"}
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          {hasTimer ? "W trakcie..." : "Gotowe do startu"}
        </div>
      </div>

      <div className="flex gap-3">
        {!hasTimer ? (
          <Btn onClick={() => onStart(order.id)} disabled={actionLoading} className="flex-1">
            <Play size={16} /> Start
          </Btn>
        ) : (
          <Btn onClick={() => onPause(order.id)} variant="ghost" disabled={actionLoading} className="flex-1">
            <Pause size={16} /> Pauza
          </Btn>
        )}
        <Btn onClick={() => onComplete(order.id)} variant="success" disabled={actionLoading} className="flex-1">
          <CheckCircle size={16} /> Zakończ etap
        </Btn>
      </div>
    </Modal>
  );
}
