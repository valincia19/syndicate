"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"
import type { Language } from "@/config/i18n"
import { cn } from "@/lib/utils"

const LANGUAGE_CONFIG: Record<Language, { label: string; code: string; name: string }> = {
  EN: { label: "EN", code: "us", name: "English" },
  ID: { label: "ID", code: "id", name: "Indonesia" },
  FR: { label: "FR", code: "fr", name: "Français" },
  JA: { label: "JA", code: "jp", name: "日本語" },
}

interface LanguageSelectorProps {
  /** Button size variant */
  buttonSize?: "default" | "sm" | "xs" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
  /** Additional className for the button */
  buttonClassName?: string
  /** Additional className for the dropdown */
  dropdownClassName?: string
  /** Item text size class */
  itemClassName?: string
}

export function LanguageSelector({
  buttonSize = "sm",
  buttonClassName,
  dropdownClassName,
  itemClassName,
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false)
  const { language, setLanguage } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const activeConf = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.EN

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 text-muted-foreground hover:text-foreground rounded-md transition-all duration-200 hover:bg-accent/50 h-8 w-auto shrink-0 select-none",
          buttonClassName
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://flagcdn.com/w40/${activeConf.code}.png`}
          alt={activeConf.name}
          className="h-3 w-4.5 object-cover rounded-[2px] shadow-2xs shrink-0 aspect-[3/2]"
        />
        <span className="font-mono font-bold text-xs text-foreground uppercase shrink-0">{language}</span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform duration-200 text-muted-foreground/70", open && "rotate-180")} />
      </Button>

      {open && (
        <div
          className={cn(
            "bg-popover/95 backdrop-blur-md absolute right-0 top-full mt-1.5 overflow-hidden rounded-lg border border-border/60 shadow-xl z-50 p-1 min-w-[135px] animate-in fade-in-50 zoom-in-95 duration-150",
            dropdownClassName
          )}
        >
          {(Object.keys(LANGUAGE_CONFIG) as Language[]).map((lang) => {
            const conf = LANGUAGE_CONFIG[lang]
            const isActive = language === lang
            return (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang)
                  setOpen(false)
                }}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer",
                  isActive ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                  itemClassName
                )}
              >
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://flagcdn.com/w40/${conf.code}.png`}
                    alt={conf.name}
                    className="h-3.5 w-5 object-cover rounded-[2px] shadow-xs shrink-0"
                  />
                  <span>{conf.name}</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground/60 uppercase ml-2">{lang}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
