// THE INTEGRITY CHECK — the queries half. Judgement lives in `integrity-checks.ts`.
//
// Eight questions about REAL ROWS, each one a defect we found by reading code. Read-only:
// nothing here writes, updates or deletes.
//
// Every query is capped and every failure is caught per-check, so one unreachable table
// cannot take the whole report down — it renders as UNANSWERED, never as clean.

import { db } from '@kind/db'
import {
  toResult, toUnanswered, summarise, headline, rank,
  countsAsCannotSend, countsAsDoubleGrant,
  isRealClient, excludeDemoRows, demoLookupFailed,
  PACK_LEADS, LEAD_PRICE_USD,
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

/** A lead approved but with no email — they paid for a contact we then lost. */
async function approvedWithoutEmail(demoIds: DemoIds): Promise<CheckResult> {
  const q = { key: 'approved_without_email',
    question: 'Did any client pay for a lead whose email we then failed to store?',
    defect: '#568 — the email write on the approve path was swallowed' }
  const { data, error } = await db.from('leads')
    .select('id, client_id').not('revealed_at', 'is', null).is('email', null).limit(200)
  if (error) throw error
  const real = excludeDemoRows((data ?? []) as { id: string; client_id: string }[], demoIds)
  return toResult({ ...q, severity: 'critical',
    affected: real.map(r => r.id),
    cleanVerdict: 'No approved lead is missing its email. This bug never fired.',
    badVerdict: n => `${n} lead(s) were approved with NO email. Each client either paid $${LEAD_PRICE_USD} or used a pack slot for a contact they never received — and they cannot be re-approved (the once-per-lead claim blocks it), so each needs a manual refund or a hand-delivered email.`,
  })
}

/** Surfaced but not delivered — the operator was told; the client cannot see them. */
async function surfacedButInvisible(demoIds: DemoIds): Promise<CheckResult> {
  const q = { key: 'surfaced_not_delivered',
    question: 'Are there leads we believe we sent a client, that the client cannot actually see?',
    defect: '#568 — the two surface writes were unchecked while the count reported success' }
  const { data, error } = await db.from('leads')
    .select('id, client_id')
    .not('surfaced_for_approval_at', 'is', null).is('delivered_at', null)
    .is('revealed_at', null).neq('status', 'passed').limit(500)
  if (error) throw error
  const rows = excludeDemoRows((data ?? []) as { client_id: string }[], demoIds)
  const clients = [...new Set(rows.map(r => r.client_id))]
  return toResult({ ...q, severity: 'high', affected: clients, total: rows.length,
    cleanVerdict: 'Every surfaced lead is also delivered. No client has an invisible desk.',
    badVerdict: n => `${n} lead(s) across ${clients.length} client(s) are marked surfaced but NOT delivered — invisible on the client's desk while our own board counts them as sent. Re-running start-work for those clients fixes it.`,
  })
}

/** Charged $4 while still inside the included pack. */
async function chargedInsidePack(demoIds: DemoIds): Promise<CheckResult> {
  const q = { key: 'charged_inside_pack',
    question: `Was anyone charged $${LEAD_PRICE_USD} for a lead that should have been free?`,
    defect: '#566 — the pack counted the lead being approved, so it gave 99 free, not 100' }
  const { data, error } = await db.from('credit_transactions')
    .select('client_id').eq('type', 'wallet_charge').limit(2000)
  if (error) throw error
  const clientIds = [...new Set((data ?? []).map((r: { client_id: string }) => r.client_id))]
    .filter(id => isRealClient(id, demoIds))
  const hits: string[] = []
  for (const id of clientIds) {
    const { count } = await db.from('leads').select('id', { count: 'exact', head: true })
      .eq('client_id', id).not('revealed_at', 'is', null)
    if ((count ?? 0) <= PACK_LEADS) hits.push(id)
  }
  return toResult({ ...q, severity: 'critical', affected: hits,
    cleanVerdict: `Every $${LEAD_PRICE_USD} charge belongs to a client already past their included ${PACK_LEADS}. Correct.`,
    badVerdict: n => `${n} client(s) were charged $${LEAD_PRICE_USD} while still inside their included ${PACK_LEADS}. They are owed a refund — and they were told the first ${PACK_LEADS} were free, so this is a trust problem as much as a money one.`,
  })
}

/** One lead, more than one charge. Also proves whether the UNIQUE index is live. */
async function doubleCharged(demoIds: DemoIds): Promise<CheckResult> {
  const q = { key: 'double_charged',
    question: 'Has any single lead been charged more than once?',
    defect: 'The once-per-lead invariant — enforced by a UNIQUE index nobody has confirmed exists in production (#273)' }
  const { data, error } = await db.from('credit_transactions')
    .select('reference, client_id').eq('type', 'wallet_charge').not('reference', 'is', null).limit(5000)
  if (error) throw error
  // `client_id` is selected ONLY so demo rows can be dropped — the check itself is about the
  // reference. Without it there is no way to tell a demo's charge from a real one.
  const seen = new Map<string, number>()
  for (const r of excludeDemoRows((data ?? []) as { reference: string; client_id: string }[], demoIds)) {
    seen.set(r.reference, (seen.get(r.reference) ?? 0) + 1)
  }
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([ref]) => ref)
  return toResult({ ...q, severity: 'critical', affected: dupes,
    cleanVerdict: 'No lead has been charged twice. The once-per-lead guard is holding.',
    badVerdict: n => `${n} lead(s) carry MORE THAN ONE $${LEAD_PRICE_USD} charge. Each duplicate is a straight refund — and it means the UNIQUE index on credit_transactions.reference is NOT present in production. Fix that first or it keeps happening.`,
  })
}

/** Both the pack and the wallet from one payment. */
async function packAndWallet(demoIds: DemoIds): Promise<CheckResult> {
  const q = { key: 'pack_and_wallet',
    question: `Did anyone get both the ${PACK_LEADS} free leads AND wallet money from one payment?`,
    defect: '#562 — the $99 credited the wallet while also switching the pack on' }
  const { data, error } = await db.from('clients')
    .select('id, wallet_balance_usd').gt('wallet_balance_usd', 0).limit(500)
  if (error) throw error
  // Uses the SHARED demo set like every other check. It used to read `is_demo` on its own
  // query — a second source of truth for the same fact, and the way eight checks end up
  // disagreeing about which accounts are demos.
  const real = ((data ?? []) as { id: string }[]).filter(c => isRealClient(c.id, demoIds))
  const hits: string[] = []
  for (const c of real) {
    // A PURCHASE IS REQUIRED, not merely a balance. The double-grant signature is *"they
    // paid, and got both the pack and the dollars"*. This checked only for wallet money, so
    // a client credited by a manual grant — who never paid us anything — was reported as a
    // victim of a bug that cannot have touched them. The purchase row is what makes it real.
    const { count: purchases } = await db.from('credit_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', c.id).in('type', ['wallet_topup', 'purchase', 'credit_purchase'])
    const { count } = await db.from('leads').select('id', { count: 'exact', head: true })
      .eq('client_id', c.id).not('revealed_at', 'is', null)
    if (countsAsDoubleGrant(purchases ?? 0, count ?? 0)) hits.push(c.id)
  }
  return toResult({ ...q, severity: 'high', affected: hits,
    cleanVerdict: 'No client holds wallet money with an unspent pack. Nothing was double-granted.',
    badVerdict: n => `${n} client(s) hold wallet money while their included ${PACK_LEADS} is still unspent — the signature of the double-grant, roughly $${LEAD_PRICE_USD * 24} of leads each. FOUNDER DECISION: leave it as goodwill, or adjust and tell them. Do not silently claw it back.`,
  })
}

/** A paid lead in no sequence — charged for work that never started. */
async function paidNeverEnrolled(demoIds: DemoIds): Promise<CheckResult> {
  const q = { key: 'paid_never_enrolled',
    question: 'Is anyone waiting on outreach for a lead they paid for that was never enrolled?',
    defect: '#568 — the enrol call was swallowed after charging' }
  const { data, error } = await db.from('leads')
    .select('id, client_id').not('revealed_at', 'is', null).not('email', 'is', null).limit(1000)
  if (error) throw error
  const rows = excludeDemoRows((data ?? []) as { id: string; client_id: string }[], demoIds)
  if (rows.length === 0) {
    return toResult({ ...q, severity: 'high', affected: [],
      cleanVerdict: 'No approved leads yet, so nothing can be waiting.', badVerdict: n => `${n}` })
  }
  const { data: enrolled } = await db.from('figsy_enrollments')
    .select('lead_id').in('lead_id', rows.map(r => r.id))
  const has = new Set((enrolled ?? []).map((e: { lead_id: string }) => e.lead_id))
  const orphans = rows.filter(r => !has.has(r.id))
  const clients = [...new Set(orphans.map(r => r.client_id))]
  return toResult({ ...q, severity: 'high', affected: clients, total: orphans.length,
    cleanVerdict: 'Every paid lead is in a sequence. Nothing is stranded.',
    badVerdict: n => `${n} paid lead(s) across ${clients.length} client(s) are in NO sequence — charged for work that never started. Enrol them from Vida, or refund. NOTE: leads approved while the kill-switch is off will also appear here, which is expected right now.`,
  })
}

/** Paid, but physically cannot send. */
async function fundedCannotSend(demoIds: DemoIds): Promise<CheckResult> {
  const q = { key: 'funded_cannot_send',
    question: 'Has anyone paid us who still has no mailbox to send from?',
    defect: '#211 — per-client sending. #547 makes this refuse rather than send from a shared address' }
  const { data, error } = await db.from('credit_transactions')
    .select('client_id').in('type', ['wallet_topup', 'purchase', 'credit_purchase']).limit(1000)
  if (error) throw error

  // DEMOS ARE EXCLUDED. A demo account cannot send **by design** — `is_demo` is a hard stop
  // inside the send path and every address is `.invalid`. Counting one here reported a
  // CRITICAL *"a client has paid and cannot be delivered"* about the MBF/Acme demo, which is
  // the system working exactly as intended. A check that cries wolf is a check nobody reads.
  const payers = [...new Set((data ?? []).map((r: { client_id: string }) => r.client_id))]
    .filter(id => countsAsCannotSend(demoIds.has(id)))
  if (payers.length === 0) {
    return toResult({ ...q, severity: 'critical', affected: [],
      cleanVerdict: 'Nobody has paid us yet, so nobody is waiting on a mailbox.', badVerdict: n => `${n}` })
  }
  const { pickSendingInbox } = await import('./sending-inbox')
  const { secretState } = await import('./inbox-secret')
  const secretOk = secretState().ok
  const stuck: string[] = []
  for (const clientId of payers) {
    const { data: boxes } = await db.from('client_inboxes')
      .select('id, email, kind, status, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, from_name')
      .eq('client_id', clientId)
    if (!pickSendingInbox((boxes ?? []) as never, secretOk).ok) stuck.push(clientId)
  }
  return toResult({ ...q, severity: 'critical', affected: stuck,
    cleanVerdict: 'Every client who has paid can send from their own mailbox.',
    badVerdict: n => `${n} client(s) have PAID and cannot send — no mailbox, no SMTP details, or still warming. Nothing goes out for them at all. Fix in Vida → Engine. This is the single thing that decides whether a paying client is being delivered.`,
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
  const { data, error } = await db.from('credit_transactions')
    .select('type').in('type', ['wallet_topup', 'wallet_charge', 'wallet_reverse']).limit(1)
  if (error) throw error
  if ((data ?? []).length > 0) {
    return toResult({ ...q, severity: 'medium', affected: [],
      cleanVerdict: 'Wallet-type rows exist in production, so the live CHECK constraint does allow them. The repo is behind the database — 20260726_wallet_tx_types pins it.',
      badVerdict: n => `${n}` })
  }
  return {
    key: q.key, question: q.question, defect: q.defect,
    severity: 'medium', count: 0, affected: [],
    verdict: 'No wallet-type rows exist yet, so we still CANNOT tell whether the live CHECK constraint allows them. Run migration 20260726_wallet_tx_types before the first real payment, or the first $99 will fail on the constraint.',
  }
}

const RUNNERS: Array<[string, string, string, (d: DemoIds) => Promise<CheckResult>]> = [
  ['approved_without_email', 'Did any client pay for a lead whose email we then failed to store?', '#568', approvedWithoutEmail],
  ['charged_inside_pack', 'Was anyone charged for a lead that should have been free?', '#566', chargedInsidePack],
  ['double_charged', 'Has any single lead been charged more than once?', 'once-per-lead invariant', doubleCharged],
  ['funded_cannot_send', 'Has anyone paid us who still has no mailbox to send from?', '#211', fundedCannotSend],
  ['surfaced_not_delivered', 'Are there leads the client cannot actually see?', '#568', surfacedButInvisible],
  ['pack_and_wallet', 'Did anyone get both the free leads AND wallet money?', '#562', packAndWallet],
  ['paid_never_enrolled', 'Is anyone waiting on outreach that never started?', '#568', paidNeverEnrolled],
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
