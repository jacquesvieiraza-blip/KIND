'use client'

/**
 * PARTNER PORTAL v2 — FULL VISUAL PREVIEW  (item 200 + 213–226)
 * ----------------------------------------------------------------------------
 * A standalone, public, no-login preview of the COMPLETE partner portal so the
 * founder can walk every section before we wire real data.
 *
 * EVERYTHING IS LABELLED DEMO DATA — not a live partner's numbers.
 * Sections map to the tracked items:
 *   Overview  → 221 split · 222 hero · 223 book · 213 forecaster · 224 payouts
 *   Pipeline  → deal registration (built) + 219 CRM-lite/notifications
 *   Sell&Grow → referral + sandbox (built) · 226 playbooks/deck/quote ·
 *               214 source-through-product · 217 white-label/teams · 218 academy
 *   Documents → 225 docs vault (agreement · NDA · referral/payout · DPA · comp · calc)
 *   Assistant → 216 AI partner agent ("Milla-for-partners")
 * Real-data wiring = 220 (commission `type` + per-client MRR + USD). Rates: comp-engine.ts.
 */

import { useState, type ReactNode } from 'react'
import {
  Handshake, TrendingUp, Sparkles, Users, AlertTriangle, Wallet, ArrowUpRight,
  Calendar, BadgeCheck, LineChart, Briefcase, Copy, FileText, FileCheck, Bot,
  Send, Rocket, Target, Megaphone, GraduationCap, Award, Bell, Plus, Clock,
  ShieldCheck, Download, Play, Layers, ChevronRight, Wand2,
} from 'lucide-react'

const USD  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const USD2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const ACQUISITION_RATE = 0.20 // one-time, first-month MRR (comp-engine PARTNER_ACQUISITION)
const RETENTION_RATE   = 0.05 // recurring, active book    (comp-engine PARTNER_RETENTION)

type Status = 'active' | 'at-risk' | 'churned'
interface BookClient { name: string; mrr: number; status: Status; joined: string; health: number }

const BOOK: BookClient[] = [
  { name: 'Brightwater Plumbing',    mrr: 267, status: 'active',  joined: 'Jan 2026', health: 92 },
  { name: 'Apex Electrical',         mrr: 237, status: 'active',  joined: 'Feb 2026', health: 88 },
  { name: 'Coastal HVAC',            mrr: 267, status: 'active',  joined: 'Feb 2026', health: 95 },
  { name: 'Summit Locksmiths',       mrr: 207, status: 'active',  joined: 'Mar 2026', health: 81 },
  { name: 'Lens & Light Studio',     mrr: 237, status: 'active',  joined: 'Mar 2026', health: 90 },
  { name: 'Northgate Property Mgmt', mrr: 417, status: 'active',  joined: 'Apr 2026', health: 86 },
  { name: 'Riverside Roofing',       mrr: 177, status: 'at-risk', joined: 'Apr 2026', health: 41 },
  { name: 'Metro Movers',            mrr: 237, status: 'churned', joined: 'Jan 2026', health: 0 },
]
const STATUS_STYLES: Record<Status, string> = {
  active: 'bg-emerald-50 text-emerald-700', 'at-risk': 'bg-amber-50 text-amber-700', churned: 'bg-gray-100 text-gray-500',
}

interface Deal { company: string; contact: string; value: number; stage: 'registered' | 'demo' | 'trial' | 'won'; daysLeft: number }
const DEALS: Deal[] = [
  { company: 'Harbour Freight Co',   contact: 'Tunde Bello',  value: 267, stage: 'trial',      daysLeft: 41 },
  { company: 'Greenfield Dental',    contact: 'Amara Okoro',  value: 237, stage: 'demo',       daysLeft: 53 },
  { company: 'Pinnacle Accounting',  contact: 'Sipho Dlamini',value: 417, stage: 'registered', daysLeft: 58 },
]
const STAGE_STYLES: Record<Deal['stage'], string> = {
  registered: 'bg-purple-50 text-[#7C3AED]', demo: 'bg-blue-50 text-blue-600', trial: 'bg-amber-50 text-amber-700', won: 'bg-emerald-50 text-emerald-700',
}

const DOCS = [
  { name: 'Partner Agreement',          sub: 'commission · white-label · territory', status: 'Signed' },
  { name: 'Mutual NDA',                 sub: 'confidentiality',                       status: 'Signed' },
  { name: 'Referral & Payout Terms',    sub: 'how + when you get paid',               status: 'Signed' },
  { name: 'Data-Processing Addendum',   sub: 'POPIA / UK-GDPR',                        status: 'Signed' },
  { name: 'Partner Comp Plan',          sub: '20% acquisition + 5% retention',        status: 'View' },
  { name: 'Live Commission Calculator', sub: 'model your 5-yr book',                  status: 'Open' },
]

const NOTIFS = [
  { icon: <ArrowUpRight className="w-4 h-4 text-emerald-500" />, text: 'Northgate Property Mgmt upgraded → +$83 expansion bonus', when: '2h ago' },
  { icon: <Users className="w-4 h-4 text-[#7C3AED]" />,          text: 'New signup from your link: Harbour Freight Co', when: '1d ago' },
  { icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, text: 'Riverside Roofing went quiet — 14 days no login', when: '2d ago' },
]

const TRADES = ['⚡ Electrician', '🚰 Plumber', '📸 Photographer', '❄️ HVAC', '🔐 Locksmith']
const TABS = ['Overview', 'Pipeline', 'Sell & Grow', 'Documents', 'Assistant'] as const
type Tab = typeof TABS[number]

export default function PartnerPortalV2FullPreview() {
  const [tab, setTab] = useState<Tab>('Overview')

  const paying           = BOOK.filter(c => c.status !== 'churned')
  const activeBookMrr    = paying.reduce((s, c) => s + c.mrr, 0)
  const recurringMonthly = activeBookMrr * RETENTION_RATE
  const lifetimeAcq      = BOOK.reduce((s, c) => s + c.mrr, 0) * ACQUISITION_RATE
  const thisMonthAcq     = 417 * ACQUISITION_RATE
  const avgMrr           = activeBookMrr / paying.length
  const project = (m: number) => { let mrr = activeBookMrr; for (let i = 0; i < m; i++) mrr = mrr * 0.96 + 2 * avgMrr; return mrr * RETENTION_RATE }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF8FF] to-white">
      <div className="bg-amber-100 border-b border-amber-200 text-amber-900 text-center text-xs font-semibold py-2 px-4">
        🎨 PARTNER PORTAL v2 — FULL PREVIEW with <span className="underline">sample data</span>. Not real numbers. Real-data wiring = item 220.
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#7C3AED] flex items-center justify-center"><Handshake className="w-6 h-6 text-white" /></div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#1E1152]">Partner Dashboard</h1>
            <p className="text-sm text-[#7C3AED]/70 flex items-center gap-1">Demmy Agency · <BadgeCheck className="w-3.5 h-3.5" /> Certified Agency partner</p>
          </div>
          <button className="inline-flex items-center gap-2 text-sm font-medium bg-white border border-purple-100 rounded-xl px-3 py-2 text-[#7C3AED] shadow-sm">
            <Copy className="w-4 h-4" /> get-kind.com?ref=DEMMY8K
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-purple-100 p-1 shadow-sm overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${tab === t ? 'bg-[#7C3AED] text-white' : 'text-[#7C3AED]/70 hover:bg-purple-50'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {tab === 'Overview' && (
          <div className="space-y-5">
            <div className="rounded-3xl bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] text-white p-7 shadow-lg">
              <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-1"><TrendingUp className="w-4 h-4" /> Your monthly recurring income</div>
              <div className="flex items-end gap-3">
                <p className="text-5xl font-extrabold tracking-tight">{USD2.format(recurringMonthly)}<span className="text-2xl font-bold text-white/70">/mo</span></p>
                <span className="inline-flex items-center gap-1 text-emerald-300 text-sm font-semibold mb-2"><ArrowUpRight className="w-4 h-4" /> grows every month they stay</span>
              </div>
              <p className="text-white/70 text-sm mt-2"><span className="font-semibold text-white">5%</span> of your active book ({USD.format(activeBookMrr)}/mo across {paying.length} live clients). Keep clients alive → this compounds.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card border="purple"><Head icon={<Sparkles className="w-4 h-4 text-[#7C3AED]" />} label="Acquisition · 20% one-time" />
                <Split aLabel="This month" a={USD.format(thisMonthAcq)} bLabel="Lifetime" b={USD.format(lifetimeAcq)} />
                <p className="text-xs text-gray-500 mt-3">20% of each new client&apos;s first-month bill, paid once when they sign.</p></Card>
              <Card border="emerald"><Head icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} label="Retention · 5% recurring" green />
                <Split aLabel="This month" a={USD2.format(recurringMonthly)} aGreen bLabel="Active book" b={`${USD.format(activeBookMrr)}/mo`} />
                <p className="text-xs text-gray-500 mt-3">5% of your living book, every month each client stays. Earned when we collect — no clawback.</p></Card>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat icon={<Users className="w-4 h-4 text-[#7C3AED]" />} label="Active clients" value={String(BOOK.filter(c => c.status === 'active').length)} />
              <Stat icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} label="At risk" value="1" sub="save → protect your 5%" />
              <Stat icon={<Wallet className="w-4 h-4 text-emerald-500" />} label="Lifetime earned" value={USD.format(lifetimeAcq + recurringMonthly * 6)} />
              <Stat icon={<Calendar className="w-4 h-4 text-[#7C3AED]" />} label="Next payout · 1 Jul" value={USD2.format(recurringMonthly + thisMonthAcq)} sub="earned-when-collected" />
            </div>

            {/* The book */}
            <Card><Head icon={<Briefcase className="w-4 h-4 text-[#7C3AED]" />} label={`Your book — ${paying.length} live clients, the asset you're building`} />
              <div className="divide-y divide-purple-50 -mx-1">
                {BOOK.map(c => (
                  <div key={c.name} className="px-1 py-2.5 flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0"><p className="font-medium text-[#1E1152] truncate">{c.name}</p><p className="text-xs text-gray-400">joined {c.joined}</p></div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                    <div className="w-20 text-right"><p className="text-[#1E1152] font-medium">{USD.format(c.mrr)}</p><p className="text-xs text-gray-400">their plan</p></div>
                    <div className="w-24 text-right"><p className={`font-semibold ${c.status === 'churned' ? 'text-gray-300' : 'text-emerald-600'}`}>{c.status === 'churned' ? '—' : `${USD2.format(c.mrr * RETENTION_RATE)}/mo`}</p><p className="text-xs text-gray-400">earns you</p></div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Forecaster + payouts */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card tint><Head icon={<LineChart className="w-4 h-4 text-[#7C3AED]" />} label="Where your recurring is headed" right="213 · forecaster" />
                <div className="grid grid-cols-3 gap-2 text-center mt-1">
                  {[6, 12, 24].map(m => (<div key={m} className="bg-white rounded-xl border border-purple-50 p-2"><p className="text-xs text-gray-400">{m} mo</p><p className="text-lg font-bold text-emerald-600">{USD2.format(project(m))}</p></div>))}
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">at ~2 new clients/mo, 4% churn — the snowball 5%-on-a-living-book creates.</p></Card>
              <Card><Head icon={<FileCheck className="w-4 h-4 text-[#7C3AED]" />} label="Payout statements" right="224" />
                <div className="space-y-2 mt-1 text-sm">
                  {[['June 2026', 'Pending', `${USD2.format(recurringMonthly + thisMonthAcq)}`], ['May 2026', 'Paid', '$166.20'], ['Apr 2026', 'Paid', '$149.85']].map(([m, s, v]) => (
                    <div key={m} className="flex items-center justify-between"><span className="text-[#1E1152]">{m}</span><span className={`text-xs px-2 py-0.5 rounded-full ${s === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{s}</span><span className="font-semibold text-[#1E1152] w-20 text-right">{v}</span></div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">Founder approves every payout — no surprises, no clawback.</p></Card>
            </div>
          </div>
        )}

        {/* ── PIPELINE ──────────────────────────────────────────────────── */}
        {tab === 'Pipeline' && (
          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Card><Head icon={<Plus className="w-4 h-4 text-[#7C3AED]" />} label="Register a deal" right="60-day protection" />
                <div className="space-y-2 mt-1">
                  {['Company name', 'Contact name', 'Contact email', 'Industry', 'Country', 'Estimated monthly value'].map(f => (
                    <div key={f} className="bg-[#FAF8FF] border border-purple-50 rounded-lg px-3 py-2 text-sm text-gray-400">{f}</div>
                  ))}
                  <button className="w-full bg-[#7C3AED] text-white rounded-lg py-2 text-sm font-semibold inline-flex items-center justify-center gap-2"><ShieldCheck className="w-4 h-4" /> Register &amp; protect for 60 days</button>
                </div></Card>
              <Card><Head icon={<Bell className="w-4 h-4 text-[#7C3AED]" />} label="Notifications" right="219" />
                <div className="space-y-3 mt-1">
                  {NOTIFS.map(n => (<div key={n.text} className="flex items-start gap-2 text-sm"><div className="mt-0.5">{n.icon}</div><div className="flex-1"><p className="text-[#1E1152]">{n.text}</p><p className="text-xs text-gray-400">{n.when}</p></div></div>))}
                </div></Card>
            </div>
            <Card><Head icon={<Layers className="w-4 h-4 text-[#7C3AED]" />} label="Your pipeline" right="CRM-lite · 219" />
              <div className="divide-y divide-purple-50 -mx-1">
                {DEALS.map(d => (
                  <div key={d.company} className="px-1 py-2.5 flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0"><p className="font-medium text-[#1E1152] truncate">{d.company}</p><p className="text-xs text-gray-400">{d.contact}</p></div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STAGE_STYLES[d.stage]}`}>{d.stage}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600"><Clock className="w-3 h-3" />{d.daysLeft}d protected</span>
                    <div className="w-20 text-right"><p className="text-[#1E1152] font-medium">{USD.format(d.value)}/mo</p></div>
                  </div>
                ))}
              </div></Card>
          </div>
        )}

        {/* ── SELL & GROW ───────────────────────────────────────────────── */}
        {tab === 'Sell & Grow' && (
          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Tool icon={<Megaphone className="w-5 h-5 text-[#7C3AED]" />} title="Your referral link" body="get-kind.com?ref=DEMMY8K — every signup auto-attributed to you." cta="Copy link" />
              <Tool icon={<Play className="w-5 h-5 text-[#7C3AED]" />} title="Demo sandbox" body="A live, auto-provisioned K.I.N.D environment to show prospects." cta="Launch demo" />
              <Tool icon={<Wand2 className="w-5 h-5 text-[#7C3AED]" />} title="Source-through-product" sub="214" body="Point FIGSY at your market → it finds + emails prospects to sell K.I.N.D. Your pipeline, on autopilot." cta="Find me prospects" />
              <Tool icon={<Target className="w-5 h-5 text-[#7C3AED]" />} title="Quote / bundle builder" sub="226" body="Pick a bundle (Lean / Recommended / Aggressive) → shareable quote in one click." cta="Build a quote" />
            </div>
            <Card><Head icon={<FileText className="w-4 h-4 text-[#7C3AED]" />} label="Trade playbooks + deck" right="226 · sell the outcome" />
              <div className="flex flex-wrap gap-2 mt-1">
                {TRADES.map(t => (<span key={t} className="bg-[#FAF8FF] border border-purple-50 rounded-lg px-3 py-1.5 text-sm text-[#1E1152]">{t}</span>))}
                <span className="bg-white border border-purple-100 rounded-lg px-3 py-1.5 text-sm text-[#7C3AED] inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Pitch deck</span>
              </div></Card>
            <div className="grid md:grid-cols-2 gap-4">
              <Tool icon={<GraduationCap className="w-5 h-5 text-[#7C3AED]" />} title="Partner Academy" sub="218" body="Short course → Certified Partner badge → tier perks. You're 1 module from Gold." cta="Resume course" />
              <Tool icon={<Award className="w-5 h-5 text-[#7C3AED]" />} title="White-label & team" sub="217" body="Your brand, custom domain, add team members / sub-accounts, optional territory." cta="Request white-label" />
            </div>
          </div>
        )}

        {/* ── DOCUMENTS ─────────────────────────────────────────────────── */}
        {tab === 'Documents' && (
          <Card><Head icon={<FileText className="w-4 h-4 text-[#7C3AED]" />} label="Your documents" right="225 · per-seller vault" />
            <div className="divide-y divide-purple-50 -mx-1">
              {DOCS.map(d => (
                <div key={d.name} className="px-1 py-3 flex items-center gap-3 text-sm">
                  <FileText className="w-4 h-4 text-[#7C3AED]/60" />
                  <div className="flex-1 min-w-0"><p className="font-medium text-[#1E1152]">{d.name}</p><p className="text-xs text-gray-400">{d.sub}</p></div>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${d.status === 'Signed' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-[#7C3AED]'}`}>{d.status}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">Everything you signed + your comp plan + the live calculator, in one place.</p>
          </Card>
        )}

        {/* ── ASSISTANT (216) ───────────────────────────────────────────── */}
        {tab === 'Assistant' && (
          <Card>
            <Head icon={<Bot className="w-4 h-4 text-[#7C3AED]" />} label="Your partner assistant" right="216 · ask anything" />
            <div className="space-y-3 mt-2">
              <div className="flex gap-2 flex-wrap">
                {['Which of my clients is at risk?', 'Draft an upsell to Northgate', 'Find me 20 plumber prospects'].map(q => (
                  <span key={q} className="bg-[#FAF8FF] border border-purple-100 rounded-full px-3 py-1.5 text-xs text-[#7C3AED] font-medium">{q}</span>
                ))}
              </div>
              <div className="bg-[#FAF8FF] rounded-2xl p-4 space-y-3 text-sm">
                <p className="text-right"><span className="inline-block bg-[#7C3AED] text-white rounded-2xl rounded-br-sm px-3 py-2">Which of my clients is at risk?</span></p>
                <p><span className="inline-block bg-white border border-purple-100 rounded-2xl rounded-bl-sm px-3 py-2 text-[#1E1152]">
                  <strong>Riverside Roofing</strong> — health 41%, no login in 14 days, replies dropping. Their renewal is your 5%. Want me to draft a re-engagement note from you?
                </span></p>
              </div>
              <div className="flex items-center gap-2 bg-white border border-purple-100 rounded-xl px-3 py-2">
                <input disabled placeholder="Ask your assistant…" className="flex-1 text-sm bg-transparent outline-none text-gray-400" />
                <Send className="w-4 h-4 text-[#7C3AED]" />
              </div>
            </div>
          </Card>
        )}

        <p className="text-center text-xs text-gray-400 pt-2 pb-8">
          Demo data — a real partner sees their own numbers. <Rocket className="inline w-3 h-3" /> 20% acquisition + 5% retention · earned-when-collected · no clawback.
        </p>
      </div>
    </div>
  )
}

function Card({ children, tint, border }: { children: ReactNode; tint?: boolean; border?: 'purple' | 'emerald' }) {
  const b = border === 'emerald' ? 'border-emerald-100' : 'border-purple-100'
  return <div className={`${tint ? 'bg-[#FAF8FF]' : 'bg-white'} rounded-2xl border ${b} shadow-sm p-5`}>{children}</div>
}
function Head({ icon, label, right, green }: { icon: ReactNode; label: string; right?: string; green?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <span className={`text-xs font-semibold uppercase tracking-wider ${green ? 'text-emerald-600/70' : 'text-[#7C3AED]/60'}`}>{label}</span>
      {right && <span className="ml-auto text-xs text-[#7C3AED]/40">{right}</span>}
    </div>
  )
}
function Split({ aLabel, a, aGreen, bLabel, b }: { aLabel: string; a: string; aGreen?: boolean; bLabel: string; b: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <div><p className="text-xs text-gray-400">{aLabel}</p><p className={`text-2xl font-bold ${aGreen ? 'text-emerald-600' : 'text-[#1E1152]'}`}>{a}</p></div>
      <div className="text-right"><p className="text-xs text-gray-400">{bLabel}</p><p className="text-2xl font-bold text-[#1E1152]">{b}</p></div>
    </div>
  )
}
function Stat({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">{label}</span></div>
      <p className="text-2xl font-bold text-[#1E1152]">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
function Tool({ icon, title, sub, body, cta }: { icon: ReactNode; title: string; sub?: string; body: string; cta: string }) {
  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-2">{icon}<h3 className="font-semibold text-[#1E1152]">{title}</h3>{sub && <span className="ml-auto text-xs text-[#7C3AED]/40">{sub}</span>}</div>
      <p className="text-sm text-gray-500 flex-1">{body}</p>
      <button className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#7C3AED] self-start"><ChevronRight className="w-4 h-4" />{cta}</button>
    </div>
  )
}
