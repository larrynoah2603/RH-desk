import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`kit-card ${className}`.trim()} {...props} />;
}

export function CardHeader({ title, description, action, className = "" }: { title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={`kit-panel-head ${className}`.trim()}>
      <div>
        <h2 className="kit-panel-title">{title}</h2>
        {description ? <p className="kit-panel-sub">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function CardContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`kit-panel-body ${className}`.trim()} {...props} />;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`kit-panel ${className}`.trim()}>{children}</section>;
}
