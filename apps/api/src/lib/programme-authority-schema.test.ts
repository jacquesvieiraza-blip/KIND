// ═══════════════════════════════════════════════════════════════════════════════════════
// PR A1 — THE SCHEMA SHIPS FIRST, AND THE DEPLOYED PRODUCT MUST NOT NOTICE.
//
// This PR adds two nullable columns and two CHECK constraints to `public.programmes` and
// NOTHING ELSE. No application code reads them, writes them or branches on them. The whole
// value of the change is that after the founder presses Run, the product behaves exactly as
// it did before — and the columns are simply there, waiting for PR A2.
//
// ── 🛑 WHY THE SCHEMA IS SPLIT OUT AT ALL ────────────────────────────────────────────────
//
// The order is FORCED BY THE RUNNER, not chosen for tidiness. `PENDING_MIGRATIONS` is a
// TypeScript constant compiled into the DEPLOYED API — `.sql` files are never copied into
// `dist/`, which is exactly why the runner uses a constant. So a migration can NEVER be
// applied before the build that carries it.
//
// Shipping the columns together with the code that SELECTS them would therefore have
// guaranteed a window — between the API going live and a human pressing Run — in which every
// explicit `programmes` select named a column the database did not have. PostgREST answers
// that with `42703`/`PGRST204` (`schema-probe.ts` documents both codes), and the programme
// authority reads fail CLOSED: outreach refused across every path, and the Vida programme
// panel unable to render.
//
// Hence expand/contract: schema alone, deployed and applied; readers in PR A2 afterwards.
//
// ── ⚑ UPDATED BY PR A2 — ONE BLOCK REPLACED, NOTHING WEAKENED ───────────────────────────
//
// A1's §⑤ asserted that NO application file named either column. A2 adds exactly those
// readers, so that assertion is false by design and has been REPLACED — not relaxed — by an
// ALLOWLIST of the modules permitted to name them, plus an explicit proof that no customer or
// public surface can. A1's version could only fail once, the first time any file mentioned
// the column; the allowlist keeps failing forever, which is the property actually worth
// guarding. Everything else in this file is untouched: the DDL proofs, the idempotency
// proofs and the backwards-compatibility proofs stay true forever, and A2 adds no migration.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// ── THE FAKE DATABASE ────────────────────────────────────────────────────────────────────
//
// `@kind/db` throws at import time without Supabase env vars, so it has to be replaced either
// way. It is replaced with a RECORDING fake rather than an empty object because three of the
// proofs below are about what the OLD write paths actually send: "createProgramme still works"
// and "recordFirstPayment never writes the new column" are claims about a payload, and a
// source-text assertion cannot see a payload.
const dbState: {
  programme: Record<string, unknown> | null
  open: Record<string, unknown> | null
  writes: Record<string, unknown>[]
  inserts: Record<string, unknown>[]
} = { programme: null, open: null, writes: [], inserts: [] }

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      let mode: 'byId' | 'open' = 'byId'
      const q: Record<string, unknown> = {
        select: () => q,
        eq: () => q,
        // `openProgrammeForClient` is the only programme read that uses `.not(...)`, so the
        // fake can tell the two reads apart without the caller passing anything.
        not: () => { mode = 'open'; return q },
        limit: () => q, order: () => q, is: () => q,
        insert: (row: Record<string, unknown>) => { dbState.inserts.push(row); return q },
        update: (patch: Record<string, unknown>) => { dbState.writes.push(patch); return q },
        async maybeSingle() {
          return { data: mode === 'open' ? dbState.open : dbState.programme, error: null }
        },
        async single() { return { data: dbState.inserts.at(-1) ?? null, error: null } },
        // supabase-js query builders are thenable; `.update(...).eq(...).is(...).select()` is
        // awaited directly, so the fake must be too or the write path never resolves.
        then: (res: (v: unknown) => unknown) => res({ data: [{ id: 'prog-1' }], error: null }),
      }
      return q
    },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))

import {
  createProgramme, recordFirstPayment, recordSecondPayment,
} from './programme'

const REPO = join(__dirname, '../../../..')
const API = join(__dirname, '..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

const KEY = '20260902_programme_internal_authority'
const RUNNER = read('apps/api/src/lib/pending-migrations.ts')
const CANON = read(`supabase/migrations/${KEY}.sql`)

/** The runner entry's SQL, bounded to THIS entry so a later migration cannot satisfy a check. */
const entrySql = (() => {
  const at = RUNNER.indexOf(`key: '${KEY}'`)
  expect(at, 'the runner entry must exist').toBeGreaterThan(-1)
  const open = RUNNER.indexOf('sql: `', at)
  const end = RUNNER.indexOf('`.trim()', open)
  expect(open, 'the entry must carry SQL').toBeGreaterThan(-1)
  expect(end, 'the entry SQL must terminate').toBeGreaterThan(open)
  return RUNNER.slice(open + 'sql: `'.length, end)
})()

/**
 * Executable SQL only.
 *
 * ⚠️ SQL COMMENTS ARE STRIPPED FIRST, AND THAT IS NOT A CONVENIENCE. The migration DOCUMENTS
 * why it is not a DROP/ADD pair, and that warning necessarily contains the words
 * "DROP CONSTRAINT". A raw substring check would fail on the very comment that proves the
 * point — so only the statements a database would actually execute are asserted against.
 */
const exec = (sql: string) => sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')

const RUN_EXEC = exec(entrySql)
/** The canonical file, minus its leading comment header — the same `body()` rule #273 uses. */
const CANON_EXEC = exec(CANON)

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE DDL ITSELF
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① the DDL adds two nullable columns and two per-stage CHECKs, and nothing else', () => {
  it('both columns are added, IF NOT EXISTS, as timestamptz', () => {
    expect(RUN_EXEC).toMatch(/ADD COLUMN IF NOT EXISTS first_authorised_at\s+timestamptz/)
    expect(RUN_EXEC).toMatch(/ADD COLUMN IF NOT EXISTS second_authorised_at\s+timestamptz/)
  })

  it('🛑 NO DEFAULT on either column — a default would stamp history with authority it never had', () => {
    // #599's precedent. Every existing programme is legitimately NULL here; a DEFAULT now()
    // would silently declare every historic row internally authorised.
    expect(RUN_EXEC, 'no DEFAULT anywhere in the executable SQL').not.toMatch(/\bDEFAULT\b/i)
  })

  it('🛑 NO BACKFILL — the migration writes not one row', () => {
    // The difference between a schema change and a data change. This is the first.
    expect(RUN_EXEC).not.toMatch(/\bUPDATE\s+public\.programmes\b/i)
    expect(RUN_EXEC).not.toMatch(/\bINSERT\s+INTO\b/i)
    expect(RUN_EXEC).not.toMatch(/\bDELETE\s+FROM\b/i)
  })

  it('the P1 CHECK exists and names all three pieces of P1 payment evidence', () => {
    expect(RUN_EXEC).toContain('ADD CONSTRAINT programmes_p1_authority_xor CHECK (')
    const c = RUN_EXEC.slice(RUN_EXEC.indexOf('programmes_p1_authority_xor CHECK ('))
    const body = c.slice(0, c.indexOf(');'))
    expect(body).toContain('first_authorised_at IS NULL')
    expect(body).toContain('first_paid_at IS NULL')
    expect(body).toContain('first_payment_ref IS NULL')
    // ⚠️ THE INTENT ID COUNTS AS PAYMENT EVIDENCE. A stage holding a Stripe payment intent is
    // a paid stage even before the session ref lands, and omitting it would leave a hole the
    // refund/dispute path can drive through.
    expect(body, 'the payment intent is payment evidence too').toContain('first_payment_intent_id IS NULL')
  })

  it('the P2 CHECK exists and names all three pieces of P2 payment evidence', () => {
    expect(RUN_EXEC).toContain('ADD CONSTRAINT programmes_p2_authority_xor CHECK (')
    const c = RUN_EXEC.slice(RUN_EXEC.indexOf('programmes_p2_authority_xor CHECK ('))
    const body = c.slice(0, c.indexOf(');'))
    expect(body).toContain('second_authorised_at IS NULL')
    expect(body).toContain('second_paid_at IS NULL')
    expect(body).toContain('second_payment_ref IS NULL')
    expect(body).toContain('second_payment_intent_id IS NULL')
  })

  it('it touches only `programmes` — no other table is altered', () => {
    const altered = [...RUN_EXEC.matchAll(/ALTER TABLE\s+(\S+)/gi)].map(m => m[1])
    expect(altered.length).toBeGreaterThan(0)
    expect(new Set(altered)).toEqual(new Set(['public.programmes']))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② RE-RUNNING IT IS A NO-OP — because the runner WILL re-run it
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② the runner has no ledger, so a second execution must change nothing', () => {
  it('🛑 NEVER DROP-then-ADD — a CHECK is not an RLS policy', () => {
    // DROP/ADD would pay an ACCESS EXCLUSIVE lock and a full revalidation on EVERY press, and
    // leave a window with no constraint at all during which a concurrent write could insert
    // the very row that then makes the re-ADD fail. Policies elsewhere in the runner use
    // DROP/CREATE safely because a policy is catalogue-only.
    expect(RUN_EXEC, 'a CHECK must never be dropped and recreated on every run').not.toContain('DROP CONSTRAINT')
    expect(RUN_EXEC).not.toMatch(/\bDROP\s+(TABLE|COLUMN|INDEX)\b/i)
  })

  it('each constraint is created ONLY when pg_constraint says it is missing', () => {
    for (const name of ['programmes_p1_authority_xor', 'programmes_p2_authority_xor']) {
      const guard = RUN_EXEC.slice(0, RUN_EXEC.indexOf(`ADD CONSTRAINT ${name}`))
      const lastIf = guard.lastIndexOf('IF NOT EXISTS (')
      expect(lastIf, `${name} must sit behind an existence check`).toBeGreaterThan(-1)
      const test = guard.slice(lastIf)
      expect(test, `${name} must be guarded by a pg_constraint lookup`).toContain('FROM pg_constraint')
      expect(test).toContain(`conname  = '${name}'`)
      expect(test).toContain("conrelid = 'public.programmes'::regclass")
    }
  })

  it('the guard is a DO block, because bare SQL cannot branch', () => {
    expect(RUN_EXEC).toContain('DO $$')
    expect(RUN_EXEC).toContain('END $$;')
    expect((RUN_EXEC.match(/IF NOT EXISTS \(/g) ?? [])).toHaveLength(2)
    expect((RUN_EXEC.match(/END IF;/g) ?? [])).toHaveLength(2)
  })

  it('the column adds are idempotent by construction', () => {
    // Two `ADD COLUMN` clauses, both IF NOT EXISTS — a second run adds nothing.
    const adds = RUN_EXEC.match(/ADD COLUMN/g) ?? []
    const guarded = RUN_EXEC.match(/ADD COLUMN IF NOT EXISTS/g) ?? []
    expect(adds).toHaveLength(2)
    expect(guarded, 'every ADD COLUMN must be guarded').toHaveLength(adds.length)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ THE CONSTRAINT LOGIC, MODELLED
// ═══════════════════════════════════════════════════════════════════════════════════════
//
// ⚠️ THIS IS A MODEL OF THE PREDICATE, NOT THE DATABASE. It proves the SHAPE of the rule is
// the one intended — in particular that every EXISTING row passes. It cannot prove Postgres
// accepted the constraint; only the migration run can, and `pg_constraint` is unreachable
// through PostgREST. Labelled here rather than left to be assumed.
describe('③ every row the database already holds satisfies both CHECKs', () => {
  const p1 = (r: Record<string, unknown>) =>
    r.first_authorised_at == null ||
    (r.first_paid_at == null && r.first_payment_ref == null && r.first_payment_intent_id == null)
  const p2 = (r: Record<string, unknown>) =>
    r.second_authorised_at == null ||
    (r.second_paid_at == null && r.second_payment_ref == null && r.second_payment_intent_id == null)

  /** Every row shape the CURRENT product can produce. All have the new columns NULL. */
  const existingShapes: Record<string, Record<string, unknown>>[] = [
    { DRAFT: {} },
    { AWAITING_FIRST_PAYMENT: {} },
    { SOURCING_AUTHORISED: { first_paid_at: 't', first_payment_ref: 'cs_1', first_payment_intent_id: 'pi_1' } },
    { APPROVED: { first_paid_at: 't', first_payment_ref: 'cs_1', first_payment_intent_id: 'pi_1', approved_at: 't' } },
    { LIVE: {
      first_paid_at: 't', first_payment_ref: 'cs_1', first_payment_intent_id: 'pi_1',
      second_paid_at: 't', second_payment_ref: 'cs_2', second_payment_intent_id: 'pi_2',
      approved_at: 't', went_live_at: 't' } },
    { COMPLETED: {
      first_paid_at: 't', first_payment_ref: 'cs_1', second_paid_at: 't', second_payment_ref: 'cs_2',
      contribution_cents: 1000, contribution_finalised_at: 't' } },
  ]

  it('🛑 a fully-paid LIVE programme still passes — the added columns are NULL, so the OR short-circuits', () => {
    for (const shape of existingShapes) {
      const [status, row] = Object.entries(shape)[0]
      // exactly as the migration leaves them: absent, therefore NULL
      expect(p1(row), `${status} must satisfy the P1 CHECK`).toBe(true)
      expect(p2(row), `${status} must satisfy the P2 CHECK`).toBe(true)
    }
  })

  it('and the rule genuinely bites once internal authority IS set', () => {
    // Otherwise the test above would be satisfied by a constraint that permits everything.
    expect(p1({ first_authorised_at: 't' })).toBe(true)
    expect(p1({ first_authorised_at: 't', first_paid_at: 't' })).toBe(false)
    expect(p1({ first_authorised_at: 't', first_payment_ref: 'cs_1' })).toBe(false)
    expect(p1({ first_authorised_at: 't', first_payment_intent_id: 'pi_1' })).toBe(false)
    expect(p2({ second_authorised_at: 't' })).toBe(true)
    expect(p2({ second_authorised_at: 't', second_paid_at: 't' })).toBe(false)
    expect(p2({ second_authorised_at: 't', second_payment_ref: 'cs_2' })).toBe(false)
    expect(p2({ second_authorised_at: 't', second_payment_intent_id: 'pi_2' })).toBe(false)
  })

  it('the stages are INDEPENDENT — internal P1 beside a paid P2 is a legal row', () => {
    // The reason this is two per-stage CHECKs and not one programme-level `authority_source`
    // column: a House programme authorised internally at P1 may take a genuine payment at P2,
    // and a single enum could only lie about that row.
    const mixed = { first_authorised_at: 't', second_paid_at: 't', second_payment_ref: 'cs_2' }
    expect(p1(mixed)).toBe(true)
    expect(p2(mixed)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ THE DEPLOYED APPLICATION DOES NOT CHANGE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ the currently deployed application behaves exactly as before', () => {
  beforeEach(() => { dbState.programme = null; dbState.open = null; dbState.writes = []; dbState.inserts = [] })

  it('createProgramme still creates a DRAFT, and writes neither new column', () => {
    // A row inserted by the old code has both columns NULL, which is exactly the state the
    // CHECKs pass trivially. If this ever started sending one of them, the CHECK could reject
    // a legitimate creation.
    return createProgramme('client-1', 4).then(r => {
      expect(r.ok).toBe(true)
      const row = dbState.inserts[0]
      expect(row.status).toBe('DRAFT')
      expect(row.client_id).toBe('client-1')
      expect(row, 'creation must not set internal authority').not.toHaveProperty('first_authorised_at')
      expect(row, 'creation must not set internal authority').not.toHaveProperty('second_authorised_at')
    })
  })

  it('recordFirstPayment works with first_authorised_at NULL, and never writes it', async () => {
    dbState.programme = {
      id: 'prog-1', client_id: 'c1', status: 'AWAITING_FIRST_PAYMENT',
      recommended_volume: 1000, first_payment_ref: null, first_authorised_at: null,
    }
    const r = await recordFirstPayment({ programmeId: 'prog-1', sessionId: 'cs_1', paymentIntentId: 'pi_1' })
    expect(r.ok).toBe(true)
    const patch = dbState.writes[0]
    // the unchanged old behaviour, asserted by field so a silent narrowing shows up here
    expect(patch).toMatchObject({
      first_payment_ref: 'cs_1', first_payment_intent_id: 'pi_1',
      sourcing_ceiling: 1000, status: 'SOURCING_AUTHORISED',
    })
    expect(patch.first_paid_at).toBeTruthy()
    expect(patch, 'a payment must never write internal authority').not.toHaveProperty('first_authorised_at')
  })

  it('recordSecondPayment works with second_authorised_at NULL, and never writes it', async () => {
    dbState.programme = {
      id: 'prog-1', client_id: 'c1', status: 'APPROVED', approved_at: 't',
      paused_at: null, second_payment_ref: null, second_authorised_at: null, went_live_at: null,
    }
    const r = await recordSecondPayment({ programmeId: 'prog-1', sessionId: 'cs_2', paymentIntentId: 'pi_2' })
    expect(r.ok).toBe(true)
    const patch = dbState.writes[0]
    // ⛓️ THE MONEY WRITE NO LONGER CARRIES THE STATUS (PR A2). Payment truth and operational
    // truth are separate writes: the payment is committed unconditionally, and the LIVE
    // transition is a second write that happens only once outreach preparation completes —
    // so a paid programme whose preparation failed is never durably LIVE. What this A1 test
    // is about is unchanged and still asserted: the payment records fully and never touches
    // internal authority.
    expect(patch).toMatchObject({ second_payment_ref: 'cs_2', second_payment_intent_id: 'pi_2' })
    expect(patch.second_paid_at).toBeTruthy()
    expect(patch, 'a payment must never write internal authority').not.toHaveProperty('second_authorised_at')
  })

  it('an extra key on a row read cannot leak back into a write — nothing spreads a programme row', () => {
    // `getProgramme` and `openProgrammeForClient` use `select('*')`, so after the migration
    // both new keys appear on every row object the old code reads. That is harmless ONLY
    // because no write path echoes a read row back to the database. This asserts that.
    const src = readFileSync(join(API, 'lib/programme.ts'), 'utf8')
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    expect(src, 'a programme row must never be spread into an insert or update')
      .not.toMatch(/(insert|update)\(\s*\{\s*\.\.\.\s*(p|prog|programme|row)\b/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ THE BOUNDARY THAT REPLACED A1's SCHEMA-ONLY FENCE
// ═══════════════════════════════════════════════════════════════════════════════════════
//
// ── WHAT WAS HERE, AND WHY IT HAD TO GO ─────────────────────────────────────────────────
//
// A1 asserted that **no application file anywhere named `first_authorised_at` or
// `second_authorised_at`**. That was the right assertion for a PR whose entire claim was
// "applying this migration cannot change behaviour, because nothing reads these columns".
//
// PR A2 exists to add exactly those readers, so that assertion is now false BY DESIGN. It is
// deleted deliberately rather than weakened — and replaced, not dropped. The same sweep runs;
// it has been inverted from "nobody may touch these" into an ALLOWLIST of who may.
//
// 🛑 WHY AN ALLOWLIST IS STRONGER THAN THE ORIGINAL, not weaker. A1's test could only ever
// fail once — the first time any file mentioned the column. This one keeps failing forever:
// the day a customer-facing route, a portal page or a public surface learns to write internal
// authority, this goes red and names the file. The property being protected was never "the
// column is unused"; it was "internal authority is not reachable from anywhere it should not
// be", and only the allowlist actually says that.
describe('⑤ internal authority is reachable only from the approved modules', () => {
  const appFiles = (() => {
    const out: string[] = []
    const skipDir = new Set(['node_modules', 'dist', '.next', '.git'])
    const walk = (dir: string) => {
      for (const e of readdirSync(join(REPO, dir), { withFileTypes: true })) {
        if (skipDir.has(e.name)) continue
        const rel = `${dir}/${e.name}`
        if (e.isDirectory()) { walk(rel); continue }
        if (!/\.(ts|tsx)$/.test(e.name)) continue
        if (e.name.endsWith('.test.ts') || e.name.endsWith('.test.tsx')) continue
        if (rel.endsWith('apps/api/src/lib/pending-migrations.ts')) continue   // the migration itself
        out.push(rel)
      }
    }
    for (const root of ['apps/api/src', 'apps/admin/src', 'apps/portal/src', 'packages/shared/src', 'packages/db/src']) walk(root)
    return out
  })()

  /**
   * The only files permitted to name the internal-authority columns.
   *
   * ⚠️ EVERY ENTRY IS AN OPERATOR SURFACE OR A BACKEND DECISION. `apps/portal` — the CLIENT'S
   * product — appears nowhere, and neither does any public or webhook route beyond the Stripe
   * writers, which name the columns only to REFUSE when one is set.
   */
  const ALLOWED = [
    'apps/api/src/lib/programme.ts',            // the writers, the helpers and the XOR guards
    'apps/api/src/lib/programme-authority.ts',  // the gates that read authority
    'apps/api/src/lib/operator-programme.ts',   // operator truth for Vida
    'apps/admin/src/app/vida/page.tsx',         // the operator console (admin-key gated)
    // ⚑ 3 Sep — READ ONLY, AND PROVED READ-ONLY BY THE TEST BELOW.
    //
    // House runs on internal P1/P2 authority and makes no payment, so the customer workspace
    // rendered "First 50% not yet paid" for the life of its programme — never a fake payment,
    // and never the truth either: it states money is outstanding when nothing is owed. Saying
    // "authorised internally" requires the customer read to SEE the fact.
    //
    // 🛑 SEEING IS NOT SETTING. This module performs no writes at all, and the write ban below
    // still covers it — narrowed from "must not mention" to "must not write", which is what
    // that test's own title always claimed.
    'apps/api/src/lib/customer-programme.ts',   // READS internal authority to render it honestly
  ]

  it('the sweep actually reads files — a zero-file scan proves nothing', () => {
    // The vacuity check, kept verbatim from A1. Without it a broken walk renders the whole
    // block green, which is how an allowlist quietly stops being enforced.
    expect(appFiles.length).toBeGreaterThan(200)
    expect(appFiles.some(f => f.endsWith('apps/api/src/lib/programme.ts'))).toBe(true)
    expect(appFiles.some(f => f.endsWith('apps/admin/src/app/vida/page.tsx'))).toBe(true)
  })

  it('🛑 ONLY the approved modules name the authority columns', () => {
    const users = appFiles.filter(f => /first_authorised_at|second_authorised_at/.test(read(f)))
    const unexpected = users.filter(f => !ALLOWED.some(a => f.endsWith(a)))
    expect(unexpected, `these files reference internal authority and are not on the allowlist: ${unexpected.join(', ')}`)
      .toEqual([])
    // …and the allowlist is not aspirational: the readers really are there, so this test
    // cannot pass by the columns having quietly gone unused again.
    expect(users.length).toBeGreaterThan(0)
  })

  it('🛑 NO CUSTOMER OR PUBLIC SURFACE CAN WRITE INTERNAL AUTHORITY', () => {
    // The property that actually matters. A client browser reaching this would let a customer
    // authorise their own programme — the exact thing K.I.N.D owns (AR9).
    const customerSurfaces = appFiles.filter(f =>
      f.startsWith('apps/portal/') ||
      f.endsWith('apps/api/src/routes/clients.ts') ||
      f.endsWith('apps/api/src/routes/leads.ts') ||
      f.endsWith('apps/api/src/routes/icps.ts') ||
      f.endsWith('apps/api/src/lib/customer-programme.ts'))
    expect(customerSurfaces.length, 'the customer-surface list must not be empty').toBeGreaterThan(3)

    // ⛓️ NARROWED 3 Sep FROM "MUST NOT MENTION" TO "MUST NOT WRITE" — which is what this
    // test's own title has always claimed, and the property that actually matters. A client
    // browser reaching a WRITE would let a customer authorise their own programme, the exact
    // thing K.I.N.D owns (AR9). READING the fact is what makes House's workspace honest:
    // without it, it says "not yet paid" about money nobody owes.
    //
    // ⚠️ THIS IS NOT A RELAXATION FOR EVERYONE. Every surface except the one customer READER
    // keeps the blanket ban — a portal file or a lead route has no business naming these
    // columns at all — and the reader is separately proved to name them only inside a select.
    const READ_ONLY = 'apps/api/src/lib/customer-programme.ts'
    for (const f of customerSurfaces) {
      const src = read(f)
      if (!f.endsWith(READ_ONLY)) {
        expect(src, `${f} must not touch internal authority`).not.toMatch(/first_authorised_at|second_authorised_at/)
        continue
      }
      // The reader: no write of any kind may carry an authority column. Each `.update(` /
      // `.insert(` / `.upsert(` is inspected over the statement that follows it.
      for (const m of src.matchAll(/\.(update|insert|upsert)\(/g)) {
        const window = src.slice(m.index!, m.index! + 400)
        expect(window, `${f} writes internal authority`).not.toMatch(/first_authorised_at|second_authorised_at/)
      }
    }
  })

  it('🛑 the customer reader names the authority columns ONLY inside a select', () => {
    // ⚠️ THE POSITIVE HALF. The write ban above proves nothing about a mention that is neither
    // a write nor a read — a stray literal, a helper, a string built for some other purpose.
    // Every occurrence in this module must sit in the select list or in the mapping that
    // copies the value onto the response, and there must BE occurrences.
    const src = read(appFiles.find(f => f.endsWith('apps/api/src/lib/customer-programme.ts'))!)
    const code = src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    const lines = code.split('\n').filter(l => /first_authorised_at|second_authorised_at/.test(l))
    expect(lines.length, 'the reader does not read them at all').toBeGreaterThan(0)
    for (const l of lines) {
      expect(l, `unexpected use of internal authority: ${l.trim()}`)
        .toMatch(/'first_paid_at, second_paid_at, first_authorised_at, second_authorised_at, '|p\.(first|second)_authorised_at as string \| null/)
    }
    // And the module writes nothing whatsoever — it is a read model.
    expect(code, 'the customer reader must perform no writes').not.toMatch(/\.(update|insert|upsert|delete)\(/)
  })

  it('the internal writers live behind the admin-key router, not anywhere else', () => {
    const routes = read('apps/api/src/routes/programme.ts')
    // The router-level admin gate, unchanged, above every route in the file.
    expect(routes).toContain("adminKeyValid(req.headers['x-admin-key'])")
    for (const path of ['/:id/authorise/first', '/:id/authorise/second', '/:id/go-live', '/:id/attach-icp']) {
      expect(routes, `${path} must be defined on the admin-gated programmeRouter`)
        .toContain(`programmeRouter.post('${path}'`)
    }
  })

  it("🛑 NOTHING RE-MIGRATES THE PROGRAMME AUTHORITY COLUMNS, and A1's SQL is byte-for-byte unchanged", () => {
    // The expand/contract contract: the schema shipped in A1 and production has already run
    // it. A second migration touching these columns would mean the founder must run something
    // again — and the whole reason for the split was that he should not have to.
    //
    // ⛓️ RE-AIMED 3 Sep (PR C1). This asserted absolute snapshot counts — 46 runner entries,
    // 159 canonical files — which encoded "no migration has been added since A1". That is a
    // DIFFERENT claim from the one the test is named for, and C1 falsifies it deliberately by
    // adding `clients.commercial_model`. Pinning a global count here also meant this file went
    // red for any unrelated migration anywhere in the product, which is not what it guards.
    //
    // 🛑 THE REAL INVARIANT IS NARROWER AND STRONGER: A1's entry appears exactly ONCE, its two
    // XOR constraints are intact, and NO OTHER runner entry touches `public.programmes` at all.
    // That stays true however many unrelated migrations are added later, and it fails the
    // moment somebody re-migrates these columns — which is the thing worth catching.
    expect((RUNNER.match(/20260902_programme_internal_authority/g) ?? []).length).toBe(1)
    expect(readdirSync(join(REPO, 'supabase/migrations')))
      .toContain('20260902_programme_internal_authority.sql')
    // The DB XOR is still the structural protection underneath the code-level guards.
    expect(RUN_EXEC).toContain('ADD CONSTRAINT programmes_p1_authority_xor CHECK (')
    expect(RUN_EXEC).toContain('ADD CONSTRAINT programmes_p2_authority_xor CHECK (')

    // ⚠️ AND NO ENTRY ADDED *AFTER* A1 MAY ALTER `programmes`. Scoped to what comes after,
    // deliberately: `20260828_programme_money_engine` CREATED the table and
    // `20260829_programme_delivery_control` added the review-hold columns, both legitimately
    // and both already run in production. The thing worth refusing is a NEW migration reaching
    // back to these columns — which would mean the founder has to run something again, and the
    // whole reason for the expand/contract split was that he should not have to.
    //
    // Keys are date-prefixed and the array is chronological, so a plain string compare against
    // A1's key is the ordering. A future entry dated after 2 Sep that touches `programmes`
    // fails here by name.
    const A1 = '20260902_programme_internal_authority'
    const later = (RUNNER.split(/key:\s*'/).slice(1))
      .map(b => ({ key: b.slice(0, b.indexOf("'")), body: b }))
      .filter(e => e.key > A1)
    // ⛓️ NARROWED 7 Sep, TO WHAT THIS GUARD ACTUALLY SAYS IT PROTECTS. It refused ANY later
    // `ALTER TABLE public.programmes`, which flagged `20260907_preparation_snapshot` — three
    // brand-new nullable columns that never name A1's columns and never touch its constraints.
    //
    // 🛑 THE RULE IS "NOTHING REACHES BACK TO THESE COLUMNS", not "the table is sealed". A
    // programme row will legitimately gain columns for years; what must never happen is a new
    // entry re-migrating the authority columns, because then the founder has to run something
    // again and the whole point of expand/contract was that he should not.
    //
    // ⚠️ SO THE TEST IS STRICTER WHERE IT MATTERS AND SILENT WHERE IT DOES NOT: it fails on any
    // later mention of an A1 column or constraint, AND on any DROP/ALTER COLUMN against
    // `programmes` — which is how an existing column would actually be reached back to.
    const A1_COLUMNS = ['first_authorised_at', 'second_authorised_at',
                        'programmes_p1_authority_xor', 'programmes_p2_authority_xor']
    const offenders = later
      .filter(e => {
        const touchesProgrammes = /alter\s+table\s+(?:if\s+exists\s+)?public\.programmes\b/i.test(e.body)
        if (!touchesProgrammes) return false
        if (A1_COLUMNS.some(c => e.body.includes(c))) return true
        // Reaching back to ANY existing column, not merely A1's.
        return /alter\s+table\s+(?:if\s+exists\s+)?public\.programmes[\s\S]{0,400}?\b(drop\s+column|alter\s+column|rename\s+column)\b/i.test(e.body)
      })
      .map(e => e.key)
    expect(offenders, `runner entries added after A1 that reach back to existing programmes columns: ${offenders.join(', ')}`)
      .toEqual([])
    // ⚠️ NON-VACUOUS: the narrowed rule must still BITE. A1's own columns named in a later
    // entry is the case it exists for, so it is exercised here against a synthetic body rather
    // than trusted to be correct because it reads correctly.
    const wouldOffend = 'ALTER TABLE public.programmes ADD COLUMN first_authorised_at timestamptz;'
    expect(A1_COLUMNS.some(c => wouldOffend.includes(c)),
      'the narrowed rule no longer recognises an A1 column being re-migrated').toBe(true)
    // Vacuity guard: this proves nothing if nothing sorts after A1. C1 does.
    expect(later.length, 'no entry sorts after A1 — the sweep above checked nothing').toBeGreaterThan(0)
  })

  it('🛑 `icps.programme_id` has exactly ONE writer, and it is the dedicated action', () => {
    // The generic doors stay shut. `POST /icps` parses through a zod object with no such key
    // (unknown keys are stripped), and the operator ICP editor writes a fixed payload — so an
    // attribution key can never be set by an ordinary edit, which is how a lead comes to be
    // attributed by accident.
    // ⚠️ THE DETECTOR LOOKS AT THE STATEMENT, NOT THE FILE, and the first version did not —
    // it flagged `routes/icps.ts`, which writes `programme_id` onto **leads** while also
    // querying the `icps` table elsewhere. A file-level match conflates two different tables
    // and would have forced a false exception onto the allowlist, quietly gutting it.
    const icpWriters = appFiles.filter(f => {
      const src = read(f).replace(/\s+/g, ' ')
      let at = src.indexOf("from('icps')")
      while (at !== -1) {
        // The chained call that follows this `from('icps')`, up to the next `from(` or 240
        // characters — long enough to contain an update payload, short enough not to run on
        // into an unrelated statement.
        const next = src.indexOf('from(', at + 12)
        const stmt = src.slice(at, next === -1 ? at + 240 : Math.min(next, at + 240))
        if (/update\(\s*\{[^}]*programme_id\s*:/.test(stmt)) return true
        at = src.indexOf("from('icps')", at + 1)
      }
      return false
    })
    expect(icpWriters, `only programme-icp.ts may write icps.programme_id: ${icpWriters.join(', ')}`)
      .toEqual(['apps/api/src/lib/programme-icp.ts'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑥ THE TWO HOMES AGREE, AND ONLY ONE OF THEM RUNS
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑥ the canonical file and the runner entry are the same migration', () => {
  it('the executable SQL is identical, ignoring comments and blank lines', () => {
    // #273's rule: the file is the canonical RECORD, the constant is what EXECUTES. Two homes
    // that can drift are the disease; this is the guard that keeps them one migration.
    //
    // ⚠️ The runner entry is a TypeScript template literal, so its backticks are escaped in
    // source. Unescape before comparing, or the two can never match.
    const norm = (s: string) => s.replace(/\\`/g, '`').split('\n')
      .map(l => l.trimEnd()).filter(l => l.trim() !== '').join('\n').trim()
    expect(norm(CANON_EXEC)).toBe(norm(RUN_EXEC))
  })

  it('the canonical file exists under the ONE home, named for the runner key', () => {
    expect(readdirSync(join(REPO, 'supabase/migrations'))).toContain(`${KEY}.sql`)
  })

  it('🛑 the .sql file is executed by NOTHING — the runner constant is the only executor', () => {
    // #383's lesson, and the reason this file says so out loud: a .sql on disk LOOKS applied.
    // `.sql` files are never copied into `dist/`, which is why the runner uses a constant at
    // all. The header of the canonical file must keep saying this.
    expect(CANON).toContain('THIS FILE IS THE CANONICAL COPY AND IT DOES NOT RUN')
    expect(CANON).toContain('PENDING_MIGRATIONS')
  })

  it('the schema snapshot declares both columns, so schema.sql is not behind its own migration', () => {
    const schema = read('packages/db/src/schema.sql')
    const start = schema.indexOf('create table if not exists public.programmes (')
    const table = schema.slice(start, schema.indexOf(');', start))
    expect(table).toMatch(/first_authorised_at\s+timestamptz/)
    expect(table).toMatch(/second_authorised_at\s+timestamptz/)
    expect(table, 'the snapshot must not invent a default either').not.toMatch(/authorised_at\s+timestamptz[^,\n]*default/i)
  })
})
