import { NavLink } from "react-router-dom";
import { useLocale } from "../hooks/useLocale";
import { getTheme, subscribeTheme, themeToggleIcon, toggleTheme } from "../services/theme";
import { WalletConnectButton } from "./WalletConnectButton";
import { FloatingCommunity } from "./FloatingCommunity";
import { useEffect, useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { locale, setLocale, msg } = useLocale();

  const [theme, setThemeState] = useState(getTheme);

  useEffect(() => subscribeTheme(setThemeState), []);

  const toggleLang = () => {
    setLocale(locale === "en" ? "zh" : "en");
  };

  return (
    <div className="layout">
      <header className="site-header">
        <a className="brand" href="/">
          <span>402</span>.trade
        </a>
        <nav className="nav">
          <NavLink to="/" end>
            {msg("navHub")}
          </NavLink>
          <NavLink to="/forge">{msg("navBrowse")}</NavLink>
          <NavLink to="/forge/purchases">{msg("navPurchases")}</NavLink>
          <NavLink to="/sell">{msg("navSell")}</NavLink>
        </nav>
        <div className="header-controls">
          <button type="button" className="control-btn" onClick={toggleLang}>
            {locale === "en" ? msg("langZh") : msg("langEn")}
          </button>
          <button type="button" className="control-btn" onClick={() => toggleTheme()}>
            {themeToggleIcon(theme)}
          </button>
          <WalletConnectButton />
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">{msg("footer")}</footer>
      <FloatingCommunity />
    </div>
  );
}
