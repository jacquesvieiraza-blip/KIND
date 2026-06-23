'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Mail, Loader2, Inbox, Flame, Sun, Snowflake, Ban, UserX,
  Plane, HelpCircle, Send, Sparkles, CheckCircle, RefreshCw, Calendar,
  BellOff, GitBranch, Search, Linkedin, Reply as ReplyIcon, Archive,
  Tag, X,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────
type Classification =
  | 'hot' | 'warm' | 'cold'
  | 'opt_out' | 'unsubscribe' | 'wrong_person' | 'referral' | 'out_of_office' | 'other'
  | 'interested' | 'not_interested'
  | 'sent_reply'

interface Reply {
  id: string
  from_email: string
  from_name: string | null
  subject: string | null
  body_text: string | null
  body: string | null
  classification: Classification
  received_at: string | null
  processed_at: string | null
  campaign_id: string | null
  lead_id?: string | null
  leads?: {
    id?: string
    first_name: string
    last_name: string
    job_title: string | null
    company: string | null
    linkedin_url?: string | null
  } | null
}

// Channel is derived (no dedicated column on figsy_replies yet — TODO below).
type Channel = 'email' | 'linkedin'

// ── Classification config ────────────────────────────────────────────
type ClassDef = {
  label: string
  emoji: string
  bg: string
  text: string
  border: string
  dot: string
  icon: React.ElementType
  priority: number
}

const CLASS_CONFIG: Record<string, ClassDef> = {
  hot:           { label: 'Hot',          emoji: '🔥', bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',   dot: 'bg-rose-500',   icon: Flame,       priority: 1 },
  interested:    { label: 'Positive',     emoji: '🔥', bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  dot: 'bg-green-500',  icon: Flame,       priority: 1 },
  warm:          { label: 'Warm',         emoji: '🌤️', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-400',  icon: Sun,         priority: 2 },
  cold:          { label: 'Cold',         emoji: '❄️',  bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200',   dot: 'bg-gray-400',   icon: Snowflake,   priority: 4 },
  not_interested:{ label: 'Cold',         emoji: '❄️',  bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200',   dot: 'bg-gray-400',   icon: Snowflake,   priority: 4 },
  opt_out:       { label: 'Opted Out',    emoji: '🚫', bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',   dot: 'bg-rose-500',   icon: Ban,         priority: 5 },
  unsubscribe:   { label: 'Unsubscribe',  emoji: '🔕', bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',   dot: 'bg-rose-400',   icon: BellOff,     priority: 5 },
  wrong_person:  { label: 'Wrong Person', emoji: '👤', bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200',   dot: 'bg-gray-400',   icon: UserX,       priority: 6 },
  referral:      { label: 'Referral',     emoji: '🔀', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-400',  icon: GitBranch,   priority: 3 },
  out_of_office: { label: 'Out of Office',emoji: '✈️',  bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200',   dot: 'bg-gray-400',   icon: Plane,       priority: 7 },
  other:         { label: 'Other',        emoji: '❓', bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200',   dot: 'bg-gray-400',   icon: HelpCircle,  priority: 8 },
  sent_reply:    { label: 'Replied',      emoji: '✓',  bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200', dot: 'bg-purple-400', icon: CheckCircle, priority: 9 },
}

const fallbackCfg: ClassDef = CLASS_CONFIG.other
function getCfg(c: string): ClassDef { return CLASS_CONFIG[c] ?? fallbackCfg }

// Avatar colour rotation (brand-leaning, deterministic per contact)
const AV_COLORS = ['#7C3AED', '#6D28D9', '#9333ea', '#a855f7', '#8b5cf6', '#7e22ce']
function avColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AV_COLORS[h % AV_COLORS.length]
}

// ── Label folders (left of list) ─────────────────────────────────────
const FOLDERS: { value: string; label: string; icon: React.ElementType }[] = [
  { value: 'all',         label: 'All',      icon: Inbox },
  { value: 'unread',      label: 'Unread',   icon: Flame },
  { value: 'replied',     label: 'Replied',  icon: ReplyIcon },
  { value: 'archived',    label: 'Archived', icon: Archive },
]

// Tag chips — driven off the real classification taxonomy.
const TAGS: { value: string; label: string; color: string }[] = [
  { value: 'booked',        label: 'Meeting Booked', color: '#1e8e3e' },
  { value: 'interested',    label: 'Positive',       color: '#7C3AED' },
  { value: 'hot',           label: '🔥 Hot',         color: '#d93025' },
  { value: 'warm',          label: 'Nurturing',      color: '#9333ea' },
  { value: 'needs_reply',   label: 'Reply Needed',   color: '#b06000' },
  { value: 'out_of_office', label: 'Out of Office',  color: '#80868b' },
]

// Channel filter chips
const CHANNELS: { value: 'all' | Channel; label: string; color: string }[] = [
  { value: 'all',      label: 'All',      color: '#7C3AED' },
  { value: 'email',    label: 'Email',    color: '#ea4335' },
  { value: 'linkedin', label: 'LinkedIn', color: '#0a66c2' },
]

// ── Helpers ───────────────────────────────────────────────────────────
function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function getInitials(reply: Reply): string {
  const name = reply.from_name?.trim()
  if (name) {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    if (parts[0]) return parts[0][0].toUpperCase()
  }
  return ((reply.from_email || '')[0] || '?').toUpperCase()
}

function getDisplayName(reply: Reply): string {
  if (reply.leads) return `${reply.leads.first_name} ${reply.leads.last_name}`
  if (reply.from_name) return reply.from_name
  return reply.from_email
}

function getBody(reply: Reply): string {
  return reply.body_text ?? reply.body ?? ''
}

// Channel is DERIVED for now: a lead with a linkedin_url and no email-shaped
// from_email is treated as a LinkedIn conversation. There is no channel column
// on figsy_replies yet — see TODO. This keeps the multi-channel UI honest
// against real data rather than faking a WhatsApp/IG feed.
function getChannel(reply: Reply): Channel {
  const looksLikeEmail = /@/.test(reply.from_email || '')
  if (!looksLikeEmail && reply.leads?.linkedin_url) return 'linkedin'
  return 'email'
}

const NEEDS_REPLY_CLASSES = new Set(['hot', 'warm', 'interested'])
const UNREAD_CLASSES = new Set(['hot', 'warm', 'interested'])

function generateClientDraft(reply: Reply): string {
  const name  = reply.from_name ?? reply.from_email.split('@')[0]
  const body  = getBody(reply).slice(0, 400)
  const lower = body.toLowerCase()

  if (lower.includes('meeting') || lower.includes('call') || lower.includes('chat')) {
    return `Hi ${name},\n\nThanks for getting back to me — happy to jump on a call!\n\nWould you be available for a quick 20-minute chat this week? Feel free to grab time on my calendar or let me know what works for you.\n\nLooking forward to connecting.\n\nBest,`
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('pricing')) {
    return `Hi ${name},\n\nThanks for your interest!\n\nI'd love to walk you through our pricing and find the best fit for your needs. It really depends on the scale you're looking at — can we set up a quick call to discuss?\n\nBest,`
  }
  if (lower.includes('demo') || lower.includes('show me') || lower.includes('how does')) {
    return `Hi ${name},\n\nGreat to hear from you! I'd be happy to run you through a demo.\n\nI'll send over a short overview shortly, and we can schedule a live walkthrough to show you exactly how it works for your use case.\n\nLooking forward to it!\n\nBest,`
  }
  return `Hi ${name},\n\nThank you for getting back to me — really appreciate it!\n\nI'd love to continue the conversation and learn more about what you're looking for. Would you be open to a quick call this week so we can explore how we might be able to help?\n\nLooking forward to hearing from you.\n\nBest,`
}

// ── Channel chip (tiny coloured square, Gmail-style) ─────────────────
function ChannelChip({ channel, className = '' }: { channel: Channel; className?: string }) {
  if (channel === 'linkedin') {
    return (
      <span className={`inline-grid place-items-center rounded-[4px] bg-[#0a66c2] text-white shrink-0 ${className}`} title="LinkedIn">
        <Linkedin className="w-2.5 h-2.5" strokeWidth={2.5} />
      </span>
    )
  }
  return (
    <span className={`inline-grid place-items-center rounded-[4px] bg-[#ea4335] text-white shrink-0 ${className}`} title="Email">
      <Mail className="w-2.5 h-2.5" strokeWidth={2.5} />
    </span>
  )
}

// ── Col 5: context card (ICP-fit + "FIGSY says") ─────────────────────
function ContextCard({ reply }: { reply: Reply }) {
  const lead = reply.leads
  const cfg = getCfg(reply.classification)
  const channel = getChannel(reply)
  const displayName = getDisplayName(reply)

  return (
    <aside className="hidden 2xl:flex w-[280px] shrink-0 border-l border-purple-100/60 bg-white/60 backdrop-blur-sm flex-col overflow-y-auto px-[18px] py-5">
      {/* header */}
      <div className="text-center pb-4 border-b border-purple-100/60">
        <div
          className="w-[60px] h-[60px] rounded-full grid place-items-center text-white text-xl font-semibold mx-auto mb-2.5"
          style={{ background: avColor(displayName) }}
        >
          {getInitials(reply)}
        </div>
        <div className="font-semibold text-[15px] text-[#0F0929]">{displayName}</div>
        {lead?.job_title && <div className="text-[12.5px] text-[#7B6FA0] mt-0.5">{lead.job_title}</div>}
        {lead?.company && <div className="text-[12.5px] text-[#6D28D9] font-semibold mt-0.5">{lead.company}</div>}
      </div>

      {/* score row — ICP fit has no backing data on this endpoint (TODO). */}
      <div className="flex gap-2 my-4 text-center">
        <div className="flex-1 bg-white/70 border border-purple-100/60 rounded-[11px] py-2.5 px-1.5">
          {/* TODO: figsy_replies/leads(...) on /replies/all does not return `score`.
              Wire a real ICP-fit score here once the endpoint includes it. */}
          <div className="text-[19px] font-bold text-[#9B8EC4]">—</div>
          <div className="text-[10.5px] text-[#9B8EC4] uppercase tracking-wide mt-0.5">ICP fit</div>
        </div>
        <div className="flex-1 bg-white/70 border border-purple-100/60 rounded-[11px] py-2.5 px-1.5">
          <div className={`text-[19px] font-bold ${cfg.text}`}>{cfg.emoji}</div>
          <div className="text-[10.5px] text-[#9B8EC4] uppercase tracking-wide mt-0.5">{cfg.label}</div>
        </div>
        <div className="flex-1 bg-white/70 border border-purple-100/60 rounded-[11px] py-2.5 px-1.5">
          <div className="text-[19px] font-bold text-[#0F0929] capitalize">{channel === 'linkedin' ? 'IN' : '@'}</div>
          <div className="text-[10.5px] text-[#9B8EC4] uppercase tracking-wide mt-0.5">Channel</div>
        </div>
      </div>

      {/* lead details */}
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#9B8EC4] mt-2 mb-2">Lead details</div>
      <div className="flex justify-between text-[12.5px] py-1.5 border-b border-purple-100/40">
        <span className="text-[#9B8EC4]">Channel</span>
        <span className="text-[#3c4043] font-medium capitalize">{channel}</span>
      </div>
      <div className="flex justify-between text-[12.5px] py-1.5 border-b border-purple-100/40">
        <span className="text-[#9B8EC4]">Email</span>
        <span className="text-[#3c4043] font-medium truncate ml-3 max-w-[150px]">{reply.from_email}</span>
      </div>
      {lead?.company && (
        <div className="flex justify-between text-[12.5px] py-1.5 border-b border-purple-100/40">
          <span className="text-[#9B8EC4]">Company</span>
          <span className="text-[#3c4043] font-medium text-right">{lead.company}</span>
        </div>
      )}
      <div className="flex justify-between text-[12.5px] py-1.5 border-b border-purple-100/40">
        <span className="text-[#9B8EC4]">Status</span>
        <span className={`font-medium text-right ${cfg.text}`}>{cfg.emoji} {cfg.label}</span>
      </div>
      {lead?.linkedin_url && (
        <a
          href={lead.linkedin_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[12.5px] text-[#0a66c2] font-medium mt-3 hover:underline"
        >
          <Linkedin className="w-3.5 h-3.5" /> View LinkedIn profile
        </a>
      )}

      {/* FIGSY says */}
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#9B8EC4] mt-5 mb-2">FIGSY says</div>
      <div className="rounded-[13px] border border-purple-100 bg-gradient-to-br from-[#faf5ff] to-[#f5f3ff] p-[13px]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#6D28D9] mb-2">
          <span className="w-[22px] h-[22px] rounded-full bg-[#7C3AED] text-white grid place-items-center text-[10px] font-bold">F</span>
          FIGSY · The Opener
        </div>
        <p className="text-[12.5px] text-[#3c4043] leading-relaxed">
          {NEEDS_REPLY_CLASSES.has(reply.classification)
            ? `${reply.leads?.first_name ?? displayName} replied with a positive signal — a strong moment to respond. Use "Help me reply" to draft a warm follow-up in your voice, then send.`
            : reply.classification === 'sent_reply'
              ? `You've already replied to ${reply.leads?.first_name ?? displayName}. FIGSY will keep the sequence warm and flag any new reply here.`
              : `This conversation is classified ${cfg.label.toLowerCase()}. FIGSY is monitoring and will surface the next best action when the signal changes.`}
        </p>
      </div>
    </aside>
  )
}

// ── Col 4: thread view + composer ────────────────────────────────────
function ThreadView({ reply, token }: { reply: Reply; token: string }) {
  const cfg = getCfg(reply.classification)
  const lead = reply.leads
  const channel = getChannel(reply)
  const displayName = getDisplayName(reply)

  const [draft, setDraft]         = useState<string | null>(null)
  const [drafting, setDrafting]   = useState(false)
  const [sending, setSending]     = useState(false)
  const [sentOk, setSentOk]       = useState(false)
  const [sendError, setSendError] = useState('')
  const [booked, setBooked]       = useState(false)
  const [booking, setBooking]     = useState(false)
  const [prep, setPrep]           = useState<string | null>(null)   // R14 meeting-prep brief
  const [prepping, setPrepping]   = useState(false)
  const [prepErr, setPrepErr]     = useState('')

  // Reset state whenever the selected reply changes
  useEffect(() => {
    setPrep(null); setPrepping(false); setPrepErr('')
    setDraft(null); setDrafting(false)
    setSending(false); setSentOk(false); setSendError('')
    setBooked(false); setBooking(false)
  }, [reply.id])

  async function handleAIDraft() {
    setDrafting(true)
    try {
      // R7: real context-aware AI draft from the prospect's actual message.
      const res = await api.post<{ data?: { draft?: string } }>(
        `/figsy/replies/${reply.id}/ai-draft`, {}, token
      )
      if (res.data?.draft) { setDraft(res.data.draft); setDrafting(false); return }
      setDraft(generateClientDraft(reply))   // fallback keyword template
    } catch {
      setDraft(generateClientDraft(reply))   // never leave the user empty-handed
    }
    setDrafting(false)
  }

  async function handleSend() {
    if (!draft?.trim()) return
    setSending(true); setSendError('')
    try {
      await api.post(`/figsy/replies/${reply.id}/send-reply`, { body: draft }, token)
      setSentOk(true); setDraft(null)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send reply — please try again.')
    }
    setSending(false)
  }

  // R14 (#54) — Denise preps the human for the booked meeting.
  async function handleMeetingPrep() {
    setPrepping(true); setPrepErr('')
    try {
      const res = await api.post<{ brief: string }>(`/denise/meeting-prep`, { reply_id: reply.id }, token)
      setPrep(res.brief)
    } catch (err) {
      setPrepErr(err instanceof Error ? err.message : 'Could not prepare the brief — Denise may not be active on your plan.')
    }
    setPrepping(false)
  }

  async function handleMarkBooked() {
    setBooking(true)
    try {
      await api.post(`/figsy/replies/${reply.id}/mark-booked`, {}, token)
      setBooked(true)
    } catch { /* ignore */ }
    setBooking(false)
  }

  const body = getBody(reply)
  const isHot = reply.classification === 'hot' || reply.classification === 'interested'
  const composerLocked =
    reply.classification === 'sent_reply' || reply.classification === 'opt_out' ||
    reply.classification === 'unsubscribe' || reply.classification === 'out_of_office' ||
    reply.classification === 'wrong_person'

  return (
    <section className="flex-1 min-w-0 flex flex-col bg-white/40">

      {/* ── thread header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-[15px] border-b border-purple-100/60 bg-white/70">
        <div
          className="w-[42px] h-[42px] rounded-full grid place-items-center text-white font-semibold shrink-0"
          style={{ background: avColor(displayName) }}
        >
          {getInitials(reply)}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-[16px] text-[#0F0929] truncate">{displayName}</div>
          <div className="text-[12.5px] text-[#7B6FA0] flex items-center gap-2 mt-0.5">
            <ChannelChip channel={channel} className="w-[15px] h-[15px]" />
            <span className="truncate">
              {[lead?.job_title, lead?.company].filter(Boolean).join(' · ') || reply.from_email}
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.emoji} {cfg.label}
          </div>
        </div>
      </div>

      {/* ── thread body ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-[#fafbfc]/60">

        {/* prospect inbound message bubble */}
        <div className="flex gap-3 max-w-[80%]">
          <div
            className="w-[30px] h-[30px] rounded-full grid place-items-center text-white text-[11px] font-semibold shrink-0"
            style={{ background: avColor(displayName) }}
          >
            {getInitials(reply)}
          </div>
          <div className="min-w-0">
            {reply.subject && (
              <p className="text-[11px] font-semibold text-[#9B8EC4] uppercase tracking-wider mb-1">{reply.subject}</p>
            )}
            <div className="bg-white border border-purple-100/70 rounded-[4px_16px_16px_16px] px-4 py-3 text-[13.5px] text-[#3c4043] leading-relaxed whitespace-pre-wrap shadow-sm">
              {body || <span className="italic text-[#9B8EC4]">No message body.</span>}
            </div>
            <div className="text-[11px] text-[#9B8EC4] mt-1.5 flex items-center gap-1.5">
              {timeAgo(reply.received_at ?? reply.processed_at)} · via {channel === 'linkedin' ? 'LinkedIn' : 'Email'}
            </div>
          </div>
        </div>

        {/* sent confirmation bubble (when reply was just sent or already replied) */}
        {(sentOk || reply.classification === 'sent_reply') && (
          <div className="flex gap-3 max-w-[80%] ml-auto flex-row-reverse">
            <div className="w-[30px] h-[30px] rounded-full grid place-items-center text-white text-[11px] font-semibold shrink-0 bg-[#7C3AED]">F</div>
            <div>
              <div className="bg-[#F5F0FF] border border-purple-100 rounded-[16px_4px_16px_16px] px-4 py-3 text-[13.5px] text-[#3b2566] leading-relaxed shadow-sm">
                ✓ Reply sent to {reply.from_email}.
              </div>
              <div className="text-[11px] text-[#9B8EC4] mt-1.5 text-right">FIGSY · delivered</div>
            </div>
          </div>
        )}

        {/* status notices (carry over the real classification semantics) */}
        {(reply.classification === 'opt_out' || reply.classification === 'unsubscribe') && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 max-w-2xl">
            <Ban className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-rose-700">Contact opted out</p>
              <p className="text-xs text-rose-500 mt-0.5">Permanently suppressed across all K.I.N.D campaigns.</p>
            </div>
          </div>
        )}
        {reply.classification === 'referral' && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 max-w-2xl">
            <GitBranch className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700">Referral — new contact mentioned</p>
              <p className="text-xs text-amber-600 mt-0.5">This contact referred someone else. Review the reply and add the new contact as a lead.</p>
            </div>
          </div>
        )}
        {reply.classification === 'out_of_office' && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 max-w-2xl">
            <Plane className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Out of office</p>
              <p className="text-xs text-gray-500 mt-0.5">FIGSY will pick up the sequence automatically when they return.</p>
            </div>
          </div>
        )}
        {reply.classification === 'wrong_person' && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 max-w-2xl">
            <UserX className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Wrong contact</p>
              <p className="text-xs text-gray-500 mt-0.5">Reject this lead or find the correct decision-maker.</p>
            </div>
          </div>
        )}

        {/* R14 — Denise meeting-prep brief */}
        {prep && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-amber-900">Denise prepped you for this meeting</h3>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{prep}</div>
          </div>
        )}
      </div>

      {/* ── composer ──────────────────────────────────────────────── */}
      {!composerLocked && !sentOk && (
        <div className="border-t border-purple-100/60 px-6 pt-3 pb-4 bg-white/80">
          {/* AI action row */}
          <div className="flex items-center gap-2.5 mb-3 flex-wrap">
            <button
              onClick={handleAIDraft}
              disabled={drafting}
              className="flex items-center gap-2 bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white rounded-[20px] px-4 py-2.5 text-[13px] font-semibold shadow-sm hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {drafting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Drafting…</>
                : <><Sparkles className="w-[15px] h-[15px]" /> Help me reply</>}
            </button>

            {isHot && (
              booked ? (
                <span className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[20px] text-[12.5px] font-semibold bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle className="w-3.5 h-3.5" /> Meeting booked
                </span>
              ) : (
                <button
                  onClick={handleMarkBooked}
                  disabled={booking}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[20px] text-[12.5px] font-medium bg-white border border-purple-100 text-[#3c4043] hover:bg-purple-50 disabled:opacity-50 transition-colors"
                >
                  {booking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5 text-[#9B8EC4]" />}
                  Mark meeting booked
                </button>
              )
            )}

            {isHot && !prep && (
              <button
                onClick={handleMeetingPrep}
                disabled={prepping}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[20px] text-[12.5px] font-medium bg-white border border-purple-100 text-[#3c4043] hover:bg-purple-50 disabled:opacity-50 transition-colors"
              >
                {prepping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-[#9B8EC4]" />}
                Prep me for the meeting
              </button>
            )}

            <span className="ml-auto text-[11.5px] text-[#9B8EC4] flex items-center gap-1.5">
              FIGSY drafts in your voice
            </span>
          </div>

          {prepErr && <p className="text-xs text-rose-500 mb-2">{prepErr}</p>}

          {/* input wrap */}
          <div className="border border-purple-100 rounded-[14px] px-3.5 py-3 flex flex-col gap-2.5 focus-within:border-[#7C3AED] focus-within:ring-2 focus-within:ring-purple-100 transition-all bg-white">
            {draft !== null && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#6D28D9] bg-[#F5F0FF] px-2.5 py-0.5 rounded-md font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> FIGSY draft — review &amp; send
                </span>
                <button
                  onClick={handleAIDraft}
                  disabled={drafting}
                  className="flex items-center gap-1 text-[11px] text-[#7C3AED] hover:text-[#6D28D9] disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Regenerate
                </button>
              </div>
            )}
            <textarea
              value={draft ?? ''}
              onChange={e => setDraft(e.target.value)}
              onFocus={() => { if (draft === null) setDraft('') }}
              placeholder={`Reply to ${reply.leads?.first_name ?? displayName}… or click "Help me reply" for a FIGSY draft`}
              rows={draft ? 4 : 2}
              className="border-none outline-none resize-y font-inherit text-[13.5px] text-[#3c4043] leading-relaxed min-h-[46px] bg-transparent placeholder:text-[#9B8EC4]"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSend}
                disabled={sending || !draft?.trim()}
                className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white rounded-[9px] px-5 py-2.5 text-[13.5px] font-semibold transition-colors"
              >
                {sending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  : <><Send className="w-[15px] h-[15px]" /> Send</>}
              </button>
              {draft !== null && (
                <button
                  onClick={() => setDraft(null)}
                  className="px-3 py-2.5 text-[13px] text-[#7B6FA0] hover:text-gray-900 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Discard
                </button>
              )}
            </div>
            {sendError && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{sendError}</p>
            )}
          </div>
        </div>
      )}

      {/* already-replied footer (composer locked) */}
      {composerLocked && reply.classification === 'sent_reply' && (
        <div className="border-t border-purple-100/60 px-6 py-4 bg-white/70">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-purple-50 border border-purple-200 max-w-md">
            <CheckCircle className="w-4 h-4 text-purple-600 shrink-0" />
            <p className="text-sm font-semibold text-purple-700">✓ Reply sent</p>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Main page ────────────────────────────────────────────────────────
export default function InboxPage() {
  const supabase = createClient()

  const [replies, setReplies]   = useState<Reply[]>([])
  const [loading, setLoading]   = useState(true)
  const [folder, setFolder]     = useState<string>('all')
  const [tag, setTag]           = useState<string | null>(null)
  const [channel, setChannel]   = useState<'all' | Channel>('all')
  const [query, setQuery]       = useState('')
  const [selected, setSelected] = useState<Reply | null>(null)
  const [token, setToken]       = useState('')

  const loadReplies = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setToken(session.access_token)
    try {
      const res = await api.get<{ data: Reply[] }>('/figsy/replies/all', session.access_token)
      const sorted = (res.data ?? []).sort((a, b) => {
        const pa = getCfg(a.classification).priority
        const pb = getCfg(b.classification).priority
        if (pa !== pb) return pa - pb
        const ta = new Date(a.received_at ?? a.processed_at ?? 0).getTime()
        const tb = new Date(b.received_at ?? b.processed_at ?? 0).getTime()
        return tb - ta
      })
      setReplies(sorted)
      if (sorted.length > 0 && !selected) setSelected(sorted[0])
    } catch { /* keep existing replies */ }
    setLoading(false)
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadReplies() }, [loadReplies])

  // ── Derived counts (for folders/tags) ────────────────────────────
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: replies.length,
      unread: replies.filter(r => UNREAD_CLASSES.has(r.classification)).length,
      replied: replies.filter(r => r.classification === 'sent_reply').length,
      archived: 0, // TODO: no `archived` state on figsy_replies yet — see PR note.
      booked: 0,   // booked state not yet a column — see PR note.
      interested: replies.filter(r => r.classification === 'interested').length,
      hot: replies.filter(r => r.classification === 'hot').length,
      warm: replies.filter(r => r.classification === 'warm').length,
      needs_reply: replies.filter(r => NEEDS_REPLY_CLASSES.has(r.classification)).length,
      out_of_office: replies.filter(r => r.classification === 'out_of_office').length,
      email: replies.filter(r => getChannel(r) === 'email').length,
      linkedin: replies.filter(r => getChannel(r) === 'linkedin').length,
    }
    return c
  }, [replies])

  // ── Filtering pipeline ───────────────────────────────────────────
  const filtered = useMemo(() => {
    let out = replies

    // folder
    if (folder === 'unread')   out = out.filter(r => UNREAD_CLASSES.has(r.classification))
    if (folder === 'replied')  out = out.filter(r => r.classification === 'sent_reply')
    if (folder === 'archived') out = [] // TODO: no archived state yet

    // channel
    if (channel !== 'all') out = out.filter(r => getChannel(r) === channel)

    // tag
    if (tag) {
      if (tag === 'needs_reply')        out = out.filter(r => NEEDS_REPLY_CLASSES.has(r.classification))
      else if (tag === 'booked')        out = out.filter(r => r.classification === 'hot' || r.classification === 'interested')
      else                              out = out.filter(r => r.classification === tag)
    }

    // search
    const q = query.trim().toLowerCase()
    if (q) {
      out = out.filter(r =>
        getDisplayName(r).toLowerCase().includes(q) ||
        (r.subject ?? '').toLowerCase().includes(q) ||
        getBody(r).toLowerCase().includes(q) ||
        r.from_email.toLowerCase().includes(q)
      )
    }
    return out
  }, [replies, folder, channel, tag, query])

  // keep selection valid against the active filter
  useEffect(() => {
    if (selected && !filtered.some(r => r.id === selected.id)) {
      setSelected(filtered[0] ?? null)
    }
  }, [filtered]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6 lg:-m-8 overflow-hidden">

      {/* ── COL 2: labels + tags ─────────────────────────────────────
          (col 1 = the global app rail, already rendered by the dashboard
           layout — we do not re-render it here) */}
      <aside className="hidden md:flex w-[230px] shrink-0 flex-col border-r border-purple-100/60 bg-white/70 backdrop-blur-sm py-4 overflow-y-auto">
        <div className="px-5 pb-3">
          <h1 className="text-[20px] font-medium text-[#0F0929] flex items-center gap-2">
            <Inbox className="w-5 h-5 text-[#7C3AED]" /> Unibox
          </h1>
          <p className="text-[11px] text-[#9B8EC4] mt-0.5">All conversations, one place</p>
        </div>

        {/* channel chips */}
        <div className="flex gap-1.5 px-4 pb-3 flex-wrap">
          {CHANNELS.map(ch => (
            <button
              key={ch.value}
              onClick={() => setChannel(ch.value)}
              className={`flex items-center gap-1.5 text-[11.5px] border rounded-[14px] px-2.5 py-1 transition-colors ${
                channel === ch.value
                  ? 'bg-[#EDE9FE] border-[#EDE9FE] text-[#6D28D9] font-semibold'
                  : 'bg-white border-purple-100 text-[#7B6FA0] hover:bg-purple-50'
              }`}
            >
              <span className="w-[7px] h-[7px] rounded-full" style={{ background: ch.color }} />
              {ch.label}
            </button>
          ))}
        </div>

        {/* folders */}
        <div className="mt-1">
          {FOLDERS.map(f => {
            const Icon = f.icon
            const on = folder === f.value
            return (
              <button
                key={f.value}
                onClick={() => setFolder(f.value)}
                className={`w-full flex items-center gap-3 px-5 py-2 text-[13.5px] rounded-r-2xl mr-2.5 transition-colors ${
                  on ? 'bg-[#F5F0FF] text-[#6D28D9] font-semibold' : 'text-[#3c4043] hover:bg-purple-50'
                }`}
              >
                <Icon className="w-[17px] h-[17px] opacity-85" />
                {f.label}
                <span className={`ml-auto text-[12px] ${on ? 'text-[#7C3AED]' : 'text-[#9B8EC4]'}`}>
                  {counts[f.value] ?? 0}
                </span>
              </button>
            )
          })}
        </div>

        {/* tags */}
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#9B8EC4] px-5 pt-4 pb-1.5">Tags</div>
        {TAGS.map(t => {
          const on = tag === t.value
          return (
            <button
              key={t.value}
              onClick={() => setTag(on ? null : t.value)}
              className={`w-full flex items-center gap-3 px-5 py-1.5 text-[13px] transition-colors ${
                on ? 'bg-[#F5F0FF] text-[#6D28D9] font-semibold' : 'text-[#3c4043] hover:bg-purple-50'
              }`}
            >
              <span className="w-[11px] h-[11px] rounded-[3px] shrink-0" style={{ background: t.color }} />
              <span className="truncate">{t.label}</span>
              <span className="ml-auto text-[11.5px] text-[#9B8EC4]">{counts[t.value] ?? 0}</span>
            </button>
          )
        })}
      </aside>

      {/* ── COL 3: conversation list ─────────────────────────────────── */}
      <section className="w-full md:w-[360px] lg:w-[392px] shrink-0 flex flex-col border-r border-purple-100/60 bg-white/60 backdrop-blur-sm">
        {/* search */}
        <div className="px-4 pt-3.5 pb-2.5">
          <div className="flex items-center gap-3 bg-purple-50/60 rounded-[9px] px-3.5 py-2.5 focus-within:bg-white focus-within:shadow-sm transition-all">
            <Search className="w-[18px] h-[18px] text-[#9B8EC4]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="border-none bg-transparent outline-none text-[13.5px] flex-1 text-[#0F0929] placeholder:text-[#9B8EC4]"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-[#9B8EC4] hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* list bar */}
        <div className="flex items-center gap-3.5 px-[18px] pb-2.5 text-[#7B6FA0] text-[12.5px]">
          <span className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            {tag ? TAGS.find(t => t.value === tag)?.label : 'All tags'}
          </span>
          {(tag || channel !== 'all' || folder !== 'all') && (
            <button
              onClick={() => { setTag(null); setChannel('all'); setFolder('all') }}
              className="text-[#7C3AED] hover:underline"
            >
              Clear
            </button>
          )}
          <span className="ml-auto text-[#9B8EC4] font-medium">{filtered.length} results</span>
        </div>

        {/* rows */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-[#9B8EC4]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Inbox className="w-8 h-8 mx-auto mb-3 text-[#9B8EC4] opacity-30" />
              <p className="text-sm font-medium text-[#9B8EC4]">No conversations here</p>
            </div>
          ) : (
            filtered.map(reply => {
              const cfg = getCfg(reply.classification)
              const isSelected = selected?.id === reply.id
              const ch = getChannel(reply)
              const unread = UNREAD_CLASSES.has(reply.classification) && !isSelected
              const body = getBody(reply)
              return (
                <button
                  key={reply.id}
                  onClick={() => setSelected(reply)}
                  className={`w-full text-left flex gap-3 px-4 py-3 border-b border-purple-100/50 relative transition-colors ${
                    isSelected ? 'bg-[#F5F0FF]' : 'hover:bg-white/80'
                  }`}
                >
                  {isSelected && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#7C3AED]" />}
                  <div
                    className="w-10 h-10 rounded-full grid place-items-center text-white text-sm font-semibold shrink-0"
                    style={{ background: avColor(getDisplayName(reply)) }}
                  >
                    {getInitials(reply)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <ChannelChip channel={ch} className="w-[15px] h-[15px]" />
                      <span className={`text-[13.5px] truncate ${unread ? 'font-bold text-[#0F0929]' : 'font-semibold text-[#3c4043]'}`}>
                        {getDisplayName(reply)}
                      </span>
                      <span className="ml-auto text-[11.5px] text-[#9B8EC4] shrink-0">
                        {timeAgo(reply.received_at ?? reply.processed_at)}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-[#7B6FA0] truncate mb-1.5">
                      {reply.subject ? `${reply.subject} — ` : ''}{body.slice(0, 90)}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${cfg.bg} ${cfg.text}`}>
                        {cfg.emoji} {cfg.label}
                      </span>
                    </div>
                  </div>
                  {unread && <span className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#7C3AED]" />}
                </button>
              )
            })
          )}
        </div>
      </section>

      {/* ── COL 4: thread + composer / COL 5: context card ──────────── */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center bg-white/40">
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#9B8EC4]" />
          ) : (
            <div className="flex flex-col items-center justify-center text-center px-8 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-[#7C3AED] opacity-60" />
              </div>
              <p className="text-base font-semibold text-[#0F0929] mb-2">No conversation selected</p>
              <p className="text-sm text-[#7B6FA0] leading-relaxed mb-6">
                FIGSY replies surface here as campaigns run. Hot leads and positive replies appear first.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                {[
                  { title: 'Launch a campaign', desc: 'Start outreach to get replies flowing.', href: '/dashboard/figsy' },
                  { title: 'Chat with FIGSY', desc: 'Ask FIGSY to improve your reply rate.', href: '/dashboard/figsy-chat' },
                ].map(card => (
                  <a key={card.title} href={card.href}
                    className="flex flex-col gap-1 p-4 bg-white border border-purple-100 rounded-xl hover:border-[#7C3AED]/40 hover:shadow-sm transition-all group">
                    <p className="text-sm font-semibold text-[#1E1152]">{card.title}</p>
                    <p className="text-xs text-[#9B8EC4] leading-relaxed">{card.desc}</p>
                    <span className="text-xs font-semibold text-[#7C3AED] mt-0.5 group-hover:underline">Go →</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <ThreadView key={selected.id} reply={selected} token={token} />
          <ContextCard reply={selected} />
        </>
      )}
    </div>
  )
}
