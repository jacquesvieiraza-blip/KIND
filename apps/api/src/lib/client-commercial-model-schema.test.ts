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
/** Source with `//`, ` *` and `{/*` comment lines removed. */
const stripComments = (src: string) => src.split('\n')
  .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('{/*') && !t.startsWith('/*') })
  .join('\n')
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

  it('🛑 THE COLUMN IS NAMED IN A KNOWN, REVIEWED SET OF FILES — AND NOWHERE ELSE', () => {
    // ⛓️ RE-AIMED 3 Sep (C2). ~~"THE COLUMN IS DECLARED AND NOT YET READ — C1 is schema only",
    // asserting `readers).toEqual([])`.~~ That was the correct assertion for exactly one PR and
    // it expired the moment C2 shipped the application layer it was holding the door open for.
    //
    // ⚠️ THE EXPAND HALF OF EXPAND/CONTRACT, WHICH IS THE PART THAT IS STILL TRUE. The runner
    // executes a constant compiled into the DEPLOYED API, so a migration can never be applied
    // before the build carrying it. C1 shipped and was run in production BEFORE C2 was written;
    // that ordering is what this file's existence records, and re-aiming the assertion does not
    // retract it.
    //
    // 🛑 SO THE GUARD BECOMES AN ALLOWLIST RATHER THAN A ZERO. A zero here would now have to be
    // deleted, and a deleted guard checks nothing. An allowlist keeps the teeth: a NEW file that
    // starts reading or writing the commercial model fails this test and has to be reviewed and
    // named, which is the property actually worth protecting for a column that decides how a
    // client is charged.
    //
    // ⚠️ APPLICATION CODE ONLY. Tests are excluded because the counter-bump guards
    // (migration-home, schema-drift, programme-authority-schema) name the column in the
    // chained notes that explain why their numbers moved — that prose is the record this
    // repository requires, not a reader. `pending-migrations.ts` is the migration itself.
    const ALLOWED = [
      // The resolver. Every consequential decision goes through it and nothing else reads
      // the column to decide anything.
      'apps/api/src/lib/commercial-model.ts',
      // The audit action name — a string, not a read.
      'apps/api/src/lib/operator-audit.ts',
      // The batch read that fences the retired wallet emails.
      'apps/api/src/lib/programme-notifications.ts',
      // The ONLY writers: customer signup stamps 'programme'; Vida sets it by client id.
      'apps/api/src/routes/auth.ts',
      'apps/api/src/routes/operator.ts',
      // ⛓️ J4-C1 (17 Sep) — REVIEWED AND ADDED, which is what this allowlist is for.
      // `lib/promotion.ts` is server-owned promotion: under MVP1 it is THE customer signup
      // writer, replacing the browser's `/auth/onboard` leg. It stamps the same value signup
      // has always stamped ('programme'), for the same reason, and reads the column to decide
      // nothing.
      //
      // ⚠️ IT IS EXPLICIT ON PURPOSE. Letting the column default instead would have kept this
      // file green while deciding how a client is CHARGED by omission — and a client created
      // by promotion must be a programme client (R124 retired the per-lead model), not
      // whatever a future default happens to be.
      'apps/api/src/lib/promotion.ts',
      // The wallet endpoint, which reports whether the wallet governs this client at all.
      'apps/api/src/routes/credits.ts',
      // The retired /dashboard shell. Its ONE rule decides whether the wallet/credit chrome is
      // rendered at all — the only customer-facing surface that reads the column directly.
      'apps/portal/src/app/(dashboard)/layout.tsx',
    ].sort()

    // ⚠️ THIS LIST IS THE FILES THAT NAME THE COLUMN, NOT THE FILES THAT OBEY IT. Every
    // consequential path — icps, figsy, send-due, stripe, lookalike, programme-authority — goes
    // through `clientCommercialModel`, and that is the point: exactly one module reads the
    // column, and everything else asks it a question. A path appearing HERE would mean it had
    // started reading the raw column for itself, which is how a second interpretation begins.

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
    ]
      // ⚠️ COMMENTS ARE STRIPPED, and that narrows this guard to the property it names. The
      // first version scanned raw text and fired on `routes/figsy.ts` for a chained note whose
      // whole point was to say the column is NOT read there — a guard reporting prose as code,
      // which is exactly the failure A2's authority-column guard already taught. What is
      // protected is a file that READS or WRITES the column, not one that discusses it.
      .filter(f => /commercial_model|commercialModel/.test(stripComments(readFileSync(f, 'utf8'))))
      .map(f => f.replace(REPO + '/', '')).sort()

    expect(readers, 'a new file names the commercial model — review it, then add it here').toEqual(ALLOWED)
    // ⚠️ NON-VACUOUS. An allowlist that had drifted to empty would pass against an empty scan.
    expect(readers.length).toBeGreaterThan(3)
  })

  it('🛑 THE COLUMN IS WRITTEN IN EXACTLY TWO PLACES, AND BOTH ARE DELIBERATE', () => {
    // 🛑 THE WRITE SURFACE IS THE WHOLE RISK. A read that is wrong shows a wrong label; a write
    // that is wrong changes how a real client is charged. There are two, and the founder named
    // both: new M&V signups declare `programme`, and an operator sets it BY CLIENT ID in Vida.
    // A third writer — a backfill, a name-matched sweep, a default in some other insert — is
    // exactly what this test exists to catch.
    // ⚠️ A WRITE IS A WRITE CALL, NOT THE WORD. A first attempt matched `commercial_model:`
    // anywhere, which counted TYPE ANNOTATIONS (`{ commercial_model: string | null }`) and the
    // field name in a JSON RESPONSE as though they changed a row. Both writes are a flat object
    // passed straight to insert/update, so the call itself is what is matched.
    // One level of nesting is allowed inside the object, because the signup insert legitimately
    // spreads a conditional `{ referred_by }` before it reaches the column.
    const write = /\.(insert|update|upsert)\(\s*\{(?:[^{}]|\{[^{}]*\})*commercial_model/g
    const files: Record<string, number> = {}
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name)
        if (name.isDirectory()) walk(p, out)
        else if (/\.(ts|tsx)$/.test(name.name) && !/\.test\.tsx?$/.test(name.name)
          && name.name !== 'pending-migrations.ts') out.push(p)
      }
      return out
    }
    for (const f of walk(join(REPO, 'apps/api/src'))) {
      const src = readFileSync(f, 'utf8')
        // Comments would otherwise count: this file and its neighbours discuss the column at
        // length, and a guard that counts prose is a guard that fails on an edit to a comment.
        .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
      const hits = [...src.matchAll(write)].length
      if (hits > 0) files[f.replace(REPO + '/', '')] = hits
    }
    expect(Object.keys(files).sort(), 'a third writer of the commercial model needs founder review')
      .toEqual(['apps/api/src/routes/auth.ts', 'apps/api/src/routes/operator.ts'])
    expect(Object.values(files), 'one write per file — not a loop, not a sweep').toEqual([1, 1])

    // 🛑 AND THE TWO WRITES ARE THE TWO THE FOUNDER NAMED, matched literally so that a change
    // of intent cannot slip through a change of shape.
    const auth = readFileSync(join(REPO, 'apps/api/src/routes/auth.ts'), 'utf8')
    expect(auth, 'new M&V signups declare the programme model, on the INSERT only')
      .toContain("plan: 'figsy', commercial_model: 'programme' }")
    expect(auth.slice(auth.indexOf('if (existing) {'), auth.indexOf('} else {')),
      'a client re-onboarding must NEVER be reclassified by the signup route')
      .not.toContain('commercial_model')

    const op = readFileSync(join(REPO, 'apps/api/src/routes/operator.ts'), 'utf8')
    expect(op, 'the operator write is by client id, and targets one row')
      .toContain("db.from('clients').update({ commercial_model: target }).eq('id', clientId)")
    // ⚠️ AND THE CLIENT IS NEVER LOOKED UP BY NAME. Founder-locked 3 Sep: "Never by company
    // name. Never HOUSE_CLIENT_ID. Never email inference for the model itself."
    //
    // ⚠️ THE GUARD IS THE LOOKUP, NOT THE WORD. A first version banned `company_name` outright
    // and fired on the handler READING the name to say it back in the confirmation and the
    // audit row — which is the opposite of the defect: naming the account you are about to
    // change is the safety, and only SELECTING by that name is the danger.
    const handler = op.slice(op.indexOf("operatorRouter.post('/clients/:id/commercial-model'"))
      .slice(0, 4000)
    const upToWrite = handler.slice(0, handler.indexOf('writeOperatorAudit'))
    for (const banned of [".eq('company_name'", '.ilike(', 'HOUSE_CLIENT_ID', 'get-kind.com', '.in(', 'listUsers']) {
      expect(upToWrite, `the client must never be selected by ${banned} — it is selected by id`)
        .not.toContain(banned)
    }
    // The positive half: the row comes from the id-keyed helper, and the id comes from the path.
    expect(upToWrite).toContain('const clientId = String(req.params.id ?? ').toString()
    expect(upToWrite).toContain('await requireClient(clientId)')
    expect(op.slice(op.indexOf('async function requireClient')).slice(0, 400),
      'requireClient must select by primary key').toContain(".eq('id', clientId)")
  })
})
