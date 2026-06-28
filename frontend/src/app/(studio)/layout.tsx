'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar'
import { StudioSidebar } from '@/components/studio/studio-sidebar'
import { StudioHeader } from '@/components/studio/studio-header'
import { Instrument_Serif, EB_Garamond } from 'next/font/google'

import { TooltipProvider } from "@/components/ui/tooltip"

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

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?error=unauthorized')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    document.body.classList.add("portal-theme")
    return () => {
      document.body.classList.remove("portal-theme")
    }
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0B0C]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-2 border-transparent border-t-[#FF6B35] border-r-[#FF6B35] rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-2 border-transparent border-b-[#4ECDC4] rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
          <div className="absolute inset-4 flex items-center justify-center">
            <div className="w-2 h-2 bg-[#FF6B35] rounded-full animate-pulse"></div>
          </div>
        </div>
        <span className="ml-4 text-[#999AA4] font-mono text-sm">Initializing studio...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const hasStudioAccess = ['owner', 'admin', 'developer', 'staff'].includes(user?.role || '')
  
  if (!hasStudioAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0B0C]">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-[#FFFFFF] mb-2">Access Denied</h1>
          <p className="text-[#999AA4] mb-6">Your role does not have access to the Studio workspace.</p>
          <button
            onClick={() => router.push('/portal/overview')}
            className="px-6 py-2 bg-[#FF6B35] text-white rounded-md font-mono text-sm hover:bg-[#FF5520] transition-colors"
          >
            Back to Portal
          </button>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={`${instrumentSerif.variable} ${ebGaramond.variable} portal-theme relative min-h-screen w-full bg-background text-foreground transition-colors duration-300`}>
        <SidebarProvider className="relative min-h-screen w-full">
          <Sidebar collapsible="icon" className="border-r border-border bg-card">
            <StudioSidebar />
          </Sidebar>
          <SidebarInset className="flex-1 flex flex-col min-w-0 min-h-screen bg-background">
            <StudioHeader userRole={user?.role || 'user'} />
            <main className="flex-1 p-6 w-full overflow-y-auto">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </TooltipProvider>
  )
}
