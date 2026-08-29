import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── BUILD-002 · THE TWO DEFECTS THE FOUNDER'S LIVE WALKTHROUGH FOUND ────────────────────
//
// Both were found by a human opening the product, not by any test here — which is the whole
// argument for walking it. Neither would ever have failed a suite, because both were about
// something being ABSENT: a missing entry on a list, and a discarded error.
//
//   ① Vida → System reported `settle_programme_batch` green while saying nothing at all
//      about `programmes` or `programme_batches`. The tables were never added to
//      REQUIRED_SCHEMA, so the schema section was silent about the two tables the entire
//      commercial model is stored in.
//
//   ② Programme reads dropped their database error, so "no programme exists" and "programme
//      storage is broken" returned the identical value: null.

const PROBES = readFileSync(join(__dirname, 'system-probes.ts'), 'utf8')
const PROG_ROUTE = readFileSync(join(__dirname, '../routes/programme.ts'), 'utf8')
const STRIPE_ROUTE = readFileSync(join(__dirname, '../routes/stripe.ts'), 'utf8')

// ═══════════════════════════════════════════════════════════════════════════════════════
// DEFECT 1 · Vida → System must be able to prove both tables exist
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① the System schema probe covers both BUILD-002 tables', () => {
  /** The REQUIRED_SCHEMA array body, so a mention in a comment cannot satisfy these. */
  const requiredSchema = (() => {
    const start = PROBES.indexOf('const REQUIRED_SCHEMA')
    const end = PROBES.indexOf('\n]', start)
    expect(start, 'REQUIRED_SCHEMA not found — this test is checking nothing').toBeGreaterThan(0)
    return PROBES.slice(start, end)
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
  })()

  it('⚠️ `programmes` IS ON THE LIST — this is the assertion that was missing', () => {
    // RED PROOF: delete the `programmes` entry from REQUIRED_SCHEMA and this fails.
    expect(requiredSchema, 'programmes is not checked by Vida → System').toMatch(/table: 'programmes'/)
  })

  it('⚠️ `programme_batches` IS ON THE LIST', () => {
    expect(requiredSchema, 'programme_batches is not checked by Vida → System').toMatch(/table: 'programme_batches'/)
  })

  it('each names a COLUMN, so a missing table and a missing column are both caught', () => {
    // #630's lesson: the probe falls back to `select('id')` without a column, and a table
    // whose primary key is not `id` then answers with a COLUMN error that used to be
    // reported as "MISSING in production". Naming a real column avoids that entirely.
    expect(requiredSchema).toMatch(/table: 'programmes', column: 'sourcing_ceiling'/)
    expect(requiredSchema).toMatch(/table: 'programme_batches', column: 'granted'/)
  })

  it('both cite the migration that creates them', () => {
    const rows = requiredSchema.split('\n').filter(l => l.includes("table: 'programme"))
    expect(rows).toHaveLength(2)
    for (const r of rows) expect(r).toContain("migration: '20260828_programme_money_engine'")
  })

  it('⚠️ THE FUNCTION PROBE IS NOT A SUBSTITUTE, AND THE CODE SAYS WHY', () => {
    // `settle_programme_batch` is probed with a uuid matching no batch. Its first statement
    // reads `programme_batches` — so a green there incidentally proves THAT table exists —
    // but it returns at `IF v_prog IS NULL` before touching `programmes`. Inferring the
    // second table from that probe is inferring existence from a path that never runs.
    expect(PROBES).toMatch(/settle_programme_batch/)
    expect(PROBES).toMatch(/proves nothing whatsoever about `programmes`/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// DEFECT 2 · a storage error must never render as absence
// ═══════════════════════════════════════════════════════════════════════════════════════
const state: { error: { message: string } | null; rows: Record<string, unknown>[] } = {
  error: null, rows: [],
}

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, not: () => q, limit: () => q, order: () => q,
        async maybeSingle() {
          // The exact supabase-js contract: it RETURNS `{ error }`, it does not throw. That
          // is why dropping the error was so easy to do and so invisible once done.
          return state.error ? { data: null, error: state.error } : { data: state.rows[0] ?? null, error: null }
        },
      }
      return q
    },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))

import { openProgrammeForClient, getProgramme, ProgrammeStorageError } from './programme'

describe('② a database error surfaces; a genuine no-row still returns null', () => {
  beforeEach(() => { state.error = null; state.rows = [] })

  it('⚠️ A MISSING TABLE THROWS — it does not look like "no programme"', async () => {
    // RED PROOF: drop the `if (error) throw` from getProgramme and this returns null,
    // which is precisely the walkthrough defect.
    state.error = { message: 'relation "public.programmes" does not exist' }
    await expect(getProgramme('prog-1')).rejects.toBeInstanceOf(ProgrammeStorageError)
    await expect(openProgrammeForClient('client-1')).rejects.toBeInstanceOf(ProgrammeStorageError)
  })

  it('the thrown error carries the underlying reason, so it is diagnosable', async () => {
    state.error = { message: 'connection terminated unexpectedly' }
    await expect(getProgramme('prog-9')).rejects.toThrow(/connection terminated unexpectedly/)
    await expect(getProgramme('prog-9')).rejects.toThrow(/prog-9/)
  })

  it('⚠️ A GENUINE NO-ROW STILL RETURNS null — the fix must not break absence', async () => {
    // Without this, "throw on everything" would pass the test above and destroy the normal
    // path: every legacy client would look like a storage failure.
    state.error = null
    state.rows = []
    await expect(getProgramme('prog-1')).resolves.toBeNull()
    await expect(openProgrammeForClient('client-1')).resolves.toBeNull()
  })

  it('a real row is still returned unchanged', async () => {
    state.rows = [{ id: 'prog-1', client_id: 'c1', status: 'LIVE' }]
    const p = await getProgramme('prog-1')
    expect(p).not.toBeNull()
    expect((p as { status: string }).status).toBe('LIVE')
  })

  it('⚠️ THE THREE OUTCOMES ARE DISTINGUISHABLE — which is the entire point', async () => {
    // Before the fix, error and no-row were the same value. A caller could not tell them
    // apart, so every caller chose the wrong one.
    state.error = { message: 'boom' }
    const thrown = await getProgramme('p').then(() => 'returned', () => 'threw')
    state.error = null; state.rows = []
    const empty = await getProgramme('p')
    state.rows = [{ id: 'p', client_id: 'c1', status: 'DRAFT' }]
    const found = await getProgramme('p')
    expect(thrown).toBe('threw')
    expect(empty).toBeNull()
    expect(found).not.toBeNull()
  })
})

describe('② the route turns that throw into a visible answer, not a hung request', () => {
  it('⚠️ EVERY HANDLER IS GUARDED — Express 4 has no error middleware anywhere in this app', () => {
    // RED PROOF: unwrap a handler and an async throw becomes an unhandled promise
    // rejection — the request never answers and the operator sees a spinner. Making the
    // readers throw is only an improvement if something catches.
    const handlers = (PROG_ROUTE.match(/programmeRouter\.(get|post)\('/g) ?? []).length
    const guarded = (PROG_ROUTE.match(/guard\(async \(req: Request, res: Response\)/g) ?? []).length
    expect(handlers).toBeGreaterThan(10)
    // One handler is synchronous (`/quote/:meetings` does no I/O), so it needs no guard.
    expect(guarded, `${handlers} handlers, ${guarded} guarded`).toBe(handlers - 1)
  })

  it('a storage failure answers 503 and says it is NOT "no programme exists"', () => {
    expect(PROG_ROUTE).toMatch(/e instanceof ProgrammeStorageError/)
    expect(PROG_ROUTE).toMatch(/res\.status\(503\)/)
    expect(PROG_ROUTE).toMatch(/This is NOT "no programme exists"/)
  })

  it('the synchronous quote route needs no guard — it touches no database', () => {
    // Naming the exception so the count above is a decision rather than an off-by-one.
    expect(PROG_ROUTE).toMatch(/programmeRouter\.get\('\/quote\/:meetings', \(req: Request, res: Response\)/)
  })
})

describe('② the legacy payment webhook reads the error too — and fails CLOSED', () => {
  it('⚠️ IT DROPPED THE ERROR, AND THAT ONE WAS FAIL-OPEN', () => {
    // The dangerous direction: on a storage error a PROGRAMME client fell straight through
    // into startWorkForClient and began sourcing and sending outside programme authority.
    // RED PROOF: remove the `if (progErr)` block and a read failure silently starts work.
    expect(STRIPE_ROUTE).toMatch(/const \{ data: openProg, error: progErr \}/)
    expect(STRIPE_ROUTE).toMatch(/if \(progErr\)[\s\S]{0,1200}return$/m)
    expect(STRIPE_ROUTE).toMatch(/programme state was unreadable — work NOT started/)
  })

  it('the refusal happens BEFORE startWorkForClient is imported', () => {
    const errAt = STRIPE_ROUTE.indexOf('if (progErr) {')
    const startAt = STRIPE_ROUTE.indexOf('const { startWorkForClient } = await import')
    expect(errAt).toBeGreaterThan(0)
    expect(errAt).toBeLessThan(startAt)
  })

  it('⚠️ NOT KNOWING IS NOT PERMISSION — the comment states the rule it enforces', () => {
    expect(STRIPE_ROUTE).toMatch(/Not knowing is not permission/)
  })
})
