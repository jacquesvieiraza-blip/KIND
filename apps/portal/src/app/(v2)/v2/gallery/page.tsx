'use client'

/**
 * V2 GALLERY — every V2 screen in one place, clickable, for review + refinement.
 * Gated preview (sample data). The 4 interactive per-rep screens live at /v2/company;
 * this gallery renders the full design set (§1–16) so the founder can click through
 * each item and tell me what to keep / change / refine.
 * Source of truth for the visuals: docs/portal-v2-preview.html
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  Building2, Users, Coins, TrendingUp, Sparkles, ArrowRight, CheckCircle2, Circle,
  Clock, Mail, MessageSquare, Phone, Linkedin, Plug, Inbox as InboxIcon, GraduationCap,
  Bot, LayoutGrid, Activity, UserPlus, Settings2, ChevronRight,
} from 'lucide-react'

const BRAND = '#7C3AED'

const SECTIONS = [
  { id: 's1',  n: 1,  name: 'Agent Card Grid' },
  { id: 's2',  n: 2,  name: 'Agent Thinking State' },
  { id: 's3',  n: 3,  name: 'Conversational Setup' },
  { id: 's4',  n: 4,  name: 'Config Panel' },
  { id: 's5',  n: 5,  name: 'Agent Marketplace' },
  { id: 's6',  n: 6,  name: 'Slim Sidebar + Header' },
  { id: 's7',  n: 7,  name: 'Invite Teammate' },
  { id: 's8',  n: 8,  name: 'AI Notetaker' },
  { id: 's9',  n: 9,  name: 'Company OS (live)' },
  { id: 's12', n: 12, name: 'Sequence Builder' },
  { id: 's13', n: 13, name: 'Integrations Hub' },
  { id: 's14', n: 14, name: 'Smart Inbox' },
  { id: 's16', n: 16, name: 'Train FIGSY' },
]

function Sec({ id, n, label, title, children }: { id: string; n: number; label: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4">
      <div className="flex items-center gap-3 mb-1">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: BRAND }}>{n}</span>
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#9B8EC4' }}>{label}</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-4 ml-10">{title}</h2>
      <div className="ml-10">{children}</div>
    </section>
  )
}

const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

const AGENTS = [
  { name: 'FIGSY', role: 'AI SDR', img: '/agents/figsy.png', g: 'from-[#7C3AED] to-[#6025c0]', live: true,  metrics: [['Sent', '2,840'], ['Replied', '348'], ['Hot', '141']] },
  { name: 'Denise', role: 'The Closer', img: '/agents/denise.png', g: 'from-[#D97706] to-[#b45309]', live: false, metrics: [['Booked', '62'], ['Closed', '11'], ['Calls', '38']] },
  { name: 'Milla', role: 'Assistant', img: '/agents/milla.png', g: 'from-[#0ea5e9] to-[#0284c7]', live: false, metrics: [] },
  { name: 'Vida', role: 'Chatbot', img: '/agents/vida.png', g: 'from-[#10b981] to-[#059669]', live: false, metrics: [] },
]

export default function V2Gallery() {
  const [tone, setTone] = useState('Warm')
  const [tab, setTab] = useState('Persona')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 GALLERY · all screens · sample data — click any item, then tell me what to keep / change / refine
      </div>

      <div className="max-w-6xl mx-auto px-6 py-7 flex gap-7">
        {/* Sticky section index */}
        <nav className="hidden lg:block w-44 shrink-0">
          <div className="sticky top-6 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 mb-1.5">Sections</p>
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] text-gray-500 hover:text-gray-900 hover:bg-white transition-colors">
                <span className="text-[10px] font-bold w-4 text-gray-300">{s.n}</span>{s.name}
              </a>
            ))}
            <Link href="/v2/company" className="mt-2 flex items-center gap-1.5 px-2 py-2 rounded-lg text-[13px] font-semibold text-white" style={{ background: BRAND }}>
              Open live Command Centre <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </nav>

        <div className="flex-1 min-w-0 space-y-12">

          {/* 1 — Agent Card Grid */}
          <Sec id="s1" n={1} label="Dashboard home" title="Agent Card Grid">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {AGENTS.map(a => (
                <div key={a.name} className={`${card} overflow-hidden flex flex-col`}>
                  <div className={`bg-gradient-to-br ${a.g} px-4 py-4`}>
                    <div className="w-10 h-10 rounded-xl overflow-hidden mb-2 bg-white/20 ring-2 ring-white/30"><img src={a.img} alt={a.name} className="w-full h-full object-cover" /></div>
                    <p className="text-white font-bold">{a.name}</p>
                    <p className="text-white/60 text-xs">{a.role}</p>
                  </div>
                  <div className="px-4 py-3 flex-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${a.live ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${a.live ? 'bg-emerald-500' : 'bg-gray-300'}`} />{a.live ? 'Active' : 'Coming soon'}
                    </span>
                    {a.metrics.length > 0 && (
                      <div className="grid grid-cols-3 gap-1 mt-3 pt-3 border-t border-gray-100 text-center">
                        {a.metrics.map(([l, v]) => (<div key={l}><p className="text-sm font-bold text-gray-900">{v}</p><p className="text-[10px] text-gray-400">{l}</p></div>))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Sec>

          {/* 2 — Thinking state */}
          <Sec id="s2" n={2} label="Transparency" title="Agent Thinking State">
            <div className={`${card} max-w-lg p-5`}>
              <div className="flex items-center gap-2 mb-4"><Bot className="w-5 h-5" style={{ color: BRAND }} /><span className="font-semibold text-gray-900">FIGSY is working…</span></div>
              {[['Sourced 200 leads from Apollo', 'done'], ['Scoring against your ICP', 'done'], ['Writing 17 personalised emails', 'active'], ['Scheduling the send', 'pending']].map(([t, st]) => (
                <div key={t} className="flex items-center gap-3 py-2">
                  {st === 'done' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : st === 'active' ? <Clock className="w-4 h-4 animate-pulse" style={{ color: BRAND }} /> : <Circle className="w-4 h-4 text-gray-300" />}
                  <span className={`text-sm ${st === 'pending' ? 'text-gray-400' : 'text-gray-700'}`}>{t}</span>
                </div>
              ))}
              <div className="h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden"><div className="h-full rounded-full" style={{ width: '60%', background: BRAND }} /></div>
            </div>
          </Sec>

          {/* 3 — Conversational setup */}
          <Sec id="s3" n={3} label="Onboarding · Casey" title="Conversational Agent Setup">
            <div className={`${card} max-w-lg overflow-hidden`}>
              <div className="px-4 py-3 text-white flex items-center gap-2" style={{ background: BRAND }}><span className="text-lg">🧭</span><div><p className="text-sm font-bold">Casey</p><p className="text-[11px] text-white/70">Onboarding agent</p></div></div>
              <div className="p-4 space-y-3">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-800 max-w-[80%]">Hey! Who do you sell to? Tell me your ideal customer.</div>
                <div className="text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm max-w-[80%] ml-auto" style={{ background: BRAND }}>Heads of sales at African fintechs, 10–200 staff.</div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-800 max-w-[80%]">Got it. Which countries first?</div>
                <div className="flex gap-2 flex-wrap">{['Nigeria', 'South Africa', 'Kenya', 'Egypt'].map(c => (<span key={c} className="text-xs font-semibold px-3 py-1.5 rounded-full border" style={{ color: BRAND, borderColor: '#c4b5fd' }}>{c}</span>))}</div>
              </div>
            </div>
          </Sec>

          {/* 4 — Config panel */}
          <Sec id="s4" n={4} label="Agent settings" title="Structured Config Panel">
            <div className={`${card} max-w-2xl grid grid-cols-[160px_1fr] overflow-hidden`}>
              <div className="bg-[#faf9ff] border-r border-gray-100 py-3">
                {['Role', 'ICP', 'Tone', 'Schedule', 'Knowledge'].map((t, i) => (<div key={t} className={`px-4 py-2 text-sm ${i === 2 ? 'font-bold text-[#7C3AED] bg-[#f3f0ff] border-r-2 border-[#7C3AED]' : 'text-gray-500'}`}>{t}</div>))}
              </div>
              <div className="p-5">
                <p className="font-bold text-gray-900 mb-3">Tone</p>
                <div className="flex gap-2 flex-wrap mb-4">{['Warm', 'Direct', 'Playful', 'Formal'].map(t => (<button key={t} onClick={() => setTone(t)} className="text-xs font-semibold px-3 py-1.5 rounded-full border" style={tone === t ? { background: BRAND, color: '#fff', borderColor: BRAND } : { color: BRAND, borderColor: '#e0d4fb' }}>{t}</button>))}</div>
                <div className="bg-[#faf9ff] border border-gray-100 rounded-xl p-3 text-sm text-gray-600">Preview: a <b>{tone.toLowerCase()}</b>, human first line that references something specific about the prospect.</div>
              </div>
            </div>
          </Sec>

          {/* 5 — Marketplace */}
          <Sec id="s5" n={5} label="Cross-sell" title="Agent Marketplace — Meet your AI Family">
            <div className="rounded-2xl p-6 text-white mb-4 max-w-3xl" style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}>
              <h3 className="text-xl font-bold mb-1">Your AI Family</h3>
              <p className="text-sm text-white/80">Each agent owns a stage. Add the ones you need — one company bill.</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl">
              {[['FIGSY', 'Finds & books', '/agents/figsy.png'], ['Denise', 'Closes', '/agents/denise.png'], ['Lena', 'Retains', '/agents/lena.png'], ['Tony', 'Operations', '/agents/tony.png']].map(([n, r, img]) => (
                <div key={n} className={`${card} p-4 text-center`}><div className="w-12 h-12 mx-auto rounded-full overflow-hidden mb-2 ring-2 ring-gray-100"><img src={img} alt={n} className="w-full h-full object-cover" /></div><p className="font-bold text-gray-900">{n}</p><p className="text-xs text-gray-400 mb-3">{r}</p><button className="text-xs font-semibold w-full py-1.5 rounded-lg text-white" style={{ background: BRAND }}>Add</button></div>
              ))}
            </div>
          </Sec>

          {/* 6 — Slim sidebar + header */}
          <Sec id="s6" n={6} label="Layout" title="Slim Sidebar + Top-Right Header">
            <div className={`${card} overflow-hidden max-w-3xl flex h-56`}>
              <div className="w-14 bg-[#0F0929] flex flex-col items-center py-3 gap-3">
                {[LayoutGrid, Users, InboxIcon, TrendingUp, Settings2].map((I, i) => (<div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-white/15' : ''}`}><I className="w-4 h-4 text-purple-200/60" /></div>))}
              </div>
              <div className="flex-1">
                <div className="h-11 border-b border-gray-100 flex items-center justify-end px-4 gap-2"><span className="text-xs text-gray-400">999,839 credits</span><div className="w-7 h-7 rounded-full bg-gray-200" /></div>
                <div className="p-4 text-sm text-gray-400">Nav lives in the slim rail · account/billing/profile move to the top-right.</div>
              </div>
            </div>
          </Sec>

          {/* 7 — Invite teammate */}
          <Sec id="s7" n={7} label="Growth loop" title="Invite Teammate">
            <div className={`${card} max-w-md p-5`}>
              <div className="flex items-center gap-2 mb-3"><UserPlus className="w-5 h-5" style={{ color: BRAND }} /><span className="font-bold text-gray-900">Invite your team</span></div>
              <p className="text-sm text-gray-500 mb-4">Each rep gets their own FIGSY. One company bill.</p>
              <div className="flex gap-2 mb-3"><input placeholder="teammate@company.com" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" /><select className="border border-gray-200 rounded-lg px-2 text-sm text-gray-600"><option>Rep</option><option>Admin</option></select></div>
              <button className="w-full py-2 rounded-lg text-white text-sm font-semibold" style={{ background: BRAND }}>Send invite</button>
            </div>
          </Sec>

          {/* 8 — AI Notetaker */}
          <Sec id="s8" n={8} label="Milla" title="AI Notetaker → Action Items">
            <div className={`${card} max-w-lg p-5`}>
              <p className="font-bold text-gray-900 mb-1">Last night, your team:</p>
              <p className="text-xs text-gray-400 mb-3">Milla read every lead, reply & campaign</p>
              <ul className="space-y-2 text-sm text-gray-700 mb-4">
                <li>• 348 prospects contacted · 41 replied · 12 positive</li>
                <li>• Amara's FIGSY booked 3 meetings</li>
                <li>• Zola's reply rate dropped to 8% — needs attention</li>
              </ul>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Do these 3 things</p>
              {['Follow up the 12 positive replies (within 24h = 4× close)', 'Review Zola\'s sequence copy', 'Approve Tunde\'s +1,500 credit request'].map(a => (
                <div key={a} className="flex items-start gap-2 py-1.5 text-sm"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: BRAND }} /><span className="text-gray-700">{a}</span></div>
              ))}
            </div>
          </Sec>

          {/* 9 — Live company OS pointer */}
          <Sec id="s9" n={9} label="Per-rep · #88 · LIVE" title="Company OS — Command Centre · Seats · Usage · Performance">
            <div className={`${card} p-6 max-w-2xl`}>
              <p className="text-gray-600 mb-4">These 4 are already <b>interactive</b> with tabs, leaderboard, funnel and approve/deny — not a static mockup.</p>
              <Link href="/v2/company" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: BRAND }}>
                Open the live Command Centre <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Sec>

          {/* 12 — Sequence builder */}
          <Sec id="s12" n={12} label="Campaign · #89" title="Sequence Builder — templates → a visual tree">
            <div className="grid lg:grid-cols-[1fr_180px] gap-4 max-w-3xl">
              <div className={`${card} p-4 space-y-2`}>
                {[[Mail, '📧 Email', 'Personalised opening'], [Linkedin, '🔗 LinkedIn connect', 'Connection request']].map(([_, t, s], i) => (
                  <div key={i} className="flex items-center gap-3 bg-[#faf9ff] border border-gray-100 rounded-xl px-3 py-2.5"><span className="text-[11px] font-bold w-6 h-6 rounded-full text-white flex items-center justify-center" style={{ background: BRAND }}>{i + 1}</span><div className="flex-1"><p className="text-sm font-semibold text-gray-800">{t as string}</p><p className="text-xs text-gray-400">{s as string}</p></div></div>
                ))}
                <div className="flex gap-2">
                  <div className="flex-1 text-center"><div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-full py-0.5 mb-1">✓ CONNECTED</div><div className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-700">🔗 LinkedIn message</div></div>
                  <div className="flex-1 text-center"><div className="text-[10px] font-bold text-orange-700 bg-orange-50 rounded-full py-0.5 mb-1">✗ NOT</div><div className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-700">📧 Follow-up email</div></div>
                </div>
                <button className="w-full border-2 border-dashed rounded-xl py-2.5 text-sm font-semibold" style={{ color: BRAND, borderColor: '#c4b5fd' }}>+ Add step / branch</button>
              </div>
              <div className={`${card} p-3`}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Actions</p>
                {['📧 Email', '🔗 LinkedIn', '📞 Call', '💬 SMS', '🟢 WhatsApp', '✅ Manual task', '🔌 API'].map(a => (<div key={a} className="text-[13px] font-medium text-gray-700 py-0.5">{a}</div>))}
              </div>
            </div>
          </Sec>

          {/* 13 — Integrations hub */}
          <Sec id="s13" n={13} label="Integrations · #84" title="Integrations Hub — connect your stack">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl">
              {[['🟠 HubSpot', 'CRM', true], ['🟢 Pipedrive', 'CRM', false], ['📅 Google Calendar', 'Calendar', true], ['📅 Outlook / Zoho', 'Calendar', false], ['🟢 WhatsApp', 'Channel', false], ['🔗 LinkedIn', 'Channel', false], ['🔭 Apollo', 'Data', true], ['💳 Stripe', 'Billing', true]].map(([n, cat, conn]) => (
                <div key={n as string} className={`${card} p-3`}><p className="font-bold text-gray-900 text-sm">{n as string}</p><p className="text-[11px] text-gray-400 mb-2">{cat as string}</p><div className={`text-xs font-bold text-center rounded-lg py-1.5 ${conn ? 'bg-emerald-50 text-emerald-700' : 'text-[#7C3AED] bg-[#f3eeff]'}`}>{conn ? '✓ Connected' : 'Connect →'}</div></div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">Calendar connectors are <b>per rep</b> (#88). CRM dedup reads/writes from here.</p>
          </Sec>

          {/* 14 — Smart inbox */}
          <Sec id="s14" n={14} label="Inbox" title="Smart Inbox — every reply, every channel, auto-tagged">
            <div className="grid lg:grid-cols-[200px_1fr] gap-4 max-w-3xl">
              <div className={`${card} p-3`}>
                <div className="flex gap-1.5 mb-3">{['📧', '🔗', '💬', '🟢'].map(e => (<span key={e} className="text-sm bg-[#f3eeff] rounded-lg px-2 py-1">{e}</span>))}</div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Tags</p>
                {[['🔥 Hot · 3', '#ea6a3a', '#fff1ea'], ['Positive', '#16a34a', '#ecfdf5'], ['Meeting Booked', '#0ea5e9', '#eff8ff'], ['Nurturing', '#7C3AED', '#f3eeff']].map(([t, c, b]) => (<div key={t as string} className="text-xs font-bold px-2.5 py-1 rounded-full mb-1.5 inline-block" style={{ color: c as string, background: b as string }}>{t as string}</div>))}
              </div>
              <div className={`${card} p-4`}>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3"><span className="font-bold text-gray-900 text-sm">🔗 Seth Houston · MaceyLuxe</span><span className="text-[11px] font-bold text-[#0ea5e9] bg-[#eff8ff] px-2 py-0.5 rounded-full">Meeting Booked</span></div>
                <div className="space-y-2 text-[13px]">
                  <div className="bg-[#f3eeff] rounded-xl rounded-bl-sm px-3 py-2 max-w-[80%]">Hi Seth — worth a quick chat? <span className="text-[10px] text-gray-400">· FIGSY</span></div>
                  <div className="bg-[#eef2ff] rounded-xl rounded-br-sm px-3 py-2 max-w-[80%] ml-auto">Sure — Wednesday 10am works.</div>
                </div>
                <div className="flex gap-2 items-center border-t border-gray-100 mt-3 pt-3"><input placeholder="Reply…" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" /><button className="text-xs font-bold text-[#7C3AED] bg-[#f3eeff] px-3 py-2 rounded-lg">✨ Help me reply</button></div>
              </div>
            </div>
          </Sec>

          {/* 16 — Train FIGSY */}
          <Sec id="s16" n={16} label='Train FIGSY · "Train Katie" steal' title="Train FIGSY — teach your rep's AI who it is">
            <div className={`${card} grid grid-cols-[150px_1fr] overflow-hidden max-w-3xl`}>
              <div className="bg-[#faf9ff] border-r border-gray-100 py-3">
                {['Persona', 'Knowledge', 'Guardrails', 'Approvals', 'Test'].map(t => (<div key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm cursor-pointer ${tab === t ? 'font-bold text-[#7C3AED] bg-[#f3f0ff] border-r-2 border-[#7C3AED]' : 'text-gray-500'}`}>{t}</div>))}
              </div>
              <div className="p-5">
                <p className="font-bold text-gray-900 mb-3">{tab}</p>
                {tab === 'Persona' ? (
                  <>
                    <label className="text-xs font-bold text-gray-600">Sign-off name</label>
                    <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-[#faf9ff] mt-1 mb-3">Amara from MaceyLuxe</div>
                    <label className="text-xs font-bold text-gray-600">Value prop</label>
                    <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-[#faf9ff] mt-1">We turn WhatsApp traffic into repeat buyers — no agency retainer.</div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">{tab === 'Knowledge' ? 'Docs & links FIGSY can cite (one-pagers, case studies, proof points).' : tab === 'Guardrails' ? 'Never-say / always-say + banned claims.' : tab === 'Approvals' ? 'Which steps auto-send vs wait for the rep (ties to the usage budget).' : 'Dry-run a thread before it goes live.'}</p>
                )}
              </div>
            </div>
          </Sec>

          <div className="ml-10 pt-4 text-sm text-gray-400">That's the full set. Tell me per number what to keep, change, or refine. The 4 in §9 are live at <Link href="/v2/company" className="font-semibold" style={{ color: BRAND }}>/v2/company</Link>.</div>
        </div>
      </div>
    </div>
  )
}
