// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C8 · A SCORING FAILURE IS A RECORDED FACT, AND THE DESK SAYS "NOT SCORED"
//
// ── WHAT IS ALREADY RIGHT ───────────────────────────────────────────────────────────────
//
// `unscoredOnFailure()` (#477/#358) is careful and correct about the WRITE: `score: null`,
// `scored_at: null`, no fabricated deal value, and deliberately not `status:'scored'`, so the
// lead is never delivered or charged and `/figsy/rescore-stranded` picks it up again. Nothing
// about that changes here.
//
// ── THE DEFECT: THE FACT IS A SENTENCE, AND THE SENTENCE IS ON A CLIENT'S SCREEN ────────
//
// The failure is recorded by writing prose into `leads.score_reasoning`:
//
//     'SCORING_FAILED: AI scoring unavailable — not a real score (retried hourly by
//      /figsy/rescore-stranded)'
//
// and `programme-review.ts` maps that same column to the approval card's `why_fits`:
//
//     why_fits: scrub((l.score_reasoning as string | null) ?? null, first, last)
//
// 🛑 SO A CLIENT REVIEWING THEIR OWN PROGRAMME IS SHOWN AN INTERNAL ERROR STRING AS THE
// REASON A PROSPECT FITS THEM — naming an internal route, on the one screen the product asks
// them to approve. `scrub` removes the prospect's NAME; it has no opinion about this.
//
// And the score itself: `ProgrammeReview.tsx` renders the badge behind `{p.score != null && …}`,
// so an unscored prospect's card is simply missing it. A card with no badge is indistinguishable
// from a card whose fit we deliberately do not show. **Nothing anywhere says "not scored"**,
// which is the second half of J5-C8's REQ and the whole of LR 21's point: the desk reports the
// recorded state, including the state where the recorded state is "we could not".
//
// ── AND THE MARKER IS SPELLED IN THREE PLACES ───────────────────────────────────────────
//
// `scoring-failure.ts` writes it, `routes/internal.ts` matches it with
// `.like('score_reasoning', 'SCORING_FAILED%')`, and any reader that wants to know has to know
// the prefix too. One fact, three spellings, and a prose change in one of them silently
// unhooks the sweeper. This file asserts there is ONE predicate.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>

const store = vi.hoisted(() => ({ leads: [] as Row[], opt_out_blocklist: [] as Row[] }))

vi.mock('@kind/db', () => {
  const from = (t: string) => {
    const f: ((r: Row) => boolean)[] = []
    const rows = () => ((store as unknown as Record<string, Row[]>)[t] ?? [])
    const q: Record<string, unknown> = {
      select() { return q },
      eq(c: string, v: unknown) { f.push(r => r[c] === v); return q },
      is(c: string, v: unknown) { f.push(r => (r[c] ?? null) === v); return q },
      in(c: string, v: unknown[]) { f.push(r => v.includes(r[c])); return q },
      /**
       * ⚠️ `.not('status', 'in', '(a,b,c)')` IS A DIFFERENT SHAPE from `.not(col,'is',null)`
       * and the review scan sends BOTH. A mock that handled only the second would silently
       * admit a `passed` prospect and this file would be proving the wrong population.
       */
      not(c: string, op: string, v: unknown) {
        if (op === 'in') {
          const set = String(v).replace(/^\(|\)$/g, '').split(',').map(x => x.trim())
          f.push(r => !set.includes(String(r[c] ?? '')))
        } else {
          f.push(r => (r[c] ?? null) !== v)
        }
        return q
      },
      gt(c: string, v: unknown) { f.push(r => String(r[c] ?? '') > String(v)); return q },
      order() { return q },
      limit() { return q },
      async maybeSingle() { return { data: rows().filter(r => f.every(fn => fn(r)))[0] ?? null, error: null } },
      then(res: (v: unknown) => unknown) { return res({ data: rows().filter(r => f.every(fn => fn(r))), error: null }) },
    }
    return q
  }
  return { db: { from, rpc: async () => ({ data: null, error: null }) } }
})

const CLIENT = 'c1111111-1111-4111-8111-111111111111'
const PROG = 'p2222222-2222-4222-8222-222222222222'

const FAILED_REASONING =
  'SCORING_FAILED: AI scoring unavailable — not a real score (retried hourly by /figsy/rescore-stranded)'

/**
 * A prospect that passes the WHOLE review predicate. Every one of these columns is a filter in
 * `scanEligible`, and a fixture missing one produces an empty desk that looks like a defect.
 */
const lead = (over: Row = {}): Row => ({
  id: `lead-${Math.abs(Number(over.n ?? 1))}`, client_id: CLIENT, programme_id: PROG,
  delivered_at: '2026-09-18T08:20:00Z', qualified_at: '2026-09-18T08:25:00Z',
  disqualified_at: null, revealed_at: null, opted_out_at: null,
  provider_eviction_required_at: null,
  first_name: 'Ada', last_name: 'Redmayne', job_title: 'Managing Director',
  company: 'Redmayne', industry: 'Marketing agency', country: 'United Kingdom',
  email: `a${over.n ?? 1}@redmayne.co.uk`, status: 'surfaced',
  score: 82, score_reasoning: 'Runs a 30-person agency in the UK — squarely in the stated category.',
  scored_at: '2026-09-18T09:00:00Z',
  created_at: '2026-09-18T08:00:00Z', surfaced_for_approval_at: '2026-09-18T08:30:00Z',
  ...over,
})

beforeEach(() => {
  store.leads = []
  store.opt_out_blocklist = []
})

describe('J5-C8 · one predicate says whether scoring failed', () => {
  it('🛑 the marker is not a string three files each know separately', async () => {
    const { scoringFailed, SCORING_FAILED_PREFIX } = await import('./scoring-failure')
    expect(scoringFailed(FAILED_REASONING), 'the recorded failure was not recognised').toBe(true)
    expect(scoringFailed('Runs a 30-person agency in the UK.')).toBe(false)
    expect(scoringFailed(null), 'a lead nobody has scored yet is not a scoring FAILURE').toBe(false)
    expect(scoringFailed(''), 'an empty reasoning is not a failure').toBe(false)
    // 🛑 THE WRITER AND THE PREDICATE AGREE BY CONSTRUCTION, not by coincidence: the sentence
    // that actually gets stored is checked against the shared constant and the shared `LIKE`.
    const { unscoredOnFailure, SCORING_FAILED_LIKE } = await import('./scoring-failure')
    const stored = unscoredOnFailure().score_reasoning
    expect(stored.startsWith(SCORING_FAILED_PREFIX), 'the stored sentence no longer carries the marker').toBe(true)
    expect(scoringFailed(stored), 'the writer and the predicate have drifted apart').toBe(true)
    expect(SCORING_FAILED_LIKE, 'the sweeper pattern is not derived from the prefix')
      .toBe(`${SCORING_FAILED_PREFIX}%`)
  })

  it('🛑 the sweeper matches the SAME constant, not its own copy of the prefix', () => {
    // ⚠️ SOURCE-TEXT, AND IT IS THE RIGHT INSTRUMENT HERE. The defect is two files agreeing by
    // coincidence: behaviour cannot tell a shared constant from two identical literals, and it
    // is exactly that coincidence which breaks the day somebody rewords the sentence.
    const src = readFileSync(join(__dirname, '../routes/internal.ts'), 'utf8')
    const code = src.split('\n').filter(l => {
      const t = l.trim()
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
    }).join('\n')
    const hardcoded = /\.like\(\s*'score_reasoning'\s*,\s*'SCORING_FAILED/.test(code)
    expect(hardcoded, 'the stranded-rescore sweeper carries its own copy of the marker prefix').toBe(false)
    expect(code, 'the sweeper does not use the shared constant').toMatch(/SCORING_FAILED_(PREFIX|LIKE)/)
  })
})

describe('J5-C8 · the desk says NOT SCORED, and never says the error', () => {
  it('🛑 an unscored prospect is marked not-scored on its card', async () => {
    store.leads = [lead({ n: 1, score: null, score_reasoning: FAILED_REASONING, scored_at: null })]
    const { readProgrammeReviewSet } = await import('./programme-review')
    const set = await readProgrammeReviewSet(CLIENT, PROG)
    const card = set.prospects[0]
    expect(card, 'the unscored prospect vanished from the review set entirely').toBeTruthy()
    expect(card.not_scored, 'the card does not say it is unscored — it just has no badge').toBe(true)
    expect(card.score).toBeNull()
  })

  it('🛑 THE INTERNAL ERROR STRING NEVER REACHES THE CARD', async () => {
    store.leads = [lead({ n: 1, score: null, score_reasoning: FAILED_REASONING, scored_at: null })]
    const { readProgrammeReviewSet } = await import('./programme-review')
    const card = (await readProgrammeReviewSet(CLIENT, PROG)).prospects[0]
    const shown = JSON.stringify(card)
    expect(shown, 'a client was shown "SCORING_FAILED" as the reason a prospect fits them').not.toMatch(/SCORING_FAILED/)
    expect(shown, 'an internal route name reached a client\'s approval screen').not.toMatch(/rescore-stranded/)
    expect(shown, 'internal prose reached a client\'s approval screen').not.toMatch(/AI scoring unavailable/i)
    expect(card.why_fits, 'the failure sentence was handed over as the fit explanation').toBeNull()
  })

  it('a genuinely scored prospect is unchanged — this adds a state, it does not take one away', async () => {
    store.leads = [lead({ n: 1 })]
    const { readProgrammeReviewSet } = await import('./programme-review')
    const card = (await readProgrammeReviewSet(CLIENT, PROG)).prospects[0]
    expect(card.score).toBe(82)
    expect(card.not_scored).toBe(false)
    expect(card.why_fits).toContain('30-person agency')
  })

  it('a prospect nobody has scored YET is not-scored too — the client cannot tell the difference', async () => {
    // ⚠️ AND SHOULD NOT HAVE TO. "Our scorer broke" and "this one has not been through the
    // scorer" are one fact on a review desk: no fit number is available for this person. The
    // DISTINCTION matters to the sweeper, which reads the marker, not the card.
    store.leads = [lead({ n: 1, score: null, score_reasoning: null, scored_at: null })]
    const { readProgrammeReviewSet } = await import('./programme-review')
    const card = (await readProgrammeReviewSet(CLIENT, PROG)).prospects[0]
    expect(card.not_scored).toBe(true)
    expect(card.why_fits).toBeNull()
  })

  it('🛑 unscored prospects sink, they do not disappear — the package is what gets worked', async () => {
    // An unscored prospect is still in the programme and still gets emailed, so hiding it from
    // the screen the client approves would be the screen disagreeing with the thing approved.
    store.leads = [
      lead({ n: 1, score: null, score_reasoning: FAILED_REASONING, scored_at: null }),
      lead({ n: 2, score: 91 }),
      lead({ n: 3, score: 40 }),
    ]
    const { readProgrammeReviewSet } = await import('./programme-review')
    const set = await readProgrammeReviewSet(CLIENT, PROG)
    expect(set.total).toBe(3)
    expect(set.prospects.map(p => p.score), 'ranking changed or a prospect was dropped').toEqual([91, 40, null])
    expect(set.prospects[2].not_scored).toBe(true)
  })
})

describe('J5-C8 · the FROZEN approval page carries it too', () => {
  it('🛑 the screen the client actually approves says not-scored and hides the error', async () => {
    // ⚠️ THIS IS THE MVP1 SURFACE, NOT THE LIVE RECOMPUTATION ABOVE. `readFrozenReviewPage` is
    // what the approval screen renders (11 Sep, DAY 3 — the client approves the FREEZE, not a
    // re-run), so a fix that only reached the live path would have missed the one screen that
    // matters. Both go through `toCard`; this proves it rather than assuming it.
    store.leads = [
      lead({ n: 1, score: null, score_reasoning: FAILED_REASONING, scored_at: null }),
      lead({ n: 2, score: 91 }),
    ]
    const { readFrozenReviewPage } = await import('./programme-review')
    const page = await readFrozenReviewPage(CLIENT, PROG, ['lead-1', 'lead-2'], 0, 50)
    expect(page.total).toBe(2)
    expect(JSON.stringify(page), 'the frozen approval page leaked the scoring error').not.toMatch(/SCORING_FAILED/)
    const unscored = page.prospects.find(p => p.score == null)
    expect(unscored?.not_scored, 'the frozen page renders no badge and says nothing').toBe(true)
  })
})

describe('J5-C8 · the WRITE still refuses to invent a score', () => {
  it('🛑 the failure payload fabricates nothing — the #477/#358 guarantee, kept', async () => {
    const { unscoredOnFailure } = await import('./scoring-failure')
    const p = unscoredOnFailure()
    expect(p.score, 'a fake score was written for a failed scoring run').toBeNull()
    expect(p.scored_at, 'a lead that was never scored carries a scored_at').toBeNull()
    expect(p.estimated_deal_value_usd, 'a deal value was invented for an unscored lead').toBeNull()
    expect(Object.keys(p), 'the failure payload started setting status — an unscored lead would be delivered')
      .not.toContain('status')
    // The marker is still written, because the sweeper is what retries these.
    const { scoringFailed } = await import('./scoring-failure')
    expect(scoringFailed(p.score_reasoning), 'the failure stopped being recognisable to the sweeper').toBe(true)
  })
})
