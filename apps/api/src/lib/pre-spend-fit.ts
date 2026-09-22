// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C5 · ONE FIT PREDICATE FOR POOL *AND* PROVIDER — ASKED BEFORE A SLOT IS CONSUMED
//
// ── THE DEFECT: TWO PATHS, ONE RULE, AND ONLY ONE OF THEM ASKED IT ──────────────────────
//
// `pool-sourcing.ts` has asked the whole rule since C02 (10 Sep): `poolRecordMatchesIcp` is
// `structurallyAdmissible(hardFit(record, icp))`, so a reused record that fails ANY criterion
// is refused BEFORE it is served and before it shrinks the external ask.
//
// 🛑 THE PROVIDER PATH ASKED ONE SEVENTH OF IT. `runIcpJob`'s insertion loop applies exactly
// one hard criterion at the provider boundary — the 27-Aug geography invariant — and its own
// note says why that one is there: *"The pool path already refuses a candidate whose country
// is unknown or non-matching; this is the SAME rule at the provider boundary, via the SAME
// canonical predicate."* Size, industry, category, company type, seniority and the client's
// EXCLUSIONS were never asked there at all. They are asked afterwards, by `applyStructuralGate`
// — after the candidate has been inserted as a lead AND after it has consumed a slot.
//
// ── AND THE SLOT IS THE POINT, NOT THE LEAD ROW ─────────────────────────────────────────
//
// `grantedSize` is entitlement that was RESERVED before the search: a programme's
// `try_reserve_programme_sourcing`, or a prospect's `try_reserve_proof_records` — 40 records
// for a prospect's whole lifetime. The reconcile releases `grantedSize − returnedCount`, and
// `returnedCount` was the raw provider page. So a Proof run where Apollo returned 40 people
// and 35 of them were companies the client's own criteria refuse consumed all 40 lifetime
// records to show 5 — and the 35 were set aside a few hundred lines later, for free, by the
// same predicate that could have answered before the reservation was spent.
//
// ⚠️ SO THIS ASKS `structurallyAdmissible`, NOT `setAsideReason` — DELIBERATELY THE LENIENT
// ONE. The gate sets aside UNKNOWNS too (11 Sep), and an unknown is still a real candidate:
// it is surfaced, banded "Worth a look", capped at 74. Refusing unknowns here would delete
// that state before it could exist. **Only a criterion that answered a definite `no` may cost
// a candidate its slot** — which is exactly the pool's own question, for exactly the reason
// `structurallyAdmissible`'s own header gives.
//
// ⚠️ AND IT CANNOT REFUSE WHAT THE GATE WOULD ADMIT. `structurallyAdmissible` is strictly
// weaker than `setAsideReason`: every candidate refused here would have been set aside there.
// The set the CLIENT sees is therefore byte-identical — `/leads/for-approval` already filters
// `set_aside_reason IS NULL`. What changes is the slot, the lead row, and the scoring call.
// ══════════════════════════════════════════════════════════════════════════════════════════

import {
  hardFit, REMOVING_CRITERIA,
  type FitCandidate, type FitIcp, type HardCriterion,
} from './proof-fit'

/**
 * The provider-contact shape both search paths return, narrowed to the fields the fit rule
 * reads. Structural, not nominal — Apollo's and PDL's casts both satisfy it.
 *
 * ⚠️ THESE ARE THE SAME FIELDS `runIcpJob` WRITES INTO THE LEAD ROW, and that is the
 * invariant that makes this honest: judging the contact must be the same question as judging
 * the row it becomes, or the pre-spend answer and the gate's answer could disagree.
 */
export interface ProviderContact {
  country?: string | null
  title?: string | null
  seniority?: string | null
  organization_name?: string | null
  organization?: {
    name?: string | null
    industry?: string | null
    num_employees?: number | null
  } | null
}

/**
 * The contact as the lead row it is about to become.
 *
 * ⚠️ `category_fit` IS DELIBERATELY ABSENT. It is the model's recorded verdict (J5-C13 ·
 * FD-2) and no model has seen this person yet — scoring runs on `gatedIds`, far below. So
 * `categoryVerdict` answers structurally here, from the industry tag and the company NAME,
 * exactly as it does for a pool record that has never been scored either.
 */
export function providerContactAsCandidate(c: ProviderContact): FitCandidate {
  const employees = c.organization?.num_employees
  return {
    country:      c.country ?? null,
    job_title:    c.title ?? null,
    seniority:    c.seniority ?? null,
    company:      c.organization?.name ?? c.organization_name ?? null,
    industry:     c.organization?.industry ?? null,
    company_size: typeof employees === 'number' ? String(employees) : null,
  }
}

/**
 * The criterion that refuses this contact, or `null` if nothing does.
 *
 * ⚠️ A CRITERION, NOT A BOOLEAN, because the run has to be able to SAY why a page emptied.
 * `removedByGeoGate`'s own alert line exists for precisely that reason, and a silent count
 * would be the "the search returned nothing" untruth this whole area was built to remove.
 */
export function preSpendRefusal(c: ProviderContact, icp: FitIcp): HardCriterion | null {
  const fit = hardFit(providerContactAsCandidate(c), icp)
  // ── 🛑 ⚑ 22 Sep — IT HAD TO MOVE WITH THE GATE, OR THE FIX WOULD HAVE BEEN INVISIBLE ───
  //
  // ⛓️ WAS: ~~`structurallyAdmissible(fit) ? null : firstHardFailure(fit)`~~ — a definite
  // `no` on any of the seven, including the client's category.
  //
  // 🛑 THIS RUNS FIRST IN THE SOURCING LOOP and drops a contact BEFORE it is inserted, so a
  // person refused here never reaches `applyStructuralGate` at all. Relaxing only the gate
  // would have left exactly the same people deleted one step earlier, the run still
  // reporting an empty page, and the gate looking innocent.
  //
  // ⚠️ AND THE HEADER'S OWN SAFETY ARGUMENT DEPENDS ON THE TWO AGREEING. It calls this
  // *"strictly weaker than the gate — every candidate refused here would have been set aside
  // there"*, which INVERTS the moment the gate stops removing on a criterion this one still
  // spends a slot on. `removalCriterion` is the single definition of what may remove, so the
  // invariant is restored rather than broken.
  //
  // ⚠️ `unknown` STILL DOES NOT COST A SLOT HERE. `removalCriterion` prefers a definite `no`,
  // and this asks only for that: an unknown is a real candidate — surfaced, banded "Worth a
  // look", capped at 74 — and refusing it before the spend would delete that state before it
  // could exist. That is the lenient reading this file has always deliberately taken.
  return REMOVING_CRITERIA.find(k => fit[k] === 'no') ?? null
}

/** Per-criterion refusal counts, for the one log line and the one alert line. */
export type PreSpendRefusals = Partial<Record<HardCriterion, number>>

export interface PreSpendSplit<T> {
  /** May consume a slot. */
  admissible: T[]
  /** Refused before any slot was consumed, each with the criterion that refused it. */
  refused: { contact: T; criterion: HardCriterion }[]
  /** `{ seniority: 12, industry: 3 }` — counts only, never PII. */
  counts: PreSpendRefusals
}

/**
 * Split a provider page into what may consume entitlement and what may not.
 *
 * ⚠️ PURE, AND IT MUTATES NOTHING. The caller keeps the FULL page for `acquisition_memory`
 * (R67 — every paid identity is remembered before any client gate can drop it) and for
 * `providerContactsReturned` (the neutral-review fact: what the provider genuinely handed
 * us). This answers a question; it does not throw anybody away.
 */
export function splitPreSpendFit<T extends ProviderContact>(
  contacts: T[],
  icp: FitIcp,
): PreSpendSplit<T> {
  const admissible: T[] = []
  const refused: { contact: T; criterion: HardCriterion }[] = []
  const counts: PreSpendRefusals = {}
  for (const contact of contacts) {
    const criterion = preSpendRefusal(contact, icp)
    if (criterion === null) { admissible.push(contact); continue }
    refused.push({ contact, criterion })
    counts[criterion] = (counts[criterion] ?? 0) + 1
  }
  return { admissible, refused, counts }
}

/** `seniority 12 · industry 3` — stable order, counts only. */
export function describePreSpendRefusals(counts: PreSpendRefusals): string {
  return Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(' · ')
}
