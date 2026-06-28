"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { Language, dictionaries, DictionaryKey } from "@/config/i18n"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: DictionaryKey) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function detectBrowserLanguage(): Language {
  if (typeof window === "undefined" || !navigator) return "EN"
  const browserLangs = navigator.languages ? Array.from(navigator.languages) : [navigator.language || ""]
  for (const lang of browserLangs) {
    const l = lang.toLowerCase()
    if (l.startsWith("id")) return "ID"
    if (l.startsWith("ja")) return "JA"
    if (l.startsWith("fr")) return "FR"
    if (l.startsWith("en")) return "EN"
  }
  return "EN"
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("EN")

  useEffect(() => {
    // Restore language preference on client after hydration to avoid SSR mismatch
    queueMicrotask(() => {
      const savedLang = localStorage.getItem("language") as Language
      if (savedLang && savedLang in dictionaries) {
        setLanguageState(savedLang)
      } else {
        const detected = detectBrowserLanguage()
        if (detected !== "EN") {
          setLanguageState(detected)
        }
      }
    })

    // Background IP Geolocation check for even higher precision
    if (!localStorage.getItem("language")) {
      fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.country_code && !localStorage.getItem("language")) {
            const cc = data.country_code.toUpperCase()
            let geoLang: Language = "EN"
            if (cc === "ID") geoLang = "ID"
            else if (cc === "JP") geoLang = "JA"
            else if (cc === "FR") geoLang = "FR"
            
            setLanguageState(geoLang)
          }
        })
        .catch(() => {
          // Ignore IP fetch errors
        })
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "language" && e.newValue && e.newValue in dictionaries) {
        setLanguageState(e.newValue as Language)
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("language", lang)
    window.dispatchEvent(new Event("storage"))
  }

  const t = (key: DictionaryKey): string => {
    return dictionaries[language]?.[key] || dictionaries.EN[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
