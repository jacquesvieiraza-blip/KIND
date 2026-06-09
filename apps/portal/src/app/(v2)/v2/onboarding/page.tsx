'use client'

/** V2 — SETUP / ONBOARDING DASHBOARD (Casey-guided + per-rep #88). Preview, sample data. Gated /v2. */

import { Sparkles, Play, Crown, Send } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

const STEPS = [
  { n: '✓', title: 'Tell us about your business', why: 'Done — captured during your signup chat with Casey', state: 'done' as const },
  { n: '2', title: 'Confirm your Ideal Customer Profile (ICP)', why: "We pre-filled this from your website — check it's right so FIGSY targets the correct people.", cta: 'Review ICP', state: 'current' as const },
  { n: '3', title: 'Connect your sending email', why: 'So FIGSY sends outreach from your address, not ours.', cta: 'Connect email', state: 'todo' as const },
  { n: '4', title: 'Review your first leads', why: 'AI-sourced and scored 0–100. Approve who FIGSY should contact.', cta: 'View leads', state: 'todo' as const },
  { n: '5', title: 'Launch your first campaign', why: 'FIGSY writes in your voice, sends, and books meetings on your calendar.', cta: 'Create campaign', state: 'todo' as const },
  { n: '6', title: 'Invite your team (optional)', why: 'Add colleagues so everyone sees the pipeline.', cta: 'Invite teammate', state: 'todo' as const },
]

const AGENTS = [
  { img: '/agents/figsy.png', name: 'FIGSY', role: 'The Opener', c: '#7C3AED', d: 'AI SDR — finds and contacts your best-fit leads.' },
  { img: '/agents/milla.png', name: 'Milla', role: 'The Brain', c: '#0ea5e9', d: 'Insights — turns your pipeline data into decisions.' },
  { img: '/agents/vida.png', name: 'Vida', role: 'The Connector', c: '#10b981', d: 'Site + WhatsApp chatbot — engages inbound visitors.' },
  { img: '/agents/denise.png', name: 'Denise', role: 'The Closer', c: '#D97706', d: 'AI account exec — nurtures and closes the deal.' },
]

const PERREP = [
  ['1', 'Add a seat per rep', 'One company payment. Each seat = one autonomous FIGSY.', false],
  ['2', 'Each rep connects their own calendar', 'Google / Outlook / Zoho. Meetings book onto the rep\'s own calendar.', false],
  ['3', 'Allocate the budget', 'Set each seat\'s credits. Reps request more → you approve or deny.', false],
  ['✓', "Each rep's FIGSY goes live", 'You watch it all from the Company Command Centre.', true],
] as const

export default function Onboarding() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Setup / Onboarding · sample data
      </div>

      <div className="max-w-6xl mx-auto px-6 py-7 grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* MAIN */}
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to K.I.N.D, Northwind Labs 👋</h1>
            <p className="text-sm text-gray-500 mt-0.5">Let's get your AI Family working. ~10 minutes.</p>
          </div>

          {/* Casey */}
          <div className="flex gap-3.5 items-center rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,#fff4ee,#ffece2)', border: '1.5px solid #fbd9c9' }}>
            <div className="rounded-full overflow-hidden shrink-0 border-2 border-[#fbd9c9]" style={{ width: 52, height: 52 }}><img src="/agents/casey.png" alt="Casey" className="w-full h-full object-cover" /></div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[15px] text-gray-900">Casey</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-[#ea6a3a] bg-[#fff1ea] px-2 py-0.5 rounded-full">Your onboarding guide</span>
              </div>
              <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">Hi, I'm Casey — I'll walk you through every step below. Stuck? Just ask. Once you're set up, I hand you to your AI Family.</p>
            </div>
            <button className="text-white text-[13px] font-bold px-4 py-2.5 rounded-xl shrink-0" style={{ background: '#ea6a3a' }}>Ask Casey</button>
          </div>

          {/* Progress */}
          <div className={`${card} p-4`}>
            <div className="flex justify-between text-sm mb-2"><span className="font-semibold text-gray-700">2 of 6 steps complete</span><span className="font-bold" style={{ color: BRAND }}>33%</span></div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: '33%', background: BRAND }} /></div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {STEPS.map(s => (
              <div key={s.title} className={`${card} p-4 flex gap-3.5 ${s.state === 'current' ? 'ring-2' : ''} ${s.state === 'todo' ? 'opacity-70' : ''}`} style={s.state === 'current' ? { boxShadow: `0 0 0 2px ${BRAND}` } : undefined}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${s.state === 'done' ? 'bg-emerald-100 text-emerald-700' : 'text-white'}`} style={s.state !== 'done' ? { background: BRAND } : undefined}>{s.n}</span>
                <div className="flex-1">
                  {s.state === 'current' && <span className="inline-block text-[10px] font-bold text-white px-2 py-0.5 rounded-full mb-1" style={{ background: BRAND }}>Start here</span>}
                  <p className="font-bold text-gray-900">{s.title}</p>
                  <p className="text-[13px] text-gray-500 mt-0.5">{s.why}</p>
                  {s.cta && (
                    <div className="flex gap-2 mt-3">
                      <button className="text-sm font-bold text-white px-4 py-2 rounded-xl" style={{ background: BRAND }}>{s.cta}</button>
                      <button className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600"><Play className="w-3.5 h-3.5" /> Watch 60-sec demo</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Meet the team */}
          <div className="pt-2">
            <h2 className="text-lg font-bold text-gray-900">Meet your AI Family</h2>
            <p className="text-sm text-gray-500 mb-4">Four specialists working your pipeline around the clock.</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {AGENTS.map(a => (
                <div key={a.name} className={`${card} p-4`}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2" style={{ borderColor: a.c }}><img src={a.img} alt={a.name} className="w-full h-full object-cover" /></div>
                    <div><p className="font-bold text-gray-900 text-sm leading-tight">{a.name}</p><p className="text-[11px] font-semibold" style={{ color: a.c }}>{a.role}</p></div>
                  </div>
                  <p className="text-[12.5px] text-gray-500">{a.d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Per-rep (#88) */}
          <div className="pt-6 mt-2 border-t-2 border-dashed border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 flex-wrap">Running a sales team? Set up per-rep <span className="text-[11px] font-bold text-[#4f46e5] bg-[#eef2ff] px-2.5 py-1 rounded-full">EXPANSION · #88</span></h2>
            <p className="text-sm text-gray-500 mb-4">Give every rep their own FIGSY. The company owns the budget; each rep runs autonomously.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {PERREP.map(([n, t, d, done]) => (
                <div key={t as string} className={`${card} p-4 flex gap-3 items-start`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0 ${done ? 'bg-emerald-50 text-emerald-600' : 'bg-[#eef2ff] text-[#4f46e5]'}`}>{n as string}</div>
                  <div><p className="font-bold text-gray-900 text-sm">{t as string}</p><p className="text-[12.5px] text-gray-500 mt-0.5">{d as string}</p></div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3.5">Expansion model (#88) — augment every rep, never replace the team. Single-rep setup above stays the default for solo founders + small teams.</p>
          </div>
        </div>

        {/* SIDEBAR — Casey agent panel (canonical hero style) + compact team */}
        <div className="space-y-4">

          {/* Casey — same panel style as the live agent side panel */}
          <div className="rounded-2xl overflow-hidden shadow-lg border border-purple-100/40 bg-white">
            <div className="relative h-60 overflow-hidden bg-purple-50">
              <img src="/agents/casey.png" alt="Casey" className="w-full h-full object-cover object-top" />
            </div>
            <div className="bg-[#0F0929] px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-white font-bold text-base leading-tight">Casey</p>
                  <span className="text-[#7C3AED] text-xs font-semibold">The Guide</span>
                </div>
                <p className="text-[#9B8EC4] text-xs mt-0.5">Onboarding · I get you set up</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium text-emerald-400">Online</span>
              </div>
            </div>
            <div className="bg-white px-4 pt-3 pb-4">
              <div className="flex flex-col gap-1.5 mb-3">
                {['Confirm my ICP', 'Connect my email', "What's next?"].map(c => (
                  <button key={c} className="w-full text-left text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-full px-3 py-1.5 transition-colors">{c}</button>
                ))}
              </div>
              <div className="flex flex-col gap-2 mb-3 bg-[#FAFAFA] rounded-xl border border-purple-100/40 p-2">
                <div className="flex gap-1.5">
                  <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 mt-0.5 border border-purple-100"><img src="/agents/casey.png" alt="" className="w-full h-full object-cover object-top" /></div>
                  <div className="max-w-[85%] rounded-xl rounded-bl-sm px-2.5 py-1.5 text-xs leading-relaxed bg-white text-gray-800 border border-purple-100/60 shadow-sm">Hi! Confirm your ICP next and I'll line up your first leads. Stuck on anything? Just ask me here.</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input placeholder="Ask Casey…" className="flex-1 text-xs bg-gray-50 border border-purple-100/60 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
                <button className="w-8 h-8 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg flex items-center justify-center shrink-0"><Send className="w-3.5 h-3.5 text-white" /></button>
              </div>
            </div>
          </div>

          {/* Compact team */}
          <div className={`${card} p-5`}>
            <h3 className="font-bold text-gray-900">Your team</h3>
            <p className="text-xs text-gray-400 mb-4">Everyone here shares one pipeline.</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg,#7C3AED,#a855f7)' }}>JV</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900">Jacques Vieira</p><p className="text-[11px] text-gray-400 truncate">hello@get-kind.com</p></div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full flex items-center gap-1"><Crown className="w-3 h-3" />Owner</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)' }}>AS</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900">Amara Silva</p><p className="text-[11px] text-gray-400">Invited · Sales</p></div>
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Pending</span>
              </div>
            </div>
            <button className="mt-4 w-full text-sm font-bold py-2 rounded-xl border-2 border-dashed" style={{ color: BRAND, borderColor: '#c4b5fd' }}>+ Invite teammate</button>
          </div>
        </div>
      </div>
    </div>
  )
}
