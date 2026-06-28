"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Settings, MoreVertical, User, Shield, Crown, Code, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/components/providers/language-provider"
import { useSidebar } from "@/components/ui/sidebar"

export function PortalProfileMenu() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { t } = useLanguage()
  const { isMobile, setOpenMobile } = useSidebar()
  const [showMenu, setShowMenu] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const role = user?.role?.toLowerCase() || ""
  const showStaff = ["owner", "admin", "staff"].includes(role)
  const showAdmin = ["owner", "admin"].includes(role)
  const showDev = ["owner", "developer", "dev"].includes(role)
  const showOwner = ["owner"].includes(role)
  const hasAnyRoleButton = showStaff || showAdmin || showDev || showOwner

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showMenu])

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    setShowMenu(false)
    if (isMobile) setOpenMobile(false)

    try {
      const { getBackendUrl } = await import("@/lib/config")
      const backendUrl = getBackendUrl()
      await fetch(`${backendUrl}/v1/auth/logout`, {
        method: "POST",
        credentials: "include", // send the httpOnly cookie so backend can clear it
        headers: { "Content-Type": "application/json" },
      })
    } catch {
      // Ignore network errors - proceed with client cleanup anyway
    }

    signOut() // clear localStorage + inMemoryToken

    // Hard redirect - forces full page reload so Next.js middleware
    // re-evaluates the (now cleared) cookie and lands on /login cleanly
    window.location.href = "/login"
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Role Buttons */}
      {hasAnyRoleButton && (
        <div className="flex flex-col gap-1 pb-2 border-b border-border/60 mb-2 group-data-[collapsible=icon]:hidden">
          {showStaff && (
            <Button variant="ghost" size="sm"
              onClick={() => { if (isMobile) setOpenMobile(false); router.push("/studio/staff/overview") }}
              className="w-full h-8 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors flex items-center justify-start gap-2"
            >
              <Users className="h-3 w-3" /> Staff
            </Button>
          )}
          {showAdmin && (
            <Button variant="ghost" size="sm"
              onClick={() => { if (isMobile) setOpenMobile(false); router.push("/studio/admin/overview") }}
              className="w-full h-8 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors flex items-center justify-start gap-2"
            >
              <Shield className="h-3 w-3" /> Admin
            </Button>
          )}
          {showDev && (
            <Button variant="ghost" size="sm"
              onClick={() => { if (isMobile) setOpenMobile(false); router.push("/studio/developer/overview") }}
              className="w-full h-8 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors flex items-center justify-start gap-2"
            >
              <Code className="h-3 w-3" /> Dev
            </Button>
          )}
          {showOwner && (
            <Button variant="ghost" size="sm"
              onClick={() => { if (isMobile) setOpenMobile(false); router.push("/studio/owner/overview") }}
              className="w-full h-8 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors flex items-center justify-start gap-2"
            >
              <Crown className="h-3 w-3" /> Owner
            </Button>
          )}
        </div>
      )}

      {showMenu && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-xl shadow-lg p-1.5 z-40 flex flex-col gap-1 animate-in slide-in-from-bottom-2 duration-200">
          <button
            onClick={() => { setShowMenu(false); if (isMobile) setOpenMobile(false); router.push("/portal/profile") }}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg flex items-center gap-2.5 transition-colors"
          >
            <User className="h-4 w-4" /> Profile
          </button>
          <button
            onClick={() => { setShowMenu(false); if (isMobile) setOpenMobile(false); router.push("/portal/license") }}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg flex items-center gap-2.5 transition-colors"
          >
            <Settings className="h-4 w-4" /> {t("manageWhitelist")}
          </button>
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-2.5 transition-colors border-t border-border/60 mt-1 pt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="h-4 w-4" />
            {isSigningOut ? "Signing out..." : t("signOut")}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0 overflow-hidden">
          <div className="h-9 w-9 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 rounded-full bg-muted border border-border/60 overflow-hidden flex items-center justify-center font-bold text-muted-foreground text-sm shrink-0 select-none">
            {user?.avatar && user.avatar !== "null" && user.avatar !== "undefined" && !avatarError ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" onError={() => setAvatarError(true)} />
            ) : (
              user?.initials ?? "-"
            )}
          </div>
          <div className="flex flex-col overflow-hidden transition-all duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 whitespace-nowrap">
            <p className="text-xs font-bold truncate leading-tight text-foreground">{user?.username ?? "Guest"}</p>
            <span className="text-[10px] text-muted-foreground leading-none block truncate">{user?.email ?? ""}</span>
          </div>
        </div>
        <Button
          variant="ghost" size="sm"
          onClick={() => setShowMenu(!showMenu)}
          className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg group-data-[collapsible=icon]:hidden"
        >
          <MoreVertical className="h-4.5 w-4.5" />
        </Button>
      </div>
    </div>
  )
}
