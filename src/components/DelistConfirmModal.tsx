import { useEffect } from "react";
import { useLocale } from "../hooks/useLocale";

interface DelistConfirmModalProps {
  open: boolean;
  listingTitle: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DelistConfirmModal({
  open,
  listingTitle,
  busy = false,
  onConfirm,
  onCancel,
}: DelistConfirmModalProps) {
  const { msg } = useLocale();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delist-confirm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="confirm-dialog">
        <h3 id="delist-confirm-title">{msg("delistConfirmTitle")}</h3>

        <div className="payment-confirm-amount">
          <div className="payment-confirm-amount-purpose">{listingTitle}</div>
        </div>

        <p className="payment-confirm-note">{msg("delistConfirm")}</p>

        <div className="confirm-actions">
          <button
            type="button"
            className="control-btn"
            disabled={busy}
            onClick={onCancel}
          >
            {msg("delistConfirmCancel")}
          </button>
          <button
            type="button"
            className="control-btn primary"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? msg("loading") : msg("delistConfirmAction")}
          </button>
        </div>
      </div>
    </div>
  );
}
