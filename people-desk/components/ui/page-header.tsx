import type { ReactNode } from "react";

export function PageHeader({ title, description, eyebrow, actions, className = "" }: { title: string; description?: string; eyebrow?: string; actions?: ReactNode; className?: string }) {
  return (
    <header className={`kit-page-header ${className}`.trim()}>
      <div className="kit-page-header-copy">
        {eyebrow ? <p className="kit-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="kit-page-header-desc">{description}</p> : null}
      </div>
      {actions ? <div className="kit-page-header-actions">{actions}</div> : null}
    </header>
  );
}
