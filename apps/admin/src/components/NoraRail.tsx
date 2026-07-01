'use client'

/**
 * NORA — The Keeper (#275). Right-rail admin co-pilot, context-aware to the
 * current screen. Calls /api/proxy/founder/nora (admin-key gated server-side).
 * All-round: ops + business. Distinct from client agents + partner-side Alex.
 */

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Send, X, Sparkles } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string }

function contextFor(path: string): { screen: string; greeting: string; chips: string[] } {
  const p = path || '/'
  if (p === '/') return { screen: 'Cockpit', greeting: "Morning. You're on the Cockpit — I follow whatever screen you're on. Ask me anything about the business.", chips: ['What needs me most today?', 'Are we profitable this month?', 'Any clients at risk?'] }
  if (p.startsWith('/command')) return { screen: 'Command Centre', greeting: "You're in the Command Centre — your team & partners. Ask me about any AE or partner.", chips: ['Which partner is at risk?', 'Who has the weakest pipeline coverage?', 'Draft a check-in to a partner'] }
  if (p.startsWith('/clients')) return { screen: 'Clients', greeting: "You're viewing Clients. Want me to dig into one, or find the at-risk accounts?", chips: ['Which client is at risk and why?', 'Who is healthiest?', 'Draft a re-engagement note'] }
  if (p.startsWith('/revenue') || p.startsWith('/cohorts')) return { screen: 'Finance', greeting: "You're in Finance. Ask me about MRR, margin, runway, or a hiring what-if.", chips: ['What if I hire an AE at $2k/mo?', "What's driving my costs?", 'How long is my runway?'] }
  if (p.startsWith('/partners') || p.startsWith('/proposals') || p.startsWith('/cmo') || p.startsWith('/unibox') || p.startsWith('/analytics') || p.startsWith('/visitors') || p.startsWith('/hubspot')) return { screen: 'GTM / Pipeline', greeting: "You're in GTM / Pipeline. Ask me about outreach, partners, or the funnel.", chips: ["How's the partner channel doing?", 'When can we start our own sends?', "What's next on content?"] }
  if (p.startsWith('/health')) return { screen: 'Engine / Deliverability', greeting: "You're on Engine / Deliverability. Ask me if anything is silently failing.", chips: ['Are any sends failing?', "What's the bounce rate telling me?", 'What keys are missing?'] }
  if (p.startsWith('/compliance') || p.startsWith('/terms-library')) return { screen: 'Compliance', greeting: "You're in Compliance. Ask me anything on POPIA / GDPR or our terms.", chips: ['Are we POPIA compliant?', "What's on the blocklist?", 'Explain cross-client isolation'] }
  if (p.startsWith('/demo')) return { screen: 'Sales Demo', greeting: "You're in Sales Demo. Want me to prep a demo for a prospect?", chips: ['Set up a demo for a plumber', 'How long do demos last?', 'What data goes in a demo?'] }
  return { screen: 'Admin', greeting: "I'm Nora — your admin co-pilot. Ask me anything about running K.I.N.D.", chips: ['What needs me today?', 'How are we tracking to target?', "What's at risk?"] }
}

export function NoraRail() {
  const pathname = usePathname()
  const ctx = contextFor(pathname)
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  // Reset the thread when the screen changes so Nora re-greets in-context.
  useEffect(() => { setMsgs([]) }, [ctx.screen])
  useEffect(() => { feedRef.current?.scrollTo(0, feedRef.current.scrollHeight) }, [msgs, sending])

  async function send(text: string) {
    const q = text.trim()
    if (!q || sending) return
    const next = [...msgs, { role: 'user' as const, content: q }]
    setMsgs(next); setInput(''); setSending(true)
    try {
      const res = await fetch('/api/proxy/founder/nora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, screen: ctx.screen }),
      })
      const j = await res.json().catch(() => null)
      const reply = j?.data?.reply || (res.ok ? 'No reply.' : 'Nora is unavailable right now.')
      setMsgs(m => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: 'Could not reach Nora just now.' }])
    } finally { setSending(false) }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full bg-[#0F0929] text-white shadow-lg shadow-purple-900/30 hover:scale-105 transition">
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/agents/Nora.png" alt="Nora" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget.style.display = 'none') }} />
          </span>
          <span className="text-sm font-semibold">Ask Nora</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 w-[360px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-2rem)] bg-white rounded-2xl border border-purple-100 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-white">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] flex items-center justify-center overflow-hidden shrink-0 text-white font-bold text-sm">
              <span className="absolute">N</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/agents/Nora.png" alt="Nora" className="relative w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight">Nora <span className="text-[#7C3AED] font-semibold">· The Keeper</span></p>
              <p className="text-[11px] text-gray-400">on {ctx.screen} · <span className="text-emerald-500">● online</span></p>
            </div>
            <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>

          {/* Feed */}
          <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="bg-purple-50 border border-purple-100 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-800">{ctx.greeting}</div>
            {msgs.length === 0 && (
              <div className="space-y-2 pt-1">
                {ctx.chips.map(c => (
                  <button key={c} onClick={() => send(c)} className="w-full text-left bg-white border border-purple-100 rounded-full px-3.5 py-2 text-[13px] text-[#7C3AED] font-medium hover:bg-purple-50">{c}</button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[85%] px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#7C3AED] text-white rounded-2xl rounded-tr-sm' : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'}`}>{m.content}</div>
              </div>
            ))}
            {sending && <div className="flex items-center gap-1.5 text-xs text-gray-400 px-1"><Sparkles className="w-3.5 h-3.5 animate-pulse" /> Nora is thinking…</div>}
          </div>

          {/* Input */}
          <div className="border-t border-purple-100 p-3 flex items-center gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(input) }}
              placeholder="Ask Nora anything…" className="flex-1 text-sm border border-purple-100 rounded-xl px-3 py-2 outline-none focus:border-[#7C3AED]" />
            <button onClick={() => send(input)} disabled={sending || !input.trim()}
              className="w-9 h-9 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center disabled:opacity-40"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </>
  )
}
