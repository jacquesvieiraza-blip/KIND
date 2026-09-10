// ═══════════════════════════════════════════════════════════════════════════════════════
// OWNED ROWS FIRST — BUT ONLY THE ONES WE COULD ACTUALLY SHOW.
//
// ── WHY A LOOSE POOL MATCH COSTS MONEY RATHER THAN JUST LOOKING WRONG ───────────────────
//
// Pool rows are served BEFORE the paid provider and are SUBTRACTED from what we then buy.
// The matcher was `country AND (title OR industry OR seniority)` with **no company-size test
// at all**, so for a client asking for UK digital marketing agencies of 10–50 people:
//
//   • a 4,000-person consultancy qualified on one matching title
//   • a company tagged "marketing" qualified on the word alone
//   • each one filled an example slot the structural gate would then refuse
//   • …and shrank the external ask by the same number
//
// The client ends up looking at eleven people instead of twenty. Free rows that cannot be
// shown consume the allowance twice — which is why the arithmetic below is the real subject
// of this file, not the matcher.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { poolRecordMatchesIcp, splitPoolAndRemainder, type PoolRecord } from './pool-sourcing'
import { hardFit, structurallyEligible } from './proof-fit'

const ICPS = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')
const POOL = readFileSync(join(__dirname, 'pool-sourcing.ts'), 'utf8')

const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

/** The founder's live canary targeting, 10 Sep. */
const CANARY = {
  geographies: ['United Kingdom'],
  company_sizes: ['11–50'],
  industries: ['Digital Marketing'],
  job_titles: ['Founder', 'CEO'],
  seniority_levels: ['founder', 'c_suite'],
}

/** An owned row that genuinely is what he asked for. */
const GOOD: PoolRecord = {
  email_norm: 'ok@agency.co.uk',
  country: 'United Kingdom', company_size: '11–50',
  industry: 'Digital Marketing Agency', title: 'Founder', seniority: 'founder',
}

describe('🛑 ① an eligible owned row is reused; every near-miss is not', () => {
  it('the row he actually asked for is reused', () => {
    expect(poolRecordMatchesIcp(GOOD, CANARY)).toBe(true)
  })

  it('🛑 country-only with the wrong industry is NOT reused', () => {
    expect(poolRecordMatchesIcp({ ...GOOD, industry: 'Management Consulting' }, CANARY)).toBe(false)
  })

  it('🛑 the right industry at the wrong SIZE is NOT reused — the criterion that did not exist', () => {
    // The old matcher had no size test whatever, so a 4,000-person agency was owned
    // inventory for a client who asked for 10–50.
    expect(poolRecordMatchesIcp({ ...GOOD, company_size: '1,000+' }, CANARY)).toBe(false)
    expect(poolRecordMatchesIcp({ ...GOOD, company_size: '201–500' }, CANARY)).toBe(false)
  })

  it('🛑 the right company at the wrong seniority is NOT reused', () => {
    expect(poolRecordMatchesIcp({ ...GOOD, title: 'Marketing Intern', seniority: 'entry' }, CANARY)).toBe(false)
  })

  it('🛑 "marketing" alone does not satisfy "digital marketing"', () => {
    expect(poolRecordMatchesIcp({ ...GOOD, industry: 'Marketing Technology' }, CANARY)).toBe(false)
  })

  it('and the geography contract is unchanged — Ukraine is not the UK, GB is', () => {
    expect(poolRecordMatchesIcp({ ...GOOD, country: 'Ukraine' }, CANARY)).toBe(false)
    expect(poolRecordMatchesIcp({ ...GOOD, country: 'GB' }, CANARY)).toBe(true)
  })

  it('🛑 a row with NO country is never reused for a geo-targeted proof', () => {
    // Stricter than `hardFit`, deliberately: an unknown industry may still be the right
    // company, but a row we cannot PLACE would spend an example slot on a guess — and the
    // pool really did hold 85 such rows while a geo-targeted pass served zero.
    expect(poolRecordMatchesIcp({ ...GOOD, country: null }, CANARY)).toBe(false)
    // …whereas an unknown INDUSTRY is admissible, exactly as it is at the surfacing gate.
    expect(poolRecordMatchesIcp({ ...GOOD, industry: null }, CANARY)).toBe(true)
  })

  it('🛑 ONE RULE, NOT TWO — the pool decision and the surfacing gate agree', () => {
    // A row admitted by the pool must not then be refused by PR1's structural gate for a
    // reason the pool never asked about. Proved by running both over the same rows.
    const rows: PoolRecord[] = [
      GOOD,
      { ...GOOD, industry: 'Management Consulting' },
      { ...GOOD, company_size: '1,000+' },
      { ...GOOD, title: 'Marketing Intern', seniority: 'entry' },
      { ...GOOD, industry: null },
    ]
    for (const r of rows) {
      const pool = poolRecordMatchesIcp(r, CANARY)
      const gate = structurallyEligible(hardFit({
        country: r.country, company_size: r.company_size, industry: r.industry,
        job_title: r.title, seniority: r.seniority,
      }, CANARY))
      if (pool) {
        expect(gate, `the pool served ${r.industry ?? 'a row'} that the surfacing gate refuses`).toBe(true)
      }
    }
  })
})

describe('🛑 ② the external ask is the ELIGIBLE shortfall — the founder\'s arithmetic', () => {
  it('20 wanted · 15 raw candidates · 6 eligible → reuse 6, source 14', () => {
    // 🛑 THE EXACT CASE IN THE BRIEF. The wrong version subtracts the RAW pool result (15),
    // sources 5, and the structural gate then refuses 9 — so the client receives 11.
    const { poolServe, pdlRemainder } = splitPoolAndRemainder(20, 6)
    expect(poolServe).toBe(6)
    expect(pdlRemainder).toBe(14)
    expect(poolServe + pdlRemainder, 'the client is still owed twenty').toBe(20)
  })

  it('…and the wrong version is arithmetically distinguishable, so this test can fail', () => {
    // Subtracting the raw count would leave 5. Named so the mutation has something to hit.
    expect(splitPoolAndRemainder(20, 15).pdlRemainder).toBe(5)
    expect(splitPoolAndRemainder(20, 6).pdlRemainder).not.toBe(5)
  })

  it('a pool serve can never cause over-sourcing, and both halves are clamped', () => {
    expect(splitPoolAndRemainder(20, 40)).toEqual({ poolServe: 20, pdlRemainder: 0 })
    expect(splitPoolAndRemainder(0, 5)).toEqual({ poolServe: 0, pdlRemainder: 0 })
    expect(splitPoolAndRemainder(-3, -2)).toEqual({ poolServe: 0, pdlRemainder: 0 })
  })

  it('🛑 the run subtracts what was SERVED, never what the query found', () => {
    const c = code(ICPS)
    // `pool.served` is `insertedIds.length` — rows that survived rights, geography, dedupe,
    // the blocklist, suppression, hard fit AND the authority grant.
    expect(c).toContain('splitPoolAndRemainder(runCap, pool.served)')
    expect(c).toContain('return { insertedIds, served: insertedIds.length')
    // The raw candidate array must never reach the split.
    expect(c.includes('splitPoolAndRemainder(runCap, candidates.length)'),
      'the shortfall is computed from the raw pool query').toBe(false)
    expect(c.includes('splitPoolAndRemainder(runCap, eligible.length)'),
      'the shortfall is computed before the authority grant').toBe(false)
  })
})

describe('🛑 ③ the exclusions, and the hard-fit decision, are all in the serve path', () => {
  it('hard fit is decided on the row, after the widened query', () => {
    const c = code(ICPS)
    expect(c).toContain('if (!poolRecordMatchesIcp(c as never, icp as never)) { notHardFit++; return false }')
  })

  it('rights · geography · client-held · opt-out · suppression are all refused', () => {
    const c = code(ICPS)
    for (const guard of [
      'if (!isPoolSourceEligible(c.source))',
      'if (geoGated && !poolCountryMatches(c.country, geos))',
      'if (owned.has(e)) return false',
      'if (blocked.has(e)) return false',
      'if (isSuppressed({ email: e, company: c.company, linkedin: c.linkedin_url })) return false',
    ]) {
      expect(c, `a pool exclusion is gone: ${guard}`).toContain(guard)
    }
  })

  it('⚠️ `owned` is also the structural-rejection exclusion, and that is load-bearing', () => {
    // A candidate this client already holds in `leads` covers the ones they passed on, the
    // ones they marked "not a fit", and the ones PR1's gate set aside. Re-serving any of
    // them would show the client somebody already refused, from the pool, for free.
    const c = code(ICPS)
    expect(c).toContain(".select('email').eq('client_id', clientId).not('email', 'is', null)")
    expect(ICPS).toContain('the structural gate set aside')
  })

  it('🛑 ONE external sourcing operation per pass — the pool never triggers a second', () => {
    const c = code(ICPS)
    // The provider is asked once, for the remainder, and the pool serve returns before it.
    expect((c.match(/splitPoolAndRemainder\(/g) ?? []).length,
      'more than one shortfall is computed, so more than one ask can happen').toBe(1)
    expect(c.includes('while ('), 'a loop appeared around the sourcing path').toBe(false)
  })
})

describe('④ the operator counters — and no invented cost', () => {
  it('reused · not-hard-fit · not-rights-eligible · cost avoided are all logged', () => {
    const c = code(ICPS)
    expect(c).toContain('stage=pool_counters')
    expect(c).toContain('reused=${insertedIds.length}')
    expect(c).toContain('not_hard_fit=${notHardFit}')
    expect(c).toContain('cost_avoided_usd=${costAvoidedText}')
  })

  it('🛑 an unpriced row is counted as UNKNOWN, never as zero', () => {
    // Zero would understate the saving and read as a measured number. The log says "+" and
    // names how many rows carry no recorded cost.
    expect(ICPS).toContain('row(s) carry no recorded acquisition cost')
    expect(code(ICPS)).toContain('const unpriced = costRows.length - costed.length')
  })

  it('the cost is read from lead_pool, beside its own select', () => {
    const c = code(ICPS)
    const mapAt = c.indexOf('const poolCostByEmail = new Map<string, number>()')
    const leadsInsertAt = c.indexOf("db.from('leads').insert(rows)")
    expect(mapAt).toBeGreaterThan(-1)
    // Before the leads insert, so the column reads as what it is: a lead_pool column.
    expect(mapAt).toBeLessThan(leadsInsertAt)
  })

  it('none of it reaches the client', () => {
    // Provider names, pools and costs are operator truth. Milla says "here are the people
    // we'd start with".
    const c = code(ICPS)
    const clientFacing = c.match(/relaxed = '[^']*'/g) ?? []
    for (const line of clientFacing) {
      // ⚠️ THE BANNED LIST IS PROVIDER/POOL TERMINOLOGY, NOT THE WORD "cost". A demo run
      // telling a demo user the examples cost them nothing is a price statement, which is
      // theirs to know; "served from the shared pool" is our plumbing, which is not.
      for (const leak of ['pool', 'PDL', 'Apollo', 'acquisition', 'provider']) {
        expect(line.toLowerCase().includes(leak.toLowerCase()),
          `client-facing copy leaks "${leak}": ${line}`).toBe(false)
      }
    }
  })
})

describe('⑤ one matcher, and it is the shared one', () => {
  it('the pool delegates to proof-fit and re-implements nothing', () => {
    const c = code(POOL)
    expect(c).toContain("import { hardFit, structurallyEligible } from './proof-fit'")
    // 🛑 THE LOOSE SUBSTRING HELPER IS GONE. Keeping it would leave the old test one edit
    // from returning.
    expect(c.includes('function containsAny'), 'the loose substring helper is back').toBe(false)
    expect(c.includes('|| containsAny('), 'the OR-generous arms are back').toBe(false)
  })

  it('company size reached the matcher\'s own ICP shape', () => {
    expect(code(POOL)).toContain('company_sizes?:    string[] | null')
  })
})

describe('⑥ programme sourcing is untouched — POST-LAUNCH by founder decision', () => {
  it('programme-sourcing.ts still consults no pool', () => {
    // Founder-locked 10 Sep: *"DO NOT implement programme-sourcing pool-first today."* The
    // seam is not trivial — a pool-served row would have to enter the programme batch,
    // reservation, qualification and settlement path, and inventing that accounting is
    // exactly what the instruction forbids.
    const src = code(readFileSync(join(__dirname, 'programme-sourcing.ts'), 'utf8'))
    for (const poolish of ['servePoolLeads', 'lead_pool', 'poolRecordMatchesIcp', 'splitPoolAndRemainder']) {
      expect(src.includes(poolish), `programme sourcing gained pool-first: ${poolish}`).toBe(false)
    }
  })
})
