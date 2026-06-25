import { BaseWalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useLocale } from "../hooks/useLocale";

/** Wallet picker — PromptLearn WalletConnectButton (BaseWalletMultiButton labels). */
export function WalletConnectButton() {
  const { msg } = useLocale();

  return (
    <BaseWalletMultiButton
      className="wallet-multi-btn"
      labels={{
        "change-wallet": msg("walletChange"),
        connecting: msg("walletConnecting"),
        "copy-address": msg("walletCopyAddress"),
        copied: msg("walletCopied"),
        disconnect: msg("walletDisconnect"),
        "has-wallet": msg("walletConnect"),
        "no-wallet": msg("walletSelect"),
      }}
    />
  );
}
