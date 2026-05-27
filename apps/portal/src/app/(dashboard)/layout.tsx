export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { SidebarV2 } from '@/components/layout/SidebarV2'
import { TrialExpiredOverlay } from '@/components/ui/TrialExpiredOverlay'
import { LowCreditsNotice } from '@/components/ui/LowCreditsNotice'
import { AskFigsyButton } from '@/components/ui/AskFigsyButton'
import { CommandPalette } from '@/components/ui/CommandPalette'

const V2 = process.env.FEATURE_PORTAL_V2 === 'true'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let trialExpired  = false
  let creditBalance = 0
  let hasFigsy      = false
  let hasMilla      = false
  let hasVida       = false

  try {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('credit_balance, subscriptions(*)')
      .eq('user_id', user.id)
      .maybeSingle()

    if (clientRow) {
      creditBalance = clientRow.credit_balance ?? 0
      const subs = (clientRow.subscriptions as { status: string; product?: string; trial_ends_at?: string }[]) ?? []

      const isLive = (p: string) => subs.some(s => s.product === p && (s.status === 'active' || s.status === 'trialing'))
      hasFigsy = isLive('lead_gen_figsy') || isLive('figsy_addon')
      hasMilla = isLive('virtual_assistant')
      hasVida  = isLive('chatbot')

      const hasAny = subs.some((s) => s.status === 'active')
      if (!hasAny) {
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
    <div className="flex h-screen" style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)' }}>
      <Sidebar
        userEmail={user.email || ''}
        creditBalance={creditBalance}
        hasFigsy={hasFigsy}
        hasMilla={hasMilla}
        hasVida={hasVida}
      />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative">
        <TrialExpiredOverlay expired={trialExpired} />
        <div className={`${V2 ? 'max-w-7xl' : 'max-w-7xl'} space-y-4`}>
          <LowCreditsNotice balance={creditBalance} />
          {children}
        </div>
      </main>
      <AskFigsyButton hasFigsy={hasFigsy} />
      <CommandPalette />
    </div>
  )
}
