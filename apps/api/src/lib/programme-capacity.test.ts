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
/**
 * Executable code only — TS, JSX and SQL comments removed.
 *
 * ⛓️ REWRITTEN AFTER MY OWN COMMENTS FAILED MY OWN GUARDS, which `milla-programme.test.ts`
 * records as having happened SEVEN times in this repo already. A line-prefix filter cannot
 * see inside a `{/* … *\/}` block, so a tombstone that quotes the thing it removed — the
 * word "Ireland", the old `v_auto_used < 2` ceiling — reads as the violation itself. Prose
 * ABOUT a rule is not a breach of it, and a guard that cannot tell them apart reports
 * failures that are not there: exactly as useless as one that misses failures that are.
 *
 * Line-anchored, because a non-greedy block regex over a whole file eats real code.
 */
const live = (t: string): string => {
  let inBlock = false
  return t.split('\n').map(l => {
    const x = l.trim()
    if (inBlock) { if (x.endsWith('*/') || x.endsWith('*/}')) inBlock = false; return '' }
    if (x.startsWith('/*')) { if (!x.endsWith('*/')) inBlock = true; return '' }
    if (x.startsWith('{/*')) { if (!x.endsWith('*/}')) inBlock = true; return '' }
    if (x.startsWith('--')) return ''
    const i = l.search(/(?<!:)\/\//)
    return i >= 0 ? l.slice(0, i) : l
  }).join('\n')
}

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

// ══════════════════════════════════════════════════════════════════════════════════════════
// ⚑ 22 Sep — WHEN WE CANNOT ANSWER, WE HAND THEM THE FIELDS. WE NEVER GUESS.
//
//     "if Milla cant answer we then say to the client please use drop down boxes on right
//      mannually. we never assume."
//     "we cant guess peoples way of speaking ever"
//
// 🛑 THE LOCKED PREVIEW HAS MILLA SAY *"Ireland is the closest fit to what you described"* —
// a judgement about which country resembles a market. That is the same class of guess that
// produced the invented sixteen-word industry vocabulary, and it is the class the founder
// ruled out. So the widen ROUTE is built and the OPINION is not: the client is told what
// their pool carries, told re-counting is free, and handed the controls.
// ══════════════════════════════════════════════════════════════════════════════════════════
describe('🛑 the widen route is offered without an opinion attached', () => {
  it('the Proof desk states the capacity and points at the fields', () => {
    const flat = DESK.replace(/\s+/g, ' ')
    expect(flat, 'the capacity is not stated on the desk').toContain('Your targeting carries')
    expect(flat, 'the client is not handed the controls')
      .toContain('Widen it yourself in the targeting fields on your Brief')
    expect(flat, 're-counting is not promised as free').toContain('looking is free')
    expect(DESK, 'there is no route to the fields').toContain('/milla/welcome')
  })

  it('🛑 and it proposes no geography, industry or size of its own', () => {
    // The specific guess the preview contained, and the shape of every guess like it. If a
    // future edit reintroduces "we suggest adding X", this is what should stop it.
    const flat = DESK.replace(/\s+/g, ' ')
    for (const guess of ['Ireland', 'closest fit', 'we suggest adding', 'we recommend widening to']) {
      expect(flat, `the desk guessed on the client's behalf: "${guess}"`).not.toContain(guess)
    }
  })

  it('a pool too small says so and still offers the same route', () => {
    const flat = DESK.replace(/\s+/g, ' ')
    expect(flat).toContain('There aren&rsquo;t enough people at this targeting for a programme yet.')
  })
})

describe('🛑 refinement is unlimited, and nothing tells the client otherwise', () => {
  it('the migration exists and removes the ceiling rather than raising it', () => {
    const sql = live(readFileSync(
      join(__dirname, '../../../../supabase/migrations/20260922_unlimited_proof_refinement.sql'), 'utf8'))
    expect(sql).toContain('create or replace function public.claim_proof_authority')
    expect(sql, 'a numeric ceiling is still in the claim function').not.toMatch(/v_auto_used\s*<\s*\d/)
    // ⚠️ AND SEQUENTIALITY IS WHAT REPLACES THE COUNT AS THE SAFETY PROPERTY.
    expect(sql).toContain('proof_pass_claims_one_open')
  })

  it('the runner carries it too — a .sql on disk LOOKS applied and runs nothing', () => {
    const runner = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')
    expect(runner).toContain("key: '20260922_unlimited_proof_refinement'")
  })

  it('🛑 her prompt no longer counts down, and no longer refuses a third', () => {
    const ctx = live(readFileSync(join(__dirname, 'milla-proof-context.ts'), 'utf8'))
    expect(ctx).toContain('There is NO limit')
    expect(ctx, 'she is still told to refuse a set the server would grant')
      .not.toContain('Never offer a third')
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════════
// ⚑ 22 Sep — THE UNWORKED AMOUNT, AND THE OPERATOR'S HALF OF THE BUFFER
//
//     "we only count the unworked amount. and if we dont have enough we tll the client
//      improve your ICP. Widen your target market."
//
// 🛑 AND THE REASON IS HARDER THAN "THEY ALREADY HAD OUR EMAIL". The sourcing loop REFUSES a
// contact it already holds a lead row for — `leads` keyed on `(client_id, apollo_id)`, logged
// as "already owned by this client". Those people cannot be served again at all, so counting
// them promises meetings against humans the product will decline to hand over.
// ══════════════════════════════════════════════════════════════════════════════════════════
describe('🛑 a second programme counts only the people we have not used', () => {
  it('the first programme is unaffected — nothing has been worked yet', () => {
    expect(poolCapacity(4_380, 63, 0).workable).toBe(4_317)
    expect(poolCapacity(4_380, 63, 0).committed).toBe(10)
  })

  it('🛑 coming back after 2,500 worked leaves 1,817 — and four meetings, not ten', () => {
    // The exact case: they bought ten, we contacted 2,500 of the 4,317 to get them. The
    // second programme is sized on what is left.
    const again = poolCapacity(4_380, 63, 2_500)
    expect(again.workable).toBe(1_817)
    expect(again.committed, 'the second programme re-sold people we cannot source again').toBe(4)
  })

  it('🛑 and when it is not enough we say so rather than quoting zero', () => {
    // Founder's route for this: improve the ICP, widen the market. The sentence must not be
    // a number pretending to be an offer.
    const spent = poolCapacity(4_380, 63, 4_300)
    expect(spent.committed).toBe(0)
    expect(capacitySentence(spent.committed))
      .toBe('not enough people yet for a programme at this targeting')
  })

  it('a set-aside row still counts as worked — the dedupe does not care why it exists', () => {
    // Anyone with a lead row is unavailable, refused or not. Proved as arithmetic: the caller
    // passes a count of ROWS, and this never second-guesses which of them "really" count.
    expect(workablePool(100, 0, 40)).toBe(60)
  })

  it('the subtractions cannot drive it negative', () => {
    expect(workablePool(100, 60, 60)).toBe(0)
    expect(poolCapacity(100, 60, 60).committed).toBe(0)
  })
})

describe('🛑 the operator sees both numbers; the client still sees one', () => {
  const OPERATOR = live(src('../routes/operator.ts'))

  it('the operator route returns committed, benchmark AND headroom', () => {
    for (const route of ["'/clients/:id/capacity'", "'/brief-drafts/:id/facts'"]) {
      const at = OPERATOR.indexOf(`operatorRouter.get(${route}`)
      expect(at, `${route} is gone`).toBeGreaterThan(-1)
      const body = OPERATOR.slice(at, at + 4_000)
      for (const k of ['committed:', 'benchmark:', 'headroom:']) {
        expect(body, `${route} withholds ${k} from the operator`).toContain(k)
      }
    }
  })

  it('🛑 …and the CLIENT route still returns neither — the guard from #1718 still holds', () => {
    const at = ROUTE.indexOf("icpRouter.get('/:id/capacity'")
    const body = ROUTE.slice(at, at + 4_000)
    expect(body, 'the benchmark reached a client route').not.toContain('benchmark')
    expect(body, 'the headroom reached a client route').not.toContain('headroom')
  })

  it('🛑 both routes subtract the already-worked count, from the same column', () => {
    // A client-side pool that disagreed with the operator's would be two answers about one
    // market, in front of the person trying to explain it to them.
    const client = ROUTE.slice(ROUTE.indexOf("icpRouter.get('/:id/capacity'"),
      ROUTE.indexOf("icpRouter.get('/:id/capacity'") + 4_000)
    expect(client).toContain('already_worked')
    expect(OPERATOR).toContain('already_worked')
  })

  it('the operator is shown the provider’s own field names, not our labels', () => {
    // "c_suite", not "C-Suite". An operator asked why a search returned those people needs
    // the request, not a friendly restatement of it.
    for (const f of ['person_titles', 'person_seniorities',
      'organization_num_employees_ranges', 'person_locations']) {
      expect(OPERATOR, `${f} is not on an operator surface`).toContain(f)
    }
    // ⚠️ AND THE CATEGORY IS NAMED AS NOT SENT, so an operator can see it left the request
    // rather than wonder where it went.
    expect(OPERATOR).toContain('ranking signal (not sent as a filter)')
  })

  it('an unreadable ledger is never rendered as $0 spent', () => {
    const at = OPERATOR.indexOf("operatorRouter.get('/clients/:id/brief-facts'")
    const body = OPERATOR.slice(at, at + 4_000)
    expect(body, 'a failed spend read answers zero').toContain('Could not read spend')
  })
})
