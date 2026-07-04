import { describe, expect, it } from "vitest";
import { isSolanaWalletAddress, resolveBrowseSearch } from "./browseSearch";

const WALLET = "buyA5hR1Z9KtHQRBTmLkjsFfjAabDwdZtrRC6edqxAJ";

describe("isSolanaWalletAddress", () => {
  it("accepts a base58 pubkey", () => {
    expect(isSolanaWalletAddress(WALLET)).toBe(true);
  });

  it("rejects text, short strings, and base58-invalid chars", () => {
    expect(isSolanaWalletAddress("cyberpunk art")).toBe(false);
    expect(isSolanaWalletAddress("abc")).toBe(false);
    expect(isSolanaWalletAddress("0OIl".repeat(10))).toBe(false);
  });
});

describe("resolveBrowseSearch", () => {
  it("returns empty for blank input", () => {
    expect(resolveBrowseSearch("  ")).toEqual({});
  });

  it("routes wallet-shaped input to sellerWallet", () => {
    expect(resolveBrowseSearch(` ${WALLET} `)).toEqual({ sellerWallet: WALLET });
  });

  it("routes plain text to q", () => {
    expect(resolveBrowseSearch("prompt pack")).toEqual({ q: "prompt pack" });
  });

  it("keeps URL seller filter and searches within it", () => {
    expect(resolveBrowseSearch("art", WALLET)).toEqual({
      sellerWallet: WALLET,
      q: "art",
    });
    expect(resolveBrowseSearch("", WALLET)).toEqual({
      sellerWallet: WALLET,
      q: undefined,
    });
  });
});
