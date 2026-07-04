import { useMemo } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useLocale } from "../hooks/useLocale";
import { sweepThresholdUsdc } from "../services/pr402SellerFees";

interface SellerFeeRulesProps {
  /** When set, show the seller's active rate instead of self vs lazy tiers. */
  activeFeePercent?: string;
}

export function SellerFeeRules({ activeFeePercent }: SellerFeeRulesProps) {
  const { msg } = useLocale();
  const { connection } = useConnection();
  const sweep = useMemo(
    () => sweepThresholdUsdc(connection.rpcEndpoint),
    [connection.rpcEndpoint],
  );

  return (
    <div className="seller-fee-rules-block">
      <p className="seller-fee-rules-heading">{msg("sellerFeeRulesTitle")}</p>
      <ul className="seller-fee-rules">
        <li>{msg("sellerFeeRulePerPayment")}</li>
        {activeFeePercent ? (
          <li>{msg("sellerFeeRuleActiveRate").replace("{fee}", activeFeePercent)}</li>
        ) : (
          <>
            <li>{msg("sellerFeeRuleRateSelf")}</li>
            <li>{msg("sellerFeeRuleRateLazy")}</li>
          </>
        )}
        <li>{msg("sellerFeeRuleMin")}</li>
        <li>{msg("sellerFeeRuleSweep").replace("{sweep}", sweep)}</li>
      </ul>
    </div>
  );
}
