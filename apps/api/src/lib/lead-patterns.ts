// YOUR LEADS — what the client's own results say, and when they say nothing at all.
//
// This is the half of Coaching no competitor can build. Everything else on that screen is
// advice; this is arithmetic over the client's own outcomes, because we sourced the leads,
// we sent the emails and we caught the replies. Nobody selling an AI sales coach has the
// approve/pass signal.
//
// ── THE RULE THIS FILE EXISTS TO ENFORCE ─────────────────────────────────────────────────
//
// **A pattern claimed from thin data is a confident lie**, and it is worse here than almost
// anywhere else in the product: the client will re-target their outreach on it. Telling
// somebody "Finance Directors reply 3× more" off four replies would send them chasing noise
// for a month and cost them the quarter.
//
// So every answer is an `Evidence<T>`: either a value, or an honest refusal that says how
// much more is needed. This is #565/#576's NOT-MEASURED discipline applied to statistics —
// an unmeasured pattern is not a weak pattern, it is not a pattern.
//
// ⚠️ AND THE GATE IS ON THE SMALLER CLASS, NOT THE TOTAL. That is the part that is easy to
// get wrong. With 200 contacted leads and 5 replies you have a big sample and nothing to say:
// one extra reply moves any attribute's share among winners by twenty points. The binding
// constraint is always how many people actually replied.
//
// ── WHY THE MATHS IS NOT DONE BY AN LLM ──────────────────────────────────────────────────
//
// A model asked to "find the pattern" will find one every time, including in noise, and will
// phrase it with the same confidence either way. The counting happens here, in code that can
// be red-proved; a model may only put the result into a sentence.

// ── THRESHOLDS, EACH WITH ITS REASON ─────────────────────────────────────────────────────

/**
 * Contacted leads whose outcome is decided (replied/booked, or contacted and silent long
 * enough to count). Below this there is not enough of anything to compare.
 */
export const MIN_DECIDED = 30

/**
 * ⚠️ THE ONE THAT ACTUALLY BINDS. At least this many leads in the POSITIVE class before any
 * shape may be named. At 7 winners, a single extra reply swings any attribute's share by 14
 * points, which is larger than almost every real effect we would be reporting.
 */
export const MIN_WINNERS = 8

/**
 * An attribute VALUE must appear at least this many times among the winners before it can be
 * named. Stops "1 of 8 winners was in mining" becoming "mining is your best industry".
 */
export const MIN_VALUE_COUNT = 3

/** How much more common a value must be among winners than among the silent to be worth saying. */
export const MIN_LIFT = 1.5

/** Approve/pass decisions needed before the approval pattern means anything. */
export const MIN_DECISIONS = 30

/** Sends needed in EACH window before two windows can be compared. */
export const MIN_SENDS_PER_WINDOW = 30

// ── TYPES ────────────────────────────────────────────────────────────────────────────────

/** One lead, flattened to the facts a pattern can be computed from. */
export type LeadFact = {
  job_title?: string | null
  industry?: string | null
  company_size?: string | null
  country?: string | null
  seniority?: string | null
  /** revealed_at is not null — the client pressed 👍 and paid. */
  approved: boolean
  /** passed_at is not null — the client pressed ✕. */
  passed: boolean
  /** At least one email actually left for this lead. */
  contacted: boolean
  replied: boolean
  booked: boolean
}

/**
 * An answer, or an honest refusal to give one.
 *
 * The refusal carries `have`, `need` and a plain sentence, because "not enough data" with no
 * number is indistinguishable from "this feature is broken".
 */
export type Evidence<T> =
  | { enough: true; value: T }
  | { enough: false; have: number; need: number; why: string }

const notEnough = <T,>(have: number, need: number, why: string): Evidence<T> =>
  ({ enough: false, have, need, why })

// ── NORMALISING ──────────────────────────────────────────────────────────────────────────

const clean = (s: string | null | undefined) =>
  (s ?? '').toLowerCase().replace(/[^a-z0-9+ ]/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Job titles are bucketed, not compared as strings.
 *
 * "VP Sales", "VP of Sales" and "Vice President, Sales Operations" are one thing to a
 * salesperson and three distinct strings to a computer. Comparing raw titles means no value
 * ever reaches MIN_VALUE_COUNT and the card silently never fires — which reads as "no
 * pattern" when the truth is "we never looked properly".
 */
export function seniorityBucket(title: string | null | undefined, seniority?: string | null): string | null {
  const t = `${clean(title)} ${clean(seniority)}`.trim()
  if (!t) return null
  // ⚠️ VP IS TESTED BEFORE C-LEVEL, AND THE ORDER IS THE WHOLE POINT. "Vice President"
  // contains "president" as a whole word, so a C-level check running first classifies every
  // VP as a founder — and the tab then reports "founders reply best" to a client whose
  // winners were all VPs. A wrong bucket does not look like a bug on screen; it looks like a
  // finding. Caught by a test that spelled the same job three ways.
  if (/\b(vp|svp|evp)\b|\bvice president\b/.test(t)) return 'VP'
  if (/\b(founder|owner|ceo|coo|cfo|cto|cmo|chief|president|managing director|md)\b/.test(t)) return 'founder or C-level'
  if (/\b(director)\b/.test(t)) return 'Director'
  if (/\b(head of|head)\b/.test(t)) return 'Head of'
  if (/\b(manager|lead)\b/.test(t)) return 'Manager'
  return null
}

/** The department a title sits in. Same argument as the seniority bucket. */
export function functionBucket(title: string | null | undefined): string | null {
  const t = clean(title)
  if (!t) return null
  if (/\b(sales|revenue|commercial|account|business development|bd)\b/.test(t)) return 'Sales'
  if (/\b(market|growth|demand|brand)\b/.test(t)) return 'Marketing'
  if (/\b(operations|ops|supply|logistics|fulfil|fulfill)\b/.test(t)) return 'Operations'
  if (/\b(finance|financial|account|controller|treasur)\b/.test(t)) return 'Finance'
  if (/\b(people|hr|human resources|talent|recruit)\b/.test(t)) return 'People'
  if (/\b(engineer|technology|technical|it|software|data|product)\b/.test(t)) return 'Technology'
  return null
}

/** The attributes a shape can be described in, and how each is read off a lead. */
export const ATTRIBUTES: { key: string; label: string; of: (l: LeadFact) => string | null }[] = [
  { key: 'seniority', label: 'seniority',    of: l => seniorityBucket(l.job_title, l.seniority) },
  { key: 'function',  label: 'department',   of: l => functionBucket(l.job_title) },
  { key: 'industry',  label: 'industry',     of: l => (l.industry ?? '').trim() || null },
  { key: 'size',      label: 'company size', of: l => (l.company_size ?? '').trim() || null },
  { key: 'country',   label: 'country',      of: l => (l.country ?? '').trim() || null },
]

// ── ① WHAT DOES A WINNING LEAD LOOK LIKE? ────────────────────────────────────────────────

export type ShapeTrait = {
  attribute: string
  value: string
  /** How many winners carry this value. */
  winners: number
  /** Share among winners vs share among the silent, as a multiple. */
  lift: number
}

export type WinningShape = {
  winners: number
  silent: number
  traits: ShapeTrait[]
  /** True when the arithmetic ran and found nothing above the bar. Not the same as no data. */
  nothingStandsOut: boolean
}

/**
 * Which attributes are over-represented among the leads that replied or booked.
 *
 * Compared against the leads that were CONTACTED AND STAYED SILENT — never against every
 * lead. A lead nobody emailed did not fail to reply; it never had the chance, and counting
 * it as a loss makes whatever the sequence has not reached yet look unpromising.
 */
export function winningShape(leads: LeadFact[]): Evidence<WinningShape> {
  const contacted = leads.filter(l => l.contacted)
  const winners = contacted.filter(l => l.replied || l.booked)
  const silent = contacted.filter(l => !l.replied && !l.booked)
  const decided = winners.length + silent.length

  if (decided < MIN_DECIDED) {
    return notEnough(decided, MIN_DECIDED,
      `Only ${decided} of your leads have been emailed and had time to answer. Below about ${MIN_DECIDED} there is nothing to compare.`)
  }
  // ⚠️ The gate that actually binds — see the header. A big silent population and five
  // replies is a big sample with nothing to say.
  if (winners.length < MIN_WINNERS) {
    return notEnough(winners.length, MIN_WINNERS,
      `${winners.length} ${winners.length === 1 ? 'person has' : 'people have'} replied so far. It takes about ${MIN_WINNERS} before a pattern is real rather than luck — one more reply would move any answer I gave you by more than the answer itself.`)
  }

  const traits: ShapeTrait[] = []
  for (const attr of ATTRIBUTES) {
    const countIn = (rows: LeadFact[]) => {
      const m = new Map<string, number>()
      for (const r of rows) {
        const v = attr.of(r)
        if (v) m.set(v, (m.get(v) ?? 0) + 1)
      }
      return m
    }
    const win = countIn(winners)
    const sil = countIn(silent)

    for (const [value, n] of win) {
      if (n < MIN_VALUE_COUNT) continue
      const shareWin = n / winners.length
      // A value absent from the silent group would divide by zero. Treat it as if it appeared
      // half a time — otherwise one lucky value reports an infinite lift.
      const shareSil = (sil.get(value) ?? 0.5) / Math.max(1, silent.length)
      const lift = shareWin / shareSil
      if (lift >= MIN_LIFT) {
        traits.push({ attribute: attr.label, value, winners: n, lift: Math.round(lift * 10) / 10 })
      }
    }
  }

  traits.sort((a, b) => b.lift - a.lift || b.winners - a.winners)
  return {
    enough: true,
    value: { winners: winners.length, silent: silent.length, traits: traits.slice(0, 6), nothingStandsOut: traits.length === 0 },
  }
}

// ── ② ARE YOU APPROVING THE RIGHT PEOPLE? ────────────────────────────────────────────────

export type ApprovalPattern = {
  approved: number
  passed: number
  /** Values the client passes on far more often than they approve. */
  routinelyPassed: { attribute: string; value: string; passed: number; approved: number }[]
  /**
   * The interesting case: something they usually pass on, but which WON when it got through.
   * Their instinct may be costing them, and only their own results can say so.
   */
  passedButWins: { attribute: string; value: string; passed: number; winners: number }[]
}

/**
 * What the client's 👍 and ✕ actually say, and whether their instinct is earning its keep.
 *
 * The valuable half is `passedButWins`. Anyone can report "you approve a lot of Directors".
 * Only their own outcomes can say "you pass on Finance almost every time, and the three that
 * slipped through all booked" — and that is a sentence that changes what they do on Monday.
 */
export function approvalPattern(leads: LeadFact[]): Evidence<ApprovalPattern> {
  const decided = leads.filter(l => l.approved || l.passed)
  if (decided.length < MIN_DECISIONS) {
    return notEnough(decided.length, MIN_DECISIONS,
      `You have made ${decided.length} approve-or-pass ${decided.length === 1 ? 'decision' : 'decisions'}. It takes about ${MIN_DECISIONS} before your habits are distinguishable from the order the leads happened to arrive in.`)
  }

  const approved = decided.filter(l => l.approved)
  const passed = decided.filter(l => l.passed)
  const routinelyPassed: ApprovalPattern['routinelyPassed'] = []
  const passedButWins: ApprovalPattern['passedButWins'] = []

  for (const attr of ATTRIBUTES) {
    const values = new Set(decided.map(attr.of).filter((v): v is string => !!v))
    for (const value of values) {
      const has = (l: LeadFact) => attr.of(l) === value
      const p = passed.filter(has).length
      const a = approved.filter(has).length
      if (p + a < MIN_VALUE_COUNT * 2) continue

      // Passed at least twice as often as approved — a habit, not a coincidence.
      if (p >= a * 2 && p >= MIN_VALUE_COUNT) {
        routinelyPassed.push({ attribute: attr.label, value, passed: p, approved: a })
        const wins = approved.filter(l => has(l) && (l.replied || l.booked)).length
        // The ones that got through anyway — did they win? If most did, the habit is expensive.
        if (a > 0 && wins >= Math.ceil(a / 2) && wins >= 2) {
          passedButWins.push({ attribute: attr.label, value, passed: p, winners: wins })
        }
      }
    }
  }

  routinelyPassed.sort((a, b) => b.passed - a.passed)
  passedButWins.sort((a, b) => b.winners - a.winners)
  return {
    enough: true,
    value: {
      approved: approved.length, passed: passed.length,
      routinelyPassed: routinelyPassed.slice(0, 5),
      passedButWins: passedButWins.slice(0, 3),
    },
  }
}

// ── ③ REPLIES ARE DOWN — LIST OR MESSAGE? ────────────────────────────────────────────────

export type Window = { sends: number; opens: number; replies: number }
export type TrendVerdict = {
  headline: string
  detail: string
  /** Which of the two problems it is. `steady` means nothing moved enough to call. */
  kind: 'list' | 'message' | 'deliverability' | 'steady' | 'improving'
  openRateNow: number; openRateBefore: number
  replyRateNow: number; replyRateBefore: number
}

/**
 * Two problems that look identical from the outside, and have opposite fixes.
 *
 * The split is the open rate. Reaching the wrong people well and the right people badly both
 * show up as "replies are down", and a client who guesses wrong rewrites a sequence that was
 * fine while the list stays wrong — or the reverse, for a month.
 *
 *   • opens fell too            → the mail is not landing. Deliverability, not copy.
 *   • opens held, replies fell  → they are opening and not answering. The people or the ask.
 */
export function replyTrend(now: Window, before: Window): Evidence<TrendVerdict> {
  const thin = Math.min(now.sends, before.sends)
  if (thin < MIN_SENDS_PER_WINDOW) {
    return notEnough(thin, MIN_SENDS_PER_WINDOW,
      `The thinner of the two periods has ${thin} ${thin === 1 ? 'send' : 'sends'}. Comparing two small weeks reports normal variation as a trend.`)
  }

  const rate = (n: number, d: number) => (d > 0 ? n / d : 0)
  const openNow = rate(now.opens, now.sends), openBefore = rate(before.opens, before.sends)
  const replyNow = rate(now.replies, now.sends), replyBefore = rate(before.replies, before.sends)
  const openDrop = openBefore > 0 ? (openBefore - openNow) / openBefore : 0
  const replyDrop = replyBefore > 0 ? (replyBefore - replyNow) / replyBefore : 0
  const pct = (x: number) => `${Math.round(x * 1000) / 10}%`

  const base = {
    openRateNow: openNow, openRateBefore: openBefore,
    replyRateNow: replyNow, replyRateBefore: replyBefore,
  }

  if (replyDrop < 0.15) {
    return replyNow > replyBefore
      ? { enough: true, value: { ...base, kind: 'improving',
          headline: 'Replies are up, not down.',
          detail: `${pct(replyBefore)} → ${pct(replyNow)}. Whatever changed recently is working. Keep it.` } }
      : { enough: true, value: { ...base, kind: 'steady',
          headline: 'Replies have not meaningfully moved.',
          detail: `${pct(replyBefore)} → ${pct(replyNow)}. That is inside normal week-to-week variation, so there is nothing here to fix.` } }
  }

  // Opens collapsed → the mail is not being seen at all. Copy is not the problem.
  if (openDrop >= 0.3) {
    return { enough: true, value: { ...base, kind: 'deliverability',
      headline: 'This is deliverability, not your message.',
      detail: `Opens fell ${pct(openDrop)} (${pct(openBefore)} → ${pct(openNow)}) alongside replies. People are not seeing the email, so rewriting it will not help. We are checking the mailbox and the domain from our side.` } }
  }
  if (openDrop >= 0.15) {
    return { enough: true, value: { ...base, kind: 'message',
      headline: 'Your subject line is losing them before the message does.',
      detail: `Opens ${pct(openBefore)} → ${pct(openNow)}, replies ${pct(replyBefore)} → ${pct(replyNow)}. Both slid, opens first. The subject is the thing to change.` } }
  }

  return { enough: true, value: { ...base, kind: 'list',
    headline: 'They are opening it and not answering. That is the list, or the ask.',
    detail: `Opens held at ${pct(openNow)} while replies fell ${pct(replyDrop)} (${pct(replyBefore)} → ${pct(replyNow)}). The email is landing and being read, so the people are wrong for it or the ask is. Rewriting the subject would fix nothing.` } }
}

// ── ④ FIND ME MORE OF THE ONES THAT WORKED ───────────────────────────────────────────────

/**
 * Turn a proven shape into a request an operator can act on.
 *
 * ⚠️ IT WRITES A REQUEST, IT DOES NOT SOURCE. Sourcing spends our PDL budget against a
 * monthly fence, and the model is managed — a client button that quietly spends our money is
 * the wrong shape whatever it says on it. This lands in the same `client_messages` thread the
 * client already uses to reach us, so it arrives where an operator is already looking.
 */
export function sourcingRequest(shape: WinningShape): string {
  const traits = shape.traits.length
    ? shape.traits.map(t => `${t.attribute}: ${t.value} (${t.winners} of my ${shape.winners} replies, ${t.lift}× more common than average)`).join('\n• ')
    : 'no single attribute stood out, so please use my existing targeting'
  return [
    'Please source more leads matching what has actually been working for me.',
    '',
    `Based on ${shape.winners} ${shape.winners === 1 ? 'reply' : 'replies'} against ${shape.silent} contacted-and-silent:`,
    `• ${traits}`,
    '',
    'Sent from Milla → Coaching → Your leads.',
  ].join('\n')
}
