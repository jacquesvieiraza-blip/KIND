import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  winningShape, approvalPattern, replyTrend, sourcingRequest,
  seniorityBucket, functionBucket,
  MIN_DECIDED, MIN_WINNERS, MIN_VALUE_COUNT, MIN_DECISIONS, MIN_SENDS_PER_WINDOW,
  type LeadFact,
} from './lead-patterns'

// YOUR LEADS — AND THE ONE THING IT MUST REFUSE TO DO.
//
// This tab tells a client what kind of person actually replies to them, computed from their
// own outcomes. It is the half of Coaching nobody else can build, because it runs on the
// approve/pass signal and the replies — and we only hold those because we sourced the leads
// and sent the mail.
//
// Which makes the failure mode obvious and expensive:
//
//   ⚠️ **A PATTERN CLAIMED FROM THIN DATA IS A CONFIDENT LIE, AND THE CLIENT WILL ACT ON IT.**
//
// Told "Finance Directors reply 3× more" off four replies, they re-target a month of outreach
// on noise. So the gate is the product, not a safety rail around it — and the gate is on the
// SMALLER class, because 200 contacted leads with 5 replies is a big sample with nothing to
// say. Most of this file is about refusing well.
//
// The maths is here, in code, and not in a model: a model asked to find a pattern finds one
// every time, including in noise, and phrases it identically either way.

/** A lead that was contacted and replied. */
const won = (o: Partial<LeadFact> = {}): LeadFact =>
  ({ approved: true, passed: false, contacted: true, replied: true, booked: false, ...o })
/** A lead that was contacted and never answered. */
const silent = (o: Partial<LeadFact> = {}): LeadFact =>
  ({ approved: true, passed: false, contacted: true, replied: false, booked: false, ...o })

const many = (n: number, f: (i: number) => LeadFact) => Array.from({ length: n }, (_, i) => f(i))

describe('⚠️ it refuses to name a pattern before the evidence exists', () => {
  it('refuses on too few decided outcomes, and says how many are needed', () => {
    const r = winningShape(many(10, () => silent({ industry: 'Logistics' })))
    expect(r.enough).toBe(false)
    expect(r.enough === false && r.have).toBe(10)
    expect(r.enough === false && r.need).toBe(MIN_DECIDED)
    expect(r.enough === false && r.why).toContain('nothing to compare')
  })

  it('THE GATE THAT BINDS: a big sample with few winners still refuses', () => {
    // The assertion this file exists for. 200 contacted leads and 5 replies looks like plenty
    // of data and is not: one more reply moves any attribute's share among winners by 20
    // points, which is bigger than any effect worth reporting. Gating on the TOTAL would
    // sail straight past this.
    const leads = [
      ...many(5, () => won({ industry: 'Logistics' })),
      ...many(195, () => silent({ industry: 'Retail' })),
    ]
    const r = winningShape(leads)
    expect(r.enough).toBe(false)
    expect(r.enough === false && r.have).toBe(5)
    expect(r.enough === false && r.need).toBe(MIN_WINNERS)
    expect(r.enough === false && r.why).toContain('luck')
  })

  it('the refusal is a sentence a client can act on, not "no data"', () => {
    // "Not enough data" with no number is indistinguishable from "this feature is broken".
    const r = winningShape(many(12, () => silent()))
    expect(r.enough === false && r.why.length).toBeGreaterThan(60)
    expect(r.enough === false && r.why).toContain('30')
  })

  it('a lead nobody emailed is NOT counted as a loss', () => {
    // It did not fail to reply; it never had the chance. Counting it as silent makes whatever
    // the sequence has not reached yet look unpromising, which is the opposite of the truth.
    const leads = [...many(40, () => ({ ...silent(), contacted: false })), ...many(10, () => won())]
    const r = winningShape(leads)
    expect(r.enough).toBe(false)   // only 10 decided, not 50
    expect(r.enough === false && r.have).toBe(10)
  })
})

describe('when the evidence IS there, it names the shape', () => {
  const strong = [
    ...many(10, () => won({ job_title: 'Operations Director', industry: 'Logistics' })),
    ...many(40, i => silent({ job_title: 'Marketing Manager', industry: i % 2 ? 'Retail' : 'Hospitality' })),
  ]

  it('finds the over-represented attributes', () => {
    const r = winningShape(strong)
    expect(r.enough).toBe(true)
    if (!r.enough) return
    expect(r.value.winners).toBe(10)
    expect(r.value.silent).toBe(40)
    const values = r.value.traits.map(t => t.value)
    expect(values).toContain('Logistics')
    expect(values).toContain('Director')
  })

  it('a value appearing once or twice among winners is never named', () => {
    // "1 of 8 winners was in mining" must not become "mining is your best industry".
    const r = winningShape([
      ...many(8, i => won({ industry: i === 0 ? 'Mining' : 'Logistics' })),
      ...many(30, () => silent({ industry: 'Retail' })),
    ])
    expect(r.enough).toBe(true)
    if (!r.enough) return
    expect(r.value.traits.map(t => t.value)).not.toContain('Mining')
    expect(MIN_VALUE_COUNT).toBe(3)
  })

  it('a value absent from the silent group does not report an infinite lift', () => {
    // Dividing by a zero share would make one lucky value the strongest signal on the page.
    const r = winningShape([
      ...many(10, () => won({ country: 'Namibia' })),
      ...many(30, () => silent({ country: 'South Africa' })),
    ])
    expect(r.enough).toBe(true)
    if (!r.enough) return
    for (const t of r.value.traits) expect(Number.isFinite(t.lift)).toBe(true)
  })

  it('"nothing stands out" is a real answer, distinct from "not enough data"', () => {
    // Ran the arithmetic, found nothing above the bar. A client must be able to tell that
    // apart from us not having looked.
    const flat = [...many(10, () => won({ industry: 'Retail' })), ...many(30, () => silent({ industry: 'Retail' }))]
    const r = winningShape(flat)
    expect(r.enough).toBe(true)
    if (!r.enough) return
    expect(r.value.nothingStandsOut).toBe(true)
    expect(r.value.traits).toEqual([])
  })
})

describe('job titles are bucketed, or no value ever repeats', () => {
  it('three spellings of one job are one bucket', () => {
    // Comparing raw title strings means nothing ever reaches MIN_VALUE_COUNT and the card
    // silently never fires — which reads as "no pattern" when we simply never looked properly.
    for (const t of ['VP Sales', 'VP of Sales', 'Vice President, Sales Operations']) {
      expect(seniorityBucket(t), t).toBe('VP')
    }
    expect(seniorityBucket('Chief Financial Officer')).toBe('founder or C-level')
    expect(seniorityBucket('Head of People')).toBe('Head of')
  })

  it('departments bucket too', () => {
    expect(functionBucket('Group Operations Director')).toBe('Operations')
    expect(functionBucket('Financial Controller')).toBe('Finance')
    expect(functionBucket('Talent Acquisition Lead')).toBe('People')
  })

  it('an unrecognised title is null, not a bucket called "other"', () => {
    // A bucket named "other" would collect enough rows to look like a pattern and mean nothing.
    expect(seniorityBucket('Consultant')).toBeNull()
    expect(functionBucket('')).toBeNull()
  })
})

describe('are you approving the right people', () => {
  it('refuses below enough approve/pass decisions', () => {
    const r = approvalPattern(many(10, () => ({ ...silent(), approved: true })))
    expect(r.enough).toBe(false)
    expect(r.enough === false && r.need).toBe(MIN_DECISIONS)
  })

  it('names what the client routinely passes on', () => {
    const leads = [
      ...many(12, () => ({ ...silent(), approved: false, passed: true, contacted: false, job_title: 'Financial Controller' })),
      ...many(20, () => ({ ...silent(), approved: true, passed: false, job_title: 'Operations Director' })),
    ]
    const r = approvalPattern(leads)
    expect(r.enough).toBe(true)
    if (!r.enough) return
    expect(r.value.routinelyPassed.map(x => x.value)).toContain('Finance')
  })

  it('THE VALUABLE ONE: something they usually pass, that wins when it gets through', () => {
    // Anyone can report "you approve a lot of Directors". Only their own outcomes can say
    // "you pass on Finance almost every time, and the ones that slipped through booked" —
    // and that is the sentence that changes what they do on Monday.
    const leads = [
      ...many(12, () => ({ ...silent(), approved: false, passed: true, contacted: false, job_title: 'Financial Controller' })),
      ...many(4, () => won({ job_title: 'Financial Controller' })),
      ...many(20, () => silent({ job_title: 'Operations Director' })),
    ]
    const r = approvalPattern(leads)
    expect(r.enough).toBe(true)
    if (!r.enough) return
    const hit = r.value.passedButWins.find(x => x.value === 'Finance')
    expect(hit).toBeTruthy()
    expect(hit!.winners).toBe(4)
  })

  it('a habit that is NOT costing them is not reported as one', () => {
    // They pass on Finance and the ones that got through went silent too. The instinct is
    // right, and telling them otherwise would cost them approvals on people who never answer.
    const leads = [
      ...many(12, () => ({ ...silent(), approved: false, passed: true, contacted: false, job_title: 'Financial Controller' })),
      ...many(4, () => silent({ job_title: 'Financial Controller' })),
      ...many(20, () => silent({ job_title: 'Operations Director' })),
    ]
    const r = approvalPattern(leads)
    expect(r.enough === true && r.value.passedButWins).toEqual([])
  })
})

describe('replies down — list or message, two opposite fixes', () => {
  const W = (sends: number, opens: number, replies: number) => ({ sends, opens, replies })

  it('refuses when either window is thin', () => {
    const r = replyTrend(W(10, 4, 0), W(200, 80, 20))
    expect(r.enough).toBe(false)
    expect(r.enough === false && r.have).toBe(10)
    expect(r.enough === false && r.need).toBe(MIN_SENDS_PER_WINDOW)
    expect(r.enough === false && r.why).toContain('normal variation')
  })

  it('opens held, replies fell → the LIST or the ask', () => {
    // They are reading it and not answering. Rewriting the subject fixes nothing.
    const r = replyTrend(W(200, 80, 4), W(200, 80, 20))
    expect(r.enough).toBe(true)
    if (!r.enough) return
    expect(r.value.kind).toBe('list')
    expect(r.value.detail).toContain('Rewriting the subject would fix nothing')
  })

  it('opens collapsed too → DELIVERABILITY, and say so plainly', () => {
    // The most expensive misdiagnosis available: a client rewrites their sequence for a month
    // while the domain is the problem.
    const r = replyTrend(W(200, 20, 2), W(200, 80, 20))
    expect(r.enough === true && r.value.kind).toBe('deliverability')
    expect(r.enough === true && r.value.headline).toContain('not your message')
  })

  it('opens slid moderately → the SUBJECT LINE', () => {
    const r = replyTrend(W(200, 60, 6), W(200, 80, 20))
    expect(r.enough === true && r.value.kind).toBe('message')
  })

  it('a small wobble is reported as steady, not as a problem', () => {
    // Manufacturing a trend out of noise trains the client to ignore the tab.
    const r = replyTrend(W(200, 78, 18), W(200, 80, 20))
    expect(r.enough === true && r.value.kind).toBe('steady')
  })

  it('and going UP is said out loud', () => {
    const r = replyTrend(W(200, 90, 30), W(200, 80, 20))
    expect(r.enough === true && r.value.kind).toBe('improving')
  })
})

describe('find me more — it REQUESTS, it does not source', () => {
  it('the request names the evidence it is based on', () => {
    const shape = { winners: 10, silent: 40, nothingStandsOut: false,
      traits: [{ attribute: 'industry', value: 'Logistics', winners: 7, lift: 2.4 }] }
    const msg = sourcingRequest(shape)
    expect(msg).toContain('Logistics')
    expect(msg).toContain('7 of my 10 replies')
    expect(msg).toContain('2.4×')
  })

  it('it still works when nothing stood out, and says so', () => {
    const msg = sourcingRequest({ winners: 9, silent: 30, traits: [], nothingStandsOut: true })
    expect(msg).toContain('no single attribute stood out')
    expect(msg).toContain('existing targeting')
  })

  it('nothing in this module can spend money', () => {
    // Sourcing runs against our PDL budget behind a monthly fence, and the model is managed.
    // A client button that quietly spends our money is the wrong shape whatever it says on it,
    // so the request goes to an operator through the thread the client already uses.
    const src = readFileSync(join(__dirname, 'lead-patterns.ts'), 'utf8')
    for (const forbidden of ['runIcpJob', 'pdl', 'sourcing_ledger', 'db.from', '@kind/db']) {
      expect(src.toLowerCase(), forbidden).not.toContain(forbidden.toLowerCase() === 'pdl' ? 'pdlsearch' : forbidden)
    }
  })
})

describe('the thresholds carry their reasons', () => {
  it('every threshold is documented where it is defined', () => {
    // A bare number invites somebody to lower it when the tab looks empty, which is exactly
    // when lowering it is most harmful.
    const src = readFileSync(join(__dirname, 'lead-patterns.ts'), 'utf8')
    for (const k of ['MIN_DECIDED', 'MIN_WINNERS', 'MIN_VALUE_COUNT', 'MIN_DECISIONS', 'MIN_SENDS_PER_WINDOW']) {
      const at = src.indexOf(`export const ${k}`)
      expect(at, k).toBeGreaterThan(-1)
      // A comment block immediately precedes the declaration.
      expect(src.slice(Math.max(0, at - 400), at), k).toContain('*')
    }
  })

  it('the binding gate is the smaller class, and the file says why', () => {
    const src = readFileSync(join(__dirname, 'lead-patterns.ts'), 'utf8')
    expect(src).toContain('THE ONE THAT ACTUALLY BINDS')
    expect(src.toLowerCase()).toContain('smaller class')
  })
})
