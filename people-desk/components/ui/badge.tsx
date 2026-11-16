import type { ReactNode } from "react";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={`kit-badge kit-badge-${tone} ${className}`.trim()}>{children}</span>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <Badge tone={tone}>
      <span className="kit-badge-dot" aria-hidden="true" />
      {children}
    </Badge>
  );
}

export function Progress({ value, tone = "brand", label }: { value: number; tone?: "brand" | "success" | "warning" | "danger"; label?: string }) {
  const bounded = Math.min(100, Math.max(0, value));
  return (
    <div className="kit-progress" role="progressbar" aria-valuenow={bounded} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span className={`kit-progress-fill${tone === "brand" ? "" : ` kit-progress-${tone}`}`} style={{ width: `${bounded}%` }} />
    </div>
  );
}
