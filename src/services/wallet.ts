/**
 * Browser x402 exact payment — PromptLearn web/src/lib/wallet.ts
 */

import { VersionedTransaction } from "@solana/web3.js";
import { Buffer } from "buffer";

export interface WalletSigner {
  publicKey: string;
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}

export interface PaymentRequiredBody {
  accepts?: Array<Record<string, unknown>>;
  resource?: unknown;
  extensions?: { pr402FacilitatorUrl?: string };
}

const CAPABILITIES_SUFFIX = /\/api\/v1\/facilitator\/capabilities\/?$/;

function facilitatorBase(
  capabilitiesOrFacUrl: string | undefined | null,
  fallbackBaseUrl: string,
): string {
  const raw = (capabilitiesOrFacUrl?.trim() || fallbackBaseUrl.trim()).replace(
    /\/+$/,
    "",
  );
  const stripped = raw.replace(CAPABILITIES_SUFFIX, "").replace(/\/+$/, "");
  if (stripped.endsWith("/api/v1/facilitator")) return stripped;
  if (stripped.endsWith("/api/v1")) return `${stripped}/facilitator`;
  return `${stripped}/api/v1/facilitator`;
}

function pickExactAcceptLine(
  accepts: Array<Record<string, unknown>> | undefined,
): Record<string, unknown> | undefined {
  return accepts?.find(
    (a) => a.scheme === "exact" || a.scheme === "v2:solana:exact",
  );
}

function canonicalAcceptedForBuild<T extends Record<string, unknown>>(accepted: T): T {
  if (accepted.scheme === "v2:solana:exact") {
    return { ...accepted, scheme: "exact" };
  }
  return accepted;
}

async function fetchExactRailExtra(
  facilitatorBase: string,
): Promise<Record<string, string>> {
  const res = await fetch(`${facilitatorBase}/capabilities`);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`capabilities HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = JSON.parse(text) as {
    supported?: { kinds?: Array<{ scheme?: string; extra?: Record<string, unknown> }> };
  };
  const kind = data.supported?.kinds?.find((k) => k.scheme === "exact");
  if (!kind?.extra) {
    throw new Error("capabilities: no exact rail extra (feePayer, programId, …)");
  }
  return Object.fromEntries(
    Object.entries(kind.extra).filter(
      (entry): entry is [string, string] => entry[1] != null,
    ),
  );
}

export async function buildPaymentSignature(
  paymentRequired: PaymentRequiredBody,
  wallet: WalletSigner,
  defaultFacilitatorBase: string,
): Promise<string> {
  const acceptLine = pickExactAcceptLine(paymentRequired.accepts);
  if (!acceptLine) {
    throw new Error(
      "No exact rail in accepts[] (scheme 'exact'). Run npm run enrich on this Supabase.",
    );
  }

  const extra = acceptLine.extra;
  const capUrl =
    extra && typeof extra === "object" && extra !== null && "capabilitiesUrl" in extra
      ? String((extra as { capabilitiesUrl?: string }).capabilitiesUrl ?? "")
      : "";

  const base = facilitatorBase(
    capUrl || paymentRequired.extensions?.pr402FacilitatorUrl || null,
    defaultFacilitatorBase,
  );
  const accepted = canonicalAcceptedForBuild(acceptLine);

  const buildRes = await fetch(`${base}/build-exact-payment-tx`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Version": "1",
    },
    body: JSON.stringify({
      payer: wallet.publicKey,
      accepted,
      resource: paymentRequired.resource,
      skipSourceBalanceCheck: true,
    }),
  });

  const buildText = await buildRes.text();
  if (!buildRes.ok) {
    throw new Error(`build-exact-payment-tx failed: ${buildText}`);
  }

  const buildData = JSON.parse(buildText) as {
    transaction: string;
    feePayer?: string;
    verifyBodyTemplate: {
      paymentPayload: {
        accepted: { extra?: Record<string, unknown> };
        payload: { transaction?: string };
      };
      paymentRequirements?: { extra?: Record<string, unknown> };
    };
  };

  if (!buildData.transaction || !buildData.verifyBodyTemplate) {
    throw new Error("Facilitator build response missing transaction or verifyBodyTemplate");
  }

  const tx = VersionedTransaction.deserialize(
    Buffer.from(buildData.transaction, "base64"),
  );
  const signed = await wallet.signTransaction(tx);
  const signedTxBase64 = Buffer.from(signed.serialize()).toString("base64");

  const railExtra = await fetchExactRailExtra(base);
  const sellerExtra =
    acceptLine.extra && typeof acceptLine.extra === "object" && acceptLine.extra !== null
      ? (acceptLine.extra as Record<string, unknown>)
      : {};
  const feePayer = buildData.feePayer ?? railExtra.feePayer;
  if (!feePayer) {
    throw new Error("facilitator did not return feePayer (build response or capabilities)");
  }

  const acceptedExtra: Record<string, unknown> = {
    ...railExtra,
    ...sellerExtra,
    feePayer,
  };

  const tpl = buildData.verifyBodyTemplate;
  const verifyBody = {
    ...tpl,
    feePayer,
    paymentPayload: {
      ...tpl.paymentPayload,
      accepted: {
        ...tpl.paymentPayload.accepted,
        extra: acceptedExtra,
      },
      payload: {
        ...tpl.paymentPayload.payload,
        transaction: signedTxBase64,
      },
    },
    paymentRequirements: {
      ...tpl.paymentRequirements,
      extra: {
        ...(tpl.paymentRequirements?.extra ?? {}),
        ...acceptedExtra,
      },
    },
  };

  return JSON.stringify(verifyBody);
}
