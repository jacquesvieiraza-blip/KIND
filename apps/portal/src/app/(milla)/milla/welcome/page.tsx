'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// #513/#514 — MILLA CONVERSATIONAL ONBOARDING. Milla-led, no forms: the client describes
// who they want to reach, Milla (via /icps/builder/chat) proposes a structured ICP, we show
// it + a recommended credit plan (from /icps/preview-count), and on approval we persist the
// ICP (POST /icps → this becomes v1) and drop them on the dashboard. Design ref: the
// approved onboarding preview. Full-screen (MillaShell hides its chrome on /milla/welcome).

type IcpDraft = {
  name: string; industries: string[]; job_titles: string[]; seniority_levels: string[]
  company_sizes: string[]; geographies: string[]; tech_stack: string[]; keywords: string[]
  apollo_only_consented: boolean
}
type BuilderReply = { type: 'question'; content: string } | { type: 'complete'; icp: IcpDraft; summary: string | null }
type Msg = { role: 'user' | 'assistant'; content: string }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

const GREETING = "Hi 👋 I'm Milla, your campaign partner. Tell me who your best customers are — industry, role, company size, region — and I'll build your targeting plan. No forms."

export default function MillaWelcomePage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [proposed, setProposed] = useState<IcpDraft | null>(null)
  const [matchCount, setMatchCount] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight }, [messages, proposed])

  const propose = useCallback(async (icp: IcpDraft) => {
    setProposed(icp)
    try {
      const r = await api.post<{ data: { count: number } }>('/icps/preview-count', icp, await token())
      setMatchCount(typeof r.data?.count === 'number' ? r.data.count : null)
    } catch { setMatchCount(null) }
  }, [])

  async function send(text: string) {
    const msg = text.trim(); if (!msg || thinking) return
    setInput(''); setError(null); setThinking(true)
    const history = [...messages, { role: 'user' as const, content: msg }]
    setMessages(history)
    try {
      const r = await api.post<{ data: BuilderReply }>('/icps/builder/chat', { messages: history }, await token())
      const d = r.data
      if (d.type === 'complete') {
        setMessages(m => [...m, { role: 'assistant', content: d.summary || "Here's the targeting plan I'd recommend — review it on the right." }])
        await propose(d.icp)
      } else {
        setMessages(m => [...m, { role: 'assistant', content: d.content }])
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Milla hit a snag — please try again') }
    finally { setThinking(false) }
  }

  async function approve() {
    if (!proposed) return
    setSaving(true); setError(null)
    try {
      await api.post('/icps', proposed, await token())
      // ⚑ flow v2 (step 2): the $99 was never asked for at the moment it matters. The banner
      // sat on the dashboard where a brand-new client had no reason to look, so the ICP they
      // just approved sat dormant. The conversation ENDS on the ask, because that is when
      // they most want what it buys.
      router.push('/milla/billing?start=1&from=icp')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your ICP — please try again'); setSaving(false) }
  }

  // Recommended starter credit plan (a suggestion, clearly labelled — not a guarantee).
  const recCredits = matchCount == null ? 200 : Math.max(100, Math.min(500, Math.round(matchCount / 50) * 50 || 200))
  const meetLow = Math.round(recCredits * 0.04), meetHigh = Math.round(recCredits * 0.07)
  const chips = (arr: string[]) => arr.filter(Boolean)

  const stepDot = (n: number, label: string, state: 'done' | 'on' | 'todo') => (
    <span className="flex items-center gap-1.5 text-[12px] font-bold shrink-0" style={{ color: state === 'todo' ? '#9b8ec4' : '#7C3AED' }}>
      <span className="w-[22px] h-[22px] rounded-full text-[11px] font-extrabold flex items-center justify-center text-white"
        style={{ background: state === 'done' ? '#059669' : state === 'on' ? '#7C3AED' : '#e7ddf7', color: state === 'todo' ? '#9b8ec4' : '#fff' }}>
        {state === 'done' ? '✓' : n}
      </span>{label}
    </span>
  )

  return (
    <div className="h-screen flex flex-col bg-[#faf8ff] text-[#1f1235] overflow-hidden">
      <header className="h-[54px] shrink-0 flex items-center gap-3 px-6 border-b border-[#eee7f7] bg-white">
        <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white flex items-center justify-center text-[14px] font-extrabold">M</div>
        <b className="text-[15px]">Milla</b><span className="text-[#9b8ec4] text-[12.5px] font-semibold">· let's set up your campaign</span>
      </header>

      <div className="shrink-0 flex items-center gap-3 px-6 py-3 bg-white border-b border-[#eee7f7] overflow-x-auto">
        {stepDot(1, 'Welcome', 'done')}<span className="w-8 h-0.5 bg-[#e7ddf7]" />
        {stepDot(2, 'Your target', proposed ? 'done' : 'on')}<span className="w-8 h-0.5 bg-[#e7ddf7]" />
        {stepDot(3, 'Your plan', proposed ? 'on' : 'todo')}<span className="w-8 h-0.5 bg-[#e7ddf7]" />
        {stepDot(4, 'Go live', 'todo')}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* conversation */}
        <section className="flex-1 min-w-0 flex flex-col">
          <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-5">
            <div className="max-w-2xl mx-auto space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${m.role === 'user' ? 'bg-[#1f1235] text-white' : 'bg-white border border-[#eee7f7]'}`}>{m.content}</div>
                </div>
              ))}
              {thinking && <div className="flex justify-start"><div className="bg-white border border-[#eee7f7] rounded-2xl px-4 py-2.5 text-[#9b8ec4] text-[13px]">Milla is thinking…</div></div>}
              {error && <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
            </div>
          </div>
          <div className="shrink-0 px-6 pb-5 pt-2 border-t border-[#eee7f7] bg-white">
            <form onSubmit={e => { e.preventDefault(); send(input) }} className="max-w-2xl mx-auto flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="e.g. Heads of Ops at UK logistics firms, 50–500 staff…"
                className="flex-1 text-[13.5px] rounded-xl border border-[#e4dcf7] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
              <button type="submit" disabled={thinking || !input.trim()} className="text-[13px] font-bold text-white rounded-xl px-6 bg-[#7C3AED] disabled:opacity-50">Send</button>
            </form>
          </div>
        </section>

        {/* proposal */}
        <aside className="w-[420px] shrink-0 border-l border-[#eee7f7] bg-white overflow-y-auto">
          {!proposed ? (
            <div className="p-6 text-[13px] text-[#9b8ec4] leading-relaxed">
              <div className="text-[15px] font-bold text-[#1f1235] mb-2">Your targeting plan</div>
              As we chat, Milla builds your <b>ICP</b> (who to target) and a recommended <b>credit plan</b> here. You approve before anything starts.
            </div>
          ) : (
            <div className="p-6">
              <div className="text-[15px] font-bold mb-1">Proposed ICP · <span className="text-[#7C3AED]">v1</span></div>
              <div className="text-[13px] text-[#5c5279] font-semibold mb-3">{proposed.name}</div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {[...chips(proposed.seniority_levels), ...chips(proposed.job_titles), ...chips(proposed.industries), ...chips(proposed.geographies), ...chips(proposed.company_sizes).map(s => `${s} staff`)].map((c, i) => (
                  <span key={i} className="text-[11.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2.5 py-1">{c}</span>
                ))}
              </div>

              <div className="text-[15px] font-bold mb-2">Starter plan <span className="text-[10px] font-semibold text-[#b3a9cc] uppercase">· recommended</span></div>
              <div className="flex gap-2.5 mb-2">
                <div className="flex-1 bg-[#faf8ff] border border-[#eee7f7] rounded-xl px-3 py-2.5"><div className="text-[9.5px] uppercase font-extrabold text-[#b3a9cc]">Approvals</div><div className="text-[19px] font-extrabold">{recCredits}</div><div className="text-[11px] text-[#9b8ec4]">$4 per approved lead</div></div>
                <div className="flex-1 bg-[#faf8ff] border border-[#eee7f7] rounded-xl px-3 py-2.5"><div className="text-[9.5px] uppercase font-extrabold text-[#b3a9cc]">Matches found</div><div className="text-[19px] font-extrabold">{matchCount == null ? '—' : matchCount.toLocaleString()}</div><div className="text-[11px] text-[#9b8ec4]">to this ICP</div></div>
              </div>
              <div className="text-[11.5px] text-[#9b8ec4] mb-4">Estimate: <b className="text-[#5c5279]">{meetLow}–{meetHigh} meetings</b> from ~{recCredits} approvals — you only ever pay when you approve a lead.</div>

              {/* The button says what actually happens next: they approve, and the very next
                  screen is the $99 — because nothing sources until it lands. Promising
                  "start sourcing" here was a promise the money gate does not keep. */}
              <button disabled={saving} onClick={approve} className="w-full text-[13px] font-bold text-white rounded-xl py-3 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">{saving ? 'Saving…' : 'Approve this — then go live for $99'}</button>
              <div className="text-[11.5px] text-[#9b8ec4] mt-2 text-center">$99 includes your first <b className="text-[#5c5279]">100 approved leads</b> and your sender. Nothing sources until it lands.</div>
              <button disabled={saving} onClick={() => { setProposed(null); setMatchCount(null) }} className="w-full text-[12.5px] font-semibold text-[#5c5279] mt-2 py-2">Keep adjusting the target</button>
              {error && <div className="mt-3 text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
