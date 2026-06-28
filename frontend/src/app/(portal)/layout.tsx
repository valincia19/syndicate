"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Instrument_Serif, EB_Garamond } from "next/font/google"
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

import { PortalSidebar } from "@/components/portal/portal-sidebar"
import { PortalHeader } from "@/components/portal/portal-header"
import { useAuth } from "@/context/auth-context"


const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
})

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-eb-garamond",
})

/**
 * Portal Layout - authenticated dashboard area.
 *
 * Scopes portal-theme variable tokens and redirects unauthenticated users.
 */
function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()


  useEffect(() => {
    // Payment pages handle their own 401 (API call in QRIS page)
    // so we skip the layout-level redirect to avoid race conditions.
    const isPaymentPage =
      typeof window !== "undefined" &&
      window.location.pathname.includes("/portal/payment")
    if (isPaymentPage) return

    // Redirect to login if not authenticated, or to verify if email is unverified
    if (!isLoading) {
      if (!user) {
        router.replace("/login")
      } else if (!user.verified && !user.discord_id) {
        router.replace("/verify")
      }
    }
  }, [user, isLoading, router])


  useEffect(() => {
    document.body.classList.add("portal-theme")
    return () => {
      document.body.classList.remove("portal-theme")
    }
  }, [])

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0B0C] space-y-4">
        <div className="h-10 w-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-xs font-semibold tracking-wider text-zinc-400 uppercase animate-pulse">
          Authenticating...
        </p>
      </div>
    )
  }

  if (!user) {
    // Redirect is triggered in useEffect above - render null while navigating
    return null
  }

  return (
    <div className={`${instrumentSerif.variable} ${ebGaramond.variable} portal-theme relative min-h-screen w-full bg-background text-foreground transition-colors duration-300`}>
      <SidebarProvider className="relative min-h-screen w-full">
        <Sidebar collapsible="icon" className="border-r border-border bg-card">
          <PortalSidebar />
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col min-w-0 min-h-screen bg-background">
          <PortalHeader />
          <main className="flex-1 p-6 w-full max-w-7xl mx-auto overflow-y-auto animate-in fade-in duration-300">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <PortalShell>{children}</PortalShell>
    </TooltipProvider>
  )
}
