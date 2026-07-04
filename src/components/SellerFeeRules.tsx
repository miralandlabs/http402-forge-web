import { useLocale } from "../hooks/useLocale";
import {
  LAZY_PROVISION_FEE_BPS,
  SELF_PROVISION_FEE_BPS,
  SWEEP_MAINNET_USDC,
  SWEEP_PREVIEW_USDC,
} from "../services/pr402SellerFees";

interface SellerFeeRulesProps {
  /** Set when vault is active — shows the matching tier (90 vs 100 bps). */
  feeBps?: number;
}

export function SellerFeeRules({ feeBps }: SellerFeeRulesProps) {
  const { msg } = useLocale();

  const rateLines = (() => {
    if (feeBps === SELF_PROVISION_FEE_BPS) {
      return <li>{msg("sellerFeeRuleRateSelf")}</li>;
    }
    if (feeBps === LAZY_PROVISION_FEE_BPS) {
      return <li>{msg("sellerFeeRuleRateLazy")}</li>;
    }
    return (
      <>
        <li>{msg("sellerFeeRuleRateSelf")}</li>
        <li>{msg("sellerFeeRuleRateLazy")}</li>
      </>
    );
  })();

  return (
    <div className="seller-fee-rules-block">
      <p className="seller-fee-rules-heading">{msg("sellerFeeRulesTitle")}</p>
      <ul className="seller-fee-rules">
        <li>{msg("sellerFeeRulePerPayment")}</li>
        {rateLines}
        <li>{msg("sellerFeeRuleMin")}</li>
        <li>
          {msg("sellerFeeRuleSweep")
            .replace("{mainnet}", SWEEP_MAINNET_USDC)
            .replace("{preview}", SWEEP_PREVIEW_USDC)}
        </li>
      </ul>
    </div>
  );
}
