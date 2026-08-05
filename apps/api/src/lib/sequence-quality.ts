// #612 — THE SEQUENCE QUALITY GATE. World-class copy, enforced before a warm box ever sends.
//
// Founder-ruled 4 Aug: *"our sequence and outreach must be world class. shit emails out =
// zero meetings booked. for all clients."*
//
// ⚠️ WHY THIS HAD TO EXIST BEFORE 25 AUG, AND NOT AFTER. Four Google mailboxes finish warming
// around 25 Aug. The FIRST sends out of those boxes set the domains' reputation, and that is
// not a number that resets — a bad first batch does not merely book zero meetings, it burns
// three weeks of warming and the domains with it. Every other guard in this repo protects
// money or data; this one protects the only asset we cannot re-buy.
//
// AND THE EVIDENCE SAYS COPY IS THE MULTIPLIER, not volume. The Gong/30MPC dataset (85M+ cold
// emails) puts the average rep at ~344 emails per booked meeting while the top quartile books
// 4.3× more from the same send volume. Whether our funnel lands nearer 500:1 or 1,000:1 is
// decided here, in the words — not in the sending.
//
// ── WHAT THIS FILE IS AND IS NOT ────────────────────────────────────────────────────────
//
// It is PURE: steps in, verdicts out. No database, no environment, no network — so every rule
// is provable without sending anything to anyone, which is the only way to test a linter whose
// failure mode is "a real prospect received this."
//
// It does NOT judge whether the copy is *persuasive*. No linter can. It enforces the
// mechanical floor that separates a professional cold email from one that gets marked spam:
// the rules below are each a thing that demonstrably costs deliverability or replies, and each
// one is a thing a human reviewer forgets at 11pm on the fourth sequence of the evening.
//
// ── TWO SEVERITIES, AND THE SPLIT IS DELIBERATE ─────────────────────────────────────────
//
//   • HARD — blocks activation. Reserved for things that are WRONG, not merely weak: legal
//     exposure (no opt-out), reputation damage (spam vocabulary), and copy that is structurally
//     not a cold email at all (no personalisation, a bare bump).
//   • WARN — shown, never blocks. Style and craft. A warn that blocked would make the gate
//     something an operator learns to route around, and a gate people route around protects
//     nothing. Only hard-fails stop the send.
//
// Every violation carries the STEP it is on and a founder-plain reason. A violation without a
// reason is not actionable — it is just a red light with no instruction attached.

import { hasProspectToken } from './sequence-tokens'

export type QualityStep = {
  subject?: string | null
  body?: string | null
  wait_days?: number | null
}

export type Severity = 'hard' | 'warn'

export type Violation = {
  /** Stable machine name — the tests and the UI both key off this, never off the prose. */
  rule: string
  severity: Severity
  /** 1-based step number, or null when the rule is about the sequence as a whole. */
  step: number | null
  /** One sentence, founder-plain, saying what to do about it. */
  why: string
}

export type QualityReport = {
  violations: Violation[]
  hardFails: Violation[]
  warnings: Violation[]
  /**
   * What was CHECKED and passed. A clean sequence that renders as silence is indistinguishable
   * from a check that never ran — the #565/#576 shape this repo keeps meeting. A green must
   * name what it looked at.
   */
  passes: string[]
  /** True when nothing hard-failed. This is the value the activation gate reads. */
  ok: boolean
}

// ── THE SPAM VOCABULARY ───────────────────────────────────────────────────────────────────
//
// Each term is here for a reason and the reason is written down, because a list nobody can
// argue with is a list nobody maintains. These are terms that filters weight heavily AND that
// no good cold email needs — the test for inclusion is "would removing this ever weaken a
// legitimate first-touch email?" If yes, it belongs in WARN or nowhere.
const SPAM_TERMS: [string, string][] = [
  ['act now', 'urgency language filters score heavily, and a stranger has no reason to hurry'],
  ['limited time', 'same family as "act now" — manufactured scarcity in a first touch reads as a scam'],
  ['risk free', 'a classic filter trigger; it also invites the question of what the risk was'],
  ['risk-free', 'a classic filter trigger; it also invites the question of what the risk was'],
  ['100% free', 'the percent sign next to "free" is one of the oldest spam signatures there is'],
  ['no obligation', 'reassurance nobody asked for reads as pressure, and filters treat it as sales boilerplate'],
  ['click here', 'the single most-flagged call to action in email, and a link in a cold first touch is its own problem'],
  ['buy now', 'nobody buys from a first cold email; asking is what gets the domain reported'],
  ['order now', 'as above — a transaction ask in a cold email is a spam signature'],
  ['special promotion', 'promotional vocabulary belongs in marketing mail people opted into'],
  ['cash bonus', 'money-incentive language is heavily weighted by filters'],
  ['guaranteed', 'an absolute promise to someone who has never met you is both unbelievable and flagged'],
  ['once in a lifetime', 'hyperbole; filters weight it and readers discount it'],
  ['this is not spam', 'saying it is the strongest possible signal that it is'],
  ['dear friend', 'the canonical un-personalised opener — it announces a mass send'],
  ['congratulations', 'unearned congratulation is a phishing and lottery-scam signature'],
  ['winner', 'lottery vocabulary — filters weight it near-absolutely'],
  ['urgent', 'nothing about a first cold email is urgent to the person receiving it'],
]

/** Opt-out phrasings we accept as an honest way out. Wide on purpose — the point is that ONE exists. */
const OPT_OUT_PATTERNS: RegExp[] = [
  /unsubscrib/i,
  /opt[\s-]?out/i,
  /\bno longer (?:wish|want)/i,
  // The human forms, which are BETTER on a cold email than a footer link and must count.
  /reply (?:with )?["“']?stop["”']?/i,
  /(?:just )?(?:say|reply|let me know)[^.!?\n]{0,40}\b(?:stop|not interested|no thanks?)\b/i,
  /\bi'?ll (?:stop|leave you|not (?:write|email|contact))/i,
  // "won't" AND "will not" — the contraction-only version rejected *"say the word and I will
  // not bother you again"*, which is a perfectly honest way out written slightly formally.
  // A guard that only recognises one spelling of a promise teaches people to write the other.
  /\b(?:won'?t|will not) (?:write|email|contact|bother|message) (?:you )?again/i,
  /\bclose (?:the|your) file\b/i,
  /remove(?:d)? (?:you )?from (?:this|the|my) list/i,
]

/** Openers that waste the one line a stranger will actually read. */
const WEAK_OPENERS: [RegExp, string][] = [
  [/i hope (?:this|you)[^.!?\n]{0,40}(?:finds you well|are well|is well|doing well)/i, '"I hope this finds you well" is the most-skipped sentence in cold email — it says nothing about them'],
  [/^\s*(?:hi|hello|hey)[^,\n]{0,20},?\s*(?:my name is|i'?m)\b/i, 'opening with your own name spends their attention on you before you have earned it'],
  [/i wanted to reach out/i, '"I wanted to reach out" describes what you are doing rather than why they should care'],
  [/i'?m reaching out (?:to|because)/i, 'same as "I wanted to reach out" — it is throat-clearing, not a reason to read on'],
  [/quick question/i, '"Quick question" as an opener is so overused it now reads as a template'],
  [/trust (?:this|you are)[^.!?\n]{0,30}well/i, 'formal filler that tells the reader nothing about themselves'],
]

/** Phrases that mark a follow-up as a bump rather than a new reason to reply. */
const BUMP_PHRASES: RegExp[] = [
  /just (?:bumping|following up|checking in|circling back)/i,
  /\b(?:bumping|circling back)\b/i,
  /following up on (?:my|the) (?:last |previous |earlier )?(?:email|note|message)/i,
  /did you (?:get|see) my (?:last |previous )?(?:email|note|message)/i,
  /any (?:thoughts|update)s? on (?:my|the) (?:last|previous)/i,
  /^\s*bump\b/i,
  /wanted to (?:bump|resurface)/i,
]

/** A link, a link token, or an attachment reference. */
const LINK_PATTERNS: RegExp[] = [
  /https?:\/\//i,
  /\bwww\.[a-z0-9-]+\.[a-z]{2,}/i,
  // A bare domain with a common TLD. Kept narrow so "e.g." and "i.e." cannot match.
  /\b[a-z0-9-]{2,}\.(?:com|co|io|net|org|ai|app|dev|co\.uk|co\.za)\b(?:\/|\s|$)/i,
  /\{\{\s*booking_url\s*\}\}/i,
  /\[[^\]]+\]\([^)]+\)/,          // markdown link
  /\b(?:attached|attachment|see the deck|enclosed)\b/i,
]

/** CTA phrasings, for the "one ask per email" warn. */
const CTA_PATTERNS: RegExp[] = [
  /\bworth a (?:look|chat|conversation|reply)\b/i,
  /\bopen to\b/i,
  /\b(?:book|grab|schedule|set up)\s+(?:a|some|\d+)\s*(?:call|chat|time|minutes|min\b)/i,
  /\blet me know\b/i,
  /\bhappy to (?:send|share|walk)/i,
  /\bcan i (?:send|share|show)/i,
  /\bare you (?:the right|open|free|available)/i,
  /\bwould you (?:be open|like|want)/i,
  /\binterested\?/i,
]

// ── SMALL TEXT HELPERS ────────────────────────────────────────────────────────────────────

/** Strip merge tokens before counting words — "{{first_name}}" is one word to a reader. */
function readable(text: string): string {
  return text.replace(/\{\{\s*[a-z_]+\s*\}\}/gi, 'name')
}

export function wordCount(text: string): number {
  const t = readable(text).trim()
  if (!t) return 0
  return t.split(/\s+/).filter(Boolean).length
}

function sentences(text: string): string[] {
  return readable(text).split(/[.!?]+(?:\s|$)/).map(s => s.trim()).filter(Boolean)
}

/**
 * Syllables, by heuristic. Deliberately NOT a dependency: Flesch-Kincaid only needs to be
 * right enough to separate "8th-grade plain English" from "consultancy prose", and a wrong
 * syllable on one word cannot move a whole-email average past that line.
 */
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  const trimmed = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '')
  const groups = trimmed.match(/[aeiouy]{1,2}/g)
  return Math.max(1, groups ? groups.length : 1)
}

/**
 * Flesch–Kincaid grade level. Lower is plainer. Cold email should read at 8 or below: the
 * reader is busy, on a phone, and has no reason to work at it.
 */
export function readingGrade(text: string): number {
  const sents = sentences(text)
  const words = readable(text).trim().split(/\s+/).filter(Boolean)
  if (sents.length === 0 || words.length === 0) return 0
  const syl = words.reduce((n, w) => n + syllables(w), 0)
  const grade = 0.39 * (words.length / sents.length) + 11.8 * (syl / words.length) - 15.59
  return Math.round(grade * 10) / 10
}

/** The first two lines of a body — where personalisation has to live or it is not doing its job. */
export function firstTwoLines(body: string): string {
  return body.split(/\n/).filter(l => l.trim()).slice(0, 2).join('\n')
}

function matchCount(text: string, patterns: RegExp[]): number {
  return patterns.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0)
}

// ── THE LINTER ────────────────────────────────────────────────────────────────────────────

/** Word count below which a follow-up cannot plausibly be carrying a new reason to reply. */
const BUMP_MIN_NEW_WORDS = 25

/** The founder's own boxes send at most a handful of touches; beyond this it is harassment. */
export const MAX_STEPS = 7

/**
 * TEMPLATE vs RENDERED — and getting this wrong would have killed all outreach.
 *
 * A saved sequence is a TEMPLATE: it says "Hi {{first_name}}" and carries no link in step 1.
 * The copy that is actually stored on an enrollment is RENDERED — `generateSequence` writes it
 * against one real person, so it says "Hi Sarah", and our own system prompt **instructs it to
 * put the client's booking link in step 1** (`figsy.ts`: *"include this exact booking link on
 * its own line"*).
 *
 * ⚠️ SO THE TEMPLATE RULES APPLIED TO RENDERED COPY FAIL 100% OF IT — `no_personalisation`
 * (there are no tokens, because the real name is already in there) and `link_in_step_1` (which
 * our own product deliberately added). Wired that way, #612 Part B would have skipped every
 * single lead and reported it as a copy problem. Found by reading `generateSequence` before
 * wiring, not after.
 *
 * Rendered mode therefore changes exactly ONE thing and nothing else: personalisation is proved
 * by the PERSON'S OWN DETAILS appearing in the opening, which is the same property the token
 * check exists to prove. Spam vocabulary, opt-out, links, bumps, spacing and every warn are
 * identical in both modes.
 *
 * ✅ RULED 5 AUG (Option A). It used to change a SECOND thing: the client's own booking URL was
 * exempted from the step-1 link rule, because `generateSequence` was instructed to put one
 * there and enforcing the rule would have skipped every lead. The founder resolved it the other
 * way — the prompt stopped asking, so the exemption is gone and a booking link in a first touch
 * is now an ordinary hard fail.
 */
export type RenderedFor = {
  first_name?: string | null
  last_name?: string | null
  job_title?: string | null
  company?: string | null
}

export type LintOptions = {
  /** 'template' (default) judges {{token}} copy; 'rendered' judges copy already written for one person. */
  mode?: 'template' | 'rendered'
  /** Rendered mode only: the person this copy was written for. */
  renderedFor?: RenderedFor
}

/** Does this rendered copy actually name the person it was written for? */
function namesTheProspect(text: string, who: RenderedFor | undefined): boolean {
  if (!who) return false
  const hay = text.toLowerCase()
  // 2 characters minimum, same guard `detokenise` uses — a one-letter "name" would match
  // everything and prove nothing.
  return [who.first_name, who.company, who.job_title]
    .map(v => String(v ?? '').trim().toLowerCase())
    .filter(v => v.length > 1)
    .some(v => hay.includes(v))
}

export function lintSequence(rawSteps: QualityStep[], opts?: LintOptions): QualityReport {
  const violations: Violation[] = []
  const passes: string[] = []
  const add = (rule: string, severity: Severity, step: number | null, why: string) =>
    violations.push({ rule, severity, step, why })

  const steps = (rawSteps ?? []).map((s, i) => ({
    n: i + 1,
    subject: String(s?.subject ?? ''),
    body: String(s?.body ?? ''),
    wait: Number(s?.wait_days ?? (i === 0 ? 0 : 3)) || 0,
  }))

  if (steps.length === 0) {
    add('empty_sequence', 'hard', null, 'There are no steps. An empty sequence cannot be activated.')
    return { violations, hardFails: violations, warnings: [], passes, ok: false }
  }

  const whole = steps.map(s => `${s.subject}\n${s.body}`).join('\n')

  // ── HARD ① — sequence length ────────────────────────────────────────────────────────────
  if (steps.length > MAX_STEPS) {
    add('too_many_steps', 'hard', null, `${steps.length} steps is past the point of persistence — ${MAX_STEPS} is the most anyone should receive from a stranger, and beyond it complaints rise faster than replies.`)
  } else {
    passes.push(`${steps.length} steps — inside the ${MAX_STEPS}-step limit`)
  }

  // ── HARD ② — an opt-out exists SOMEWHERE ────────────────────────────────────────────────
  // Checked across the whole sequence, not per step: one honest way out is the requirement,
  // and a well-written first touch that carries it in the last line of step 3 is fine.
  if (!OPT_OUT_PATTERNS.some(re => re.test(whole))) {
    add('no_opt_out', 'hard', null, 'Nowhere in this sequence does the person get a way to say stop. That is both the law in most of the markets we sell into and the difference between an unsubscribe and a spam complaint — and a complaint is what damages the domain.')
  } else {
    passes.push('the reader is given a way to say stop')
  }

  // ── HARD ③ — spam vocabulary, anywhere ──────────────────────────────────────────────────
  const hay = whole.toLowerCase()
  const hits = SPAM_TERMS.filter(([term]) => hay.includes(term))
  if (hits.length > 0) {
    for (const [term, why] of hits) {
      const where = steps.find(s => `${s.subject}\n${s.body}`.toLowerCase().includes(term))
      add('spam_vocabulary', 'hard', where?.n ?? null, `"${term}" — ${why}.`)
    }
  } else {
    passes.push('no spam-trigger vocabulary')
  }

  // ── HARD ④ — step 1 must be personal in its opening lines ───────────────────────────────
  //
  // Rendered copy proves this with the person's OWN details rather than a token, because the
  // token has already been replaced by the time this copy exists. Same property, different
  // evidence — see the `LintOptions` header for why judging rendered copy by the template rule
  // would fail every draft the product writes.
  const rendered = opts?.mode === 'rendered'
  const opening = firstTwoLines(steps[0].body)
  const personal = rendered
    ? namesTheProspect(opening, opts?.renderedFor) || namesTheProspect(steps[0].subject, opts?.renderedFor)
    : hasProspectToken(opening) || hasProspectToken(steps[0].subject)
  if (!personal) {
    add('no_personalisation', 'hard', 1, rendered
      ? 'The first two lines of step 1 never name this person, their role or their company. Copy written for one prospect that does not mention them is a blast with extra steps.'
      : 'The first two lines of step 1 say nothing about the person reading them — no name, role, or company. That is the definition of a blast, and it is the first thing both a reader and a filter notice.')
  } else {
    passes.push('step 1 opens on something about the prospect')
  }

  // ── HARD ⑤ — no links or attachments in step 1. NO EXCEPTIONS. ──────────────────────────
  //
  // ⚠️ FOUNDER-RULED 5 AUG, OPTION A — and this replaces an exemption, so the history matters.
  //
  // #612 Part B could not resolve a contradiction it found: this rule said *no link in a first
  // touch*, while `generateSequence`'s own system prompt ORDERED the booking link into step 1.
  // Enforcing the rule would have skipped every lead the product wrote for; so the client's own
  // booking URL was stripped before the check and reported as a `booking_link_in_step_1` WARN,
  // with a "ruling owed" note saying one of the two behaviours had to be wrong.
  //
  // **The founder ruled the GATE was right and the PROMPT was wrong:** *"the first email's job
  // is to earn a reply, not a booking."* `figsy.ts` no longer asks for a link in step 1 (it
  // still asks in step 3), so there is nothing left to exempt — a booking link in a first touch
  // is now an ordinary link, and an ordinary link in step 1 is a hard fail.
  //
  // The `bookingUrl` lint option is GONE rather than left unused: an option nothing reads is an
  // invitation to re-introduce the exemption by passing it again.
  const step1 = `${steps[0].subject}\n${steps[0].body}`
  if (LINK_PATTERNS.some(re => re.test(step1))) {
    add('link_in_step_1', 'hard', 1, 'Step 1 contains a link or attachment. A first email to a stranger with a link in it is both a deliverability penalty and the wrong ask — the first touch earns interest, and the link goes in the reply once they have shown some. This includes the booking link (founder-ruled 5 Aug).')
  } else {
    passes.push('step 1 carries no link or attachment')
  }

  // ── HARD ⑥ — a follow-up that adds nothing ──────────────────────────────────────────────
  for (const s of steps.slice(1)) {
    const isBump = BUMP_PHRASES.some(re => re.test(s.body)) || BUMP_PHRASES.some(re => re.test(s.subject))
    if (!isBump) continue
    // Strip the bump sentence and see what is left. A follow-up may say "following up" AND
    // then give a genuine new reason — that is fine, and common in good sequences.
    const remaining = sentences(s.body).filter(sen => !BUMP_PHRASES.some(re => re.test(sen))).join(' ')
    if (wordCount(remaining) < BUMP_MIN_NEW_WORDS) {
      add('empty_followup', 'hard', s.n, `Step ${s.n} is a bump with nothing new in it. "Just following up" gives the reader no reason to reply that they did not already ignore once — every follow-up has to carry a new angle, proof point or question.`)
    }
  }
  if (!violations.some(v => v.rule === 'empty_followup') && steps.length > 1) {
    passes.push('every follow-up carries something new')
  }

  // ── HARD ⑦ — two steps landing the same day ─────────────────────────────────────────────
  for (const s of steps.slice(1)) {
    if (s.wait <= 0) {
      add('steps_same_day', 'hard', s.n, `Step ${s.n} is set to send the same day as the one before it. Two emails from a stranger in one day is the fastest way to a complaint, and it looks automated because it is.`)
    }
  }
  if (!violations.some(v => v.rule === 'steps_same_day') && steps.length > 1) {
    passes.push('every follow-up is spaced at least a day apart')
  }

  // ── WARN ① — the subject line ───────────────────────────────────────────────────────────
  for (const s of steps) {
    const words = s.subject.trim() ? readable(s.subject).trim().split(/\s+/).length : 0
    if (s.subject.length > 50 || words > 6) {
      add('subject_too_long', 'warn', s.n, `Step ${s.n}'s subject is ${s.subject.length} characters and ${words} words. Phone inboxes cut around 40 — short and specific beats complete, and a subject that reads like a headline reads like marketing.`)
    }
  }

  // ── WARN ② — body length ────────────────────────────────────────────────────────────────
  for (const s of steps) {
    const n = wordCount(s.body)
    if (n < 50 || n > 125) {
      add('body_length', 'warn', s.n, `Step ${s.n} is ${n} words. Cold emails that get replies sit between 50 and 125 — under that there is no reason to act, over it nobody finishes reading on a phone.`)
    }
  }

  // ── WARN ③ — one ask per email ──────────────────────────────────────────────────────────
  for (const s of steps) {
    const questions = (s.body.match(/\?/g) ?? []).length
    const ctas = matchCount(s.body, CTA_PATTERNS)
    if (questions + ctas > 2 || questions > 1) {
      add('multiple_ctas', 'warn', s.n, `Step ${s.n} asks for more than one thing (${questions} question${questions === 1 ? '' : 's'}, ${ctas} call${ctas === 1 ? '' : 's'} to action). Two asks halve the chance of either — pick the smallest one and cut the rest.`)
    }
  }

  // ── WARN ④ — reading grade ──────────────────────────────────────────────────────────────
  for (const s of steps) {
    if (wordCount(s.body) < 10) continue   // too short to grade meaningfully
    const grade = readingGrade(s.body)
    if (grade > 8) {
      add('reading_grade', 'warn', s.n, `Step ${s.n} reads at grade ${grade}. Aim for 8 or below — shorter sentences and plainer words. This is not about the reader's intelligence, it is about the four seconds of attention they are giving it.`)
    }
  }

  // ── WARN ⑤ — weak openers ───────────────────────────────────────────────────────────────
  for (const s of steps) {
    for (const [re, why] of WEAK_OPENERS) {
      if (re.test(s.body)) { add('weak_opener', 'warn', s.n, `Step ${s.n}: ${why}.`); break }
    }
  }

  const hardFails = violations.filter(v => v.severity === 'hard')
  const warnings = violations.filter(v => v.severity === 'warn')
  return { violations, hardFails, warnings, passes, ok: hardFails.length === 0 }
}

/**
 * #612 PART B — THE GATE ON THE COPY THAT ACTUALLY SENDS.
 *
 * Part A gated templates and the drafts an operator READS. It did not gate the copy stored on
 * the enrollment, which is what the send loop actually emails: when a campaign has no applied
 * sequence, `generateSequence` writes fresh copy per lead at enrol time and nothing looked at
 * it. Found by verifying the shipped PR rather than by the gate going red — a green gate said
 * nothing about the enrol path.
 *
 * ⚠️ DEMO IS EXEMPT, DELIBERATELY. `#453` demo enrollments are drafted-only: `next_send_at` is
 * left null so the cron never fires them, so bad copy cannot reach a human. Refusing them would
 * break the demo, and `#329` already settled that one — *"a wipe that removes the demo removes
 * the sales tool."* Exempting a path that cannot send costs nothing; breaking the thing the
 * product is sold with costs a client.
 *
 * Pure so the whole decision is provable without enrolling anybody.
 */
export function enrolDraftGate(a: {
  steps: QualityStep[]
  renderedFor?: RenderedFor
  isDemo: boolean
}): { allow: true } | { allow: false; rules: string[]; reason: string } {
  if (a.isDemo) return { allow: true }
  const report = lintSequence(a.steps, {
    mode: 'rendered',
    renderedFor: a.renderedFor,
  })
  if (report.ok) return { allow: true }
  // De-duplicated: the same rule can fire on several steps, and a reason that repeats a rule
  // four times reads as four problems.
  const rules = [...new Set(report.hardFails.map(v => v.rule))]
  return {
    allow: false,
    rules,
    reason: `copy_rejected:${rules.join(',')}`,
  }
}

/**
 * One founder-plain line for an API refusal. Named rather than inlined so the refusal reads
 * the same wherever it is raised — three routes gate on this and three wordings would make the
 * same failure look like three different problems.
 */
export function refusalMessage(report: QualityReport): string {
  const n = report.hardFails.length
  return `This sequence cannot go live — ${n} thing${n === 1 ? '' : 's'} would damage the sending domain or the client's reputation. Fix ${n === 1 ? 'it' : 'them'} and press it again.`
}
