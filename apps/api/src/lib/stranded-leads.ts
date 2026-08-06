// #631 — ENROL A STRANDED PAID LEAD, AND PROVE IT WORKED.
//
// ⚠️ THE SITUATION THIS EXISTS FOR. On 5 Aug the founder's A9 money walk approved two leads on
// Client Zero. Both were charged (or consumed a pack slot) and **neither entered a sequence** —
// #625's gate did not exist yet, and `autoEnrollLead`'s no-campaign branch is a silent `return`,
// so the `.catch` wrapped around it never fired. They surfaced hours later on the integrity
// panel: *"2 paid lead(s) across 1 client(s) are in NO sequence — charged for work that never
// started."* The founder ruled on 6 Aug: **enrol them — they were paid for.**
//
// ⚠️ AND THE ALERT ALREADY TOLD HIM TO DO SOMETHING HE COULD NOT DO. Both alert bodies in
// `approve-lead.ts` end *"enrol it from Vida or nothing will ever be sent"* — and **no operator
// enrol control existed**. The two enrol routes on `figsyRouter` are CLIENT-authed and take a
// campaign id. That is the #626 defect exactly: a screen naming a fix nobody can perform.
//
// ── THE ONE RULE THAT SHAPES THIS FILE ───────────────────────────────────────────────────
//
// **`autoEnrollLead` returns `void`, and its no-campaign branch RETURNS rather than throws.**
// That single fact is what produced #625: a caller that awaits it and reports success is
// reporting a hope. So this module never trusts the call — it **re-reads `figsy_enrollments`
// afterwards** and reports what is actually there. A "worked" verdict means a row exists.
//
// Pure judgement lives here; the route gathers facts and performs the write. Same split as
// `coldView`, `pecrVerdict` and `calendarBookingVerdict` — the decision is provable without a
// database, including the branches that only fire when something is already wrong.

/** What we knew about the lead before touching anything. */
export type StrandedFacts = {
  /** The lead row exists and belongs to this client. */
  exists: boolean
  /** `is_demo` on the owning client. Demo leads are never enrolled here (#583). */
  isDemo: boolean
  /** `revealed_at` is set — i.e. it was actually approved and paid for. */
  approved: boolean
  /** An enrollment row already exists for this lead. */
  alreadyEnrolled: boolean
}

export type StrandedVerdict =
  | { ok: true }
  | { ok: false; code: 'not_found' | 'demo' | 'not_approved' | 'already_enrolled'; reason: string }

/**
 * May we enrol this lead?
 *
 * Ordered so the most specific refusal wins, and every refusal says what the operator should
 * conclude — a bare "no" on an operator screen becomes a support question.
 */
export function mayEnrolStranded(f: StrandedFacts): StrandedVerdict {
  if (!f.exists) {
    return { ok: false, code: 'not_found', reason: 'No such lead for this client. Nothing was changed.' }
  }
  // Demo first: a demo lead can never be worked, so enrolling one is pure noise in the ledger
  // and the send path would refuse it anyway (`is_demo` is a hard stop, every address .invalid).
  if (f.isDemo) {
    return { ok: false, code: 'demo', reason: 'This is a demo client. Demo leads are never enrolled — nothing can be sent to them, so there is nothing to rescue. Rebuild the demo instead (Vida → Engine → MBF).' }
  }
  if (!f.approved) {
    return { ok: false, code: 'not_approved', reason: 'This lead was never approved (no revealed_at), so nobody has paid for it and it is not stranded. Approving is the client\'s decision, not an operator repair.' }
  }
  // ⚠️ THE NO-OP REFUSAL. A second press must not create a second enrollment — one lead in two
  // sequences means the prospect receives the same campaign twice from the same mailbox, which
  // is the complaint that burns a domain. Refusing is the correct answer, not an error.
  if (f.alreadyEnrolled) {
    return { ok: false, code: 'already_enrolled', reason: 'Already in a sequence — nothing to do. This lead is not stranded (or a previous press already fixed it).' }
  }
  return { ok: true }
}

/** What actually happened, read back from the database rather than assumed. */
export type EnrolOutcome =
  | { state: 'enrolled'; detail: string }
  | { state: 'refused'; code: string; detail: string }
  | { state: 'no_campaign'; detail: string; action: string }
  | { state: 'failed'; detail: string }

/**
 * Turn "did a row appear?" into the sentence the operator reads.
 *
 * ⚠️ `enrolledAfter` MUST be a fresh read taken AFTER the enrol attempt. Passing the pre-check
 * value would make this function report success for every press — the exact shape of #625,
 * where the absence of a throw was mistaken for the presence of work.
 */
export function describeEnrolOutcome(a: {
  enrolledAfter: boolean
  /** Does the client have an ACTIVE campaign? Read after the attempt, because #625's resolver may resume a paused one. */
  hasActiveCampaign: boolean
  threw?: string | null
}): EnrolOutcome {
  if (a.enrolledAfter) {
    return {
      state: 'enrolled',
      // Say plainly that this does NOT mean mail moved — the kill-switch and the warming-mailbox
      // guard both still sit downstream, and an operator who reads "enrolled" as "sent" will go
      // looking for a delivery that was never meant to happen yet.
      detail: 'Enrolled — the lead is now in a sequence and will be worked when sending starts. NOTHING has been sent: AUTO_OUTREACH_ENABLED is still the gate, and a warming mailbox still refuses. No charge was made — this lead was already paid for.',
    }
  }
  if (a.threw) {
    return { state: 'failed', detail: `The enrol call failed and the lead is STILL stranded: ${a.threw}. Nothing was charged. Try again once the cause is fixed.` }
  }
  if (!a.hasActiveCampaign) {
    // The overwhelmingly likely cause, and the one the System page already reports separately
    // for Client Zero ("NO active campaign").
    return {
      state: 'no_campaign',
      detail: 'The lead is STILL stranded. The client has no ACTIVE campaign, and a lead cannot enter a sequence that does not exist — this is the same reason it was never enrolled in the first place.',
      action: 'Create or start their campaign in Vida, then press this again. (Starting a campaign does not send: the kill-switch and the warming guard are both still in front of every send.)',
    }
  }
  return {
    state: 'failed',
    detail: 'The enrol call returned without error and NO enrollment row appeared. That is the #625 shape — do not read this as success. Nothing was charged.',
  }
}
