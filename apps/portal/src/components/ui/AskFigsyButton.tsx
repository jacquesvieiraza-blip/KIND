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
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#0066FF] hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-all ${open ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}`}
      >
        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold">Ask FIGSY</span>
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden" style={{ maxHeight: '480px' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#001f4d] to-[#0066FF] shrink-0">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm leading-tight">FIGSY</p>
              <p className="text-white/50 text-[10px]">AI SDR · Always on</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white transition-colors ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>
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
          <div className="px-3 pb-3 pt-2 border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask FIGSY anything…"
                className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="text-[#0066FF] hover:text-blue-700 disabled:text-gray-300 transition-colors"
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
