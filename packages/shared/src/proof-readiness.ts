// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 23 Sep — A CLIENT MOVES TO PROOF ONLY WHEN THEIR PEOPLE ARE READY TO SHOW
//
// Founder, verbatim: *"i said as my rule. we do not present the next step until we can verify
// we have the information we need. the onboarding portal should not allow us to move to this
// screen ever."* — and, asked how many must be ready: *"20, or all of them if smaller."*
//
// 🛑 WHAT WAS LIVE. Confirming the Brief started the Proof run in the background AND moved the
// client onto the Proof desk in the same moment — before anybody knew whether the run would
// produce a single person. Blackburne Enterprises, 23 Sep: 20 found, 20 set aside, and the
// client sat on a Proof screen reading "We hit a snag confirming your matches".
//
// This is the ONE rule both screens read: the Brief page holds the client here until it says
// `ready`, and the Proof desk sends a first-Proof client back to the Brief while it says
// anything else. Pure, so it is RUN in tests rather than pattern-matched in JSX.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** How many people make a Proof set worth moving to — or everybody, if their market is smaller. */
export const PROOF_READY_TARGET = 20

export type ProofReadiness =
  /** No Proof has been claimed — they are still talking to Milla. */
  | 'not_started'
  /** The run is working. The client waits in the Brief, told it is being put together. */
  | 'preparing'
  /** 20 people are on the desk — or every person their smaller market holds. Move them on. */
  | 'ready'
  /** The search found nobody for this targeting. Only the client can change that: ask them. */
  | 'needs_client'
  /** It ended short for a reason that is OURS (a failure, a review, exclusions removed some). */
  | 'needs_us'

export interface ProofReadinessFacts {
  /** A Proof run has been claimed for this client (`proof_started_at` or a pass recorded). */
  claimed: boolean
  /** Proof people on the desk right now. `null` = unreadable — never treated as zero. */
  onDesk: number | null
  /** The recorded outcome of the latest run (`icp_run_outcomes.status`), or null if none. */
  runStatus: string | null
  /** How many people that run brought in (`total_inserted`), or null. */
  runInserted: number | null
  /** The recorded work state (`automatic_work.state`), or null. */
  workState: string | null
  /** The targeting is waiting on an operator's translation. */
  needsReview: boolean
}

/** Outcomes that mean the SEARCH itself found nobody — the client's targeting, not our failure. */
const FOUND_NOBODY = new Set(['no_match', 'audience_exhausted'])

export function proofReadiness(f: ProofReadinessFacts): ProofReadiness {
  if (!f.claimed) return 'not_started'
  // An unreadable desk is not an empty one — keep them where they are, assert nothing.
  if (f.onDesk === null) return 'preparing'
  if (f.onDesk >= PROOF_READY_TARGET) return 'ready'

  const ended = f.runStatus !== null
    || f.workState === 'completed' || f.workState === 'failed' || f.workState === 'stuck'
  if (!ended) return f.needsReview ? 'needs_us' : 'preparing'

  // "…or all of them if smaller": the run brought in fewer than 20 because that is all the
  // market held, and what reached the desk is theirs to see.
  if (f.onDesk > 0 && f.runInserted !== null && f.runInserted < PROOF_READY_TARGET) return 'ready'

  if (f.onDesk === 0 && f.runStatus !== null && FOUND_NOBODY.has(f.runStatus)) return 'needs_client'
  return 'needs_us'
}

/** What the client reads while they wait, and when it is ours to finish. Never "a snag". */
export const PROOF_PREPARING_COPY =
  'Milla is putting your first examples together — real people who match what you told her. It can take a few minutes; you can stay here.'
export const PROOF_NEEDS_US_COPY =
  'Your brief is saved and K.I.N.D is finishing your first examples. You do not need to do anything or start again — they will appear here as soon as they are ready.'
export const PROOF_NEEDS_CLIENT_COPY =
  // ⚠️ IT PROMISES ONLY WHAT HAPPENS: a widened field does not re-run Proof by itself — Vida
  // flags the client and K.I.N.D runs it again (a retry costs the client nothing).
  'I could not find anyone who matches all of this yet. Tell me which of these can be wider — the location, the company size or the job titles — and K.I.N.D will run it again for you. Nothing has been charged.'

/** The `/leads/milla-summary` fields this rule reads — nothing else from the summary. */
export interface ProofSummaryFacts {
  proof_passes_done?: number
  proof_started_at?: string | null
  leads_awaiting?: number | null
  proof_run?: { status: string; total_inserted: number } | null
  proof_work_state?: string | null
  needs_icp_review?: boolean
}

/**
 * The rule, fed straight from the Milla summary — for the client's FIRST Proof only.
 *
 * `null` means "this client is past their first Proof": the hold never applies to them, so no
 * screen can ever send a client who has moved on back to the Brief. Both the Brief page and the
 * desk call this, so neither re-derives the facts for itself.
 */
export function firstProofReadiness(s: ProofSummaryFacts | null | undefined): ProofReadiness | null {
  if (!s) return null
  const passes = s.proof_passes_done ?? 0
  if (passes > 1) return null
  return proofReadiness({
    claimed: !!s.proof_started_at || passes > 0,
    onDesk: s.leads_awaiting ?? null,
    runStatus: s.proof_run?.status ?? null,
    runInserted: s.proof_run?.total_inserted ?? null,
    workState: s.proof_work_state ?? null,
    needsReview: s.needs_icp_review === true,
  })
}
