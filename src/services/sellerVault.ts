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
  return (await res.json()) as ProvisionTxResponse;
}

export async function activateSellerVault(params: {
  sellerWallet: string;
  connection: Connection;
  signTransaction: (
    tx: VersionedTransaction,
  ) => Promise<VersionedTransaction>;
}): Promise<void> {
  const body = await fetchProvisionTx(params.sellerWallet);
  if (
    body.alreadyProvisioned ||
    body.statusCode === "ALREADY_PROVISIONED" ||
    !body.transaction
  ) {
    return;
  }

  const tx = VersionedTransaction.deserialize(
    Buffer.from(body.transaction, "base64"),
  );
  const signed = await params.signTransaction(tx);
  const sig = await params.connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await params.connection.confirmTransaction(sig, "confirmed");
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
