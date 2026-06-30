import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Buffer } from "buffer";
import { DelistConfirmModal } from "../components/DelistConfirmModal";
import { fetchListings, formatUsdc, fetchDelistChallenge, delistListing, type Listing } from "../services/api";
import { useLocale } from "../hooks/useLocale";

export function ManageListingsPage() {
  const { msg } = useLocale();
  const { publicKey, signMessage } = useWallet();
  const { setVisible } = useWalletModal();
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [delistTarget, setDelistTarget] = useState<Listing | null>(null);

  const wallet = publicKey?.toBase58();

  useEffect(() => {
    if (!wallet) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchListings({ sellerWallet: wallet, sort: "newest", limit: 100, offset: 0 })
      .then((r) => {
        setItems(r.items);
        setError(null);
      })
      .catch(() => setError(msg("errorLoad")))
      .finally(() => setLoading(false));
  }, [wallet, msg]);

  const onConfirmDelist = async () => {
    if (!delistTarget || !wallet || !signMessage) return;
    setBusyId(delistTarget.id);
    setError(null);
    try {
      const challenge = await fetchDelistChallenge(wallet, delistTarget.id);
      const challengeMessage = challenge.message.replace(/\r\n/g, "\n");
      const signature = await signMessage(
        new TextEncoder().encode(challengeMessage),
      );
      await delistListing(
        delistTarget.id,
        wallet,
        challengeMessage,
        Buffer.from(signature).toString("base64"),
      );
      setItems((prev) => prev.filter((x) => x.id !== delistTarget.id));
      setDelistTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  if (!publicKey) {
    return (
      <div className="manage-listings-page">
        <h1>{msg("manageListingsTitle")}</h1>
        <p className="meta">{msg("manageListingsConnect")}</p>
        <button type="button" className="control-btn primary" onClick={() => setVisible(true)}>
          {msg("walletConnect")}
        </button>
      </div>
    );
  }

  return (
    <div className="manage-listings-page">
      <header className="manage-listings-header">
        <h1>{msg("manageListingsTitle")}</h1>
        <p className="meta">{msg("manageListingsHint")}</p>
        <Link to="/sell" className="control-btn">
          {msg("navSell")}
        </Link>
      </header>

      {loading && <p>{msg("loading")}</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p>{msg("manageListingsEmpty")}</p>
      )}

      {!loading && items.length > 0 && (
        <div className="card manage-listings-table-wrap">
          <table className="manage-listings-table">
            <thead>
              <tr>
                <th>{msg("fieldTitle")}</th>
                <th>{msg("priceLabel")}</th>
                <th>{msg("manageListingsStatus")}</th>
                <th aria-label={msg("manageListingsActions")} />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link to={`/forge/${item.id}`}>{item.title}</Link>
                  </td>
                  <td>{formatUsdc(item.priceMicroUsdc)} USDC</td>
                  <td>{item.deliveryScheme}</td>
                  <td className="manage-listings-actions">
                    <Link to={`/forge/${item.id}`} className="control-btn">
                      {msg("viewDetails")}
                    </Link>
                    <button
                      type="button"
                      className="control-btn"
                      disabled={busyId === item.id}
                      onClick={() => setDelistTarget(item)}
                    >
                      {msg("removeListing")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DelistConfirmModal
        open={!!delistTarget}
        listingTitle={delistTarget?.title ?? ""}
        busy={!!busyId}
        onConfirm={() => void onConfirmDelist()}
        onCancel={() => {
          if (!busyId) setDelistTarget(null);
        }}
      />
    </div>
  );
}
