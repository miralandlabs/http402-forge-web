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
  getCachedDownloadProof,
  PaidDownloadTransferError,
  redownloadWithWallet,
  retryPaidDownload,
  type Listing,
  type PaymentProgressPhase,
} from "../services/api";
import {
  parsePaymentConfirmDetails,
  type PaymentConfirmDetails,
} from "../services/paymentConfirm";
import type { PaymentRequiredBody } from "../services/wallet";
import { useLocale } from "../hooks/useLocale";
import { ListingPreviewMedia } from "../components/ListingPreviewMedia";
import {
  fetchTextPreview,
  listingPreviewUrl,
  previewRenderKind,
  resolvePreviewContentType,
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
  const [paidRetryAvailable, setPaidRetryAvailable] = useState(false);

  useEffect(() => {
    if (!id) return;
    setPaidRetryAvailable(!!getCachedDownloadProof(id));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchListing(id)
      .then(setListing)
      .catch(() => setError(msg("errorLoad")));
  }, [id, msg]);

  useEffect(() => {
    if (!listing) return;
    let cancelled = false;
    setPreviewLoad({ status: "loading" });

    resolvePreviewContentType(listing)
      .then((previewContentType) => {
        if (cancelled) return;
        const kind = previewRenderKind(previewContentType);
        if (kind === "text") {
          fetchTextPreview(listing)
            .then((text) => {
              if (cancelled) return;
              if (text) {
                setPreviewLoad({
                  status: "ready",
                  preview: { kind: "text", text },
                });
              } else {
                setPreviewLoad({ status: "unavailable" });
              }
            })
            .catch(() => {
              if (!cancelled) setPreviewLoad({ status: "unavailable" });
            });
          return;
        }
        if (kind === "unavailable") {
          setPreviewLoad({ status: "unavailable" });
          return;
        }
        setPreviewLoad({
          status: "ready",
          preview: {
            kind: "media",
            url: listingPreviewUrl(listing),
            contentType: previewContentType,
            loaded: false,
          },
        });
      })
      .catch(() => {
        if (!cancelled) setPreviewLoad({ status: "unavailable" });
      });

    return () => {
      cancelled = true;
    };
  }, [listing]);

  const markMediaFailed = () => {
    setPreviewLoad({ status: "unavailable" });
  };

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
      setPaidRetryAvailable(false);
      triggerDownload(blob, listing?.title ?? "download");
    } catch (e) {
      if (e instanceof PaidDownloadTransferError || getCachedDownloadProof(id)) {
        setPaidRetryAvailable(true);
        setError(msg("downloadPaidRetryHint"));
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setBusy(false);
      setPaymentPhase(null);
    }
  };

  const onRetryPaidDownload = async () => {
    if (!id) return;
    setBusy(true);
    setPaymentPhase(null);
    setError(null);
    try {
      const blob = await retryPaidDownload(id, setPaymentPhase);
      setPaidRetryAvailable(false);
      triggerDownload(blob, listing?.title ?? "download");
    } catch (e) {
      if (e instanceof PaidDownloadTransferError || getCachedDownloadProof(id)) {
        setPaidRetryAvailable(true);
        setError(msg("downloadPaidRetryHint"));
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setBusy(false);
      setPaymentPhase(null);
    }
  };

  const onRecoverWithWallet = async () => {
    if (!id) return;
    setError(null);
    if (!publicKey) {
      setVisible(true);
      return;
    }
    if (!signMessage) {
      setError(msg("walletSignRequired"));
      return;
    }
    setBusy(true);
    setPaymentPhase(null);
    try {
      const blob = await redownloadWithWallet(
        id,
        {
          publicKey: publicKey.toBase58(),
          signMessage,
        },
        setPaymentPhase,
      );
      setPaidRetryAvailable(false);
      setConfirmOpen(false);
      triggerDownload(blob, listing?.title ?? "download");
    } catch (e) {
      if (e instanceof PaidDownloadTransferError) {
        setError(msg("downloadPaidRetryHint"));
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
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
      <article className="card listing-detail-card">
        <h1>{listing.title}</h1>
        <p className="meta">
          {listing.category} · {formatUsdc(listing.priceMicroUsdc)} USDC ·{" "}
          {listing.deliveryScheme}
          {listing.verifiedFeedbackCount != null && listing.verifiedFeedbackCount > 0 && (
            <>
              {" · "}
              <span id="quality-trust" className="quality-score" title={msg("qualityTooltip")}>
                {msg("qualityFromPurchases")}: {listing.qualityScore ?? "—"} (
                {listing.verifiedFeedbackCount} {msg("verifiedPurchases")})
              </span>
            </>
          )}
        </p>
        {listing.verifiedFeedbackCount != null && listing.verifiedFeedbackCount > 0 && (
          <p className="meta quality-explainer">{msg("qualityExplainer")}</p>
        )}
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
        {previewLoad.status === "loading" && (
          <div className="preview-box preview-box--loading">
            <strong>{msg("preview")}</strong>
            <div className="preview-loading">
              <span className="preview-spinner" aria-hidden="true" />
              <span>{msg("previewLoading")}</span>
            </div>
          </div>
        )}
        {previewLoad.status === "ready" && (
          <div
            className={`preview-box${mediaLoading ? " preview-box--loading" : ""}`}
          >
            <strong>{msg("preview")}</strong>
            {mediaLoading && (
              <div className="preview-loading">
                <span className="preview-spinner" aria-hidden="true" />
                <span>{msg("previewLoading")}</span>
              </div>
            )}
            {previewLoad.preview.kind === "text" ? (
              <pre style={{ margin: "0.5rem 0 0", whiteSpace: "pre-wrap" }}>
                {previewLoad.preview.text}
              </pre>
            ) : (
              <ListingPreviewMedia
                url={previewLoad.preview.url}
                contentType={previewLoad.preview.contentType}
                title={listing.title}
                previewLabel={`${msg("preview")}: ${listing.title}`}
                audioLabel={msg("categoryAudio")}
                imageClassName="listing-preview-media"
                videoClassName="listing-preview-media"
                audioClassName="listing-preview-media"
                pdfClassName="listing-preview-pdf"
                onLoaded={markMediaLoaded}
                onFailed={markMediaFailed}
              />
            )}
            {previewLoad.preview.kind === "media" &&
              previewRenderKind(previewLoad.preview.contentType) ===
                "unavailable" && (
                <p className="meta">{msg("previewUnavailable")}</p>
              )}
          </div>
        )}
        {previewLoad.status === "unavailable" && (
          <p className="meta">{msg("previewUnavailable")}</p>
        )}
        <div className="actions">
          {paidRetryAvailable && (
            <button
              type="button"
              className="control-btn primary"
              disabled={busy}
              onClick={() => void onRetryPaidDownload()}
            >
              {busy ? msg("paymentConfirmDownloading") : msg("retryPaidDownload")}
            </button>
          )}
          {(paidRetryAvailable || error) && publicKey && (
            <button
              type="button"
              className="control-btn"
              disabled={busy}
              onClick={() => void onRecoverWithWallet()}
            >
              {busy && paymentPhase
                ? paymentPhase === "signing"
                  ? msg("paymentConfirmSigning")
                  : msg("paymentConfirmDownloading")
                : msg("recoverWithWallet")}
            </button>
          )}
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
