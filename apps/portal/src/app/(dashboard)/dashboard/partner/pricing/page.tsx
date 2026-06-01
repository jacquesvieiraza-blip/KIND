'use client'

import Link from 'next/link'
import { CheckCircle, ArrowLeft, Handshake, Monitor, TrendingUp } from 'lucide-react'

const STARTER_FEATURES = [
  'ICP Builder — define your ideal customer',
  'FIGSY outbound campaigns (up to 2 active)',
  'AI-scored leads via Apollo',
  'Email quality scoring',
  'Inbox with reply categorisation',
  'Milla AI assistant',
  'KPI dashboard',
  '40 credits / month',
]

const GROWTH_FEATURES = [
  'Everything in Starter',
  'Unlimited active campaigns',
  'Waterfall enrichment (Hunter, Apollo, LinkedIn)',
  'Intent signal triggers',
  'Warm leads priority tab',
  'Co-pilot mode (approval queue)',
  'White-label PDF reports',
  'Multi-user team (up to 5 seats)',
  '100 credits / month',
]

const TIERS = [
  { type: 'Referral', commission: '20%', description: 'Refer clients through your link. Earn on every payment they make.' },
  { type: 'Agency',  commission: '25%', description: 'Manage outbound for your clients inside K.I.N.D. Higher commission for active management.' },
  { type: 'White-label', commission: '30%', description: 'Resell K.I.N.D under your own brand. Highest commission tier.' },
]

export default function PartnerPricingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">

      {/* Back link */}
      <Link href="/dashboard/partner" className="inline-flex items-center gap-1.5 text-sm text-[#7C3AED] hover:text-purple-800 font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Partner Hub
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Handshake className="w-5 h-5 text-[#7C3AED]" />
          <p className="text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">K.I.N.D Partner Programme</p>
        </div>
        <h1 className="text-2xl font-bold text-[#1E1152]">How it works — and what it costs</h1>
        <p className="text-gray-500 mt-2 text-sm max-w-xl">
          As a K.I.N.D Partner, you get a free demo sandbox to show prospects. If you want to use K.I.N.D for your own pipeline,
          you sign up as a regular client at the standard rates below.
        </p>
      </div>

      {/* Demo sandbox — always free */}
      <div className="bg-[#7C3AED]/5 border border-[#7C3AED]/20 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center shrink-0">
            <Monitor className="w-4 h-4 text-[#7C3AED]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-semibold text-[#1E1152]">Demo sandbox</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Always free</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Every approved partner gets a demo environment pre-loaded with leads, an active ICP, and 100 credits.
              Use it to walk prospects through K.I.N.D — no cost, no time limit, renewable on request.
            </p>
            <ul className="space-y-1.5 text-sm text-gray-600">
              {['Pre-loaded SaaS leads via Apollo', '100 credits — enough to run a full campaign demo', 'All 4 products on Starter plan', 'Active ICP ready to go', 'One-click login from your Partner Hub', '90-day expiry (renewable)'].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Client pricing */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
          <h2 className="font-semibold text-[#1E1152]">Want K.I.N.D for your own outreach?</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Sign up as a regular client. You get exactly the same experience as the clients you refer — at the same price.
          Partners do not get a discount on their own subscription.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Starter */}
          <div className="bg-white border border-purple-100 rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider mb-1">Starter</p>
            <p className="text-2xl font-bold text-[#1E1152] mb-0.5">R 1,500<span className="text-base font-normal text-gray-400"> / mo</span></p>
            <p className="text-xs text-gray-400 mb-4">40 credits included</p>
            <ul className="space-y-2 text-sm text-gray-600">
              {STARTER_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          {/* Growth */}
          <div className="bg-white border border-[#7C3AED]/30 rounded-2xl p-6 shadow-sm relative">
            <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-xs font-bold bg-[#7C3AED] text-white">Most popular</div>
            <p className="text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider mb-1">Growth</p>
            <p className="text-2xl font-bold text-[#1E1152] mb-0.5">R 3,500<span className="text-base font-normal text-gray-400"> / mo</span></p>
            <p className="text-xs text-gray-400 mb-4">100 credits included</p>
            <ul className="space-y-2 text-sm text-gray-600">
              {GROWTH_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">All prices in ZAR. Billed monthly. Cancel anytime.</p>
      </div>

      {/* Commission rates */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Handshake className="w-4 h-4 text-[#7C3AED]" />
          <h2 className="font-semibold text-[#1E1152]">Your commission rates</h2>
        </div>
        <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tier</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Commission</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">How it works</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {TIERS.map(t => (
                <tr key={t.type}>
                  <td className="px-5 py-4 font-semibold text-[#1E1152]">{t.type}</td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded-full text-sm font-bold bg-[#7C3AED]/10 text-[#7C3AED]">{t.commission}</span>
                    <span className="ml-1.5 text-xs text-gray-400">recurring</span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Commissions are paid monthly via Wise. Minimum payout threshold: R 500. Paid within 10 business days of month end.
        </p>
      </div>

      {/* Sign up CTA */}
      <div className="bg-[#1E1152] rounded-2xl p-6 text-white text-center">
        <h2 className="font-bold text-lg mb-2">Ready to use K.I.N.D for your own pipeline?</h2>
        <p className="text-sm text-white/60 mb-4">Sign up as a client. Same product, same price. Your referral programme stays active.</p>
        <a
          href="https://get-kind.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl text-sm transition-colors"
        >
          Sign up as a client →
        </a>
      </div>

    </div>
  )
}
