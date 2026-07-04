import { describe, expect, it } from "vitest";
import { parsePaymentConfirmDetails } from "./paymentConfirm";
import type { PaymentRequiredBody } from "./wallet";

const USDC_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function challenge(overrides?: Partial<PaymentRequiredBody>): PaymentRequiredBody {
  return {
    x402Version: 2,
    resource: {
      url: "https://forge.http402.trade/api/v1/listings/x/download",
      description: "Download: Cyberpunk pack",
      mimeType: "application/json",
    },
    accepts: [
      {
        scheme: "exact",
        network: "mainnet-beta",
        asset: USDC_MAINNET,
        amount: "50000",
        payTo: "buyA5hR1Z9KtHQRBTmLkjsFfjAabDwdZtrRC6edqxAJ",
      },
    ],
    extensions: { forge: { deliveryScheme: "exact" } },
    ...overrides,
  } as PaymentRequiredBody;
}

describe("parsePaymentConfirmDetails", () => {
  it("parses amount, token, network, and recipient from the accept line", () => {
    const d = parsePaymentConfirmDetails(challenge());
    expect(d.amountUi).toBe("0.0500");
    expect(d.tokenSymbol).toBe("USDC");
    expect(d.networkLabel).toBe("Solana Mainnet");
    expect(d.recipientShort).toBe("buyA…qxAJ");
    expect(d.deliveryScheme).toBe("exact");
    expect(d.schemeLabel).toBe("Instant (exact)");
  });

  it("strips the Download: prefix for the product title", () => {
    const d = parsePaymentConfirmDetails(challenge());
    expect(d.productTitle).toBe("Cyberpunk pack");
  });

  it("survives a challenge with no matching accept line", () => {
    const d = parsePaymentConfirmDetails(challenge({ accepts: [] }));
    expect(d.amountUi).toBe("—");
    expect(d.recipientShort).toBe("—");
  });

  it("flags exact-rail listings at or above $10", () => {
    const low = parsePaymentConfirmDetails(challenge());
    expect(low.exactRailAboveSuggested).toBe(false);

    const high = parsePaymentConfirmDetails(
      challenge({
        accepts: [
          {
            scheme: "exact",
            network: "mainnet-beta",
            asset: USDC_MAINNET,
            amount: "10000000",
            payTo: "buyA5hR1Z9KtHQRBTmLkjsFfjAabDwdZtrRC6edqxAJ",
          },
        ],
      }),
    );
    expect(high.exactRailAboveSuggested).toBe(true);
  });
});
