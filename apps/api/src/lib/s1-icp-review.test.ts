import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

import {
  translateProviderList, buildIcpReview, icpNeedsReview, resolveReview,
  PROVIDER_FIELDS, ICP_REVIEW_PROOF_REFUSAL, type ProviderField,
  // ⚑ 18 Sep (J5-C10) — the ONE home of the three closed provider vocabularies. Imported so
  // the drift guard in § E reads the real values rather than a third copy of them.
  PROVIDER_VOCABULARIES,
} from './icp-provider-translation'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CLIENT SPEAKS NATURALLY — and our provider vocabulary never refuses them for it.
// (S1-RT-005 · the founder's fail-soft rule.)
//
// ── WHAT THIS REPLACES ─────────────────────────────────────────────────────────────────
//
// `industries`, `seniority_levels` and `company_sizes` are CLOSED PROVIDER VOCABULARIES.
// `boundedEnum` refused the whole Milla reply when every value in one of them was off-list,
// so a client describing their own market in their own words — "B2B service businesses",
// "founder-led firms", "small to mid-sized" — was told "Milla didn't catch that",
// deterministically, for ever.
//
// The refusal existed for a real reason: an EMPTY closed list means UNCONSTRAINED downstream,
// so silently dropping the constraint would widen the search and spend their money on it.
// Both available answers were wrong. This is the third:
//
//     KEEP THEIR WORDS · CANONICALISE ONLY WHAT WE CAN PROVE ·
//     PUT THE REMAINDER IN FRONT OF A HUMAN · SPEND NOTHING UNTIL THEY HAVE FINISHED.
//
// 🛑 THE INVARIANT EVERY CASE BELOW SERVES:
//     VALID CONFIRMED CUSTOMER TRUTH MAY REQUIRE HUMAN TRANSLATION,
//     BUT IT MAY NOT CAUSE ONBOARDING TO 503 OR DEAD-END.
// ═══════════════════════════════════════════════════════════════════════════════════════

const API = join(__dirname, '..')
const ICPS = readFileSync(join(API, 'routes', 'icps.ts'), 'utf8')
const OPERATOR = readFileSync(join(API, 'routes', 'operator.ts'), 'utf8')

const INDUSTRIES = ['Fintech', 'Healthtech', 'E-commerce', 'SaaS', 'Logistics', 'Agriculture', 'Education', 'Manufacturing', 'Real Estate', 'Media', 'Consulting', 'Retail', 'Banking', 'Insurance', 'Telecoms', 'Energy'] as const
const SENIORITY = ['C-Suite', 'VP / Director', 'Head of', 'Manager', 'Senior', 'Individual Contributor'] as const
const SIZES = ['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,000+'] as const
const VOCAB: Record<ProviderField, readonly string[]> =
  { industries: INDUSTRIES, seniority_levels: SENIORITY, company_sizes: SIZES }

// ═══════════════════════════════════════════════════════════════════════════════════════
// § A · TRANSLATION — what we keep, and what we admit we could not do
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 § A · the client\'s words are split, never refused and never guessed', () => {
  it('🛑 ALL-OFF-LIST INDUSTRY LANGUAGE IS NOT A REFUSAL — the exact live strand', () => {
    const out = translateProviderList(['B2B service businesses', 'founder-led firms'], INDUSTRIES, 6)
    expect(out.canonical, 'nothing may be invented from words we cannot map').toEqual([])
    expect(out.unmapped, 'their words are KEPT, verbatim').toEqual(['B2B service businesses', 'founder-led firms'])
  })

  it('🛑 ALL-OFF-LIST SENIORITY LANGUAGE likewise', () => {
    const out = translateProviderList(['the person who signs things off', 'whoever owns growth'], SENIORITY, 6)
    expect(out.canonical).toEqual([])
    expect(out.unmapped).toEqual(['the person who signs things off', 'whoever owns growth'])
  })

  it('🛑 ALL-OFF-LIST COMPANY SIZE likewise — "small to mid-sized agencies"', () => {
    const out = translateProviderList(['small to mid-sized'], SIZES, 6)
    expect(out.canonical).toEqual([])
    expect(out.unmapped).toEqual(['small to mid-sized'])
  })

  it('a MIXED list keeps what mapped and reports only the rest — nothing is dropped', () => {
    const out = translateProviderList(['SaaS', 'founder-led firms', 'Fintech'], INDUSTRIES, 6)
    expect(out.canonical).toEqual(['SaaS', 'Fintech'])
    expect(out.unmapped).toEqual(['founder-led firms'])
  })

  it('matching stays case-insensitive and stores OUR canonical spelling, never theirs', () => {
    expect(translateProviderList(['fintech', '  SAAS '], INDUSTRIES, 6).canonical).toEqual(['Fintech', 'SaaS'])
  })

  it('an EMPTY list is "not specified" and is NOT a review requirement — it always was', () => {
    const out = translateProviderList([], INDUSTRIES, 6)
    expect(out.canonical).toEqual([])
    expect(out.unmapped).toEqual([])
    expect(buildIcpReview({ industries: out })).toBeNull()
  })

  it('a clean translation produces NO review — the normal path is untouched', () => {
    const review = buildIcpReview({
      industries:       translateProviderList(['SaaS'], INDUSTRIES, 6),
      seniority_levels: translateProviderList(['C-Suite'], SENIORITY, 6),
      company_sizes:    translateProviderList(['11–50'], SIZES, 6),
    })
    expect(review).toBeNull()
  })

  it('a review names every field that needs one, with the client\'s own words', () => {
    const review = buildIcpReview({
      industries:       translateProviderList(['founder-led firms'], INDUSTRIES, 6),
      seniority_levels: translateProviderList(['C-Suite'], SENIORITY, 6),
      company_sizes:    translateProviderList(['small to mid-sized'], SIZES, 6),
    })
    expect(review?.requirements.map(r => r.field)).toEqual(['industries', 'company_sizes'])
    expect(review?.requirements[0].said).toEqual(['founder-led firms'])
  })

  it('duplicates and blanks are handled without inventing or losing a value', () => {
    const out = translateProviderList(['SaaS', 'SaaS', '  ', 'agencies', 'agencies'], INDUSTRIES, 6)
    expect(out.canonical).toEqual(['SaaS'])
    expect(out.unmapped).toEqual(['agencies'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § B · THE PREDICATE — one rule, and it fails closed
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 § B · icpNeedsReview is the ONE predicate, and an unreadable state refuses', () => {
  it('NULL is the normal path — no existing client is dragged into review', () => {
    expect(icpNeedsReview(null, null)).toBe(false)
    expect(icpNeedsReview(undefined, null)).toBe(false)
  })

  it('an open review blocks; a resolved one does not', () => {
    const open = { requirements: [{ field: 'industries', said: ['agencies'] }] }
    expect(icpNeedsReview(open, null)).toBe(true)
    expect(icpNeedsReview(open, '2026-09-14T10:00:00Z')).toBe(false)
  })

  it('an EMPTY requirements array is not a block — there is nothing to translate', () => {
    expect(icpNeedsReview({ requirements: [] }, null)).toBe(false)
  })

  it('🛑 a CORRUPT or unreadable review FAILS CLOSED — we do not spend on an unknown', () => {
    expect(icpNeedsReview('nonsense', null)).toBe(true)
    expect(icpNeedsReview(42, null)).toBe(true)
    expect(icpNeedsReview([], null)).toBe(true)
    expect(icpNeedsReview({}, null)).toBe(true)
    expect(icpNeedsReview({ requirements: 'not an array' }, null)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § C · THE OPERATOR'S RESOLUTION — validated, never trusted
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 § C · an operator is not more trusted than a model', () => {
  const review = { requirements: [{ field: 'industries' as ProviderField, said: ['agencies'] }] }

  it('a valid provider mapping is accepted and canonicalised', () => {
    // ⛓️ 14 Sep (S1-PD-07) — `existing` is now a REQUIRED argument and this call passes the
    // empty case, which is what it always meant. The assertion is UNCHANGED and a second one
    // is added below it: with an existing canonical half present, the result is the UNION.
    // Replacing that half was the blocker; this test would have passed either way, so it now
    // says which one it wants.
    const r = resolveReview(review, { industries: ['consulting', 'Media'] }, VOCAB, {})
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.values.industries).toEqual(['Consulting', 'Media'])

    const merged = resolveReview(review, { industries: ['Media'] }, VOCAB, { industries: ['Consulting'] })
    expect(merged.ok).toBe(true)
    if (merged.ok) expect(merged.values.industries, 'the already-valid half survives').toEqual(['Consulting', 'Media'])
  })

  it('🛑 an OFF-VOCABULARY value is REFUSED — the review exists to produce provider-safe values', () => {
    const r = resolveReview(review, { industries: ['agencies'] }, VOCAB, {})
    expect(r.ok).toBe(false)
    if (!r.ok) { expect(r.reason).toBe('off_vocabulary'); expect(r.bad).toEqual(['agencies']) }
  })

  it('🛑 an EMPTY resolution is REFUSED — it would silently WIDEN the search', () => {
    const r = resolveReview(review, { industries: [] }, VOCAB, {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('empty')
  })

  it('🛑 supplying nothing at all is refused for the same reason', () => {
    const r = resolveReview(review, {}, VOCAB, {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('empty')
  })

  it('a field that is not under review cannot be written through this door', () => {
    const r = resolveReview(review, { job_titles: ['CEO'] } as Record<string, string[]>, VOCAB, {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('unknown_field')
  })

  it('every field under review must be answered — a partial resolution does not clear it', () => {
    const two = {
      requirements: [
        { field: 'industries' as ProviderField, said: ['agencies'] },
        { field: 'company_sizes' as ProviderField, said: ['small to mid-sized'] },
      ],
    }
    const r = resolveReview(two, { industries: ['Consulting'] }, VOCAB, {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('company_sizes')
    // ⛓️ 14 Sep (S1-PD-07) — and an unanswered field is still refused when the OTHER field
    // has an existing canonical half to merge with: a partial resolution cannot ride in on
    // the merge succeeding for one of the two.
    const withExisting = resolveReview(two, { industries: ['Media'] }, VOCAB, { industries: ['Consulting'] })
    expect(withExisting.ok).toBe(false)
    if (!withExisting.ok) expect(withExisting.field).toBe('company_sizes')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § D · THE HARD GATES — proven where they sit, not promised
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 § D · Proof and provider spend are refused while a review is open', () => {
  it('🛑 the gate is INSIDE runIcpJob — one door for every sourcing path', () => {
    // Nine paths reach this function. Gating them one by one is the shape that has already
    // failed here once (`lookalike/generate` had no fence because it was the caller nobody
    // remembered), and the file says so itself about the programme gate beside this one.
    const at = ICPS.indexOf('export async function runIcpJob')
    const body = ICPS.slice(at, at + 6000)
    expect(body).toContain('icpNeedsReview(')
    expect(body).toContain('sourcing REFUSED for client')
  })

  it('🛑 and it sits ABOVE every provider call, reservation, ledger row and insert', () => {
    // ⚠️ CODE ONLY. `runIcpJob`'s doc comment NAMES these seams while explaining the
    // programme gate, so a raw string search finds them in prose long before the executable
    // line — which would make this guard fail on a comment and pass on a moved gate. Exactly
    // the trap that has bitten source pins in this repo before.
    const code = ICPS.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n')
    const at = code.indexOf('export async function runIcpJob')
    const gate = code.indexOf('icpNeedsReview(', at)
    expect(gate, 'the gate must be inside runIcpJob').toBeGreaterThan(at)
    let checked = 0
    for (const seam of ['try_reserve_programme_sourcing', 'try_spend_sourcing', 'searchPdl(', 'buildPdlBody(']) {
      const first = code.indexOf(seam, at)
      if (first === -1) continue
      checked += 1
      expect(gate, `the review gate must precede ${seam}`).toBeLessThan(first)
    }
    expect(checked, 'at least one spend/provider seam must have been checked').toBeGreaterThan(0)
  })

  it('🛑 the Proof route refuses BEFORE the authority claim — a pass is never spent on a blocked run', () => {
    const at = ICPS.indexOf("icpRouter.post('/:id/proof'")
    const body = ICPS.slice(at, at + 20_000)
    // ⚠️ THE EXACT CONDITION, NOT JUST THE NAME. A first cut asserted the body CONTAINS
    // `icpNeedsReview(` and an ordering between indices — and a deliberate tooth
    // (`if (false && icpNeedsReview(...))`) left it GREEN: the string was still there and
    // still in the right place, but the gate was gone. Pinning the whole `if` is what makes
    // a short-circuit fail this case.
    const LIVE_GATE = 'if (icpNeedsReview(reviewRow.icp_review, reviewRow.icp_review_resolved_at ?? null)) {'
    expect(body, 'the Proof-route gate must be a live condition, not a disabled one').toContain(LIVE_GATE)
    const gate = body.indexOf(LIVE_GATE)
    const claim = body.indexOf('claimProofAuthority(')
    expect(claim).toBeGreaterThan(-1)
    expect(gate, 'refusing after the claim would consume the pass').toBeLessThan(claim)
    // 🛑 AND THE GUARANTEE THAT MATTERS — zero sourcing and zero spend — is proved by
    // EXECUTION in `s1-icp-review-gate.test.ts`, which runs `runIcpJob` against a database
    // double that throws on every table but `icps`. This case is about WHICH refusal comes
    // first (so a pass is never consumed); that one is about whether anything is spent.
  })

  it('🛑 the auto-run on ICP create is covered by the same gate', () => {
    // `POST /icps` fires `runIcpJob` for any client with a credit balance in the SAME request
    // that recorded the review. A gate on the Proof route alone would have missed it.
    expect(ICPS).toContain('await runIcpJob(data.id as string, clientId, req.userId!, autoRunCap)')
  })

  it('the client is told the truth — not blamed, and not told Proof started', () => {
    expect(ICP_REVIEW_PROOF_REFUSAL).toContain('we have not started looking yet')
    expect(ICP_REVIEW_PROOF_REFUSAL).toContain('nothing has been charged or contacted')
    expect(ICP_REVIEW_PROOF_REFUSAL).not.toContain('catch that')
  })

  it('🛑 an unreadable ICP row refuses too — fail closed, never source on a maybe', () => {
    const at = ICPS.indexOf("icpRouter.post('/:id/proof'")
    expect(ICPS.slice(at, at + 20_000)).toContain("review state was unreadable")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § E · OWNERSHIP, REPLAY AND AUDIT ON THE OPERATOR PATH
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 § E · the resolution belongs to one client and happens once', () => {
  const resolve = () => {
    const at = OPERATOR.indexOf("operatorRouter.post('/icp-review/:icpId/resolve'")
    expect(at).toBeGreaterThan(-1)
    return OPERATOR.slice(at, at + 6000)
  }

  it('🛑 it is fenced on the CLIENT — another client\'s ICP cannot be touched', () => {
    const body = resolve()
    expect(body).toContain(".eq('id', req.params.icpId).eq('client_id', clientId)")
    expect(body).toContain('client_id is required')
  })

  it('🛑 a wrong or unknown id answers the same way — an operator key is not a directory', () => {
    expect(resolve()).toContain('No such ICP for that client.')
  })

  it('🛑 REPLAY writes nothing — the conditional update is the whole mechanism', () => {
    const body = resolve()
    expect(body).toContain(".is('icp_review_resolved_at', null)")
    expect(body).toContain('Somebody resolved this review a moment ago')
  })

  it('🛑 the values and the cleared flag land in ONE update — the flag cannot clear alone', () => {
    const body = resolve()
    const at = body.indexOf('...outcome.values')
    expect(at).toBeGreaterThan(-1)
    expect(body.slice(at, at + 200)).toContain('icp_review_resolved_at: now')
  })

  it('the resolution is AUDITED — who lifted the block, and when', () => {
    const body = resolve()
    expect(body).toContain('icp_provider_review_resolved')
    expect(body).toContain('writeOperatorAudit')
    const audit = readFileSync(join(API, 'lib', 'operator-audit.ts'), 'utf8')
    expect(audit).toContain("'icp_provider_review_resolved'")
  })

  it('both operator routes require the operator key', () => {
    for (const route of ["operatorRouter.get('/icp-review'", "operatorRouter.post('/icp-review/:icpId/resolve'"]) {
      const at = OPERATOR.indexOf(route)
      expect(at, `${route} must exist`).toBeGreaterThan(-1)
      expect(OPERATOR.slice(at, at + 400)).toContain("adminKeyValid(req.headers['x-admin-key'])")
    }
  })

  it('🛑 the vocabularies cannot drift — because there is only ONE of them', () => {
    // ⛓️ REPOINTED 18 Sep (J5-C10) · THE DUTY IS THE SAME AND THE GUARANTEE IS STRONGER.
    // WHAT THIS REPLACED: ~~a byte-identity check that the ICP route and the operator rail
    // each CONTAINED the same three literals~~, with the note "they are declared in two files
    // for a stated reason (importing a 5,000-line router to reach three arrays). This is the
    // guard that makes that safe."
    //
    // The reasoning about the routers was right and the destination was wrong: the vocabulary
    // now lives in `lib/icp-provider-translation.ts`, the module that owns translating INTO it,
    // which imports nothing and can be read from a `lib/` module — which is what
    // `promoteConfirmedBrief` needed in order to derive a review at all (S1-PD-03). With one
    // copy, drift is not expressible, so the check becomes: the values are exactly these, and
    // the two routers hold no second copy to drift from.
    expect(PROVIDER_VOCABULARIES.industries, 'the industry vocabulary changed').toEqual([...INDUSTRIES])
    expect(PROVIDER_VOCABULARIES.seniority_levels, 'the seniority vocabulary changed').toEqual([...SENIORITY])
    expect(
      PROVIDER_VOCABULARIES.company_sizes,
      'the size bands changed — note the en-dashes (U+2013); an ASCII "tidy-up" stops matching every stored row',
    ).toEqual([...SIZES])

    // 🛑 NO SECOND COPY. A future edit that re-inlines a literal into either router puts the
    // drift back, and this is what catches it.
    for (const [name, src] of [['the ICP route', ICPS], ['the operator rail', OPERATOR]] as const) {
      const code = src.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n')
      for (const list of [INDUSTRIES, SENIORITY, SIZES]) {
        const literal = `[${list.map(v => `'${v}'`).join(', ')}]`
        expect(code, `${name} re-inlined a vocabulary literal — there is one home for these`).not.toContain(literal)
      }
      expect(code, `${name} does not read the shared vocabulary`).toContain('PROVIDER_VOCABULARIES')
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § F · THE WIRING — no constraint is silently dropped or broadened
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 § F · nothing off-vocabulary reaches a provider column', () => {
  it('🛑 the provider columns are written from the CANONICAL half only', () => {
    expect(ICPS).toContain('industries:            translated.industries.canonical')
    expect(ICPS).toContain('seniority_levels:      translated.seniority_levels.canonical')
    expect(ICPS).toContain('company_sizes:         translated.company_sizes.canonical')
  })

  it('🛑 boundedEnum is GONE — the refusal that stranded the client cannot return', () => {
    // Comments quote the retired name deliberately, so the check is on executable code.
    const code = ICPS.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n')
    expect(code).not.toContain('boundedEnum(')
    expect(code).not.toContain('every value was off-list')
  })

  it('🛑 the review is persisted IN the promotion write, not patched onto it', () => {
    // ⛓️ 14 Sep (S1-PD-03) — INVERTED, not retargeted. These two guards ENCODED THE DEFECT:
    // they asserted an `UPDATE icps SET icp_review = …` that ran AFTER the row existed, and
    // a 503 + founder alert when it failed. Between those two statements the ICP was live,
    // active and unflagged — `runIcpJob` and the Proof gate both read it as translatable —
    // and no response code or alert makes a database row safe. The old shape is now
    // FORBIDDEN here, and the review travels in the same statement as its targeting.
    expect(ICPS).toContain('const writeBody: Record<string, unknown> = decided.review')
    expect(ICPS).toContain('icp_review: decided.review, icp_review_at: new Date().toISOString()')
    const code = ICPS.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n')
    expect(code, 'the review may never be read off the request body').not.toContain('body.icp_review')
    expect(code).not.toContain('const reviewPayload')
  })

  it('🛑 the insert-then-patch, its 503 and its alert are GONE — an alert is not a fence', () => {
    const code = ICPS.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n')
    expect(code).not.toContain('NEEDS ICP REVIEW could not be recorded')
    expect(code).not.toContain('refusing rather than leaving it unflagged')
    // 🛑 AND EXACTLY ONE PLACE WRITES IT. Two live lines name `icp_review:` — the write body
    // and the builder/chat RESPONSE, which is display state the portal renders and no longer
    // sends anywhere. Neither is an UPDATE, and that is the claim: a second writer is how the
    // two-truths problem comes back.
    expect(code.match(/icp_review: decided\.review/g) ?? [], 'one writer').toHaveLength(1)
    for (const line of code.split('\n')) {
      if (line.includes('icp_review')) {
        expect(line, `an UPDATE must never carry the review: ${line.trim()}`).not.toContain('.update(')
      }
    }
    expect(code, 'no statement may patch the column after the fact').not.toMatch(/update\(\{\s*icp_review/)
  })

  it('🛑 the browser cannot clear a review — only the operator route writes resolved_at', () => {
    const code = ICPS.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n')
    expect(code, 'the ICP route must never write the resolution stamp').not.toContain('icp_review_resolved_at:')
  })

  it('every provider field is accounted for — a fourth would fail this', () => {
    expect(PROVIDER_FIELDS).toEqual(['industries', 'seniority_levels', 'company_sizes'])
    for (const f of PROVIDER_FIELDS) expect(ICPS).toContain(`translated.${f}.canonical`)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § G · THE MIGRATION — additive, and safe against every existing row
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 § G · the migration cannot block an existing client', () => {
  const SQL = readFileSync(
    join(API, '..', '..', '..', 'supabase', 'migrations', '20260914_icp_provider_review.sql'), 'utf8')

  it('🛑 ADDITIVE ONLY — no drop, no destructive alter, no data mutation', () => {
    const lower = SQL.toLowerCase()
    for (const forbidden of ['drop table', 'drop column', 'delete from', 'truncate', 'alter column']) {
      expect(lower, `a migration must never ${forbidden}`).not.toContain(forbidden)
    }
    expect(lower).not.toMatch(/^\s*update\s+public\./m)
  })

  it('🛑 NO DEFAULT AND NO BACKFILL — NULL is what every existing row reads', () => {
    expect(SQL).toContain('add column if not exists icp_review             jsonb,')
    expect(SQL).not.toMatch(/icp_review\s+jsonb\s+.*default/i)
  })

  it('🛑 and NULL means NOT in review — so nobody is dragged in by deploying it', () => {
    expect(icpNeedsReview(null, null)).toBe(false)
  })

  it('it is rerunnable — the runner has no ledger and re-executes every entry', () => {
    expect(SQL).toContain('add column if not exists')
    expect(SQL).toContain('create index if not exists')
    expect(SQL).toContain('from pg_constraint')
  })

  it('the resolution stamp cannot exist without the flag it resolves', () => {
    expect(SQL).toContain('icp_review_resolved_at is null or icp_review is not null')
  })

  it('it grants no Proof or provider authority of any kind', () => {
    // ⚠️ EXECUTABLE SQL ONLY. The header explains WHY this migration's NULL admits while
    // `proof_passes_legacy`'s NULL refuses — naming it in prose is the reasoning, not a
    // write. The claim here is that no STATEMENT touches Proof or provider authority.
    // ⚠️ `comment on column` IS EXECUTABLE SQL AND IS ALSO PROSE. Those statements describe
    // what the flag blocks — "Proof and provider sourcing are REFUSED" — so a blunt string
    // search finds the words in documentation and calls it a grant. The claim here is about
    // statements that WRITE or GRANT, so the column documentation is excluded by name.
    const statements = SQL.split('\n')
      .filter(l => !l.trimStart().startsWith('--'))
      .join('\n')
      .split(';')
      .filter(st => !/^\s*comment\s+on\b/i.test(st))
      .join(';')
      .toLowerCase()
    for (const forbidden of ['proof_passes', 'proof_calibrated', 'grant ', 'credit_', 'try_spend', 'try_reserve']) {
      expect(statements, `the review migration must not touch ${forbidden}`).not.toContain(forbidden)
    }
    // And it creates no function or RPC at all — the state is columns, nothing executable.
    expect(statements).not.toContain('create or replace function')
  })

  it('the runner mirror is statement-identical to the file', () => {
    const runner = readFileSync(join(API, 'lib', 'pending-migrations.ts'), 'utf8')
    const i = runner.indexOf("key: '20260914_icp_provider_review'")
    expect(i).toBeGreaterThan(-1)
    const start = runner.indexOf('sql: `', i) + 6
    const end = runner.indexOf('`', start)
    const strip = (t: string) => t.split('\n')
      .map(l => (l.trimStart().startsWith('--') ? '' : l))
      .join('\n').split(';').map(x => x.split(/\s+/).join(' ').trim()).filter(Boolean)
    expect(strip(runner.slice(start, end))).toEqual(strip(SQL))
  })
})
