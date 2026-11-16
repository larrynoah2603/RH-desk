import type { ReactNode } from "react";

export function EmptyState({ title, description, action, tone = "neutral" }: { title: string; description?: string; action?: ReactNode; tone?: "neutral" | "danger" }) {
  return (
    <div className="kit-state" role={tone === "danger" ? "alert" : undefined}>
      <div className={`kit-state-icon${tone === "danger" ? " kit-state-icon-danger" : ""}`} aria-hidden="true">{tone === "danger" ? "!" : "+"}</div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label?: string }) {
  return (
    <label className="kit-search-field">
      <svg className="kit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM21 21l-4.3-4.3" /></svg>
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={label ?? placeholder} />
    </label>
  );
}
