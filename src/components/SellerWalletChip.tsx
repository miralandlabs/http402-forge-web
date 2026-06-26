import { useState } from "react";
import { Link } from "react-router-dom";
import { useLocale } from "../hooks/useLocale";

function shortAddress(wallet: string): string {
  if (wallet.length <= 11) return wallet;
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

interface SellerWalletChipProps {
  wallet: string;
  linkToSeller?: boolean;
  /** Smaller styling for browse cards */
  subtle?: boolean;
  /** Hide "Seller" label (e.g. filter banner) */
  hideLabel?: boolean;
}

export function SellerWalletChip({
  wallet,
  linkToSeller = false,
  subtle = false,
  hideLabel = false,
}: SellerWalletChipProps) {
  const { msg } = useLocale();
  const [copied, setCopied] = useState(false);

  const onCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const short = shortAddress(wallet);
  const sellerUrl = `/forge?seller_wallet=${encodeURIComponent(wallet)}`;

  return (
    <span
      className={`seller-wallet-chip${subtle ? " seller-wallet-chip--subtle" : ""}`}
    >
      {!hideLabel && (
        <span className="seller-wallet-chip-label">{msg("sellerLabel")}</span>
      )}
      {linkToSeller ? (
        <Link to={sellerUrl} className="seller-wallet-chip-addr">
          {short}
        </Link>
      ) : (
        <code className="seller-wallet-chip-addr">{short}</code>
      )}
      <button
        type="button"
        className="seller-wallet-chip-copy"
        onClick={(e) => void onCopy(e)}
        aria-label={msg("walletCopyAddress")}
        title={msg("walletCopyAddress")}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <rect
            x="9"
            y="9"
            width="11"
            height="11"
            rx="1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M7 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          />
        </svg>
      </button>
      {copied && (
        <span className="seller-wallet-chip-copied" aria-live="polite">
          {msg("walletCopied")}
        </span>
      )}
    </span>
  );
}
