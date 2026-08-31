// ═══════════════════════════════════════════════════════════════════════════════════════
// BUILD-004A-2C — THE MILLA REPORTING SURFACES: REPORTS, PERFORMANCE, ANALYTICS, YOUR ROI.
//
// 🛑 THE FINDING THIS SUITE EXISTS FOR. The old ROI page led with "Pipeline value touched", a
// dollar figure from `/leads/stats.pipeline_value_usd` = `SUM(leads.estimated_deal_value_usd)`
// — and that column is written in exactly one place, `lib/scoring.ts:221`:
//
//     estimated_deal_value_usd: r.score * 100
//
// A lead's FIT SCORE times one hundred, summed, and printed as the headline of the page that
// tells a client what they got for their money. Three of these four routes were wrappers
// around the old portal, so no guard had ever been pointed at them.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const REPO   = join(__dirname, '../../../..')
const PORTAL = join(REPO, 'apps/portal/src')

/** Blocks first, then lines — the stripper the 4A-2B slice had to correct. */
const strip = (s: string) => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter(l => !l.trim().startsWith('//'))
  .join('\n')

const page = (route: string) => strip(readFileSync(join(PORTAL, `app/(milla)/milla/${route}/page.tsx`), 'utf8'))

const REPORTS     = page('reports')
const PERFORMANCE = page('performance')
const ANALYTICS   = page('analytics')
const ROI         = page('roi')
const ALL = [
  ['reports', REPORTS], ['performance', PERFORMANCE],
  ['analytics', ANALYTICS], ['roi', ROI],
] as const

/** Retired customer commercial truth, and invented economics. None may render on any of them. */
const FORBIDDEN: [RegExp, string][] = [
  [/\$299/,                    'the $299 pack price'],
  [/\$4\b/,                    'the per-lead price'],
  [/wallet/i,                  'the wallet'],
  [/\bcredits?\b/i,            'credits as customer currency'],
  [/approved lead|leads approved/i, 'the per-lead approval'],
  [/first 100|included leads/i, 'the 100-lead pack'],
  [/per-lead spend/i,          'per-lead spend'],
  // ⛓️ BOTH THE IDENTIFIER AND THE LABEL. The first cut forbade only `pipeline_value_usd` /
  // `pipelineValue` — the code names — and a RED proof that simply relabelled a card
  // "Pipeline value touched" walked straight through. A customer reads the label, not the
  // variable; the retired headline has to be forbidden as text in its own right.
  [/pipeline_value_usd|pipelineValue/i, 'the fabricated pipeline value (by identifier)'],
  [/pipeline value|value touched/i,     'the fabricated pipeline value (by label)'],
  [/estimated_deal_value/i,    'the score×100 deal estimate'],
  [/cost per meeting/i,        'cost per meeting on the retired economics'],
  [/industryAvg|industry average/i, 'a hardcoded industry benchmark'],
  [/guarantee/i,               'a guarantee'],
  [/projected revenue|revenue generated/i, 'projected revenue'],
  [/close rate|closeRate/i,    'an assumed close rate'],
]

// ════════════════════════════════════════════════════════════════════════════════════════
describe('🛑 THE FORK — NONE OF THE FOUR RENDERS A /dashboard SCREEN', () => {
  it('the sweep is not vacuous — all four are real pages', () => {
    for (const [name, src] of ALL) {
      expect(src, `${name} is not a real page`).toMatch(/export default function Milla\w+Page/)
      expect(src.split('\n').length, `${name} still looks like a 13-line wrapper`).toBeGreaterThan(40)
    }
  })

  it('🛑 not one of them imports from (dashboard)', () => {
    // One import restores every forbidden string below in full, and no other guard here
    // would notice. Three of these four WERE that import.
    for (const [name, src] of ALL) {
      expect(src, `the Milla ${name} page renders the old portal's screen again`)
        .not.toContain('(dashboard)')
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('🛑 NO INVENTED ECONOMICS ON ANY REPORTING SURFACE', () => {
  for (const [name, src] of ALL) {
    it(`${name} carries no retired or fabricated money truth`, () => {
      for (const [rx, what] of FORBIDDEN) {
        expect(src, `${what} is on the Milla ${name} page`).not.toMatch(rx)
      }
    })
  }

  it('🛑 the fabricated deal estimate is still fabricated — this is not a false alarm', () => {
    // Vacuity check on the finding itself: if `scoring.ts` ever computes a REAL deal value,
    // this guard should be revisited rather than left asserting a stale accusation.
    const scoring = readFileSync(join(REPO, 'apps/api/src/lib/scoring.ts'), 'utf8')
    expect(scoring, 'the score×100 deal estimate is gone — re-check what ROI may now show')
      .toContain('estimated_deal_value_usd: r.score * 100')
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('YOUR ROI — IT DOES NOT CLAIM A RETURN IT CANNOT COMPUTE', () => {
  it('the page computes no ROI at all', async () => {
    const { canComputeRoi, ROI_MISSING_INPUTS } = await import('../../../portal/src/lib/programme-report')
    // 🛑 EXECUTED, NOT READ. The rule is a decision about truth, so the suite runs it.
    expect(canComputeRoi()).toBe(false)
    expect(ROI_MISSING_INPUTS.length).toBeGreaterThan(0)
    expect(ROI).toContain('canComputeRoi()')
    // No arithmetic that could become a return.
    expect(ROI, 'the ROI page divides two figures — that is a return').not.toMatch(/\/\s*(programmeMoney|totalCents)/)
    expect(ROI).not.toMatch(/roiPct|returnPct|multiple|×\s*\d|x ROI/i)
  })

  it('it says WHY, naming what is missing', () => {
    expect(ROI).toContain('ROI_MISSING_INPUTS')
    expect(ROI).toContain("We can show you what your programme cost and what it produced")
  })

  it('and it agrees with what Milla says in conversation', () => {
    // She correctly told the founder ROI needs a target outcome to measure against. A page
    // claiming a return while she says she cannot compute one is the product contradicting
    // itself in front of the customer.
    expect(ROI).toContain("How is my ROI looking?")
    const prompt = readFileSync(join(REPO, 'apps/api/src/lib/milla-chat-system.ts'), 'utf8')
    expect(prompt, 'Milla no longer refuses to invent metrics').toMatch(/Never invent metrics/)
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
// THE FOUNDER-APPROVED COPY, 31 Aug. Five of the six items were "keep exactly as built", which
// is only worth anything if something stops them drifting. These are that something.
describe('THE APPROVED CUSTOMER COPY IS EXACT', () => {
  const SUBTITLES: [string, string, string][] = [
    ['reports',     REPORTS,     'What your programme set out to do, and what it has produced.'],
    ['performance', PERFORMANCE, 'How your programme is doing against what it set out to deliver.'],
    ['analytics',   ANALYTICS,   'What has been measured on your programme.'],
    ['roi',         ROI,         'What your programme cost, and what it has produced.'],
  ]

  for (const [route, src, sub] of SUBTITLES) {
    it(`the ${route} subtitle is the approved one, word for word`, () => {
      expect(src, `the approved ${route} subtitle changed`).toContain(`sub="${sub}"`)
    })
  }

  it('the Return heading and body are exact', () => {
    expect(ROI, 'the Return heading changed').toMatch(/>\s*Return\s*</)
    // ⚠️ THE APOSTROPHE IS `&rsquo;` — this is a JSX text node and every other apostrophe on
    // these pages is written the same way. A literal ’ here would render identically and
    // break the file's convention; a straight ' would not match the approved copy at all.
    expect(ROI, 'the approved Return body changed').toContain(
      'We can show you what your programme cost and what it produced. We can&rsquo;t')
    expect(ROI).toContain('work out a return, because that depends on numbers only you have:')
  })

  it('🛑 the three ROI input bullets are exact, and address the customer directly', async () => {
    // ⛓️ 31 Aug — THE FOUNDER'S CORRECTION. These were written as a note ABOUT a customer and
    // are READ BY that customer; "worth to them" turned a plain admission into something
    // overheard. Asserted on the EXPORTED ARRAY rather than the file, because the module's
    // own comments legitimately still discuss "a client" in the third person — a file-level
    // scan would bind to the explanation instead of the copy.
    const { ROI_MISSING_INPUTS } = await import('../../../portal/src/lib/programme-report')
    expect([...ROI_MISSING_INPUTS]).toEqual([
      'what a booked meeting is worth to you',
      'how many of those meetings become customers',
      'revenue attributed to a meeting we booked',
    ])
    for (const line of ROI_MISSING_INPUTS) {
      expect(line, `a bullet speaks about the customer in the third person: "${line}"`)
        .not.toMatch(/\b(them|their|they)\b/)
    }
    // And the page renders that array rather than a local copy that could drift from it.
    expect(ROI).toContain('ROI_MISSING_INPUTS.map')
  })

  it('🛑 the score×100 estimate cannot surface as money or ROI inside Milla', () => {
    // PARKED as a separate defect by the founder: the writer stays, Milla's protection stays.
    for (const [name, src] of ALL) {
      for (const rx of [/estimated_deal_value/i, /pipeline value|value touched/i, /\/leads\/stats/]) {
        expect(src, `the score×100 estimate can reach the Milla ${name} page`).not.toMatch(rx)
      }
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('STAGE AWARENESS — NO ACTIVITY IS CLAIMED BEFORE IT WAS AUTHORISED', () => {
  it('the rules are shared and executable, not re-decided per page', async () => {
    const { outreachHasRun, sourcingHasRun } = await import('../../../portal/src/lib/programme-report')
    // Outreach is authorised by Payment 2 → Live. Sourcing by Payment 1 → Sourcing.
    for (const s of ['Proof', 'Recommendation'] as const) {
      expect(outreachHasRun(s), `${s} claims outreach`).toBe(false)
      expect(sourcingHasRun(s), `${s} claims sourcing`).toBe(false)
    }
    expect(sourcingHasRun('Sourcing')).toBe(true)
    expect(outreachHasRun('Sourcing'), 'Sourcing claims outreach — Payment 2 has not landed').toBe(false)
    for (const s of ['Live', 'Review', 'Completion'] as const) {
      expect(outreachHasRun(s), `${s} does not count as outreach`).toBe(true)
    }
  })

  it('every page gates its outreach figures on that rule', () => {
    for (const [name, src] of ALL) {
      expect(src, `${name} does not gate outreach figures on the stage`).toContain('outreachHasRun(p.stage)')
    }
  })

  it('an unreadable count is a dash, never a zero', () => {
    // Rendering a failed read as "0 replies" tells a client with six that they have none.
    const stat = strip(readFileSync(join(PORTAL, 'components/milla/ProgrammeStat.tsx'), 'utf8'))
    expect(stat).toContain("v === null ? '—'")
    for (const [name, src] of ALL) {
      expect(src, `${name} coerces a failed count to zero`).not.toMatch(/\?\?\s*0\b/)
    }
  })

  it('Reports does not manufacture a narrative it cannot source', () => {
    // "What worked", "what did not" and "what Milla learned" have no client-scoped source
    // these routes can read. Omitted and reported, not filled with a story about zeros.
    expect(REPORTS).toContain('What were we trying to achieve?')
    expect(REPORTS).toContain('What happened?')
    expect(REPORTS).toContain('What happens next?')
    expect(REPORTS, 'a narrative section was invented without a source')
      .not.toMatch(/What worked\?|What did not work\?|What Milla learned/)
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('ISOLATION — NOTHING OUTSIDE THE MILLA REPORTING SURFACES MOVED', () => {
  it('🛑 the shared /dashboard pages still carry their own truth, untouched', () => {
    // Their retired strings ARE the proof they were left alone. Cleaning them would have
    // changed a separately-routed live product under its own users.
    const roi = readFileSync(join(PORTAL, 'app/(dashboard)/dashboard/roi/page.tsx'), 'utf8')
    const kpis = readFileSync(join(PORTAL, 'app/(dashboard)/dashboard/kpis/page.tsx'), 'utf8')
    expect(roi, 'the shared ROI page was edited by this slice').toContain('Pipeline value touched')
    expect(kpis, 'the shared KPI page was edited by this slice').toContain('industryAvg={0.071}')
    for (const src of [roi, kpis]) expect(src).not.toContain('(milla)')
  })

  it('Billing and Usage truth is intact', () => {
    const billing = page('billing')
    const usage   = page('usage')
    expect(billing).toContain('The first payment authorises sourcing and preparation. Outreach has not started.')
    expect(billing).toContain("import { halves, programmeMoney } from '@/lib/programme-money'")
    expect(usage).not.toMatch(/wallet|\bcredits?\b/i)
  })

  it('the Milla lifecycle and calibration are intact', () => {
    const shell = strip(readFileSync(join(PORTAL, 'components/milla/MillaShell.tsx'), 'utf8'))
    const home  = strip(readFileSync(join(PORTAL, 'app/(milla)/milla/page.tsx'), 'utf8'))
    expect(shell).toContain('{MILLA_STAGES.map((label, i, arr) => {')
    for (const control of ['👍 Looks right', 'Not a fit', 'Tell Milla why']) {
      expect(home, `the calibration control "${control}" is gone`).toContain(control)
    }
  })

  it('no migration was added by this slice', () => {
    const pending = readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')
    expect(pending).not.toContain('20260901')
  })
})
