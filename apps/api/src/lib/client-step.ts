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
//   0 signed up + ICP approved · 2 waiting on the pack payment · 3 paid → inbox + sourcing
//   4 the client is picking people · 5 approve the sequence · 6 run it
//   7 answer replies · 8 qualify + hand over · 9 live, nothing owed

// The ONLY import, and it is a constant, not a dependency: `@kind/shared` is pure data, so
// this module stays synchronous and DB-free while the price it quotes can never go stale.
import { PACK_PRICE_USD } from '@kind/shared'

export type Actor = 'you' | 'them' | 'engine'

// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 ⚑ 10 Sep (I3) — THIS FILE IS THE RETIRED MODEL'S LIFECYCLE, AND IT WAS DESCRIBING
// PROGRAMME CLIENTS AS WELL.
//
// ── WHAT THE FOUNDER WAS SEEING ─────────────────────────────────────────────────────────
//
// Every sentence in the table below belongs to the $299-pack / $4-per-approved-lead model.
// Vida's worklist ran it over EVERY client, including clients on the programme model, so:
//
//   · a client at PROOF, who owes us nothing and has never been offered a pack, read
//     **"Waiting on their $299"** — because `hasFunded` is false for a programme client and
//     always will be: their money arrives as `programme_first`, not as a pack purchase;
//   · **"Approve the sequence"** and **"Ready to run"** appeared as operator tasks on a
//     programme that was still sourcing, gated only on whether a `figsy_sequences` row and an
//     active campaign happened to exist — the premature controls;
//   · both of those carry `actor: 'you'`, which is a task raised while the CLIENT is the one
//     acting.
//
// ── THE FIX, AND WHAT IT DELIBERATELY IS NOT ────────────────────────────────────────────
//
// It is NOT a second stage derivation. `deriveLifecycle` is the one answer to "where is this
// client", and where a programme exists this file now RENDERS that verdict instead of forming
// an opinion of its own. Adding a third opinion here is the failure being fixed, not the fix.
//
// ⚠️ THE LEGACY TABLE IS UNTOUCHED AND STILL CORRECT — for legacy clients. The $299 book is
// what is actually selling; deleting its steps would have broken the live console to fix a
// vocabulary problem on a different set of accounts.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * The canonical verdict, as `deriveLifecycle` produced it. Passed in rather than computed:
 * this module is pure and DB-free, and it is not allowed a second opinion about the stage.
 */
export type ProgrammeLifecycle = {
  /** `LifecycleStage` — 'signup' … 'completion'. */
  stage: string
  /** The founder's own word for it: 'Signup', 'Proof', 'Sourcing' … */
  stageLabel: string
  /** `LifecycleState` — the exception-aware state within the stage. */
  state: string
  needsYou: boolean
  /** `NeedsYouReason` when there is one. A task with no reason is not a task. */
  needsYouReason: string | null
}

/** Stages where the CLIENT is the one acting. Nothing here is ever the operator's task. */
const CLIENT_ACTS = new Set(['proof', 'recommendation', 'approval'])

/**
 * Which existing action card, if any, matches this reason.
 *
 * ⚠️ NO NEW `cta.kind` VALUES. Widening that union changes what every screen rendering an
 * action card has to handle, and a reason with no matching control is honestly served by a
 * label alone — the Needs-you filter runs off `needsYou`, never off the presence of a button.
 */
const CTA_FOR: Record<string, NextAction['cta']> = {
  reply_needs_decision: { kind: 'replies', label: 'Open the inbox' },
  sender_not_sendable:  { kind: 'inbox',   label: 'Fix the sender' },
  run_required:         { kind: 'run',     label: 'Run it' },
}

/**
 * The worklist step for a client whose journey is a PROGRAMME — rendered from the canonical
 * verdict, never re-derived.
 *
 * ⚠️ URGENCY, NOT A NEW PRIORITY ORDER. The numbers sit inside the same 0–100 scale the legacy
 * table uses so one sorted list can hold both kinds of client. A real task outranks every
 * legacy step that is not a waiting prospect; everything else sinks below them.
 */
function programmeStep(lc: ProgrammeLifecycle): NextAction {
  const actor: Actor = lc.needsYou ? 'you' : CLIENT_ACTS.has(lc.stage) ? 'them' : 'engine'
  const cta = lc.needsYouReason ? CTA_FOR[lc.needsYouReason] : undefined
  return {
    // ⚠️ STEP 1 FOR EVERY PROGRAMME CLIENT, AND IT MEANS "not a legacy step". The numbers in
    // this file are positions in the RETIRED flow (2 = the pack payment, 5 = approve the
    // sequence); reusing one for a programme state would put a programme client at a milestone
    // that does not exist for them. The stage is carried by `label`, which is the founder's
    // own word for it.
    step: 1,
    actor,
    urgency: lc.needsYou ? 85 : CLIENT_ACTS.has(lc.stage) ? 20 : 15,
    label: lc.needsYou && lc.needsYouReason
      ? `${lc.stageLabel} · ${NEEDS_YOU_LABEL[lc.needsYouReason] ?? 'needs you'}`
      : lc.stageLabel,
    ...(cta ? { cta } : {}),
  }
}

/**
 * The founder-plain half-sentence for each reason.
 *
 * ⚠️ SHORT ON PURPOSE — this is a row in a list, not a panel. The full sentence lives in
 * `lifecycleDetailFor`'s `stoppedDetail` / `senderDetail`, which the opened client renders.
 */
const NEEDS_YOU_LABEL: Record<string, string> = {
  preparation_stopped:     'sourcing stopped',
  make_live_required:      'ready to make live',
  run_required:            'ready to run',
  reply_needs_decision:    'a reply needs you',
  sender_not_sendable:     'the sender cannot send',
  repeat_decision:         'a repeat is worth offering',
  human_blocker:           'a blocker only you can clear',
  proof_calibration_failed: 'Proof needs a person',
}

export type ClientFacts = {
  /**
   * ⚑ 10 Sep (I3) — the canonical verdict when this client's journey is a PROGRAMME.
   *
   * 🛑 WHEN THIS IS SET, NOTHING BELOW IT IS READ. Every other fact in this type describes the
   * retired pack model, and answering a programme client with any of them is how "Waiting on
   * their $299" ended up beside a client at Proof.
   */
  lifecycle?: ProgrammeLifecycle | null
  hasIcp: boolean
  hasFunded: boolean          // the onboarding pack payment landed
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
  // ── 🛑 ⚑ 10 Sep (I3) — A PROGRAMME CLIENT IS ANSWERED BY THE CANONICAL VERDICT ────────
  //
  // FIRST, and before the reply branch below, because `deriveLifecycle` already has a rule for
  // a reply waiting on a person (`review_reply` · `reply_needs_decision`). Letting the legacy
  // branch answer it too would be two rules for one fact, which is the whole defect.
  if (f.lifecycle) return programmeStep(f.lifecycle)

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
      label: `Waiting on their $${PACK_PRICE_USD}`,
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
