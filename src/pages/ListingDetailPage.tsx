import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Buffer } from "buffer";
import { DelistConfirmModal } from "../components/DelistConfirmModal";
import { PaymentConfirmModal } from "../components/PaymentConfirmModal";
import { SellerWalletChip } from "../components/SellerWalletChip";
import {
  delistListing,
  downloadWithPayment,
  fetchDelistChallenge,
  fetchDownloadQuote,
  fetchListing,
  formatUsdc,
  type Listing,
  type PaymentProgressPhase,
} from "../services/api";
import {
  parsePaymentConfirmDetails,
  type PaymentConfirmDetails,
} from "../services/paymentConfirm";
import type { PaymentRequiredBody } from "../services/wallet";
import { useLocale } from "../hooks/useLocale";
import {
  fetchTextPreview,
  listingPreviewMediaType,
  listingPreviewUrl,
} from "../utils/listingPreview";

type PreviewContent =
  | { kind: "text"; text: string }
  | { kind: "media"; url: string; contentType: string; loaded: boolean };

type PreviewLoadState =
  | { status: "loading" }
  | { status: "ready"; preview: PreviewContent }
  | { status: "unavailable" };

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
  const [previewLoad, setPreviewLoad] = useState<PreviewLoadState>({
    status: "loading",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [delistConfirmOpen, setDelistConfirmOpen] = useState(false);
  const [paymentChallenge, setPaymentChallenge] =
    useState<PaymentRequiredBody | null>(null);
  const [confirmDetails, setConfirmDetails] =
    useState<PaymentConfirmDetails | null>(null);
  const [paymentPhase, setPaymentPhase] = useState<PaymentProgressPhase | null>(
    null,
  );

  useEffect(() => {
    if (!id) return;
    fetchListing(id)
      .then(setListing)
      .catch(() => setError(msg("errorLoad")));
  }, [id, msg]);

  useEffect(() => {
    if (!listing) return;
    let cancelled = false;

    const mediaKind = listingPreviewMediaType(listing);
    if (mediaKind === "media") {
      setPreviewLoad({
        status: "ready",
        preview: {
          kind: "media",
          url: listingPreviewUrl(listing),
          contentType: listing.contentType,
          loaded: false,
        },
      });
      return;
    }

    setPreviewLoad({ status: "loading" });
    fetchTextPreview(listing)
      .then((text) => {
        if (cancelled) return;
        if (text) {
          setPreviewLoad({ status: "ready", preview: { kind: "text", text } });
        } else {
          setPreviewLoad({ status: "unavailable" });
        }
      })
      .catch(() => {
        if (!cancelled) setPreviewLoad({ status: "unavailable" });
      });

    return () => {
      cancelled = true;
    };
  }, [listing]);

  const markMediaLoaded = () => {
    setPreviewLoad((prev) => {
      if (prev.status !== "ready" || prev.preview.kind !== "media") return prev;
      return {
        status: "ready",
        preview: { ...prev.preview, loaded: true },
      };
    });
  };

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
    setPaymentPhase(null);
    setError(null);
    try {
      const blob = await downloadWithPayment(
        id,
        paymentChallenge,
        {
          publicKey: publicKey.toBase58(),
          signTransaction,
        },
        setPaymentPhase,
      );
      setConfirmOpen(false);
      triggerDownload(blob, listing?.title ?? "download");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setPaymentPhase(null);
    }
  };

  const onCancelPayment = () => {
    if (busy) return;
    setConfirmOpen(false);
    setPaymentChallenge(null);
    setConfirmDetails(null);
    setPaymentPhase(null);
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

  const mediaLoading =
    previewLoad.status === "ready" &&
    previewLoad.preview.kind === "media" &&
    !previewLoad.preview.loaded;

  return (
    <>
      <article className="card" style={{ maxWidth: 720 }}>
        <h1>{listing.title}</h1>
        <p className="meta">
          {listing.category} · {formatUsdc(listing.priceMicroUsdc)} USDC ·{" "}
          {listing.deliveryScheme}
        </p>
        <p className="meta seller-detail-meta">
          <SellerWalletChip wallet={listing.sellerWallet} linkToSeller />
          <span className="seller-detail-meta-sep" aria-hidden="true">
            ·
          </span>
          <Link
            to={`/forge?seller_wallet=${encodeURIComponent(listing.sellerWallet)}`}
          >
            {msg("moreFromSeller")}
          </Link>
        </p>
        <p>{listing.description}</p>
        {listing.agentFriendly &&
          ((listing.tags?.length ?? 0) > 0 ||
            listing.license ||
            listing.contentHash) && (
            <dl className="agent-meta">
              {(listing.tags?.length ?? 0) > 0 && (
                <div>
                  <dt>{msg("agentTags")}</dt>
                  <dd>{listing.tags!.join(", ")}</dd>
                </div>
              )}
              {listing.license && (
                <div>
                  <dt>{msg("agentLicense")}</dt>
                  <dd>{listing.license}</dd>
                </div>
              )}
              {listing.contentHash && (
                <div>
                  <dt>{msg("agentContentHash")}</dt>
                  <dd>
                    <code>{listing.contentHash}</code>
                  </dd>
                </div>
              )}
            </dl>
          )}
        {(previewLoad.status === "loading" || mediaLoading) && (
          <div className="preview-box preview-box--loading">
            <strong>{msg("preview")}</strong>
            <div className="preview-loading">
              <span className="preview-spinner" aria-hidden="true" />
              <span>{msg("previewLoading")}</span>
            </div>
          </div>
        )}
        {previewLoad.status === "ready" && !mediaLoading && (
          <div className="preview-box">
            <strong>{msg("preview")}</strong>
            {previewLoad.preview.kind === "text" ? (
              <pre style={{ margin: "0.5rem 0 0", whiteSpace: "pre-wrap" }}>
                {previewLoad.preview.text}
              </pre>
            ) : previewLoad.preview.contentType.startsWith("image/") ? (
              <img
                src={previewLoad.preview.url}
                alt={listing.title}
                className="listing-preview-media"
                onLoad={markMediaLoaded}
              />
            ) : previewLoad.preview.contentType.startsWith("audio/") ? (
              <audio
                controls
                src={previewLoad.preview.url}
                className="listing-preview-media"
                onLoadedData={markMediaLoaded}
                onCanPlay={markMediaLoaded}
              />
            ) : previewLoad.preview.contentType.startsWith("video/") ? (
              <video
                controls
                src={previewLoad.preview.url}
                className="listing-preview-media"
                onLoadedData={markMediaLoaded}
                onCanPlay={markMediaLoaded}
              />
            ) : (
              <p className="meta">{msg("previewUnavailable")}</p>
            )}
          </div>
        )}
        {previewLoad.status === "unavailable" && (
          <p className="meta">{msg("previewUnavailable")}</p>
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
          phase={paymentPhase}
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
