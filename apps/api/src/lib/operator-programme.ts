// ═══════════════════════════════════════════════════════════════════════════════════════
// OPERATOR PROGRAMME TRUTH — the read model. What is this programme actually doing?
//
// 🛑 WHAT THIS FIXES, AND IT IS NOT A NICE-TO-HAVE. Before this file, EVERYTHING BUILD-003 PR2
// built was invisible to an operator: programme status, `paused_at`, the review hold, the
// sourcing ceiling, batches, stranded batches, attribution. Not one admin page referenced
// `programmes`, and no operator endpoint returned it. The founder created a test ICP against a
// live programme and could not find anywhere in Vida it was supposed to appear — because for
// programme state there WAS nowhere. A control nobody can see is not a control, it is a hope.
//
// ⚠️ READ-ONLY. Nothing in this file writes. The one action PR3 adds — reversible ICP
// deactivation — lives in the route, not here, so a read model can never mutate by accident.
//
// ⚠️ NO DERIVED "HEALTH SCORE", AND NO INVENTED NUMBERS. Every field below is a row that
// exists or a count of rows that exist. PR2-D asked for delivery control rather than a
// decorative score, and the same rule applies to the surface that shows it: an operator acting
// on a number we made up is worse off than one acting on nothing.
//
// ⚠️ `null` IS "UNKNOWN" EVERYWHERE HERE, NEVER "ZERO" OR "FINE". Every reader below
// distinguishes a failed query from an empty result, because this repo has now shipped that
// same defect — `.data ?? []` rendering a rejected query as an empty list — in the send gate,
// the meeting counts, the proof-review queue and the programme reader itself. An operator
// console that goes quiet because a query failed is the single most dangerous shape it can
// take: a quiet Vida reads as "nothing is wrong".
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import {
  type ProgrammeRow, type ProgrammeStatus,
  TERMINAL_STATUSES, PROGRAMME_BATCH_SIZE, nextBatchSize,
} from './programme'
import { reviewIsOpen, REVIEW_TRIGGER_LEADS, authorityFor } from './programme-authority'

/**
 * THE FIVE OPERATIONAL STATES PR2-D REQUIRED, and no sixth.
 *
 * ⚠️ THEY ARE ORDERED BY WHAT STOPS DELIVERY HARDEST, and resolved in that order, because a
 * programme can be several at once. A COMPLETED programme that is also paused reads as
 * finished, not as something a resume could revive; a paused programme under review reads as
 * paused, because pause is the harder stop and clearing the review would change nothing.
 */
export type ProgrammeOperationalState =
  | 'completed'         // terminal — nothing more happens on it
  | 'paused'            // the hard stop: no new sourcing, no new outreach, no new sends
  | 'review_required'   // the NEXT NEW BATCH is held; in-flight delivery continues
  | 'blocked'           // cannot deliver for a reason that is not pause and not review
  | 'continuing'        // authorised and working

export type ProgrammeBlocker = {
  kind: 'stranded_batch' | 'sourcing_ceiling_reached' | 'not_approved' | 'second_payment_missing' | 'no_live_campaign'
  detail: string
}

export type BatchSummary = {
  id: string
  seq: number
  status: string
  requested: number
  granted: number
  delivered: number | null
  created_at: string | null
  settled_at: string | null
}

export type ProgrammeTruth = {
  programme: {
    id: string
    status: ProgrammeStatus
    state: ProgrammeOperationalState
    meeting_target: number
    /** Delivered vs authorised, both straight off the row. No projection. */
    sourcing_ceiling: number
    sourced_used: number
    sourced_reserved: number
    /** ceiling − used − reserved. The only computed field, and it is subtraction. */
    room_remaining: number
    paused_at: string | null
    pause_reason: string | null
    approved_at: string | null
    second_paid_at: string | null
    // ── PR A2 · exactly seven more, and each earns its place on the screen ────────────
    // Without them Vida cannot tell an internally-authorised programme from an unpaid one,
    // and would have to describe internal authority as "paid" — the one thing it is not.
    recommended_volume: number
    first_paid_at: string | null
    first_payment_ref: string | null
    second_payment_ref: string | null
    went_live_at: string | null
    first_authorised_at: string | null
    second_authorised_at: string | null
    review_required_at: string | null
    review_reason: string | null
    review_resolved_at: string | null
    /** The R77 planning benchmark, surfaced so the operator sees WHY a review was raised. */
    review_trigger_leads: number
    batch_size: number
    // ── ⚑ 7 Sep (HOUSE-008) · THE SOURCING READ-OUTS, DERIVED ON THE SERVER ───────────
    //
    // 🛑 SO THE SCREEN NEVER RE-IMPLEMENTS THE BATCH RULE. Vida's sourcing shortcut has to
    // print a quantity before anything runs, and the only quantity that is not a guess is
    // the one `sourceProgramme` will actually use. `next_batch` IS `nextBatchSize(p)` — the
    // same function, on the same row — so the button cannot promise 250 while the run does
    // 100. A screen that computes `min(batch_size, room)` itself is a second copy of a rule,
    // and two copies is how they drift.
    //
    // `may_source` is `authorityFor(p, 'NEXT_BATCH')`, which is the exact verdict the
    // programme-native route applies: status, the P1 floor, the review hold and the
    // remaining ceiling. The reason travels with it, because a disabled button that will not
    // say why sends an operator hunting.
    /** `nextBatchSize(p)` — what a run started right now would actually ask for. */
    next_batch: number
    /** `authorityFor(p, 'NEXT_BATCH').allowed` — may a batch start at all? */
    may_source: boolean
    /** The refusal in the operator's words, or null when sourcing is authorised. */
    source_blocked_reason: string | null
  } | null
  // ── ⚑ 7 Sep (HOUSE-024 / HOUSE-026) · READ-ONLY TRUTH, NO NEW SCREEN ────────────────
  //
  // 🛑 SO THE FOUNDER CAN *PROVE* IT RATHER THAN ASSUME IT. Two questions had no answer
  // anywhere outside a log: WHICH mailbox would actually send for this client, and whether
  // the prepared work is still the work the customer approved. Both are computed by the same
  // functions the gates use — `resolveSendingInbox` and `preparationDrift` — so the console
  // and the refusal can never disagree about them.
  //
  // ⚠️ IDENTITY, NEVER CREDENTIALS. The address and the mailbox's own state; no host, no
  // user, no password, nothing that could be read off a screen and used.
  //
  // ⚠️ AND `can_send` IS THE RESOLVER'S VERDICT, NOT "a mailbox exists". A warming mailbox is
  // assigned and cannot send, which is exactly the distinction an operator needs.
  sender: {
    /** The address that would send, or null when nothing resolves. */
    email: string | null
    /** `assigned` · `warming` · `active` — the mailbox's own state, unchanged. */
    status: string | null
    /** Shared or dedicated, as the row records it. */
    kind: string | null
    /** `resolveSendingInbox(...).ok` — the same verdict the send path gets. */
    can_send: boolean
    /** The refusal in the operator's words, or null when a mailbox is ready. */
    blocker: string | null
  } | null
  /** Whether the prepared work still matches what was approved. Null when unreadable. */
  preparation: {
    state: 'not_approved' | 'unchanged' | 'changed' | 'unreadable'
    detail: string | null
  } | null
  batches: BatchSummary[]
  /** Batches in the dead-letter state. Client entitlement is reserved and NOT usable. */
  stranded: BatchSummary[]
  blockers: ProgrammeBlocker[]
  /**
   * Which parts could not be read. A populated array means the console must NOT be read as
   * "nothing wrong" — it means we could not tell.
   */
  degraded: string[]
}

const PROGRAMME_COLUMNS =
  'id, client_id, status, meeting_target, recommended_volume, first_paid_at, second_paid_at, ' +
  'first_payment_ref, second_payment_ref, sourcing_ceiling, sourced_used, sourced_reserved, ' +
  'approved_at, went_live_at, paused_at, pause_reason, review_required_at, review_reason, review_resolved_at, ' +
  // ⚑ PR A2 — the money/authority fields Vida needs to say WHICH authority a stage holds.
  // The payment INTENT ids are deliberately absent: the XOR guards read them from the full
  // ProgrammeRow on the backend, and an operator screen has no question they answer.
  'first_authorised_at, second_authorised_at'

const BATCH_COLUMNS = 'id, programme_id, seq, status, requested, granted, delivered, created_at, settled_at'

/**
 * The operational state, derived from the row alone — pure, so every branch is provable
 * without a database and the same programme cannot read differently in two places.
 */
export function operationalState(
  p: ProgrammeRow,
  opts: { strandedBatches?: number; liveCampaign?: boolean } = {},
): ProgrammeOperationalState {
  if (TERMINAL_STATUSES.includes(p.status as ProgrammeStatus)) return 'completed'
  if (p.paused_at) return 'paused'
  if (reviewIsOpen(p)) return 'review_required'
  // BLOCKED is anything that stops delivery which is NOT a deliberate hold. A stranded batch
  // qualifies: the client's volume is reserved and unusable until a human reconciles it.
  if ((opts.strandedBatches ?? 0) > 0) return 'blocked'
  if (p.status === 'LIVE' && opts.liveCampaign === false) return 'blocked'
  if (p.sourcing_ceiling - p.sourced_used - p.sourced_reserved <= 0) return 'blocked'
  return 'continuing'
}

/** The blockers behind a `blocked` state, each one a row that exists — never a guess. */
export function blockersFor(
  p: ProgrammeRow,
  opts: { stranded?: BatchSummary[]; liveCampaign?: boolean } = {},
): ProgrammeBlocker[] {
  const out: ProgrammeBlocker[] = []
  for (const b of opts.stranded ?? []) {
    out.push({
      kind: 'stranded_batch',
      detail: `Batch ${b.seq} (${b.id.slice(0, 8)}) is STRANDED — its reservation could not be released. ` +
        `${b.granted - (b.delivered ?? 0)} record(s) of the client's paid volume are held and unusable until this is reconciled by hand.`,
    })
  }
  if (p.sourcing_ceiling - p.sourced_used - p.sourced_reserved <= 0) {
    out.push({
      kind: 'sourcing_ceiling_reached',
      detail: `Authorised volume is consumed (${p.sourced_used} used + ${p.sourced_reserved} reserved of ${p.sourcing_ceiling}). ` +
        'Unused value never expires; opening more is a human decision.',
    })
  }
  if (!p.approved_at && !TERMINAL_STATUSES.includes(p.status as ProgrammeStatus)) {
    out.push({ kind: 'not_approved', detail: 'The programme has not been approved, so no outreach may start.' })
  }
  if (!p.second_paid_at && !TERMINAL_STATUSES.includes(p.status as ProgrammeStatus)) {
    out.push({
      kind: 'second_payment_missing',
      detail: 'The second payment has not been received. Payment 1 authorises sourcing and preparation only — no outreach.',
    })
  }
  if (p.status === 'LIVE' && opts.liveCampaign === false) {
    out.push({
      kind: 'no_live_campaign',
      detail: 'The programme is LIVE but the client has no active campaign, so nothing can actually send.',
    })
  }
  return out
}

/**
 * Everything an operator needs about one client's programme, in one call.
 *
 * ⚠️ NEVER THROWS. An operator console that 500s tells nobody anything; one that degrades tells
 * them exactly which part is unknown. Each read is independent so one failure does not blank
 * the rest.
 */
export async function programmeTruthFor(clientId: string): Promise<ProgrammeTruth> {
  const degraded: string[] = []
  let programme: ProgrammeRow | null = null

  const { data: progRow, error: progErr } = await db.from('programmes')
    .select(PROGRAMME_COLUMNS)
    .eq('client_id', clientId)
    .not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
    .limit(1).maybeSingle()

  if (progErr) {
    // ⚠️ "COULD NOT READ" IS NOT "NO PROGRAMME". A client with no programme is a legacy client
    // and everything is fine; a client whose programme could not be read is a client whose
    // delivery state is UNKNOWN. Rendering both as "no programme" is the exact defect this
    // repo has now fixed four times, and on this surface it would hide a paused programme.
    degraded.push(`Programme could not be read (${progErr.message}) — this is NOT evidence that the client has no programme.`)
    return { programme: null, sender: null, preparation: null, batches: [], stranded: [], blockers: [], degraded }
  }
  programme = (progRow as unknown as ProgrammeRow | null) ?? null
  if (!programme) return { programme: null, sender: null, preparation: null, batches: [], stranded: [], blockers: [], degraded }

  let batches: BatchSummary[] = []
  const { data: batchRows, error: batchErr } = await db.from('programme_batches')
    .select(BATCH_COLUMNS).eq('programme_id', programme.id)
    .order('seq', { ascending: false }).limit(50)
  if (batchErr) degraded.push(`Batches could not be read (${batchErr.message}) — an empty batch list here means UNKNOWN, not none.`)
  else batches = (batchRows ?? []) as unknown as BatchSummary[]

  let liveCampaign: boolean | undefined
  const { data: camps, error: campErr } = await db.from('figsy_campaigns')
    .select('id').eq('client_id', clientId).eq('status', 'active').limit(1)
  if (campErr) degraded.push(`Campaign state could not be read (${campErr.message}).`)
  else liveCampaign = ((camps ?? []) as unknown[]).length > 0

  const stranded = batches.filter(b => b.status === 'stranded')
  const p = programme
  // NEXT_BATCH, not SOURCING: a run IS the opening of a new batch, so the review hold and the
  // remaining ceiling both apply — exactly as they do inside `sourceProgramme`.
  const sourcingVerdict = authorityFor(p, 'NEXT_BATCH')

  // ── ⚑ 7 Sep · SENDER AND PREPARATION TRUTH, both read-only and both best-effort ───────
  //
  // ⚠️ A FAILURE HERE IS RECORDED IN `degraded`, NEVER SWALLOWED AND NEVER FATAL. This console
  // is what an operator opens when something is wrong; a read that could not be completed must
  // say so rather than render `null` that reads as "there is no mailbox".
  let sender: ProgrammeTruth['sender'] = null
  try {
    const { resolveSendingInbox } = await import('./sending-inbox')
    const r = await resolveSendingInbox(p.client_id)
    sender = r.ok
      ? { email: r.inbox.email ?? null, status: r.inbox.status ?? null, kind: r.inbox.kind ?? null, can_send: true, blocker: null }
      : { email: null, status: null, kind: null, can_send: false, blocker: r.detail }
  } catch (err) {
    degraded.push(`The sending mailbox could not be read (${err instanceof Error ? err.message : String(err)}).`)
  }

  let preparation: ProgrammeTruth['preparation'] = null
  try {
    const { preparationDrift } = await import('./preparation-snapshot')
    const d = await preparationDrift(p.id)
    preparation = { state: d.state, detail: 'detail' in d ? d.detail : null }
  } catch (err) {
    degraded.push(`The approved-preparation comparison could not be run (${err instanceof Error ? err.message : String(err)}).`)
  }

  return {
    programme: {
      id: p.id,
      status: p.status,
      state: operationalState(p, { strandedBatches: stranded.length, liveCampaign }),
      meeting_target: p.meeting_target,
      sourcing_ceiling: p.sourcing_ceiling,
      sourced_used: p.sourced_used,
      sourced_reserved: p.sourced_reserved,
      room_remaining: p.sourcing_ceiling - p.sourced_used - p.sourced_reserved,
      paused_at: p.paused_at,
      pause_reason: p.pause_reason,
      approved_at: p.approved_at,
      second_paid_at: p.second_paid_at,
      recommended_volume: p.recommended_volume,
      first_paid_at: p.first_paid_at,
      first_payment_ref: p.first_payment_ref,
      second_payment_ref: p.second_payment_ref,
      went_live_at: p.went_live_at,
      first_authorised_at: p.first_authorised_at ?? null,
      second_authorised_at: p.second_authorised_at ?? null,
      review_required_at: p.review_required_at ?? null,
      review_reason: p.review_reason ?? null,
      review_resolved_at: p.review_resolved_at ?? null,
      review_trigger_leads: REVIEW_TRIGGER_LEADS,
      batch_size: PROGRAMME_BATCH_SIZE,
      next_batch: nextBatchSize(p),
      may_source: sourcingVerdict.allowed,
      source_blocked_reason: sourcingVerdict.allowed ? null : sourcingVerdict.message,
    },
    sender,
    preparation,
    batches,
    stranded,
    blockers: blockersFor(p, { stranded, liveCampaign }),
    degraded,
  }
}

// ── STRANDED BATCHES, PLATFORM-WIDE ──────────────────────────────────────────────────────
//
// 🛑 THE GAP THIS CLOSES. `settleBatch` marks a batch `stranded` and sends the founder an
// EMAIL. An email is not a tracked blocker: it is read once, or not, and then it is gone.
// `programme_batches_stranded_idx` was created for exactly this query and nothing ever ran it,
// so a client's paid volume could sit reserved and unusable with no surface to find it by.

export type StrandedRow = BatchSummary & { programme_id: string; client_id: string | null }

export async function strandedBatches(): Promise<{ rows: StrandedRow[]; degraded: string | null }> {
  const { data, error } = await db.from('programme_batches')
    .select(`${BATCH_COLUMNS}, programmes(client_id)`)
    .eq('status', 'stranded')
    .order('created_at', { ascending: true })
    .limit(100)
  if (error) {
    return { rows: [], degraded: `Stranded batches could not be read (${error.message}) — an empty list here means UNKNOWN, not none.` }
  }
  const rows = ((data ?? []) as unknown as (BatchSummary & { programme_id: string; programmes?: { client_id?: string } | null })[])
    .map(r => ({ ...r, client_id: r.programmes?.client_id ?? null }))
  return { rows, degraded: null }
}

// ── UNCLOSED PROVIDER EVICTIONS ──────────────────────────────────────────────────────────
//
// A person asked us to stop, our send gate refuses NEW sends to them — and a provider that
// already holds its own copy of the lead keeps sending. BUILD-003 item 6 made that risk
// COUNTABLE by stamping `provider_eviction_required_at`. This is where it becomes visible:
// an open eviction is a real person still receiving mail they asked us to stop.

export type EvictionBlocker = {
  lead_id: string
  client_id: string | null
  provider: string | null
  reason: string | null
  required_at: string
}

export async function openEvictions(): Promise<{ rows: EvictionBlocker[]; degraded: string | null }> {
  const { data, error } = await db.from('leads')
    .select('id, client_id, provider_eviction_required_at, provider_eviction_provider, provider_eviction_reason')
    .not('provider_eviction_required_at', 'is', null)
    .is('provider_evicted_at', null)
    .order('provider_eviction_required_at', { ascending: true })
    .limit(100)
  if (error) {
    return { rows: [], degraded: `Open provider evictions could not be read (${error.message}) — an empty list here means UNKNOWN, not none.` }
  }
  const rows = ((data ?? []) as Record<string, unknown>[]).map(r => ({
    lead_id: String(r.id),
    client_id: (r.client_id as string | null) ?? null,
    provider: (r.provider_eviction_provider as string | null) ?? null,
    reason: (r.provider_eviction_reason as string | null) ?? null,
    required_at: String(r.provider_eviction_required_at),
  }))
  return { rows, degraded: null }
}

// ── LEAD POOL — A TRUTHFUL SUMMARY, AND NOTHING MORE ─────────────────────────────────────
//
// ⚠️ EVERY FIELD IS A COUNT OF ROWS THAT EXIST. No fill-rate, no "pool health", no projected
// coverage. `money-path` currently renders *"Pool data unavailable"*, and the only other pool
// read in the product is the candidate match inside source-preview. The minimum truthful
// answer to "what is in the pool?" is how many records, from which providers, in which
// countries — so that is exactly what this returns.
//
// ⚠️ `total` IS AN EXACT COUNT, NOT A PAGE LENGTH. `head: true` with `count: 'exact'` asks the
// database to count; reading `data.length` off a limited select would report the LIMIT as the
// pool size, which is the shape of the `.limit(1000)` bug this repo has already fixed twice.

export type PoolSummary = {
  total: number | null
  by_source: { source: string; count: number }[]
  by_country: { country: string; count: number }[]
  /** Sample size the breakdowns were computed from — stated, so a partial read cannot pose as total. */
  breakdown_sample: number
  degraded: string[]
}

export async function poolSummary(): Promise<PoolSummary> {
  const degraded: string[] = []
  let total: number | null = null

  const { count, error: countErr } = await db.from('lead_pool')
    .select('email_norm', { count: 'exact', head: true })
  if (countErr) degraded.push(`Pool size could not be counted (${countErr.message}) — treat the total as UNKNOWN, not zero.`)
  else total = count ?? 0

  // The breakdowns are computed from a bounded sample, and the sample size is RETURNED so the
  // console can say so. A breakdown presented as if it covered the whole pool would be exactly
  // the invented metric this file refuses to produce.
  const SAMPLE = 5000
  const { data, error } = await db.from('lead_pool').select('source, country').limit(SAMPLE)
  if (error) {
    degraded.push(`Pool breakdown could not be read (${error.message}).`)
    return { total, by_source: [], by_country: [], breakdown_sample: 0, degraded }
  }

  const rows = (data ?? []) as { source: string | null; country: string | null }[]
  const tally = (key: 'source' | 'country') => {
    const m = new Map<string, number>()
    for (const r of rows) {
      const v = (r[key] ?? '').trim().toLowerCase() || 'unknown'
      m.set(v, (m.get(v) ?? 0) + 1)
    }
    return [...m].map(([k, c]) => ({ [key]: k, count: c })).sort((a, b) => b.count - a.count).slice(0, 12)
  }

  return {
    total,
    by_source: tally('source') as { source: string; count: number }[],
    by_country: tally('country') as { country: string; count: number }[],
    breakdown_sample: rows.length,
    degraded,
  }
}

// ── DEBRIS: TEST AND PLACEHOLDER ROWS LEFT IN PRODUCTION ─────────────────────────────────
//
// ⚠️ THIS FINDS, IT NEVER REMOVES. Deleting production rows is not something a console does on
// a pattern match — the founder's own `PR2 RUNTIME TEST — DO NOT USE` ICP is exactly the kind
// of row that is deliberate today and debris tomorrow, and only a human knows which. So this
// surfaces candidates and the operator decides, using the reversible deactivation action.
//
// ⚠️ THE PATTERNS ARE NAMING CONVENTIONS, NOT A CLASSIFIER. An ICP called "Testing new
// verticals" is a real ICP. Matching is deliberately narrow and the result is labelled a
// CANDIDATE everywhere it appears.

export const DEBRIS_PATTERNS = ['do not use', 'runtime test', 'test —', 'test -', 'delete me', 'placeholder']

export function looksLikeDebris(name: string | null | undefined): boolean {
  if (!name) return false
  const n = name.toLowerCase()
  return DEBRIS_PATTERNS.some(p => n.includes(p))
}

export type DebrisIcp = {
  id: string
  client_id: string | null
  name: string | null
  is_active: boolean
  created_at: string | null
  last_run_at: string | null
}

export async function debrisIcps(): Promise<{ rows: DebrisIcp[]; degraded: string | null }> {
  const { data, error } = await db.from('icps')
    .select('id, client_id, name, is_active, created_at, last_run_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) {
    return { rows: [], degraded: `ICPs could not be scanned (${error.message}) — an empty list here means UNKNOWN, not none.` }
  }
  const rows = ((data ?? []) as unknown as DebrisIcp[]).filter(r => looksLikeDebris(r.name))
  return { rows, degraded: null }
}

// ── CRASHED PROOF/SOURCING RUNS — RECOVERY VISIBILITY ────────────────────────────────────
//
// 🛑 `icp_run_outcomes.status = 'failed'` IS WRITTEN AND NOTHING READS IT. R72 added the value
// on 26 Aug precisely so a crashed run would be a TERMINAL FACT rather than a silent spinner —
// the prospect sees the approved recovery copy ("We hit a snag confirming your matches") and
// the run is recorded honestly. But the system telling the truth to itself is only half the
// job: nobody was told. A prospect sits on that copy, having been promised a human, and no
// operator surface anywhere shows that their run died.
//
// ⚠️ THE RECOVERY ACTION ALREADY EXISTS AND IS NOT REBUILT HERE. An operator re-runs sourcing
// through `POST /operator/source`, which has a cost preview in front of it. What was missing
// was knowing there was anything to re-run. This is that.
//
// ⚠️ BOUNDED BY TIME, NOT BY A PAGE. A crash from six weeks ago is history; the operator needs
// the ones still worth acting on, so this reads a window and says how wide it is.

export type FailedRun = {
  icp_id: string
  client_id: string | null
  message: string | null
  created_at: string
}

export const FAILED_RUN_WINDOW_DAYS = 14

export async function failedRuns(): Promise<{ rows: FailedRun[]; windowDays: number; degraded: string | null }> {
  const since = new Date(Date.now() - FAILED_RUN_WINDOW_DAYS * 86_400_000).toISOString()
  const { data, error } = await db.from('icp_run_outcomes')
    .select('icp_id, client_id, message, created_at, status')
    .eq('status', 'failed')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) {
    return { rows: [], windowDays: FAILED_RUN_WINDOW_DAYS, degraded: `Crashed runs could not be read (${error.message}) — an empty list here means UNKNOWN, not none.` }
  }
  const rows = ((data ?? []) as Record<string, unknown>[]).map(r => ({
    icp_id: String(r.icp_id),
    client_id: (r.client_id as string | null) ?? null,
    message: (r.message as string | null) ?? null,
    created_at: String(r.created_at),
  }))
  return { rows, windowDays: FAILED_RUN_WINDOW_DAYS, degraded: null }
}
