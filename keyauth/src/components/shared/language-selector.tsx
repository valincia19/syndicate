"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { languageNames, type Language } from "@/config/i18n";

const languages = Object.keys(languageNames) as Language[];

interface LanguageSelectorProps {
  className?: string;
  buttonClassName?: string;
}

export function LanguageSelector({
  className,
  buttonClassName,
}: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`flex items-center gap-0.5 rounded-md border p-0.5 ${className || ""}`}>
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={`rounded-sm px-2 py-1 text-xs font-medium transition-colors ${
            language === lang
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          } ${buttonClassName || ""}`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
