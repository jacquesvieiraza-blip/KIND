'use client'

/** V2 — CONVERSATIONAL AGENT SETUP (Casey). LIVE (113a): Casey answers via
 *  /casey/chat, rendering replies in place. Gated /v2. */

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

interface Msg { role: 'assistant' | 'user'; content: string }

const GREETING = "Hey 👋 I'm Casey, your onboarding guide. Let's get your FIGSY ready in a couple of minutes. First up — who do you sell to?"
const MARKETS = ['Nigeria', 'South Africa', 'Kenya', 'Egypt']

export default function ConversationalSetup() {
  const supabase = createClient()
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [messages, thinking])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || thinking) return
    setInput('')

    const userMsg: Msg = { role: 'user', content: msg }
    const next = [...messages, userMsg]
    setMessages(next)
    setThinking(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const history = next.slice(0, -1).map(m => ({ role: m.role, content: m.content })).slice(-10)
      const res = await api.post<{ success: boolean; data: { reply: string } }>(
        '/casey/chat',
        { message: msg, history },
        session?.access_token,
      )
      setMessages(prev => [...prev, { role: 'assistant', content: res.data?.reply || "Sorry, I didn't catch that — could you rephrase?" }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Couldn't connect right now. Try again in a moment — or email hello@get-kind.com." }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 · Conversational Setup (Casey) · live chat
      </div>
      <div className="max-w-2xl mx-auto px-6 py-7 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversational Setup</h1>
          <p className="text-sm text-gray-500 mt-0.5">No forms. Casey just asks, you answer, and your ICP + first campaign are built.</p>
        </div>
        <div className={`${card} overflow-hidden`}>
          {/* Casey identity bar */}
          <div className="px-5 py-4 text-white flex items-center gap-3" style={{ background: BRAND }}>
            <span className="w-9 h-9 rounded-full overflow-hidden bg-white/20 ring-2 ring-white/40">
              <img src="/agents/casey.png" alt="Casey" className="w-full h-full object-cover" />
            </span>
            <div>
              <p className="font-bold">Casey</p>
              <p className="text-[11px] text-white/70 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" /> Onboarding agent · Online
              </p>
            </div>
          </div>

          {/* Live thread */}
          <div ref={threadRef} className="p-5 space-y-3.5 max-h-[420px] overflow-y-auto">
            {messages.map((m, i) => (
              <Bubble key={i} who={m.role === 'user' ? 'me' : 'casey'}>{m.content}</Bubble>
            ))}

            {/* Market quick-chips — only while the conversation is young */}
            {messages.length <= 2 && !thinking && (
              <div className="flex gap-2 flex-wrap pt-1">
                {MARKETS.map(c => (
                  <button
                    key={c}
                    onClick={() => send(`We sell into ${c}.`)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer hover:bg-[#f3eeff] transition-colors"
                    style={{ color: BRAND, borderColor: '#c4b5fd' }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {thinking && (
              <div className="flex items-center gap-1.5 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send() }}
              placeholder="Type your answer…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || thinking}
              className="text-white text-sm font-bold px-4 rounded-lg flex items-center justify-center disabled:opacity-40"
              style={{ background: BRAND }}
            >
              {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Bubble({ who, children }: { who: 'casey' | 'me'; children: React.ReactNode }) {
  const me = who === 'me'
  return (
    <div
      className={`max-w-[80%] px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${me ? 'ml-auto text-white rounded-2xl rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm'}`}
      style={me ? { background: BRAND } : undefined}
    >
      {children}
    </div>
  )
}
