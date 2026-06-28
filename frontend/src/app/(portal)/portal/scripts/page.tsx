"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/components/providers/language-provider"
import { Search, Copy, Check, Terminal, Flame, Info, Loader2, Gamepad2, Tag, Hash, Zap, ExternalLink } from "lucide-react"
import Link from "next/link"

interface ReleaseItem {
  id: string
  name: string
  description: string | null
  category: string
  version: string
  operational_status: "Online" | "Maintenance"
  features: string[]
  prefix: string
  logo_text: string | null
  logo_gradient: string | null
  game_name: string | null
  game_logo: string | null
  game_banner: string | null
  game_id?: string
  script_type?: "free" | "plan"
  loadstring?: string | null
  developer_name?: string
  status?: "draft" | "published"
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  Universal: "from-yellow-500/20 to-amber-600/20 text-yellow-500 border-yellow-500/30",
  Anime: "from-purple-500/20 to-indigo-600/20 text-purple-500 border-purple-500/30",
  Shooter: "from-rose-500/20 to-red-600/20 text-rose-500 border-rose-500/30",
  Simulator: "from-blue-500/20 to-cyan-600/20 text-blue-500 border-blue-500/30",
  RPG: "from-orange-500/20 to-amber-600/20 text-orange-400 border-orange-500/30",
  Tycoon: "from-emerald-400/20 to-green-600/20 text-emerald-400 border-emerald-400/30",
}

const BASE_API = process.env.NEXT_PUBLIC_API_URL || ""

function getGradient(category: string): string {
  return CATEGORY_GRADIENTS[category] || "from-slate-500/20 to-slate-600/20 text-slate-400 border-slate-500/30"
}

function getLogoText(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
  if (cleaned.length >= 2) return cleaned.slice(0, 2)
  return name.slice(0, 2).toUpperCase()
}

export default function ScriptsPage() {
  const { t } = useLanguage()
  const tKey = (key: string) => t(key as Parameters<typeof t>[0])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [copiedScript, setCopiedScript] = useState<string | null>(null)
  const [selectedScriptForDetail, setSelectedScriptForDetail] = useState<ReleaseItem | null>(null)
  const [releases, setReleases] = useState<ReleaseItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasActiveLicense, setHasActiveLicense] = useState(false)

  // Fetch user licenses to check eligibility
  useEffect(() => {
    const checkLicense = async () => {
      try {
        const res = await fetch(`${BASE_API}/v1/licenses/my`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" }
        })
        const data = await res.json()
        const licenses = data.data?.licenses || []
        setHasActiveLicense(licenses.some((l: { status: string }) => l.status === "active"))
      } catch {
        setHasActiveLicense(false)
      }
    }
    checkLicense()
  }, [])

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const res = await fetch(`${BASE_API}/v1/releases/public`)
        const data = await res.json()
        setReleases(data.data?.releases || [])
      } catch (err) {
        console.error("Failed to fetch releases:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchReleases()
  }, [])

  // Build categories list from real data + "All"
  const categories = ["All", ...new Set(releases.map((r) => r.category).filter(Boolean))]

  const handleCopy = (script: ReleaseItem) => {
    // Block copy for plan scripts if user has no active license
    if (script.script_type === "plan" && !hasActiveLicense) {
      return
    }
    const loaderUrl = `${BASE_API}/v1/release/${script.prefix}.lua`
    const loadstring = `_G.Key = "YOUR_KEY"\nloadstring(game:HttpGet("${loaderUrl}"))()`
    navigator.clipboard.writeText(loadstring)
    setCopiedScript(script.name)
    setTimeout(() => setCopiedScript(null), 2000)
  }

  const isScriptLocked = (script: ReleaseItem) => {
    return script.script_type === "plan" && !hasActiveLicense
  }

  const filteredScripts = releases.filter((script) => {
    const matchesSearch =
      script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (script.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || script.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-4 max-w-7xl mx-auto min-w-0 w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col gap-1 border-b border-border pb-3">
        <h1 className="text-lg font-black tracking-tight text-foreground uppercase">{t("portalScripts")}</h1>
        <p className="text-[11px] text-muted-foreground">{t("scriptVaultDesc")}</p>
      </div>

      {/* Filters Bar */}
      <div className="space-y-2 p-3 bg-muted/20 border border-border/80 rounded-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">{tKey("filters")}</span>
          </div>

          <div className="relative w-36 sm:w-48">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/60" />
            <input
              type="text"
              placeholder={tKey("searchScripts")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1 text-[9px] font-mono rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:border-primary/50"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground shrink-0 w-16">{tKey("categoryLabel")}</span>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-[9px] font-mono rounded-md border transition-all cursor-pointer shrink-0 ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground animate-pulse">{tKey("loadingScripts")}</span>
        </div>
      ) : filteredScripts.length > 0 ? (
        /* Scripts Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-w-0 w-full">
          {filteredScripts.map((script) => {
            const grad = getGradient(script.category)
            const logoText = script.logo_text || getLogoText(script.name)
            const featCount = Array.isArray(script.features) ? script.features.length : 0
            return (
              <div
                key={script.id}
                className="relative group rounded-xl border border-border bg-card p-4 flex flex-col justify-between gap-4 shadow-xs transition-all duration-300 hover:border-primary/30 min-w-0 overflow-hidden"
              >
                {/* Accent Line */}
                <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-primary/0 group-hover:bg-primary/80 transition-all duration-300 rounded-r-sm" />

                {/* Header */}
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Logo - use game_logo if available, else fallback to gradient badge */}
                      <div className="h-8 w-8 rounded-lg overflow-hidden shrink-0 bg-muted border border-border flex items-center justify-center">
                        {script.game_logo ? (
                          <img
                            src={script.game_logo}
                            alt={script.game_name || script.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center font-heading text-[12px] tracking-tight`}>
                            {logoText}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="font-heading text-base text-foreground leading-none group-hover:text-primary transition-colors duration-200 truncate">
                            {script.name}
                          </h3>
                          {script.script_type === "plan" ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[8px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 shrink-0 leading-none">
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Plan
                            </span>
                          ) : script.script_type === "free" ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[8px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0 leading-none">
                              <Check className="w-2.5 h-2.5" />Free
                            </span>
                          ) : null}
                          {script.category === "Universal" && (
                            <Flame className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5">
                          {script.category} • {script.version}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[8px] font-mono border shrink-0 ${
                        script.operational_status === "Online"
                          ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20"
                          : "bg-amber-500/5 text-amber-500 border-amber-500/20"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          script.operational_status === "Online" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                        }`}
                      />
                      {script.operational_status}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-normal min-h-[32px] mt-1.5 font-sans">
                    {script.description || "No description"}
                  </p>
                </div>

                {/* Features Tags Preview (first 3) */}
                <div className="flex flex-wrap items-center gap-1">
                  {(script.features || []).slice(0, 3).map((feat) => (
                    <span
                      key={feat}
                      className="px-1.5 py-0.5 text-[9px] font-mono bg-secondary text-muted-foreground rounded-sm border border-border/50 select-none hover:border-primary/25 hover:text-foreground transition-all"
                    >
                      {feat}
                    </span>
                  ))}
                  {featCount > 3 && (
                    <span
                      onClick={() => setSelectedScriptForDetail(script)}
                      className="px-1.5 py-0.5 text-[9px] font-mono bg-primary/5 text-primary/80 hover:text-primary rounded-sm border border-primary/10 hover:border-primary/30 transition-all select-none cursor-pointer"
                    >
                      + {featCount - 3} more
                    </span>
                  )}
                </div>

                {/* Loadstring Box */}
                <div className="relative rounded-lg bg-muted/40 dark:bg-[#070708] border border-border dark:border-[#1b1b1f] overflow-hidden group/code hover:border-primary/25 transition-all w-full min-w-0">
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border dark:border-[#1b1b1f] bg-muted/60 dark:bg-[#0c0c0e] select-none">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-3 w-3 text-primary/70 shrink-0" />
                      <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Loader</span>
                    </div>
                    <button
                      onClick={() => handleCopy(script)}
                      disabled={isScriptLocked(script)}
                      className={`px-2.5 py-0.5 rounded border text-[9px] font-mono transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        isScriptLocked(script)
                          ? "bg-muted text-muted-foreground border-border/30 cursor-not-allowed opacity-50"
                          : "bg-card dark:bg-[#161619] hover:bg-primary hover:text-primary-foreground border-border dark:border-[#27272e] hover:border-primary text-muted-foreground"
                      }`}
                      title={isScriptLocked(script) ? "Get a license to unlock this script" : ""}
                    >
                      {copiedScript === script.name ? (
                        <>
                          <Check className="h-2.5 w-2.5 text-emerald-500" />
                          <span>{tKey("copied")}!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-2.5 w-2.5" />
                          <span>{tKey("copy")}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {isScriptLocked(script) ? (
                    /* Censored loader for locked plan scripts */
                    <div className="p-3 font-mono text-[9px] text-muted-foreground overflow-x-auto no-scrollbar bg-transparent min-w-0 select-none flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2 py-2">
                        <span className="text-[10px] text-muted-foreground/50 font-mono">Loader unavailable - get a license first</span>
                        <Link href="/portal/plans" className="text-[9px] text-primary/70 hover:text-primary font-mono underline underline-offset-2 transition-colors">
                          View Plans →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 font-mono text-[9px] text-foreground dark:text-white/95 overflow-x-auto no-scrollbar bg-transparent min-w-0 select-all space-y-1">
                      <div className="flex gap-1">
                        <span className="text-purple-600 dark:text-[#c678dd]">_G</span>
                        <span className="text-foreground/75 dark:text-[#abb2bf]">.</span>
                        <span className="text-sky-600 dark:text-[#61afef]">Key</span>
                        <span className="text-foreground/75 dark:text-[#abb2bf]"> = </span>
                        <span className="text-amber-600 dark:text-[#e5c07b]">&quot;YOUR_KEY&quot;</span>
                      </div>
                      <div>
                        <span className="text-red-600 dark:text-[#e06c75]">loadstring</span>
                        <span className="text-foreground/75 dark:text-[#abb2bf]">(</span>
                        <span className="text-sky-600 dark:text-[#61afef]">game</span>
                        <span className="text-foreground/75 dark:text-[#abb2bf]">:</span>
                        <span className="text-sky-600 dark:text-[#61afef]">HttpGet</span>
                        <span className="text-foreground/75 dark:text-[#abb2bf]">(</span>
                        <span className="text-emerald-700 dark:text-[#98c379]">&quot;</span>
                        <span className="text-emerald-700 dark:text-[#98c379]">
                          {(() => {
                            const url = `${BASE_API}/v1/release/${script.prefix}.lua`
                            return url.length > 38 ? `${url.substring(0, 32)}...` : url
                          })()}
                        </span>
                        <span className="text-emerald-700 dark:text-[#98c379]">&quot;</span>
                        <span className="text-foreground/75 dark:text-[#abb2bf] font-mono">)</span>
                        <span className="text-foreground/75 dark:text-[#abb2bf] font-mono">)()</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* View Details Button */}
                <button
                  onClick={() => setSelectedScriptForDetail(script)}
                  className="w-full py-2 rounded-lg bg-secondary/80 hover:bg-primary/10 text-[10px] font-mono text-muted-foreground hover:text-primary border border-border/60 hover:border-primary/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none"
                >
                  <Info className="h-3 w-3 shrink-0" />
                  <span>View Features & Details ({featCount})</span>
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-8 text-center flex flex-col items-center justify-center gap-2">
          <Terminal className="h-6 w-6 text-muted-foreground/45" />
          <span className="text-xs text-muted-foreground font-mono">
            {releases.length === 0 ? "No releases available yet." : "No scripts match your search criteria."}
          </span>
        </div>
      )}

      {/* Detail Modal */}
      {selectedScriptForDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedScriptForDetail(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-lg flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 dark:bg-[#0C0C0E]/50 select-none shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Logo */}
                <div className="h-11 w-11 rounded-lg overflow-hidden shrink-0 bg-muted border border-border flex items-center justify-center">
                  {selectedScriptForDetail.game_logo ? (
                    <img
                      src={selectedScriptForDetail.game_logo}
                      alt={selectedScriptForDetail.game_name || selectedScriptForDetail.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getGradient(selectedScriptForDetail.category)} flex items-center justify-center font-heading text-[15px] tracking-tight`}>
                      {selectedScriptForDetail.logo_text || getLogoText(selectedScriptForDetail.name)}
                    </div>
                  )}
                </div>

                <div className="flex flex-col min-w-0 gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-heading text-base md:text-lg text-foreground leading-none truncate">
                      {selectedScriptForDetail.name}
                    </h2>
                    <span className="text-[9px] font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-sm shrink-0">
                      {selectedScriptForDetail.version}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[8px] font-mono border shrink-0 ${
                        selectedScriptForDetail.operational_status === "Online"
                          ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20"
                          : "bg-amber-500/5 text-amber-500 border-amber-500/20"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          selectedScriptForDetail.operational_status === "Online" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                        }`}
                      />
                      {selectedScriptForDetail.operational_status}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                    {selectedScriptForDetail.category}
                    {selectedScriptForDetail.game_name ? ` · ${selectedScriptForDetail.game_name}` : ""}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedScriptForDetail(null)}
                className="h-8 w-8 rounded-lg hover:bg-secondary border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-all flex items-center justify-center cursor-pointer shrink-0 ml-2"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">

              {/* Description */}
              {selectedScriptForDetail.description && (
                <div>
                  <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-bold mb-1.5">Description</h4>
                  <p className="text-[11px] text-foreground/80 leading-relaxed font-sans">{selectedScriptForDetail.description}</p>
                </div>
              )}

              {/* Game Banner */}
              {selectedScriptForDetail.game_banner && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="w-full h-28 overflow-hidden bg-muted relative">
                    <img
                      src={selectedScriptForDetail.game_banner}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <div className="p-3 flex items-center gap-3">
                    {selectedScriptForDetail.game_logo ? (
                      <img src={selectedScriptForDetail.game_logo} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <Gamepad2 className="w-10 h-10 text-muted-foreground/30 shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-foreground">{selectedScriptForDetail.game_name}</p>
                      {selectedScriptForDetail.game_id && (
                        <p className="text-[10px] font-mono text-muted-foreground">Game ID: {selectedScriptForDetail.game_id}</p>
                      )}
                    </div>
                    {selectedScriptForDetail.game_id && (
                      <a
                        href={`https://www.roblox.com/games/${selectedScriptForDetail.game_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-mono bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 rounded-lg transition-all cursor-pointer shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Visit Game
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div>
                <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-bold mb-2">Details</h4>
                <div className="grid grid-cols-2 gap-2">
                  {/* Category */}
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/20 border border-border/50">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider">Category</span>
                      <span className="text-[10px] font-mono text-foreground truncate">{selectedScriptForDetail.category}</span>
                    </div>
                  </div>
                  {/* Version */}
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/20 border border-border/50">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider">Version</span>
                      <span className="text-[10px] font-mono text-foreground truncate">{selectedScriptForDetail.version}</span>
                    </div>
                  </div>
                  {/* Script Type */}
                  {selectedScriptForDetail.script_type && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/20 border border-border/50">
                      {selectedScriptForDetail.script_type === "plan" ? (
                        <svg className="w-3.5 h-3.5 text-purple-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider">Type</span>
                        <span className={`text-[10px] font-mono truncate font-bold ${selectedScriptForDetail.script_type === "plan" ? "text-purple-500" : "text-emerald-500"}`}>
                          {selectedScriptForDetail.script_type === "plan" ? "User Plan" : "Free"}
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Status */}
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/20 border border-border/50">
                    <Zap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider">Status</span>
                      <span className={`text-[10px] font-mono truncate font-bold ${
                        selectedScriptForDetail.operational_status === "Online" ? "text-emerald-500" : "text-amber-500"
                      }`}>{selectedScriptForDetail.operational_status}</span>
                    </div>
                  </div>
                  {/* Game */}
                  {selectedScriptForDetail.game_name && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/20 border border-border/50">
                      <Gamepad2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider">Game</span>
                        <span className="text-[10px] font-mono text-foreground truncate">{selectedScriptForDetail.game_name}</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border/50" />

              {/* Loadstring */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1">
                    <Terminal className="w-3 h-3" /> Loadstring
                  </h4>
                  <span className="text-[9px] font-mono text-muted-foreground/60">Click to copy</span>
                </div>
                {/* Loadstring Box - full syntax highlight, same style as card */}
                <div className="relative rounded-lg bg-muted/40 dark:bg-[#070708] border border-border dark:border-[#1b1b1f] overflow-hidden hover:border-primary/25 transition-all">
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border dark:border-[#1b1b1f] bg-muted/60 dark:bg-[#0c0c0e] select-none">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-3 w-3 text-primary/70 shrink-0" />
                      <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Loader</span>
                    </div>
                    <button
                      onClick={() => handleCopy(selectedScriptForDetail)}
                      disabled={isScriptLocked(selectedScriptForDetail)}
                      className={`px-2.5 py-0.5 rounded border text-[9px] font-mono transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        isScriptLocked(selectedScriptForDetail)
                          ? "bg-muted text-muted-foreground border-border/30 cursor-not-allowed opacity-50"
                          : "bg-card dark:bg-[#161619] hover:bg-primary hover:text-primary-foreground border-border dark:border-[#27272e] hover:border-primary text-muted-foreground"
                      }`}
                      title={isScriptLocked(selectedScriptForDetail) ? "Get a license to unlock this script" : ""}
                    >
                      {copiedScript === selectedScriptForDetail.name ? (
                        <>
                          <Check className="h-2.5 w-2.5 text-emerald-500" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-2.5 w-2.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  {isScriptLocked(selectedScriptForDetail) ? (
                    /* Censored loader for locked plan scripts */
                    <div className="p-3 font-mono text-[9px] text-muted-foreground overflow-x-auto no-scrollbar bg-transparent min-w-0 select-none flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2 py-2">
                        <span className="text-[10px] text-muted-foreground/50 font-mono">Loader unavailable - get a license first</span>
                        <Link href="/portal/plans" className="text-[9px] text-primary/70 hover:text-primary font-mono underline underline-offset-2 transition-colors">
                          View Plans →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 font-mono text-[9px] text-foreground dark:text-white/95 overflow-x-auto no-scrollbar bg-transparent select-all space-y-1">
                      <div className="flex gap-1">
                        <span className="text-purple-600 dark:text-[#c678dd]">_G</span>
                        <span className="text-foreground/75 dark:text-[#abb2bf]">.</span>
                        <span className="text-sky-600 dark:text-[#61afef]">Key</span>
                        <span className="text-foreground/75 dark:text-[#abb2bf]"> = </span>
                        <span className="text-amber-600 dark:text-[#e5c07b]">&quot;YOUR_KEY&quot;</span>
                      </div>
                      <div>
                        <span className="text-red-600 dark:text-[#e06c75]">loadstring</span>
                        <span className="text-foreground/75 dark:text-[#abb2bf]">(</span>
                        <span className="text-sky-600 dark:text-[#61afef]">game</span>
                        <span className="text-foreground/75 dark:text-[#abb2bf]">:</span>
                        <span className="text-sky-600 dark:text-[#61afef]">HttpGet</span>
                        <span className="text-foreground/75 dark:text-[#abb2bf]">(</span>
                        <span className="text-emerald-700 dark:text-[#98c379]">&quot;{BASE_API}/v1/release/{selectedScriptForDetail.prefix}.lua&quot;</span>
                        <span className="text-foreground/75 dark:text-[#abb2bf] font-mono">))()</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border/50" />

              {/* Features */}
              {Array.isArray(selectedScriptForDetail.features) && selectedScriptForDetail.features.length > 0 ? (
                <div>
                  <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    Features
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[8px] font-mono">
                      {selectedScriptForDetail.features.length}
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedScriptForDetail.features.map((f, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-[9px] font-mono bg-secondary text-muted-foreground rounded-sm border border-border/50 hover:border-primary/25 hover:text-foreground transition-all select-none"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <span className="text-[10px] font-mono text-muted-foreground/50">No features listed.</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 border-t border-border bg-muted/20 dark:bg-[#0C0C0E]/40 px-5 py-3 flex items-center justify-between gap-2 select-none">
              <span className="text-[9px] font-mono text-muted-foreground/50 truncate flex items-center gap-2">
                ID: {selectedScriptForDetail.id}
                {selectedScriptForDetail.developer_name && (
                  <span>· by {selectedScriptForDetail.developer_name}</span>
                )}
              </span>
              <button
                onClick={() => setSelectedScriptForDetail(null)}
                className="px-4 py-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer hover:bg-muted/40 shrink-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
