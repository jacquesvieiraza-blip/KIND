// THE CLIENT SNAPSHOT — one builder, every door.
//
// Extracted VERBATIM from /leads/milla-summary on 12 Aug so Milla's chat could speak from
// the same numbers the desk's KPIs show. The alternative — copying the queries into the
// chat path — is the drift bug this repo keeps re-learning (#570's "mirrors exactly"
// comment that didn't; the campaign lookup that was nearly copied into approve's 3b):
// two copies of "what is this client's state" WILL disagree, and the chat one would
// disagree in front of a client. So the route now calls this, and the chat calls this,
// and there is exactly one answer to the question.
//
// ⚠️ MONEY NOTE preserved from the route: spend is NOT `approved × $4`. The first
// PACK_LEADS approvals are INSIDE the pack price — see the inline comment at spend_usd,
// which fixed a 4× overstatement on the client's own Reports page.

import { db } from '@kind/db'
// BUILD-003 item 2 — public.meetings is the sole source of meeting counts.
import { meetingCounts } from './meeting-truth'
// J5-C2: the ONE predicate that decides needs-review, shared with the Proof route's gate.
import { icpNeedsReview } from './icp-provider-translation'
import { PAID_TX_TYPES, PACK_PRICE_USD, LEAD_PRICE_USD, packState } from './onboarding-pack'

export interface MillaSummaryData {
  wallet_balance_usd: number
  has_funded: boolean
  /** ⚑ 24 Aug — HOW MANY FREE-PROOF BATCHES THIS PROSPECT HAS ALREADY BEEN SHOWN.
   *  Read straight from `clients.proof_passes_done`, the SAME column
   *  `try_claim_proof_pass` increments — there is no second counter, and this is a
   *  read only. The desk needs it so it can tell three states apart WITHOUT pressing
   *  anything to find out: 0 = nothing spent · 1 = refinement and a second batch are
   *  available · 2 = both spent, a human takes it from here. Before this, the only way
   *  to learn the third state was to POST and read the 409. */
  proof_passes_done: number
  /**
   * ⚑ 26 Aug — WHEN THE CURRENT PROOF PASS WAS CLAIMED. ISO string, or null.
   *
   * Read straight from `clients.proof_started_at`, which `try_claim_proof_pass` writes in
   * the SAME atomic statement that increments the counter above. It therefore always
   * describes the LATEST claim — pass 1 sets it, pass 2 advances it, a refused claim never
   * reaches it — and the pass it belongs to is `proof_passes_done` in the same row.
   *
   * ⚠️ THIS IS THE DESK'S AUTHORITATIVE CLOCK, and it exists to end an inference. The desk
   * decides "still finding your matches" from the approved recovery copy by elapsed time,
   * and it used to get that from the browser: a `?since=` stamp written only AFTER the
   * /proof POST returned, mirrored into localStorage. A server that claimed the pass and
   * then lost its response left a claimed run whose start existed nowhere; a clean URL lost
   * it; another device never had it; a stale stamp from an older pass could make a fresh run
   * look old enough to have failed. None of that can happen to a value the claim itself
   * wrote.
   *
   * ⚠️ NULL MEANS UNKNOWN, NEVER "LONG AGO". Rows that predate the column stay null and are
   * never backfilled — there is no truthful source to backfill from. The desk treats null as
   * "may still be running" under its bounded poll rather than inventing an age.
   */
  proof_started_at: string | null
  pack: ReturnType<typeof packState>
  leads_awaiting: number
  meetings_booked: number
  leads_approved_total: number
  replies_total: number
  meetings_total: number
  spend_usd: number
  active_campaign: string | null
  campaign_name: string | null
  campaign_status: string | null
  recent_replies: { name: string; classification: string }[]
  icp_versions: { version: string; current: boolean; name: string; summary: string; created_at: string | null }[]
  /**
   * ⚑ 26 Aug — THE TERMINAL TRUTH OF THE LAST RUN, so the desk can stop guessing.
   *
   * The proof desk decided "still finding" from a URL flag and "finished" from leads
   * appearing. A run that finished with ZERO therefore spun forever: no leads ever
   * arrived, so nothing ever cleared the flag, and after ~60s the copy only changed to
   * "we're still finding your matches" — which was false. The run had ended.
   *
   * `runIcpJob` already records exactly one `icp_run_outcomes` row per completed run,
   * with canonical client copy from `runOutcomeMessage()`. It was simply never read.
   * This carries it on the summary the desk ALREADY polls — no new endpoint, no extra
   * request, no migration.
   *
   * ⚠️ `null` means NO RUN HAS EVER COMPLETED for this client — which is not the same as
   * "still running". The desk pairs this with the run it started; see `finished_at`.
   */
  proof_run: { status: string; message: string; total_inserted: number; finished_at: string | null } | null
  /**
   * ⛓️ 18 Sep (J5-C2 · LR 6) — THE RUN'S RECORDED STATE, so the desk's words come from the
   * record rather than from a clock.
   *
   * `null` means NOTHING IS RECORDED — a claim the summary has not caught up with, or a run
   * from before J5-C1's ownership existed. That is the only case in which the bounded poll
   * decides, and it is why this is nullable rather than defaulted: a default would be an
   * invented fact, which is the whole class of defect this item removes.
   *
   * ⚠️ `failed` HERE IS A RECORD, NOT A TIMEOUT. `proofWaitState` reads it ahead of the bound,
   * so a failure is said the moment it is known instead of being described as a search for
   * another few minutes.
   */
  proof_work_state: 'requested' | 'started' | 'completed' | 'failed' | 'stuck' | null
  /**
   * ⛓️ 18 Sep (J5-C2) — a person is finishing what our provider vocabulary could not take.
   *
   * ⚠️ IT IS THE SAME PREDICATE THE PROOF ROUTE GATES ON (`icpNeedsReview`), so the desk
   * cannot say "we are searching" about an ICP the gate is refusing to search. Two readers of
   * one fact, never two answers.
   */
  needs_icp_review: boolean
  /**
   * ⚑ 3 Sep — IS THERE ANYTHING ON THEIR DESK RIGHT NOW?
   *
   * 🛑 ONE BOOLEAN, AND IT EXISTS BECAUSE MILLA WAS DESCRIBING A SET NOBODY COULD SEE. The
   * chat prompt told her the STAGE and nothing about the DESK, so at Proof she read step 1 of
   * the lifecycle — *"a small free calibration set: real people who match their targeting,
   * masked"* — and stated it in the present tense to a client looking at an empty screen. She
   * had no fact with which to say otherwise. That is a gap, not a hallucination, and the fix
   * is the missing fact rather than a longer prohibition.
   *
   * ⚠️ IT IS NOT `leads_awaiting` UNDER ANOTHER NAME, and the difference is the point.
   * `MillaSnapshot` deliberately excludes the per-lead counts so the retired ECONOMICS cannot
   * reach the model; a yes/no about whether the desk currently holds anything carries no
   * price, no wallet and no queue. It is derived from the SAME bounded count the cards use,
   * so the sentence she speaks and the screen beside her cannot disagree.
   */
  calibration_set_on_desk: boolean
}

/**
 * The campaign to report as CURRENT for this client.
 *
 * ── THE BLEED ───────────────────────────────────────────────────────────────────────────
 *
 * This read was `client_id` + newest row + ANY state. `figsy_campaigns` has no `programme_id`
 * column, so nothing in it distinguished a programme's campaign from a retired one — and Milla
 * renders `campaign_status` as **"Programme live" / "Paused — we'll tell you why" / "Programme
 * finished"**. A client whose only campaign is a retired legacy row would have been told their
 * programme was live, or paused, on the strength of a campaign the programme never created.
 *
 * ── THE RULE (founder, 3 Sep) ───────────────────────────────────────────────────────────
 *
 * 🛑 **"If there is no positively programme-safe campaign truth available for Milla, show no
 * current campaign rather than infer one."** So when a programme is open, the campaign must
 * BELONG to it, and `null` is the honest answer when none does.
 *
 * ⚠️ ATTRIBUTION IS DERIVED, NOT ADDED. A campaign belongs to a programme when its ICP does:
 * `attachIcpToProgramme` is the only writer of `icps.programme_id`, and it REFUSES any ICP that
 * already carries a campaign — so an attached ICP provably had none when it joined, and the
 * only campaign it can hold was created after attachment, for that programme. No column, no
 * migration, no backfill.
 *
 * ⚠️ LEGACY IS UNTOUCHED. A client with no open programme takes the identical query it always
 * took: their campaign is their campaign. The widget that renders this is separately gated to
 * the outreach stages, so a legacy campaign cannot be read as programme truth at Proof either.
 */
async function campaignFor(clientId: string) {
  const newest = () => db.from('figsy_campaigns').select('name, status').eq('client_id', clientId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  // ⛓️ 3 Sep (C2 live) — ~~`(await openProgrammeForClient(clientId))?.id ?? null` … `if
  // (!programmeId) return newest()`.~~ THAT READ "NO PROGRAMME ROW" AS "NO BOUNDARY, SHOW
  // EVERYTHING", so House — a declared programme client between programmes — kept its retired
  // legacy campaign as the current one. The boundary is now `currentWorkspaceScope`.
  const { currentWorkspaceScope } = await import('./current-workspace')
  const scope = await currentWorkspaceScope(clientId)

  // ⚠️ FAIL-CLOSED HERE, UNLIKE THE REPLIES RAIL, AND THE DIFFERENCE IS DELIBERATE. A missing
  // reply is a rail that looks quiet; a wrong campaign status is a SENTENCE — "Programme live" —
  // asserting that outreach is running. Not knowing is never grounds to say that.
  if (scope.kind === 'unreadable') {
    console.error('[milla-summary] workspace scope unreadable for', clientId, scope.reason)
    return { data: null, error: null }
  }
  // Legacy and unclassified: their campaign is their campaign, exactly as it always was.
  if (scope.kind === 'legacy') return newest()
  // ── 🛑 3 Sep (WITHDRAWN AND REPLACED) — FREE PROOF IS CALIBRATION, NOT OUTREACH ──────────
  //
  // ⛓️ THIS RETURNED `newest()`, on the reasoning that a proof client's newest campaign is
  // whatever Milla scaffolded while saving their ICP. For a clean new prospect that is true and
  // harmless; for a DECLARED PROGRAMME CLIENT BETWEEN PROGRAMMES it hands back a retired
  // campaign as the current one, which is exactly the sentence House was showing. Proof sends
  // nobody an email, so a campaign readable here can only be an earlier motion's.
  //
  // 🛑 NO CURRENT OUTREACH MEANS NO CURRENT CAMPAIGN. A real answer, not a gap — and it costs a
  // genuine proof prospect nothing, because a scaffolded campaign they have never run is not a
  // fact about their current work either.
  if (scope.kind === 'proof') return { data: null, error: null }
  const programmeId = scope.programmeId

  const { data: icpRows, error: icpErr } = await db.from('icps')
    .select('id').eq('client_id', clientId).eq('programme_id', programmeId)
  if (icpErr) {
    console.error('[milla-summary] programme ICPs unreadable for', clientId, icpErr.message)
    return { data: null, error: null }
  }
  const icpIds = (icpRows ?? []).map((r: { id: string }) => r.id)
  // No attached ICP means no programme campaign can exist yet. That is a real answer.
  if (icpIds.length === 0) return { data: null, error: null }

  return db.from('figsy_campaigns').select('name, status')
    .eq('client_id', clientId).in('icp_id', icpIds)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
}

/**
 * The replies to show as CURRENT activity for this client.
 *
 * 🛑 THE RULE: an open programme means the rail shows that programme's replies. No programme
 * means legacy, and legacy is exactly as it was.
 *
 * ⚠️ FAIL-SOFT, NOT FAIL-CLOSED, AND THAT IS DELIBERATE HERE. Everywhere this codebase gates
 * MONEY or SENDING, an unreadable state refuses. This is a display rail: refusing would blank
 * a client's replies over a transient read error, which is a worse lie than showing them. So a
 * failed programme read falls back to the legacy client-scoped list and logs it.
 */
async function recentRepliesFor(clientId: string) {
  const base = () => db.from('figsy_replies')
    .select('from_name, from_email, classification, received_at')
    .eq('client_id', clientId).order('received_at', { ascending: false }).limit(4)

  // ⛓️ 3 Sep (C2 live) — the same correction as `campaignFor`. The founder's screenshot showed
  // a 2026 reply sitting in House's rail as current activity; the previous pass scoped this to
  // the OPEN PROGRAMME, and House has none, so it fell straight back to the client-wide list.
  const { currentWorkspaceScope } = await import('./current-workspace')
  const scope = await currentWorkspaceScope(clientId)

  // ── 🛑 4 Sep — FAIL-SOFT BECAME FAIL-OPEN-TO-HISTORY, AND THE FOUNDER REFUSED IT ────────
  //
  // ⛓️ THIS RETURNED `base()` — the unbounded client-scoped rail — and said so deliberately:
  // *"refusing would blank a client's replies over a transient error, which is a worse lie
  // than showing them."* That was written when the fallback could only ever show a LEGACY
  // client their own replies. It is no longer true: once a programme customer's retired book
  // is behind the same fallback, "avoid an empty rail" means "show history as current the
  // moment authority resolution flickers" — which is the exact class three PRs have been
  // closing. Founder-ruled 4 Sep: **unreadable must not display historical work as current.**
  //
  // ⚠️ AND THE RAIL AND THE REPLIES PAGE MUST AGREE, which is D1's whole lesson pointing the
  // other way. One table, one degradation — the page now refuses too.
  //
  // ⚠️ AN EMPTY RAIL IS RECOVERABLE; A FALSE ONE IS NOT. The `error` is carried so the caller
  // can tell "no replies" from "we could not read them" rather than rendering a claim.
  if (scope.kind === 'unreadable') {
    console.error('[milla-summary] workspace scope unreadable for', clientId, scope.reason)
    return { data: [] as Record<string, unknown>[], error: { message: scope.reason } }
  }
  if (scope.kind === 'legacy') return base()
  // ── 🛑 3 Sep (WITHDRAWN AND REPLACED) — FREE PROOF SENDS NOBODY AN EMAIL ─────────────────
  //
  // ⛓️ THIS RETURNED `base()` — the unbounded client-scoped rail — on the reasoning that free
  // proof sends nothing "so it is empty in practice". That is true of a clean new prospect and
  // FALSE of a declared programme client between programmes, whose old replies then sat in the
  // rail as current activity. It is the same absence-read-as-a-fact error the whole boundary
  // exists to end: "sends nothing" describes the motion, not the account.
  //
  // 🛑 NO OUTREACH MEANS NO CURRENT REPLIES. Returned positively as an empty rail, which for a
  // calibration-only workspace is the TRUE answer rather than a degraded one.
  if (scope.kind === 'proof') return { data: [] as Record<string, unknown>[], error: null }
  const programmeId = scope.programmeId

  // Positive attribution, derived: this programme's leads, then their replies. Two reads
  // rather than a join, because PostgREST embedding on a nullable FK is the kind of query
  // that silently returns the wrong shape when the relationship name changes.
  const { data: leadRows, error: leadErr } = await db.from('leads')
    .select('id').eq('client_id', clientId).eq('programme_id', programmeId)
  if (leadErr) {
    console.error('[milla-summary] programme leads unreadable for', clientId, leadErr.message)
    return base()
  }
  const ids = (leadRows ?? []).map((r: { id: string }) => r.id)
  // A programme with no leads yet has no current replies — that is a real answer, not a gap.
  if (ids.length === 0) return { data: [] as Record<string, unknown>[], error: null }

  return db.from('figsy_replies')
    .select('from_name, from_email, classification, received_at')
    .eq('client_id', clientId).in('lead_id', ids)
    .order('received_at', { ascending: false }).limit(4)
}

export async function buildMillaSummaryData(clientId: string): Promise<MillaSummaryData> {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

  // ── 🛑 3 Sep (C2 live) · THE TWO REMAINING CURRENT-WORK COUNTS ────────────────────────
  //
  // `awaiting` mirrors `/leads/for-approval` and `meetings` is this month's booked count. Both
  // were client-scoped with no boundary, so a declared programme client between programmes read
  // its retired desk as a live number: House showed prospects waiting and meetings booked for
  // work the retired model did. The all-time report figures below are DELIBERATELY untouched —
  // they are labelled as history and are the one place it belongs.
  const { currentWorkspaceScope, showsCurrentOutreach } = await import('./current-workspace')
  const summaryScope = await currentWorkspaceScope(clientId)
  // ⛓️ 3 Sep (WITHDRAWN AND REPLACED) — ~~`const noCurrentWork = summaryScope.kind === 'none'`~~.
  // `none` was a client-level verdict reached from `proof_passes_done`, and it is gone: whether
  // a client has current CARDS is now decided per row by `proof_pass`, and whether they have
  // current OUTREACH is decided by the scope. Two different questions, two different answers,
  // neither of them a counter.
  const outreach = showsCurrentOutreach(summaryScope) || summaryScope.kind === 'unreadable'

  // ⚠️ HOISTED OUT OF THE `Promise.all` TUPLE, AND THAT IS A COMPILER CONSTRAINT, NOT A STYLE
  // CHOICE. Two conditional narrowings on one supabase-js builder inside an eleven-element
  // tuple makes TypeScript give up ("type instantiation is excessively deep"). The annotation
  // caps it at the one shape this value actually has. The QUERY is unchanged.
  const awaitingQuery: PromiseLike<{ count: number | null }> = (() => {
    /** The two chainable methods this one query needs, and nothing else — see above. */
    type CountQuery = PromiseLike<{ count: number | null }> & {
      eq(column: string, value: unknown): CountQuery
      not(column: string, operator: string, value: unknown): CountQuery
    }
    let q = db.from('leads').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).not('delivered_at', 'is', null)
      .not('surfaced_for_approval_at', 'is', null)   // no TTL — see /for-approval
      .is('revealed_at', null).neq('status', 'passed') as unknown as CountQuery
    // ⚠️ THE SAME BOUNDARY THE CARD LIST APPLIES, CLAUSE FOR CLAUSE, so the count and the
    // cards cannot disagree. A proof-scoped client counts ONLY attributed proof rows — which
    // is how House reaches 0 without anything being deleted, and how a real proof prospect
    // still sees their own number.
    if (summaryScope.kind === 'programme') q = q.eq('programme_id', summaryScope.programmeId)
    if (summaryScope.kind === 'proof') q = q.not('proof_pass', 'is', null)
    return q
  })()

  const [{ data: client }, awaiting, meetings, campaign, replies, icps, approvedTotal, repliesTotal, meetingsTotal, purchases, lastRun, lastWork] = await Promise.all([
    db.from('clients').select('wallet_balance_usd, proof_passes_done, proof_started_at').eq('id', clientId).maybeSingle(),
    // mirrors /for-approval — the exact set of masked cards the client can act on
    awaitingQuery,
    // ⛓️ COUNTED calendar_bookings (BUILD-003 item 2) — an operational record of what we
    // asked Google to create, blind to duplicates, spam and reschedules. Milla told the
    // client a number that could double-count a meeting they moved. Now public.meetings.
    //
    // 🛑 AND A CALIBRATION WORKSPACE HAS NO MEETINGS. Free proof books nobody, so a non-zero
    // count for a proof-scoped client could only be an earlier motion's — the same bleed as the
    // replies rail. The ALL-TIME figure below is untouched; history still counts where it
    // belongs, which is the report, not the current-work number.
    // ⚠️ AND WHEN A PROGRAMME IS OPEN IT IS SCOPED TO THAT PROGRAMME. `meetingCounts` has taken
    // `programmeId` since BUILD-003; this caller was passing only `clientId`, so the month
    // number still swept in meetings the RETIRED desk booked in the same month a new programme
    // started — the identical bleed the replies rail had, one surface further on.
    outreach
      ? meetingCounts(summaryScope.kind === 'programme'
          ? { clientId, programmeId: summaryScope.programmeId, since: monthStart }
          : { clientId, since: monthStart })
      : Promise.resolve(null),
    // Name AND status of the newest campaign, whatever state it is in. Filtering to
    // status='active' meant a paused or cold-suspended client was indistinguishable from
    // one with no campaign at all — and Milla told both of them "Campaign live".
    campaignFor(clientId),
    // ⛓️ SCOPED TO THE OPEN PROGRAMME WHEN ONE EXISTS (3 Sep). This was `client_id` alone, and
    // `figsy_replies` carries no `programme_id` column — so House's historical replies would
    // have kept sitting in the rail as current activity the moment a new programme was created,
    // and a founder screenshot found exactly that. Attribution is DERIVED through `lead_id`,
    // which is how every other layer resolves it; no column and no migration is added.
    //
    // ⚠️ LEGACY IS UNTOUCHED. A client with no open programme takes the identical query it
    // always took — the $299 pack clients keep every reply they have. History is preserved in
    // both cases: this decides what is shown as CURRENT, never what is kept.
    recentRepliesFor(clientId),
    // #495 — each icps row is a version; oldest = v1. Real history, no fabrication.
    // ⛓️ J5-C2 — `icp_review, icp_review_resolved_at` ADDED to an EXISTING read rather than a
    // new query: needs-review is one of the six recorded words the desk must be able to say,
    // and `icpNeedsReview` is the one predicate that decides it (the Proof route uses the same
    // one, so the desk and the gate cannot disagree).
    db.from('icps').select('name, industries, geographies, seniority_levels, company_sizes, job_titles, created_at, icp_review, icp_review_resolved_at')
      .eq('client_id', clientId).order('created_at', { ascending: true }).limit(12),
    // (audit fix) REAL all-time counts for the report — the reports page was deriving these
    // from a 50-row ledger slice / a 4-row replies rail, so healthy accounts under-counted.
    db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('revealed_at', 'is', null),
    db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    // Same move, all-time.
    meetingCounts({ clientId }),
    // NO FREEBIES — has this client EVER paid? (any wallet top-up / purchase). Drives the
    // paywall: no purchase → the client is gated until they load their wallet.
    db.from('credit_transactions').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).in('type', PAID_TX_TYPES),
    // ⚑ 26 Aug — the newest COMPLETED run for this client, whatever it concluded.
    // `runIcpJob` writes exactly one of these at the end of every run it finishes, so its
    // presence is the terminal signal the desk was missing. Read across the client rather
    // than one ICP: the desk does not track which ICP a proof run belonged to, and a
    // prospect has exactly one core ICP anyway.
    db.from('icp_run_outcomes').select('status, message, total_inserted, created_at')
      .eq('client_id', clientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    // ── ⛓️ 18 Sep (J5-C2) · THE RUN'S OWN RECORDED STATE ────────────────────────────────
    //
    // J5-C1 gave the Proof run an owner in `automatic_work` with requested/started/completed/
    // failed/stuck. Until this read, NOTHING carried those to a client surface, so the desk
    // decided its words from a CLOCK — a run that failed at second 3 was described as "finding
    // your matches" until the bound passed, and `stuck` could not be said at all.
    //
    // ⚠️ IT IS THE LATEST ROW, and `updated_at` is the ordering: a `failed` row from an earlier
    // pass must never describe the run happening now.
    db.from('automatic_work').select('state, failure_reason, updated_at')
      .eq('kind', 'proof_run').eq('client_id', clientId)
      .order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  // Pack state: bought it? how many of the included approvals have they used? Both derived
  // from rows that already exist, so there is no column to keep in sync.
  const { count: approvedEver } = await db.from('leads').select('id', { count: 'exact', head: true })
    .eq('client_id', clientId).not('revealed_at', 'is', null)
  const pack = packState((purchases.count ?? 0) > 0, approvedEver ?? 0)

  const icpRows = (icps.data ?? []) as Array<Record<string, unknown>>
  const arr = (v: unknown): string[] => Array.isArray(v) ? (v as string[]).filter(Boolean) : []
  const icp_versions = icpRows.map((r, i) => ({
    version: `v${i + 1}`,
    current: i === icpRows.length - 1,
    name: (r.name as string | null) ?? `ICP v${i + 1}`,
    summary: [
      arr(r.seniority_levels).join(' / ') || null,
      arr(r.industries).join(', ') || null,
      arr(r.geographies).join(', ') || null,
      arr(r.company_sizes).length ? `${arr(r.company_sizes)[0]}–${arr(r.company_sizes).slice(-1)[0]} staff` : null,
    ].filter(Boolean).join(' · '),
    created_at: (r.created_at as string | null) ?? null,
  }))

  return {
    wallet_balance_usd: Number((client as Record<string, number> | null)?.wallet_balance_usd ?? 0),
    // ⚑ 24 Aug — the existing column, read as-is. Fails to 0.
    //
    // ⛓️ CORRECTED 25 Aug: this said 0 "offers the refinement rather than hiding it". That
    // was the wrong way round and the founder caught it. The desk gates on
    // `proofPassesDone === 1`, so 0 HIDES the control. Failing to 0 is still the safe
    // direction — it just earns that description by offering nothing, not by offering
    // something. The behaviour is right; only the sentence describing it was wrong, and it
    // is the sentence that changed.
    proof_passes_done: Number((client as Record<string, number> | null)?.proof_passes_done ?? 0),
    // ⚑ 26 Aug — the claim's own stamp, passed through untouched. Absent column (migration
    // not yet run) and absent value both read as null, which the desk treats as UNKNOWN.
    proof_started_at: (() => {
      const v = (client as Record<string, unknown> | null)?.proof_started_at
      return typeof v === 'string' && v.length > 0 ? v : null
    })(),
    // ⚠️ NULL means no run has ever COMPLETED — never "still running". The desk decides
    // which by comparing `finished_at` against the moment it started the run it is
    // waiting on; an older outcome belongs to an earlier pass and must not end this one.
    needs_icp_review: (() => {
      const rows = ((icps as { data?: Array<Record<string, unknown>> | null } | null)?.data ?? [])
      return rows.some(r => icpNeedsReview(r.icp_review, (r.icp_review_resolved_at as string | null) ?? null))
    })(),
    // ⛓️ J5-C2 — carried verbatim, never interpreted here. The shared rule
    // (`proofWaitState`) owns what each state MEANS; this function's only job is to report
    // what was recorded. An `automatic_work` table that has not been migrated yet reads as
    // `null`, which is honest: nothing is recorded, so the clock stands in.
    proof_work_state: (() => {
      const w = (lastWork as { data?: Record<string, unknown> | null } | null)?.data
      const st = typeof w?.state === 'string' ? w.state : null
      return (st === 'requested' || st === 'started' || st === 'completed' || st === 'failed' || st === 'stuck')
        ? st : null
    })(),
    proof_run: (() => {
      const r = (lastRun as { data?: Record<string, unknown> | null } | null)?.data
      if (!r) return null

      // ── 🛑 3 Sep — THE ONE CURRENT-WORK READ THE C2 SWEEP MISSED ────────────────────────
      //
      // ⛓️ THIS RETURNED THE NEWEST `icp_run_outcomes` ROW FOR THE CLIENT, UNBOUNDED. Every
      // other current-work read in this file was given a workspace boundary on 3 Sep; this one
      // was not, and it is the same `if (!programmeId) return everything()` shape in its last
      // hiding place. The founder's screenshot of the clean House desk is what found it: with
      // the three historical cards and the historical reply correctly gone, the desk still
      // rendered **"No matches this time"** and the server's canonical quota sentence —
      // *"Sourcing capacity is temporarily out … your credits are untouched"* — from a run that
      // finished long ago, for a retired motion, mentioning a wallet the product no longer has.
      //
      // 🛑 THREE FALSE CLAIMS IN ONE CARD, and not one of them was invented copy: a sourcing
      // failure that is not happening, a provider outage that is not happening, and credits
      // that do not exist. An honest sentence about a past run becomes a lie the moment it is
      // presented as the present.
      //
      // ⚠️ FAIL-CLOSED ON UNREADABLE, for the same reason `campaignFor` is. A run outcome is an
      // ASSERTION — "your search failed", "nobody matched" — and not knowing the workspace is
      // never grounds to make one.
      if (summaryScope.kind === 'unreadable') return null

      // ── THE PROOF CASE, AND WHY THIS IS NOT THE WITHDRAWN COUNTER RETURNING ────────────
      //
      // 🛑 THE QUESTION HERE IS NOT "WHICH ROWS ARE CURRENT WORK". That question is per-row and
      // is answered by `leads.proof_pass` — using an account-level counter for it is exactly
      // what R90 withdrew. The question here is *"is there a proof RUN whose outcome is
      // current?"*, which is an ACCOUNT-LEVEL EVENT, and `proof_started_at` is the product's own
      // record of it: `try_claim_proof_pass` writes it in the SAME atomic statement that
      // authorises the run, and its migration calls it "the authoritative clock for the proof
      // desk's bounded wait". Answering an account-level question with an account-level fact is
      // not the error R90 names; answering a per-row question with one is.
      //
      // ⚠️ SO A CLIENT WITH NO RECORDED PROOF SESSION HAS NO RUN TO BE WAITING ON, and a
      // historical outcome may not stand in for one. That is House: `proof_started_at` is null,
      // and the desk's own guard (`finishedAt >= serverProofStartedAt`) FAILS OPEN on null —
      // `finishedAt >= 0` is true of every row ever written — which is precisely how a
      // months-old outcome reached the screen.
      //
      // ⚠️ AND THE PASS-BOUNDARY COMPARISON IS DELIBERATELY *NOT* DUPLICATED HERE. Deciding
      // WHICH pass an outcome belongs to is the desk's job and the desk already does it
      // correctly whenever the stamp is non-null. Two copies of that rule is the drift this
      // file's own header warns about; this gate answers only "is there a session at all".
      //
      // ⚠️ ROWS PREDATING THE 26-AUG COLUMN READ NULL and therefore lose the terminal card.
      // That is accepted rather than overlooked: the founder's production audit (R93) found
      // exactly three such accounts — Disrupt Shop and Glean — and ruled all of them demo/test
      // whose current workspace may go quiet. No row is touched either way.
      if (summaryScope.kind === 'proof') {
        const startedAt = (client as Record<string, unknown> | null)?.proof_started_at
        if (typeof startedAt !== 'string' || startedAt.length === 0) return null
      }

      return {
        status:         String(r.status ?? ''),
        message:        String(r.message ?? ''),
        total_inserted: Number(r.total_inserted ?? 0),
        finished_at:    r.created_at ? String(r.created_at) : null,
      }
    })(),
    // NO FREEBIES — true once the client has made their first purchase. The Milla
    // dashboard gates on this: no purchase → paywall to Billing.
    has_funded: (purchases.count ?? 0) > 0,
    // THE PACK — included approvals counted rather than faked into the wallet.
    pack,
    leads_awaiting:  awaiting.count ?? 0,
    // ⚑ 3 Sep — DERIVED FROM THE SAME BOUNDED COUNT THE CARDS USE, so what Milla says about
    // the desk and what the desk shows cannot disagree. See the field's note above for why it
    // is a boolean rather than the number.
    calibration_set_on_desk: (awaiting.count ?? 0) > 0,
    // ⚠️ null means the meetings read FAILED. Reporting 0 would tell a client with three
    // meetings that they had none — Milla speaking a false number in her own voice.
    meetings_booked: meetings?.booked ?? 0,
    // Real all-time totals + true $ spend.
    //
    // ⚠️ NOT `approved × $4`. The first PACK_LEADS approvals are INSIDE the pack, so a
    // client who used their included hundred was shown "$400 spent" against the pack
    // payment — a 4× overstatement, on the client's own Reports page. Same bug was
    // fixed on the Vida side and missed here, which is the worse of the two: they read
    // this one. Spend = the pack they bought + $4 for each approval BEYOND it.
    leads_approved_total: approvedTotal.count ?? 0,
    replies_total:        repliesTotal.count ?? 0,
    meetings_total:       meetingsTotal?.booked ?? 0,
    spend_usd:            pack.active
      ? PACK_PRICE_USD + Math.max(0, (approvedTotal.count ?? 0) - pack.included) * LEAD_PRICE_USD
      : (approvedTotal.count ?? 0) * LEAD_PRICE_USD,
    // active_campaign stays "the name of a LIVE campaign" so existing readers are
    // unchanged; campaign_status is the honest one.
    active_campaign: (campaign.data as { status?: string } | null)?.status === 'active'
      ? ((campaign.data as { name?: string } | null)?.name ?? null) : null,
    campaign_name:   (campaign.data as { name?: string } | null)?.name ?? null,
    campaign_status: (campaign.data as { status?: string } | null)?.status ?? null,
    recent_replies:  (replies.data ?? []).map((r: Record<string, unknown>) => ({
      name: (r.from_name as string | null) ?? (r.from_email as string | null) ?? 'Reply',
      classification: (r.classification as string | null) ?? 'reply',
    })),
    icp_versions,
  }
}
