import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE, formatUsdc } from "../services/api";
import { useLocale } from "../hooks/useLocale";
import { useForgeEvents } from "../hooks/useForgeEvents";

interface WalletRow {
  wallet: string;
  amountMicroUsdc: number;
  amount_micro_usdc?: number;
  salesCount: number;
  sales_count?: number;
}

interface ListingRow {
  listingId: string;
  listing_id?: string;
  title: string;
  salesCount: number;
  sales_count?: number;
  volumeMicroUsdc: number;
  volume_micro_usdc?: number;
}

function parseWalletRow(raw: Record<string, unknown>): WalletRow {
  return {
    wallet: String(raw.wallet ?? ""),
    amountMicroUsdc: Number(raw.amountMicroUsdc ?? raw.amount_micro_usdc ?? 0),
    salesCount: Number(raw.salesCount ?? raw.sales_count ?? 0),
  };
}

function parseListingRow(raw: Record<string, unknown>): ListingRow {
  return {
    listingId: String(raw.listingId ?? raw.listing_id ?? ""),
    title: String(raw.title ?? ""),
    salesCount: Number(raw.salesCount ?? raw.sales_count ?? 0),
    volumeMicroUsdc: Number(raw.volumeMicroUsdc ?? raw.volume_micro_usdc ?? 0),
  };
}

export function LeaderboardsPanel() {
  const { msg } = useLocale();
  const [data, setData] = useState<{
    topEarners24h: WalletRow[];
    topPayers24h: WalletRow[];
    hottestListings24h: ListingRow[];
  } | null>(null);
  const refreshTimer = useRef<number | null>(null);

  const load = useCallback(() => {
    fetch(`${API_BASE}/api/v1/leaderboards`)
      .then((r) => r.json())
      .then((raw) => {
        const o = raw as Record<string, unknown>;
        const earners = (o.topEarners24h ?? o.top_earners_24h ?? []) as Record<
          string,
          unknown
        >[];
        const payers = (o.topPayers24h ?? o.top_payers_24h ?? []) as Record<
          string,
          unknown
        >[];
        const hottest = (o.hottestListings24h ??
          o.hottest_listings_24h ??
          []) as Record<string, unknown>[];
        setData({
          topEarners24h: earners.map(parseWalletRow),
          topPayers24h: payers.map(parseWalletRow),
          hottestListings24h: hottest.map(parseListingRow),
        });
      })
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
    <section className="forge-leaderboards">
      <h2>{msg("leaderboards")}</h2>
      <div className="leaderboard">
        <div className="card">
          <strong>{msg("topEarners")}</strong>
          <ul>
            {data.topEarners24h.map((r) => (
              <li key={r.wallet}>
                <Link to={`/forge?seller_wallet=${encodeURIComponent(r.wallet)}`}>
                  {r.wallet.slice(0, 6)}…
                </Link>
                {" · "}
                {formatUsdc(r.amountMicroUsdc)} USDC
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <strong>{msg("topPayers")}</strong>
          <ul>
            {data.topPayers24h.map((r) => (
              <li key={r.wallet} title={r.wallet}>
                {r.wallet.slice(0, 6)}…
                {" · "}
                {formatUsdc(r.amountMicroUsdc)} USDC
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <strong>{msg("hottest")}</strong>
          <ul>
            {data.hottestListings24h.map((r) => (
              <li key={r.listingId}>
                <Link to={`/forge/${r.listingId}`}>{r.title}</Link>
                {" · "}
                {r.salesCount} sales
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
