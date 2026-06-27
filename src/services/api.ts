import { Buffer } from "buffer";
import { getLocale, t } from "../i18n";
import { buildPaymentSignature, type PaymentRequiredBody, type WalletSigner } from "./wallet";

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

/** Browser fetch headers must be ISO-8859-1 — base64 proof JSON (PromptLearn api.ts). */
function encodePaymentSignatureHeader(proofJson: string): string {
  return Buffer.from(proofJson, "utf8").toString("base64");
}

export interface Listing {
  id: string;
  sellerWallet: string;
  displayName?: string;
  title: string;
  description: string;
  category: string;
  priceMicroUsdc: number;
  contentType: string;
  byteSize: number;
  agentFriendly: boolean;
  deliveryScheme: string;
  previewUrl: string;
  previewPdfUrl?: string;
  previewContentType: string;
  tags: string[];
  license?: string;
  contentHash?: string;
  qualityScore?: number;
  verifiedFeedbackCount?: number;
  createdAt: string;
}

function parseListing(raw: Record<string, unknown>): Listing {
  const price = raw.priceMicroUsdc ?? raw.price_micro_usdc;
  return {
    id: String(raw.id ?? ""),
    sellerWallet: String(raw.sellerWallet ?? raw.seller_wallet ?? ""),
    displayName: (raw.displayName ?? raw.display_name) as string | undefined,
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    category: String(raw.category ?? ""),
    priceMicroUsdc: Number(price),
    contentType: String(raw.contentType ?? raw.content_type ?? ""),
    byteSize: Number(raw.byteSize ?? raw.byte_size ?? 0),
    agentFriendly: Boolean(raw.agentFriendly ?? raw.agent_friendly),
    deliveryScheme: String(raw.deliveryScheme ?? raw.delivery_scheme ?? ""),
    previewUrl: String(raw.previewUrl ?? raw.preview_url ?? ""),
    previewPdfUrl:
      String(raw.previewPdfUrl ?? raw.preview_pdf_url ?? "").trim() || undefined,
    previewContentType: String(
      raw.previewContentType ?? raw.preview_content_type ?? "",
    ),
    tags: Array.isArray(raw.tags)
      ? (raw.tags as unknown[]).map(String)
      : [],
    license: (raw.license as string | undefined) ?? undefined,
    contentHash: String(raw.contentHash ?? raw.content_hash ?? "") || undefined,
    qualityScore:
      raw.qualityScore != null || raw.quality_score != null
        ? Number(raw.qualityScore ?? raw.quality_score)
        : undefined,
    verifiedFeedbackCount:
      raw.verifiedFeedbackCount != null || raw.verified_feedback_count != null
        ? Number(raw.verifiedFeedbackCount ?? raw.verified_feedback_count)
        : undefined,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
  };
}

export interface ListResponse {
  items: Listing[];
  total: number;
}

export async function fetchListings(params: {
  category?: string;
  q?: string;
  sellerWallet?: string;
  sort?: string;
}): Promise<ListResponse> {
  const q = new URLSearchParams();
  if (params.category) q.set("category", params.category);
  if (params.q) q.set("q", params.q);
  if (params.sellerWallet) q.set("seller_wallet", params.sellerWallet);
  if (params.sort) q.set("sort", params.sort);
  const res = await fetch(`${API_BASE}/api/v1/listings?${q}`);
  if (!res.ok) throw new Error(`listings ${res.status}`);
  const data = (await res.json()) as { items: Record<string, unknown>[]; total: number };
  return {
    total: data.total,
    items: data.items.map(parseListing),
  };
}

export async function fetchListing(id: string): Promise<Listing> {
  const res = await fetch(`${API_BASE}/api/v1/listings/${id}`);
  if (!res.ok) throw new Error(`listing ${res.status}`);
  return parseListing((await res.json()) as Record<string, unknown>);
}

export function formatUsdc(micro: number): string {
  if (!Number.isFinite(micro)) return "—";
  return (micro / 1_000_000).toFixed(micro % 1_000_000 === 0 ? 2 : 4);
}

export interface SellerChallenge {
  message: string;
  expiresAt: string;
}

export async function fetchSellerChallenge(
  sellerWallet: string,
): Promise<SellerChallenge> {
  const q = new URLSearchParams({ seller_wallet: sellerWallet });
  const res = await fetch(`${API_BASE}/api/v1/seller/challenge?${q}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`challenge ${res.status}`);
  const raw = (await res.json()) as Record<string, unknown>;
  return {
    message: String(raw.message ?? ""),
    expiresAt: String(raw.expiresAt ?? raw.expires_at ?? ""),
  };
}

export async function fetchDelistChallenge(
  sellerWallet: string,
  listingId: string,
): Promise<SellerChallenge> {
  const q = new URLSearchParams({
    seller_wallet: sellerWallet,
    listing_id: listingId,
  });
  const res = await fetch(`${API_BASE}/api/v1/seller/delist-challenge?${q}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    let err = {} as { error?: string };
    if (text) {
      try {
        err = JSON.parse(text);
      } catch {
        /* plain 404 from stale API without route */
      }
    }
    if (res.status === 404 && !text.trim()) {
      throw new Error(
        "Delist API is not available on this host (stale deploy). Redeploy http402-forge-api.",
      );
    }
    throw new Error(err.error ?? `delist-challenge ${res.status}`);
  }
  const raw = (await res.json()) as Record<string, unknown>;
  return {
    message: String(raw.message ?? ""),
    expiresAt: String(raw.expiresAt ?? raw.expires_at ?? ""),
  };
}

export async function delistListing(
  listingId: string,
  sellerWallet: string,
  sellerChallenge: string,
  sellerSignature: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/listings/${listingId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seller_wallet: sellerWallet,
      seller_challenge: sellerChallenge,
      seller_signature: sellerSignature,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string; message?: string }).error ??
        (err as { message?: string }).message ??
        `delist ${res.status}`,
    );
  }
}

export async function createListing(form: FormData): Promise<Listing> {
  const res = await fetch(`${API_BASE}/api/v1/listings`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    let err = {} as {
      error?: string;
      message?: string;
      details?: Array<{ field: string; message: string }>;
    };
    if (text) {
      try {
        err = JSON.parse(text);
      } catch {
        /* Vite proxy errors are plain text */
      }
    }
    if (res.status === 500 && !text.trim()) {
      throw new Error(
        "Marketplace API is not running. Start http402-forge-api on port 8092.",
      );
    }
    if (res.status === 403) {
      throw new Error(
        err.error ?? err.message ?? t(getLocale(), "sellerVaultRequired"),
      );
    }
    if (res.status === 400 && (err.message ?? err.error ?? "").includes("moderation")) {
      throw new Error(err.message ?? err.error ?? t(getLocale(), "moderationBlocked"));
    }
    if (err.details?.length) {
      throw new Error(
        err.details.map((d) => `${d.field}: ${d.message}`).join(" · "),
      );
    }
    throw new Error(err.message ?? err.error ?? `create ${res.status}`);
  }
  return parseListing((await res.json()) as Record<string, unknown>);
}

export interface ForgeCapabilities {
  presignedUpload: boolean;
  presignedDownload: boolean;
  objectDelivery: "redirect" | "proxy";
}

export async function fetchCapabilities(): Promise<ForgeCapabilities | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/capabilities`, { cache: "no-store" });
    if (!res.ok) return null;
    const raw = (await res.json()) as Record<string, unknown>;
    return {
      presignedUpload: Boolean(raw.presignedUpload ?? raw.presigned_upload),
      presignedDownload: Boolean(raw.presignedDownload ?? raw.presigned_download),
      objectDelivery: (raw.objectDelivery ?? raw.object_delivery ?? "proxy") as
        | "redirect"
        | "proxy",
    };
  } catch {
    return null;
  }
}

export interface PresignedUploadTarget {
  objectKey: string;
  method: string;
  url: string;
  headers: Array<[string, string]>;
}

export interface UploadSession {
  listingId: string;
  expiresAt: string;
  asset: PresignedUploadTarget;
  preview?: PresignedUploadTarget;
}

async function putPresigned(target: PresignedUploadTarget, file: File): Promise<void> {
  const headers = new Headers();
  for (const [name, value] of target.headers) {
    headers.set(name, value);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", file.type || "application/octet-stream");
  }
  const res = await fetch(target.url, { method: target.method, headers, body: file });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`direct upload failed (${res.status})${text ? `: ${text.slice(0, 120)}` : ""}`);
  }
}

export async function createListingPresigned(args: {
  sellerWallet: string;
  sellerChallenge: string;
  sellerSignature: string;
  title: string;
  description: string;
  category: string;
  priceUsdc: string;
  agentFriendly: boolean;
  displayName?: string;
  tags?: string;
  license?: string;
  asset: File;
  preview?: File | null;
}): Promise<Listing> {
  const sessionRes = await fetch(`${API_BASE}/api/v1/listings/upload-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sellerWallet: args.sellerWallet,
      sellerChallenge: args.sellerChallenge,
      sellerSignature: args.sellerSignature,
      assetContentType: args.asset.type || "application/octet-stream",
      assetByteSize: args.asset.size,
      previewContentType: args.preview?.type || undefined,
      previewByteSize: args.preview?.size || undefined,
    }),
  });
  if (!sessionRes.ok) {
    const err = await sessionRes.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string; message?: string }).error ??
        (err as { message?: string }).message ??
        `upload-session ${sessionRes.status}`,
    );
  }
  const sessionRaw = (await sessionRes.json()) as Record<string, unknown>;
  const session: UploadSession = {
    listingId: String(sessionRaw.listingId ?? sessionRaw.listing_id ?? ""),
    expiresAt: String(sessionRaw.expiresAt ?? sessionRaw.expires_at ?? ""),
    asset: parsePresignedTarget(sessionRaw.asset),
    preview: sessionRaw.preview ? parsePresignedTarget(sessionRaw.preview) : undefined,
  };

  await putPresigned(session.asset, args.asset);
  if (session.preview && args.preview) {
    await putPresigned(session.preview, args.preview);
  }

  const completeRes = await fetch(`${API_BASE}/api/v1/listings/complete-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      listingId: session.listingId,
      sellerWallet: args.sellerWallet,
      sellerChallenge: args.sellerChallenge,
      sellerSignature: args.sellerSignature,
      title: args.title,
      description: args.description,
      category: args.category,
      priceUsdc: args.priceUsdc,
      agentFriendly: args.agentFriendly,
      displayName: args.displayName,
      tags: args.tags,
      license: args.license || undefined,
      previewUploaded: Boolean(session.preview && args.preview),
    }),
  });
  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string; message?: string }).error ??
        (err as { message?: string }).message ??
        `complete-upload ${completeRes.status}`,
    );
  }
  return parseListing((await completeRes.json()) as Record<string, unknown>);
}

function parsePresignedTarget(raw: unknown): PresignedUploadTarget {
  const o = (raw ?? {}) as Record<string, unknown>;
  const headersRaw = o.headers;
  const headers: Array<[string, string]> = Array.isArray(headersRaw)
    ? headersRaw.map((pair) => {
        const [k, v] = pair as [string, string];
        return [String(k), String(v)];
      })
    : [];
  return {
    objectKey: String(o.objectKey ?? o.object_key ?? ""),
    method: String(o.method ?? "PUT"),
    url: String(o.url ?? ""),
    headers,
  };
}

export interface RedirectDelivery {
  delivery: "redirect";
  url: string;
  expiresInSecs: number;
  contentType: string;
  contentDisposition?: string;
  saleId?: string;
}

function triggerUrlDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.target = "_blank";
  a.click();
}

async function fetchRedirectDelivery(
  url: string,
  headers: Record<string, string>,
): Promise<RedirectDelivery> {
  const res = await fetch(`${url}?delivery=json`, { headers, cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string; message?: string }).error ??
        (err as { message?: string }).message ??
        `download ${res.status}`,
    );
  }
  const raw = (await res.json()) as Record<string, unknown>;
  return {
    delivery: "redirect",
    url: String(raw.url ?? ""),
    expiresInSecs: Number(raw.expiresInSecs ?? raw.expires_in_secs ?? 0),
    contentType: String(raw.contentType ?? raw.content_type ?? ""),
    contentDisposition: String(raw.contentDisposition ?? raw.content_disposition ?? "") || undefined,
    saleId: String(raw.saleId ?? raw.sale_id ?? "") || undefined,
  };
}

async function downloadBlobFromDelivery(
  url: string,
  headers: Record<string, string>,
  filename: string,
): Promise<Blob> {
  const delivery = await fetchRedirectDelivery(url, headers);
  try {
    const direct = await fetch(delivery.url);
    if (direct.ok) return direct.blob();
  } catch {
    /* fall back to navigation download if R2 CORS blocks fetch */
  }
  triggerUrlDownload(delivery.url, filename);
  return new Blob([], { type: delivery.contentType || "application/octet-stream" });
}

async function downloadPaidAsset(
  url: string,
  headers: Record<string, string>,
  filename: string,
  listingId: string,
): Promise<Blob> {
  try {
    const blob = await downloadBlobFromDelivery(url, headers, filename);
    clearDownloadProof(listingId);
    return blob;
  } catch (e) {
    throw new PaidDownloadTransferError(listingId, e);
  }
}

const DEFAULT_FACILITATOR =
  import.meta.env.VITE_FACILITATOR_BASE_URL?.replace(/\/$/, "") ??
  "https://preview.ipay.sh/api/v1/facilitator";

export type DownloadQuote =
  | { kind: "paymentRequired"; challenge: PaymentRequiredBody }
  | { kind: "ready"; blob: Blob };

export async function fetchDownloadQuote(listingId: string): Promise<DownloadQuote> {
  const url = `${API_BASE}/api/v1/listings/${listingId}/download?delivery=json`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const raw = (await res.json()) as Record<string, unknown>;
      const directUrl = String(raw.url ?? "");
      if (directUrl) {
        const direct = await fetch(directUrl);
        if (!direct.ok) throw new Error(`download ${direct.status}`);
        return { kind: "ready", blob: await direct.blob() };
      }
    }
    return { kind: "ready", blob: await res.blob() };
  }
  if (res.status !== 402) {
    throw new Error(`expected 402, got ${res.status}`);
  }
  return {
    kind: "paymentRequired",
    challenge: (await res.json()) as PaymentRequiredBody,
  };
}

export type PaymentProgressPhase = "signing" | "settling" | "downloading";

const downloadProofKey = (listingId: string) => `forge:download-proof:${listingId}`;

export function getCachedDownloadProof(listingId: string): string | null {
  try {
    return sessionStorage.getItem(downloadProofKey(listingId));
  } catch {
    return null;
  }
}

function cacheDownloadProof(listingId: string, proofJson: string) {
  try {
    sessionStorage.setItem(downloadProofKey(listingId), proofJson);
  } catch {
    /* quota / private mode */
  }
}

export function clearDownloadProof(listingId: string) {
  try {
    sessionStorage.removeItem(downloadProofKey(listingId));
  } catch {
    /* ignore */
  }
}

export class PaidDownloadTransferError extends Error {
  readonly listingId: string;

  constructor(listingId: string, cause: unknown) {
    const detail =
      cause instanceof Error && cause.message ? cause.message : "network error";
    super(detail);
    this.name = "PaidDownloadTransferError";
    this.listingId = listingId;
  }
}

async function downloadWithStoredProof(
  listingId: string,
  proofJson: string,
  onProgress?: (phase: PaymentProgressPhase) => void,
): Promise<Blob> {
  const url = `${API_BASE}/api/v1/listings/${listingId}/download`;
  onProgress?.("downloading");
  const headers = { "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(proofJson) };
  return downloadPaidAsset(url, headers, listingId, listingId);
}

export async function retryPaidDownload(
  listingId: string,
  onProgress?: (phase: PaymentProgressPhase) => void,
): Promise<Blob> {
  const proofJson = getCachedDownloadProof(listingId);
  if (!proofJson) {
    throw new Error("No saved payment proof for this listing.");
  }
  return downloadWithStoredProof(listingId, proofJson, onProgress);
}

export async function downloadWithPayment(
  listingId: string,
  challenge: PaymentRequiredBody,
  wallet: WalletSigner,
  onProgress?: (phase: PaymentProgressPhase) => void,
): Promise<Blob> {
  const url = `${API_BASE}/api/v1/listings/${listingId}/download`;
  onProgress?.("signing");
  const proofJson = await buildPaymentSignature(challenge, wallet, DEFAULT_FACILITATOR);

  onProgress?.("settling");
  cacheDownloadProof(listingId, proofJson);
  onProgress?.("downloading");
  const headers = { "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(proofJson) };
  return downloadPaidAsset(url, headers, listingId, listingId);
}

export async function payAndDownload(
  listingId: string,
  wallet: WalletSigner,
): Promise<Blob> {
  const quote = await fetchDownloadQuote(listingId);
  if (quote.kind === "ready") return quote.blob;
  return downloadWithPayment(listingId, quote.challenge, wallet);
}

function encodeUtf8Header(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

export interface RedownloadChallenge {
  message: string;
  expiresAt: string;
  saleId: string;
}

export async function fetchRedownloadChallenge(
  buyerWallet: string,
  listingId: string,
): Promise<RedownloadChallenge> {
  const q = new URLSearchParams({
    buyer_wallet: buyerWallet,
    listing_id: listingId,
  });
  const res = await fetch(`${API_BASE}/api/v1/buyer/redownload-challenge?${q}`, {
    cache: "no-store",
  });
  if (res.status === 404) {
    throw new Error("No purchase found for this wallet on this listing.");
  }
  if (!res.ok) throw new Error(`redownload-challenge ${res.status}`);
  const raw = (await res.json()) as Record<string, unknown>;
  return {
    message: String(raw.message ?? ""),
    expiresAt: String(raw.expiresAt ?? raw.expires_at ?? ""),
    saleId: String(raw.saleId ?? raw.sale_id ?? ""),
  };
}

export type WalletMessageSigner = {
  publicKey: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
};

export async function redownloadWithWallet(
  listingId: string,
  wallet: WalletMessageSigner,
  onProgress?: (phase: PaymentProgressPhase) => void,
): Promise<Blob> {
  onProgress?.("signing");
  const challenge = await fetchRedownloadChallenge(wallet.publicKey, listingId);
  const challengeMessage = challenge.message.replace(/\r\n/g, "\n");
  const signature = await wallet.signMessage(
    new TextEncoder().encode(challengeMessage),
  );

  onProgress?.("downloading");
  const url = `${API_BASE}/api/v1/listings/${listingId}/redownload`;
  const headers = {
    "X-Forge-Buyer-Wallet": wallet.publicKey,
    "X-Forge-Buyer-Challenge": encodeUtf8Header(challengeMessage),
    "X-Forge-Buyer-Signature": Buffer.from(signature).toString("base64"),
  };
  return downloadPaidAsset(url, headers, listingId, listingId);
}
