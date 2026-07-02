'use client'

/**
 * NORA — The Keeper (#275), rebuilt on the portal AgentSidePanel design language
 * (#277): photo header · dark identity bar · avatar bubbles · MarkdownLite ·
 * typing dots · quick chips. Right-rail admin co-pilot, context-aware to the
 * current screen. Calls /api/proxy/founder/nora (admin-key gated server-side).
 * Distinct from the client agents (Figsy/Milla/Denise/Vida) and partner-side Alex.
 */

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Send, X, Loader2 } from 'lucide-react'
import MarkdownLite from '@/components/MarkdownLite'

type Msg = { role: 'user' | 'assistant'; content: string }

function contextFor(path: string): { screen: string; greeting: string; chips: string[] } {
  const p = path || '/'
  if (p === '/') return { screen: 'Cockpit', greeting: "Morning. You're on the Cockpit — I follow whatever screen you're on. Ask me anything about the business.", chips: ['What needs me most today?', 'Are we profitable this month?', 'Any clients at risk?'] }
  if (p.startsWith('/command')) return { screen: 'Sales Channel', greeting: "You're in the Sales Channel — your team & partners. Ask me about any AE or partner.", chips: ['Which partner is at risk?', 'Who has the weakest pipeline coverage?', 'Draft a check-in to a partner'] }
  if (p.startsWith('/clients')) return { screen: 'Clients', greeting: "You're viewing Clients. Want me to dig into one, or find the at-risk accounts?", chips: ['Which client is at risk and why?', 'Who is healthiest?', 'Draft a re-engagement note'] }
  if (p.startsWith('/revenue') || p.startsWith('/cohorts')) return { screen: 'Finance', greeting: "You're in Finance. Ask me about MRR, margin, runway, or a hiring what-if.", chips: ['What if I hire an AE at $2k/mo?', "What's driving my costs?", 'How long is my runway?'] }
  if (p.startsWith('/partners') || p.startsWith('/proposals') || p.startsWith('/cmo') || p.startsWith('/unibox') || p.startsWith('/analytics') || p.startsWith('/visitors')) return { screen: 'GTM / Pipeline', greeting: "You're in GTM / Pipeline. Ask me about outreach, partners, or the funnel.", chips: ["How's the partner channel doing?", 'When can we start our own sends?', "What's next on content?"] }
  if (p.startsWith('/health') || p.startsWith('/engine')) return { screen: 'Engine / Deliverability', greeting: "You're on Engine / Deliverability. Ask me if anything is silently failing.", chips: ['Are any sends failing?', "What's the bounce rate telling me?", 'What keys are missing?'] }
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

  const Avatar = () => (
    <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 mt-0.5 border border-brand-200 bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center">
      <span className="absolute">N</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {/* Nora-face.png = square face crop generated from Nora.png — the full portrait
         reads as a top-of-head speck at avatar size (founder-flagged, 2 Jul). */}
      <img src="/agents/Nora-face.png" alt="" className="relative w-full h-full object-cover"
        onError={(e) => { e.currentTarget.style.display = 'none' }} />
    </div>
  )

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full bg-brand-900 text-white shadow-lg shadow-purple-900/30 hover:scale-105 transition">
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-800 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/agents/Nora-face.png" alt="Nora" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget.style.display = 'none') }} />
          </span>
          <span className="text-sm font-semibold">Ask Nora</span>
        </button>
      )}

      {/* Panel — AgentSidePanel design language */}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-2rem)] bg-white rounded-2xl border border-brand-200/50 shadow-2xl flex flex-col overflow-hidden">
          {/* Photo header — matches the portal AgentSidePanel (h-60 head-and-shoulders).
             Uses Nora-card.png, a head-and-shoulders crop of the full portrait, so
             object-top frames like FIGSY instead of zooming into her eyes. */}
          <div className="relative h-60 overflow-hidden bg-brand-100 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/agents/Nora-card.png" alt="Nora" className="w-full h-[calc(100%+24px)] object-cover object-top agent-img-float"
              onError={(e) => { (e.currentTarget.style.display = 'none') }} />
            <button onClick={() => setOpen(false)}
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-black/25 text-white hover:bg-black/40 flex items-center justify-center backdrop-blur-sm">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Dark identity bar */}
          <div className="bg-brand-900 px-4 py-2.5 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-white font-bold text-base leading-tight">Nora</p>
                <span className="text-brand-400 text-xs font-semibold">· The Keeper</span>
              </div>
              <p className="text-[#9B8EC4] text-xs mt-0.5">Admin co-pilot · on {ctx.screen}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium text-emerald-400">Online</span>
            </div>
          </div>

          {/* Feed */}
          <div ref={feedRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#FAFAFA]">
            {/* Greeting */}
            <div className="flex gap-1.5">
              <Avatar />
              <div className="max-w-[85%] rounded-xl rounded-bl-sm px-2.5 py-1.5 text-xs leading-relaxed bg-white text-gray-800 border border-brand-200/60 shadow-sm">
                {ctx.greeting}
              </div>
            </div>

            {/* Chips (only before the first exchange) */}
            {msgs.length === 0 && (
              <div className="flex flex-col gap-1.5 pt-1">
                {ctx.chips.map(c => (
                  <button key={c} onClick={() => send(c)}
                    className="w-full text-left text-xs text-brand-700 bg-brand-100/70 hover:bg-brand-100 border border-brand-200 rounded-full px-3 py-1.5 transition-colors">{c}</button>
                ))}
              </div>
            )}

            {/* Thread */}
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-1.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && <Avatar />}
                <div className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-brand-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-brand-200/60 shadow-sm rounded-bl-sm'
                }`}>
                  {m.role === 'assistant' ? <MarkdownLite content={m.content} /> : m.content}
                </div>
              </div>
            ))}

            {/* Typing dots */}
            {sending && (
              <div className="flex items-start gap-1.5">
                <Avatar />
                <div className="bg-white rounded-xl rounded-bl-sm px-2.5 py-2 border border-brand-200/60 shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-brand-200/50 p-3 shrink-0">
            <div className="flex items-center gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(input) }}
                placeholder={msgs.length ? 'Reply to Nora…' : 'Ask Nora anything…'}
                className="flex-1 text-xs bg-gray-50 border border-brand-200/60 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
              <button onClick={() => send(input)} disabled={sending || !input.trim()}
                className="w-8 h-8 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-colors">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
            {msgs.length > 0 && (
              <button onClick={() => setMsgs([])} className="text-[10px] text-gray-300 hover:text-gray-500 transition-colors mt-2 w-full text-center">
                Clear conversation
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
