"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { useAuth } from "@/context/auth-context"
import { 
  LayoutDashboard, 
  Terminal, 
  Key, 
  Settings, 
  ChevronDown, 
  ChevronUp,
  CreditCard,
  Headphones,
  Gamepad2,
  History
} from "lucide-react"
import { VSLogo } from "@/components/brand/vs-logo"
import { useLanguage } from "@/components/providers/language-provider"
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { PortalProfileMenu } from "./portal-profile-menu"
import { remotePanelSubItems } from "./remote-panel-items"

/** Navigation items - single source of truth for breadcrumbs */
export function usePortalMenuItems() {
  const { t } = useLanguage()
  return [
    { name: t("portalOverview"), href: "/portal/overview", icon: LayoutDashboard, category: "main" },
    { name: t("portalScripts"), href: "/portal/scripts", icon: Terminal, category: "main" },
    { name: t("portalHwid"), href: "/portal/license", icon: Key, category: "main" },
    { name: "Plans", href: "/portal/plans", icon: CreditCard, category: "main" },
    { name: t("portalTickets"), href: "/portal/tickets", icon: Headphones, category: "main" },
    { name: t("portalActivity"), href: "/portal/activity", icon: History, category: "main" },
    { name: t("portalAutoRejoin"), href: "/portal/tools/auto-rejoin", icon: Settings, category: "tools" },
  ]
}

const robloxSubItems = [
  { id: "device-list", name: "Device List", href: "/portal/tools/auto-rejoin/device-list", soon: true },
  { id: "executor-installer", name: "Executor Installer", href: "/portal/tools/auto-rejoin/executor-installer", soon: true },
  { id: "cookie-inject", name: "Cookie Inject", href: "/portal/tools/auto-rejoin/cookie-inject", soon: true },
  { id: "cookie-validator", name: "Cookie Validator", href: "/portal/tools/auto-rejoin/cookie-validator", soon: true },
  { id: "replace-cookie", name: "Replace Cookie", href: "/portal/tools/auto-rejoin/replace-cookie", soon: true },
  { id: "bot-monitoring", name: "Bot Monitoring", href: "/portal/tools/auto-rejoin/bot-monitoring", soon: true },
  { id: "captcha-list", name: "Captcha List", href: "/portal/tools/auto-rejoin/captcha-list", soon: true },
  { id: "proxy-manager", name: "Proxy Manager", href: "/portal/tools/auto-rejoin/proxy-manager", soon: true },
  { id: "lua-executor", name: "Lua Executor", href: "/portal/tools/auto-rejoin/lua-executor", soon: true },
]

function PortalSidebarContent() {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const { t } = useLanguage()
  const { user } = useAuth()
  const isUserRole = user?.role === "user"

  const isRobloxActive = pathname.startsWith("/portal/tools/auto-rejoin")
  const isRemoteActive = pathname.startsWith("/portal/tools/remote-panel")

  const [isRobloxOpen, setIsRobloxOpen] = useState(isRobloxActive)
  const [isRemoteOpen, setIsRemoteOpen] = useState(isRemoteActive)

  useEffect(() => {
    if (isRobloxActive) {
      Promise.resolve().then(() => {
        setIsRobloxOpen(true)
      })
    }
  }, [pathname, isRobloxActive])

  useEffect(() => {
    if (isRemoteActive) {
      Promise.resolve().then(() => {
        setIsRemoteOpen(true)
      })
    }
  }, [pathname, isRemoteActive])

  const mainItems = [
    { name: t("portalOverview"), href: "/portal/overview", icon: LayoutDashboard },
    { name: t("portalScripts"), href: "/portal/scripts", icon: Terminal },
    { name: t("portalHwid"), href: "/portal/license", icon: Key },
    { name: "Plans", href: "/portal/plans", icon: CreditCard },
    { name: t("portalTickets"), href: "/portal/tickets", icon: Headphones },
    { name: t("portalActivity"), href: "/portal/activity", icon: History },
  ]

  return (
    <>
      {/* Logo */}
      <SidebarHeader className="border-b border-border px-4 group-data-[collapsible=icon]:px-2 h-14 flex flex-row items-center justify-between shrink-0">
        <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
          <VSLogo className="h-6 w-auto text-primary transition-transform duration-300 hover:scale-105 group-data-[collapsible=icon]:h-4.5" />
          <span className="font-extrabold text-sm tracking-tight leading-none text-foreground transition-all duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden whitespace-nowrap">
            VALINC SYNDICATE
          </span>
        </Link>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="p-3 group-data-[collapsible=icon]:p-2 gap-2 flex flex-col justify-between h-full">
        <div className="space-y-1">
          {/* Main Category List */}
          <SidebarMenu>
            {mainItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.name}
                    render={<Link href={item.href} />}
                    onClick={() => {
                      if (isMobile) {
                        setOpenMobile(false)
                      }
                    }}
                    className={`font-normal text-sm rounded-lg transition-all duration-200 px-3 py-2 flex items-center gap-3 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center relative ${
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span className="transition-all duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden whitespace-nowrap">
                      {item.name}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}

            {/* Tools Category Label */}
            <div className="pt-3 pb-1 select-none group-data-[collapsible=icon]:hidden">
              <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider px-2 block mb-1">
                {t("sidebarTools")}
              </span>
            </div>

            {/* Remote Panel Dropdown */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setIsRemoteOpen(!isRemoteOpen)}
                className="font-normal text-sm rounded-lg transition-all duration-200 px-3 py-2 flex items-center justify-between w-full text-muted-foreground hover:text-foreground hover:bg-accent/40 cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
              >
                <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
                  <Gamepad2 className="h-4.5 w-4.5 shrink-0" />
                  <span className="transition-all duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden whitespace-nowrap">
                    Remote Panel
                  </span>
                </div>
                {isRemoteOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden" />
                )}
              </SidebarMenuButton>

              {isRemoteOpen && (
                <div className="pl-6 pr-2 mt-1 space-y-1.5 group-data-[collapsible=icon]:hidden animate-in fade-in duration-200">
                  {remotePanelSubItems.map((subItem) => {
                    const href = subItem.href
                    const isSubActive = pathname === subItem.href
                    const isDisabled = subItem.soon && isUserRole

                    if (isDisabled) {
                      return (
                        <span
                          key={subItem.id}
                          className="flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-lg font-normal text-muted-foreground/40 cursor-not-allowed select-none"
                        >
                          <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-muted-foreground/20" />
                          <span className="flex-1">{subItem.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/8 text-amber-500/70 border border-amber-500/15 font-mono">
                            SOON
                          </span>
                        </span>
                      )
                    }

                    return (
                      <Link
                        key={subItem.id}
                        href={href}
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false)
                          }
                        }}
                        className={`flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-lg transition-all duration-200 font-normal ${
                          isSubActive
                            ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 transition-colors ${isSubActive ? "bg-primary" : "bg-muted-foreground/30"}`} />
                        <span className="flex-1">{subItem.name}</span>
                        {subItem.soon && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/8 text-amber-500/70 border border-amber-500/15 font-mono">
                            SOON
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </SidebarMenuItem>

            {/* Auto Rejoin Collapsible Item */}

            {/* Auto Rejoin Collapsible Item */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setIsRobloxOpen(!isRobloxOpen)}
                className="font-normal text-sm rounded-lg transition-all duration-200 px-3 py-2 flex items-center justify-between w-full text-muted-foreground hover:text-foreground hover:bg-accent/40 cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
              >
                <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
                  <Settings className="h-4.5 w-4.5 shrink-0" />
                  <span className="transition-all duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden whitespace-nowrap">
                    {t("portalAutoRejoin")}
                  </span>
                </div>
                {isRobloxOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden" />
                )}
              </SidebarMenuButton>

              {isRobloxOpen && (
                <div className="pl-6 pr-2 mt-1 space-y-1.5 group-data-[collapsible=icon]:hidden animate-in fade-in duration-200">
                  {robloxSubItems.map((subItem) => {
                    const href = subItem.href
                    const isSubActive = pathname === subItem.href
                    const isDisabled = subItem.soon && isUserRole

                    if (isDisabled) {
                      return (
                        <span
                          key={subItem.id}
                          className="flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-lg font-normal text-muted-foreground/40 cursor-not-allowed select-none"
                        >
                          <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-muted-foreground/20" />
                          <span className="flex-1">{subItem.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/8 text-amber-500/70 border border-amber-500/15 font-mono">
                            SOON
                          </span>
                        </span>
                      )
                    }

                    return (
                      <Link
                        key={subItem.id}
                        href={href}
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false)
                          }
                        }}
                        className={`flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-lg transition-all duration-200 font-normal ${
                          isSubActive
                            ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 transition-colors ${isSubActive ? "bg-primary" : "bg-muted-foreground/30"}`} />
                        <span className="flex-1">{subItem.name}</span>
                        {subItem.soon && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/8 text-amber-500/70 border border-amber-500/15 font-mono">
                            SOON
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>

      {/* User Profile */}
      <SidebarFooter className="border-t border-border p-3 group-data-[collapsible=icon]:p-2 bg-muted/20 gap-3">
        <PortalProfileMenu />
      </SidebarFooter>
    </>
  )
}

export function PortalSidebar() {
  return (
    <Suspense fallback={<div className="p-4 text-xs font-mono text-muted-foreground">Loading navigation...</div>}>
      <PortalSidebarContent />
    </Suspense>
  )
}
