// WHAT HAS ALREADY GONE WRONG — the retroactive half of the gate.
//
// Founder, 26 Jul: *"this is great but it only covers what is about to be shipped. but what
// about what has already been shipped because these have errors."* Exactly right, and it is
// a different problem needing a different tool.
//
//   • `scripts/check.sh` reads the CODE and stops the NEXT broken thing shipping.
//   • This reads the DATABASE and says what the ALREADY-shipped bugs actually did, to whom.
//
// A test can only tell you a bug is fixed. It cannot tell you whether it fired last Tuesday
// and left a client short. Every check below is a defect we found by reading code, turned
// into a question about real rows — so "did this hurt anyone?" stops being a guess.
//
// Read-only by construction. Nothing here writes, updates or deletes: an integrity report
// that repairs things is a report you cannot run twice, and the first thing you want to do
// with a damage list is look at it before touching anything.
//
// Every check names WHO is affected (client ids) rather than only a count, because "3 leads
// are broken" is not actionable and "these 3, for that client" is.

import { db } from '@kind/db'
import { PACK_LEADS, PRICE_PER_LEAD_USD_EXPORT as PRICE } from './integrity-consts'

export type Severity = 'critical' | 'high' | 'medium' | 'clean'

export type Check = {
  key: string
  /** What this is looking for, in a sentence a non-engineer can act on. */
  question: string
  severity: Severity
  /** How many rows/clients are affected. 0 = nothing to do. */
  count: number
  /** Who — client ids or lead ids, capped so a huge result can't blow up the response. */
  affected: string[]
  /** What it means and what to do. Written for the founder, not for a developer. */
  verdict: string
  /** The defect this check exists because of. */
  defect: string
}

/** Cap on ids returned per check — enough to act on, small enough to render. */
const SHOW = 25

function ok(base: Omit<Check, 'severity' | 'count' | 'affected' | 'verdict'>, cleanVerdict: string): Check {
  return { ...base, severity: 'clean', count: 0, affected: [], verdict: cleanVerdict }
}

/**
 * A lead that was APPROVED but has no email.
 *
 * The defect: the write that persists a revealed email was swallowed
 * (`approve-lead.ts:180`, fixed 26 Jul). On failure the $4 was taken, `revealed_at` was set,
 * and the email was never stored — and because the atomic claim blocks a retry, that lead
 * could never be re-revealed. The client paid for a contact we permanently lost.
 *
 * Any row this finds is a client owed either the contact or their money back.
 */
async function approvedWithoutEmail(): Promise<Check> {
  const base = {
    key: 'approved_without_email',
    question: 'Did any client pay for a lead whose email we then failed to store?',
    defect: '#568 — the email write was swallowed on the approve path',
  }
  const { data, error } = await db.from('leads')
    .select('id, client_id')
    .not('revealed_at', 'is', null)
    .or('email.is.null,email.eq.')
    .limit(200)
  if (error) throw error
  const rows = data ?? []
  if (rows.length === 0) return ok(base, 'No approved lead is missing its email. This bug never fired.')
  return {
    ...base,
    severity: 'critical',
    count: rows.length,
    affected: rows.slice(0, SHOW).map((r: { id: string }) => r.id),
    verdict: `${rows.length} lead(s) were approved and have NO email. Each client either paid $${PRICE} or used a pack slot for a contact they never received. They cannot be re-approved (the claim blocks it) — so each needs a manual refund or a hand-delivered email.`,
  }
}

/**
 * A lead put in front of a client but never marked delivered.
 *
 * The defect: `surfaceEverything` ran two updates without checking either, then reported
 * success (`start-work.ts:151`, fixed 26 Jul). `/leads/for-approval` requires `delivered_at`,
 * so a half-written surface leaves leads the operator was told about and the client cannot
 * see. The client's desk reads empty while we believe we sent them 200 people.
 */
async function surfacedButInvisible(): Promise<Check> {
  const base = {
    key: 'surfaced_not_delivered',
    question: "Are there leads we think we sent a client, that the client cannot actually see?",
    defect: '#568 — the two surface writes were unchecked',
  }
  const { data, error } = await db.from('leads')
    .select('id, client_id')
    .not('surfaced_for_approval_at', 'is', null)
    .is('delivered_at', null)
    .is('revealed_at', null)
    .neq('status', 'passed')
    .limit(500)
  if (error) throw error
  const rows = data ?? []
  if (rows.length === 0) return ok(base, "Every surfaced lead is also delivered. No client has an invisible desk.")
  const clients = [...new Set(rows.map((r: { client_id: string }) => r.client_id))]
  return {
    ...base,
    severity: 'high',
    count: rows.length,
    affected: clients.slice(0, SHOW),
    verdict: `${rows.length} lead(s) across ${clients.length} client(s) are marked surfaced but NOT delivered — so they are invisible on the client's desk while our own board counts them as sent. Re-running start-work for these clients fixes it.`,
  }
}

/**
 * A client holding BOTH an unused pack and wallet money.
 *
 * The defect: the first $99 credited the wallet AND switched the 100-lead pack on
 * (`stripe.ts`, fixed 26 Jul). One payment bought ~124 leads instead of 100. Anyone who
 * paid before the fix is holding roughly $99 they were never meant to have.
 *
 * Deliberately NOT auto-corrected. Clawing money back off a client's balance without telling
 * them is worse than the original bug.
 */
async function doublePaidPack(): Promise<Check> {
  const base = {
    key: 'pack_and_wallet',
    question: 'Did anyone get both the 100 free leads AND $99 of wallet money from one payment?',
    defect: '#562 — the $99 was paid out twice',
  }
  const { data: clients, error } = await db.from('clients')
    .select('id, company_name, wallet_balance_usd, is_demo')
    .gt('wallet_balance_usd', 0)
    .limit(500)
  if (error) throw error
  const real = (clients ?? []).filter((c: { is_demo: boolean | null }) => !c.is_demo)
  if (real.length === 0) return ok(base, 'No client is holding wallet money, so this bug has not cost us anything.')

  // Only a client whose pack is still unspent shows the double-grant clearly: once they are
  // past 100 approvals the wallet is legitimately being drawn down.
  const hits: string[] = []
  for (const c of real) {
    const { count: approvals } = await db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', c.id).not('revealed_at', 'is', null)
    if ((approvals ?? 0) < PACK_LEADS) hits.push(c.id)
  }
  if (hits.length === 0) return ok(base, 'Every client holding wallet money has already worked past their included pack, so the balance is legitimately theirs.')
  return {
    ...base,
    severity: 'high',
    count: hits.length,
    affected: hits.slice(0, SHOW),
    verdict: `${hits.length} client(s) hold wallet money while their included ${PACK_LEADS} is still unspent — the signature of the double-grant. Roughly $${PRICE * 24} of leads each. FOUNDER DECISION: leave it as goodwill, or adjust it and tell them. Do not silently claw it back.`,
  }
}

/**
 * Someone charged $4 for an approval that should have been inside their included pack.
 *
 * The defect: the pack count included the lead being approved, so the 100th of "100
 * included" was charged (`approve-lead.ts`, fixed 26 Jul). A `wallet_charge` row on a client
 * with 100 or fewer approvals is that bug firing.
 */
async function chargedInsidePack(): Promise<Check> {
  const base = {
    key: 'charged_inside_pack',
    question: 'Was anyone charged $4 for a lead that was supposed to be free?',
    defect: '#566 — the pack gave 99 free approvals, not 100',
  }
  const { data: charges, error } = await db.from('credit_transactions')
    .select('client_id, reference, created_at')
    .eq('type', 'wallet_charge')
    .limit(2000)
  if (error) throw error
  const byClient = new Map<string, number>()
  for (const c of (charges ?? []) as { client_id: string }[]) {
    byClient.set(c.client_id, (byClient.get(c.client_id) ?? 0) + 1)
  }
  if (byClient.size === 0) return ok(base, 'Nobody has ever been charged $4 for a lead, so this bug never fired.')

  const hits: string[] = []
  for (const [clientId] of byClient) {
    const { count: approvals } = await db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).not('revealed_at', 'is', null)
    // At or below the included count, no wallet charge should exist at all.
    if ((approvals ?? 0) <= PACK_LEADS) hits.push(clientId)
  }
  if (hits.length === 0) return ok(base, `Every $${PRICE} charge belongs to a client already past their included ${PACK_LEADS}. Correct.`)
  return {
    ...base,
    severity: 'critical',
    count: hits.length,
    affected: hits.slice(0, SHOW),
    verdict: `${hits.length} client(s) were charged $${PRICE} while still inside their included ${PACK_LEADS}. They are owed a refund, and they were told the first ${PACK_LEADS} were free — so this is a trust problem as much as a money one.`,
  }
}

/**
 * A lead charged twice.
 *
 * The invariant: one lead, one charge, ever. The UNIQUE index on
 * `credit_transactions.reference` is what enforces it — this check is what proves the index
 * is actually present in production, which nobody can currently state (three migration
 * directories, hand-pasted schema, #273).
 */
async function doubleCharged(): Promise<Check> {
  const base = {
    key: 'double_charged',
    question: 'Has any single lead been charged more than once?',
    defect: 'The once-per-lead invariant — enforced by a UNIQUE index nobody has verified is live',
  }
  const { data, error } = await db.from('credit_transactions')
    .select('reference')
    .eq('type', 'wallet_charge')
    .not('reference', 'is', null)
    .limit(5000)
  if (error) throw error
  const seen = new Map<string, number>()
  for (const r of (data ?? []) as { reference: string }[]) {
    seen.set(r.reference, (seen.get(r.reference) ?? 0) + 1)
  }
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([ref]) => ref)
  if (dupes.length === 0) return ok(base, 'No lead has been charged twice. The once-per-lead guard is holding.')
  return {
    ...base,
    severity: 'critical',
    count: dupes.length,
    affected: dupes.slice(0, SHOW),
    verdict: `${dupes.length} lead(s) carry MORE THAN ONE $${PRICE} charge. Each duplicate is a straight refund. It also means the UNIQUE index on credit_transactions.reference is NOT present in production — check that before anything else, or it will keep happening.`,
  }
}

/**
 * A paid lead that never entered a sequence.
 *
 * The defect: the enrol call was swallowed (`approve-lead.ts:217`, fixed 26 Jul). The client
 * paid for WORK — we enrol the lead and run the outreach — so a paid lead sitting in no
 * sequence is a client waiting for emails that will never be sent.
 */
async function paidButNeverWorked(): Promise<Check> {
  const base = {
    key: 'paid_never_enrolled',
    question: 'Is anyone waiting on outreach for a lead they paid for that was never enrolled?',
    defect: '#568 — the enrol call was swallowed after charging',
  }
  const { data: approved, error } = await db.from('leads')
    .select('id, client_id')
    .not('revealed_at', 'is', null)
    .not('email', 'is', null)
    .limit(1000)
  if (error) throw error
  const rows = approved ?? []
  if (rows.length === 0) return ok(base, 'No approved leads yet, so nothing can be waiting.')

  const ids = rows.map((r: { id: string }) => r.id)
  const { data: enrolled } = await db.from('figsy_enrollments').select('lead_id').in('lead_id', ids)
  const has = new Set((enrolled ?? []).map((e: { lead_id: string }) => e.lead_id))
  const orphans = rows.filter((r: { id: string }) => !has.has(r.id))
  if (orphans.length === 0) return ok(base, 'Every paid lead is in a sequence. Nothing is stranded.')
  const clients = [...new Set(orphans.map((r: { client_id: string }) => r.client_id))]
  return {
    ...base,
    severity: 'high',
    count: orphans.length,
    affected: clients.slice(0, SHOW),
    verdict: `${orphans.length} paid lead(s) across ${clients.length} client(s) are in NO sequence — they were charged for work that never started. Enrol them from Vida, or refund. Note: this also catches leads approved while the kill-switch was off, which is expected right now.`,
  }
}

/**
 * A client who can be worked but cannot send.
 *
 * Not a past defect — a live readiness question, and the one that decides whether a paying
 * client can be delivered at all (#211). Asked here because a client who has paid and has no
 * mailbox is money taken against work that physically cannot run.
 */
async function fundedButCannotSend(): Promise<Check> {
  const base = {
    key: 'funded_cannot_send',
    question: 'Has anyone paid us who still has no mailbox to send from?',
    defect: '#211 — per-client sending; #547 makes this fail closed rather than send from ours',
  }
  const { data: paid, error } = await db.from('credit_transactions')
    .select('client_id').in('type', ['wallet_topup', 'purchase', 'credit_purchase']).limit(1000)
  if (error) throw error
  const payers = [...new Set((paid ?? []).map((r: { client_id: string }) => r.client_id))]
  if (payers.length === 0) return ok(base, 'Nobody has paid us yet, so nobody is waiting on a mailbox.')

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
  if (stuck.length === 0) return ok(base, 'Every client who has paid can send from their own mailbox.')
  return {
    ...base,
    severity: 'critical',
    count: stuck.length,
    affected: stuck.slice(0, SHOW),
    verdict: `${stuck.length} client(s) have PAID and cannot send — no mailbox, no SMTP details, or the mailbox is still warming. Nothing goes out for them at all. Fix in Vida → Engine → their inbox. This is the single thing that decides whether a paying client is being delivered.`,
  }
}

/**
 * Ledger rows whose type the live CHECK constraint forbids.
 *
 * The committed constraint does not allow `wallet_topup` / `wallet_charge` / `wallet_reverse`,
 * yet payments work — so it was widened by hand in production and the repo fell behind
 * (#558). If any of those types exist, the live constraint HAS been widened, which is the
 * only direct evidence of what production is actually running.
 */
async function ledgerTypesInUse(): Promise<Check> {
  const base = {
    key: 'ledger_types',
    question: 'Which wallet transaction types does production actually accept?',
    defect: '#558 — the repo migrations no longer describe the live database',
  }
  const { data, error } = await db.from('credit_transactions')
    .select('type').in('type', ['wallet_topup', 'wallet_charge', 'wallet_reverse']).limit(1)
  if (error) throw error
  if ((data ?? []).length === 0) {
    return {
      ...base,
      severity: 'medium',
      count: 0,
      affected: [],
      verdict: 'No wallet-type rows exist yet, so we STILL cannot tell whether the live CHECK constraint allows them. Run migration 20260726_wallet_tx_types before the first real payment, or the first $99 will fail on the constraint.',
    }
  }
  return ok(base, 'Wallet-type rows exist in production, so the live constraint does allow them. The repo is behind the database, not the other way round — 20260726_wallet_tx_types pins it.')
}

/** Every check, run together. Never throws — one broken check must not hide the rest. */
export async function runIntegrity(): Promise<{
  checks: Check[]
  summary: { critical: number; high: number; medium: number; clean: number; errored: number }
  headline: string
}> {
  const runners = [
    approvedWithoutEmail, chargedInsidePack, doubleCharged, fundedButCannotSend,
    surfacedButInvisible, doublePaidPack, paidButNeverWorked, ledgerTypesInUse,
  ]
  const checks: Check[] = []
  let errored = 0
  for (const run of runners) {
    try {
      checks.push(await run())
    } catch (e) {
      errored++
      checks.push({
        key: run.name, question: 'This check could not run', severity: 'medium', count: 0, affected: [],
        defect: '—',
        // An integrity check that fails silently is worse than no check: it reads as "clean".
        verdict: `The check itself errored, so this question is UNANSWERED — do not read it as clean. ${e instanceof Error ? e.message : String(e)}`,
      })
    }
  }
  const summary = {
    critical: checks.filter(c => c.severity === 'critical').length,
    high:     checks.filter(c => c.severity === 'high').length,
    medium:   checks.filter(c => c.severity === 'medium').length,
    clean:    checks.filter(c => c.severity === 'clean').length,
    errored,
  }
  const headline = summary.critical > 0
    ? `${summary.critical} CRITICAL problem(s) in live data — clients are affected.`
    : summary.high > 0
      ? `${summary.high} problem(s) in live data. Nothing critical.`
      : errored > 0
        ? `No damage found, but ${errored} check(s) could not run — the answer is incomplete.`
        : 'No damage found in live data. Every bug we fixed was caught before it hurt anyone.'
  // Worst first, and a clean check still shows — "we asked and the answer was no" is the
  // point of the report.
  const rank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, clean: 3 }
  checks.sort((a, b) => rank[a.severity] - rank[b.severity])
  return { checks, summary, headline }
}
