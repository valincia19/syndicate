"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Activity,
  Settings,
  Key,
  Code2,
  Upload,
  Headphones,
  ArrowLeft,
  Gift,
  Package,
  Ticket,
  History,
} from "lucide-react"
import { VSLogo } from "@/components/brand/vs-logo"
import { useAuth } from "@/context/auth-context"
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { PortalProfileMenu } from "@/components/portal/portal-profile-menu"

export function StudioSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const userRole = user?.role || ""

  const navigationGroups = [
    {
      id: "owner",
      label: "Owner",
      roles: ["owner"],
      items: [
        { name: "Overview", href: "/studio/owner/overview", icon: LayoutDashboard },
        { name: "Users", href: "/studio/owner/users", icon: Users },
        { name: "Finance", href: "/studio/owner/finance", icon: DollarSign },
        { name: "Currency", href: "/studio/owner/currency", icon: DollarSign },
        { name: "Activity", href: "/studio/owner/activity", icon: Activity },
        { name: "Settings", href: "/studio/owner/settings", icon: Settings },
      ],
    },
    {
      id: "admin",
      label: "Admin",
      roles: ["owner", "admin"],
      items: [
        { name: "Overview", href: "/studio/admin/overview", icon: LayoutDashboard },
        { name: "Users", href: "/studio/admin/users", icon: Users },
        { name: "Licenses", href: "/studio/admin/licenses", icon: Key },
        { name: "Redeem", href: "/studio/admin/redeem", icon: Gift },
        { name: "Voucher Plan", href: "/studio/admin/voucher-plan", icon: Ticket },
        { name: "Transactions", href: "/studio/admin/transactions", icon: History },
        { name: "Activity", href: "/studio/admin/activity", icon: Activity },
      ],
    },
    {
      id: "developer",
      label: "Developer",
      roles: ["owner", "developer"],
      items: [
        { name: "Overview", href: "/studio/developer/overview", icon: LayoutDashboard },
        { name: "Scripts", href: "/studio/developer/scripts", icon: Code2 },
        { name: "Deploy", href: "/studio/developer/deploy", icon: Upload },
        { name: "Releases", href: "/studio/developer/releases", icon: Package },
        { name: "Changelogs", href: "/studio/developer/changelogs", icon: History },
      ],
    },
    {
      id: "staff",
      label: "Staff",
      roles: ["owner", "admin", "staff"],
      items: [
        { name: "Overview", href: "/studio/staff/overview", icon: LayoutDashboard },
        { name: "Key Lookup", href: "/studio/staff/lookup", icon: Key },
        { name: "Tickets", href: "/studio/staff/tickets", icon: Headphones },
      ],
    },
  ]

  // Find which group matches the current path section
  const matchedGroup = navigationGroups.find((group) =>
    pathname.startsWith(`/studio/${group.id}`)
  )

  // Fallback: if no group matches (e.g. they are on `/studio` root), 
  // show the first group they have access to based on their role
  const activeGroup = matchedGroup || navigationGroups.find((group) =>
    group.roles.includes(userRole)
  )

  // Filter items in the active group to make sure the user has access to it
  const hasAccess = !!(activeGroup && activeGroup.roles.includes(userRole))
  const displayItems = (hasAccess && activeGroup) ? activeGroup.items : []

  return (
    <>
      <SidebarHeader className="border-b border-border px-4 group-data-[collapsible=icon]:px-2 h-14 flex flex-row items-center justify-between shrink-0">
        <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
          <VSLogo className="h-6 w-auto text-primary transition-transform duration-300 hover:scale-105 group-data-[collapsible=icon]:h-4.5" />
          <span className="font-extrabold text-sm tracking-tight leading-none text-foreground transition-all duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden whitespace-nowrap">
            VALINC STUDIO
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-3 group-data-[collapsible=icon]:p-2 gap-2 flex flex-col justify-between h-full">
        <div className="space-y-1">
          {activeGroup && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider group-data-[collapsible=icon]:hidden">
                {activeGroup.label} Workspace
              </div>
              <SidebarMenu>
                {displayItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.name}
                        render={<Link href={item.href} />}
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
              </SidebarMenu>
            </div>
          )}
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3 group-data-[collapsible=icon]:p-2 bg-muted/20 gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Back to Portal"
              render={<Link href="/portal/overview" />}
              className="font-normal text-sm rounded-lg transition-all duration-200 px-3 py-2 flex items-center gap-3 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center relative text-muted-foreground hover:text-foreground hover:bg-accent/40"
            >
              <ArrowLeft className="h-4.5 w-4.5 shrink-0" />
              <span className="transition-all duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden whitespace-nowrap">
                Back to Portal
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="h-px bg-border/60 group-data-[collapsible=icon]:hidden" />
        <PortalProfileMenu />
      </SidebarFooter>
    </>
  )
}
