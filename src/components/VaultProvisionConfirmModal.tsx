import { useEffect } from "react";
import type { VaultProvisionConfirmDetails } from "../services/vaultProvisionConfirm";
import { useLocale } from "../hooks/useLocale";

interface VaultProvisionConfirmModalProps {
  open: boolean;
  details: VaultProvisionConfirmDetails;
  busy?: boolean;
  busyLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function VaultProvisionConfirmModal({
  open,
  details,
  busy = false,
  busyLabel,
  onConfirm,
  onCancel,
}: VaultProvisionConfirmModalProps) {
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
      aria-labelledby="vault-provision-confirm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="confirm-dialog">
        <h3 id="vault-provision-confirm-title">{msg("vaultProvisionConfirmTitle")}</h3>

        <div className="payment-confirm-amount">
          <div className="payment-confirm-amount-value">{details.costEstimate}</div>
          <div className="payment-confirm-amount-purpose">
            {msg("vaultProvisionConfirmPurpose")}
          </div>
        </div>

        <dl className="payment-confirm-meta">
          <div>
            <dt>{msg("paymentConfirmNetwork")}</dt>
            <dd>{details.networkLabel}</dd>
          </div>
          <div>
            <dt>{msg("vaultProvisionConfirmWallet")}</dt>
            <dd>
              <code>{details.walletShort}</code>
            </dd>
          </div>
          <div>
            <dt>{msg("vaultProvisionConfirmFeeTier")}</dt>
            <dd>{details.protocolFeeAfter}</dd>
          </div>
          <div>
            <dt>{msg("vaultProvisionConfirmFrequency")}</dt>
            <dd>{msg("vaultProvisionConfirmOnce")}</dd>
          </div>
        </dl>

        <p className="payment-confirm-note">{msg("vaultProvisionConfirmNote")}</p>
        <p className="payment-confirm-note meta">{msg("vaultProvisionConfirmSteps")}</p>

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
            {busy
              ? (busyLabel ?? msg("vaultProvisionConfirmSigning"))
              : msg("vaultProvisionConfirmContinue")}
          </button>
        </div>
      </div>
    </div>
  );
}
