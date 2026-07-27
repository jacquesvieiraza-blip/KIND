import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  compareManifests, criticalFirst, manifestAge, CRITICAL_TABLES, MANIFEST_STALE_DAYS,
  type Manifest,
} from './backup-manifest'

// #298 — BACKUP-RESTORE DRILL.
//
// The item is right: an untested restore is a belief, not a backup. But the drill nobody can
// run is not the whole gap — the gap that exists TODAY, and would exist even if the Supabase
// dashboard opened tomorrow, is that **nobody knows what "restored correctly" looks like**.
// Press restore, get a green tick, and you have no way to tell whether you got everything,
// half of it, or last week's copy. The comparison IS the drill.

const m = (tables: Record<string, number>, takenAt = '2026-07-27T09:00:00Z'): Manifest => ({
  takenAt, host: 'db', tables: Object.entries(tables).map(([table, rows]) => ({ table, rows })),
  totalRows: Object.values(tables).reduce((a, b) => a + b, 0),
  totalTables: Object.keys(tables).length,
})

describe('a restore that worked', () => {
  it('identical manifests prove it', () => {
    const r = compareManifests(m({ clients: 3, leads: 400 }), m({ clients: 3, leads: 400 }))
    expect(r.identical).toBe(true)
    expect(r.matched).toBe(2)
  })

  it('and the verdict says PROVEN, not assumed', () => {
    expect(compareManifests(m({ clients: 3 }), m({ clients: 3 })).verdict).toContain('proven, not assumed')
  })

  it('table order does not matter', () => {
    const before: Manifest = m({ clients: 3, leads: 400 })
    const after: Manifest = { ...before, tables: [...before.tables].reverse() }
    expect(compareManifests(before, after).identical).toBe(true)
  })
})

describe('a restore that did NOT work', () => {
  it('a MISSING TABLE is caught — the outcome a spot-check would sail past', () => {
    const r = compareManifests(m({ clients: 3, credit_transactions: 900 }), m({ clients: 3 }))
    expect(r.identical).toBe(false)
    expect(r.differences).toContainEqual({ table: 'credit_transactions', before: 900, after: 0, kind: 'missing_table' })
  })

  it('ONE missing row is a failure — no tolerance, deliberately', () => {
    // A restore that lands 99% of credit_transactions has lost somebody's money. A
    // percentage threshold would hide exactly that.
    const r = compareManifests(m({ credit_transactions: 900 }), m({ credit_transactions: 899 }))
    expect(r.identical).toBe(false)
    expect(r.differences[0].kind).toBe('row_mismatch')
  })

  it('an EXTRA table is reported too — seen, not silently ignored', () => {
    const r = compareManifests(m({ clients: 3 }), m({ clients: 3, something_new: 5 }))
    expect(r.differences).toContainEqual({ table: 'something_new', before: 0, after: 5, kind: 'extra_table' })
  })

  it('the verdict refuses to call it proven', () => {
    const v = compareManifests(m({ clients: 3 }), m({ clients: 2 })).verdict
    expect(v).toContain('NOT proven')
  })

  it('an empty restore is caught rather than reading as "no differences"', () => {
    // The nightmare: restore into a blank database and get a clean-looking report.
    const r = compareManifests(m({ clients: 3, leads: 400 }), m({}))
    expect(r.identical).toBe(false)
    expect(r.differences).toHaveLength(2)
  })
})

describe('the money and the people are read first', () => {
  it('critical tables sort to the top', () => {
    const sorted = criticalFirst([
      { table: 'winning_plays', before: 1, after: 0, kind: 'row_mismatch' },
      { table: 'credit_transactions', before: 900, after: 0, kind: 'missing_table' },
      { table: 'clients', before: 3, after: 2, kind: 'row_mismatch' },
    ])
    expect(sorted.map(d => d.table)).toEqual(['clients', 'credit_transactions', 'winning_plays'])
  })

  it('the critical list holds the money, the people and the do-not-contact list', () => {
    expect(CRITICAL_TABLES).toContain('credit_transactions')
    expect(CRITICAL_TABLES).toContain('leads')
    // Losing this one means emailing people who told us to stop.
    expect(CRITICAL_TABLES).toContain('opt_out_blocklist')
    // #554b's table — losing it means no client can send at all.
    expect(CRITICAL_TABLES).toContain('client_inboxes')
  })

  it('non-critical tables keep a stable alphabetical order', () => {
    const sorted = criticalFirst([
      { table: 'zebra', before: 1, after: 0, kind: 'row_mismatch' },
      { table: 'apple', before: 1, after: 0, kind: 'row_mismatch' },
    ])
    expect(sorted.map(d => d.table)).toEqual(['apple', 'zebra'])
  })
})

describe('a stale manifest is worse than none', () => {
  const now = new Date('2026-07-27T09:00:00Z')

  it('a fresh one is usable', () => {
    expect(manifestAge('2026-07-25T09:00:00Z', now).stale).toBe(false)
  })

  it(`older than ${MANIFEST_STALE_DAYS} days is flagged`, () => {
    // Comparing against a months-old manifest produces differences that mean nothing and
    // hides the ones that do — which reads as a failed restore, or worse, excuses a real one.
    const r = manifestAge('2026-05-01T09:00:00Z', now)
    expect(r.stale).toBe(true)
    expect(r.note).toContain('moved on')
  })

  it('the age is reported either way, so nobody has to compute it', () => {
    expect(manifestAge('2026-07-25T09:00:00Z', now).days).toBe(2)
  })
})

describe('the plan and the endpoint', () => {
  it('the drill plan is written down', () => {
    const doc = readFileSync(join(__dirname, '../../../../docs/BACKUP-RESTORE-DRILL.md'), 'utf8')
    // It must state the blocker plainly rather than writing dashboard steps nobody can do.
    expect(doc).toContain('dashboard')
    expect(doc.toLowerCase()).toContain('never been tested')
  })

  it('a manifest can actually be taken', () => {
    const src = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    expect(src).toContain('/backup/manifest')
  })

  it('THE MANIFEST CARRIES NO DATA — only counts', () => {
    // An endpoint that dumped every row would be a single URL that exfiltrates the whole
    // customer database, including client_inboxes — which #554b just found with no RLS at
    // all. Counts prove completeness without moving a personal detail.
    const src = readFileSync(join(__dirname, './backup-manifest.ts'), 'utf8')
    expect(src).not.toMatch(/select \*|SELECT \*/)
  })
})
