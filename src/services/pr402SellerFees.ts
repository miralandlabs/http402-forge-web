/** Mainnet/production sweep threshold (vault balance). */
export const SWEEP_MAINNET_USDC = "3.00";
/** Preview/devnet sweep threshold (vault balance) — for faster test cycles. */
export const SWEEP_PREVIEW_USDC = "0.10";

/** Self-provision (activate on Sell) vs lazy (first sale). */
export const SELF_PROVISION_FEE_BPS = 90;
export const LAZY_PROVISION_FEE_BPS = 100;

/** pr402 exact-rail suggested listing range [$0.05, $10.00) — guidance only. */
export const EXACT_RAIL_PRICE_MIN_USDC = 0.05;
export const EXACT_RAIL_PRICE_MAX_USDC = 10;

export type ExactRailPriceRangeIssue = "low" | "high";

export function exactRailPriceRangeIssue(
  priceUsdc: number,
): ExactRailPriceRangeIssue | null {
  if (!Number.isFinite(priceUsdc) || priceUsdc <= 0) return null;
  if (priceUsdc < EXACT_RAIL_PRICE_MIN_USDC) return "low";
  if (priceUsdc >= EXACT_RAIL_PRICE_MAX_USDC) return "high";
  return null;
}

export function priceMicroUsdcToUsdc(micro: number): number {
  return micro / 1_000_000;
}

/** Default sweep for single-value hints (production mainnet). */
export function sweepMainnetUsdc(): string {
  return SWEEP_MAINNET_USDC;
}
