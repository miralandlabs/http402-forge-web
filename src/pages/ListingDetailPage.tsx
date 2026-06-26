import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Buffer } from "buffer";
import { DelistConfirmModal } from "../components/DelistConfirmModal";
import { PaymentConfirmModal } from "../components/PaymentConfirmModal";
import {
  API_BASE,
  delistListing,
  downloadWithPayment,
  fetchDelistChallenge,
  fetchDownloadQuote,
  fetchListing,
  formatUsdc,
  previewResponseContentType,
  type Listing,
} from "../services/api";
import {
  parsePaymentConfirmDetails,
  type PaymentConfirmDetails,
} from "../services/paymentConfirm";
import type { PaymentRequiredBody } from "../services/wallet";
import { useLocale } from "../hooks/useLocale";

type PreviewState =
  | { kind: "text"; text: string }
  | { kind: "media"; url: string; contentType: string };

function triggerDownload(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { msg } = useLocale();
  const { publicKey, signMessage, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const [listing, setListing] = useState<Listing | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [delistConfirmOpen, setDelistConfirmOpen] = useState(false);
  const [paymentChallenge, setPaymentChallenge] =
    useState<PaymentRequiredBody | null>(null);
  const [confirmDetails, setConfirmDetails] =
    useState<PaymentConfirmDetails | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchListing(id)
      .then(setListing)
      .catch(() => setError(msg("errorLoad")));
  }, [id, msg]);

  useEffect(() => {
    if (!id || !listing) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    fetch(`${API_BASE}/api/v1/listings/${id}/preview`)
      .then(async (r) => {
        if (!r.ok) return;
        const contentType = previewResponseContentType(
          r.headers.get("content-type"),
          listing.contentType,
        );
        if (contentType.startsWith("text/") || contentType.includes("json")) {
          const text = await r.text();
          if (!cancelled) setPreview({ kind: "text", text });
          return;
        }
        const blob = await r.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setPreview({ kind: "media", url: objectUrl, contentType });
        }
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, listing]);

  const onBuyClick = async () => {
    if (!id) return;
    setError(null);
    if (!publicKey || !signTransaction) {
      setVisible(true);
      return;
    }

    setBusy(true);
    try {
      const quote = await fetchDownloadQuote(id);
      if (quote.kind === "ready") {
        triggerDownload(quote.blob, listing?.title ?? "download");
        return;
      }
      setPaymentChallenge(quote.challenge);
      setConfirmDetails(parsePaymentConfirmDetails(quote.challenge, listing));
      setConfirmOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmPayment = async () => {
    if (!id || !paymentChallenge || !publicKey || !signTransaction) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await downloadWithPayment(id, paymentChallenge, {
        publicKey: publicKey.toBase58(),
        signTransaction,
      });
      setConfirmOpen(false);
      triggerDownload(blob, listing?.title ?? "download");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onCancelPayment = () => {
    if (busy) return;
    setConfirmOpen(false);
    setPaymentChallenge(null);
    setConfirmDetails(null);
  };

  const isOwner =
    !!publicKey && listing?.sellerWallet === publicKey.toBase58();

  const onDelistClick = () => {
    if (!id || !listing || !isOwner) return;
    setError(null);
    setDelistConfirmOpen(true);
  };

  const onCancelDelist = () => {
    if (busy) return;
    setDelistConfirmOpen(false);
  };

  const onConfirmDelist = async () => {
    if (!id || !listing || !isOwner) return;
    setError(null);
    if (!publicKey) {
      setDelistConfirmOpen(false);
      setVisible(true);
      return;
    }
    if (!signMessage) {
      setError(msg("walletSignRequired"));
      return;
    }
    setBusy(true);
    try {
      const wallet = publicKey.toBase58();
      const challenge = await fetchDelistChallenge(wallet, id);
      const challengeMessage = challenge.message.replace(/\r\n/g, "\n");
      const signature = await signMessage(
        new TextEncoder().encode(challengeMessage),
      );
      await delistListing(
        id,
        wallet,
        challengeMessage,
        Buffer.from(signature).toString("base64"),
      );
      setDelistConfirmOpen(false);
      navigate("/forge", { state: { toast: msg("delistSuccess") } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!listing) return <p>{msg("loading")}</p>;

  return (
    <>
      <article className="card" style={{ maxWidth: 720 }}>
        <h1>{listing.title}</h1>
        <p className="meta">
          {listing.category} · {formatUsdc(listing.priceMicroUsdc)} USDC ·{" "}
          {listing.deliveryScheme}
        </p>
        <p className="meta">
          <Link
            to={`/forge?seller_wallet=${encodeURIComponent(listing.sellerWallet)}`}
          >
            {msg("moreFromSeller")}
          </Link>
        </p>
        <p>{listing.description}</p>
        {preview && (
          <div className="preview-box">
            <strong>{msg("preview")}</strong>
            {preview.kind === "text" ? (
              <pre style={{ margin: "0.5rem 0 0", whiteSpace: "pre-wrap" }}>
                {preview.text}
              </pre>
            ) : preview.contentType.startsWith("image/") ? (
              <img
                src={preview.url}
                alt={listing.title}
                className="listing-preview-media"
              />
            ) : preview.contentType.startsWith("audio/") ? (
              <audio controls src={preview.url} className="listing-preview-media" />
            ) : preview.contentType.startsWith("video/") ? (
              <video controls src={preview.url} className="listing-preview-media" />
            ) : (
              <p className="meta">{msg("previewUnavailable")}</p>
            )}
          </div>
        )}
        <div className="actions">
          <button
            type="button"
            className="control-btn primary"
            disabled={busy && !confirmOpen}
            onClick={onBuyClick}
          >
            {busy && !confirmOpen ? msg("loading") : msg("buyDownload")}
          </button>
          {isOwner && (
            <button
              type="button"
              className="control-btn"
              disabled={busy && !delistConfirmOpen}
              onClick={onDelistClick}
            >
              {busy && delistConfirmOpen ? msg("loading") : msg("removeListing")}
            </button>
          )}
        </div>
        {error && <p className="error">{error}</p>}
      </article>

      {confirmDetails && (
        <PaymentConfirmModal
          open={confirmOpen}
          details={confirmDetails}
          busy={busy}
          onConfirm={onConfirmPayment}
          onCancel={onCancelPayment}
        />
      )}

      <DelistConfirmModal
        open={delistConfirmOpen}
        listingTitle={listing.title}
        busy={busy}
        onConfirm={() => void onConfirmDelist()}
        onCancel={onCancelDelist}
      />
    </>
  );
}
