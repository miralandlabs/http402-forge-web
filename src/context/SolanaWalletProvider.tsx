import { useMemo, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

const RPC_ENDPOINT =
  import.meta.env.VITE_RPC_URL ?? "https://api.devnet.solana.com";

/** Same as PromptLearn / aethervane: empty wallets → Wallet Standard auto-detect. */
export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
