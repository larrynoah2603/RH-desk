"use client";

import { useId } from "react";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import { useT } from "@/lib/i18n";

export function ConfirmDialog({
  open,
  eyebrow,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  busy = false,
  confirmDisabled = false,
  busyLabel,
  children,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  eyebrow?: string;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  confirmDisabled?: boolean;
  busyLabel?: string;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const titleId = useId();
  const descId = useId();
  const dialogRef = useDialogFocus({ open, onClose: onCancel, closeOnEscape: !busy });

  if (!open) return null;

  return (
    <div className="confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId} tabIndex={-1} ref={dialogRef}>
        <p className="eyebrow">{eyebrow ?? t.common.confirm}</p>
        <h2 id={titleId}>{title}</h2>
        <p id={descId}>{description}</p>
        {children}
        <div className="mt-6">
          <button type="button" disabled={busy} onClick={onCancel} className="button-secondary">{cancelLabel ?? t.common.cancel}</button>
          <button type="button" disabled={busy || confirmDisabled} onClick={onConfirm} className={danger ? "button-danger" : "button-primary"}>
            {busy ? (busyLabel ?? t.common.saving) : (confirmLabel ?? t.common.confirm)}
          </button>
        </div>
      </section>
    </div>
  );
}
