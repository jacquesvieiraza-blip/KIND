'use client'

/** V2 — SEQUENCE BUILDER (#89). Full-screen preview, sample data. Gated /v2 area. */

import { useState } from 'react'
import { Sparkles, Plus, GitBranch, Mail, Linkedin, Phone, MessageSquare, CheckSquare, Plug2, Clock } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

const TEMPLATES = [
  { name: 'Classic 3-step', steps: '📧 → 📧 → 📧', tag: 'Most used' },
  { name: 'Omnichannel', steps: '📧 → 🔗 → 📞', tag: 'Higher reply' },
  { name: 'LinkedIn-first', steps: '🔗 → 🔗 → 📧', tag: 'Warm' },
  { name: 'Build from scratch', steps: 'blank canvas', tag: '' },
]

const ACTIONS = [
  { icon: Mail, label: 'Email', note: '' },
  { icon: Linkedin, label: 'LinkedIn', note: 'connect · message · voice' },
  { icon: Phone, label: 'Call', note: '' },
  { icon: MessageSquare, label: 'SMS', note: 'Beta' },
  { icon: MessageSquare, label: 'WhatsApp', note: '' },
  { icon: CheckSquare, label: 'Manual task', note: '' },
  { icon: Plug2, label: 'API connect', note: '' },
]

export default function SequenceBuilder() {
  const [selected, setSelected] = useState(0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Sequence Builder (#89) · sample data
      </div>

      <div className="max-w-6xl mx-auto px-6 py-7 space-y-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sequence Builder</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pick a template, then shape the steps and branches. FIGSY writes &amp; runs every step in the rep's voice, waits each delay, branches on the result, and stops the instant they reply.</p>
        </div>

        {/* Template gallery */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Start from a template</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {TEMPLATES.map((t, i) => (
              <button key={t.name} onClick={() => setSelected(i)} className={`${card} p-4 text-left transition-all ${selected === i ? 'ring-2' : 'hover:shadow-md'}`} style={selected === i ? { boxShadow: `0 0 0 2px ${BRAND}` } : undefined}>
                <div className="flex items-center justify-between mb-2">
                  <GitBranch className="w-4 h-4" style={{ color: BRAND }} />
                  {t.tag && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: BRAND, background: '#f3eeff' }}>{t.tag}</span>}
                </div>
                <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                <p className="text-xs text-gray-400 mt-1">{t.steps}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Tree + action library */}
        <div className="grid lg:grid-cols-[1fr_220px] gap-5">
          <div className={`${card} p-6`}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-4">The sequence</p>

            <Step n={1} channel="📧 Email" detail="Personalised opening — reference their company or role" delay="Day 0 · sends immediately" />
            <Connector label="wait 3 days · if no reply" />
            <Step n={2} channel="🔗 LinkedIn — connect" detail="Connection request (no note)" delay="Day 3" />

            {/* Branch */}
            <div className="flex items-center justify-center my-2"><span className="text-[11px] font-bold text-gray-400">if connected ↓ / if not ↓</span></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-center text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-full py-1 mb-2">✓ CONNECTED</div>
                <div className="bg-[#faf9ff] border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800">🔗 LinkedIn message</div>
              </div>
              <div>
                <div className="text-center text-[10px] font-bold text-orange-700 bg-orange-50 rounded-full py-1 mb-2">✗ NOT CONNECTED</div>
                <div className="bg-[#faf9ff] border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800">📧 Follow-up email</div>
              </div>
            </div>

            <button className="mt-5 w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-3 text-sm font-semibold" style={{ color: BRAND, borderColor: '#c4b5fd' }}>
              <Plus className="w-4 h-4" /> Add step / branch
            </button>
          </div>

          {/* Action library */}
          <div className={`${card} p-4 h-fit`}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-3">Drag in an action</p>
            <div className="space-y-1.5">
              {ACTIONS.map(a => (
                <div key={a.label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#faf9ff] border border-gray-100 cursor-grab">
                  <a.icon className="w-4 h-4 shrink-0" style={{ color: BRAND }} />
                  <span className="text-[13px] font-medium text-gray-800">{a.label}</span>
                  {a.note && <span className="ml-auto text-[9px] text-gray-400">{a.note}</span>}
                </div>
              ))}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-4 mb-2">Conditions</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#faf9ff] border border-gray-100"><GitBranch className="w-4 h-4" style={{ color: BRAND }} /><span className="text-[13px] font-medium text-gray-800">Branch / condition</span></div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#faf9ff] border border-gray-100"><Clock className="w-4 h-4" style={{ color: BRAND }} /><span className="text-[13px] font-medium text-gray-800">Delay / wait</span></div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400"><b>Email is live today; other channels light up as they ship.</b> Replaces the hardcoded 3-step.</p>
      </div>
    </div>
  )
}

function Step({ n, channel, detail, delay }: { n: number; channel: string; detail: string; delay: string }) {
  return (
    <div className="flex items-start gap-3 bg-[#faf9ff] border border-gray-100 rounded-xl px-4 py-3">
      <span className="w-7 h-7 rounded-full text-white text-sm font-bold flex items-center justify-center shrink-0" style={{ background: BRAND }}>{n}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">{channel}</p>
        <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
        <p className="text-[11px] text-gray-400 mt-1">{delay}</p>
      </div>
      <span className="text-gray-300 cursor-grab">⋮⋮</span>
    </div>
  )
}

function Connector({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-2 pl-3">
      <div className="w-px h-6 bg-gray-200" />
      <span className="text-[11px] font-medium text-gray-400">{label}</span>
    </div>
  )
}
