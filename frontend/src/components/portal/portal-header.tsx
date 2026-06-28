"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sun, Moon, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { LanguageSelector } from "@/components/shared/language-selector"
import { useTheme } from "@/hooks/use-theme"
import { useAuth } from "@/context/auth-context"
import { usePortalMenuItems } from "./portal-sidebar"
import { usePathname } from "next/navigation"
import { getAvatarUrl } from "@/lib/utils"

export function PortalHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, mounted, toggleTheme } = useTheme()
  const { user, signOut } = useAuth()
  const menuItems = usePortalMenuItems()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

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

  const handleSignOut = () => {
    signOut()
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/50 transition-colors" />
        <div className="h-4 w-px bg-border" />
        <h2 className="font-extrabold text-sm md:text-base tracking-tight text-foreground/90">
          {menuItems.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'))?.name
            || (pathname.startsWith("/portal/payment") ? "Checkout"
            : pathname.startsWith("/portal/plans") ? "Plans"
            : pathname.startsWith("/portal/profile") ? "Profile"
            : pathname.startsWith("/portal/tools/remote-panel") ? "Remote Panel"
            : pathname.startsWith("/portal/tools/auto-rejoin") ? "Auto Rejoin"
            : "Dashboard")}
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
                className="w-full px-3 py-2 text-left text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-2.5 transition-colors border-t border-border/60 mt-1 pt-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
