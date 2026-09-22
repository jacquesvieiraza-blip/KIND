// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 WE NEVER SELL A NUMBER THE POOL CANNOT CARRY — founder-locked 22 Sep
//
//     "well we would not offer 10 meetings when we can only deliver 6."
//     "we do 400. but present 250 to the client. we build buffer only we know."
//
// ── WHY THIS FILE IS ARITHMETIC AND STILL WORTH WRITING ─────────────────────────────────
//
// Every number here is a division. What is NOT obvious is which divisor belongs to which
// question, and getting that backwards does not throw, does not fail a type check and does
// not look wrong on screen — it quietly sells seventeen meetings out of a pool that can
// account for ten, and the "ten bought is ten owed" guarantee loses the headroom it is paid
// for out of. So the tests below pin the two rates to the two QUESTIONS, not to each other.
//
// ⚠️ THE FOUNDER'S OWN PREVIEW IS THE FIXTURE. 4,120 at Brief and 4,317 workable at Proof are
// his numbers, and his preview states the answers: ten, ten, and seventeen at the benchmark.
// An arithmetic module checked against its own arithmetic proves nothing; checked against the
// document the product was specified from, it proves the model is the one he asked for.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import {
  LEADS_PER_MEETING_WORST_CASE, LEADS_PER_TARGETED_MEETING,
  workablePool, committedCapacity, benchmarkMeetings, poolCapacity,
  capacityInvariant, capacitySentence,
} from '@kind/shared'

describe('🛑 the capacity model is the founder’s, checked against his own preview', () => {
  it('Brief: 4,120 people is around ten meetings', () => {
    // The locked Stage 1 screen: "4,120 people match this so far — around ten meetings at
    // this size". Nothing is excluded yet at Brief, because exclusions are still a sentence.
    expect(committedCapacity(workablePool(4_120))).toBe(10)
    expect(capacitySentence(committedCapacity(workablePool(4_120))))
      .toBe('around 10 meetings at this size')
  })

  it('Proof: 4,380 matched − 63 excluded = 4,317 workable, carrying ten', () => {
    // The locked Stage 2 tiles: WORKABLE POOL "4,317 · 4,380 matched − 63 excluded" and
    // WE CAN COMMIT TO "10".
    const cap = poolCapacity(4_380, 63)
    expect(cap.workable).toBe(4_317)
    expect(cap.committed).toBe(10)
  })

  it('…and seventeen at the benchmark, which is the headroom the operator sees', () => {
    // The locked bar: "4,317 workable ÷ 400 worst case · 17 at the 250 benchmark — the
    // difference is our headroom".
    const cap = poolCapacity(4_380, 63)
    expect(cap.benchmark).toBe(17)
    expect(cap.headroom).toBe(7)
  })

  it('the narrowed pool from his own Proof conversation carries SIX, not ten', () => {
    // "Then I'll drop the 11–50 band and keep 51–200. That takes it to 2,740… at that size
    // I could commit to six meetings, not ten." This is the sentence the client must hear
    // BEFORE they pay, and it is arithmetic rather than a judgement call.
    expect(committedCapacity(workablePool(2_740))).toBe(6)
  })
})

describe('🛑 the two rates answer two different questions', () => {
  it('the worst case is STRICTLY harsher than the benchmark, proved by running it', () => {
    // ⚠️ NOT `expect(400).toBeGreaterThan(250)`. That asserts two literals agree with the two
    // literals above them. `capacityInvariant()` reads the constants the product actually
    // uses, so lowering either one fails here rather than silently emptying the buffer.
    expect(capacityInvariant(), 'the headroom behind "ten bought is ten owed" is gone').toBe(true)
    expect(LEADS_PER_MEETING_WORST_CASE).toBeGreaterThan(LEADS_PER_TARGETED_MEETING)
  })

  it('selling at the benchmark would overpromise — which is the mistake the split prevents', () => {
    // The same pool, the same day, answered by the two rates: seventeen is what a planner
    // would see and ten is what may be sold. If these were ever equal the test above has
    // already failed; this one states what that failure would COST.
    const workable = 4_317
    expect(benchmarkMeetings(workable) - committedCapacity(workable)).toBeGreaterThan(0)
  })
})

describe('🛑 nothing rounds up, ever', () => {
  it('a pool carrying 10.9 meetings carries ten', () => {
    // 4,399 ÷ 400 = 10.99. Selling the eleventh on a rounding convention is selling a meeting
    // the pool cannot account for.
    expect(committedCapacity(4_399)).toBe(10)
  })

  it('one person short of a meeting is not a meeting', () => {
    expect(committedCapacity(399)).toBe(0)
    expect(committedCapacity(400)).toBe(1)
  })
})

describe('🛑 a pool too small says so in words, never "around 0 meetings"', () => {
  it('zero capacity is a sentence, not a number', () => {
    // The founder's ruling for this exact state: "we need to say based on your current ICP we
    // cannot fnd more people. we can help widen the ICP. or give us a new goal."
    expect(capacitySentence(0)).toBe('not enough people yet for a programme at this targeting')
    expect(capacitySentence(0)).not.toMatch(/\b0\b/)
  })

  it('one meeting is singular — a product that says "1 meetings" reads as broken', () => {
    expect(capacitySentence(1)).toBe('around one meeting at this size')
  })
})

describe('the arithmetic is total — no input produces a number that lies', () => {
  it('exclusions larger than the match produce an empty pool, not a negative one', () => {
    expect(workablePool(10, 99)).toBe(0)
    expect(poolCapacity(10, 99).committed).toBe(0)
  })

  it('nonsense in produces zero out, never NaN on a client screen', () => {
    for (const bad of [NaN, Infinity, -1, -0.5]) {
      expect(Number.isFinite(committedCapacity(bad as number))).toBe(true)
      expect(committedCapacity(bad as number)).toBe(0)
      expect(Number.isFinite(workablePool(bad as number))).toBe(true)
    }
  })

  it('a fractional pool is floored before it is divided', () => {
    expect(workablePool(4_317.9)).toBe(4_317)
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════════
// ⚑ 22 Sep — WHERE THE NUMBER IS ALLOWED TO COME FROM, AND WHAT MAY NEVER LEAVE THE BUILDING
// ══════════════════════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs'
import { join } from 'path'

const src = (p: string) => readFileSync(join(__dirname, p), 'utf8')
const live = (t: string) => t.split('\n')
  .filter(l => { const x = l.trim(); return !x.startsWith('//') && !x.startsWith('*') && !x.startsWith('/*') })
  .join('\n')

const ROUTE   = live(src('../routes/icps.ts'))
const WELCOME = live(readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/welcome/page.tsx'), 'utf8'))
const DESK    = live(readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx'), 'utf8'))

describe('🛑 the buffer is ours — it never reaches a client screen', () => {
  it('the client route returns committed and workable, and NOT the benchmark or the headroom', () => {
    // Founder-locked: "we do 400. but present 250 to the client. we build buffer only we
    // know." Returning `benchmark` would hand the client a capacity we have deliberately
    // decided not to sell them, and `headroom` is the difference itself.
    const at = ROUTE.indexOf("icpRouter.get('/:id/capacity'")
    expect(at, 'the capacity route is gone').toBeGreaterThan(-1)
    const body = ROUTE.slice(at, at + 3_000)
    expect(body).toContain('committed:')
    expect(body).toContain('workable:')
    expect(body, 'the operator-only benchmark is on a client route').not.toContain('benchmark')
    expect(body, 'the headroom is on a client route').not.toContain('headroom')
  })

  // ⛓️ 22 Sep — ~~`expect(code).not.toMatch(/\b400\b/)`~~ WAS THE WRONG QUESTION AND THE TEST
  // CAUGHT ITSELF. Both screens legitimately name HTTP 400 in their own commentary, and the
  // Brief bar's note explains the very rule this file exists for. Banning the DIGITS asserts
  // something nobody cares about; what matters is that no screen re-derives the promise.
  it('🛑 neither client screen divides by the worst-case rate itself', () => {
    for (const [name, code] of [['Brief', WELCOME], ['Proof desk', DESK]] as const) {
      expect(code, `${name} divides by the worst-case rate in the browser`)
        .not.toMatch(/\/\s*400\b/)
      expect(code, `${name} declared its own copy of the rate`)
        .not.toMatch(/(const|let)\s+\w*(WORST_CASE|PER_MEETING)\w*\s*=/)
    }
  })

  it('🛑 neither client screen does the arithmetic — both read the shared model', () => {
    // A `Math.floor(n / 400)` written in a component is a second definition of a promise, and
    // the first one to drift from the slider the client is later stopped by.
    expect(WELCOME, 'the Brief bar stopped reading the shared capacity model')
      .toMatch(/capacitySentence\(committedCapacity\(/)
    expect(DESK, 'the Proof tiles compute capacity in the browser')
      .toMatch(/capacity\.committed/)
    expect(DESK, 'the Proof tiles stopped reading the server’s answer')
      .toMatch(/\/icps\/\$\{icpId\}\/capacity/)
  })
})

describe('🛑 a pool we could not measure is not a small pool', () => {
  it('the route reports `known`, and the tiles require it', () => {
    // "0 people · 0 meetings" after a provider timeout is a claim about the client's market
    // rather than about our connection — and it is the claim that would make them leave.
    expect(ROUTE).toContain('known: preview?.error == null')
    expect(DESK, 'the tiles render without knowing the pool is real')
      .toMatch(/capacity && capacity\.known/)
  })
})

describe('🛑 the exclusion subtraction is the client’s own instruction, nothing else', () => {
  it('the route counts only rows stamped `excluded:`', () => {
    // Everything else the gate sets aside is a real person we could still contact, ranked
    // lower. Subtracting those would shrink a pool we are making a promise against on the
    // strength of our own opinion about a prospect.
    const at = ROUTE.indexOf("icpRouter.get('/:id/capacity'")
    const body = ROUTE.slice(at, at + 3_000)
    expect(body).toContain("'excluded:%'")
    expect(body, 'the count widened beyond the client’s exclusions')
      .not.toMatch(/set_aside_reason.{0,40}not\.is|is\(.set_aside_reason., null\)/)
  })
})
