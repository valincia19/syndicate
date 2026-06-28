"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Sun, Moon, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { LanguageSelector } from "@/components/shared/language-selector"
import { useTheme } from "@/hooks/use-theme"
import { useAuth } from "@/context/auth-context"
import { getAvatarUrl } from "@/lib/utils"

interface StudioHeaderProps {
  userRole: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function StudioHeader({ userRole }: StudioHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, mounted, toggleTheme } = useTheme()
  const { user, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const navigationGroups = [
    {
      id: "owner",
      label: "Owner",
      items: [
        { name: "Overview", href: "/studio/owner/overview" },
        { name: "Users", href: "/studio/owner/users" },
        { name: "Finance", href: "/studio/owner/finance" },
        { name: "Currency", href: "/studio/owner/currency" },
        { name: "Activity", href: "/studio/owner/activity" },
        { name: "Settings", href: "/studio/owner/settings" },
      ],
    },
    {
      id: "admin",
      label: "Admin",
      items: [
        { name: "Overview", href: "/studio/admin/overview" },
        { name: "Users", href: "/studio/admin/users" },
        { name: "Licenses", href: "/studio/admin/licenses" },
        { name: "Redeem", href: "/studio/admin/redeem" },
        { name: "Voucher Plan", href: "/studio/admin/voucher-plan" },
      ],
    },
    {
      id: "developer",
      label: "Developer",
      items: [
        { name: "Overview", href: "/studio/developer/overview" },
        { name: "Scripts", href: "/studio/developer/scripts" },
        { name: "Deploy", href: "/studio/developer/deploy" },
        { name: "Releases", href: "/studio/developer/releases" },
        { name: "Changelogs", href: "/studio/developer/changelogs" },
      ],
    },
    {
      id: "staff",
      label: "Staff",
      items: [
        { name: "Overview", href: "/studio/staff/overview" },
        { name: "Tickets", href: "/studio/staff/tickets" },
      ],
    },
  ]

  let pageTitle = "Studio Workspace"
  for (const group of navigationGroups) {
    if (pathname.includes(`/studio/${group.id}`)) {
      const item = group.items.find(
        (item) => pathname === item.href || pathname.startsWith(item.href)
      )
      if (item) {
        pageTitle = `${group.label} Console - ${item.name}`
      } else {
        pageTitle = `${group.label} Console`
      }
      break
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showUserMenu])

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    setShowUserMenu(false)

    try {
      const { getBackendUrl } = await import("@/lib/config")
      const backendUrl = getBackendUrl()
      await fetch(`${backendUrl}/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
    } catch {
      // Ignore network errors - proceed with client cleanup anyway
    }

    signOut()
    window.location.href = "/login"
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/50 transition-colors" />
        <div className="h-4 w-px bg-border" />
        <h2 className="font-extrabold text-sm md:text-base tracking-tight text-foreground/90">
          {pageTitle}
        </h2>
      </div>

      <div className="flex items-center gap-3.5">
        {mounted ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/50 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="h-9 w-9" />
        )}

        <LanguageSelector />

        <div className="h-4 w-px bg-border hidden md:block" />

        <div className="relative hidden md:block" ref={userMenuRef}>
          <div 
            className="flex items-center gap-2 pl-1 cursor-pointer select-none hover:opacity-80 transition-opacity"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="h-6 w-6 rounded-full bg-muted border border-border/60 overflow-hidden flex items-center justify-center font-bold text-[10px] text-muted-foreground">
              {getAvatarUrl(user?.avatar, user?.email) && !avatarError ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                  src={getAvatarUrl(user?.avatar, user?.email) || ""} 
                  alt={user?.username} 
                  className="h-full w-full object-cover" 
                  onError={() => setAvatarError(true)}
                />
              ) : (
                user?.initials ?? "-"
              )}
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              {user?.username ?? "Guest"}
            </span>
          </div>

          {showUserMenu && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-popover border border-border rounded-xl shadow-lg p-1.5 z-40 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  router.push("/portal/profile")
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg flex items-center gap-2.5 transition-colors"
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  handleSignOut()
                }}
                disabled={isSigningOut}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-2.5 transition-colors border-t border-border/60 mt-1 pt-2 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {isSigningOut ? "Signing Out..." : "Sign Out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
