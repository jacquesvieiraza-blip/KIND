// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ MVP1 (Preview 07) — WHAT VIDA SAYS ABOUT A BRIEF THAT IS STILL BEING COLLECTED.
//
// ── WHY IT IS A MODULE, NOT JSX ─────────────────────────────────────────────────────────
//
// The same reason `vida-lifecycle-copy.ts` is one: several of these sentences are DECISIONS.
// "11 of 11 collected, confirmation still pending" is the founder's own wording for the state
// Preview 07 was corrected to produce, and "Confirmation is the client's own gate — it follows
// all eleven facts and is never one of them" is the correction itself. Buried in a component
// each is one careless edit from being lost and nothing would fail; here every one of them is
// a string a test can hold.
//
// ── 🛑 THERE IS NO ELEVEN-FACT LIST IN THIS FILE ────────────────────────────────────────
//
// The rows, their order and their labels are `BRIEF_FACTS` / `BRIEF_FACT_LABEL` from
// `@kind/shared`, and the count is the one the server already derived through `briefFacts()`
// over that same list. A hand-written copy here is exactly how Vida came to display "seven of
// the eight brief facts" while Milla was collecting eleven.
//
// ── ⚠️ CONFIRMATION IS NEVER COUNTED ────────────────────────────────────────────────────
//
// Eleven facts held is not "the client confirmed". Confirmation is the separate gate that
// FOLLOWS all eleven and is what starts Proof. Counting it as a twelfth is the defect Preview
// 07 was corrected for, and the tests beside this file assert it never creeps back in — the
// denominator this file prints is the server's `total`, which is `BRIEF_FACTS.length`.
//
// ── ⚠️ AND IT NEVER RENDERS TWO DISAGREEING ANSWERS ─────────────────────────────────────
//
// The count and the ticked rows are two views of one derivation. If they disagree — a
// serialisation bug, a stale client against a newer server — the panel SAYS SO rather than
// printing a confident "3 of 11" above eleven ticks. A screen that quietly picks one of two
// contradictory truths is worse than one that admits it cannot tell.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { BRIEF_FACTS, BRIEF_FACT_LABEL, type BriefFactId } from '@kind/shared'
import type { PanelCard } from './vida-lifecycle-copy'

export type BriefPanelInput = {
  /** How many of the eleven the SERVER counted, through `briefFacts()`. Never recounted here. */
  collected: number
  /** Always `BRIEF_FACTS.length`. Echoed from the server so no denominator is typed twice. */
  total: number
  /** The fact ids still outstanding, in the approved order. */
  missing: readonly string[]
  /**
   * ⚠️ THE SEPARATE GATE, AND THE ONLY PLACE IT APPEARS. It is read, printed and reasoned
   * about entirely outside the eleven-fact count.
   */
  confirmedAt: string | null
}

export type BriefPanelCopy = {
  subtitle: string
  /** The one progress sentence. The founder's wording, per state. */
  progress: string
  cards: PanelCard[]
}

/**
 * ⚠️ COMPLETENESS IS THE SERVER'S ANSWER, NOT A LOCAL RE-DERIVATION. `collected >= total` is a
 * reading of the counter's verdict, not a second opinion about what "complete" means.
 */
function isComplete(i: BriefPanelInput): boolean {
  return i.total > 0 && i.collected >= i.total
}

export function briefPanelCopy(input: BriefPanelInput): BriefPanelCopy {
  const missing = new Set(input.missing)
  const complete = isComplete(input)
  const confirmed = typeof input.confirmedAt === 'string' && input.confirmedAt.trim() !== ''

  // The rows come from the shared list, in the shared order — never from `missing`, which
  // says only what is absent and could not put the present facts in the approved order.
  const ticks = BRIEF_FACTS.map((id: BriefFactId) => ({
    label: BRIEF_FACT_LABEL[id],
    done: !missing.has(id),
  }))

  // 🛑 THE COHERENCE CHECK. Two views of one derivation; if they disagree the panel names it.
  const ticked = ticks.filter(t => t.done).length
  const incoherent = ticked !== input.collected

  const progress = !complete
    ? `${input.collected} of ${input.total} collected`
    : confirmed
      ? `${input.total} of ${input.total} collected, confirmed`
      : `${input.total} of ${input.total} collected, confirmation still pending`

  const subtitle = !complete
    ? 'Signed up · Milla is still collecting their brief.'
    : confirmed
      ? 'Signed up · brief confirmed by the client.'
      : 'Signed up · brief complete, waiting on their confirmation.'

  // ⚠️ THE NEXT FACT, FROM THE SHARED ORDER. Milla asks for one at a time; this is the one
  // she is on, and it is read out of `BRIEF_FACTS` rather than guessed.
  const nextId = BRIEF_FACTS.find(id => missing.has(id)) ?? null
  const caption = !complete
    ? nextId ? `Next: ${BRIEF_FACT_LABEL[nextId]}.` : undefined
    : confirmed
      ? 'Confirmed. Confirmation was never one of the eleven.'
      : 'Confirmation is the client’s own gate. It is not a twelfth fact.'

  const confirmationBody = !complete
    ? 'Not yet — the brief is not complete. Confirmation is the client’s own gate: it follows all eleven facts and is never one of them.'
    : confirmed
      ? 'The client confirmed this brief. That is what starts Proof — and it is still not one of the eleven facts.'
      : 'All eleven facts are held and the client has not confirmed yet. Confirmation is theirs to give, it is what starts Proof, and it is never counted as a twelfth fact.'

  const cards: PanelCard[] = [
    { kind: 'fact', label: 'Brief', value: progress, ...(caption ? { caption } : {}) },
    { kind: 'ticks', label: 'The eleven brief facts', ticks },
    { kind: 'note', label: 'Confirmation', body: confirmationBody },
  ]

  if (incoherent) {
    cards.push({
      kind: 'note',
      label: 'This reading does not add up',
      tone: 'exception',
      body: `The counter says ${input.collected} of ${input.total} and the facts above show ${ticked}. `
        + 'Nothing has changed and nothing is sending — reload before acting on either number.',
    })
  }

  // ⚠️ NO ACTIONS. There is nothing here for an operator to press: the brief is Milla’s to
  // collect and the confirmation is the client’s to give. A control offered at a moment it
  // cannot succeed teaches an operator to distrust every control beside it.
  return { subtitle, progress, cards }
}
