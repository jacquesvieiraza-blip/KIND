export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
    <div className="flex h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)' }}>
      {/* Floating ambient dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
        <style>{`@keyframes floatDot{0%{transform:translateY(0) translateX(0)}50%{transform:translateY(-20px) translateX(5px)}100%{transform:translateY(-35px) translateX(-5px)}}`}</style>
        {[
          { top: '5%',  left: '18%', size: 8,  delay: '0s',   dur: '9s'  },
          { top: '12%', left: '72%', size: 6,  delay: '1.5s', dur: '7s'  },
          { top: '28%', left: '88%', size: 10, delay: '0.8s', dur: '11s' },
          { top: '45%', left: '95%', size: 5,  delay: '2.5s', dur: '8s'  },
          { top: '65%', left: '82%', size: 8,  delay: '1s',   dur: '9s'  },
          { top: '80%', left: '65%', size: 6,  delay: '3s',   dur: '10s' },
          { top: '90%', left: '40%', size: 9,  delay: '0.3s', dur: '7s'  },
          { top: '75%', left: '25%', size: 5,  delay: '2s',   dur: '12s' },
          { top: '55%', left: '10%', size: 8,  delay: '1.2s', dur: '8s'  },
          { top: '35%', left: '3%',  size: 6,  delay: '0.6s', dur: '10s' },
          { top: '18%', left: '50%', size: 5,  delay: '3.5s', dur: '9s'  },
          { top: '8%',  left: '35%', size: 8,  delay: '1.8s', dur: '7s'  },
        ].map((dot, i) => (
          <div key={i} className="absolute rounded-full" style={{
            top: dot.top, left: dot.left, width: dot.size, height: dot.size,
            background: '#7C3AED', opacity: 0.12,
            animation: `floatDot ${dot.dur} ease-in-out ${dot.delay} infinite alternate`,
          }} />
        ))}
      </div>
      <Sidebar
        userEmail={user.email || ''}
        creditBalance={creditBalance}
        hasFigsy={hasFigsy}
        hasMilla={hasMilla}
        hasVida={hasVida}
        isNewUser={isNewUser}
      />
      <main className="flex-1 overflow-y-auto p-4 pt-[4.5rem] sm:p-6 sm:pt-[4.75rem] lg:p-8 lg:pt-8 relative z-10">
        <TrialExpiredOverlay expired={trialExpired} />
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-stretch lg:items-start max-w-7xl mx-auto w-full">
          <AgentColumn
            hasFigsy={hasFigsy}
            hasMilla={hasMilla}
            hasVida={hasVida}
            leadCount={leadCount}
            creditBalance={creditBalance}
            isNewUser={isNewUser}
          />
          <div className="flex-1 min-w-0 space-y-4 order-first lg:order-none">
            <LowCreditsNotice balance={creditBalance} />
            {children}
          </div>
        </div>
      </main>
      <CommandPalette />
    </div>
  )
}
