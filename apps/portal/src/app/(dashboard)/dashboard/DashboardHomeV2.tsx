/** V2 Dashboard home — FIGSY command home, wired to REAL data. Rendered only when
 *  FEATURE_V2_SCREENS=home. Server component (presentational).
 *  Cut to FIGSY-only 10 Jul (SPRINT line 2): the Milla/Vida/Denise agent-card grid
 *  was replaced by a single FIGSY command card + action rail. The other agents
 *  return after 3 months of paid, verified clients (restore: pre-cut SHA ffa5f59). */

import Link from 'next/link'
import { ArrowRight, BadgeCheck, Target, Inbox, LineChart, Search } from 'lucide-react'
import { CopyShareLink } from '@/components/ui/CopyShareLink'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

interface Props {
  firstName: string
  timeOfDay: string
  sent: number
  replied: number
  hot: number
  shareToken?: string | null
  hasFigsy: boolean
  // Retained for caller compatibility after the FIGSY-only cut; no longer used.
  hasMilla?: boolean
  hasVida?: boolean
  hasDenise?: boolean
}

const QUICK_ACTIONS = [
  { href: '/dashboard/figsy', label: 'View campaigns',  icon: Target },
  { href: '/dashboard/inbox', label: 'Check inbox',     icon: Inbox },
  { href: '/dashboard/kpis',  label: 'See performance', icon: LineChart },
  { href: '/dashboard/leads', label: 'Find more leads', icon: Search },
]

const DOES = [
  'Finds & verifies your ICP leads',
  'Writes & sends the outreach',
  'Runs multi-step sequences',
  'Books the meeting for you',
]

export function DashboardHomeV2({ firstName, timeOfDay, sent, replied, hot, shareToken, hasFigsy }: Props) {
  const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0
  const stats: [string, string][] = [
    ['Sent', sent.toLocaleString()],
    ['Replied', replied.toLocaleString()],
    ['Reply rate', `${replyRate}%`],
    ['Hot leads', hot.toLocaleString()],
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good {timeOfDay}, {firstName} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your AI SDR — at a glance.</p>
        </div>
        {sent > 0 && shareToken && <CopyShareLink token={shareToken} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── FIGSY command card ─────────────────────────────────────── */}
        <div className={`lg:col-span-2 ${card} overflow-hidden flex flex-col`}>
          <div className="relative bg-gradient-to-br from-[#7C3AED] to-[#6025c0] px-6 py-6 flex items-center gap-5">
            <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
              <BadgeCheck className="w-3 h-3" /> Certified
            </span>
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/20 ring-2 ring-white/30 shrink-0">
              <img src="/agents/figsy.png" alt="FIGSY" className="w-full h-full object-cover object-top" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-2xl leading-tight">FIGSY</p>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/15 text-white">
                  <span className={`w-1.5 h-1.5 rounded-full ${hasFigsy ? 'bg-emerald-400 animate-pulse' : 'bg-white/50'}`} />
                  {hasFigsy ? 'Active' : 'Available'}
                </span>
              </div>
              <p className="text-white/75 text-sm mt-1">The Opener · AI SDR · Outbound Sales Specialist</p>
            </div>
          </div>

          <div className="px-6 py-5 flex-1 flex flex-col">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">This week</p>
            <div className="grid grid-cols-4 gap-2 pb-5 mb-5 border-b border-gray-100 text-center">
              {stats.map(([l, v]) => (
                <div key={l}>
                  <p className="text-2xl font-bold text-gray-900">{v}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 mb-6">
              {DOES.map(d => (
                <div key={d} className="flex items-start gap-2 text-[13px] text-gray-600">
                  <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: BRAND }} />{d}
                </div>
              ))}
            </div>
            <div className="mt-auto flex flex-col sm:flex-row gap-3">
              <Link href={hasFigsy ? '/dashboard/figsy' : '/dashboard/billing'} className="flex-1 flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl text-white" style={{ background: BRAND }}>
                {hasFigsy ? <>Open FIGSY <ArrowRight className="w-4 h-4" /></> : 'Add to plan'}
              </Link>
              <Link href="/dashboard/figsy-chat" className="flex-1 flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl text-[#7C3AED] bg-purple-50 border border-purple-100 hover:bg-purple-100 transition-colors">
                Chat with FIGSY
              </Link>
            </div>
          </div>
        </div>

        {/* ── Action rail ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <div className={`${card} p-5`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Quick actions</p>
            <div className="space-y-2">
              {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-gray-50 hover:bg-purple-50 text-[13px] font-semibold text-gray-700 transition-colors">
                  <span className="flex items-center gap-2.5"><Icon className="w-4 h-4 text-[#7C3AED]" />{label}</span>
                  <ArrowRight className="w-4 h-4 text-[#7C3AED]" />
                </Link>
              ))}
            </div>
          </div>

          <Link href="/dashboard/figsy-chat" className={`${card} p-5 block hover:border-purple-200 transition-colors`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Assign a task to FIGSY</p>
            <div className="rounded-xl border border-gray-200 px-3.5 py-3 text-[13px] text-gray-400 mb-3">What do you want FIGSY to do?</div>
            <span className="w-full flex items-center justify-center text-sm font-bold py-2.5 rounded-xl text-white" style={{ background: BRAND }}>Assign to FIGSY</span>
          </Link>
        </div>

      </div>
    </div>
  )
}
