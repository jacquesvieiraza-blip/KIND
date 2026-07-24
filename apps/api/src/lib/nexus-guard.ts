// #511 NEXUS · Phase 3 — GUARDRAILS. Pure, dependency-free, unit-testable. These land BEFORE
// any auto-tuning (Phase 2) so the write-back path is fenced and gated from the first line.
//
// Three guarantees:
//   1. THE FENCE (the product): a client's learnings may only ever be applied to that SAME
//      client. assertSameClient is the chokepoint every future write-back MUST call.
//   2. CONFIDENCE GATE: never auto-tune on thin data — require a "confident" profile with real
//      booked outcomes, so we tune on signal, not noise.
//   3. KILL-SWITCH: auto-tune is OFF by default per client, and a global env can hard-disable
//      the whole thing. Default-deny.

export class NexusFenceError extends Error {
  constructor(sourceClientId: string, targetClientId: string) {
    super(`NEXUS FENCE VIOLATION: learnings from client ${sourceClientId} may not be applied to client ${targetClientId}`)
    this.name = 'NexusFenceError'
  }
}

// THE FENCE — throws unless source and target are the same non-empty client. Every write-back
// (sequence tune, sourcing tune) calls this before it touches a client's config.
export function assertSameClient(sourceClientId: string, targetClientId: string): void {
  if (!sourceClientId || !targetClientId || sourceClientId !== targetClientId) {
    throw new NexusFenceError(sourceClientId || '(none)', targetClientId || '(none)')
  }
}

// The minimum signal before a profile may drive auto-tuning. Confident (large sample) AND real
// booked meetings — a profile that has never booked can't know what converts.
export const AUTOTUNE_MIN_MEETINGS = 3
export const AUTOTUNE_MIN_WORKED = 40

export interface TuneReadyInput {
  confidence: 'learning' | 'emerging' | 'confident'
  sample_worked: number
  sample_meetings: number
}

// CONFIDENCE GATE — is there enough signal to trust this profile for tuning? Pure.
export function autoTuneReady(p: TuneReadyInput): { ready: boolean; reason: string } {
  if (p.confidence !== 'confident') return { ready: false, reason: `still ${p.confidence} — needs a larger sample before tuning` }
  if (p.sample_meetings < AUTOTUNE_MIN_MEETINGS) return { ready: false, reason: `only ${p.sample_meetings} booked meeting(s) — needs ${AUTOTUNE_MIN_MEETINGS}+ to learn what converts` }
  if (p.sample_worked < AUTOTUNE_MIN_WORKED) return { ready: false, reason: `only ${p.sample_worked} worked leads — needs ${AUTOTUNE_MIN_WORKED}+` }
  return { ready: true, reason: 'enough signal to tune' }
}

export type TuneState = 'off' | 'learning' | 'ready'

// THE SINGLE GATE Phase 2 will consult. Combines the global kill-switch, the per-client
// enable flag, and the confidence gate into one default-deny decision.
//   • globalKill true            → 'off'  (env hard-disable, wins over everything)
//   • clientEnabled false        → 'off'  (per-client kill-switch — the default)
//   • enabled but not enough data → 'learning'
//   • enabled + enough data       → 'ready'
export function nexusTuneGate(
  input: TuneReadyInput, clientEnabled: boolean, globalKill: boolean,
): { state: TuneState; allowed: boolean; reason: string } {
  if (globalKill) return { state: 'off', allowed: false, reason: 'auto-tune globally disabled (NEXUS_AUTOTUNE_KILL)' }
  if (!clientEnabled) return { state: 'off', allowed: false, reason: 'auto-tune off for this client (default — founder must enable)' }
  const gate = autoTuneReady(input)
  return gate.ready
    ? { state: 'ready', allowed: true, reason: gate.reason }
    : { state: 'learning', allowed: false, reason: gate.reason }
}

// Global hard kill — env, default OFF-only-if-explicitly-set. Set NEXUS_AUTOTUNE_KILL=1 to
// freeze all auto-tuning platform-wide (incident switch).
export function nexusGlobalKill(): boolean {
  return process.env.NEXUS_AUTOTUNE_KILL === '1' || process.env.NEXUS_AUTOTUNE_KILL === 'true'
}
