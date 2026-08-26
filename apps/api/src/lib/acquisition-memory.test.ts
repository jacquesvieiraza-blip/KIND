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
  const db: MemoryDb & { calls: typeof calls } = {
    calls,
    from(table: string) {
      return {
        async upsert(rows: Record<string, unknown>[], opts: { onConflict: string; ignoreDuplicates: boolean }) {
          calls.push({ table, rows, opts })
          return { error: null }
        },
      }
    },
  }
  return db
}

describe('R66 — the zero-spend guard', () => {
  const original = process.env.SAFE_TEST_MODE
  beforeEach(() => { delete process.env.SAFE_TEST_MODE })
  afterEach(() => {
    if (original === undefined) delete process.env.SAFE_TEST_MODE
    else process.env.SAFE_TEST_MODE = original
  })

  it('is OFF when the variable is absent — production behaviour is unchanged', () => {
    expect(isSafeTestMode()).toBe(false)
    expect(() => assertPaidProviderAllowed('pdl')).not.toThrow()
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

  it('fails CLOSED on a malformed flag — a typo must never re-enable spending', () => {
    for (const raw of ['yes', 'true', 'TRUE', 'on', 'please', '2']) {
      process.env.SAFE_TEST_MODE = raw
      expect(isSafeTestMode()).toBe(true)
    }
    // Only the explicit off-values turn it off.
    for (const raw of ['', '0', 'false', 'no', 'off', 'OFF', ' false ']) {
      process.env.SAFE_TEST_MODE = raw
      expect(isSafeTestMode()).toBe(false)
    }
  })

  it('reads the flag at CALL time, not at import time', () => {
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

  it('is NON-FATAL — a memory failure never breaks a run that already bought leads', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const broken: MemoryDb = {
      from: () => ({ upsert: async () => ({ error: { message: 'boom' } }) }),
    }
    const res = await rememberAcquiredIdentities(broken, [toMemoryRecord(CONTACT, { source: 'pdl', costUsd: 0.28 })!])
    expect(res.written).toBe(0)
    expect(res.error).toBeTruthy()      // reported, not thrown
    expect(spy).toHaveBeenCalled()      // and loudly
    spy.mockRestore()
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
