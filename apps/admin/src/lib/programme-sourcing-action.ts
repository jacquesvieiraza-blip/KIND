// ═══════════════════════════════════════════════════════════════════════════════════════
// WHAT VIDA'S SOURCING SHORTCUT SHOULD SAY, AND WHERE IT SHOULD SEND (HOUSE-008, 7 Sep).
//
// 🛑 WHAT THIS REPLACES ON THE PROGRAMME PATH. The chip read `Source 20 leads` — a literal in
// an array — and the number on it was then PARSED BACK OUT of that sentence to become the
// run size. The request went to `/operator/source` with a `client_id`, and that route picks
// ICPs by `is_active = true`. House's v4 is attached to the programme and deliberately NOT
// client-facing active, so the button could not reach the targeting it was for, and would
// have reached for the retired audience instead.
//
// ── THE ONE RULE THIS FILE FOLLOWS ──────────────────────────────────────────────────────
// **IT DECIDES NOTHING.** Every number and every verdict here is read off the programme truth
// the panel already fetched, and the server derives both from the same functions the
// programme-native route runs (`nextBatchSize`, `authorityFor(…, 'NEXT_BATCH')`). This file
// only chooses WORDS.
//
// That is deliberate and it is the safety property: a screen that computed
// `min(batch_size, room_remaining)` itself would be a second copy of the batch rule, and two
// copies is how a button comes to promise 250 while the run does 100. There is no provider
// logic here, no ICP selection, no authority test — those live behind
// `POST /operator/programme/source` and stay there.
//
// What this file DOES own is failing closed: anything it cannot read as a single, authorised,
// unambiguously-targeted programme becomes a `blocked` action with a sentence an operator can
// act on, and a blocked action cannot be turned into a request at all.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The programme-native sourcing route. The client-scoped `/operator/source` is not it. */
export const PROGRAMME_SOURCE_ENDPOINT = '/api/proxy/operator/programme/source'

/** The subset of the operator programme-truth payload this derivation reads. */
export type ProgrammeTruthish = {
  programme: null | {
    id: string
    status?: string
    state?: string
    sourcing_ceiling?: number
    sourced_used?: number
    sourced_reserved?: number
    room_remaining?: number
    batch_size?: number
    /** `nextBatchSize(p)` — what a run started now would ask for. */
    next_batch?: number
    /** `authorityFor(p, 'NEXT_BATCH').allowed`. */
    may_source?: boolean
    source_blocked_reason?: string | null
  }
  icps?: {
    attached: { id: string; name: string | null; is_active: boolean }[]
    eligible: { id: string; name: string | null; is_active: boolean }[]
    unreadable: boolean
  }
}

export type ProgrammeSourcingAction = {
  programmeId: string
  /** The server's own next batch size. 0 whenever the action is blocked. */
  nextBatch: number
  /** The ATTACHED ICP's name — never the client-facing active one. */
  icpName: string | null
  /** Why this cannot run, in words for the operator. `null` = it can. */
  blocked: string | null
}

/**
 * Is there a programme sourcing action on screen, and may it run?
 *
 * Returns `null` — not a blocked action — when there is no programme at all. That distinction
 * matters: `null` means "this client is not a programme client, leave the legacy shortcut
 * exactly as it was", while a blocked action means "this IS a programme and here is why it
 * cannot source". Collapsing the two would silently hand a programme client the client-scoped
 * path, which is the defect this whole change exists to close.
 */
export function programmeSourcingAction(truth: ProgrammeTruthish | null | undefined): ProgrammeSourcingAction | null {
  const p = truth?.programme
  if (!p?.id) return null

  const blocked = (why: string, icpName: string | null = null): ProgrammeSourcingAction =>
    ({ programmeId: p.id, nextBatch: 0, icpName, blocked: why })

  // ⚠️ AN EMPTY LIST BECAUSE THE READ FAILED IS NOT "NO ICPs". The truth payload says so
  // explicitly, and the honest answer to "could not read" is never to proceed.
  const icps = truth?.icps
  if (!icps || icps.unreadable) {
    return blocked('The targeting attached to this programme could not be read, so nothing can be sourced. Reload the programme panel.')
  }

  const attached = icps.attached ?? []
  if (attached.length === 0) {
    return blocked(
      'No ICP is attached to this programme, so there is nothing it is authorised to source. ' +
      'Attach the targeting first — an ICP being active for the client is a different thing and is not used here.',
    )
  }
  if (attached.length > 1) {
    return blocked(
      `More than one ICP is attached to this programme (${attached.map(i => i.name ?? i.id).join(', ')}). ` +
      'Which audience this batch is for is a human decision, so nothing will be sourced.',
    )
  }

  const icpName = attached[0]?.name ?? null

  // The server's verdict, carried whole. This screen does not second-guess it.
  if (p.may_source === false) {
    return blocked(p.source_blocked_reason || 'This programme has no sourcing authority right now.', icpName)
  }

  // ⚠️ BELT, AND IT IS NOT REDUNDANT. `may_source` could be absent on an older payload, and a
  // zero-size run is not a run — "Source 0 leads" is not a button anybody should be offered.
  const nextBatch = p.next_batch ?? 0
  if (!Number.isFinite(nextBatch) || nextBatch <= 0) {
    return blocked(
      p.source_blocked_reason ||
      'This programme has no authorised sourcing volume remaining. Unused value never expires; opening more is a human decision.',
      icpName,
    )
  }

  return { programmeId: p.id, nextBatch, icpName, blocked: null }
}

/** The shortcut's label. Truthful when it can run, and honest when it cannot. */
export function sourcingChipLabel(action: ProgrammeSourcingAction | null): string {
  if (!action) return 'Source 20 leads'          // the untouched legacy shortcut
  if (action.blocked) return 'Sourcing blocked'  // never a quantity that will not happen
  return `Source ${action.nextBatch} leads`
}

/**
 * The confirmation, in the founder's own shape:
 *   "Source 250 leads for this programme using Founder-Led B2B Agencies UK/US?"
 *
 * ⚠️ NO PROVIDER, NO COST, NO POOL. The legacy card exposed a PDL/pool split and a dollar
 * estimate, which is meaningless for an Apollo-only House run and is not a decision the
 * operator is being asked to make. They are being asked one question: this many, this
 * targeting, yes or no.
 */
export function sourcingConfirmQuestion(action: ProgrammeSourcingAction): string {
  const head = `Source ${action.nextBatch} leads for this programme`
  return action.icpName ? `${head} using ${action.icpName}?` : `${head}?`
}

/**
 * The request. Exactly two fields — the server resolves the ICP, the authority and the size.
 *
 * ⚠️ THROWS ON A BLOCKED ACTION rather than returning something callable. A UI bug that
 * renders the confirm button when it should not must not also be able to fire the run.
 */
export function programmeSourceRequest(action: ProgrammeSourcingAction): {
  url: string
  body: { programme_id: string; confirm: true }
} {
  if (action.blocked) {
    throw new Error(`Programme ${action.programmeId} cannot source: ${action.blocked}`)
  }
  return { url: PROGRAMME_SOURCE_ENDPOINT, body: { programme_id: action.programmeId, confirm: true } }
}
