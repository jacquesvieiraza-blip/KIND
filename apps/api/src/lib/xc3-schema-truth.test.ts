// ═══════════════════════════════════════════════════════════════════════════════════════
// XC-3 · SCHEMA TRUTH AND THE PROXY
//
// Four findings, one item, and they share a single defect shape: **a "we do not know" being
// rendered as a confident statement.**
//
//   ① WHAT HAS BEEN APPLIED was answerable only by replaying every migration. Nothing
//      persisted, so a failure was forgotten the moment the screen closed, and a missing
//      ledger table would have read as "nothing has ever been applied" — the reading that
//      gets somebody to re-run 74 migrations against a database that already has them.
//   ② THE RUN OUTLIVES THE PROXY'S BOUND (74 keys × one connection each), and the abort was
//      reported as "API unreachable" — which invited a retry, and a retry starts a SECOND
//      replay. A timeout means "we stopped waiting", not "nothing happened".
//   ③ THE ADMIN PROXY'S UPSTREAM WAS A HARDCODED PRODUCTION URL, so a preview build of the
//      console drove the live database.
//   ④ THE LIFECYCLE BOARD read eight times per client in a serial loop. Past some client
//      count that page does not get slow, it stops answering.
//
// ⚠️ ASSERTED ON CODE, NOT PROSE, wherever a source-text guard is used — the repo's standing
// convention, because these comment blocks contain the very strings a naive guard matches.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

// ⚠️ HOISTED, the repo's convention (see `apollo-search-contract.test.ts`). `migration-ledger`
// imports `@kind/db`, whose client throws at module scope without these, and a static import
// runs before any plain top-level statement. Nothing here reaches a database: every read is
// either mocked or a source-text assertion.
vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  stateFor, recordMigrationOutcome, isLedgerTableMissing, isLedgerColumnMissing, LEDGER_MIGRATION,
} from './migration-ledger'
import { chunk, mapBounded, readInChunks, IN_CHUNK, READ_CONCURRENCY } from './batched-reads'

const src = (p: string) => readFileSync(join(__dirname, p), 'utf8')
/** Whole-line comments removed. A guard a comment can satisfy is not a guard. */
const codeOnly = (s: string) => s.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')

// ─────────────────────────────────────────────────────────────────────────────
// ① THE APPLIED-MIGRATION LEDGER
// ─────────────────────────────────────────────────────────────────────────────
describe('XC-3 ① · applied-migration state is a FACT, and its absence is not a zero', () => {
  it('a key with no row is never_run — but ONLY when the ledger was read', () => {
    expect(stateFor(undefined, true)).toBe('never_run')
    // 🛑 THE WHOLE POINT. An unread ledger answers UNKNOWN for every key. Answering
    // "never run" would be a statement about the database made from a failed read.
    expect(stateFor(undefined, false)).toBe('unknown')
    expect(stateFor({ key: 'k', applied_at: '2026-09-01T00:00:00Z' }, false)).toBe('unknown')
  })

  it('the last outcome wins over the first success — a re-run that failed is FAILED', () => {
    // A migration that applied in August and errored today is not "applied". `applied_at`
    // records the first success and never moves; `last_outcome` describes the latest attempt,
    // and collapsing them would hide a live failure behind an old success.
    expect(stateFor({ applied_at: '2026-08-01T00:00:00Z', last_outcome: 'error' }, true)).toBe('failed')
    expect(stateFor({ applied_at: '2026-08-01T00:00:00Z', last_outcome: 'ok' }, true)).toBe('applied')
  })

  it('a pre-XC-3 row with no outcome columns still reads as applied', () => {
    // The two original columns mean exactly one thing — this key succeeded once. Refusing to
    // say so because the newer EXPAND columns are missing would hide the only fact the old
    // ledger ever recorded.
    expect(stateFor({ applied_at: '2026-07-24T00:00:00Z' }, true)).toBe('applied')
    expect(stateFor({ applied_at: null }, true)).toBe('never_run')
  })

  it('the two absences are told apart by CODE, not by a message', () => {
    expect(isLedgerTableMissing({ code: '42P01', message: 'x' })).toBe(true)
    expect(isLedgerColumnMissing({ code: '42703', message: 'x' })).toBe(true)
    // Neither may claim the other's cause — they need different sentences and the same
    // remedy named differently.
    expect(isLedgerTableMissing({ code: '42703', message: 'column "run_count" does not exist' })).toBe(false)
    expect(isLedgerColumnMissing({ code: '42P01', message: 'relation "x" does not exist' })).toBe(false)
    // And an unrelated error is neither.
    expect(isLedgerTableMissing({ code: '57014', message: 'statement timeout' })).toBe(false)
    expect(isLedgerColumnMissing({ code: '57014', message: 'statement timeout' })).toBe(false)
  })

  it('recording never throws, and names the migration when the ledger is not there', async () => {
    // 🛑 A LEDGER WRITE MUST NOT FAIL A MIGRATION THAT APPLIED. But it must not be silent
    // either — a run that applied and recorded nothing looked identical to one that did.
    const missing = { query: async () => { throw Object.assign(new Error('nope'), { code: '42P01' }) } }
    const r = await recordMigrationOutcome(missing, 'k', true)
    expect(r.recorded).toBe(false)
    expect(r.reason).toContain(LEDGER_MIGRATION)

    const cols = { query: async () => { throw Object.assign(new Error('nope'), { code: '42703' }) } }
    const r2 = await recordMigrationOutcome(cols, 'k', true)
    expect(r2.recorded).toBe(false)
    expect(r2.reason).toContain(LEDGER_MIGRATION)

    // 🛑 THE ONE A REAL DATABASE FOUND (§8.2-H). `applied_at` was `NOT NULL DEFAULT now()`, so
    // a FAILURE record — which must propose NULL rather than claim an application — threw
    // 23502 on the proposed tuple before ON CONFLICT could resolve it. Successes recorded,
    // failures did not, silently. The reason says which way round that is, because "the
    // ledger is fine" and "the ledger drops exactly the rows you care about" are not the same
    // problem, and the fix is a widening rather than a fabricated timestamp.
    const notNull = { query: async () => { throw Object.assign(new Error('null value in column "applied_at"'), { code: '23502' }) } }
    const r3 = await recordMigrationOutcome(notNull, 'k', false, 'boom')
    expect(r3.recorded).toBe(false)
    expect(r3.reason).toMatch(/FAILED outcome cannot be stored/)
    expect(r3.reason).toContain(LEDGER_MIGRATION)
  })

  it('the widening is in BOTH migration homes, and is stated as a widening', () => {
    // ⚠️ XC-11: a migration exists in `supabase/migrations/` (the canonical record) and in
    // `PENDING_MIGRATIONS` (the only executor). A statement in one home and not the other is
    // either a migration that can never run or one with no reviewable record.
    const canonical = readFileSync(
      join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations', '20260917_operator_tasks_and_automatic_work.sql'), 'utf8')
    const runner = src('pending-migrations.ts')
    for (const home of [canonical, runner]) {
      expect(home).toContain('ALTER COLUMN applied_at DROP NOT NULL')
    }
    // Dropping NOT NULL forbids nothing that was allowed before and invalidates no row, so it
    // is expand-safe — and saying so in the file is what stops it being read as a contract.
    expect(canonical).toMatch(/WIDENING, NOT A CONTRACT/)
  })

  it('applied_at is preserved on conflict, and last_run_at is the one that moves', async () => {
    let sql = ''
    await recordMigrationOutcome({ query: async (s: string) => { sql = s; return {} } }, 'k', true)
    expect(sql).toContain('on conflict (key) do update')
    // ⚠️ THE ONE ASSERTION THAT KEEPS "when did this go in?" ANSWERABLE. An update that
    // overwrote `applied_at` would make every re-run look like a fresh application.
    expect(sql).toMatch(/applied_at\s*=\s*coalesce\(/)
    expect(sql).toContain('last_run_at  = excluded.last_run_at')
    expect(sql).toMatch(/run_count\s*=\s*coalesce\(/)
  })

  it('a FAILED first attempt does not claim an applied_at', async () => {
    let values: unknown[] = []
    await recordMigrationOutcome({ query: async (_s: string, v?: unknown[]) => { values = v ?? []; return {} } }, 'k', false, 'boom')
    // The statement writes `case when $2 then now() else null end`, so a first attempt that
    // errored leaves the column NULL and the state reads `failed`, never `applied`.
    expect(values[1]).toBe(false)
  })

  it('a stored error carries no connection string and no key-shaped token', async () => {
    let values: unknown[] = []
    const w = { query: async (_s: string, v?: unknown[]) => { values = v ?? []; return {} } }
    await recordMigrationOutcome(w, 'k', false,
      'connection to postgresql://postgres:hunter2pass@db.example.com:5432/postgres failed, token zk3Qp9wLmn4TvB8rYd2H')
    const stored = String(values[2])
    // These land in a table the operator console renders and that gets copied into notes.
    expect(stored).not.toContain('hunter2pass')
    expect(stored).not.toContain('zk3Qp9wLmn4TvB8rYd2H')
    expect(stored).toContain('[redacted')
  })

  it('the runner records inside its loop, on the migration\'s own connection', () => {
    const code = codeOnly(src('pending-migrations.ts'))
    // 🛑 PROGRESS IS ONLY OBSERVABLE IF THE WRITE HAPPENS PER MIGRATION. Recording after the
    // loop would leave the operator with nothing to look at during the minutes the run takes
    // — which is the whole reason the proxy's 45s abort read as a dead API.
    const loopAt = code.indexOf('for (const m of PENDING_MIGRATIONS)')
    const recordAt = code.indexOf('recordMigrationOutcome(client')
    const endAt = code.indexOf('client.end()', loopAt)
    expect(loopAt).toBeGreaterThan(-1)
    expect(recordAt, 'the ledger write is inside the loop').toBeGreaterThan(loopAt)
    // …and before the connection is closed, because a second connection could succeed where
    // the migration's own had failed.
    expect(recordAt).toBeLessThan(endAt)
    expect(code).toContain('ledgerRecorded')
  })

  it('the state endpoint is a GET and the run route reports what reached the ledger', () => {
    const code = codeOnly(readFileSync(join(__dirname, '..', 'routes', 'operator.ts'), 'utf8'))
    expect(code).toContain("operatorRouter.get('/migrations/state'")
    expect(code).toContain('ledger_recorded: run.ledgerRecorded')
    expect(code).toContain('table_missing: state.tableMissing')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ② + ③ THE ADMIN PROXY
// ─────────────────────────────────────────────────────────────────────────────
describe('XC-3 ②③ · the proxy says WHICH failure it had, and its upstream is configuration', () => {
  const proxy = codeOnly(readFileSync(
    join(__dirname, '..', '..', '..', 'admin', 'src', 'app', 'api', 'proxy', '[...path]', 'route.ts'), 'utf8'))

  it('the upstream comes from the environment, with the old literal as the fallback', () => {
    expect(proxy).toContain('process.env.ADMIN_API_UPSTREAM')
    // 🛑 THE FALLBACK MUST STAY. Refusing to boot without the variable would take the console
    // down the moment this deploys, before anybody could set it.
    expect(proxy).toContain('DEFAULT_API')
    // And there is exactly ONE hardcoded URL left — the documented default.
    expect((proxy.match(/https:\/\/kindapi-production/g) ?? [])).toHaveLength(1)
  })

  it('a timeout is 504 and a network failure is 503 — never the same answer', () => {
    expect(proxy).toContain('status: 504')
    expect(proxy).toContain('status: 503')
    expect(proxy).toContain('timeout: true')
    expect(proxy).toContain('timeout: false')
    // ⚠️ STRUCTURED, not message-matched: `AbortSignal.timeout` rejects with `TimeoutError`.
    expect(proxy).toContain("name === 'TimeoutError'")
    expect(proxy).toContain('bound.aborted')
  })

  it('the timeout sentence does NOT say the API is unreachable, and warns against a retry', () => {
    // 🛑 THE SENTENCE THAT COST AN OPERATOR SESSION. "API unreachable" on a timeout says
    // nothing happened, so the operator presses the button again — and a second press starts
    // a second replay of 74 migrations.
    const at = proxy.indexOf('if (timedOut)')
    expect(at).toBeGreaterThan(-1)
    const branch = proxy.slice(at, proxy.indexOf('status: 504') + 40)
    expect(branch).not.toContain('API unreachable')
    expect(branch).toMatch(/may still be running/i)
    expect(branch).toMatch(/Do NOT/i)
  })

  it('the bound is a named constant, used once', () => {
    expect(proxy).toContain('UPSTREAM_BOUND_MS')
    // A second literal is a second truth, and the operator-facing sentence quotes this one.
    expect(proxy).not.toMatch(/AbortSignal\.timeout\(\s*\d/)
  })

  it('and the Engine page reads the ledger rather than treating a timeout as failure', () => {
    const page = codeOnly(readFileSync(
      join(__dirname, '..', '..', '..', 'admin', 'src', 'app', 'vida', 'engine', 'page.tsx'), 'utf8'))
    expect(page).toContain("fetch('/api/proxy/operator/migrations/state')")
    // The timeout branch must come BEFORE the generic `!success` throw, or it can never run.
    const t = page.indexOf('if (j?.timeout)')
    const f = page.indexOf("throw new Error(j?.error || 'Migration failed')")
    expect(t).toBeGreaterThan(-1)
    expect(f).toBeGreaterThan(t)
    // ⚠️ AN UNREADABLE LEDGER RENDERS AS "NOT KNOWN". An empty list would read as "nothing
    // has been applied" on the one screen where that reading is most expensive.
    expect(page).toContain('NOT KNOWN')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ④ THE BOARD'S READS
// ─────────────────────────────────────────────────────────────────────────────
describe('XC-3 ④ · the batching primitives', () => {
  it('chunks, and an empty list yields nothing', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 2)).toEqual([])
    expect(chunk([1, 2], 5)).toEqual([[1, 2]])
    expect(() => chunk([1], 0)).toThrow()
  })

  it('the chunk size leaves room for a real URL', () => {
    // supabase-js sends `.in()` in the QUERY STRING. A uuid is 36 characters plus a
    // separator, so this must stay well inside the usual 16 KB request-line limit — a 414
    // comes back as `{data:null,error}`, which a destructured read shows as EMPTY.
    expect(IN_CHUNK * 37).toBeLessThan(14_000)
    expect(READ_CONCURRENCY).toBeGreaterThan(1)
    expect(READ_CONCURRENCY).toBeLessThanOrEqual(12)
  })

  it('never runs more than the limit at once, and keeps input order', async () => {
    let live = 0, peak = 0
    const out = await mapBounded([1, 2, 3, 4, 5, 6, 7, 8], async (n) => {
      live++; peak = Math.max(peak, live)
      await new Promise(r => setTimeout(r, 1))
      live--
      return n * 2
    }, 3)
    expect(peak).toBeLessThanOrEqual(3)
    expect(out.map(s => (s.ok ? s.value : null))).toEqual([2, 4, 6, 8, 10, 12, 14, 16])
  })

  it('one failing chunk does not throw away the others, and says so', async () => {
    // 🛑 THE DEFECT THIS SHAPE PREVENTS. A partial read that returns only its successful rows
    // is indistinguishable from a complete read that found fewer rows — and the caller would
    // render the smaller number as a fact.
    const r = await readInChunks([1, 2, 3, 4], async (ids) => {
      if (ids.includes(3)) throw new Error('chunk failed')
      return ids.map(i => ({ i }))
    }, { chunkSize: 2 })
    expect(r.rows).toEqual([{ i: 1 }, { i: 2 }])
    expect(r.complete).toBe(false)
    expect(r.errors).toHaveLength(1)
  })

  it('an empty id list is COMPLETE, not a failure', async () => {
    const r = await readInChunks([], async () => [1])
    expect(r).toEqual({ rows: [], complete: true, errors: [] })
  })
})

describe('XC-3 ④ · the lifecycle board no longer reads once per client', () => {
  const facts = codeOnly(src('programme-lifecycle-facts.ts'))
  /** The board loop only — the per-client DETAIL call is allowed to read per client. */
  const boardLoop = () => {
    const at = facts.indexOf('const out: LifecycleBoardRow[] = []')
    expect(at, 'the board loop').toBeGreaterThan(-1)
    return facts.slice(at)
  }

  it('the loop body awaits NOTHING', () => {
    // 🛑 THE ASSERTION THAT ACTUALLY BINDS. Any `await` inside this loop is a round trip per
    // client, and the board is the page the console opens on — at 40 clients eight of them
    // each is 320 serialised queries against a hop that abandons the request at 45s.
    expect(boardLoop()).not.toMatch(/\bawait\b/)
  })

  it('the chain is walked by the positive links, with tenancy and ambiguity preserved', () => {
    // ⚠️ A CLIENT-SCOPED SHORTCUT WOULD BE WRONG, not merely loose: House carries campaigns
    // from a retired per-lead desk, so "this client's campaign" can be old work. The batched
    // walk uses the same links `programme-chain.ts` does.
    expect(facts).toContain(".in('programme_id', someProgIds)")
    expect(facts).toContain(".in('icp_id', someIcpIds)")
    expect(facts).toContain('icpOfProgramme')
    // Ambiguity resolves to NOTHING — one attached ICP, one campaign, or no answer.
    expect(facts).toMatch(/list\.length === 1/)
  })

  it('an incomplete read is reported, never rendered as zero', () => {
    expect(facts).toContain('sendsRead')
    expect(facts).toContain('repliesRead')
    // The lookups are gated on the flags, exactly as `proofFactsRead` already gates the
    // Proof facts above them.
    expect(facts).toContain('sendsRead && campaignId')
    expect(facts).toContain('repliesRead ? (repliesByClient.get(clientId) ?? 0) : 0')
  })

  it('sends stay EXACT — a head count per campaign, not a summed page of rows', () => {
    // `figsy_sent_emails` grows without limit; a row-fetching read would be paginated by the
    // gateway and under-count silently, which is worse than slow.
    expect(facts).toContain("count: 'exact', head: true")
  })
})

describe('XC-3 · the ledger read tolerates its own migration not having run', () => {
  it('falls back to the base columns on 42703 and says only what it could read', async () => {
    vi.resetModules()
    const calls: string[] = []
    vi.doMock('@kind/db', () => ({
      db: {
        from: () => ({
          select: (cols: string) => {
            calls.push(cols)
            return calls.length === 1
              ? Promise.resolve({ data: null, error: { code: '42703', message: 'column "run_count" does not exist' } })
              : Promise.resolve({ data: [{ key: 'a', applied_at: '2026-08-01T00:00:00Z' }], error: null })
          },
        }),
      },
    }))
    vi.doMock('./pending-migrations', () => ({ PENDING_MIGRATIONS: [{ key: 'a', title: 'A' }, { key: 'b', title: 'B' }] }))
    const { readMigrationLedger } = await import('./migration-ledger')
    const state = await readMigrationLedger()
    expect(calls[0]).toContain('last_outcome')
    expect(calls[1]).not.toContain('last_outcome')
    expect(state.ok).toBe(true)
    expect(state.columnsMissing).toBe(true)
    expect(state.rows.find(r => r.key === 'a')?.state).toBe('applied')
    expect(state.rows.find(r => r.key === 'b')?.state).toBe('never_run')
    expect(state.note).toContain(LEDGER_MIGRATION)
    vi.doUnmock('@kind/db'); vi.doUnmock('./pending-migrations'); vi.resetModules()
  })

  it('a MISSING TABLE returns every key as unknown, never an empty list', async () => {
    vi.resetModules()
    vi.doMock('@kind/db', () => ({
      db: {
        from: () => ({
          select: () => Promise.resolve({ data: null, error: { code: '42P01', message: 'relation "public.app_migrations_applied" does not exist' } }),
        }),
      },
    }))
    vi.doMock('./pending-migrations', () => ({ PENDING_MIGRATIONS: [{ key: 'a', title: 'A' }, { key: 'b', title: 'B' }] }))
    const { readMigrationLedger } = await import('./migration-ledger')
    const state = await readMigrationLedger()
    // 🛑 THE READING THAT MUST BE IMPOSSIBLE: "nothing has ever been applied", produced by a
    // ledger that is not there, on the screen with a Run-migrations button on it.
    expect(state.ok).toBe(false)
    expect(state.tableMissing).toBe(true)
    expect(state.rows).toHaveLength(2)
    expect(state.rows.every(r => r.state === 'unknown')).toBe(true)
    expect(state.note).toContain('NOT KNOWN')
    vi.doUnmock('@kind/db'); vi.doUnmock('./pending-migrations'); vi.resetModules()
  })
})
