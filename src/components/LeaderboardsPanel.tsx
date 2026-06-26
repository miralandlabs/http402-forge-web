import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE, formatUsdc } from "../services/api";
import { useLocale } from "../hooks/useLocale";
import { useForgeEvents } from "../hooks/useForgeEvents";

interface WalletRow {
  wallet: string;
  amount_micro_usdc: number;
  sales_count: number;
}

interface ListingRow {
  listing_id: string;
  title: string;
  sales_count: number;
  volume_micro_usdc: number;
}

export function LeaderboardsPanel() {
  const { msg } = useLocale();
  const [data, setData] = useState<{
    top_earners_24h: WalletRow[];
    top_payers_24h: WalletRow[];
    hottest_listings_24h: ListingRow[];
  } | null>(null);
  const refreshTimer = useRef<number | null>(null);

  const load = useCallback(() => {
    fetch(`${API_BASE}/api/v1/leaderboards`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useForgeEvents(() => {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(load, 30_000);
  });

  if (!data) return null;

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2>{msg("leaderboards")}</h2>
      <div className="leaderboard">
        <div className="card">
          <strong>{msg("topEarners")}</strong>
          <ul>
            {data.top_earners_24h.map((r) => (
              <li key={r.wallet}>
                <Link to={`/forge?seller_wallet=${encodeURIComponent(r.wallet)}`}>
                  {r.wallet.slice(0, 6)}…
                </Link>
                {" · "}
                {formatUsdc(r.amount_micro_usdc)} USDC
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <strong>{msg("topPayers")}</strong>
          <ul>
            {data.top_payers_24h.map((r) => (
              <li key={r.wallet}>
                <Link to={`/forge?seller_wallet=${encodeURIComponent(r.wallet)}`}>
                  {r.wallet.slice(0, 6)}…
                </Link>
                {" · "}
                {formatUsdc(r.amount_micro_usdc)} USDC
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <strong>{msg("hottest")}</strong>
          <ul>
            {data.hottest_listings_24h.map((r) => (
              <li key={r.listing_id}>
                <Link to={`/forge/${r.listing_id}`}>{r.title}</Link>
                {" · "}
                {r.sales_count} sales
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
