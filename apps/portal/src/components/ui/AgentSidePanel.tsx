'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'

export interface AgentChip {
  label: string
  onClick: () => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  action?: { label: string; href: string; variant?: 'icp' | 'link' }
}

type IcpDraft = {
  name?: string
  industries?: string[]
  job_titles?: string[]
  geographies?: string[]
  company_sizes?: string[]
  seniority_levels?: string[]
  tech_stack?: string[]
  keywords?: string[]
}

const STORAGE_KEY = 'kind_figsy_thread_v1'

interface AgentSidePanelProps {
  agentId: string
  name: string
  role: string
  tagline?: string
  contextMessage: string
  chips: AgentChip[]
  onSend: (msg: string) => void
  inputPlaceholder?: string
  online?: boolean
  liveChat?: boolean
  isNewUser?: boolean
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
  isNewUser = false,
}: AgentSidePanelProps) {
  const supabase = createClient()

  const defaultGreeting = (isNewUser && agentId === 'figsy')
    ? "Hey! I'm FIGSY, your AI SDR. Let me find your first leads — just tell me who you sell to. Describe your ideal customer in one sentence."
    : contextMessage

  const [messages,   setMessages]   = useState<Message[]>([{ role: 'assistant', content: defaultGreeting }])
  const [input,      setInput]      = useState('')
  const [thinking,   setThinking]   = useState(false)
  const [icpDraft,   setIcpDraft]   = useState<IcpDraft>({})
  const [icpSaved,   setIcpSaved]   = useState(false)
  const [onboarding, setOnboarding] = useState(isNewUser && agentId === 'figsy')
  const [hydrated,   setHydrated]   = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  // Load persisted FIGSY thread after mount
  useEffect(() => {
    if (agentId === 'figsy') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed: Message[] = JSON.parse(stored)
          if (parsed.length > 1) {
            setMessages(parsed)
            setOnboarding(false)
          }
        }
      } catch {}
    }
    setHydrated(true)
  }, [agentId])

  // Persist FIGSY thread across navigations
  useEffect(() => {
    if (!hydrated || agentId !== 'figsy') return
    if (messages.length > 1) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-24))) } catch {}
    }
  }, [messages, agentId, hydrated])

  // Auto-scroll to latest message
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages, thinking])

  function mergeIcp(base: IcpDraft, patch: IcpDraft): IcpDraft {
    const uniq = (a?: string[], b?: string[]) => [...new Set([...(a ?? []), ...(b ?? [])])]
    return {
      name:             patch.name             || base.name,
      industries:       uniq(base.industries,       patch.industries),
      job_titles:       uniq(base.job_titles,       patch.job_titles),
      geographies:      uniq(base.geographies,      patch.geographies),
      company_sizes:    uniq(base.company_sizes,    patch.company_sizes),
      seniority_levels: uniq(base.seniority_levels, patch.seniority_levels),
      tech_stack:       uniq(base.tech_stack,       patch.tech_stack),
      keywords:         uniq(base.keywords,         patch.keywords),
    }
  }

  function icpIsReady(d: IcpDraft) {
    return (d.industries?.length ?? 0) > 0
        && (d.job_titles?.length ?? 0) > 0
        && (d.geographies?.length ?? 0) > 0
  }

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || thinking) return
    setInput('')

    if (!liveChat || agentId !== 'figsy') { onSend(msg); return }

    const userMsg: Message = { role: 'user', content: msg }
    const next = [...messages, userMsg]
    setMessages(next)
    setThinking(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (onboarding && !icpSaved) {
        const history = next
          .filter(m => !m.action)
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
          .slice(-10)

        const res = await api.post<{ success: boolean; data: Record<string, unknown> }>(
          '/icps/chat-build',
          { message: msg, history: history.slice(0, -1) },
          token,
        )

        const patch = res.data as IcpDraft & { message?: string }
        const merged = mergeIcp(icpDraft, patch)
        setIcpDraft(merged)

        const ready = icpIsReady(merged)
        const reply  = (patch.message as string) || 'Tell me more about your target market.'
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: ready ? `${reply} I have everything I need.` : reply,
          ...(ready ? { action: { label: 'Build ICP & find my leads →', href: '#create-icp', variant: 'icp' as const } } : {}),
        }])
      } else {
        const res = await api.post<{ success: boolean; data: { reply: string } }>(
          '/figsy/chat',
          { messages: next.slice(-10).map(m => ({ role: m.role, content: m.content })), mode: 'full' },
          token,
        )
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Couldn't connect right now. Try again in a moment.",
      }])
    } finally {
      setThinking(false)
    }
  }

  async function createIcpFromDraft() {
    if (!icpDraft.industries?.length) return
    const { data: { session } } = await supabase.auth.getSession()
    setThinking(true)
    try {
      await api.post('/icps', {
        name:             icpDraft.name || `${icpDraft.job_titles?.[0] ?? 'ICP'} in ${icpDraft.geographies?.[0] ?? 'target market'}`,
        industries:       icpDraft.industries       ?? [],
        job_titles:       icpDraft.job_titles       ?? [],
        seniority_levels: icpDraft.seniority_levels ?? [],
        company_sizes:    icpDraft.company_sizes    ?? [],
        geographies:      icpDraft.geographies      ?? [],
        tech_stack:       icpDraft.tech_stack       ?? [],
        keywords:         icpDraft.keywords         ?? [],
        max_leads:        25,
        consent_required: true,
      }, session?.access_token)

      setIcpSaved(true)
      setOnboarding(false)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "ICP created! I'm searching for your first leads now — head to your leads page to see them appearing.",
        action: { label: 'View my leads →', href: '/dashboard/leads', variant: 'link' as const },
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Couldn't save right now. Try the ICP Builder directly.",
        action: { label: 'Open ICP Builder →', href: '/dashboard/leads/icp', variant: 'link' as const },
      }])
    } finally {
      setThinking(false)
    }
  }

  function clearThread() {
    const greeting = (isNewUser && !icpSaved && agentId === 'figsy')
      ? "Hey! I'm FIGSY, your AI SDR. Let me find your first leads — just tell me who you sell to. Describe your ideal customer in one sentence."
      : contextMessage
    setMessages([{ role: 'assistant', content: greeting }])
    setIcpDraft({})
    setOnboarding(isNewUser && agentId === 'figsy')
    try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-purple-100/30">

      {/* ── Full agent photo ──────────────────────────────────────────── */}
      <div className="relative h-52 bg-[#0F0929]">
        <img
          src={`/agents/${agentId}.png`}
          alt={name}
          className="w-full h-full object-cover object-top"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0929] via-[#0F0929]/10 to-transparent" />
      </div>

      {/* ── Identity + context + actions ─────────────────────────────── */}
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

        {/* Quick action chips */}
        <div className="flex flex-col gap-1.5 mb-3">
          {chips.slice(0, 3).map(chip => (
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
        <div
          ref={threadRef}
          className="flex flex-col gap-2 mb-3 max-h-48 overflow-y-auto pr-0.5"
        >
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-white/[0.10] text-white/80'
              }`}>
                {m.content}
              </div>
              {m.action && (
                m.action.variant === 'icp' ? (
                  <button
                    onClick={createIcpFromDraft}
                    disabled={thinking}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-[#A78BFA] bg-[#7C3AED]/15 hover:bg-[#7C3AED]/25 border border-[#7C3AED]/30 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    {m.action.label}
                  </button>
                ) : (
                  <Link
                    href={m.action.href}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {m.action.label}
                  </Link>
                )
              )}
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

        {/* Input */}
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend() }}
            placeholder={messages.length > 1 ? `Reply to ${name}…` : inputPlaceholder}
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

        {messages.length > 2 && (
          <button
            onClick={clearThread}
            className="text-[10px] text-white/20 hover:text-white/40 transition-colors mt-2 w-full text-center"
          >
            Clear conversation
          </button>
        )}
      </div>
    </div>
  )
}
