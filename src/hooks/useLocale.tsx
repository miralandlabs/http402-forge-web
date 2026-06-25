import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getLocale, setLocale, t, type MessageKey } from "../i18n";

interface LocaleContextValue {
  locale: "en" | "zh";
  setLocale: (locale: "en" | "zh") => void;
  msg: (key: MessageKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function syncDocumentLang(locale: "en" | "zh") {
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<"en" | "zh">(getLocale);

  useEffect(() => {
    syncDocumentLang(locale);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: (next: "en" | "zh") => {
        setLocale(next);
        setLocaleState(next);
        syncDocumentLang(next);
      },
      msg: (key: MessageKey) => t(locale, key),
    }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale requires LocaleProvider");
  return ctx;
}
