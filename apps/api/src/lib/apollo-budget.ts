// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R166 ⑥ · P2, board #2348) — THE APOLLO CREDIT BUDGET.
//
// The founder: *"i am very seriouos about how many leads we also try and attempt. the barriers
// need to be there"*, and from the options put to him: *"80% of the monthly plan, per programme
// = its limit"*.
//
// 🛑 WHAT WAS MISSING. Paid Apollo reveals (`people/bulk_match`, one credit per matched person)
// were bounded only by batch sizes and by Apollo's own plan running dry. Nothing stopped us
// short of the plan, nothing kept a reserve for Proofs and surprises, and since the move off
// PDL nothing recorded what a reveal spent.
//
// WHAT THIS DOES, before EVERY paid reveal (Proof geography check, lead delivery, programme
// qualification all go through `bulkMatchEmails`):
//   • reads this cycle's lead credits — used and limit — from Apollo's own usage endpoint
//     (the same reading the System page shows), cached for a minute;
//   • refuses the batch if it would take usage past 80% of the plan;
//   • records every reveal in `apollo_credit_ledger`.
// The PER-PROGRAMME half of the ruling is the programme's sourcing ceiling, which the database
// already enforces (meetings × the per-meeting limit); nothing here widens or narrows it.
//
// ⚠️ UNREADABLE MEANS STOP. If Apollo's usage cannot be read and no manual limit is set
// (`APOLLO_MONTHLY_CREDIT_LIMIT`), paid reveals are refused. A budget that gives way when it
// cannot see the balance is not a budget.
//
// ⚠️ THE REFUSAL IS AN `ApolloCreditsExhaustedError`, so every caller's existing handling —
// the run recorded as `quota_exhausted`, the Vida Needs-you task — applies unchanged. Only the
// message says it was OUR budget rather than Apollo's plan.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'
import { apolloBase } from './provider-hosts'
import { findLeadCredits } from './apollo-credits'

/** R166 ⑥ — stop paid reveals at this share of the plan's lead credits this cycle. */
export const APOLLO_BUDGET_SHARE = 0.8

const CACHE_MS = 60_000

export type ApolloUsage = { limit: number; used: number; source: 'apollo' | 'manual' }

let cache: { at: number; usage: ApolloUsage | null } | null = null
/** Credits spent by THIS process since the cached reading — so a minute of fast batches cannot overshoot. */
let spentSinceRead = 0

/** Test seam: forget the cached reading. */
export function resetApolloBudgetCache(): void { cache = null; spentSinceRead = 0 }

async function readFromApollo(): Promise<ApolloUsage | null> {
  const key = process.env.APOLLO_API_KEY
  if (!key) return null
  try {
    const r = await fetch(`${apolloBase()}/usage_stats/api_usage_stats`, {
      headers: { 'x-api-key': key },
      signal: AbortSignal.timeout(10_000),
    })
    if (!r.ok) return null
    const found = findLeadCredits(await r.json().catch(() => null))
    return found ? { limit: found.limit, used: found.used, source: 'apollo' } : null
  } catch {
    return null
  }
}

/** Credits recorded in our own ledger since the start of this calendar month (UTC). */
async function ledgerThisMonth(): Promise<number | null> {
  const start = new Date()
  start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0)
  const { data, error } = await db.from('apollo_credit_ledger')
    .select('credits').gte('occurred_at', start.toISOString()).limit(100000)
  if (error) return null
  return ((data ?? []) as { credits: number | null }[]).reduce((s, r) => s + (r.credits ?? 0), 0)
}

/**
 * This cycle's lead credits. Apollo's own reading first; if it cannot be read, a manual
 * `APOLLO_MONTHLY_CREDIT_LIMIT` with our own ledger as the "used" figure; otherwise `null`.
 */
export async function readApolloUsage(): Promise<ApolloUsage | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.usage ? { ...cache.usage, used: cache.usage.used + spentSinceRead } : null
  }
  let usage = await readFromApollo()
  if (!usage) {
    const manual = Number(process.env.APOLLO_MONTHLY_CREDIT_LIMIT)
    if (Number.isFinite(manual) && manual > 0) {
      const used = await ledgerThisMonth()
      usage = used === null ? null : { limit: manual, used, source: 'manual' }
    }
  }
  cache = { at: Date.now(), usage }
  spentSinceRead = 0
  return usage
}

export type BudgetVerdict =
  | { ok: true; usage: ApolloUsage; ceiling: number }
  | { ok: false; reason: 'over_budget'; usage: ApolloUsage; ceiling: number }
  | { ok: false; reason: 'unreadable' }

/** Pure: may `need` more credits be spent against this reading? */
export function budgetVerdict(usage: ApolloUsage | null, need: number): BudgetVerdict {
  if (!usage) return { ok: false, reason: 'unreadable' }
  const ceiling = Math.floor(usage.limit * APOLLO_BUDGET_SHARE)
  if (usage.used + Math.max(0, need) > ceiling) return { ok: false, reason: 'over_budget', usage, ceiling }
  return { ok: true, usage, ceiling }
}

/**
 * May this reveal go ahead? Alerts the founder when it may not. `apollo.ts` turns a refusal
 * into an `ApolloBudgetExhaustedError` (an `ApolloCreditsExhaustedError`), so callers stop the
 * run exactly as they do when Apollo's own plan runs dry.
 */
export async function checkApolloBudget(need: number): Promise<BudgetVerdict> {
  const v = budgetVerdict(await readApolloUsage(), need)
  if (!v.ok) {
    const { sendFounderAlert } = await import('./alerts')
    void sendFounderAlert('source_down', v.reason === 'unreadable'
      ? 'Apollo reveals held — the credit balance could not be read'
      : 'Apollo reveals held — 80% of this cycle\'s credits are used', [
      v.reason === 'unreadable'
        ? 'Apollo\'s usage could not be read and APOLLO_MONTHLY_CREDIT_LIMIT is not set, so no paid reveal is allowed (R166 ⑥). Check Vida → System → "Apollo credits".'
        : `Used ${v.usage.used} of ${v.usage.limit} this cycle; the budget stops paid reveals at ${v.ceiling} (80%).`,
      'Nothing was spent. Proof and programme runs that need a reveal are paused until the next cycle or a founder decision.',
    ])
  }
  return v
}

/** After a reveal: remember what it spent (in the cache and the ledger). Never throws. */
export async function recordApolloSpend(credits: number, purpose: string): Promise<void> {
  if (!(credits > 0)) return
  spentSinceRead += credits
  try {
    const { error } = await db.from('apollo_credit_ledger').insert({ credits, purpose })
    if (error) console.error('[apollo-budget] ledger write failed (the spend happened):', error.message)
  } catch (err) {
    console.error('[apollo-budget] ledger write threw (the spend happened):', err)
  }
}
