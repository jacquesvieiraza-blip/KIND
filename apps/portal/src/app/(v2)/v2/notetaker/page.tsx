'use client'

/** V2 — AI NOTETAKER → ACTION ITEMS (Milla). Full-screen preview, sample data. Gated /v2. */

import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

const SUMMARY = [
  ['Prospects contacted', '348'],
  ['Replied', '41'],
  ['Positive', '12'],
  ['Meetings booked', '5'],
]

const ACTIONS = [
  { text: 'Follow up the 12 positive replies — within 24h closes at 4× the rate', tag: 'Urgent', tagC: '#ea6a3a', tagB: '#fff1ea' },
  { text: "Review Zola's sequence — her reply rate dropped to 8%", tag: 'Attention', tagC: '#d97706', tagB: '#fffbeb' },
  { text: "Approve Tunde's +1,500 credit request (running low mid-campaign)", tag: 'Budget', tagC: '#7C3AED', tagB: '#f3eeff' },
]

export default function Notetaker() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · AI Notetaker (Milla) · sample data
      </div>
      <div className="max-w-3xl mx-auto px-6 py-7 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] flex items-center justify-center text-xl">💼</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Milla's nightly brief</h1>
            <p className="text-sm text-gray-500">She read every lead, reply &amp; campaign — here's what your team did, and what to do next.</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {SUMMARY.map(([l, v]) => (
            <div key={l} className={`${card} p-4 text-center`}><p className="text-2xl font-bold text-gray-900">{v}</p><p className="text-[11px] text-gray-400 mt-0.5">{l}</p></div>
          ))}
        </div>

        <div className={`${card} p-5`}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">Do these 3 things today</p>
          <div className="space-y-2.5">
            {ACTIONS.map(a => (
              <div key={a.text} className="flex items-start gap-3 bg-[#faf9ff] border border-gray-100 rounded-xl p-3.5">
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: BRAND }} />
                <p className="flex-1 text-sm text-gray-800">{a.text}</p>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0" style={{ color: a.tagC, background: a.tagB }}>{a.tag}</span>
              </div>
            ))}
          </div>
          <button className="mt-4 flex items-center gap-2 text-sm font-bold" style={{ color: BRAND }}>Open the inbox to action these <ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  )
}
