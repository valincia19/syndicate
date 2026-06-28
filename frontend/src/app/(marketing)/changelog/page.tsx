"use client"

import { useEffect, useState, useCallback } from "react"
import { Header } from "@/components/layout/header"
import FooterSection from "@/components/layout/footer"
import CTASection from "@/components/landing/cta-section"
import { useLanguage } from "@/components/providers/language-provider"
import { Badge } from "@/components/ui/badge"
import { History, GitCommit, Calendar, Tag, ArrowLeft, Globe, Gamepad2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { api } from "@/lib/api"

interface ApiChangelog {
  id: string
  version: string
  title: string
  description: string | null
  type: "web" | "game"
  game_name?: string | null
  game_id?: string | null
  changes: string[] | string
  author_name?: string
  released_at: string
  created_at: string
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function ChangelogPage() {
  const { t } = useLanguage()
  const tKey = useCallback((key: string) => t(key as Parameters<typeof t>[0]), [t])

  const [changelogs, setChangelogs] = useState<ApiChangelog[]>([])
  const [activeTab, setActiveTab] = useState<"all" | "web" | "game">("all")
  const [isLoading, setIsLoading] = useState(true)

  const fetchChangelogs = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await api.get<{ status: string; data: { changelogs: ApiChangelog[] } }>("/v1/changelogs")
      setChangelogs(res.data.changelogs || [])
    } catch {
      // Fallback static data if API offline
      setChangelogs([
        {
          id: "1",
          version: "v1.0.1",
          title: tKey("changelogVer101Title"),
          description: null,
          type: "web",
          changes: [
            tKey("changelogVer101Item1"),
            tKey("changelogVer101Item2"),
            tKey("changelogVer101Item3"),
            tKey("changelogVer101Item4"),
          ],
          released_at: "2026-06-27T12:00:00Z",
          created_at: "2026-06-27T12:00:00Z",
        },
        {
          id: "2",
          version: "v1.0.0",
          title: tKey("changelogVer100Title"),
          description: null,
          type: "web",
          changes: [
            tKey("changelogVer100Item1"),
            tKey("changelogVer100Item2"),
            tKey("changelogVer100Item3"),
            tKey("changelogVer100Item4"),
          ],
          released_at: "2026-06-15T12:00:00Z",
          created_at: "2026-06-15T12:00:00Z",
        },
        {
          id: "3",
          version: "v1.0.0-game",
          title: "Universal Roblox Execution Suite 1.0",
          description: null,
          type: "game",
          changes: [
            "[New] High-speed dynamic VM obfuscation and loader handshake protocol.",
            "[New] Auto-Rejoin & Server Telemetry module integration for Roblox clients.",
            "[Improved] Enhanced anti-tamper security checks during execution.",
          ],
          released_at: "2026-06-10T12:00:00Z",
          created_at: "2026-06-10T12:00:00Z",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [tKey])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern
    fetchChangelogs()
  }, [fetchChangelogs])

  const filteredChangelogs = changelogs.filter((item) => {
    if (activeTab === "all") return true
    return item.type === activeTab
  })

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden">
      <div className="relative flex w-full flex-col items-center justify-start">
        <div className="relative flex min-h-screen w-full max-w-7xl flex-col items-start justify-start">
          {/* Side rails */}
          <div className="bg-muted absolute top-0 left-4 z-0 h-full w-px sm:left-6 md:left-8 lg:left-0" />
          <div className="bg-muted absolute top-0 right-4 z-0 h-full w-px sm:right-6 md:right-8 lg:right-0" />

          <div className="relative z-10 flex flex-col items-center justify-center self-stretch overflow-hidden border-x">
            {/* Decorative top pattern */}
            <div className="relative h-8 self-stretch overflow-hidden shrink-0">
              <div className="absolute inset-0 h-full w-full overflow-hidden">
                <div className="relative h-full w-full">
                  {Array.from({ length: 300 }).map((_, i) => (
                    <div
                      key={i}
                      className="outline-primary/40 absolute h-4 w-full origin-top-left -rotate-45 outline-[0.5px] outline-offset-[-0.25px]"
                      style={{
                        top: `${i * 16 - 120}px`,
                        left: "-100%",
                        width: "300%",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <Header />

            {/* ═══════════════════════════════════════════════════
                CHANGELOG HERO
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full flex-col items-center justify-center border-b overflow-hidden">
              <div className="relative flex items-center justify-center gap-6 self-stretch px-4 py-12 sm:px-6 md:px-24 md:py-20 overflow-hidden">
                <div className="relative flex w-full max-w-4xl flex-col items-center justify-start gap-4 text-center overflow-hidden">
                  <Badge variant={"secondary"} className="gap-1.5 px-3 py-1">
                    <History className="h-3.5 w-3.5 text-primary" />
                    {tKey("changelogBadge")} — {tKey("changelogDate")}
                  </Badge>
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground uppercase font-outfit">
                    {tKey("changelogTitle")}
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
                    {tKey("changelogIntro")}
                  </p>

                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-2 mt-4 p-1 rounded-lg border border-border bg-muted/40 backdrop-blur-md">
                    <button
                      onClick={() => setActiveTab("all")}
                      className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
                        activeTab === "all"
                          ? "bg-background text-foreground shadow-xs border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All Updates
                    </button>
                    <button
                      onClick={() => setActiveTab("web")}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
                        activeTab === "web"
                          ? "bg-background text-foreground shadow-xs border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Web Platform
                    </button>
                    <button
                      onClick={() => setActiveTab("game")}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
                        activeTab === "game"
                          ? "bg-background text-foreground shadow-xs border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Gamepad2 className="h-3.5 w-3.5" />
                      Game Scripts
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                RELEASE TIMELINE FEED (DYNAMIC DATABASE DATA)
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full items-start justify-center border-b px-4 py-16 md:px-12 md:py-20">
              <div className="w-full max-w-4xl flex flex-col gap-12 relative">
                {/* Continuous Vertical Line */}
                <div className="absolute left-4 sm:left-6 top-6 bottom-6 w-px bg-border z-0" />

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground ml-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs font-mono">Fetching release logs...</span>
                  </div>
                ) : filteredChangelogs.length === 0 ? (
                  <div className="text-center py-12 ml-12 text-muted-foreground text-sm font-mono">
                    No release logs found for this filter category.
                  </div>
                ) : (
                  filteredChangelogs.map((rel, index) => {
                    const parsedChanges: string[] = Array.isArray(rel.changes)
                      ? rel.changes
                      : typeof rel.changes === "string"
                      ? JSON.parse(rel.changes || "[]")
                      : []

                    return (
                      <div key={rel.id || rel.version} className="relative z-10 flex items-start gap-6 sm:gap-8">
                        {/* Timeline Node Icon */}
                        <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shrink-0 shadow-sm mt-1">
                          <GitCommit className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>

                        {/* Release Card */}
                        <div className="flex-1 rounded-xl border border-border bg-card/40 backdrop-blur-md p-6 sm:p-8 space-y-4 hover:border-border/80 transition-all">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-lg font-bold text-foreground tracking-tight">
                                {rel.version}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                                  rel.type === "game"
                                    ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
                                    : "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                }`}
                              >
                                {rel.type === "game" ? <Gamepad2 className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                                {rel.type === "game" ? "Game Script" : "Web Platform"}
                              </span>
                              {rel.type === "game" && rel.game_name && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border border-border bg-muted/30 text-muted-foreground">
                                  {rel.game_name}
                                </span>
                              )}
                              {index === 0 && activeTab === "all" && (
                                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-border bg-muted/50 text-foreground">
                                  Latest
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{formatDate(rel.released_at || rel.created_at)}</span>
                            </div>
                          </div>

                          <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                            {rel.title}
                          </h3>

                          {rel.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed">{rel.description}</p>
                          )}

                          {parsedChanges.length > 0 && (
                            <div className="space-y-2.5 pt-2">
                              {parsedChanges.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed"
                                >
                                  <Tag className="h-3.5 w-3.5 text-muted-foreground/70 mt-1 shrink-0" />
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Back to Home Navigation */}
            <div className="w-full py-8 border-b flex justify-center">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-xs text-muted-foreground hover:text-foreground font-mono uppercase tracking-wider cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {tKey("cookiePolicyBackHome")}
                </Button>
              </Link>
            </div>

            <CTASection />
            <FooterSection />
          </div>
        </div>
      </div>
    </div>
  )
}
