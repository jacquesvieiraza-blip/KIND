// ═══════════════════════════════════════════════════════════════════════════════════════
// WHAT IS THIS CLIENT'S **CURRENT** WORK?
//
// ── THE DEFECT THIS MODULE EXISTS TO END ────────────────────────────────────────────────
//
// Every current-work read in Milla — the prospect cards, the replies rail, the campaign
// sentence, the meeting counts — scoped itself the same way:
//
//     const programmeId = (await openProgrammeForClient(clientId))?.id ?? null
//     if (!programmeId) return everythingScopedToTheClient()
//
// 🛑 THAT IS THE C2 DEFECT AGAIN, IN THE READ MODEL. "No programme row" was read as "this
// client has no current-work boundary, so show them everything they have ever had". For a
// DECLARED programme client between programmes it is wrong in the most visible possible way:
// House was set to `commercial_model = 'programme'`, has no open programme, and its Milla
// still rendered three prospect cards from the retired legacy desk under "Earlier activity",
// a reply from 2026 in Recent Replies, and historical campaign and meeting numbers — all of
// it presented as the current workspace of an account whose current workspace is empty.
//
// ── THE DISTINCTION THAT MATTERS, AND WHY IT IS NOT A DATE OR A NAME ────────────────────
//
// The trap is that "programme client with no programme" describes TWO completely different
// accounts, and blanking both would break the launch acquisition motion:
//
//   A. A GENUINE NEW CUSTOMER RUNNING FREE PROOF. Signup writes
//      `commercial_model = 'programme'`, so every new M&V customer is a programme client from
//      their first minute — and they have no programme until one is created. Their proof cards
//      are their CURRENT work and must render exactly as they do today.
//
//   B. HOUSE. Also a declared programme client with no programme, but its leads, replies,
//      campaign and meetings are the retired per-lead desk. That is HISTORY.
//
// ⚠️ NOTHING ON THE LEAD SEPARATES THEM. A free-proof lead is stamped `delivered_at` and
// `surfaced_for_approval_at`, exactly like a legacy delivered lead — traced through
// `runIcpJob`'s proof branch, which writes no proof-specific column. So the discriminator
// cannot live on the row.
//
// 🛑 SO IT IS THE PROOF SESSION ITSELF, WHICH IS A POSITIVE STORED FACT. `try_claim_proof_pass`
// increments `clients.proof_passes_done` and stamps `clients.proof_started_at` in the SAME
// statement that authorises the pass. A client with a current proof session has one because the
// product recorded that it started one. That is current-work attribution, not an inference:
//
//   · no session recorded  → there is no current proof work, so the workspace is empty
//   · a session recorded   → their desk IS their current work
//
// ⚠️ AND THERE IS NO DATE COMPARISON ANYWHERE IN THIS MODULE. A first cut bounded the proof case
// by `proof_started_at`; that column is rewritten on every claim, so a client on pass 2 would
// have had pass 1's batch filtered away — and "two labelled proof sets, nothing deleted or
// filtered away" is founder-locked. No bound is needed anyway: free proof is offered only to a
// never-funded account, so a client with a proof session has proof work and nothing else.
//
// ⚠️ NO NAME. NO ENV VAR. NO HOUSE SPECIAL CASE. NO DELETION, NO BACKFILL. Nothing here writes
// anything. Every historical row stays exactly where it is and remains readable by every
// operator surface in Vida; what changes is only which rows a customer's CURRENT workspace
// claims as current.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'

/**
 * The boundary of a client's current work.
 *
 * ⚠️ FIVE ANSWERS, NOT A NULLABLE PROGRAMME ID, for the same reason `CommercialModel` has five
 * states: `none` and `legacy` are different facts and a nullable id cannot tell them apart. That
 * conflation is precisely what put House's history on its own desk.
 */
export type WorkspaceScope =
  /** An open programme. Current work is what is positively attributed to it. */
  | { kind: 'programme'; programmeId: string }
  /**
   * A declared programme client with a recorded FREE PROOF session. Their desk is current work.
   *
   * ⚠️ IT CARRIES NO TIME BOUND, AND THAT IS A CORRECTION. The first cut bounded this to
   * `proof_started_at` — which `try_claim_proof_pass` rewrites on EVERY claim, so it describes
   * the LATEST pass. A client on pass 2 would have had pass 1's batch filtered away server-side,
   * and "two labelled proof sets, nothing deleted or filtered away" is founder-locked. The
   * existing free-proof guard caught it.
   *
   * ⚠️ AND NO BOUND IS NEEDED, because free proof is only offered to a never-funded account —
   * `runIcpJob` refuses a proof batch for a live one ("proof batches are only for new
   * prospects"). A client with a proof session has proof work and nothing else, so their desk
   * IS their current work. The session's existence is the whole answer.
   */
  | { kind: 'proof' }
  /** Legacy or unclassified. Client-scoped, exactly as it has always been. */
  | { kind: 'legacy' }
  /**
   * A declared programme client with no programme and no proof session. There IS no current
   * work — and that is a real, correct answer, not a gap to be filled with history.
   */
  | { kind: 'none' }
  /** The model or the programme state could not be read. The caller decides how to degrade. */
  | { kind: 'unreadable'; reason: string }

/**
 * Resolve the current-work boundary for one client.
 *
 * ⚠️ IT ASKS THE COMMERCIAL MODEL, NOT THE PROGRAMME TABLE. `clientCommercialModel` already
 * does the open-programme read and returns it, so this is one resolution rather than two that
 * could disagree — and it inherits every fail-closed rule that module carries, including the
 * declared-legacy-with-an-open-programme conflict.
 */
export async function currentWorkspaceScope(clientId: string): Promise<WorkspaceScope> {
  if (!clientId) return { kind: 'unreadable', reason: 'no client id' }

  const { clientCommercialModel, isLegacyModel } = await import('./commercial-model')
  const model = await clientCommercialModel(clientId)

  if (model.model === 'unreadable') return { kind: 'unreadable', reason: model.reason }

  // An open programme is the strongest attribution there is, and it applies whether the model
  // is declared or merely compatible — a client with a programme open is governed by it today.
  if (model.openProgramme) return { kind: 'programme', programmeId: model.openProgramme.id }

  // Legacy and unclassified keep the client-scoped view they have always had. This is the whole
  // live book, and nothing about their Milla changes.
  if (isLegacyModel(model)) return { kind: 'legacy' }

  // ── DECLARED PROGRAMME, NO PROGRAMME OPEN. The one case this module exists for. ──────────
  //
  // 🛑 A GENUINE NEW CUSTOMER IS HERE TOO, and blanking them would break free proof. So the
  // question is whether the product has RECORDED a current proof session for this client.
  try {
    const { data, error } = await db.from('clients')
      .select('proof_passes_done').eq('id', clientId).maybeSingle()
    if (error) return { kind: 'unreadable', reason: `proof session read failed: ${error.message}` }
    if (!data) return { kind: 'unreadable', reason: 'no such client' }

    // ⚠️ A COUNT, NOT A CLOCK. `try_claim_proof_pass` increments this in the same statement that
    // authorises the pass, so a non-zero value is the product's own record that this account has
    // a free-proof session. There is no date comparison anywhere in this module — see the
    // `proof` variant above for why bounding by `proof_started_at` was wrong and was removed.
    const passes = Number((data as { proof_passes_done?: number | null }).proof_passes_done ?? 0)
    if (passes > 0) return { kind: 'proof' }

    // No programme, no proof session: the workspace is genuinely empty. This is House.
    return { kind: 'none' }
  } catch (err) {
    return { kind: 'unreadable', reason: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Does this scope have any current work at all?
 *
 * `none` is the only scope that answers no — and it answers no POSITIVELY, which is the
 * difference between "we found nothing" and "there is nothing to find".
 */
export function hasCurrentWork(s: WorkspaceScope): boolean {
  return s.kind !== 'none'
}
