import { useEffect, useState } from "react";
import { API_BASE } from "../services/api";
import { useLocale } from "../hooks/useLocale";

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

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/leaderboards`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

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
                {r.wallet.slice(0, 6)}… · {(r.amount_micro_usdc / 1e6).toFixed(2)} USDC
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <strong>{msg("topPayers")}</strong>
          <ul>
            {data.top_payers_24h.map((r) => (
              <li key={r.wallet}>
                {r.wallet.slice(0, 6)}… · {(r.amount_micro_usdc / 1e6).toFixed(2)} USDC
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <strong>{msg("hottest")}</strong>
          <ul>
            {data.hottest_listings_24h.map((r) => (
              <li key={r.listing_id}>
                {r.title} · {r.sales_count} sales
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
