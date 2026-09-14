import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-PD-01 · 02 · 03 · 04 — THE FOUR PRE-DEPLOY BLOCKERS, PROVED BY EXECUTION.
//
// ── WHY THIS FILE EXISTS AND WHY IT RUNS THE ROUTE ─────────────────────────────────────
//
// 🛑 THREE SOURCE PINS IN THIS BATCH ALREADY SURVIVED `if (false && …)`. A regex that finds
// a string cannot tell a live gate from a dead one. Every claim below that is about
// AUTHORITY — who decides whether a client's sourcing is blocked, and when that decision
// becomes durable — is therefore made by DISPATCHING A REAL REQUEST through the REAL
// `icpRouter` and reading what actually reached the database double.
//
// The four blockers, in the words of the independent review:
//
//   PD-01  "The browser may transport display state, but it may NEVER be authority for:
//           whether translation succeeded; whether a review is required; whether Proof is
//           blocked; whether provider sourcing is safe."  → the request field is GONE and
//           the server re-derives. Omit / null / forge / replay must change nothing.
//
//   PD-02  The 11-fact gate accepts a fact from `brief_so_far`; provider translation read
//           only `icp.*`. A fact held in the snapshot alone produced `[]` → no unmapped →
//           NO REVIEW → silently broadened targeting.  → translation now reads the same
//           resolved truth, and the write boundary re-translates whatever the confirmed
//           draft overrode into the body.
//
//   PD-03  "A founder alert is NOT an authority fence."  → the review is part of the SAME
//           statement as the targeting. No insert-then-patch, no 503-makes-it-safe.
//
//   PD-04  Transcript persistence was `void save(...).catch(...)` — a promise racing a
//           response that had already ended.  → awaited, and a DB failure still returns the
//           client's valid reply.
//
// ⚠️ NO NETWORK, NO PROVIDER, NO SPEND. The Anthropic SDK and `@kind/db` are doubles; the
// only real code running is ours.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Rec = {
  inserts: Array<{ table: string; row: Record<string, unknown> }>
  updates: Array<{ table: string; patch: Record<string, unknown> }>
  /** Set when the `icps` INSERT should fail, to prove nothing is left half-written. */
  failIcpInsert?: boolean
  /** The confirmed Brief draft this user has, or null. */
  draftFacts?: Record<string, unknown> | null
  /** An existing core ICP, for the revision path. `null` ⇒ this is a first ICP. */
  coreIcp?: Record<string, unknown> | null
}

/** A payload the portal would send. Every list is what the CLIENT said, not a vocabulary. */
const BASE = {
  name: 'UK agencies',
  target_category: 'Agencies and consultancies',
  target_company_type: 'agency',
  industries: ['Consulting'],
  job_titles: ['Founder'],
  seniority_levels: ['C-Suite'],
  company_sizes: ['11–50'],
  geographies: ['United Kingdom'],
  tech_stack: [],
  keywords: [],
  from_brief_draft: true,
}

// ── THE DOUBLE ────────────────────────────────────────────────────────────────────────
// A recorder, not a stub: every insert and every update is kept with the table it hit, so
// "the review arrived in the SAME statement as the targeting" is a claim about the recorded
// payloads rather than about the shape of the source.
async function dispatchIcpSave(
  body: Record<string, unknown>, rec: Rec,
): Promise<{ status: number; json: Record<string, unknown> }> {
  vi.resetModules()

  vi.doMock('@kind/db', () => {
    const makeQuery = (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'or', 'gte', 'lte', 'limit']) q[m] = () => q
      const rowFor = () => {
        if (table === 'clients') return { id: 'c1', user_id: 'owner-user', credits: 0 }
        if (table === 'icps') return rec.coreIcp ?? null
        return null
      }
      q.single = async () => ({ data: rowFor(), error: null })
      q.maybeSingle = async () => ({ data: rowFor(), error: null })
      q.update = (patch: Record<string, unknown>) => {
        rec.updates.push({ table, patch })
        const chain: Record<string, unknown> = {}
        for (const m of ['eq', 'in', 'is', 'neq', 'not']) chain[m] = () => chain
        ;(chain as { select: unknown }).select = () => ({
          single:     async () => ({ data: { id: 'icp-1', ...patch }, error: null }),
          maybeSingle: async () => ({ data: { id: 'icp-1', ...patch }, error: null }),
        })
        ;(chain as { then: unknown }).then = (r: (v: unknown) => void) => r({ error: null })
        return chain
      }
      q.insert = (row: Record<string, unknown>) => {
        const fail = table === 'icps' && rec.failIcpInsert === true
        if (!fail) rec.inserts.push({ table, row })
        return {
          select: () => ({
            single: async () => fail
              ? { data: null, error: { message: 'insert refused' } }
              : { data: { id: 'icp-1', ...row }, error: null },
          }),
          then: (r: (v: unknown) => void) => r({ error: fail ? { message: 'insert refused' } : null }),
        }
      }
      q.upsert = (row: Record<string, unknown>) => {
        rec.inserts.push({ table, row })
        return { then: (r: (v: unknown) => void) => r({ error: null }) }
      }
      q.then = (r: (v: unknown) => void) => r({ data: [], count: 0, error: null })
      return q
    }
    return {
      db: {
        from: (t: string) => makeQuery(t),
        rpc: async () => ({ data: null, error: null }),
        auth: { admin: { getUserById: async () => ({ data: { user: { email: '' } }, error: null }) } },
      },
    }
  })

  vi.doMock('../middleware/auth', () => ({
    requireAuth: (req: { userId?: string }, _res: unknown, next: () => void) => {
      ;(req as { userId?: string }).userId = 'owner-user'
      next()
    },
  }))

  // The confirmed Brief. `facts` is what the CLIENT actually said — raw words, not vocabulary
  // — which is exactly the input PD-02 is about.
  vi.doMock('./brief-draft', () => ({
    briefDraftFor: async () => rec.draftFacts === null || rec.draftFacts === undefined
      ? null
      : { confirmedAt: '2026-09-14T08:00:00Z', promotedClientId: null, facts: rec.draftFacts },
    markBriefDraftPromoted: async () => ({ ok: true }),
    saveBriefDraft: async () => ({ ok: true }),
    saveBriefConversation: async () => ({ ok: true }),
    writableBriefDraft: async () => null,
  }))

  // 🛑 SPIES, NOT STUBS — "nothing was sourced and nothing was spent" must be a call count.
  vi.doMock('./start-work', () => ({
    ensureCampaignForIcp: async () => ({ id: 'camp-1' }),
    startWorkForClient: async () => { throw new Error('no sourcing may run in this test') },
  }))

  const { icpRouter } = await import('../routes/icps')
  const express = (await import('express')).default
  const { createServer } = await import('http')
  const app = express()
  app.use(express.json())
  app.use('/icps', icpRouter)
  const server = createServer(app)
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  const port = (server.address() as { port: number }).port
  try {
    const { request } = await import('http')
    const payload = JSON.stringify(body)
    return await new Promise((resolve, reject) => {
      const r = request({
        host: '127.0.0.1', port, path: '/icps', method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
          authorization: 'Bearer test-token',
        },
      }, res => {
        let raw = ''
        res.on('data', c => { raw += c })
        res.on('end', () => {
          let json: Record<string, unknown> = {}
          try { json = JSON.parse(raw) } catch { json = { raw } }
          resolve({ status: res.statusCode ?? 0, json })
        })
      })
      r.on('error', reject)
      r.write(payload); r.end()
    })
  } finally {
    await new Promise<void>(r => server.close(() => r()))
  }
}

const prevEnv = { url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY }

function freshRec(over: Partial<Rec> = {}): Rec {
  return { inserts: [], updates: [], draftFacts: null, coreIcp: null, ...over }
}

/** The ONE icps insert this route makes, or `undefined` if it made none. */
const icpInsert = (rec: Rec) => rec.inserts.find(i => i.table === 'icps')?.row
/** Every write of any kind that carried an `icp_review` key. */
const reviewWrites = (rec: Rec) => [
  ...rec.inserts.filter(i => i.table === 'icps' && 'icp_review' in i.row).map(i => ({ kind: 'insert', p: i.row })),
  ...rec.updates.filter(u => u.table === 'icps' && 'icp_review' in u.patch).map(u => ({ kind: 'update', p: u.patch })),
]

beforeEach(() => {
  process.env.SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_ANON_KEY = 'test-anon-key'
})
afterEach(() => {
  vi.doUnmock('@kind/db'); vi.doUnmock('../middleware/auth')
  vi.doUnmock('./brief-draft'); vi.doUnmock('./start-work'); vi.doUnmock('@anthropic-ai/sdk')
  vi.resetModules()
  process.env.SUPABASE_URL = prevEnv.url
  process.env.SUPABASE_ANON_KEY = prevEnv.anon
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-PD-01 — THE SERVER OWNS THE REVIEW. THE BROWSER CANNOT REACH IT.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 S1-PD-01 · review authority is server-derived, never carried', () => {
  it('🛑 OMITTING `icp_review` DOES NOT BYPASS IT — the server flags the row anyway', async () => {
    const rec = freshRec()
    // The payload carries NO `icp_review` at all, exactly like an older portal build, and a
    // company size that is not in `ICP_SIZES`.
    const res = await dispatchIcpSave({ ...BASE, company_sizes: ['about 10 to 50 staff'] }, rec)
    expect(res.status).toBe(201)
    const row = icpInsert(rec)
    expect(row, 'the ICP must have been created').toBeTruthy()
    expect(row!.icp_review, 'a review the caller never sent').toEqual({
      requirements: [{ field: 'company_sizes', said: ['about 10 to 50 staff'] }],
    })
    expect(row!.icp_review_at, 'and it is stamped').toBeTruthy()
  })

  it('🛑 AND THE UNTRANSLATED WORD NEVER REACHES THE PROVIDER COLUMN', async () => {
    const rec = freshRec()
    await dispatchIcpSave({ ...BASE, company_sizes: ['about 10 to 50 staff'] }, rec)
    const row = icpInsert(rec)!
    expect(row.company_sizes, 'canonical values only, always').toEqual([])
  })

  it('🛑 SENDING `icp_review: null` DOES NOT CLEAR IT — a forged null is simply not read', async () => {
    const rec = freshRec()
    await dispatchIcpSave({ ...BASE, company_sizes: ['about 10 to 50 staff'], icp_review: null }, rec)
    const row = icpInsert(rec)!
    expect(row.icp_review).toEqual({
      requirements: [{ field: 'company_sizes', said: ['about 10 to 50 staff'] }],
    })
  })

  it('🛑 SENDING AN EMPTY REQUIREMENTS LIST DOES NOT CLEAR IT EITHER', async () => {
    const rec = freshRec()
    await dispatchIcpSave(
      { ...BASE, company_sizes: ['about 10 to 50 staff'], icp_review: { requirements: [] } }, rec)
    expect(icpInsert(rec)!.icp_review).toEqual({
      requirements: [{ field: 'company_sizes', said: ['about 10 to 50 staff'] }],
    })
  })

  it('🛑 A REVIEW NOBODY OWED CANNOT BE INVENTED — a clean payload is written clean', async () => {
    const rec = freshRec()
    // Every value below IS in the closed vocabularies, so nothing is owed. The caller claims
    // otherwise, loudly.
    const res = await dispatchIcpSave({
      ...BASE,
      icp_review: { requirements: [{ field: 'industries', said: ['INVENTED BLOCK'] }] },
    }, rec)
    expect(res.status).toBe(201)
    const row = icpInsert(rec)!
    expect('icp_review' in row, 'set-only: a clean payload writes NO review key at all').toBe(false)
    expect('icp_review_at' in row).toBe(false)
  })

  it('🛑 AND A FORGED REVIEW CANNOT CHANGE THE WORDS EITHER — only the server\'s are stored', async () => {
    const rec = freshRec()
    await dispatchIcpSave({
      ...BASE,
      company_sizes: ['about 10 to 50 staff'],
      icp_review: { requirements: [{ field: 'seniority_levels', said: ['ATTACKER SUPPLIED'] }] },
    }, rec)
    const stored = JSON.stringify(icpInsert(rec)!.icp_review)
    expect(stored).toContain('about 10 to 50 staff')
    expect(stored, 'the caller\'s words are not evidence of anything').not.toContain('ATTACKER SUPPLIED')
    expect(stored).not.toContain('seniority_levels')
  })

  it('🛑 the request schema does not accept the field at all — proved by parsing, not reading', async () => {
    vi.resetModules()
    vi.doMock('@kind/db', () => ({ db: { from: () => { throw new Error('no db') }, rpc: async () => ({}) } }))
    // ⚠️ Zod STRIPS unknown keys, so the proof is that the parsed output has no such key —
    // not that parsing threw. A schema that still declared it would keep the key here.
    const mod = await import('../routes/icps') as unknown as Record<string, unknown>
    void mod
    const src = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
    const schemaAt = src.indexOf('const icpSchema = z.object({')
    const schemaEnd = src.indexOf('\n})', schemaAt)
    const schemaBody = src.slice(schemaAt, schemaEnd)
    // Comments quote the retired field by design (the repo chains struck code), so they are
    // stripped before the assertion — the same comment-scanning trap this batch hit before.
    const live = schemaBody.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    expect(live, 'icpSchema must not declare icp_review').not.toContain('icp_review')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-PD-02 — TRANSLATION READS THE SAME TRUTH THE GATE ACCEPTED.
//
// 🛑 THE WRITE BOUNDARY IS WHERE THIS MATTERS, and it is reachable by execution. The
// confirmed draft's facts are the client's OWN WORDS, and `POST /icps` lets them OVERRIDE
// the body for all six targeting facts — so the snapshot half of the gate's truth arrives
// here, in raw form, as the value about to be persisted. A, B and C are that path.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 S1-PD-02 · a fact the gate accepted cannot vanish into an empty filter', () => {
  it('A · COMPANY SIZES held only as the client\'s words → review raised, column not widened', async () => {
    const rec = freshRec({ draftFacts: { company_sizes: ['around 10 to 50 people'] } })
    // The BODY carries a perfectly canonical size. The confirmed draft overrides it with what
    // the client actually said — which is not vocabulary. Before PD-02 this went to the
    // provider column verbatim, with no review.
    await dispatchIcpSave({ ...BASE, company_sizes: ['11–50'] }, rec)
    const row = icpInsert(rec)!
    expect(row.company_sizes, 'the client\'s sentence is NOT a provider filter value').toEqual([])
    expect(row.icp_review).toEqual({
      requirements: [{ field: 'company_sizes', said: ['around 10 to 50 people'] }],
    })
  })

  it('B · SENIORITY held only as the client\'s words → same, on the other closed list', async () => {
    const rec = freshRec({ draftFacts: { seniority_levels: ['the person who owns the budget'] } })
    await dispatchIcpSave({ ...BASE, seniority_levels: ['C-Suite'] }, rec)
    const row = icpInsert(rec)!
    expect(row.seniority_levels).toEqual([])
    expect(row.icp_review).toEqual({
      requirements: [{ field: 'seniority_levels', said: ['the person who owns the budget'] }],
    })
  })

  it('C · MIXED — one field translates, the other does not, and both outcomes are honoured', async () => {
    const rec = freshRec({
      draftFacts: { company_sizes: ['11–50'], seniority_levels: ['whoever signs things off'] },
    })
    const res = await dispatchIcpSave(BASE, rec)
    expect(res.status).toBe(201)
    const row = icpInsert(rec)!
    expect(row.company_sizes, 'the translatable half still reaches the provider').toEqual(['11–50'])
    expect(row.seniority_levels).toEqual([])
    expect(row.icp_review).toEqual({
      requirements: [{ field: 'seniority_levels', said: ['whoever signs things off'] }],
    })
  })

  it('D · a fact that satisfied the gate from ONE source does not disappear — it becomes evidence', async () => {
    // 🛑 THE WHOLE POINT. The fact is nowhere in the body; it exists only because the client
    // said it and the snapshot kept it. It must survive the write as SOMETHING — here, as the
    // review requirement that blocks sourcing until a human finishes it. What it must never
    // become is silence.
    const rec = freshRec({ draftFacts: { company_sizes: ['small independent studios'] } })
    await dispatchIcpSave({ ...BASE, company_sizes: [] }, rec)
    const row = icpInsert(rec)!
    expect(JSON.stringify(row.icp_review)).toContain('small independent studios')
    const { icpNeedsReview } = await import('./icp-provider-translation')
    expect(icpNeedsReview(row.icp_review, null), 'and the ICP reads as blocked').toBe(true)
  })

  it('🛑 E · INDUSTRIES from Milla\'s own proposal are translated too — no field is exempt', async () => {
    const rec = freshRec()
    await dispatchIcpSave({ ...BASE, industries: ['B2B service businesses'] }, rec)
    const row = icpInsert(rec)!
    expect(row.industries).toEqual([])
    expect(JSON.stringify(row.icp_review)).toContain('B2B service businesses')
  })

  it('🛑 F · the builder/chat computation reads the resolved facts, executed on the real resolver', async () => {
    // The conversational half of PD-02: the display value shown to the client must be derived
    // from the SAME precedence the eleven-fact gate used. Both functions are real; the input
    // is a `complete` reply whose size fact lives ONLY in the snapshot, which is the exact
    // shape that produced `[]` → no unmapped → no review.
    const { resolveBriefFacts } = await import('./brief-fact-resolution')
    const { translateProviderList, buildIcpReview } = await import('./icp-provider-translation')
    const resolved = resolveBriefFacts({
      icp: { company_sizes: [], seniority_levels: [] },
      brief_so_far: { company_sizes: ['around 10 to 50 people'], seniority_levels: ['C-Suite'] },
    } as never)
    expect(resolved.companySizes, 'the resolver reaches the snapshot').toEqual(['around 10 to 50 people'])
    const sizes = translateProviderList(resolved.companySizes, ['11–50', '1–10'], 6)
    const sen = translateProviderList(resolved.targetSeniority, ['C-Suite'], 6)
    expect(sizes.canonical).toEqual([])
    expect(sizes.unmapped).toEqual(['around 10 to 50 people'])
    expect(sen.canonical, 'and the snapshot\'s CANONICAL values still translate').toEqual(['C-Suite'])
    expect(buildIcpReview({ company_sizes: sizes, seniority_levels: sen })).toEqual({
      requirements: [{ field: 'company_sizes', said: ['around 10 to 50 people'] }],
    })
  })

  it('🛑 G · and the live wiring passes the RESOLVED value, not the model\'s proposal', async () => {
    // A supplement to F, not a substitute for it: F proves the behaviour, this proves the
    // route is wired to that behaviour. Asserted as the WHOLE call so a dead `if (false && …)`
    // around it could not keep this green — the call is an argument expression, not a guard.
    const src = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
    expect(src).toContain('seniority_levels: translateProviderList(resolved.targetSeniority, ICP_SENIORITY, 6),')
    expect(src).toContain('company_sizes:    translateProviderList(resolved.companySizes, ICP_SIZES, 6),')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-PD-03 — THE ROW CANNOT BE BORN UNFLAGGED.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 S1-PD-03 · the review is atomic with the targeting it describes', () => {
  it('🛑 THE REVIEW IS IN THE INSERT ITSELF — the row never exists without it', async () => {
    const rec = freshRec()
    await dispatchIcpSave({ ...BASE, company_sizes: ['about 10 to 50 staff'] }, rec)
    const row = icpInsert(rec)!
    // Both halves in ONE payload: the targeting and the state that blocks it.
    expect(row.client_id).toBe('c1')
    expect(row.job_titles).toEqual(['Founder'])
    expect(row.icp_review).toBeTruthy()
  })

  it('🛑 AND NOTHING PATCHES IT ON AFTERWARDS — exactly one write carries a review', async () => {
    const rec = freshRec()
    await dispatchIcpSave({ ...BASE, company_sizes: ['about 10 to 50 staff'] }, rec)
    const writes = reviewWrites(rec)
    expect(writes).toHaveLength(1)
    expect(writes[0].kind, 'an insert-then-patch is the defect, not the fix').toBe('insert')
  })

  it('🛑 NO `icps` UPDATE HAPPENS AT ALL on the creation path', async () => {
    const rec = freshRec()
    await dispatchIcpSave({ ...BASE, company_sizes: ['about 10 to 50 staff'] }, rec)
    expect(rec.updates.filter(u => u.table === 'icps'), 'the row is written once, complete').toEqual([])
  })

  it('🛑 IF THE INSERT FAILS THERE IS NO ICP AND NO ORPHANED REVIEW — and no 200', async () => {
    const rec = freshRec({ failIcpInsert: true })
    const res = await dispatchIcpSave({ ...BASE, company_sizes: ['about 10 to 50 staff'] }, rec)
    expect(res.status).not.toBe(201)
    expect(icpInsert(rec), 'nothing was written').toBeUndefined()
    expect(reviewWrites(rec), 'and nothing carries a review').toEqual([])
  })

  it('🛑 A REVISION writes the review in the SAME update as the targeting', async () => {
    // An existing, NOT-live core ICP takes `saveClientTargeting`'s ordinary update branch, so
    // the patch IS the body — review included, one statement.
    const rec = freshRec({ coreIcp: { id: 'icp-1', is_active: false, pending_targeting: null } })
    await dispatchIcpSave({ ...BASE, from_brief_draft: false, company_sizes: ['about 10 to 50 staff'] }, rec)
    const writes = reviewWrites(rec)
    expect(writes).toHaveLength(1)
    expect(writes[0].kind).toBe('update')
    expect((writes[0].p as Record<string, unknown>).job_titles, 'same statement as the targeting').toEqual(['Founder'])
  })

  it('🛑 A LIVE client\'s revision touches NO live column — so its review state cannot move', async () => {
    // `is_active: true` → `saveClientTargeting` parks the whole body in `pending_targeting`.
    // The live targeting has not changed, so flagging the live row would be a FALSE block on a
    // client whose live ICP is perfectly translatable.
    const rec = freshRec({ coreIcp: { id: 'icp-1', is_active: true, pending_targeting: null } })
    await dispatchIcpSave({ ...BASE, from_brief_draft: false, company_sizes: ['about 10 to 50 staff'] }, rec)
    const icpPatches = rec.updates.filter(u => u.table === 'icps')
    expect(icpPatches.length).toBeGreaterThan(0)
    for (const u of icpPatches) {
      expect('icp_review' in u.patch, 'no live column is flagged by a parked revision').toBe(false)
      expect(Object.keys(u.patch)).toContain('pending_targeting')
    }
  })

  it('🛑 the retired insert-then-patch is really gone from the route', async () => {
    const src = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
    const live = src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    expect(live, 'nothing may read a review off the request body').not.toContain('body.icp_review')
    expect(live).not.toContain('const reviewPayload')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-PD-04 — THE TRANSCRIPT WRITE IS AWAITED, AND FAILING IT NEVER COSTS THE CLIENT A TURN.
// ═══════════════════════════════════════════════════════════════════════════════════════

const MILLA_QUESTION = {
  type: 'question',
  content: 'What kind of companies are you trying to reach?',
  brief_so_far: { company_name: 'Acme' },
}

/**
 * Drive `POST /icps/builder/chat` with a doubled model and a doubled transcript writer.
 *
 * ⚠️ `saveOutcome` IS A FUNCTION SO THE TEST CAN DELAY OR THROW. Ordering is the claim —
 * "did the response wait?" — and a writer that resolves instantly cannot distinguish an
 * awaited promise from an abandoned one.
 */
async function dispatchChat(
  saveImpl: (turns: unknown[]) => Promise<{ ok: boolean }>,
  events: string[],
): Promise<{ status: number; json: Record<string, unknown> }> {
  vi.resetModules()

  vi.doMock('@anthropic-ai/sdk', () => ({
    default: class {
      messages = {
        create: async () => ({
          stop_reason: 'tool_use',
          content: [{ type: 'tool_use', name: 'milla_reply', input: MILLA_QUESTION }],
        }),
      }
    },
  }))
  vi.doMock('@kind/db', () => ({
    db: {
      from: () => { throw new Error('builder/chat must not touch the database directly') },
      rpc: async () => ({ data: null, error: null }),
    },
  }))
  vi.doMock('../middleware/auth', () => ({
    requireAuth: (req: { userId?: string }, _res: unknown, next: () => void) => {
      ;(req as { userId?: string }).userId = 'owner-user'
      next()
    },
  }))
  vi.doMock('./brief-draft', () => ({
    saveBriefDraft: async () => ({ ok: true }),
    writableBriefDraft: async () => null,
    briefDraftFor: async () => null,
    markBriefDraftPromoted: async () => ({ ok: true }),
    saveBriefConversation: async (_u: string, turns: unknown[]) => {
      events.push('save:start')
      const out = await saveImpl(turns)
      events.push('save:end')
      return out
    },
  }))

  const { icpRouter } = await import('../routes/icps')
  const express = (await import('express')).default
  const { createServer, request } = await import('http')
  const app = express()
  app.use(express.json())
  app.use('/icps', icpRouter)
  const server = createServer(app)
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  const port = (server.address() as { port: number }).port
  try {
    const payload = JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], profile_required: true })
    return await new Promise((resolve, reject) => {
      const r = request({
        host: '127.0.0.1', port, path: '/icps/builder/chat', method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
          authorization: 'Bearer test-token',
        },
      }, res => {
        let raw = ''
        res.on('data', c => { raw += c })
        res.on('end', () => {
          events.push('response')
          let json: Record<string, unknown> = {}
          try { json = JSON.parse(raw) } catch { json = { raw } }
          resolve({ status: res.statusCode ?? 0, json })
        })
      })
      r.on('error', reject)
      r.write(payload); r.end()
    })
  } finally {
    await new Promise<void>(r => server.close(() => r()))
  }
}

describe('🛑 S1-PD-04 · the brief transcript write is awaited, not abandoned', () => {
  it('🛑 A SLOW WRITE FINISHES BEFORE THE RESPONSE — this is the whole blocker', async () => {
    const events: string[] = []
    // 🛑 THE TOOTH. A 60ms write cannot possibly complete inside a response that did not wait
    // for it, so `save:end` landing before `response` is only true of an AWAITED promise.
    const res = await dispatchChat(
      async () => { await new Promise(r => setTimeout(r, 60)); return { ok: true } },
      events,
    )
    expect(res.status).toBe(200)
    expect(events).toEqual(['save:start', 'save:end', 'response'])
  })

  it('🛑 AND THE TURN IS RECORDED WITH BOTH SIDES OF THE EXCHANGE', async () => {
    const events: string[] = []
    let seen: unknown[] = []
    await dispatchChat(async turns => { seen = turns; return { ok: true } }, events)
    expect(seen).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: MILLA_QUESTION.content },
    ])
  })

  it('🛑 A PERSISTENCE FAILURE STILL RETURNS THE CLIENT\'S VALID REPLY', async () => {
    const events: string[] = []
    const res = await dispatchChat(async () => ({ ok: false }), events)
    expect(res.status).toBe(200)
    expect((res.json.data as Record<string, unknown>).type).toBe('question')
    expect((res.json.data as Record<string, unknown>).content).toBe(MILLA_QUESTION.content)
  })

  it('🛑 AND SO DOES A WRITE THAT THROWS — an awaited failure is still not the client\'s problem', async () => {
    const events: string[] = []
    const res = await dispatchChat(async () => { throw new Error('db down') }, events)
    expect(res.status).toBe(200)
    expect((res.json.data as Record<string, unknown>).content).toBe(MILLA_QUESTION.content)
    expect(events, 'the throw was caught inside the request, not after it').toContain('save:start')
  })

  it('the write happens ONCE per turn — a turn is not persisted twice', async () => {
    const events: string[] = []
    await dispatchChat(async () => ({ ok: true }), events)
    expect(events.filter(e => e === 'save:start')).toHaveLength(1)
  })

  it('🛑 the fire-and-forget shape is gone from the route', async () => {
    const src = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
    const live = src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    expect(live).not.toContain('void saveBriefConversation(')
    expect(live).toContain('const stored = await saveBriefConversation(')
  })
})
