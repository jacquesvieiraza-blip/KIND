'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import MarkdownLite from '@/components/MarkdownLite'

export interface AgentChip {
  label: string
  onClick: () => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  action?: { label: string; href: string; variant?: 'icp' | 'link' }
  typing?: boolean
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

interface AgentSidePanelProps {
  agentId: string
  name: string
  subtitle?: string
  role: string
  tagline?: string
  contextMessage: string
  chips: AgentChip[]
  onSend: (msg: string) => void
  inputPlaceholder?: string
  online?: boolean
  liveChat?: boolean
  /**
   * If set, the panel holds a live in-place conversation against this endpoint
   * instead of navigating away (113a). Contract: POST { message, history } →
   * { success, data: { reply } }. FIGSY keeps its own ICP-onboarding path and
   * ignores this. When unset (and not FIGSY), the panel falls back to onSend().
   */
  liveChatEndpoint?: string
  isNewUser?: boolean
}

export function AgentSidePanel({
  agentId,
  name,
  subtitle,
  role,
  tagline,
  contextMessage,
  chips,
  onSend,
  inputPlaceholder = 'Ask anything…',
  online = true,
  liveChat = true,
  liveChatEndpoint,
  isNewUser = false,
}: AgentSidePanelProps) {
  const supabase = createClient()

  const getGreeting = () =>
    isNewUser && agentId === 'figsy'
      ? "Hey! I'm FIGSY, your AI SDR. Let me find your first leads — just tell me who you sell to. Describe your ideal customer in one sentence."
      : contextMessage

  const [messages,   setMessages]   = useState<Message[]>([{ role: 'assistant', content: getGreeting(), typing: true }])
  const [input,      setInput]      = useState('')
  const [thinking,   setThinking]   = useState(false)
  const [icpDraft,   setIcpDraft]   = useState<IcpDraft>({})
  const [icpSaved,   setIcpSaved]   = useState(false)
  const [onboarding, setOnboarding] = useState(isNewUser && agentId === 'figsy')
  const [shownChars, setShownChars] = useState(0)
  const threadRef = useRef<HTMLDivElement>(null)

  // Typewriter effect on the first message — slower, more natural
  useEffect(() => {
    const full = getGreeting()
    if (shownChars >= full.length) return
    const t = setTimeout(() => setShownChars(n => Math.min(n + 2, full.length)), 28)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownChars])

  // Reset context when navigating to a different page
  useEffect(() => {
    setMessages([{ role: 'assistant', content: getGreeting(), typing: true }])
    setShownChars(0)
    setIcpDraft({})
    setOnboarding(isNewUser && agentId === 'figsy')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextMessage])

  // Auto-scroll
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [messages, thinking, shownChars])

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

    const isFigsyLive = liveChat && agentId === 'figsy'
    // No live path available → fall back to the legacy navigate-away behaviour.
    if (!isFigsyLive && !liveChatEndpoint) { onSend(msg); return }

    const userMsg: Message = { role: 'user', content: msg }
    const next = [...messages.map(m => ({ role: m.role, content: m.content })), userMsg]
    setMessages(prev => [...prev, userMsg])
    setThinking(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // ── Milla / Vida / Denise / Casey — generic stateless in-panel chat (113a)
      if (!isFigsyLive) {
        const history = next
          .slice(0, -1)
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
          .slice(-10)
        const res = await api.post<{ success: boolean; data: { reply: string } }>(
          liveChatEndpoint!,
          { message: msg, history },
          token,
        )
        setMessages(prev => [...prev, { role: 'assistant', content: res.data?.reply || "Sorry, I didn't catch that — could you rephrase?" }])
        return
      }

      if (onboarding && !icpSaved) {
        const history = next
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
          { messages: next.slice(-10), mode: 'full' },
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
        max_leads: 25,
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

  const greeting = getGreeting()
  const displayedFirst = shownChars < greeting.length ? greeting.slice(0, shownChars) : greeting

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-purple-100/40 bg-white">

      {/* ── Full agent photo — no dark overlay ───────────────────── */}
      <div className="relative h-60 overflow-hidden bg-purple-50">
        <img
          src={`/agents/${agentId}.png`}
          alt={name}
          className="w-full h-[calc(100%+24px)] object-cover object-top agent-img-float"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      {/* ── Identity bar ─────────────────────────────────────────── */}
      <div className="bg-[#0F0929] px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <p className="text-white font-bold text-base leading-tight">{name}</p>
            {subtitle && <span className="text-[#7C3AED] text-xs font-semibold">{subtitle}</span>}
          </div>
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

      {/* ── Content — white background ────────────────────────────── */}
      <div className="bg-white px-4 pt-3 pb-4">

        {/* Quick action chips */}
        <div className="flex flex-col gap-1.5 mb-3">
          {chips.slice(0, 3).map(chip => (
            <button
              key={chip.label}
              onClick={chip.onClick}
              className="w-full text-left text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-full px-3 py-1.5 transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Conversation thread */}
        <div
          ref={threadRef}
          className="flex flex-col gap-2 mb-3 max-h-48 overflow-y-auto bg-[#FAFAFA] rounded-xl border border-purple-100/40 p-2"
        >
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`flex gap-1.5 w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 mt-0.5 border border-purple-100">
                    <img src={`/agents/${agentId}.png`} alt="" className="w-full h-full object-cover object-top" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#7C3AED] text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm border border-purple-100/60 shadow-sm'
                }`}>
                  {i === 0 && m.role === 'assistant' && m.typing
                    ? <>{displayedFirst}{shownChars < greeting.length && <span className="inline-block w-0.5 h-3 bg-purple-300 animate-pulse ml-0.5 align-middle" />}</>
                    : m.role === 'assistant'
                      ? <MarkdownLite content={m.content} />
                      : m.content
                  }
                </div>
              </div>
              {m.action && (
                m.action.variant === 'icp' ? (
                  <button
                    onClick={createIcpFromDraft}
                    disabled={thinking}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7C3AED] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    {m.action.label}
                  </button>
                ) : (
                  <Link
                    href={m.action.href}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {m.action.label}
                  </Link>
                )
              )}
            </div>
          ))}
          {thinking && (
            <div className="flex items-start gap-1.5">
              <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 mt-0.5 border border-purple-100">
                <img src={`/agents/${agentId}.png`} alt="" className="w-full h-full object-cover object-top" />
              </div>
              <div className="bg-white rounded-xl rounded-bl-sm px-2.5 py-1.5 border border-purple-100/60 shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-bounce" style={{ animationDelay: '300ms' }} />
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
            className="flex-1 text-xs bg-gray-50 border border-purple-100/60 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
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
            onClick={() => {
              setMessages([{ role: 'assistant', content: getGreeting(), typing: true }])
              setShownChars(0)
              setIcpDraft({})
            }}
            className="text-[10px] text-gray-300 hover:text-gray-500 transition-colors mt-2 w-full text-center"
          >
            Clear conversation
          </button>
        )}
      </div>
    </div>
  )
}
