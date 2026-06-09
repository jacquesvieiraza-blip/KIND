'use client'

/** V2 — AI NOTETAKER → ACTION ITEMS (Milla). Transcript → structured action items.
 *  Full-screen preview, sample data. Gated /v2 area. Matches portal-v2-preview.html §8. */

import { Sparkles, Mic } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

const ITEMS = [
  { task: 'Ship ICP builder before Monday', owner: 'Jacques', due: 'Mon 8 Jun', c: '#7C3AED' },
  { task: 'Finalise email templates', owner: 'Sarah', due: 'Wed 10 Jun', c: '#ec4899' },
  { task: 'Review FIGSY campaign copy', owner: 'Jacques', due: 'Fri 12 Jun', c: '#10b981' },
]

export default function Notetaker() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · AI Notetaker (Milla) · Concept 8 — Critical · Month 2 · sample data
      </div>

      <div className="max-w-5xl mx-auto px-6 py-7 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 ring-2 ring-[#bae6fd]"><img src="/agents/milla.png" alt="Milla" className="w-full h-full object-cover" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Notetaker → Action Items</h1>
            <p className="text-sm text-gray-500 mt-0.5">Drop in a meeting transcript or recording. Milla extracts every action item, owner, and deadline — zero manual notes.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5 items-start">
          {/* Drop in meeting */}
          <div className={`${card} p-5`}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">Drop in your meeting</p>
            <div className="border-2 border-dashed rounded-2xl p-8 text-center mb-3" style={{ borderColor: '#c4b5fd', background: '#faf9ff' }}>
              <Mic className="w-7 h-7 mx-auto mb-2 text-gray-400" />
              <p className="font-bold text-sm" style={{ color: BRAND }}>Paste transcript or upload recording</p>
              <p className="text-xs text-gray-400 mt-1">Zoom · Teams · Google Meet · .txt · .mp3</p>
            </div>
            <p className="text-center text-[11px] text-gray-400 mb-2">or paste below</p>
            <textarea
              rows={4}
              defaultValue={'[Jacques]: So the priority this week is getting the ICP builder shipped before Monday…\n[Sarah]: I can handle the email templates by Wednesday…'}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-600 resize-none font-mono leading-relaxed bg-[#faf9ff]"
            />
            <button className="mt-3 w-full text-white text-sm font-bold py-3 rounded-xl" style={{ background: BRAND }}>Extract action items →</button>
          </div>

          {/* Extracted items */}
          <div className={`${card} p-5`}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">Action items — extracted by Milla</p>
            <div className="space-y-3">
              {ITEMS.map(it => (
                <div key={it.task} className="flex items-start gap-3 bg-[#faf9ff] border border-gray-100 rounded-xl p-3.5">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs mt-0.5 shrink-0" style={{ background: it.c }}>✓</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{it.task}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Owner: {it.owner} · Due: {it.due}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 text-sm font-bold py-2 rounded-xl" style={{ color: BRAND, background: '#f3eeff' }}>Add to Milla's tasks</button>
              <button className="flex-1 text-sm font-bold py-2 rounded-xl" style={{ color: BRAND, background: '#f3eeff' }}>Export to Slack</button>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400">Milla owns this. Input: Zoom/Teams transcript paste or upload. Output: structured action items with owner + deadline, pushable to tasks or Slack.</p>
      </div>
    </div>
  )
}
