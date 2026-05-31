'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, MessageSquare } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
const STORAGE_KEY = 'kind_figsy_page_thread_v1'
const MAX_HISTORY = 30

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const STARTER_PILLS = [
  'Who should I target next?',
  "Why is my reply rate low?",
  'Write a follow-up for a warm lead',
  "What's my best performing campaign?",
]

export default function FigsyChatPage() {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load token
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setToken(session.access_token)
    })
  }, [supabase])

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Message[]
        if (Array.isArray(parsed)) setMessages(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  // Persist to localStorage
  useEffect(() => {
    try {
      const toStore = messages.slice(-MAX_HISTORY)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch { /* ignore */ }
  }, [messages])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string) {
    if (!text.trim() || !token || loading) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const next = [...messages, userMsg].slice(-MAX_HISTORY)
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/figsy/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: next,
          mode: 'full',
        }),
      })
      const json = await res.json()
      const reply: string = json?.data?.reply ?? 'Sorry, I could not generate a response right now.'
      setMessages(prev => [...prev, { role: 'assistant' as const, content: reply }].slice(-MAX_HISTORY))
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong — please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] lg:h-[calc(100vh-32px)] max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-purple-100 shrink-0">
        <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-[#7C3AED]/20 shadow-sm">
          <img
            src="/agents/figsy.png"
            alt="FIGSY"
            className="w-full h-full object-cover object-top"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#1E1152]">FIGSY</h1>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-xs text-[#7C3AED]/60">AI SDR · Your sales agent</p>
        </div>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-8">
            <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-[#7C3AED]/20 shadow-sm">
              <img
                src="/agents/figsy.png"
                alt="FIGSY"
                className="w-full h-full object-cover object-top"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
            </div>
            <div>
              <p className="text-[#1E1152] font-semibold text-lg">Hi, I&apos;m FIGSY</p>
              <p className="text-[#7C3AED]/60 text-sm mt-1">Your AI SDR — ask me anything about your pipeline, campaigns, or target market.</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-[#7C3AED]/20 shrink-0 mt-0.5">
                <img src="/agents/figsy.png" alt="FIGSY" className="w-full h-full object-cover object-top" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#7C3AED] text-white rounded-tr-sm'
                : 'bg-white border border-purple-100 text-[#1E1152] rounded-tl-sm shadow-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-[#7C3AED]/20 shrink-0 mt-0.5">
              <img src="/agents/figsy.png" alt="FIGSY" className="w-full h-full object-cover object-top" />
            </div>
            <div className="bg-white border border-purple-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-[#7C3AED]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 pt-4 border-t border-purple-100">
        {/* Starter pills — only show when no messages */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {STARTER_PILLS.map(pill => (
              <button
                key={pill}
                onClick={() => sendMessage(pill)}
                disabled={!token || loading}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-purple-100 text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white hover:border-[#7C3AED] transition-colors disabled:opacity-40"
              >
                {pill}
              </button>
            ))}
          </div>
        )}

        <div className="relative rounded-2xl border-2 border-purple-200 focus-within:border-[#7C3AED] bg-white shadow-sm transition-colors"
          style={{ background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #7C3AED22, #7C3AED44) border-box' }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask FIGSY anything — best campaign to run next, who to target, how to improve reply rate…"
            rows={3}
            disabled={!token || loading}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-12 text-sm text-[#1E1152] placeholder:text-[#7C3AED]/40 focus:outline-none disabled:opacity-60"
          />
          <div className="absolute bottom-3 right-3">
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || !token || loading}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          {messages.length > 0 && (
            <div className="absolute bottom-3 left-3">
              <button
                onClick={() => {
                  setMessages([])
                  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
                }}
                className="text-[10px] text-[#7C3AED]/40 hover:text-[#7C3AED] transition-colors"
              >
                Clear history
              </button>
            </div>
          )}
        </div>
        <p className="text-[10px] text-[#7C3AED]/40 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
