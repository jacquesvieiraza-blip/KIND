export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Package, Repeat, ListChecks, Boxes, ArrowRight } from 'lucide-react'

// M3 · Admin Ops (#280). Inbox pool management + Onboarding ops.
// SHELLS — honest wire-in states, NO fake data. The pool sections are hard-blocked
// on Smartlead access (the pre-warmed inbox pool); the trigger rows they mirror
// live on the Cockpit Action Queue (#270/#271). Onboarding ops mirrors the SOP.

function ShellCard({
  icon: Icon, title, blurb, waiting, rows,
}: {
  icon: React.ElementType; title: string; blurb: string; waiting: string; rows: string[]
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#7C3AED] flex items-center justify-center"><Icon className="w-5 h-5" /></div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">{waiting}</span>
      </div>
      <p className="text-xs text-gray-500 mt-1 mb-4">{blurb}</p>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r} className="flex items-center gap-2 text-sm text-gray-600 bg-white/60 border border-brand-200/50 rounded-lg px-3 py-2">
            <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            {r}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OpsPage() {
  return (
    <div className="px-8 py-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Boxes className="w-6 h-6 text-[#7C3AED]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🛠️ Ops</h1>
          <p className="text-sm text-gray-500 mt-0.5">Inbox pool management and onboarding operations — the run-the-business layer.</p>
        </div>
      </div>

      <ShellCard
        icon={Package}
        title="Inbox pool — stock"
        waiting="needs Smartlead access"
        blurb="Live count of pre-warmed pooled inboxes, what's assigned vs free, and a reorder trigger when stock runs low."
        rows={[
          'Pooled inboxes in stock · assigned vs free',
          'Reorder pre-warmed inboxes when the pool drops below threshold',
        ]}
      />

      <ShellCard
        icon={Repeat}
        title="Provisioning & day-29 switches"
        waiting="needs Smartlead access"
        blurb="On payment, buy the client's branded inbox and warm it; around day 29, switch them off the pooled inbox onto their branded domain."
        rows={[
          'New trial → assign a pooled inbox',
          'Payment → provision branded inbox + start the warm clock',
          'Day-29 → switch off the pooled inbox onto the branded domain',
        ]}
      />

      <ShellCard
        icon={ListChecks}
        title="Onboarding ops — trial → paid"
        waiting="wire-in · mirrors the SOP"
        blurb="The step-by-step onboarding runbook per client — signup, ICP, first campaign, first lead, first reply — so nothing stalls silently."
        rows={[
          'Per-client onboarding checklist (signup → ICP → campaign → lead → reply)',
          'Stalled-step flags (mirrors the Activation funnel)',
        ]}
      />

      <p className="text-xs text-gray-400">
        The live trigger queue these mirror is on the <Link href="/" className="text-[#7C3AED] hover:underline">Cockpit</Link> (Needs-you-now).
        Onboarding progress per client is live on <Link href="/activation" className="text-[#7C3AED] hover:underline">Activation</Link>.
      </p>
    </div>
  )
}
