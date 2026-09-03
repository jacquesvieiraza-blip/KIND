// ═══════════════════════════════════════════════════════════════════════════════════════
// PR C1 — THE CLIENT COMMERCIAL MODEL, SCHEMA ONLY
//
// 🛑 WHY THE COLUMN EXISTS. `authorityFor(null)` in programme-authority.ts returns
// `{ allowed: true, mode: 'legacy' }`, so the ABSENCE of a programme row is read as the
// positive assertion that a client is legacy — and every commercial decision inherits it: the
// per-lead approve/reveal routes open, the wallet gates enrolment, low-credit emails send, and
// Vida tells the operator the account is on the $299 pack. Absence of X cannot mean "is Y".
//
// Founder-locked 3 Sep: House and MBF are PROGRAMME-model clients, and having no active
// programme must not make either of them legacy.
//
// ── WHAT THIS FILE GUARDS, AND WHAT IT DELIBERATELY DOES NOT ────────────────────────────
//
// It guards the SHAPE of the migration — nullable, no default, no backfill, a CHECK that
// admits exactly NULL / programme / legacy, and idempotency against a runner that has no
// ledger and re-executes every entry on every run.
//
// ⚠️ IT DOES NOT EXECUTE SQL, because nothing in this suite can. The DDL was separately run
// against a real PostgreSQL 16 cluster on a populated `clients` table, and that run is the
// evidence for the behavioural claims (every row NULL, no default, the CHECK refusing seven
// arbitrary values including the two `plan` values, three repeat runs leaving exactly one
// constraint and a byte-identical payload). This file is what stops the SHAPE regressing
// afterwards — the same division of labour `schema-drift` and `programme-authority-schema`
// already use.
//
// ⚠️ AND IT ASSERTS NO APPLICATION BEHAVIOUR, because C1 adds none. Expand/contract: the
// runner executes a TypeScript constant compiled into the DEPLOYED API, so a migration can
// never be applied before the build that carries it. A reader shipped alongside this would
// open a window in which every explicit `clients` select returned 42703.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: {} }))

const REPO = join(__dirname, '../../../..')
const KEY = '20260903_client_commercial_model'
const RUNNER = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')
const CANON = readFileSync(join(REPO, `supabase/migrations/${KEY}.sql`), 'utf8')
const SCHEMA = readFileSync(join(REPO, 'packages/db/src/schema.sql'), 'utf8')

/** The entry's executable SQL, taken from the constant the runner actually runs. */
const SQL = (() => {
  const i = RUNNER.indexOf(`key: '${KEY}'`)
  expect(i, 'the runner entry is missing').toBeGreaterThan(-1)
  return RUNNER.slice(RUNNER.indexOf('sql: `', i) + 6, RUNNER.indexOf('`.trim(),', i)).trim()
})()

describe('the suite is not vacuous', () => {
  it('the three sources load and the entry is present', () => {
    expect(RUNNER.length).toBeGreaterThan(1000)
    expect(CANON.length).toBeGreaterThan(500)
    expect(SQL.length).toBeGreaterThan(200)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① NULLABLE · NO DEFAULT · NO BACKFILL
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① the column asserts nothing about any existing client', () => {
  it('🛑 it is added with NO DEFAULT and NO NOT NULL', () => {
    expect(SQL).toContain('ADD COLUMN IF NOT EXISTS commercial_model text;')
    // The two words that would classify the whole book by assertion.
    const add = SQL.slice(SQL.indexOf('ADD COLUMN'), SQL.indexOf(';', SQL.indexOf('ADD COLUMN')))
    expect(add.toUpperCase(), 'a DEFAULT would stamp historic rows with a claim nobody checked (#599)').not.toContain('DEFAULT')
    expect(add.toUpperCase(), 'NOT NULL would make the migration fail or force a backfill').not.toContain('NOT NULL')
  })

  it('🛑 NOTHING IS WRITTEN — no UPDATE, no INSERT, no backfill of any shape', () => {
    // The property that makes this migration safe to run on a live book: it classifies nobody.
    for (const banned of [/\bUPDATE\s+public\./i, /\bINSERT\s+INTO\b/i, /\bDELETE\s+FROM\b/i, /\bSET\s+commercial_model\b/i]) {
      expect(SQL, `the migration must write no row: ${banned}`).not.toMatch(banned)
    }
  })

  it('🛑 it touches ONE table, and it is clients', () => {
    const altered = [...SQL.matchAll(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?public\.([a-z_]+)/gi)].map(m => m[1].toLowerCase())
    expect([...new Set(altered)], 'C1 is schema-only and single-table').toEqual(['clients'])
    // Named explicitly: the tables a stray edit would most plausibly reach.
    for (const t of ['programmes', 'leads', 'figsy_enrollments', 'figsy_campaigns', 'credit_transactions']) {
      expect(SQL, `${t} must not be touched by C1`).not.toContain(`public.${t}`)
    }
  })

  it('🛑 NO INDEX — one is not needed and nobody can prove otherwise', () => {
    // The resolver C2 adds reads one client by primary key. An index with no reader is a cost.
    expect(SQL.toUpperCase()).not.toContain('CREATE INDEX')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② THE CHECK
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② the constraint admits exactly three states', () => {
  it('🛑 NULL, programme and legacy — and the NULL arm comes first', () => {
    expect(SQL).toContain('commercial_model IS NULL')
    expect(SQL).toContain("commercial_model IN ('programme', 'legacy')")
    expect(SQL).toContain('ADD CONSTRAINT clients_commercial_model_check CHECK (')
    // Without the NULL arm the constraint would reject every existing row and the migration
    // would fail on validation — which is how a "safe additive" change takes production down.
    const check = SQL.slice(SQL.indexOf('ADD CONSTRAINT clients_commercial_model_check'))
    expect(check.indexOf('IS NULL')).toBeLessThan(check.indexOf("IN ('programme'"))
  })

  it('🛑 IT IS CREATED ONLY IF MISSING — never DROP then ADD', () => {
    // ⚠️ THE RUNNER HAS NO LEDGER and executes every entry on every run. `ADD CONSTRAINT …
    // CHECK` takes an ACCESS EXCLUSIVE lock and revalidates the whole table, so DROP/ADD would
    // pay that on every run AND leave a window with no constraint at all, during which a
    // concurrent write could insert the very row that then makes the re-ADD fail. A1 carries
    // the same reasoning for the same reason.
    expect(SQL).toContain('SELECT 1 FROM pg_constraint')
    expect(SQL).toContain("conname  = 'clients_commercial_model_check'")
    expect(SQL, 'DROP CONSTRAINT would open a window with no constraint at all').not.toMatch(/DROP\s+CONSTRAINT/i)
  })

  it('🛑 EVERY STATEMENT IS IDEMPOTENT — the runner will execute this again next time', () => {
    expect(SQL).toContain('ADD COLUMN IF NOT EXISTS')
    expect(SQL).toContain('IF NOT EXISTS (')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ IT IS NOT `plan`, AND IT IS NOT INFERRED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ the column answers its own question and nobody else\'s', () => {
  it('🛑 it does not touch, read or redefine clients.plan', () => {
    // `plan` selects a WALLET POOL (lead_gen | figsy) and is read by normalizePlan, canEnroll
    // and deliveryCapBalance. Overloading it is how one column starts answering two questions.
    expect(SQL, 'plan must not appear in this migration at all').not.toMatch(/\bplan\b/)
    expect(SQL, 'is_demo is orthogonal — demo-ness is not a commercial model').not.toContain('is_demo')
  })

  it('🛑 the value set contains neither wallet plan, so the two can never be confused', () => {
    expect(SQL).not.toContain("'lead_gen'")
    expect(SQL).not.toContain("'figsy'")
  })

  it('🛑 NOTHING IS INFERRED — no name, no email, no env, no programme lookup', () => {
    for (const banned of ['company_name', 'HOUSE_CLIENT_ID', 'get-kind.com', 'process.env', 'programmes']) {
      expect(SQL, `${banned} must not appear — the model is declared, never inferred`).not.toContain(banned)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ THE RECORD — a .sql on disk LOOKS applied and runs nothing (#383)
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ the runner entry, the canonical file and schema.sql all agree', () => {
  it('🛑 the canonical file exists and carries the runner SQL verbatim', () => {
    expect(readdirSync(join(REPO, 'supabase/migrations'))).toContain(`${KEY}.sql`)
    // Everything after the leading `--` header is what a database would see.
    const lines = CANON.split('\n')
    let i = 0
    while (i < lines.length && (lines[i].trim().startsWith('--') || lines[i].trim() === '')) i++
    expect(lines.slice(i).join('\n').trim(), 'the file and the runner have drifted').toBe(SQL)
  })

  it('the file says plainly that it does not run', () => {
    // #383: an RPC sat in this directory for 33 days doing nothing, because a .sql on disk
    // looks applied. Every canonical file has to say otherwise.
    expect(CANON).toContain('DOES NOT RUN')
    expect(CANON).toContain('PENDING_MIGRATIONS')
    expect(CANON).toContain(KEY)
  })

  it('🛑 schema.sql declares the column, so the drift guard can see it', () => {
    expect(SCHEMA).toContain('add column if not exists commercial_model')
    // Declared WITHOUT a default there too — the snapshot must not claim more than the
    // migration does, or the two records disagree about the book.
    const line = SCHEMA.split('\n').find(l => l.includes('add column if not exists commercial_model'))!
    expect(line.toLowerCase(), 'schema.sql must not add a default the migration does not have').not.toContain('default')
    expect(line.toLowerCase()).not.toContain('not null')
  })

  it('🛑 THE COLUMN IS DECLARED AND NOT YET READ — C1 is schema only', () => {
    // ⚠️ THE EXPAND HALF OF EXPAND/CONTRACT. The runner executes a constant compiled into the
    // DEPLOYED API, so a migration can never be applied before the build carrying it. Any
    // reader shipped in C1 would run against production for the window between deploy and the
    // founder pressing Run — and every explicit `clients` select would return 42703.
    // ⚠️ APPLICATION CODE ONLY. Tests are excluded because the counter-bump guards
    // (migration-home, schema-drift, programme-authority-schema) name the column in the
    // chained notes that explain why their numbers moved — that prose is the record this
    // repository requires, not a reader. `pending-migrations.ts` is the migration itself.
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name)
        if (name.isDirectory()) walk(p, out)
        else if (/\.(ts|tsx)$/.test(name.name)
          && !/\.test\.tsx?$/.test(name.name)
          && name.name !== 'pending-migrations.ts') out.push(p)
      }
      return out
    }
    const readers = [
      ...walk(join(REPO, 'apps/api/src')),
      ...walk(join(REPO, 'apps/portal/src')),
      ...walk(join(REPO, 'apps/admin/src')),
      ...walk(join(REPO, 'packages')),
    ].filter(f => /commercial_model|commercialModel/.test(readFileSync(f, 'utf8')))
      .map(f => f.replace(REPO + '/', ''))
    expect(readers, `C1 must add no application code: ${readers.join(', ')}`).toEqual([])
  })
})
