export const dynamic = 'force-dynamic'

/** Agent Marketplace (live). Real owned-vs-available from the client's subscriptions.
 *  Gated by FEATURE_V2_SCREENS=marketplace — redirects out when off. */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { v2Enabled } from '@/lib/flags'
import { Check, BadgeCheck } from 'lucide-react'
import { PRODUCTS } from '@kind/shared'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

export default async function MarketplacePage() {
  if (!v2Enabled('marketplace')) redirect('/dashboard')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let subs: { product?: string; status?: string }[] = []
  try {
    const { data: clientRow } = await supabase
      .from('clients').select('subscriptions(*)').eq('user_id', user.id).maybeSingle()
    subs = ((clientRow?.subscriptions as { product?: string; status?: string }[]) ?? [])
  } catch { /* show all as available */ }

  const isLive = (p: string) => subs.some(s => s.product === p && (s.status === 'active' || s.status === 'trialing'))
  const owned = {
    figsy:  isLive('lead_gen_figsy') || isLive('figsy_addon') || isLive('lead_gen'),
    milla:  isLive('virtual_assistant'),
    vida:   isLive('chatbot'),
    denise: isLive('denise') || isLive('denise_addon'),
  }

  // Persona roles + funnel order; all certified.
  const AGENTS = [
    { key: 'figsy',  name: 'FIGSY',  role: 'The Opener',    stage: 'Finds & books',    img: '/agents/figsy.png',  price: 'Pay per result', owned: owned.figsy, comingSoon: false },
    { key: 'milla',  name: 'Milla',  role: 'The Brain',     stage: 'The intelligence', img: '/agents/milla.png',  price: `$${PRODUCTS.virtual_assistant.price_usd}/mo`,   owned: owned.milla,  comingSoon: false },
    { key: 'vida',   name: 'Vida',   role: 'The Connector', stage: 'Inbound capture',  img: '/agents/vida.png',   price: `$${PRODUCTS.chatbot.price_usd}/mo`,   owned: owned.vida,   comingSoon: false },
    { key: 'denise', name: 'Denise', role: 'The Closer',    stage: 'Closes the deal',  img: '/agents/denise.png', price: `$${PRODUCTS.denise.price_usd}/mo`,   owned: owned.denise, comingSoon: false },
    // Lena & Tony are the next family members — shown as Coming soon (not yet sellable).
    { key: 'lena',   name: 'Lena',   role: 'The Keeper',    stage: 'Retains & grows',  img: '/agents/lena.png',   price: 'Coming soon', owned: false, comingSoon: true },
    { key: 'tony',   name: 'Tony',   role: 'The Operator',  stage: 'Keeps it clean',   img: '/agents/tony.png',   price: 'Coming soon', owned: false, comingSoon: true },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-7 text-white" style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}>
        <h1 className="text-2xl font-bold mb-1">Meet your AI Family</h1>
        <p className="text-sm text-white/85 max-w-lg">Each agent owns one stage of the funnel. Add the ones you need — one company bill, every rep covered.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {AGENTS.map(a => (
          <div key={a.key} className={`${card} p-5 text-center`}>
            <div className="relative w-16 h-16 mx-auto mb-3">
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-gray-100">
                <img src={a.img} alt={a.name} className="w-full h-full object-cover object-top" />
              </div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: BRAND }}>
                <BadgeCheck className="w-2.5 h-2.5" /> Certified
              </span>
            </div>
            <p className="font-bold text-gray-900 text-lg">{a.name}</p>
            <p className="text-xs font-semibold" style={{ color: BRAND }}>{a.role}</p>
            <p className="text-[13px] text-gray-600 mt-2 mb-4">{a.stage}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">{a.price}</span>
              {a.comingSoon ? (
                <span className="inline-flex items-center text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">Coming soon</span>
              ) : a.owned ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg"><Check className="w-3.5 h-3.5" /> Active</span>
              ) : (
                <Link href="/dashboard/billing" className="text-xs font-bold text-white px-4 py-1.5 rounded-lg" style={{ background: BRAND }}>Add</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
