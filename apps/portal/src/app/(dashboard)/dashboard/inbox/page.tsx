'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Mail, Loader2, Inbox, Flame, Sun, Snowflake, Ban, UserX,
  Plane, HelpCircle, Send, Sparkles, CheckCircle, RefreshCw, Calendar,
  BellOff, GitBranch,
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
    first_name: string
    last_name: string
    job_title: string | null
    company: string | null
  } | null
}

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
  hot:           { label: 'Hot',          emoji: '🔥', bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  dot: 'bg-green-500',  icon: Flame,       priority: 1 },
  interested:    { label: 'Positive',     emoji: '🔥', bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  dot: 'bg-green-500',  icon: Flame,       priority: 1 },
  warm:          { label: 'Warm',         emoji: '🌤️', bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200', dot: 'bg-yellow-400', icon: Sun,         priority: 2 },
  cold:          { label: 'Cold',         emoji: '❄️',  bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200',   dot: 'bg-gray-400',   icon: Snowflake,   priority: 4 },
  not_interested:{ label: 'Cold',         emoji: '❄️',  bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200',   dot: 'bg-gray-400',   icon: Snowflake,   priority: 4 },
  opt_out:       { label: 'Opted Out',    emoji: '🚫', bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',   dot: 'bg-rose-500',   icon: Ban,         priority: 5 },
  unsubscribe:   { label: 'Unsubscribe',  emoji: '🔕', bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',   dot: 'bg-rose-400',   icon: BellOff,     priority: 5 },
  wrong_person:  { label: 'Wrong Person', emoji: '👤', bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200',   dot: 'bg-gray-400',   icon: UserX,       priority: 6 },
  referral:      { label: 'Referral',     emoji: '🔀', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-400',  icon: GitBranch,   priority: 3 },
  out_of_office: { label: 'OOO',          emoji: '✈️',  bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-400',   icon: Plane,       priority: 7 },
  other:         { label: 'Other',        emoji: '❓', bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200',   dot: 'bg-gray-400',   icon: HelpCircle,  priority: 8 },
  sent_reply:    { label: 'Replied',      emoji: '✓',  bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200', dot: 'bg-purple-400', icon: CheckCircle, priority: 9 },
}

const fallbackCfg: ClassDef = CLASS_CONFIG.other

function getCfg(c: string): ClassDef {
  return CLASS_CONFIG[c] ?? fallbackCfg
}

// ── Filter tabs ──────────────────────────────────────────────────────
const FILTER_TABS: { value: string; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'warm_leads',  label: '⭐ Warm Leads' },
  { value: 'hot',         label: '🔥 Hot' },
  { value: 'warm',        label: '🌤️ Warm' },
  { value: 'needs_reply', label: 'Needs Reply' },
  { value: 'referral',    label: '🔀 Referral' },
  { value: 'out_of_office', label: '✈️ OOO' },
  { value: 'unsubscribe', label: '🔕 Unsub' },
  { value: 'wrong_person', label: '👤 Wrong' },
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

const NEEDS_REPLY_CLASSES = new Set(['hot', 'warm', 'interested'])

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

// ── Reply Detail Panel ───────────────────────────────────────────────
function ReplyDetail({ reply, token }: { reply: Reply; token: string }) {
  const cfg = getCfg(reply.classification)
  const lead = reply.leads

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
    setDraft(null)
    setDrafting(false)
    setSending(false)
    setSentOk(false)
    setSendError('')
    setBooked(false)
    setBooking(false)
  }, [reply.id])

  async function handleAIDraft() {
    setDrafting(true)
    try {
      // R7: real context-aware AI draft from the prospect's actual message.
      const res = await api.post<{ data?: { draft?: string } }>(
        `/figsy/replies/${reply.id}/ai-draft`, {}, token
      )
      if (res.data?.draft) {
        setDraft(res.data.draft)
        setDrafting(false)
        return
      }
      // Fallback to the keyword template if the API returns nothing.
      setDraft(generateClientDraft(reply))
    } catch {
      // Network/AI failure — never leave the user empty-handed.
      setDraft(generateClientDraft(reply))
    }
    setDrafting(false)
  }

  async function handleSend() {
    if (!draft?.trim()) return
    setSending(true)
    setSendError('')
    try {
      await api.post(`/figsy/replies/${reply.id}/send-reply`, { body: draft }, token)
      setSentOk(true)
      setDraft(null)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send reply — please try again.')
    }
    setSending(false)
  }

  // R14 (#54) — Denise preps the human for the booked meeting.
  async function handleMeetingPrep() {
    setPrepping(true)
    setPrepErr('')
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
  const displayName = getDisplayName(reply)

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">

      {/* ── Contact header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-200 to-purple-300 flex items-center justify-center shrink-0">
            <span className="text-base font-bold text-purple-700">{getInitials(reply)}</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">{displayName}</h2>
            {lead && (lead.job_title || lead.company) && (
              <p className="text-sm text-[#7B6FA0] mt-0.5">
                {[lead.job_title, lead.company].filter(Boolean).join(' at ')}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5 text-[#9B8EC4]" />
              <span className="text-xs text-[#9B8EC4]">{reply.from_email}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Classification badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.emoji} {cfg.label}
          </div>
          {/* Mark meeting booked */}
          {(reply.classification === 'hot' || reply.classification === 'interested') && (
            booked ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                <CheckCircle className="w-3 h-3" /> Meeting booked ✓
              </div>
            ) : (
              <button
                onClick={handleMarkBooked}
                disabled={booking}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                {booking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />}
                Mark meeting booked
              </button>
            )
          )}
          {/* R14 — Denise meeting-prep */}
          {(reply.classification === 'hot' || reply.classification === 'interested') && !prep && (
            <button
              onClick={handleMeetingPrep}
              disabled={prepping}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              {prepping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Prep me for the meeting
            </button>
          )}
        </div>
      </div>

      {/* R14 — Denise's meeting-prep brief */}
      {prepErr && <p className="text-xs text-rose-500">{prepErr}</p>}
      {prep && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-amber-900">Denise prepped you for this meeting</h3>
          </div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{prep}</div>
        </div>
      )}

      {/* ── Email body card ──────────────────────────────────────────── */}
      <div className={`rounded-2xl border bg-white/80 backdrop-blur-sm border-white/60 shadow-sm overflow-hidden`}>
        {reply.subject && (
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <p className="text-[11px] font-semibold text-[#9B8EC4] uppercase tracking-wider mb-0.5">Subject</p>
            <p className="text-sm font-semibold text-gray-900">{reply.subject}</p>
          </div>
        )}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-3.5 h-3.5 text-[#9B8EC4]" />
            <span className="text-xs text-[#9B8EC4]">
              {timeAgo(reply.received_at ?? reply.processed_at)}
            </span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{body}</p>
        </div>
      </div>

      {/* ── Already replied banner ───────────────────────────────────── */}
      {reply.classification === 'sent_reply' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50 border border-purple-200">
          <CheckCircle className="w-5 h-5 text-purple-600 shrink-0" />
          <p className="text-sm font-semibold text-purple-700">✓ Reply sent</p>
        </div>
      )}

      {/* ── Opt-out / Unsubscribe notice ─────────────────────────────── */}
      {(reply.classification === 'opt_out' || reply.classification === 'unsubscribe') && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200">
          <Ban className="w-5 h-5 text-rose-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-700">Contact opted out</p>
            <p className="text-xs text-rose-500 mt-0.5">Permanently suppressed across all K.I.N.D campaigns.</p>
          </div>
        </div>
      )}

      {/* ── Referral notice ──────────────────────────────────────────── */}
      {reply.classification === 'referral' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <GitBranch className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-700">Referral — new contact mentioned</p>
            <p className="text-xs text-amber-600 mt-0.5">This contact referred someone else. Review the reply and add the new contact as a lead.</p>
          </div>
        </div>
      )}

      {/* ── OOO notice ───────────────────────────────────────────────── */}
      {reply.classification === 'out_of_office' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
          <Plane className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-700">Out of office</p>
            <p className="text-xs text-blue-500 mt-0.5">This contact is away. FIGSY will pick up the sequence automatically when they return.</p>
          </div>
        </div>
      )}

      {/* ── Wrong person notice ───────────────────────────────────────── */}
      {reply.classification === 'wrong_person' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
          <UserX className="w-5 h-5 text-gray-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-700">Wrong contact</p>
            <p className="text-xs text-gray-500 mt-0.5">This person is not the right contact. Reject this lead or find the correct decision-maker.</p>
          </div>
        </div>
      )}

      {/* ── Reply tools ─────────────────────────────────────────────── */}
      {reply.classification !== 'sent_reply' && reply.classification !== 'opt_out' && reply.classification !== 'unsubscribe' && reply.classification !== 'out_of_office' && reply.classification !== 'wrong_person' && !sentOk && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Reply</span>
          </div>

          {/* Action buttons */}
          {draft === null && (
            <div className="flex gap-3">
              <button
                onClick={handleAIDraft}
                disabled={drafting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {drafting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Drafting…</>
                  : <><Sparkles className="w-4 h-4" /> AI draft reply</>
                }
              </button>
            </div>
          )}

          {/* Draft textarea */}
          {draft !== null && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-wider">Draft reply</p>
                <button
                  onClick={handleAIDraft}
                  disabled={drafting}
                  className="flex items-center gap-1 text-xs text-[#7C3AED] hover:text-[#6D28D9] disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
              </div>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={7}
                className="w-full text-sm text-gray-800 border border-purple-200 bg-[#F5F0FF]/30 rounded-xl px-4 py-3 resize-y focus:outline-none focus:ring-2 focus:ring-purple-300 leading-relaxed"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {sending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                    : <><Send className="w-4 h-4" /> Send reply</>
                  }
                </button>
                <button
                  onClick={() => setDraft(null)}
                  className="px-4 py-2.5 text-sm text-[#7B6FA0] hover:text-gray-900 transition-colors"
                >
                  Discard
                </button>
              </div>
              {sendError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{sendError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Success confirmation ─────────────────────────────────────── */}
      {sentOk && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-green-50 border border-green-200">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Reply sent successfully!</p>
            <p className="text-xs text-green-600 mt-0.5">Your reply has been delivered to {reply.from_email}.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────
export default function InboxPage() {
  const supabase = createClient()

  const [replies, setReplies]     = useState<Reply[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<string>('all')
  const [selected, setSelected]   = useState<Reply | null>(null)
  const [token, setToken]         = useState('')

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

  // ── Derived state ────────────────────────────────────────────────
  const hotCount = replies.filter(r => r.classification === 'hot' || r.classification === 'interested').length

  const WARM_LEADS_CLASSES = new Set(['hot', 'interested', 'warm'])
  const filtered = (() => {
    switch (filter) {
      case 'warm_leads':   return replies.filter(r => WARM_LEADS_CLASSES.has(r.classification)).sort((a, b) => new Date(b.received_at ?? b.processed_at ?? 0).getTime() - new Date(a.received_at ?? a.processed_at ?? 0).getTime())
      case 'hot':          return replies.filter(r => r.classification === 'hot' || r.classification === 'interested')
      case 'warm':         return replies.filter(r => r.classification === 'warm')
      case 'needs_reply':  return replies.filter(r => NEEDS_REPLY_CLASSES.has(r.classification))
      case 'referral':     return replies.filter(r => r.classification === 'referral')
      case 'out_of_office':return replies.filter(r => r.classification === 'out_of_office')
      case 'unsubscribe':  return replies.filter(r => r.classification === 'unsubscribe' || r.classification === 'opt_out')
      case 'wrong_person': return replies.filter(r => r.classification === 'wrong_person')
      default:             return replies
    }
  })()

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-64px)] -m-6 lg:-m-8">

      {/* ── LEFT PANEL: Reply list ──────────────────────────────────── */}
      <div className="w-full lg:w-[340px] shrink-0 border-b lg:border-b-0 lg:border-r border-purple-100/60 flex flex-col bg-white/60 backdrop-blur-sm max-h-[40vh] lg:max-h-none">

        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-purple-100/60 bg-white/80">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-sm font-bold text-[#0F0929] flex items-center gap-2">
              <Inbox className="w-4 h-4 text-[#7C3AED]" />
              Inbox
            </h1>
            {hotCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                {hotCount} hot
              </span>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 flex-wrap">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  filter === tab.value
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-[#7B6FA0] hover:bg-purple-50 hover:text-[#7C3AED]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reply list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-[#9B8EC4]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Inbox className="w-8 h-8 mx-auto mb-3 text-[#9B8EC4] opacity-30" />
              <p className="text-sm font-medium text-[#9B8EC4]">No replies here</p>
            </div>
          ) : (
            filtered.map(reply => {
              const cfg = getCfg(reply.classification)
              const isSelected = selected?.id === reply.id
              const body = getBody(reply)
              return (
                <button
                  key={reply.id}
                  onClick={() => setSelected(reply)}
                  className={`w-full text-left px-4 py-3.5 border-b border-purple-100/60 transition-all ${
                    isSelected
                      ? 'bg-[#F5F0FF] border-l-2 border-l-[#7C3AED]'
                      : 'hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-200 to-purple-300 flex items-center justify-center">
                        <span className="text-xs font-bold text-purple-700">{getInitials(reply)}</span>
                      </div>
                      {/* Unread dot */}
                      {(reply.classification === 'hot' || reply.classification === 'warm' || reply.classification === 'interested') && !isSelected && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#7C3AED] border-2 border-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-semibold text-gray-900 truncate">
                          {getDisplayName(reply)}
                        </span>
                        <span className="text-[10px] text-[#9B8EC4] shrink-0">
                          {timeAgo(reply.received_at ?? reply.processed_at)}
                        </span>
                      </div>
                      {reply.subject && (
                        <p className="text-[11px] text-gray-700 font-medium truncate mb-0.5">{reply.subject}</p>
                      )}
                      <p className="text-[11px] text-[#7B6FA0] line-clamp-2 leading-relaxed">
                        {body.slice(0, 100)}
                      </p>
                      {/* Classification badge */}
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                        <span className={`text-[10px] font-semibold ${cfg.text}`}>
                          {cfg.emoji} {cfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Detail view ────────────────────────────────── */}
      <div className="flex-1 min-h-[60vh] lg:min-h-0 overflow-y-auto bg-transparent">
        {!selected ? (
          loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-[#9B8EC4]" />
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-[#7C3AED] opacity-60" />
              </div>
              <p className="text-base font-semibold text-[#0F0929] mb-2">No replies yet</p>
              <p className="text-sm text-[#7B6FA0] max-w-xs leading-relaxed mb-6">
                FIGSY emails surface here as campaigns run. Hot leads and FIGSY replies appear first.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-sm text-left">
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
          )
        ) : (
          <ReplyDetail key={selected.id} reply={selected} token={token} />
        )}
      </div>
    </div>
  )
}
