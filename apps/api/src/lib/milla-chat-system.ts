// MILLA'S LIVE CONTEXT — the numbers she speaks from, and the one prompt both chats share.
//
// WHY THIS FILE EXISTS (12 Aug, found on the founder's own screenshot mid-demo-prep).
// A client asked Milla "How is my ROI looking?" while standing on a screen that showed
// 22 leads awaiting, 2 meetings booked and a 50% reply rate — and she answered "I don't have
// access to your specific ROI data … share or upload your relevant data", then printed a
// raw-markdown formula table the panel can't render. Three defects, one root: NOTHING was
// ever passed to her.
//
// ══ ⚑ 30 Aug (BUILD-004A-2) — AND THEN THIS FILE BECAME THE DEFECT ══════════════════════
//
// 🛑 EVERY RETIRED CONCEPT THE FOUNDER HEARD MILLA SAY ON HIS LIVE WALK WAS TAUGHT HERE.
// He asked "How many leads am I waiting on?" and she answered with "22 leads awaiting your
// decision", pointed him at the "New leads page", and described approving and passing
// individual prospects into an active pipeline. Asked about ROI she reached for cost per
// lead and campaign metrics. None of that was hallucination — she was reciting this prompt,
// which said, verbatim:
//
//   · "You are Milla, the client's campaign partner"
//   · "The client approves or passes every prospect"
//   · "$299 to start with 100 approved leads included, then $4 per approved lead"
//   · "The portal pages you may point them to: New leads (approve/pass) … My campaign"
//   · and a snapshot block leading with "Leads awaiting their decision", "Wallet: $N",
//     "Their $299 pack: N of 100 included approvals used … then $4 each"
//
// The UI stopped teaching the retired model in 4A-1. Milla kept teaching it, in her own
// voice, on every new answer — which is worse, because a screen can be re-read and a
// sentence from Milla is taken as what the company just told you.
//
// ⚠️ THE FIX IS THE MODEL SHE IS GIVEN, NOT A LIST OF BANNED WORDS. She now describes the
// programme: the outcome the client asked for, the stage it is in, what has been delivered
// against what was authorised, and the two 50% payments. There is no wallet, no pack, no
// per-lead price and no per-lead approval in the product, so there is none in her context —
// she cannot quote a number she was never given.
//
// ⚠️ HISTORICAL CONVERSATIONS ARE NOT TOUCHED. Nothing here rewrites a stored message. This
// changes what she says NEXT; what she said before is a record of what we told them then.

import { type CustomerProgramme } from './customer-programme'

/** The slice of /leads/milla-summary the chat needs. Kept structural so the summary
 *  builder's richer payload satisfies it without a cast.
 *
 *  ⚠️ THE RETIRED FIELDS ARE DELIBERATELY ABSENT. `wallet_balance_usd`, `pack`,
 *  `leads_awaiting` and `leads_approved_total` are still ON the summary payload — legacy
 *  clients and the operator side read them — but they are not in this interface, so they
 *  cannot reach the model even by accident. Removing them here is the guard.
 */
export interface MillaSnapshot {
  /** Booked meetings this month, and all time. The outcome, not the mechanism. */
  meetings_booked: number
  meetings_total: number
  replies_total: number
}

/** Money the client can read, derived from the programme row — never typed. */
function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

/**
 * The client's programme, in plain English — or an honest refusal to guess.
 *
 * ⚠️ A FAILED READ IS NOT "NO PROGRAMME", HERE TOO. `null` gets an explicit "you cannot see
 * it" block. The one thing she must never do is tell a paying client their programme does
 * not exist because a query failed.
 */
export function describeProgramme(prog: CustomerProgramme | null): string {
  if (!prog) {
    return 'THEIR PROGRAMME COULD NOT BE READ for this conversation (the lookup failed). ' +
      'Do NOT invent or estimate anything about it, and do NOT say they have no programme — ' +
      'you do not know that. Say you cannot see it right now and that nothing has changed.'
  }
  const lines: string[] = ['THIS CLIENT\'S PROGRAMME (real, current — use it; never contradict it):']
  lines.push(`- Stage: ${prog.stage}${prog.paused ? ' (PAUSED)' : ''}${prog.reviewOpen ? ' — a review decision is waiting on us' : ''}`)

  // The outcome is what they bought. Option C: only a meetings programme exists in the
  // engine today, and a target of null means one has not been set — not that it is zero.
  lines.push(prog.outcome.target
    ? `- Outcome they asked for: ${prog.outcome.target} booked meetings`
    : '- Outcome: no target is set on their programme yet')

  // ⚠️ DELIVERED AGAINST AUTHORISED, both straight off the row. Never a percentage of a
  // target she was not given, and never a projection.
  if (prog.progress.authorised > 0) {
    lines.push(`- Sourcing: ${prog.progress.delivered} of ${prog.progress.authorised} people authorised for this programme`)
  }
  lines.push(prog.progress.outcomesAchieved === null
    // null is UNREADABLE, and saying "0 meetings" to a client who has three is the most
    // damaging false statement available on this subject.
    ? '- Meetings booked: UNREADABLE right now — do not state a number, say you cannot see it'
    : `- Meetings booked so far: ${prog.progress.outcomesAchieved}`)

  // The two 50% payments — the entire customer commercial model.
  if (prog.money.totalCents > 0) {
    lines.push(`- Programme value: ${money(prog.money.totalCents)} total, paid in two halves of ${money(prog.money.totalCents / 2)}`)
    // ⚠️ TIED TO THE LIFECYCLE STEP NUMBERS, so this per-client block and the sequence above
    // cannot describe the same gate two different ways — the gap that caused the 31 Aug walk.
    lines.push(`- Payment 1 (step 3 — authorises sourcing and preparation only): ${prog.money.firstPaidAt ? 'PAID' : 'not paid yet'}`)
    lines.push(`- Payment 2 (step 7 — after the programme approval at step 6; authorises outreach): ${prog.money.secondPaidAt ? 'PAID' : 'not paid yet'}`)
  } else {
    lines.push('- No programme price has been set yet — do NOT quote any figure.')
  }
  lines.push('Anything NOT listed here you do not have. Say so plainly; never estimate.')
  return lines.join('\n')
}

/** The outcomes their programme has actually produced. */
export function describeOutcomes(snap: MillaSnapshot | null): string {
  if (!snap) {
    return 'Their reply and meeting counts are unavailable for this conversation (the lookup ' +
      'failed). Do NOT invent or estimate any figure — say you cannot see it right now.'
  }
  return [
    'WHAT THE WORK HAS PRODUCED (real, current):',
    `- Replies all-time: ${snap.replies_total}`,
    `- Meetings all-time: ${snap.meetings_total} (${snap.meetings_booked} this month)`,
  ].join('\n')
}

// ══ ⚑ 31 Aug (BUILD-004A-2A live walk) — THE ORDERED LIFECYCLE, WITH ITS GATES ═════════
//
// 🛑 WHAT WENT WRONG, AND IT WAS A GAP RATHER THAN A FALSEHOOD. The prompt gave Milla two
// separate lists and no mapping between them:
//
//   · the stage ORDER — "Proof, Recommendation, Sourcing, Approval, Live, Review, Completion"
//   · the money RULE  — "Payment 1 (50%) authorises sourcing and preparation. After the
//                        client approves the programme, Payment 2 … authorises outreach."
//
// Both sentences are true. Neither says WHERE the payments sit inside the order, so she
// interpolated — which is what a model does with a gap — and produced, on the founder's own
// walk:
//
//   ✗ "Once that's done and you've approved the programme direction, we'll move into
//      sourcing and outreach."          → sourcing and outreach collapsed into one step
//   ✗ "Outreach starts after two things happen: 1. You approve the programme 2. Payment 2
//      lands"                            → approval placed directly after Proof, skipping
//                                          Recommendation, Payment 1, sourcing and review
//
// ⚠️ THE FIX IS ONE SEQUENCE, NOT A BAN LIST. Stages and gates are interleaved in a single
// ordered list, so there is no gap left to interpolate across. Hard-coding answers to those
// two questions would have fixed two sentences and left every neighbouring question wrong.
//
// ⚠️ THE TWO "REVIEWS" ARE DIFFERENT THINGS, and this is the trap in the sequence. Step 5 is
// the CLIENT reading what we prepared, before they approve. The `Review` STAGE is something
// else entirely: a hold raised on an already-LIVE programme (programme-stage.ts:80). Naming
// them apart here is what stops her merging them the way she merged sourcing and outreach.

/** The customer-facing lifecycle, in order, with the gate at each step. Founder-locked. */
export const PROGRAMME_LIFECYCLE: readonly string[] = [
  '1. PROOF — a small free calibration set: real people who match their targeting, masked, ' +
    'nobody contacted. They react "looks right" or "not a fit" so we learn what they mean by ' +
    'a good prospect. Nothing is paid and nothing is sent.',
  '2. RECOMMENDATION — we propose the programme: the outcome, the shape of the work, the price.',
  '3. PAYMENT 1 — the first 50%. It authorises SOURCING AND PREPARATION ONLY. No outreach ' +
    'is authorised by it and nobody is contacted after it.',
  '4. SOURCING / PREPARATION — we source the people and prepare the programme. Still no outreach.',
  '5. THE CLIENT REVIEWS what we have prepared. (This is NOT the "Review" stage, which is a ' +
    'hold raised later on an already-live programme.)',
  '6. APPROVAL — ONE approval of the whole programme, not a decision per person.',
  '7. PAYMENT 2 — the remaining 50%, after that approval. THIS is what authorises outreach.',
  '8. LIVE — outreach runs and the outcome is worked.',
  '9. REVIEW / COMPLETION — a review hold can pause decisions on a live programme; ' +
    'completion is the end of the programme.',
] as const

/**
 * The sequencing rules that stop the two collapses the founder caught.
 *
 * ⚠️ STATED AS PROHIBITIONS AS WELL AS ORDER. The ordered list alone is not enough: she had
 * an ordered list before and still merged two of its steps, because nothing said they were
 * distinct gates rather than one transition described twice.
 */
export const LIFECYCLE_RULES: readonly string[] = [
  'SOURCING AND OUTREACH ARE NOT THE SAME TRANSITION and never begin together. Sourcing is ' +
    'authorised by Payment 1 (step 3). Outreach is authorised by Payment 2 (step 7). Four ' +
    'steps sit between them. Never say we "move into sourcing and outreach".',
  'APPROVAL DOES NOT FOLLOW PROOF. Between Proof and the programme approval come the ' +
    'Recommendation, Payment 1, the sourcing and preparation work, and the client reading ' +
    'what we prepared. Never present approval as the next thing after Proof.',
  'NEVER DESCRIBE PAYMENT 2 OR OUTREACH WITHOUT THE STEPS THAT PRECEDE THEM. If asked when ' +
    'outreach starts, name Payment 1, sourcing/preparation and the approval that come first.',
  'NOTHING IS CONTACTED BEFORE PAYMENT 2. Not during Proof, not after Payment 1, not during ' +
    'sourcing.',
  'Answer from the step the client is actually on. Their current stage is in their programme ' +
    'block below; describe what is next for THEM, not the whole list, unless they ask for it.',
] as const

/**
 * The lifecycle, re-stated for the FINAL user turn.
 *
 * ══ ⚑ 31 Aug — WHY A SYSTEM PROMPT WAS NOT ENOUGH, PROVEN AT RUNTIME ════════════════════
 *
 * 🛑 #1616 PUT THE ORDERED LIFECYCLE IN THE SYSTEM PROMPT, DEPLOYED, AND BOTH ACCOUNTS
 * STILL ANSWERED THE OLD WAY. The route-level test in `routes/milla-chat.route.test.ts`
 * settled why, by capturing the literal payload production sends: the system prompt was
 * correct AND the last ten messages of the thread were replayed alongside it — and on House
 * and MBF those messages are Milla's OWN pre-#1616 answers, stating the wrong sequence in
 * her own voice.
 *
 * One system block versus ten in-context assistant turns that agree with each other is not
 * a fair fight. Ten consistent turns read as demonstrated behaviour, and the model continues
 * the pattern. The contradiction sat AFTER the prompt in the payload, so rewriting the
 * prompt a third time would not have moved it.
 *
 * ⚠️ SO THE TRUTH IS RE-ASSERTED WHERE IT IS READ LAST — immediately before the question,
 * after the stale turns. Position, not more words.
 *
 * ⚠️ AND HISTORY IS NOT EDITED TO ACHIEVE IT. Deleting or rewriting those stored answers
 * would make the product lie about what it told them at the time. They stay; they are simply
 * no longer the most recent thing the model reads.
 */
export function buildLifecycleReassertion(): string {
  return [
    'CURRENT PROGRAMME TRUTH — this overrides anything earlier in this conversation, ' +
      'including answers you gave before. If an earlier answer of yours contradicts the ' +
      'sequence below, the sequence below is right and the earlier answer was wrong.',
    'THE PROGRAMME LIFECYCLE, IN ORDER. Every step is a distinct gate:',
    PROGRAMME_LIFECYCLE.join('\n'),
    LIFECYCLE_RULES.join('\n'),
  ].join('\n\n')
}

/**
 * The ONE system prompt for both Milla chat doors (the desk session chat and the
 * stateless side panel). Product facts here must describe the CURRENT product — the
 * truth test in milla-chat-truth.test.ts pins every claim.
 */
export function buildMillaChatSystem(
  snap: MillaSnapshot | null,
  prog: CustomerProgramme | null = null,
): string {
  return [
    // ⚠️ WHO SHE IS. "Programme partner", not "campaign partner" — the customer bought a
    // programme; "campaign" is our internal word for the delivery mechanism.
    "You are Milla, the client's programme partner inside the Milla portal (M&V).",

    // ── THE PRODUCT, AS IT ACTUALLY IS ────────────────────────────────────────────────
    // 🛑 THE CLIENT STATES AN OUTCOME. WE DO THE WORK. That sentence is the product, and
    // every retired concept below it was a way of making the client do the work instead.
    'THE PRODUCT: the client tells you the OUTCOME they want. K.I.N.D designs a PROGRAMME to ' +
      'deliver it, sources the right people, runs the outreach and books the outcome. The ' +
      'client does not work a queue of prospects and does not configure how we deliver.',
    // ⛓️ 31 Aug — ONE SEQUENCE REPLACES TWO UNCONNECTED LISTS. The stage order and the money
    // rule used to be separate paragraphs; she was never told where the payments sat inside
    // the order, so she guessed. See the note above PROGRAMME_LIFECYCLE.
    'THE PROGRAMME LIFECYCLE, IN ORDER. Every step is a distinct gate — do not merge two of ' +
      'them, and do not skip any when explaining what happens next:\n' +
      PROGRAMME_LIFECYCLE.join('\n'),
    // The money is the RULE, never a figure — the amounts come from their own programme row
    // below, so a client without a price set is never quoted one.
    'THE MONEY: a programme has ONE price, paid in two halves — Payment 1 at step 3 and ' +
      'Payment 2 at step 7 above. There is no subscription.',
    LIFECYCLE_RULES.join('\n'),

    // 🛑 THE RETIRED MODEL, NAMED SO SHE CANNOT REACH FOR IT. She is fluent in generic
    // lead-gen and will default to it the moment the prompt leaves a gap — which is exactly
    // what produced "cost per lead" and "campaign metrics" on the founder's walk.
    'RETIRED — these do NOT exist and you must never mention, offer, price or explain them: ' +
      'a wallet or wallet balance, credits or credit plans, topping up, a per-lead price, ' +
      'paying per approved lead, a 100-lead starter pack, a "New leads" page, approving or ' +
      'passing individual prospects to buy them, cost per lead, or lead-gen "campaign ' +
      'metrics" as the way to judge the work. If a client mentions any of them — they may be ' +
      'reading an older message from you — explain what their programme actually is instead. ' +
      'Never invent a replacement price, discount, credit or referral reward. ' +
      // ⚠️ THE PROHIBITION LIVES IN EXACTLY ONE PARAGRAPH, and this sentence is why it is
      // folded in here rather than standing alone: it is the only OTHER place a retired term
      // could legitimately appear, and two prohibition paragraphs make the guard that scans
      // for leakage impossible to write honestly.
      'Judge the work by the OUTCOME — meetings booked, replies, the target on their ' +
      'programme — and by programme progress; never by cost per lead or leads approved.',
    'Meetings are ONE kind of outcome, not the whole product. If a client wants a different ' +
      'outcome, capture what they actually want in your own words and tell them a person will ' +
      'shape the programme around it. Do NOT price a non-meeting outcome — no rule exists for ' +
      'it and inventing one would put a number in front of them that nothing supports.',

    // Where things live — the REAL rail, so "where do I…" answers point somewhere that exists.
    'The portal pages you may point them to: Home (talk to you, and the Proof calibration set ' +
      'when they are at Proof), Programme, Pipeline, Meetings, Replies, My ICP, Documents, ' +
      'Reports, Coaching, Billing. There is no "New leads" page and no approval queue.',

    // Live context — the whole point of the 12 Aug fix, now on programme truth.
    describeProgramme(prog),
    describeOutcomes(snap),

    // Behaviour.
    'Answer in 2–4 short sentences unless asked for a full draft. Warm, plain, founder-to-founder.',
    // The renderer only supports **bold** — everything else prints as literal characters.
    'FORMAT: plain conversational text only. **bold** is the ONLY formatting that renders. ' +
      'Never use markdown headings, tables, blockquotes, code blocks, or link syntax — they ' +
      'appear to the client as raw # and | characters.',
    'Never invent metrics, prices, or features. You cannot pause a programme, source people, ' +
      'take a payment or change an ICP yourself — a human operator does that; tell the client ' +
      'their message has reached the team when they ask for an action.',
    'If something needs a human, say so and point to hello@get-kind.com.',
  ].join('\n\n')
}
