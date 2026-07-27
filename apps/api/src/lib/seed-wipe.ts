// #329 — THE GO-LIVE SEED-DATA WIPE. PLAN AND CLASSIFICATION.
//
// Founder-confirmed on the admin walk: *"when we flip over live we clean everything up."*
// Logged 7 Jul. Prompt 6 clause: **"plan + script, executed only on my go."** So this file
// decides WHAT is seed data and what is untouchable; nothing here deletes anything, and the
// execution path is armed by an environment variable the founder sets deliberately.
//
// ── THE FIRST THING TO SAY IS THAT MOST OF THIS ITEM IS ALREADY DONE ─────────────────────
//
// #329 was written on **7 Jul**, and its stated purpose is *"so Finance/Sales/GTM read the
// real first client cleanly."* Since then, **#543 (demo exclusion) and #453 (demo mode)**
// were built, and the money surfaces already exclude demo and house accounts through
// `getClientExclusions()` — `internal-briefs.ts`, `money-path.ts` and `internal.ts` all
// apply it. `deal_registrations` has exactly one writer (`routes/partners.ts`) and no seeder
// at all, so the item's *"zero sample deal_registrations"* describes rows that do not exist.
//
// **Exclusion is strictly better than deletion** for this purpose: it is reversible, it
// cannot destroy something that turns out to have been real, and it keeps the demo account
// working — which matters, because MBF is how the product gets SOLD. A wipe that removes
// the demo removes the sales tool.
//
// So the honest plan is: report first, delete almost nothing, and treat anything still
// leaking demo data into a real figure as **a missing exclusion to fix, not rows to destroy.**
//
// ── AND THE SECOND IS THAT NOTHING GETS DELETED IS FOUNDER-LOCKED ────────────────────────
//
// 26 Jul, after this item was written. The two are reconciled by the founder's own clause —
// *"executed only on my go"* — so the default of every path here is to report, and the
// execution requires a deliberate arming step that cannot be reached by accident.

/** A client row, reduced to what the classification needs. */
export type SeedCandidate = {
  id: string
  company_name: string | null
  is_demo: boolean | null
  /** Auth email, when resolvable. Used ONLY for the house account. */
  email?: string | null
  /** Number of PURCHASE-type ledger rows that carry a Stripe reference. */
  realPayments: number
  /** Leads whose email does NOT end in .invalid. */
  realLeads: number
}

export type Disposition =
  /** Real client data. Never in scope, under any flag. */
  | 'protected_real'
  /** The demo account. Deliberately kept — it is how the product is sold. */
  | 'protected_demo'
  /** The founder's own testing login. Kept, already excluded from every figure. */
  | 'protected_house'
  /** Seed/test data with no real money and no real people. Eligible, on an explicit go. */
  | 'eligible'

export type Classification = {
  clientId: string
  companyName: string
  disposition: Disposition
  /** Why — this goes in the report, and a row without a reason is not actionable. */
  reason: string
}

/**
 * The demo account is identified by `is_demo`, NEVER by company name.
 *
 * Name matching has bitten this codebase twice — `MBF Holdings` vs the live `MBF Demo`
 * (#584/#582) — because a name is a label a human edits and a flag is not. On a destructive
 * path that mistake deletes the wrong account.
 */
export function classify(c: SeedCandidate, houseEmails: Set<string>): Classification {
  const name = c.company_name?.trim() || '(unnamed)'
  const base = { clientId: c.id, companyName: name }

  // ① REAL MONEY WINS OVER EVERY OTHER SIGNAL, including is_demo.
  //
  // If a client has taken a real payment, they are a real client — even if somebody
  // mislabelled them, even if the name looks like a test. The flag is a human's opinion;
  // a Stripe-referenced ledger row is a fact. This ordering is the whole safety property.
  if (c.realPayments > 0) {
    return { ...base, disposition: 'protected_real', reason: `has ${c.realPayments} real payment(s) — a paying client is never seed data, whatever it is labelled` }
  }

  // ② Real people on the desk. A client with leads carrying deliverable addresses has been
  // worked on by a human, whether or not money moved yet.
  if (c.realLeads > 0) {
    return { ...base, disposition: 'protected_real', reason: `holds ${c.realLeads} lead(s) with real email addresses — someone has worked this desk` }
  }

  // ③ The house account — the founder's own login. Already excluded from every figure, and
  // deleting it would take the founder's own test history with it.
  if (c.email && houseEmails.has(c.email.trim().toLowerCase())) {
    return { ...base, disposition: 'protected_house', reason: 'the house account (the founder\'s own login) — already excluded from every revenue figure' }
  }

  // ④ The demo. KEPT ON PURPOSE. MBF is how the product is demonstrated to a buyer; wiping
  // it at go-live would delete the sales tool on the day it is most needed. `demo-mbf.ts`
  // rebuilds it to a fixed cast anyway, so there is nothing here worth destroying.
  if (c.is_demo === true) {
    return { ...base, disposition: 'protected_demo', reason: 'the demo account — kept deliberately; it is how the product is sold, and demo-mbf.ts rebuilds it on demand' }
  }

  return {
    ...base,
    disposition: 'eligible',
    reason: 'no real payments, no real leads, not the demo and not the house account — seed/test residue',
  }
}

export type WipeReport = {
  classifications: Classification[]
  eligible: Classification[]
  protectedCount: number
  /** True when there is genuinely nothing to do. */
  clean: boolean
}

export function buildReport(candidates: SeedCandidate[], houseEmails: Set<string>): WipeReport {
  const classifications = candidates.map(c => classify(c, houseEmails))
  const eligible = classifications.filter(c => c.disposition === 'eligible')
  return {
    classifications,
    eligible,
    protectedCount: classifications.length - eligible.length,
    clean: eligible.length === 0,
  }
}

/**
 * The arming check. Execution is impossible unless the founder has deliberately set
 * `SEED_WIPE_ARMED` to today's date in UTC, AND typed the confirmation phrase.
 *
 * Two independent keys, and the date is the important one: an env var left set from a
 * previous session cannot arm a later run, so this cannot become a permanently-loaded gun
 * sitting in Railway. Same shape as `FOUNDER_FLIP=1` for 🟢 dots, but dated, because this
 * one is not reversible.
 */
export const WIPE_CONFIRMATION = 'WIPE THE SEED DATA'

export function armingCheck(
  envValue: string | undefined,
  typedConfirmation: string | undefined,
  today: Date,
): { armed: boolean; why: string } {
  const expected = today.toISOString().slice(0, 10)
  if (!envValue) {
    return { armed: false, why: `SEED_WIPE_ARMED is not set. To arm, set it to today's UTC date (${expected}) on @kind/api in Railway, and remove it afterwards.` }
  }
  if (envValue.trim() !== expected) {
    return { armed: false, why: `SEED_WIPE_ARMED is "${envValue.trim()}" but today is ${expected}. A stale arming value cannot fire — set it again, deliberately, on the day you mean to run it.` }
  }
  if ((typedConfirmation ?? '').trim() !== WIPE_CONFIRMATION) {
    return { armed: false, why: `The confirmation phrase must be typed exactly: "${WIPE_CONFIRMATION}".` }
  }
  return { armed: true, why: `Armed for ${expected} and confirmed.` }
}
