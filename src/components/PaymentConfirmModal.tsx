import { useEffect } from "react";
import type { PaymentProgressPhase } from "../services/api";
import type { PaymentConfirmDetails } from "../services/paymentConfirm";
import { useLocale } from "../hooks/useLocale";

interface PaymentConfirmModalProps {
  open: boolean;
  details: PaymentConfirmDetails;
  busy?: boolean;
  phase?: PaymentProgressPhase | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PaymentConfirmModal({
  open,
  details,
  busy = false,
  phase = null,
  onConfirm,
  onCancel,
}: PaymentConfirmModalProps) {
  const { msg } = useLocale();

  const progressLabel = (() => {
    if (!busy || !phase) return null;
    switch (phase) {
      case "signing":
        return msg("paymentConfirmSigning");
      case "settling":
        return msg("paymentConfirmSettling");
      case "downloading":
        return msg("paymentConfirmDownloading");
      default:
        return null;
    }
  })();

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
      aria-labelledby="payment-confirm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="confirm-dialog">
        <h3 id="payment-confirm-title">{msg("paymentConfirmTitle")}</h3>

        <div className="payment-confirm-amount">
          <div className="payment-confirm-amount-value">
            {details.amountUi} {details.tokenSymbol}
          </div>
          <div className="payment-confirm-amount-purpose">{details.productTitle}</div>
        </div>

        <dl className="payment-confirm-meta">
          <div>
            <dt>{msg("paymentConfirmNetwork")}</dt>
            <dd>{details.networkLabel}</dd>
          </div>
          <div>
            <dt>{msg("paymentConfirmRecipient")}</dt>
            <dd>
              <code>{details.recipientShort}</code>
            </dd>
          </div>
          <div>
            <dt>{msg("paymentConfirmDelivery")}</dt>
            <dd>
              {details.deliveryScheme === "escrow"
                ? msg("paymentConfirmEscrow")
                : msg("paymentConfirmInstant")}
            </dd>
          </div>
          <div>
            <dt>{msg("paymentConfirmFileType")}</dt>
            <dd>{details.mimeType}</dd>
          </div>
          <div>
            <dt>{msg("paymentConfirmRail")}</dt>
            <dd>{details.schemeLabel}</dd>
          </div>
        </dl>

        <p
          className="payment-confirm-note"
          aria-live={progressLabel ? "polite" : undefined}
        >
          {progressLabel ?? msg("paymentConfirmNote")}
        </p>

        <div className="confirm-actions">
          <button
            type="button"
            className="control-btn"
            disabled={busy}
            onClick={onCancel}
          >
            {msg("paymentConfirmCancel")}
          </button>
          <button
            type="button"
            className="control-btn primary"
            disabled={busy}
            onClick={onConfirm}
          >
            {progressLabel ?? msg("paymentConfirmSign")}
          </button>
        </div>
      </div>
    </div>
  );
}
