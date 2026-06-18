'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { v2Enabled } from '@/lib/flags'
import { FigsyThinking } from '@/components/ui/FigsyThinking'
import type { Lead, LeadStats, ICP, LeadStatus } from '@kind/shared'
import { SCORE_THRESHOLDS } from '@kind/shared'
import {
  Users, TrendingUp, ShieldCheck, Download, Search,
  Mail, Ban, Sparkles, Loader2, ExternalLink,
  CheckCircle, Clock, XCircle, Plus, Settings2,
  DollarSign, Send, X, ChevronDown, AlertTriangle, Copy, Layers, Trash2, Target,
} from 'lucide-react'

// ── Enrichment types ──────────────────────────────────────────────────────────
interface EnrichmentData {
  lead_id: string
  recent_signal: string
  company_context: string
  opening_line: string
  enrichment_score: number
  enriched_at: string
  cached?: boolean
}

// ── Enrichment score badge ────────────────────────────────────────────────────
function EnrichmentScoreBadge({ score }: { score: number }) {
  const cls = score >= 7
    ? 'bg-green-100 text-green-700'
    : score >= 5
    ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {score}/10
    </span>
  )
}

// ── Enrichment panel (shown below a row when enriched) ────────────────────────
function EnrichmentPanel({ data, onCopy }: { data: EnrichmentData; onCopy: (text: string) => void }) {
  return (
    <div className="bg-[#F5F0FF]/60 border border-purple-100 rounded-xl p-4 mt-2 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#7C3AED] uppercase tracking-wide">AI Enrichment</span>
        <div className="flex items-center gap-2">
          <EnrichmentScoreBadge score={data.enrichment_score} />
          <span className="text-[10px] text-[#9B8EC4]">signal strength</span>
        </div>
      </div>
      <div className="space-y-1.5 text-sm">
        <p><span className="font-medium text-gray-700">🎯 Signal:</span>{' '}<span className="text-gray-600">{data.recent_signal}</span></p>
        <p><span className="font-medium text-gray-700">🏢 Context:</span>{' '}<span className="text-gray-600">{data.company_context}</span></p>
      </div>
      <div>
        <p className="font-medium text-gray-700 text-sm mb-1">✉️ Opening line:</p>
        <div className="flex items-start gap-2">
          <code className="flex-1 block bg-white border border-purple-100 rounded-lg px-3 py-2 text-xs text-gray-800 font-mono leading-relaxed">
            {data.opening_line}
          </code>
          <button
            onClick={() => onCopy(data.opening_line)}
            title="Copy opening line"
            className="p-1.5 rounded-md bg-white border border-purple-100 hover:border-purple-300 text-[#7C3AED] transition-colors shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-[#9B8EC4] text-xs">—</span>
  const color = score >= SCORE_THRESHOLDS.high
    ? 'bg-green-100 text-green-700'
    : score >= SCORE_THRESHOLDS.medium
    ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{score}</span>
}

// ── Pipeline stage chip (colored dot + label) ─────────────────────────────────
const STAGE_META: Record<string, { label: string; dotCls: string; textCls: string }> = {
  pending:       { label: 'New',            dotCls: 'bg-gray-400',    textCls: 'text-gray-600' },
  scored:        { label: 'AI Scored',      dotCls: 'bg-[#7C3AED]',    textCls: 'text-[#6D28D9]' },
  consent_sent:  { label: 'Awaiting Consent', dotCls: 'bg-indigo-500', textCls: 'text-indigo-700' },
  consent_given: { label: 'Consented',      dotCls: 'bg-green-500',   textCls: 'text-green-700' },
  exported:      { label: 'In Pipeline',    dotCls: 'bg-purple-500',  textCls: 'text-purple-700' },
  rejected:      { label: 'Rejected',       dotCls: 'bg-red-400',     textCls: 'text-red-600' },
  opted_out:     { label: 'Opted Out',      dotCls: 'bg-gray-300',    textCls: 'text-[#9B8EC4]' },
}

// Keep STATUS_META for the filter dropdown labels
const STATUS_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  pending:       { label: 'Pending',   icon: <Clock className="w-3 h-3" />,       cls: 'bg-gray-100 text-gray-600' },
  scored:        { label: 'Scored',    icon: <TrendingUp className="w-3 h-3" />,  cls: 'bg-blue-100 text-[#6D28D9]' },
  consent_sent:  { label: 'Sent',      icon: <Mail className="w-3 h-3" />,         cls: 'bg-indigo-100 text-indigo-700' },
  consent_given: { label: 'Consented', icon: <CheckCircle className="w-3 h-3" />, cls: 'bg-green-100 text-green-700' },
  exported:      { label: 'Exported',  icon: <Download className="w-3 h-3" />,    cls: 'bg-purple-100 text-purple-700' },
  rejected:      { label: 'Rejected',  icon: <XCircle className="w-3 h-3" />,     cls: 'bg-red-100 text-red-700' },
  opted_out:     { label: 'Opted out', icon: <Ban className="w-3 h-3" />,         cls: 'bg-gray-100 text-[#9B8EC4]' },
}

function PipelineStageChip({ status }: { status: string }) {
  const m = STAGE_META[status] ?? { label: status, dotCls: 'bg-gray-400', textCls: 'text-gray-600' }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${m.dotCls}`} />
      <span className={`text-xs font-medium ${m.textCls}`}>{m.label}</span>
    </span>
  )
}

// ── Campaign progress micro-bar ───────────────────────────────────────────────
function CampaignMicroBar({ lead }: { lead: Lead }) {
  if (lead.status !== 'consent_given' && lead.status !== 'exported') return null

  // Derive segment states from available lead fields
  const enrolled  = lead.status === 'consent_given' || lead.status === 'exported'
  const sent      = !!lead.outreach_sent_at || lead.status === 'exported'
  const replied   = lead.crm_synced // proxy: synced to CRM means they replied/engaged

  return (
    <div className="flex items-center gap-1 mt-1" title="Enrolled → Sent → Replied">
      {[
        { active: enrolled, label: 'Enrolled' },
        { active: sent,     label: 'Sent' },
        { active: replied,  label: 'Replied' },
      ].map(({ active, label }) => (
        <div
          key={label}
          title={label}
          className={`h-1 w-5 rounded-full ${active ? 'bg-green-400' : 'bg-gray-200'}`}
        />
      ))}
    </div>
  )
}

// ── AI enrichment columns ─────────────────────────────────────────────────────
// Technographics: derived from available data or shown as "soon" placeholder
function TechnographicsChip({ lead }: { lead: Lead }) {
  // Real tech stack data would come from Apollo enrichment
  // Placeholder: infer from industry/job title signals
  const industry = (lead.industry ?? '').toLowerCase()
  const title = (lead.job_title ?? '').toLowerCase()
  const stacks: string[] = []
  if (industry.includes('tech') || industry.includes('software') || title.includes('engineer') || title.includes('developer'))
    stacks.push('SaaS')
  if (title.includes('marketing') || title.includes('growth'))
    stacks.push('MarTech')
  if (title.includes('sales') || title.includes('revenue'))
    stacks.push('CRM')
  if (stacks.length === 0) return <span className="text-[10px] text-gray-300 italic">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {stacks.map(s => (
        <span key={s} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">{s}</span>
      ))}
    </div>
  )
}

function JobPostingsBadge({ lead }: { lead: Lead }) {
  // Derived from score — high score companies likely hiring
  const hiring = (lead.score ?? 0) >= 75 && lead.company
  if (!hiring) return <span className="text-[10px] text-gray-300 italic">—</span>
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-600">
      📢 Hiring
    </span>
  )
}

// ── Apollo badge ──────────────────────────────────────────────────────────────
function ApolloBadge({ consented }: { consented: boolean }) {
  return consented
    ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-[#F5F0FF] text-[#7C3AED] font-medium">✓ Apollo</span>
    : null
}

// ── Buying signal badges ──────────────────────────────────────────────────────
// Derive signals from lead data (score, job title hints, company fields)
function BuyingSignals({ lead }: { lead: Lead }) {
  const signals: { label: string; color: string }[] = []

  // High score = strong fit signal
  if ((lead.score ?? 0) >= 80)
    signals.push({ label: '🔥 High fit', color: 'bg-red-50 text-red-600' })

  // Apollo consented = already opted in
  if (lead.apollo_consented)
    signals.push({ label: '✓ GDPR', color: 'bg-green-50 text-green-600' })

  // Job title signals (hiring/growth keywords)
  const title = (lead.job_title ?? '').toLowerCase()
  if (title.includes('head of') || title.includes('vp') || title.includes('chief'))
    signals.push({ label: '👤 Decision maker', color: 'bg-purple-50 text-purple-600' })

  // Recent company activity (placeholder — replace with LinkedIn scrape data)
  if ((lead.score ?? 0) >= 70 && lead.company)
    signals.push({ label: '📈 Growth signal', color: 'bg-amber-50 text-amber-600' })

  if (signals.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {signals.slice(0, 2).map(s => (
        <span key={s.label} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.color}`}>
          {s.label}
        </span>
      ))}
    </div>
  )
}

// ── Tab definitions ───────────────────────────────────────────────────────────
type TabId = 'all' | 'pending_review' | 'consented' | 'in_figsy' | 'opted_out'

interface TabDef {
  id: TabId
  label: string
  getCount: (leads: Lead[], stats: LeadStats | null, total: number) => number
  pillCls: string
  activePillCls: string
}

const TABS: TabDef[] = [
  {
    id: 'all',
    label: 'All',
    getCount: (_l, _s, total) => total,
    pillCls: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
    activePillCls: 'bg-gray-900 text-white',
  },
  {
    id: 'pending_review',
    label: 'Pending Review',
    // Prefer the server-side total (counts all leads, not just the loaded page);
    // fall back to the page-local count only if stats haven't loaded yet.
    getCount: (leads, stats) => stats?.pending_review ?? leads.filter(l => l.score !== null && l.score >= 70 && (l.status === 'pending' || l.status === 'scored')).length,
    pillCls: 'text-amber-700 hover:bg-amber-50',
    activePillCls: 'bg-amber-500 text-white',
  },
  {
    id: 'consented',
    label: 'Consented',
    getCount: (_l, stats) => stats?.consented ?? 0,
    pillCls: 'text-green-700 hover:bg-green-50',
    activePillCls: 'bg-green-600 text-white',
  },
  {
    id: 'in_figsy',
    label: 'In FIGSY',
    getCount: (leads, stats) => stats?.in_figsy ?? leads.filter(l => l.apollo_consented && (l.status === 'consent_given' || l.status === 'consent_sent')).length,
    pillCls: 'text-indigo-700 hover:bg-indigo-50',
    activePillCls: 'bg-indigo-600 text-white',
  },
  {
    id: 'opted_out',
    label: 'Opted Out',
    getCount: (_l, stats) => stats?.opted_out ?? 0,
    pillCls: 'text-red-600 hover:bg-red-50',
    activePillCls: 'bg-red-600 text-white',
  },
]

// Map tab → status filter value(s) for the API call
function tabToStatusFilter(tab: TabId): string {
  switch (tab) {
    case 'pending_review': return 'pending,scored'
    case 'consented':      return 'consent_given'
    case 'in_figsy':       return 'consent_given,consent_sent'
    case 'opted_out':      return 'opted_out'
    default:               return ''
  }
}

// ── Empty state per tab ───────────────────────────────────────────────────────
function EmptyState({ tab, hasIcps }: { tab: TabId; hasIcps: boolean }) {
  if (!hasIcps) {
    return (
      <div className="text-center py-20 text-[#9B8EC4]">
        <img src="/agents/figsy.png" className="w-10 h-10 rounded-full object-cover object-top ring-2 ring-purple-100 mx-auto mb-3" alt="FIGSY" />
        <p className="text-sm font-medium text-gray-700">I haven&apos;t found any leads yet</p>
        <p className="text-xs mt-1">Run your ICP and I&apos;ll find you the right people — scored, verified, and ready to outreach.</p>
        <a href="/dashboard/leads/icp"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#6D28D9] transition-colors">
          <Plus className="w-4 h-4" />Build my ICP →
        </a>
      </div>
    )
  }

  const messages: Record<TabId, { icon: React.ReactNode; title: string; body: string; cta?: React.ReactNode }> = {
    all: {
      icon: <img src="/agents/figsy.png" className="w-10 h-10 rounded-full object-cover object-top ring-2 ring-purple-100 mx-auto mb-3" alt="FIGSY" />,
      title: "I haven't found any leads yet",
      body: "Run your ICP and I'll find you the right people — scored, verified, and ready to outreach.",
      cta: (
        <a href="/dashboard/leads/icp"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#6D28D9] transition-colors">
          Build my ICP →
        </a>
      ),
    },
    pending_review: {
      icon: <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />,
      title: 'No high-quality leads waiting',
      body: 'All scored leads (70+) have already been reviewed or contacted.',
    },
    consented: {
      icon: <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />,
      title: 'No consented leads yet',
      body: 'Send consent emails to your best leads and track responses here.',
    },
    in_figsy: {
      icon: <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />,
      title: 'No leads in FIGSY yet',
      body: 'Apollo-consented leads that have been enrolled in a sequence will appear here.',
    },
    opted_out: {
      icon: <Ban className="w-10 h-10 mx-auto mb-3 opacity-30" />,
      title: 'No opted-out leads',
      body: 'Leads who request removal will be listed here and permanently blocked.',
    },
  }

  const m = messages[tab]
  return (
    <div className="text-center py-20 text-[#9B8EC4]">
      {m.icon}
      <p className="text-sm font-medium text-gray-700">{m.title}</p>
      <p className="text-xs mt-1">{m.body}</p>
      {m.cta}
    </div>
  )
}

// ── C1 + C3 (V2) — Active ICP surfaced above People, plain-language copy ───────
// Additive, gated behind FEATURE_V2_SCREENS=leads. Built from the real active ICP.
function ActiveIcpBanner({ icp, total }: { icp: ICP; total: number }) {
  const titles = (icp.job_titles ?? []).slice(0, 3).join(', ')
  const inds   = (icp.industries ?? []).slice(0, 2).join(' & ')
  const geos   = (icp.geographies ?? []).slice(0, 3).join(', ')
  const size   = (icp.company_sizes ?? [])[0]
  const desc = [
    titles || 'Decision-makers',
    inds && `at ${inds} companies`,
    geos && `in ${geos}`,
    size && `· ${size} staff`,
  ].filter(Boolean).join(' ')
  const tags = [...(icp.industries ?? []), ...(icp.geographies ?? []), ...(icp.company_sizes ?? [])].slice(0, 6)

  return (
    <div className="rounded-2xl border border-[#e0d4fb] p-5" style={{ background: 'linear-gradient(135deg,#faf7ff,#f3eeff)' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: '#7C3AED' }}>
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900">{icp.name}</p>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Active ICP</span>
            </div>
            <p className="text-[13px] text-gray-600 mt-1 max-w-xl">{desc}. FIGSY finds, scores and verifies these people for you.</p>
            {tags.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {tags.map(t => (
                  <span key={t} className="text-[11px] font-semibold text-[#7C3AED] bg-white border border-[#e0d4fb] px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <span className="text-xs font-bold text-[#7C3AED] bg-white border border-[#e0d4fb] px-3 py-1.5 rounded-lg whitespace-nowrap">
          {total.toLocaleString()} sourced
        </span>
      </div>
    </div>
  )
}

// R9 (Apollo) — "Why FIGSY wrote this": AI transparency disclosure shown under
// a generated draft. Fetches the personalization signals FIGSY actually used.
function WhyFigsyWrote({ leadId, token }: { leadId: string; token: string }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<{ explanation: string; signals: string[] } | null>(null)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && !data && !loading) {
      setLoading(true)
      try {
        const res = await api.get<{ data: { explanation: string; signals: string[] } }>(
          `/figsy/leads/${leadId}/why-email`, token,
        )
        setData(res.data)
      } catch { setData({ explanation: 'Personalization details are unavailable right now.', signals: [] }) }
      setLoading(false)
    }
  }

  return (
    <div className="mb-4 border border-purple-100 rounded-xl overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-[#7C3AED] bg-purple-50/60 hover:bg-purple-50 transition-colors">
        <span className="flex items-center gap-1.5">✨ Why FIGSY wrote this</span>
        <span>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 py-3 text-xs text-gray-600 leading-relaxed">
          {loading ? 'Looking at what we know about this lead…' : (
            <>
              <p>{data?.explanation}</p>
              {(data?.signals?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {data!.signals.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-[#7C3AED]">{s}</span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// R17 (#43/#44) — pre-send spam-score badge shown under a generated draft.
function SpamCheck({ draft, token }: { draft: string; token: string }) {
  const [result, setResult] = useState<{ score: number; grade: string; issues: { severity: string; message: string }[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.post<{ data: { score: number; grade: string; issues: { severity: string; message: string }[] } }>(
      '/figsy/spam-check', { subject: '', body: draft }, token,
    ).then(r => { if (!cancelled) setResult(r.data) })
      .catch(() => { if (!cancelled) setResult(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [draft, token])

  if (loading) return <p className="text-xs text-[#9B8EC4] mb-4">Checking deliverability…</p>
  if (!result) return null

  const color = result.grade === 'great' ? 'text-green-600 bg-green-50 border-green-200'
    : result.grade === 'good' ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-rose-600 bg-rose-50 border-rose-200'

  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 ${color}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider">Deliverability check</span>
        <span className="text-sm font-bold">{result.score}/100 · {result.grade}</span>
      </div>
      {result.issues.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {result.issues.map((iss, i) => (
            <li key={i} className="text-xs flex items-start gap-1.5">
              <span>{iss.severity === 'high' ? '🔴' : iss.severity === 'medium' ? '🟡' : '⚪'}</span>
              <span className="text-gray-600">{iss.message}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-gray-600 mt-1">Clean — no spam triggers found.</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [icps, setIcps] = useState<ICP[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [emailDraft, setEmailDraft] = useState<{ leadId: string; draft: string } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [runningIcp, setRunningIcp] = useState(false)
  const [runResult, setRunResult] = useState<{ inserted: number; relaxed: string | null } | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkExporting, setBulkExporting] = useState(false)
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false)
  const [showMarkAs, setShowMarkAs] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Enrichment state
  const [enrichedLeads, setEnrichedLeads] = useState<Record<string, EnrichmentData>>({})
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set())
  const [enrichErrors, setEnrichErrors] = useState<Record<string, string>>({})
  const [expandedEnrichments, setExpandedEnrichments] = useState<Set<string>>(new Set())

  // Waterfall enrichment state (P2-5)
  const [waterfallingIds, setWaterfallIds] = useState<Set<string>>(new Set())
  const [waterfallResults, setWaterfallResults] = useState<Record<string, { filled: number; source: string }>>({})

  // Research state
  const [researchData, setResearchData] = useState<Record<string, string[]>>({})
  const [researchingIds, setResearchingIds] = useState<Set<string>>(new Set())
  const [expandedResearch, setExpandedResearch] = useState<Set<string>>(new Set())

  // Tab state — drives the statusFilter automatically
  const [activeTab, setActiveTab] = useState<TabId>('all')

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [minScore, setMinScore] = useState('')
  const [icpFilter, setIcpFilter] = useState('')
  const [apolloOnly, setApolloOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [revivalFilter, setRevivalFilter] = useState(false)
  // Campaign cross-link: when arriving from a campaign ("View enrolled leads"),
  // the URL carries ?campaign_id= and we constrain the list to that campaign.
  const [campaignId, setCampaignId] = useState<string | null>(null)

  useEffect(() => {
    setCampaignId(new URLSearchParams(window.location.search).get('campaign_id'))
  }, [])

  // R8 (Alta) — Saved views: capture the full filter combo as a named, reusable
  // view (localStorage). Lets clients flip between "Hot SaaS leads", "Score 80+
  // unworked", etc. in one click.
  type SavedView = { name: string; activeTab: TabId; statusFilter: string; minScore: string; icpFilter: string; search: string; apolloOnly: boolean }
  const SAVED_VIEWS_KEY = 'kind_leads_saved_views_v1'
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  useEffect(() => {
    try { const raw = localStorage.getItem(SAVED_VIEWS_KEY); if (raw) setSavedViews(JSON.parse(raw)) } catch { /* ignore */ }
  }, [])
  function persistViews(next: SavedView[]) {
    setSavedViews(next)
    try { localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }
  function saveCurrentView() {
    const name = window.prompt('Name this view (e.g. "Hot SaaS leads"):')?.trim()
    if (!name) return
    const view: SavedView = { name, activeTab, statusFilter, minScore, icpFilter, search, apolloOnly }
    persistViews([...savedViews.filter(v => v.name !== name), view])
  }
  function applyView(v: SavedView) {
    setActiveTab(v.activeTab); setStatusFilter(v.statusFilter); setMinScore(v.minScore)
    setIcpFilter(v.icpFilter); setSearch(v.search); setApolloOnly(v.apolloOnly); setPage(1)
  }
  function deleteView(name: string) { persistViews(savedViews.filter(v => v.name !== name)) }

  const fetchData = useCallback(async (tok: string) => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (statusFilter) params.set('status', statusFilter)
      if (minScore)     params.set('min_score', minScore)
      if (icpFilter)    params.set('icp_id', icpFilter)
      if (apolloOnly)   params.set('apollo_consented', 'true')
      if (campaignId)   params.set('campaign_id', campaignId)

      const [statsRes, leadsRes, icpsRes] = await Promise.all([
        api.get<{ data: LeadStats }>('/leads/stats', tok),
        api.get<{ data: Lead[]; total: number }>(`/leads?${params}`, tok),
        api.get<{ data: ICP[] }>('/icps', tok),
      ])
      setStats(statsRes.data)
      setLeads(leadsRes.data || [])
      setTotal(leadsRes.total || 0)
      setIcps(icpsRes.data || [])
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load leads — please refresh.')
    }
    setLoading(false)
  }, [page, statusFilter, minScore, icpFilter, apolloOnly, campaignId])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setToken(session.access_token); fetchData(session.access_token) }
    })
  }, [fetchData])

  // When tab changes, update statusFilter and reset page
  function handleTabChange(tab: TabId) {
    setActiveTab(tab)
    setStatusFilter(tabToStatusFilter(tab))
    setPage(1)
    setSelectedIds(new Set())
    setRevivalFilter(false)
  }

  async function updateStatus(leadId: string, status: Lead['status']) {
    if (!token) return
    setActionLoading(`status-${leadId}`)
    try {
      await api.patch(`/leads/${leadId}/status`, { status }, token)
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l))

      // Auto-fire consent email when a lead is manually approved (scored → consent_sent)
      if (status === 'consent_sent') {
        try {
          await api.post(`/leads/${leadId}/consent`, {}, token)
          showToast('Consent email sent automatically ✓')
        } catch {
          // Consent send failed but status is already updated — show hint
          showToast('Status updated. Consent email could not be sent — try manually.', 'error')
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'error')
    }
    setActionLoading(null)
  }

  async function blockLead(leadId: string) {
    if (!token || !confirm('Permanently block this lead? They will be removed from all future pipelines.')) return
    setActionLoading(`block-${leadId}`)
    try {
      await api.post(`/leads/${leadId}/optout`, { reason: 'manual_block' }, token)
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: 'opted_out' as LeadStatus } : l))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to block lead', 'error')
    }
    setActionLoading(null)
  }

  async function enrichLead(leadId: string) {
    if (!token || enrichingIds.has(leadId)) return
    setEnrichingIds(prev => new Set(prev).add(leadId))
    setEnrichErrors(prev => { const next = { ...prev }; delete next[leadId]; return next })
    try {
      const res = await api.post<{ data: EnrichmentData }>(`/leads/${leadId}/enrich`, {}, token)
      setEnrichedLeads(prev => ({ ...prev, [leadId]: res.data }))
      setExpandedEnrichments(prev => new Set(prev).add(leadId))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Enrichment failed — try again'
      setEnrichErrors(prev => ({ ...prev, [leadId]: msg }))
    }
    setEnrichingIds(prev => { const next = new Set(prev); next.delete(leadId); return next })
  }

  function toggleEnrichment(leadId: string) {
    setExpandedEnrichments(prev => {
      const next = new Set(prev)
      next.has(leadId) ? next.delete(leadId) : next.add(leadId)
      return next
    })
  }

  // P2-5: Waterfall enrichment — fills missing fields via PDL → Hunter → Clearbit
  async function waterfallEnrichLead(leadId: string) {
    if (!token || waterfallingIds.has(leadId)) return
    setWaterfallIds(prev => new Set(prev).add(leadId))
    try {
      const res = await api.post<{ data: { filled: number; source: string } }>(`/leads/${leadId}/waterfall-enrich`, {}, token)
      setWaterfallResults(prev => ({ ...prev, [leadId]: res.data }))
      // Refresh lead list to show newly filled fields
      if (res.data.filled > 0) setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...res.data } : l))
    } catch {
      // silently fail — button just goes back to enabled
    }
    setWaterfallIds(prev => { const next = new Set(prev); next.delete(leadId); return next })
  }

  async function fetchResearch(leadId: string) {
    if (!token || researchingIds.has(leadId)) return
    // If already fetched, just toggle visibility
    if (researchData[leadId]) {
      setExpandedResearch(prev => {
        const next = new Set(prev)
        next.has(leadId) ? next.delete(leadId) : next.add(leadId)
        return next
      })
      return
    }
    setResearchingIds(prev => new Set(prev).add(leadId))
    try {
      const res = await api.get<{ data: { bullets: string[]; cached: boolean } }>(`/leads/${leadId}/research`, token)
      setResearchData(prev => ({ ...prev, [leadId]: res.data.bullets }))
      setExpandedResearch(prev => new Set(prev).add(leadId))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Research failed — try again', 'error')
    }
    setResearchingIds(prev => { const next = new Set(prev); next.delete(leadId); return next })
  }

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  async function runActiveIcp(tok: string) {
    const activeIcp = icps.find(i => i.is_active) ?? icps[0]
    if (!activeIcp) { showToast('Build an ICP first — go to ICP Settings', 'error'); return }
    setRunningIcp(true)
    setRunResult(null)
    try {
      // The run is asynchronous: the API starts sourcing in the background (search →
      // score → reveal emails → deliver) and returns instantly, so it no longer trips
      // the 15s request timeout. Poll a few times so delivered leads stream in.
      await api.post(`/icps/${activeIcp.id}/run`, {}, tok)
      showToast('FIGSY is sourcing your leads — they\'ll appear here as they\'re ready (about a minute)')
      setTimeout(() => fetchData(tok), 8000)
      setTimeout(() => fetchData(tok), 20000)
      setTimeout(() => fetchData(tok), 40000)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to start ICP run — please try again', 'error')
    }
    setRunningIcp(false)
  }

  async function sendConsentEmail(leadId: string) {
    if (!token) return
    setActionLoading(`consent-${leadId}`)
    try {
      await api.post(`/leads/${leadId}/consent`, {}, token)
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: 'consent_sent' as LeadStatus } : l))
      showToast('Consent email sent ✓')
    } catch {
      showToast('Failed to send — try again', 'error')
    }
    setActionLoading(null)
  }

  async function resendConsentEmail(leadId: string) {
    if (!token) return
    setActionLoading(`resend-${leadId}`)
    try {
      await api.post(`/leads/${leadId}/resend-consent`, {}, token)
      showToast('Consent email resent ✓')
    } catch {
      showToast('Failed to resend — try again', 'error')
    }
    setActionLoading(null)
  }

  async function draftEmail(leadId: string) {
    if (!token) return
    setActionLoading(`email-${leadId}`)
    try {
      const res = await api.post<{ data: { draft: string } }>(`/leads/${leadId}/draft-email`, {}, token)
      setEmailDraft({ leadId, draft: res.data.draft })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to generate email draft', 'error')
    }
    setActionLoading(null)
  }

  async function exportCSV() {
    if (!token) return
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
      const res = await fetch(`${base}/leads/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { showToast('Export failed — please try again', 'error'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = 'kind-leads.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch { showToast('Export failed — please try again', 'error') }
  }

  async function bulkConsentSend() {
    if (!token || selectedIds.size === 0) return
    setBulkSending(true)
    try {
      const res = await api.post<{ data: { sent: number; skipped: number } }>('/leads/bulk-consent', { lead_ids: Array.from(selectedIds) }, token)
      setSelectedIds(new Set())
      showToast(`Consent emails sent: ${res.data.sent} sent, ${res.data.skipped} skipped`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send bulk consent', 'error')
    }
    setBulkSending(false)
  }

  async function bulkExport() {
    if (!token) return
    setBulkExporting(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'}/leads/bulk-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      })
      if (!res.ok) { showToast('Export failed — try again', 'error'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      a.href = url; a.download = `kind-leads-${date}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch {
      showToast('Export failed — try again', 'error')
    }
    setBulkExporting(false)
  }

  async function bulkMarkAs(status: string) {
    if (!token || selectedIds.size === 0) return
    setBulkStatusLoading(true)
    setShowMarkAs(false)
    try {
      await api.post<{ success: boolean; updated: number }>('/leads/bulk-status', { leadIds: Array.from(selectedIds), status }, token)
      setLeads(prev => prev.map(l => selectedIds.has(l.id) ? { ...l, status: status as LeadStatus } : l))
      showToast(`Marked ${selectedIds.size} leads as ${status}`)
      setSelectedIds(new Set())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update statuses', 'error')
    }
    setBulkStatusLoading(false)
  }

  async function bulkDelete() {
    if (!token || selectedIds.size === 0) return
    if (!confirm(`Permanently delete ${selectedIds.size} lead${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    setBulkDeleting(true)
    try {
      const res = await api.post<{ success: boolean; deleted: number }>('/leads/bulk-delete', { leadIds: Array.from(selectedIds) }, token)
      setLeads(prev => prev.filter(l => !selectedIds.has(l.id)))
      showToast(`Deleted ${res.deleted} lead${res.deleted !== 1 ? 's' : ''}`)
      setSelectedIds(new Set())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete leads', 'error')
    }
    setBulkDeleting(false)
  }

  const filteredLeads = leads.filter(l => {
    if (search && !`${l.first_name} ${l.last_name} ${l.company} ${l.job_title}`.toLowerCase().includes(search.toLowerCase())) return false
    if (revivalFilter && l.status !== 'scored') return false
    return true
  })

  // For the Pending Review tab: leads with score >= 70 and status pending/scored
  const pendingReviewLeads = filteredLeads.filter(
    l => l.score !== null && l.score >= 70 && (l.status === 'pending' || l.status === 'scored')
  )

  const statCards = [
    { label: 'Total Leads',      value: stats?.total ?? 0,              icon: <Users className="w-5 h-5" />,       color: 'bg-[#F5F0FF] text-[#7C3AED]' },
    { label: 'Avg Score',        value: `${stats?.avg_score ?? 0}/100`, icon: <TrendingUp className="w-5 h-5" />,  color: 'bg-indigo-50 text-indigo-600' },
    { label: 'POPIA Consented',  value: stats?.consented ?? 0,          icon: <ShieldCheck className="w-5 h-5" />, color: 'bg-green-50 text-green-600' },
    { label: 'Est. pipeline value',   value: `$${(stats?.pipeline_value_usd ?? 0).toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600' },
  ]

  // Leads to show in table (for pending_review tab, further filter by score)
  const tableLeads = activeTab === 'pending_review'
    ? pendingReviewLeads
    : filteredLeads

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">People</h1>
          <p className="text-[#7B6FA0] text-sm mt-1">AI-scored B2B leads, POPIA-compliant and ready for outreach.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <button onClick={bulkConsentSend} disabled={bulkSending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <Send className="w-4 h-4" />{bulkSending ? 'Sending…' : `Send consent (${selectedIds.size})`}
            </button>
          )}
          {icps.length > 0 && token && (
            <button onClick={() => runActiveIcp(token)} disabled={runningIcp}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors">
              {runningIcp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {runningIcp ? 'Finding leads…' : 'Run ICP'}
            </button>
          )}
          <a href="/dashboard/leads/icp"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-100/80 text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors">
            <Settings2 className="w-4 h-4" />ICP Settings
          </a>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors">
            <Download className="w-4 h-4" />Export CSV
          </button>
        </div>
      </div>

      {/* Campaign cross-link banner — arrived from a campaign's "View enrolled leads" */}
      {campaignId && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
          <p className="text-sm text-indigo-900">
            Showing the <span className="font-semibold">{total}</span> lead{total === 1 ? '' : 's'} enrolled in this campaign.
          </p>
          <a href="/dashboard/leads" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 underline">
            Show all leads
          </a>
        </div>
      )}

      {/* Thinking panel — shows what FIGSY is doing while sourcing (V2, gated) */}
      {v2Enabled('thinking') && runningIcp && <FigsyThinking />}

      {/* C1 + C3 — Active ICP surfaced above People (V2, gated) */}
      {v2Enabled('leads') && (icps.find(i => i.is_active) ?? icps[0]) && (
        <ActiveIcpBanner icp={(icps.find(i => i.is_active) ?? icps[0])!} total={stats?.total ?? total} />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>{icon}</div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-[#7B6FA0] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Compliance notice */}
      <div className="bg-[#F5F0FF] border border-purple-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
        <p className="text-xs text-[#6D28D9]">
          <strong>POPIA & GDPR compliant.</strong> Leads are sourced from Apollo for B2B outreach under <strong>legitimate interest</strong>.
          Every email carries a one-click opt-out, and anyone who opts out is permanently blocked across all clients and never contacted again.
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 flex-wrap">
        {TABS.map(tab => {
          const count = tab.getCount(leads, stats, total)
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive ? tab.activePillCls : tab.pillCls
              }`}
            >
              {tab.label}
              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                isActive
                  ? 'bg-white/25 text-inherit'
                  : 'bg-gray-100 text-[#7B6FA0]'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Pending Review banner */}
      {activeTab === 'pending_review' && pendingReviewLeads.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {pendingReviewLeads.length} high-quality lead{pendingReviewLeads.length !== 1 ? 's' : ''} waiting for your approval to enroll in FIGSY
          </p>
          {pendingReviewLeads.length > 0 && (
            <button
              onClick={() => {
                const eligible = pendingReviewLeads.filter(l => l.email && l.status !== 'opted_out')
                setSelectedIds(new Set(eligible.map(l => l.id)))
              }}
              className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900 underline whitespace-nowrap"
            >
              Select all
            </button>
          )}
        </div>
      )}

      {/* Saved views (R8) */}
      <div className="flex flex-wrap items-center gap-2">
        {savedViews.map(v => (
          <span key={v.name} className="group inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-purple-50 border border-purple-100 text-xs font-medium text-[#7C3AED]">
            <button onClick={() => applyView(v)} className="hover:underline">{v.name}</button>
            <button onClick={() => deleteView(v.name)} aria-label={`Delete view ${v.name}`} className="text-[#9B8EC4] hover:text-rose-500 transition-colors">×</button>
          </span>
        ))}
        <button onClick={saveCurrentView}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-purple-200 text-xs font-medium text-[#9B8EC4] hover:text-[#7C3AED] hover:border-[#7C3AED] transition-colors">
          + Save current view
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9B8EC4]" />
            <input type="text" placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-purple-100/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
          </div>
          {/* Only show status filter when on "All" tab so it doesn't conflict */}
          {activeTab === 'all' && (
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 text-sm border border-purple-100/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-white">
              <option value="">All statuses</option>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          )}
          <select value={minScore} onChange={e => { setMinScore(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-purple-100/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-white">
            <option value="">Any score</option>
            <option value="80">Score 80+</option>
            <option value="60">Score 60+</option>
            <option value="40">Score 40+</option>
          </select>
          {icps.length > 0 && (
            <select value={icpFilter} onChange={e => { setIcpFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 text-sm border border-purple-100/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-white">
              <option value="">All ICPs</option>
              {icps.map(icp => <option key={icp.id} value={icp.id}>{icp.name}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 px-3 py-2 border border-purple-100/80 rounded-lg hover:border-gray-300 transition-colors">
            <input type="checkbox" checked={apolloOnly} onChange={e => { setApolloOnly(e.target.checked); setPage(1) }}
              className="rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED]" />
            Apollo consented only
          </label>
          <button
            onClick={() => { setRevivalFilter(r => !r); setPage(1) }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              revivalFilter
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-600'
            }`}
          >
            ♻️ Revival
            {!revivalFilter && leads.filter(l => l.status === 'scored').length > 0 && (
              <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {leads.filter(l => l.status === 'scored').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Revival campaign banner — W15 */}
      {revivalFilter && filteredLeads.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              ♻️ {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} ready for revival
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              These leads were scored but never contacted. Industry data shows 53% engagement on revival campaigns.
            </p>
          </div>
          <a href="/dashboard/figsy?template=revival"
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors shrink-0">
            Start revival campaign →
          </a>
        </div>
      )}

      {/* Lead table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-red-600 font-medium">Could not load leads</p>
            <p className="text-sm text-[#7B6FA0]">{fetchError}</p>
            {fetchError === 'Failed to fetch' && (
              <p className="text-xs text-[#9B8EC4] max-w-xs text-center">
                The K.I.N.D API is not responding. Check that the Railway service is running at{' '}
                <span className="font-mono">{process.env.NEXT_PUBLIC_API_URL || 'kindapi-production-e64c.up.railway.app'}</span>
              </p>
            )}
            <button onClick={() => token && fetchData(token)} className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm hover:bg-[#6D28D9] transition-colors">
              Retry
            </button>
          </div>
        ) : tableLeads.length === 0 ? (
          <EmptyState tab={activeTab} hasIcps={icps.length > 0} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[960px]">
                <thead>
                  <tr className="border-b border-purple-100/60">
                    <th className="px-4 py-3 w-10" colSpan={1}>
                      <input
                        type="checkbox"
                        checked={tableLeads.length > 0 && selectedIds.size === tableLeads.filter(l => l.status !== 'opted_out' && l.email).length}
                        onChange={e => {
                          const eligible = tableLeads.filter(l => l.status !== 'opted_out' && l.email)
                          setSelectedIds(e.target.checked ? new Set(eligible.map(l => l.id)) : new Set())
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    {['Lead', 'Company', 'Score', 'Pipeline Stage', 'Technographics', 'Job Postings', 'Source', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#7B6FA0] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tableLeads.map(lead => (
                    <React.Fragment key={lead.id}>
                    <tr className={`hover:bg-gray-50 transition-colors ${lead.status === 'opted_out' ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        {lead.status !== 'opted_out' && lead.email && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(lead.id)}
                            onChange={e => setSelectedIds(prev => {
                              const next = new Set(prev)
                              e.target.checked ? next.add(lead.id) : next.delete(lead.id)
                              return next
                            })}
                            className="rounded border-gray-300"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{lead.first_name} {lead.last_name}</p>
                        <p className="text-xs text-[#9B8EC4]">{lead.job_title || '—'}</p>
                        {lead.email && <p className="text-xs text-[#9B8EC4]">{lead.email}</p>}
                        {/* R20 — job-change alert badge */}
                        {(lead as { job_changed_at?: string | null }).job_changed_at && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            🔄 Changed jobs — reconnect
                          </span>
                        )}
                        <BuyingSignals lead={lead} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{lead.company || '—'}</p>
                        <p className="text-xs text-[#9B8EC4]">{lead.country || ''}</p>
                      </td>
                      <td className="px-4 py-3"><ScoreBadge score={lead.score} /></td>
                      <td className="px-4 py-3">
                        <PipelineStageChip status={lead.status} />
                        <CampaignMicroBar lead={lead} />
                        {(() => {
                          // lead → its campaign back-link (campaign attached server-side)
                          const camp = (lead as Lead & { campaign?: { id: string; name: string } | null }).campaign
                          return camp ? (
                            <a href={`/dashboard/figsy/${camp.id}`}
                              className="block mt-1 text-[11px] font-medium text-[#7C3AED] hover:text-[#6D28D9] truncate max-w-[160px]"
                              title={camp.name}>
                              In: {camp.name} →
                            </a>
                          ) : null
                        })()}
                        {lead.consent_auto_fired && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                            ✓ Auto-sent
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <TechnographicsChip lead={lead} />
                      </td>
                      <td className="px-4 py-3">
                        <JobPostingsBadge lead={lead} />
                      </td>
                      <td className="px-4 py-3">
                        <ApolloBadge consented={lead.apollo_consented} />
                        {lead.linkedin_url && (
                          <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0077B5]/10 text-[#0077B5] hover:bg-[#0077B5]/20 transition-colors border border-[#0077B5]/20"
                            title="View LinkedIn profile">
                            in
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lead.status !== 'opted_out' && (
                          <div className="flex items-center gap-1">
                            {(lead.status === 'pending' || lead.status === 'scored') && lead.email && (
                              <button
                                onClick={() => sendConsentEmail(lead.id)}
                                disabled={actionLoading === `consent-${lead.id}`}
                                title="Send consent email"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium transition-colors disabled:opacity-40"
                              >
                                {actionLoading === `consent-${lead.id}`
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Send className="w-3 h-3" />}
                                Consent
                              </button>
                            )}
                            {lead.status === 'scored' && lead.email && (
                              <button onClick={() => updateStatus(lead.id, 'consent_sent')}
                                disabled={actionLoading === `status-${lead.id}`}
                                title="Send POPIA consent"
                                className="p-1.5 rounded-md hover:bg-indigo-50 text-indigo-600 transition-colors disabled:opacity-40">
                                {actionLoading === `status-${lead.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {lead.status === 'consent_sent' && (
                              <>
                                <button onClick={() => resendConsentEmail(lead.id)}
                                  disabled={actionLoading === `resend-${lead.id}`}
                                  title="Resend consent email"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-600 text-xs font-medium transition-colors disabled:opacity-40">
                                  {actionLoading === `resend-${lead.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                  Resend
                                </button>
                                <button onClick={() => updateStatus(lead.id, 'consent_given')}
                                  disabled={actionLoading === `status-${lead.id}`}
                                  title="Mark as consented"
                                  className="p-1.5 rounded-md hover:bg-green-50 text-green-600 transition-colors disabled:opacity-40">
                                  {actionLoading === `status-${lead.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                </button>
                              </>
                            )}
                            {lead.status === 'consent_given' && lead.email && (
                              <button onClick={() => draftEmail(lead.id)}
                                disabled={actionLoading === `email-${lead.id}`}
                                title="Generate AI outreach email"
                                className="p-1.5 rounded-md hover:bg-purple-50 text-purple-600 transition-colors disabled:opacity-40">
                                {actionLoading === `email-${lead.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <button onClick={() => blockLead(lead.id)}
                              disabled={actionLoading === `block-${lead.id}`}
                              title="Permanently block this lead"
                              className="p-1.5 rounded-md hover:bg-red-50 text-red-400 transition-colors disabled:opacity-40">
                              {actionLoading === `block-${lead.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                            </button>
                            {/* Enrich button */}
                            <button
                              onClick={() => enrichedLeads[lead.id] ? toggleEnrichment(lead.id) : enrichLead(lead.id)}
                              disabled={enrichingIds.has(lead.id)}
                              title={enrichedLeads[lead.id] ? (expandedEnrichments.has(lead.id) ? 'Hide enrichment' : 'Show enrichment') : 'Enrich with AI research'}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-purple-300 text-purple-600 bg-white hover:bg-purple-50 text-xs font-medium transition-colors disabled:opacity-40"
                            >
                              {enrichingIds.has(lead.id)
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Sparkles className="w-3 h-3" />}
                              {enrichingIds.has(lead.id) ? 'Enriching…' : enrichedLeads[lead.id] ? (expandedEnrichments.has(lead.id) ? 'Hide' : 'Show') : 'Enrich'}
                            </button>
                            {/* P2-5: Waterfall enrich button */}
                            <button
                              onClick={() => waterfallEnrichLead(lead.id)}
                              disabled={waterfallingIds.has(lead.id) || !!waterfallResults[lead.id]}
                              title={waterfallResults[lead.id] ? `Filled ${waterfallResults[lead.id].filled} fields via ${waterfallResults[lead.id].source}` : 'Waterfall enrich — fill missing fields via PDL → Hunter → Clearbit'}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-teal-200 text-teal-600 bg-white hover:bg-teal-50 text-xs font-medium transition-colors disabled:opacity-40"
                            >
                              {waterfallingIds.has(lead.id)
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Layers className="w-3 h-3" />}
                              {waterfallingIds.has(lead.id) ? 'Enriching…' : waterfallResults[lead.id] ? `+${waterfallResults[lead.id].filled} filled` : 'Fill data'}
                            </button>
                            {/* Research button */}
                            <button
                              onClick={() => fetchResearch(lead.id)}
                              disabled={researchingIds.has(lead.id)}
                              title={researchData[lead.id] ? (expandedResearch.has(lead.id) ? 'Hide research' : 'Show research') : 'AI company research'}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50 text-xs font-medium transition-colors disabled:opacity-40"
                            >
                              {researchingIds.has(lead.id)
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Search className="w-3 h-3" />}
                              {researchingIds.has(lead.id) ? 'Researching…' : researchData[lead.id] ? (expandedResearch.has(lead.id) ? 'Hide' : 'Research') : 'Research'}
                            </button>
                          </div>
                        )}
                        {/* Enrichment error inline (outside opted_out guard so it always shows) */}
                        {enrichErrors[lead.id] && (
                          <p className="text-[10px] text-red-500 mt-1">{enrichErrors[lead.id]}</p>
                        )}
                      </td>
                    </tr>
                    {/* Enrichment expanded row */}
                    {enrichedLeads[lead.id] && expandedEnrichments.has(lead.id) && (
                      <tr className="bg-[#F9F7FF]">
                        <td colSpan={9} className="px-6 pb-4 pt-0">
                          <EnrichmentPanel
                            data={enrichedLeads[lead.id]}
                            onCopy={text => { navigator.clipboard.writeText(text); showToast('Copied to clipboard ✓') }}
                          />
                        </td>
                      </tr>
                    )}
                    {/* Research expanded row */}
                    {researchData[lead.id] && expandedResearch.has(lead.id) && (
                      <tr className="bg-indigo-50/40">
                        <td colSpan={9} className="px-6 pb-4 pt-0">
                          <div className="bg-white border border-indigo-100 rounded-xl p-4 mt-2 space-y-2.5">
                            <div className="flex items-center gap-2">
                              <Search className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">AI Company Research</span>
                            </div>
                            <ul className="space-y-2">
                              {researchData[lead.id].map((bullet, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                  {bullet}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {total > 50 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-purple-100/60">
                <p className="text-xs text-[#9B8EC4]">Showing {Math.min(page * 50, total)} of {total} leads</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-xs border border-purple-100/80 rounded-md hover:border-gray-400 disabled:opacity-40 transition-colors">Previous</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page * 50 >= total}
                    className="px-3 py-1.5 text-xs border border-purple-100/80 rounded-md hover:border-gray-400 disabled:opacity-40 transition-colors">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-4 bg-gray-900 text-white px-6 py-4 rounded-t-xl shadow-2xl">
          <span className="text-sm font-medium shrink-0">{selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <button
              onClick={bulkExport}
              disabled={bulkExporting}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />{bulkExporting ? 'Exporting…' : 'Export selected'}
            </button>
            <button
              onClick={() => bulkConsentSend()}
              disabled={bulkSending}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />{bulkSending ? 'Sending…' : 'Send consent'}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMarkAs(p => !p)}
                disabled={bulkStatusLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {bulkStatusLoading ? 'Updating…' : 'Mark as…'}<ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showMarkAs && (
                <div className="absolute bottom-full mb-1 left-0 bg-white rounded-lg shadow-xl border border-purple-100/60 overflow-hidden text-gray-900 min-w-36">
                  {(['consent_sent', 'consent_given', 'exported', 'rejected'] as const).map(s => (
                    <button key={s} onClick={() => bulkMarkAs(s)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 capitalize transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={bulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />{bulkDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
          <button
            onClick={() => { setSelectedIds(new Set()); setShowMarkAs(false) }}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI Email draft modal */}
      {emailDraft && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">AI-generated outreach email</h3>
            </div>
            <div className="bg-[#F5EEFF]/60 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-4 max-h-72 overflow-y-auto">
              {emailDraft.draft}
            </div>
            {token && <WhyFigsyWrote leadId={emailDraft.leadId} token={token} />}
            {token && <SpamCheck draft={emailDraft.draft} token={token} />}
            <div className="flex items-center gap-3">
              <button onClick={() => { navigator.clipboard.writeText(emailDraft.draft) }}
                className="flex-1 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">
                Copy to clipboard
              </button>
              <button onClick={() => setEmailDraft(null)}
                className="px-4 py-2.5 border border-purple-100/80 text-sm font-medium rounded-xl hover:border-gray-400 transition-colors">
                Close
              </button>
            </div>
            <p className="text-xs text-[#9B8EC4] mt-3 text-center">Review before sending. Every email includes a one-click opt-out.</p>
          </div>
        </div>
      )}
    </div>
  )
}
