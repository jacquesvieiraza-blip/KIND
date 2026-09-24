// #651 — THE INDUSTRY/PURPOSE SEQUENCING ENGINE (R38-amended + R39, founder-ruled 15 Aug).
//
// *"the squencing has to be a product of all. not an addition"* — sequencing is core to all
// three products and serves the client; this module is its one home. It holds THREE things
// that were previously either hard-coded or nowhere:
//
//   1. PURPOSE — a sequence written to book a meeting is not the sequence that fills an
//      event. The shape, the ask, and the ending all differ. Until now the product had one
//      shape (meeting) and no way to say otherwise.
//   2. DEPTH — 3 · 5 · 7, per campaign, the founder's judgement (R38 as amended: *"some are
//      3 steps. some are 5 and some are 7"*). 5 is the DEFAULT, never a law.
//   3. CADENCE — including the one thing the product could not express at all: a DATE. An
//      event sequence must count BACK from the event and finish before it. A day-21 breakup
//      email that lands after the user group is worse than sending nothing.
//
// ⚠️ THE CADENCE CONVENTION, WHICH THIS FILE MAKES SINGULAR:
// `wait_days` on a step is the delay AFTER that step, before the next one. That is what the
// send engine reads (`enrollmentStep` → `waitDaysNext` → `next_send_at = now + wait_days`),
// and the last step's value is never read. Two other places disagreed with it in production
// (see the PR body) and produced steps 1 and 2 landing on the SAME DAY. Everything now
// derives its cadence from here.

/** What a sequence is FOR. The shape follows from this, not from the industry. */
export type SequencePurpose = 'meeting' | 'event' | 'reactivation'
export const SEQUENCE_PURPOSES: SequencePurpose[] = ['meeting', 'event', 'reactivation']
export const DEFAULT_SEQUENCE_PURPOSE: SequencePurpose = 'meeting'

/** The depths an operator may choose. R38: 5 is the default only; the hard cap is 7. */
export const SEQUENCE_DEPTHS = [3, 5, 7] as const
export type SequenceDepth = typeof SEQUENCE_DEPTHS[number]
export const DEFAULT_SEQUENCE_DEPTH: SequenceDepth = 5

export function normalisePurpose(raw: unknown): SequencePurpose {
  const s = String(raw ?? '').trim().toLowerCase()
  return (SEQUENCE_PURPOSES as string[]).includes(s) ? (s as SequencePurpose) : DEFAULT_SEQUENCE_PURPOSE
}

/** Any unrecognised depth falls back to the default rather than throwing at the API edge. */
export function normaliseDepth(raw: unknown): SequenceDepth {
  const n = Number(raw)
  return (SEQUENCE_DEPTHS as readonly number[]).includes(n) ? (n as SequenceDepth) : DEFAULT_SEQUENCE_DEPTH
}

/**
 * Days to wait AFTER each step. Index 0 = the gap between step 1 and step 2; the final
 * entry is always 0 because nothing follows the last email.
 *
 * Meeting cadence at depth 5 matches R38's shipped default (4 · 5 · 5 · 7) exactly, so
 * turning this module on changes nothing for a campaign that made no choice.
 */
const CADENCE: Record<SequencePurpose, Record<SequenceDepth, number[]>> = {
  meeting: {
    3: [4, 5, 0],
    5: [4, 5, 5, 7, 0],
    7: [3, 4, 5, 5, 7, 7, 0],
  },
  // Reactivation talks to people who already know the sender: fewer touches, more room.
  reactivation: {
    3: [6, 8, 0],
    5: [5, 7, 7, 10, 0],
    7: [4, 6, 6, 7, 7, 10, 0],
  },
  // Event cadence is only a FALLBACK — with a date, `eventCadence()` overrides it entirely.
  event: {
    3: [5, 5, 0],
    5: [4, 4, 4, 3, 0],
    7: [3, 3, 3, 3, 3, 2, 0],
  },
}

export function stepCadence(purpose: SequencePurpose, depth: SequenceDepth): number[] {
  return [...CADENCE[purpose][depth]]
}

/** Never send two cold emails closer together than this — a same-day pair reads as spam. */
export const MIN_GAP_DAYS = 2
/** Land the final touch at least this far before the event, so it is still actionable. */
export const EVENT_BUFFER_DAYS = 2

export type EventCadence = {
  /** Wait-days AFTER each step, last entry 0. Always `depth` long. */
  gaps: number[]
  /** Days from now until the final email sends. */
  lastSendOffsetDays: number
  /**
   * false = the window is too short to fit `depth` steps at the minimum gap. The caller
   * MUST surface this rather than silently sending past the event: the gaps returned are
   * the tightest legal ones, and the last email would still land too late.
   */
  fits: boolean
  /** Whole days from `from` to the event. Negative/zero means the event has passed. */
  daysUntilEvent: number
}

/**
 * Build a cadence that COUNTS BACK from an event date.
 *
 * The whole point of #651's motivating case: sourcing can already find people near a
 * Mozambique user group, but nothing could write them a sequence keyed to the date it
 * happens. Here the last email lands `EVENT_BUFFER_DAYS` before the event and the rest are
 * spread evenly behind it, never closer than `MIN_GAP_DAYS`.
 */
export function eventCadence(
  depth: SequenceDepth,
  eventDate: Date,
  from: Date,
): EventCadence {
  const dayMs = 86400000
  const startOfDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const daysUntilEvent = Math.round((startOfDay(eventDate) - startOfDay(from)) / dayMs)

  // The window we may spread across: from today to the buffer before the event.
  const window = daysUntilEvent - EVENT_BUFFER_DAYS
  const gapsNeeded = depth - 1

  // A past/imminent event, or a single-step sequence, has nothing to spread.
  if (gapsNeeded <= 0 || window <= 0) {
    return {
      gaps: new Array(depth).fill(0),
      lastSendOffsetDays: 0,
      fits: window >= 0 && gapsNeeded <= 0,
      daysUntilEvent,
    }
  }

  const even = Math.floor(window / gapsNeeded)
  const gap = Math.max(MIN_GAP_DAYS, even)
  const gaps = new Array(gapsNeeded).fill(gap)

  // Spread the remainder one day at a time across the EARLY gaps, so the touches nearest
  // the event stay tight (interest peaks as the date approaches) rather than drifting.
  if (even >= MIN_GAP_DAYS) {
    let remainder = window - gap * gapsNeeded
    for (let i = 0; i < gaps.length && remainder > 0; i++, remainder--) gaps[i] += 1
  }

  const lastSendOffsetDays = gaps.reduce((a, b) => a + b, 0)
  return {
    gaps: [...gaps, 0],
    lastSendOffsetDays,
    // It only fits if the final email still lands before the buffer.
    fits: lastSendOffsetDays <= window,
    daysUntilEvent,
  }
}

// ── Templates: the SHAPE and the per-step brief. Never finished copy. ───────────────────
//
// R30 (no invented numbers) and R27 (never claim we contacted anyone) apply to every line
// here, because this text goes straight into the generation prompt. Guidance describes the
// JOB of each email; the model writes the words against the real lead and the client's own
// grounded knowledge.

export type SequenceTemplate = {
  /** Reads back to the operator, e.g. "Event invite — 5 touches". */
  name: string
  /** One line per step, in order, `depth` long. Fed to the generator as the step brief. */
  guidance: string[]
  /**
   * P31 — ONE ANGLE LABEL PER STEP, and no two may repeat.
   *
   * Before this, "add a NEW angle" was advice to a model inside a prose brief. Advice is not a
   * constraint: nothing could tell whether two steps had drifted into the same email, and
   * nothing would have failed if they had. The label makes the angle a checkable fact, and
   * `sequence-doctrine.test.ts` fails the build the moment two of them match.
   */
  angles: string[]
}

/**
 * ⚑ 24 Sep (R157) — THE VALUE SPINE: WHAT EVERY MEETING EMAIL CARRIES, IN THIS ORDER.
 *
 * The founder, reading House's version-2 sequence: *"weak outreach is not good. we need to be
 * effective on this part. from experience i know you need to add value here. what the problem
 * is. how it impacts. and the return on investment. and then soluition. outreach wording is
 * key"*. Asked what numbers the return may use, he chose **B — no numbers**: the return is put
 * in the READER's terms, never ours.
 *
 * ⚠️ IT SITS ON TOP OF THE P31 ANGLES, IT DOES NOT REPLACE THEM. The angle decides WHICH problem
 * an email opens on (why-now, a second commercial problem, proof, the objection…), so no two
 * emails argue the same thing; the spine is the SHAPE every one of them takes.
 *
 * ⚠️ AND IT CHANGES NO SAFETY RULE: no invented numbers or clients (R30), no link in a cold
 * email (5 Aug · P31), one low-friction question to close.
 */
export const VALUE_SPINE = [
  'EVERY EMAIL CARRIES THE VALUE SPINE, in this order, in plain words (founder-ruled 24 Sep, R157):',
  '1. THE PROBLEM — one specific problem this person has in their role, said the way they would say it. The step\'s angle decides which problem.',
  '2. THE IMPACT — what that problem is costing them right now: time, missed deals, a thin pipeline, wasted spend. Describe it; do not quantify it.',
  '3. THE RETURN — why fixing it pays for itself, put in THEIR terms. Frame it as a question or a conditional, e.g. "what is one more meeting with the right decision-maker worth to your team?" NEVER a number, percentage, price, result, timeframe or customer of our own — none may be invented.',
  '4. THE SOLUTION — what the sender does about it, only from the grounding block, then the step\'s one low-friction question.',
  'Keep all four inside the step\'s word limit. Short sentences. No step may skip the problem or the impact.',
].join('\n')

/** The per-purpose step briefs, written at depth 7 and trimmed to the chosen depth. */
const PURPOSE_STEPS: Record<SequencePurpose, string[]> = {
  // ── P31 · THE MEETING SEQUENCE SELLS THE RESPONSE ────────────────────────────────────────
  //
  // Founder doctrine, 21 Aug: step 1 sells the REPLY, not the meeting. Seven steps are seven
  // DIFFERENT arguments — "a step that only bumps is one attempt repeated". Every step below
  // is a distinct angle, labelled in MEETING_ANGLES, and the guard fails the build if two ever
  // collide.
  //
  // ⚠️ WHAT CHANGED, AND WHY IT IS NOT COSMETIC. The old set was already decent — it had a
  // no-ask value email and a real breakup, and it banned guilt tactics. Two things were wrong:
  // step 1 asked for "one question" with no floor on how big that ask could be, and there was
  // NO OBJECTION STEP anywhere in seven emails. The most common reason a warm prospect goes
  // quiet is an unvoiced objection, and nothing in the arc ever reached for it.
  meeting: [
    'WHY NOW — open on the personalization signal and the reason this is live for them THIS quarter. One sentence on what the sender does and why it matters to this person. Close with one soft INTEREST-BASED CTA — ask whether it is worth a look or whether this is already handled. NO LINK, NO ATTACHMENT AND NO BOOKING ASK in this email (founder-ruled 5 Aug, re-affirmed 21 Aug): a link to a stranger costs deliverability, and the link goes in the REPLY once they have raised their hand. The job of this email is a REPLY, not a booking. Max 70 words.',
    'A DIFFERENT COMMERCIAL PROBLEM — do not restate step 1. Name a second, distinct business cost this person carries, drawn from their real context. Same low-friction close. Max 60 words.',
    'PROOF — one concrete way the sender helps, drawn ONLY from the grounding block. If the grounding is silent, stay general and claim nothing. No invented numbers, no invented clients (R30). Max 60 words.',
    'THE OBJECTION — name out loud the most likely reason they have not replied ("you probably already have someone doing this", "the timing is wrong") and answer it in one honest line. Do not apologise for writing. Max 60 words.',
    'AN ALTERNATIVE ANGLE — reframe the problem a different way in case every earlier framing missed. A different reader in their seat should recognise themselves here. Max 50 words.',
    'NEW EVIDENCE — something that has changed or emerged since step 1: a fresh signal about their company, their market or their role. If there is genuinely nothing new, say something useful for their role instead and make no ask. Max 50 words.',
    'THE FINAL LOW-FRICTION QUESTION — this is the last email. One question answerable in a single word, a genuine open door, no guilt, no urgency tactics, no "just checking in". 3 sentences.',
  ],
  event: [
    'The invite — say plainly what the event is, where, and when. Why THIS person would find it worth their time, using the personalization signal. NO link in this first email (the 5 Aug lock stands for every purpose); ask if they would like the details. Max 70 words.',
    'The details — now include the joining/RSVP link on its own line. What happens at the event and roughly how long it takes. Max 60 words.',
    'The reason to come — one specific thing they will leave with. No pressure, no countdown language. Max 50 words.',
    'The who — the kind of people who will be in the room (roles, not names, and never a claim about who has confirmed). Max 50 words.',
    'The practical note — timing, format, anything that makes attending easy. Repeat the link once. Max 40 words.',
    'The near reminder — short, warm, the date and the link. Max 35 words.',
    'The last call — one line that it is nearly here, the link, and an easy no. Max 30 words.',
  ],
  reactivation: [
    'The re-open — acknowledge openly that you have spoken before. No pretending this is a first contact. One reason it is worth picking back up now. Max 60 words.',
    'The what-changed — one thing that is different since you last spoke, drawn only from the grounding block. Max 60 words.',
    'The value email — no ask; something useful for their role today. Max 60 words.',
    'The direct question — has anything changed on their side, answerable in one line. Max 40 words.',
    'The alternative — offer a smaller, easier next step than the one they passed on before. Max 50 words.',
    'The check-in — brief, human, no pitch. Max 40 words.',
    'The close — leave the door open for good, no guilt. 3 sentences.',
  ],
}

/**
 * Industry flavour. Deliberately SMALL and honest — a starter set, not a claim to know
 * every vertical. An unknown industry returns no flavour line rather than a guess, and the
 * generator still has the lead's real industry, the campaign intent and the client's
 * grounded knowledge to work from.
 */
/**
 * P31 — the angle each step argues, one label per step, NEVER two the same.
 *
 * `event` and `reactivation` keep their own arcs (founder-ruled: the seven-angle doctrine is for
 * `meeting` only — an event invite needs its link early and a reactivation opens on a real prior
 * relationship). But the DISTINCTNESS guard applies to all three, so no sequence of any purpose
 * can ever ship the same argument twice.
 */
const PURPOSE_ANGLES: Record<SequencePurpose, string[]> = {
  meeting: [
    'why-now',
    'different-commercial-problem',
    'proof',
    'objection',
    'alternative-angle',
    'new-evidence',
    'final-low-friction-question',
  ],
  event: [
    'the-invite',
    'the-details-and-link',
    'the-takeaway',
    'who-is-in-the-room',
    'the-practical-note',
    'the-near-reminder',
    'the-last-call',
  ],
  reactivation: [
    'the-re-open',
    'what-changed',
    'value-no-ask',
    'the-direct-question',
    'a-smaller-next-step',
    'the-human-check-in',
    'the-close',
  ],
}

const INDUSTRY_NOTES: { match: RegExp; note: string }[] = [
  { match: /recruit|staffing|talent|hr\b/i,
    note: 'Recruitment buyers are pitched constantly — lead with the specific role or team, never with "we help companies hire".' },
  { match: /logistic|freight|shipping|supply|transport|port/i,
    note: 'Operations buyers respond to cost, delay and capacity in concrete terms; keep the language operational, not marketing.' },
  { match: /promotional|merchandis|print|signage|branded goods|corporate gift/i,
    note: 'Buyers here order around events, seasons and campaigns — anchor to an occasion or a deadline rather than an ongoing service.' },
  { match: /construct|build|contractor|trade|electric|plumb|hvac/i,
    note: 'Write plainly and short. Reference the job type or site, never abstractions like "solutions".' },
  { match: /financ|account|insur|advis|broker/i,
    note: 'Regulated buyers are cautious: be precise, claim nothing about returns, and keep the ask small.' },
  { match: /software|saas|tech|it services|agency|marketing/i,
    note: 'This buyer recognises outreach instantly — be unusually direct and skip anything that sounds like a template.' },
  { match: /health|clinic|medical|dental|care/i,
    note: 'Time-poor and compliance-sensitive: one clear point, no urgency tactics, nothing that reads as a claim about outcomes.' },
]

export function industryNote(industry: string | null | undefined): string | null {
  const s = (industry ?? '').trim()
  if (!s) return null
  return INDUSTRY_NOTES.find(n => n.match.test(s))?.note ?? null
}

const PURPOSE_LABEL: Record<SequencePurpose, string> = {
  meeting: 'Meeting',
  event: 'Event invite',
  reactivation: 'Reactivation',
}

/** The shape + brief for a (purpose, depth) pair, with optional industry flavour appended. */
export function templateFor(
  purpose: SequencePurpose,
  depth: SequenceDepth,
  industry?: string | null,
): SequenceTemplate {
  const all = PURPOSE_STEPS[purpose]
  const allAngles = PURPOSE_ANGLES[purpose]
  // Trim to depth by keeping the OPENER and the CLOSER and dropping from the middle, so a
  // 3-step sequence is still a real arc rather than the first three emails of a longer one.
  // ⚠️ ANGLES ARE TRIMMED BY THE SAME RULE, in lockstep — if the two lists ever trimmed
  // differently, step 4's brief would carry step 6's angle label and every guard downstream
  // would be checking the wrong thing while staying green.
  const trim = <T,>(xs: T[]): T[] => depth >= xs.length
    ? [...xs]
    : [xs[0], ...xs.slice(1, xs.length - 1).slice(0, depth - 2), xs[xs.length - 1]]
  const guidance = trim(all)
  const angles = trim(allAngles)
  const note = industryNote(industry)
  if (note) guidance[0] = `${guidance[0]} INDUSTRY NOTE (applies to every email): ${note}`
  return { name: `${PURPOSE_LABEL[purpose]} — ${depth} touches`, guidance, angles }
}

/**
 * The complete brief the generator needs: what to write, how deep, and when each lands.
 * `dayOffsets` are days from the first send, so the prompt can say "Day 0 / Day 4 / …"
 * truthfully — including on an event cadence where the days are computed from a real date.
 */
export function sequencePlan(opts: {
  purpose?: SequencePurpose
  depth?: SequenceDepth
  industry?: string | null
  eventDate?: Date | null
  now?: Date
}): { purpose: SequencePurpose; depth: SequenceDepth; template: SequenceTemplate; gaps: number[]; dayOffsets: number[]; event?: EventCadence } {
  const purpose = opts.purpose ?? DEFAULT_SEQUENCE_PURPOSE
  const depth = opts.depth ?? DEFAULT_SEQUENCE_DEPTH
  const template = templateFor(purpose, depth, opts.industry)

  let gaps: number[]
  let event: EventCadence | undefined
  if (purpose === 'event' && opts.eventDate) {
    event = eventCadence(depth, opts.eventDate, opts.now ?? new Date())
    gaps = event.gaps
  } else {
    gaps = stepCadence(purpose, depth)
  }

  // Day offsets: step 1 is day 0, each subsequent step adds the PREVIOUS step's gap.
  const dayOffsets: number[] = [0]
  for (let i = 0; i < gaps.length - 1; i++) dayOffsets.push(dayOffsets[i] + gaps[i])

  return { purpose, depth, template, gaps, dayOffsets, event }
}

/**
 * ⚑ 24 Sep — the programme's steps in the LINTER's cadence convention. Stored steps carry the
 * gap AFTER each step (the last one is never read); `lintSequence` reads the gap BEFORE each step
 * (step 1's is 0). Same subjects and bodies, only `wait_days` re-expressed. Used by `programme-sequence-generation.ts` at its lint call.
 */
export function gapsBeforeEachStep<T extends { wait_days: number }>(steps: T[]): T[] {
  return steps.map((s, i) => ({ ...s, wait_days: i === 0 ? 0 : steps[i - 1].wait_days }))
}
