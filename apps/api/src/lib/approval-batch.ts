// THE MINIMUM-20 GATE (founder-locked 25 Jul) — a client has to commit, or we carry them.
//
// The cashflow model made the problem concrete: a client's inbox costs us ~$40/month from the
// day they sign, so at $4 a lead the first ~13 approvals do nothing but pay for their sender.
// A client who approves five people is a client we are running a mail service for, free.
//
// So: when we send someone their people, they choose AT LEAST 20. The founder's words —
// "we need people to run a campaign… they have to choose 20 minimum" — and they asked for a
// HARD gate, which means the server refuses, not that a button is greyed out. A disabled
// button is a suggestion; anyone with the network tab open can approve one lead.
//
// Scope of the gate: it applies until the client has committed 20 approvals IN TOTAL. Once
// they are past that they are a working client and can approve one at a time — the gate is
// there to start the relationship properly, not to nag someone already using us.
//
// Edge case that decides fairness: if we have only sent them 12 people, demanding 20 is
// impossible. The requirement is therefore min(20, what they actually have to choose from).

/** How many a client must approve in one go before we will start work. */
export const MIN_BATCH_APPROVALS = 20

/**
 * How many this client must approve right now.
 *
 * `available` is how many un-decided people are actually in front of them — the requirement
 * can never exceed it, or the gate becomes impossible rather than firm.
 * `approvedEver` past the minimum releases the gate entirely (returns 1: normal single approve).
 */
export function requiredApprovals(available: number, approvedEver: number): number {
  const have = Math.max(0, Math.floor(Number(available) || 0))
  const done = Math.max(0, Math.floor(Number(approvedEver) || 0))
  if (done >= MIN_BATCH_APPROVALS) return have > 0 ? 1 : 0
  return Math.min(MIN_BATCH_APPROVALS - done, have)
}

export type BatchCheck = {
  allowed: boolean
  required: number
  selected: number
  /** What the client reads. Never a bare number. */
  reason: string
}

/**
 * The gate itself. Called by the API before a single dollar or a single email moves.
 */
export function checkBatch(selected: number, available: number, approvedEver: number): BatchCheck {
  const sel = Math.max(0, Math.floor(Number(selected) || 0))
  const required = requiredApprovals(available, approvedEver)

  if (required === 0) {
    return { allowed: false, required: 0, selected: sel, reason: 'There is nobody waiting for you to choose right now.' }
  }
  if (sel === 0) {
    return { allowed: false, required, selected: sel, reason: `Choose ${required} to start.` }
  }
  if (sel < required) {
    const short = required - sel
    return {
      allowed: false, required, selected: sel,
      reason: `Choose ${short} more — we start with ${required} so there are enough people to run a real campaign.`,
    }
  }
  return { allowed: true, required, selected: sel, reason: 'Ready to start.' }
}

/** The line above the lead desk in Milla. */
export function batchLabel(selected: number, available: number, approvedEver: number): string {
  const required = requiredApprovals(available, approvedEver)
  if (required <= 1) return selected > 0 ? `${selected} selected` : 'Pick anyone you want us to work.'
  if (selected >= required) return `${selected} selected — ready to start`
  return `${selected} of ${required} selected`
}
