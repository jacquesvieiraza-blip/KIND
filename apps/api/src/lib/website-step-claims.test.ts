// ONE STEP LIMIT — the guard for the last unbound claim class on the site.
//
// Money, the retired price ladder, "free to start" and the website freeze were all already
// bound to constants by tests in this family. **Step counts were not**, and the 6-Aug audit
// found what that costs: FOUR DIFFERENT LIMITS LIVE AT ONCE.
//
//   • `sequence-quality.ts` blocked ACTIVATION at 7 — the real gate
//   • `operator.ts` let an operator SAVE 10, so you could build an 8-step sequence, save it
//     with no complaint, and only meet the wall on pressing activate (#626's shape)
//   • the Vida editor and the CLIENT's own editor each hard-coded a bare `7` — right that
//     day, silently wrong the day the number moves
//   • the client-facing Sequences page, linked in BOTH portal sidebars, capped at 3 and told
//     the client *"(max 3)"*
//
// …while five website pages and the landing page promised **10**. A prospect could read 10,
// a client could be shown 3, and the system enforced 7.
//
// Every one of those was individually plausible. The defect only existed BETWEEN them, which
// is exactly the kind nothing catches until a client asks why they cannot add a ninth email.
//
// So this file asserts the one thing no single file can: that everything agrees.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { MAX_SEQUENCE_STEPS } from '@kind/shared'

const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

/** Every surface a human can read a step count on — marketing AND product. */
const COPY_DIRS = ['apps/website', 'apps/landing', 'apps/portal/src', 'apps/admin/src']

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) { if (!['node_modules', '.next', 'dist'].includes(entry)) walk(p, out) }
    else if (/\.(html|tsx?)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(p)
  }
  return out
}

/** Strip comments so the sweep reads what a USER sees, not what a developer wrote. */
export function stripNonRendered(src: string): string {
  return src
    .replace(/<!--[\s\S]*?-->/g, '')      // HTML comments
    .replace(/\/\*[\s\S]*?\*\//g, '')      // /* … */ and {/* … */}
    .replace(/(^|[^:'"`])\/\/[^\n]*/gm, '$1')  // // … (never inside a URL)
}

/**
 * CAP claims — a promise about the MOST steps allowed.
 *
 * Deliberately narrow. It matches "up to N steps", "≤N steps", "max N steps", "(max N)" —
 * the phrasings the audit actually found — and NOT `step: 1` or `steps[i]`, which appear on
 * every sent-email insert and every loop in the codebase. A guard that fires on those gets
 * switched off within a day.
 */
export function stepCapClaims(src: string): { text: string; number: number; index: number }[] {
  const out: { text: string; number: number; index: number }[] = []
  const patterns = [
    /(?:up to|upto)\s*(\d{1,2})\s*(?:email\s*)?steps?/gi,
    /[≤<]=?\s*(\d{1,2})\s*(?:email\s*)?steps?/gi,
    /max(?:imum)?\.?\s*(?:of\s*)?(\d{1,2})\s*(?:email\s*)?steps?/gi,
    /\(max\s*(\d{1,2})\)/gi,
  ]
  for (const re of patterns) {
    for (const m of stripNonRendered(src).matchAll(re)) {
      out.push({ text: m[0], number: Number(m[1]), index: m.index ?? 0 })
    }
  }
  return out
}

/**
 * DESCRIPTIVE counts — "a 3-step email sequence".
 *
 * ⚠️ NOT asserted against the cap, and the reason is verified rather than assumed: the AI
 * drafter really does write THREE steps (`figsy.ts` — "Step 2 (Day 4)", "Step 3 (Day 9)"),
 * so the portal saying *"AI-personalised 3-step email sequences"* is TRUE. It describes what
 * FIGSY produces by default, not the most a client may build. Forcing it to 7 would have
 * replaced a true sentence with a false one — which is how a guard starts causing the defect
 * it was written to prevent. Exposed so a future change to the drafter can be checked here.
 */
export function stepDescriptiveCounts(src: string): number[] {
  return [...stripNonRendered(src).matchAll(/(\d{1,2})[-\s]step\s*(?:email\s*)?sequence/gi)]
    .map(m => Number(m[1]))
}

describe('the claim-finder works — otherwise the sweep below passes on nothing', () => {
  it('finds each CAP phrasing this repo actually used', () => {
    expect(stepCapClaims('Sequences of up to 10 steps').map(c => c.number)).toEqual([10])
    expect(stepCapClaims('Follow-up sequence (≤10 steps)').map(c => c.number)).toEqual([10])
    expect(stepCapClaims('Add email step (max 3)').map(c => c.number)).toEqual([3])
  })

  it('does NOT fire on ordinary code that happens to mention a step', () => {
    expect(stepCapClaims('step: 1, subject, body')).toEqual([])
    expect(stepCapClaims('for (let i = 0; i < steps.length; i++)')).toEqual([])
    expect(stepCapClaims('currentStep === 3')).toEqual([])
  })

  it('does NOT fire on a COMMENT — a guard must read copy, not developer prose', () => {
    // Caught on this guard's own first run: the explanatory comment written on THIS fix
    // quotes the old "up to 3 email steps" text, and the sweep reported it as a live claim.
    expect(stepCapClaims('// was "up to 3 email steps" before R3')).toEqual([])
    expect(stepCapClaims('{/* offered up to 10 steps once */}')).toEqual([])
    expect(stepCapClaims('<!-- up to 10 steps -->')).toEqual([])
  })

  it('separates a DESCRIPTION from a CAP — the AI genuinely writes 3', () => {
    expect(stepCapClaims('AI-personalised 3-step email sequences per lead')).toEqual([])
    expect(stepDescriptiveCounts('AI-personalised 3-step email sequences per lead')).toEqual([3])
  })
})

describe('every step-count claim a human can read equals MAX_SEQUENCE_STEPS', () => {
  const files = COPY_DIRS.flatMap(d => walk(join(REPO, d)))

  it('the sweep actually reads files', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('no page promises a number the product will refuse', () => {
    const violations: string[] = []
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      for (const claim of stepCapClaims(src)) {
        if (claim.number === MAX_SEQUENCE_STEPS) continue
        const line = src.slice(0, claim.index).split('\n').length
        violations.push(`${file.slice(REPO.length + 1)}:${line} claims "${claim.text}" — the limit is ${MAX_SEQUENCE_STEPS}`)
      }
    }
    expect(
      violations,
      'A page promising more than the product allows is a claim we cannot honour; one promising ' +
      'fewer quietly sells the client short. Both were live on 6 Aug, on the same product.',
    ).toEqual([])
  })
})

describe('every place that ENFORCES the limit reads the one constant', () => {
  it('nothing hard-codes the digit — a literal is how this drifted the first time', () => {
    const enforcers = [
      'apps/api/src/routes/operator.ts',
      'apps/admin/src/app/vida/page.tsx',
      'apps/portal/src/app/(dashboard)/dashboard/figsy/[id]/page.tsx',
      'apps/portal/src/app/(dashboard)/dashboard/figsy/sequences/page.tsx',
    ]
    for (const f of enforcers) {
      const src = read(f)
      expect(src, `${f} does not import the shared limit`).toContain('MAX_SEQUENCE_STEPS')
      // The specific literals the audit found. Bound to the comparison, not to a line number.
      expect(src, `${f} still compares steps.length against a hard-coded number`)
        .not.toMatch(/steps\.length\s*[<>]=?\s*(?:3|7|10)\b/)
    }
  })

  it('the activation gate and the shared constant are the same number, not two copies', () => {
    const quality = read('apps/api/src/lib/sequence-quality.ts')
    expect(quality, 'sequence-quality.ts re-declares the digit instead of re-exporting it')
      .not.toMatch(/const MAX_STEPS\s*=\s*\d/)
    expect(quality).toContain('MAX_SEQUENCE_STEPS')
  })

  it('the constant lives where all four apps can reach it', () => {
    // It was in `apps/api` while the admin app cannot import from there (#563/#614) — which
    // is precisely why the editors kept their own copies.
    expect(read('packages/shared/src/constants/index.ts')).toMatch(/export const MAX_SEQUENCE_STEPS = \d/)
    expect(MAX_SEQUENCE_STEPS).toBe(5)   // ⛓️ 25 Sep (R166 ⑥): the founder set the most emails to one person at 5 (was 7, R3/R38).
  })
})
