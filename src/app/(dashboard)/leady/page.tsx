"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useFetch, api, fmtDate } from "@/lib/client";
import { Card, Modal, Btn, Field, Loader, Badge } from "@/components/ui";
import { Plus, Trash2, Search, Users, Edit } from "lucide-react";

interface Lead {
  id: string;
  customerName: string;
  orderName: string;
  email: string | null;
  phoneNumber: string | null;
  notes: string;
  stage: string;
  createdAt: string;
}

const STAGES = ["Nowy", "Kontakt", "Wycena", "Negocjacje", "Wygrana", "Przegrana"];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function LeadyPage() {
  const { data: leads, loading, refetch } = useFetch<Lead[]>("/api/leads");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  // Client-side filtering — leads are admin-only so the dataset is small.
  // Filtering on every debounced keystroke across all fields.
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (!debouncedSearch.trim()) return leads;
    const q = debouncedSearch.toLowerCase();
    return leads.filter((lead) =>
      lead.customerName.toLowerCase().includes(q) ||
      lead.orderName.toLowerCase().includes(q) ||
      lead.stage.toLowerCase().includes(q) ||
      fmtDate(lead.createdAt).includes(q) ||
      (lead.email && lead.email.toLowerCase().includes(q)) ||
      (lead.phoneNumber && lead.phoneNumber.toLowerCase().includes(q))
    );
  }, [leads, debouncedSearch]);

  const handleDelete = async (id: string) => {
    try {
      await api("/api/leads", { method: "DELETE", body: JSON.stringify({ id }) });
      setDeletingId(null);
      refetch();
    } catch (e) { alert(e instanceof Error ? e.message : "Błąd"); }
  };

  if (loading) return <Loader />;

  return (
    <div>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Users size={20} style={{ color: "var(--accent)" }} />
          <h2 className="text-lg font-semibold">Leady</h2>
          <Badge>{leads?.length || 0}</Badge>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj leada..."
              className="w-full sm:w-64 pl-9 pr-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
          <Btn onClick={() => setCreating(true)}>
            <Plus size={16} /> Dodaj Lead
          </Btn>
        </div>
      </div>

      {/* Lead cards */}
      {filteredLeads.length === 0 ? (
        <div className="text-center py-16">
          <Users size={40} className="mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            {debouncedSearch ? "Brak wyników dla podanego zapytania" : "Brak leadów — dodaj pierwszy!"}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-xl p-4 transition-all hover:scale-[1.005] cursor-pointer"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              onClick={() => setEditingLead(lead)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold truncate">{lead.customerName}</span>
                    <StageBadge stage={lead.stage} />
                  </div>
                  <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{lead.orderName}</div>
                  {(lead.email || lead.phoneNumber) && (
                    <div className="flex items-center gap-3 mt-1">
                      {lead.email && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{lead.email}</span>}
                      {lead.phoneNumber && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{lead.phoneNumber}</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{fmtDate(lead.createdAt)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeletingId(lead.id); }}
                    className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <CreateLeadModal
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); refetch(); }}
        />
      )}

      {/* Edit/detail modal */}
      {editingLead && (
        <EditLeadModal
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onUpdated={() => { setEditingLead(null); refetch(); }}
        />
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <Modal title="Potwierdź usunięcie" onClose={() => setDeletingId(null)} width={400}>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Czy na pewno chcesz usunąć tego leada? Tej operacji nie można cofnąć.
          </p>
          <div className="flex gap-3">
            <Btn variant="ghost" onClick={() => setDeletingId(null)} className="flex-1">Anuluj</Btn>
            <Btn variant="danger" onClick={() => handleDelete(deletingId)} className="flex-1">
              <Trash2 size={16} /> Usuń
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// --- Stage badge with color coding ---
function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    "Nowy":        { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
    "Kontakt":     { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
    "Wycena":      { bg: "#fefce8", text: "#ca8a04", border: "#fde68a" },
    "Negocjacje":  { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
    "Wygrana":     { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
    "Przegrana":   { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  };
  const c = colors[stage] || { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {stage}
    </span>
  );
}

// --- Create lead modal ---
function CreateLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    customerName: "",
    orderName: "",
    email: "",
    phoneNumber: "",
    notes: "",
    stage: "Nowy",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Nieprawidłowy format e-mail";
    }
    if (form.phoneNumber && !/^\+[1-9]\d{1,14}$/.test(form.phoneNumber)) {
      errs.phoneNumber = "Wymagany format: +48...";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!form.customerName || !form.orderName) return;
    if (!validate()) return;
    setSaving(true);
    try {
      await api("/api/leads", { method: "POST", body: JSON.stringify(form) });
      onCreated();
    } catch (e) { alert(e instanceof Error ? e.message : "Błąd"); }
    setSaving(false);
  };

  return (
    <Modal title="Dodaj Lead" onClose={onClose} width={480}>
      <Field label="Imię i nazwisko klienta">
        <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Jan Kowalski" />
      </Field>
      <Field label="Nazwa zamówienia">
        <input value={form.orderName} onChange={(e) => setForm({ ...form, orderName: e.target.value })} placeholder="Stolik dębowy 120x80" />
      </Field>
      <Field label="Etap">
        <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Adres e-mail">
          <input type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: "" }); }} placeholder="example@domain.com" />
          {errors.email && <span className="text-xs mt-1" style={{ color: "var(--red, #ef4444)" }}>{errors.email}</span>}
        </Field>
        <Field label="Tel. komórkowy">
          <input type="tel" value={form.phoneNumber} onChange={(e) => { setForm({ ...form, phoneNumber: e.target.value }); setErrors({ ...errors, phoneNumber: "" }); }} placeholder="+48123456789" />
          {errors.phoneNumber && <span className="text-xs mt-1" style={{ color: "var(--red, #ef4444)" }}>{errors.phoneNumber}</span>}
        </Field>
      </div>
      <Field label="Notatki">
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Dodatkowe informacje..." rows={3} />
      </Field>
      <div className="flex gap-3 mt-6">
        <Btn variant="ghost" onClick={onClose} className="flex-1">Anuluj</Btn>
        <Btn onClick={handleSubmit} disabled={saving} className="flex-1">{saving ? "Zapisywanie..." : "Dodaj Lead"}</Btn>
      </div>
    </Modal>
  );
}

// --- Edit lead modal (shows notes here) ---
function EditLeadModal({ lead, onClose, onUpdated }: { lead: Lead; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm] = useState({
    customerName: lead.customerName,
    orderName: lead.orderName,
    email: lead.email || "",
    phoneNumber: lead.phoneNumber || "",
    notes: lead.notes,
    stage: lead.stage,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Nieprawidłowy format e-mail";
    }
    if (form.phoneNumber && !/^\+[1-9]\d{1,14}$/.test(form.phoneNumber)) {
      errs.phoneNumber = "Wymagany format: +48...";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!form.customerName || !form.orderName) return;
    if (!validate()) return;
    setSaving(true);
    try {
      await api("/api/leads", { method: "PATCH", body: JSON.stringify({ id: lead.id, ...form }) });
      onUpdated();
    } catch (e) { alert(e instanceof Error ? e.message : "Błąd"); }
    setSaving(false);
  };

  return (
    <Modal title="Edytuj Lead" onClose={onClose} width={480}>
      <Field label="Imię i nazwisko klienta">
        <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
      </Field>
      <Field label="Nazwa zamówienia">
        <input value={form.orderName} onChange={(e) => setForm({ ...form, orderName: e.target.value })} />
      </Field>
      <Field label="Etap">
        <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Adres e-mail">
          <input type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: "" }); }} placeholder="example@domain.com" />
          {errors.email && <span className="text-xs mt-1" style={{ color: "var(--red, #ef4444)" }}>{errors.email}</span>}
        </Field>
        <Field label="Tel. komórkowy">
          <input type="tel" value={form.phoneNumber} onChange={(e) => { setForm({ ...form, phoneNumber: e.target.value }); setErrors({ ...errors, phoneNumber: "" }); }} placeholder="+48123456789" />
          {errors.phoneNumber && <span className="text-xs mt-1" style={{ color: "var(--red, #ef4444)" }}>{errors.phoneNumber}</span>}
        </Field>
      </div>
      <Field label="Notatki">
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Dodatkowe informacje..." rows={4} />
      </Field>
      <div className="text-xs mt-2 mb-4" style={{ color: "var(--text-muted)" }}>
        Utworzono: {fmtDate(lead.createdAt)}
      </div>
      <div className="flex gap-3">
        <Btn variant="ghost" onClick={onClose} className="flex-1">Anuluj</Btn>
        <Btn onClick={handleSave} disabled={saving} className="flex-1">
          <Edit size={16} /> {saving ? "Zapisywanie..." : "Zapisz"}
        </Btn>
      </div>
    </Modal>
  );
}
