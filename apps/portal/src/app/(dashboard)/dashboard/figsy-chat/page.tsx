'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, Zap, Users, Mail, TrendingUp, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
const STORAGE_KEY = 'kind_figsy_page_thread_v1'
const MAX_HISTORY = 30

interface Message { role: 'user' | 'assistant'; content: string }

interface FigsyStats {
  leadCount: number
  emailsSent: number
  replyRate: number
  meetingsBooked: number
}

const STARTER_PILLS = [
  { label: 'Who should I target next?', icon: Users },
  { label: "What's my best campaign?", icon: TrendingUp },
  { label: 'Write a follow-up for a warm lead', icon: Mail },
  { label: "Why is my reply rate low?", icon: MessageSquare },
]

export default function FigsyChatPage() {
  const supabase = createClient()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<FigsyStats>({ leadCount: 0, emailsSent: 0, replyRate: 0, meetingsBooked: 0 })
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      // Derive first name from email
      const email = session.user.email ?? ''
      const name = email.split('@')[0].split('.')[0]
      setUserName(name.charAt(0).toUpperCase() + name.slice(1))
      // Load stats
      fetch(`${API_URL}/figsy/kpis`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
        .then(r => r.json())
        .then(json => {
          if (json?.data) {
            setStats({
              leadCount:      json.data.total_leads      ?? 0,
              emailsSent:     json.data.emails_sent      ?? 0,
              replyRate:      json.data.reply_rate       ?? 0,
              meetingsBooked: json.data.meetings_booked  ?? 0,
            })
          }
        })
        .catch(() => {})
    })
  }, [supabase])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Message[]
        if (Array.isArray(parsed)) setMessages(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)))
    } catch { /* ignore */ }
  }, [messages])

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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: next, mode: 'full' }),
      })
      const json = await res.json()
      const reply: string = json?.data?.reply ?? 'Sorry, something went wrong — try again in a moment.'
      setMessages(prev => [...prev, { role: 'assistant' as const, content: reply }].slice(-MAX_HISTORY))
    } catch {
      setMessages(prev => [...prev, { role: 'assistant' as const, content: 'Connection issue — please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const statCards = [
    { label: 'Leads ready', value: stats.leadCount, icon: Users, color: '#7C3AED' },
    { label: 'Emails sent', value: stats.emailsSent, icon: Mail, color: '#7C3AED' },
    { label: 'Reply rate', value: `${stats.replyRate}%`, icon: TrendingUp, color: '#10B981' },
    { label: 'Meetings booked', value: stats.meetingsBooked, icon: Zap, color: '#F59E0B' },
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start min-h-[calc(100vh-8rem)]">

      {/* ── Left — main conversation ─────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Hero heading */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#1E1152] leading-tight">
            Hello{userName ? `, ${userName}` : ''}
          </h1>
          <p className="text-[#7C3AED]/60 mt-1 text-sm">
            FIGSY · <span className="text-[#7C3AED] font-medium">The Closer</span> · AI SDR · Outbound Sales Specialist
          </p>
        </div>

        {/* Input hero */}
        <div
          className="relative rounded-2xl bg-white shadow-sm mb-4"
          style={{ border: '2px solid transparent', backgroundClip: 'padding-box', backgroundOrigin: 'border-box',
            background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #7C3AED55, #7C3AED22, #7C3AED55) border-box' }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask FIGSY anything — best campaign to run next, who to target, how to improve reply rate…"
            rows={4}
            disabled={!token || loading}
            className="w-full resize-none bg-transparent px-5 pt-4 pb-14 text-sm text-[#1E1152] placeholder:text-[#7C3AED]/40 focus:outline-none disabled:opacity-60"
          />
          <div className="absolute bottom-3 right-3">
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || !token || loading}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Starter pills */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {STARTER_PILLS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => sendMessage(label)}
                disabled={!token || loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-purple-100 text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white hover:border-[#7C3AED] transition-colors shadow-sm disabled:opacity-40"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Conversation thread */}
        {messages.length > 0 && (
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[50vh] pb-4">
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
        )}

        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ } }}
            className="text-[11px] text-[#7C3AED]/40 hover:text-[#7C3AED] transition-colors mt-2 self-start"
          >
            Clear history
          </button>
        )}
      </div>

      {/* ── Right — FIGSY agent card ──────────────────────────────── */}
      <div className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-6 space-y-3">

        {/* Agent photo card */}
        <div className="rounded-2xl overflow-hidden border border-purple-100 shadow-sm bg-white">
          <div className="h-40 overflow-hidden">
            <img
              src="/agents/figsy.png"
              alt="FIGSY"
              className="w-full h-full object-cover object-top"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <div className="bg-[#0F0929] px-4 py-3">
            <div className="flex items-baseline gap-2">
              <p className="text-white font-bold text-base leading-tight">FIGSY</p>
              <span className="text-[#7C3AED] text-xs font-semibold">The Closer</span>
            </div>
            <p className="text-[#9B8EC4] text-xs mt-0.5">AI SDR · Outbound Sales Specialist</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-400 font-medium">Online</span>
            </div>
          </div>
        </div>

        {/* Live stats */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4 space-y-3">
          <p className="text-[11px] font-semibold text-[#7C3AED]/50 uppercase tracking-wider">Live stats</p>
          {statCards.map(s => (
            <div key={s.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
              <span className="text-sm font-bold text-[#1E1152]">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4 space-y-2">
          <p className="text-[11px] font-semibold text-[#7C3AED]/50 uppercase tracking-wider">Quick actions</p>
          {[
            { label: 'View campaigns', href: '/dashboard/figsy' },
            { label: 'Check inbox', href: '/dashboard/inbox' },
            { label: 'See performance', href: '/dashboard/kpis' },
            { label: 'Find more leads', href: '/dashboard/leads' },
          ].map(a => (
            <button
              key={a.label}
              onClick={() => router.push(a.href)}
              className="w-full text-left text-xs text-[#7C3AED] bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-xl px-3 py-2 transition-colors"
            >
              {a.label} →
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
