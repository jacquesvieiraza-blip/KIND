import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'
import { POOL_ELIGIBLE_SOURCES, splitPoolEligible, poolRefusalLine } from './pool-sourcing'

// ── THE POOL RIGHTS TRIPWIRE (R73, 27 Aug — formerly the F15 Apollo precaution) ──────────
//
// `lead_pool` is a CROSS-CLIENT store: a record acquired for client A is served to client B.
//
// ⛓️ 27 Aug — the founder's R73 ruling ("all client data we own. including apollo data can be
// used as a source for clients too. it is data we own.") supersedes F15's internal Apollo
// precaution: K.I.N.D-ACQUIRED Apollo and PDL data are both pool-eligible. What the tripwire
// refuses now is the boundary the ruling KEPT: customer/inbound data (csv_import, web_form,
// company_csv, vida_chat, milla_onboarding) and untagged/unknown provenance — fail closed.
// F13/W18 (the external contract questions) remain open and are not decided by any test here.
//
// ⚠️ The old header claimed "one writer hard-codes 'pdl', so the pool is structurally clean" —
// production disproved that twice over: the pool's actual contents were 85 'apollo' rows from
// the founder-run 11-Jul SQL promotion (which never passes through this filter), and the
// hard-coded tag itself mislabelled house/Apollo contacts as PDL. The writer now records the
// ACTUAL provider; these tests pin that.
//
// ⚠️ AND `from('lead_pool')` CANNOT PROVE THERE IS ONLY ONE WRITER. It cannot see an RPC. That
// was checked separately: nothing writes the pool through `db.rpc`, and the one candidate,
// `20260706_pool_atomic`, is a **company seat** pool (`allocate_pool_to_rep`) — the same word,
// an unrelated table. Not conflating those two is the same care `SUPPORTED_COUNTRIES` and the
// launch allowlist need.

const ICPS = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
const OPERATOR = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
// ⛓️ 12 Sep — THE SERVE-PATH READ MOVED, AND THIS GUARD FOLLOWED IT RATHER THAN SHRANK.
// `servePoolLeads`'s candidate selection was extracted to `lib/pool-candidates.ts` so that
// `/lookalike/generate` and House prospecting ask the same code (the POOL-FIRST gate, founder
// 12 Sep). The site count below is UNCHANGED at four — the read simply lives in a third file
// now. Dropping the assertion instead of re-pointing it would have retired the guard.
const CANDIDATES = readFileSync(join(__dirname, './pool-candidates.ts'), 'utf8')

describe('the guard is reading real files', () => {
  it('both route files are present and non-trivial', () => {
    // A moved or renamed file would leave every site-parse below finding nothing and passing.
    expect(ICPS.length).toBeGreaterThan(20_000)
    expect(OPERATOR.length).toBeGreaterThan(20_000)
    expect(CANDIDATES.length).toBeGreaterThan(2_000)
    expect(ICPS, 'the pool is still WRITTEN from here').toContain("from('lead_pool')")
    expect(CANDIDATES, 'the pool is still READ from here').toContain("from('lead_pool')")
  })
})

describe('① EVERY lead_pool site is accounted for, and only one of them writes', () => {
  /** Every `from('lead_pool')` with the call chained onto it, comment-stripped. */
  function poolSites(src: string, file: string) {
    const code = stripCommentsForEnvScan(src)
    const out: { file: string; chain: string }[] = []
    let i = code.indexOf("from('lead_pool')")
    while (i !== -1) {
      out.push({ file, chain: code.slice(i, i + 220) })
      i = code.indexOf("from('lead_pool')", i + 1)
    }
    return out
  }

  const sites = [...poolSites(ICPS, 'routes/icps.ts'), ...poolSites(OPERATOR, 'routes/operator.ts'), ...poolSites(CANDIDATES, 'lib/pool-candidates.ts')]

  it('finds the four sites the audit enumerated — no more, no fewer', () => {
    // ⚠️ THE COUNT IS THE GUARD. A new site — read or write — turns this red and forces somebody
    // to decide which it is, instead of a fifth writer appearing unnoticed. If this fails
    // because a site was legitimately added, add it here WITH its classification.
    //
    // ⛓️ 27 Aug — 3 → 4. The fourth is the NULL-ONLY COUNTRY HEAL in `servePoolLeads`'s writer
    // block. It exists because ON CONFLICT DO NOTHING protected good countries and, by the same
    // stroke, froze bad ones: production carried 85 pool rows whose `country` was null and had
    // no path by which they could ever gain one. It is classified as a WRITE and constrained
    // below — one column, only where the current value is NULL. This guard doing its job is
    // precisely why the addition is here in writing rather than discovered later.
    expect(
      sites.length,
      `expected 4 lead_pool sites (1 upsert + 1 null-only country heal in icps.ts, 1 read in ` +
      `lib/pool-candidates.ts, 1 read in operator.ts). Found ${sites.length}: ${sites.map(s => s.file).join(', ')}. ` +
      `A NEW SITE MUST BE CLASSIFIED — if it writes, it must go through splitPoolEligible first (F13/F15).`,
    ).toBe(4)
  })

  it('exactly two sites write, and the other two only read', () => {
    const writes = sites.filter(s => /\.(upsert|insert|update|delete)\(/.test(s.chain))
    const reads = sites.filter(s => /\.select\(/.test(s.chain))
    expect(writes, 'two writers — the pool upsert and the null-only country heal').toHaveLength(2)
    expect(reads, 'two readers — the shared serve selector and the operator view').toHaveLength(2)
    for (const w of writes) expect(w.file).toBe('routes/icps.ts')
    // Neither writer may INSERT or DELETE: the pool gains rows only through the allowlisted
    // upsert, and nothing in this codebase removes a pooled record.
    for (const w of writes) expect(/\.(insert|delete)\(/.test(w.chain), w.chain.slice(0, 60)).toBe(false)
  })

  it('⚑ THE SECOND WRITER IS NULL-ONLY — it can never overwrite a country we already hold', () => {
    // The whole safety of the heal is a WHERE clause the database evaluates. Written as an
    // unguarded `.update({ country })` it would let a later, weaker record win — the exact
    // inversion this pool's non-clobber rule exists to prevent.
    const heal = sites.map(s => s.chain).find(c => /\.update\(/.test(c)) ?? ''
    expect(heal, 'the heal must exist, or this guard is blind').not.toBe('')
    expect(heal, 'it updates country and nothing else').toContain('.update({ country })')
    expect(heal, 'and ONLY where the stored country is null').toContain(".is('country', null)")
  })

  it('⚠️ THE WRITER WRITES ONLY WHAT THE ALLOWLIST PASSED — not the raw batch', () => {
    // The whole tripwire, asserted where it has to hold. Before this change the upsert took
    // `poolUpserts` directly, so any record the loop built reached the cross-client pool.
    // ⚠️ THE WRITE SITE, NOT THE FIRST SITE. An earlier version of this assertion took
    // `indexOf("from('lead_pool')")` and landed on the SERVE-PATH READ at the top of the file —
    // it went red against a read that was never supposed to contain an upsert. Located by the
    // call chained onto it instead, which is what actually distinguishes them.
    const code = stripCommentsForEnvScan(ICPS)
    const chain = sites.map(s => s.chain).find(c => /\.upsert\(/.test(c)) ?? ''
    expect(chain, 'a write site must exist, or this guard is blind').not.toBe('')
    expect(chain, 'the upsert must receive the FILTERED array').toContain('.upsert(poolEligible')
    expect(chain, 'never the unfiltered one').not.toContain('.upsert(poolUpserts')
    expect(code, 'and the filter is applied before it').toContain('splitPoolEligible(poolUpserts)')
  })

  it('the refusal is NAMED in the log, never a bare count', () => {
    expect(stripCommentsForEnvScan(ICPS)).toContain('poolRefusalLine(poolRefused)')
  })
})

describe('② the allowlist itself', () => {
  it('⛓️ R73 (27 Aug): K.I.N.D-acquired PDL AND Apollo — and nothing else', () => {
    // This test is the pinned decision, and THIS edit is the founder's ruling being applied:
    // R73, verbatim — "all client data we own. including apollo data can be used as a source
    // for clients too. it is data we own." — supersedes F15's internal Apollo precaution
    // (chained in PRODUCT-RULES, old rule preserved). Widening FURTHER is again a founder
    // decision, not a code change; customer/inbound sources stay out (tests below).
    expect([...POOL_ELIGIBLE_SOURCES]).toEqual(['pdl', 'apollo'])
  })

  it('a PDL record is pooled — without this the refusals below prove nothing', () => {
    // The #617 lesson: a suppression test that cannot tell "refused" from "broken" is not a
    // test. If the splitter returned nothing at all, every refusal assertion would still pass.
    const { eligible, refused } = splitPoolEligible([{ source: 'pdl', email_norm: 'a@b.com' }])
    expect(eligible).toHaveLength(1)
    expect(refused).toHaveLength(0)
  })

  it('⛓️ R73: a K.I.N.D-ACQUIRED APOLLO record is now ADMITTED', () => {
    const { eligible, refused } = splitPoolEligible([{ source: 'apollo', email_norm: 'a@b.com' }])
    expect(eligible, 'R73: K.I.N.D-owned Apollo data may feed the shared pool').toHaveLength(1)
    expect(refused).toHaveLength(0)
  })

  it('⚠️ CUSTOMER/INBOUND SOURCES ARE STILL REFUSED — R73 admits what K.I.N.D acquired, never what a customer uploaded', () => {
    for (const src of ['csv_import', 'web_form', 'company_csv', 'vida_chat', 'milla_onboarding']) {
      const { eligible, refused } = splitPoolEligible([{ source: src, email_norm: 'a@b.com' }])
      expect(eligible, `${src} must never enter the shared pool without a separate ruling`).toHaveLength(0)
      expect(refused, src).toHaveLength(1)
    }
  })

  it('an UNTAGGED record is refused too — absence is not evidence of PDL', () => {
    // The likelier future mistake than a wrong tag: a new writer that never thinks about
    // provenance at all. Same reasoning as the launch allowlist refusing a blank country.
    for (const bad of [{ email_norm: 'a@b.com' }, { source: null }, { source: '' }, { source: '   ' }]) {
      expect(splitPoolEligible([bad]).refused, JSON.stringify(bad)).toHaveLength(1)
    }
  })

  it('matching is case- and whitespace-tolerant, so "PDL " is not silently refused', () => {
    // A legitimate record dropped on capitalisation would be a self-inflicted data loss that
    // looks exactly like the guard working.
    for (const ok of ['PDL', ' pdl ', 'Pdl']) {
      expect(splitPoolEligible([{ source: ok }]).eligible, ok).toHaveLength(1)
    }
  })

  it('a MIXED batch keeps the good records and drops only the bad', () => {
    // Per record, not per batch. Discarding legitimately-bought PDL rows because of a bad
    // neighbour would punish the wrong ones.
    const { eligible, refused } = splitPoolEligible([
      { source: 'pdl', email_norm: 'a@b.com' },
      { source: 'apollo', email_norm: 'c@d.com' },        // R73: K.I.N.D-acquired — admitted
      { source: 'csv_import', email_norm: 'x@y.com' },    // customer upload — refused
      { source: 'pdl', email_norm: 'e@f.com' },
      { email_norm: 'g@h.com' },                          // untagged — refused, fail closed
    ])
    expect(eligible.map(r => r.email_norm)).toEqual(['a@b.com', 'c@d.com', 'e@f.com'])
    expect(refused).toHaveLength(2)
  })
})

describe('③ the log line an operator actually finds', () => {
  it('names each source and its count', () => {
    const line = poolRefusalLine([{ source: 'apollo' }, { source: 'apollo' }, { source: null }])
    expect(line).toContain('2× apollo')
    expect(line).toContain('1× (untagged)')
    expect(line, 'and says what IS allowed').toContain('pdl')
  })

  it('⚠️ SAYS THE SOURCING RUN WAS NOT AFFECTED', () => {
    // Without this the line reads as "sourcing broke", and somebody re-runs a job that worked
    // — the same misreading #620's bare "3 skipped" produced.
    const line = poolRefusalLine([{ source: 'apollo' }])
    expect(line).toContain('was NOT affected')
    expect(line, 'the client keeps their leads').toContain('still has these leads')
  })
})

describe('④ RED PROOF — what the old code did with an Apollo record', () => {
  it('the unfiltered write pooled whatever the loop built', () => {
    // Reproduced from the line this replaces: `.upsert(poolUpserts, …)` took the array whole.
    // There was no provenance question anywhere on the path.
    // ⛓️ R73 reframed this proof: apollo is now legitimately admitted, so the refusal the
    // tripwire must still prove is CUSTOMER/INBOUND and UNTAGGED data — the boundary the
    // founder's ruling explicitly kept.
    const built = [{ source: 'pdl', email_norm: 'a@b.com' }, { source: 'csv_import', email_norm: 'c@d.com' }]
    const oldWrite = (rows: typeof built) => rows                    // ← no filter at all
    expect(oldWrite(built)).toHaveLength(2)                          // ← RED: customer data reached the pool
    expect(oldWrite(built).some(r => r.source === 'csv_import')).toBe(true)

    // And the same batch through the tripwire.
    expect(splitPoolEligible(built).eligible).toHaveLength(1)
    expect(splitPoolEligible(built).eligible.some(r => r.source === 'csv_import')).toBe(false)
  })
})

describe('⑤ NO-TOUCH — the serve path, the reads and the PDL write are unchanged', () => {
  it('the serve path still reads the pool without a provenance filter', () => {
    // Deliberate: records ALREADY in the pool were written under the old rule, and refusing to
    // serve them now would silently shrink every client's pool-serve. This item is a tripwire on
    // the way IN, not a retroactive purge — that would be a different decision, and the
    // founder's to make.
    // ⛓️ 12 Sep — the serve-path read now lives in lib/pool-candidates.ts (POOL-FIRST gate).
    const code = stripCommentsForEnvScan(CANDIDATES)
    const i = code.indexOf("from('lead_pool')")          // the one read in the shared selector
    expect(code.slice(i, i + 120)).toContain(".select('*')")
  })

  it('⛓️ 27 Aug: provenance is the ACTUAL provider, never a constant — and cost follows it', () => {
    // The old assertion pinned the literal `source: 'pdl'`. That literal was itself a bug:
    // the loop is shared by both audiences, so a HOUSE run recorded Apollo people as PDL
    // people at PDL's rate. The pin now guards the fix — the tag and the cost both derive
    // from the provider that actually executed.
    expect(ICPS).toContain("audience === 'house' ? 'apollo' : 'pdl'")
    expect(ICPS).toContain('source:           actualProvider')
    expect(ICPS).toContain('acquisition_cost: actualProviderCost')
    expect(stripCommentsForEnvScan(ICPS)).not.toContain("source:           'pdl'")
  })

  it('the demo pool-write gate still applies, on top of provenance', () => {
    // Two independent reasons a write can be refused: WHO (a demo run) and WHAT (the source).
    // Collapsing them would lose one.
    expect(stripCommentsForEnvScan(ICPS)).toContain('poolWriteAllowed(isDemo, poolEligible.length)')
  })
})
