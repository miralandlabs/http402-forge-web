import { API_BASE } from "./api";

/** Preview/devnet uses a lower sweep threshold for faster testing. */
const SWEEP_PREVIEW_USDC = "0.10";
const SWEEP_MAINNET_USDC = "3.00";

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

export function isPreviewEnvironment(rpcEndpoint: string): boolean {
  const rpc = rpcEndpoint.toLowerCase();
  const api = API_BASE.toLowerCase();
  if (rpc.includes("devnet") || rpc.includes("testnet")) return true;
  if (
    api.includes("preview.") ||
    api.includes("127.0.0.1") ||
    api.includes("localhost")
  ) {
    return true;
  }
  return false;
}

export function sweepThresholdUsdc(rpcEndpoint: string): string {
  return isPreviewEnvironment(rpcEndpoint)
    ? SWEEP_PREVIEW_USDC
    : SWEEP_MAINNET_USDC;
}
