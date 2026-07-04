import { useLocale } from "../hooks/useLocale";
import { SWEEP_MAINNET_USDC, SWEEP_PREVIEW_USDC } from "../services/pr402SellerFees";

export function SellerFeeRules() {
  const { msg } = useLocale();

  return (
    <div className="seller-fee-rules-block">
      <p className="seller-fee-rules-heading">{msg("sellerFeeRulesTitle")}</p>
      <ul className="seller-fee-rules">
        <li>{msg("sellerFeeRulePerPayment")}</li>
        <li>{msg("sellerFeeRuleRateSelf")}</li>
        <li>{msg("sellerFeeRuleRateLazy")}</li>
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
