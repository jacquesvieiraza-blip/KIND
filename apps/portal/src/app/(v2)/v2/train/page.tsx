'use client'

/** V2 — TRAIN FIGSY (Alta "Train Katie" steal). Full-screen preview, sample data. Gated /v2 area. */

import { useState } from 'react'
import { Sparkles, UserCircle, BookOpen, Shield, CheckCircle2, FlaskConical } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

const TABS = [
  { id: 'persona', label: 'Persona', icon: UserCircle },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'guardrails', label: 'Guardrails', icon: Shield },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle2 },
  { id: 'test', label: 'Test & preview', icon: FlaskConical },
]

export default function TrainFigsy() {
  const [tab, setTab] = useState('persona')
  const [tone, setTone] = useState('Warm')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Train FIGSY · sample data
      </div>

      <div className="max-w-5xl mx-auto px-6 py-7 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Train FIGSY</h1>
          <p className="text-sm text-gray-500 mt-0.5">Each rep trains <b>their own</b> FIGSY (#88): persona, knowledge, guardrails, and approve/auto rules — so it sounds like them and never goes off-message.</p>
        </div>

        <div className={`${card} grid grid-cols-[200px_1fr] overflow-hidden`}>
          {/* Tabs */}
          <div className="bg-[#faf9ff] border-r border-gray-100 py-3">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${tab === t.id ? 'font-bold text-[#7C3AED] bg-[#f3f0ff] border-r-2 border-[#7C3AED]' : 'text-gray-500 hover:text-gray-800'}`}>
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            ))}
          </div>

          {/* Panel */}
          <div className="p-6">
            {tab === 'persona' && (
              <>
                <h2 className="font-bold text-gray-900 mb-4">Persona — how Amara's FIGSY shows up</h2>
                <Field label="Tone">
                  <div className="flex gap-2 flex-wrap">
                    {['Warm', 'Direct', 'Playful', 'Formal'].map(t => (
                      <button key={t} onClick={() => setTone(t)} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={tone === t ? { background: BRAND, color: '#fff' } : { color: BRAND, background: '#f3eeff', border: '1px solid #e0d4fb' }}>{t}</button>
                    ))}
                  </div>
                </Field>
                <Field label="Sign-off name"><Box>Amara from MaceyLuxe</Box></Field>
                <Field label="Value prop (1 line)"><Box>We help African D2C brands turn WhatsApp traffic into repeat buyers — no agency retainer.</Box></Field>
                <div className="bg-[#faf9ff] border border-dashed border-[#c4b5fd] rounded-xl p-3 text-[13px] text-gray-600 mt-4">
                  <b style={{ color: BRAND }}>Live sample →</b> "Hi {'{first}'}, Amara here from MaceyLuxe. Noticed you're scaling on WhatsApp — we turn that traffic into repeat buyers without an agency retainer. Worth 15 min?"
                </div>
                <button className="mt-5 px-5 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: BRAND }}>Save &amp; retrain</button>
              </>
            )}
            {tab === 'knowledge' && <Panel title="Knowledge" body="Upload the docs &amp; links FIGSY can cite — one-pagers, case studies, pricing, proof points. FIGSY only references what you give it here." chips={['MaceyLuxe one-pager.pdf', 'Case study — Yoco', 'Pricing sheet']} />}
            {tab === 'guardrails' && <Panel title="Guardrails" body="Never-say / always-say + banned claims. FIGSY refuses anything outside these rules." chips={['Never promise specific revenue', 'Always include opt-out', 'No competitor bashing']} />}
            {tab === 'approvals' && <Panel title="Approvals" body="Which steps auto-send vs wait for the rep (ties to #88 + the usage budget)." chips={['Step 1 — auto-send', 'Replies — wait for rep', 'Calls — wait for rep']} />}
            {tab === 'test' && <Panel title="Test &amp; preview" body="Dry-run a full thread against a sample prospect before it ever goes live." chips={['▶ Run dry-run', 'Preview as: a CTO in Lagos']} />}
          </div>
        </div>
        <p className="text-xs text-gray-400">Alta makes you "train Katie." We make every rep train their <b>own</b> FIGSY — that's the per-rep difference.</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div className="mb-4"><label className="block text-xs font-bold text-gray-600 mb-1.5">{label}</label>{children}</div>)
}
function Box({ children }: { children: React.ReactNode }) {
  return <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-[#faf9ff]">{children}</div>
}
function Panel({ title, body, chips }: { title: string; body: string; chips: string[] }) {
  return (
    <>
      <h2 className="font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 mb-4">{body}</p>
      <div className="space-y-2">{chips.map(c => (<div key={c} className="bg-[#faf9ff] border border-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700">{c}</div>))}</div>
      <button className="mt-5 px-5 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: BRAND }}>Save</button>
    </>
  )
}
