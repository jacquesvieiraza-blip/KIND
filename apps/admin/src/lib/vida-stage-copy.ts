// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 WHAT VIDA SAYS AT BRIEF AND AT PROOF — the operator half of the locked MVP1 preview
//
// ── WHY THIS IS A PURE MODULE AND NOT JSX ───────────────────────────────────────────────
//
// Every sentence here is a CLAIM ABOUT A CLIENT that an operator will act on: whether they
// need attention, what has been spent, how many people were removed and by whom. A claim
// built inside a component can only be checked by reading the component; built here it can be
// RUN. That distinction is the whole reason `briefPanelCopy` already lives beside this file.
//
// ── THE ONE RULE THESE PANELS EXIST TO HOLD ─────────────────────────────────────────────
//
// 🛑 NORMAL IS SILENT. The locked preview says "NEXT ACTION · NONE" at all three stages —
// a signed-up client, a healthy Brief and a confirmed Proof are each a state where an
// operator has nothing to do, and the panel says so plainly rather than inventing work. A
// Needs-You list with everybody on it is the same as a Needs-You list with nobody on it: it
// stops being read. So the default is "nothing needed", and an action has to be earned.
//
// ⚠️ AND A NUMBER WE COULD NOT READ IS NEVER A ZERO. Every counter below takes `null` for
// "unknown" and says so. `$0 spent` and `spend unknown` are different facts about a client,
// and only one of them is safe to act on.
// ══════════════════════════════════════════════════════════════════════════════════════════

import type { PanelCard } from './vida-lifecycle-copy'

/** A chip on the operator's header row. `ok` is the quiet, normal state. */
export type StageChip = { text: string; tone: 'plain' | 'ok' | 'warn' | 'stop' }

/**
 * ── 🛑 THE OPERATOR'S NINE-STEP WORK RAIL, TRIMMED (founder-ruled 22 Sep, option A) ──────
 *
 * 🛑 THE PREVIEW DRAWS NINE: Signed up › Brief › Programme › Inbox+people › Sequence › Run ›
 * Replies › Book › Live. The first three cover exactly the same ground as the six-stage FLOW
 * ribbon above them, numbered differently — which is the defect that cost us Section 0, where
 * a four-step bar disagreed with the canonical six on the client's very first screen.
 *
 * 🛑 FOUNDER-RULED: keep both, trim the overlap. The ribbon answers *where is the client*;
 * this answers *what do we still owe them*, and it starts where the client's own journey
 * stops being the whole story. Nothing is counted twice.
 *
 * ⚠️ THESE ARE OUR JOBS, NOT THEIR STAGES. A client never sees "Inbox + people" or
 * "Sequence" — they are the mailbox and the copy, which is work that happens to them rather
 * than work they do.
 */
export const OPERATOR_RAIL = [
  'Inbox + people', 'Sequence', 'Run', 'Replies', 'Book', 'Live',
] as const
export type OperatorRailStep = (typeof OPERATOR_RAIL)[number]

/**
 * ⚑ 24 Sep (R145 step 7 · #64) — WHERE ON OUR WORK RAIL A CLIENT IS, FROM THE ENGINE STAGE.
 *
 * ⚠️ ONLY WHAT THE STAGE ITSELF SAYS. Preparation (sourcing) is the people and the inbox; the
 * frozen package at approval is the sequence; delivery is Run; a completed programme is Live
 * and closed. Replies and Book are work INSIDE delivery that no stage separates, so they are
 * never lit from here rather than lit by a guess. Before preparation there is no operator work
 * yet, and nothing is lit.
 */
export function operatorRailAt(stage: string | null | undefined): OperatorRailStep | null {
  switch (stage) {
    case 'sourcing':   return 'Inbox + people'
    case 'approval':   return 'Sequence'
    case 'live':
    case 'review':     return 'Run'
    case 'completion': return 'Live'
    default:           return null
  }
}

export type StageFacts = {
  /** Brief facts held, and the denominator. `null` when the read failed. */
  brief: { collected: number; total: number } | null
  /** Sourcing spend in dollars. `null` when the ledger could not be read. */
  spendUsd: number | null
  /** Records bought, and the ledgered batches behind them. */
  records: number | null
  batches: number | null
  /** Does an operator have to do something? Default false — normal is silent. */
  needsYou: boolean
  /** Why, when they do. Ignored when `needsYou` is false. */
  needsYouReason?: string
}

/**
 * The header chips: where the brief is, whether anything is owed, and what has been spent.
 *
 * ⚠️ MONEY IS FORMATTED IN ONE PLACE. An operator comparing "$0" on one panel with "0" on
 * another is being asked to notice a difference that is ours to remove.
 */
export function stageChips(f: StageFacts): StageChip[] {
  const chips: StageChip[] = []

  chips.push(f.brief
    ? { text: `Brief ${f.brief.collected}/${f.brief.total}`, tone: 'plain' }
    // ⚠️ NOT "Brief 0/11". A read that failed is not a client who has said nothing.
    : { text: 'Brief — could not be read', tone: 'warn' })

  chips.push(f.needsYou
    ? { text: f.needsYouReason?.trim() || 'Needs you', tone: 'warn' }
    : { text: 'No action needed', tone: 'ok' })

  chips.push(f.spendUsd === null
    ? { text: 'Spend — could not be read', tone: 'warn' }
    : f.spendUsd > 0
      ? { text: `$${f.spendUsd.toFixed(2)} · active`, tone: 'plain' }
      // The locked wording for a client nothing has been spent on yet.
      : { text: '$0 · inactive', tone: 'plain' })

  return chips
}

/**
 * 🛑 THE "NEXT ACTION" CARD, WHOSE NORMAL VALUE IS "NONE".
 *
 * ⚠️ THE HEADLINE NAMES THE STATE, NOT THE STAGE. "New client landed — no action needed" tells
 * an operator both things at once; "Stage: Brief" tells them neither.
 */
export function nextActionCard(
  stage: 'signup' | 'brief' | 'proof',
  f: Pick<StageFacts, 'needsYou' | 'needsYouReason'>,
): PanelCard {
  if (f.needsYou) {
    return {
      kind: 'note',
      label: 'NEXT ACTION',
      tone: 'exception',
      body: f.needsYouReason?.trim()
        || 'Something on this client needs a person. Open the client to see what.',
    }
  }
  const body = stage === 'signup'
    ? 'The account exists and the client is in the portal. There is nothing for an operator to set up before the conversation can start.'
    : stage === 'brief'
      ? 'The conversation is doing its job. Operator authority is unchanged and nothing requires duplicate entry.'
      : 'Escalation is available but not triggered. Nothing has been bought and nobody has been contacted.'
  const headline = stage === 'signup'
    ? 'New client landed — no action needed'
    : stage === 'brief'
      ? 'Healthy Brief — no action needed'
      // ⛓️ 24 Sep (R145 step 7 · #44) — was "Proof confirmed by the client", printed beside the
      // lifecycle card's "Client: Reviewing" on the same panel. At this stage the client has NOT
      // confirmed ("These are my people" is what moves them on), so the headline was the false half.
      : 'Proof with the client — no action needed'
  return { kind: 'note', label: 'NEXT ACTION · NONE', body: `${headline}\n\n${body}` }
}

/**
 * The sign-up record: what has happened to this client so far, and what is next.
 *
 * ⚠️ EVERY STEP IS DERIVED, NONE IS ASSUMED. "Account created" is true because we are looking
 * at them; the rest are read off the same counts the rest of the panel uses. A tick nobody
 * computed is the kind of progress display that keeps saying "done" after a failure.
 */
export function signUpRecordCard(f: StageFacts, confirmed: boolean, proofPasses: number): PanelCard {
  const held = f.brief?.collected ?? 0
  const total = f.brief?.total ?? 0
  return {
    kind: 'ticks',
    label: 'Sign-up record',
    ticks: [
      { label: 'Account created', done: true },
      { label: 'Client is in the Milla portal', done: true },
      { label: `Brief facts land as they are spoken — ${held} of ${total}`, done: held > 0 },
      { label: 'Targeting resolves to a provider search', done: total > 0 && held >= total },
      { label: 'Brief confirmed by the client', done: confirmed },
      { label: 'Proof — twenty masked people', done: proofPasses > 0 },
    ],
  }
}

export type ProvenanceInput = {
  matched: number
  excluded: number
  alreadyWorked: number
  /** Removed by US — a judgement rather than an instruction. Should be zero. */
  setAside: number
  workable: number
  committed: number
  /** Records served from the pool we already own, rather than bought. */
  fromPool: number | null
}

/**
 * 🛑 HOW THE WORKABLE POOL WAS ARRIVED AT — the operator's evidence that nothing was judged
 * twice and nobody was removed on our opinion.
 *
 * ⚠️ THE SET-ASIDE LINE IS THE ONE THAT MATTERS AND IT IS EXPECTED TO READ ZERO. Seniority,
 * size and geography are enforced by the provider filter and never re-judged, so UNKNOWN
 * cannot arise on them; category and company type are judged but only RANK. If this number is
 * ever non-zero, something started removing people again — which is the defect that emptied
 * the Proof screen, and the reason this line is on an operator panel at all.
 */
export function provenanceCard(p: ProvenanceInput): PanelCard {
  return {
    kind: 'ticks',
    label: `How the ${p.workable.toLocaleString()} were arrived at`,
    ticks: [
      { label: 'Seniority enforced by the provider filter — never re-judged', done: true },
      { label: 'Company size enforced by the provider filter — never re-judged', done: true },
      { label: 'Geography enforced by the provider filter — never re-judged', done: true },
      {
        label: p.fromPool === null
          ? 'Owned records checked before anything new'
          : `Owned records checked before anything new — ${p.fromPool.toLocaleString()} already ours`,
        done: true,
      },
      { label: 'Category & company type — judged, ranking only: blank demotes, never removes', done: true },
      { label: `Client exclusions — the only thing that removes: ${p.excluded.toLocaleString()} removed`, done: true },
      {
        label: p.alreadyWorked > 0
          ? `Already worked for this client and unavailable — ${p.alreadyWorked.toLocaleString()} out`
          : 'Nobody has been worked for this client yet',
        done: true,
      },
      { label: `Capacity derived and shown before any money — ${p.committed} sellable`, done: true },
    ],
  }
}

/**
 * The bar under the provenance: the pool, and how many we removed ourselves.
 *
 * ⚠️ THE CAPTION IS A CLAIM AND IT HAS TO STAY TRUE. "0 set aside by us" is the product's
 * promise that it does not shrink a client's market on its own judgement; the moment that
 * number moves, the caption says so rather than staying reassuring.
 */
export function workablePoolCard(p: ProvenanceInput): PanelCard {
  const clean = p.setAside === 0
  return {
    kind: 'fact',
    label: 'Workable pool',
    value: p.workable.toLocaleString(),
    ...(clean ? {} : { tone: 'exception' as const }),
    caption: clean
      ? `${p.matched.toLocaleString()} matched · ${p.excluded.toLocaleString()} excluded by the client · 0 set aside by us`
      // 🛑 NOT SOFTENED. Somebody was removed on our judgement, which the rules say cannot
      // happen, so the panel reports it as the exception it is.
      : `${p.matched.toLocaleString()} matched · ${p.excluded.toLocaleString()} excluded by the client · ${p.setAside.toLocaleString()} SET ASIDE BY US — that should be zero`,
  }
}
