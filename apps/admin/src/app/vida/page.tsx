'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SequenceQuality, { type Quality } from '@/components/SequenceQuality'
import { useVidaConversation } from '@/components/vida/VidaConversation'
// ⚑ 22 Sep — the operator's own claims about a client, built where they can be RUN rather
// than read. See `vida-stage-copy.ts` for why every sentence in it is a pure function.
import {
  stageChips, nextActionCard, workablePoolCard, provenanceCard, operatorRailAt,
} from '@/lib/vida-stage-copy'
import { loadError, panelView, notice, noticeClass, noticeText, vatBadge, PACK_PRICE_USD, MAX_SEQUENCE_STEPS, type Notice } from '@kind/shared'
import { programmeSourcingAction } from '@/lib/programme-sourcing-action'
import { VIDA_SYNC_MS, vidaFacts, sameVidaFacts, vidaChangeLines } from '@/lib/vida-programme-sync'
import { LifecycleRibbon } from '@/components/vida/LifecycleRibbon'
import { LifecyclePanel } from '@/components/vida/LifecyclePanel'
// ⚑ 13 Sep (B2) — the two historical-classification controls, rendered only when the
// server says this client's pre-ledger Proof history still needs a human decision.
import ProofClassificationPanel from '@/components/vida/ProofClassificationPanel'
// ⚑ 13 Sep (R1) — calibration evidence belongs to ONE client: the generation, selection and
// server-identity checks that stop client A's evidence ever acting against client B.
import {
  decideCalibrationResponse, calibrationActionable, CALIBRATION_READ_FAILED_COPY,
} from '@/lib/vida-calibration-isolation'
// ⚑ 13 Sep (BL-1) — a programme belongs to ONE client: the generation, selection and
// server-identity checks that stop client A's programme ever being prepared, frozen, paused,
// authorised or made live while the operator has client B selected.
import {
  decideProgrammeResponse, programmeActionable,
  PROGRAMME_READ_FAILED_COPY, PROGRAMME_MISMATCH_COPY,
} from '@/lib/vida-programme-isolation'
// ⚑ MVP1 (Preview 07) — the brief-in-progress panel for somebody who is not a client yet.
import { BriefPanel } from '@/components/vida/BriefPanel'
import MeetingQualifyPanel from '@/components/vida/MeetingQualifyPanel'   // ⚑ 25 Sep (R141 · P5a)
import { lifecycleCopy, type LifecycleState, type VidaMode, type PanelAction } from '@/lib/vida-lifecycle-copy'


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
type Blockers = { send_gate: number; money_gate: number; unsent_sourced: number; replies_to_triage: number }

// Per-client cockpit (GET /operator/cockpit) — the ICP/campaign/sequence/inbox surfaces.
// ⚑ 30 Aug (BUILD-003 PR3) — 'Programme' added. Everything PR2 built was invisible here:
// status, pause, the review hold, the sourcing ceiling, batches, stranded batches. A control
// nobody can see is not a control.
// ⚑ 30 Aug (BUILD-003 PR4) — 'Pool' and 'Exceptions' added. PR3 built both endpoints and
// rendered NEITHER, so the only way to read them was a raw API call. That is the same defect
// PR3 existed to fix, one level up: a truth nobody can click to is a truth nobody has.
//
// ⚠️ BOTH ARE PLATFORM-WIDE, not per-client, and the panels say so. They live in the cockpit
// tab strip because that is where an operator already is — a separate page would be a second
// place to remember, and the thing that goes unlooked-at is the thing you have to navigate to.
// ⛓️ 16 Sep (MVP1 · A2) — THE TAB LIST AND ITS STAGE RULE MOVED TO ONE TESTED MODULE.
//
// 🛑 WHAT STOOD HERE: a flat eleven-item `COCKPIT_TABS` with no stage gate, plus the SAME
// eleven strings re-typed inline at the render 3,000 lines below. Two hand-typed copies of
// one list — the constant validated URLs, the inline copy drew the strip — so a tab could
// legitimately exist in one and not the other. And because neither was conditional, a
// prospect mid-Proof appeared in Vida with People, Approvals, Campaign and Sequence all
// offering work on a pipeline that does not exist yet.
//
// ⚠️ IMPORTED, NOT RE-EXPORTED. A Next.js page module may only export its component and the
// framework's own fields, so re-exporting the list from here fails the build — the module is
// the home, and this file is one of its readers.
import {
  COCKPIT_TABS, cockpitTabsFor, resolveCockpitTab, isHealthyProof,
  PROOF_TABS_WITHHELD_COPY, type CockpitTab,
} from '@/lib/vida-cockpit-tabs'
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
  // ⚑ 14 Sep (R121, Build 4) — `onboarding` is the CLIENT's eleven-fact Brief progress now,
  // from the one shared counter; `go_live` is OUR eight checks, renamed to what they always
  // were. Two screens used to say "11 of 11" and "88%" about the same client at the same
  // time, each correct about its own thing and neither saying which.
  onboarding: { percent: number; missing: string[]; checks: { key: string; label: string; ok: boolean }[]
    brief: { count: number; total: number } | null
    go_live: { percent: number; missing: string[]; checks: { key: string; label: string; ok: boolean }[] } }
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

// V17 — the bell. Derived live from real rows (GET /operator/alerts).
// ⚑ 17 Sep — `unattributed_reply_id` is carried ONLY by `reply_unattributed` rows, and those
// rows cannot be acted on without it: the two buttons address a retained inbound reply, not a
// client, so a client id alone would be an action with no subject.
type Alert = {
  client_id: string; company_name: string | null; kind: string; label: string
  severity: 'high' | 'normal'
  unattributed_reply_id?: string
}
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
// ⛓️ 24 Sep (R145 step 7 · #64 · #40) — `FLOW_STEPS` AND `flowStepLabel` WERE HERE: the retired
// nine-step strip ("Signed up › Paid $299 › Inbox + people › Client picks › …") across the top
// of the work column, numbered by the RETIRED flow — every programme client sits at its step 1,
// so on the model every client is now on it lit nothing true. Its honesty rules (#619 comped,
// C2 programme, unresolved model) guarded the "Paid" step; with the strip gone there is no
// payment step left to be false. The redesign's operator rail (`OPERATOR_RAIL`, trimmed per
// the 22 Sep option-A ruling) now renders inside the lifecycle panel, lit from the engine stage.
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
  // ⚑ 4 Sep — THE SELECTED CLIENT IS THE SHELL'S, because the conversation is scoped to it.
  // Holding it here meant leaving the console for Bookings or Sending forgot who the operator
  // was working on. Every one of this file's reads of `selected` is unchanged.
  const conversation = useVidaConversation()
  // ⚑ MVP1 — `selectedDraft` is read here for ONE branch (the brief panel) and passed nowhere
  // else. It is never a client id; see `VidaConversation.tsx`.
  const { selected, selectedName, setSelected, selectedDraft } = conversation
  // ⚑ 13 Sep (R1) — `selected`, readable from a promise that resolves after later renders.
  // A closure would capture the selection as it was when the request was ISSUED, which is
  // exactly the value that must NOT decide whether the response may be written.
  const selectedRef = useRef<string | null>(selected ?? null)
  selectedRef.current = selected ?? null
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
  // ⛓️ 4 Sep — `bookRatio` renders beside the client list, which is now in the nav.

  const [board, setBoard] = useState<Board | null>(null)
  const [boardError, setBoardError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [openDrafts, setOpenDrafts] = useState<Set<string>>(new Set())
  const toggleDraft = (id: string) => setOpenDrafts(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const [status, setStatus] = useState<Status | null>(null)
  const [blockers, setBlockers] = useState<Blockers | null>(null)
  // ⛓️ 4 Sep — `cmd`, `cmdLog` and `cmdBusy` MOVED TO THE ONE CONVERSATION
  // (`components/vida/VidaConversation.tsx`). They were the transcript and the composer, and
  // owning them here is what destroyed both on every navigation.

  // Per-client cockpit (ICP · Campaign · Sequence · Inbox) — one admin-key read.
  const [tab, setTab] = useState<CockpitTab>('Inbox')
  // ⚑ 9 Sep — THE ELEVEN TABS ARE NO LONGER THE WORKSPACE. They are client TOOLS, closed by
  // default and opened deliberately; the lifecycle panel above them is the Clients experience.
  const [toolsOpen, setToolsOpen] = useState(false)
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
      /**
       * ⚑ 13 Sep (BL-1) — WHOSE PROGRAMME THIS IS. The server has always sent it
       * (`operator-programme.ts`'s `PROGRAMME_COLUMNS` begins `'id, client_id, …'`); this type
       * did not declare it, so nothing ever compared the programme's owner to the selected
       * client — and a late response for another client could be read, and ACTED ON, as if it
       * were theirs. Optional, because an older API against this UI must fail CLOSED
       * (`programmeActionable` refuses without it) rather than acting on an unprovable owner.
       */
      client_id?: string | null
      id: string; status: string; state: string; meeting_target: number
      sourcing_ceiling: number; sourced_used: number; sourced_reserved: number; room_remaining: number
      /**
       * ⚑ 16 Sep (MVP1 · E1) — the server's completion verdict and its refusal sentence.
       * Optional so an older API reads as "no control" rather than offering a terminal action
       * on an unprovable verdict.
       */
      may_complete?: boolean
      complete_blocked_reason?: string | null
      /** ⚑ 23 Sep (Stage 6 · R136 ④) — meetings attributed to this programme; null = unreadable. */
      meetings_booked?: number | null
      /** ⚑ 23 Sep (Stage 6 · R136 ④) — set once the programme has been settled. */
      settlement?: { settled_at: string; delivered_meetings: number | null; credit_cents: number } | null
      paused_at: string | null; pause_reason: string | null
      approved_at: string | null; second_paid_at: string | null
      review_required_at: string | null; review_reason: string | null; review_resolved_at: string | null
      review_trigger_leads: number; batch_size: number
      // ⚑ PR A2 — the seven fields the lifecycle controls need. `first_authorised_at` and
      // `second_authorised_at` are what let this screen say "internal authority" instead of
      // "paid", which for House is the difference between a true sentence and a false one.
      recommended_volume: number
      first_paid_at: string | null; first_payment_ref: string | null
      second_payment_ref: string | null; went_live_at: string | null
      first_authorised_at: string | null; second_authorised_at: string | null
    }
    batches: { id: string; seq: number; status: string; requested: number; granted: number; delivered: number | null; created_at: string | null }[]
    stranded: { id: string; seq: number }[]
    blockers: { kind: string; detail: string }[]
    degraded: string[]
    // ⚑ PR A2 — which targeting feeds this programme. `unreadable` is carried rather than
    // collapsed: an empty list because the read failed must not render as "no ICPs".
    icps?: {
      attached: { id: string; name: string | null; is_active: boolean }[]
      eligible: { id: string; name: string | null; is_active: boolean }[]
      unreadable: boolean
    }
    // ⚑ 3 Sep (C2) — WHICH COMMERCIAL MODEL GOVERNS THIS CLIENT. `stored` is what the column
    // holds (null = unclassified, 'unknown' = the row would not read); `resolved` is what the
    // product will actually do. They differ on purpose: an unclassified client with a
    // programme open resolves as programme WITHOUT anybody having declared it, and an
    // operator who cannot see that difference cannot fix it.
    commercial?: {
      stored: 'programme' | 'legacy' | null | 'unknown'
      resolved: 'programme' | 'legacy' | 'compat_programme' | 'compat_legacy' | 'unreadable'
      declared: boolean
      label: string
      reason: string | null
    }
    // ⚑ 8 Sep (HOUSE-009) — MAY THE ONE-TIME SOURCING RECONCILIATION BE OFFERED?
    //
    // 🛑 THE SERVER DECIDES; THIS SCREEN ONLY RENDERS. It turns on `HOUSE_LAUNCH_PROGRAMME_ID`
    // and a House audience proved from the AUTH USER — neither of which a browser holds, and
    // neither of which it should. `available` is read as a boolean and never re-derived here
    // from the programme id, the client, a name or a status: a check this file could compute
    // is a check anybody with the console open could satisfy.
    reconcile?: { available: boolean; unaccounted: number; reason: string | null }
    // ⚑ 9 Sep (HOUSE-009) — MAY THE PROGRAMME BE HANDED TO THE CLIENT YET?
    //
    // 🛑 THE SERVER'S ANSWER, FROM THE SAME RULE THE TRANSITION ITSELF IS GATED BY
    // (`programmePreparationReadiness`). Thirteen conditions — batch, reviewable QUALIFIED and
    // surfaced prospects, campaign, sequence, message steps, cadence, send schedule, sender,
    // eligible enrolments, no foreign enrolments, attached ICP, a freezable snapshot — none of
    // which a browser can see, and all of which it would have to re-derive to answer this
    // locally. Optional, so an older API against this UI hides the control rather than
    // offering it: the fail-closed direction.
    readiness?: { ready: boolean; preparable?: boolean; blockers?: { code: string; detail: string }[] }
    // ⚑ 9 Sep — the background preparation's two facts. `preparing` hides the control while a
    // run is in flight; `last_preparation` is the audited outcome of the most recent run, which
    // is the ONLY record of an attempt whose HTTP response was lost at an edge.
    preparing?: boolean
    // ⚑ 9 Sep — the two SEND switches, from the server. Make Live is not sending, and this
    // screen must never imply it is.
    send_controls?: { auto_outreach_enabled: boolean; operator_run_enabled: boolean }
    // ⚑ 9 Sep — WHERE THIS CLIENT IS, AND WHETHER THE OPERATOR IS NEEDED.
    //
    // 🛑 A VERDICT, NOT INGREDIENTS. `deriveLifecycle` decided this on the server from facts a
    // browser does not hold — readiness, preparation history, programme-scoped sends and
    // replies, sender health and both send switches. Re-deriving any of it here would be a
    // second opinion about whether there is work to do, and the copy beside it would be
    // arguing with the filter in the nav.
    lifecycle?: {
      verdict: {
        stage: string; stageIndex: number; stageLabel: string
        state: LifecycleState; mode: VidaMode
        needsYou: boolean; needsYouReason: string | null
      }
      counts: {
        sourced: number; qualified: number; rejected: number; stillToCheck: number
        enrolled: number; sends: number; replies: number; positive: number; meetings: number
        repliesAwaitingDecision: number
      }
      programme: null | {
        id: string; status: string; meetingTarget: number | null
        entitlementUsed: number; entitlementTotal: number; entitlementRemaining: number
      }
      replyAwaiting: { id: string; name: string | null; company: string | null } | null
      humanBlockers: { code: string; detail: string }[]
      stoppedDetail: string | null
      /**
       * ⚑ 16 Sep (MVP1 · A1b) — the gate's own grouped reasons for an empty Proof set.
       * Present only for a `proof_exception` client; `null` otherwise and also when the
       * evidence could not be read — the task stands either way.
       */
      proofException?: { sourced: number; setAside: number; reasons: Record<string, number> } | null
      senderSendable: boolean
      /** ⚑ 10 Sep (I2) — the send gate's own reason, so the panel stops sending every sender
       *  failure to "reconnect the mailbox" when three of the four have a different remedy. */
      senderDetail?: string | null
      /** ⚑ 11 Sep (DAY 3 HOLD) — the persisted frozen review package, the same one Milla reads.
       *  `null` means there is no package, never "the package is fine". */
      frozenPackage?: {
        version: number | null; at: string | null; prospects: number
        messages: number; target: number | null; sender: string | null
        /** ⚑ 18 Sep (J13-C1) — how many of the package we may actually email. `null` means a
         *  v2 freeze that predates the field; it never means nobody is reachable. */
        sendable?: number | null
      } | null
      /** ⚑ 18 Sep (J12-C4 · PV 09 B) — whether the lead source can source at all, read
       *  globally. `unknown` is the queue read failing, and is NOT "capacity is fine". */
      providerCapacity?: { blocked: boolean; detail: string | null; unknown: boolean } | null
      killSwitchOff: boolean
      operatorRunEnabled: boolean
      /** ⚑ MVP1 (C03) — what the client said they want, in their own words, or null.
       *  The copy module has rendered this in three places since it was written; until now
       *  nothing supplied it, so every client read "Being agreed". It is NOT the meeting
       *  target: that is agreed later, at Programme, and the two are different facts. */
      outcomeStated?: string | null
    } | null
    last_preparation?: {
      at: string; ok: boolean; by: string | null; detail: string
      blockers: { code: string; detail: string }[]
      // ⚑ 9 Sep — counts, never lead ids. The ids stay in the audit row.
      attempted?: number | null; enrolled?: number | null
      already_enrolled?: number | null; failed?: number | null
    } | null
  }
  const [prog, setProg] = useState<ProgrammeTruth | null>(null)
  const [progErr, setProgErr] = useState<string | null>(null)
  // ── 🛑 ⚑ 13 Sep (BL-1) — A PROGRAMME BELONGS TO ONE CLIENT ──────────────────────────
  //
  // ⛓️ WHAT STOOD HERE: ~~`setProg(j.data as ProgrammeTruth)`~~ — unguarded. A slow read for
  // client A could land AFTER the operator selected B and write A's programme into B's view,
  // while `qualifySourcedLeads`, `pauseProgramme`, `refreezePackage`, `lifecycle` and
  // `attachIcp` all target `prog.programme.id` and the server scopes them by programme id
  // alone. That is "read A → press → prepare/freeze/pause/authorise/make-live B's screen,
  // A's programme", on the money surface.
  //
  // 🛑 A RESET ALONE WOULD NOT HAVE FIXED IT. The switch effect below already cleared `prog`;
  // the late A response still arrives afterwards and writes itself into the now-empty B view.
  // `decideProgrammeResponse` asks all three — GENERATION (is this request still the current
  // one), SELECTION (was it issued for the client we are on), IDENTITY (does the SERVER say
  // this programme is theirs) — and the press asks a fourth (`programmeActionable`).
  //
  // ⚠️ THE GENERATION LIVES IN A REF, not state: it must be readable by a promise that
  // resolves long after the render it was issued from, and bumping it must not re-render.
  const progGen = useRef(0)
  const loadProgramme = useCallback(async (clientId: string) => {
    const generation = progGen.current
    // ⚠️ ONLY THE CURRENT CLIENT'S REQUEST MAY CLEAR THE CURRENT CLIENT'S ERROR. A follow-up
    // read for A, fired by an action that legitimately completed for A after the operator
    // moved to B, would otherwise wipe a genuine B error off the screen on its way to being
    // discarded.
    if (selectedRef.current === clientId) setProgErr(null)
    // ⚠️ ONE DECISION, BOTH PATHS. The catch runs the SAME function with `apiSuccess: false`,
    // so a thrown read is stale-silent or current-and-truthful by exactly the rule above —
    // never by a second, slightly different copy of it written into the error handler.
    const decide = (apiSuccess: boolean, apiError: string | null, programme: { client_id?: string | null } | null) =>
      decideProgrammeResponse({
        requestedClientId: clientId,
        selectedClientId:  selectedRef.current,
        requestGeneration: generation,
        currentGeneration: progGen.current,
        apiSuccess, apiError, programme,
      })
    try {
      const j = await fetch(`/api/proxy/operator/programme?client_id=${encodeURIComponent(clientId)}`).then(r => r.json())
      const payload = (j?.data ?? null) as ProgrammeTruth | null
      const outcome = decide(
        j?.success === true,
        typeof j?.error === 'string' ? j.error : null,
        payload?.programme ?? null,
      )
      // ⚠️ A DISCARD IS SILENT AND CHANGES NOTHING — a response for a client we have left is
      // not a failure, it is simply not ours, and printing its error under the current client
      // is exactly what the stale-request rule forbids.
      if (outcome.action === 'discard') return
      // ⚠️ A FAILURE IS CURRENT AND OURS: clear the programme and SAY SO. This covers the API's
      // own refusal, a programme with no owner, and one the server attributes to somebody else.
      // Clearing is what makes every action unavailable — `programmeActionable(null, …)` is
      // false — so an unreadable or unowned state offers no control at all.
      if (outcome.action === 'fail') {
        setProg(null)
        setProgErr(outcome.message ?? PROGRAMME_READ_FAILED_COPY)
        return
      }
      setProg(payload)
    } catch (e) {
      const outcome = decide(false, e instanceof Error ? e.message : null, null)
      if (outcome.action === 'discard') return
      setProg(null)
      setProgErr(outcome.message ?? PROGRAMME_READ_FAILED_COPY)
    }
  }, [])

  // ── ⚑ 25 Sep (R161) — VIDA HEARS WHAT HAPPENED IN MILLA, WITHOUT A REFRESH ───────────────
  // While a client is open, re-read their programme every VIDA_SYNC_MS and on return to the tab.
  // If it moved — an approval, a payment, a pause — reload the panel and say what moved in Vida's
  // chat. The operator's own presses already re-read the programme first, so they are never
  // announced back. Read-only: it grants, charges and sends nothing.
  const progRef = useRef<ProgrammeTruth | null>(null)
  useEffect(() => { progRef.current = prog }, [prog])
  const syncSay = useRef(conversation.say)
  useEffect(() => { syncSay.current = conversation.say }, [conversation.say])
  const syncClients = useRef(clients)
  useEffect(() => { syncClients.current = clients }, [clients])
  useEffect(() => {
    const clientId = selected
    if (!clientId) return
    let stopped = false
    const check = async () => {
      try {
        const j = await fetch(`/api/proxy/operator/programme?client_id=${encodeURIComponent(clientId)}`).then(r => r.json())
        if (stopped || selectedRef.current !== clientId || j?.success !== true) return
        const next = ((j?.data ?? null) as ProgrammeTruth | null)?.programme ?? null
        if (!next || next.client_id !== clientId) return
        const shown = progRef.current?.programme ?? null
        if (!shown || shown.client_id !== clientId) return
        // P1/P2 "in place" = paid or internally authorised, resolved HERE (this page is on the
        // internal-authority allowlist); the sync module only compares what it is handed.
        const source = (x: NonNullable<ProgrammeTruth['programme']>) => ({
          status: x.status, approved_at: x.approved_at, paused_at: x.paused_at, went_live_at: x.went_live_at,
          first_at: x.first_paid_at ?? x.first_authorised_at, second_at: x.second_paid_at ?? x.second_authorised_at,
        })
        const before = vidaFacts(source(shown)), after = vidaFacts(source(next))
        if (!before || !after || sameVidaFacts(before, after)) return
        await loadProgramme(clientId)
        const name = (syncClients.current ?? []).find(c => c.id === clientId)?.company_name ?? 'The client'
        for (const line of vidaChangeLines(before, after, name)) syncSay.current('vida', line)
      } catch { /* the next tick tries again */ }
    }
    const t = setInterval(() => { void check() }, VIDA_SYNC_MS)
    const onReturn = () => { if (document.visibilityState === 'visible') void check() }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      stopped = true
      clearInterval(t)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [selected, loadProgramme])

  /**
   * 🛑 THE ONE GATE EVERY PROGRAMME-ID ACTION PASSES, AT THE PRESS. (BL-1.)
   *
   * Returns the programme id ONLY when the loaded programme provably belongs to the client the
   * operator has selected RIGHT NOW — and `null` otherwise, which every caller treats as "do
   * not fire, do not confirm, say why".
   *
   * ⚠️ IT IS CALLED BEFORE THE CONFIRMATION DIALOG, NEVER AFTER. A dialog naming client B over
   * client A's programme is the misleading half of this defect: refusing after the operator
   * has already agreed would still have shown them a sentence that was not true.
   */
  const programmeActionId = useCallback((): string | null => {
    const p = prog?.programme ?? null
    return programmeActionable(p, selected ?? null) ? (p!.id as string) : null
  }, [prog, selected])

  /**
   * ⚑ 13 Sep (BL-1) — A WRITER THAT BELONGS TO ONE CLIENT.
   *
   * An action authorised while A was selected may legitimately finish for A after the operator
   * has moved to B — that is correct, and cancelling it would be worse. What must NOT happen is
   * its outcome landing on B's screen: "12 qualified · prepared and now with the client" beside
   * client B, describing work done for client A, is a false sentence about somebody's account.
   *
   * ⚠️ THE GENERATION IS CAPTURED AT THE PRESS, so this needs no cancellation, no abort
   * controller and no second source of truth — it is the same counter the read guard uses.
   */
  const forThisProgramme = useCallback(<T,>(write: (v: T) => void): ((v: T) => void) => {
    const gen = progGen.current
    return v => { if (progGen.current === gen) write(v) }
  }, [])

  // ── ⚑ 9 Sep (HOUSE-009) · QUALIFY SOURCED LEADS ────────────────────────────────────────
  //
  // 🛑 WHAT THE OPERATOR IS ASKED TO UNDERSTAND: nothing. Leads were sourced; do they match the
  // targeting or not? That is the whole question. `delivered_at`, reconciliation, batches,
  // reserved-versus-granted and which provider answered are all real, all load-bearing, and
  // none of them belong on a button. This control replaces "Account for delivered sourcing",
  // which named an internal repair rather than the work.
  //
  // ⚠️ IT IS A TRIGGER AND A READOUT, AND NOTHING ELSE. Every verdict, every counter and every
  // surfacing decision happens inside `qualifyAndSettleBatch` on the server. This file writes
  // no verdict, moves no counter and surfaces nobody — it posts once and renders what came back.
  //
  // ⚠️ SINGLE-FLIGHT. `qualBusy` is set before the request and cleared only in `finally`, and
  // both buttons are disabled on it. The action is idempotent by construction — a retry skips
  // every verdict already written — but "the database would survive it" is not the same as "the
  // screen may fire it twice", and a second press could pay for a second reveal.
  //
  // ⚠️ IT NEVER TOUCHES THE DISPLAYED COUNTERS. On success it re-reads programme truth from the
  // API; on failure it changes nothing at all. Patching `used`/`left` locally would show the
  // number this screen expected rather than the one the database holds — which is exactly the
  // false green the whole HOUSE-009 arc exists to remove.
  const [qualBusy, setQualBusy] = useState(false)
  const [qualMsg, setQualMsg] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null)
  /** Open ⟺ the confirmation is on screen. Nothing has been posted while this is true. */
  const [qualConfirm, setQualConfirm] = useState(false)

  // ⛓️ 9 Sep — THE FOUNDER-APPROVED COPY, IN ONE CONSTANT SO "UNCHANGED" IS CHECKABLE.
  //
  // The previous dialog listed three WILLs and nine WILL NOTs. That list was true and it was
  // also the wrong shape: an operator reading nine denials is being asked to audit the system
  // rather than to answer a question. One short paragraph says what happens and names the two
  // things that do not.
  const QUALIFY_CONFIRM = {
    question: (n: number) => `Qualify these ${n} sourced leads?`,
    body: 'Vida will check the existing sourced leads against the attached ICP. Only leads that '
      + 'qualify will count against the programme and move forward for review. No new leads will '
      + 'be sourced and nothing will be sent.',
  }

  /**
   * Open the confirmation. **This posts nothing** — it is the only thing the button does.
   *
   * ⚠️ THE SINGLE-FLIGHT GUARD IS HERE TOO, not only on the confirmed action: a dialog opened
   * while a request is in flight is a second press waiting to happen.
   */
  const openQualifyConfirm = useCallback(() => {
    // 🛑 ⚑ 13 Sep (BL-1) — OWNERSHIP BEFORE THE CONFIRMATION, not after it. This control opens
    // a dialog that names the SELECTED client over a programme that may be somebody else's;
    // refusing at the post would still have shown the operator a sentence that was not true.
    if (qualBusy) return
    if (!programmeActionId()) { setQualMsg({ tone: 'error', text: PROGRAMME_MISMATCH_COPY }); return }
    setQualConfirm(true)
  }, [programmeActionId, qualBusy])

  const qualifySourcedLeads = useCallback(async () => {
    // The EXACT id of the programme already loaded on screen. Never typed, never chosen, never
    // resolved from the client — and the endpoint refuses anything that is not a uuid anyway.
    // ⚑ 13 Sep (BL-1) — AND PROVED TO BE THE SELECTED CLIENT'S, at the press. The selection can
    // change between the dialog opening and this confirm; the server scopes `qualify-batch` by
    // programme id alone, so this is the only place that can see it.
    const id = programmeActionId()
    if (!id) { setQualConfirm(false); setQualMsg({ tone: 'error', text: PROGRAMME_MISMATCH_COPY }); return }
    if (qualBusy) return
    setQualConfirm(false)
    // ⚑ 13 Sep (BL-1) — everything this call learns belongs to the client it was pressed for.
    const say = forThisProgramme(setQualMsg)
    // ── 🛑 ⚑ 13 Sep (BL-1 residual) — THE BUSY FLAG IS SETTLED BY ITS OWN CLIENT ONLY ──
    //
    // ⛓️ WHAT STOOD HERE: ~~`finally { setQualBusy(false) }`~~ — unconditional, and that is a race the
    // generation guards above do NOT cover. They stop a stale response being READ; they say
    // nothing about a stale finalizer WRITING. The sequence is:
    //
    //   A's action starts and sets busy → operator switches to B (the switch clears busy) →
    //   B starts its own action and IS busy → A's old finalizer runs → B's busy is cleared.
    //
    // 🛑 FOR QUALIFICATION THAT DEFEATS THE SINGLE-FLIGHT GUARD. `if (qualBusy) return` is the
    // only thing stopping a second qualification while the first is in flight, so a stale A
    // completion clearing B's flag re-opens the button on a request that has not come back.
    const settleBusy = forThisProgramme(setQualBusy)

    setQualBusy(true); setQualMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/programme/${encodeURIComponent(id)}/qualify-batch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      }).then(r => r.json())

      if (!j?.success) {
        // 🛑 A PARTIAL RUN IS NOT A FAILURE AND IT IS NOT A SUCCESS. The API refuses to settle
        // while any candidate is unjudged and hands back what it managed (`partial`). Painting
        // that green would be the exact lie this arc exists to remove; painting it as a plain
        // error would hide that the work is half done and safe to resume.
        const partial = j?.partial as { still_unjudged?: number; provider_failed?: boolean } | undefined
        if (partial && (Number(partial.still_unjudged ?? 0) > 0 || partial.provider_failed)) {
          say({ tone: 'warn', text:
            `Qualification paused. ${Number(partial.still_unjudged ?? 0)} leads still need checking. Nothing was settled.` })
          // The verdicts already written are real, so the programme is re-read: what is on
          // screen after this is the database's answer, not this screen's guess.
          if (selected) await loadProgramme(selected)
          return
        }
        // ⚠️ THE API'S OWN SENTENCE, VERBATIM. It is the one that knows what was refused — a
        // cheerful summary here is how a screen starts lying. And nothing is retried: an action
        // that refused for a reason must not be fired again by the thing that reported it.
        say({ tone: 'error', text: j?.error ?? 'The qualification did not complete, and no reason came back. Nothing was settled as far as this screen can tell — read the programme before trying again.' })
        return
      }

      // 🛑 EVERY NUMBER HERE COMES FROM THE RESPONSE. None is derived, defaulted or carried over
      // from what this screen expected — `used` in particular is read back from the programme
      // row by the server, never computed from `qualified`.
      // ⚑ 9 Sep — THE SETTLED BATCH'S TOTALS, NOT THIS RUN'S TALLY.
      //
      // 🛑 THE NUMBER THE FOUNDER WAS MISLED BY. `qualified` / `disqualified` come from
      // `QualifyOutcome` and count the verdicts THIS CALL wrote; a candidate an earlier partial
      // run already judged is counted in `already_judged` and in neither. So the House screen
      // read "176 qualified" beside "246 used" — two correct numbers, two populations, one word.
      // `batch_qualified` / `batch_rejected` are read back from `programme_batches` by the API
      // and are the ATTEMPT's totals, which is what "this batch" means to an operator.
      //
      // ⚠️ THE FALLBACK IS THE RUN'S OWN COUNT, NOT ZERO. `?? d.qualified` keeps an older API
      // truthful rather than reporting nothing qualified; `?? 0` there would invent a claim.
      const d = (j.data ?? {}) as {
        qualified?: number; disqualified?: number; used?: number | null
        batch_qualified?: number | null; batch_rejected?: number | null
        status_after?: string
        continued?: { reviewable?: boolean; blockers?: { code: string; detail: string }[]; detail?: string }
      }
      const settledQualified = d.batch_qualified ?? d.qualified ?? 0
      const settledRejected = d.batch_rejected ?? d.disqualified ?? 0
      const settled = `${settledQualified} qualified · ${settledRejected} rejected · ${d.used ?? 0} used`

      // ⚑ 9 Sep — SETTLING IS NO LONGER THE END OF THIS ACTION. The programme now carries on to
      // preparation automatically, inside this same call, so the screen reports what actually
      // happened rather than the old "batch ready for review" — which would now be a guess
      // about a step that has already either succeeded or been blocked.
      //
      // 🛑 A BLOCKED CONTINUATION IS AMBER, NEVER GREEN. The accounting is correct and the
      // work is safe, and the programme did NOT reach the client. Painting that as success is
      // how an operator stops looking. The API's own sentence names the blocker — a missing
      // mailbox is something to go and connect, not something to press again.
      if (d.continued && d.continued.reviewable === false) {
        say({ tone: 'warn', text:
          `${settled}. Settled and safe, but this programme did not reach the client: ${d.continued.detail ?? 'the reason did not come back.'}` })
      } else {
        say({ tone: 'ok', text:
          `${settled} · ${d.status_after === 'READY_FOR_APPROVAL'
            ? 'prepared and now with the client to approve'
            : 'batch ready for review'}` })
      }
      // Re-read rather than patching: the row is the truth, and the control's own visibility is
      // recomputed by the server from the state that now exists.
      if (selected) await loadProgramme(selected)
    } catch (e) {
      say({ tone: 'error', text: e instanceof Error ? e.message : 'The request did not complete. Read the programme before trying again — do not press this twice.' })
    } finally { settleBusy(false) }
  }, [programmeActionId, forThisProgramme, qualBusy, selected, loadProgramme])

  // ── ⚑ 3 Sep (C2) · DECLARING THE COMMERCIAL MODEL ──────────────────────────────────────
  //
  // 🛑 BY CLIENT ID, WITH THE CLIENT NAMED BACK. The id comes from the client already selected
  // in the picker — there is no place to type a company name here, because a name matches two
  // accounts often enough that "set MBF to programme" is not a safe instruction. The
  // confirmation reads the name and the target model back so the operator is agreeing to a
  // specific account, not to a button.
  //
  // ⚠️ RELOAD, NEVER PATCH LOCAL STATE. The server re-resolves after the write and may return
  // something other than what was asked for — a declared model, but also a conflict. Patching
  // `prog.commercial` from the request would show the operator the change they intended
  // instead of the state they created.
  const [cmBusy, setCmBusy] = useState(false)
  const [cmMsg, setCmMsg] = useState<string | null>(null)
  // ⚑ 23 Sep (R137) — 'programme' is the only target the API accepts now. Founder: *"the 299/4
  // is retired/ this must go."* ⛓️ WAS: 'programme' | 'legacy' | null, with Set legacy and
  // Unclassify buttons below; both are gone because the route refuses them (400).
  const setCommercialModel = useCallback(async (clientId: string, name: string, model: 'programme') => {
    const target = model.toUpperCase()
    if (!window.confirm(
      `Set the commercial model for ${name} to ${target}?\n\n`
      + 'This records on the account that the programme governs it — which it already does, '
      + 'since the per-lead model is retired. It moves no money and sends nothing.',
    )) return
    setCmBusy(true); setCmMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/clients/${encodeURIComponent(clientId)}/commercial-model`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Failed to set the commercial model')
      setCmMsg(`${name} is now: ${j.data?.label ?? target}`)
      await loadProgramme(clientId)
    } catch (e) {
      setCmMsg(e instanceof Error ? e.message : 'Failed to set the commercial model')
    } finally { setCmBusy(false) }
  }, [loadProgramme])

  // ── ⚑ PR A2 · THE PROGRAMME LIFECYCLE CONTROLS ─────────────────────────────────────────
  //
  // 🛑 EVERY BUTTON HERE IS A CONVENIENCE, NEVER THE GATE. Each one posts to a route that
  // re-decides the whole question from the row: a route is callable without the screen that
  // hides its button, so a UI-only rule is not a rule. `lcCan` decides what to SHOW; the
  // backend decides what may HAPPEN, and the two are allowed to disagree — the backend wins.
  const [lcMeetings, setLcMeetings] = useState('')
  const [lcBusy, setLcBusy] = useState<string | null>(null)
  const [lcMsg, setLcMsg] = useState<string | null>(null)

  function lcCan(action: string): boolean {
    const p = prog?.programme
    if (!p) return action === 'create'
    if (p.paused_at) return false
    const p2 = Boolean((p.second_paid_at && p.second_payment_ref) || p.second_authorised_at)
    switch (action) {
      case 'recommend':            return p.status === 'DRAFT'
      case 'await-first-payment':  return p.status === 'RECOMMENDED'
      case 'authorise/first':      return p.status === 'AWAITING_FIRST_PAYMENT'
      // ⚑ 9 Sep (HOUSE-009) — STATUS IS NECESSARY AND IT WAS NEVER SUFFICIENT.
      //
      // 🛑 THE LOCKED LIFECYCLE IS SOURCE → QUALIFY → PREPARE → FREEZE → READY FOR APPROVAL.
      // Tested on status alone, this button was drawn ACTIVE above `Qualify sourced leads` on a
      // programme with 246 unjudged candidates and nothing prepared — the last step of the
      // lifecycle offered as though it were the first. The route always refused; a control that
      // teaches the order only by being pressed teaches it too late.
      //
      // ⚠️ THE SERVER'S BOOLEAN, NOT A RULE RE-DERIVED HERE. `readiness.ready` is
      // `programmePreparationReadiness` — the same rule `markReadyForApproval` is gated by — so
      // the screen and the route cannot disagree. `=== true` because absent is not ready: an
      // older API, a failed read or a field this UI has not been given must HIDE the action.
      //
      // ⛓️ 9 Sep — AND `ready` ALONE MADE THE CONTROL UNREACHABLE. Readiness needs a campaign,
      // sequence, schedule and enrolments; those are made by PREPARATION; and preparation is
      // what this button now runs. Requiring `ready` to SHOW it meant the only way to reach the
      // state that revealed the control was to press the control — a gate nothing could ever
      // satisfy, on the House programme most of all.
      //
      // ⚠️ `preparable` IS STILL THE SERVER'S BOOLEAN, and it is strictly narrower than "nearly
      // ready": it is true only when EVERY outstanding blocker is one preparation clears. A
      // missing sender, a missing batch, an unqualified desk — none of those are on that list,
      // so the button stays hidden for them, which is what #1657 was actually protecting.
      //
      // ⛓️ 9 Sep — AND NEVER WHILE A RUN IS IN FLIGHT. The founder's first press may still be
      // running in the API when the screen comes back; a second press would be answered
      // "already running" by the route, but the honest thing is not to draw the button at all.
      case 'ready-for-approval':   return (p.status === 'SOURCING_AUTHORISED' || p.status === 'SOURCING')
                                          && prog?.preparing !== true
                                          && (prog?.readiness?.ready === true || prog?.readiness?.preparable === true)
      case 'authorise/second':     return p.status === 'APPROVED' && !p2
      case 'go-live':              return p.status === 'APPROVED' && p2
      // 🛑 THERE IS NO 'approve'. The one programme approval belongs to the CLIENT, in Milla.
      // Vida deliberately stops at READY_FOR_APPROVAL — an operator approving on the client's
      // behalf is not the client approving, however convenient the button would be.
      default: return false
    }
  }

  /** ICPs may only be attached before the client review — after that the work under review would change. */
  function lcCanAttachIcp(): boolean {
    const p = prog?.programme
    if (!p || p.paused_at) return false
    return ['DRAFT', 'RECOMMENDED', 'AWAITING_FIRST_PAYMENT', 'SOURCING_AUTHORISED', 'SOURCING'].includes(p.status)
  }

  // ── ⚑ 9 Sep · RUN — THE ONLY DELIBERATE WAY REAL MAIL LEAVES ─────────────────────────
  //
  // 🛑 MAKE LIVE ARMS; RUN SENDS. The route this calls needs `FIGSY_OPERATOR_SEND_ENABLED` on
  // the API, names EXACTLY ONE client, and takes an explicit ceiling — which is what makes a
  // canary a canary rather than a book-wide send. It existed and Vida never called it, so the
  // Thursday walk had no console path at all.
  //
  // ⚠️ THE CEILING IS TYPED, NEVER DEFAULTED. A pre-filled number is a number nobody chose.
  const [runBusy, setRunBusy] = useState(false)
  const [runMsg, setRunMsg] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(null)
  const [runMax, setRunMax] = useState('')

  // ⚑ 9 Sep — THE CEILING IS A PARAMETER NOW, because two surfaces type it: the lifecycle
  // panel's own field and the programme tool below. Both must reach the SAME guard, the same
  // confirmation and the same route — a second run implementation is a second set of rules
  // about what leaves the building.
  const runOnceWith = useCallback(async (ceiling: number) => {
    const client = (clients ?? []).find(c => c.id === selected)
    const who = client?.company_name ?? 'this client'
    const n = ceiling
    if (!Number.isInteger(n) || n < 1) {
      setRunMsg({ tone: 'error', text: 'Enter the most emails this run may send — a whole number of 1 or more. Nothing was sent.' })
      return
    }
    // 🛑 THE CONFIRMATION SAYS WHAT LEAVES THE BUILDING, and names the ceiling back.
    if (!confirm(`Send up to ${n} real email${n === 1 ? '' : 's'} for ${who}?\n\nThese go to REAL prospects from ${who}'s own mailbox, on the approved sequence.\n\nThis is the only action that sends. It stops at ${n}.`)) return
    setRunBusy(true); setRunMsg(null)
    try {
      const j = await fetch('/api/proxy/operator/send-due/run-once', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: selected, max_sends: n }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The run did not complete.')
      const d = (j.data ?? {}) as { sent?: number; attempted?: number; failed?: number }
      // ⚠️ THE SERVER'S NUMBERS. A run that attempted and sent nothing is not a success story,
      // so zero is reported as zero rather than as "done".
      const sent = d.sent ?? 0
      setRunMsg({
        tone: sent > 0 ? 'ok' : 'warn',
        text: `${sent} sent of ${d.attempted ?? 0} attempted${d.failed ? ` · ${d.failed} failed` : ''} (ceiling ${n}).` +
          (sent === 0 ? ' Nothing left the building — check the sender, the schedule and the kill-switch.' : ''),
      })
      if (selected) await loadProgramme(selected)
    } catch (e) {
      setRunMsg({ tone: 'error', text: e instanceof Error ? e.message : 'The run did not complete. Read the client before trying again.' })
    } finally { setRunBusy(false) }
  }, [selected, clients, loadProgramme])

  /** The programme tool's own button, which types its ceiling into `runMax`. */
  const runOnce = useCallback(() => runOnceWith(Number(runMax.trim())), [runOnceWith, runMax])

  /**
   * Stop this programme's outreach without unwinding anything.
   *
   * ⚠️ ITS OWN CONFIRMATION, because pausing is the one control on the sender screen that
   * changes the programme rather than the mailbox — and an operator reaching for "reconnect"
   * must not pause by accident.
   */
  const pauseProgramme = useCallback(async () => {
    // 🛑 ⚑ 13 Sep (BL-1) — OWNERSHIP FIRST, AND BEFORE THE CONFIRMATION. The dialog names the
    // SELECTED client; asking it over another client's programme is the misleading half of
    // this defect, so the refusal happens before the operator can agree to anything.
    const id = programmeActionId()
    if (!id) { setLcMsg(PROGRAMME_MISMATCH_COPY); return }
    const say = forThisProgramme(setLcMsg)
    const who = (clients ?? []).find(c => c.id === selected)?.company_name ?? 'this client'
    if (!confirm(`Pause ${who}'s programme?\n\nOutreach stops. Nobody loses their place in the sequence, nothing is refunded and nothing is unwound.`)) return
    // ── 🛑 ⚑ 13 Sep (BL-1 residual) — THE BUSY FLAG IS SETTLED BY ITS OWN CLIENT ONLY ──
    //
    // ⛓️ WHAT STOOD HERE: ~~`finally { setLcBusy(null) }`~~ — unconditional, and that is a race
    // the guards above do NOT cover. They stop a stale response being READ; they say nothing
    // about a stale finalizer WRITING. A's action sets busy → the operator switches to B (the
    // switch clears it) → B starts its own action and IS busy → A's old finalizer runs → B's
    // busy is cleared under a request that has not come back.
    //
    // ⚠️ `lcBusy` HAS NO `if (lcBusy) return` GUARD — it drives the disabled attribute — so the
    // consequence here is a control re-enabled mid-flight, not a second request admitted by the
    // guard itself. Stated exactly, because that differs from `qualBusy`.
    const settleBusy = forThisProgramme(setLcBusy)
    setLcBusy('pause'); setLcMsg(null)
    try {
      const j = await fetch(`/api/proxy/programmes/${encodeURIComponent(id)}/pause`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The programme was not paused.')
      say('Paused. Outreach has stopped and nobody lost their place.')
      if (selected) await loadProgramme(selected)
    } catch (e) {
      say(e instanceof Error ? e.message : 'The programme was not paused.')
    } finally { settleBusy(null) }
  }, [programmeActionId, forThisProgramme, selected, clients, loadProgramme])

  // ── ⚑ 11 Sep (DAY 3) — RE-FREEZE, AND IT IS DELIBERATELY *NOT* INSIDE `lifecycle()` ────
  //
  // 🛑 THE SAME REASON `pauseProgramme` IS NOT. That helper carries the six approved
  // DRAFT→LIVE moves and their money-bearing confirmations, and a guard holds it at exactly
  // six precisely so a seventh cannot be slipped in beside them. A re-freeze is not a ladder
  // transition: it moves no status, grants no authority and touches no money. It publishes what
  // preparation has ALREADY produced as a new version so a stuck client can be asked again.
  //
  // ⚠️ THE CONFIRMATION SAYS WHAT IT DOES NOT DO, because "re-freeze" is not a phrase an
  // operator can price. Nothing is approved, charged or sent, and a previous approval — if the
  // programme somehow has one — is untouched, which the server enforces rather than promises.
  const refreezePackage = useCallback(async () => {
    // 🛑 ⚑ 13 Sep (BL-1) — the sharpest case for the action-time gate. A re-freeze publishes a
    // NEW version and invalidates the exact version the client is holding on an open screen;
    // doing that to the wrong client's programme is a live outage for somebody mid-approval.
    const id = programmeActionId()
    if (!id) { setLcMsg(PROGRAMME_MISMATCH_COPY); return }
    const say = forThisProgramme(setLcMsg)
    const who = (clients ?? []).find(c => c.id === selected)?.company_name ?? 'this client'
    if (!confirm(`Publish a new version of ${who}'s review package?\n\nThe prepared work has changed since it was frozen, so they cannot approve what they are looking at. This publishes the current work as a NEW VERSION and asks them again.\n\nNOTHING is approved, charged or sent.`)) return
    // ── 🛑 ⚑ 13 Sep (BL-1 residual) — THE BUSY FLAG IS SETTLED BY ITS OWN CLIENT ONLY ──
    //
    // ⛓️ WHAT STOOD HERE: ~~`finally { setLcBusy(null) }`~~ — unconditional, and that is a race
    // the guards above do NOT cover. They stop a stale response being READ; they say nothing
    // about a stale finalizer WRITING. A's action sets busy → the operator switches to B (the
    // switch clears it) → B starts its own action and IS busy → A's old finalizer runs → B's
    // busy is cleared under a request that has not come back.
    //
    // ⚠️ `lcBusy` HAS NO `if (lcBusy) return` GUARD — it drives the disabled attribute — so the
    // consequence here is a control re-enabled mid-flight, not a second request admitted by the
    // guard itself. Stated exactly, because that differs from `qualBusy`.
    const settleBusy = forThisProgramme(setLcBusy)
    setLcBusy('refreeze'); setLcMsg(null)
    try {
      const j = await fetch(`/api/proxy/programmes/${encodeURIComponent(id)}/refreeze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.message || j?.error || 'Nothing was re-frozen.')
      // ⚠️ THE SERVER'S OWN SENTENCE, never a guess. It is the only thing that knows whether a
      // new version was written or the package had not actually changed.
      say(String(j?.data?.headline ?? 'The review package was re-frozen.'))
      if (selected) await loadProgramme(selected)
    } catch (e) {
      say(e instanceof Error ? e.message : 'Nothing was re-frozen.')
    } finally { settleBusy(null) }
  }, [programmeActionId, forThisProgramme, selected, clients, loadProgramme])

  // ── ⚑ 24 Sep — REWRITE THE MESSAGES OF A PACKAGE NOBODY HAS APPROVED ───────────────────
  //
  // The House walk's package awaiting approval carried copy naming one sample prospect. This
  // writes new words, rebuilds every prepared person's copy and publishes a NEW version. Like
  // the re-freeze it moves no status and grants no authority, so it is its own function and
  // never one of the six `lifecycle()` moves. The server refuses unless nothing was approved or
  // sent (`lib/programme-rewrite.ts`); this only decides whether to DRAW the button.
  function canRewriteMessages(): boolean {
    const p = prog?.programme
    return !!p && p.status === 'READY_FOR_APPROVAL' && !p.approved_at && !p.paused_at && prog?.preparing !== true
  }

  const rewriteMessages = useCallback(async () => {
    const id = programmeActionId()
    if (!id) { setLcMsg(PROGRAMME_MISMATCH_COPY); return }
    const say = forThisProgramme(setLcMsg)
    const who = (clients ?? []).find(c => c.id === selected)?.company_name ?? 'this client'
    if (!confirm(`Rewrite the messages in ${who}'s programme?\n\nNew emails are written, every prepared person's copy is rebuilt from them, and the client is shown a NEW version to approve. It only works while nothing has been approved or sent.\n\nNOTHING is approved, charged or sent.`)) return
    const settleBusy = forThisProgramme(setLcBusy)
    setLcBusy('rewrite-messages'); setLcMsg(null)
    try {
      const res = await fetch(`/api/proxy/programmes/${encodeURIComponent(id)}/rewrite-messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      })
      const raw = await res.text()
      let j: { success?: boolean; error?: string; data?: { headline?: string } } | null = null
      try { j = raw ? JSON.parse(raw) : null } catch { j = null }
      if (j === null) {
        throw new Error(`K.I.N.D did not answer in time (HTTP ${res.status}). The rewrite may still be running — do not press again. Reload in a minute and read the package version.`)
      }
      if (!j.success) throw new Error(j.error || 'Nothing was rewritten.')
      // ⚠️ THE SERVER'S OWN SENTENCE: how many people were updated and which version is now live.
      say(String(j.data?.headline ?? 'The messages were rewritten.'))
      if (selected) await loadProgramme(selected)
    } catch (e) {
      say(e instanceof Error ? e.message : 'Nothing was rewritten.')
    } finally { settleBusy(null) }
  }, [programmeActionId, forThisProgramme, selected, clients, loadProgramme])

  // ── ⚑ 16 Sep (MVP1 · A1b) — RETRY PROOF AFTER A ZERO-ELIGIBLE RUN ─────────────────────
  //
  // 🛑 THE PRODUCT HAD ALREADY PROMISED THIS. The client's desk shows the founder-locked
  // *"Your setup is saved and has been flagged for K.I.N.D review. You won't need to start
  // again."* — and nothing in Vida could resume anything. This is the resume.
  //
  // ⚠️ IT TARGETS THE PROSPECT'S ACTIVE ICP, and the SERVER re-checks that the ICP belongs to
  // that client: an operator key is not a licence to run one client's Proof against another's
  // targeting, so the boundary lives on the server rather than in this choice.
  //
  // ⚠️ NOTHING HERE DECIDES ELIGIBILITY. The server asks the same reader the rail asks, and
  // claims through `claimProofAuthority`. If the client is not actually in the exception it
  // refuses, and the operator is told why.
  const retryProof = useCallback(async () => {
    if (!selected) return
    const icp = (cockpit?.icps ?? []).find(i => i.is_active !== false) ?? (cockpit?.icps ?? [])[0]
    if (!icp) {
      setLcMsg('This client has no ICP to run Proof against. Build or activate one first.')
      return
    }
    const who = (clients ?? []).find(c => c.id === selected)?.company_name ?? 'this client'
    // ⚠️ THE CONFIRMATION SAYS WHAT IT COSTS, because the honest answer is "nothing" and an
    // operator who assumes otherwise leaves the prospect stopped.
    if (!confirm(`Retry Proof for ${who}?\n\nThis sources a fresh set against their current targeting.\n\nTheir Proof attempt was RELEASED by the failed run, so this does not cost them an attempt. Correct the targeting FIRST if the last run was emptied by a criterion they do not meet.`)) return
    // ── ⚑ 23 Sep — THE NOTE THE SERVER HAS REQUIRED SINCE 18 SEP ────────────────────────
    //
    // 🛑 XC-12 (18 Sep) made `POST /operator/proof-retry/:clientId` refuse any recovery without a
    // `note` — "what were you recovering from?" — and this button was never given one. Every
    // press was refused with "A note is required…", so no Proof could be retried from Vida for
    // any client. Found 23 Sep by the founder on Blackburne Enterprises: "nothing".
    //
    // ⚠️ ASKED, NEVER INVENTED. A canned note would satisfy the server and record nothing — the
    // audit exists to hold the operator's own reason. An empty answer sends nothing.
    const note = window.prompt(`What is this retry recovering from? One line — it is recorded with the retry.\n\ne.g. "the old size rule set all 20 aside"`)?.trim() ?? ''
    if (!note) { setLcMsg('Proof was not retried — a retry needs a one-line note saying what it is recovering from.'); return }
    setLcBusy('retry_proof'); setLcMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/proof-retry/${encodeURIComponent(selected)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icp_id: icp.id, note }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Proof was not retried.')
      setLcMsg(j?.started
        ? 'Proof is running again. Their attempt was not spent — this is the one the failed run returned.'
        : 'A Proof run already holds their authority, so nothing more was needed.')
      if (selected) await loadProgramme(selected)
    } catch (e) {
      setLcMsg(e instanceof Error ? e.message : 'Proof was not retried.')
    } finally { setLcBusy(null) }
  }, [selected, cockpit, clients, loadProgramme])

  // ── ⚑ 16 Sep (MVP1 · D1) — THE RUN BUTTON NOW RUNS ────────────────────────────────────
  //
  // 🛑 IT CALLED `runOnceWith`. `programmes.run_at` is the external-delivery authority and
  // `POST /programmes/:id/run` is the audited route that writes it — and the lifecycle panel's
  // "Run" action fired `POST /operator/send-due/run-once` instead: the operator's SEND-ONCE
  // tool. So an operator could press Run, watch emails go out, and `run_at` would still be
  // NULL. The authority the whole ladder is built on was never granted by the button named
  // after it, and the next scheduled batch had no permission to exist.
  //
  // ⚠️ THREE DIFFERENT ACTS, AND THEY STAY THREE. Make Live arms the programme (`go-live`
  // through `lifecycle()`); Run grants delivery authority (this); send-once pushes a bounded
  // batch by hand (`runOnceWith`, unchanged, still its own tool with its own ceiling). The
  // founder's boundary is explicit: *"Do not conflate Make Live / Run / send-now."*
  //
  // ⚠️ RUN NEEDS NO CEILING, because Run sends nothing. A ceiling is send-once's input; asking
  // for one here implied this press delivers, which is the confusion that produced the defect.
  //
  // ⚠️ AND NO SEND GATE MOVES. Run records an authority. Delivery still passes the
  // kill-switch, the schedule, the caps, the sender and every per-lead gate afterwards.
  const runProgramme = useCallback(async () => {
    const id = programmeActionId()
    if (!id) { setLcMsg(PROGRAMME_MISMATCH_COPY); return }
    const say = forThisProgramme(setLcMsg)
    const settleBusy = forThisProgramme(setLcBusy)
    const who = (clients ?? []).find(c => c.id === selected)?.company_name ?? 'this client'
    if (!confirm(`Start ${who}'s programme?\n\nThis grants external delivery authority — from here the scheduled batches may send.\n\nNOTHING is sent by this press: delivery still obeys the kill-switch, the sending schedule, the caps, the sender checks and every per-lead gate.`)) return
    setLcBusy('run'); setLcMsg(null)
    try {
      const j = await fetch(`/api/proxy/programmes/${encodeURIComponent(id)}/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The programme was not started.')
      // ⚠️ THE SERVER SAYS WHICH IT WAS. A repeat press is a no-op and must not read as a
      // second start — the route reports `already_running` and the first press keeps the record.
      say(j?.already_running
        ? 'This programme was already started — nothing changed.'
        : 'Started. Scheduled batches may now send; nothing was sent by this press.')
      if (selected) await loadProgramme(selected)
    } catch (e) {
      say(e instanceof Error ? e.message : 'The programme was not started.')
    } finally { settleBusy(null) }
  }, [programmeActionId, forThisProgramme, selected, clients, loadProgramme])

  // ── ⚑ 16 Sep (MVP1 · E1) — COMPLETE, THROUGH THE EXISTING ROUTE ───────────────────────
  //
  // ⚠️ NOTHING HERE DECIDES WHETHER IT MAY BE COMPLETED. The control only exists because the
  // server said `may_complete`, and the route asks `mayComplete` again for itself — so a
  // verdict that changed between the render and the press is refused by the authority rather
  // than by this function.
  //
  // ⚠️ AND IT IS TERMINAL, so the confirmation says what stops. A completed programme blocks
  // future sending; an operator pressing this must know that before they press it.
  const completeProgramme = useCallback(async () => {
    const id = programmeActionId()
    if (!id) { setLcMsg(PROGRAMME_MISMATCH_COPY); return }
    const say = forThisProgramme(setLcMsg)
    const settleBusy = forThisProgramme(setLcBusy)
    const who = (clients ?? []).find(c => c.id === selected)?.company_name ?? 'this client'
    // ⛓️ 23 Sep (R136 ④) — the confirmation WAS "…Any unused programme value stays on their
    // account and never expires." Not what happens now: the programme is SETTLED before it can
    // complete, and any meetings shortfall is already credited to their wallet by then.
    if (!confirm(`Complete ${who}'s programme?\n\nThis CLOSES it: all future sending for this programme stops permanently, and the results and open replies are kept intact.\n\nIt has already been settled — any shortfall in meetings was credited to their wallet toward another run. This cannot be undone.`)) return
    setLcBusy('complete'); setLcMsg(null)
    try {
      const j = await fetch(`/api/proxy/programmes/${encodeURIComponent(id)}/complete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The programme was not completed.')
      say('Completed. Future sending for this programme is stopped; results and open replies are kept.')
      if (selected) await loadProgramme(selected)
    } catch (e) {
      say(e instanceof Error ? e.message : 'The programme was not completed.')
    } finally { settleBusy(null) }
  }, [programmeActionId, forThisProgramme, selected, clients, loadProgramme])

  // ── ⚑ 23 Sep (MVP1 Stage 6 · R136 ④) — SETTLE, THEN COMPLETE ─────────────────────────
  //
  // 🛑 `POST /programmes/:id/settle-shortfall` EXISTED AND NOTHING IN VIDA CALLED IT, so the
  // wallet credit R136 ④ owes a short programme could only be granted by hand-crafted request —
  // and `mayComplete` let a programme close at the sourcing limit without it. Completion now
  // requires settlement, so this is the control that makes Stage 6 reachable.
  //
  // ⚠️ THE OPERATOR STATES THE DELIVERED COUNT. It is prefilled from the meetings attributed to
  // this programme — the figure the client can see — but never submitted on its own: a settled
  // figure is persisted and may not move afterwards, so a person confirms it.
  const [settleMeetings, setSettleMeetings] = useState('')
  const settleProgramme = useCallback(async () => {
    const id = programmeActionId()
    if (!id) { setLcMsg(PROGRAMME_MISMATCH_COPY); return }
    const say = forThisProgramme(setLcMsg)
    const settleBusy = forThisProgramme(setLcBusy)
    const delivered = Number(settleMeetings)
    if (!Number.isInteger(delivered) || delivered < 0 || settleMeetings.trim() === '') {
      setLcMsg('Enter the number of meetings this programme delivered — a whole number, 0 or more.'); return
    }
    const who = (clients ?? []).find(c => c.id === selected)?.company_name ?? 'this client'
    if (!confirm(`Settle ${who}'s programme at ${delivered} meeting${delivered === 1 ? '' : 's'} delivered?\n\nAnything short of the target is credited to their WALLET toward another run, at the price they bought at — nothing is refunded to their card. The figure is recorded permanently.`)) return
    setLcBusy('settle'); setLcMsg(null)
    try {
      const j = await fetch(`/api/proxy/programmes/${encodeURIComponent(id)}/settle-shortfall`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveredMeetings: delivered, note: `Settled from Vida at ${delivered} delivered` }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The programme was not settled.')
      const credit = Number(j?.creditCents ?? 0)
      say(j?.alreadySettled
        ? 'This programme was already settled — nothing changed.'
        : credit > 0
          ? `Settled. $${(credit / 100).toFixed(2)} credited to their wallet toward another run. It can now be completed.`
          : 'Settled — nothing was owed. It can now be completed.')
      if (selected) await loadProgramme(selected)
    } catch (e) {
      say(e instanceof Error ? e.message : 'The programme was not settled.')
    } finally { settleBusy(null) }
  }, [programmeActionId, forThisProgramme, settleMeetings, selected, clients, loadProgramme])

  // ── ⚑ 25 Sep (R166 ⑥ · P3b) — RESOLVE A REVIEW, RAISE A LIMIT: TWO RECORDED DECISIONS ──────
  //
  // 🛑 `POST /programmes/:id/resolve-review` EXISTED AND NOTHING IN VIDA CALLED IT, so a programme
  // held for review (250 people, no meeting) could only be released by a hand-crafted request —
  // and from P3a that hold repeats every 250 people. And raising a sourcing limit had no control
  // at all: only a raw database edit. Both are a person's decision and both are audited server-side.
  const [raiseBy, setRaiseBy] = useState('')
  const [raiseWhy, setRaiseWhy] = useState('')
  const resolveReview = useCallback(async () => {
    const id = programmeActionId()
    if (!id) { setLcMsg(PROGRAMME_MISMATCH_COPY); return }
    const say = forThisProgramme(setLcMsg)
    const reviewBusy = forThisProgramme(setLcBusy)
    const who = (clients ?? []).find(c => c.id === selected)?.company_name ?? 'this client'
    if (!confirm(`Resolve the review on ${who}'s programme?\n\nThe next batch may start again. If another 250 people go out with no new meeting, it will be held for review again.`)) return
    setLcBusy('review'); setLcMsg(null)
    try {
      const j = await fetch(`/api/proxy/programmes/${encodeURIComponent(id)}/resolve-review`, { method: 'POST' }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The review was not resolved.')
      say('Review resolved. The next batch may start. The review repeats after another 250 people with no new meeting.')
      if (selected) await loadProgramme(selected)
    } catch (e) {
      say(e instanceof Error ? e.message : 'The review was not resolved.')
    } finally { reviewBusy(null) }
  }, [programmeActionId, forThisProgramme, selected, clients, loadProgramme])

  const raiseCeiling = useCallback(async () => {
    const id = programmeActionId()
    if (!id) { setLcMsg(PROGRAMME_MISMATCH_COPY); return }
    const say = forThisProgramme(setLcMsg)
    const raiseBusy = forThisProgramme(setLcBusy)
    const more = Number(raiseBy)
    if (!Number.isInteger(more) || more < 1) { setLcMsg('Enter how many more people to allow — a whole number of at least 1.'); return }
    if (raiseWhy.trim().length < 10) { setLcMsg('Write why the limit is being raised (at least 10 characters). It is kept on the record.'); return }
    const who = (clients ?? []).find(c => c.id === selected)?.company_name ?? 'this client'
    if (!confirm(`Allow ${more} more people on ${who}'s programme?\n\nThis spends more Apollo credits on this programme. It is recorded with your reason. Nothing is sent by this.`)) return
    setLcBusy('raise'); setLcMsg(null)
    try {
      const j = await fetch(`/api/proxy/programmes/${encodeURIComponent(id)}/raise-ceiling`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additional: more, reason: raiseWhy.trim() }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The limit was not raised.')
      say(`Limit raised from ${j.from} to ${j.to}. Recorded with your reason.`)
      setRaiseBy(''); setRaiseWhy('')
      if (selected) await loadProgramme(selected)
    } catch (e) {
      say(e instanceof Error ? e.message : 'The limit was not raised.')
    } finally { raiseBusy(null) }
  }, [programmeActionId, forThisProgramme, raiseBy, raiseWhy, selected, clients, loadProgramme])

  const lifecycle = useCallback(async (action: string, label: string) => {
    // ── 🛑 ⚑ 13 Sep (BL-1) — OWNERSHIP FIRST, ABOVE THE CONFIRMATIONS BELOW ──────────────
    //
    // This one helper carries EVERY ladder move — recommend · await-first-payment ·
    // authorise/first · ready-for-approval · authorise/second · go-live — and each confirmation
    // names `selected` while the request targets `prog.programme.id`. `routes/programme.ts`
    // gates all of them by the admin key and the programme id, never by the client Vida has
    // selected, so this is the only place the two can be compared. It sits above the dialog
    // because a confirmation naming client B over client A's programme is itself the defect.
    //
    // ⚠️ `go-live` IS INCLUDED AND NOTHING ABOUT IT IS OTHERWISE CHANGED. It is a Sprint 4
    // action on this Sprint 3 panel; leaving one unguarded programme-id mutation beside the
    // guarded ones would mean the defect class is not closed.
    const id = programmeActionId()
    if (!id) { setLcMsg(PROGRAMME_MISMATCH_COPY); return }
    const say = forThisProgramme(setLcMsg)
    const client = (clients ?? []).find(c => c.id === selected)
    const name = client?.company_name ?? 'this client'
    // ⚠️ EVERY CONFIRMATION NAMES THE CLIENT, and the money-bearing ones say IN WORDS that no
    // payment is recorded. On a screen where "authorise" normally means "a card was charged",
    // silence would be read as a charge.
    const confirms: Record<string, string> = {
      'recommend': `Move ${name}'s programme to RECOMMENDED?`,
      'await-first-payment': `Move ${name}'s programme to P1?\n\nThis records NO payment and creates NO checkout — it moves the programme to the stage where P1 is settled.`,
      'authorise/first': `Authorise P1 INTERNALLY for ${name}?\n\nNo payment is taken and no invoice, revenue or commission is created. It opens the sourcing ceiling and moves the programme to SOURCING_AUTHORISED, exactly as a first payment would.`,
      // ⚑ 9 Sep — THE CONFIRMATION SAYS WHAT THE BUTTON NOW DOES. It prepares first: the
      // campaign, the words, the timing and the audience are built, then the programme is
      // moved. An operator pressing this must know work is created, and must know equally
      // clearly that none of it can send — the campaign is a draft until Make live.
      'ready-for-approval': `Prepare ${name}'s programme and mark it READY FOR APPROVAL?\n\nThis builds the campaign, sequence, timing and audience if they are not built yet, then hands the programme to the client.\n\nNOTHING IS SENT. The campaign stays a draft until the client approves, P2 is authorised and it is made live. The client then approves it in Milla — Vida cannot approve it.`,
      'authorise/second': `Authorise P2 INTERNALLY for ${name}?\n\nNo payment is taken. This does NOT make the programme live — Make live is a separate action.`,
      'go-live': `Make ${name}'s programme LIVE?\n\nOutreach becomes permitted for this programme. Sending still obeys every downstream safety gate.`,
    }
    if (confirms[action] && !confirm(confirms[action])) return
    // ── 🛑 ⚑ 13 Sep (BL-1 residual) — THE BUSY FLAG IS SETTLED BY ITS OWN CLIENT ONLY ──
    //
    // ⛓️ WHAT STOOD HERE: ~~`finally { setLcBusy(null) }`~~ — unconditional, and that is a race
    // the guards above do NOT cover. They stop a stale response being READ; they say nothing
    // about a stale finalizer WRITING. A's action sets busy → the operator switches to B (the
    // switch clears it) → B starts its own action and IS busy → A's old finalizer runs → B's
    // busy is cleared under a request that has not come back.
    //
    // ⚠️ `lcBusy` HAS NO `if (lcBusy) return` GUARD — it drives the disabled attribute — so the
    // consequence here is a control re-enabled mid-flight, not a second request admitted by the
    // guard itself. Stated exactly, because that differs from `qualBusy`.
    const settleBusy = forThisProgramme(setLcBusy)
    setLcBusy(action); setLcMsg(null)
    try {
      // ⚠️ `id` IS THE ONE THE GATE PROVED, not a fresh read of `prog`. Re-resolving here
      // would reintroduce exactly what the gate exists to stop: `prog` can change between the
      // gate and this line, and the value that must travel is the one that was checked.
      const res = await fetch(`/api/proxy/programmes/${encodeURIComponent(id)}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      })
      // ── ⛓️ 9 Sep — THE BODY IS READ AS TEXT FIRST, BECAUSE IT WAS NOT ALWAYS JSON ──────
      //
      // 🛑 WHAT THE FOUNDER SAW: *Unexpected token 'u', "upstream error" is not valid JSON*.
      // An edge in front of this app closed a minutes-long request and answered with plain
      // text; `.json()` threw; and the parse error became the product's error message. The
      // parse failure was never the fault — a lost response is — so it is named as that, with
      // what to do next, and the raw body goes to the console for the log rather than the desk.
      const raw = await res.text()
      let j: { success?: boolean; error?: string; data?: unknown; preparation?: unknown } | null = null
      try { j = raw ? JSON.parse(raw) : null } catch { j = null }
      if (j === null) {
        console.error(`[vida] ${label}: non-JSON response (HTTP ${res.status}):`, raw.slice(0, 200))
        throw new Error(
          `K.I.N.D did not answer in time (HTTP ${res.status}). The work may still be running — ` +
          'do not press again. Reload in a minute; the programme panel shows the last preparation attempt and its outcome.',
        )
      }
      if (!j?.success) throw new Error(j?.error || `${label} failed`)

      // ── ⛓️ 9 Sep — READY FOR APPROVAL NOW STARTS A BACKGROUND RUN AND RETURNS ────────────
      //
      // The route answers 202 the moment the run starts; the outcome arrives on the programme
      // panel (`preparing` while it runs, then `last_preparation` and the row's own status).
      // So the screen says exactly that, then re-reads the programme a few times while the
      // server still reports it as preparing — polling a boolean the server owns, never a
      // guess about how long 246 prospects take.
      if (action === 'ready-for-approval' && res.status === 202) {
        const bg = j?.data as { started?: boolean; already_running?: boolean; headline?: string } | null | undefined
        say(bg?.headline ?? 'Preparing in the background. Nothing is sent.')
        if (selected) {
          // ⚑ 13 Sep (BL-1) — the poll belongs to the client it started for. Every
          // `loadProgramme` below is discarded by the read guard once the operator moves on,
          // so this only stops ten minutes of pointless requests against a client nobody is
          // looking at — the safety is the guard, not the break.
          const gen = progGen.current
          for (let i = 0; i < 40; i++) {
            if (progGen.current !== gen) break
            await loadProgramme(selected)
            // `loadProgramme` sets state asynchronously; a fresh read decides whether to wait.
            const still = await fetch(`/api/proxy/operator/programme?client_id=${encodeURIComponent(selected)}`)
              .then(r => r.json()).then(x => x?.data?.preparing === true).catch(() => false)
            if (!still || progGen.current !== gen) break
            await new Promise(r => setTimeout(r, 15000))
          }
          await loadProgramme(selected)
        }
        return
      }
      // ⚑ "Live" is not the same claim as "operable", so the screen says both. A go-live that
      // prepared nothing is the exact state an operator must not read as finished.
      const prep = j?.preparation as { campaigns: string[]; enrolled: string[]; alreadyEnrolled: number } | null | undefined
      // ⚑ 9 Sep — READY FOR APPROVAL NOW PREPARES, SO IT REPORTS WHAT IT PREPARED. The counts
      // come from the server's own advance report; the screen derives none of them. A run that
      // enrolled nobody because everybody was already enrolled is the idempotent answer and is
      // shown as such, not as a silent "done".
      const adv = j?.data as {
        enrolled?: number; already_enrolled?: number; campaigns?: string[]; status_after?: string
      } | null | undefined
      if (action === 'ready-for-approval' && adv && typeof adv.enrolled === 'number') {
        say(
          `${label} — done. ${(adv.campaigns ?? []).length} campaign(s) ready · ${adv.enrolled} prospect(s) prepared` +
          `${adv.already_enrolled ? ` · ${adv.already_enrolled} already prepared` : ''}` +
          `${adv.status_after ? ` · now ${adv.status_after}` : ''}. Nothing has been sent.`,
        )
      } else say(prep
        ? `${label} — done. ${prep.campaigns.length} campaign(s) ready · ${prep.enrolled.length} prospect(s) enrolled` +
          `${prep.alreadyEnrolled ? ` · ${prep.alreadyEnrolled} already enrolled` : ''}. Nothing has been sent.`
        : `${label} — done.`)
      // Re-read rather than patching local state: the row is the truth, and a screen that
      // guesses the new state is a screen that can be wrong about it.
      if (selected) await loadProgramme(selected)
    } catch (e) {
      say(e instanceof Error ? e.message : `${label} failed`)
    } finally { settleBusy(null) }
  }, [programmeActionId, forThisProgramme, selected, clients, loadProgramme])

  const createProgrammeNow = useCallback(async () => {
    const client = (clients ?? []).find(c => c.id === selected)
    const name = client?.company_name ?? 'this client'
    // ⚠️ NO DEFAULT MEETING TARGET. The target prices the whole programme off the shared
    // curve; picking one for the founder would put a number in front of a client that nobody
    // chose. An empty or non-numeric entry is refused rather than silently defaulted.
    const meetings = Number(lcMeetings)
    if (!Number.isInteger(meetings) || meetings <= 0) { setLcMsg('Enter a whole meeting target first.'); return }
    if (!confirm(`Create a programme for ${name} with a target of ${meetings} meeting(s)?\n\nNo payment is recorded and nothing is charged. The programme is created in DRAFT.`)) return
    setLcBusy('create'); setLcMsg(null)
    try {
      const j = await fetch('/api/proxy/programmes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selected, meetings }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Create failed')
      setLcMsg('Programme created in DRAFT.'); setLcMeetings('')
      if (selected) await loadProgramme(selected)
    } catch (e) { setLcMsg(e instanceof Error ? e.message : 'Create failed') }
    finally { setLcBusy(null) }
  }, [lcMeetings, selected, clients, loadProgramme])

  const attachIcp = useCallback(async (icpId: string, icpName: string | null) => {
    // 🛑 ⚑ 13 Sep (BL-1) — ownership before the confirmation, like every other programme-id
    // action. Attaching decides which targeting all downstream attribution belongs to; doing
    // it to the wrong client's programme is a mis-attribution nothing later would question.
    const id = programmeActionId()
    if (!id) { setLcMsg(PROGRAMME_MISMATCH_COPY); return }
    const say = forThisProgramme(setLcMsg)
    const client = (clients ?? []).find(c => c.id === selected)
    const name = client?.company_name ?? 'this client'
    if (!confirm(
      `Attach "${icpName ?? 'this ICP'}" to ${name}'s programme?\n\n` +
      'Future sourcing from this ICP will belong to this programme.\n' +
      'Historical leads and enrolments are NOT changed.',
    )) return
    // ── 🛑 ⚑ 13 Sep (BL-1 residual) — THE BUSY FLAG IS SETTLED BY ITS OWN CLIENT ONLY ──
    //
    // ⛓️ WHAT STOOD HERE: ~~`finally { setLcBusy(null) }`~~ — unconditional, and that is a race
    // the guards above do NOT cover. They stop a stale response being READ; they say nothing
    // about a stale finalizer WRITING. A's action sets busy → the operator switches to B (the
    // switch clears it) → B starts its own action and IS busy → A's old finalizer runs → B's
    // busy is cleared under a request that has not come back.
    //
    // ⚠️ `lcBusy` HAS NO `if (lcBusy) return` GUARD — it drives the disabled attribute — so the
    // consequence here is a control re-enabled mid-flight, not a second request admitted by the
    // guard itself. Stated exactly, because that differs from `qualBusy`.
    const settleBusy = forThisProgramme(setLcBusy)
    setLcBusy(`icp:${icpId}`); setLcMsg(null)
    try {
      const j = await fetch(`/api/proxy/programmes/${encodeURIComponent(id)}/attach-icp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icp_id: icpId }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Attach failed')
      say(`"${icpName ?? 'ICP'}" now feeds this programme. Nothing historical was changed.`)
      if (selected) await loadProgramme(selected)
    } catch (e) { say(e instanceof Error ? e.message : 'Attach failed') }
    finally { settleBusy(null) }
  }, [programmeActionId, forThisProgramme, selected, clients, loadProgramme])

  // ⚑ 30 Aug (BUILD-003 PR4) — POOL + EXCEPTIONS. Platform-wide, so they load independently of
  // the selected client and are refreshed when their tab is opened.
  type PoolSummary = {
    total: number | null
    by_source: { source: string; count: number }[]
    by_country: { country: string; count: number }[]
    breakdown_sample: number
    degraded: string[]
  }
  type Exceptions = {
    stranded_batches: { id: string; seq: number; programme_id: string; client_id: string | null; granted: number; delivered: number | null; created_at: string | null }[]
    open_evictions: { lead_id: string; client_id: string | null; provider: string | null; reason: string | null; required_at: string }[]
    failed_runs: { icp_id: string; client_id: string | null; message: string | null; created_at: string }[]
    failed_run_window_days: number
    debris_icps: { id: string; client_id: string | null; name: string | null; is_active: boolean; created_at: string | null }[]
    degraded: string[]
  }
  const [pool, setPool] = useState<PoolSummary | null>(null)
  const [poolErr, setPoolErr] = useState<string | null>(null)
  const loadPool = useCallback(async () => {
    setPoolErr(null)
    try {
      const j = await fetch('/api/proxy/operator/pool/summary').then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Failed to load the pool summary')
      setPool(j.data as PoolSummary)
    } catch (e) { setPoolErr(e instanceof Error ? e.message : 'Failed to load the pool summary'); setPool(null) }
  }, [])

  const [exc, setExc] = useState<Exceptions | null>(null)
  const [excErr, setExcErr] = useState<string | null>(null)
  const [retireBusy, setRetireBusy] = useState<string | null>(null)
  const loadExceptions = useCallback(async () => {
    setExcErr(null)
    try {
      const j = await fetch('/api/proxy/operator/programme/exceptions').then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Failed to load exceptions')
      setExc(j.data as Exceptions)
    } catch (e) { setExcErr(e instanceof Error ? e.message : 'Failed to load exceptions'); setExc(null) }
  }, [])

  // ⚠️ THE ONLY CLEANUP ACTION, AND IT IS REVERSIBLE. `is_active = false` — never a delete.
  // The route refuses with 409 if the ICP belongs to a live unpaused programme, and that
  // refusal is surfaced verbatim rather than swallowed into a generic failure.
  const retireIcp = useCallback(async (icpId: string, active: boolean) => {
    setRetireBusy(icpId)
    try {
      const j = await fetch(`/api/proxy/operator/icp/${encodeURIComponent(icpId)}/retire`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      }).then(r => r.json())
      setSaveMsg(j?.success ? notice.ok(j.data?.headline ?? 'Done.') : notice.error(j?.error ?? 'Could not change the ICP.'))
      if (j?.success) await loadExceptions()
    } catch (e) {
      setSaveMsg(notice.error(e instanceof Error ? e.message : 'Could not change the ICP.'))
    }
    setRetireBusy(null)
  }, [loadExceptions])

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
  /** true = build a BRAND-NEW ICP; the existing one is neither read nor seeded. */
  const [icpFresh, setIcpFresh] = useState(false)
  /** What the operator typed in the command bar, waiting to open the ICP conversation. */
  const [icpHandoff, setIcpHandoff] = useState<string | null>(null)
  const [icpChat, setIcpChat] = useState<ChatTurn[]>([])
  // ⛓️ 4 Sep — `icpInput` held the duplicate composer's text. There is one composer now.
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
    setIcpMode('list'); setIcpChat([]); setIcpProposal(null)
    setSeqPreview(null); setAsks(null); setFromClient([]); setAskInput(''); setSaveMsg(null)
    // ── 🛑 ⚑ 13 Sep (BL-1) — PROTECTION 1: IMMEDIATE INVALIDATION, BEFORE ANYTHING LOADS ──
    //
    // The bump happens before `loadProgramme` is called, so a response issued for the previous
    // client can no longer be accepted whatever order it arrives in — and so the new client's
    // own request is the only one this generation will admit.
    progGen.current += 1
    setProg(null); setProgErr(null); setCmMsg(null)
    // ⚠️ AND THE PROGRAMME/LIFECYCLE ACTION STATE GOES WITH IT. Each of these describes what
    // was done to, or is being done to, the PREVIOUS client's programme: a confirmation left
    // open, a busy flag, or an outcome sentence carried across a switch would all read as
    // belonging to the client now on screen. `runMsg` is included for the same reason — it
    // reports what was sent for somebody else.
    setQualBusy(false); setQualMsg(null); setQualConfirm(false)
    setLcBusy(null); setLcMsg(null); setRunMsg(null)
    loadCockpit(selected)
    loadProgramme(selected)
  }, [selected, loadCockpit, loadProgramme])

  // ⚑ 30 Aug (BUILD-003 PR4) — POOL AND EXCEPTIONS LOAD WHEN THEIR TAB IS OPENED.
  //
  // ⚠️ NOT ON CLIENT SELECTION, because neither is scoped to a client — firing them on every
  // client switch would be two platform-wide queries per click for data nobody is looking at.
  // Opening the tab is the moment the operator wants it, and re-opening refreshes it, which is
  // what an exceptions list needs: a stale one is worse than none.
  useEffect(() => {
    if (tab === 'Pool') void loadPool()
    if (tab === 'Exceptions') void loadExceptions()
  }, [tab, loadPool, loadExceptions])

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

  // ⚑ 17 Sep — ATTRIBUTE OR DISCARD AN UNATTRIBUTED INBOUND REPLY.
  //
  // 🛑 WHAT THE ALERT MEANS. A prospect replied, and two or more clients hold a lead with that
  // address. No receiving mailbox and no record of us emailing them names one owner, so the
  // reply was written to NOBODY and retained instead — because showing one client another
  // client's inbound mail is the harm the refusal exists to prevent. This is the only way it
  // becomes anyone's.
  //
  // ⚠️ SAME SHAPE AS `resolveProofReview` ABOVE, deliberately — proxy POST, read `success`,
  // re-read the feed from the server. A second pattern for two buttons is a second pattern to
  // keep, and re-reading rather than splicing means a write that FAILED cannot render as done.
  async function actOnUnattributedReply(a: Alert, action: 'resolve' | 'discard') {
    if (!a.unattributed_reply_id) {
      setProofMsg('That alert is missing its reply id, so no action could be taken. Refresh and try again.')
      return
    }
    // ⚠️ THE DESTRUCTIVE ONE ASKS FIRST, and it names what it is doing. "Discard" here means
    // this reply belongs to NONE of the candidate clients — not "not this one", which with
    // several candidates would be ambiguous in exactly the way the alert is.
    if (action === 'discard' && !window.confirm(
      `Discard this reply?\n\n${a.label}\n\nThis records that it belongs to NONE of the candidate clients. No client will ever see it. The message itself is kept.`,
    )) return

    // ⚑ 18 Sep (J22-C2 · PV 11 C) — WHICH CLIENT, WHEN THE ALERT NAMES NONE.
    //
    // A hold with no candidate arrives with `client_id: ''` — there is no client to offer,
    // which is the whole condition — so the operator's own selection is the answer. Attributing
    // it with no client chosen would be an action with no subject, and the button is disabled
    // for exactly that reason; this refusal is the second half of the same guard.
    const owner = a.client_id || selected
    if (action === 'resolve' && !owner) {
      setProofMsg('Choose the client this reply belongs to first — select them on the left, then attribute it.')
      return
    }
    setProofBusy(a.unattributed_reply_id); setProofMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/unattributed-replies/${encodeURIComponent(a.unattributed_reply_id)}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: action === 'resolve' ? JSON.stringify({ client_id: owner }) : undefined,
      }).then(r => r.json())
      if (j?.success) {
        const fresh = await fetch('/api/proxy/operator/alerts').then(r => r.json())
        if (fresh?.success) setAlerts(fresh.data)
        setProofMsg(
          j.data?.resolved === 'attributed' ? 'Attributed — the reply is now in this client\'s inbox.'
            : j.data?.resolved === 'discarded' ? 'Discarded — no client received it.'
              : 'Already handled.',
        )
      } else {
        setProofMsg(j?.error || 'It could not be done — the reply is still waiting.')
      }
    } catch {
      setProofMsg('It could not be done — the reply is still waiting.')
    }
    setProofBusy(null)
  }

  /**
   * ⚑ 18 Sep (J22-C2 · PV 11 C) — ASK THE LEAD LOOKUP AGAIN FOR A HOLD THAT HAS NO CANDIDATES.
   *
   * ⚠️ SAME SHAPE AS THE TWO BUTTONS ABOVE — proxy POST, read `success`, re-read the feed from
   * the server. The re-check writes only the candidate set, so a feed that comes back with the
   * ordinary attribute buttons is the server saying it found somebody; nothing here decides it.
   */
  async function recheckUnattributedReply(a: Alert) {
    if (!a.unattributed_reply_id) {
      setProofMsg('That alert is missing its reply id, so no action could be taken. Refresh and try again.')
      return
    }
    setProofBusy(a.unattributed_reply_id); setProofMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/unattributed-replies/${encodeURIComponent(a.unattributed_reply_id)}/recheck`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
      }).then(r => r.json())
      if (j?.success) {
        const fresh = await fetch('/api/proxy/operator/alerts').then(r => r.json())
        if (fresh?.success) setAlerts(fresh.data)
        setProofMsg(
          j.data?.rechecked === 'candidates_found'
            ? `Found ${j.data.candidates} client${j.data.candidates === 1 ? '' : 's'} holding that address — attribute it to the right one.`
            : j.data?.rechecked === 'already_resolved' ? 'Already handled.'
              : j.message || 'Still nobody holds that address. The reply stays retained.',
        )
      } else {
        setProofMsg(j?.error || 'The re-check could not be done — the reply is still waiting.')
      }
    } catch {
      setProofMsg('The re-check could not be done — the reply is still waiting.')
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
  // ⚑ 4 Sep — `fresh` rides the SAME request. A brand-new ICP is a different conversation,
  // not a different engine: the route simply does not read or seed the existing one.
  // ⚑ 4 Sep — `icpChat` IS THE HISTORY THIS ROUTE SENDS, NOT A TRANSCRIPT IT SHOWS.
  //
  // 🛑 THE DUPLICATE ASSISTANT LIVED ON THIS STATE. It was rendered as its own bubble list,
  // under its own composer, with its own Send — a second Vida on the same screen as the real
  // one. The bubbles, the composer and the Send are gone; the array stays because
  // `/operator/icp/chat` is given the last twelve turns and would otherwise lose the thread.
  //
  // ⚠️ EVERY TURN NOW LANDS IN THE ONE TRANSCRIPT. `conversation.say` writes into the shell's
  // conversation — the one the operator typed into — so nothing this endpoint says is hidden,
  // and there is still exactly one place to read it.
  //
  // ⚠️ THE #1643 SEMANTICS ARE UNTOUCHED. `fresh` still rides the same request, a fresh build
  // still does not seed the existing ICP, the one-question discipline is still the route's,
  // the save is still explicit, and nothing here attaches, sources or sends.
  async function sendIcpChat(text: string, freshOverride?: boolean) {
    if (!selected || !text.trim() || cockpitBusy) return
    const history = icpChat.slice(-12)
    const fresh = freshOverride ?? icpFresh
    setIcpChat(l => [...l, { role: 'user', content: text }]); setCockpitBusy(true)
    try {
      const j = await fetch('/api/proxy/operator/icp/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected, message: text, history, fresh }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Could not work the ICP')
      setIcpChat(l => [...l, { role: 'assistant', content: j.data.message }])
      conversation.say('vida', j.data.message)
      if (j.data.icp) setIcpProposal(j.data.icp as Record<string, unknown>)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not work the ICP'
      setIcpChat(l => [...l, { role: 'assistant', content: msg }])
      conversation.say('vida', msg)
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

  // ── ⚑ 4 Sep — APPROVE THE PROPOSAL WHERE IT WAS PROPOSED ───────────────────────────────
  //
  // 🛑 "REVIEW & SAVE" USED TO OPEN THE RAW EIGHT-FIELD EDITOR — and, worse, `setIcpMode('list')`
  // left the conversation, so the operator could not go back and correct anything by talking.
  // The founder's ruling is that the raw form is the ESCAPE HATCH, never the normal journey.
  //
  // ⚠️ SAME PROPOSAL OBJECT, SAME SAVE ROUTE. This is not a second save path: it posts the
  // conversation's own proposal to `POST /operator/icp`, exactly as the form does. What is
  // removed is the form standing between the two.
  async function approveProposal() {
    if (!selected || !icpProposal) return
    const p = icpProposal as Record<string, unknown>
    if (!String(p.name ?? '').trim()) { setSaveMsg(notice.error('Give it a name first — ask Vida to name it, or open the fields.')); return }
    setCockpitBusy(true); setSaveMsg(null)
    try {
      const j = await fetch('/api/proxy/operator/icp', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_id: selected,
          name: p.name,
          industries: p.industries, job_titles: p.job_titles, seniority_levels: p.seniority_levels,
          company_sizes: p.company_sizes, geographies: p.geographies,
          tech_stack: p.tech_stack, keywords: p.keywords,
        }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error)
      setIcpProposal(null); setIcpChat([]); setIcpMode('list')
      setSaveMsg(notice.ok('Saved as the new ICP. It is not attached to a programme — attach it on the Programme tab when you are ready.'))
      await loadCockpit(selected)
    } catch (e) { setSaveMsg(notice.error(noticeText(e, 'Could not save the ICP'))) }
    setCockpitBusy(false)
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
  const [seqDepth, setSeqDepth] = useState<3 | 5>(5)   // ⛓️ 25 Sep (R166 ⑥): 7 touches withdrawn — the maximum is 5
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
    // ⛓️ C2 — THIS TEXT IS TYPED INTO A MESSAGE TO THE CLIENT, so it is the sharpest of the
    // retired money sentences: an operator pressing "chase" on a programme account would send
    // them an invoice for a pack that does not exist on their plan.
    if (kind === 'chase')      { setTab('Asks'); setAskInput(programmeModel
      ? 'Quick nudge — your programme is ready to start the moment you approve it. Nothing further is due; the approval is all we need.'
      // 🛑 AN UNRESOLVED MODEL SENDS NO MONEY SENTENCE AT ALL. This text goes to the client, so
      // the safe wording is the one that claims nothing about what they owe or have bought.
      : unresolvedModel
        ? 'Quick nudge — we are ready to move as soon as you are.'
        : `Quick nudge — your first $${PACK_PRICE_USD} unlocks the whole thing: we buy your sender, find your people and start work the moment you approve them.`); return }
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
        ? (programmeModel
            ? 'Marked a no-show. No money moves on this plan — the programme covers it.'
            : unresolvedModel
              ? 'Marked a no-show.'
              : 'Marked a no-show. Nothing was refunded — the $4 stands.')
        : j.rebooks_left === 0
          ? (programmeModel
              ? 'Second attempt used. The client has been told; their programme covers the re-run.'
              : unresolvedModel
                ? 'Second attempt used. The client has been told.'
                : 'Second attempt used. The client has been told, with the $4 re-run choice.')
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

  // ⛓️ 4 Sep — THE SOURCING CONFIRM MOVED WITH THE CONVERSATION IT ANSWERS IN.
  // `srcPreview` / `srcBusy` / `srcResult` / `srcSendWarn` and `previewSource` /
  // `confirmSource` are in `components/vida/VidaConversation.tsx`; what stays here is the
  // console's own reaction to a completed run, registered as `onSourced` below, so the board
  // and the people list still re-read exactly as they did.

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
      .then(j => { if (j?.success) setWork(j.data); else throw new Error(j?.error || 'the API returned no data') })
      .catch(fail('worklist'))
  }, [])

  // ⛓️ 4 Sep — `parseSourceIntent`, `previewSource`, `confirmSource` AND `runCommand` MOVED
  // TO THE ONE CONVERSATION. Every rule they carried went with them unchanged: the sourcing
  // verb-AND-noun test that stops "find the CEO's email" being hijacked into a pool-cost
  // confirm, the pool-aware preview before OUR PDL budget is spent, and the #1643 rule that
  // an operator already inside the ICP conversation never passes through the generic intent
  // detector. That last one is now `intercept` below — the console answers whether it is in
  // that mode, and the conversation still classifies nothing.

  // ── ⚑ 4 Sep — THE CARRIED SENTENCE OPENS THE CONVERSATION ──────────────────────────────
  //
  // 🛑 THE FOUNDER TYPED A FULL ICP AND WAS ASKED TO TYPE IT AGAIN. The command bar now hands
  // back exactly what he wrote; this fires it as the first turn of a FRESH conversation the
  // moment the ICP chat is on screen, so the handoff loses nothing.
  //
  // ⚠️ IT RUNS ONCE. `icpHandoff` is cleared before the send, so a re-render, a tab switch or
  // a second visit cannot replay the operator's sentence into the conversation.
  useEffect(() => {
    if (!icpHandoff || !selected || tab !== 'ICP' || icpMode !== 'chat' || cockpitBusy) return
    const text = icpHandoff
    setIcpHandoff(null)
    setIcpFresh(true); setIcpChat([]); setIcpProposal(null)
    void sendIcpChat(text, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icpHandoff, selected, tab, icpMode, cockpitBusy])

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
        // ⛓️ 4 Sep — `?client=…` IS READ BY THE NAV NOW (`components/vida/VidaClients.tsx`),
        // because the list that answers it lives there. Reading it in both places would race:
        // whichever resolved second would win, and only one of them carries the client's name.
        const params = new URLSearchParams(window.location.search)
        const urlClient = params.get('client')
        // ── ⚑ 4 Sep — THE HANDOFF LINK NOW NAMES ITS DESTINATION ──────────────────────────
        //
        // 🛑 `?client=<id>` WAS THE WHOLE LINK, AND `tab` IS INITIALISED TO 'Inbox'. Every
        // "Open →" the command bar produced — ICP, campaign, sequence alike — therefore landed
        // on Inbox, whatever it said it would open. The founder pressed Open expecting the ICP
        // builder and got the inbox, which is exactly what this page was written to do.
        //
        // ⚠️ VALIDATED, NEVER TRUSTED. `tab` must be one of the real tabs and `mode` one of the
        // two ICP modes; anything else is ignored and the default stands.
        const urlTab = params.get('tab')
        if (urlTab && (COCKPIT_TABS as readonly string[]).includes(urlTab)) setTab(urlTab as CockpitTab)
        if (params.get('mode') === 'chat') setIcpMode('chat')
        // The operator's own words, carried across the navigation the link performs. Same
        // origin, their own sentence, and read once — never a summary and never re-sent.
        const carried = urlClient ? sessionStorage.getItem(`vida:icp-handoff:${urlClient}`) : null
        if (carried) { sessionStorage.removeItem(`vida:icp-handoff:${urlClient}`); setIcpHandoff(carried) }
      } catch {
        // ⛓️ 4 Sep — the client list and its error banner live in the nav now
        // (`components/vida/VidaClients.tsx`), which reads the same endpoint and says so there.
        // This read stays because the console still needs `clients` for the header and the
        // cockpit; a second banner in two places would be two answers to one question.
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

  // ── ⚑ 4 Sep — THE CONSOLE TELLS THE ONE CONVERSATION WHAT IT IS LOOKING AT ─────────────
  //
  // ⚠️ DISPLAY FACTS AND HANDLERS, NOTHING ELSE. The conversation renders the client header,
  // the blocker chips and the kill-switch line from the values below — the same values this
  // page already held — and calls the handlers when the operator acts. No business logic
  // crossed: sourcing still re-reads THIS page's board and people, the ICP conversation still
  // runs on THIS page's ICP surface, and the Open link still switches THIS page's tab.
  //
  // ⚠️ `intercept` IS THE #1643 RULE AND IT IS STILL STATE, NOT INFERENCE. It answers "the
  // operator is explicitly inside the ICP conversation" — the same `tab === 'ICP' && icpMode
  // === 'chat'` it always was. Outside that, it returns false and the generic router answers,
  // exactly as conservatively as before.
  //
  // ⚠️ RUNS ON EVERY RENDER, ON PURPOSE. The handlers close over current state, so a stale
  // capture would silently send an old client id. The provider compares the DISPLAY half
  // before storing it, so republishing cannot loop.
  // ⚑ 4 Sep (UI-010) — AND IT TAKES IT ALL BACK WHEN IT GOES.
  //
  // 🛑 `publish` overwrote the handlers ref and nothing ever wrote an empty one back, so this
  // console's blockers, board error and three launch shortcuts outlived it: on Lead queue the
  // operator was offered "Build the ICP →" for a surface that was not mounted, beside a
  // blocker strip nobody had re-read.
  //
  // ⚠️ MOUNT-SCOPED, so it runs exactly once on the way out — the publish below runs on every
  // render, and a cleanup there would clear and re-publish on every frame.
  // ⚠️ IT CLEARS THIS WORKSPACE'S CONTRIBUTION ONLY. The transcript, the composer and the
  // selected client are the conversation's own.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => conversation.unpublish(), [])

  useEffect(() => {
    conversation.publish({
      blockers,
      outreachEnabled: status ? status.outreach_enabled : null,
      boardError,
      // ⚑ 7 Sep (HOUSE-008) — the programme truth this panel already fetched, turned into the
      // one action the conversation's sourcing shortcut needs. Derived, never re-fetched: a
      // second read could disagree with the panel about the batch size on the very button
      // that spends the money. `null` for a client with no programme, which leaves the legacy
      // shortcut exactly as it was.
      programmeSourcing: programmeSourcingAction(prog),
      // ⚑ 9 Sep — WHAT VIDA IS SAYING, AND HER POSTURE WHILE SHE SAYS IT. Published rather
      // than fetched by the conversation for the same reason `programmeSourcing` is: this
      // console already holds the server's verdict, and a second read could disagree with the
      // panel beside it about whether the operator is needed at all.
      lifecycle: lcCopy && lc
        ? { mode: lc.verdict.mode, messages: lcCopy.messages, chips: lcCopy.chips }
        : null,
    }, {
      intercept: (t: string) => {
        if (tab !== 'ICP' || icpMode !== 'chat') return false
        void sendIcpChat(t)
        return true
      },
      onHandoff: (t: string) => setIcpHandoff(t),
      onSourced: async () => {
        if (!selected) return
        await loadBoard(selected)
        if (people) await loadPeople(selected, activeCampaign?.id)
      },
      onOpen: (u: URL) => {
        // SAME PAGE, SO NO NAVIGATION — reloading would throw away the conversation state and
        // the sentence just carried. Anything that is not this console is left to the browser.
        if (u.pathname !== '/vida') return false
        const t = u.searchParams.get('tab')
        if (t && (COCKPIT_TABS as readonly string[]).includes(t)) setTab(t as CockpitTab)
        if (u.searchParams.get('mode') === 'chat') setIcpMode('chat')
        return true
      },
      buildIcp: () => { setIcpFresh(true); setIcpChat([]); setIcpProposal(null); setTab('ICP'); setIcpMode('chat') },
      buildCampaign: () => { setTab('Campaign'); if (!activeCampaign) suggestCampaign() },
      draftSequence: () => { setTab('Sequence'); suggestSequence() },
    })
  })

  /**
   * ⚑ 3 Sep (C2) — IS THIS CLIENT ON THE PROGRAMME MODEL? One derived boolean for the whole
   * console, so the retired money sentences below cannot drift apart from one another.
   *
   * 🛑 IT IS THE DECLARED MODEL, NOT THE PRESENCE OF A PROGRAMME. That is the whole point: a
   * programme client between programmes is still a programme client, and the rail ticking
   * "Paid $299" at them is a false commercial statement about an account that never bought a
   * pack. `compat_programme` is included because a client with a programme open is already
   * governed by it today.
   *
   * ⚠️ `unreadable` IS NOT INCLUDED HERE, deliberately. It gets its own treatment on the wallet
   * chip and its own red panel; suppressing every money sentence on a client we simply could not
   * read would hide legacy truth from a legacy client because of a transient failure.
   *
   * ⚠️ AND FALSE FOR EVERY LEGACY AND UNCLASSIFIED CLIENT, which is the entire live book — so
   * every sentence below reads exactly as it does today for all of them.
   */
  // —— 🛑 3 Sep (C2) · WHICH COMMERCIAL MODEL IS THIS CONSOLE ALLOWED TO TALK ABOUT? —————
  //
  // ⛓️ REWRITTEN TWICE, AND BOTH TIMES FOR THE SAME REASON. It started as a BOOLEAN, and a
  // boolean has only one else — so everything that was not programme took the LEGACY arm of every
  // sentence below. First that swallowed the CONFLICT and the unreadable model; then, once those
  // had their own state, it still swallowed LOADING and a response with the field missing.
  //
  // 🛑 FOUNDER-RULED: **UNKNOWN MUST NEVER BE PRESENTED AS LEGACY.** So the derivation is
  // POSITIVE and exhaustive: only a successfully resolved answer that actually SAYS legacy is
  // rendered as legacy. Everything else — loading, a failed read, a missing field, an unreadable
  // model, the declared-legacy-with-an-open-programme conflict, and any state a future resolver
  // adds — lands on a neutral treatment that asserts nothing about money.
  //
  // ⚠️ A MISSING FIELD IS NOT NULL. `commercial_model: null` is an explicit database value and
  // means UNCLASSIFIED, which the API returns as `compat_legacy`; a response with no `commercial`
  // block at all is an absence of truth. Reading the second as the first is the C2 defect in
  // miniature, so the two cannot share a branch: `compat_legacy` is named, absence is not.
  //
  // ⚠️ LOADING IS ITS OWN LABEL, not an error. It is neutral for the same reason the others
  // are, but "Checking…" is what is true for the first moment of a page rather than
  // "Model unresolved" — a short honest transient beats a false commercial claim either way.
  const modelResolved = prog?.commercial?.resolved
  const modelView: 'programme' | 'legacy' | 'unresolved' | 'loading' =
      modelResolved === 'programme' || modelResolved === 'compat_programme' ? 'programme'
    : modelResolved === 'legacy'    || modelResolved === 'compat_legacy'    ? 'legacy'
    : (!prog && !progErr) ? 'loading'
    : 'unresolved'
  const programmeModel = modelView === 'programme'
  /**
   * ⚠️ LOADING IS FOLDED IN HERE ON PURPOSE. Every money sentence treats "still checking" and
   * "could not resolve" identically — both say nothing — so the seven branches below stay
   * three-way and only the two LABELS (the rail step and the wallet chip) tell them apart.
   */
  const unresolvedModel = modelView === 'unresolved' || modelView === 'loading'
  const cols = board?.columns
  // Worklist lookups. The list is already urgency-sorted by the API, so we only filter here.
  const workById = (work ?? []).reduce<Record<string, WorkRow>>((m, r) => { m[r.id] = r; return m }, {})
  // ⛓️ 4 Sep (UI-009) — `needsYouCount`, `orderedClients`, `proofReviewClients` and
  // `visibleClients` MOVED WITH THE LIST THEY FILTERED, to `components/vida/VidaClients.tsx`.
  // Every rule went with them unchanged, including PR2's: a proof review keeps its client on
  // the list even though the worklist puts an unfunded prospect at `actor: 'them'`.
  const selectedWork = selected ? workById[selected] : undefined

  const alertsByClient = alerts.reduce<Record<string, Alert[]>>((m, a) => {
    (m[a.client_id] ||= []).push(a); return m
  }, {})
  /**
   * ⚑ 18 Sep (J22-C2 · PV 11 C) — A HELD REPLY WITH NO CANDIDATE BELONGS TO NOBODY, SO IT
   * SHOWS WHEREVER THE OPERATOR IS.
   *
   * 🛑 THE FEED IS GROUPED BY CLIENT, so a row the server sends with `client_id: ''` — a
   * retained reply whose candidates are unknown, or are all demo/House accounts filtered out
   * of the feed — lands in a bucket no selection ever opens. It was reachable only by reading
   * the table by hand, which is not a control.
   *
   * ⚠️ AND IT SHOWS WITH NO CLIENT SELECTED TOO. It is real work that is not about a client;
   * hiding it until somebody picks one would be the same invisibility with an extra step.
   */
  const unassignedHolds = alertsByClient[''] ?? []
  const myAlerts = selected
    ? [...(alertsByClient[selected] ?? []), ...unassignedHolds]
    : unassignedHolds
  const unansweredAsks = (asks ?? []).filter(a => a.answers.length === 0).length

  // ── ⚑ 9 Sep · THE CLIENTS WORKSPACE BODY ────────────────────────────────────────────
  //
  // 🛑 THE SERVER'S VERDICT, RENDERED. `lc` is what `deriveLifecycle` decided from facts this
  // browser does not hold; `copy` turns it into the three columns. Nothing here re-derives a
  // stage, and no control appears because a component thought it should.
  const lc = prog?.lifecycle ?? null
  /**
   * ⚑ 11 Sep (C40) — what `GET /operator/proof-review/:clientId/evidence` answers.
   *
   * ⚠️ SNAKE_CASE BECAUSE IT IS THE WIRE SHAPE, mapped once into the copy module's camelCase
   * input below. Two spellings in one file is how a field quietly stops being read.
   */
  type CalibrationEvidence = {
    /**
     * ⚑ 13 Sep (R1) — WHOSE EVIDENCE THIS IS. The server has always sent it; this type did not
     * declare it, so nothing ever compared the evidence's owner to the selected client — and a
     * late response for another client could be read, and acted on, as if it were theirs.
     */
    client_id?: string | null
    why: string | null
    passes_done: number
    phone: string | null
    contact_name: string | null
    phone_confirmed_at: string | null
    operator_note: string | null
    resolved_at: string | null
    may_restart: boolean
    may_restart_why: string | null
    what_changed: string | null
    restart_at: string | null
    restart_used_at: string | null
    attempts: { pass: number; kind?: string | null; surfaced: number; looksRight: number
                notAFit: number; reason_labels?: Record<string, number>; notes?: string[] }[]
  }
  const [calib, setCalib] = useState<CalibrationEvidence | null>(null)
  const [calErr, setCalErr] = useState<string | null>(null)
  const [calBusy, setCalBusy] = useState<string | null>(null)

  // ── ⚑ 16 Sep (MVP1 · A2) — THE TAB THAT IS ACTUALLY SHOWN ─────────────────────────────
  //
  // 🛑 WITHHOLDING A TAB WITHOUT REDIRECTING IT RENDERS A BLANK WORKSPACE. Switching from a
  // programme client sitting on People to a Proof client would leave People selected and
  // invisible: no strip button, no pane, no explanation.
  //
  // ⚠️ `tab` IS NOT REWRITTEN. The operator's actual selection is preserved, so moving back to
  // a programme client returns them to the tab they were on rather than to ICP. Only what is
  // RENDERED is resolved.
  const shownTab = resolveCockpitTab(tab, {
    stage: lc?.verdict.stage ?? null, needsYou: lc?.verdict.needsYou ?? null,
  })

  const lcCopy = useMemo(() => {
    if (!lc) return null
    return lifecycleCopy({
      clientName: selectedName || selectedClient?.company_name || 'This client',
      state: lc.verdict.state,
      mode: lc.verdict.mode,
      counts: lc.counts,
      programme: lc.programme,
      replyAwaiting: lc.replyAwaiting,
      stoppedDetail: lc.stoppedDetail,
      humanBlockers: lc.humanBlockers,
      killSwitchOff: lc.killSwitchOff,
      operatorRunEnabled: lc.operatorRunEnabled,
      senderSendable: lc.senderSendable,
      senderDetail: lc.senderDetail ?? null,
      // ⚑ 11 Sep (DAY 3 HOLD) — THE FROZEN PACKAGE, so this panel reads the SAME persisted
      // truth Milla does. Without this leg the copy module's `frozenPackage` branches never
      // fire and the panel falls back to live counts — which is the defect, not the fallback:
      // the fallback is correct only where there is genuinely no package yet.
      frozenPackage: lc.frozenPackage ?? null,
      // ⚑ 18 Sep (J12-C4 · PV 09 B) — CAPACITY, AND IT IS PASSED ON EVERY STAGE. An Apollo
      // credit stop is one fact about the company, so it belongs on the panel of the client
      // an operator is about to take a first payment from, not only on the one whose run hit
      // it. Absent reads as "not supplied" and prints nothing; `unknown` prints, because a
      // queue we could not read is not a queue that said everything is fine.
      providerCapacity: lc.providerCapacity ?? null,
      // ⚑ MVP1 (C03) — the last leg of the plumbing. `vida-lifecycle-copy.ts` has read this
      // since it was written; this call site never passed it, so all three of its branches
      // fell through to "Being agreed" / "Not stated yet" for every client in the book.
      outcomeStated: lc.outcomeStated ?? null,
      // ⚑ 16 Sep (MVP1 · A1b) — WHY the Proof set came out empty, from the gate's own
      // persisted reasons. A Needs-you with no evidence is an alarm, not a task: without this
      // leg the panel could only say "we produced nothing" and send the operator to the
      // database to find out which criterion did it.
      proofException: lc.proofException ?? null,
      // ⚑ 16 Sep (MVP1 · E1) — THE VERDICT, NOT THE RULE. The panel draws Complete on this
      // boolean alone; the eligibility test stays in `lib/programme.ts` where it is the only
      // copy. Absent reads as "no control", which is the safe direction for a terminal action.
      mayComplete: prog?.programme
        ? { allowed: prog.programme.may_complete === true,
            reason: prog.programme.complete_blocked_reason ?? undefined }
        : null,
      // ⚑ 11 Sep (C40) — the last leg of THIS plumbing, and the same defect as `outcomeStated`
      // one line above: the copy module has read `calibration` since it was written and no
      // call site ever passed one, so every escalated client rendered with no attempt history,
      // no phone, no note and no restart verdict.
      calibration: calib ? {
        why: calib.why ?? null,
        passesDone: calib.passes_done ?? 2,
        phone: calib.phone ?? null,
        contactName: calib.contact_name ?? null,
        phoneConfirmedAt: calib.phone_confirmed_at ?? null,
        operatorNote: calib.operator_note ?? null,
        // 🛑 ⚑ 13 Sep (R1) — OWNERSHIP FIRST, AUTHORITY SECOND. `may_restart` is the server's
        // verdict about the client the evidence DESCRIBES; offering it while a different client
        // is selected is how "read A, grant B" happened. Evidence that is not provably the
        // selected client's authorises nothing.
        mayRestart: calib.may_restart === true && calibrationActionable(calib, selected ?? null),
        mayRestartWhy: calib.may_restart_why ?? null,
        restartAt: calib.restart_at ?? null,
        restartUsedAt: calib.restart_used_at ?? null,
        resolvedAt: calib.resolved_at ?? null,
        attempts: (calib.attempts ?? []).map((a: CalibrationEvidence['attempts'][number]) => ({
          pass: a.pass,
          // ⚠️ PROVENANCE, NOT A PASS NUMBER. Legacy rows carry no kind and are automatic.
          kind: a.kind === 'calibrated_restart' ? 'calibrated_restart' as const : 'automatic' as const,
          surfaced: a.surfaced, looksRight: a.looksRight, notAFit: a.notAFit,
          reasonLabels: a.reason_labels ?? {}, notes: a.notes ?? [],
        })),
        whatChanged: calib.what_changed ?? null,
        unreadable: false,
      } : calErr ? {
        // 🛑 C43 — WE COULD NOT READ THE AUTHORITY. Everything is unknown, so nothing is
        // offered: `mayRestart` false, no history claimed, and the operator is told why.
        why: null, passesDone: 2, phone: null, contactName: null, phoneConfirmedAt: null,
        operatorNote: null, mayRestart: false, mayRestartWhy: calErr, restartAt: null,
        restartUsedAt: null, resolvedAt: null, attempts: [], whatChanged: null, unreadable: true,
      } : null,
    })
  }, [lc, selectedName, selectedClient?.company_name, calib, calErr])

  /**
   * ⚑ 9 Sep — THE ACCOUNT CARD, AND IT EXISTS BECAUSE THE ROW STOPPED CARRYING THESE.
   *
   * 🛑 TWO FOUNDER RULES MET AT ONCE. The approved client row is *name · stage · needs you* —
   * "NO giant metrics in list rows" — so the VAT-evidence badge and the cold Suspended /
   * Going-quiet state came off it. But #615's lesson is the opposite one: `vatBadge` shipped
   * and NOTHING rendered it, so "no tax ID" was a fact an operator could only find by opening
   * the client. Neither is rendered anywhere else in this console, so deleting them from the
   * row alone would have deleted them from the product.
   *
   * ⚠️ IT APPEARS ONLY WHEN THERE IS SOMETHING TO SAY. A healthy account draws no card, so
   * every state that the founder previewed looks exactly as previewed; the card is an
   * exception surface, not a permanent panel.
   */
  // ══════════════════════════════════════════════════════════════════════════════════════
  // ⚑ 22 Sep — THE POOL THIS CLIENT'S TARGETING CARRIES, AND HOW IT WAS ARRIVED AT
  //
  // 🛑 THE OPERATOR GETS BOTH CAPACITY NUMBERS (founder-ruled 22 Sep). The client is told what
  // we can commit to at the limit; Vida also gets the benchmark and the gap between them,
  // because the distance between the rate we expect and the point we stop is only useful to
  // the people who can act on it. The client's own route returns neither, and a guard asserts
  // that — reaffirmed 23 Sep: *"i said 400 internally. we dont disclose this."*
  //
  // ⛓️ 23 Sep — THAT GAP IS NOT A BUFFER. It used to name work we would absorb past the plan;
  // the founder removed that promise, so it now only says how much further a programme may run.
  //
  // ⚠️ IT IS ITS OWN READ, DELIBERATELY. `lifecycle` is the panel's spine and is fetched on a
  // rail refresh; this costs a free provider round trip and belongs on selection rather than
  // on every poll. A failed read leaves the cards out rather than rendering zeros — "0 people,
  // 0 meetings" about a client's market is a much worse sentence than saying nothing.
  const [lcCapacity, setLcCapacity] = useState<{
    matched: number; excluded: number; already_worked: number; set_aside: number
    workable: number; committed: number; benchmark: number; headroom: number; known: boolean
    from_pool?: number | null
  } | null>(null)
  useEffect(() => {
    let alive = true
    setLcCapacity(null)
    if (!selected) return
    void (async () => {
      try {
        const j = await fetch(`/api/proxy/operator/clients/${selected}/capacity`).then(r => r.json())
        if (!alive) return
        setLcCapacity(j?.success ? (j.data ?? null) : null)
      } catch { /* silent — the cards simply do not render */ }
    })()
    return () => { alive = false }
  }, [selected])

  /**
   * ⚑ 22 Sep — the locked Vida header for this client: where the brief is, whether anything is
   * owed, what has been spent.
   *
   * ⚠️ THE `needsYou` HERE IS THE SERVER'S VERDICT, not a local reading. The whole point of
   * "normal is silent" is that an operator can trust the quiet state, and a second opinion
   * computed in the browser is exactly how that trust goes.
   */
  const lcChips = useMemo(() => {
    if (!lc) return undefined
    return stageChips({
      // ⚠️ A CLIENT ROW HAS NO BRIEF DRAFT — the eleven facts belong to the pre-confirm stage
      // and the Brief panel shows them there. `null` means "not applicable here", and the chip
      // reads as unread rather than as zero, which is the honest shape for a fact this surface
      // genuinely does not hold.
      brief: null,
      spendUsd: null, records: null, batches: null,
      needsYou: lc.verdict.needsYou === true,
    // ⛓️ 24 Sep (R145 step 7 · #41) — WAS `.filter(c => !c.text.startsWith('Brief'))` alone, so a
    // client row printed "Spend — could not be read" about a figure this surface never tries to
    // read (`spendUsd: null` above means "not applicable here", not a failed read). A claim of a
    // failed read that never happened is the false Spend label; it is left off, like the Brief chip.
    }).filter(c => !c.text.startsWith('Brief') && !c.text.startsWith('Spend'))
  }, [lc])

  /**
   * ⚑ 22 Sep — the Proof-stage evidence: what the pool carries and how it got there.
   *
   * 🛑 "SET ASIDE" IS THE LINE THAT MATTERS AND IT IS EXPECTED TO READ ZERO. Seniority, size
   * and geography are enforced by the provider filter and never re-judged; category and
   * company type are judged but only RANK. A non-zero means something started removing people
   * again — the defect that emptied the Proof screen — and `workablePoolCard` renders it as an
   * exception rather than a footnote.
   */
  const lcProofCards = useMemo(() => {
    if (!lc || lc.verdict.stage !== 'proof') return []
    const cards = [nextActionCard('proof', { needsYou: lc.verdict.needsYou === true })]
    if (lcCapacity?.known) {
      const p = {
        matched: lcCapacity.matched, excluded: lcCapacity.excluded,
        alreadyWorked: lcCapacity.already_worked, setAside: lcCapacity.set_aside,
        workable: lcCapacity.workable, committed: lcCapacity.committed,
        // ⛓️ 24 Sep (R145 step 7 · #84) — was `null` ("not supplied rather than guessed"). The
        // capacity route now counts it, by the same rule the client's desk labels "From our
        // pool". A failed count is still `null`, which still prints nothing.
        fromPool: lcCapacity.from_pool ?? null,
      }
      cards.push(workablePoolCard(p), provenanceCard(p))
      cards.push({
        kind: 'stats' as const,
        label: 'Sellable cap',
        stats: [
          { value: String(lcCapacity.committed), label: 'committed · worst case' },
          { value: String(lcCapacity.benchmark), label: 'at the benchmark' },
          { value: String(lcCapacity.headroom), label: 'headroom — ours, never theirs' },
        ],
      })
    }
    return cards
  }, [lc, lcCapacity])

  const accountCard = useMemo(() => {
    if (!selectedClient) return null
    const vat = vatBadge({ vat_number: selectedClient.vat_number ?? null })
    const cold = selectedWork?.cold
    const notes: string[] = []
    if (vat.tone === 'amber') notes.push(`No VAT evidence on file (${vat.label}).`)
    // #619 — the API applies the exemption, so these cannot fire on an exempt account, and an
    // exempt one is stated as exempt rather than as a red flag.
    if (cold?.cold) notes.push('Suspended — this account has gone cold.')
    else if (cold?.warn) notes.push('Going quiet — nothing has moved here for a while.')
    if (notes.length === 0) return null
    return { kind: 'note' as const, label: 'Account', body: notes.join(' ') }
  }, [selectedClient, selectedWork])

  /**
   * The one action a state offers, routed to the capability that already exists.
   *
   * ⚠️ NOTHING NEW IS INVENTED HERE. Every branch is an existing route or an existing screen:
   * the preparation retry, go-live, the operator run-once, the reply and booking surfaces, and
   * the mailbox page. A lifecycle panel that reached for a route nobody had built would be a
   * button that fails in front of a client's programme.
   */
  // ── ⚑ 11 Sep (C40 / C43) — THE CALIBRATION EVIDENCE, AND THE TWO REAL ACTIONS ────────
  //
  // 🛑 WHAT WAS MISSING. `vida-lifecycle-copy.ts` has read a `calibration` block since it was
  // written and NOTHING EVER FETCHED ONE, so every escalated client rendered with `cal = null`
  // — no attempt history, no phone, no note — and the panel's two controls
  // (`contact_recalibrate`, `restart_proof_calibrated`) fell through `onLifecycleAction`'s
  // `default: return` and did nothing at all. That is C40: buttons with no server authority
  // behind them, on the one screen that decides whether a client gets another paid set.
  //
  // ⚠️ THE AUTHORITY IS THE SERVER'S, AND THIS ONLY RENDERS IT. `may_restart` comes from
  // `mayRestartCalibrated` — the same function the restart ROUTE re-checks before it grants —
  // so hiding the control is a courtesy and the refusal is the control. Nothing here grants,
  // infers or optimistically assumes an authority.
  //
  // ⚠️ AND AN UNREADABLE STATE SHOWS NO RESTART (C43). `calErr` is surfaced and `calib` stays
  // null, which makes `mayRestart` false everywhere downstream: unknown authority means no
  // spend, and the operator is told rather than shown a control that may not work.
  // ── 🛑 ⚑ 13 Sep (R1) — CALIBRATION EVIDENCE BELONGS TO ONE CLIENT ───────────────────
  //
  // ⛓️ WHAT STOOD HERE: ~~`setCalib(j.data as CalibrationEvidence)`~~ — unguarded. A slow read
  // for client A could land AFTER the operator selected B and write A's evidence into B's
  // view, while `resolveCalibration(selected)` and `grantCalibratedRestart(selected)` target
  // B. That is "read A → click → grant B a calibrated restart", on spend-bearing authority.
  //
  // 🛑 A RESET ALONE WOULD NOT HAVE FIXED IT. Clearing on switch closes the transient window
  // and nothing else: the late A response still arrives afterwards and writes itself into the
  // now-empty B view. All three protections are required, and `acceptCalibrationResponse`
  // asks all three — GENERATION (is this request still the current one), SELECTION (was it
  // issued for the client we are on), IDENTITY (does the SERVER say this evidence is theirs).
  //
  // ⚠️ THE GENERATION LIVES IN A REF, not state: it must be readable by a promise that
  // resolves long after the render it was issued from, and bumping it must not re-render.
  const calGen = useRef(0)
  const loadCalibration = useCallback(async (clientId: string) => {
    const generation = calGen.current
    setCalErr(null)
    try {
      const j = await fetch(`/api/proxy/operator/proof-review/${encodeURIComponent(clientId)}/evidence`)
        .then(r => r.json())
      const payload = (j?.data ?? null) as (CalibrationEvidence | null)
      // ⛓️ 13 Sep — THE ORDER OF THESE QUESTIONS IS THE FIX. The first cut asked OWNERSHIP
      // before it asked whether the request had even SUCCEEDED, so a current read that came
      // back `{ success: false, error: … }` carried no `data.client_id`, was classified
      // `unowned`, and returned SILENTLY: the operator watched an escalated client go blank
      // instead of being told their state could not be read. Fail-closed, and mute.
      const outcome = decideCalibrationResponse({
        requestedClientId: clientId,
        payloadClientId:   payload?.client_id ?? null,
        selectedClientId:  selectedRef.current,
        requestGeneration: generation,
        currentGeneration: calGen.current,
        apiSuccess:        j?.success === true,
        apiError:          typeof j?.error === 'string' ? j.error : null,
      })
      // ⚠️ A DISCARD IS SILENT AND CHANGES NOTHING — a response for a client we have left is
      // not a failure, it is simply not ours, and printing its error under the current client
      // is exactly what the stale-request rule forbids.
      if (outcome.action === 'discard') return
      // ⚠️ A FAILURE IS CURRENT AND OURS: clear the view and SAY SO. This covers the API's own
      // refusal, a payload with no owner, and one the server attributes to somebody else.
      if (outcome.action === 'fail') {
        setCalib(null)
        setCalErr(outcome.message ?? CALIBRATION_READ_FAILED_COPY)
        return
      }
      setCalib(payload)
    } catch (e) {
      // 🛑 FAIL CLOSED AND SAY SO. Leaving a stale `calib` in place would keep a restart
      // control on screen that the server may no longer authorise.
      // ⚠️ BUT ONLY FOR THE CURRENT REQUEST — an older read's failure must not blank the view
      // that a newer one has already filled.
      if (calGen.current !== generation) return
      setCalib(null)
      setCalErr(e instanceof Error ? e.message : 'The calibration state could not be read')
    }
  }, [])

  useEffect(() => {
    // 🛑 PROTECTION 1 — IMMEDIATE RESET, AND IT INVALIDATES EVERY REQUEST IN FLIGHT. The bump
    // happens before anything else in this effect, so a response issued for the previous
    // client can no longer be accepted whatever order it arrives in.
    calGen.current += 1
    setCalib(null); setCalErr(null); setCalBusy(null)
    if (!selected) return
    // ⚠️ ONLY FOR THE STATE THAT HAS ONE. Every healthy client would otherwise 500 its way
    // through an endpoint that exists to describe a failure.
    if (lc?.verdict.state !== 'proof_calibration_failed') return
    void loadCalibration(selected)
  }, [selected, lc?.verdict.state, loadCalibration])

  /**
   * Record that a human calibrated this client. The ONLY thing that unlocks the one restart.
   *
   * ⚠️ IT IS A REAL PERSISTED ACT, NOT A UI STATE CHANGE. The route writes
   * `proof_review_resolved_at`, the operator's identity and the note, refuses against a client
   * who never validly escalated, and writes an audit row. This reads the canonical state back
   * afterwards rather than assuming its own press worked.
   */
  const resolveCalibration = useCallback(async (clientId: string, note: string) => {
    setCalBusy('contact_recalibrate'); setCalErr(null)
    try {
      const j = await fetch(`/api/proxy/operator/proof-review/${encodeURIComponent(clientId)}/resolve`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The resolution could not be recorded')
      setSaveMsg(notice.ok(j.data?.resolved === 'resolved'
        ? 'Calibration recorded. One calibrated restart is now available.'
        : 'This calibration was already recorded.'))
    } catch (e) {
      setSaveMsg(notice.error(e instanceof Error ? e.message : 'The resolution could not be recorded'))
    } finally {
      setCalBusy(null)
      await loadCalibration(clientId)
    }
  }, [loadCalibration])

  /**
   * Grant the ONE calibrated restart. It grants; it does not run.
   *
   * ⚠️ THE SERVER RE-CHECKS EVERYTHING. Two automatic attempts spent, a real escalation, a
   * recorded resolution with a note, and no restart already granted against it. Pressing this
   * without those answers 400/409 and nothing is granted — which is why hiding the button is
   * not the boundary.
   */
  const grantCalibratedRestart = useCallback(async (clientId: string) => {
    setCalBusy('restart_proof_calibrated'); setCalErr(null)
    try {
      const j = await fetch(`/api/proxy/operator/proof-review/${encodeURIComponent(clientId)}/restart`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The calibrated restart could not be granted')
      setSaveMsg(notice.ok('One calibrated Proof set is available to this client. The two automatic attempts are not reset.'))
    } catch (e) {
      setSaveMsg(notice.error(e instanceof Error ? e.message : 'The calibrated restart could not be granted'))
    } finally {
      setCalBusy(null)
      await loadCalibration(clientId)
    }
  }, [loadCalibration])

  const onLifecycleAction = useCallback(async (key: PanelAction['key'], ceiling?: number, note?: string) => {
    switch (key) {
      // The safe continuation: it prepares what is missing and re-freezes. Already-checked
      // prospects are skipped, which is why the panel can promise the retry costs nothing.
      case 'try_again': return void lifecycle('ready-for-approval', 'Try again')
      case 'make_live': return void lifecycle('go-live', 'Make live')
      // ⛓️ 16 Sep (MVP1 · D1) — THE CANONICAL RUN, not the send-once tool. See `runProgramme`.
      // `ceiling` is deliberately ignored here: Run grants authority and sends nothing, so it
      // has no ceiling to obey. Send-once keeps its own control and its own ceiling.
      case 'run': return void runProgramme()
      // Existing surfaces, opened in place rather than duplicated into this panel.
      case 'handle_reply': setToolsOpen(true); setTab('Inbox'); return
      case 'book_call': setToolsOpen(true); setTab('Bookings'); return
      // 🛑 THE MAILBOX LIVES ON ITS OWN PAGE, and this sends the operator there rather than
      // growing a second inbox editor inside the client workspace.
      case 'reconnect_mailbox': window.location.href = '/vida/engine'; return
      // ⚠️ PAUSE IS NOT A LADDER TRANSITION, so it does not go through `lifecycle()`. That
      // helper carries the six approved DRAFT→LIVE moves and their money-bearing confirmations;
      // a seventh action inside it would widen a boundary a guard deliberately holds at six.
      case 'pause_programme': return void pauseProgramme()
      // ── ⚑ 11 Sep (C40) — THE TWO CALIBRATION ACTIONS, WIRED TO REAL AUTHORITIES ───────
      //
      // 🛑 THESE FELL THROUGH `default: return` AND DID NOTHING. The panel drew them, the
      // operator pressed them, and no request was made — on the one screen that decides
      // whether a client gets another paid set.
      // 🛑 ⚑ 13 Sep (R1) — ASKED AGAIN AT THE PRESS. The selection can change between the
      // render that drew this control and the click that fires it, so the render-time gate is
      // not the boundary — this is. Stale evidence submits nothing.
      case 'contact_recalibrate':
        if (!selected) return
        if (!calibrationActionable(calib, selected)) return
        // ⚠️ THE NOTE COMES FROM THE PRESS, not from a field this component also keeps. One
        // copy of the operator's sentence, held where it is typed.
        return void resolveCalibration(selected, (note ?? '').trim())
      case 'restart_proof_calibrated':
        if (!selected) return
        if (!calibrationActionable(calib, selected)) return
        return void grantCalibratedRestart(selected)
      // ── ⚑ 11 Sep (DAY 3) — THE ONE APPROVAL-STAGE CONTROL ────────────────────────────
      //
      // 🛑 IT IS THE REMEDY FOR A RULE THAT HAD NONE. A package that moved under a reviewing
      // client made every approval press refuse and nothing could issue a new version, so the
      // client sat on a dead button. This publishes one — and approves nothing.
      case 'refreeze_package': return void refreezePackage()
      // ── ⚑ 16 Sep (MVP1 · A1b) — RETRY PROOF AFTER WE PRODUCED NOTHING ────────────────
      //
      // 🛑 THE CONTROL THE STATE HAD NO WAY TO OFFER. A zero-eligible Proof run tells the
      // client their setup is saved and flagged for K.I.N.D review, and releases their
      // attempt — and until now an operator who corrected the targeting had nowhere to press.
      //
      // ⚠️ IT SPENDS NOTHING NEW. The failed run released the claim, so the ladder hands back
      // the attempt the client already had. Nothing here counts anything: the server claims
      // through `claimProofAuthority` exactly as the client's own route does.
      case 'retry_proof': return void retryProof()
      // ── ⚑ 16 Sep (MVP1 · E1) — CLOSE THE PROGRAMME ───────────────────────────────────
      //
      // 🛑 THE SIXTH STAGE HAD NO BUTTON. `completeProgramme` and its audited route existed
      // and nothing in the product could reach them. This calls the EXISTING route and adds
      // no completion logic of its own.
      case 'complete_programme': return void completeProgramme()
      // ── ⚑ 19 Sep (R135) — THE TARGETING REVIEW HAD A CARD, A STATE AND A DEAD BUTTON ──
      //
      // 🛑 THE THIRD SURFACE OF THE SAME DEADLOCK. `proof_awaiting_translation` was built on
      // 18 Sep so a client parked for translation reads as a Needs-you instead of a calm
      // Proof card, and the card carries a `Resolve targeting` control — which fell through
      // `default: return` below and did nothing. So the panel finally SAID somebody was
      // blocked and still gave the operator no way to act, which is C40 exactly: a button
      // with no server authority behind it is worse than no button, because it reads as done.
      //
      // ⚠️ IT NAVIGATES RATHER THAN POSTING, AND THAT IS THE HONEST WIRING. Resolving a
      // review is not a one-click act: `POST /operator/icp-review/:icpId/resolve` requires the
      // operator's MAPPING of the client's own unmapped words onto provider vocabulary, and
      // re-canonicalises everything they send. That editor already exists and is already
      // mounted — `IcpReviewPanel` on `/cockpit`. This takes them to it, exactly as
      // `reconnect_mailbox` hands off to the engine screen, instead of growing a second
      // review editor inside the client workspace.
      case 'resolve_icp_review': window.location.href = '/cockpit'; return
      default: return
    }
  }, [lifecycle, runProgramme, pauseProgramme, refreezePackage, retryProof, completeProgramme, selected, calib, resolveCalibration, grantCalibratedRestart])


  // ── ⛓️ 24 Sep (R145 · founder: *"you have done a screen in a screen"*) — THE CLIENT'S CONTEXT
  // MOVED OUT OF VIDA'S CHAT COLUMN. It was a second screen stacked above the conversation — the
  // client header and its chips, "you're working X", the Needs-you alerts, what they still owe
  // us, and the pipeline — so the right column read as a console with a chat squeezed under it.
  // The redesign draws that column as Vida's conversation alone, and every fact in the middle.
  // Nothing was removed: the same blocks, the same handlers, now inside the operator panel.
  const clientContext = (
    <>
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
                    title={cockpit.onboarding.missing.length
                      ? `They still have not told us: ${cockpit.onboarding.missing.join(', ')}`
                      : 'They have told us everything'}>
                    {/* ⚑ 14 Sep (R121, Build 4) — THE CLIENT'S BRIEF, COUNTED THE ONE WAY.
                        It read 88% from our own eight checks while the SIGNING UP rail beside
                        it read "11 of 11 collected" from the Brief — two answers, one client,
                        neither saying which question it was answering. This is what the CLIENT
                        has told us; what WE still owe them is `go_live` below. */}
                    {/* ⛓️ 16 Sep (MVP1 · F3) — AND THE FALLBACK WAS THE DEFECT SURVIVING.
                        ~~`: `${cockpit.onboarding.percent}%``~~ — under the label "Brief",
                        that renders OUR eight go-live checks as the CLIENT's eleven-fact
                        count. It is the exact competing answer R121 Build 4 closed, still
                        live in the branch nobody looks at.
                        ⚠️ AN UNREADABLE COUNT NOW SAYS SO. Borrowing a different question's
                        number is worse than admitting we could not read this one. */}
                    Brief {cockpit.onboarding.brief
                      ? `${cockpit.onboarding.brief.count}/${cockpit.onboarding.brief.total}`
                      : '—'}
                  </span>
                )}
                {/* ── ⚑ 16 Sep (MVP1 · F3) — AND OUR OWN CHECKS, UNDER THEIR OWN NAME ──────
                    🛑 THEY WERE COMPUTED, SHIPPED AND TYPED, AND NEVER RENDERED. `go_live` has
                    been in this payload since R121 Build 4, and the comment above it says
                    *"what WE still owe them is `go_live` below"* — there was no below. The
                    only place our eight checks ever surfaced was as the FALLBACK inside the
                    Brief chip, i.e. wearing the client's label.

                    The founder's boundary, verbatim: *"Keep go-live checks where they
                    legitimately belong under their own name."* This is that name. Two chips,
                    two questions, neither borrowing the other's number. */}
                {cockpit && (
                  <span className={`shrink-0 text-[12.5px] font-bold rounded-full px-2.5 py-1 ${cockpit.onboarding.go_live.percent === 100 ? 'text-emerald-700 bg-emerald-50' : 'text-[#5c5279] bg-[#f6f3fb]'}`}
                    title={cockpit.onboarding.go_live.missing.length
                      ? `We still owe them: ${cockpit.onboarding.go_live.missing.join(', ')}`
                      : 'Everything on our side is ready'}>
                    Go-live {cockpit.onboarding.go_live.percent}%
                  </span>
                )}
                {/* ⚑ 3 Sep (C2) — THE WALLET IS STILL SHOWN, AND IT NO LONGER IMPLIES A MODEL.
                    This chip stated a balance in the same weight and colour for every client,
                    on a header the operator reads before every action — so for a programme
                    client it silently answered "how does this account pay?" with the legacy
                    answer. The number stays (it is a real stored balance, and a programme
                    client can still hold one from before); what it no longer does is stand
                    unqualified beside an account the wallet does not govern. */}
                {(() => {
                  // ⚠️ THE CHIP IS QUALIFIED FOR EVERY MODEL THAT IS NOT LEGACY, and that
                  // includes UNRESOLVED. The first cut qualified only `programme` and
                  // `compat_programme`, so a client whose model could not be resolved — the
                  // declared-legacy-with-an-open-programme conflict — was shown an ordinary
                  // purple balance beside a red panel saying nothing is authorised. An
                  // unqualified balance IS a claim that it is spendable, and "we could not
                  // tell" must never render as that claim.
                  // ⛓️ CORRECTED 3 Sep — ~~"$1,200 wallet · not used".~~ FOUNDER-RULED STILL
                  // AMBIGUOUS: "not used" reads as a temporary state of a live wallet, not as a
                  // closed one. The balance is HISTORY on a programme account — a real number
                  // from the model they are no longer on — and the label now says exactly that.
                  // The word "wallet" moves behind "historical" so the first thing read is what
                  // kind of number it is.
                  //
                  // ⚠️ NOTHING IS DELETED OR ZEROED. The balance is rendered in full; the ledger
                  // is untouched. What changed is one word of framing.
                  // ⛓️ NOW READ FROM `modelView`, not from a second copy of the same question.
                  // The chip derived its own `r === 'unreadable'` while the rest of the console
                  // used `modelView`, so the two could disagree — and they DID: a loading or
                  // field-missing response left the chip fully active while every other sentence
                  // had already gone neutral. One derivation, one answer.
                  const programmeWallet  = modelView === 'programme'
                  const unresolvedWallet = modelView === 'unresolved'
                  const loadingWallet    = modelView === 'loading'
                  const muted = programmeWallet || unresolvedWallet || loadingWallet
                  return (
                    <span
                      title={programmeWallet
                        ? 'Historical. This client is on the programme model, so the wallet gates nothing — not sourcing, not sending, not enrolment. The balance is shown because it is real, not because it applies.'
                        : unresolvedWallet
                          ? 'The commercial model for this client could not be resolved, so whether this balance governs anything is unknown. Nothing is authorised until an operator resolves it.'
                          : loadingWallet
                            ? 'Still reading this client’s commercial model. Until it is known, no claim is made about whether this balance applies.'
                            : 'Wallet balance'}
                      className={`shrink-0 text-[12.5px] rounded-full px-2.5 py-1 ${cockpit ? '' : 'ml-auto'} ${
                        muted ? 'font-semibold text-[#a9a2bd] bg-[#f5f4f8] border border-[#e8e5ef]' : 'font-bold text-[#7C3AED] bg-[#f3ecff]'}`}>
                      {programmeWallet
                        ? `$${(selectedClient?.wallet_balance_usd ?? 0).toLocaleString()} historical wallet · inactive`
                        : unresolvedWallet
                          ? `$${(selectedClient?.wallet_balance_usd ?? 0).toLocaleString()} wallet · model unresolved`
                          : loadingWallet
                            ? `$${(selectedClient?.wallet_balance_usd ?? 0).toLocaleString()} wallet · checking…`
                            : `$${(selectedClient?.wallet_balance_usd ?? 0).toLocaleString()} wallet`}
                    </span>
                  )
                })()}
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
                        onClick={() => setTab(a.kind === 'replies' || a.kind === 'reply_unattributed' ? 'Inbox' : a.kind === 'no_campaign' ? 'Campaign' : 'ICP')}
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
                      {/* ⚑ 17 Sep — the two ways an unattributable reply becomes decided.
                          Same chip language as every alert beside it; no modal, no new
                          section. The destructive one is visually separate and says
                          "Discard reply" rather than "Not ours" — with several candidate
                          clients, "not ours" is ambiguous in exactly the way the alert is. */}
                      {a.kind === 'reply_unattributed' && (
                        <>
                          <button
                            onClick={() => actOnUnattributedReply(a, 'resolve')}
                            disabled={proofBusy === a.unattributed_reply_id}
                            className="text-[12px] font-semibold text-white bg-[#9d174d] border border-[#9d174d] rounded-full px-2 py-0.5 hover:bg-[#EC4899] disabled:opacity-50">
                            {proofBusy === a.unattributed_reply_id ? 'Working…' : 'Attribute to this client'}
                          </button>
                          <button
                            onClick={() => actOnUnattributedReply(a, 'discard')}
                            disabled={proofBusy === a.unattributed_reply_id}
                            className="text-[12px] font-semibold text-[#7f1d1d] bg-white border border-[#fca5a5] rounded-full px-2 py-0.5 hover:border-[#dc2626] disabled:opacity-50">
                            Discard reply
                          </button>
                        </>
                      )}
                      {/* ⚑ 18 Sep (J22-C2 · PV 11 C) — THE SAME TWO DECISIONS FOR A HOLD THAT
                          NAMES NO CANDIDATE. The reply is real and somebody is waiting on it;
                          what is missing is a client to offer, so the operator's own selection
                          is the answer and the button says so. Attributing with nothing
                          selected would be an action with no subject, and it is refused in the
                          handler as well as disabled here. */}
                      {a.kind === 'reply_unattributed_unknown' && (
                        <>
                          {/* 🛑 RE-CHECK FIRST, AND IT IS THE ONLY ONE THAT CAN FILL THE GAP.
                              This hold has no candidates because the lead lookup FAILED while
                              the reply was arriving, and the attribution route refuses any
                              client outside the stored candidates — correctly. Asking the
                              question again is evidence; naming a client by hand would be the
                              guess that guard exists to stop. */}
                          <button
                            onClick={() => recheckUnattributedReply(a)}
                            disabled={proofBusy === a.unattributed_reply_id}
                            title="Re-run the lead lookup that failed when this reply arrived"
                            className="text-[12px] font-semibold text-[#9d174d] bg-white border border-[#fbcfe8] rounded-full px-2 py-0.5 hover:border-[#EC4899] disabled:opacity-50">
                            {proofBusy === a.unattributed_reply_id ? 'Working…' : 'Re-check who it belongs to'}
                          </button>
                          <button
                            onClick={() => actOnUnattributedReply(a, 'resolve')}
                            disabled={proofBusy === a.unattributed_reply_id || !selected}
                            title={selected
                              ? 'Attribute this reply to the client selected on the left — only possible once a re-check has found candidates'
                              : 'Select the client this reply belongs to first'}
                            className="text-[12px] font-semibold text-white bg-[#9d174d] border border-[#9d174d] rounded-full px-2 py-0.5 hover:bg-[#EC4899] disabled:opacity-50">
                            {proofBusy === a.unattributed_reply_id
                              ? 'Working…'
                              : selected ? 'Attribute to the selected client' : 'Select a client to attribute'}
                          </button>
                          <button
                            onClick={() => actOnUnattributedReply(a, 'discard')}
                            disabled={proofBusy === a.unattributed_reply_id}
                            className="text-[12px] font-semibold text-[#7f1d1d] bg-white border border-[#fca5a5] rounded-full px-2 py-0.5 hover:border-[#dc2626] disabled:opacity-50">
                            Discard reply
                          </button>
                        </>
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
                  <span className="text-[12.5px] font-bold text-[#b45309]">They still owe us:</span>
                  {cockpit.onboarding.missing.map(m => {
                    const go = GAP_TAB[m] ?? null
                    return go ? (
                      <button key={m} onClick={() => setTab(go)}
                        className="text-[12px] font-semibold text-[#b45309] bg-white border border-[#fcd34d] rounded-full px-2 py-0.5 hover:border-[#b45309]">{m} &rarr;</button>
                    ) : (
                      <span key={m} className="text-[12px] font-semibold text-[#b45309] bg-white border border-[#fcd34d] rounded-full px-2 py-0.5">{m}</span>
                    )
                  })}
                  {/* ── ⚑ 14 Sep (R121, Build 4) — VIDA WRITES IT; THE OPERATOR SENDS IT ──────
                      ⛓️ THIS USED TO POST OUR FIELD LABELS AT THE CLIENT. The message was
                      built by joining `cockpit.onboarding.missing` into a sentence, so what
                      landed in their Milla thread was "could you send us: Target company type,
                      Desired outcome?" — internal column names, in a conversation, from an
                      agent who is supposed to already know them. It is the checklist leaking
                      through the one channel that was meant to be human.
                      🛑 VIDA DRAFTS IT INSTEAD, with the client's own words in front of her,
                      and the operator reads it before it goes. The channel (`/operator/ask`),
                      the thread and the confirm are all unchanged — only the words are hers. */}
                  <button
                    onClick={() => conversation.run(
                      `Draft a short message asking ${selectedClient?.company_name ?? 'this client'} for what they have not told us yet: ${cockpit.onboarding.missing.join(', ')}. Their words, not our field names.`)}
                    disabled={cockpitBusy || conversation.busy}
                    className="ml-auto text-[12.5px] font-bold text-[#b45309] underline disabled:opacity-50">Ask Vida to write it</button>
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

    </>
  )

  return (
    <div className="flex h-full min-h-0">
      {/* ── ⚑ 4 Sep (UI-009) — THE DEDICATED CLIENTS COLUMN IS GONE ─────────────────────
          🛑 IT COST THE WORKSPACE ALMOST EVERYTHING. Measured at 1440px: nav 216 + clients 380
          + Vida 540 left the cockpit 304px to render eleven tabs that need 894, so eight of
          them sat off-screen behind a scroll with no affordance and People truncated names and
          companies. At 1920 the strip was STILL clipped.

          ⚠️ MOVED, NOT DELETED. The list is a collapsible group in the operator nav
          (`components/vida/VidaClients.tsx`) with the same rows, the same actor dots, the same
          next-action sentences, the same cold and VAT and house/demo indicators, and the same
          "Needs you / All" filter. Selecting a client still scopes this console and Vida. */}
      {/* ── PIPELINE ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#fbfaff] overflow-hidden">
        {/* ── ⚑ MVP1 (Preview 07) — SOMEBODY WHO HAS SIGNED UP AND NOT CONFIRMED ────────
            🛑 THIS WORKSPACE USED TO HAVE EXACTLY ONE EMPTY STATE — "Select a client" — and
            for a person mid-brief that was the only thing Vida could say about them, because
            no `clients` row exists until they confirm.

            ⚠️ `selectedDraft` IS NOT `selected`, AND IS RENDERED ONLY WHEN `selected` IS
            NULL. The two are cleared against each other in the provider; reading BOTH here
            means the console cannot paint a client panel and a brief panel over one another
            even if that ever drifted. Nothing below this branch sees a draft id. */}
        {/* ⚑ 24 Sep (R145 step 7 · #45) — the stage bar during the Brief too: a signed-up
            draft IS at Brief, so the operator sees where the person is before a client row exists. */}
        {!selected && selectedDraft && <LifecycleRibbon stage="signup" />}
        {!selected && selectedDraft && <BriefPanel draftId={selectedDraft} />}
        {!selected && !selectedDraft && (
          <div className="flex-1 flex items-center justify-center text-[#9b8ec4] text-sm">
            Select a client on the left to work their campaign.
          </div>
        )}
        {selected && (<>
          {/* ── ⚑ 9 Sep — THE LOCKED LIFECYCLE RIBBON ────────────────────────────────
              ⛓️ WHAT THIS REPLACES: `FLOW = ['Sign up','Build plan','Approve send','Qualify',
              'Client approves','Follow-up','Book','Learn']` — eight words for OUR process,
              with nothing lit, beside a second `FLOW_STEPS` strip that lit something else.
              Two ribbons, two vocabularies, neither of them the client's lifecycle.
              🛑 READ-ONLY. A stage is where the client IS; a clickable one would invite the
              belief that an operator moves them, which is the belief this workspace removes. */}
          <LifecycleRibbon
            // ⛓️ 16 Sep (MVP1 · B1) — THE STAGE, NOT AN INDEX. `stageIndex` was 1-based into
            // the EIGHT engine stages; the ribbon now prints the canonical SIX, so the number
            // would light the wrong one from `sourcing` onwards. It projects the stage itself.
            stage={lc?.verdict.stage ?? null}
          />

          {/* THE CONSOLE: Vida (conversation) | cockpit (this client's work surfaces) */}
          <div className="flex-1 flex min-h-0">


            {/* ── COCKPIT — this client's work surfaces ── */}
            <aside className="flex-1 min-w-0 flex flex-col bg-white min-h-0">
              {/* ── WHERE THEY ARE + THE ONE NEXT ACTION ──────────────────────────────
                  Vida's front door. Eight tabs for a five-action job meant every screen
                  asked you to work out where you were; this answers it. */}
              {/* ⛓️ 24 Sep (R145 · "a screen in a screen") — WAS always drawn, above the lifecycle
                  panel: a second header ("Waiting on the client · Proof") and a second scroll area
                  over the panel's own. It is the retired flow's card (its counts are per-lead
                  approvals and $ in); under R137 every client is on the programme and the panel's
                  banner and actions say the same thing. It now renders only as the fallback when
                  the lifecycle verdict could not be read and the panel is absent. */}
              {!lcCopy && <div className="shrink-0">{clientContext}</div>}
              {selectedWork && !lcCopy && (
                <div className="shrink-0 px-4 pt-3">
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
                      {/* ⛓️ C2 — "88 of your 100 included leads left" is the retired $299 pack,
                          counted down, presented as CURRENT state. A programme client has no
                          pack; if a historical row still says one is active, saying so here
                          would put the legacy quota back in front of the operator as though it
                          governed the account. The row is not deleted — it is simply no longer
                          rendered as this client's current commercial state. */}
                      {selectedWork.pack.active && modelView === 'legacy' && (
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
                                <select value={seqDepth} onChange={e => setSeqDepth(Number(e.target.value) as 3 | 5)}
                                  className="text-[12.5px] rounded-md border border-[#e4d4fb] px-2 py-1 bg-white text-[#1f1235]">
                                  <option value={3}>3 touches</option>
                                  <option value={5}>5 touches</option>
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
                                <select value={seqDepth} onChange={e => setSeqDepth(Number(e.target.value) as 3 | 5)}
                                  className="text-[12.5px] rounded-md border border-[#e4d4fb] px-2 py-1 bg-white text-[#1f1235]">
                                  <option value={3}>3 touches</option>
                                  <option value={5}>5 touches</option>
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

              {/* ── ⚑ 9 Sep — THE CLIENTS WORKSPACE BODY ────────────────────────────────
                  🛑 THIS IS WHAT REPLACED THE ELEVEN TABS AS THE PRIMARY EXPERIENCE. The
                  question an operator opens a client to ask is "what is happening, and do I
                  need to do anything" — eleven permanent doors answered neither. One panel,
                  this client's exact truth, and the one action if there genuinely is one. */}
              {lcCopy && (
                <LifecyclePanel
                  clientName={selectedName || selectedClient?.company_name || 'This client'}
                  subtitle={lcCopy.subtitle}
                  chips={lcChips}
                  // ⚑ 24 Sep (R145 step 7 · #63 · #64) — the banner turns red on the server's verdict
                  // alone, and the operator rail is lit from the engine stage alone.
                  needsYou={lc?.verdict.needsYou === true}
                  rail={{ at: operatorRailAt(lc?.verdict.stage) }}
                  cards={[...lcCopy.cards, ...lcProofCards, ...(accountCard ? [accountCard] : [])]}
                  context={clientContext}
                  actions={lcCopy.actions}
                  busy={lcBusy ?? calBusy ?? (runBusy ? 'run' : null)}
                  message={runMsg
                    ? { text: runMsg.text, tone: runMsg.tone === 'error' ? 'err' : runMsg.tone === 'warn' ? 'warn' : 'ok' }
                    : lcMsg ? { text: lcMsg, tone: 'ok' } : null}
                  onAction={onLifecycleAction}
                />
              )}
              {/* ── 🛑 ⚑ 13 Sep (B2) — HISTORICAL PROOF CLASSIFICATION, WHERE THE OPERATOR IS ──
                  A client whose pre-ledger Proof history cannot be read is correctly refused by
                  `claim_proof_authority` and has no way out except these two protected routes.
                  The panel renders ONLY when the server's own booleans say classification is
                  required, so it is silent for every other client — and it is mounted OUTSIDE
                  the `lcCopy` gate deliberately: an unclassified client is blocked at Proof and
                  is not necessarily in the escalated calibration state that gate describes. */}
              {/* ── 🛑 ⚑ 13 Sep (B2 isolation) — KEYED BY THE CLIENT, AND THE KEY IS THE FIX ──
                  Every piece of this panel's state is local `useState`: the loaded evidence,
                  the pass choice, the pass note, the restart choice, the restart note, the busy
                  flag and the error. UNKEYED, switching client A → B kept that instance alive
                  and merely changed the `clientId` prop — so until B's evidence landed, A's
                  controls were still on screen while the submit closures already pointed at B,
                  and A's typed choices and note survived the switch. An A read that finished
                  LATE would also write A's truth into the instance now showing B.
                  Keying by the selected client makes A → B a real UNMOUNT and a fresh mount:
                  every state above is destroyed and re-created, B starts at
                  `{ state: 'loading', evidence: null }` (which renders nothing at all), and a
                  late A response resolves against A's discarded instance where React drops it.
                  ⚠️ THE KEY AND THE PROP MUST DERIVE FROM THE SAME `selected`. If they ever
                  diverge the isolation is gone and the guard in
                  `vida-proof-classification.test.ts` fails. */}
              <ProofClassificationPanel key={selected ?? 'no-client'} clientId={selected ?? null} />
              {!lcCopy && (
                <div className="flex-1 min-h-0 flex items-center justify-center px-6 text-center">
                  <p className="text-[13px] text-[#9b8ec4] max-w-sm">
                    {progErr
                      ? `This client's state could not be read (${progErr}). Nothing has changed, and nothing is sending.`
                      : 'Reading this client…'}
                  </p>
                </div>
              )}

              {/* ── ⚑ 9 Sep — CLIENT TOOLS: THE ELEVEN TABS, DEMOTED BUT NOT DELETED ──────
                  ⛓️ THEY WERE THE WORKSPACE; THEY ARE NOW TOOLS, and closed by default.
                  🛑 AND THEY ARE STILL HERE ON PURPOSE. The ICP editor, the sequence editor,
                  the campaign settings, the asks and the pool have NO other home in this
                  product — deleting the strip would make working capability unreachable,
                  which is the one thing the founder ruled out ("do NOT delete its underlying
                  capabilities"). Demoting them is what makes the lifecycle the experience;
                  removing them would have made it the only experience by taking things away.
                  ⚠️ ONE DISCLOSURE, NOT A SECOND NAVIGATION. Closed, it is a single line. */}
              <div className="shrink-0 border-t border-[#eee7f7]">
                <button
                  onClick={() => setToolsOpen(o => !o)}
                  aria-expanded={toolsOpen}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-bold text-[#9b8ec4] hover:text-[#7C3AED] hover:bg-[#faf8ff] transition-colors">
                  <span className={`transition-transform ${toolsOpen ? 'rotate-90' : ''}`}>&rsaquo;</span>
                  Client tools
                  <span className="text-[11.5px] font-semibold text-[#c4bade]">
                    the ICP, the words, the campaign and the pool
                  </span>
                </button>
              </div>
              {toolsOpen && (<>
              {/* ── ⚑ 4 Sep (UI-009) — ELEVEN TABS WRAP; THEY DO NOT HIDE ────────────────
                  🛑 MEASURED: the strip needs 894px and had 304 at 1440px, so eight of the
                  eleven sat off-screen behind an `overflow-x-auto` with no scrollbar and no
                  affordance — hidden controls, discovered only by dragging. At 1920 it was
                  STILL clipped; it would have taken a 2,030px viewport to fit one row.

                  ⚠️ WRAPPING, NOT SHRINKING. Every tab keeps its label and its size; the row
                  becomes two rows when it must. Nothing is hidden at any width. */}
              <div className="shrink-0 flex flex-wrap items-end gap-0.5 px-3 pt-2.5 border-b border-[#eee7f7]">
                {/* ── ⚑ 16 Sep (MVP1 · A2) — THE STRIP IS NOW STAGE-AWARE ─────────────────
                    🛑 IT WAS THE SAME ELEVEN STRINGS HAND-TYPED A SECOND TIME, and neither
                    copy was conditional. A prospect mid-Proof was shown People, Approvals,
                    Campaign and Sequence — work on a pipeline that does not exist — which
                    invites an operator into a calibration that is the client's and Milla's.

                    ⚠️ GATED ON THE SERVER'S CANONICAL STAGE, never a local inference. The
                    browser must not hold a second opinion about where a client is.
                    ⚠️ AND AN EXCEPTION RE-OPENS EVERY TAB: once there is genuinely something
                    for an operator to do, what was sourced is the evidence they need. */}
                {cockpitTabsFor({ stage: lc?.verdict.stage ?? null, needsYou: lc?.verdict.needsYou ?? null }).map(t => {
                  const on = shownTab === t
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

              {/* ⚑ 16 Sep (A2) — WHY FOUR TABS ARE MISSING, said out loud. A tab that simply
                  vanishes reads as a bug; a sentence naming whose turn it is reads as the
                  product working. Shown only while they are actually withheld. */}
              {isHealthyProof({ stage: lc?.verdict.stage ?? null, needsYou: lc?.verdict.needsYou ?? null })
                ? (
                  <p className="shrink-0 px-4 pt-2 text-[12.5px] text-[#9b8ec4]">
                    {PROOF_TABS_WITHHELD_COPY}
                  </p>
                )
                : (
                  <p className="shrink-0 px-4 pt-2 text-[12.5px] text-[#b3a9cc]">
                    Somewhere to look — the action above is what actually moves them.
                  </p>
                )}
              <div className="flex-1 overflow-y-auto p-3.5">
                {cockpitError && <p className="text-[13px] text-red-500 mb-2">{cockpitError}</p>}
                {cockpitLoading && !cockpit && <p className="text-[13.5px] text-[#9b8ec4]">Loading…</p>}

                {/* INBOX — a prospect asks; WE answer */}
                {shownTab === 'Inbox' && (cockpit ? (
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
                {shownTab === 'Approvals' && (
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
                {shownTab === 'People' && (people === null ? (
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
                      {programmeModel
                        ? 'Their 👍 starts the work — nothing is charged, and you don’t assign anyone.'
                        : unresolvedModel
                          ? 'Their 👍 starts the work — you don’t assign anyone.'
                          : 'Their 👍 charges $4 and starts the work — you don’t assign anyone.'}
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
                {shownTab === 'Campaign' && (cockpit ? (
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
                        <p className="text-[12.5px] text-amber-700 mt-1">{programmeModel
                          ? 'Approvals are blocked while no campaign is active. Nothing is charged on this plan either way.'
                          : unresolvedModel
                            ? 'Approvals are blocked while no campaign is active.'
                            : 'Approvals are blocked and the $4 is deliberately NOT charged while no campaign is active.'}</p>
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
                {shownTab === 'ICP' && (cockpit ? (icpEdit ? (
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
                      <b className="text-[14px]">{icpFresh ? 'Build a NEW ICP by talking' : 'Refine the ICP by talking'}</b>
                      {icpFresh && cockpit.icps.length > 0 && (
                        <span className="text-[11px] font-bold text-[#7C3AED] bg-[#f5f0ff] border border-[#e4dcf7] rounded-full px-2 py-0.5">
                          {cockpit.icps.length} existing left untouched
                        </span>
                      )}
                      <button onClick={() => setIcpMode('list')} className="ml-auto text-[12.5px] font-bold text-[#9b8ec4]">All ICPs</button>
                    </div>
                    {/* ── ⚑ 4 Sep — ONE TRANSCRIPT. THE SECOND ONE STOOD HERE ────────────
                        🛑 A BUBBLE LIST AND A COMPOSER, ON THE SAME SCREEN AS VIDA. The
                        operator had two places to type and two places to read, and the two
                        never saw each other's turns.

                        ⚠️ THE CONVERSATION DID NOT MOVE OFF THIS SURFACE — the DUPLICATE OF
                        IT DID. What the operator types in Vida's composer still goes straight
                        to `/operator/icp/chat` while this mode is open (`intercept`), and
                        every reply lands in Vida's transcript beside this panel. The opener
                        below is the same sentence, now said once. */}
                    <div className="shrink-0 rounded-xl border border-[#e4dcf7] bg-[#faf8ff] px-3.5 py-3 mb-2">
                      <p className="text-[13px] text-[#5c5279] leading-relaxed">
                        {icpFresh
                          ? `Starting a brand-new ICP for ${selectedClient?.company_name || 'this client'}. Tell me in your own words who we should be hunting for — I'll ask about anything I still need, one thing at a time.`
                          : `Tell me what should change about ${selectedClient?.company_name || 'this client'}'s current targeting — I'll keep the rest as it is.`}
                      </p>
                      <p className="text-[12px] text-[#9b8ec4] mt-1.5">
                        Talk to Vida on the left — what you type there comes straight here while this is open.
                      </p>
                      {cockpitBusy && <p className="text-[12.5px] text-[#9b8ec4] mt-1.5">Thinking…</p>}
                    </div>
                    <div className="flex-1 min-h-0" />
                    {icpProposal && (
                      <div className="shrink-0 border border-[#e4dcf7] bg-[#faf8ff] rounded-xl p-3 mb-2">
                        <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">Proposed profile</span>
                        <b className="text-[13.5px] block mt-0.5 mb-1">{String((icpProposal as Record<string, unknown>).name ?? 'ICP')}</b>
                        {ICP_FIELDS.filter(([k]) => k !== 'name').map(([k, label]) => {
                          const v = joinArr((icpProposal as Record<string, unknown>)[k])
                          return v ? <p key={k} className="text-[12px] text-[#5c5279]"><b className="text-[#9b8ec4] font-bold">{label}:</b> {v}</p> : null
                        })}
                        {/* ── ⚑ 4 Sep — APPROVE OR CORRECT BY TALKING. NOT A FORM. ─────────────
                            🛑 "Review & save" opened the raw eight-field editor and LEFT the
                            conversation, so the normal journey ended in the thing the founder
                            rejected and there was no way back to talking. The proposal is
                            already human-readable above; the decision belongs here. The fields
                            remain one quiet link away, and "Fill the form" is untouched. */}
                        <div className="flex flex-wrap items-center gap-2 mt-2.5">
                          <button onClick={approveProposal} disabled={cockpitBusy}
                            className="bg-[#7C3AED] text-white rounded-lg px-3.5 py-2 text-[13px] font-bold disabled:opacity-40">
                            {cockpitBusy ? 'Saving…' : 'Approve & save as the new ICP'}
                          </button>
                          <button onClick={() => setIcpProposal(null)}
                            className="border border-[#e4dcf7] rounded-lg px-3 py-2 text-[13px] font-bold text-[#7C3AED]">
                            Correct it by talking
                          </button>
                          <button onClick={proposalToForm} className="text-[12px] font-bold text-[#9b8ec4] hover:underline ml-auto">
                            Edit the fields instead
                          </button>
                        </div>
                        <p className="text-[11.5px] text-[#9b8ec4] mt-1.5">
                          Saving creates a new ICP. It attaches to no programme and sources nothing.
                        </p>
                      </div>
                    )}
                    {/* ⛓️ 4 Sep — THE SECOND COMPOSER AND ITS SEND BUTTON WERE HERE.
                        Removed, not relocated: the ONE composer is Vida's, on the left. */}
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
                  {/* ── ⚑ 4 Sep — FRESH CREATION IS NO LONGER HIDDEN BY HISTORY ─────────────
                      🛑 THIS WAS ONE BUTTON WITH A CONDITIONAL LABEL: `icps.length === 0 ?
                      'Build the ICP by talking' : 'Refine it by talking'`. A client with any
                      history could therefore only ever be offered refinement — and House has
                      three retired ICPs and a NEW programme that needs a NEW definition. The
                      capability existed the whole time; the button did not.

                      Both are offered now. Refine keeps its exact behaviour and stays the
                      first choice where an ICP exists; the form stays the manual fallback it
                      has always been. */}
                  <div className="flex flex-wrap gap-2 mt-1">
                    <button onClick={() => { setIcpFresh(true); setIcpChat([]); setIcpProposal(null); setIcpMode('chat'); setSaveMsg(null) }}
                      className="bg-[#7C3AED] text-white rounded-lg px-3.5 py-2 text-[13.5px] font-bold">
                      💬 {cockpit.icps.length === 0 ? 'Build the ICP by talking' : 'Build a NEW ICP by talking'}
                    </button>
                    {cockpit.icps.length > 0 && (
                      <button onClick={() => { setIcpFresh(false); setIcpChat([]); setIcpProposal(null); setIcpMode('chat'); setSaveMsg(null) }}
                        className="border border-[#e4dcf7] rounded-lg px-3 py-2 text-[13.5px] font-bold text-[#7C3AED]">
                        💬 Refine existing ICP by talking
                      </button>
                    )}
                    <button onClick={() => openIcpEditor()} className="border border-[#ece5fb] rounded-lg px-3 py-2 text-[13.5px] font-bold text-[#5c5279]">Fill the form</button>
                  </div>
                  {saveMsg && <p className={`text-[12.5px] font-semibold mt-2 ${noticeClass(saveMsg.tone)}`}>{saveMsg.text}</p>}
                </>)) : null)}

                {/* ── SEQUENCE — V9 propose · approve by saving · V11 preview ── */}
                {shownTab === 'Sequence' && (cockpit ? (seqEdit ? (
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
                {shownTab === 'Asks' && (<>
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
                {shownTab === 'Bookings' && (<>
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
                              <span className="text-[12px] text-[#92400e] font-semibold">{programmeModel
                                ? 'Two attempts used — the client has been told; their programme covers the re-run.'
                                : unresolvedModel
                                  ? 'Two attempts used — the client has been told.'
                                  : 'Two attempts used — the client has been told, with the $4 re-run choice.'}</span>
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
                {shownTab === 'Programme' && (<>
                  {progErr && <p className="text-[12.5px] font-semibold text-red-600 mb-2">Programme could not be loaded: {progErr}</p>}
                  {/* ⚠️ A DEGRADED READ IS NOT AN EMPTY ONE. Said loudly, because a quiet
                      console reads as "nothing is wrong" — the exact failure this panel exists
                      to end. */}
                  {(prog?.degraded ?? []).map((d, i) => (
                    <p key={i} className="text-[12.5px] font-semibold text-red-600 mb-2">⚠️ {d}</p>
                  ))}

                  {/* ── ⚑ 3 Sep (C2) · THE COMMERCIAL MODEL ────────────────────────────────
                      🛑 THIS PANEL REPLACES AN INFERENCE. The sentence that used to stand
                      below — the one that named the retired per-lead model whenever a programme
                      row was missing — asserted a commercial fact from an ABSENCE, and it
                      was wrong for every programme client between programmes, before their
                      first one, and after one completes. The model is now declared, and this
                      is where a human declares it. */}
                  {prog?.commercial && selectedClient && (
                    <div className={`border rounded-xl px-3 py-2.5 mb-3 ${
                      prog.commercial.resolved === 'unreadable' ? 'border-red-300 bg-red-50/60'
                      : prog.commercial.declared ? 'border-[#eee7f7] bg-[#faf8ff]'
                      : 'border-amber-300 bg-amber-50/60'}`}>
                      <b className="text-[13px] block">Commercial model — {prog.commercial.label}</b>
                      {prog.commercial.reason && (
                        <p className="text-[12px] text-red-700 mt-1 font-semibold">{prog.commercial.reason}</p>
                      )}
                      {/* ⛓️ 23 Sep (R137) — WAS: "Nobody has declared this. The account behaves as it
                          did before the model existed — which for a client with no programme means
                          legacy per-lead economics." Not true any more: every account is on the
                          programme whatever the row says, and the R137 migration writes it. */}
                      {!prog.commercial.declared && prog.commercial.resolved !== 'unreadable' && (
                        <p className="text-[12px] text-[#92400e] mt-1">
                          Not yet recorded on the account. The programme applies regardless — the per-lead
                          model is retired — and the all-clients migration records it. Set it here to record it now.
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <button onClick={() => setCommercialModel(selectedClient.id, selectedClient.company_name || 'this client', 'programme')}
                          disabled={cmBusy || prog.commercial.stored === 'programme'}
                          className="text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-40">
                          Set programme
                        </button>
                      </div>
                      {cmMsg && <p className="text-[12px] text-[#6b5f8c] mt-2">{cmMsg}</p>}
                    </div>
                  )}

                  {!prog ? <p className="text-[13.5px] text-[#9b8ec4] text-center py-8">Loading…</p>
                   : !prog.programme ? (
                    <>
                      {/* ⚠️ WHAT THIS SAYS NOW DEPENDS ON THE DECLARED MODEL, NOT ON THE
                          ABSENCE ABOVE IT. A programme client between programmes is told
                          exactly that; only a client somebody classified as legacy, or an
                          unclassified one the product is still treating as legacy, gets the
                          per-lead sentence. */}
                      <p className="text-[13.5px] text-[#9b8ec4] text-center py-6">
                        {/* ⛓️ 3 Sep (C2) — REORDERED SO THE FALL-THROUGH IS NEUTRAL, NOT LEGACY.
                            This chain ended on the UNCLASSIFIED sentence, which names the $299
                            pack and the $4 per-lead price — so a resolved response carrying NO
                            `commercial` block at all (an older API against a newer UI) printed
                            legacy economics as this client's current state, and pointed at a
                            control that was not rendered. Founder-ruled: a MISSING FIELD IS NOT
                            NULL. `compat_legacy` is an explicit database NULL and keeps its own
                            sentence, named; absence of the field is an absence of truth. */}
                        {/* ⚑ 23 Sep (R137) — `compat_programme` IS NOW WHAT EVERY UNRECORDED ACCOUNT
                            RESOLVES TO (NULL or a stored 'legacy'). Without its own branch here it fell
                            through to the "could not be resolved" sentence, which is false. The
                            `legacy` / `compat_legacy` branches below are no longer produced by the
                            API and go with the retired code's own removal PR. */}
                        {prog.commercial?.resolved === 'programme' || prog.commercial?.resolved === 'compat_programme'
                          ? 'No active programme for this client. They are a PROGRAMME client — programme economics apply, and none of the legacy per-lead charging does.'
                         : prog.commercial?.resolved === 'legacy'
                          ? 'No programme for this client. They are declared legacy ($299 pack · 100 included · $4 per approved lead), which is unaffected by programme controls.'
                         : prog.commercial?.resolved === 'compat_legacy'
                          ? 'No programme for this client, and no commercial model has been declared. Until one is, they behave as legacy ($299 pack · 100 included · $4 per approved lead) — declare the model above if that is wrong.'
                          : 'No active programme, and the commercial model for this client could not be resolved. Nothing will source, send, enrol or charge for them until it is.'}
                      </p>
                      {/* ── 🛑 10 Sep (C) — RECOVERY ONLY, AND NOT DRAWN DURING THE CLIENT'S PROOF ──
                          ⛓️ THIS BOX WAS THE HEALTHY PATH, AND IT SHOULD NEVER HAVE BEEN. It
                          rendered whenever a client had no programme — which is every client
                          from signup until they choose one — so an operator was invited to type
                          a meeting target for somebody still reacting to their Proof examples.
                          The founder's flow is that the CLIENT chooses the target, in Milla's
                          calculator, after Proof completes.

                          It stays for recovery (a client who cannot get through the calculator,
                          a programme that must be rebuilt), so the admin primitive is not
                          removed — but it is hidden while the client is genuinely still at
                          Signup or Proof, where offering it misrepresents the lifecycle.
                          ⚠️ HIDDEN, NOT DISABLED: a greyed control still tells an operator this
                          is the expected next step. */}
                      {(prog.lifecycle?.verdict?.stage === 'signup' || prog.lifecycle?.verdict?.stage === 'proof') ? (
                        <p className="text-[12px] text-[#6b5f8c] border border-[#eee7f7] rounded-xl px-3 py-2.5">
                          The client is still in Proof. They choose their meeting target in Milla&rsquo;s
                          calculator once they confirm their examples — nothing is created here for them.
                        </p>
                      ) : (
                      <div className="border border-[#eee7f7] rounded-xl px-3 py-2.5">
                        <b className="text-[13px] block mb-1">Create a programme — recovery</b>
                        <p className="text-[12px] text-[#6b5f8c] mb-2">
                          The client normally chooses this in Milla. Use this only when they cannot.
                          Prices once from the meeting target and stores it. Nothing is charged and no payment is recorded.
                        </p>
                        <div className="flex items-center gap-2">
                          <input value={lcMeetings} onChange={e => setLcMeetings(e.target.value)}
                            inputMode="numeric" placeholder="Meeting target"
                            className="text-[12.5px] border border-[#e6dcf7] rounded-lg px-2 py-1.5 w-36" />
                          <button onClick={() => createProgrammeNow()} disabled={lcBusy !== null}
                            className="text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                            {lcBusy === 'create' ? '…' : 'Create programme'}</button>
                        </div>
                        {lcMsg && <p className="text-[12px] text-[#6b5f8c] mt-2">{lcMsg}</p>}
                      </div>
                      )}
                    </>
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
                      {/* ⚑ 25 Sep (R166 ⑥ · P3b) — the review is released HERE, by a person, on the record. */}
                      {prog.programme.review_required_at && !prog.programme.review_resolved_at && (
                        <button onClick={() => void resolveReview()} disabled={lcBusy !== null}
                          className="mt-2 text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-40">
                          Resolve review
                        </button>
                      )}
                    </div>

                    {/* ── ⚑ PR A2 · THE LIFECYCLE ────────────────────────────────────────
                        🛑 IT STOPS AT READY_FOR_APPROVAL AND THAT IS THE POINT. There is no
                        approve button here and there must never be one: the single programme
                        approval belongs to the CLIENT, in Milla. An operator pressing it on
                        their behalf is not the client approving. */}
                    <div className="border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-3">
                      <b className="text-[13px] block mb-1">Programme lifecycle</b>
                      <p className="text-[12px] text-[#6b5f8c] mb-2">
                        {/* The state line says INTERNAL AUTHORITY, never "paid" — for House
                            those are different facts and only one of them is true. */}
                        P1: {prog.programme.first_paid_at ? 'paid'
                          : prog.programme.first_authorised_at ? `internal authority ${fmtDate(prog.programme.first_authorised_at)}`
                          : 'not authorised'}
                        {' · '}
                        P2: {(prog.programme.second_paid_at && prog.programme.second_payment_ref) ? 'paid'
                          : prog.programme.second_authorised_at ? `internal authority ${fmtDate(prog.programme.second_authorised_at)}`
                          : 'not authorised'}
                        {prog.programme.went_live_at ? ` · live since ${fmtDate(prog.programme.went_live_at)}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {lcCan('recommend') && (
                          <button onClick={() => lifecycle('recommend', 'Recommend')} disabled={lcBusy !== null}
                            className="text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                            {lcBusy === 'recommend' ? '…' : 'Recommend'}</button>
                        )}
                        {lcCan('await-first-payment') && (
                          <button onClick={() => lifecycle('await-first-payment', 'Move to P1')} disabled={lcBusy !== null}
                            className="text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                            {lcBusy === 'await-first-payment' ? '…' : 'Move to P1'}</button>
                        )}
                        {lcCan('authorise/first') && (
                          <button onClick={() => lifecycle('authorise/first', 'Authorise P1 internally')} disabled={lcBusy !== null}
                            className="text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                            {lcBusy === 'authorise/first' ? '…' : 'Authorise P1 internally'}</button>
                        )}
                        {lcCan('ready-for-approval') && (
                          <button onClick={() => lifecycle('ready-for-approval', 'Ready for approval')} disabled={lcBusy !== null}
                            className="text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                            {lcBusy === 'ready-for-approval' ? '…' : 'Ready for approval'}</button>
                        )}
                        {lcCan('authorise/second') && (
                          <button onClick={() => lifecycle('authorise/second', 'Authorise P2 internally')} disabled={lcBusy !== null}
                            className="text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                            {lcBusy === 'authorise/second' ? '…' : 'Authorise P2 internally'}</button>
                        )}
                        {lcCan('go-live') && (
                          <button onClick={() => lifecycle('go-live', 'Make live')} disabled={lcBusy !== null}
                            className="text-[12.5px] font-bold text-white bg-[#059669] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                            {lcBusy === 'go-live' ? '…' : 'Make programme live'}</button>
                        )}
                        {canRewriteMessages() && (
                          <button onClick={() => void rewriteMessages()} disabled={lcBusy !== null}
                            className="text-[12.5px] font-bold text-[#7C3AED] bg-white border border-[#d9ccf5] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                            {lcBusy === 'rewrite-messages' ? 'Rewriting…' : 'Rewrite messages'}</button>
                        )}
                        {prog.programme.status === 'READY_FOR_APPROVAL' && (
                          <span className="text-[12.5px] font-semibold text-[#6b5f8c] bg-[#faf8ff] border border-[#eee7f7] rounded-lg px-2.5 py-1.5">
                            Awaiting client approval in Milla
                          </span>
                        )}
                        {prog.programme.status === 'LIVE' && (
                          <span className="text-[12.5px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                            Live — armed. Nothing has been sent by making it live.
                          </span>
                        )}
                        {prog.preparing === true && (
                          <span className="text-[12.5px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                            Preparing for the client — running in the background. Nothing is sent.
                          </span>
                        )}
                      </div>
                      {lcMsg && <p className="text-[12px] text-[#6b5f8c] mt-2">{lcMsg}</p>}

                      {/* ── ⚑ 9 Sep · SENDING, AND THE RUN THAT IS THE ONLY WAY IT HAPPENS ────────
                          🛑 THE LOCKED WORDING. Kill-switch ON means sending is BLOCKED; OFF
                          means it is PERMITTED, subject to every other gate. A bare "OFF" under
                          "SENDING" reads as the opposite of what it means, so the state is
                          spelled out and the switch is named beside it, never alone.
                          🛑 AND MAKE LIVE IS NOT SENDING. A programme can be LIVE with nothing
                          going out. This says which is true rather than letting a status imply
                          it. */}
                      {prog.programme.status === 'LIVE' && prog.send_controls && (
                        <div className="mt-3 border border-[#eee7f7] rounded-xl px-3.5 py-3">
                          <div className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold mb-1">Sending</div>
                          {/* ⚑ 9 Sep — THE APPROVED TWO-LINE FORM, from the locked preview set:
                              the STATE on its own line, the SWITCH named beneath it. One combined
                              sentence made "Permitted" and "OFF" compete for the same glance, and
                              the founder's correction pass is explicit that a bare OFF under
                              SENDING must never appear and the state must lead. */}
                          <p className="text-[13.5px] font-bold text-[#5c5279]">
                            {prog.send_controls.auto_outreach_enabled ? 'Permitted' : 'Blocked'}
                          </p>
                          <p className="text-[12px] text-[#9b8ec4] mt-0.5">
                            {prog.send_controls.auto_outreach_enabled
                              ? 'Kill-switch OFF — sending is permitted, subject to every other gate.'
                              : 'Kill-switch ON — nothing is delivered on any channel.'}
                          </p>
                          {/* ⛓️ 9 Sep — THE RUN LINE NOW READS THE KILL-SWITCH FIRST, because the
                              server does. Run used to be offered whenever its own env key was set,
                              on the old model where an operator run sent past the kill-switch. It
                              does not: KILL-SWITCH ON = NOTHING SENDS, no exception for a run. A
                              button that would be refused 503 is a button that must not be drawn. */}
                          <p className="text-[12px] text-[#9b8ec4] mt-1.5">
                            {!prog.send_controls.auto_outreach_enabled
                              ? 'Run cannot start while the kill-switch is ON. It is not an exception to it.'
                              : prog.send_controls.operator_run_enabled
                                // ⛓️ 24 Sep (R145 step 7 · #83) — WAS "Run is available: it sends up to a
                                // ceiling you type". That describes SEND-ONCE, the button beside it —
                                // not Run, which grants delivery authority and sends nothing itself
                                // (16 Sep, "Do not conflate Make Live / Run / send-now").
                                ? 'Send once is available: it sends up to the number you type, for this client only. It is not Run — Run grants the authority and sends nothing itself.'
                                : 'Run is unavailable — FIGSY_OPERATOR_SEND_ENABLED is not set on the API, so no run can start.'}
                          </p>
                          {prog.send_controls.operator_run_enabled && prog.send_controls.auto_outreach_enabled && (
                            <div className="flex flex-wrap items-center gap-2 mt-2.5">
                              <input
                                value={runMax}
                                onChange={e => setRunMax(e.target.value)}
                                inputMode="numeric"
                                placeholder="Max emails"
                                className="w-28 text-[12.5px] border border-[#e3daf7] rounded-lg px-2.5 py-1.5"
                              />
                              <button
                                onClick={runOnce}
                                disabled={runBusy}
                                className="text-[12.5px] font-bold text-white bg-[#059669] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                                {runBusy ? '…' : 'Run once'}
                              </button>
                            </div>
                          )}
                          {runMsg && (
                            <p className={`text-[12px] mt-2 font-semibold ${
                              runMsg.tone === 'ok' ? 'text-emerald-800'
                              : runMsg.tone === 'warn' ? 'text-amber-800' : 'text-red-700'}`}>
                              {runMsg.text}
                            </p>
                          )}
                        </div>
                      )}
                      {/* ── ⛓️ 9 Sep · THE LAST PREPARATION ATTEMPT, AND WHAT STILL BLOCKS ──────────
                          🛑 THIS IS THE RECORD OF A RUN WHOSE RESPONSE WAS LOST. The founder's
                          House press died at an edge; the API finished anyway and told nobody.
                          The outcome is audited by the run itself and read back here, so a lost
                          response is a lost message, never a lost fact. The sentences are the
                          SERVER's — the headline or the named refusal — and the blockers are the
                          readiness rule's own list, not a diagnosis this screen invented. */}
                      {prog.last_preparation && (
                        <p className={`text-[12px] mt-2 ${prog.last_preparation.ok ? 'text-emerald-800' : 'text-amber-800'}`}>
                          Last preparation attempt ({new Date(prog.last_preparation.at).toLocaleString()}
                          {prog.last_preparation.by ? ` · ${prog.last_preparation.by}` : ''}):{' '}
                          {prog.last_preparation.ok ? 'completed' : 'did not complete'} — {prog.last_preparation.detail}
                          {/* ⚑ 9 Sep — THE FOUR COUNTS, AND NO LEAD IDS. The founder was shown one
                              repeated line per failed prospect and no cause; this is the same run
                              described in four numbers, with the causes in the sentence above and
                              the ids in the audit record. */}
                          {typeof prog.last_preparation.attempted === 'number' && (
                            <><br /><span className="text-[#8b7fae]">
                              {prog.last_preparation.attempted} attempted ·{' '}
                              {prog.last_preparation.already_enrolled ?? 0} already prepared ·{' '}
                              {prog.last_preparation.enrolled ?? 0} newly prepared ·{' '}
                              {prog.last_preparation.failed ?? 0} could not be prepared
                            </span></>
                          )}
                        </p>
                      )}
                      {prog.programme.status !== 'READY_FOR_APPROVAL' && (prog.readiness?.blockers?.length ?? 0) > 0 && (
                        <div className="mt-2">
                          <p className="text-[12px] font-semibold text-[#6b5f8c]">Still needed before the client can be asked to approve:</p>
                          <ul className="list-disc ml-5 text-[12px] text-[#6b5f8c]">
                            {(prog.readiness?.blockers ?? []).map(b => (
                              <li key={b.code}>{b.detail}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* ── ⚑ 9 Sep (HOUSE-009) · QUALIFY SOURCED LEADS ───────────────────
                          🛑 RENDERED ON A SERVER BOOLEAN, NEVER ON A CHECK THIS FILE COULD
                          MAKE. `reconcile.available` already required the exact configured
                          programme id, a proved House audience, SOURCING_AUTHORISED, zero
                          accounted records, no batch, and at least one batch-less candidate.
                          Re-deriving any of that here would put the gate in the browser,
                          where anybody with the console open can satisfy it.
                          It disappears after a successful run because the state it needs is
                          gone — not because a flag was set. */}
                      {prog.reconcile?.available && (
                        <div className="mt-2 pt-2 border-t border-[#eee7f7]">
                          <button onClick={openQualifyConfirm} disabled={qualBusy}
                            className="text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                            {qualBusy ? 'Qualifying…' : 'Qualify sourced leads'}</button>
                          <p className="text-[12px] text-[#6b5f8c] mt-1.5">
                            {prog.reconcile.unaccounted} sourced leads are ready to be checked against this programme&rsquo;s ICP.
                          </p>
                        </div>
                      )}
                      {/* ── THE CONFIRMATION ──────────────────────────────────────────────
                          🛑 IT EXISTS BECAUSE "OK" IS NOT AN ANSWER TO THIS QUESTION. The
                          browser's native dialog can only offer Cancel/OK, so the action a
                          person is agreeing to was named in the body and then NOT on the
                          button they pressed. The confirming button says the thing it does.

                          ⚠️ NOT A NEW MODAL SYSTEM. There is no shared dialog component in
                          this app — `vida/partners/page.tsx` rolls its own overlay — so this
                          reuses those exact classes locally and adds no abstraction. */}
                      {qualConfirm && (
                        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
                          role="dialog" aria-modal="true" aria-label="Qualify sourced leads"
                          onClick={() => setQualConfirm(false)}>
                          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-8" onClick={e => e.stopPropagation()}>
                            <div className="px-6 py-4 border-b border-[#eee9f7]">
                              <h2 className="text-[15px] font-bold text-[#1f1235]">
                                {QUALIFY_CONFIRM.question(prog.reconcile?.unaccounted ?? 0)}
                              </h2>
                            </div>
                            <div className="px-6 py-4 text-[13px] text-[#2c2440]">
                              {QUALIFY_CONFIRM.body}
                            </div>
                            <div className="px-6 py-4 border-t border-[#eee9f7] flex flex-wrap gap-2 justify-end">
                              {/* Cancel is FIRST and plain — the destructive-looking one should
                                  not be the one a hand lands on by default. */}
                              <button onClick={() => setQualConfirm(false)} disabled={qualBusy}
                                className="text-[12.5px] font-bold text-[#5c5279] bg-white border border-[#eee7f7] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                                Cancel</button>
                              <button onClick={qualifySourcedLeads} disabled={qualBusy}
                                className="text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                                {qualBusy ? 'Qualifying…' : 'Qualify sourced leads'}</button>
                            </div>
                          </div>
                        </div>
                      )}
                      {qualMsg && (
                        <p className={`text-[12px] mt-2 whitespace-pre-line ${
                          qualMsg.tone === 'ok' ? 'text-emerald-800'
                          : qualMsg.tone === 'warn' ? 'text-orange-800 font-semibold'
                          : 'text-red-800 font-semibold'}`}>
                          {qualMsg.text}
                        </p>
                      )}
                    </div>

                    {/* ── ⚑ PR A2 · WHAT FEEDS THIS PROGRAMME ────────────────────────────
                        🛑 THIS IS THE LINK ALL ATTRIBUTION HANGS ON. A sourcing run belongs
                        to a programme only because the ICP it ran from says so. With nothing
                        attached, a programme client's runs are refused outright — which is
                        correct, and impossible to diagnose without this section. */}
                    <div className="border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-3">
                      <b className="text-[13px] block mb-1">Targeting that feeds this programme</b>
                      {prog.icps?.unreadable ? (
                        <p className="text-[12.5px] font-semibold text-red-600">
                          ⚠️ The ICP list could not be read. This is NOT evidence that none are attached.
                        </p>
                      ) : (<>
                        {(prog.icps?.attached ?? []).length === 0 ? (
                          <p className="text-[12px] text-amber-800 mb-2">
                            No targeting is attached yet, so this programme can source nothing — a run from an unattached ICP is refused before any provider is called.
                          </p>
                        ) : (
                          <ul className="text-[12.5px] text-[#6b5f8c] mb-2 list-disc pl-4">
                            {(prog.icps?.attached ?? []).map(i => (
                              <li key={i.id}>{i.name ?? 'Untitled ICP'}{i.is_active ? '' : ' (not active)'}</li>
                            ))}
                          </ul>
                        )}
                        {lcCanAttachIcp() ? (
                          (prog.icps?.eligible ?? []).length === 0 ? (
                            <p className="text-[12px] text-[#9b8ec4]">No unattached targeting left for this client.</p>
                          ) : (<>
                            <p className="text-[12px] text-[#6b5f8c] mb-1.5">
                              Attach one at a time. Only future sourcing is affected — existing leads and enrolments keep the attribution they already have.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(prog.icps?.eligible ?? []).map(i => (
                                <button key={i.id} onClick={() => attachIcp(i.id, i.name)} disabled={lcBusy !== null}
                                  className="text-[12.5px] font-bold text-[#7C3AED] border border-[#e6dcf7] rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                                  {lcBusy === `icp:${i.id}` ? '…' : `Attach "${i.name ?? 'Untitled ICP'}"`}</button>
                              ))}
                            </div>
                          </>)
                        ) : (
                          <p className="text-[12px] text-[#9b8ec4]">
                            Targeting is fixed from the client review onward — attaching now would change the work the client is being asked to approve.
                          </p>
                        )}
                      </>)}
                    </div>

                    {/* ⚑ 25 Sep (R141 · R166 · P5a) — every meeting qualified against the seven conditions, with evidence. */}
                    {selected && <MeetingQualifyPanel clientId={selected} />}

                    <div className="border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-3">
                      <b className="text-[13px] block mb-1">Delivery against authorised volume</b>
                      <span className="text-[12.5px] text-[#6b5f8c]">
                        {prog.programme.sourced_used} used · {prog.programme.sourced_reserved} reserved · {prog.programme.room_remaining} left of {prog.programme.sourcing_ceiling}
                      </span>
                      {/* ⛓️ 23 Sep (R136 ①④) — WAS "Unused value never expires. Opening more is a human
                          decision." Reaching the limit is where we stop, and what is owed for a
                          shortfall is wallet credit, settled below. */}
                      <p className="text-[11.5px] text-[#9b8ec4] mt-1">At the limit sourcing stops. A meetings shortfall is settled as wallet credit, below.</p>
                      {/* ⚑ 25 Sep (R166 ⑥ · P3b) — opening more is a person's decision, with a reason, on the record. */}
                      {prog.programme.status !== 'COMPLETED' && prog.programme.status !== 'CANCELLED' && prog.programme.sourcing_ceiling > 0 && (
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <input value={raiseBy} onChange={e => setRaiseBy(e.target.value)} inputMode="numeric" placeholder="more people"
                            className="w-28 text-[12.5px] border border-[#e6dcf7] rounded-lg px-2 py-1.5" />
                          <input value={raiseWhy} onChange={e => setRaiseWhy(e.target.value)} placeholder="why (kept on the record)"
                            className="flex-1 min-w-[160px] text-[12.5px] border border-[#e6dcf7] rounded-lg px-2 py-1.5" />
                          <button onClick={() => void raiseCeiling()} disabled={lcBusy !== null}
                            className="text-[12.5px] font-bold text-[#5b21b6] border border-[#d8c8f5] rounded-lg px-2.5 py-1.5 disabled:opacity-40">
                            Raise limit
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ── ⚑ 23 Sep (MVP1 Stage 6 · R136 ④) — SETTLE ─────────────────────────────
                        Completion requires this. Shown for a programme that has gone live and is
                        not yet settled; once settled it states the figure and the credit. */}
                    {prog.programme.settlement ? (
                      <div className="border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-3">
                        <b className="text-[13px] block mb-1">Settled</b>
                        <span className="text-[12.5px] text-[#6b5f8c]">
                          {prog.programme.settlement.delivered_meetings ?? '—'} of {prog.programme.meeting_target} meetings delivered
                          {' · '}{prog.programme.settlement.credit_cents > 0
                            ? `$${(prog.programme.settlement.credit_cents / 100).toFixed(2)} credited to their wallet`
                            : 'nothing owed'}
                        </span>
                      </div>
                    ) : prog.programme.went_live_at && prog.programme.status !== 'COMPLETED' && prog.programme.status !== 'CANCELLED' ? (
                      <div className="border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-3">
                        <b className="text-[13px] block mb-1">Settle this programme</b>
                        <p className="text-[12px] text-[#6b5f8c] mb-2">
                          {prog.programme.meetings_booked == null
                            ? 'The meetings for this programme could not be counted — enter the delivered figure yourself.'
                            : `${prog.programme.meetings_booked} of ${prog.programme.meeting_target} meetings are attributed to this programme.`}
                          {' '}Anything short of the target is credited to their wallet. Completion needs this first.
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input value={settleMeetings}
                            onChange={e => setSettleMeetings(e.target.value)}
                            onFocus={() => { if (settleMeetings === '' && prog.programme?.meetings_booked != null) setSettleMeetings(String(prog.programme.meetings_booked)) }}
                            placeholder={prog.programme.meetings_booked == null ? 'delivered' : String(prog.programme.meetings_booked)}
                            inputMode="numeric"
                            className="w-24 text-[12.5px] border border-[#e6dcf7] rounded-lg px-2 py-1.5" />
                          <button onClick={() => void settleProgramme()} disabled={lcBusy !== null}
                            className="text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-40">
                            Settle
                          </button>
                        </div>
                      </div>
                    ) : null}

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


                {/* ── ⚑ 4 Sep (UI-011) — POOL AND EXCEPTIONS BELONG TO THE WORKSPACE ──────
                    🛑 THEY WERE RENDERED OUTSIDE IT. The `</aside>` and the `{selected && (<>`
                    block closed ABOVE these two, so they were siblings of the whole console at
                    page width: their cards painted across the Vida column and under its
                    composer, over the conversation the operator was reading.

                    ⚠️ MOVED, NOT RESTYLED. Not one class, string or control changed — the two
                    blocks simply sit inside the same tab-content container as the other nine
                    tabs, so they inherit its width and its scrolling like everything else.
                    Platform-wide DATA scope is untouched; platform-wide WIDTH was never the
                    scope, it was a misplaced closing tag. */}
                {/* ⚑ 30 Aug (BUILD-003 PR4) — LEAD POOL. Platform-wide.
                    Every value is a count of rows that exist. No health score, no fill rate,
                    no projection: an operator acting on a number we made up is worse off than
                    one acting on nothing. */}
                {shownTab === 'Pool' && (<>
                  <p className="text-[11.5px] text-[#9b8ec4] mb-2">Platform-wide — not scoped to this client.</p>
                  {poolErr && <p className="text-[12.5px] font-semibold text-red-600 mb-2">Pool summary could not be loaded: {poolErr}</p>}
                  {(pool?.degraded ?? []).map((d, i) => (
                    <p key={i} className="text-[12.5px] font-semibold text-red-600 mb-2">⚠️ {d}</p>
                  ))}

                  {!pool ? <p className="text-[13.5px] text-[#9b8ec4] text-center py-8">Loading…</p> : (<>
                    <div className="border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-3">
                      <b className="text-[13px] block mb-1">Records in the pool</b>
                      {/* 🛑 null IS "THE COUNT FAILED", NEVER ZERO. Rendering it as 0 would tell an
                          operator the inventory is empty — a decision-changing lie on the surface
                          that decides whether to buy more data. */}
                      {pool.total === null
                        ? <span className="text-[13.5px] font-bold text-red-700">UNKNOWN — the count failed. This is NOT zero.</span>
                        : <span className="text-[15px] font-extrabold">{pool.total.toLocaleString()}</span>}
                    </div>

                    <p className="text-[11.5px] text-[#9b8ec4] mb-2">
                      Breakdowns below are from a sample of <b>{pool.breakdown_sample.toLocaleString()}</b> record(s), not the whole pool.
                    </p>

                    <b className="text-[13px] block mb-1">By source</b>
                    {pool.by_source.length === 0
                      ? <p className="text-[12.5px] text-[#9b8ec4] mb-2">Nothing to break down.</p>
                      : pool.by_source.map(r => (
                        <div key={r.source} className="flex items-center justify-between border border-[#eee7f7] rounded-xl px-3 py-1.5 mb-1">
                          <span className="text-[12.5px]">{r.source}</span>
                          <span className="text-[12.5px] font-bold">{r.count.toLocaleString()}</span>
                        </div>
                      ))}

                    <b className="text-[13px] block mb-1 mt-3">By country</b>
                    {pool.by_country.length === 0
                      ? <p className="text-[12.5px] text-[#9b8ec4]">Nothing to break down.</p>
                      : pool.by_country.map(r => (
                        <div key={r.country} className="flex items-center justify-between border border-[#eee7f7] rounded-xl px-3 py-1.5 mb-1">
                          <span className="text-[12.5px]">{r.country}</span>
                          <span className="text-[12.5px] font-bold">{r.count.toLocaleString()}</span>
                        </div>
                      ))}
                  </>)}
                </>)}

                {/* ⚑ 30 Aug (BUILD-003 PR4) — EXCEPTIONS. Platform-wide.
                    Four states that each mean a person or a client is worse off right now, and
                    which before PR3 alerted by EMAIL or not at all. Each row names WHO it belongs
                    to, so an operator can act rather than go hunting. */}
                {shownTab === 'Exceptions' && (<>
                  <p className="text-[11.5px] text-[#9b8ec4] mb-2">Platform-wide — not scoped to this client.</p>
                  {saveMsg && <p className={`text-[12.5px] font-semibold mb-2 ${noticeClass(saveMsg.tone)}`}>{saveMsg.text}</p>}
                  {excErr && <p className="text-[12.5px] font-semibold text-red-600 mb-2">Exceptions could not be loaded: {excErr}</p>}
                  {(exc?.degraded ?? []).map((d, i) => (
                    <p key={i} className="text-[12.5px] font-semibold text-red-600 mb-2">⚠️ {d}</p>
                  ))}

                  {!exc ? <p className="text-[13.5px] text-[#9b8ec4] text-center py-8">Loading…</p> : (<>
                    <b className="text-[13px] block mb-1">Stranded batches</b>
                    {exc.stranded_batches.length === 0
                      ? <p className="text-[12.5px] text-[#9b8ec4] mb-3">None.</p>
                      : exc.stranded_batches.map(b => (
                        <div key={b.id} className="border border-red-300 bg-red-50/60 rounded-xl px-3 py-2 mb-1.5">
                          <b className="text-[12.5px] block">Batch #{b.seq} · programme {b.programme_id.slice(0, 8)}</b>
                          <span className="text-[12px] text-red-800">
                            {b.granted - (b.delivered ?? 0)} record(s) of PAID volume reserved and unusable. Client {b.client_id?.slice(0, 8) ?? 'unknown'}. Needs reconciling by hand.
                          </span>
                        </div>
                      ))}

                    <b className="text-[13px] block mb-1 mt-3">Someone opted out and is still inside a provider</b>
                    {exc.open_evictions.length === 0
                      ? <p className="text-[12.5px] text-[#9b8ec4] mb-3">None.</p>
                      : exc.open_evictions.map(e => (
                        <div key={e.lead_id} className="border border-red-300 bg-red-50/60 rounded-xl px-3 py-2 mb-1.5">
                          <b className="text-[12.5px] block">Lead {e.lead_id.slice(0, 8)} · {e.provider ?? 'provider unknown'}</b>
                          <span className="text-[12px] text-red-800">
                            Eviction required since {fmtDate(e.required_at)}{e.reason ? ` — ${e.reason}` : ''}. They may still be receiving mail. Client {e.client_id?.slice(0, 8) ?? 'unknown'}.
                          </span>
                        </div>
                      ))}

                    <b className="text-[13px] block mb-1 mt-3">Crashed runs (last {exc.failed_run_window_days} days)</b>
                    {exc.failed_runs.length === 0
                      ? <p className="text-[12.5px] text-[#9b8ec4] mb-3">None.</p>
                      : exc.failed_runs.map((f, i) => (
                        <div key={`${f.icp_id}-${i}`} className="border border-amber-300 bg-amber-50/60 rounded-xl px-3 py-2 mb-1.5">
                          <b className="text-[12.5px] block">ICP {f.icp_id.slice(0, 8)} · {fmtDate(f.created_at)}</b>
                          <span className="text-[12px] text-amber-900">
                            The run crashed. The prospect was shown the recovery copy and promised a human. Client {f.client_id?.slice(0, 8) ?? 'unknown'}. Re-run sourcing from the People tab (it previews the cost first).
                          </span>
                        </div>
                      ))}

                    <b className="text-[13px] block mb-1 mt-3">Test / debris ICP candidates</b>
                    {/* ⚠️ CANDIDATES, NOT A CLASSIFICATION. A human decides. The only action is
                        reversible retirement — is_active = false, never a delete. */}
                    {exc.debris_icps.length === 0
                      ? <p className="text-[12.5px] text-[#9b8ec4]">None.</p>
                      : exc.debris_icps.map(d => (
                        <div key={d.id} className="flex items-center justify-between border border-[#eee7f7] rounded-xl px-3 py-2 mb-1.5">
                          <div className="min-w-0">
                            <b className="text-[12.5px] block truncate">{d.name ?? d.id}</b>
                            <span className="text-[11.5px] text-[#9b8ec4]">
                              {d.is_active ? 'ACTIVE — still sourced' : 'retired'} · client {d.client_id?.slice(0, 8) ?? 'unknown'}
                            </span>
                          </div>
                          <button
                            onClick={() => retireIcp(d.id, !d.is_active)}
                            disabled={retireBusy === d.id}
                            className="shrink-0 border border-[#ece5fb] rounded-xl px-3 py-1.5 text-[12px] font-bold disabled:opacity-40">
                            {retireBusy === d.id ? '…' : d.is_active ? 'Retire' : 'Restore'}
                          </button>
                        </div>
                      ))}
                  </>)}
                </>)}
              </div>
              </>)}
            </aside>
            {/* ── ⚑ 4 Sep — VIDA. THE SHELL'S CONVERSATION PAINTS HERE ───────────────────
                🛑 THE ASSISTANT WAS DECLARED IN THIS FILE: its transcript, its shortcuts, its
                composer and its Run button, plus the sourcing confirm, all children of this
                route. Opening any other operator destination unmounted the lot.

                ⚠️ THIS IS A SLOT, NOT A SECOND VIDA. Nothing is rendered here — the element
                below is handed to the shell (`components/vida/VidaConversation.tsx`), which
                paints its ONE instance into it. `display: contents` keeps it out of the
                layout, so the conversation column is a direct child of this row exactly as it
                was, at exactly the width it was. */}
            {/* ⛓️ 24 Sep (R145 step 7 · #55) — THE CONVERSATION IS ON THE RIGHT NOW, 430px, as the redesign
                draws Vida: menu | operator truth | Vida. WAS the left column at 540px. */}
            <section className="mv-vida-chat w-[430px] shrink-0 flex flex-col min-h-0">
              {/* ── ⚑ 4 Sep — THE SHELL'S CONVERSATION PAINTS HERE ─────────────────────────
                  🛑 THE ASSISTANT WAS DECLARED IN THIS FILE: the blocker chips, the
                  transcript, the shortcuts, the composer and the Run button, plus the sourcing
                  confirm — all children of this route, so opening any other operator
                  destination destroyed the lot along with the selected client.

                  ⚠️ THIS IS A SLOT, NOT A SECOND VIDA. Nothing below is rendered here: the
                  element is handed to the shell (`components/vida/VidaConversation.tsx`),
                  which paints its ONE instance into it. Everything ABOVE this line stays where
                  it was — the client header, the wallet chip, "you're working X", the
                  "Needs you" alerts with Mark reviewed, and the onboarding gaps. Those read
                  and write console state and belong to the console. */}
              <div className="flex-1 min-h-0 flex flex-col" ref={conversation.setSlot} />
            </section>
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
