// THE INTEGRITY CHECK — the queries half. Judgement lives in `integrity-checks.ts`.
//
// Questions about REAL ROWS, each one a defect we found by reading code. ⛓️ 29 Sep (R174 · 5g) —
// ~~Eight~~: now the programme's questions, plus the ledger one. Read-only:
// nothing here writes, updates or deletes.
//
// Every query is capped and every failure is caught per-check, so one unreachable table
// cannot take the whole report down — it renders as UNANSWERED, never as clean.

import { db } from '@kind/db'
import {
  toResult, toUnanswered, summarise, headline, rank,
  countsAsCannotSend, excludeDemoRows, demoLookupFailed,
  type CheckResult, type Summary,
} from './integrity-checks'

/**
 * The demo client ids, read ONCE and handed to every check.
 *
 * WHY EVERY CHECK TAKES THIS. Demo accounts are our own invented data, and a finding about a
 * fake company is worse than no finding: the founder learns to ignore the screen, and then it
 * misses the real one. On the first live run three of eight checks fired on demos and all
 * three were wrong — *"a client has paid and cannot be delivered"* about an account that
 * cannot send **by design**.
 *
 * Read once rather than per-check so eight checks cannot disagree with each other about which
 * accounts are demos.
 */
type DemoIds = ReadonlySet<string>

async function loadDemoIds(): Promise<Set<string>> {
  const { data, error } = await db.from('clients').select('id').eq('is_demo', true).limit(1000)
  if (error) throw error
  return new Set((data ?? []).map((c: { id: string }) => c.id))
}

// ⚑ 29 Sep (R174 · 5g) — ⛓️ THE SEVEN WALLET / PER-LEAD CHECKS ARE RETIRED FROM THIS REPORT.
// ~~approved_without_email · charged_inside_pack · double_charged · funded_cannot_send ·
// surfaced_not_delivered · pack_and_wallet · paid_never_enrolled~~ — each asked about the $4
// per-lead model (charges, packs, per-lead approvals), which no client is on (R137). Their
// judgement helpers stay in `integrity-checks.ts` (tested there); what this report asks now is
// about programmes: is anyone who has paid unable to send, and is anyone short on meetings
// without the credit they are owed. The ledger-types check stays: shortfall credit IS wallet
// credit (R136 ④), so the ledger must still accept it.

/** A programme paid for (or authorised) and still running, whose client has no mailbox that can send. */
async function programmePaidCannotSend(demoIds: DemoIds): Promise<CheckResult> {
  const q = { key: 'paid_cannot_send',
    question: 'Has anyone paid for a programme who still has no mailbox to send from?',
    defect: '#211 — per-client sending, now asked of programmes (R174 · 5g)' }
  // `*`, and the first stage asked of `p1Authorised` — internal authority is named only by the
  // approved modules (programme-authority-schema), never re-derived here.
  const { data, error } = await db.from('programmes').select('*').limit(2000)
  if (error) throw error
  const { p1Authorised } = await import('./programme')
  const payers = [...new Set(((data ?? []) as Array<{ client_id: string; status: string; disputed_at: string | null }>)
    .filter(p => p1Authorised(p as never) && !p.disputed_at && p.status !== 'COMPLETED' && p.status !== 'CANCELLED')
    .map(p => p.client_id))]
    .filter(id => countsAsCannotSend(demoIds.has(id)))
  if (payers.length === 0) {
    return toResult({ ...q, severity: 'critical', affected: [],
      cleanVerdict: 'No running programme has been paid for yet, so nobody is waiting on a mailbox.', badVerdict: n => `${n}` })
  }
  const { pickSendingInbox } = await import('./sending-inbox')
  const { secretState } = await import('./inbox-secret')
  const secretOk = secretState().ok
  const stuck: string[] = []
  for (const clientId of payers) {
    const { data: boxes, error: bErr } = await db.from('client_inboxes')
      .select('id, email, kind, status, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, from_name')
      .eq('client_id', clientId)
    if (bErr) throw bErr
    if (!pickSendingInbox((boxes ?? []) as never, secretOk).ok) stuck.push(clientId)
  }
  return toResult({ ...q, severity: 'critical', affected: stuck,
    cleanVerdict: 'Every client with a paid, running programme can send from their own mailbox.',
    badVerdict: n => `${n} client(s) have PAID for a programme and cannot send — no mailbox, no SMTP details, or still warming. Nothing goes out for them. Fix in Vida → Engine.`,
  })
}

/** Meetings against target: a finished programme that fell short and was not credited. */
async function meetingsShortNotCredited(demoIds: DemoIds): Promise<CheckResult> {
  const q = { key: 'meetings_short_not_credited',
    question: 'Did any finished programme deliver fewer meetings than bought, without the shortfall credit?',
    defect: 'R136 ④ — a shortfall is settled as credit; completion requires settlement (R174 · 5g)' }
  const { data, error } = await db.from('programmes')
    .select('id, client_id, status, meeting_target, delivered_meetings, shortfall_credited_at, shortfall_credit_cents')
    .eq('status', 'COMPLETED').limit(2000)
  if (error) throw error
  const rows = excludeDemoRows((data ?? []) as Array<{ id: string; client_id: string; meeting_target: number | null; delivered_meetings: number | null; shortfall_credited_at: string | null; shortfall_credit_cents: number | null }>, demoIds)
  const owed = rows.filter(p =>
    // Never settled at all, or settled short with no credit written.
    !p.shortfall_credited_at
    || ((p.delivered_meetings ?? 0) < (p.meeting_target ?? 0) && !(Number(p.shortfall_credit_cents ?? 0) > 0)))
  return toResult({ ...q, severity: 'high', affected: owed.map(p => p.id),
    cleanVerdict: 'Every finished programme was settled, and every shortfall was credited.',
    badVerdict: n => `${n} finished programme(s) were not settled, or fell short with no credit written. Open each in Vida → Programme and Settle it.`,
  })
}

/**
 * Which wallet transaction types production actually accepts.
 *
 * DELIBERATELY NOT FILTERED BY DEMO — the only check here that isn't, so it is worth saying
 * why rather than letting it look like an oversight. The question is *"does the live CHECK
 * constraint allow these types"*, and a row is proof the constraint accepted it **no matter
 * who wrote it**. A demo's row answers the question exactly as well as a real client's.
 * Filtering would throw away valid evidence and report "cannot tell" when we can.
 */
async function ledgerTypesLive(_demoIds: DemoIds): Promise<CheckResult> {
  const q = { key: 'ledger_types',
    question: 'Does the live ledger accept the wallet transaction types the money model writes?',
    defect: '#558 — the repo migrations no longer describe the live database' }

  // ASK THE SCHEMA, NOT THE HISTORY.
  //
  // This used to look for a row of each wallet type and, finding none, say: *"we CANNOT tell
  // … run migration 20260726_wallet_tx_types before the first real payment."* The founder had
  // already run it — repeatedly — so an honesty screen was instructing him to do something
  // already done. A false instruction that is correctly ignored teaches you to ignore the
  // screen, which is worse than saying nothing.
  //
  // It could not tell because it was asking the wrong question. *"Has a row of this type ever
  // been written"* is about HISTORY. *"Will the constraint accept this type"* is about the
  // SCHEMA — and Postgres will just answer it, before any payment exists.
  const WANTED = ['wallet_topup', 'wallet_charge', 'wallet_reverse'] as const
  try {
    const { readConstraintDef, permittedValues } = await import('./constraint-live')
    const def = await readConstraintDef('credit_transactions_type_check')
    if (def === null) {
      // No constraint at all. Every type is accepted, so the money model is not blocked — but
      // nothing is validating the column either, which is its own (smaller) problem.
      // `medium`, not `clean`: the money model is not blocked, but nothing is validating the
      // column either, and a missing safeguard is not the same as a healthy one.
      return { key: q.key, question: q.question, defect: q.defect, severity: 'medium', count: 0, affected: [],
        verdict: 'There is no credit_transactions_type_check constraint in production, so the ledger accepts any type — the money model is not blocked. Nothing is validating the column either; 20260726_wallet_tx_types adds the constraint.' }
    }
    const { allowed, missing } = permittedValues(def, WANTED)
    if (missing.length === 0) {
      return { key: q.key, question: q.question, defect: q.defect, severity: 'medium', count: 0, affected: [],
        verdict: `Read from the live constraint: all ${allowed.length} wallet types are permitted (${allowed.join(', ')}). Asked of the schema itself, so this holds before the first payment rather than only after one.` }
    }
    return { key: q.key, question: q.question, defect: q.defect, severity: 'high', count: missing.length, affected: [],
      verdict: `The live constraint REJECTS ${missing.join(', ')}. Any write of those types fails, so the first $99 will fail on the constraint. Fix: Vida → Engine → run the pending migrations (20260726_wallet_tx_types).` }
  } catch (err) {
    // The old row-based reading, kept ONLY as a fallback for when pg_catalog is unreachable.
    // A row of a given type IS proof the constraint accepted it, no matter who wrote it — so
    // it is real evidence, just weaker, because absence proves nothing.
    const { data } = await db.from('credit_transactions').select('type').in('type', [...WANTED]).limit(1)
    const why = err instanceof Error ? err.message : String(err)
    if ((data ?? []).length > 0) {
      return { key: q.key, question: q.question, defect: q.defect, severity: 'medium', count: 0, affected: [],
        verdict: `Could not read the constraint directly (${why}), but wallet-type rows EXIST in production — which is proof the constraint accepted them.` }
    }
    return { key: q.key, question: q.question, defect: q.defect, severity: 'medium', count: 0, affected: [],
      verdict: `NOT ESTABLISHED: the constraint could not be read (${why}) and no wallet-type rows exist yet to infer from. This is not a claim that anything is wrong, and it is not an instruction — it is the check saying it has no evidence either way.` }
  }
}

const RUNNERS: Array<[string, string, string, (d: DemoIds) => Promise<CheckResult>]> = [
  ['paid_cannot_send', 'Has anyone paid for a programme who still has no mailbox to send from?', '#211 · R174 5g', programmePaidCannotSend],
  ['meetings_short_not_credited', 'Did a finished programme fall short without its credit?', 'R136 ④ · R174 5g', meetingsShortNotCredited],
  ['ledger_types', 'Does the live ledger accept the wallet types?', '#558', ledgerTypesLive],
]

/** Run every check. Never throws — one broken check must not hide the rest. */
export async function runIntegrity(): Promise<{
  checks: CheckResult[]; summary: Summary; headline: string
}> {
  // If we cannot tell demo accounts from real ones, NOTHING below is trustworthy — a "clean"
  // result could be hiding a real problem under demo noise, and a hit could be about an
  // invented company. So the whole report goes UNANSWERED rather than rendering findings
  // nobody can act on. Same rule as everywhere else here: a check that could not run must
  // never look like a check that passed.
  let demoIds: Set<string>
  try {
    demoIds = await loadDemoIds()
  } catch (e) {
    const why = demoLookupFailed(e)
    const all = RUNNERS.map(([key, question, defect]) => toUnanswered(key, question, defect, why))
    const summary = summarise(all)
    return { checks: rank(all), summary, headline: headline(summary) }
  }

  const results: CheckResult[] = []
  for (const [key, question, defect, run] of RUNNERS) {
    try { results.push(await run(demoIds)) }
    catch (e) { results.push(toUnanswered(key, question, defect, e)) }
  }
  const ranked = rank(results)
  const summary = summarise(ranked)
  return { checks: ranked, summary, headline: headline(summary) }
}
