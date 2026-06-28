import { Connection, VersionedTransaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { API_BASE } from "./api";

export interface SellerStatus {
  vaultActivated: boolean;
  canSell: boolean;
  vaultPda?: string;
  feeBps?: number;
  protocolFeePercent?: string;
  sellerDashboardUrl: string;
  vaultCheckEnforced: boolean;
}

export interface ProvisionTxResponse {
  statusCode?: string;
  alreadyProvisioned?: boolean;
  transaction?: string;
}

function parseSellerStatus(raw: Record<string, unknown>): SellerStatus {
  return {
    vaultActivated: Boolean(raw.vaultActivated ?? raw.vault_activated),
    canSell: Boolean(raw.canSell ?? raw.can_sell),
    vaultPda: (raw.vaultPda ?? raw.vault_pda) as string | undefined,
    feeBps: Number(raw.feeBps ?? raw.fee_bps ?? 0) || undefined,
    protocolFeePercent: (raw.protocolFeePercent ?? raw.protocol_fee_percent) as
      | string
      | undefined,
    sellerDashboardUrl: String(
      raw.sellerDashboardUrl ?? raw.seller_dashboard_url ?? "https://ipay.sh",
    ),
    vaultCheckEnforced: Boolean(
      raw.vaultCheckEnforced ?? raw.vault_check_enforced ?? true,
    ),
  };
}

export async function fetchSellerStatus(
  sellerWallet: string,
): Promise<SellerStatus> {
  const q = new URLSearchParams({ seller_wallet: sellerWallet });
  const res = await fetch(`${API_BASE}/api/v1/seller/status?${q}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `seller status ${res.status}`,
    );
  }
  return parseSellerStatus((await res.json()) as Record<string, unknown>);
}

export async function fetchProvisionTx(
  sellerWallet: string,
  asset = "USDC",
): Promise<ProvisionTxResponse> {
  const res = await fetch(`${API_BASE}/api/v1/seller/provision-tx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sellerWallet, asset }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `provision-tx ${res.status}`,
    );
  }
  return parseProvisionResponse((await res.json()) as Record<string, unknown>);
}

export function isRpcBroadcastForbidden(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return /403|forbidden|access forbidden/i.test(raw);
}

export function isTransactionConfirmTimeout(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return /not confirmed in/i.test(raw);
}

/** Wallet adapters embed the signature when RPC confirm times out after broadcast. */
export function extractSignatureFromError(err: unknown): string | null {
  const raw = err instanceof Error ? err.message : String(err);
  const match = raw.match(/signature `([1-9A-HJ-NP-Za-km-z]{87,88})`/);
  return match?.[1] ?? null;
}

function parseProvisionResponse(raw: Record<string, unknown>): ProvisionTxResponse {
  return {
    statusCode: (raw.statusCode ?? raw.status_code) as string | undefined,
    alreadyProvisioned: Boolean(
      raw.alreadyProvisioned ?? raw.already_provisioned ?? false,
    ),
    transaction: (raw.transaction as string | undefined) ?? undefined,
  };
}

export class VaultActivationPendingError extends Error {
  readonly signature: string;

  constructor(signature: string) {
    super("vault activation pending");
    this.name = "VaultActivationPendingError";
    this.signature = signature;
  }
}

export function solscanTxUrl(signature: string, rpcEndpoint: string): string {
  const cluster = rpcEndpoint.toLowerCase().includes("devnet")
    ? "?cluster=devnet"
    : "";
  return `https://solscan.io/tx/${signature}${cluster}`;
}

export async function activateSellerVault(params: {
  sellerWallet: string;
  connection: Connection;
  sendTransaction: (
    tx: VersionedTransaction,
    connection: Connection,
  ) => Promise<string>;
}): Promise<string> {
  const body = await fetchProvisionTx(params.sellerWallet);
  if (
    body.alreadyProvisioned ||
    body.statusCode === "ALREADY_PROVISIONED" ||
    !body.transaction
  ) {
    return "";
  }

  const tx = VersionedTransaction.deserialize(
    Buffer.from(body.transaction, "base64"),
  );
  try {
    return await params.sendTransaction(tx, params.connection);
  } catch (e) {
    // Wallets often broadcast then throw when their internal confirm hits ~30s.
    const sig = extractSignatureFromError(e);
    if (sig && isTransactionConfirmTimeout(e)) return sig;
    throw e;
  }
}

export function isSellerVaultReady(status: SellerStatus): boolean {
  return status.vaultActivated || (status.canSell && !status.vaultCheckEnforced);
}

export async function activateAndWaitForSellerVault(params: {
  sellerWallet: string;
  connection: Connection;
  sendTransaction: (
    tx: VersionedTransaction,
    connection: Connection,
  ) => Promise<string>;
  pollAttempts?: number;
  pollDelayMs?: number;
  onBroadcast?: () => void;
}): Promise<SellerStatus> {
  const sig = await activateSellerVault(params);
  params.onBroadcast?.();
  const attempts = params.pollAttempts ?? 45;
  const delayMs = params.pollDelayMs ?? 2000;
  const status = await waitForSellerVault(params.sellerWallet, attempts, delayMs);
  if (isSellerVaultReady(status)) return status;
  if (sig) throw new VaultActivationPendingError(sig);
  throw new Error("vault activation status unavailable");
}

export async function waitForSellerVault(
  sellerWallet: string,
  attempts = 12,
  delayMs = 2500,
): Promise<SellerStatus> {
  for (let i = 0; i < attempts; i += 1) {
    const status = await fetchSellerStatus(sellerWallet);
    if (status.vaultActivated) return status;
    if (status.canSell && !status.vaultCheckEnforced) return status;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return fetchSellerStatus(sellerWallet);
}
