"use client";
import { X } from "lucide-react";

export function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}>{children}</span>
  );
}

export function Card({ children, className = "", style = {}, onClick }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void;
}) {
  return (
    <div className={`rounded-xl p-4 ${className}`} onClick={onClick}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", ...style }}>{children}</div>
  );
}

export function Btn({ children, onClick, variant = "primary", size = "md", disabled = false, className = "", type = "button" }: {
  children: React.ReactNode; onClick?: () => void; variant?: string; size?: string;
  disabled?: boolean; className?: string; type?: "button" | "submit";
}) {
  const sizes: Record<string, string> = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-base" };
  const vars: Record<string, React.CSSProperties> = {
    primary: { background: "var(--accent)", color: "#fff" },
    ghost: { background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)" },
    danger: { background: "var(--red)", color: "#fff" },
    success: { background: "var(--green)", color: "#fff" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all ${sizes[size] || sizes.md} ${disabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"} ${className}`}
      style={vars[variant] || vars.primary}>{children}</button>
  );
}

export function Modal({ title, onClose, children, width = 520 }: {
  title: string; onClose: () => void; children: React.ReactNode; width?: number;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}
      style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}
        style={{ maxWidth: width, background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

export function Loader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
    </div>
  );
}
