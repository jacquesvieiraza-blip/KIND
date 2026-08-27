import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'
import { POOL_ELIGIBLE_SOURCES, splitPoolEligible, poolRefusalLine } from './pool-sourcing'

// ── THE APOLLO POOL TRIPWIRE (F13/F15) ─────────────────────────────────────────────────────
//
// `lead_pool` is a CROSS-CLIENT store: a record bought for client A is served to client B. That
// is a licensing question before it is an engineering one, and the answer is **provider-
// specific**. PDL is bought under terms we believe permit it (F13 is still open on the order
// form); Apollo's terms are a different document with different answers.
//
// ⚠️ THIS GUARD REFUSES NOTHING TODAY, AND THAT IS EXACTLY WHY IT EXISTS. There is one pool
// writer and it hard-codes `source: 'pdl'`, so the pool is structurally clean right now. The
// risk is entirely in the future tense: a second sourcing path, written by somebody who does not
// know the pool is shared, tags its records `apollo` — or forgets to tag them at all — and every
// client afterwards is served records we had no right to reuse. Nothing in the code would
// object, and the first sign would be a letter.
//
// ⚠️ AND `from('lead_pool')` CANNOT PROVE THERE IS ONLY ONE WRITER. It cannot see an RPC. That
// was checked separately: nothing writes the pool through `db.rpc`, and the one candidate,
// `20260706_pool_atomic`, is a **company seat** pool (`allocate_pool_to_rep`) — the same word,
// an unrelated table. Not conflating those two is the same care `SUPPORTED_COUNTRIES` and the
// launch allowlist need.

const ICPS = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
const OPERATOR = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')

describe('the guard is reading real files', () => {
  it('both route files are present and non-trivial', () => {
    // A moved or renamed file would leave every site-parse below finding nothing and passing.
    expect(ICPS.length).toBeGreaterThan(20_000)
    expect(OPERATOR.length).toBeGreaterThan(20_000)
    expect(ICPS, 'the pool is still reached from here').toContain("from('lead_pool')")
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

  const sites = [...poolSites(ICPS, 'routes/icps.ts'), ...poolSites(OPERATOR, 'routes/operator.ts')]

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
      `icps.ts, 1 read in operator.ts). Found ${sites.length}: ${sites.map(s => s.file).join(', ')}. ` +
      `A NEW SITE MUST BE CLASSIFIED — if it writes, it must go through splitPoolEligible first (F13/F15).`,
    ).toBe(4)
  })

  it('exactly two sites write, and the other two only read', () => {
    const writes = sites.filter(s => /\.(upsert|insert|update|delete)\(/.test(s.chain))
    const reads = sites.filter(s => /\.select\(/.test(s.chain))
    expect(writes, 'two writers — the pool upsert and the null-only country heal').toHaveLength(2)
    expect(reads, 'two readers — the serve path and the operator view').toHaveLength(2)
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
  it('today it is PDL and nothing else', () => {
    // Widening this is a licensing decision, not a code change. If this test is edited, the
    // edit is the decision — which is the point of pinning it.
    expect([...POOL_ELIGIBLE_SOURCES]).toEqual(['pdl'])
  })

  it('a PDL record is pooled — without this the refusals below prove nothing', () => {
    // The #617 lesson: a suppression test that cannot tell "refused" from "broken" is not a
    // test. If the splitter returned nothing at all, every refusal assertion would still pass.
    const { eligible, refused } = splitPoolEligible([{ source: 'pdl', email_norm: 'a@b.com' }])
    expect(eligible).toHaveLength(1)
    expect(refused).toHaveLength(0)
  })

  it('⚠️ AN APOLLO RECORD IS REFUSED — the case this whole item exists for', () => {
    const { eligible, refused } = splitPoolEligible([{ source: 'apollo', email_norm: 'a@b.com' }])
    expect(eligible, 'nothing Apollo-sourced may enter a cross-client pool').toHaveLength(0)
    expect(refused).toHaveLength(1)
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
      { source: 'apollo', email_norm: 'c@d.com' },
      { source: 'pdl', email_norm: 'e@f.com' },
      { email_norm: 'g@h.com' },
    ])
    expect(eligible.map(r => r.email_norm)).toEqual(['a@b.com', 'e@f.com'])
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
    const built = [{ source: 'pdl', email_norm: 'a@b.com' }, { source: 'apollo', email_norm: 'c@d.com' }]
    const oldWrite = (rows: typeof built) => rows                    // ← no filter at all
    expect(oldWrite(built)).toHaveLength(2)                          // ← RED: Apollo reached the pool
    expect(oldWrite(built).some(r => r.source === 'apollo')).toBe(true)

    // And the same batch through the tripwire.
    expect(splitPoolEligible(built).eligible).toHaveLength(1)
    expect(splitPoolEligible(built).eligible.some(r => r.source === 'apollo')).toBe(false)
  })
})

describe('⑤ NO-TOUCH — the serve path, the reads and the PDL write are unchanged', () => {
  it('the serve path still reads the pool without a provenance filter', () => {
    // Deliberate: records ALREADY in the pool were written under the old rule, and refusing to
    // serve them now would silently shrink every client's pool-serve. This item is a tripwire on
    // the way IN, not a retroactive purge — that would be a different decision, and the
    // founder's to make.
    const code = stripCommentsForEnvScan(ICPS)
    const i = code.indexOf("from('lead_pool')")          // first site is the serve-path read
    expect(code.slice(i, i + 120)).toContain(".select('*')")
  })

  it('the PDL record shape and its cost are untouched', () => {
    expect(ICPS).toContain("source:           'pdl'")
    expect(ICPS).toContain('acquisition_cost: PDL_RATE_USD')
  })

  it('the demo pool-write gate still applies, on top of provenance', () => {
    // Two independent reasons a write can be refused: WHO (a demo run) and WHAT (the source).
    // Collapsing them would lose one.
    expect(stripCommentsForEnvScan(ICPS)).toContain('poolWriteAllowed(isDemo, poolEligible.length)')
  })
})
