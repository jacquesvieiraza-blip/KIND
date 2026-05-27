'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function AskFigsyButton() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey! I'm FIGSY, your AI SDR. Ask me anything — best campaign to run next, how to improve your reply rate, or what to say to a warm lead.",
    },
  ])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    // Simulate AI response (replace with actual API call to /figsy/chat)
    await new Promise(r => setTimeout(r, 1200))
    const responses: Record<string, string> = {
      default: "Great question! Based on your current pipeline, I'd recommend focusing on your warmest leads first — they're most likely to convert. Want me to draft an outreach sequence?",
    }
    const key = Object.keys(responses).find(k => userMsg.toLowerCase().includes(k)) ?? 'default'
    setMessages(prev => [...prev, { role: 'assistant', content: responses[key] }])
    setLoading(false)
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-2xl bg-[#0F0929] hover:bg-[#1A0F47] border border-[#7C3AED]/30 shadow-xl shadow-purple-950/40 transition-all ${open ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}`}
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-xl overflow-hidden ring-2 ring-[#7C3AED]/30">
            <img src="/agents/figsy.svg" alt="FIGSY" className="w-full h-full object-cover" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0F0929] animate-pulse" />
        </div>
        <span className="text-sm font-semibold text-white">Ask FIGSY</span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 flex flex-col rounded-2xl shadow-2xl shadow-purple-950/40 border border-white/[0.08] overflow-hidden" style={{ maxHeight: '480px', background: '#0F0929' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 ring-2 ring-[#7C3AED]/25 shadow-sm">
              <img src="/agents/figsy.svg" alt="FIGSY" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm leading-tight">FIGSY</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-purple-300/50 text-[10px]">AI SDR · Always on</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-purple-300/30 hover:text-purple-200 transition-colors p-1 rounded-lg hover:bg-white/[0.06]">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#7C3AED] text-white rounded-br-sm'
                    : 'bg-white/[0.08] text-purple-100 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.08] rounded-xl rounded-bl-sm px-3 py-2.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-300/50" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2 bg-white/[0.06] rounded-xl border border-white/[0.08] px-3 py-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask FIGSY anything…"
                className="flex-1 bg-transparent text-xs text-purple-100 placeholder-purple-300/30 focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="text-[#7C3AED] hover:text-purple-300 disabled:text-purple-300/20 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
