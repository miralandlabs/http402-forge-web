const BASE58_WALLET = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isSolanaWalletAddress(value: string): boolean {
  const trimmed = value.trim();
  return BASE58_WALLET.test(trimmed);
}

/** Split browse search input into text query vs seller wallet filter. */
export function resolveBrowseSearch(
  input: string,
  urlSellerWallet?: string,
): { q?: string; sellerWallet?: string } {
  const trimmed = input.trim();
  if (urlSellerWallet) {
    return {
      sellerWallet: urlSellerWallet,
      q: trimmed || undefined,
    };
  }
  if (!trimmed) return {};
  if (isSolanaWalletAddress(trimmed)) {
    return { sellerWallet: trimmed };
  }
  return { q: trimmed };
}
