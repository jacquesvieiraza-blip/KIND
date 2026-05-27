'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send, Loader2 } from 'lucide-react'

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
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-2xl bg-white hover:bg-[#f4f8ff] border border-[#ddeaff] shadow-lg shadow-blue-100/60 transition-all ${open ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}`}
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-xl overflow-hidden ring-2 ring-[#0066FF]/20">
            <img src="/agents/figsy.svg" alt="FIGSY" className="w-full h-full object-cover" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white animate-pulse" />
        </div>
        <span className="text-sm font-semibold text-[#0d1f4c]">Ask FIGSY</span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden" style={{ maxHeight: '480px' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#eef2ff] shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 ring-2 ring-[#0066FF]/15 shadow-sm">
              <img src="/agents/figsy.svg" alt="FIGSY" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="text-[#0d1f4c] font-bold text-sm leading-tight">FIGSY</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <p className="text-slate-400 text-[10px]">AI SDR · Always on</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-slate-500 transition-colors p-1 rounded-lg hover:bg-slate-50">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#0066FF] text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-700 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl rounded-bl-sm px-3 py-2.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-[#eef2ff] shrink-0">
            <div className="flex items-center gap-2 bg-[#f4f8ff] rounded-xl border border-[#ddeaff] px-3 py-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask FIGSY anything…"
                className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="text-[#0066FF] hover:text-blue-700 disabled:text-slate-300 transition-colors"
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
