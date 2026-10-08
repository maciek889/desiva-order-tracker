"use client";
import { useState, useEffect } from "react";
import { api, fmtPLN, fmtDate, fmtTime, canViewField, lookupName } from "@/lib/client";
import { Badge, Modal, Btn, Field } from "@/components/ui";
import { Edit, Trash2, X } from "lucide-react";
import type { Order, Stage, Category, Color, UserRole, TimeEntry, OrderFile } from "@/lib/types";

interface OrderDetailModalProps {
  order: Order;
  stages: Stage[];
  categories: Category[];
  colors: Color[];
  onClose: () => void;
  onUpdated: () => void;
  userRole?: UserRole;
  allowDelete?: boolean;
}

export default function OrderDetailModal({ order, stages, categories, colors, onClose, onUpdated, userRole, allowDelete = false }: OrderDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: order.name, price: String(order.price), client: order.client, internalCode: order.internalCode || "",
    colorId: order.colorId, stageId: order.stageId, categoryId: order.categoryId,
    uwagi: order.uwagi || "", notatki: order.notatki || "",
    dueDate: order.dueDate ? new Date(order.dueDate).toISOString().split("T")[0] : "",
    isCustomOrder: order.isCustomOrder || false,
  });
  const [detail, setDetail] = useState<Order | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    api(`/api/orders/${order.id}`).then(setDetail).catch(console.error);
  }, [order.id]);

  const handleSave = async () => {
    await api(`/api/orders/${order.id}`, { method: "PATCH", body: JSON.stringify(form) });
    onUpdated();
  };

  const timeEntries = detail?.timeEntries || [];
  const totalTime = timeEntries.reduce((s: number, t: TimeEntry) => s + t.duration, 0);
  const totalCost = timeEntries.reduce((s: number, t: TimeEntry) => s + t.cost, 0);

  return (
    <Modal title={editing ? "Edytuj zamówienie" : order.name} onClose={onClose} width={560}>
      {editing ? (
        <>
          <Field label="Nazwa"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Kod wewnętrzny"><input value={form.internalCode} onChange={e => setForm({ ...form, internalCode: e.target.value })} placeholder="Opcjonalny kod wewnętrzny" /></Field>
          <div className="py-2">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={form.isCustomOrder} onChange={e => setForm({ ...form, isCustomOrder: e.target.checked })} />
              Na zamówienie
            </label>
          </div>
          {(canViewField("price", userRole) || canViewField("client", userRole)) && (
          <div className="grid grid-cols-2 gap-3">
            {canViewField("price", userRole) && <Field label="Cena (PLN)"><input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></Field>}
            {canViewField("client", userRole) && <Field label="Klient"><input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} /></Field>}
          </div>
          )}
          <Field label="Kategoria">
            <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Etap">
            <select value={form.stageId} onChange={e => setForm({ ...form, stageId: e.target.value })}>
              {stages.sort((a, b) => a.position - b.position).map((s) => <option key={s.id} value={s.id}>{s.position}. {s.name}</option>)}
            </select>
          </Field>
          <Field label="Kolor">
            <select value={form.colorId} onChange={e => setForm({ ...form, colorId: e.target.value })}>
              {colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Termin realizacji">
            <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
          <Field label="Uwagi">
            <textarea value={form.uwagi} onChange={e => setForm({ ...form, uwagi: e.target.value })} placeholder="Uwagi do zamówienia" rows={2} maxLength={300} />
          </Field>
          {canViewField("notatki", userRole) && (
            <Field label="Notatki">
              <textarea value={form.notatki} onChange={e => setForm({ ...form, notatki: e.target.value })} placeholder="Notatki wewnętrzne" rows={2} maxLength={300} />
            </Field>
          )}
          <div className="flex gap-3 mt-4">
            <Btn variant="ghost" onClick={() => setEditing(false)} className="flex-1">Anuluj</Btn>
            <Btn onClick={handleSave} className="flex-1">Zapisz</Btn>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>ID</span><span className="font-mono text-xs">{order.id}</span></div>
            {order.internalCode && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Kod wewnętrzny</span><span className="font-mono text-xs">{order.internalCode}</span></div>}
            {canViewField("client", userRole) && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Klient</span><span>{order.client}</span></div>}
            {canViewField("price", userRole) && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Cena</span><span className="font-semibold" style={{ color: "var(--accent)" }}>{fmtPLN(order.price)}</span></div>}
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Kategoria</span><span>{lookupName(categories, order.categoryId)}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Etap</span><Badge>{lookupName(stages, order.stageId)}</Badge></div>
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Kolor</span><span className="text-xs">{lookupName(colors, order.colorId)}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Data</span><span>{fmtDate(order.createdAt)}</span></div>
            {order.dueDate && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Termin</span><span>{fmtDate(order.dueDate)}</span></div>}
            {order.uwagi && <div className="text-sm"><span style={{ color: "var(--text-muted)" }}>Uwagi</span><div className="mt-1 text-xs whitespace-pre-wrap break-words">{order.uwagi}</div></div>}
            {canViewField("notatki", userRole) && order.notatki && <div className="text-sm"><span style={{ color: "var(--text-muted)" }}>Notatki</span><div className="mt-1 text-xs whitespace-pre-wrap break-words">{order.notatki}</div></div>}
          </div>

          {/* File upload */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2">Pliki ({(detail?.files || order.files)?.length || 0}/20)</h3>
            {(detail?.files || order.files)?.map((f: OrderFile) => (
              <div key={f.id} className="flex items-center justify-between text-xs p-2 rounded-lg mb-1" style={{ background: "var(--bg-secondary)" }}>
                <a href={`/api/files/${f.id}`} download={f.filename} className="hover:underline truncate mr-2" style={{ color: "var(--accent)" }}>{f.filename}</a>
                <div className="flex items-center gap-2 shrink-0">
                  <span style={{ color: "var(--text-muted)" }}>{(f.size / 1024).toFixed(1)} KB</span>
                  {(userRole === "Admin" || userRole === "Office") && (
                    deletingFileId === f.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={async () => {
                          await api(`/api/files`, { method: "DELETE", body: JSON.stringify({ fileId: f.id }) });
                          setDeletingFileId(null);
                          const refreshed = await api(`/api/orders/${order.id}`);
                          setDetail(refreshed);
                        }} className="text-red-500 hover:text-red-700 text-xs font-medium">Usuń</button>
                        <button onClick={() => setDeletingFileId(null)} className="hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingFileId(f.id)} className="hover:text-red-500 transition-colors" style={{ color: "var(--text-muted)" }}>
                        <Trash2 size={14} />
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
            {((detail?.files || order.files)?.length || 0) < 20 && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const input = (e.target as HTMLFormElement).querySelector('input[type="file"]') as HTMLInputElement;
                if (!input.files || input.files.length === 0) return;
                const files = Array.from(input.files);
                const maxFiles = 20 - ((detail?.files || order.files)?.length || 0);
                const filesToUpload = files.filter(f => {
                  if (f.size > 20 * 1024 * 1024) {
                    alert(`Plik "${f.name}" przekracza 20MB i został pominięty`);
                    return false;
                  }
                  return true;
                }).slice(0, maxFiles);
                if (filesToUpload.length === 0) return;

                const totalSize = filesToUpload.reduce((s, f) => s + f.size, 0);
                const loaded: number[] = new Array(filesToUpload.length).fill(0);
                setUploadProgress(0);

                const uploadFile = (file: File, index: number): Promise<void> =>
                  new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("POST", "/api/files");
                    xhr.upload.onprogress = (ev) => {
                      if (ev.lengthComputable) {
                        loaded[index] = ev.loaded;
                        const totalLoaded = loaded.reduce((s, v) => s + v, 0);
                        setUploadProgress(Math.round((totalLoaded / totalSize) * 100));
                      }
                    };
                    xhr.onload = () => { loaded[index] = file.size; resolve(); };
                    xhr.onerror = () => reject(new Error(`Upload failed: ${file.name}`));
                    const fd = new FormData();
                    fd.append("orderId", order.id);
                    fd.append("file", file);
                    xhr.send(fd);
                  });

                for (let i = 0; i < filesToUpload.length; i++) {
                  await uploadFile(filesToUpload[i], i);
                }

                setUploadProgress(null);
                input.value = "";
                const refreshed = await api(`/api/orders/${order.id}`);
                setDetail(refreshed);
              }}>
                <div className="flex gap-2 mt-2">
                  <input type="file" multiple className="text-xs" disabled={uploadProgress !== null} />
                  <Btn type="submit" size="sm" disabled={uploadProgress !== null}>Wyślij</Btn>
                </div>
                {uploadProgress !== null && (
                  <div className="mt-2 w-full rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)", height: 8 }}>
                    <div className="h-full rounded-full bg-black transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
              </form>
            )}
          </div>

          {timeEntries.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Historia pracy</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {timeEntries.map((te: TimeEntry) => (
                  <div key={te.id} className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                    <div>
                      <span className="font-medium">{te.user?.login}</span>
                      <span className="mx-2" style={{ color: "var(--text-muted)" }}>·</span>
                      <span style={{ color: "var(--text-muted)" }}>{te.stage?.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{fmtTime(te.duration)}</span>
                      {canViewField("laborCost", userRole) && <span style={{ color: "var(--accent)" }}>{fmtPLN(te.cost)}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 text-sm font-semibold" style={{ borderTop: "1px solid var(--border)" }}>
                <span>Razem: {fmtTime(totalTime)}</span>
                {canViewField("laborCost", userRole) && <span style={{ color: "var(--accent)" }}>{fmtPLN(totalCost)}</span>}
              </div>
            </div>
          )}

          <Btn onClick={() => setEditing(true)} className="w-full"><Edit size={16} /> Edytuj zamówienie</Btn>
          {allowDelete && userRole === "Admin" && (
            deleting ? (
              <div className="flex gap-3 mt-3">
                <Btn variant="ghost" onClick={() => setDeleting(false)} className="flex-1">Anuluj</Btn>
                <Btn variant="danger" onClick={async () => {
                  try {
                    await api(`/api/orders/${order.id}`, { method: "DELETE" });
                    onUpdated();
                  } catch (e) { console.error(e); setDeleting(false); }
                }} className="flex-1"><Trash2 size={16} /> Potwierdź usunięcie</Btn>
              </div>
            ) : (
              <Btn variant="danger" onClick={() => setDeleting(true)} className="w-full mt-3"><Trash2 size={16} /> Usuń zamówienie</Btn>
            )
          )}
        </>
      )}
    </Modal>
  );
}
