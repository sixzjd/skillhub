import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { messages, detectLocale, type Locale, type Messages } from "../i18n";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Messages;
}

const I18nContext = createContext<I18nContextValue>({
  locale: detectLocale(),
  setLocale: () => {},
  t: messages[detectLocale()],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("skillhub-locale", l);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: messages[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}