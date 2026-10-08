"use client";
import { useEffect, useState } from "react";
import { useFetch, api, fmtPLN } from "@/lib/client";
import { Card, Btn, Badge, Field, Loader } from "@/components/ui";
import { Layers, Tag, Palette, Users, Plus, Edit, Trash2, Search, ChevronUp, ChevronDown } from "lucide-react";
import type { Stage, Category, Color, User } from "@/lib/types";

export default function SettingsPage() {
  const [tab, setTab] = useState("stages");
  const tabs = [
    { id: "stages", label: "Etapy", icon: Layers },
    { id: "categories", label: "Kategorie", icon: Tag },
    { id: "colors", label: "Kolory", icon: Palette },
    { id: "users", label: "Pracownicy", icon: Users },
  ];

  return (
    <div className="max-w-4xl">
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all"
            style={{ background: tab === t.id ? "var(--bg-card)" : "transparent", color: tab === t.id ? "var(--text-primary)" : "var(--text-muted)" }}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>
      {tab === "stages" && <StagesTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "colors" && <ColorsTab />}
      {tab === "users" && <UsersTab />}
    </div>
  );
}

function StagesTab() {
  const { data: stages, loading, refetch } = useFetch<Stage[]>("/api/stages");
  const [orderedStages, setOrderedStages] = useState<Stage[]>([]);
  const [form, setForm] = useState({ name: "", nameEn: "", type: "factory" });
  const [editId, setEditId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    if (stages) setOrderedStages(stages);
  }, [stages]);

  if (loading || !stages) return <Loader />;

  const displayStages = orderedStages.length === stages.length ? orderedStages : stages;

  const handleSave = async () => {
    if (!form.name) return;
    if (editId) {
      await api("/api/stages", { method: "PUT", body: JSON.stringify({ id: editId, ...form, position: stages.find(s => s.id === editId)?.position }) });
    } else {
      await api("/api/stages", { method: "POST", body: JSON.stringify(form) });
    }
    setForm({ name: "", nameEn: "", type: "factory" });
    setEditId(null);
    refetch();
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (isReordering) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= displayStages.length) return;

    const nextStages = [...displayStages];
    [nextStages[index], nextStages[targetIndex]] = [nextStages[targetIndex], nextStages[index]];
    setOrderedStages(nextStages);
    setIsReordering(true);

    try {
      await api("/api/stages/reorder", {
        method: "PUT",
        body: JSON.stringify(nextStages.map((stage) => stage.id)),
      });
      refetch();
    } catch (error) {
      console.error(error);
      setOrderedStages(displayStages);
    } finally {
      setIsReordering(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api("/api/stages", { method: "DELETE", body: JSON.stringify({ id }) });
    refetch();
  };

  return (
    <Card>
      <div className="space-y-2 mb-6">
        {displayStages.map((s, index) => (
          <div key={s.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono w-6 text-center" style={{ color: "var(--text-muted)" }}>{index + 1}</span>
              <span className="text-sm font-medium">{s.name}</span>
              <Badge color={s.type === "office" ? "var(--blue)" : "var(--orange)"}>{s.type}</Badge>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleMove(index, "up")}
                disabled={index === 0 || isReordering}
                title="Przesun w gore"
                className="p-1.5 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: "var(--text-muted)" }}
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => handleMove(index, "down")}
                disabled={index === displayStages.length - 1 || isReordering}
                title="Przesun w dol"
                className="p-1.5 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: "var(--text-muted)" }}
              >
                <ChevronDown size={14} />
              </button>
              <button onClick={() => { setEditId(s.id); setForm({ name: s.name, nameEn: s.nameEn, type: s.type }); }}
                className="p-1.5 rounded" style={{ color: "var(--text-muted)" }}><Edit size={14} /></button>
              <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded" style={{ color: "var(--red)" }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nazwa etapu" className="flex-1" />
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ width: 120 }}>
          <option value="office">Biuro</option>
          <option value="factory">Produkcja</option>
        </select>
        <Btn onClick={handleSave}>{editId ? "Zapisz" : <><Plus size={14} /> Dodaj</>}</Btn>
      </div>
    </Card>
  );
}

function CategoriesTab() {
  const { data: categories, loading, refetch } = useFetch<Category[]>("/api/categories");
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  if (loading || !categories) return <Loader />;

  const handleSave = async () => {
    if (!name) return;
    if (editId) {
      await api("/api/categories", { method: "PUT", body: JSON.stringify({ id: editId, name }) });
      setEditId(null);
    } else {
      await api("/api/categories", { method: "POST", body: JSON.stringify({ name }) });
    }
    setName("");
    refetch();
  };

  return (
    <Card>
      <div className="space-y-2 mb-6">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
            <span className="text-sm font-medium">{c.name}</span>
            <div className="flex gap-2">
              <button onClick={() => { setEditId(c.id); setName(c.name); }} className="p-1.5 rounded" style={{ color: "var(--text-muted)" }}><Edit size={14} /></button>
              <button onClick={async () => { await api("/api/categories", { method: "DELETE", body: JSON.stringify({ id: c.id }) }); refetch(); }}
                className="p-1.5 rounded" style={{ color: "var(--red)" }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nazwa kategorii" className="flex-1" />
        <Btn onClick={handleSave}>{editId ? "Zapisz" : <><Plus size={14} /> Dodaj</>}</Btn>
      </div>
    </Card>
  );
}

function ColorsTab() {
  const { data: colors, loading, refetch } = useFetch<Color[]>("/api/colors");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");

  if (loading || !colors) return <Loader />;

  const filtered = colors.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj kolorów..." className="pl-10" />
      </div>
      <div className="max-h-80 overflow-y-auto space-y-1 mb-4">
        {filtered.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-2 rounded-lg text-sm" style={{ background: "var(--bg-secondary)" }}>
            <span className="text-xs">{c.name}</span>
            <button onClick={async () => { await api("/api/colors", { method: "DELETE", body: JSON.stringify({ id: c.id }) }); refetch(); }}
              className="p-1 rounded" style={{ color: "var(--red)" }}><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nowy kolor NCS" className="flex-1" />
        <Btn onClick={async () => { if (name) { await api("/api/colors", { method: "POST", body: JSON.stringify({ name }) }); setName(""); refetch(); } }}>
          <Plus size={14} /> Dodaj
        </Btn>
      </div>
    </Card>
  );
}

function UsersTab() {
  const { data: users, loading, refetch } = useFetch<User[]>("/api/users");
  const [form, setForm] = useState({ login: "", password: "", role: "Worker", hourlyRate: "0" });
  const [editId, setEditId] = useState<string | null>(null);

  if (loading || !users) return <Loader />;

  const handleSave = async () => {
    if (!form.login) return;
    if (editId) {
      const body: Record<string, string> = { id: editId, login: form.login, role: form.role, hourlyRate: form.hourlyRate };
      if (form.password) body.password = form.password;
      await api("/api/users", { method: "PUT", body: JSON.stringify(body) });
      setEditId(null);
    } else {
      if (!form.password) return;
      await api("/api/users", { method: "POST", body: JSON.stringify(form) });
    }
    setForm({ login: "", password: "", role: "Worker", hourlyRate: "0" });
    refetch();
  };

  return (
    <Card>
      <div className="space-y-2 mb-6">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--accent)", color: "#fff" }}>{u.login[0]}</div>
              <div>
                <div className="text-sm font-medium">{u.login}</div>
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <Badge color={u.role === "Admin" ? "var(--red)" : u.role === "Office" ? "var(--blue)" : "var(--green)"}>{u.role}</Badge>
                  {u.hourlyRate > 0 && <span>{fmtPLN(u.hourlyRate)}/h</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setEditId(u.id); setForm({ login: u.login, password: "", role: u.role, hourlyRate: String(u.hourlyRate) }); }}
                className="p-1.5 rounded" style={{ color: "var(--text-muted)" }}><Edit size={14} /></button>
              {u.role !== "Admin" && (
                <button onClick={async () => { await api("/api/users", { method: "DELETE", body: JSON.stringify({ id: u.id }) }); refetch(); }}
                  className="p-1.5 rounded" style={{ color: "var(--red)" }}><Trash2 size={14} /></button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <input value={form.login} onChange={e => setForm({ ...form, login: e.target.value })} placeholder="Login" />
        <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editId ? "Nowe hasło (puste = bez zmian)" : "Hasło"} />
        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
          <option value="Admin">Admin</option>
          <option value="Office">Biuro</option>
          <option value="Worker">Pracownik</option>
        </select>
        <input type="number" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })} placeholder="Stawka PLN/h" />
      </div>
      <Btn onClick={handleSave} className="w-full">{editId ? "Zapisz zmiany" : <><Plus size={14} /> Dodaj pracownika</>}</Btn>
    </Card>
  );
}
