'use client'

// R3 (V2-11): Vida in-portal help bubble. A floating assistant that answers
// the client's "how do I…" questions about using K.I.N.D. Talks to POST
// /vida/help (stateless Q&A). Purely additive — sits fixed bottom-right and
// touches nothing else on the page.

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { VoiceControls } from '@/components/ui/VoiceControls'

type Msg = { role: 'user' | 'assistant'; content: string }

const GREETING: Msg = {
  role: 'assistant',
  content: "Hi, I'm Vida 👋 Ask me anything about using K.I.N.D — setting up your ICP, launching FIGSY, reading replies, billing… I'm here to help.",
}

export function VidaHelpBubble() {
  const supabase = createClient()
  const [open, setOpen]       = useState(false)
  const [input, setInput]     = useState('')
  const [sending, setSending] = useState(false)
  const [msgs, setMsgs]       = useState<Msg[]>([GREETING])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, open, sending])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    const nextMsgs = [...msgs, { role: 'user' as const, content: text }]
    setMsgs(nextMsgs)
    setSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      // Send the recent turns (excluding the canned greeting) as context.
      const history = nextMsgs.slice(1, -1).slice(-10)
      const res = await api.post<{ data: { reply: string } }>(
        '/vida/help',
        { message: text, history },
        session?.access_token,
      )
      setMsgs(m => [...m, { role: 'assistant', content: res.data.reply }])
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: "I hit a snag reaching the server. Please try again, or email hello@get-kind.com." }])
    }
    setSending(false)
  }

  // Voice ("speak") affordance (#178). The mic is a SHELL until the Vapi key
  // lands — until then a tap surfaces a "coming soon" note and keeps the user
  // in the working text chat below (the fallback). No mic is ever faked.
  function handleVoiceUnavailable() {
    setMsgs(m => [...m, {
      role: 'assistant',
      content: "Voice chat is coming soon 🎙️ — for now, just type your question below and I'll help right away.",
    }])
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close help' : 'Open help — ask Vida'}
        className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-purple-500/30 transition-all hover:scale-105"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex flex-col w-[min(92vw,22rem)] h-[min(70vh,32rem)] rounded-2xl bg-white border border-purple-100 shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-[#7C3AED] text-white shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">V</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Vida</p>
              <p className="text-[11px] text-white/70 leading-tight">Your K.I.N.D help assistant</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-[#FAFAFE]">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[#7C3AED] text-white rounded-br-sm'
                    : 'bg-white border border-purple-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl bg-white border border-purple-100 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          <div className="p-2.5 border-t border-purple-100 bg-white shrink-0">
            {/* Voice ("speak") affordance — SHELL; text below stays the fallback (#178) */}
            <div className="mb-2">
              <VoiceControls onUnavailable={handleVoiceUnavailable} />
            </div>
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                rows={1}
                placeholder="Ask Vida anything…"
                className="flex-1 resize-none max-h-24 px-3 py-2 text-sm rounded-xl border border-purple-100 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                aria-label="Send"
                className="shrink-0 w-9 h-9 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
