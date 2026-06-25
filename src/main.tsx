import "./polyfills";
import "@solana/wallet-adapter-react-ui/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { LocaleProvider } from "./hooks/useLocale";
import { SolanaWalletProvider } from "./context/SolanaWalletProvider";
import { initTheme } from "./services/theme";
import "./styles.css";

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocaleProvider>
      <SolanaWalletProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SolanaWalletProvider>
    </LocaleProvider>
  </StrictMode>,
);
