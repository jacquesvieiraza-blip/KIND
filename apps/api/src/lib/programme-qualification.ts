// ═══════════════════════════════════════════════════════════════════════════════════════
// M&V's FINAL QUALIFICATION — the step that decides what a programme's entitlement bought.
//
// 🛑 WHY THIS IS ITS OWN OPERATION AND NOT PART OF DELIVERY. Qualification used to live inside
// `enrichAndDeliverLeads`, which meant it ran only on the rows delivery had already selected —
// `insertedIds.slice(0, deliveryCapBalance(...))`, and `deliveryCapBalance` returns a CONSTANT
// 25 whatever the plan or balance. So a 250-candidate batch had at most 25 candidates judged,
// and the other 225 were left for a ~5/day drip that runs no ICP gate at all, forces
// `apollo_consented: true` on whatever the provider returned, and permits the Hunter waterfall
// House has switched off. Judging is not delivering, and a self-serve throttle must not decide
// how many of a customer's prospects M&V bothers to assess.
//
// ── WHAT IT DOES, PER CANDIDATE ─────────────────────────────────────────────────────────
//
//   already judged        → skip. No read of the provider, no write, no cost. This is what
//                           makes a retry after a provider failure safe and free.
//   facts sufficient      → judge from what is stored. No provider call.
//   facts missing         → ONE provider reveal, then judge on the merged facts.
//   no revealable id      → judge on what we have. `finalVerdict` fails unknowns, so an
//                           unprovable candidate is disqualified rather than passed.
//
// ⚠️ "SUFFICIENT" IS DERIVED FROM THE ICP, NOT FROM `email IS NULL`. `finalVerdict` needs
// email, EMAIL STATUS and country, and which of them matter depends on the customer's own
// criteria. A House candidate that already has an address but no `email_status` is NOT
// judgeable — House requires a provider-VERIFIED address — and treating a present email as
// "fully enriched" would silently pass an unverified one.
//
// ⚠️ `apollo_consented` IS NOT A SUBSTITUTE FOR `email_status`. It is written
// `verified || likely_to_engage` at insert, and the drip path writes it TRUE unconditionally.
// It cannot prove the ICP, and this file never reads it as evidence.
//
// 🛑 NOTHING HERE WRITES `delivered_at`. Delivery is customer visibility and belongs to
// `programme-surfacing.ts`, after a verdict exists. Writing it here is what tied the ledger to
// a screen in the first place.
//
// 🛑 AND NOTHING HERE SOURCES ANYBODY. There is no People Search, no PDL, no Hunter, no
// waterfall and no phone reveal in this file. The single provider door is `bulkMatchEmails`,
// which is AR5-fenced and sends `reveal_personal_emails=false`, `reveal_phone_number=false`,
// `run_waterfall_email=false`, `run_waterfall_phone=false` on every request.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { finalVerdict, type IcpCriteria, type CandidateFacts } from './icp-qualification'
import { isApolloPersonId } from './provider-boundary'

/** One candidate, as the qualification step needs to see it. */
export interface QualificationCandidate {
  id: string
  email: string | null
  email_status: string | null
  country: string | null
  apollo_id: string | null
  qualified_at: string | null
  disqualified_at: string | null
}

/**
 * Exactly the counts the founder asked for, so provider use is never hidden.
 *
 * ⚠️ `still_unjudged > 0` MEANS THE ATTEMPT IS NOT SETTLEABLE. It is not a warning to read
 * past: the reconciliation refuses while it is non-zero, deliberately.
 */
export interface QualifyOutcome {
  candidates_total: number
  already_judged: number
  judged_from_stored_facts: number
  provider_reveals_attempted: number
  provider_reveals_succeeded: number
  qualified: number
  disqualified: number
  still_unjudged: number
  /** True when a provider call itself failed. Nothing may be settled on this run. */
  provider_failed: boolean
  /** Truthful refusal breakdown, so a shortfall can be explained rather than presented. */
  reasons: Record<string, number>
}

const empty = (): QualifyOutcome => ({
  candidates_total: 0, already_judged: 0, judged_from_stored_facts: 0,
  provider_reveals_attempted: 0, provider_reveals_succeeded: 0,
  qualified: 0, disqualified: 0, still_unjudged: 0, provider_failed: false, reasons: {},
})

const known = (v: string | null | undefined): v is string =>
  typeof v === 'string' && v.trim() !== ''

/**
 * Can `finalVerdict` reach a truthful answer on what we already hold?
 *
 * 🛑 THIS IS THE FUNCTION THAT DECIDES WHETHER MONEY IS SPENT, so it asks the ICP rather than
 * guessing from one column. Every fact the verdict will consult must be present; a fact the
 * verdict will not consult is not worth a reveal.
 */
export function factsAreSufficient(c: QualificationCandidate, icp: IcpCriteria): boolean {
  if (!known(c.email)) return false
  if (icp.requireVerifiedBusinessEmail && !known(c.email_status)) return false
  if (icp.geographies.filter(known).length > 0 && !known(c.country)) return false
  return true
}

const factsOf = (c: QualificationCandidate): CandidateFacts =>
  ({ email: c.email, emailStatus: c.email_status, country: c.country })

/**
 * Judge every candidate that still needs a verdict, and persist the answer.
 *
 * ⚠️ IT NEVER THROWS ON A PROVIDER FAILURE. Verdicts already written stay written, the
 * unjudged remainder is REPORTED, and the caller must not settle. A partial pass that lost its
 * completed work would make a retry cost the provider credits a second time.
 */
export async function qualifyCandidates(
  clientId: string,
  leadIds: string[],
  icp: IcpCriteria,
): Promise<QualifyOutcome> {
  const out = empty()
  if (leadIds.length === 0) return out

  // ⚠️ TENANCY ON THE READ. The ids are resolved back to rows scoped to this client, so a
  // caller holding an id from elsewhere cannot have it judged into this programme.
  const rows: QualificationCandidate[] = []
  for (let i = 0; i < leadIds.length; i += 500) {
    const { data, error } = await db.from('leads')
      .select('id, email, email_status, country, apollo_id, qualified_at, disqualified_at')
      .in('id', leadIds.slice(i, i + 500))
      .eq('client_id', clientId)
    if (error) {
      // We could not even read the candidates — nothing is judged and nothing is claimed.
      out.provider_failed = true
      out.still_unjudged = leadIds.length
      return out
    }
    rows.push(...((data ?? []) as QualificationCandidate[]))
  }

  out.candidates_total = rows.length

  const needVerdict: QualificationCandidate[] = []
  for (const r of rows) {
    if (r.qualified_at || r.disqualified_at) { out.already_judged++; continue }
    needVerdict.push(r)
  }
  if (needVerdict.length === 0) return out

  // ── ① WHO CAN BE JUDGED WITHOUT SPENDING ────────────────────────────────────────────
  const fromStored = needVerdict.filter(r => factsAreSufficient(r, icp))
  const needReveal = needVerdict.filter(r => !factsAreSufficient(r, icp))

  // ── ② THE ONE PROVIDER DOOR, FOR THE ONES THAT GENUINELY NEED IT ────────────────────
  //
  // ⚠️ ONLY GENUINE APOLLO IDS. `apolloRevealableIds` refuses a `pdl_…` id at the boundary
  // (AR5); a candidate with no revealable id is judged on what we hold, which for a missing
  // fact is a refusal — we asked what we could and it is not proved.
  const revealable = needReveal.filter(r => isApolloPersonId(r.apollo_id))
  const revealed = new Map<string, { email: string; email_status: string | null; country: string | null; last_name: string | null }>()

  if (revealable.length > 0) {
    out.provider_reveals_attempted = revealable.length
    try {
      const { bulkMatchEmails } = await import('./apollo')
      const got = await bulkMatchEmails(revealable.map(r => r.apollo_id as string), 'programme_qualification')
      for (const [k, v] of got) revealed.set(k, v)
      out.provider_reveals_succeeded = revealed.size
    } catch (err) {
      // 🛑 A PROVIDER FAILURE IS NOT A SET OF REFUSALS. Judging these candidates now would
      // record "not proved" for people we never managed to ask about, and the disqualification
      // is permanent. They stay candidates; the caller is told; nothing settles.
      console.error('[programme-qualification] the provider reveal failed — no candidate was judged on an unanswered question:', err)
      out.provider_failed = true
      // The stored-fact half is still judged: it never depended on the provider.
      await judgeAll(fromStored, icp, out, revealed)
      // ⚠️ COUNTED AFTER, NOT BEFORE. `judgeAll` un-counts a verdict whose write failed, so a
      // remainder computed up front would UNDER-report — and `still_unjudged` is one of the two
      // facts the settle refuses on. It must never be smaller than the truth.
      out.still_unjudged = Math.max(0, needVerdict.length - out.qualified - out.disqualified)
      return out
    }
  }

  // ── ③ THE VERDICT, ON EVERY CANDIDATE THIS RUN COULD ANSWER FOR ─────────────────────
  await judgeAll(fromStored, icp, out, revealed)
  await judgeAll(needReveal, icp, out, revealed)

  out.still_unjudged = Math.max(0, needVerdict.length - out.qualified - out.disqualified)
  return out
}

/**
 * Persist the reveal (when there was one) and the verdict, one row at a time.
 *
 * 🛑 TWO WRITES, AND THE FIRST ONE IS THE MONEY. Until 9 Sep this built ONE patch carrying both
 * the revealed facts and the verdict, and issued a single UPDATE — while the comment above it
 * claimed they were separate. They were not, and the consequence was a real double-spend: if
 * that one write failed, the paid `email_status` died with the verdict, `factsAreSufficient`
 * answered false on the retry, and Apollo was charged for the same person a second time.
 *
 * So the reveal is now persisted in its own UPDATE, BEFORE the verdict is even computed. A fact
 * we paid for survives whatever happens next, and the retry judges it from storage for free.
 *
 * ⚠️ AND A FAILED REVEAL WRITE MEANS THE CANDIDATE STAYS UNJUDGED. Judging on facts we could
 * not store would produce a verdict whose evidence no longer exists — and the next pass would
 * buy that evidence again anyway. It is left as a candidate, counted in `still_unjudged`, so
 * nothing settles.
 */
async function judgeAll(
  candidates: QualificationCandidate[],
  icp: IcpCriteria,
  out: QualifyOutcome,
  revealed: Map<string, { email: string; email_status: string | null; country: string | null; last_name: string | null }>,
): Promise<void> {
  const now = new Date().toISOString()
  for (const c of candidates) {
    const person = c.apollo_id ? revealed.get(c.apollo_id) : undefined
    const facts: CandidateFacts = person
      ? { email: person.email, emailStatus: person.email_status, country: person.country ?? c.country }
      : factsOf(c)

    // ── ① THE PAID FACTS, IN THEIR OWN WRITE, BEFORE ANYTHING ELSE ──────────────────
    if (person) {
      const facts_patch: Record<string, unknown> = {
        email: person.email,
        email_status: person.email_status,
      }
      if (person.country) facts_patch.country = person.country
      // The SEARCH stage wrote Apollo's OBFUSCATED surname ("La***n"); this is the real one.
      if (person.last_name) facts_patch.last_name = person.last_name
      // ⚠️ SET ONLY WHEN THE STATUS WARRANTS IT — the existing meaning of the flag, and the
      // opposite of the drip path's unconditional `true`. Never written false here: this file
      // does not un-set a flag it did not set.
      if (person.email_status === 'verified' || person.email_status === 'likely_to_engage') {
        facts_patch.apollo_consented = true
      }
      const { error: factsErr } = await db.from('leads').update(facts_patch).eq('id', c.id)
      if (factsErr) {
        // 🛑 THE FACT WE PAID FOR COULD NOT BE STORED. Judging now would record a verdict whose
        // evidence is gone, and the next pass would buy it again regardless. Leave it a
        // candidate: `still_unjudged` will be non-zero and nothing can settle.
        console.error(`[programme-qualification] the PAID reveal for lead ${c.id} could not be stored (${factsErr.message}) — it is left unjudged so nothing settles on evidence that no longer exists.`)
        continue
      }
    }

    // ── ② THE VERDICT, IN ITS OWN WRITE ─────────────────────────────────────────────
    const patch: Record<string, unknown> = {}
    if (!person) {
      // No provider answer for this row — either it never needed one (its stored facts were
      // already sufficient) or we asked and Apollo returned nothing. Both are "judged on what
      // we hold", and for a fact that is still missing `finalVerdict` refuses.
      out.judged_from_stored_facts++
    }

    const verdict = finalVerdict(facts, icp)
    if (verdict.ok) {
      patch.qualified_at = now
      patch.disqualified_at = null
      patch.disqualify_reason = null
      out.qualified++
    } else {
      patch.disqualified_at = now
      patch.qualified_at = null
      patch.disqualify_reason = verdict.reason
      out.disqualified++
      out.reasons[verdict.reason] = (out.reasons[verdict.reason] ?? 0) + 1
    }

    const { error } = await db.from('leads').update(patch).eq('id', c.id)
    if (error) {
      // The write failed, so this candidate is still unjudged — undo the optimistic count.
      console.error(`[programme-qualification] verdict NOT persisted for lead ${c.id}: ${error.message}`)
      if (verdict.ok) out.qualified--
      else {
        out.disqualified--
        out.reasons[verdict.reason] = Math.max(0, (out.reasons[verdict.reason] ?? 1) - 1)
      }
    }
  }
}
