"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  dictionaries,
  type Language,
  type DictionaryKey,
} from "@/config/i18n";

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: DictionaryKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Initialize with "EN" to match server-side rendering exactly and prevent hydration mismatch
  const [language, setLanguageState] = useState<Language>("EN");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("keyauth_lang");
      if (stored && stored in dictionaries) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLanguageState(stored as Language);
      }
    } catch {}
    setMounted(true);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("keyauth_lang", lang);
    } catch {}
  }, []);

  const t = useCallback((key: DictionaryKey): string => {
    // Force English dictionary before the component mounts to align client hydration with server HTML
    const activeLang = mounted ? language : "EN";
    return dictionaries[activeLang]?.[key] || dictionaries.EN[key] || key;
  }, [language, mounted]);

  return (
    <LanguageContext.Provider value={{ language: mounted ? language : "EN", setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
