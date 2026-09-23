// ══════════════════════════════════════════════════════════════════════════════════════════
// J4-C1 · PROMOTION, SERVER-OWNED — client + ICP + seal, then the Proof hand-off
//
// ── THE DEFECT THIS CLOSES ──────────────────────────────────────────────────────────────
//
// Promotion was FOUR browser calls in sequence from `milla/welcome/page.tsx`: confirm (seal),
// `/auth/onboard` (client), `POST /icps` (ICP), `POST /icps/:id/proof` (Proof). Every gap
// between them is a stranding — a closed tab, a slept phone, a network drop, a 500 on leg 3 —
// and the server had no idea a journey was meant to continue, so nothing finished it and
// nothing reported it. LR 6/21 and PV 07 require one server-owned act, because the four legs
// are ONE decision: *this client agreed to this brief*.
//
// ── THE ORDER IS THE CONTRACT, AND IT IS NOT MINE ───────────────────────────────────────
//
// ⛓️ S1-AUDIT-003 (12 Sep) already established it inside `/auth/onboard`, and this module
// inherits it rather than re-deciding it: **client → ICP → SEAL LAST.** The seal is what makes
// the draft unwritable (`writableBriefDraft` refuses a promoted row, correctly — the row is
// evidence). So sealing before the ICP exists is the stranding: every answer behind a door
// that will not open again, and no targeting to run Proof against. Sealing last means an
// interrupted promotion is RESUMABLE, and a replay completes it instead of finding a locked
// door.
//
// ── THE PROOF HAND-OFF: WHY THE CLAIM IS IN AND THE RUN IS OUT ──────────────────────────
//
// 🛑 TWO INSTRUCTIONS LOOKED CONTRADICTORY HERE AND ARE NOT. The J4-C1 manifest requires the
// "Proof hand-off" inside server-owned promotion, with the persisted truth naming a claim.
// S1-AUDIT-003 says, in terms: *"Proof start DELIBERATELY stays outside that boundary … a
// provider outage could block an account from ever being created. Promotion is client + ICP +
// seal. Proof is what happens next."* Both are satisfied, because they are about different
// things:
//
//   · the CLAIM is a durable authority row (`claimProofAuthority` → `claim_proof_authority`).
//     It touches no provider, so it cannot be blocked by one. It is in.
//   · the RUN is the provider search (`launchProofRun`). It is fire-and-forget and settles its
//     own claim from its own terminal result. It is out — awaited by nobody.
//
// So a provider outage still cannot stop an account being created, and the hand-off is still
// server-owned and recorded. (Reported in the evidence package as a reading, not a ruling.)
//
// 🛑 AND THE CLAIM GOES THROUGH THE LEDGER, NEVER THE SUPERSEDED RPC. The frozen
// `proof-authority-bypass.test.ts` asserts that NO live file calls `try_claim_proof_pass` and
// that the Proof path uses `claimProofAuthority()` / `settleProofClaim()`. That frozen test is
// the instruction for this module, not an obstacle to it: `proof_passes_done` is a MIRROR the
// ledger maintains, and writing it directly is how the restart drifted once already.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import type { BriefDraft } from './brief-draft'
// J5-C10: the row cannot be born unflagged (S1-PD-03). One derivation, one vocabulary.
import { deriveProviderReview, translateProviderList, PROVIDER_VOCABULARIES } from './icp-provider-translation'
import { apolloIndustriesOnly } from '@kind/shared'

export type PromotionFailure =
  /** A decisive read failed. Nothing was written; the draft is untouched and still writable. */
  | 'unreadable'
  /** The client row could not be created. Nothing downstream was attempted. */
  | 'client_unwritable'
  /** The core ICP could not be created. The client row stands; the draft stays writable. */
  | 'icp_unwritable'

export interface PromotionResult {
  ok: boolean
  clientId?: string
  icpId?: string
  /** The draft's seal. Present on success, including on a replay. */
  sealedAt?: string | null
  /** True when this call created nothing because promotion had already happened. */
  replayed?: boolean
  /** The authority claim, when one was granted by THIS call. */
  proofClaimId?: string | null
  /** Why the Proof hand-off did not claim — never a failure of promotion itself. */
  proofNote?: string
  reason?: PromotionFailure
  detail?: string
}

/**
 * The six targeting facts the core ICP is built from — the client's own words, nothing else.
 *
 * ── 🛑 ⚑ 18 Sep (J5-C10) — AND THE REVIEW THEY OWE, DERIVED HERE (S1-PD-03) ─────────────
 *
 * THE DEFECT THIS CLOSES WAS INTRODUCED BY J4-C1, IN THIS BUILD. The three provider columns
 * were written straight from the brief:
 *
 *     ~~company_sizes: arr(f.company_sizes)~~        // "about 10 to 50 staff"
 *     ~~seniority_levels: arr(f.seniority_levels)~~  // "whoever owns the P&L"
 *
 * Those are how a PERSON answers the question. `'11–50'` is the only thing Apollo takes. So a
 * promoted ICP was born active, untranslatable and UNFLAGGED: `icpNeedsReview` answered
 * `false`, the Proof gate opened, and `runIcpJob` sent the client's sentence to the provider
 * as a filter value — the exact thing the founder's rule forbids, through the mechanism built
 * to honour their words.
 *
 * 🛑 S1-PD-03's PROPERTY IS ABOUT THE ROW, NOT ABOUT ONE ROUTE: *"the row cannot be born
 * unflagged, so no failure mode can leave it that way."* `PUT /icps` honoured it; server-owned
 * promotion was built as a second door beside the fence rather than through it. The review is
 * therefore derived from the SAME values this function is about to return, in the same object,
 * so there is no instant in which the values exist without their review.
 *
 * ⚠️ AND THE CLIENT'S WORDS ARE NOT LOST. `deriveProviderReview` keeps every untranslatable
 * phrase inside `icp_review.requirements[].said` — which is what the operator translates FROM.
 * Dropping them would be the other way to be wrong: the column would be EMPTY, and empty
 * downstream means unconstrained.
 */
// ⚑ 22 Sep — EXPORTED SO THE BRIEF SCREEN CAN SHOW WHAT THIS WILL STORE, not a second
// derivation that agrees with it today. The founder's requirement is that a client watches
// their own targeting resolve while they are still there to correct it; the only honest way
// to render that is to call the function that does the storing. It is pure and it writes
// nothing, so a read path may call it freely.
export function icpFromDraft(d: BriefDraft): Record<string, unknown> {
  const f = (d.facts ?? {}) as Record<string, unknown>
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

  // 🛑 THE ONE SERVER-SIDE DERIVATION, over the values this write is ABOUT to persist.
  // `values` are canonical-only; `review` is what is still owed. Same bytes, same breath.
  //
  // ── ⚠️ AND `industries` IS DELIBERATELY NOT IN IT — WHICH IS A SECOND CORRECTION ───────
  //
  // `target_category` is BRIEF FACT #5: *what kind of company do you want to reach*, answered
  // in the client's own words ("marketing agencies", "independent dental practices"). The
  // `industries` column is Apollo's CLOSED 16-value vocabulary. They are not the same thing,
  // and mapping the first onto the second — ~~`industries: [str(f.target_category)]`~~ — was
  // wrong before this item and would have become newly visible through it:
  //
  //   · as a FILTER it is broken. "marketing agencies" is not an Apollo industry, so the
  //     search either errors or returns nothing, and the client's Proof comes back empty.
  //   · as a REVIEW REQUIREMENT it would flood the queue. Almost no client's own category is
  //     one of our sixteen, so every single signup would become an operator task — a Needs-you
  //     list with everybody on it is the "normal is silent" rule inverted.
  //
  // So the category is canonicalised WITHOUT owing a review (a client who says "SaaS" gets
  // `['SaaS']`; one who says "marketing agencies" gets `[]`), which is exactly the state
  // `translateProviderList` already calls legitimate: *"A client who never mentioned an
  // industry has an empty list and NOTHING unmapped."* Their words are not lost — they are the
  // ICP's `name`, and FD-2's semantic category gate is what enforces the category on the set.
  //
  // ⚠️ SENIORITY AND SIZE ARE DIFFERENT AND DO OWE A REVIEW. Milla asks those two with OUR
  // bands in the question, so an answer we cannot translate means the conversation produced
  // something unusable — a person has to look at it before anything runs.
  const category = translateProviderList(
    str(f.target_category) ? [str(f.target_category)] : [], PROVIDER_VOCABULARIES.industries, 6,
  )

  // ── 🛑 ⚑ 22 Sep — WHAT THE CLIENT PICKED THEMSELVES, AND WHY IT OUTRANKS WHAT WE HEARD ──
  //
  // 🛑 FOUNDER-LOCKED: the approved portal's workspace is *"you either talk to Milla or drop
  // them down"*. `facts.picked` is the second half of that — the values the client chose
  // directly from the field, as opposed to the ones we derived from their sentence.
  //
  // ⚠️ A PICK IS ALREADY CANONICAL, WHICH IS THE WHOLE REASON IT MAY WIN. Every option in a
  // dropdown comes from `PROVIDER_VOCABULARIES` (seniority, size) or is free text the provider
  // takes as typed (titles, locations). There is nothing to translate and therefore nothing
  // that can be mistranslated — which is exactly the failure mode the conversation has and a
  // pick does not.
  //
  // 🛑 SO A PICK ALSO *RESOLVES* THE REVIEW, and this is the part that matters most. Until
  // now, a client who said "a few dozen people" produced an untranslatable size, owed an
  // operator review, and their Proof was blocked behind a human — the silent stranding. If
  // that same client opens the Employees field and picks "11–50", they have just answered the
  // question the operator was going to be asked. Feeding the pick into `deriveProviderReview`
  // rather than around it means the review is never raised in the first place. The client
  // resolved it themselves, which is better for them and cheaper for us.
  //
  // ⚠️ AND IT NEVER ERASES WHAT THEY SAID. Their sentence stays in `facts` untouched and the
  // panel keeps showing it above the chips — the client sees "around twenty to fifty" AND the
  // bands they chose, so a pick made by accident is visible rather than silent.
  const picks = (f.picked ?? {}) as Record<string, unknown>
  const pick = (k: string): string[] | null => {
    const v = arr(picks[k])
    return v.length > 0 ? v : null
  }

  const decided = deriveProviderReview(
    {
      industries:       category.canonical,
      seniority_levels: pick('seniority_levels') ?? arr(f.seniority_levels),
      company_sizes:    pick('company_sizes') ?? arr(f.company_sizes),
    },
    PROVIDER_VOCABULARIES,
  )

  // ── ⚑ 23 Sep (R142 · A2a) — A PICKED INDUSTRY IS APOLLO'S OWN VALUE, AND IT WINS ──────────
  //
  // Founder: *"this is why we use apollo drop downs and make sure we do not assume."* The client
  // chooses their industries from Apollo's list in the Brief; those are stored as they are.
  // Anything not on the list is DROPPED, never translated — a word we do not recognise is
  // Milla's question to ask, not ours to guess. With no pick, the old derivation stands, so an
  // ICP built before this change is unchanged.
  const pickedIndustries = apolloIndustriesOnly(pick('industries') ?? [])

  return {
    // ⚠️ THE NAME IS THE CLIENT'S CATEGORY, NOT A GENERATED LABEL. J5-C4's rule — the
    // client's words on the card — starts at the write, not at the render. It is the NAME,
    // which is copy, never a provider filter — so it keeps their exact phrasing while the
    // three provider columns below carry canonical values only.
    name: str(f.target_category) || 'Core ICP',
    industries: pickedIndustries.length > 0 ? pickedIndustries : decided.values.industries,
    // ⚠️ `job_titles` IS NOT A CLOSED VOCABULARY and is deliberately absent from the
    // derivation. Apollo takes free-text titles; "Managing Director" needs no translation and
    // there is nothing for a review to be owed about.
    // ⚑ 22 Sep — a picked title list wins. Apollo takes titles as typed, so the field is an
    // add/remove chip box rather than a closed list, and a pick here is simply a tidier
    // version of the same free text.
    job_titles: pick('job_titles') ?? arr(f.job_titles),
    seniority_levels: decided.values.seniority_levels,
    company_sizes: decided.values.company_sizes,
    // ── ⚑ 18 Sep (J5-C4 · LR 10,12) — AND HOW BIG THEY SAID, IN THEIR OWN WORDS ─────────
    //
    // 🛑 `company_sizes` ABOVE IS CANONICAL-ONLY, and the six bands are ours. A client who
    // says "fifty to a hundred people" is snapped to `['11–50','51–200']`, and the band rule
    // then admits an 11-person company and a 190-person one as matches on a criterion they
    // stated precisely. Their phrase survived only inside `icp_review.requirements[].said` —
    // an operator artifact that is CLEARED when the review is resolved, so the moment a human
    // translated it the client's actual answer stopped existing anywhere.
    //
    // This is `target_category` : `industries` applied to size, and for the same reason: the
    // client's words are authoritative, the closed list is the provider hint.
    //
    // ⚠️ THE RAW FACT, JOINED, NEVER THE CANONICAL HALF. `f.company_sizes` is the brief's FREE
    // TEXT (`boundedList(6, 40)`, no enum) — what they actually said. Writing
    // `decided.values.company_sizes` here would store our translation twice and the client's
    // answer zero times.
    //
    // ⚑ 23 Sep — AND A PICK REPLACES THE PHRASE. When the client chose their size from the
    // dropdown, THAT is their answer (22 Sep: "a pick is already canonical, which is the whole
    // reason it may win") and it is what we search with. Writing their earlier phrase here as
    // well left the check judging a different size from the one searched — Blackburne, 23 Sep:
    // 20 found, 20 set aside on size. With no phrase stored, size is judged on the picked bands,
    // which is exactly what the search used. Their words are still in the brief draft.
    ...(!pick('company_sizes') && arr(f.company_sizes).length > 0
      ? { target_size: str(arr(f.company_sizes).join(', ')) }
      : {}),
    // ⚑ 22 Sep — same for location: `person_locations` is free-text place names at Apollo.
    geographies: pick('geographies') ?? arr(f.geographies),
    tech_stack: [],
    keywords: [],
    // ⚠️ FD-6: Apollo is the only provider, so the consent the schema asks for is given by
    // the promotion itself. There is no second provider for it to mean anything else about.
    apollo_only_consented: true,
    ...(str(f.exclusions) ? { exclusions: str(f.exclusions) } : {}),
    // ⚠️ SET-ONLY, LIKE `PUT /icps`. A brief that translates cleanly writes NEITHER column
    // rather than writing `null` — clearing a review belongs to the operator resolve route
    // alone, which re-canonicalises every value first.
    ...(decided.review ? { icp_review: decided.review, icp_review_at: new Date().toISOString() } : {}),
  }
}

/** The account facts the clients row needs, taken from the confirmed brief. */
async function clientPayloadFromDraft(d: BriefDraft, authEmail: string | null): Promise<Record<string, unknown>> {
  const f = (d.facts ?? {}) as Record<string, unknown>
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
  const { resolveOwnedWebsite } = await import('./brief-promotion')
  // ⚠️ SECOND ARGUMENT IS `undefined`, NOT A BLANK. There is no request body on this path —
  // the server is promoting from the brief — so "the body said nothing" is the truthful input.
  // Passing '' would look like a caller who sent an empty website and claimed that as an answer.
  const owned = resolveOwnedWebsite(
    { website: str(f.website) || null, website_none: f.website_none === true },
    undefined,
  )
  return {
    company_name: str(f.company_name),
    country: str(f.country),
    ...(owned.source === 'body' ? {} : { website: owned.website }),
    ...(str(f.phone) ? { phone: str(f.phone) } : {}),
    plan: 'figsy',
    // ⚠️ EVERY MVP1 CLIENT IS A PROGRAMME CLIENT (R124 retired the per-lead model). The
    // legacy per-lead value is never written by this path.
    commercial_model: 'programme',
    ...(authEmail ? { contact_email: authEmail } : {}),
  }
}

/**
 * Promote a CONFIRMED brief. Idempotent, recorded, and safe to replay.
 *
 * ⚠️ IT DOES NOT VALIDATE. The caller (`POST /milla/brief-draft/confirm`) owns the eleven-fact
 * gate and the geography refusal, and must run both BEFORE calling this — because a refusal
 * has to leave the draft writable and nothing created, which is only true if we never start.
 *
 * ⚠️ EVERY LEG IS "ENSURE", NOT "CREATE". A double click, a retry after an ambiguous response
 * and a resumed promotion all arrive here, and all three must converge on the same one client,
 * the same one ICP and the same one claim.
 */
export async function promoteConfirmedBrief(
  userId: string,
  draft: BriefDraft,
  opts: { authEmail?: string | null } = {},
): Promise<PromotionResult> {
  // ── 1 · THE CLIENT. Read first: a replay must find the winner's row, not make a second. ──
  let clientId: string | null = null
  let existingEmail: string | null = null
  try {
    const { data, error } = await db.from('clients')
      .select('id, contact_email').eq('user_id', userId).maybeSingle()
    if (error) return { ok: false, reason: 'unreadable', detail: error.message ?? String(error) }
    clientId = (data as { id?: string } | null)?.id ?? null
    existingEmail = (data as { contact_email?: string | null } | null)?.contact_email ?? null
  } catch (e) {
    // 🛑 F-DBREAD. An unreadable clients table is NOT "no client" — answering that would
    // create a second account for somebody who already has one. Refuse, write nothing.
    return { ok: false, reason: 'unreadable', detail: e instanceof Error ? e.message : String(e) }
  }

  if (!clientId) {
    const payload = await clientPayloadFromDraft(draft, opts.authEmail ?? null)
    try {
      const { data, error } = await db.from('clients')
        .insert({ user_id: userId, ...payload })
        .select('id').single()
      if (error || !(data as { id?: string } | null)?.id) {
        return { ok: false, reason: 'client_unwritable', detail: error?.message ?? 'no id returned' }
      }
      clientId = (data as { id: string }).id
    } catch (e) {
      return { ok: false, reason: 'client_unwritable', detail: e instanceof Error ? e.message : String(e) }
    }
  } else if (opts.authEmail && !existingEmail) {
    // Fill when empty, never overwrite — the same rule `/auth/onboard` applies, for the same
    // reason: an operator who corrected a billing address must not have it silently undone.
    try { await db.from('clients').update({ contact_email: opts.authEmail }).eq('id', clientId) }
    catch { /* best-effort, exactly as the onboard path treats it */ }
  }

  // ── 2 · THE CORE ICP. Also ensure: a replay must not add a second targeting record. ──
  let icpId: string | null = null
  try {
    const { data, error } = await db.from('icps')
      .select('id').eq('client_id', clientId).order('created_at').limit(1).maybeSingle()
    if (error) return { ok: false, clientId, reason: 'unreadable', detail: error.message ?? String(error) }
    icpId = (data as { id?: string } | null)?.id ?? null
  } catch (e) {
    return { ok: false, clientId, reason: 'unreadable', detail: e instanceof Error ? e.message : String(e) }
  }

  if (!icpId) {
    const icpBody = icpFromDraft(draft)
    try {
      const { data, error } = await db.from('icps')
        .insert({ ...icpBody, client_id: clientId, is_active: true })
        .select('id').single()
      if (error || !(data as { id?: string } | null)?.id) {
        return { ok: false, clientId, reason: 'icp_unwritable', detail: error?.message ?? 'no id returned' }
      }
      icpId = (data as { id: string }).id
    } catch (e) {
      return { ok: false, clientId, reason: 'icp_unwritable', detail: e instanceof Error ? e.message : String(e) }
    }

    // ── 🛑 ⚑ 18 Sep (J5-C10) — A BORN-FLAGGED ICP TELLS SOMEBODY, NOW ───────────────────
    //
    // The review is already on the row (`icpFromDraft` derived it), so the client is already
    // correctly blocked. What was missing is that a person has to translate it, and the sweep
    // in `icp-review-tasks.ts` runs every five minutes — five minutes in which a client who
    // has just confirmed their brief is waiting and Vida's queue says nothing needs anybody.
    //
    // ⚠️ SAME RAISE, SAME DEDUPE KEY AS THE SWEEP. Not a second mechanism: whichever gets
    // there first creates the row and the partial unique index refuses the other.
    //
    // ⚠️ AND IT NEVER FAILS PROMOTION. The account exists, the ICP exists and is flagged; a
    // queue that could not be written to is the sweep's problem on its next tick, not a
    // reason to tell this client their signup did not work.
    if (icpBody.icp_review) {
      try {
        const { raiseIcpReviewTask } = await import('./icp-review-tasks')
        const raised = await raiseIcpReviewTask({
          icpId, clientId,
          // Straight from the confirmed brief — fact #2. The client row was written from the
          // same value a moment ago, so reading it back would be a query for what we hold.
          companyName: typeof draft.facts?.company_name === 'string' ? draft.facts.company_name.trim() : null,
          review: icpBody.icp_review,
        })
        if (!raised.ok) {
          console.error(`[promotion] the ICP review task for ${icpId} was not raised: ${raised.error ?? 'unknown'}`)
        }
      } catch (e) {
        console.error(`[promotion] raising the ICP review task for ${icpId} threw:`, e)
      }
    }
  }

  // ── 3 · THE SEAL, LAST (S1-AUDIT-003). Both halves exist, so the door may close. ──
  // ⚠️ `markBriefDraftPromoted` WRITES `promoted_client_id` + `promoted_at`, NOT `confirmed_at`
  // — and the distinction is load-bearing. `confirmed_at` is the CLIENT's act, stamped by
  // `confirmBriefDraft` before we are ever called. `promoted_client_id` is OUR record of which
  // client this brief became, and it is what `writableBriefDraft` refuses on. Its own
  // `.is('promoted_client_id', null)` filter makes a replay a no-op, so the recorded moment of
  // promotion never moves to whenever somebody last pressed the button. This row is evidence.
  const sealedAt: string | null = draft.confirmedAt ?? null
  const alreadySealed = Boolean(draft.promotedClientId)
  if (!alreadySealed) {
    const { markBriefDraftPromoted } = await import('./brief-draft')
    try {
      await markBriefDraftPromoted(userId, clientId)
    } catch (e) {
      // ⚠️ THE SEAL FAILING IS NOT A FAILED PROMOTION. Client and ICP exist and are correct,
      // and this module is ensure-shaped, so a replay completes the record. Never silent.
      console.warn(`[promotion] the promotion record did not persist for ${userId}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // ── 4 · THE PROOF HAND-OFF — the claim here, the run afterwards. ──
  //
  // ⚠️ A REFUSED OR UNREADABLE CLAIM DOES NOT FAIL PROMOTION. The account exists and the
  // client is real; Proof is what happens next, and `already_started` is the correct answer
  // to a replay. The reason travels back so the caller's surface can be honest about it.
  let proofClaimId: string | null = null
  let proofNote: string | undefined
  try {
    const { claimProofAuthority } = await import('./proof-claim')
    const claim = await claimProofAuthority(clientId, icpId)
    if (claim.ok) {
      proofClaimId = claim.claimId
      const { launchProofRun } = await import('./proof-run-launch')
      // Fire-and-forget by design: the caller has already answered its own surface and must
      // not wait for a provider. The run settles this claim from its own terminal result, and
      // `pass`/`kind` come from the ledger's own answer — never chosen here.
      launchProofRun({
        icpId, clientId, userId,
        claimed: claim.pass,
        batchKind: claim.kind,
        claimId: claim.claimId,
      })
    } else {
      proofNote = claim.reason
    }
  } catch (e) {
    proofNote = e instanceof Error ? e.message : String(e)
  }

  return {
    ok: true, clientId, icpId, sealedAt,
    replayed: alreadySealed,
    proofClaimId, ...(proofNote ? { proofNote } : {}),
  }
}
