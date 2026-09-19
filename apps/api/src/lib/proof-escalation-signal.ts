// ══════════════════════════════════════════════════════════════════════════════════════════
// J7-C2 · "STILL NOT RIGHT", SAID IN CHAT, REACHES THE ONE CANONICAL ESCALATION (FD-3)
//
// ── THE GAP: THE ONLY WAY TO SAY IT WAS TO PRESS A BUTTON ──────────────────────────────
//
// `POST /leads/proof/still-not-right` is the canonical escalation and it works. It is reached
// by ONE control on the Proof panel. A client who instead types *"honestly these still aren't
// the right people"* into Milla got a conversational reply and nothing else: the desk chat
// returns text and only text, so their sentence reached no decision at all.
//
// FD-3 closes that: the signal is MODEL-INTERPRETED from what they actually said, and it goes
// to the SAME `closeCalibrationLoop(clientId, 'still_not_right')` the button calls. One
// escalation path, two ways of reaching it.
//
// ── AND THE HALF OF FD-3 THAT IS A PROHIBITION ──────────────────────────────────────────
//
// 🛑 *"silence/timers never."* `calibration-verdict`'s own header already records the founder's
// lock on this, and it is quoted here because this file is the one that could break it:
//
//     "Escalation to a human may be triggered ONLY by an explicit client action equivalent to
//      'Still not right'. Not by one prospect marked Not a fit, not by SEVERAL, not by an
//      UNKNOWN prospect, not by silence, not by a timer, not by the model's read of the
//      client's mood, and not by Attempt 2 completing."
//
// ⚠️ "MODEL-INTERPRETED" AND "THE MODEL'S READ OF THEIR MOOD" ARE NOT THE SAME THING, and the
// tool description below is where that line is drawn. Interpreting *"these still aren't
// right"* as the explicit statement it plainly is, is interpretation. Deciding from
// frustration, brevity, a delay or a run of rejections that somebody is probably unhappy is
// the thing the lock forbids — so the tool is described as recognising a STATEMENT, with the
// near-misses named.
//
// ⚠️ IT IS A TOOL, NOT A KEYWORD MATCH. A regex over "not right" escalates a client asking
// *"what happens if these aren't right?"* and misses *"still miles off"*. She talks; what she
// understood travels as structure — the same shape every other Milla door uses.
//
// ⚠️ THIS FILE DECIDES NOTHING AND WRITES NOTHING. It declares the tool and reads the answer
// out of a response. Whether that closes the loop is `calibrationVerdict`, and the write is
// `closeCalibrationLoop`, which is idempotent by predicate — so "once" is a property of the
// canonical path rather than a promise made here.
// ══════════════════════════════════════════════════════════════════════════════════════════

/** The tool name, used by the declaration and the reader. One spelling, one place. */
export const STILL_NOT_RIGHT_TOOL_NAME = 'client_says_still_not_right'

/**
 * The tool Milla calls when the client has plainly SAID the set is still not right.
 *
 * ⚠️ TYPED LOOSELY ON PURPOSE. `Anthropic.Tool` would pull the SDK into a module the pure
 * tests import; the shape is checked by the call site and by the guard.
 */
export const STILL_NOT_RIGHT_TOOL = {
  name: STILL_NOT_RIGHT_TOOL_NAME,
  description:
    'Call this ONLY when the client has just plainly SAID that the people you have shown them ' +
    'are still not right — for example "these still aren\'t the right people", "this is still ' +
    'miles off", "no, that second set was wrong too". It hands them to a member of our team.\n\n' +
    'Do NOT call it because they seem frustrated, because they are terse, because they have ' +
    'marked several prospects as not a fit, because they have gone quiet, because time has ' +
    'passed, or because you think they are probably unhappy. Those are readings of a mood and ' +
    'they are not a statement.\n\n' +
    'Do NOT call it when they are asking a question about it ("what if these aren\'t right?"), ' +
    'when they are describing a past set they have already told us about, or when they are ' +
    'asking for MORE examples of targeting they agree with.\n\n' +
    'If you are not sure whether they said it, do not call it — ask them.',
  input_schema: {
    type: 'object' as const,
    properties: {
      said: {
        type: 'string' as const,
        maxLength: 400,
        description: "The client's own words that say it, quoted from their message. Never your paraphrase.",
      },
    },
    required: ['said'],
  },
}

/** One content block of an Anthropic response, narrowed to what this reader needs. */
export interface ResponseBlock {
  type: string
  name?: string
  input?: unknown
}

export type StillNotRightRead =
  | { said: true; quote: string }
  | { said: false }

/**
 * Did this reply carry the explicit signal?
 *
 * ⚠️ THE TOOL CALL IS THE SIGNAL, AND THE QUOTE IS EVIDENCE. A tool call whose `said` is
 * empty is still the signal — the model called it — but the quote is reported as absent
 * rather than invented, because an escalation attributed to words nobody can produce is the
 * unfalsifiable shape this repo refuses everywhere.
 */
export function readStillNotRight(blocks: readonly ResponseBlock[] | null | undefined): StillNotRightRead {
  for (const b of blocks ?? []) {
    if (b.type !== 'tool_use' || b.name !== STILL_NOT_RIGHT_TOOL_NAME) continue
    const said = (b.input as { said?: unknown } | null)?.said
    return { said: true, quote: typeof said === 'string' ? said.trim().slice(0, 400) : '' }
  }
  return { said: false }
}
