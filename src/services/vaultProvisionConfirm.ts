export interface VaultProvisionConfirmDetails {
  networkLabel: string;
  walletShort: string;
  costEstimate: string;
  protocolFeeAfter: string;
  perPaymentFeeNote: string;
}

function shortAddress(addr: string): string {
  if (addr.length <= 8) return addr || "—";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function networkFromRpcEndpoint(endpoint: string): {
  label: string;
  isDevnet: boolean;
} {
  const e = endpoint.toLowerCase();
  if (e.includes("devnet")) {
    return { label: "Solana Devnet", isDevnet: true };
  }
  if (e.includes("testnet")) {
    return { label: "Solana Testnet", isDevnet: false };
  }
  return { label: "Solana Mainnet", isDevnet: false };
}

/** Self-provision tier (bps / 100 → percent string). */
export const SELF_PROVISION_FEE_PERCENT = "0.90";

export function buildVaultProvisionConfirmDetails(params: {
  wallet: string;
  rpcEndpoint: string;
  protocolFeeAfter?: string;
  perPaymentFeeNote: string;
}): VaultProvisionConfirmDetails {
  const { label, isDevnet } = networkFromRpcEndpoint(params.rpcEndpoint);
  const fee = params.protocolFeeAfter ?? `${SELF_PROVISION_FEE_PERCENT}%`;
  return {
    networkLabel: label,
    walletShort: shortAddress(params.wallet),
    costEstimate: isDevnet ? "< 0.005 SOL" : "< 0.01 SOL",
    protocolFeeAfter: fee,
    perPaymentFeeNote: params.perPaymentFeeNote,
  };
}
