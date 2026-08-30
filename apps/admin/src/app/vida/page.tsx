'use client'

import { useCallback, useEffect, useState } from 'react'
import SequenceQuality, { type Quality } from '@/components/SequenceQuality'
import { loadError, panelView, notice, noticeClass, noticeText, vatBadge, PACK_PRICE_USD, MAX_SEQUENCE_STEPS, type Notice } from '@kind/shared'

// #483–#485 — VIDA OPERATOR CONSOLE (working area).
// Renders inside the Vida shell (app/vida/layout.tsx owns the top bar + rail): Clients
// panel | Vida scoped to the selected client | the client's work surfaces as tabs.
// Consumes the admin-gated /operator API via /api/proxy (admin key + verified operator
// email injected server-side). Design ref: docs/mv-previews/vida2.html.
//
// THE LAUNCH PATH lives here (V2–V14). The old self-serve console could do all of this,
// but only behind a client JWT — so the operator could look at a client's campaign and
// never propose, edit, fill, preview, test or run one. Every step below is now reachable:
//   ICP by conversation → people picked → campaign proposed & approved → sequence
//   proposed & approved → preview → test email to us → RUN.
// Nothing sends to a prospect without the human Send gate; the $4 is still charged only
// at the CLIENT's 👍 in Milla, never here.

type ClientRow = {
  id: string
  company_name: string | null
  industry: string | null
  country: string | null
  is_demo: boolean | null
  wallet_balance_usd: number | null
  house_or_demo: boolean
  /** C6 — raw, so the shared `vatBadge` decides how to say it and the API keeps no second opinion. */
  vat_number?: string | null
}

type SourcedCard = { id: string; first_name: string | null; last_name: string | null; company: string | null; job_title: string | null; score: number | null; status: string | null; surfaced_for_approval_at: string | null; approval_expires_at: string | null }
type LeadJoin = { first_name?: string | null; last_name?: string | null; company?: string | null } | null
type NeedsApprovalCard = {
  id: string; lead_id: string; status: string | null; created_at: string | null
  to_email: string | null; subject: string | null; body: string | null; sequence_step: number | null
  leads?: LeadJoin
}
type SendingCard = { id: string; lead_id: string; current_step: number | null; total_steps: number | null; status: string | null; next_send_at: string | null }
type RepliedCard = { id: string; lead_id: string; from_name: string | null; from_email: string | null; classification: string | null; received_at: string | null; qualified_at: string | null }
type QualifiedCard = { id: string; first_name: string | null; last_name: string | null; company: string | null; email: string | null; score: number | null }
type BookedCard = { id: string; lead_id: string; start_time: string | null; first_name: string | null; last_name: string | null; company: string | null
  status: string | null; no_show_at: string | null; rebook_count: number }

type Board = {
  client: { id: string; company_name: string | null }
  columns: {
    sourced: { count: number; cards: SourcedCard[] }
    needs_approval: { count: number; cards: NeedsApprovalCard[] }
    sending: { count: number; cards: SendingCard[] }
    replied: { count: number; cards: RepliedCard[] }
    qualified: { count: number; cards: QualifiedCard[] }
    booked: { count: number; cards: BookedCard[] }
  }
}

type Status = { outreach_enabled: boolean; daily_cap: number | null }
type CmdMsg = { role: 'operator' | 'vida'; text: string; link?: string | null }
type Blockers = { send_gate: number; money_gate: number; unsent_sourced: number; replies_to_triage: number }

// Per-client cockpit (GET /operator/cockpit) — the ICP/campaign/sequence/inbox surfaces.
// ⚑ 30 Aug (BUILD-003 PR3) — 'Programme' added. Everything PR2 built was invisible here:
// status, pause, the review hold, the sourcing ceiling, batches, stranded batches. A control
// nobody can see is not a control.
type CockpitTab = 'Inbox' | 'Approvals' | 'People' | 'Campaign' | 'ICP' | 'Sequence' | 'Asks' | 'Bookings' | 'Programme'
type CampaignRow = {
  id: string; name: string; status: string; leads_enrolled: number; emails_sent: number
  replies_total: number; replies_interested: number; created_at: string | null
  campaign_intent?: string | null; copilot_mode?: boolean | null; daily_send_limit?: number | null
  send_days?: string[] | null; send_hour_utc?: number | null
  ab_subject_b?: string | null; ab_subject_c?: string | null
  ab_subject_d?: string | null; ab_subject_e?: string | null
}
type Cockpit = {
  client:    { id: string; company_name: string | null }
  onboarding: { percent: number; missing: string[]; checks: { key: string; label: string; ok: boolean }[] }
  // `pending_*` carry a LIVE client's revision that is waiting for K.I.N.D review — saved,
  // and deliberately NOT in effect until an operator presses GO (founder-ruled 22 Aug).
  icps:      { id: string; name: string | null; created_at: string | null; last_run_at: string | null
               is_active?: boolean | null
               pending_targeting?: { name?: string | null } | null
               pending_submitted_at?: string | null
               pending_campaign_intent?: string | null }[]
  campaigns: CampaignRow[]
  sequences: { id: string; name: string; steps: unknown; created_at: string | null; updated_at: string | null }[]
  replies:   { id: string; lead_id: string | null; from_name: string | null; from_email: string | null; classification: string | null; qualified_at: string | null; meeting_booked_at: string | null; received_at: string | null }[]
}
type SourcePreview = { count: number; pool_free: number; pdl_needed: number; pdl_cost_est: number; allowance_left: number; leads_per_run: number; capped: boolean; is_demo: boolean; icp_name?: string | null; no_active_icp?: boolean }

// V17 — the bell. Derived live from real rows (GET /operator/alerts).
type Alert = { client_id: string; company_name: string | null; kind: string; label: string; severity: 'high' | 'normal' }
// THE WORKLIST — where each client is and the ONE next action. Replaces "eight tabs and work
// out where you are"; the step logic is a tested decision table in lib/client-step.ts.
type NextAction = {
  step: number; label: string; actor: 'you' | 'them' | 'engine'
  cta?: { kind: 'inbox' | 'sequence' | 'run' | 'replies' | 'qualify' | 'approvals' | 'chase'; label: string }
  urgency: number
}
type RatioReading = { sourced: number; approved: number; ratio: number | null; confident: boolean; label: string }
// `exempt` arrives from the API's `coldView` (#619) — this account is outside the 30-day rule
// (the house account, a demo), so it must never be shown as suspended or going quiet.
type ColdState = {
  daysIdle: number | null; neverStarted: boolean; warn: boolean; cold: boolean; label: string
  exempt?: boolean; why?: string
}
/**
 * #620 — what the last enrol run refused, and why.
 *
 * The enrol paths always NAMED their refusals and nothing rendered them, so a systematic refusal
 * ("every draft rejected", "every UK lead a sole trader") read on this board as an idle run.
 */
type EnrolSkips = {
  created_at: string
  subject_id: string | null
  detail: { enrolled?: number; skipped?: number; summary?: string; reasons?: Record<string, number> }
}
/**
 * How many of this client's leads we can actually send to today.
 *
 * ⚠️ NOT the same question as `EnrolSkips`, and that is why it is a second reading rather than
 * one more reason on that chip. Enrol-skips is the LAST RUN; this is the BOOK. With outreach
 * still switched off, no run has ever happened — so the skip chip renders nothing and would go
 * on rendering nothing until send-day, while this answers the question now.
 */
type CountryCoverage = {
  total: number; missing: number; sendable: number; held: number; capped: boolean; line: string
  /** Decided by the API, never here — see the render comment below. */
  chip?: { show: boolean; stop?: boolean; text?: string; title?: string }
}
/** #619 — real money, a comp, or nothing. A comp ENTITLES; it is not a payment. */
type FundedVia = 'real' | 'comp' | null
type WorkRow = ClientRow & {
  counts: { sourced: number; with_client: number; approved: number }
  pack: { active: boolean; included: number; left: number; label: string }
  ratio: RatioReading
  cold: ColdState
  funded_via?: FundedVia
  /** #623 — NET CASH RECEIVED, summed from the ledger by the API. Never derived from counts. */
  money_in_usd?: number
  next: NextAction
}
// The founder's mapped flow, as the rail across the top of the work column.
const FLOW_STEPS: [number, string][] = [
  [0, 'Signed up'], [2, `Paid $${PACK_PRICE_USD}`], [3, 'Inbox + people'], [4, 'Client picks'],
  [5, 'Sequence'], [6, 'Run'], [7, 'Replies'], [8, 'Book'], [9, 'Live'],
]
// #619 — STEP 2 IS A MONEY SENTENCE, AND ON A COMPED ACCOUNT IT WAS A FALSE ONE.
// The rail ticked "Paid $299 ✓" for the house account, which has never paid us anything: it
// holds a `manual_grant`, which is inside PAID_TX_TYPES on purpose because it ENTITLES. The
// board read entitlement and printed a payment. Only step 2 changes — every other step means
// the same thing however the account was funded.
function flowStepLabel(step: number, label: string, via: FundedVia | undefined): string {
  return step === 2 && via === 'comp' ? 'Comped' : label
}
// V4 — the pool the operator picks from.
type Person = {
  id: string; first_name: string | null; last_name: string | null; job_title: string | null
  company: string | null; industry: string | null; country: string | null; score: number | null
  status: string | null; email: string | null; revealed_at: string | null
  enrolled: boolean; in_campaign: boolean
  /** Which ICP found them — a client with two ICPs saw one flat list before this. */
  icp_name: string | null
  /** In the top 20 by score we told the client we'd start with. */
  recommended: boolean
}
// V14 — who is in a campaign, and where they are in the sequence.
type Enrollment = {
  id: string; lead_id: string; status: string | null; current_step: number | null; total_steps: number | null
  next_send_at: string | null; first_name: string | null; last_name: string | null
  job_title: string | null; company: string | null; replied: string | null
}
type CampEdit = {
  id?: string; name: string; campaign_intent: string; daily_send_limit: string; copilot_mode: boolean
  // V7 in full — the send window and the A/B subject variants. The window is real now:
  // the send cron honours settings.send_days / send_hour_utc (it ignored them before).
  send_days: string[]; send_hour_utc: string
  ab_subject_b: string; ab_subject_c: string; ab_subject_d: string; ab_subject_e: string
}
const DAY_LABELS: [string, string][] = [
  ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun'],
]
type SeqStep = { subject: string; body: string; wait_days: number }
type ChatTurn = { role: 'user' | 'assistant'; content: string }
type IcpDraft = Record<string, unknown> | null
type Ask = { id: string; question: string; asked_at: string; answers: { content: string; at: string }[] }

// #501 — the 8-step operating flow, shown as a status ribbon across the top of the console.
const FLOW = ['Sign up', 'Build plan', 'Approve send', 'Qualify', 'Client approves', 'Follow-up', 'Book', 'Learn']

// V1 — an onboarding gap is not a label, it is a door. Each one opens the tab that fixes it.
const GAP_TAB: Record<string, CockpitTab | null> = {
  'Approved ICP': 'ICP',
  'Sequence written': 'Sequence',
  'Campaign live': 'Campaign',
  'Company name': null, 'Industry': null, 'Country': null,
  'Website': null, 'Who signs the emails': null,
}

function initials(name: string | null): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
function fullName(f: string | null, l: string | null): string {
  return [f, l].filter(Boolean).join(' ').trim() || 'Unknown lead'
}

export default function VidaConsolePage() {
  const [clients, setClients] = useState<ClientRow[] | null>(null)
  const [clientsError, setClientsError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  // PR2 — the one proof-review action: which client is being resolved, and what to say after.
  const [proofBusy, setProofBusy] = useState<string | null>(null)
  const [proofMsg, setProofMsg] = useState<string | null>(null)
  const [work, setWork] = useState<WorkRow[] | null>(null)
  // #620 — the last enrol run that REFUSED somebody, for the selected client. Null is the good
  // case (nobody refused), which is why an empty trail is not an error.
  const [enrolSkips, setEnrolSkips] = useState<EnrolSkips | null>(null)
  // How much of the selected client's book is sendable today. Null = not read yet or unreadable;
  // an unreadable count must never render as "all clear".
  const [coverage, setCoverage] = useState<CountryCoverage | null>(null)
  // Blended names-per-approval across the real book — the figure that belongs in the
  // cashflow lab, kept separate from the noisy per-client reading.
  const [bookRatio, setBookRatio] = useState<RatioReading | null>(null)
  const [onlyNeedsYou, setOnlyNeedsYou] = useState(true)

  const [board, setBoard] = useState<Board | null>(null)
  const [boardError, setBoardError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [openDrafts, setOpenDrafts] = useState<Set<string>>(new Set())
  const toggleDraft = (id: string) => setOpenDrafts(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const [status, setStatus] = useState<Status | null>(null)
  const [blockers, setBlockers] = useState<Blockers | null>(null)
  const [cmd, setCmd] = useState('')
  const [cmdLog, setCmdLog] = useState<CmdMsg[]>([])
  const [cmdBusy, setCmdBusy] = useState(false)

  // Per-client cockpit (ICP · Campaign · Sequence · Inbox) — one admin-key read.
  const [tab, setTab] = useState<CockpitTab>('Inbox')
  const [cockpit, setCockpit] = useState<Cockpit | null>(null)
  // Declared here, not with the other derived values further down: an effect below uses it in
  // a DEPENDENCY ARRAY, which is evaluated during render — a later `const` would throw.
  const activeCampaign = cockpit?.campaigns.find(c => c.status === 'active') ?? cockpit?.campaigns[0] ?? null
  const [cockpitLoading, setCockpitLoading] = useState(false)
  const [cockpitError, setCockpitError] = useState<string | null>(null)
  const [cockpitBusy, setCockpitBusy] = useState(false)

  const loadCockpit = useCallback(async (clientId: string) => {
    setCockpitLoading(true); setCockpitError(null)
    try {
      const j = await fetch(`/api/proxy/operator/cockpit?client_id=${encodeURIComponent(clientId)}`).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Failed to load cockpit')
      setCockpit(j.data)
    } catch (e) { setCockpitError(e instanceof Error ? e.message : 'Failed to load cockpit') }
    setCockpitLoading(false)
  }, [])

  // ⚑ 30 Aug (BUILD-003 PR3) — PROGRAMME TRUTH. Loaded separately from the cockpit so a
  // programme read failure can never blank the tabs an operator uses every day.
  type ProgrammeTruth = {
    programme: null | {
      id: string; status: string; state: string; meeting_target: number
      sourcing_ceiling: number; sourced_used: number; sourced_reserved: number; room_remaining: number
      paused_at: string | null; pause_reason: string | null
      approved_at: string | null; second_paid_at: string | null
      review_required_at: string | null; review_reason: string | null; review_resolved_at: string | null
      review_trigger_leads: number; batch_size: number
    }
    batches: { id: string; seq: number; status: string; requested: number; granted: number; delivered: number | null; created_at: string | null }[]
    stranded: { id: string; seq: number }[]
    blockers: { kind: string; detail: string }[]
    degraded: string[]
  }
  const [prog, setProg] = useState<ProgrammeTruth | null>(null)
  const [progErr, setProgErr] = useState<string | null>(null)
  const loadProgramme = useCallback(async (clientId: string) => {
    setProgErr(null)
    try {
      const j = await fetch(`/api/proxy/operator/programme?client_id=${encodeURIComponent(clientId)}`).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Failed to load programme')
      setProg(j.data as ProgrammeTruth)
    } catch (e) { setProgErr(e instanceof Error ? e.message : 'Failed to load programme'); setProg(null) }
  }, [])

  // Inbox thread — open a prospect reply, draft an answer in the client's voice, send it.
  const [openReply, setOpenReply] = useState<string | null>(null)
  const [thread, setThread] = useState<{ reply: Record<string, unknown>; lead: Record<string, unknown> | null } | null>(null)
  const [draft, setDraft] = useState('')
  const [replyBusy, setReplyBusy] = useState<string | null>(null)
  const [replyMsg, setReplyMsg] = useState<string | null>(null)

  // Launch-path state — everything the operator now actually authors.
  const [people, setPeople] = useState<Person[] | null>(null)
  const [campEdit, setCampEdit] = useState<CampEdit | null>(null)
  const [proposal, setProposal] = useState<{ name: string; campaign_intent: string; icp_name: string } | null>(null)
  const [testResult, setTestResult] = useState<{ preview: { subject: string; body: string }; sent: boolean; to: string | null } | null>(null)
  const [enrollView, setEnrollView] = useState<{ campaign: CampaignRow; rows: Enrollment[] } | null>(null)
  const [icpMode, setIcpMode] = useState<'list' | 'chat'>('list')
  const [icpChat, setIcpChat] = useState<ChatTurn[]>([])
  const [icpInput, setIcpInput] = useState('')
  const [icpProposal, setIcpProposal] = useState<IcpDraft>(null)
  const [seqPreview, setSeqPreview] = useState<{ name: string; steps: { step: number; day: number; subject: string; body: string }[]; sample_lead: Record<string, unknown>; quality?: Quality } | null>(null)
  const [asks, setAsks] = useState<Ask[] | null>(null)
  // What the client said WITHOUT us asking — their one channel, previously invisible.
  const [fromClient, setFromClient] = useState<{ id: string; content: string; at: string }[]>([])
  const [askInput, setAskInput] = useState('')

  // Reset every per-client surface on a client switch — a stale draft belonging to another
  // client is the one mistake this console must never make.
  useEffect(() => {
    if (!selected) { setCockpit(null); return }
    setTab('Inbox'); setCockpit(null)
    setOpenReply(null); setThread(null); setDraft(''); setReplyMsg(null)
    setPeople(null); setCampEdit(null); setProposal(null)
    setTestResult(null); setEnrollView(null)
    setIcpMode('list'); setIcpChat([]); setIcpInput(''); setIcpProposal(null)
    setSeqPreview(null); setAsks(null); setFromClient([]); setAskInput(''); setSaveMsg(null)
    setProg(null); setProgErr(null)
    loadCockpit(selected)
    loadProgramme(selected)
  }, [selected, loadCockpit, loadProgramme])

  async function openThread(id: string) {
    if (!selected) return
    setOpenReply(id); setThread(null); setDraft(''); setReplyMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/replies/${id}?client_id=${encodeURIComponent(selected)}`).then(r => r.json())
      if (j?.success) setThread(j.data)
      else setReplyMsg(j?.error || 'Could not load the thread')
    } catch { setReplyMsg('Could not load the thread') }
  }

  async function draftReply() {
    if (!selected || !openReply) return
    setReplyBusy('draft'); setReplyMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/replies/${openReply}/draft`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected }),
      }).then(r => r.json())
      if (j?.success) setDraft(j.data.draft); else setReplyMsg(j?.error || 'Could not draft')
    } catch { setReplyMsg('Could not draft') }
    setReplyBusy(null)
  }

  async function sendReply() {
    if (!selected || !openReply || !draft.trim()) return
    setReplyBusy('send'); setReplyMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/replies/${openReply}/send`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected, body: draft }),
      }).then(r => r.json())
      if (j?.success) {
        setReplyMsg(j.data?.demo ? 'Demo client — send suppressed (nothing emailed).' : 'Sent.')
        setDraft(''); setOpenReply(null); setThread(null); loadCockpit(selected)
      } else setReplyMsg(j?.error || 'Could not send')
    } catch { setReplyMsg('Could not send') }
    setReplyBusy(null)
  }

  // ⚑ 27 Aug (PR2) — MARK A PROOF REVIEW HANDLED.
  //
  // The alert says a prospect is waiting on a human; this is how the human says they are no
  // longer waiting. Same shape as `sendReply` above — proxy POST, read `success`, refresh the
  // surface it changed — because a second pattern for one button is a second pattern to keep.
  //
  // ⚠️ IT REFRESHES FROM THE SERVER RATHER THAN DROPPING THE ROW LOCALLY. Splicing the alert
  // out of local state would show "handled" for a write that failed, which is the same lie
  // the route's own `already_resolved` bug told. The list re-reads; if the review is still
  // open it comes back and stays on screen.
  async function resolveProofReview(clientId: string) {
    setProofBusy(clientId); setProofMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/proof-review/${encodeURIComponent(clientId)}/resolve`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
      }).then(r => r.json())
      if (j?.success) {
        const fresh = await fetch('/api/proxy/operator/alerts').then(r => r.json())
        if (fresh?.success) setAlerts(fresh.data)
        setProofMsg(j.data?.resolved === 'resolved' ? 'Marked reviewed.' : 'Already handled.')
      } else {
        setProofMsg(j?.error || 'Could not mark it reviewed — it is still open.')
      }
    } catch {
      setProofMsg('Could not mark it reviewed — it is still open.')
    }
    setProofBusy(null)
  }

  // V4d — ICP + SEQUENCE AUTHORING. Read-only views were not enough: the operator has to be
  // able to CHANGE the targeting and the messaging, which is our actual job in this model.
  const [icpEdit, setIcpEdit] = useState<Record<string, string> | null>(null)
  const [seqEdit, setSeqEdit] = useState<{ id?: string; name: string; steps: SeqStep[] } | null>(null)
  // #612 — the copy verdict for whatever is currently in the editor. Cleared whenever the
  // steps change, because a verdict about copy that has since been edited is a stale green.
  const [seqQuality, setSeqQuality] = useState<Quality | null>(null)
  const [saveMsg, setSaveMsg] = useState<Notice | null>(null)

  const ICP_FIELDS: [string, string][] = [
    ['name', 'Name'], ['industries', 'Industries'], ['job_titles', 'Job titles'],
    ['seniority_levels', 'Seniority'], ['company_sizes', 'Company sizes'],
    ['geographies', 'Geographies'], ['tech_stack', 'Tech stack'], ['keywords', 'Keywords'],
  ]

  const joinArr = (v: unknown) => Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : ''

  async function openIcpEditor(icpId?: string) {
    if (!selected) return
    setSaveMsg(null); setIcpMode('list')
    if (!icpId) { setIcpEdit({ name: '', industries: '', job_titles: '', seniority_levels: '', company_sizes: '', geographies: '', tech_stack: '', keywords: '' }); return }
    try {
      const j = await fetch(`/api/proxy/operator/icp/${icpId}?client_id=${encodeURIComponent(selected)}`).then(r => r.json())
      if (!j?.success) throw new Error(j?.error)
      const d = j.data as Record<string, unknown>
      setIcpEdit({ icp_id: icpId, name: String(d.name ?? ''), industries: joinArr(d.industries), job_titles: joinArr(d.job_titles),
        seniority_levels: joinArr(d.seniority_levels), company_sizes: joinArr(d.company_sizes),
        geographies: joinArr(d.geographies), tech_stack: joinArr(d.tech_stack), keywords: joinArr(d.keywords) })
    } catch { setSaveMsg(notice.error('Could not open that ICP')) }
  }

  // V2 — the ICP is built by TALKING, the way it was in the old console. The form stays as
  // the precise-edit fallback; the conversation is the front door.
  async function sendIcpChat(text: string) {
    if (!selected || !text.trim() || cockpitBusy) return
    const history = icpChat.slice(-12)
    setIcpChat(l => [...l, { role: 'user', content: text }]); setIcpInput(''); setCockpitBusy(true)
    try {
      const j = await fetch('/api/proxy/operator/icp/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected, message: text, history }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Could not work the ICP')
      setIcpChat(l => [...l, { role: 'assistant', content: j.data.message }])
      if (j.data.icp) setIcpProposal(j.data.icp as Record<string, unknown>)
    } catch (e) {
      setIcpChat(l => [...l, { role: 'assistant', content: e instanceof Error ? e.message : 'Could not work the ICP' }])
    }
    setCockpitBusy(false)
  }

  // Take whatever the conversation proposed into the field editor, so the operator can see
  // and correct every value before it becomes the live targeting.
  function proposalToForm() {
    const p = icpProposal ?? {}
    setIcpEdit({
      name: String((p as Record<string, unknown>).name ?? ''),
      industries: joinArr((p as Record<string, unknown>).industries),
      job_titles: joinArr((p as Record<string, unknown>).job_titles),
      seniority_levels: joinArr((p as Record<string, unknown>).seniority_levels),
      company_sizes: joinArr((p as Record<string, unknown>).company_sizes),
      geographies: joinArr((p as Record<string, unknown>).geographies),
      tech_stack: joinArr((p as Record<string, unknown>).tech_stack),
      keywords: joinArr((p as Record<string, unknown>).keywords),
    })
    setIcpMode('list')
  }

  async function saveIcp() {
    if (!selected || !icpEdit) return
    setCockpitBusy(true); setSaveMsg(null)
    try {
      const j = await fetch('/api/proxy/operator/icp', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...icpEdit, client_id: selected }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error)
      setIcpEdit(null); setIcpProposal(null); setSaveMsg(notice.ok('ICP saved — sourcing targets it from now on.')); await loadCockpit(selected)
    } catch (e) { setSaveMsg(notice.error(noticeText(e, 'Could not save the ICP'))) }
    setCockpitBusy(false)
  }

  function openSeqEditor(sq?: { id: string; name: string; steps: unknown }) {
    setSaveMsg(null); setSeqPreview(null)
    setSeqQuality(null)
    if (!sq) { setSeqEdit({ name: '', steps: [{ subject: '', body: '', wait_days: 4 }] }); return }
    const steps = Array.isArray(sq.steps)
      ? (sq.steps as Record<string, unknown>[]).map(st => ({ subject: String(st.subject ?? ''), body: String(st.body ?? ''), wait_days: Number(st.wait_days ?? 3) || 0 }))
      : [{ subject: '', body: '', wait_days: 4 }]
    setSeqEdit({ id: sq.id, name: sq.name, steps })
  }

  // V9 — Vida drafts the sequence against a real prospect, then de-personalises it into a
  // template. It lands in the editor as a PROPOSAL: the operator approves by saving.
  // #651 — the operator's sequence plan. Defaults reproduce the previous behaviour exactly
  // (a meeting sequence at the default depth), so Draft still works without touching these.
  const [seqPurpose, setSeqPurpose] = useState<'meeting' | 'event' | 'reactivation'>('meeting')
  const [seqDepth, setSeqDepth] = useState<3 | 5 | 7>(5)
  const [seqEventDate, setSeqEventDate] = useState('')
  const [seqEventWarn, setSeqEventWarn] = useState<string | null>(null)

  async function suggestSequence() {
    if (!selected) return
    setCockpitBusy(true); setSaveMsg(null)
    try {
      const j = await fetch('/api/proxy/operator/sequence/suggest', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_id: selected, campaign_id: activeCampaign?.id,
          purpose: seqPurpose, depth: seqDepth,
          event_date: seqPurpose === 'event' && seqEventDate ? seqEventDate : undefined,
        }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Could not draft a sequence')
      // An event sequence that cannot fit its own depth before the date must SAY so — the
      // operator changes the depth or the date, rather than mailing people after the event.
      const ev = j.data.event as { days_until_event?: number; fits?: boolean; last_send_in_days?: number } | null
      setSeqEventWarn(ev && ev.fits === false
        ? `⚠️ ${seqDepth} touches will not fit before this event (${ev.days_until_event} day(s) away) — the last email would land too late. Use fewer touches or an earlier start.`
        : null)
      setSeqEdit({
        name: j.data.name,
        steps: (j.data.steps as { subject: string; body: string; wait_days: number }[])
          .map(s => ({ subject: s.subject, body: s.body, wait_days: s.wait_days })),
      })
      // #612 — FIGSY's own draft is linted by the API before it is returned, so a proposal
      // the gate would refuse arrives already carrying its objections rather than looking
      // approved-by-the-AI.
      setSeqQuality((j.data.quality as Quality) ?? null)
      const d = j.data.drafted_against as { first_name?: string; job_title?: string; company?: string } | undefined
      setSaveMsg(notice.ok(d?.first_name ? `Drafted against ${[d.first_name, d.job_title, d.company].filter(Boolean).join(' · ')} — read it, change it, then save.` : 'Draft ready — read it before you save.'))
    } catch (e) { setSaveMsg(notice.error(noticeText(e, 'Could not draft a sequence'))) }
    setCockpitBusy(false)
  }

  async function saveSequence() {
    if (!selected || !seqEdit) return
    setCockpitBusy(true); setSaveMsg(null)
    try {
      const j = await fetch('/api/proxy/operator/sequence', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected, sequence_id: seqEdit.id, name: seqEdit.name, steps: seqEdit.steps }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error)
      // #612 — SAVED, and the verdict comes back with it. A sequence that cannot go live is
      // still saved (work in progress is allowed) but the editor STAYS OPEN carrying its
      // objections: closing it on a hard fail would report "saved" over copy that the Run
      // button is about to refuse, and the operator would meet the refusal one screen later
      // with nothing on the page explaining it.
      const q = (j.quality as Quality) ?? null
      setSeqQuality(q)
      if (q && !q.ok) {
        setSaveMsg(notice.error(`Saved — but this cannot go live yet: ${q.hardFails.length} thing${q.hardFails.length === 1 ? '' : 's'} must be fixed first.`))
        await loadCockpit(selected)
      } else {
        setSeqEdit(null); setSaveMsg(notice.ok('Sequence saved.')); await loadCockpit(selected)
      }
    } catch (e) { setSaveMsg(notice.error(noticeText(e, 'Could not save the sequence'))) }
    setCockpitBusy(false)
  }

  // V11 — read it exactly as the prospect will, tokens filled from a real lead.
  async function previewSequence(id: string) {
    if (!selected) return
    setCockpitBusy(true); setSaveMsg(null); setSeqPreview(null)
    try {
      const j = await fetch(`/api/proxy/operator/sequence/${id}/preview?client_id=${encodeURIComponent(selected)}`).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Could not preview')
      setSeqPreview(j.data)
    } catch (e) { setSaveMsg(notice.error(noticeText(e, 'Could not preview'))) }
    setCockpitBusy(false)
  }

  // ── V4 / V5 — pick the people, put THOSE people in the campaign ────────────────
  const loadPeople = useCallback(async (clientId: string, campaignId?: string) => {
    setSaveMsg(null)
    try {
      const q = `client_id=${encodeURIComponent(clientId)}${campaignId ? `&campaign_id=${encodeURIComponent(campaignId)}` : ''}`
      const j = await fetch(`/api/proxy/operator/people?${q}`).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Failed to load people')
      setPeople(j.data)
    } catch (e) { setSaveMsg(notice.error(noticeText(e, 'Failed to load people'))); setPeople([]) }
  }, [])


  // ── V6 / V7 / V8 — Vida proposes the campaign, the operator approves and edits it ──
  async function suggestCampaign() {
    if (!selected) return
    setCockpitBusy(true); setSaveMsg(null); setProposal(null)
    try {
      const j = await fetch('/api/proxy/operator/campaign/suggest', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Could not propose a campaign')
      setProposal(j.data)
    } catch (e) { setSaveMsg(notice.error(noticeText(e, 'Could not propose a campaign'))) }
    setCockpitBusy(false)
  }

  const BLANK_CAMP: Omit<CampEdit, 'name' | 'campaign_intent'> = {
    daily_send_limit: '', copilot_mode: true, send_days: [], send_hour_utc: '',
    ab_subject_b: '', ab_subject_c: '', ab_subject_d: '', ab_subject_e: '',
  }

  function openCampEditor(c?: CampaignRow) {
    setSaveMsg(null); setTestResult(null)
    setCampEdit(c
      ? {
        id: c.id, name: c.name, campaign_intent: c.campaign_intent ?? '',
        daily_send_limit: c.daily_send_limit != null ? String(c.daily_send_limit) : '',
        copilot_mode: c.copilot_mode === true,
        send_days: Array.isArray(c.send_days) ? c.send_days : [],
        send_hour_utc: c.send_hour_utc != null ? String(c.send_hour_utc) : '',
        ab_subject_b: c.ab_subject_b ?? '', ab_subject_c: c.ab_subject_c ?? '',
        ab_subject_d: c.ab_subject_d ?? '', ab_subject_e: c.ab_subject_e ?? '',
      }
      : { name: proposal?.name ?? '', campaign_intent: proposal?.campaign_intent ?? '', ...BLANK_CAMP })
  }

  async function saveCampaign(patch?: Partial<CampEdit> & { status?: string }) {
    if (!selected) return
    const src: CampEdit = campEdit ?? { name: proposal?.name ?? '', campaign_intent: proposal?.campaign_intent ?? '', ...BLANK_CAMP }
    setCockpitBusy(true); setSaveMsg(null)
    try {
      const body: Record<string, unknown> = {
        client_id: selected,
        campaign_id: patch?.id ?? src.id,
        name: patch?.name ?? src.name,
        campaign_intent: patch?.campaign_intent ?? src.campaign_intent,
        copilot_mode: patch?.copilot_mode ?? src.copilot_mode,
      }
      const cap = patch?.daily_send_limit ?? src.daily_send_limit
      // Send the cap on EVERY save, blank included — blank means "clear it", and omitting it
      // would make a cleared cap silently keep the old number.
      body.daily_send_limit = String(cap ?? '').trim() ? Number(cap) : null
      if (patch?.status) body.status = patch.status
      // Only send the window + A/B when editing a real campaign (the quick-approve path has
      // no editor open and must not blank them).
      if (campEdit) {
        body.send_days = src.send_days
        body.send_hour_utc = src.send_hour_utc.trim() === '' ? null : Number(src.send_hour_utc)
        body.ab_subject_b = src.ab_subject_b
        body.ab_subject_c = src.ab_subject_c
        body.ab_subject_d = src.ab_subject_d
        body.ab_subject_e = src.ab_subject_e
      }
      const j = await fetch('/api/proxy/operator/campaign/save', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Could not save the campaign')
      setCampEdit(null); setProposal(null)
      setSaveMsg(notice.ok(`Campaign saved — ${j.data.copilot_mode ? 'Co-Pilot: every send waits for you.' : 'Auto-Pilot: sends flow without a per-email gate.'}`))
      await loadCockpit(selected)
    } catch (e) { setSaveMsg(notice.error(noticeText(e, 'Could not save the campaign'))) }
    setCockpitBusy(false)
  }

  // V12 — the last gate before a real prospect: read step 1, then mail it to ourselves.
  async function testCampaign(campaignId: string, send: boolean) {
    if (!selected) return
    setCockpitBusy(true); setSaveMsg(null); setTestResult(null)
    try {
      const j = await fetch(`/api/proxy/operator/campaign/${encodeURIComponent(campaignId)}/test`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected, send }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Could not build the test')
      setTestResult(j.data)
      if (j.data.sent) setSaveMsg(notice.ok(`Test email sent to ${j.data.to}.`))
    } catch (e) { setSaveMsg(notice.error(noticeText(e, 'Could not build the test'))) }
    setCockpitBusy(false)
  }

  // V14 — who is actually in it, and where each of them is.
  async function openEnrollments(c: CampaignRow) {
    if (!selected) return
    setCockpitBusy(true); setSaveMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/campaign/${encodeURIComponent(c.id)}/enrollments?client_id=${encodeURIComponent(selected)}`).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Could not load who is in it')
      setEnrollView({ campaign: c, rows: j.data })
    } catch (e) { setSaveMsg(notice.error(noticeText(e, 'Could not load who is in it'))) }
    setCockpitBusy(false)
  }

  // ── V3 / M2 — ask the client something, in their own Milla thread ──────────────
  // #565's shape, in a place #565 never reached (found while fixing #564 ②, folded in because
  // it is the same honesty class in the same file).
  //
  // BOTH halves swallowed: the `catch` set `asks` to `[]`, and so did the `!j.success` branch.
  // Either way the Asks tab rendered "Nothing asked yet." — a confident statement of fact —
  // over an endpoint that was down. On a screen whose job is telling the operator what a
  // client is waiting on, "nothing to do" and "I could not find out" must not look identical.
  const loadAsks = useCallback(async (clientId: string) => {
    try {
      const j = await fetch(`/api/proxy/operator/asks?client_id=${encodeURIComponent(clientId)}`).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'the API refused and gave no reason')
      setAsks(j.data); setFromClient(j.from_client ?? [])
      setLoadFail(f => ({ ...f, asks: undefined }))
    } catch (e) {
      setAsks([]); setFromClient([])
      setLoadFail(f => ({ ...f, asks: loadError(e) }))
    }
  }, [])

  async function sendAsk(question: string) {
    if (!selected || !question.trim()) return
    setCockpitBusy(true); setSaveMsg(null)
    try {
      const j = await fetch('/api/proxy/operator/ask', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected, question }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Could not send the ask')
      setAskInput(''); setSaveMsg(notice.ok('Asked — it is in their Milla thread now.'))
      setTab('Asks'); await loadAsks(selected)
    } catch (e) { setSaveMsg(notice.error(noticeText(e, 'Could not send the ask'))) }
    setCockpitBusy(false)
  }

  // The next-action button routes to the surface that actually does the work — the whole
  // point of the rebuild is that you never have to work out which tab that is.
  function doNextAction(kind: NonNullable<NextAction['cta']>['kind']) {
    setSaveMsg(null)
    if (kind === 'replies')    { setTab('Inbox'); return }
    if (kind === 'approvals')  { setTab('Approvals'); return }
    if (kind === 'qualify')    { setTab('Inbox'); return }
    if (kind === 'sequence')   { setTab('Sequence'); if (!cockpit?.sequences.length) suggestSequence(); return }
    // #564 ② — ONE CLICK USED TO START EMAILING REAL PROSPECTS.
    //
    // This was `if (activeCampaign) setCampaignStatus(activeCampaign.id, 'active')` — no
    // confirmation on the single most consequential button in the console. The worklist puts
    // "Run" under the operator's cursor as the suggested next action, so the dangerous click
    // was also the obvious one.
    //
    // And the other half was worse for being quiet: with NO active campaign it switched tab
    // and did nothing at all, having just told the operator the next action was "Run". A
    // button that does nothing is indistinguishable from a broken one.
    //
    // `confirm()` rather than an inline card because that is the admin app's existing idiom
    // for an irreversible action (the MBF rebuild, the terms delete, the partner toggle), and
    // because a native dialog cannot be scrolled past or mis-rendered.
    if (kind === 'run') {
      setTab('Campaign')
      if (!activeCampaign) {
        setSaveMsg(notice.error('There is no campaign to run — write one first, on the Campaign tab.'))
        return
      }
      const who = selectedClient?.company_name || 'this client'
      if (!confirm(`Start real outreach for ${who}?\n\nThis sets their campaign live. Emails go to REAL prospects from ${who}'s own mailbox, on the sequence as written.\n\nNothing sends while the outreach kill-switch is off.`)) return
      setCampaignStatus(activeCampaign.id, 'active')
      return
    }
    if (kind === 'inbox')      { window.location.href = '/vida/engine'; return }
    if (kind === 'chase')      { setTab('Asks'); setAskInput(`Quick nudge — your first $${PACK_PRICE_USD} unlocks the whole thing: we buy your sender, find your people and start work the moment you approve them.`); return }
  }

  // ── BOOKINGS: mark a no-show, give a goodwill rebook ──────────────────────────
  // The tab was read-only, so the two-attempts rule and the client notice that fires with
  // it could only be reached from the separate /vida/bookings page — not from the console
  // an operator actually works in. Neither call moves money.
  async function actBooking(bookingId: string, kind: 'no-show' | 'rebook', newStart?: string) {
    if (!selected) return
    setCockpitBusy(true); setSaveMsg(null)
    try {
      const body: Record<string, unknown> = { client_id: selected }
      if (kind === 'no-show') body.mark = true
      if (kind === 'rebook' && newStart) body.new_start = newStart
      const j = await fetch(`/api/proxy/operator/bookings/${encodeURIComponent(bookingId)}/${kind}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      }).then(r => r.json())
      if (!j?.success) { setSaveMsg(notice.error(j?.error || 'Could not update the booking')); return }
      setSaveMsg(notice.ok(kind === 'no-show'
        ? 'Marked a no-show. Nothing was refunded — the $4 stands.'
        : j.rebooks_left === 0
          ? 'Second attempt used. The client has been told, with the $4 re-run choice.'
          : `Rebooked. ${j.rebooks_left} attempt left.`))
      await loadCockpit(selected)
    } catch (err) {
      setSaveMsg(notice.error(noticeText(err, 'Could not update the booking')))
    }
    setCockpitBusy(false)
  }

  // #564 (the residual) — "Just unblock them" WAS THE LAST BUTTON STILL SWALLOWING ITS ANSWER.
  //
  // `setCampaignStatus` below was fixed; this one kept the exact pattern that item condemned:
  // it parsed the response, threw it away, and carried an empty catch commented "surfaced by
  // the reload". It never was. The reload re-rendered the same blocked state, so a refusal and
  // a success looked identical — on the button whose entire job is unblocking a client who
  // cannot be worked, where "nothing happened" is the most expensive possible outcome to
  // misread.
  //
  // It also now tells the truth about WHICH thing happened. The route returns `created`:
  // false means the client already had an active campaign and nothing was made. Reporting
  // that as "started" would be a smaller version of the same lie.
  async function startCampaign() {
    if (!selected) return
    setCockpitBusy(true); setSaveMsg(null)
    try {
      const j = await fetch('/api/proxy/operator/campaign/start', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected }),
      }).then(r => r.json())
      if (!j?.success) {
        setSaveMsg(notice.error(j?.error || 'Could not start a campaign — the API refused and gave no reason.'))
        setCockpitBusy(false); return
      }
      setSaveMsg(notice.ok(j?.created === false
        ? 'This client already had a running campaign — nothing was created.'
        : 'Campaign created and running. They can be worked now.'))
      await loadCockpit(selected)
    } catch (e) {
      setSaveMsg(notice.error(`Could not reach the API to start a campaign: ${e instanceof Error ? e.message : String(e)}`))
    }
    setCockpitBusy(false)
  }

  // #564 — THE REFUSAL IS SHOWN. This parsed the response and threw it away, so an API that
  // said "no" produced a button that appeared to do nothing: the reload re-rendered the
  // unchanged state and the operator was left to guess. The comment claimed the failure was
  // "surfaced by the reload" — it never was. A control that silently declines is the same
  // class as the Delete button that deleted nothing.
  async function setCampaignStatus(campaignId: string, status: 'active' | 'paused') {
    if (!selected) return
    setCockpitBusy(true); setSaveMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/campaign/${encodeURIComponent(campaignId)}/status`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected, status }),
      }).then(r => r.json())
      if (!j?.success) {
        setSaveMsg(notice.error(j?.error || `Could not ${status === 'active' ? 'start' : 'pause'} the campaign — the API refused and gave no reason.`))
        setCockpitBusy(false); return
      }
      setSaveMsg(notice.ok(status === 'active' ? 'Campaign is running.' : 'Campaign paused.'))
      await loadCockpit(selected)
    } catch (e) {
      setSaveMsg(notice.error(`Could not reach the API to ${status === 'active' ? 'start' : 'pause'} this campaign: ${e instanceof Error ? e.message : String(e)}`))
    }
    setCockpitBusy(false)
  }

  const [srcPreview, setSrcPreview] = useState<SourcePreview | null>(null)
  const [srcBusy, setSrcBusy] = useState(false)
  const [srcResult, setSrcResult] = useState<string | null>(null)
  // #552 — "sourced fine, but they still cannot SEND". A separate slot from srcResult on
  // purpose: one is the outcome of the button, the other is the state of the client.
  const [srcSendWarn, setSrcSendWarn] = useState<{ headline: string; label: string; detail: string } | null>(null)

  // #565 — EMPTY IS NOT BROKEN. All three of these were `.catch(() => {})`, so a failed load
  // left the state at its initial empty value and the console rendered a calm, confident
  // "nothing to do" over an endpoint that was down — on the screen whose entire job is
  // telling the operator what to work on next. Each failure is now captured and shown.
  const [loadFail, setLoadFail] = useState<{ status?: string; alerts?: string; worklist?: string; asks?: string; proofReview?: string }>({})

  useEffect(() => {
    const fail = (k: 'status' | 'alerts' | 'worklist') => (e: unknown) =>
      setLoadFail(f => ({ ...f, [k]: loadError(e) }))

    fetch('/api/proxy/operator/status').then(r => r.json())
      .then(j => { if (j?.success) setStatus(j.data); else throw new Error(j?.error || 'the API returned no data') })
      .catch(fail('status'))
    fetch('/api/proxy/operator/alerts').then(r => r.json())
      .then(j => {
        if (!j?.success) throw new Error(j?.error || 'the API returned no data')
        setAlerts(j.data)
        // ⚑ 27 Aug (PR2) — A PARTIAL FEED MUST SAY SO. The endpoint answers 200 with the
        // alerts it CAN trust and `degraded.proof_review` when the proof-review queue could
        // not be read. Without this the operator sees a quiet console and reasonably
        // concludes nobody is waiting — the exact wrong conclusion. Raised through the
        // existing loadFail banner rather than a new surface.
        setLoadFail(f => ({ ...f, proofReview: j?.degraded?.proof_review ?? undefined }))
      })
      .catch(fail('alerts'))
    fetch('/api/proxy/operator/worklist').then(r => r.json())
      .then(j => { if (j?.success) { setWork(j.data); setBookRatio(j.meta?.ratio ?? null) } else throw new Error(j?.error || 'the API returned no data') })
      .catch(fail('worklist'))
  }, [])

  // #498b — detect a sourcing intent ("source 50 leads", "find 30 prospects", "source leads")
  // and route it to the pool-aware CONFIRM flow instead of the prose command handoff. Returns
  // the requested count (default 20) or null if the text isn't a sourcing command.
  function parseSourceIntent(t: string): number | null {
    const lc = t.toLowerCase()
    // (audit fix) Require a sourcing verb AND a lead/prospect noun, so ordinary commands
    // ("find the CEO's email", "pull up the last reply") aren't hijacked into the pool-cost
    // confirm. Only phrasing like "source 20 leads" / "find leads" routes to sourcing.
    if (!/\b(source|find|pull|get|prospect)\b/.test(lc) || !/\b(lead|leads|prospect|prospects)\b/.test(lc)) return null
    const m = lc.match(/(\d{1,3})/)
    return m ? Math.max(1, Math.min(200, parseInt(m[1], 10))) : 20
  }

  async function previewSource(count: number) {
    if (!selected) return
    setSrcBusy(true); setSrcResult(null); setSrcPreview(null); setSrcSendWarn(null)
    try {
      const res = await fetch(`/api/proxy/operator/source-preview?client_id=${encodeURIComponent(selected)}&count=${count}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Preview failed (${res.status})`)
      setSrcPreview(json.data)
    } catch (e) {
      setSrcResult(e instanceof Error ? e.message : 'Preview failed')
    } finally { setSrcBusy(false) }
  }

  async function confirmSource() {
    if (!selected || !srcPreview) return
    setSrcBusy(true)
    try {
      const res = await fetch('/api/proxy/operator/source', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: selected, count: srcPreview.count, confirm: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Sourcing failed (${res.status})`)
      setSrcResult(`Sourced ${json.inserted} lead${json.inserted === 1 ? '' : 's'} for ${selectedClient?.company_name || 'client'}${json.note ? ` · ${json.note}` : ''}. New leads are in People.`)
      // #552 — sourcing SUCCEEDED and the client still cannot send. Kept separate from
      // srcResult (which renders green) because this is not a failure of the thing just
      // pressed — it is the next thing that will block, and it must not read as an error of
      // the sourcing run nor be swallowed by its success.
      setSrcSendWarn(json.send_warning ?? null)
      setSrcPreview(null)
      await loadBoard(selected)
      if (people) await loadPeople(selected, activeCampaign?.id)
    } catch (e) {
      setSrcResult(e instanceof Error ? e.message : 'Sourcing failed')
    } finally { setSrcBusy(false) }
  }

  async function runCommand(text: string) {
    const t = text.trim()
    if (!t || !selected || cmdBusy) return
    // Sourcing intent → pool-aware confirm (spends OUR PDL budget), not the prose handoff.
    const srcCount = parseSourceIntent(t)
    if (srcCount != null) { setCmd(''); previewSource(srcCount); return }
    setCmd(''); setCmdBusy(true)
    setCmdLog(l => [...l, { role: 'operator', text: t }])
    try {
      const res = await fetch('/api/proxy/operator/command', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: selected, text: t }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Command failed (${res.status})`)
      setCmdLog(l => [...l, { role: 'vida', text: json.reply, link: json.link }])
    } catch (e) {
      setCmdLog(l => [...l, { role: 'vida', text: e instanceof Error ? e.message : 'Command failed' }])
    } finally { setCmdBusy(false) }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/proxy/operator/clients')
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) throw new Error(json?.error || `Failed to load clients (${res.status})`)
        if (!alive) return
        const rows: ClientRow[] = json.data ?? []
        setClients(rows)
        const urlClient = new URLSearchParams(window.location.search).get('client')
        if (urlClient && rows.some(r => r.id === urlClient)) setSelected(urlClient)
      } catch (e) {
        if (alive) setClientsError(e instanceof Error ? e.message : 'Failed to load clients')
      }
    })()
    return () => { alive = false }
  }, [])

  const loadBoard = useCallback(async (clientId: string) => {
    setBoardError(null)
    try {
      const res = await fetch(`/api/proxy/operator/board?client_id=${encodeURIComponent(clientId)}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Failed to load board (${res.status})`)
      setBoard({ client: json.client, columns: json.columns })
    } catch (e) {
      setBoard(null); setBoardError(e instanceof Error ? e.message : 'Failed to load board')
    }
    // #505 — live blockers strip. Best-effort: a blockers failure never breaks the board.
    fetch(`/api/proxy/operator/blockers?client_id=${encodeURIComponent(clientId)}`)
      .then(r => r.json()).then(j => setBlockers(j?.success ? j.data : null)).catch(() => setBlockers(null))
  }, [])

  useEffect(() => {
    if (!selected) return
    const url = new URL(window.location.href)
    url.searchParams.set('client', selected)
    window.history.replaceState(null, '', url.toString())
    loadBoard(selected)
  }, [selected, loadBoard])

  // #620 — read the last enrol run that refused somebody. A null answer is the GOOD case
  // (nobody was refused), so a failure here is swallowed rather than shown as an error: this
  // line exists to surface a refusal, and it must never itself become noise on a healthy board.
  useEffect(() => {
    if (!selected) { setEnrolSkips(null); return }
    setEnrolSkips(null)
    fetch(`/api/proxy/operator/enrol-skips?client_id=${encodeURIComponent(selected)}`)
      .then(r => r.json())
      .then(j => { if (j?.success) setEnrolSkips(j.data ?? null) })
      .catch(() => {})
    // Rides the same client selection. Kept as its own request rather than folded into the
    // skips route, because the two answer different questions and one going quiet must not
    // take the other's number off the screen with it.
    setCoverage(null)
    fetch(`/api/proxy/operator/country-coverage?client_id=${encodeURIComponent(selected)}`)
      .then(r => r.json())
      .then(j => { if (j?.success) setCoverage(j.data ?? null) })
      .catch(() => {})
  }, [selected])

  // Lazy-load the tab's own data the first time it is opened. A status message belongs to
  // the tab that produced it — "3 added to campaign" must not follow you to the ICP tab.
  useEffect(() => {
    if (!selected) return
    setSaveMsg(null)
    if (tab === 'People' && people === null) loadPeople(selected, activeCampaign?.id)
    if (tab === 'Asks' && asks === null) loadAsks(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selected])

  // People may have loaded before the cockpit answered, in which case we didn't yet know
  // which campaign to compare against and every row looked pickable — including people
  // already in it. Re-read once the campaign is known so "in campaign" is honest.
  useEffect(() => {
    if (!selected || !activeCampaign?.id || people === null) return
    loadPeople(selected, activeCampaign.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCampaign?.id])

  // Sourced column — the operator NEVER spends (#493, invariant #1). The only actions are
  // SURFACE the masked lead to the client for their own 👍 in Milla ("send"), or PASS it.
  async function act(leadId: string, kind: 'surface' | 'pass') {
    if (!selected) return
    setActing(leadId)
    try {
      const res = await fetch(`/api/proxy/operator/leads/${encodeURIComponent(leadId)}/${kind}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: selected }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Action failed (${res.status})`)
      await loadBoard(selected)
      if (people) await loadPeople(selected, activeCampaign?.id)
    } catch (e) {
      setBoardError(e instanceof Error ? e.message : 'Action failed')
    } finally { setActing(null) }
  }

  // K.I.N.D OWNS GO (22 Aug) — activate a client's ICP on their behalf.
  //
  // Activation is what makes an ICP live and, for a never-run ICP, starts its first sourcing
  // run. It used to be the CLIENT's button: their edit went live immediately, nobody here was
  // told, and a client could start real sourcing with no operator watching. The API now
  // refuses a client JWT, so this is the only way an ICP goes live.
  //
  // `client_id` travels in the body because the caller is an operator acting for a client,
  // not the client themselves.
  async function activateIcp(icpId: string) {
    if (!selected) return
    setActing(`go-${icpId}`)
    try {
      const res = await fetch(`/api/proxy/icps/${encodeURIComponent(icpId)}/activate`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: selected }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Could not activate (${res.status})`)
      setSaveMsg(notice.ok(json.applied_revision
        ? 'Revision applied — their targeting and brief are live now. Nothing was re-sourced; their motion continues.'
        : json.sourcing
          ? 'ICP is live — first sourcing run started.'
          : 'ICP is live. It has sourced before, so nothing was re-run.'))
      await loadCockpit(selected)
    } catch (e) {
      setSaveMsg(notice.error(e instanceof Error ? e.message : 'Could not activate that ICP'))
    } finally { setActing(null) }
  }

  // Needs-approval column — RELEASE (approve & send) or REJECT a FIGSY-written draft.
  // Acts on the approval-queue row id (NOT the lead) — no charge fires here; the $4 already
  // happened at enrollment. A send may honestly defer (cap/kill-switch) — surface the note.
  async function actQueue(queueId: string, kind: 'approve' | 'reject') {
    if (!selected) return
    setActing(queueId)
    try {
      const res = await fetch(`/api/proxy/operator/queue/${encodeURIComponent(queueId)}/${kind}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: selected }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Action failed (${res.status})`)
      if (kind === 'approve' && json.sent === false && json.note) setBoardError(json.note)
      else setBoardError(null)
      await loadBoard(selected)
    } catch (e) {
      setBoardError(e instanceof Error ? e.message : 'Action failed')
    } finally { setActing(null) }
  }

  // #494 Qualify gate — mark a reply a qualified conversation (operator judgement, NO SPEND).
  // Idempotent toggle; refreshes the board so the ✓ chip + blockers count update.
  async function qualifyReply(replyId: string, qualified: boolean) {
    if (!selected) return
    setActing(replyId)
    try {
      const res = await fetch(`/api/proxy/operator/replies/${encodeURIComponent(replyId)}/qualify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: selected, qualified }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Action failed (${res.status})`)
      await loadBoard(selected)
    } catch (e) {
      setBoardError(e instanceof Error ? e.message : 'Action failed')
    } finally { setActing(null) }
  }

  const selectedClient = clients?.find(c => c.id === selected) ?? null
  const cols = board?.columns
  // Worklist lookups. The list is already urgency-sorted by the API, so we only filter here.
  const workById = (work ?? []).reduce<Record<string, WorkRow>>((m, r) => { m[r.id] = r; return m }, {})
  const needsYouCount = (work ?? []).filter(r => r.next.actor === 'you').length
  const orderedClients: ClientRow[] = work
    ? work.map(w => (clients ?? []).find(c => c.id === w.id) ?? w)
    : (clients ?? [])
  // ⚑ 27 Aug (PR2) — A PROOF REVIEW KEEPS ITS CLIENT ON THE LIST.
  //
  // "Only needs you" filters on the WORKLIST (`next.actor === 'you'`), and a proof-exhausted
  // prospect is by definition NEVER FUNDED — so `client-step.ts` puts them at "Waiting on
  // their $299" with `actor: 'them'`. The alert rendered correctly and the operator was never
  // shown the client it belonged to: the filter is ON by default, so the only way to reach
  // them was to switch it off and pick them by hand.
  //
  // One more disjunct, deliberately: it does NOT redefine `actor`, does not touch the
  // worklist, and does not change the ordering. A client is kept on the list when a human at
  // K.I.N.D genuinely owes them something, which an unresolved proof review is.
  const proofReviewClients = new Set(
    alerts.filter(a => a.kind === 'proof_review').map(a => a.client_id),
  )
  const visibleClients = onlyNeedsYou && work
    ? orderedClients.filter(c => workById[c.id]?.next.actor === 'you'
                              || proofReviewClients.has(c.id)
                              || c.id === selected)
    : orderedClients
  const selectedWork = selected ? workById[selected] : undefined

  const alertsByClient = alerts.reduce<Record<string, Alert[]>>((m, a) => {
    (m[a.client_id] ||= []).push(a); return m
  }, {})
  const myAlerts = selected ? (alertsByClient[selected] ?? []) : []
  const unansweredAsks = (asks ?? []).filter(a => a.answers.length === 0).length

  return (
    <div className="flex h-full min-h-0">
      {/* ── CLIENTS PANEL ──────────────────────────────────────────────────── */}
      <div className="w-[380px] shrink-0 border-r border-[#eee7f7] bg-white flex flex-col overflow-hidden">
        <div className="px-[18px] pt-[15px] pb-2.5">
          <b className="text-[15.5px]">Clients</b>
          {/* #565 — a failed load used to sit on "Loading…" forever, which reads as "still
              working on it" rather than "this is broken". `panelView` keeps the three states
              apart: loading, genuinely empty, and could-not-establish. */}
          {(() => {
            const v = panelView({ loading: !work && !loadFail.worklist, error: loadFail.worklist ?? null, count: work?.length ?? 0, label: 'the worklist' })
            if (v.state === 'ready') {
              return <span className="block text-[12.5px] text-[#9b8ec4]">
                {`${needsYouCount} need you · ${(work?.length ?? 0) - needsYouCount} running themselves`}
              </span>
            }
            return <span className={`block text-[12.5px] ${v.state === 'failed' ? 'text-red-700 font-semibold' : 'text-[#9b8ec4]'}`}>
              {v.message}
            </span>
          })()}
        </div>

        {/* The other two loads fail independently — and each says so rather than leaving the
            header quietly wrong. An operator who cannot see alerts must know that, not infer
            it from a bell that never rings. */}
        {(loadFail.status || loadFail.alerts || loadFail.proofReview) && (
          <div className="mx-[18px] mb-2.5 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2">
            <b className="block text-[12px] text-red-900">Part of this console could not load</b>
            {loadFail.status && <p className="text-[11.5px] text-red-800 mt-0.5">Couldn&apos;t load the status header — {loadFail.status}</p>}
            {loadFail.alerts && <p className="text-[11.5px] text-red-800 mt-0.5">Couldn&apos;t load alerts — a quiet bell does NOT mean there is nothing wrong. {loadFail.alerts}</p>}
            {loadFail.proofReview && <p className="text-[11.5px] text-red-800 mt-0.5"><b>Proof-review queue could not be checked.</b> {loadFail.proofReview}</p>}
          </div>
        )}
        {/* Sorted by who needs you, not alphabetically — and each row says WHY in words. */}
        <div className="flex gap-1.5 px-[18px] pb-2.5">
          {([[true, `Needs you · ${needsYouCount}`], [false, `All · ${work?.length ?? 0}`]] as [boolean, string][]).map(([v, label]) => (
            <button key={label} onClick={() => setOnlyNeedsYou(v)}
              className={`text-[12px] font-bold rounded-full px-2.5 py-1 border ${onlyNeedsYou === v ? 'text-white bg-[#7C3AED] border-[#7C3AED]' : 'text-[#9b8ec4] bg-white border-[#ece5fb]'}`}>
              {label}
            </button>
          ))}
        </div>
        {/* THE BOOK'S RATIO — names sourced per approved lead, across every real client.
            Founder-locked 25 Jul: the cashflow model plans on 2, and this is where the real
            number comes from. It costs $0.28 a name whether they approve it or not, so this
            is the difference between keeping ~$3.20 and ~$1.80 on a $4 lead. */}
        {bookRatio && (
          <div className="mx-[18px] mb-2.5 rounded-xl border border-[#ece5fb] bg-[#faf8ff] px-3 py-2">
            <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">Across the book</div>
            <div className={`text-[13px] ${bookRatio.confident ? 'text-[#1f1235] font-semibold' : 'text-[#9b8ec4]'}`}>
              📐 {bookRatio.label}
            </div>
            {bookRatio.confident && (
              <div className="text-[11.5px] text-[#9b8ec4] mt-0.5">
                Data cost ${(bookRatio.ratio! * 0.28).toFixed(2)} per approved lead — put this number in the cashflow lab.
              </div>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {clientsError && <p className="text-xs text-red-500 px-2 py-3">{clientsError}</p>}
          {!clients && !clientsError && <p className="text-xs text-[#9b8ec4] px-2 py-3">Loading clients…</p>}
          {clients?.length === 0 && <p className="text-xs text-[#9b8ec4] px-2 py-3">No clients yet.</p>}
          {visibleClients.length === 0 && (clients?.length ?? 0) > 0 && (
            <p className="text-[12.5px] text-[#9b8ec4] px-2 py-6 text-center">Nothing needs you right now. 🎉</p>
          )}
          {visibleClients.map(c => {
            const active = c.id === selected
            // The row says WHAT'S NEEDED, in words — never a bare count. A pink dot means it
            // costs money or trust to ignore; green is running fine; grey is on them.
            const n = workById[c.id]?.next
            const you = n?.actor === 'you'
            const dot = you ? 'bg-[#EC4899]' : n?.actor === 'engine' ? 'bg-emerald-400' : 'bg-[#cfc4e8]'
            return (
              <button key={c.id} onClick={() => setSelected(c.id)}
                title={n ? `Step ${n.step} · ${n.label}` : undefined}
                className={`w-full text-left flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl mb-1 transition-colors border ${
                  active ? 'bg-[#f3ecff] border-[#e4d4fb]' : you ? 'bg-[#fdf2f8] border-[#fbcfe8] hover:border-[#f9a8d4]' : 'hover:bg-[#faf8ff] border-transparent'
                }`}>
                <span className={`w-2 h-2 rounded-full shrink-0 mt-[7px] ${dot}`} />
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0 ${active ? 'bg-[#7C3AED] text-white' : 'bg-[#efeafc] text-[#7C3AED]'}`}>
                  {initials(c.company_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="text-[14px] block truncate">{c.company_name || 'Unnamed'}</b>
                  <span className={`text-[12.5px] block truncate ${you ? 'text-[#9d174d] font-semibold' : 'text-[#9b8ec4]'}`}>
                    {n?.label ?? ([c.industry, c.country].filter(Boolean).join(' · ') || '—')}
                    {/* #619 — the API applies the exemption (`coldView`), so `.cold` and
                        `.warn` are already false on an exempt account and these badges cannot
                        fire on one. The neutral hint below says WHY, in grey, instead of the
                        red SUSPEND the founder photographed on our own account. */}
                    {workById[c.id]?.cold?.cold && <span className="ml-1.5 text-[10px] font-extrabold uppercase tracking-wide text-white bg-[#b91c1c] rounded px-1.5 py-0.5">Suspended</span>}
                    {workById[c.id]?.cold?.warn && <span className="ml-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#92400e] bg-[#fef3c7] border border-[#fde68a] rounded px-1.5 py-0.5">Going quiet</span>}
                    {workById[c.id]?.cold?.exempt && (
                      <span title={workById[c.id]?.cold?.why} className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a82a3]">
                        cold-check exempt
                      </span>
                    )}
                  </span>
                </span>
                {/* C6 — VAT EVIDENCE, ON THE ROW. #615 shipped `vatBadge` and nothing rendered it,
                    so "no tax ID" was a fact the operator could only find by opening the client.
                    Amber = missing, grey = they declared not-registered (the NOT_REGISTERED
                    sentinel), green = on file. The SHARED function decides — no local rule, and
                    no special case for house/demo: whatever their record says is what shows. */}
                {(() => {
                  const b = vatBadge({ vat_number: c.vat_number ?? null })
                  return (
                    <span title={`VAT evidence: ${b.label}`}
                      className={`text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 shrink-0 border ${
                        b.tone === 'ok' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : b.tone === 'amber' ? 'text-amber-700 bg-amber-50 border-amber-200'
                        : 'text-[#8a82a3] bg-[#f4f2f9] border-[#e4dcf7]'}`}>
                      {b.label}
                    </span>
                  )
                })()}
                {c.house_or_demo && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#b3a9cc] bg-[#efeafc] rounded px-1.5 py-0.5 shrink-0">
                    {c.is_demo ? 'demo' : 'house'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── PIPELINE ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#fbfaff] overflow-hidden">
        {!selected && (
          <div className="flex-1 flex items-center justify-center text-[#9b8ec4] text-sm">
            Select a client on the left to work their campaign.
          </div>
        )}
        {selected && (<>
          {/* #501 FLOW ribbon */}
          <div className="shrink-0 flex items-center gap-1 overflow-x-auto px-[22px] py-2 border-b border-[#eee7f7] bg-white">
            {FLOW.map((step, i) => (
              <span key={step} className="flex items-center gap-1 shrink-0">
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#7c6f9b]">
                  <span className="w-[18px] h-[18px] rounded-full bg-[#efeafc] text-[#7C3AED] text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                  {step}
                </span>
                {i < FLOW.length - 1 && <span className="text-[#d9d0ee] px-0.5">&rsaquo;</span>}
              </span>
            ))}
          </div>

          {/* THE CONSOLE: Vida (conversation) | cockpit (this client's work surfaces) */}
          <div className="flex-1 flex min-h-0">

            {/* ── VIDA — the assistant, scoped to the selected client ── */}
            <section className="w-[540px] shrink-0 flex flex-col border-r border-[#eee7f7]">
              <div className="shrink-0 flex items-center gap-2.5 px-[22px] py-2.5 border-b border-[#eee7f7] bg-white">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white text-[12px] font-bold flex items-center justify-center">
                  {initials(selectedClient?.company_name ?? null)}
                </span>
                <div className="min-w-0">
                  <b className="text-[14.5px] block leading-tight truncate">{selectedClient?.company_name || 'Client'}</b>
                  <span className="text-[12px] text-[#9b8ec4]">{[selectedClient?.industry, selectedClient?.country].filter(Boolean).join(' · ') || 'client'}</span>
                </div>
                {/* V11 ONBOARDING GATE — how complete is this client, and what's missing. */}
                {cockpit && (
                  <span className={`ml-auto shrink-0 text-[12.5px] font-bold rounded-full px-2.5 py-1 ${cockpit.onboarding.percent === 100 ? 'text-emerald-700 bg-emerald-50' : 'text-[#b45309] bg-[#fffbeb]'}`}
                    title={cockpit.onboarding.missing.length ? `Missing: ${cockpit.onboarding.missing.join(', ')}` : 'Fully onboarded'}>
                    Onboarding {cockpit.onboarding.percent}%
                  </span>
                )}
                <span className={`shrink-0 text-[12.5px] font-bold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2.5 py-1 ${cockpit ? '' : 'ml-auto'}`}>
                  ${(selectedClient?.wallet_balance_usd ?? 0).toLocaleString()} wallet
                </span>
              </div>

              <div className="shrink-0 px-[22px] py-1.5 text-[12px] text-[#9b8ec4] bg-[#fbfaff] border-b border-[#f2ecfb]">
                You&rsquo;re working <b className="text-[#7C3AED]">{selectedClient?.company_name || 'this client'}</b> — Vida and the cockpit are scoped to this client only.
              </div>

              {/* V17 — what changed for THIS client that needs us. */}
              {myAlerts.length > 0 && (
                <div className="shrink-0 flex items-center gap-2 flex-wrap px-[22px] py-2 bg-[#fdf2f8] border-b border-[#fbcfe8]">
                  <span className="text-[12.5px] font-bold text-[#9d174d]">Needs you:</span>
                  {myAlerts.map((a, i) => (
                    <span key={`${a.kind}-${i}`} className="flex items-center gap-1">
                      <button
                        onClick={() => setTab(a.kind === 'replies' ? 'Inbox' : a.kind === 'no_campaign' ? 'Campaign' : 'ICP')}
                        className="text-[12px] font-semibold text-[#9d174d] bg-white border border-[#fbcfe8] rounded-full px-2 py-0.5 hover:border-[#EC4899]">
                        {a.label} &rarr;
                      </button>
                      {/* PR2 — the only way to say "this prospect is no longer waiting on us".
                          Same chip language as the alert beside it; no modal, no new surface. */}
                      {a.kind === 'proof_review' && (
                        <button
                          onClick={() => resolveProofReview(a.client_id)}
                          disabled={proofBusy === a.client_id}
                          className="text-[12px] font-semibold text-white bg-[#9d174d] border border-[#9d174d] rounded-full px-2 py-0.5 hover:bg-[#EC4899] disabled:opacity-50">
                          {proofBusy === a.client_id ? 'Marking…' : 'Mark reviewed'}
                        </button>
                      )}
                    </span>
                  ))}
                  {proofMsg && <span className="text-[11.5px] text-[#9d174d]">{proofMsg}</span>}
                </div>
              )}

              {/* V1 — the onboarding checklist IS the setup guide: click a gap, land on the
                  surface that closes it. "Ask them for these" now reaches their Milla thread. */}
              {cockpit && cockpit.onboarding.missing.length > 0 && (
                <div className="shrink-0 flex items-center gap-2 flex-wrap px-[22px] py-2 bg-[#fffbeb] border-b border-[#fde68a]">
                  <span className="text-[12.5px] font-bold text-[#b45309]">Onboarding gaps:</span>
                  {cockpit.onboarding.missing.map(m => {
                    const go = GAP_TAB[m] ?? null
                    return go ? (
                      <button key={m} onClick={() => setTab(go)}
                        className="text-[12px] font-semibold text-[#b45309] bg-white border border-[#fcd34d] rounded-full px-2 py-0.5 hover:border-[#b45309]">{m} &rarr;</button>
                    ) : (
                      <span key={m} className="text-[12px] font-semibold text-[#b45309] bg-white border border-[#fcd34d] rounded-full px-2 py-0.5">{m}</span>
                    )
                  })}
                  <button
                    onClick={() => sendAsk(`Quick one so we can get your outreach sharper — could you send us: ${cockpit.onboarding.missing.filter(m => !GAP_TAB[m]).join(', ') || cockpit.onboarding.missing.join(', ')}?`)}
                    disabled={cockpitBusy}
                    className="ml-auto text-[12.5px] font-bold text-[#b45309] underline disabled:opacity-50">Ask them for these</button>
                </div>
              )}

              {/* Pipeline at a glance — every stage, click through to the tab that works it. */}
              <div className="shrink-0 flex items-center gap-1.5 flex-wrap px-[22px] py-2 border-b border-[#f2ecfb]">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#b3a9cc] mr-1">Pipeline</span>
                {([
                  ['Sourced', cols?.sourced.count ?? 0, 'People'],
                  ['Needs approval', cols?.needs_approval.count ?? 0, 'Approvals'],
                  ['Sending', cols?.sending.count ?? 0, 'Campaign'],
                  ['Replied', cols?.replied.count ?? 0, 'Inbox'],
                  ['Qualified', cols?.qualified.count ?? 0, null],
                  ['Booked', cols?.booked.count ?? 0, 'Bookings'],
                ] as [string, number, CockpitTab | null][]).map(([label, n, goTo]) => (
                  <button key={label} onClick={() => goTo && setTab(goTo)} disabled={!goTo}
                    className={`text-[12px] font-bold rounded-full border px-2.5 py-0.5 ${n > 0 ? 'text-[#1f1235] bg-[#f3ecff] border-[#e4d4fb]' : 'text-[#9b8ec4] bg-white border-[#ece5fb]'} ${goTo ? 'hover:border-[#7C3AED]' : 'cursor-default'}`}>
                    {n} {label}
                  </button>
                ))}
              </div>

              {/* live gate counts for THIS client */}
              <div className="shrink-0 flex items-center gap-1.5 flex-wrap px-[22px] py-2 border-b border-[#f2ecfb]">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#b3a9cc] mr-1">Blockers</span>
                {([['Send gate', blockers?.send_gate], ['Money gate', blockers?.money_gate], ['Unsent sourced', blockers?.unsent_sourced], ['To triage', blockers?.replies_to_triage]] as [string, number | undefined][]).map(([label, n]) => (
                  <span key={label} className={`text-[12px] font-bold rounded-full border px-2.5 py-0.5 ${n ? 'text-[#0e7c86] bg-[#e6f6f7] border-[#a8dde0]' : 'text-[#9b8ec4] bg-white border-[#ece5fb]'}`}>{n ?? 0} {label}</span>
                ))}
                {status && !status.outreach_enabled && (
                  <span className="text-[12px] font-bold rounded-full border px-2.5 py-0.5 text-red-700 bg-red-50 border-red-200">Sending OFF (kill-switch)</span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-[22px] py-3.5 space-y-2">
                {boardError && <div className="text-[13px] font-semibold text-red-600">{boardError}</div>}
                {cmdLog.length === 0 && (
                  <div className="text-[13.5px] text-[#9b8ec4] leading-relaxed max-w-lg">
                    Ask Vida anything about <b className="text-[#5c5279]">{selectedClient?.company_name || 'this client'}</b> — or use a shortcut below.
                    Everything you do here is scoped to them.
                  </div>
                )}
                {cmdLog.map((m, i) => (
                  <div key={i} className={m.role === 'operator' ? 'text-right' : ''}>
                    <span className={`inline-block text-[13.5px] leading-relaxed rounded-xl px-3.5 py-2 max-w-[85%] text-left ${m.role === 'operator' ? 'bg-[#1f1235] text-white' : 'bg-white border border-[#eee7f7] text-[#1f1235]'}`}>{m.text}</span>
                    {m.link && <a href={m.link} className="block text-[12px] font-bold text-[#7C3AED] mt-0.5 hover:underline">Open &rarr;</a>}
                  </div>
                ))}

                {srcPreview && (
                  <div className="border border-[#e4dcf7] bg-white rounded-xl px-3.5 py-3 max-w-md">
                    <b className="text-[13.5px] block mb-1">Source {srcPreview.count} leads?</b>
                    <p className="text-[12.5px] text-[#5c5279] leading-relaxed">
                      {srcPreview.no_active_icp
                        ? 'This client has no active ICP — build one on the ICP tab first.'
                        : <>{srcPreview.pool_free} free from the pool · {srcPreview.pdl_needed} new from PDL (~${srcPreview.pdl_cost_est.toFixed(2)} of OUR budget){srcPreview.is_demo ? ' · demo client, pool only' : ''}</>}
                    </p>
                    {!srcPreview.no_active_icp && (
                      <div className="flex gap-2 mt-2.5">
                        <button onClick={confirmSource} disabled={srcBusy}
                          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-3 py-1.5 text-[13px] font-bold disabled:opacity-60">
                          {srcBusy ? 'Sourcing…' : 'Confirm & source'}
                        </button>
                        <button onClick={() => setSrcPreview(null)} className="border border-[#ece5fb] rounded-lg px-3 py-1.5 text-[13px] font-bold text-[#5c5279]">Cancel</button>
                      </div>
                    )}
                  </div>
                )}
                {srcResult && <div className="text-[13px] font-semibold text-emerald-700">{srcResult}</div>}
                {/* #552 — AMBER, NOT RED AND NOT GREEN. The sourcing worked; what follows it
                    will not. Rendering this in the green success line would bury it, and in
                    red would read as "the sourcing failed", which is a different and wrong
                    instruction to an operator deciding what to do next. */}
                {srcSendWarn && (
                  <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5">
                    <b className="text-[13px] text-amber-900 block">⚠️ {srcSendWarn.headline} — {srcSendWarn.label}</b>
                    <p className="text-[12.5px] text-amber-800 mt-1 leading-relaxed">{srcSendWarn.detail}</p>
                    <p className="text-[12px] text-amber-700 mt-1.5">
                      The people just sourced are safely on their desk. Nothing will leave until a mailbox is assigned — by design, so no client ever sends from a shared address.
                    </p>
                  </div>
                )}
              </div>

              <div className="shrink-0 px-[22px] pb-3">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {["What's blocking?", 'Status', 'Source 20 leads'].map(c => (
                    <button key={c} onClick={() => runCommand(c)} disabled={cmdBusy}
                      className="text-[12.5px] font-semibold text-[#7C3AED] border border-[#e4dcf7] rounded-full px-3 py-1 hover:bg-[#f7f4fd] disabled:opacity-50">{c}</button>
                  ))}
                  {/* These three are the launch path — they open the surface that does the
                      work, instead of handing prose back to the operator. */}
                  <button onClick={() => { setTab('ICP'); setIcpMode('chat') }}
                    className="text-[12.5px] font-semibold text-[#7C3AED] border border-[#e4dcf7] rounded-full px-3 py-1 hover:bg-[#f7f4fd]">Build the ICP &rarr;</button>
                  <button onClick={() => { setTab('Campaign'); if (!activeCampaign) suggestCampaign() }}
                    className="text-[12.5px] font-semibold text-[#7C3AED] border border-[#e4dcf7] rounded-full px-3 py-1 hover:bg-[#f7f4fd]">Build a campaign &rarr;</button>
                  <button onClick={() => { setTab('Sequence'); suggestSequence() }}
                    className="text-[12.5px] font-semibold text-[#7C3AED] border border-[#e4dcf7] rounded-full px-3 py-1 hover:bg-[#f7f4fd]">Draft the sequence &rarr;</button>
                </div>
                <form onSubmit={e => { e.preventDefault(); if (cmd.trim()) runCommand(cmd.trim()) }} className="flex gap-2">
                  <input value={cmd} onChange={e => setCmd(e.target.value)} disabled={cmdBusy}
                    placeholder={`Command Vida in ${selectedClient?.company_name || 'client'} context…`}
                    className="flex-1 border border-[#ece5fb] rounded-xl px-3.5 py-2.5 text-[13.5px] bg-white outline-none focus:border-[#7C3AED] disabled:opacity-60" />
                  <button type="submit" disabled={cmdBusy || !cmd.trim()}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl px-5 text-[13.5px] font-bold disabled:opacity-40">
                    {cmdBusy ? '…' : 'Run'}
                  </button>
                </form>
              </div>
            </section>

            {/* ── COCKPIT — this client's work surfaces ── */}
            <aside className="flex-1 min-w-0 flex flex-col bg-white min-h-0">
              {/* ── WHERE THEY ARE + THE ONE NEXT ACTION ──────────────────────────────
                  Vida's front door. Eight tabs for a five-action job meant every screen
                  asked you to work out where you were; this answers it. */}
              {selectedWork && (
                <div className="shrink-0 px-4 pt-3">
                  <div className="flex items-center gap-1 overflow-x-auto pb-2.5">
                    {FLOW_STEPS.map(([n, label], i) => {
                      const done = selectedWork.next.step > n
                      const now = selectedWork.next.step === n
                      // #619 — a comped step 2 is NOT a green paid tick. Neutral slate, so the
                      // operator can see at a glance that this account was let through rather
                      // than that it paid.
                      const comped = n === 2 && selectedWork.funded_via === 'comp'
                      return (
                        <span key={n} className="flex items-center gap-1 shrink-0">
                          <span title={comped ? 'Comped — a manual grant entitled this account. No money came in.' : undefined}
                            className={`w-[22px] h-[22px] rounded-lg text-[11.5px] font-extrabold flex items-center justify-center border ${
                            now ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                            : comped && done ? 'bg-[#f1f0f4] text-[#6b6480] border-[#ddd9e6]'
                            : done ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-white text-[#b3a9cc] border-[#ece5fb]'}`}>{done ? (comped ? '·' : '✓') : n}</span>
                          <span className={`text-[12px] whitespace-nowrap ${now ? 'font-extrabold text-[#1f1235]' : 'font-semibold text-[#b3a9cc]'}`}>{flowStepLabel(n, label, selectedWork.funded_via)}</span>
                          {i < FLOW_STEPS.length - 1 && <span className="text-[#d9d0ee] px-0.5">›</span>}
                        </span>
                      )
                    })}
                  </div>

                  <div className={`rounded-2xl border-[1.5px] overflow-hidden mb-3 ${selectedWork.next.actor === 'you' ? 'border-[#7C3AED]' : 'border-[#ece5fb]'}`}>
                    <div className={`flex items-center gap-3 flex-wrap px-4 py-3 border-b ${selectedWork.next.actor === 'you' ? 'bg-gradient-to-br from-[#f3ecff] to-[#fdf2f8] border-[#eee7f7]' : 'bg-[#faf8ff] border-[#f2ecfb]'}`}>
                      <span className="min-w-0">
                        <span className="block text-[11.5px] font-extrabold uppercase tracking-wide text-[#7C3AED]">
                          {selectedWork.next.actor === 'you' ? `Next action · step ${selectedWork.next.step}` : selectedWork.next.actor === 'them' ? 'Waiting on the client' : 'The engine has it'}
                        </span>
                        <b className="text-[18px] leading-tight text-[#1f1235]">{selectedWork.next.label}</b>
                      </span>
                      {selectedWork.next.cta && (
                        <button onClick={() => doNextAction(selectedWork.next.cta!.kind)} disabled={cockpitBusy}
                          className="ml-auto shrink-0 text-[14px] font-bold text-white rounded-xl px-4 py-2.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
                          {selectedWork.next.cta.label} →
                        </button>
                      )}
                    </div>
                    <div className="px-4 py-2.5 flex items-center gap-4 flex-wrap text-[12.5px] text-[#9b8ec4]">
                      <span><b className="text-[#1f1235]">{selectedWork.counts.sourced}</b> sourced</span>
                      <span><b className="text-[#1f1235]">{selectedWork.counts.with_client}</b> with the client</span>
                      {/* Billed, NOT approved × $4 — the first 100 approvals are inside the
                          $99 pack, so multiplying every approval by $4 overstated what this
                          client has actually paid us by up to $400. */}
                      {/* #623 — COUNTED, NEVER CALCULATED. This used to compute cash as
                          `$299 + (approved − 100) × $4` — arithmetic on the approval COUNT —
                          so the founder's own money walk asked why approving two leads did not
                          add $8. It should not have: both contacts were already paid for under
                          #424 charge-once, so no money moved. The engine was right and the
                          board was doing sums. `money_in_usd` is now the SUM OF THE LEDGER —
                          referenced purchases, net of referenced refunds. (#619 kept: a comp
                          reads $0 · comped, and moneyInUsd independently agrees, because a
                          manual_grant is not cash.) */}
                      <span><b className="text-[#1f1235]">{selectedWork.counts.approved}</b> approved · <b className="text-[#1f1235]">${
                        (selectedWork.money_in_usd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
                      }</b> in{selectedWork.funded_via === 'comp' && <span className="text-[#9b8ec4]"> · comped</span>}</span>
                      {selectedWork.pack.active && (
                        <span className={selectedWork.pack.left === 0 ? 'text-[#7C3AED] font-semibold' : ''}>{selectedWork.pack.label}</span>
                      )}
                      {/* Every name costs $0.28 whether they approve it or not. This is the
                          number the whole money model rests on — measured, not assumed. */}
                      <span className={selectedWork.ratio.confident ? 'text-[#1f1235]' : ''} title="Names we sourced ÷ leads they approved. $0.28 a name, approved or not.">
                        📐 {selectedWork.ratio.label}
                      </span>
                      {/* We carry a ~$40/month warmed sender for them whether they approve
                          anyone or not, so 30 days quiet pauses their campaigns. Approving
                          anyone brings them straight back — no operator needed. */}
                      {/* #620 — WHAT THE LAST ENROL RUN REFUSED. Without this line, "every draft
                          rejected" and "nothing happened" are the same picture on send-day. The
                          reasons are shown IN WORDS, never as a bare count. */}
                      {/* HOW MUCH OF THE BOOK CAN ACTUALLY BE SENT TO.
                          `pecr.ts` claimed the unknown-country volume was "counted so it is
                          visible". It never was — the class is an ALLOW, so nothing called
                          noteSkip and the only trace was a console.warn. This is that number,
                          and it reads BEFORE any enrol run has happened, which matters because
                          none ever has.
                          ⚠️ THE DECISION AND THE WORDS ARE THE API'S (lib/country-coverage.ts),
                          not this file's. `apps/admin` cannot import from `apps/api` (#563/#614),
                          so any rule re-implemented here would be a second copy with no test on
                          it. This renders `chip` and decides nothing. */}
                      {coverage?.chip?.show && (
                        <span
                          className={coverage.chip.stop ? 'text-[#b91c1c] font-semibold' : 'text-[#92400e] font-semibold'}
                          title={coverage.chip.title}>
                          {coverage.chip.text}
                        </span>
                      )}
                      {enrolSkips && (enrolSkips.detail?.skipped ?? 0) > 0 && (
                        <span className="text-[#9d174d] font-semibold"
                          title={Object.entries(enrolSkips.detail?.reasons ?? {}).map(([r, n]) => `${r} × ${n}`).join('\n')}>
                          ⚠️ last enrol: {enrolSkips.detail?.enrolled ?? 0} enrolled · {enrolSkips.detail?.skipped} skipped — {enrolSkips.detail?.summary || 'reason not recorded'}
                        </span>
                      )}
                      <span title={selectedWork.cold.exempt ? selectedWork.cold.why : undefined}
                        className={selectedWork.cold.cold ? 'text-[#b91c1c] font-semibold' : selectedWork.cold.warn ? 'text-[#92400e] font-semibold' : selectedWork.cold.exempt ? 'text-[#8a82a3]' : ''}>
                        {selectedWork.cold.exempt ? '🏠' : selectedWork.cold.cold ? '🧊' : selectedWork.cold.warn ? '⏳' : '🕑'} {selectedWork.cold.label}
                      </span>
                    </div>

                    {/* ── THE WORK, IN THE CARD ──────────────────────────────────────────
                        The preview promised "you approve without going hunting through
                        tabs" and the first build shipped a button that sent you to a tab —
                        a signpost, not the work. When the next action is the sequence, the
                        emails are RIGHT HERE, readable, with the decision on them. */}
                    {selectedWork.next.cta?.kind === 'sequence' && (
                      <div className="border-t border-[#f2ecfb] px-4 py-3">
                        {(() => {
                          const sq = cockpit?.sequences?.[0]
                          const steps = Array.isArray(sq?.steps) ? (sq!.steps as Record<string, unknown>[]) : []
                          if (!sq || steps.length === 0) {
                            return (
                              <>
                              <div className="flex items-center gap-2 flex-wrap mb-2 p-2 rounded-lg bg-[#faf7ff] border border-[#ece5fb]">
                                <span className="text-[11.5px] font-bold uppercase tracking-wide text-[#9b8ec4]">Plan</span>
                                <select value={seqPurpose} onChange={e => setSeqPurpose(e.target.value as 'meeting' | 'event' | 'reactivation')}
                                  className="text-[12.5px] rounded-md border border-[#e4d4fb] px-2 py-1 bg-white text-[#1f1235]">
                                  <option value="meeting">Book a meeting</option>
                                  <option value="event">Event invite</option>
                                  <option value="reactivation">Reactivation</option>
                                </select>
                                <select value={seqDepth} onChange={e => setSeqDepth(Number(e.target.value) as 3 | 5 | 7)}
                                  className="text-[12.5px] rounded-md border border-[#e4d4fb] px-2 py-1 bg-white text-[#1f1235]">
                                  <option value={3}>3 touches</option>
                                  <option value={5}>5 touches</option>
                                  <option value={7}>7 touches</option>
                                </select>
                                {seqPurpose === 'event' && (
                                  <label className="text-[12px] text-[#5c5279] flex items-center gap-1">
                                    event date
                                    <input type="date" value={seqEventDate} onChange={e => setSeqEventDate(e.target.value)}
                                      className="text-[12.5px] rounded-md border border-[#e4d4fb] px-2 py-1 bg-white text-[#1f1235]" />
                                  </label>
                                )}
                                <span className="text-[11.5px] text-[#9b8ec4]">the cadence follows the plan{seqPurpose === 'event' ? ' and counts back from the date' : ''}</span>
                              </div>
                              {seqEventWarn && (
                                <div className="mb-2 text-[12.5px] text-[#b3261e] bg-[#fdecea] border border-[#f2c4bf] rounded-lg px-3 py-2">{seqEventWarn}</div>
                              )}
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[13.5px] text-[#5c5279]">Nothing drafted yet — Vida writes it against their highest-scoring approved lead.</span>
                                <button onClick={suggestSequence} disabled={cockpitBusy}
                                  className="text-[13px] font-bold text-white rounded-lg px-3.5 py-2 bg-[#7C3AED] disabled:opacity-50">
                                  {cockpitBusy ? 'Writing…' : '✨ Draft the sequence'}
                                </button>
                              </div>
                              </>
                            )
                          }
                          let day = 0
                          return (
                            <>
                              <div className="flex items-center gap-2 flex-wrap mb-2 p-2 rounded-lg bg-[#faf7ff] border border-[#ece5fb]">
                                <span className="text-[11.5px] font-bold uppercase tracking-wide text-[#9b8ec4]">Plan</span>
                                <select value={seqPurpose} onChange={e => setSeqPurpose(e.target.value as 'meeting' | 'event' | 'reactivation')}
                                  className="text-[12.5px] rounded-md border border-[#e4d4fb] px-2 py-1 bg-white text-[#1f1235]">
                                  <option value="meeting">Book a meeting</option>
                                  <option value="event">Event invite</option>
                                  <option value="reactivation">Reactivation</option>
                                </select>
                                <select value={seqDepth} onChange={e => setSeqDepth(Number(e.target.value) as 3 | 5 | 7)}
                                  className="text-[12.5px] rounded-md border border-[#e4d4fb] px-2 py-1 bg-white text-[#1f1235]">
                                  <option value={3}>3 touches</option>
                                  <option value={5}>5 touches</option>
                                  <option value={7}>7 touches</option>
                                </select>
                                {seqPurpose === 'event' && (
                                  <label className="text-[12px] text-[#5c5279] flex items-center gap-1">
                                    event date
                                    <input type="date" value={seqEventDate} onChange={e => setSeqEventDate(e.target.value)}
                                      className="text-[12.5px] rounded-md border border-[#e4d4fb] px-2 py-1 bg-white text-[#1f1235]" />
                                  </label>
                                )}
                                <span className="text-[11.5px] text-[#9b8ec4]">the cadence follows the plan{seqPurpose === 'event' ? ' and counts back from the date' : ''}</span>
                              </div>
                              {seqEventWarn && (
                                <div className="mb-2 text-[12.5px] text-[#b3261e] bg-[#fdecea] border border-[#f2c4bf] rounded-lg px-3 py-2">{seqEventWarn}</div>
                              )}
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <b className="text-[13.5px] text-[#1f1235]">{sq.name || 'Sequence'}</b>
                                <span className="text-[12px] text-[#9b8ec4]">{steps.length} email{steps.length === 1 ? '' : 's'} · read it properly before you approve</span>
                                <span className="ml-auto flex gap-1.5">
                                  <button onClick={suggestSequence} disabled={cockpitBusy}
                                    className="text-[12.5px] font-bold text-[#7C3AED] bg-[#f3ecff] border border-[#e4d4fb] rounded-lg px-2.5 py-1.5 disabled:opacity-50">✨ Redraft</button>
                                  <button onClick={() => openSeqEditor(sq)}
                                    className="text-[12.5px] font-bold text-[#5c5279] bg-white border border-[#ece5fb] rounded-lg px-2.5 py-1.5">Edit</button>
                                </span>
                              </div>
                              <div className="grid gap-2 max-h-[340px] overflow-y-auto">
                                {steps.map((st, i) => {
                                  day += i === 0 ? 0 : (Number(st.wait_days ?? 3) || 0)
                                  return (
                                    <div key={i} className="rounded-xl border border-[#ece5fb] bg-[#faf8ff] px-3 py-2.5">
                                      <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">Email {i + 1} · day {day}</div>
                                      <div className="text-[13.5px] font-bold text-[#1f1235] mt-0.5">{String(st.subject ?? '(no subject)')}</div>
                                      <div className="text-[13px] text-[#5c5279] mt-1 whitespace-pre-wrap leading-relaxed">{String(st.body ?? '')}</div>
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="text-[12px] text-[#9b8ec4] mt-2">
                                Approving sends a test to <b className="text-[#5c5279]">hello@get-kind.com</b> first — judge the spam placement there, then it goes live.
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="shrink-0 flex items-end gap-0.5 px-3 pt-2.5 border-b border-[#eee7f7] overflow-x-auto">
                {(['Inbox', 'Approvals', 'People', 'Campaign', 'ICP', 'Sequence', 'Asks', 'Bookings', 'Programme'] as CockpitTab[]).map(t => {
                  const on = tab === t
                  const n = t === 'Inbox' ? (cockpit?.replies.filter(r => !r.qualified_at && !r.meeting_booked_at).length ?? 0)
                    : t === 'Approvals' ? (cols?.needs_approval.count ?? 0)
                    : t === 'People' ? (cols?.sourced.count ?? 0)
                    : t === 'Asks' ? unansweredAsks
                    : t === 'Bookings' ? (cols?.booked.count ?? 0) : 0
                  return (
                    <button key={t} onClick={() => setTab(t)}
                      className={`shrink-0 px-2.5 py-2 text-[13px] font-bold rounded-t-lg border-b-2 -mb-px transition-colors ${on ? 'border-[#7C3AED] text-[#1f1235] bg-[#faf8ff]' : 'border-transparent text-[#9b8ec4] hover:text-[#5c5279]'}`}>
                      {t}{n > 0 && <span className="ml-1 text-[10.5px] font-extrabold text-white bg-[#EC4899] rounded-full px-1.5">{n}</span>}
                    </button>
                  )
                })}
              </div>

              <p className="shrink-0 px-4 pt-2 text-[12.5px] text-[#b3a9cc]">
                Somewhere to look — the action above is what actually moves them.
              </p>
              <div className="flex-1 overflow-y-auto p-3.5">
                {cockpitError && <p className="text-[13px] text-red-500 mb-2">{cockpitError}</p>}
                {cockpitLoading && !cockpit && <p className="text-[13.5px] text-[#9b8ec4]">Loading…</p>}

                {/* INBOX — a prospect asks; WE answer */}
                {tab === 'Inbox' && (cockpit ? (
                  openReply ? (
                    <div>
                      <button onClick={() => { setOpenReply(null); setThread(null); setDraft('') }} className="text-[12.5px] font-bold text-[#7C3AED] mb-2.5">&larr; All replies</button>
                      {!thread ? <p className="text-[13.5px] text-[#9b8ec4]">Loading thread…</p> : (<>
                        <div className="border border-[#eee7f7] rounded-xl p-3 mb-3">
                          <b className="text-[14px] block">{String(thread.reply.from_name || thread.reply.from_email || 'Prospect')}</b>
                          <span className="text-[12px] text-[#9b8ec4]">
                            {[thread.lead?.job_title, thread.lead?.company].filter(Boolean).join(' · ') || String(thread.reply.from_email ?? '')}
                          </span>
                          <p className="text-[13.5px] text-[#4c4368] leading-relaxed mt-2 whitespace-pre-wrap">
                            {String(thread.reply.body_text || thread.reply.body || '(no body captured)').slice(0, 1500)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <b className="text-[13px]">Your reply</b>
                          <span className="text-[12px] text-[#9b8ec4]">— sent as {selectedClient?.company_name || 'the client'}</span>
                          <button onClick={draftReply} disabled={replyBusy !== null}
                            className="ml-auto text-[12.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 hover:bg-[#f7f4fd] disabled:opacity-50">
                            {replyBusy === 'draft' ? 'Drafting…' : '✨ Draft for me'}
                          </button>
                        </div>
                        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={7}
                          placeholder="Write the reply, or let Vida draft it in the client's voice…"
                          className="w-full border border-[#ece5fb] rounded-xl px-3 py-2.5 text-[13.5px] leading-relaxed outline-none focus:border-[#7C3AED]" />
                        <div className="flex gap-2 mt-2">
                          <button onClick={sendReply} disabled={replyBusy !== null || !draft.trim()}
                            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-4 py-2 text-[13.5px] font-bold disabled:opacity-40">
                            {replyBusy === 'send' ? 'Sending…' : 'Send'}
                          </button>
                          <button onClick={() => qualifyReply(openReply, true)} disabled={acting !== null}
                            className="border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2 text-[13.5px] font-bold disabled:opacity-50">Mark qualified</button>
                          <a href={`/vida/record?lead_id=${encodeURIComponent(String(thread.reply.lead_id ?? ''))}`}
                            className="border border-[#ece5fb] rounded-lg px-3 py-2 text-[13.5px] font-bold text-[#5c5279]">Record</a>
                        </div>
                        {replyMsg && <p className="text-[12.5px] font-semibold text-[#0e7c86] mt-2">{replyMsg}</p>}
                      </>)}
                    </div>
                  ) : cockpit.replies.length === 0 ? (
                    <p className="text-[13.5px] text-[#9b8ec4] text-center py-8">No replies yet.</p>
                  ) : cockpit.replies.map(r => (
                    <button key={r.id} onClick={() => openThread(r.id)}
                      className="w-full text-left flex items-center gap-2.5 border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-2 hover:border-[#d9c9f7]">
                      <div className="min-w-0">
                        <b className="text-[13.5px] block truncate">{r.from_name || r.from_email || 'Unknown'}</b>
                        <span className="text-[12px] text-[#9b8ec4]">{r.classification || 'unclassified'} · {fmtDate(r.received_at)}</span>
                      </div>
                      <span className={`ml-auto shrink-0 text-[11px] font-extrabold rounded-full border px-2 py-0.5 ${r.meeting_booked_at ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : r.qualified_at ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-[#b45309] bg-[#fffbeb] border-[#fcd34d]'}`}>
                        {r.meeting_booked_at ? 'booked' : r.qualified_at ? 'qualified' : 'needs you'}
                      </span>
                    </button>
                  ))
                ) : null)}

                {/* APPROVALS — drafts waiting on the operator's send gate */}
                {tab === 'Approvals' && (
                  (cols?.needs_approval.cards.length ?? 0) === 0
                    ? <p className="text-[13.5px] text-[#9b8ec4] text-center py-8">Nothing waiting on your send gate.</p>
                    : cols!.needs_approval.cards.map(c => (
                      <div key={c.id} className="border border-[#eee7f7] rounded-xl p-3 mb-2">
                        <b className="text-[13.5px] block">{fullName(c.leads?.first_name ?? null, c.leads?.last_name ?? null)}</b>
                        <span className="text-[12px] text-[#9b8ec4]">{c.leads?.company || c.to_email || '—'} · step {c.sequence_step ?? 1}</span>
                        <button onClick={() => toggleDraft(c.id)} className="block text-[12.5px] font-bold text-[#7C3AED] mt-1.5">
                          {openDrafts.has(c.id) ? 'Hide draft' : 'Read draft'}
                        </button>
                        {openDrafts.has(c.id) && (
                          <div className="mt-1.5 bg-[#faf8ff] border border-[#f2ecfb] rounded-lg p-2.5">
                            <b className="text-[12.5px] block mb-1">{c.subject || '(no subject)'}</b>
                            <p className="text-[12.5px] text-[#4c4368] leading-relaxed whitespace-pre-wrap">{(c.body || '').slice(0, 1200)}</p>
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => actQueue(c.id, 'approve')} disabled={acting !== null}
                            className="bg-[#7C3AED] text-white rounded-lg px-3 py-1.5 text-[13px] font-bold disabled:opacity-50">Approve &amp; send</button>
                          <button onClick={() => actQueue(c.id, 'reject')} disabled={acting !== null}
                            className="border border-[#ece5fb] rounded-lg px-3 py-1.5 text-[13px] font-bold text-[#5c5279] disabled:opacity-50">Reject</button>
                        </div>
                      </div>
                    ))
                )}

                {/* ── PEOPLE — V4 pick them, V5 put THOSE ones in the campaign ── */}
                {tab === 'People' && (people === null ? (
                  <p className="text-[13.5px] text-[#9b8ec4]">Loading people…</p>
                ) : people.length === 0 ? (
                  <p className="text-[13.5px] text-[#9b8ec4] text-center py-8">Nobody sourced yet — ask Vida to source leads.</p>
                ) : (<>
                  <div className="sticky top-0 -mt-3.5 -mx-3.5 px-3.5 pt-3.5 pb-2 bg-white z-10 border-b border-[#f2ecfb] mb-2.5">
                    {/* v2: there is no "assign to campaign" any more. One ICP = one campaign,
                        so a person's campaign is decided by the ICP that found them — there
                        is nothing to assign. Everyone sourced goes to the client; the client
                        picks; their 👍 is what puts someone into the campaign. */}
                    <b className="text-[13.5px]">{people.length} people · {people.filter(p => p.in_campaign).length} working</b>
                    <p className="text-[11.5px] text-[#9b8ec4] mt-1">
                      Everyone here went to the client, scored, with the top 20 recommended.
                      Their 👍 charges $4 and starts the work — you don't assign anyone.
                    </p>
                    {saveMsg && <p className={`text-[12.5px] font-semibold mt-1 ${noticeClass(saveMsg.tone)}`}>{saveMsg.text}</p>}
                  </div>
                  {people.map(p => (
                    <div key={p.id} className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 mb-2 ${p.in_campaign ? 'border-emerald-200 bg-emerald-50/40' : 'border-[#eee7f7]'}`}>
                      <div className="min-w-0">
                        <b className="text-[13.5px] block truncate">
                          {fullName(p.first_name, p.last_name)}
                          {/* The same 20 the client sees marked in Milla — both consoles
                              agree on who we said we'd start with. */}
                          {p.recommended && <span className="ml-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#7C3AED] bg-[#f3ecff] border border-[#e4d4fb] rounded px-1.5 py-0.5 align-middle">Top 20</span>}
                        </b>
                        <span className="text-[12px] text-[#9b8ec4] truncate block">
                          {[p.job_title, p.company].filter(Boolean).join(' · ') || '—'}
                          {p.icp_name && <span className="text-[#b3a9cc]"> · from “{p.icp_name}”</span>}
                        </span>
                      </div>
                      <div className="ml-auto shrink-0 flex items-center gap-2">
                        {p.score != null && <span className="text-[14px] font-extrabold tabular-nums">{p.score}</span>}
                        {p.in_campaign
                          ? <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">in campaign</span>
                          : p.enrolled
                            ? <span className="text-[11px] font-extrabold text-[#9b8ec4] bg-[#f7f4fd] border border-[#eee7f7] rounded-full px-2 py-0.5">working</span>
                            : (<>
                              <button onClick={() => act(p.id, 'surface')} disabled={acting !== null}
                                className="text-[12.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 disabled:opacity-50">Send to client</button>
                              <button onClick={() => act(p.id, 'pass')} disabled={acting !== null}
                                className="text-[12.5px] font-bold text-[#9b8ec4] disabled:opacity-50">Pass</button>
                            </>)}
                      </div>
                    </div>
                  ))}
                </>))}

                {/* ── CAMPAIGN — V6 propose · V7 edit · V8 pilot mode · V12 test · V13 run · V14 who's in it ── */}
                {tab === 'Campaign' && (cockpit ? (
                  enrollView ? (
                    <div>
                      <button onClick={() => setEnrollView(null)} className="text-[12.5px] font-bold text-[#7C3AED] mb-2.5">&larr; Back to campaigns</button>
                      <b className="text-[14px] block">{enrollView.campaign.name} — who&rsquo;s in it</b>
                      <span className="block text-[12px] text-[#9b8ec4] mb-3">{enrollView.rows.length} enrolled</span>
                      {enrollView.rows.length === 0
                        ? <p className="text-[13.5px] text-[#9b8ec4] text-center py-6">Nobody in it yet — pick people on the People tab.</p>
                        : enrollView.rows.map(r => (
                          <div key={r.id} className="flex items-center gap-2.5 border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-2">
                            <div className="min-w-0">
                              <b className="text-[13.5px] block truncate">{fullName(r.first_name, r.last_name)}</b>
                              <span className="text-[12px] text-[#9b8ec4] truncate block">{[r.job_title, r.company].filter(Boolean).join(' · ') || '—'}</span>
                            </div>
                            <div className="ml-auto shrink-0 text-right">
                              <span className="text-[12px] font-bold text-[#5c5279] block">step {r.current_step ?? 1}/{r.total_steps ?? 3}</span>
                              <span className={`text-[11px] font-extrabold rounded-full border px-2 py-0.5 inline-block mt-0.5 ${r.replied ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-[#9b8ec4] bg-[#f7f4fd] border-[#eee7f7]'}`}>
                                {r.replied ? `replied · ${r.replied}` : r.next_send_at ? `next ${fmtDate(r.next_send_at)}` : (r.status ?? 'enrolled')}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : campEdit ? (
                    <div>
                      <button onClick={() => setCampEdit(null)} className="text-[12.5px] font-bold text-[#7C3AED] mb-2.5">&larr; Back to campaigns</button>
                      <b className="text-[14px] block mb-2">{campEdit.id ? 'Edit campaign' : 'New campaign'}</b>
                      <label className="block mb-2">
                        <span className="text-[11.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">Name</span>
                        <input value={campEdit.name} onChange={e => setCampEdit({ ...campEdit, name: e.target.value })}
                          placeholder="e.g. SA logistics COOs"
                          className="w-full border border-[#ece5fb] rounded-lg px-3 py-2 text-[13.5px] mt-0.5 outline-none focus:border-[#7C3AED]" />
                      </label>
                      <label className="block mb-2">
                        <span className="text-[11.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">Who it hunts, and why now</span>
                        <textarea value={campEdit.campaign_intent} rows={3}
                          onChange={e => setCampEdit({ ...campEdit, campaign_intent: e.target.value })}
                          placeholder="This is the brief every email is written from — be specific."
                          className="w-full border border-[#ece5fb] rounded-lg px-3 py-2 text-[13.5px] leading-relaxed mt-0.5 outline-none focus:border-[#7C3AED]" />
                      </label>
                      <label className="block mb-3">
                        <span className="text-[11.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">Daily send cap</span>
                        <input type="number" min={1} max={500} value={campEdit.daily_send_limit}
                          onChange={e => setCampEdit({ ...campEdit, daily_send_limit: e.target.value })}
                          placeholder="blank = platform default"
                          className="w-full border border-[#ece5fb] rounded-lg px-3 py-2 text-[13.5px] mt-0.5 outline-none focus:border-[#7C3AED]" />
                      </label>
                      {/* V7 — THE SEND WINDOW. Real, not decorative: settings.send_days /
                          send_hour_utc were write-only until this PR; the send cron now
                          honours them. No days picked = any day; no hour = any hour. */}
                      <div className="border border-[#eee7f7] rounded-xl p-3 mb-3">
                        <b className="text-[13px] block mb-1.5">When it may send</b>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {DAY_LABELS.map(([key, label]) => {
                            const on = campEdit.send_days.includes(key)
                            return (
                              <button key={key} type="button"
                                onClick={() => setCampEdit({
                                  ...campEdit,
                                  send_days: on ? campEdit.send_days.filter(d => d !== key) : [...campEdit.send_days, key],
                                })}
                                className={`text-[12.5px] font-bold rounded-lg border px-2.5 py-1 ${on ? 'text-white bg-[#7C3AED] border-[#7C3AED]' : 'text-[#5c5279] bg-white border-[#ece5fb] hover:border-[#d9c9f7]'}`}>
                                {label}
                              </button>
                            )
                          })}
                        </div>
                        <label className="flex items-center gap-2 text-[12.5px] text-[#5c5279]">
                          Not before
                          <select value={campEdit.send_hour_utc}
                            onChange={e => setCampEdit({ ...campEdit, send_hour_utc: e.target.value })}
                            className="border border-[#ece5fb] rounded-lg px-2 py-1 text-[13px] outline-none focus:border-[#7C3AED]">
                            <option value="">any hour</option>
                            {Array.from({ length: 24 }, (_, h) => (
                              <option key={h} value={String(h)}>{String(h).padStart(2, '0')}:00 UTC</option>
                            ))}
                          </select>
                        </label>
                        <p className="text-[11.5px] text-[#9b8ec4] mt-1.5">
                          {campEdit.send_days.length === 0 && !campEdit.send_hour_utc.trim()
                            ? 'Any day, any hour — the daily cap and kill-switch still apply.'
                            : `Sends only ${campEdit.send_days.length ? DAY_LABELS.filter(([k]) => campEdit.send_days.includes(k)).map(([, l]) => l).join(' · ') : 'any day'}${campEdit.send_hour_utc.trim() ? `, from ${String(campEdit.send_hour_utc).padStart(2, '0')}:00 UTC` : ''}. Anything due outside it waits — nothing is lost.`}
                        </p>
                      </div>

                      {/* V7 — A/B SUBJECT VARIANTS. ab_subject_b IS read by the engine
                          (lib/figsy.ts picks a variant) and the #511 auto-tune cron scores
                          them, so filling B is what switches the test on. */}
                      <div className="border border-[#eee7f7] rounded-xl p-3 mb-3">
                        <b className="text-[13px] block">Subject A/B test</b>
                        <p className="text-[11.5px] text-[#9b8ec4] mb-1.5">
                          Step 1&rsquo;s own subject is variant A. Add B to start testing; C–E are optional.
                        </p>
                        {([['ab_subject_b', 'B'], ['ab_subject_c', 'C'], ['ab_subject_d', 'D'], ['ab_subject_e', 'E']] as [keyof CampEdit, string][]).map(([key, letter]) => (
                          <label key={String(key)} className="flex items-center gap-2 mb-1">
                            <span className="w-4 text-[12px] font-extrabold text-[#b3a9cc]">{letter}</span>
                            <input value={String(campEdit[key] ?? '')} maxLength={200}
                              onChange={e => setCampEdit({ ...campEdit, [key]: e.target.value })}
                              placeholder={letter === 'B' ? 'e.g. quick question about {{company}}' : 'optional'}
                              className="flex-1 border border-[#ece5fb] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[#7C3AED]" />
                          </label>
                        ))}
                      </div>

                      {/* V8 — Auto-Pilot vs Co-Pilot. Co-Pilot writes approve_before_send, so
                          every email stops at the Approvals tab before it reaches a prospect. */}
                      <div className="border border-[#eee7f7] rounded-xl p-3 mb-3">
                        <b className="text-[13px] block mb-1.5">How it sends</b>
                        {([[true, 'Co-Pilot', 'Every email waits for you on the Approvals tab.'], [false, 'Auto-Pilot', 'Sends flow on schedule. Kill-switch and caps still apply.']] as [boolean, string, string][]).map(([mode, label, hint]) => (
                          <label key={label} className={`flex items-start gap-2 rounded-lg px-2.5 py-2 mb-1 cursor-pointer border ${campEdit.copilot_mode === mode ? 'border-[#7C3AED] bg-[#faf8ff]' : 'border-transparent hover:bg-[#faf8ff]'}`}>
                            <input type="radio" name="pilot" checked={campEdit.copilot_mode === mode}
                              onChange={() => setCampEdit({ ...campEdit, copilot_mode: mode })}
                              className="mt-0.5 accent-[#7C3AED]" />
                            <span>
                              <b className="text-[13px] block">{label}</b>
                              <span className="text-[12px] text-[#9b8ec4]">{hint}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveCampaign()} disabled={cockpitBusy || !campEdit.name.trim()}
                          className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13.5px] font-bold disabled:opacity-40">
                          {cockpitBusy ? 'Saving…' : campEdit.id ? 'Save changes' : 'Create campaign'}
                        </button>
                        <button onClick={() => setCampEdit(null)} className="border border-[#ece5fb] rounded-lg px-3 py-2 text-[13.5px] font-bold text-[#5c5279]">Cancel</button>
                      </div>
                      {saveMsg && <p className={`text-[12.5px] font-semibold mt-2 ${noticeClass(saveMsg.tone)}`}>{saveMsg.text}</p>}
                    </div>
                  ) : (<>
                    {/* V6 — Vida proposes; the operator approves. Never auto-created behind us. */}
                    {cockpit.campaigns.length === 0 && !proposal && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-3">
                        <b className="text-[13.5px] text-amber-800 block">No campaign — this client cannot be worked.</b>
                        <p className="text-[12.5px] text-amber-700 mt-1">Approvals are blocked and the $4 is deliberately NOT charged while no campaign is active.</p>
                        <div className="flex gap-2 mt-2.5">
                          <button onClick={suggestCampaign} disabled={cockpitBusy}
                            className="bg-[#7C3AED] text-white rounded-lg px-3.5 py-2 text-[13.5px] font-bold disabled:opacity-60">
                            {cockpitBusy ? 'Thinking…' : '✨ Suggest a campaign'}
                          </button>
                          <button onClick={() => openCampEditor()} disabled={cockpitBusy}
                            className="border border-amber-300 bg-white text-amber-800 rounded-lg px-3 py-2 text-[13.5px] font-bold disabled:opacity-60">Write it myself</button>
                          <button onClick={startCampaign} disabled={cockpitBusy}
                            className="text-[12.5px] font-bold text-amber-800 underline disabled:opacity-60">Just unblock them</button>
                        </div>
                      </div>
                    )}
                    {proposal && (
                      <div className="rounded-xl border border-[#e4dcf7] bg-[#faf8ff] px-4 py-3 mb-3">
                        <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">Vida proposes · from ICP “{proposal.icp_name}”</span>
                        <b className="text-[14px] block mt-1">{proposal.name}</b>
                        <p className="text-[12.5px] text-[#5c5279] leading-relaxed mt-1">{proposal.campaign_intent}</p>
                        <div className="flex gap-2 mt-2.5">
                          <button onClick={() => saveCampaign({ name: proposal.name, campaign_intent: proposal.campaign_intent, copilot_mode: true })}
                            disabled={cockpitBusy}
                            className="bg-[#7C3AED] text-white rounded-lg px-3.5 py-2 text-[13.5px] font-bold disabled:opacity-60">
                            {cockpitBusy ? 'Creating…' : 'Approve & create'}
                          </button>
                          <button onClick={() => openCampEditor()} disabled={cockpitBusy}
                            className="border border-[#ece5fb] bg-white rounded-lg px-3 py-2 text-[13.5px] font-bold text-[#5c5279]">Edit first</button>
                          <button onClick={() => setProposal(null)} className="text-[12.5px] font-bold text-[#9b8ec4]">Discard</button>
                        </div>
                        <p className="text-[11.5px] text-[#9b8ec4] mt-2">New campaigns start in Co-Pilot — every email stops at Approvals until you switch it.</p>
                      </div>
                    )}
                    {cockpit.campaigns.map(c => (
                      <div key={c.id} className="border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="min-w-0">
                            <b className="text-[13.5px] block truncate">{c.name}</b>
                            <span className="text-[12px] text-[#9b8ec4]">{c.leads_enrolled} enrolled · {c.emails_sent} sent · {c.replies_total} replies</span>
                          </div>
                          <span className={`ml-auto shrink-0 text-[11px] font-extrabold rounded-full border px-2 py-0.5 ${c.status === 'active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-[#9b8ec4] bg-[#f7f4fd] border-[#eee7f7]'}`}>{c.status === 'active' ? 'live' : c.status}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <button onClick={() => openCampEditor(c)} disabled={cockpitBusy}
                            className="text-[12.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 disabled:opacity-50">Edit</button>
                          <button onClick={() => openEnrollments(c)} disabled={cockpitBusy}
                            className="text-[12.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 disabled:opacity-50">Who&rsquo;s in it</button>
                          {/* V12 — test before a real prospect ever sees it. */}
                          <button onClick={() => testCampaign(c.id, false)} disabled={cockpitBusy}
                            className="text-[12.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 disabled:opacity-50">Preview step 1</button>
                          <button onClick={() => testCampaign(c.id, true)} disabled={cockpitBusy}
                            className="text-[12.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 disabled:opacity-50">Email me a test</button>
                          {/* V13 — run / pause. */}
                          {c.status === 'active'
                            ? <button onClick={() => setCampaignStatus(c.id, 'paused')} disabled={cockpitBusy}
                                className="text-[12.5px] font-bold text-[#9b8ec4] border border-[#ece5fb] rounded-lg px-2.5 py-1 disabled:opacity-50">Pause</button>
                            : <button onClick={() => setCampaignStatus(c.id, 'active')} disabled={cockpitBusy}
                                className="text-[12.5px] font-bold text-white bg-gradient-to-br from-[#7C3AED] to-[#EC4899] rounded-lg px-2.5 py-1 disabled:opacity-50">Run it</button>}
                        </div>
                      </div>
                    ))}
                    {testResult && (
                      <div className="border border-[#e4dcf7] bg-[#faf8ff] rounded-xl p-3 mt-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <b className="text-[13px]">Step 1, as it will send</b>
                          <button onClick={() => setTestResult(null)} className="ml-auto text-[12px] font-bold text-[#9b8ec4]">Close</button>
                        </div>
                        <b className="text-[12.5px] block mb-1">{testResult.preview.subject}</b>
                        <p className="text-[12.5px] text-[#4c4368] leading-relaxed whitespace-pre-wrap">{testResult.preview.body}</p>
                        {testResult.sent && <p className="text-[12px] font-semibold text-emerald-700 mt-2">Emailed to {testResult.to}.</p>}
                      </div>
                    )}
                    {cockpit.campaigns.length > 0 && (
                      <button onClick={suggestCampaign} disabled={cockpitBusy}
                        className="mt-1 text-[12.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 disabled:opacity-50">✨ Suggest another campaign</button>
                    )}
                    {saveMsg && <p className={`text-[12.5px] font-semibold mt-2 ${noticeClass(saveMsg.tone)}`}>{saveMsg.text}</p>}
                  </>)
                ) : null)}

                {/* ── ICP — V2 build it by TALKING; the form is the precise-edit fallback ── */}
                {tab === 'ICP' && (cockpit ? (icpEdit ? (
                  <div>
                    <button onClick={() => setIcpEdit(null)} className="text-[12.5px] font-bold text-[#7C3AED] mb-2.5">&larr; Back to ICPs</button>
                    <b className="text-[14px] block mb-2">{icpEdit.icp_id ? 'Edit ICP' : 'New ICP version'}</b>
                    {ICP_FIELDS.map(([key, label]) => (
                      <label key={key} className="block mb-2">
                        <span className="text-[11.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">{label}</span>
                        <input value={icpEdit[key] ?? ''} onChange={e => setIcpEdit({ ...icpEdit, [key]: e.target.value })}
                          placeholder={key === 'name' ? 'e.g. SA logistics C-suite' : 'comma separated'}
                          className="w-full border border-[#ece5fb] rounded-lg px-3 py-2 text-[13.5px] mt-0.5 outline-none focus:border-[#7C3AED]" />
                      </label>
                    ))}
                    <div className="flex gap-2 mt-3">
                      <button onClick={saveIcp} disabled={cockpitBusy || !(icpEdit.name ?? '').trim()}
                        className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13.5px] font-bold disabled:opacity-40">
                        {cockpitBusy ? 'Saving…' : icpEdit.icp_id ? 'Save changes' : 'Save as current ICP'}
                      </button>
                      <button onClick={() => setIcpEdit(null)} className="border border-[#ece5fb] rounded-lg px-3 py-2 text-[13.5px] font-bold text-[#5c5279]">Cancel</button>
                    </div>
                    <p className="text-[12px] text-[#9b8ec4] mt-2">A new version becomes the active ICP — sourcing targets it immediately.</p>
                  </div>
                ) : icpMode === 'chat' ? (
                  <div className="flex flex-col h-full min-h-0">
                    <div className="shrink-0 flex items-center gap-2 mb-2">
                      <b className="text-[14px]">Build it by talking</b>
                      <button onClick={() => setIcpMode('list')} className="ml-auto text-[12.5px] font-bold text-[#9b8ec4]">All ICPs</button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 mb-2 min-h-[120px]">
                      {icpChat.length === 0 && (
                        <p className="text-[13px] text-[#9b8ec4] leading-relaxed">
                          Tell me who we should be hunting for {selectedClient?.company_name || 'this client'} — industry, titles, seniority, size, region.
                          {cockpit.icps.length > 0 && ' I already have their current ICP, so say what should change.'}
                        </p>
                      )}
                      {icpChat.map((m, i) => (
                        <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                          <span className={`inline-block text-[13px] leading-relaxed rounded-xl px-3 py-2 max-w-[90%] text-left ${m.role === 'user' ? 'bg-[#1f1235] text-white' : 'bg-[#faf8ff] border border-[#eee7f7] text-[#1f1235]'}`}>{m.content}</span>
                        </div>
                      ))}
                      {cockpitBusy && <p className="text-[12.5px] text-[#9b8ec4]">Thinking…</p>}
                    </div>
                    {icpProposal && (
                      <div className="shrink-0 border border-[#e4dcf7] bg-[#faf8ff] rounded-xl p-3 mb-2">
                        <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">Proposed profile</span>
                        <b className="text-[13.5px] block mt-0.5 mb-1">{String((icpProposal as Record<string, unknown>).name ?? 'ICP')}</b>
                        {ICP_FIELDS.filter(([k]) => k !== 'name').map(([k, label]) => {
                          const v = joinArr((icpProposal as Record<string, unknown>)[k])
                          return v ? <p key={k} className="text-[12px] text-[#5c5279]"><b className="text-[#9b8ec4] font-bold">{label}:</b> {v}</p> : null
                        })}
                        <div className="flex gap-2 mt-2.5">
                          <button onClick={proposalToForm}
                            className="bg-[#7C3AED] text-white rounded-lg px-3.5 py-2 text-[13px] font-bold">Review &amp; save</button>
                          <button onClick={() => setIcpProposal(null)} className="text-[12.5px] font-bold text-[#9b8ec4]">Keep talking</button>
                        </div>
                      </div>
                    )}
                    <form onSubmit={e => { e.preventDefault(); sendIcpChat(icpInput) }} className="shrink-0 flex gap-2">
                      <input value={icpInput} onChange={e => setIcpInput(e.target.value)} disabled={cockpitBusy}
                        placeholder="e.g. SA logistics, COOs and heads of ops, 50–500 staff…"
                        className="flex-1 border border-[#ece5fb] rounded-xl px-3 py-2.5 text-[13.5px] outline-none focus:border-[#7C3AED] disabled:opacity-60" />
                      <button type="submit" disabled={cockpitBusy || !icpInput.trim()}
                        className="bg-[#7C3AED] text-white rounded-xl px-4 text-[13.5px] font-bold disabled:opacity-40">Send</button>
                    </form>
                  </div>
                ) : (<>
                  {cockpit.icps.length === 0
                    ? <p className="text-[13.5px] text-[#9b8ec4] text-center py-6">No ICP yet — sourcing has no target until there is one.</p>
                    : cockpit.icps.map((i, n) => (
                      <div key={i.id} className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 mb-2 ${
                        i.pending_submitted_at ? 'border-amber-300 bg-amber-50/50' : 'border-[#eee7f7]'}`}>
                        <div className="min-w-0">
                          <b className="text-[13.5px] block truncate">{i.name || `ICP v${cockpit.icps.length - n}`}</b>
                          <span className="text-[12px] text-[#9b8ec4]">{i.last_run_at ? `last sourced ${fmtDate(i.last_run_at)}` : 'never sourced'}</span>
                          {/* A LIVE CLIENT'S REVISION IS WAITING (founder-ruled 22 Aug). It is
                              saved and NOT in effect — their current targeting is still what
                              we source. GO reviews-and-applies it. Naming the proposed
                              targeting here is the whole review: an operator should not have
                              to open an editor to find out what changed. */}
                          {i.pending_submitted_at && (
                            <span className="block text-[12px] font-bold text-amber-800 mt-1">
                              ⏸ Revision waiting since {fmtDate(i.pending_submitted_at)} — “{i.pending_targeting?.name || 'revised targeting'}”. Not in effect; GO applies it.
                            </span>
                          )}
                          {/* The BRIEF waits with the targeting (founder-ruled 22 Aug), so it
                              is shown with it: an operator reviewing a revision needs to see
                              what the campaign is now FOR, not only who it is aimed at. */}
                          {i.pending_campaign_intent && (
                            <span className="block text-[12px] text-amber-800 mt-0.5">
                              New brief waiting: “{i.pending_campaign_intent}”
                            </span>
                          )}
                        </div>
                        <div className="ml-auto shrink-0 flex items-center gap-2">
                          {n === 0 && <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">current</span>}
                          {/* K.I.N.D OWNS GO (22 Aug). The client can write and refine their
                              ICP; only we make it live. This button is the control that made
                              that safe to enforce — without it the API gate would strand
                              every new ICP with nobody able to switch it on. */}
                          <button disabled={acting === `go-${i.id}`} onClick={() => activateIcp(i.id)}
                            className="text-[12.5px] font-bold text-white bg-emerald-600 rounded-lg px-2.5 py-1 disabled:opacity-50">
                            {acting === `go-${i.id}` ? '…' : 'GO'}
                          </button>
                          <button onClick={() => openIcpEditor(i.id)} className="text-[12.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1">Edit</button>
                        </div>
                      </div>
                    ))}
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => { setIcpMode('chat'); setSaveMsg(null) }}
                      className="bg-[#7C3AED] text-white rounded-lg px-3.5 py-2 text-[13.5px] font-bold">
                      {cockpit.icps.length === 0 ? '💬 Build the ICP by talking' : '💬 Refine it by talking'}
                    </button>
                    <button onClick={() => openIcpEditor()} className="border border-[#ece5fb] rounded-lg px-3 py-2 text-[13.5px] font-bold text-[#5c5279]">Fill the form</button>
                  </div>
                  {saveMsg && <p className={`text-[12.5px] font-semibold mt-2 ${noticeClass(saveMsg.tone)}`}>{saveMsg.text}</p>}
                </>)) : null)}

                {/* ── SEQUENCE — V9 propose · approve by saving · V11 preview ── */}
                {tab === 'Sequence' && (cockpit ? (seqEdit ? (
                  <div>
                    <button onClick={() => setSeqEdit(null)} className="text-[12.5px] font-bold text-[#7C3AED] mb-2.5">&larr; Back to sequences</button>
                    {saveMsg && <p className={`text-[12.5px] font-semibold mb-2 ${noticeClass(saveMsg.tone)}`}>{saveMsg.text}</p>}
                    <label className="block mb-2.5">
                      <span className="text-[11.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">Sequence name</span>
                      <input value={seqEdit.name} onChange={e => setSeqEdit({ ...seqEdit, name: e.target.value })}
                        placeholder="e.g. Practitioner angle"
                        className="w-full border border-[#ece5fb] rounded-lg px-3 py-2 text-[13.5px] mt-0.5 outline-none focus:border-[#7C3AED]" />
                    </label>
                    {seqEdit.steps.map((st, i) => (
                      <div key={i} className="border border-[#eee7f7] rounded-xl p-3 mb-2.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <b className="text-[13px]">Step {i + 1}</b>
                          {i > 0 && (
                            <label className="text-[12px] text-[#9b8ec4] flex items-center gap-1">
                              wait
                              <input type="number" min={0} max={60} value={st.wait_days}
                                onChange={e => { const steps = [...seqEdit.steps]; steps[i] = { ...st, wait_days: Number(e.target.value) || 0 }; setSeqEdit({ ...seqEdit, steps }); setSeqQuality(null) }}
                                className="w-14 border border-[#ece5fb] rounded px-1.5 py-0.5 text-[12.5px] outline-none" />
                              days
                            </label>
                          )}
                          {seqEdit.steps.length > 1 && (
                            <button onClick={() => { setSeqEdit({ ...seqEdit, steps: seqEdit.steps.filter((_, n) => n !== i) }); setSeqQuality(null) }}
                              className="ml-auto text-[12px] font-bold text-red-500">Remove</button>
                          )}
                        </div>
                        <input value={st.subject} onChange={e => { const steps = [...seqEdit.steps]; steps[i] = { ...st, subject: e.target.value }; setSeqEdit({ ...seqEdit, steps }); setSeqQuality(null) }}
                          placeholder="Subject line" className="w-full border border-[#ece5fb] rounded-lg px-3 py-2 text-[13.5px] mb-1.5 outline-none focus:border-[#7C3AED]" />
                        <textarea value={st.body} rows={5}
                          onChange={e => { const steps = [...seqEdit.steps]; steps[i] = { ...st, body: e.target.value }; setSeqEdit({ ...seqEdit, steps }); setSeqQuality(null) }}
                          placeholder="Email body. Keep it short and specific. {{first_name}} · {{company}} · {{job_title}} are filled per prospect."
                          className="w-full border border-[#ece5fb] rounded-lg px-3 py-2 text-[13.5px] leading-relaxed outline-none focus:border-[#7C3AED]" />
                      </div>
                    ))}
                    {/* #612/D14/R3 — the cap is MAX_SEQUENCE_STEPS, imported, never typed.
                        This editor once offered a tenth step while activation hard-blocked
                        above seven, so an operator could build a long sequence, save it, and
                        only meet the refusal on going live — a control that invites work the
                        product will reject.
                        ⚠️ CORRECTED 6 Aug: the note here previously said the number HAD to be
                        duplicated because apps/admin cannot import from apps/api, and cited
                        `sequence-cap-agreement.test.ts` as "the only thing making the copy
                        safe". THAT FILE HAS NEVER EXISTED — a safety net claimed in a comment
                        and never built, found by the guard that replaced it. The constant now
                        lives in `@kind/shared`, which all four apps can read, and
                        `website-step-claims.test.ts` fails the build on any hard-coded digit
                        or any step-count claim that disagrees with it. */}
                    {seqEdit.steps.length < MAX_SEQUENCE_STEPS && (
                      <button onClick={() => { setSeqEdit({ ...seqEdit, steps: [...seqEdit.steps, { subject: '', body: '', wait_days: 3 }] }); setSeqQuality(null) }}
                        className="text-[12.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 mb-3">+ Add step</button>
                    )}
                    <div className="flex gap-2">
                      <button onClick={saveSequence} disabled={cockpitBusy || !seqEdit.name.trim()}
                        className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13.5px] font-bold disabled:opacity-40">
                        {cockpitBusy ? 'Saving…' : seqEdit.id ? 'Save changes' : 'Approve & save'}
                      </button>
                      <button onClick={suggestSequence} disabled={cockpitBusy}
                        className="border border-[#e4dcf7] rounded-lg px-3 py-2 text-[13.5px] font-bold text-[#7C3AED] disabled:opacity-50">✨ Redraft</button>
                      <button onClick={() => setSeqEdit(null)} className="border border-[#ece5fb] rounded-lg px-3 py-2 text-[13.5px] font-bold text-[#5c5279]">Cancel</button>
                    </div>
                    <p className="text-[12px] text-[#9b8ec4] mt-2">Nothing sends without the Send gate — saving does not start outreach.</p>
                    {/* #612 — the copy verdict, on the screen where the sequence is approved.
                        Red = cannot go live. Amber = craft, never blocking. A clean pass names
                        what was checked rather than rendering as silence. */}
                    <SequenceQuality quality={seqQuality} />
                  </div>
                ) : seqPreview ? (
                  <div>
                    <button onClick={() => setSeqPreview(null)} className="text-[12.5px] font-bold text-[#7C3AED] mb-2.5">&larr; Back to sequences</button>
                    <b className="text-[14px] block">{seqPreview.name}</b>
                    <span className="block text-[12px] text-[#9b8ec4] mb-3">
                      As {[seqPreview.sample_lead.first_name, seqPreview.sample_lead.last_name].filter(Boolean).join(' ') || 'a prospect'}
                      {seqPreview.sample_lead.company ? ` at ${seqPreview.sample_lead.company}` : ''} will read it
                    </span>
                    {seqPreview.steps.map(s => (
                      <div key={s.step} className="border border-[#eee7f7] rounded-xl p-3 mb-2">
                        <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">Step {s.step} · day {s.day}</span>
                        <b className="text-[13.5px] block mt-0.5 mb-1">{s.subject || '(no subject)'}</b>
                        <p className="text-[12.5px] text-[#4c4368] leading-relaxed whitespace-pre-wrap">{s.body}</p>
                      </div>
                    ))}
                    {/* #612 — the same verdict component as the editor, so the two screens can
                        never disagree about whether this copy may go live. Judged on the RAW
                        template, not on this token-filled render. */}
                    <SequenceQuality quality={seqPreview.quality} />
                  </div>
                ) : (<>
                  {cockpit.sequences.length === 0
                    ? <p className="text-[13.5px] text-[#9b8ec4] text-center py-6">No saved sequence yet — let Vida draft one, then read it before you approve.</p>
                    : cockpit.sequences.map(sq => (
                      <div key={sq.id} className="flex items-center gap-2.5 border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-2">
                        <div className="min-w-0">
                          <b className="text-[13.5px] block truncate">{sq.name}</b>
                          <span className="text-[12px] text-[#9b8ec4]">{Array.isArray(sq.steps) ? sq.steps.length : 0} steps · updated {fmtDate(sq.updated_at)}</span>
                        </div>
                        <div className="ml-auto shrink-0 flex items-center gap-2">
                          <button onClick={() => previewSequence(sq.id)} disabled={cockpitBusy}
                            className="text-[12.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 disabled:opacity-50">Preview</button>
                          <button onClick={() => openSeqEditor({ id: sq.id, name: sq.name, steps: sq.steps })}
                            className="text-[12.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1">Edit</button>
                        </div>
                      </div>
                    ))}
                  <div className="flex gap-2 mt-1">
                    <button onClick={suggestSequence} disabled={cockpitBusy}
                      className="bg-[#7C3AED] text-white rounded-lg px-3.5 py-2 text-[13.5px] font-bold disabled:opacity-60">
                      {cockpitBusy ? 'Drafting…' : '✨ Suggest a sequence'}
                    </button>
                    <button onClick={() => openSeqEditor()} className="border border-[#ece5fb] rounded-lg px-3 py-2 text-[13.5px] font-bold text-[#5c5279]">Write it myself</button>
                  </div>
                  {saveMsg && <p className={`text-[12.5px] font-semibold mt-2 ${noticeClass(saveMsg.tone)}`}>{saveMsg.text}</p>}
                </>)) : null)}

                {/* ── ASKS — V3 we ask, M2 they answer in Milla ── */}
                {tab === 'Asks' && (<>
                  {/* WHAT THEY SAID, UNPROMPTED. Milla's chat cannot pause a campaign or
                      source anyone — it answers and writes a message. This is where those
                      messages surface; before this they went into a table nobody read.
                      Placed FIRST because what a client asked for outranks what we want
                      to ask them. */}
                  {fromClient.length > 0 && (
                    <div className="border-[1.5px] border-[#7C3AED] rounded-xl p-3 mb-3.5 bg-[#faf8ff]">
                      <b className="text-[13.5px] block text-[#1f1235]">They said this to Milla — she can&apos;t action it, you can</b>
                      <span className="block text-[12px] text-[#9b8ec4] mb-2">Last 7 days, newest first. Anything that needs doing needs you.</span>
                      {fromClient.map(m => (
                        <p key={m.id} className="text-[13px] text-[#1f1235] leading-relaxed whitespace-pre-wrap bg-white border border-[#ece5fb] rounded-lg px-2.5 py-2 mb-1.5">
                          <b className="text-[11px] uppercase tracking-wide text-[#9b8ec4] block">{fmtDate(m.at)}</b>
                          {m.content}
                        </p>
                      ))}
                    </div>
                  )}
                  <b className="text-[14px] block">Ask the client</b>
                  <span className="block text-[12px] text-[#9b8ec4] mb-2.5">
                    Lands in their Milla thread — the one place they already talk to us. Their answer comes back here.
                  </span>
                  <form onSubmit={e => { e.preventDefault(); sendAsk(askInput) }} className="mb-3">
                    <textarea value={askInput} onChange={e => setAskInput(e.target.value)} rows={3}
                      placeholder="e.g. Who should the emails be signed by, and what's the best case study we can name?"
                      className="w-full border border-[#ece5fb] rounded-xl px-3 py-2.5 text-[13.5px] leading-relaxed outline-none focus:border-[#7C3AED]" />
                    <button type="submit" disabled={cockpitBusy || !askInput.trim()}
                      className="mt-1.5 bg-[#7C3AED] text-white rounded-lg px-3.5 py-2 text-[13.5px] font-bold disabled:opacity-40">
                      {cockpitBusy ? 'Sending…' : 'Ask them'}
                    </button>
                  </form>
                  {saveMsg && <p className={`text-[12.5px] font-semibold mb-2 ${noticeClass(saveMsg.tone)}`}>{saveMsg.text}</p>}
                  {/* #565's shape: a FAILED load and a genuinely empty one both arrive here as
                      `asks = []`, and only one of them means "nothing asked yet". The failure
                      is checked FIRST and says why, because "nothing to do" is the single most
                      expensive wrong thing this screen can tell an operator. */}
                  {loadFail.asks
                    ? <p className="text-[13.5px] text-red-700 font-semibold py-4">
                        Couldn&apos;t load this client&apos;s asks — {loadFail.asks}. This is NOT &ldquo;nothing asked&rdquo;; it means we could not find out.
                      </p>
                    : asks === null ? <p className="text-[13.5px] text-[#9b8ec4]">Loading…</p>
                    : asks.length === 0 ? <p className="text-[13.5px] text-[#9b8ec4] text-center py-4">Nothing asked yet.</p>
                    : asks.map(a => (
                      <div key={a.id} className="border border-[#eee7f7] rounded-xl p-3 mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">Asked {fmtDate(a.asked_at)}</span>
                          <span className={`ml-auto text-[11px] font-extrabold rounded-full border px-2 py-0.5 ${a.answers.length ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-[#b45309] bg-[#fffbeb] border-[#fcd34d]'}`}>
                            {a.answers.length ? 'answered' : 'waiting'}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#1f1235] leading-relaxed whitespace-pre-wrap">{a.question}</p>
                        {a.answers.map((ans, i) => (
                          <p key={i} className="text-[12.5px] text-[#4c4368] leading-relaxed whitespace-pre-wrap bg-[#faf8ff] border border-[#f2ecfb] rounded-lg px-2.5 py-2 mt-1.5">
                            <b className="text-[11px] uppercase tracking-wide text-[#9b8ec4] block">They said · {fmtDate(ans.at)}</b>
                            {ans.content}
                          </p>
                        ))}
                      </div>
                    ))}
                </>)}

                {/* BOOKINGS */}
                {tab === 'Bookings' && (<>
                  {saveMsg && <p className={`text-[12.5px] font-semibold mb-2 ${noticeClass(saveMsg.tone)}`}>{saveMsg.text}</p>}
                  {(cols?.booked.cards.length ?? 0) === 0
                    ? <p className="text-[13.5px] text-[#9b8ec4] text-center py-8">No meetings booked yet.</p>
                    : cols!.booked.cards.map(c => {
                      const noShow = !!c.no_show_at || c.status === 'no_show'
                      const attemptsLeft = Math.max(0, 2 - (c.rebook_count ?? 0))
                      return (
                        <div key={c.id} className={`border rounded-xl px-3 py-2.5 mb-2 ${noShow ? 'border-amber-300 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/40'}`}>
                          <div className="flex items-center gap-2.5">
                            <div className="min-w-0">
                              <b className="text-[13.5px] block truncate">{fullName(c.first_name, c.last_name)}</b>
                              <span className="text-[12px] text-[#9b8ec4] truncate block">{c.company || '—'}</span>
                              <span className={`text-[12px] font-semibold ${noShow ? 'text-[#92400e]' : 'text-emerald-700'}`}>
                                {noShow ? 'No-show' : ''}{noShow && c.start_time ? ' · ' : ''}
                                {c.start_time ? new Date(c.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'booked'}
                                {(c.rebook_count ?? 0) > 0 && ` · attempt ${(c.rebook_count ?? 0) + 1} of 3`}
                              </span>
                            </div>
                            {c.lead_id && <a href={`/vida/record?lead_id=${encodeURIComponent(c.lead_id)}`} className="ml-auto shrink-0 text-[12.5px] font-bold text-[#7C3AED]">Record &rarr;</a>}
                          </div>
                          {/* Neither of these moves money. A no-show KEEPS the $4 (they were
                              worked); a rebook is goodwill, capped at two, and the second one
                              tells the client with the $4 re-run choice. */}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {!noShow && (
                              <button onClick={() => actBooking(c.id, 'no-show')} disabled={cockpitBusy}
                                className="text-[12.5px] font-bold text-[#92400e] bg-[#fffbeb] border border-[#fcd34d] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                                Mark no-show
                              </button>
                            )}
                            {noShow && attemptsLeft > 0 && (
                              <button onClick={() => { const t = prompt('New agreed time (e.g. 2026-08-04 10:00) — leave blank to just record the retry:'); actBooking(c.id, 'rebook', t?.trim() ? new Date(t.trim().replace(' ', 'T')).toISOString() : undefined) }}
                                disabled={cockpitBusy}
                                className="text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                                Rebook · {attemptsLeft} left
                              </button>
                            )}
                            {noShow && attemptsLeft === 0 && (
                              <span className="text-[12px] text-[#92400e] font-semibold">Two attempts used — the client has been told, with the $4 re-run choice.</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </>)}

                {/* ⚑ 30 Aug (BUILD-003 PR3) — PROGRAMME TRUTH.
                    Every value here is a row that exists or a subtraction of two of them.
                    No health score, no projection, no invented metric: an operator acting on a
                    number we made up is worse off than one acting on nothing. */}
                {tab === 'Programme' && (<>
                  {progErr && <p className="text-[12.5px] font-semibold text-red-600 mb-2">Programme could not be loaded: {progErr}</p>}
                  {/* ⚠️ A DEGRADED READ IS NOT AN EMPTY ONE. Said loudly, because a quiet
                      console reads as "nothing is wrong" — the exact failure this panel exists
                      to end. */}
                  {(prog?.degraded ?? []).map((d, i) => (
                    <p key={i} className="text-[12.5px] font-semibold text-red-600 mb-2">⚠️ {d}</p>
                  ))}

                  {!prog ? <p className="text-[13.5px] text-[#9b8ec4] text-center py-8">Loading…</p>
                   : !prog.programme ? (
                    <p className="text-[13.5px] text-[#9b8ec4] text-center py-8">
                      No programme for this client. They are on the legacy model ($299 pack · 100 included · $4 per approved lead), which is unaffected by programme controls.
                    </p>
                   ) : (<>
                    <div className={`border rounded-xl px-3 py-2.5 mb-3 ${
                      prog.programme.state === 'paused' ? 'border-amber-300 bg-amber-50/60'
                      : prog.programme.state === 'blocked' ? 'border-red-300 bg-red-50/60'
                      : prog.programme.state === 'review_required' ? 'border-amber-300 bg-amber-50/60'
                      : prog.programme.state === 'completed' ? 'border-[#eee7f7] bg-[#faf8ff]'
                      : 'border-emerald-200 bg-emerald-50/40'}`}>
                      <b className="text-[13.5px] block">{prog.programme.state.replace('_', ' ').toUpperCase()}</b>
                      <span className="text-[12px] text-[#6b5f8c]">
                        status {prog.programme.status} · target {prog.programme.meeting_target} meeting(s) · batch size {prog.programme.batch_size}
                      </span>
                      {prog.programme.paused_at && (
                        <p className="text-[12px] text-amber-800 mt-1">
                          Paused {fmtDate(prog.programme.paused_at)}{prog.programme.pause_reason ? ` — ${prog.programme.pause_reason}` : ''}.
                          Pause stops new sourcing AND new sending.
                        </p>
                      )}
                      {prog.programme.review_required_at && !prog.programme.review_resolved_at && (
                        <p className="text-[12px] text-amber-800 mt-1">
                          REVIEW HELD since {fmtDate(prog.programme.review_required_at)} — {prog.programme.review_reason}
                          {' '}This holds the NEXT NEW BATCH only; delivery already in flight continues. The {prog.programme.review_trigger_leads}-lead figure is a planning benchmark, not a guarantee.
                        </p>
                      )}
                    </div>

                    <div className="border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-3">
                      <b className="text-[13px] block mb-1">Delivery against authorised volume</b>
                      <span className="text-[12.5px] text-[#6b5f8c]">
                        {prog.programme.sourced_used} used · {prog.programme.sourced_reserved} reserved · {prog.programme.room_remaining} left of {prog.programme.sourcing_ceiling}
                      </span>
                      <p className="text-[11.5px] text-[#9b8ec4] mt-1">Unused value never expires. Opening more is a human decision.</p>
                    </div>

                    {prog.blockers.length > 0 && (
                      <div className="border border-red-200 bg-red-50/50 rounded-xl px-3 py-2.5 mb-3">
                        <b className="text-[13px] block mb-1">Blockers</b>
                        {prog.blockers.map((b, i) => (
                          <p key={i} className="text-[12.5px] text-red-800 mb-1">· {b.detail}</p>
                        ))}
                      </div>
                    )}

                    <b className="text-[13px] block mb-1">Batches</b>
                    {prog.batches.length === 0
                      ? <p className="text-[12.5px] text-[#9b8ec4] mb-2">No batch has been opened yet.</p>
                      : prog.batches.map(b => (
                        <div key={b.id} className={`flex items-center justify-between border rounded-xl px-3 py-2 mb-1.5 ${
                          b.status === 'stranded' ? 'border-red-300 bg-red-50/60' : 'border-[#eee7f7]'}`}>
                          <span className="text-[12.5px]">
                            <b>#{b.seq}</b> {b.status} · requested {b.requested} · granted {b.granted} · delivered {b.delivered ?? '—'}
                          </span>
                          <span className="text-[11.5px] text-[#9b8ec4]">{b.created_at ? fmtDate(b.created_at) : ''}</span>
                        </div>
                      ))}
                   </>)}
                </>)}

              </div>
            </aside>
          </div>
        </>)}
      </div>
    </div>
  )
}

// ── cockpit presentational helpers (kept local + tiny; no new deps) ────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
