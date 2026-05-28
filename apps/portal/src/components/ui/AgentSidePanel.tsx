'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'

export interface AgentChip {
  label: string
  onClick: () => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AgentSidePanelProps {
  agentId: string
  name: string
  role: string
  tagline?: string
  contextMessage: string
  chips: AgentChip[]
  onSend: (msg: string) => void  // fallback for non-FIGSY agents
  inputPlaceholder?: string
  online?: boolean
  liveChat?: boolean  // enable AI conversation (FIGSY only)
}

export function AgentSidePanel({
  agentId,
  name,
  role,
  tagline,
  contextMessage,
  chips,
  onSend,
  inputPlaceholder = 'Ask anything…',
  online = true,
  liveChat = true,
}: AgentSidePanelProps) {
  const supabase = createClient()
  const [input, setInput]       = useState('')
  const [thinking, setThinking] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const threadRef               = useRef<HTMLDivElement>(null)

  // Auto-scroll thread to bottom on new message
  useEffect(() => {
    if (threadRef.current && messages.length > 0) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages, thinking])

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || thinking) return
    setInput('')

    if (!liveChat || agentId !== 'figsy') {
      onSend(msg)
      return
    }

    // ── Live AI chat ─────────────────────────────────────────────────────────
    const userMsg: Message = { role: 'user', content: msg }
    const next = [...messages, userMsg]
    setMessages(next)
    setThinking(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.post<{ success: boolean; data: { reply: string } }>(
        '/figsy/chat',
        { messages: next.slice(-10), mode: 'full' },
        session?.access_token,
      )
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I couldn't connect right now. Try again in a moment." }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-purple-100/30">

      {/* Agent photo */}
      <div className="relative h-56 bg-[#0F0929]">
        <img
          src={`/agents/${agentId}.png`}
          alt={name}
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0929] via-[#0F0929]/20 to-transparent" />
      </div>

      {/* Identity + context + actions */}
      <div className="bg-[#0F0929] px-4 pt-3 pb-4">

        {/* Name + status */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white font-bold text-base leading-tight">{name}</p>
            <p className="text-[#9B8EC4] text-xs mt-0.5">
              {role}{tagline ? ` · ${tagline}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className={`text-[11px] font-medium ${online ? 'text-emerald-400' : 'text-slate-400'}`}>
              {online ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Context message — shown when no conversation yet */}
        {messages.length === 0 && (
          <p className="text-white/70 text-xs leading-relaxed mb-3">{contextMessage}</p>
        )}

        {/* Quick action chips — always visible */}
        <div className="flex flex-col gap-1.5 mb-3">
          {chips.map(chip => (
            <button
              key={chip.label}
              onClick={chip.onClick}
              className="w-full text-left text-xs text-[#C4B5FD] bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-lg px-3 py-2 transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Conversation thread */}
        {messages.length > 0 && (
          <div
            ref={threadRef}
            className="flex flex-col gap-2 mb-3 max-h-48 overflow-y-auto pr-0.5"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#7C3AED] text-white'
                    : 'bg-white/[0.10] text-white/80'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-white/[0.10] rounded-xl px-3 py-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
            placeholder={messages.length > 0 ? 'Reply to FIGSY…' : inputPlaceholder}
            className="flex-1 text-xs bg-white/[0.08] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-purple-400/50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || thinking}
            className="w-8 h-8 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors shrink-0"
          >
            {thinking
              ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              : <Send className="w-3.5 h-3.5 text-white" />
            }
          </button>
        </div>

        {/* Clear thread */}
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-[10px] text-white/20 hover:text-white/40 transition-colors mt-2 w-full text-center"
          >
            Clear conversation
          </button>
        )}

      </div>
    </div>
  )
}
