"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";

export function Modal({
  open,
  title,
  description,
  size = "md",
  className = "",
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  size?: "md" | "lg" | "xl";
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useDialogFocus({ open, onClose });
  if (!open) return null;
  const sizeClass = size === "lg" ? "kit-modal-lg" : size === "xl" ? "kit-profile-modal" : "";
  return (
    <div className="kit-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section
        className={`kit-modal ${sizeClass} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className="kit-modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="kit-icon-btn" onClick={onClose} aria-label="Fermer">
            <X className="size-4" />
          </button>
        </header>
        {description ? <p id={descId} className="kit-modal-intro">{description}</p> : null}
        <div className={`kit-modal-body${description ? " kit-modal-content" : ""}`}>{children}</div>
        {footer ? <footer className="kit-modal-foot">{footer}</footer> : null}
      </section>
    </div>
  );
}
