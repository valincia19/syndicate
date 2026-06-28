'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { Activity, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function OwnerActivityPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true))
  }, [])

  useEffect(() => {
    if (!isLoading && mounted) {
      if (!user || user.role !== 'owner') {
        router.push('/studio')
      }
    }
  }, [user, isLoading, mounted, router])

  const logs = [
    { timestamp: '2026-06-23 01:15:32', event: 'License Created', user: 'admin_john', target: 'user@example.com', status: 'success', details: 'Premium tier license activated' },
    { timestamp: '2026-06-23 01:12:08', event: 'HWID Whitelisted', user: 'admin_john', target: 'A1B2-C3D4-E5F6', status: 'success', details: 'Hardware ID added to whitelist' },
    { timestamp: '2026-06-23 01:08:45', event: 'Script Deployment', user: 'dev_sarah', target: 'exploit-v2.lua', status: 'failed', details: 'Compilation error on line 243' },
    { timestamp: '2026-06-23 01:05:22', event: 'Support Ticket Resolved', user: 'staff_amy', target: 'Ticket #4521', status: 'success', details: 'Key reset completed' },
    { timestamp: '2026-06-23 01:00:18', event: 'User Login', user: 'dev_mike', target: 'Studio Dashboard', status: 'success', details: 'Authenticated via Discord OAuth' },
    { timestamp: '2026-06-23 00:58:45', event: 'License Revoked', user: 'admin_john', target: 'banned@user.com', status: 'success', details: 'Terms violation - permanent ban' },
    { timestamp: '2026-06-23 00:55:12', event: 'System Backup', user: 'system', target: 'Database', status: 'success', details: 'Automated daily backup completed' },
    { timestamp: '2026-06-23 00:50:08', event: 'Rate Limit Triggered', user: '192.168.1.100', target: '/v1/auth/login', status: 'warning', details: 'IP blocked for 15 minutes' }
  ]

  if (isLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground font-mono text-xs animate-pulse">Loading activity logs...</div>
      </div>
    )
  }

  if (!user || user.role !== 'owner') {
    return null
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
            System Activity
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Real-time operation logs and audit trail
          </p>
        </div>
      </div>

      {/* Activity Stream */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Activity className="w-4.5 h-4.5 text-primary" />
          <h2 className="text-xs font-mono text-foreground uppercase tracking-wider">Recent Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-muted/10 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Timestamp</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Event</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">User</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Target</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Status</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {logs.map((log, index) => (
                <tr key={index} className="hover:bg-muted/5 transition-colors">
                  <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{log.timestamp}</td>
                  <td className="px-5 py-3.5 text-xs text-foreground font-semibold">{log.event}</td>
                  <td className="px-5 py-3.5 text-xs font-mono text-primary font-medium">{log.user}</td>
                  <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{log.target}</td>
                  <td className="px-5 py-3.5 text-xs">
                    {log.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20 font-mono">
                        <CheckCircle className="w-3 h-3" />
                        Success
                      </span>
                    ) : log.status === 'failed' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] bg-red-500/5 text-red-600 dark:text-red-500 border-red-500/20 font-mono">
                        <XCircle className="w-3 h-3" />
                        Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/20 font-mono">
                        <AlertCircle className="w-3 h-3" />
                        Warning
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
