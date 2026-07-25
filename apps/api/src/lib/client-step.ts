// WHERE IS THIS CLIENT, AND WHAT IS THE ONE NEXT THING?
//
// Vida had eight tabs for a job with five actions, and the tabs were named after objects
// (People, Campaign, ICP, Sequence…) rather than what you do next — so every screen asked the
// operator to work out where they were. This module is the answer to that: given the facts
// about a client, it returns the single step they're on and the one action that moves them.
//
// Pure and synchronous on purpose — no DB in here — so the whole decision table is unit
// tested rather than discovered in production.
//
// The steps mirror the founder's mapped flow (v2, 25 Jul):
//   0 signed up + ICP approved · 2 waiting on the $99 · 3 paid → inbox + sourcing (automatic)
//   4 the client is picking people · 5 approve the sequence · 6 run it
//   7 answer replies · 8 qualify + hand over · 9 live, nothing owed

export type Actor = 'you' | 'them' | 'engine'

export type ClientFacts = {
  hasIcp: boolean
  hasFunded: boolean          // the $99 landed
  hasInbox: boolean           // a sender is assigned
  sourced: number             // people found for them, all-time
  withClient: number          // surfaced, awaiting their 👍, not expired
  approved: number            // they paid the $4 — enrolled or ready to be
  hasSequence: boolean
  campaignActive: boolean
  pendingDrafts: number       // Co-Pilot queue waiting on your eyes
  /**
   * Prospect replies still open — not qualified, no meeting booked, not noise.
   *
   * ⚠️ ONE bucket, not two, because the schema cannot tell "answered" from "unanswered":
   * `figsy_replies` has no column that records us having replied (`processed_at` is the AI
   * classification stamp, not a human answer). Splitting step 7 "answer it" from step 8
   * "qualify it" needs a `replied_at` column — flagged, not invented.
   */
  repliesOpen: number
  isDemo: boolean
}

export type NextAction = {
  step: number
  /** What the operator sees in the client list — plain words, never a bare count. */
  label: string
  actor: Actor
  /** The button on the action card. Absent when nothing is owed by us. */
  cta?: { kind: 'inbox' | 'sequence' | 'run' | 'replies' | 'qualify' | 'approvals' | 'chase'; label: string }
  /** Sorting weight — higher floats up the clients list. */
  urgency: number
}

/**
 * The decision table, in priority order. The ORDER is the product: a client with replies
 * waiting AND a sequence to approve is shown the replies, because a prospect is sitting
 * unanswered with the client's name on it while a sequence can wait an hour.
 */
export function nextAction(f: ClientFacts): NextAction {
  // ── Things a real person is waiting on, most time-sensitive first ──────────
  if (f.repliesOpen > 0) {
    return {
      step: 7, actor: 'you', urgency: 100,
      label: `${f.repliesOpen} repl${f.repliesOpen === 1 ? 'y' : 'ies'} to handle`,
      cta: { kind: 'replies', label: 'Open the inbox' },
    }
  }
  if (f.pendingDrafts > 0) {
    return {
      step: 6, actor: 'you', urgency: 90,
      label: `${f.pendingDrafts} email${f.pendingDrafts === 1 ? '' : 's'} waiting on you`,
      cta: { kind: 'approvals', label: 'Release them' },
    }
  }
  // ── Nothing has been set up yet ────────────────────────────────────────────
  if (!f.hasIcp) {
    return { step: 0, actor: 'them', urgency: 10, label: 'No ICP yet — they haven’t finished signing up' }
  }
  if (!f.hasFunded && !f.isDemo) {
    // Money gates everything. We don't source and we don't buy them an inbox until it lands.
    return {
      step: 2, actor: 'them', urgency: 40,
      label: 'Waiting on their $99',
      cta: { kind: 'chase', label: 'Remind them' },
    }
  }
  if (!f.hasInbox) {
    return {
      step: 3, actor: 'you', urgency: 95,
      label: 'Needs a sender — nothing can go out',
      cta: { kind: 'inbox', label: 'Assign an inbox' },
    }
  }

  // ── Paid and set up: the engine sources, the client picks ──────────────────
  if (f.sourced === 0) {
    return { step: 3, actor: 'engine', urgency: 30, label: 'Finding people…' }
  }
  if (f.approved === 0) {
    return {
      step: 4, actor: 'them', urgency: 25,
      label: f.withClient > 0 ? `Client picking · ${f.withClient} sent over` : 'Nobody approved yet',
    }
  }

  // ── They've bought work. Now it's on us to do it. ──────────────────────────
  if (!f.hasSequence) {
    return {
      step: 5, actor: 'you', urgency: 80,
      label: 'Approve the sequence',
      cta: { kind: 'sequence', label: 'Approve the sequence' },
    }
  }
  if (!f.campaignActive) {
    return {
      step: 6, actor: 'you', urgency: 75,
      label: 'Ready to run',
      cta: { kind: 'run', label: 'Run it' },
    }
  }

  // ── Live and nothing owed ──────────────────────────────────────────────────
  return {
    step: 9, actor: 'engine', urgency: 5,
    label: f.withClient > 0 ? `Running · ${f.withClient} more with the client` : 'Running',
  }
}

/** Clients list order: whoever needs you, first. Ties broken by name so it never jitters. */
export function sortByUrgency<T extends { next: NextAction; company_name: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    b.next.urgency - a.next.urgency ||
    (a.company_name ?? '').localeCompare(b.company_name ?? ''))
}
