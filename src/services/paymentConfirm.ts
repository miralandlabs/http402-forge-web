import type { Listing } from "./api";
import type { PaymentRequiredBody } from "./wallet";

const TOKEN_REGISTRY: Record<string, { symbol: string; decimals: number }> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: "USDC", decimals: 6 },
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": { symbol: "USDC", decimals: 6 },
};

const NETWORK_REGISTRY: Record<string, string> = {
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": "Solana Mainnet",
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": "Solana Devnet",
  "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z": "Solana Testnet",
  "mainnet-beta": "Solana Mainnet",
  devnet: "Solana Devnet",
  testnet: "Solana Testnet",
};

export interface PaymentConfirmDetails {
  productTitle: string;
  amountUi: string;
  tokenSymbol: string;
  networkLabel: string;
  recipientShort: string;
  purpose: string;
  deliveryScheme: "exact" | "escrow";
  mimeType: string;
  schemeLabel: string;
  platformFeeBps?: number;
  platformFeeWallet?: string;
}

function pickAcceptLine(
  accepts: Array<Record<string, unknown>> | undefined,
): Record<string, unknown> | undefined {
  return accepts?.find((a) => {
    const scheme = String(a.scheme ?? "");
    return scheme === "exact" || scheme === "v2:solana:exact" || scheme === "sla-escrow";
  });
}

function shortAddress(addr: string): string {
  if (addr.length <= 8) return addr || "—";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function formatAmount(raw: unknown, decimals: number): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return "—";
  const ui = n / 10 ** decimals;
  return ui.toFixed(decimals >= 9 ? 4 : ui % 1 === 0 ? 2 : 4);
}

function schemeLabel(scheme: string): string {
  if (scheme === "sla-escrow") return "SLA escrow";
  if (scheme === "v2:solana:exact" || scheme === "exact") return "Instant (exact)";
  return scheme || "—";
}

export function parsePaymentConfirmDetails(
  body: PaymentRequiredBody,
  listing?: Listing | null,
): PaymentConfirmDetails {
  const accepted = pickAcceptLine(body.accepts) ?? {};
  const asset = String(accepted.asset ?? "");
  const tokenInfo = TOKEN_REGISTRY[asset] ?? { symbol: "USDC", decimals: 6 };
  const network = String(accepted.network ?? "");
  const payTo = String(accepted.payTo ?? "");

  const resource =
    body.resource && typeof body.resource === "object"
      ? (body.resource as Record<string, unknown>)
      : null;

  const forgeExt =
    body.extensions &&
    typeof body.extensions === "object" &&
    "forge" in body.extensions &&
    body.extensions.forge &&
    typeof body.extensions.forge === "object"
      ? (body.extensions.forge as Record<string, unknown>)
      : null;

  const deliveryRaw = String(
    forgeExt?.deliveryScheme ?? listing?.deliveryScheme ?? "exact",
  );
  const deliveryScheme: "exact" | "escrow" =
    deliveryRaw === "escrow" ? "escrow" : "exact";

  const mimeType = String(
    resource?.mimeType ?? resource?.mime_type ?? listing?.contentType ?? "—",
  );

  const purpose = String(
    resource?.description ?? listing?.title ?? "Digital download",
  );

  const productTitle = listing?.title ?? purpose.replace(/^Download:\s*/i, "");

  let platformFeeBps: number | undefined;
  let platformFeeWallet: string | undefined;
  const split = accepted.split;
  if (split && typeof split === "object" && split !== null) {
    const s = split as Record<string, unknown>;
    const bps = Number(s.platformBps ?? s.platform_bps);
    const wallet = String(s.platformWallet ?? s.platform_wallet ?? "");
    if (Number.isFinite(bps) && bps > 0) platformFeeBps = bps;
    if (wallet) platformFeeWallet = wallet;
  }

  return {
    productTitle,
    amountUi: formatAmount(accepted.amount, tokenInfo.decimals),
    tokenSymbol: tokenInfo.symbol,
    networkLabel: NETWORK_REGISTRY[network] ?? network ?? "Solana",
    recipientShort: shortAddress(payTo),
    purpose,
    deliveryScheme,
    mimeType,
    schemeLabel: schemeLabel(String(accepted.scheme ?? "")),
    platformFeeBps,
    platformFeeWallet,
  };
}
