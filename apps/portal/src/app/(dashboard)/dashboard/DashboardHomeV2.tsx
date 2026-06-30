/** V2 Dashboard home — Agent Card Grid, wired to REAL data. Rendered only when
 *  FEATURE_V2_SCREENS=home. Server component (presentational). */

import Link from 'next/link'
import { ArrowRight, BadgeCheck } from 'lucide-react'
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
  hasMilla: boolean
  hasVida: boolean
  hasDenise: boolean
}

export function DashboardHomeV2({ firstName, timeOfDay, sent, replied, hot, shareToken, hasFigsy, hasMilla, hasVida, hasDenise }: Props) {
  const agents = [
    { name: 'FIGSY',  role: 'The Opener',    img: '/agents/figsy.png',  g: 'from-[#7C3AED] to-[#6025c0]', href: '/dashboard/figsy',
      active: hasFigsy, metrics: [['Sent', sent], ['Replied', replied], ['Hot leads', hot]] as [string, number][] },
    { name: 'Milla',  role: 'The Brain',     img: '/agents/milla.png',  g: 'from-[#0ea5e9] to-[#0284c7]', href: '/dashboard/assistant',
      active: hasMilla, feats: ['Calendar & meetings', 'Email drafting', 'Research & briefings', 'Task tracking'] },
    { name: 'Vida',   role: 'The Connector', img: '/agents/vida.png',   g: 'from-[#10b981] to-[#059669]', href: '/dashboard/chatbot',
      active: hasVida, feats: ['24/7 visitor engagement', 'Lead capture & qualify', 'Demo booking', 'Handoff to reps'] },
    { name: 'Denise', role: 'The Closer',    img: '/agents/denise.png', g: 'from-[#D97706] to-[#b45309]', href: '/dashboard/denise',
      active: hasDenise, feats: ['Confirms booked meetings', 'Joins calls as notetaker', 'Drafts proposals', 'Chases warm leads'] },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good {timeOfDay}, {firstName} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your AI Family — at a glance.</p>
        </div>
        {sent > 0 && shareToken && <CopyShareLink token={shareToken} />}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {agents.map(a => (
          <div key={a.name} className={`${card} overflow-hidden flex flex-col`}>
            <div className={`relative bg-gradient-to-br ${a.g} px-5 py-5`}>
              <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
                <BadgeCheck className="w-3 h-3" /> Certified
              </span>
              <div className="w-14 h-14 rounded-xl overflow-hidden mb-3 bg-white/20 ring-2 ring-white/30"><img src={a.img} alt={a.name} className="w-full h-full object-cover object-top" /></div>
              <p className="text-white font-bold text-lg leading-tight">{a.name}</p>
              <p className="text-white/70 text-xs mt-0.5">{a.role}</p>
            </div>
            <div className="px-5 py-4 flex-1 flex flex-col">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full self-start mb-3 ${a.active ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-[#7C3AED]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${a.active ? 'bg-emerald-500 animate-pulse' : 'bg-[#7C3AED]'}`} />{a.active ? 'Active' : 'Available'}
              </span>
              {a.metrics ? (
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100 mb-4 text-center">
                  {a.metrics.map(([l, v]) => (<div key={l}><p className="text-lg font-bold text-gray-900">{v.toLocaleString()}</p><p className="text-[10px] text-gray-400">{l}</p></div>))}
                </div>
              ) : (
                <div className="flex-1 space-y-2 mb-4">
                  {a.feats!.map(f => (<div key={f} className="flex items-start gap-2 text-[13px] text-gray-600"><span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: BRAND }} />{f}</div>))}
                </div>
              )}
              <Link href={a.active ? a.href : '/dashboard/billing'} className="mt-auto w-full flex items-center justify-center gap-2 text-sm font-bold py-2.5 rounded-xl text-white" style={{ background: BRAND }}>
                {a.active ? <>Open {a.name} <ArrowRight className="w-4 h-4" /></> : 'Add to plan'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
