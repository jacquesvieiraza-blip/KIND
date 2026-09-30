// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 30 Sep (R175) — THE NEXT BATCH STARTS ITSELF, INSIDE THE PROGRAMME'S OWN AUTHORITY.
//
// 🛑 THE GAP THIS CLOSES. A live programme's first batch was automatic (P1 continuation), and
// every batch after it waited for somebody to press "Source 250 leads" in Vida. Nobody was
// told to. House sourced 234, went live, and would have emailed all 234 and then stopped —
// against R136 ①, *"if we hit the 400 we stop"*: we work UP TO the limit, not to the first
// batch.
//
// ⛓️ WHY THIS IS NOT THE NIGHTLY TOP-UP RETIRED ON 27 AUG (PR1A, see `cron.ts`). That job
// bought leads for any client with a positive allowance, with no authority and no limit
// anyone had agreed to. This one runs ONLY inside a live programme, through the exact door the
// operator's button uses (`sourceProgramme` → `authorityFor(…, 'NEXT_BATCH')` → the ceiling,
// the reservation, the batch, the provider boundary). It adds no spending path and no quantity.
//
// ── WHAT IT WILL NOT DO (founder GO, 30 Sep) ────────────────────────────────────────────
//   · it never emails anybody: a new batch still stops at Send and Make live — a person sees
//     every prospect before outreach (#493), and that stop is kept on purpose;
//   · it never starts a batch while the last one is still being checked or awaiting review,
//     so batches cannot pile up one a day behind an unpressed button;
//   · it never runs on a paused, demo, held-for-review or non-live programme, nor while the
//     kill-switch is ON;
//   · it never passes the programme's limit, and at the limit it says so and stops for good.
//
// ⚠️ ONE DECISION, TWO READERS. `decideAutoBatch` is pure and is what BOTH the daily job and
// Vida's programme panel read, so the screen can never promise a batch the job will not start.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import type { ProgrammeRow } from './programme'

/** Start the next batch when fewer than this many days of sending are left to contact. */
export const AUTO_BATCH_DAYS_OF_SENDING = 2

export type AutoBatchState =
  | 'due'                // fewer than two days' sending left — the next daily run sources
  | 'enough_left'        // automatic, and not needed yet
  | 'not_live'
  | 'demo'
  | 'paused'
  | 'kill_switch'
  | 'review_hold'
  | 'not_authorised'
  | 'limit_reached'      // STOP — sourcing finished for this programme
  | 'audience_used_up'   // STOP — the last batch found nobody new; the ICP needs widening (R136 ⑥)
  | 'no_first_batch'
  | 'batch_running'
  | 'checking'
  | 'ready_for_review'
  | 'no_cap'
  | 'unreadable'

export type AutoBatchDecision = {
  /** `source` = the daily run will start a batch now. `wait` = not yet. `stop` = never again without a person. */
  action: 'source' | 'wait' | 'stop'
  state: AutoBatchState
  /** The line Vida prints, in the operator's words. */
  line: string
}

export type AutoBatchFacts = {
  status: string
  isDemo: boolean
  paused: boolean
  killSwitchOn: boolean
  /** `authorityFor(p, 'NEXT_BATCH')` — the same verdict the button and the route apply. */
  authority: { allowed: true } | { allowed: false; reason: string; message: string }
  /** `nextBatchSize(p)`. */
  nextBatch: number
  /** The send cap per day, or null when none is set. */
  dailyCap: number | null
  /** Enrolled on this programme and not emailed yet. null = unreadable. */
  leftToContact: number | null
  /** The most recent batch, or null when none was ever opened. */
  latestBatch: null | {
    seq: number
    status: string
    /** Sourced on this batch and not yet judged either way. */
    stillChecking: number | null
    /** Qualified on this batch and never put in front of the client (Send not pressed). */
    awaitingSend: number | null
    /** Qualified and surfaced on this batch. */
    surfaced: number | null
    /** Of those, how many are in the sequence (Make live has run). */
    enrolled: number | null
  }
}

const wait = (state: AutoBatchState, line: string): AutoBatchDecision => ({ action: 'wait', state, line })
const stop = (state: AutoBatchState, line: string): AutoBatchDecision => ({ action: 'stop', state, line })

/**
 * Should the daily run start the next batch for this programme — and if not, why not?
 *
 * The ORDER is the safety: every reason to hold is checked before the one reason to act.
 */
export function decideAutoBatch(f: AutoBatchFacts): AutoBatchDecision {
  if (f.isDemo) return stop('demo', 'The demo never sources.')
  if (f.status !== 'LIVE') return wait('not_live', 'Automatic batches start once this programme is live.')
  if (f.paused) return wait('paused', 'Paused — no new batch starts until it is resumed.')
  if (f.killSwitchOn) return wait('kill_switch', 'Kill-switch is ON — automatic batches wait until it is off.')

  if (!f.authority.allowed) {
    if (f.authority.reason === 'sourcing_ceiling_reached') {
      return stop('limit_reached', 'Limit reached — sourcing is finished for this programme.')
    }
    if (f.authority.reason === 'review_required') {
      return wait('review_hold', `Held for review — no new batch until it is resolved. ${f.authority.message}`)
    }
    return wait('not_authorised', `No new batch: ${f.authority.message}`)
  }
  if (f.nextBatch <= 0) return stop('limit_reached', 'Limit reached — sourcing is finished for this programme.')

  const b = f.latestBatch
  if (!b) return wait('no_first_batch', 'The first batch has not been opened yet, so there is nothing to follow on from.')
  if (b.status === 'running') return wait('batch_running', `Batch #${b.seq} is still being sourced.`)

  if (b.stillChecking === null || b.awaitingSend === null || b.surfaced === null || b.enrolled === null || f.leftToContact === null) {
    return wait('unreadable', 'Could not read where the last batch is up to, so no batch was started. It will try again on the next daily run.')
  }
  if (b.stillChecking > 0) {
    return wait('checking', `Batch #${b.seq}: ${b.stillChecking} still being checked — the next batch waits for it.`)
  }
  if (b.awaitingSend > 0) {
    return wait('ready_for_review', `Batch #${b.seq} is ready for your review — press Send, then Make live. The next batch waits for it.`)
  }
  if (b.surfaced > 0 && b.enrolled === 0) {
    return wait('ready_for_review', `Batch #${b.seq} has been sent for review but is not in sending yet — press Make live. The next batch waits for it.`)
  }
  if (b.surfaced === 0) {
    return stop('audience_used_up', `Batch #${b.seq} found nobody new who fits. The targeting may be used up — widen the ICP to go on.`)
  }

  if (f.dailyCap === null || f.dailyCap <= 0) {
    return wait('no_cap', 'No send cap is set, so "two days of sending left" cannot be worked out. Set a cap and automatic batches resume.')
  }
  const threshold = AUTO_BATCH_DAYS_OF_SENDING * f.dailyCap
  if (f.leftToContact >= threshold) {
    return wait('enough_left',
      `Automatic — the next batch of up to ${f.nextBatch} starts when fewer than ${threshold} are left to email (now ${f.leftToContact}).`)
  }
  return {
    action: 'source', state: 'due',
    line: `Due — the next batch of up to ${f.nextBatch} starts on the next daily run (${f.leftToContact} left to email).`,
  }
}

// ── IO ──────────────────────────────────────────────────────────────────────────────────

async function countOrNull(q: PromiseLike<{ count: number | null; error: unknown }>): Promise<number | null> {
  try {
    const { count, error } = await q
    return error ? null : (count ?? 0)
  } catch { return null }
}

/** Every fact `decideAutoBatch` needs, read for one programme. Reads only. */
export async function readAutoBatchFacts(p: ProgrammeRow): Promise<AutoBatchFacts> {
  const { authorityFor } = await import('./programme-authority')
  const { nextBatchSize } = await import('./programme')
  const { killSwitchOn } = await import('./outreach-kill-switch')
  const { coldDailyCap } = await import('./figsy')

  const { data: client } = await db.from('clients').select('is_demo').eq('id', p.client_id).maybeSingle()
  const verdict = authorityFor(p, 'NEXT_BATCH')

  const leftToContact = await countOrNull(db.from('figsy_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('programme_id', p.id).eq('status', 'enrolled').eq('current_step', 0))

  let latestBatch: AutoBatchFacts['latestBatch'] = null
  const { data: batchRows, error: batchErr } = await db.from('programme_batches')
    .select('id, seq, status').eq('programme_id', p.id).order('seq', { ascending: false }).limit(1)
  const top = ((batchRows ?? []) as { id: string; seq: number; status: string }[])[0]
  if (batchErr) {
    latestBatch = { seq: 0, status: 'unreadable', stillChecking: null, awaitingSend: null, surfaced: null, enrolled: null }
  } else if (top) {
    const onBatch = () => db.from('leads').select('id', { count: 'exact', head: true })
      .eq('programme_id', p.id).eq('batch_id', top.id)
    const [stillChecking, awaitingSend] = await Promise.all([
      countOrNull(onBatch().is('qualified_at', null).is('disqualified_at', null)),
      countOrNull(onBatch().not('qualified_at', 'is', null).is('disqualified_at', null).is('surfaced_for_approval_at', null)),
    ])
    let surfaced: number | null = null
    let enrolled: number | null = null
    const { data: ids, error: idErr } = await db.from('leads').select('id')
      .eq('programme_id', p.id).eq('batch_id', top.id)
      .not('qualified_at', 'is', null).is('disqualified_at', null).not('surfaced_for_approval_at', 'is', null)
      .limit(2000)
    if (!idErr) {
      const leadIds = ((ids ?? []) as { id: string }[]).map(r => r.id)
      surfaced = leadIds.length
      enrolled = 0
      // Chunked: a few hundred uuids in one `in` filter is a URL long enough to be refused.
      for (let i = 0; i < leadIds.length && enrolled !== null; i += 100) {
        const n = await countOrNull(db.from('figsy_enrollments').select('id', { count: 'exact', head: true })
          .eq('programme_id', p.id).in('lead_id', leadIds.slice(i, i + 100)))
        enrolled = n === null ? null : enrolled + n
      }
    }
    latestBatch = { seq: top.seq, status: top.status, stillChecking, awaitingSend, surfaced, enrolled }
  }

  return {
    status: p.status,
    isDemo: (client as { is_demo?: boolean | null } | null)?.is_demo === true,
    paused: !!p.paused_at,
    killSwitchOn: killSwitchOn(),
    authority: verdict.allowed ? { allowed: true } : { allowed: false, reason: verdict.reason, message: verdict.message },
    nextBatch: nextBatchSize(p),
    dailyCap: coldDailyCap(),
    leftToContact,
    latestBatch,
  }
}

/** The decision for one programme — what Vida shows. Never throws. */
export async function autoBatchFor(p: ProgrammeRow): Promise<AutoBatchDecision> {
  try {
    return decideAutoBatch(await readAutoBatchFacts(p))
  } catch (err) {
    return wait('unreadable', `Could not work out the next batch (${err instanceof Error ? err.message : String(err)}). No batch was started.`)
  }
}

export type AutoBatchRunRow = {
  programme_id: string
  client_id: string
  state: AutoBatchState
  line: string
  sourced?: { requested: number; inserted: number } | null
  refused?: string | null
}

/**
 * THE DAILY RUN. Every LIVE programme is decided; only a `source` decision spends, and it
 * spends through `sourceProgramme` — the operator button's own door. A run and a refusal are
 * each written to the operator audit log, so an automatic batch is never a silent one.
 */
export async function runAutoBatches(): Promise<{ checked: number; started: number; rows: AutoBatchRunRow[] }> {
  const { getProgramme } = await import('./programme')
  const { sourceProgramme } = await import('./programme-sourcing')
  const { writeOperatorAudit } = await import('./operator-audit')

  const { data, error } = await db.from('programmes').select('id').eq('status', 'LIVE')
  if (error) throw new Error(`live programmes could not be read: ${error.message}`)

  const rows: AutoBatchRunRow[] = []
  let started = 0
  for (const { id } of (data ?? []) as { id: string }[]) {
    const p = await getProgramme(id)
    if (!p) continue
    const d = await autoBatchFor(p)
    const row: AutoBatchRunRow = { programme_id: p.id, client_id: p.client_id, state: d.state, line: d.line }
    if (d.action === 'source') {
      const r = await sourceProgramme(p.id)
      if (r.ok) {
        started++
        row.sourced = { requested: r.requested, inserted: r.inserted }
        await writeOperatorAudit({
          operatorEmail: 'system:auto-batch', clientId: r.clientId, action: 'programme_source_run',
          subjectType: 'icp', subjectId: r.icpId,
          detail: { automatic: true, programme_id: r.programmeId, icp_name: r.icpName,
                    requested: r.requested, inserted: r.inserted, skipped: r.skipped, note: r.relaxed, why: d.line },
        })
      } else {
        row.refused = r.message
        await writeOperatorAudit({
          operatorEmail: 'system:auto-batch', clientId: p.client_id, action: 'programme_source_refused',
          subjectType: 'programme', subjectId: p.id,
          detail: { automatic: true, reason: r.reason, message: r.message },
        })
      }
    }
    rows.push(row)
  }
  return { checked: rows.length, started, rows }
}
