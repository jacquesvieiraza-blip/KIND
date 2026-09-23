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
// still rendered three prospect cards from the retired legacy desk, a reply from 2026 in
// Recent Replies, and historical campaign and meeting numbers — all of it presented as the
// current workspace of an account whose current workspace is empty.
//
// ── THE FIRST FIX WAS THE SAME MISTAKE WEARING A DIFFERENT COLUMN ───────────────────────
//
// ⛓️ WITHDRAWN 3 Sep, on the founder's challenge. This module read
// `clients.proof_passes_done > 0` and, on a non-zero count, handed back the UNBOUNDED
// client-scoped desk. That is CUMULATIVE CLIENT STATE standing in for row-level attribution:
// it answers "has this account ever claimed a proof pass", never "does THIS ROW belong to
// that pass". The two questions come apart the moment one account has both histories —
//
//     a declared programme client with old NULL-programme legacy leads legitimately runs a
//     modern Free Proof → proof_passes_done becomes 1 → the desk unbounds → every historical
//     legacy card is current again
//
// — which is the ORIGINAL DEFECT, re-armed. "No programme ⇒ show everything" had simply
// become "ever proofed ⇒ show everything". The supporting argument (free proof is offered
// only to a never-funded account, so a proof client has nothing else) constrains WHEN A PASS
// MAY BE CLAIMED; it says nothing about what rows the account already holds.
//
// ── SO THE ANSWER IS ON THE ROW, AND IT IS WRITTEN, NOT INFERRED ────────────────────────
//
// `leads.proof_pass` is stamped by `runIcpJob` on exactly the ids one proof run inserted,
// carrying the pass `try_claim_proof_pass` atomically granted before that run. Every other
// store was traced write → storage → read first and none can answer per row: `leads.source`
// is the PROVIDER name and identical for a proof run and a paid one; `programme_id` is NULL
// for proof AND for legacy; `icp_run_outcomes` holds no lead ids and no proof flag;
// `sourcing_ledger` and `proof_ledger` are money rows with no lead ids (and a pool-only proof
// pass writes no `proof_ledger` row at all); `acquisition_memory` is keyed on the provider
// identity; and `icps.proof_widened_candidate` — the only existing proof-batch-to-leads link
// — exists only for a pass-2 widened fallback. Full list in the migration header.
//
// ⚠️ WHICH IS WHY `proof` AND `none` ARE NOW ONE SCOPE. They were two answers to a question
// this module can no longer be asked: with attribution on the row, "does this client have
// current proof work" is decided by the FILTER, not by a client-level counter. House and a
// brand-new customer take the identical scope; House has no attributed rows so its desk is
// empty, and the customer has theirs so they render. Nothing about the client is consulted.
//
// ⚠️ NO NAME. NO ENV VAR. NO HOUSE SPECIAL CASE. NO CALENDAR CUTOFF. NO DELETION, NO
// BACKFILL. Nothing here writes anything. Every historical row stays exactly where it is and
// remains readable by every operator surface in Vida; what changes is only which rows a
// customer's CURRENT workspace claims as current.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * The boundary of a client's current work.
 *
 * ⚠️ FOUR ANSWERS, NOT A NULLABLE PROGRAMME ID, for the same reason `CommercialModel` has
 * five states: `proof` and `legacy` are different facts and a nullable id cannot tell them
 * apart. That conflation is precisely what put House's history on its own desk.
 */
export type WorkspaceScope =
  /** An open programme. Current work is what is positively attributed to it. */
  | { kind: 'programme'; programmeId: string }
  /**
   * A DECLARED PROGRAMME CLIENT WITH NO OPEN PROGRAMME. Current work is exactly the leads
   * positively attributed to a free-proof pass — and nothing else on the account.
   *
   * ⚠️ THIS IS ALSO THE EMPTY ANSWER, AND DELIBERATELY SO. A client with no attributed proof
   * rows has an EMPTY current workspace, which is a real and correct answer rather than a gap
   * to be filled with history. House lands here. So does a customer whose proof run has been
   * claimed but has not produced leads yet. So does a customer mid-proof — the difference is
   * decided by their ROWS, never by a counter on their client record.
   *
   * ⚠️ IT CARRIES NO TIME BOUND, AND THAT IS A CORRECTION. A first cut bounded proof by
   * `clients.proof_started_at` — which `try_claim_proof_pass` rewrites on EVERY claim, so it
   * describes the LATEST pass. A client on pass 2 would have had pass 1's batch filtered away
   * server-side, and "two labelled proof sets, nothing deleted or filtered away" is
   * founder-locked. `proof_pass` needs no bound: pass 2 stamps its own rows and can never
   * restamp pass 1, so both sets stay attributed and both stay visible.
   *
   * 🛑 FREE PROOF IS CALIBRATION, NOT OUTREACH. This scope permits ATTRIBUTED PROOF CARDS and
   * nothing else: no campaign, no replies, no meetings, no outreach progress. Proof sends
   * nobody an email, so any of those appearing could only ever be history wearing a current
   * label — which is the exact bleed this module exists to stop.
   */
  | { kind: 'proof' }
  /** Legacy or unclassified. Client-scoped, exactly as it has always been. */
  | { kind: 'legacy' }
  /** The model or the programme state could not be read. The caller decides how to degrade. */
  | { kind: 'unreadable'; reason: string }

/**
 * Resolve the current-work boundary for one client.
 *
 * ⚠️ IT ASKS THE COMMERCIAL MODEL, NOT THE PROGRAMME TABLE. `clientCommercialModel` already
 * does the open-programme read and returns it, so this is one resolution rather than two that
 * could disagree — and it inherits every fail-closed rule that module carries, including the
 * declared-legacy-with-an-open-programme conflict.
 *
 * ⚠️ AND IT READS NOTHING ELSE. The withdrawn version took a second trip to `clients` for
 * `proof_passes_done`; with attribution on the lead row there is nothing left to ask. One
 * read, no counter, no clock, no client-level state deciding what a row means.
 */
export async function currentWorkspaceScope(clientId: string): Promise<WorkspaceScope> {
  if (!clientId) return { kind: 'unreadable', reason: 'no client id' }

  const { clientCommercialModel, isLegacyModel } = await import('./commercial-model')
  const model = await clientCommercialModel(clientId)

  if (model.model === 'unreadable') return { kind: 'unreadable', reason: model.reason }

  // An open programme is the strongest attribution there is, and it applies whether the model
  // is declared or merely compatible — a client with a programme open is governed by it today.
  if (model.openProgramme) return { kind: 'programme', programmeId: model.openProgramme.id }

  // ⛓️ ~~Legacy and unclassified keep the client-scoped view they have always had. This is the
  // whole live book, and nothing about their Milla changes.~~ SUPERSEDED 23 Sep by R137 —
  // founder: *"the 299/4 is retired/ this must go."* `isLegacyModel` answers false for everyone,
  // so a NULL or stored-'legacy' client with no open programme falls through to `proof` below,
  // exactly like a declared programme client: their history stays in the tables (and in Vida)
  // and is not presented as current work. The branch is kept until the retired code's own
  // removal PR, so the `legacy` scope stays explicit rather than silently vanishing.
  if (isLegacyModel(model)) return { kind: 'legacy' }

  // ── DECLARED PROGRAMME, NO PROGRAMME OPEN. The one case this module exists for. ──────────
  //
  // 🛑 AND THERE IS NOTHING FURTHER TO ASK. The caller filters on `proof_pass IS NOT NULL`,
  // so a client with attributed proof work sees exactly that work and a client without sees
  // an empty workspace. Deciding it here from a client-level counter is what was wrong.
  return { kind: 'proof' }
}

/**
 * May this scope show CURRENT OUTREACH — a campaign, a reply, a booked meeting?
 *
 * 🛑 ONLY A PROGRAMME AND LEGACY MAY. `proof` may not, because free proof sends nobody an
 * email: any campaign, reply or meeting readable for a proof-scoped client is by construction
 * something an earlier motion produced, and presenting it as current activity is the bleed
 * this module exists to stop. `unreadable` is not answered here — each caller degrades it its
 * own way (the replies rail fails soft, the campaign sentence fails closed), and flattening
 * that distinction into one boolean would silently change one of them.
 */
export function showsCurrentOutreach(s: WorkspaceScope): boolean {
  return s.kind === 'programme' || s.kind === 'legacy'
}
