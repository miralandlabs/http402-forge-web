import { Link } from "react-router-dom";
import { useForgeEvents, type ForgeSaleEvent } from "../hooks/useForgeEvents";
import { formatUsdc } from "../services/api";
import { useLocale } from "../hooks/useLocale";
import { useCallback, useEffect, useState } from "react";

interface LiveSalesTickerProps {
  /** When set, only show sales for this seller wallet. */
  sellerFilter?: string;
}

export function LiveSalesTicker({ sellerFilter }: LiveSalesTickerProps) {
  const { msg } = useLocale();
  const [sale, setSale] = useState<ForgeSaleEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const onSale = useCallback(
    (ev: ForgeSaleEvent) => {
      if (sellerFilter && ev.sellerWallet !== sellerFilter) return;
      setSale(ev);
      setVisible(true);
    },
    [sellerFilter],
  );

  useForgeEvents(onSale);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 8000);
    return () => window.clearTimeout(timer);
  }, [visible, sale]);

  if (!visible || !sale) return null;

  const amount = formatUsdc(sale.amountMicroUsdc);

  return (
    <div className="live-sales-ticker" role="status" aria-live="polite">
      <span className="live-sales-ticker-label">{msg("liveSale")}</span>
      <span className="live-sales-ticker-buyer" title={sale.buyerWallet}>
        {sale.buyerWallet.slice(0, 6)}…
      </span>
      <span>{msg("liveSaleBought")}</span>
      <Link to={`/forge/${sale.listingId}`} className="live-sales-ticker-link">
        {msg("liveSaleListing")}
      </Link>
      <span>
        {msg("liveSaleFor")} {amount} USDC
      </span>
    </div>
  );
}
