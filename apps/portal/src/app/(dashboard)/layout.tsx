export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Sidebar } from '@/components/layout/Sidebar'
import { TrialExpiredOverlay } from '@/components/ui/TrialExpiredOverlay'
import { LowCreditsNotice } from '@/components/ui/LowCreditsNotice'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { AgentColumn } from './AgentColumn'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let trialExpired  = false
  let creditBalance = 0
  let hasFigsy      = false
  let hasMilla      = false
  let hasVida       = false
  let leadCount     = 0
  let isPartner     = false

  // Check if this user has a partner record — use service role to bypass RLS
  if (user.email) {
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: partnerRow } = await svc
      .from('partners')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()
    isPartner = !!partnerRow
  }

  try {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('id, credit_balance, subscriptions(*)')
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

      // Lead count for FIGSY context messages
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientRow.id)
      leadCount = count ?? 0
    }
  } catch { }

  const isNewUser = leadCount === 0

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFE]">
      <Sidebar
        userEmail={user.email || ''}
        creditBalance={creditBalance}
        hasFigsy={hasFigsy}
        hasMilla={hasMilla}
        hasVida={hasVida}
        isNewUser={isNewUser}
        isPartner={isPartner}
      />
      <main className="flex-1 overflow-y-auto p-4 pt-[4.5rem] sm:p-6 sm:pt-[4.75rem] lg:p-8 lg:pt-8">
        <TrialExpiredOverlay expired={trialExpired} />
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch lg:items-start max-w-7xl mx-auto w-full">
          <div className="flex-1 min-w-0 space-y-4">
            <LowCreditsNotice balance={creditBalance} />
            {children}
          </div>
          <AgentColumn
            hasFigsy={hasFigsy}
            hasMilla={hasMilla}
            hasVida={hasVida}
            leadCount={leadCount}
            creditBalance={creditBalance}
            isNewUser={isNewUser}
          />
        </div>
      </main>
      <CommandPalette />
    </div>
  )
}
