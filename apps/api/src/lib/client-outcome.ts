// ═══════════════════════════════════════════════════════════════════════════════════════
// WHAT THE CLIENT SAID THEY WANT — stated once, and belonging to the CLIENT.
//
// ── THE LIVE DEFECT (canary, 10 Sep) ────────────────────────────────────────────────────
//
// During onboarding the founder told Milla, in his own words:
//
//     "Book qualified meetings with those founders and CEOs."
//
// After onboarding, Milla Home read:
//
//     OUTCOME    —    not set yet
//     NEXT       Tell Milla the outcome you want
//
// He had just told her. There were TWO notions of "outcome" and neither was the client's:
// the spoken sentence went into `icps.campaign_intent` (copy input for the sequence writer,
// shown only on the welcome summary), and the OUTCOME CARD read
// `programme.meeting_target` — a number that does not exist until a programme is created,
// which is several steps later. So during Proof the card was structurally always empty, and
// the NEXT line asked for the one thing he had already given.
//
// ── WHY IT LIVES ON THE CLIENT (founder-locked 10 Sep) ──────────────────────────────────
//
// The outcome is the customer's, not a programme's. It survives ICP revisions, it exists
// before any programme, and it outlives each programme that serves it. Hanging it on the
// programme meant it could not be shown at the moment it was most needed — the first screen
// after signup — and would have to be restated for every future programme.
//
// ⚠️ AND IT IS SEPARATE FROM THE NUMBER. `meeting_target` is a commercial figure agreed at
// recommendation; `outcome_stated` is a sentence. Conflating them is exactly what produced
// the empty card: one is decided by us with the client later, the other is theirs from the
// first minute.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * What kind of thing they asked for.
 *
 * ⚠️ `other` IS NOT A FAILURE — it is the honest bucket for an outcome our machinery does
 * not deliver as meetings, and `customer-programme.ts` has anticipated it since the type was
 * written. It routes to a human rather than being quietly reinterpreted as meetings.
 */
export type OutcomeKind = 'meetings' | 'other'

export interface ClientOutcome {
  kind: OutcomeKind
  /** Their words, verbatim. Never summarised, never tidied. */
  stated: string
}

/** The one sentence onboarding asks. Founder-locked wording. */
export const OUTCOME_QUESTION = 'What should this achieve for you?'

/** What Milla Home says when — and only when — we genuinely do not have it. */
export const OUTCOME_UNSET_NEXT = 'Tell Milla the outcome you want'

/**
 * Words that mean "a meeting" in the way this product delivers one.
 *
 * ⚠️ DELIBERATELY NARROW. A client who says "more revenue" or "brand awareness" has NOT
 * asked for meetings, and classifying them as `meetings` would put a meeting target against
 * an outcome nobody agreed to. Anything unrecognised is `other` and reaches a person.
 */
const MEETING_WORDS = [
  'meeting', 'meetings', 'call', 'calls', 'demo', 'demos',
  'appointment', 'appointments', 'consultation', 'consultations',
]

const clean = (s: unknown): string => String(s ?? '').trim()

/**
 * Read one client's outcome from what they typed.
 *
 * @returns null when nothing usable was said — which is the ONLY state in which Milla may
 *          ask again. A blank answer is not an outcome and must not be stored as one: an
 *          empty `outcome_stated` would satisfy every "do we have it" check while telling
 *          the client's own screen nothing.
 */
export function readStatedOutcome(said: unknown): ClientOutcome | null {
  const stated = clean(said)
  // Two characters is not an answer. Deliberately permissive above that: "meetings" is a
  // complete answer, and so is a paragraph.
  if (stated.length < 3) return null
  const words = stated.toLowerCase().split(/[^a-z]+/).filter(Boolean)
  const kind: OutcomeKind = words.some(w => MEETING_WORDS.includes(w)) ? 'meetings' : 'other'
  return { kind, stated }
}

/**
 * 🛑 MAY MILLA ASK FOR THE OUTCOME?
 *
 * Founder-locked: only when it is absent, genuinely ambiguous, or the client changes it.
 * The first is this function; the third is the client's own action; the second is `other`,
 * which is asked by a PERSON rather than re-asked on the screen.
 */
export function shouldAskForOutcome(o: ClientOutcome | null | undefined): boolean {
  if (!o) return true
  return clean(o.stated).length === 0
}

/**
 * What Milla Home shows under OUTCOME.
 *
 * ⚠️ IT NEVER READS A PROGRAMME. That was the defect: a client in Proof has no programme,
 * so a card fed by `meeting_target` is empty exactly when the client most wants to see that
 * we heard them. Their sentence is available from the first minute and is what goes here.
 */
export function outcomeHeadline(o: ClientOutcome | null | undefined): string {
  return o && clean(o.stated) ? o.stated : 'not set yet'
}

/**
 * The NEXT line during Proof.
 *
 * ⚠️ IT ASKS FOR THE OUTCOME ONLY IF WE DO NOT HAVE ONE. When we do, it says what is
 * actually happening — because the client's next step is to wait for the examples, and
 * telling them to do something they have already done is what made the screen feel unheard.
 */
export function proofNextLine(o: ClientOutcome | null | undefined): string {
  return shouldAskForOutcome(o)
    ? OUTCOME_UNSET_NEXT
    : 'Milla is finding your first examples'
}

/**
 * The sentence Vida shows an operator, and the framing above Create programme.
 *
 * ⚠️ IT QUOTES THEM. An operator about to agree a meeting target should read the client's
 * own words, not our paraphrase of them — the number is being set against this sentence.
 */
export function outcomeForOperator(o: ClientOutcome | null | undefined): string {
  const stated = clean(o?.stated)
  if (!stated) return 'Not stated yet'
  return o!.kind === 'meetings' ? stated : `${stated} — not a meetings outcome; agree this with them`
}

/**
 * Seed value for `icps.campaign_intent`, which the sequence writer reads.
 *
 * ⚠️ SEEDED, NOT MOVED. `campaign_intent` is copy input — what this outreach is FOR — and
 * the client may refine it separately without changing what they told us they want. So the
 * outcome fills it when it is empty and never overwrites a value they have edited.
 */
export function seedCampaignIntent(
  existing: string | null | undefined, o: ClientOutcome | null | undefined,
): string | null {
  const current = clean(existing)
  if (current) return current
  const stated = clean(o?.stated)
  return stated || null
}
