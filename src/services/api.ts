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

/** R2 often omits Content-Type on GET; fall back to listing asset type for previews. */
export function previewResponseContentType(
  headerValue: string | null,
  listingContentType: string,
): string {
  const header = (headerValue ?? "").split(";")[0]?.trim() ?? "";
  if (
    header.startsWith("image/") ||
    header.startsWith("video/") ||
    header.startsWith("audio/")
  ) {
    return header;
  }
  const listing = listingContentType.split(";")[0]?.trim() ?? "";
  if (
    (header === "" || header === "application/octet-stream") &&
    (listing.startsWith("image/") ||
      listing.startsWith("video/") ||
      listing.startsWith("audio/"))
  ) {
    return listing;
  }
  return header;
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
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `delist-challenge ${res.status}`,
    );
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
    if (err.details?.length) {
      throw new Error(
        err.details.map((d) => `${d.field}: ${d.message}`).join(" · "),
      );
    }
    throw new Error(err.message ?? err.error ?? `create ${res.status}`);
  }
  return parseListing((await res.json()) as Record<string, unknown>);
}

const DEFAULT_FACILITATOR =
  import.meta.env.VITE_FACILITATOR_BASE_URL?.replace(/\/$/, "") ??
  "https://preview.ipay.sh/api/v1/facilitator";

export type DownloadQuote =
  | { kind: "paymentRequired"; challenge: PaymentRequiredBody }
  | { kind: "ready"; blob: Blob };

export async function fetchDownloadQuote(listingId: string): Promise<DownloadQuote> {
  const url = `${API_BASE}/api/v1/listings/${listingId}/download`;
  const res = await fetch(url);
  if (res.ok) {
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

export async function downloadWithPayment(
  listingId: string,
  challenge: PaymentRequiredBody,
  wallet: WalletSigner,
): Promise<Blob> {
  const url = `${API_BASE}/api/v1/listings/${listingId}/download`;
  const proofJson = await buildPaymentSignature(challenge, wallet, DEFAULT_FACILITATOR);

  const paid = await fetch(url, {
    headers: { "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(proofJson) },
  });
  if (!paid.ok) {
    const err = await paid.json().catch(() => ({}));
    throw new Error(err.error ?? err.message ?? `download ${paid.status}`);
  }
  return paid.blob();
}

export async function payAndDownload(
  listingId: string,
  wallet: WalletSigner,
): Promise<Blob> {
  const quote = await fetchDownloadQuote(listingId);
  if (quote.kind === "ready") return quote.blob;
  return downloadWithPayment(listingId, quote.challenge, wallet);
}
