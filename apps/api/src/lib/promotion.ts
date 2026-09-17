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

/** The six targeting facts the core ICP is built from — the client's own words, nothing else. */
function icpFromDraft(d: BriefDraft): Record<string, unknown> {
  const f = (d.facts ?? {}) as Record<string, unknown>
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

  return {
    // ⚠️ THE NAME IS THE CLIENT'S CATEGORY, NOT A GENERATED LABEL. J5-C4's rule — the
    // client's words on the card — starts at the write, not at the render.
    name: str(f.target_category) || 'Core ICP',
    industries: str(f.target_category) ? [str(f.target_category)] : [],
    job_titles: arr(f.job_titles),
    seniority_levels: arr(f.seniority_levels),
    company_sizes: arr(f.company_sizes),
    geographies: arr(f.geographies),
    tech_stack: [],
    keywords: [],
    // ⚠️ FD-6: Apollo is the only provider, so the consent the schema asks for is given by
    // the promotion itself. There is no second provider for it to mean anything else about.
    apollo_only_consented: true,
    ...(str(f.exclusions) ? { exclusions: str(f.exclusions) } : {}),
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
    try {
      const { data, error } = await db.from('icps')
        .insert({ ...icpFromDraft(draft), client_id: clientId, is_active: true })
        .select('id').single()
      if (error || !(data as { id?: string } | null)?.id) {
        return { ok: false, clientId, reason: 'icp_unwritable', detail: error?.message ?? 'no id returned' }
      }
      icpId = (data as { id: string }).id
    } catch (e) {
      return { ok: false, clientId, reason: 'icp_unwritable', detail: e instanceof Error ? e.message : String(e) }
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
