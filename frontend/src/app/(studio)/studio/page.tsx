'use client'

import { useEffect } from 'react'
import { redirect } from 'next/navigation'
import { useAuth } from '@/context/auth-context'

export default function StudioPage() {
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      redirect('/login?error=unauthorized')
    }

    // Route based on role
    const role = user.role.toLowerCase()
    
    switch (role) {
      case 'owner':
        redirect('/studio/owner')
        break
      case 'admin':
        redirect('/studio/admin')
        break
      case 'developer':
        redirect('/studio/developer')
        break
      case 'staff':
        redirect('/studio/staff')
        break
      default:
        // No studio access
        redirect('/portal/overview')
    }
  }, [user, isLoading])

  // Loading state
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-2 border-transparent border-t-[#FF6B35] border-r-[#FF6B35] rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-2 border-transparent border-b-[#4ECDC4] rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
        </div>
        <p className="text-[#999AA4] font-mono text-sm">Routing to workspace...</p>
      </div>
    </div>
  )
}
