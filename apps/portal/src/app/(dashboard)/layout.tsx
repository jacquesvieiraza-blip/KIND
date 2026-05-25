export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { SidebarV2 } from '@/components/layout/SidebarV2'
import { TrialExpiredOverlay } from '@/components/ui/TrialExpiredOverlay'
import { LowCreditsNotice } from '@/components/ui/LowCreditsNotice'
import { SupportWidget } from '@/components/ui/SupportWidget'

const V2 = process.env.FEATURE_PORTAL_V2 === 'true'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let trialExpired  = false
  let creditBalance = 0

  try {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('credit_balance, subscriptions(*)')
      .eq('user_id', user.id)
      .maybeSingle()

    if (clientRow) {
      creditBalance = clientRow.credit_balance ?? 0
      const subs = (clientRow.subscriptions as { status: string; trial_ends_at?: string }[]) ?? []
      const hasActive = subs.some((s) => s.status === 'active')
      if (!hasActive) {
        const trialing = subs.find((s) => s.status === 'trialing')
        if (trialing?.trial_ends_at) {
          const daysLeft = Math.ceil((new Date(trialing.trial_ends_at).getTime() - Date.now()) / 86400000)
          trialExpired = daysLeft <= 0
        }
      }
    }
  } catch { }

  const Nav = V2 ? SidebarV2 : Sidebar

  return (
    <div className={`flex h-screen dark:bg-gray-950 transition-colors duration-200 ${V2 ? 'bg-[#f0f2f5]' : 'bg-gray-50'}`}>
      <Nav userEmail={user.email || ''} creditBalance={creditBalance} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative">
        <TrialExpiredOverlay expired={trialExpired} />
        <div className={`${V2 ? 'max-w-7xl' : 'max-w-7xl'} space-y-4`}>
          <LowCreditsNotice balance={creditBalance} />
          {children}
        </div>
      </main>
      <SupportWidget />
    </div>
  )
}
