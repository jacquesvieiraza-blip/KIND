'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// #489 — MILLA CONCIERGE CHAT. Re-uses the EXISTING Milla sessions backend verbatim
// (GET/POST /milla/sessions · GET /sessions/:id/messages · POST /sessions/:id/chat) — no
// new AI plumbing. Just the conversational surface, inside the Milla shell. The old
// virtual_assistant subscription gate is lifted (#489): Milla is included for every client.

type Msg = { id: string; role: 'user' | 'assistant'; content: string }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

const CHIPS = ['Find me leads in a new segment', 'How is my campaign doing?', 'Pause my campaign', 'Show my ROI']
const GREETING: Msg = { id: 'greeting', role: 'assistant', content: "Hi 👋 I'm Milla, your campaign partner. Tell me who you want to reach, ask how things are going, or change direction any time — I'll brief the team and keep you posted." }

export default function MillaChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Get or create the client's Milla session, then load its history.
  const init = useCallback(async () => {
    try {
      const tok = await token()
      const list = await api.get<{ data: { id: string }[] }>('/milla/sessions', tok).catch(() => null)
      let sid = list?.data?.[0]?.id ?? null
      if (!sid) {
        const created = await api.post<{ success: boolean; sessionId: string }>('/milla/sessions', {}, tok).catch(() => null)
        sid = created?.sessionId ?? null
      }
      if (!sid) return
      setSessionId(sid)
      const hist = await api.get<{ data: Msg[] }>(`/milla/sessions/${sid}/messages`, tok).catch(() => null)
      if (hist?.data?.length) setMessages([GREETING, ...hist.data])
    } catch { /* greeting stands; send will re-resolve */ }
  }, [])

  useEffect(() => { init() }, [init])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(text: string) {
    const msg = text.trim()
    if (!msg || sending) return
    setInput(''); setError(null); setSending(true)
    setMessages(m => [...m, { id: `u-${Date.now()}`, role: 'user', content: msg }])
    try {
      const tok = await token()
      let sid = sessionId
      if (!sid) { const c = await api.post<{ sessionId: string }>('/milla/sessions', {}, tok); sid = c.sessionId; setSessionId(sid) }
      const res = await api.post<{ success: boolean; reply: string }>(`/milla/sessions/${sid}/chat`, { message: msg }, tok)
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'assistant', content: res.reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Milla is unavailable right now — please try again')
    } finally { setSending(false) }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-2 shrink-0">
        <h1 className="text-2xl font-bold text-[#1f1235]">Ask Milla</h1>
        <p className="text-sm text-[#7c6f9b] mt-0.5">Your concierge — change direction, ask about performance, or tell us who to target next.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-3">
        <div className="max-w-2xl space-y-3">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white' : 'bg-white border border-[#ece5fb] text-[#1f1235]'
              }`}>{m.content}</div>
            </div>
          ))}
          {sending && <div className="flex justify-start"><div className="bg-white border border-[#ece5fb] rounded-2xl px-4 py-2.5 text-[#9b8ec4] text-[13px]">Milla is thinking…</div></div>}
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
          <div ref={endRef} />
        </div>
      </div>

      <div className="shrink-0 px-6 pb-5 pt-2 border-t border-[#eee7f7] bg-[#fdfcff]">
        <div className="max-w-2xl">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {CHIPS.map(c => (
              <button key={c} onClick={() => send(c)} disabled={sending}
                className="text-[11.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] border border-[#e4d4fb] rounded-full px-3 py-1 hover:bg-[#ebe0fc] disabled:opacity-50">{c}</button>
            ))}
          </div>
          <form onSubmit={e => { e.preventDefault(); send(input) }} className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Milla anything…"
              className="flex-1 text-[13.5px] rounded-xl border border-[#e4dcf7] bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
            <button type="submit" disabled={sending || !input.trim()}
              className="text-[13px] font-bold text-white rounded-xl px-5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">Send</button>
          </form>
        </div>
      </div>
    </div>
  )
}
