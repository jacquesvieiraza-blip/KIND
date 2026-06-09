'use client'

/** V2 — STRUCTURED AGENT CONFIG PANEL. Full-screen preview, sample data. Gated /v2. */

import { useState } from 'react'
import { Sparkles, Target, Users, Palette, Clock, BookOpen } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

const TABS = [
  { id: 'role', label: 'Role', icon: Target },
  { id: 'icp', label: 'ICP', icon: Users },
  { id: 'tone', label: 'Tone', icon: Palette },
  { id: 'schedule', label: 'Schedule', icon: Clock },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
]

export default function ConfigPanel() {
  const [tab, setTab] = useState('icp')
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Agent Config Panel · sample data
      </div>
      <div className="max-w-4xl mx-auto px-6 py-7 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configure FIGSY</h1>
          <p className="text-sm text-gray-500 mt-0.5">Clean cards for every setting — no dense forms.</p>
        </div>
        <div className={`${card} grid grid-cols-[180px_1fr] overflow-hidden`}>
          <div className="bg-[#faf9ff] border-r border-gray-100 py-3">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${tab === t.id ? 'font-bold text-[#7C3AED] bg-[#f3f0ff] border-r-2 border-[#7C3AED]' : 'text-gray-500 hover:text-gray-800'}`}>
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            ))}
          </div>
          <div className="p-6">
            {tab === 'icp' && (
              <>
                <h2 className="font-bold text-gray-900 mb-4">Ideal Customer Profile</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Card label="Industries" value="Fintech · SaaS · D2C retail" />
                  <Card label="Job titles" value="Head of Sales · Growth · Founder" />
                  <Card label="Company size" value="10–200 employees" />
                  <Card label="Geographies" value="Nigeria · South Africa · Kenya" />
                </div>
              </>
            )}
            {tab === 'role' && <Single title="Role" value="Outbound SDR — find, qualify, and book meetings with net-new accounts." />}
            {tab === 'tone' && <Single title="Tone" value="Warm, specific, never pushy. Always references something real about the prospect." />}
            {tab === 'schedule' && <Single title="Schedule" value="Mon–Fri · 08:00–16:00 prospect-local · 10/day during warmup, ramping to 50." />}
            {tab === 'knowledge' && <Single title="Knowledge" value="3 documents attached · FIGSY cites only what's here." />}
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#faf9ff] border border-gray-100 rounded-xl p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  )
}
function Single({ title, value }: { title: string; value: string }) {
  return (
    <>
      <h2 className="font-bold text-gray-900 mb-3">{title}</h2>
      <div className="bg-[#faf9ff] border border-gray-100 rounded-xl p-4 text-sm text-gray-700">{value}</div>
      <button className="mt-5 px-5 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: BRAND }}>Save</button>
    </>
  )
}
