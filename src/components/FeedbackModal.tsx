import { useEffect } from "react";
import { useLocale } from "../hooks/useLocale";

export type FeedbackOutcome = "as_described" | "corrupt" | "misleading";

interface FeedbackModalProps {
  open: boolean;
  hashOk: boolean | null;
  busy?: boolean;
  onSubmit: (outcome: FeedbackOutcome) => void;
  onDismiss: () => void;
}

export function FeedbackModal({
  open,
  hashOk,
  busy = false,
  onSubmit,
  onDismiss,
}: FeedbackModalProps) {
  const { msg } = useLocale();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onDismiss]);

  if (!open) return null;

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onDismiss();
      }}
    >
      <div className="confirm-dialog">
        <h3 id="feedback-modal-title">{msg("feedbackModalTitle")}</h3>
        {hashOk != null && (
          <p className="payment-confirm-note">
            {hashOk ? msg("feedbackHashOk") : msg("feedbackHashMismatch")}
          </p>
        )}
        <p className="payment-confirm-note">{msg("feedbackModalHint")}</p>
        <div className="confirm-actions feedback-outcome-actions">
          <button
            type="button"
            className="control-btn primary"
            disabled={busy}
            onClick={() => onSubmit("as_described")}
          >
            {msg("feedbackAsDescribed")}
          </button>
          <button
            type="button"
            className="control-btn"
            disabled={busy}
            onClick={() => onSubmit("corrupt")}
          >
            {msg("feedbackCorrupt")}
          </button>
          <button
            type="button"
            className="control-btn"
            disabled={busy}
            onClick={() => onSubmit("misleading")}
          >
            {msg("feedbackMisleading")}
          </button>
          <button
            type="button"
            className="control-btn"
            disabled={busy}
            onClick={onDismiss}
          >
            {msg("feedbackSkip")}
          </button>
        </div>
      </div>
    </div>
  );
}
