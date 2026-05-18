export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/layout/Sidebar'
import { TrialExpiredOverlay } from '@/components/ui/TrialExpiredOverlay'
import { LowCreditsNotice } from '@/components/ui/LowCreditsNotice'
import { SupportWidget } from '@/components/ui/SupportWidget'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let trialExpired  = false
  let creditBalance = 0

  try {
    const admin = createAdminClient()
    const { data: clientRow } = await admin
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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userEmail={user.email || ''} creditBalance={creditBalance} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative">
        <TrialExpiredOverlay expired={trialExpired} />
        <div className="max-w-7xl space-y-4">
          <LowCreditsNotice balance={creditBalance} />
          {children}
        </div>
      </main>
      <SupportWidget />
    </div>
  )
}
