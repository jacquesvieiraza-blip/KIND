'use client'

/** V2 — SMART INBOX. Full-screen preview, sample data. Gated /v2 area. */

import { useState } from 'react'
import { Sparkles, Mail, Linkedin, MessageSquare, Send } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

const TAGS = [
  { label: '🔥 Hot', n: 3, c: '#ea6a3a', b: '#fff1ea' },
  { label: 'Positive', n: 8, c: '#16a34a', b: '#ecfdf5' },
  { label: 'Meeting Booked', n: 5, c: '#0ea5e9', b: '#eff8ff' },
  { label: 'Nurturing', n: 12, c: '#7C3AED', b: '#f3eeff' },
  { label: 'Reply Needed', n: 4, c: '#6b7280', b: '#f3f4f6' },
  { label: 'Not interested', n: 9, c: '#6b7280', b: '#f3f4f6' },
]

const THREADS = [
  { name: 'Seth Houston', co: 'MaceyLuxe', ch: '🔗', tag: 'Meeting Booked', tagC: '#0ea5e9', tagB: '#eff8ff', preview: 'Sure — Wednesday 10am works.', when: '2m' },
  { name: 'Amara Okafor', co: 'Paystack', ch: '📧', tag: '🔥 Hot', tagC: '#ea6a3a', tagB: '#fff1ea', preview: 'Yes, send me the details.', when: '1h' },
  { name: 'Tunde A.', co: 'Flutterwave', ch: '🟢', tag: 'Positive', tagC: '#16a34a', tagB: '#ecfdf5', preview: 'Interesting — how does pricing work?', when: '3h' },
  { name: 'Zola M.', co: 'Yoco', ch: '📧', tag: 'Nurturing', tagC: '#7C3AED', tagB: '#f3eeff', preview: 'Not right now, maybe next quarter.', when: '1d' },
]

export default function SmartInbox() {
  const [active, setActive] = useState(0)
  const t = THREADS[active]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Smart Inbox · sample data
      </div>

      <div className="max-w-6xl mx-auto px-6 py-7 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Inbox</h1>
          <p className="text-sm text-gray-500 mt-0.5">Every reply, every channel — email · LinkedIn · WhatsApp · SMS — auto-classified, with FIGSY drafting your response.</p>
        </div>

        <div className="grid lg:grid-cols-[200px_300px_1fr] gap-4 items-start">
          {/* Filters + tags */}
          <div className={`${card} p-4`}>
            <div className="flex gap-1.5 mb-4">
              {[Mail, Linkedin, MessageSquare].map((I, i) => (<span key={i} className="w-8 h-8 rounded-lg bg-[#f3eeff] flex items-center justify-center"><I className="w-4 h-4" style={{ color: BRAND }} /></span>))}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Tags</p>
            <div className="space-y-1.5">
              {TAGS.map(tag => (
                <div key={tag.label} className="flex items-center justify-between text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{ color: tag.c, background: tag.b }}>
                  <span>{tag.label}</span><span>{tag.n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <div className={`${card} overflow-hidden`}>
            {THREADS.map((th, i) => (
              <button key={th.name} onClick={() => setActive(i)} className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${active === i ? 'bg-[#faf9ff]' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-semibold text-gray-900">{th.ch} {th.name}</span>
                  <span className="text-[10px] text-gray-400">{th.when}</span>
                </div>
                <p className="text-xs text-gray-400 mb-1">{th.co}</p>
                <p className="text-[13px] text-gray-600 truncate">{th.preview}</p>
                <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: th.tagC, background: th.tagB }}>{th.tag}</span>
              </button>
            ))}
          </div>

          {/* Conversation detail */}
          <div className={`${card} p-5`}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div><p className="font-bold text-gray-900">{t.ch} {t.name}</p><p className="text-xs text-gray-400">{t.co}</p></div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ color: t.tagC, background: t.tagB }}>{t.tag}</span>
            </div>
            <div className="space-y-3 mb-4">
              <div className="bg-[#f3eeff] rounded-2xl rounded-bl-sm px-4 py-2.5 text-[13px] text-gray-800 max-w-[80%]">Hi {t.name.split(' ')[0]} — saw your work, worth a quick chat? <span className="text-[10px] text-gray-400">· FIGSY</span></div>
              <div className="bg-[#eef2ff] rounded-2xl rounded-br-sm px-4 py-2.5 text-[13px] text-gray-800 max-w-[80%] ml-auto">{t.preview}</div>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="bg-[#faf9ff] border border-[#e0d4fb] rounded-xl p-3 mb-2">
                <p className="text-[11px] font-bold mb-1" style={{ color: BRAND }}>✨ FIGSY suggests</p>
                <p className="text-[13px] text-gray-700">Perfect — I'll send a calendar invite for Wednesday 10am. Looking forward to it!</p>
              </div>
              <div className="flex gap-2 items-center">
                <input placeholder="Reply…" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <button className="text-xs font-bold px-3 py-2 rounded-lg" style={{ color: BRAND, background: '#f3eeff' }}>✨ Help me reply</button>
                <button className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-lg" style={{ background: BRAND }}><Send className="w-3.5 h-3.5" /> Send</button>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400">Per-rep (#88): each rep sees their own replies; the owner sees all. FIGSY auto-tags &amp; drafts; the human approves &amp; sends.</p>
      </div>
    </div>
  )
}
