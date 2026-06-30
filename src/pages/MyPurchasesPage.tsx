import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  fetchBuyerPurchases,
  formatUsdc,
  redownloadWithWallet,
  type BuyerPurchase,
} from "../services/api";
import { useLocale } from "../hooks/useLocale";

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function MyPurchasesPage() {
  const { msg } = useLocale();
  const { publicKey, signMessage } = useWallet();
  const { setVisible } = useWalletModal();
  const [items, setItems] = useState<BuyerPurchase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const wallet = publicKey?.toBase58();

  const loadPurchases = useCallback(
    async (offset: number) => {
      if (!wallet) return;
      if (!signMessage) {
        setError(msg("walletSignRequired"));
        return;
      }
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);
      try {
        const r = await fetchBuyerPurchases({
          buyerWallet: wallet,
          signMessage,
          limit: PAGE_SIZE,
          offset,
        });
        setItems((prev) => (offset === 0 ? r.items : [...prev, ...r.items]));
        setTotal(r.total);
        setError(null);
      } catch {
        setError(msg("errorLoad"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [wallet, signMessage, msg],
  );

  useEffect(() => {
    if (!wallet) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    void loadPurchases(0);
  }, [wallet, loadPurchases]);

  const onRedownload = async (purchase: BuyerPurchase) => {
    if (!wallet || !signMessage) {
      setVisible(true);
      return;
    }
    setBusyId(purchase.listingId);
    setError(null);
    try {
      const { blob } = await redownloadWithWallet(purchase.listingId, {
        publicKey: wallet,
        signMessage,
      });
      if (blob.size > 0) {
        const a = document.createElement("a");
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = purchase.listingTitle || "download";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  if (!publicKey) {
    return (
      <div className="my-purchases-page">
        <h1>{msg("myPurchasesTitle")}</h1>
        <p className="meta">{msg("myPurchasesConnect")}</p>
        <button type="button" className="control-btn primary" onClick={() => setVisible(true)}>
          {msg("walletConnect")}
        </button>
      </div>
    );
  }

  return (
    <div className="my-purchases-page">
      <header className="manage-listings-header">
        <h1>{msg("myPurchasesTitle")}</h1>
        <p className="meta">{msg("myPurchasesHint")}</p>
        <Link to="/forge" className="control-btn">
          {msg("navBrowse")}
        </Link>
      </header>

      {loading && <p>{msg("loading")}</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p>{msg("myPurchasesEmpty")}</p>
      )}

      {!loading && items.length > 0 && (
        <>
          <p className="meta browse-pagination-meta">
            {msg("browseShowing")} {items.length} / {total}
          </p>
          <div className="card manage-listings-table-wrap">
            <table className="manage-listings-table">
              <thead>
                <tr>
                  <th>{msg("fieldTitle")}</th>
                  <th>{msg("priceLabel")}</th>
                  <th>{msg("purchasedAt")}</th>
                  <th>{msg("myPurchasesFeedback")}</th>
                  <th aria-label={msg("manageListingsActions")} />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.saleId}>
                    <td>
                      {item.listingStatus === "removed" ? (
                        <span>{item.listingTitle}</span>
                      ) : (
                        <Link to={`/forge/${item.listingId}`}>{item.listingTitle}</Link>
                      )}
                      {item.listingStatus === "removed" && (
                        <span className="meta"> ({msg("listingRemoved")})</span>
                      )}
                    </td>
                    <td>{formatUsdc(item.amountMicroUsdc)} USDC</td>
                    <td>{formatDate(item.settledAt)}</td>
                    <td>{item.feedbackOutcome ?? "—"}</td>
                    <td className="manage-listings-actions">
                      {item.listingStatus !== "removed" && (
                        <Link to={`/forge/${item.listingId}`} className="control-btn">
                          {msg("viewDetails")}
                        </Link>
                      )}
                      <button
                        type="button"
                        className="control-btn primary"
                        disabled={busyId === item.listingId}
                        onClick={() => void onRedownload(item)}
                      >
                        {busyId === item.listingId
                          ? msg("loading")
                          : msg("myPurchasesRedownload")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length < total && (
            <div className="browse-load-more">
              <button
                type="button"
                className="control-btn"
                disabled={loadingMore}
                onClick={() => void loadPurchases(items.length)}
              >
                {loadingMore ? msg("loading") : msg("loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
