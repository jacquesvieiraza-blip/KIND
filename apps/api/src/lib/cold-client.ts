// COLD CLIENTS — 30 days without an approval and we suspend (founder-locked 25 Jul).
//
// "we not a free service. a client needs to be working with us or we freeze their inbox."
//
// The cost is real and it is ours: a client's sender costs ~$40/month from the day they sign,
// and it keeps costing whether they approve anybody or not. A client who stopped six weeks ago
// is a bill we pay to keep an inbox warm for nobody.
//
// Suspending is NOT deleting. We pause their campaigns — nothing further sends — and say so
// plainly. The moment they approve anyone again they are live, because approving is the
// signal that they are back. Their leads keep waiting for them (no time limit on paid leads),
// and their pack is untouched.
//
// Derived entirely from `leads.revealed_at`, so there is no column to keep in sync and no
// migration to run: a client's last approval IS the last revealed lead.

/** Days without an approval before we suspend. */
export const COLD_DAYS = 30
/** Days at which we warn them it's coming — one week's notice, not a surprise. */
export const WARN_DAYS = 23

export type ColdState = {
  /** Whole days since their last approval. null when they have never approved. */
  daysIdle: number | null
  /** Never approved anything — a different problem (they are still onboarding). */
  neverStarted: boolean
  warn: boolean
  cold: boolean
  /** What Vida shows the operator. */
  label: string
}

/**
 * Where is this client against the 30-day clock?
 *
 * `lastApprovalAt` is the newest `revealed_at` for the client; null if they have never
 * approved anyone. A client who has never approved is NOT cold — they have not started, which
 * is chased in a different place (step 2, the $99), and suspending someone who never got
 * going would be punishing us for our own onboarding.
 */
export function coldState(lastApprovalAt: string | Date | null | undefined, now: Date): ColdState {
  if (!lastApprovalAt) {
    return { daysIdle: null, neverStarted: true, warn: false, cold: false, label: 'Not started yet — no approvals' }
  }
  const then = lastApprovalAt instanceof Date ? lastApprovalAt : new Date(lastApprovalAt)
  if (Number.isNaN(then.getTime())) {
    // An unparseable date must never read as "30 days idle" and suspend a paying client.
    return { daysIdle: null, neverStarted: true, warn: false, cold: false, label: 'Not started yet — no approvals' }
  }
  const daysIdle = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000))
  const cold = daysIdle >= COLD_DAYS
  const warn = !cold && daysIdle >= WARN_DAYS

  if (cold) return { daysIdle, neverStarted: false, warn: false, cold: true, label: `Suspended — no approvals in ${daysIdle} days` }
  if (warn) return { daysIdle, neverStarted: false, warn: true, cold: false, label: `Going quiet — ${COLD_DAYS - daysIdle} days until we suspend` }
  return { daysIdle, neverStarted: false, warn: false, cold: false, label: daysIdle === 0 ? 'Approved today' : `Last approval ${daysIdle}d ago` }
}

/** What we say to the client. Plain, no threat, and it says exactly how to undo it. */
export function suspensionMessage(companyName: string | null | undefined): string {
  const who = companyName?.trim() || 'your account'
  return `We've paused sending for ${who}. Nobody has been approved in ${COLD_DAYS} days, and we keep a warmed sender running for you the whole time — so we pause rather than bill you for silence. Approve anyone from your list and you're straight back on; nothing has been lost and your included leads are still yours.`
}

// ── #618 — WHO THIS RULE IS NOT FOR (founder-ruled 5 Aug) ─────────────────────────────────
//
// ⚠️ THE COLLISION, AND IT WAS BUILT BY TWO INDIVIDUALLY CORRECT DECISIONS.
//
// This file's own header explains why the rule exists: *"a client's sender costs ~$40/month…
// a bill we pay to keep an inbox warm for nobody."* It is a COST rule about a CLIENT who has
// gone quiet while we carry their mailbox.
//
// `cold-check` skips `is_demo === true` and nothing else. And `house-client.ts` DELIBERATELY
// un-demos Client Zero — its own comment: *"`is_demo` true would exclude it from every revenue
// figure AND make the CSV import refuse it (#599)."* Both right. Together they leave **our own
// account inside a rule written for other people's accounts.** We are the nobody, and we chose
// our own bill.
//
// ⚠️ WHY THIS STOPPED BEING THEORETICAL ON 5 AUG. #611 called it *"a trap for the abnormal
// order"*, reasoning that approvals precede a campaign and any approval resets the clock. The
// founder then ruled (A4) that Client Zero's 159 approved leads are real prospects and stay —
// and **they are already approved AND already enrolled.** So send-day needs no new approval:
// on ~25 Aug a campaign goes active with the last approval ~59 days old, and the next 08:40 UTC
// run pauses it and emails a churn-risk alert about our own account. After three weeks of
// warming. The reasoning that made it low-risk died with that ruling.
//
// ⚠️ FAILS OPEN ON PURPOSE. When the house account cannot be resolved, `houseClientId` is null
// and NOBODY gains an exemption — the cron behaves exactly as it does today. That direction is
// deliberate: the cost of failing open is that OUR campaign might be paused (visible, alerted,
// one click to undo), while failing closed would silently exempt everyone and quietly break a
// rule that exists to stop us paying for senders nobody is using.

export type ColdExemption = { exempt: boolean; why: string }

// ── ⚑ 23 Sep (R124 · R136 · R137) — A PROGRAMME CLIENT IS NOT JUDGED BY A PER-LEAD CLOCK ───
//
// This rule's clock is "the newest REVEALED lead" — an approval under the retired per-lead
// model. A programme client is not paced by reveals at all, so the clock says nothing about
// whether they are working with us. And R136 made the collision live: a programme that stops
// short credits the client's wallet with a `wallet_topup`, which is in `PAID_TX_TYPES`, so the
// cron started treating that client as "paid" and could warn or SUSPEND them for not revealing.
//
// So the cron asks the one question every legacy door asks (`legacyDoorVerdict` →
// `mayUseLegacyCommercialPath`) and passes the answer in here. A refusal exempts:
//   · 403 — on the programme: the per-lead rule does not apply;
//   · 503 — the model could not be read: a PER-LEAD rule must not pause a client we cannot
//     place on the per-lead model. Unlike the house lookup below, "could not tell" here means
//     "no authority to apply a legacy sanction", so it skips rather than suspends.
//
// ⚠️ OPTIONAL, AND ONLY THE CRON PASSES IT. `coldView` (the display surfaces) does not, so this
// change is confined to the cron that pauses campaigns.

/** The shape `legacyDoorVerdict` returns — restated so this module stays pure. */
export type ColdLegacyVerdict =
  | { allowed: true }
  | { allowed: false; status: 403 | 503; reason: string }

/**
 * Should `cold-check` skip this client entirely?
 *
 * Pure so the judgement is provable without a cron run, a database or a clock — the same reason
 * `coldState` above is pure.
 */
export function coldCheckExempt(a: {
  clientId: string
  isDemo: boolean | null | undefined
  /** Resolved by `decideHouseClient` — NEVER matched on company name (#584/#593). */
  houseClientId: string | null
  /** From `legacyDoorVerdict(clientId)`. Omitted → no commercial-model exemption. */
  legacyVerdict?: ColdLegacyVerdict
}): ColdExemption {
  if (a.isDemo === true) {
    return { exempt: true, why: 'demo account — ours, not a client we carry a sender for' }
  }
  if (a.houseClientId && a.clientId === a.houseClientId) {
    return { exempt: true, why: 'the house account (Client Zero) — this rule is about a CLIENT going quiet while we pay for their mailbox. Our own bill is our own choice, and there is no churn to warn about.' }
  }
  if (a.legacyVerdict && !a.legacyVerdict.allowed) {
    return a.legacyVerdict.status === 503
      ? { exempt: true, why: `commercial model could not be read (${a.legacyVerdict.reason}) — a per-lead reveal rule is not applied to a client we cannot place on the per-lead model` }
      : { exempt: true, why: 'on the programme (R137) — the 30-day reveal clock belongs to the retired per-lead model, so it neither warns nor suspends a programme client' }
  }
  return { exempt: false, why: '' }
}

// ── #619 — THE EXEMPTION HAS TO REACH THE SCREEN, NOT JUST THE CRON ───────────────────────
//
// #618 fixed the cron and stopped there, so the exemption existed in exactly one place while
// THREE surfaces still asked `coldState` on its own and got "Suspended" back. The founder saw
// the result on the live board: a red SUSPEND badge on our own account, which is not suspended
// and never will be. #618's own test file left the warning in writing — *"two copies of who is
// exempt"* — and this is that debt coming due.
//
// So the combination gets ONE home. Any surface that shows a human a cold verdict calls this,
// never `coldState` raw, and a fourth surface added next month inherits the exemption instead
// of re-deriving it. (The cron is the one deliberate exception: it checks `coldCheckExempt`
// BEFORE reading the database at all, which is strictly better than reading and discarding.)

export type ColdView = ColdState & {
  /** This account is outside the rule — never show it as suspended or going quiet. */
  exempt: boolean
  /** Why, in words, for the operator. Empty when not exempt. */
  why: string
}

/**
 * The cold verdict as a HUMAN should see it: the clock, with the exemption already applied.
 *
 * Pure, for the same reason `coldState` and `coldCheckExempt` are — the judgement is provable
 * without a cron run, a database or a clock.
 *
 * Fails open exactly as `coldCheckExempt` does: `houseClientId: null` exempts nobody, so an
 * unresolvable house account shows the ordinary verdict rather than silently exempting the
 * whole book.
 */
export function coldView(a: {
  lastApprovalAt: string | Date | null | undefined
  now: Date
  clientId: string
  isDemo: boolean | null | undefined
  houseClientId: string | null
}): ColdView {
  const state = coldState(a.lastApprovalAt, a.now)
  const ex = coldCheckExempt({ clientId: a.clientId, isDemo: a.isDemo, houseClientId: a.houseClientId })
  if (!ex.exempt) return { ...state, exempt: false, why: '' }

  // `warn` and `cold` are forced false rather than left for each caller to remember, because
  // "remember to check exempt before you read .cold" is precisely the instruction three call
  // sites already failed to follow. The day count is KEPT — it is true and it is useful; it is
  // only the verdict drawn from it that does not apply here.
  return {
    ...state,
    warn: false,
    cold: false,
    exempt: true,
    why: ex.why,
    label: state.daysIdle === null
      ? 'Cold-check exempt — this rule is not for our own account'
      : `Cold-check exempt · last approval ${state.daysIdle}d ago`,
  }
}
