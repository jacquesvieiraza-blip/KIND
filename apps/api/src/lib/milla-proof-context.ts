// ═══════════════════════════════════════════════════════════════════════════════════════
// WHAT MILLA CAN SEE OF THE SET SITTING BESIDE HER (C06).
//
// ── THE LIVE DEFECT (canary, 10 Sep) ────────────────────────────────────────────────────
//
// The client's Proof set was ON THE SCREEN, twenty masked cards with bands, scores, "why
// this fits" sentences and their own reactions against them — and Milla, in the column
// immediately to the left, had been told exactly one fact about it: whether the desk was
// empty or not (`calibration_set_on_desk`, added 3 Sep). So a client who asked "why is that
// consultancy in there?" or "what did you change?" was talking to someone who could not see
// the thing they were both looking at, and she answered from the lifecycle instead.
//
// ⚠️ A GAP, NOT A HALLUCINATION — the same shape as every other defect in this file's
// neighbour, `milla-chat-system.ts`. She cannot be prohibited into knowing what is on the
// desk. So the desk is given to her.
//
// ── 🛑 WHAT SHE STILL MAY NOT DO WITH IT (founder-locked 10 Sep) ────────────────────────
//
//   · "Show me stronger examples" is an ACTION on the client's screen — a spend gate the
//     server opens or refuses (`proofUiState`). It is NOT something she offers, promises or
//     performs in conversation, and a chat that can trigger a pass is a spend rule with no
//     server behind it.
//   · There is NO separate paid sourcing from chat, from a card, or as "find more like
//     these". That chip existed and is gone; she must not reinstate it in prose.
//   · The identities are not hers to give. She is handed the MASKED card — role, company,
//     industry, country, band, capped score, why-it-fits — and never a name, email or phone,
//     because nothing in this product reveals a Proof contact and a model cannot leak a
//     field it was never given.
//
// ⚠️ THE CARDS ARE DESCRIBED WITH THE BAND, NEVER WITH A RANK. The band comes from
// `proof-fit.ts` — the one derivation every surface reads — so she cannot describe the worst
// card in a set as one "we'd start with" for having been in the list, which is the exact
// defect C04/C05 removed from the screen. Her sentence and the card the client is reading
// must say the same thing.
// ═══════════════════════════════════════════════════════════════════════════════════════

import {
  type AttemptSummary, type CardVerdict, type ProofReasonCode, PROOF_REASON_LABELS,
} from './proof-calibration'
import { type FitBand } from './proof-fit'

/** One masked card, exactly as the client's screen received it. */
export interface ProofChatCard {
  role: string
  company: string
  industry: string | null
  country: string | null
  /** `start_here` · `worth_a_look` · `not_a_fit` — from `proof-fit.ts`, never re-derived. */
  band: FitBand
  bandLabel: string
  /** The DISPLAYED score, already capped to agree with the band. Null when unscored. */
  score: number | null
  whyFits: string | null
  /** What the client did to THIS card, if anything. */
  reaction: CardVerdict | null
}

export interface ProofChatContext {
  /** The masked cards currently in front of them. Empty means an empty desk. */
  onDesk: ProofChatCard[]
  /** `clients.proof_passes_done` — 0, 1 or 2. The attempt they are ON. */
  attempt: number
  /** Both passes as the client left them: counts, reasons, and their own words. */
  attempts: AttemptSummary[]
  /** The one sentence about what pass 2 changed, or null when there is nothing true to say. */
  whatChanged: string | null
  /** A person is handling their calibration; nothing may be offered. */
  escalated: boolean
  /** Is the improved-set ACTION open right now? Decided by `proofUiState`, never here. */
  strongerAvailable: boolean
  /** The founder's sentence under a disabled improved-set control, when it is disabled. */
  strongerHint: string | null
}

const reasonLine = (reasons: Partial<Record<ProofReasonCode, number>>): string => {
  const given = (Object.entries(reasons) as [ProofReasonCode, number][])
    .filter(([, n]) => (n ?? 0) > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([code, n]) => `${PROOF_REASON_LABELS[code]} ${n}`)
  return given.length > 0 ? given.join(', ') : 'no reasons given'
}

const REACTION_WORD: Record<CardVerdict, string> = {
  looks_right: 'they marked it LOOKS RIGHT',
  not_a_fit: 'they marked it NOT A FIT',
}

function describeCard(c: ProofChatCard, i: number): string {
  const bits = [`${i + 1}. ${c.role} at ${c.company}`]
  const where = [c.industry, c.country].filter(Boolean).join(', ')
  if (where) bits.push(`(${where})`)
  bits.push(`— ${c.bandLabel}`)
  if (c.score !== null) bits.push(`, score ${c.score}`)
  if (c.reaction) bits.push(`, ${REACTION_WORD[c.reaction]}`)
  const head = bits.join(' ').replace(/ ,/g, ',')
  return c.whyFits ? `${head}\n   Why it fits: ${c.whyFits}` : head
}

/**
 * The Proof block for the system prompt.
 *
 * ⚠️ `null` IS "COULD NOT BE READ", NOT "THERE IS NONE" — the same rule as
 * `describeProgramme`. Telling a client their Proof set does not exist because a query
 * failed is the most damaging sentence available on this subject.
 */
export function describeProofContext(ctx: ProofChatContext | null): string {
  if (!ctx) {
    return 'THEIR PROOF SET COULD NOT BE READ for this conversation (the lookup failed). Do ' +
      'NOT describe any example, band, score or reaction, and do NOT say they have no set — ' +
      'you do not know that. Say you cannot see it right now.'
  }

  const lines: string[] = []

  // ── THE RULES COME FIRST, because they hold whatever the desk contains ────────────────
  lines.push(
    'THE PROOF CALIBRATION SET — WHAT YOU MAY AND MAY NOT DO:',
    '- "Show me stronger examples" is a BUTTON on their screen, and whether it is available ' +
      'is decided by the server. You do NOT run it, promise it, or offer it as something you ' +
      'will do. If they want an improved set, tell them the control is on their Proof panel ' +
      'and what it needs from them.',
    '- There is NO way to buy more examples, source more people, or "find more like these" ' +
      'from this conversation or from a card. Never offer one, at any price, and never say ' +
      'you are searching or will search.',
    '- You have the MASKED cards only. You do not have any name, email address or phone ' +
      'number for these people and there is no way to reveal one. Never imply otherwise.',
    '- Describe a card by its BAND ("We’d start here" / "Worth a look"), never as a rank, ' +
      'a position in a list, or "our top pick". The band is about that one person.',
  )

  if (ctx.escalated) {
    // 🛑 FIRST AND UNCONDITIONAL. They have been told "I've paused finding people until
    // we've spoken", and an offer of any kind in the same conversation makes that a lie.
    lines.push(
      '🛑 THIS CLIENT\'S CALIBRATION HAS BEEN HANDED TO A PERSON. Both automatic attempts are ' +
        'used and someone from the team will contact them. Targeting is PAUSED. Do NOT offer ' +
        'another set, do NOT offer to look again, and do NOT suggest changing the targeting ' +
        'to unlock anything — say a person is picking this up and that nothing is being ' +
        'searched meanwhile. Do NOT promise a time or a day; no such commitment exists.',
    )
  }

  // ── WHERE THEY ARE IN THE TWO ATTEMPTS ───────────────────────────────────────────────
  lines.push(
    `- Automatic attempts used: ${ctx.attempt} of 2. There are exactly two, then a person ` +
      'takes over. Never offer a third.',
  )
  if (!ctx.escalated) {
    lines.push(ctx.strongerAvailable
      ? '- The improved-set control is AVAILABLE to them right now.'
      : `- The improved-set control is NOT available right now.${ctx.strongerHint ? ` What it needs: ${ctx.strongerHint}` : ''}`)
  }
  if (ctx.whatChanged) {
    // ⚠️ HER SENTENCE ABOUT THE CHANGE IS THE SCREEN'S SENTENCE. Both come from
    // `whatChangedSentence`, so she cannot claim a different change than the panel states.
    lines.push(`- What changed for this attempt, in the words already shown to them: "${ctx.whatChanged}"`)
  }

  // ── WHAT THEY TOLD US, PER PASS ───────────────────────────────────────────────────────
  if (ctx.attempts.length === 0) {
    lines.push('- They have not reacted to any example yet.')
  } else {
    for (const a of ctx.attempts) {
      lines.push(`- Attempt ${a.pass}: ${a.surfaced} shown, ${a.looksRight} looked right, ` +
        `${a.notAFit} not a fit. Reasons: ${reasonLine(a.reasons)}.`)
      for (const n of a.notes.filter(n => n.trim())) {
        // ⚠️ VERBATIM. Their words are the most useful thing in this block and the easiest
        // to ruin by tidying — a paraphrase is our sentence attributed to them.
        lines.push(`  Their words, exactly: "${n.trim()}"`)
      }
    }
  }

  // ── THE DESK ITSELF ───────────────────────────────────────────────────────────────────
  if (ctx.onDesk.length === 0) {
    lines.push('- THEIR DESK IS EMPTY RIGHT NOW — there are no examples in front of them. Do ' +
      'NOT describe any example, and do not say a set is on their screen.')
  } else {
    lines.push(`- ON THEIR SCREEN NOW (${ctx.onDesk.length} masked examples, nobody contacted):`)
    lines.push(...ctx.onDesk.map((c, i) => `  ${describeCard(c, i)}`))
  }

  lines.push('Anything about this set that is not listed above you do not have. Say so plainly; never estimate.')
  return lines.join('\n')
}
