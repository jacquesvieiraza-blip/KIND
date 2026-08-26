// R66 + R67 — the two founder rules this build exists for, proved as behaviour.
//
// ⚠️ NO LIVE PROVIDER IS CALLED ANYWHERE IN THIS FILE. The guard tests assert that a
// paid call is REFUSED; the memory tests use a fake db. Nothing here can spend money.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  toMemoryRecord,
  rememberAcquiredIdentities,
  AcquisitionMemoryWriteError,
  type AcquisitionMemoryRecord,
  type MemoryDb,
} from './acquisition-memory'
import {
  isSafeTestMode,
  assertPaidProviderAllowed,
  PaidProviderBlockedError,
} from './paid-provider-guard'

const CONTACT = {
  id: 'pdl_abc123',
  first_name: 'Dana',
  last_name: 'Okafor',
  email: 'Dana.Okafor@Example.com',
  title: 'Head of Ops',
  seniority: 'director',
  linkedin_url: 'https://linkedin.com/in/dana',
  country: 'United Kingdom',
  organization: { name: 'Example Ltd', industry: 'logistics', num_employees: 40 },
}

/** Fake db that records what was upserted. No network, no Supabase. */
function fakeDb() {
  const calls: Array<{ table: string; rows: Record<string, unknown>[]; opts: unknown }> = []
  const updates: Array<{ patch: Record<string, unknown>; eqs: Array<[string, unknown]>; ids: string[] }> = []
  const db: MemoryDb & { calls: typeof calls; updates: typeof updates } = {
    calls, updates,
    from(table: string) {
      return {
        async upsert(rows: Record<string, unknown>[], opts: { onConflict: string; ignoreDuplicates: boolean }) {
          calls.push({ table, rows, opts })
          return { error: null }
        },
        update(patch: Record<string, unknown>) {
          const eqs: Array<[string, unknown]> = []
          const chain = {
            eq(col: string, val: unknown) { eqs.push([col, val]); return chain },
            async in(_col: string, ids: string[]) { updates.push({ patch, eqs, ids }); return { error: null } },
          }
          return chain as never
        },
      }
    },
  }
  return db
}

describe('R66 — the zero-spend guard', () => {
  const orig = { safe: process.env.SAFE_TEST_MODE, allow: process.env.PAID_PROVIDERS_ENABLED, vitest: process.env.VITEST, node: process.env.NODE_ENV }
  beforeEach(() => { delete process.env.SAFE_TEST_MODE; delete process.env.PAID_PROVIDERS_ENABLED })
  afterEach(() => {
    for (const [k, v] of [['SAFE_TEST_MODE', orig.safe], ['PAID_PROVIDERS_ENABLED', orig.allow], ['VITEST', orig.vitest], ['NODE_ENV', orig.node]] as const) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v
    }
  })

  // ⚠️ THE FIX THAT MADE THE RULE REAL. The first version was SAFE_TEST_MODE-only and
  // NOTHING in the repo set it, so every launch test would have spent unless a human
  // remembered. Safe mode is now the DEFAULT and spending is the opt-in.
  it('is ON by default — forgetting a variable costs a refused call, never money', () => {
    // Simulate a non-test process with nothing configured.
    delete process.env.VITEST
    process.env.NODE_ENV = 'production'
    expect(isSafeTestMode()).toBe(true)
    expect(() => assertPaidProviderAllowed('pdl')).toThrow(PaidProviderBlockedError)
  })

  // ⚠️ THE UNIT SUITE IS PROTECTED STRUCTURALLY, NOT BY THIS FLAG. `vitest.setup.ts`
  // DELETES every provider API key before any test runs, so a test cannot authenticate
  // against a provider even if it reached one. That is stronger than a flag, because a
  // flag can be unset and a missing key cannot be guessed.
  it('the test runner has NO provider keys — spending is impossible, not merely blocked', async () => {
    const { PROVIDER_KEYS } = await import('../../../../vitest.setup')
    for (const k of PROVIDER_KEYS) {
      // A test may set its own fake key to exercise mocked code; what must never exist is
      // a REAL one inherited from the machine running the suite.
      const v = process.env[k]
      expect(v === undefined || v.startsWith('test-'), `${k} must be absent or an obvious fake, got ${v}`).toBe(true)
    }
  })

  it('the setup file is actually wired under `test:` — at the config root it is ignored', () => {
    const cfg = readFileSync(join(__dirname, '..', '..', '..', '..', 'vitest.config.ts'), 'utf8')
    const testBlock = cfg.slice(cfg.indexOf('test: {'), cfg.indexOf('resolve: {'))
    expect(testBlock).toContain('setupFiles')
  })

  it('production has a DELIBERATE path to providers — one variable, set on purpose', () => {
    delete process.env.VITEST
    process.env.NODE_ENV = 'production'
    process.env.PAID_PROVIDERS_ENABLED = 'true'
    expect(isSafeTestMode()).toBe(false)
    expect(() => assertPaidProviderAllowed('pdl')).not.toThrow()
  })

  it('SAFE_TEST_MODE still overrides the production opt-in — staging can be pinned safe', () => {
    delete process.env.VITEST
    process.env.NODE_ENV = 'production'
    process.env.PAID_PROVIDERS_ENABLED = 'true'
    process.env.SAFE_TEST_MODE = '1'
    expect(isSafeTestMode()).toBe(true)
  })

  it('BLOCKS every paid provider when safe-test mode is on', () => {
    process.env.SAFE_TEST_MODE = '1'
    for (const p of ['pdl', 'apollo', 'hunter', 'clearbit'] as const) {
      expect(() => assertPaidProviderAllowed(p)).toThrow(PaidProviderBlockedError)
    }
  })

  it('FAILS LOUDLY rather than returning empty — an exhausted safe pool must not look like a finished audience', () => {
    process.env.SAFE_TEST_MODE = '1'
    let thrown: unknown = null
    try { assertPaidProviderAllowed('pdl', 'pdlSearchOnce') } catch (e) { thrown = e }
    expect(thrown).toBeInstanceOf(PaidProviderBlockedError)
    // The message has to tell whoever reads the log what to do INSTEAD of buying data.
    expect(String((thrown as Error).message)).toContain('do not buy more data')
    expect((thrown as PaidProviderBlockedError).code).toBe('SAFE_TEST_MODE_BLOCKED')
    expect((thrown as PaidProviderBlockedError).provider).toBe('pdl')
  })

  it('fails CLOSED on a malformed opt-in — only an explicit yes enables spending', () => {
    delete process.env.VITEST
    process.env.NODE_ENV = 'production'
    for (const raw of ['', 'maybe', 'TRUE ', '2', 'y', 'enabled', 'false']) {
      process.env.PAID_PROVIDERS_ENABLED = raw
      const expected = ['true', 'TRUE '].includes(raw) ? false : true
      expect(isSafeTestMode(), `PAID_PROVIDERS_ENABLED=${JSON.stringify(raw)}`).toBe(expected)
    }
  })

  it('reads the flags at CALL time, not at import time', () => {
    delete process.env.VITEST
    process.env.NODE_ENV = 'production'
    process.env.PAID_PROVIDERS_ENABLED = 'true'
    expect(isSafeTestMode()).toBe(false)
    process.env.SAFE_TEST_MODE = '1'
    expect(isSafeTestMode()).toBe(true)   // would fail against a module-level constant
  })

  // ⚠️ THE TEETH. A guard that is not actually AT the paid call is a convention, not a
  // guard. These read the shipped source and assert the call site, so moving the fetch
  // without moving the guard fails here.
  it('is wired at every paid-provider fetch boundary in the shipped source', () => {
    const lib = (f: string) => readFileSync(join(__dirname, f), 'utf8')

    const pdl = lib('pdl-search.ts')
    expect(pdl).toContain("assertPaidProviderAllowed('pdl', 'pdlSearchOnce')")
    // Outside the try — inside, the catch turns it into `{ kind: 'error' }`, i.e. a zero.
    expect(pdl.indexOf("assertPaidProviderAllowed('pdl', 'pdlSearchOnce')"))
      .toBeLessThan(pdl.indexOf('const res = await fetch(PDL_SEARCH_URL, {', pdl.indexOf("assertPaidProviderAllowed('pdl', 'pdlSearchOnce')")))

    const apollo = lib('apollo.ts')
    for (const site of ['previewCount', 'searchPeople', 'bulkMatch']) {
      expect(apollo).toContain(`assertPaidProviderAllowed('apollo', '${site}')`)
    }

    const enrich = lib('enrichment.ts')
    expect(enrich).toContain("assertPaidProviderAllowed('hunter', 'tryHunter')")
    expect(enrich).toContain("assertPaidProviderAllowed('pdl', 'pdlEnrich')")
    expect(enrich).toContain("assertPaidProviderAllowed('clearbit', 'tryClearbit')")
  })
})

describe('R67 — acquisition memory: retention is not contactability', () => {
  it('retains an EMAILLESS paid identity — the case lead_pool structurally cannot hold', () => {
    const rec = toMemoryRecord({ ...CONTACT, email: null }, { source: 'pdl', costUsd: 0.28 })
    expect(rec).not.toBeNull()
    expect(rec!.email_norm).toBeNull()
    expect(rec!.provider_id).toBe('pdl_abc123')   // the identity key that makes it possible
    expect(rec!.acquisition_cost_usd).toBe(0.28)
  })

  it('remembers a SUPPRESSED / DNC identity, and marks it uncontactable', () => {
    const rec = toMemoryRecord(CONTACT, {
      source: 'pdl', costUsd: 0.28, contactable: false, suppressionReason: 'dnc',
    })
    expect(rec).not.toBeNull()
    expect(rec!.contactable).toBe(false)
    expect(rec!.suppression_reason).toBe('dnc')
    // Remembered — that is the point. Forgetting them is what makes us re-buy them.
    expect(rec!.provider_id).toBe('pdl_abc123')
  })

  it('remembers an OPT-OUT identity, and never marks it contactable', () => {
    const rec = toMemoryRecord(CONTACT, {
      source: 'pdl', costUsd: 0.28, contactable: false, suppressionReason: 'opt_out',
    })
    expect(rec!.contactable).toBe(false)
    expect(rec!.suppression_reason).toBe('opt_out')
  })

  it('never leaves an uncontactable row without a reason', () => {
    const rec = toMemoryRecord(CONTACT, { source: 'pdl', costUsd: 0.28, contactable: false })
    expect(rec!.suppression_reason).toBe('suppressed')
  })

  it('a paid identity SURVIVES client rejection — memory is company-wide, not client-owned', () => {
    // Client A paid for them and rejected them. The row still exists, and its
    // client id is provenance ("who first saw them"), never ownership.
    const rec = toMemoryRecord(CONTACT, { source: 'pdl', costUsd: 0.28, clientId: 'client-A' })
    expect(rec!.first_seen_client_id).toBe('client-A')
    expect(rec!.contactable).toBe(true)
    // Nothing in the record ties retention to that client's acceptance.
    expect(Object.keys(rec!)).not.toContain('rejected')
  })

  it('preserves provenance and the original acquisition cost', () => {
    const rec = toMemoryRecord(CONTACT, { source: 'pdl', costUsd: 0.28, clientId: 'c1' })
    expect(rec!.source).toBe('pdl')
    expect(rec!.acquisition_cost_usd).toBe(0.28)
    expect(rec!.company).toBe('Example Ltd')
    expect(rec!.industry).toBe('logistics')
    expect(rec!.company_size).toBe('40')
    expect(rec!.country).toBe('United Kingdom')
    expect(rec!.linkedin_url).toBe('https://linkedin.com/in/dana')
    expect(rec!.email_norm).toBe('dana.okafor@example.com')   // normalised, per HC-1
  })

  it('drops ONLY a contact with no provider id — there is no identity key to dedupe on', () => {
    expect(toMemoryRecord({ ...CONTACT, id: null }, { source: 'pdl', costUsd: 0.28 })).toBeNull()
    expect(toMemoryRecord({ ...CONTACT, id: '   ' }, { source: 'pdl', costUsd: 0.28 })).toBeNull()
  })

  it('DEDUPES within a batch, so reuse cannot double-count acquisition cost', async () => {
    const db = fakeDb()
    const twice: AcquisitionMemoryRecord[] = [
      toMemoryRecord(CONTACT, { source: 'pdl', costUsd: 0.28 })!,
      toMemoryRecord(CONTACT, { source: 'pdl', costUsd: 0.28 })!,   // same person again
      toMemoryRecord({ ...CONTACT, id: 'pdl_other' }, { source: 'pdl', costUsd: 0.28 })!,
    ]
    const { written } = await rememberAcquiredIdentities(db, twice)

    expect(written).toBe(2)                       // not 3
    const rows = db.calls[0].rows
    expect(rows).toHaveLength(2)
    const total = rows.reduce((n, r) => n + Number(r.acquisition_cost_usd), 0)
    expect(total).toBeCloseTo(0.56, 5)            // 2 × $0.28, never 3
  })

  it('upserts ON CONFLICT DO NOTHING against the provider key, so cost is never rewritten', async () => {
    const db = fakeDb()
    await rememberAcquiredIdentities(db, [toMemoryRecord(CONTACT, { source: 'pdl', costUsd: 0.28 })!])
    expect(db.calls[0].table).toBe('acquisition_memory')
    expect(db.calls[0].opts).toEqual({ onConflict: 'source,provider_id', ignoreDuplicates: true })
  })

  // ⚠️ REVERSED ON REVIEW. This used to assert the write was NON-FATAL — which meant a
  // failed memory write let runIcpJob walk on into the gates that discard paid contacts,
  // losing an identity we had paid for with nothing recording we ever saw it. R67 forbids
  // exactly that, so the write now FAILS CLOSED and the run stops.
  it('FAILS CLOSED — a memory-write failure throws and stops the run', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let attempts = 0
    const broken: MemoryDb = {
      from: () => ({
        upsert: async () => { attempts++; return { error: { message: 'boom' } } },
        update: () => ({ eq: () => ({ eq: () => ({ in: async () => ({ error: null }) }) }) }) as never,
      }),
    }
    await expect(
      rememberAcquiredIdentities(broken, [toMemoryRecord(CONTACT, { source: 'pdl', costUsd: 0.28 })!]),
    ).rejects.toThrow(AcquisitionMemoryWriteError)

    expect(attempts).toBe(2)            // one retry before giving up
    expect(spy).toHaveBeenCalled()      // and loudly
    spy.mockRestore()
  })

  // ⛓️ AMENDED BY FOUNDER RULING (26 Aug, final review). This guard used to forbid ANY
  // catch around the memory write, because the first defect was a catch that swallowed
  // the failure and let the run process paid identities as if nothing happened. The
  // ruling resolved the collision with the partial-proof rule: a catch now EXISTS, and
  // what it must do is the new invariant — withhold every paid identity, keep the
  // already-safe pool matches, drop trust so a zero-pool run derives `failed`, and tell
  // a human. What stays forbidden forever: a paid identity being INSERTED after its
  // memory write failed.
  it('a memory failure WITHHOLDS every paid identity and keeps the pool (founder ruling)', () => {
    const src = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')
    const at = src.indexOf('rememberAcquiredIdentities(db as never, memories)')
    const block = src.slice(src.indexOf('AMENDED BY FOUNDER RULING'), at + 1600)
    // The catch exists and does exactly the ruled three things:
    expect(block).toContain('contacts = []')                    // ① paid identities withheld
    expect(block).toContain("searchTrust = 'unproven'")          // ② zero-pool → failed, never no_match
    expect(block).toContain('CRITICAL: paid identities acquired but NOT recorded')  // ③ human told
    // And the pool half of the ruling is stated where it executes:
    expect(block).toContain('pool-served matches')
    // The withholding must come BEFORE the insertion loop reads `contacts`.
    const emptied = src.indexOf('contacts = []', src.indexOf('AMENDED BY FOUNDER RULING'))
    const insertLoop = src.indexOf('for (const contact of contacts) {', src.indexOf('AMENDED BY FOUNDER RULING'))
    expect(emptied).toBeGreaterThan(-1)
    expect(insertLoop, 'withholding must precede the insert loop').toBeGreaterThan(emptied)
  })

  // ── SUPPRESSION TRANSITION — the ON CONFLICT DO NOTHING staleness bug ──────────
  it('TIGHTENS a previously-contactable identity that later turns up suppressed', async () => {
    const db = fakeDb()
    // Run 1: first seen contactable → inserted as contactable.
    await rememberAcquiredIdentities(db, [toMemoryRecord(CONTACT, { source: 'pdl', costUsd: 0.28 })!])
    expect(db.updates).toHaveLength(0)                 // nothing to tighten yet
    expect(db.calls[0].rows[0].contactable).toBe(true)

    // Run 2: SAME provider identity, now DNC. DO NOTHING alone would leave the row
    // saying contactable=true forever — stale in the one direction that matters.
    const { suppressed } = await rememberAcquiredIdentities(db, [
      toMemoryRecord(CONTACT, { source: 'pdl', costUsd: 0.28, contactable: false, suppressionReason: 'dnc' })!,
    ])

    expect(suppressed).toBe(1)
    const u = db.updates[0]
    expect(u.patch).toEqual({ contactable: false, suppression_reason: 'dnc' })
    expect(u.ids).toEqual(['pdl_abc123'])
    // Guarded so it only ever tightens, and is idempotent.
    expect(u.eqs).toContainEqual(['source', 'pdl'])
    expect(u.eqs).toContainEqual(['contactable', true])
    // ⚠️ AND IT NEVER TOUCHES THE MONEY. Cost and timestamps are insert-only.
    expect(Object.keys(u.patch)).not.toContain('acquisition_cost_usd')
    expect(Object.keys(u.patch)).not.toContain('acquired_at')
    expect(Object.keys(u.patch)).not.toContain('first_seen_client_id')
  })

  it('NEVER loosens — a later contactable sighting cannot revive a suppressed row', async () => {
    const db = fakeDb()
    await rememberAcquiredIdentities(db, [
      toMemoryRecord(CONTACT, { source: 'pdl', costUsd: 0.28, contactable: false, suppressionReason: 'opt_out' })!,
    ])
    db.updates.length = 0
    // Same person, now looking contactable. There must be no statement that sets true.
    await rememberAcquiredIdentities(db, [toMemoryRecord(CONTACT, { source: 'pdl', costUsd: 0.28 })!])
    expect(db.updates).toHaveLength(0)
    for (const u of db.updates) expect(u.patch.contactable).not.toBe(true)
  })

  it('resolves a within-batch disagreement toward UNCONTACTABLE', async () => {
    const db = fakeDb()
    await rememberAcquiredIdentities(db, [
      toMemoryRecord(CONTACT, { source: 'pdl', costUsd: 0.28 })!,                                        // contactable
      toMemoryRecord(CONTACT, { source: 'pdl', costUsd: 0.28, contactable: false, suppressionReason: 'dnc' })!,
    ])
    expect(db.calls[0].rows).toHaveLength(1)
    expect(db.calls[0].rows[0].contactable).toBe(false)   // never resolve toward contactable
  })

  it('writes nothing when there is nothing to write', async () => {
    const db = fakeDb()
    expect((await rememberAcquiredIdentities(db, [])).written).toBe(0)
    expect(db.calls).toHaveLength(0)
  })
})

describe('R67 — the memory write happens BEFORE the gates that discard paid contacts', () => {
  it('runs ahead of every skip branch in the shipped sourcing loop', () => {
    const src = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')

    const remember = src.indexOf('rememberAcquiredIdentities(db as never, memories)')
    expect(remember).toBeGreaterThan(-1)

    // Each of these drops a contact we have already paid for. All must come AFTER.
    const gates = [
      'if (pdlKept >= grantedSize) {',
      'if (isSuppressed({ email: contact.email',
      "const { data: blocked } = await db.from('opt_out_blocklist')",
      "const { data: existing } = await db.from('leads')",
    ]
    for (const g of gates) {
      const at = src.indexOf(g, remember)
      expect(at, `gate should sit after the memory write: ${g}`).toBeGreaterThan(remember)
    }

    // And the pool write — the thing that USED to be the only memory — is still last.
    expect(src.indexOf("from('lead_pool')\n          .upsert", remember)).toBeGreaterThan(remember)
  })

  it('records suppression as a REASON on the row, never as a reason to forget the person', () => {
    const src = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')
    const block = src.slice(
      src.indexOf('REMEMBER EVERY PAID IDENTITY'),
      src.indexOf('rememberAcquiredIdentities(db as never, memories)'),
    )
    expect(block).toContain("reason = 'opt_out'")
    expect(block).toContain("suppressed ? 'dnc' : null")
    // No `continue` may appear as CONTROL FLOW in the memory pass — every contact
    // reaches the write. Comments are stripped first: an earlier version of this guard
    // matched the word "continue" inside the block's own explanatory comment, which
    // proved nothing about the code.
    const code = block
      .split('\n')
      .filter(l => !l.trim().startsWith('//'))
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '')
    expect(code).toMatch(/for \(const contact of contacts\)/)   // the pass exists…
    expect(code).not.toMatch(/\bcontinue\s*;?\s*$/m)            // …and nothing escapes it
    expect(code).not.toMatch(/\bbreak\s*;?\s*$/m)
  })
})
