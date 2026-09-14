import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { pendingReviewTransfer, GO_UNREADABLE_REVIEW } from './pending-review-transfer'
import { icpNeedsReview } from './icp-provider-translation'

// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-PD-05 — A HELD REVISION'S REVIEW TRAVELS WITH ITS TARGETING, OR GO DOES NOT HAPPEN.
//
// ── THE BYPASS ─────────────────────────────────────────────────────────────────────────
//
//   revise in natural words → part of it will not translate → canonical half + review are
//   PARKED in `pending_targeting` (live ICP correctly untouched) → operator presses GO →
//   the whitelist applies the nine targeting columns and NOT the review → the new targeting
//   is live and reads as translatable → Proof and provider spend proceed against a filter
//   set a human was supposed to finish.
//
// ── HOW EACH CLAIM BELOW IS PROVED ─────────────────────────────────────────────────────
//
// §A  THE SAVE.      The REAL `POST /icps` handler is dispatched against a recording double.
//                    What is asserted is the row that was actually written.
// §B  THE RULE.      `pendingReviewTransfer` is EXECUTED over every case GO can meet. This is
//                    the specification the plpgsql implements, and it is the thing the gate
//                    can run: three guards in this batch have already passed while the
//                    behaviour behind them was dead, so the rule is executed, not read.
// §C  THE BLOCK.     The row state the rule produces is fed to the REAL `runIcpJob` and the
//                    REAL Proof gate. Zero provider calls, zero ledger writes — counted.
// §D  THE SQL.       Structural agreement between the rule and the migration that implements
//                    it, plus the guarantees that are visible only in SQL (the review is in
//                    the SAME statement as the targeting; `resolved_at` is only ever nulled).
//                    The SQL itself is EXECUTED on a disposable PostgreSQL in the migration
//                    rehearsal — that evidence is in the test-evidence file, not here, because
//                    `check.sh` must stay runnable on a machine with no PostgreSQL.
//
// ⚠️ NO NETWORK, NO PROVIDER, NO SPEND anywhere in this file.
// ═══════════════════════════════════════════════════════════════════════════════════════

const MIGRATION = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260914_icp_review_go_apply.sql'), 'utf8')

/** The parked payload a real save produces when one company size will not translate. */
const PARKED_WITH_REVIEW = {
  name: 'UK agencies',
  industries: ['Consulting'],
  job_titles: ['Founder'],
  seniority_levels: ['C-Suite'],
  company_sizes: [],
  geographies: ['United Kingdom'],
  icp_review: { requirements: [{ field: 'company_sizes', said: ['around 10 to 50 people'] }] },
  icp_review_at: '2026-09-14T09:00:00.000Z',
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// §A · THE SAVE — a live client's revision parks its canonical half AND its review
// ═══════════════════════════════════════════════════════════════════════════════════════

type Rec = { inserts: Array<{ table: string; row: Record<string, unknown> }>
             updates: Array<{ table: string; patch: Record<string, unknown> }> }

async function dispatchRevision(body: Record<string, unknown>, rec: Rec, liveIcp: Record<string, unknown>) {
  vi.resetModules()
  vi.doMock('@kind/db', () => {
    const makeQuery = (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'or', 'gte', 'lte', 'limit']) q[m] = () => q
      const rowFor = () => table === 'clients'
        ? { id: 'c1', user_id: 'owner-user', credits: 0 }
        : table === 'icps' ? liveIcp : null
      q.single = async () => ({ data: rowFor(), error: null })
      q.maybeSingle = async () => ({ data: rowFor(), error: null })
      q.update = (patch: Record<string, unknown>) => {
        rec.updates.push({ table, patch })
        const chain: Record<string, unknown> = {}
        for (const m of ['eq', 'in', 'is', 'neq', 'not']) chain[m] = () => chain
        ;(chain as { select: unknown }).select = () => ({
          single:      async () => ({ data: { id: 'icp-live', ...patch }, error: null }),
          maybeSingle: async () => ({ data: { id: 'icp-live', ...patch }, error: null }),
        })
        ;(chain as { then: unknown }).then = (r: (v: unknown) => void) => r({ error: null })
        return chain
      }
      q.insert = (row: Record<string, unknown>) => {
        rec.inserts.push({ table, row })
        return {
          select: () => ({ single: async () => ({ data: { id: 'icp-new', ...row }, error: null }) }),
          then: (r: (v: unknown) => void) => r({ error: null }),
        }
      }
      q.upsert = (row: Record<string, unknown>) => {
        rec.inserts.push({ table, row })
        return { then: (r: (v: unknown) => void) => r({ error: null }) }
      }
      q.then = (r: (v: unknown) => void) => r({ data: [], count: 0, error: null })
      return q
    }
    return { db: {
      from: (t: string) => makeQuery(t),
      rpc: async () => ({ data: null, error: null }),
      auth: { admin: { getUserById: async () => ({ data: { user: { email: '' } }, error: null }) } },
    } }
  })
  vi.doMock('../middleware/auth', () => ({
    requireAuth: (req: { userId?: string }, _r: unknown, n: () => void) => { ;(req as { userId?: string }).userId = 'owner-user'; n() },
  }))
  vi.doMock('./brief-draft', () => ({
    briefDraftFor: async () => null, markBriefDraftPromoted: async () => ({ ok: true }),
    saveBriefDraft: async () => ({ ok: true }), saveBriefConversation: async () => ({ ok: true }),
    writableBriefDraft: async () => null,
  }))
  vi.doMock('./start-work', () => ({
    ensureCampaignForIcp: async () => ({ id: 'camp-1' }),
    startWorkForClient: async () => { throw new Error('no sourcing may run in this test') },
  }))

  const { icpRouter } = await import('../routes/icps')
  const express = (await import('express')).default
  const { createServer, request } = await import('http')
  const app = express(); app.use(express.json()); app.use('/icps', icpRouter)
  const server = createServer(app)
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  const port = (server.address() as { port: number }).port
  try {
    const payload = JSON.stringify(body)
    return await new Promise<{ status: number }>((resolve, reject) => {
      const r = request({ host: '127.0.0.1', port, path: '/icps', method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload), authorization: 'Bearer t' } },
        res => { res.on('data', () => {}); res.on('end', () => resolve({ status: res.statusCode ?? 0 })) })
      r.on('error', reject); r.write(payload); r.end()
    })
  } finally { await new Promise<void>(r => server.close(() => r())) }
}

const prevEnv = { url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY }
beforeEach(() => { process.env.SUPABASE_URL = 'http://localhost:54321'; process.env.SUPABASE_ANON_KEY = 'k' })
afterEach(() => {
  vi.doUnmock('@kind/db'); vi.doUnmock('../middleware/auth')
  vi.doUnmock('./brief-draft'); vi.doUnmock('./start-work')
  vi.resetModules()
  process.env.SUPABASE_URL = prevEnv.url; process.env.SUPABASE_ANON_KEY = prevEnv.anon
})

describe('🛑 S1-PD-05 §A · the SAVE parks the canonical half AND the server-derived review', () => {
  const LIVE_CLEAN = { id: 'icp-live', is_active: true, pending_targeting: null,
                       company_sizes: ['11–50'], icp_review: null, icp_review_resolved_at: null }

  const revision = {
    name: 'UK agencies', target_category: 'Agencies', target_company_type: 'agency',
    industries: ['Consulting'], job_titles: ['Founder'], seniority_levels: ['C-Suite'],
    company_sizes: ['around 10 to 50 people'],          // ← the off-vocabulary constraint
    geographies: ['United Kingdom'], tech_stack: [], keywords: [],
  }

  it('1 · the LIVE targeting is untouched and the LIVE review is untouched', async () => {
    const rec: Rec = { inserts: [], updates: [] }
    await dispatchRevision(revision, rec, { ...LIVE_CLEAN })
    const icpPatches = rec.updates.filter(u => u.table === 'icps')
    expect(icpPatches.length).toBeGreaterThan(0)
    for (const u of icpPatches) {
      // 🛑 NO FALSE BLOCK. The live targeting has not moved, so flagging the live row would
      // stop a client whose CURRENT targeting is perfectly translatable.
      expect('icp_review' in u.patch, 'the live review must not move').toBe(false)
      expect('company_sizes' in u.patch, 'no live targeting column may move').toBe(false)
      expect(Object.keys(u.patch)).toContain('pending_targeting')
    }
  })

  it('2 · and `pending_targeting` carries BOTH the canonical half and the review', async () => {
    const rec: Rec = { inserts: [], updates: [] }
    await dispatchRevision(revision, rec, { ...LIVE_CLEAN })
    const parked = rec.updates.find(u => u.table === 'icps' && 'pending_targeting' in u.patch)!
      .patch.pending_targeting as Record<string, unknown>
    expect(parked.company_sizes, 'the un-normalised phrase never reaches a provider list').toEqual([])
    expect(parked.seniority_levels).toEqual(['C-Suite'])
    expect(JSON.stringify(parked.icp_review)).toContain('around 10 to 50 people')
    // 🛑 AND THE PARKED REVIEW IS WHAT GO WILL READ — proved by running the rule on it.
    const t = pendingReviewTransfer(parked)
    expect(t.ok).toBe(true)
    expect(t.ok && t.apply).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// §B · THE RULE — executed over every case GO can meet
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('🛑 S1-PD-05 §B · what GO must do with the parked review', () => {
  it('2 · a parked review is APPLIED, and applied unresolved', () => {
    const t = pendingReviewTransfer(PARKED_WITH_REVIEW)
    expect(t).toEqual({ ok: true, apply: true, review: PARKED_WITH_REVIEW.icp_review })
    // Unresolved is the point: the live ICP must read as blocked the instant GO lands.
    expect(t.ok && t.apply && icpNeedsReview(t.review, null)).toBe(true)
  })

  it('4 · MIXED canonical + unmapped — GO may not silently keep only the canonical half', () => {
    const mixed = {
      seniority_levels: ['C-Suite'],                       // translated, goes live
      company_sizes: [],                                   // the unmapped half, emptied
      icp_review: { requirements: [{ field: 'company_sizes', said: ['around 10 to 50 people'] }] },
    }
    const t = pendingReviewTransfer(mixed)
    expect(t.ok && t.apply, 'keeping the canonical half without the review is the bypass').toBe(true)
    expect(JSON.stringify(t.ok && t.apply && t.review)).toContain('around 10 to 50 people')
  })

  it('5 · a CLEAN pending revision applies with no review invented', () => {
    expect(pendingReviewTransfer({ company_sizes: ['11–50'], seniority_levels: ['C-Suite'] }))
      .toEqual({ ok: true, apply: false })
    expect(pendingReviewTransfer({ company_sizes: ['11–50'], icp_review: null }))
      .toEqual({ ok: true, apply: false })
    // A readable review that owes nothing is also "apply nothing" — never a raise.
    expect(pendingReviewTransfer({ icp_review: { requirements: [] } }))
      .toEqual({ ok: true, apply: false })
  })

  it('🛑 6 · an EXISTING unresolved review is NOT cleared by a clean pending revision', () => {
    // `apply: false` means "leave every review column exactly as it is". The SQL expresses
    // that as `else icp_review end`; §D proves the SQL says so, this proves the rule does.
    const t = pendingReviewTransfer({ company_sizes: ['11–50'] })
    expect(t).toEqual({ ok: true, apply: false })
    // The live row's own state is therefore what still decides, and it still says blocked.
    const liveReview = { requirements: [{ field: 'industries', said: ['B2B service businesses'] }] }
    expect(icpNeedsReview(liveReview, null), 'a clean revision cannot lift somebody else\'s block').toBe(true)
  })

  it('🛑 7 · a MALFORMED parked review FAILS CLOSED — GO applies nothing at all', () => {
    for (const bad of [
      { icp_review: 'blocked' },
      { icp_review: 42 },
      { icp_review: [] },
      { icp_review: [{ field: 'industries', said: ['x'] }] },   // an array, not the envelope
      { icp_review: {} },                                       // no `requirements`
      { icp_review: { requirements: 'company_sizes' } },        // not a list
      { icp_review: { requirements: {} } },
    ]) {
      expect(pendingReviewTransfer(bad), `${JSON.stringify(bad)} must fail closed`)
        .toEqual({ ok: false, reason: 'unreadable' })
    }
  })

  it('a brief-only revision (no parked targeting) carries nothing and raises nothing', () => {
    expect(pendingReviewTransfer(null)).toEqual({ ok: true, apply: false })
    expect(pendingReviewTransfer(undefined)).toEqual({ ok: true, apply: false })
    // Postgres answers `'"x"'::jsonb -> 'icp_review'` with NULL rather than an error, and the
    // targeting whitelist writes nothing for a non-object either — so the two must agree here.
    expect(pendingReviewTransfer('nonsense')).toEqual({ ok: true, apply: false })
    expect(pendingReviewTransfer([1, 2, 3])).toEqual({ ok: true, apply: false })
  })

  it('🛑 the rule and `icpNeedsReview` fail closed in the SAME direction', () => {
    // Two seams, one property: an unreadable translation state is never treated as fine.
    expect(pendingReviewTransfer({ icp_review: 'x' }).ok).toBe(false)      // this GO does not happen
    expect(icpNeedsReview('x', null)).toBe(true)                           // that ICP is blocked
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// §C · THE BLOCK — the state GO produces really does stop sourcing and spend
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('🛑 S1-PD-05 §C · after GO the review blocks Proof, sourcing and spend', () => {
  it('2 · runIcpJob REFUSES the post-GO row, touches no table and spends nothing', async () => {
    // The row as GO leaves it: targeting applied, review applied, resolution cleared.
    const transfer = pendingReviewTransfer(PARKED_WITH_REVIEW)
    expect(transfer.ok && transfer.apply).toBe(true)
    const postGo = {
      id: 'icp-live', client_id: 'c1', is_active: true,
      seniority_levels: ['C-Suite'], company_sizes: [], geographies: ['United Kingdom'],
      icp_review: transfer.ok && transfer.apply ? transfer.review : null,
      icp_review_resolved_at: null,        // ← GO cleared it; a stale stamp must not answer
      pending_targeting: null,
    }

    vi.resetModules()
    const touched: string[] = []
    let rpcCalls = 0
    vi.doMock('@kind/db', () => {
      const q = (table: string) => {
        if (table !== 'icps') {
          // 🛑 HOSTILE. Any table but `icps` means the refusal did not happen early enough.
          touched.push(table)
          throw new Error(`runIcpJob must refuse before touching ${table}`)
        }
        const c: Record<string, unknown> = {}
        for (const m of ['select', 'eq', 'is', 'not', 'in', 'order', 'limit', 'neq', 'or']) c[m] = () => c
        c.single = async () => ({ data: postGo, error: null })
        c.maybeSingle = async () => ({ data: postGo, error: null })
        c.then = (r: (v: unknown) => void) => r({ data: [postGo], error: null })
        return c
      }
      return { db: { from: q, rpc: async () => { rpcCalls++; return { data: null, error: null } } } }
    })

    const { runIcpJob } = await import('../routes/icps')
    // 🛑 THE MESSAGE, NOT MERELY "IT THREW". The double throws on every table but `icps`, so
    // a DEAD gate would ALSO reject — with a different error. `rejects.toThrow()` alone is the
    // false-pass shape this batch has already been bitten by three times.
    await expect(runIcpJob('icp-live', 'c1', 'owner-user', 20))
      .rejects.toThrow(/still being prepared/)
    expect(touched, 'no table but icps may be read').toEqual([])
    expect(rpcCalls, 'no reservation, no ledger, no spend').toBe(0)
    vi.doUnmock('@kind/db'); vi.resetModules()
  })

  it('🛑 CONTROL — the same row WITHOUT the review gets past the gate and hits the double', async () => {
    // Without this, the test above proves only that `runIcpJob` throws, which it would do
    // against a hostile double no matter what the gate did. Here the ONLY difference is the
    // review, and the failure changes from the refusal to the double's own complaint — which
    // is the gate deciding, demonstrably.
    const clean = {
      id: 'icp-live', client_id: 'c1', is_active: true,
      seniority_levels: ['C-Suite'], company_sizes: ['11\u201350'], geographies: ['United Kingdom'],
      icp_review: null, icp_review_resolved_at: null, pending_targeting: null,
    }
    vi.resetModules()
    vi.doMock('@kind/db', () => {
      const q = (table: string) => {
        if (table !== 'icps') throw new Error(`DOUBLE REACHED ${table}`)
        const c: Record<string, unknown> = {}
        for (const m of ['select', 'eq', 'is', 'not', 'in', 'order', 'limit', 'neq', 'or']) c[m] = () => c
        c.single = async () => ({ data: clean, error: null })
        c.maybeSingle = async () => ({ data: clean, error: null })
        c.then = (r: (v: unknown) => void) => r({ data: [clean], error: null })
        return c
      }
      return { db: { from: q, rpc: async () => ({ data: null, error: null }) } }
    })
    const { runIcpJob } = await import('../routes/icps')
    await expect(runIcpJob('icp-live', 'c1', 'owner-user', 20))
      .rejects.toThrow(/DOUBLE REACHED/)
    vi.doUnmock('@kind/db'); vi.resetModules()
  })

  it('2 · and the Proof gate reads the same post-GO row as blocked', () => {
    const transfer = pendingReviewTransfer(PARKED_WITH_REVIEW)
    const review = transfer.ok && transfer.apply ? transfer.review : null
    expect(icpNeedsReview(review, null)).toBe(true)
    // 🛑 AND THE STALE-STAMP BYPASS IS WHY GO CLEARS THE RESOLUTION. Left in place, an old
    // resolution answers for a brand-new constraint and the block silently does not happen.
    expect(icpNeedsReview(review, '2026-03-01T00:00:00Z'),
      'this is the state GO must never leave behind').toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// §D · THE SQL — it implements the rule, atomically, and cannot resolve anything
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The ③ statement — the one UPDATE that applies a held revision to the live ICP. */
function applyStatement(): string {
  const at = MIGRATION.indexOf('  update public.icps set\n    name = case')
  expect(at, 'the apply statement is gone from the migration').toBeGreaterThan(0)
  const end = MIGRATION.indexOf('  where id = p_icp_id and client_id = p_client_id;', at)
  expect(end).toBeGreaterThan(at)
  return MIGRATION.slice(at, end)
}

describe('🛑 S1-PD-05 §D · the migration implements the rule in ONE statement', () => {
  it('🛑 3 · the review is applied in the SAME statement as the targeting', () => {
    const stmt = applyStatement()
    // Both halves, one UPDATE. If the review moved to a second statement this slice loses it.
    expect(stmt).toContain('company_sizes = case when')
    expect(stmt).toContain('icp_review = case when v_apply_review then v_review else icp_review end')
    expect(stmt).toContain('icp_review_at = case when v_apply_review then now() else icp_review_at end')
  })

  it('🛑 3 · and there is exactly ONE update of icps that names the review', () => {
    // ⚠️ `icp_review = ` EXACTLY, not the substring `icp_review` — `icp_review_resolved_at`
    // contains it, so a body that DROPPED the review assignment and kept the resolution
    // columns would still have matched a substring test. It did, when this tooth was pulled.
    const updates = MIGRATION.split('update public.icps set').slice(1)
    // ⚠️ AND THE SLICE ENDS AT THE REAL CLAUSE. `indexOf('where')` found the word inside the
    // SET-ONLY comment above the review line and cut the statement short — a bug in the test
    // that hid the very line it exists to find.
    const withReview = updates.filter(u => /\n\s*icp_review = /.test(u.slice(0, u.indexOf('  where id = p_icp_id'))))
    expect(withReview, 'exactly one statement applies the review').toHaveLength(1)
    expect(withReview[0], 'and it is the one that applies the targeting').toContain('company_sizes = case when')
  })

  it('🛑 GO may APPLY a review and may NEVER RESOLVE one', () => {
    const live = MIGRATION.split('\n').filter(l => !l.trimStart().startsWith('--')).join('\n')
    // The ONLY assignments to the two resolution columns set them to NULL.
    expect(live).toContain('icp_review_resolved_at = case when v_apply_review then null else icp_review_resolved_at end')
    expect(live).toContain('icp_review_resolved_by = case when v_apply_review then null else icp_review_resolved_by end')
    for (const m of live.matchAll(/icp_review_resolved_(?:at|by)\s*=\s*case when v_apply_review then (\w+)/g)) {
      expect(m[1], 'GO may only ever null a resolution stamp, never set one').toBe('null')
    }
    expect(live, 'a resolution stamp is the operator route\'s alone').not.toContain('icp_review_resolved_at = now()')
    expect(live).not.toContain('icp_review_resolved_by = p_')
  })

  it('🛑 7 · an unreadable stored review RAISES, and raises before anything is written', () => {
    const live = MIGRATION.split('\n').filter(l => !l.trimStart().startsWith('--')).join('\n')
    expect(live).toContain(`raise exception '${GO_UNREADABLE_REVIEW}'`)
    const validate = live.indexOf('raise exception \'the held revision carries an unreadable')
    const firstWrite = live.indexOf('update public.figsy_campaigns')
    expect(validate, 'validation must precede every write in the body').toBeLessThan(firstWrite)
  })

  it('🛑 the SQL and the TypeScript rule agree on every branch', () => {
    const live = MIGRATION.split('\n').filter(l => !l.trimStart().startsWith('--')).join('\n')
    // readable-but-empty ⇒ apply nothing (must NOT raise)
    expect(live).toContain("v_apply_review := jsonb_array_length(v_review -> 'requirements') > 0;")
    // absent / JSON null ⇒ apply nothing
    expect(live).toContain("if v_review is not null and jsonb_typeof(v_review) <> 'null' then")
    // not an object, or requirements missing / not a list ⇒ unreadable
    expect(live).toContain("if jsonb_typeof(v_review) <> 'object'")
    expect(live).toContain("or v_review -> 'requirements' is null")
    expect(live).toContain("or jsonb_typeof(v_review -> 'requirements') <> 'array' then")
    // and it reads the same one key the rule reads
    expect(live).toContain("v_review := v_t -> 'icp_review';")
  })

  it('8 · replay is unchanged — applying clears the pending fields in the same statement', () => {
    const stmt = applyStatement()
    expect(stmt).toContain('pending_targeting       = null')
    expect(stmt).toContain('pending_campaign_intent = null')
    expect(stmt).toContain('pending_submitted_at    = null')
    // So a second GO finds nothing parked: `v_t` is null, `v_apply_review` stays false, and
    // the review columns are left alone rather than re-applied or cleared.
  })

  it('9 · ownership is in the lock AND in the write — a wrong client matches nothing', () => {
    const live = MIGRATION.split('\n').filter(l => !l.trimStart().startsWith('--')).join('\n')
    expect(live).toContain('where id = p_icp_id and client_id = p_client_id for update;')
    expect(live).toContain('  where id = p_icp_id and client_id = p_client_id;')
    expect(live).toContain("return jsonb_build_object('ok', false, 'reason', 'ICP_NOT_FOUND', 'applied', false);")
  })

  it('10 · resolution still happens ONLY through the Vida operator route', () => {
    const operator = readFileSync(join(process.cwd(), 'apps/api/src/routes/operator.ts'), 'utf8')
    const live = operator.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n')
    expect(live).toContain('icp_review_resolved_at')
    expect(live).toContain('icp_provider_review_resolved')
    // And the ICP route — the client's door — still never writes a resolution.
    const icps = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
      .split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n')
    expect(icps, 'the client\'s door may never resolve a review').not.toContain('icp_review_resolved_at:')
  })

  it('the migration is mirrored statement-identical into the runner', () => {
    const runner = readFileSync(join(process.cwd(), 'apps/api/src/lib/pending-migrations.ts'), 'utf8')
    const i = runner.indexOf("key: '20260914_icp_review_go_apply'")
    expect(i, 'the runner does not carry this migration').toBeGreaterThan(0)
    const j = runner.indexOf('sql: `', i) + 'sql: `'.length
    const k = runner.indexOf('`.trim(),', j)
    expect(runner.slice(j, k).trim()).toBe(MIGRATION.trim())
  })
})
