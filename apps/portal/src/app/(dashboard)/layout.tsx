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
        <style>{`@keyframes floatDot{0%{transform:translateY(0) translateX(0)}25%{transform:translateY(-22px) translateX(10px)}75%{transform:translateY(-52px) translateX(-8px)}100%{transform:translateY(-72px) translateX(5px)}}`}</style>
        {[
          { top: '4%',  left: '8%',  size: 5,  delay: '0s',    dur: '2.8s', color: '#A5B4FC', op: 0.35 },
          { top: '8%',  left: '28%', size: 3,  delay: '0.4s',  dur: '2.4s', color: '#C4B5FD', op: 0.3  },
          { top: '6%',  left: '58%', size: 7,  delay: '0.9s',  dur: '3.2s', color: '#A5B4FC', op: 0.3  },
          { top: '10%', left: '82%', size: 4,  delay: '0.2s',  dur: '2.6s', color: '#818CF8', op: 0.35 },
          { top: '18%', left: '5%',  size: 4,  delay: '1.3s',  dur: '3.5s', color: '#C4B5FD', op: 0.25 },
          { top: '22%', left: '44%', size: 6,  delay: '0.6s',  dur: '2.9s', color: '#A5B4FC', op: 0.3  },
          { top: '20%', left: '93%', size: 3,  delay: '1.8s',  dur: '2.5s', color: '#C4B5FD', op: 0.3  },
          { top: '32%', left: '18%', size: 8,  delay: '0.3s',  dur: '3.8s', color: '#A5B4FC', op: 0.25 },
          { top: '30%', left: '70%', size: 4,  delay: '1.1s',  dur: '2.7s', color: '#818CF8', op: 0.35 },
          { top: '38%', left: '90%', size: 5,  delay: '0.7s',  dur: '3.3s', color: '#A5B4FC', op: 0.3  },
          { top: '48%', left: '3%',  size: 3,  delay: '2.2s',  dur: '2.4s', color: '#C4B5FD', op: 0.35 },
          { top: '45%', left: '38%', size: 6,  delay: '0.5s',  dur: '3.1s', color: '#A5B4FC', op: 0.3  },
          { top: '50%', left: '76%', size: 4,  delay: '1.6s',  dur: '3.6s', color: '#818CF8', op: 0.3  },
          { top: '58%', left: '14%', size: 5,  delay: '0.8s',  dur: '2.8s', color: '#A5B4FC', op: 0.35 },
          { top: '62%', left: '52%', size: 3,  delay: '2s',    dur: '2.5s', color: '#C4B5FD', op: 0.3  },
          { top: '60%', left: '86%', size: 7,  delay: '0.4s',  dur: '3.4s', color: '#A5B4FC', op: 0.3  },
          { top: '70%', left: '30%', size: 4,  delay: '1.4s',  dur: '2.7s', color: '#818CF8', op: 0.35 },
          { top: '72%', left: '64%', size: 5,  delay: '0.6s',  dur: '3.2s', color: '#A5B4FC', op: 0.3  },
          { top: '75%', left: '96%', size: 3,  delay: '1.9s',  dur: '2.6s', color: '#C4B5FD', op: 0.3  },
          { top: '82%', left: '10%', size: 6,  delay: '1s',    dur: '3.7s', color: '#A5B4FC', op: 0.35 },
          { top: '85%', left: '42%', size: 4,  delay: '0.3s',  dur: '3s',   color: '#818CF8', op: 0.3  },
          { top: '88%', left: '74%', size: 5,  delay: '1.5s',  dur: '2.8s', color: '#A5B4FC', op: 0.3  },
          { top: '93%', left: '56%', size: 3,  delay: '2.3s',  dur: '2.4s', color: '#C4B5FD', op: 0.3  },
          { top: '2%',  left: '40%', size: 4,  delay: '0.8s',  dur: '3.1s', color: '#A5B4FC', op: 0.35 },
          { top: '28%', left: '56%', size: 5,  delay: '1.5s',  dur: '3.5s', color: '#C4B5FD', op: 0.3  },
          { top: '52%', left: '22%', size: 6,  delay: '1.9s',  dur: '2.9s', color: '#A5B4FC', op: 0.3  },
          { top: '40%', left: '50%', size: 3,  delay: '0.5s',  dur: '2.3s', color: '#818CF8', op: 0.35 },
          { top: '15%', left: '16%', size: 4,  delay: '1.2s',  dur: '3.3s', color: '#C4B5FD', op: 0.3  },
        ].map((dot, i) => (
          <div key={i} className="absolute rounded-full" style={{
            top: dot.top, left: dot.left, width: dot.size, height: dot.size,
            background: dot.color, opacity: dot.op,
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
