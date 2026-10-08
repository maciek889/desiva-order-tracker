"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      // Full page reload so AuthProvider re-mounts and fetches fresh auth state
      window.location.href = data.user.role === "Worker" ? "/worker" : "/office";
    } catch {
      setError("Błąd połączenia");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4"
            style={{ background: "var(--accent)" }}>DV</div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Desiva</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Zarządzanie produkcją</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Login</label>
            <input value={login} onChange={e => setLogin(e.target.value)} placeholder="Nazwa użytkownika" autoFocus />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Hasło</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs mb-3" style={{ color: "var(--red)" }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg font-medium text-sm text-white transition-opacity disabled:opacity-50"
            style={{ background: "var(--accent)" }}>
            {loading ? "Logowanie..." : "Zaloguj się"}
          </button>
        </form>
      </div>
    </div>
  );
}
