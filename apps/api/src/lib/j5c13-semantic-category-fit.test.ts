// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C13 · CATEGORY FIT IS MODEL-INTERPRETED (FD-2)
//
// ── THE DEFECT, AND IT IS ONE SENTENCE ──────────────────────────────────────────────────
//
// The scoring prompt described the client's ICP like this:
//
//     Industries: ${icp.industries.join(', ') || 'any'}
//
// 🛑 `industries` IS THE CLOSED SIXTEEN-VALUE PROVIDER LIST. It is a query hint and evidence
// toward a requirement; it is NEVER the requirement, and `proof-fit.ts` says so in its own
// header. `target_category` — the client's own words, the column the founder locked as "the
// only authority on client intent" — was not in the prompt at all.
//
// So the model asked to judge fit had never been told what the client asked for. A client who
// said "digital marketing agencies" reached the scorer as "Industries: Media, Consulting", or
// far more often as "Industries: any", and it scored them against nothing.
//
// ── AND THE STRUCTURAL RULE CANNOT FIX IT, WHICH IS WHY FD-2 EXISTS ─────────────────────
//
// `categoryVerdict` is word overlap, and it is wrong in both directions for a sentence:
//
//   · it REFUSES a brand agency for "digital marketing agencies" — adjacent, and the client's
//     actual market, thrown away over a wording difference;
//   · it PASSES anything whose provider tag happens to carry both words.
//
// FD-2's three rules are the founder's answer: adjacent qualifies, vague does not, and
// unknown is an answer. The 72/100 card shown beside the words "no evidence of digital
// marketing or agency focus" is the second rule, in production, on a real screen.
//
// ⚠️ THE MODEL WRITES A FACT; THE PREDICATE READS IT. `proof-fit.ts` is pure and synchronous
// and every surface depends on it — making it async would make every caller async. So the
// judgement is recorded on the row, exactly like every other criterion's input.
//
// ⚠️ AND THE GATE STILL PRECEDES SCORING ON A FIRST RUN, deliberately unchanged. So the model
// verdict lands on the DESK BAND — the surface FD-2's own runtime proof names ("Founder
// reviews set") — and the structural rule keeps answering at the gate, where a scoring outage
// must never be able to block a client's set.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { hardFit, structurallyEligible, type FitCandidate, type FitIcp } from './proof-fit'

const ICP: FitIcp = {
  geographies: ['United Kingdom'],
  target_category: 'digital marketing agencies',
}
const BASE: FitCandidate = {
  country: 'United Kingdom',
  job_title: 'Managing Director',
}

describe('J5-C13 · the model\'s verdict decides the category', () => {
  it('🛑 ADJACENT QUALIFIES — a brand agency is the client\'s market, and the words differ', () => {
    // The word overlap REFUSES this: "digital" and "marketing" are both absent. That refusal
    // throws away the client's actual market over a wording difference, which is the first of
    // FD-2's two named edges.
    const f = hardFit({ ...BASE, industry: 'Branding', company: 'Fathom Brand Studio', category_fit: 'yes' }, ICP)
    expect(f.category, 'an adjacent company the model recognised was still refused').toBe('yes')
  })

  it('🛑 VAGUE DOES NOT — "B2B services" establishes nothing, whatever it scores', () => {
    // The live card: 72/100 beside the words "no evidence of digital marketing or agency
    // focus". A plausible-sounding company admitted on vagueness.
    const f = hardFit({ ...BASE, industry: 'B2B services', company: 'Meridian Group', category_fit: 'unknown' }, ICP)
    expect(f.category, 'a vague company was admitted as a confident match').not.toBe('yes')
    expect(structurallyEligible(f), 'FD-2: UNKNOWN is never eligible').toBe(false)
  })

  it('🛑 a model REFUSAL is a refusal, even when the words happen to line up', () => {
    // Evidence saying "digital marketing" would pass the overlap. The model saw more.
    const f = hardFit(
      { ...BASE, industry: 'Digital Marketing', company: 'Acme Digital Marketing Software', category_fit: 'no' },
      ICP,
    )
    expect(f.category, 'a model refusal was overturned by a word match').toBe('no')
  })

  it('a lead the model never judged still gets the structural answer — nothing regressed', () => {
    // Every lead scored before this existed carries NULL, and every lead whose scoring failed
    // does too. The word overlap answers for them exactly as it did yesterday.
    const f = hardFit({ ...BASE, industry: 'Digital Marketing Agency', company: 'Fathom' }, ICP)
    expect(f.category).toBe('yes')
    const g = hardFit({ ...BASE, industry: 'Construction', company: 'Brick & Co' }, ICP)
    expect(g.category).toBe('no')
  })

  it('🛑 a verdict against a category the client never stated is ignored', () => {
    // A recorded judgement about a requirement that does not exist is a judgement about
    // nothing, and must not narrow a client who asked for no category at all.
    const f = hardFit({ ...BASE, industry: 'Anything', category_fit: 'no' }, { geographies: ['United Kingdom'] })
    expect(f.category, 'a client who stated no category had one enforced against them').toBe('yes')
  })

  it('an unrecognised verdict is never treated as a pass', () => {
    const f = hardFit({ ...BASE, industry: 'B2B services', category_fit: 'maybe' as never }, ICP)
    expect(f.category).not.toBe('yes')
  })
})

describe('J5-C13 · the model is actually told the requirement', () => {
  const SCORING = readFileSync(join(__dirname, 'scoring.ts'), 'utf8')
  const CODE = SCORING.split('\n')
    .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
    .join('\n')

  it('🛑 the prompt carries the client\'s OWN WORDS, not only the provider tags', () => {
    expect(CODE, 'the scorer still judges fit without being told what the client asked for')
      .toMatch(/target_category/)
    expect(CODE, "the client's own words are not labelled as theirs").toMatch(/THEIR OWN WORDS/)
  })

  it('🛑 the provider tag is labelled as EVIDENCE, not as the requirement', () => {
    // `proof-fit.ts`'s own rule: "A provider tag may be EVIDENCE toward a requirement; it may
    // never BE the requirement." The prompt now says so to the model as well.
    expect(CODE).toMatch(/evidence only, not the requirement/)
  })

  it('🛑 all three of FD-2\'s rules are stated, including the one that costs us leads', () => {
    expect(CODE, 'adjacent was not admitted, so the client loses their own market').toMatch(/adjacent/i)
    expect(CODE, 'vague was not refused, which is the live 72\\/100 card').toMatch(/B2B services/)
    expect(CODE, 'the model was not told to answer unknown when unsure').toMatch(/unknown.*not sure|not sure.*unknown/is)
  })

  it('the task is OMITTED entirely for a client who stated no category', () => {
    // A legacy ICP must get the byte-identical prompt it got yesterday.
    expect(CODE).toMatch(/icp\.target_category\s*\n?\s*\?/)
    expect(CODE).toMatch(/:\s*''/)
  })

  it('🛑 the verdict is RECORDED — a judgement nothing can read is not a judgement', () => {
    expect(CODE, 'the model judged the category and the answer was thrown away')
      .toMatch(/category_fit:\s+r\.category_fit/)
  })

  it('🛑 an unrecognised verdict from the model becomes `unknown`, never `yes`', () => {
    expect(CODE).toMatch(/category_fit === 'yes' \|\| r\.category_fit === 'no'/)
  })
})

describe('J5-C13 · every surface that judges reads the verdict', () => {
  const code = (p: string): string =>
    readFileSync(join(__dirname, p), 'utf8')
      .split('\n')
      .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
      .join('\n')

  it('🛑 the review desk selects it — that is the surface FD-2\'s runtime proof names', () => {
    const src = code('../routes/leads.ts')
    const at = src.indexOf("score_reasoning, category_fit")
    expect(at, 'the desk bands without the model verdict, using the overlap FD-2 replaced')
      .toBeGreaterThan(-1)
  })

  it('the structural gate reads the evidence the fit rule actually uses', () => {
    // `evidenceWords` reads the industry tag and the company NAME. The gate selected only the
    // tag, so `categoryVerdict`, `companyTypeVerdict` and J5-C12's `excluded` were all judging
    // on one field — and the company name is where an organisational form and an exclusion
    // most often actually appear.
    const src = code('./proof-gate.ts')
    expect(src).toMatch(/CANDIDATE_COLUMNS[\s\S]{0,300}company,/)
    expect(src).toMatch(/CANDIDATE_COLUMNS[\s\S]{0,300}category_fit/)
  })

  it('🛑 and it does NOT select a column that does not exist', () => {
    // ⚠️ `evidenceWords` reads `company_description` and `leads.company_description` does not
    // exist — no migration creates it, nothing writes it. Selecting it makes PostgREST reject
    // the WHOLE query, which `.data ?? []` renders as an empty result: the gate would go silent
    // rather than fail. I selected it, `schema-truth.test.ts` caught it, and the honest fix was
    // to stop selecting it rather than to add a column nothing populates.
    for (const p of ['./proof-gate.ts', '../routes/leads.ts']) {
      expect(code(p), `${p} selects leads.company_description, which does not exist`)
        .not.toMatch(/select\([^)]*company_description/)
    }
  })
})
