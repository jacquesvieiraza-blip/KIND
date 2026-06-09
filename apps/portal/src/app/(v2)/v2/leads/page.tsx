'use client'

/** V2 — LEADS / PEOPLE polish (C1: ICP above People · C3: clean banner copy).
 *  Full-screen preview, sample data. Gated /v2. */

import { Sparkles, Users, ShieldCheck, TrendingUp, DollarSign, Target, Settings2, Play, CheckCircle } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

const STATS = [
  { label: 'Total people', value: '243', icon: Users, c: 'bg-[#F5F0FF] text-[#7C3AED]' },
  { label: 'Avg score', value: '78/100', icon: TrendingUp, c: 'bg-indigo-50 text-indigo-600' },
  { label: 'Consented', value: '60', icon: ShieldCheck, c: 'bg-green-50 text-green-600' },
  { label: 'Est. pipeline value', value: '$486,000', icon: DollarSign, c: 'bg-purple-50 text-purple-600' },
]

const LEADS = [
  { name: 'Amara Okafor', title: 'Head of Sales', co: 'Paystack', score: 95, status: 'Consented', sc: '#16a34a', sb: '#ecfdf5' },
  { name: 'Tunde Adeyemi', title: 'Growth Lead', co: 'Flutterwave', score: 90, status: 'Contacted', sc: '#6b7280', sb: '#f3f4f6' },
  { name: 'Zola Mbeki', title: 'VP Sales', co: 'Yoco', score: 88, status: 'Contacted', sc: '#6b7280', sb: '#f3f4f6' },
  { name: 'Ngozi Eze', title: 'Founder', co: 'OnePipe', score: 85, status: 'Consented', sc: '#16a34a', sb: '#ecfdf5' },
]

export default function LeadsPolish() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Leads / People polish (C1 + C3) · sample data
      </div>

      <div className="max-w-6xl mx-auto px-6 py-7 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900">People</h1>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-bold" style={{ background: BRAND }}><Play className="w-4 h-4" /> Run ICP</button>
            <a className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium"><Settings2 className="w-4 h-4" /> ICP Settings</a>
          </div>
        </div>

        {/* C1 — ACTIVE ICP, surfaced ABOVE People */}
        <div className="rounded-2xl border border-[#e0d4fb] p-5" style={{ background: 'linear-gradient(135deg,#faf7ff,#f3eeff)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: BRAND }}><Target className="w-5 h-5" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900">African fintech founders</p>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Active ICP</span>
                </div>
                {/* C3 — clean, plain-language banner copy */}
                <p className="text-[13px] text-gray-600 mt-1 max-w-xl">Heads of sales &amp; founders at fintech companies in Nigeria, South Africa &amp; Kenya, 11–200 staff. FIGSY finds, scores and verifies these people for you.</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {['Fintech', 'SaaS', 'Nigeria', 'South Africa', 'Kenya', '11–200'].map(t => (
                    <span key={t} className="text-[11px] font-semibold text-[#7C3AED] bg-white border border-[#e0d4fb] px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-[#7C3AED] bg-white border border-[#e0d4fb] px-3 py-1.5 rounded-lg">1,083 matches found</span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className={`${card} p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.c}`}><s.icon className="w-5 h-5" /></div>
              <div><p className="text-lg font-bold text-gray-900">{s.value}</p><p className="text-[11px] text-gray-400">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* People list */}
        <div className={`${card} overflow-hidden`}>
          <div className="grid grid-cols-[1.6fr_1fr_0.6fr_0.8fr] gap-2 px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100">
            <span>Person</span><span>Company</span><span>Score</span><span>Status</span>
          </div>
          {LEADS.map(l => (
            <div key={l.name} className="grid grid-cols-[1.6fr_1fr_0.6fr_0.8fr] gap-2 px-5 py-3.5 items-center border-b border-gray-50 last:border-0">
              <div><p className="text-sm font-semibold text-gray-900">{l.name}</p><p className="text-xs text-gray-400">{l.title}</p></div>
              <span className="text-sm text-gray-700">{l.co}</span>
              <span className="text-sm font-bold" style={{ color: BRAND }}>{l.score}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full self-start" style={{ color: l.sc, background: l.sb }}>
                {l.status === 'Consented' && <CheckCircle className="w-3 h-3" />}{l.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
