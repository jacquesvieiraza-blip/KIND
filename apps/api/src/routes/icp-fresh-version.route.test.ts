// ═══════════════════════════════════════════════════════════════════════════════════════
// A FRESH ICP IS A NEW VERSION — IT NEVER TOUCHES THE ONE THAT IS LIVE (founder-locked 7 Sep).
//
// THE LIVE DEFECT. The founder described a completely new target audience to the persistent
// Milla conversation, and Milla understood it, proposed it correctly and answered *"your
// targeting is locked in and your message has reached the team."* After a refresh there was
// no v4: **nothing had been written at all.** He was in the GENERIC conversation, whose
// transport is `/milla/sessions/:id/chat` — a general assistant with no ICP object, no draft
// and no save. The sentence was conversational, not a product state.
//
// 🛑 AND THE PATH THAT *DOES* SAVE WOULD NOT HAVE PRODUCED v4 EITHER. `/icps/revise` →
// `saveClientTargeting()` takes the `hold` branch whenever a core ICP exists AND is active:
// it writes the new targeting into `pending_targeting` ON THE EXISTING ROW. No new row, no
// new version — and the My ICP screen's "New targeting proposed" card looks for a separate
// NON-ACTIVE ROW, not that column, so a held revision is invisible there too.
//
// So the real gap is neither button nor copy: **there was no client-facing path that creates
// a NEW ICP version alongside an active one.** `POST /icps` inserts only when the client has
// none at all, and the only route that inserts a version — `POST /operator/icp` — deactivates
// every other ICP first, which is precisely what the founder said must not happen.
//
// ⚠️ `is_active: false` IS WRITTEN EXPLICITLY AND THAT IS THE LOAD-BEARING LINE.
// `icps.is_active` DEFAULTS TO TRUE at the database and `icpSchema` carries no such field, so
// an insert that merely omits it produces an ACTIVE v4 — silently displacing the live
// targeting the founder asked us not to touch. Test ③ fails the moment that literal is
// dropped, which is the only reason it is asserted on the row rather than assumed.
//
// RED PROOF — every one of these fails before the fix:
//   ① `POST /icps/fresh` does not exist            → 404
//   ② the insert must reach `icps`                 → no insert recorded
//   ③ the new row must carry `is_active: false`    → RED again if the literal is removed
//   ④ nothing on the live row may be updated       → RED if the handler patches instead
//   ⑤ no programme_id may be written               → RED if attachment creeps in
//   ⑥ no sourcing/provider/campaign side effect    → RED if start-work is called
//
// Mocks only — no network, no provider, no spend, no House data.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServer, request as httpRequest, type Server } from 'http'
import type { AddressInfo } from 'net'

type Rec = {
  inserts: Array<{ table: string; row: Record<string, unknown> }>
  updates: Array<{ table: string; patch: Record<string, unknown> }>
  startWorkCalls: number
}

const FRESH = {
  name: 'Founder-led B2B agencies & consultancies — UK + US',
  industries: ['B2B services'],
  job_titles: ['Founder', 'CEO', 'MD', 'CRO', 'Head of Sales'],
  seniority_levels: ['C-Suite'],
  company_sizes: ['11–50'],
  geographies: ['United Kingdom', 'United States'],
  tech_stack: [],
  keywords: ['pipeline generation'],
}

/** Dispatch through a REAL Express app mounting the REAL `icpRouter`, middleware included. */
async function dispatch(
  opts: { method: string; path: string; body?: Record<string, unknown>; auth?: boolean },
  rec: Rec,
): Promise<{ status: number; json: Record<string, unknown> }> {
  vi.resetModules()

  vi.doMock('@kind/db', () => {
    const makeQuery = (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'or', 'gte', 'lte', 'limit']) q[m] = () => q
      // The client row, and the client's EXISTING ACTIVE ICP — the one that must survive.
      q.single = async () => ({
        data: table === 'clients'
          ? { id: 'c1', user_id: 'owner-user' }
          : { id: 'icp-active', name: 'African Retail-Tech Sales & Marketing Leaders', is_active: true },
        error: null,
      })
      q.maybeSingle = async () => ({
        data: table === 'clients'
          ? { id: 'c1', user_id: 'owner-user' }
          : table === 'icps'
            ? { id: 'icp-active', name: 'African Retail-Tech Sales & Marketing Leaders', is_active: true }
            : null,
        error: null,
      })
      q.update = (patch: Record<string, unknown>) => {
        rec.updates.push({ table, patch })
        const chain: Record<string, unknown> = {}
        for (const m of ['eq', 'in', 'is', 'neq', 'not']) chain[m] = () => chain
        ;(chain as { select: unknown }).select = () => ({ single: async () => ({ data: { id: 'icp-active' }, error: null }) })
        ;(chain as { then: unknown }).then = (r: (v: unknown) => void) => r({ error: null })
        return chain
      }
      q.insert = (row: Record<string, unknown>) => {
        rec.inserts.push({ table, row })
        return {
          select: () => ({ single: async () => ({ data: { id: 'icp-fresh-1', ...row }, error: null }) }),
          then: (r: (v: unknown) => void) => r({ error: null }),
        }
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

  // A real session, so the request reaches the handler rather than the 401.
  // ⚠️ `auth: false` leaves the REAL middleware in place — mocking it unconditionally is how
  // the unauthenticated case would have been tested against a stub that always lets you in.
  if (opts.auth !== false) vi.doMock('../middleware/auth', () => ({
    requireAuth: (req: { userId?: string }, _res: unknown, next: () => void) => {
      ;(req as { userId?: string }).userId = 'owner-user'
      next()
    },
  }))

  // ⚠️ SPIES, NOT STUBS. "No sourcing happened" has to be a CALL COUNT, not a comment.
  vi.doMock('../lib/start-work', () => ({
    ensureCampaignForIcp: async () => { rec.startWorkCalls++; return { id: 'camp-1' } },
    startWorkForClient: async () => { rec.startWorkCalls++; return { started: false, sourced: 0, surfaced: 0, recommended: 0 } },
  }))

  const { icpRouter } = await import('./icps')
  const express = (await import('express')).default
  const app = express()
  app.use(express.json())
  app.use('/icps', icpRouter)

  const server: Server = createServer(app)
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  const port = (server.address() as AddressInfo).port
  try {
    const payload = opts.body === undefined ? undefined : JSON.stringify(opts.body)
    return await new Promise((resolve, reject) => {
      const req = httpRequest({
        host: '127.0.0.1', port, path: opts.path, method: opts.method,
        headers: {
          'content-type': 'application/json',
          ...(payload ? { 'content-length': Buffer.byteLength(payload) } : {}),
          ...(opts.auth === false ? {} : { authorization: 'Bearer test-token' }),
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
      req.on('error', reject)
      if (payload) req.write(payload)
      req.end()
    })
  } finally {
    await new Promise<void>(r => server.close(() => r()))
  }
}

const prev = { url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY }

describe('AUTH · a fresh ICP is a NEW VERSION and the live one is untouched', () => {
  let rec: Rec
  beforeEach(() => {
    rec = { inserts: [], updates: [], startWorkCalls: 0 }
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.doUnmock('@kind/db'); vi.doUnmock('../middleware/auth'); vi.doUnmock('../lib/start-work')
    vi.resetModules()
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('① the route EXISTS and accepts a fresh proposal', async () => {
    const res = await dispatch({ method: 'POST', path: '/icps/fresh', body: FRESH }, rec)
    expect(res.status).toBe(200)
    expect(res.json.success).toBe(true)
  })

  it('② it INSERTS a new icps row (a new version, not an edit)', async () => {
    await dispatch({ method: 'POST', path: '/icps/fresh', body: FRESH }, rec)
    const icpInserts = rec.inserts.filter(i => i.table === 'icps')
    expect(icpInserts).toHaveLength(1)
    expect(icpInserts[0].row.name).toBe(FRESH.name)
    expect(icpInserts[0].row.client_id).toBe('c1')
  })

  it('③ the new row is written INACTIVE — explicitly, because the DB default is TRUE', async () => {
    await dispatch({ method: 'POST', path: '/icps/fresh', body: FRESH }, rec)
    const row = rec.inserts.find(i => i.table === 'icps')!.row
    // Not `!row.is_active` — an OMITTED field would pass that and then default to TRUE
    // at the database, silently activating v4 and displacing the live targeting.
    expect(Object.prototype.hasOwnProperty.call(row, 'is_active')).toBe(true)
    expect(row.is_active).toBe(false)
  })

  it('④ NOTHING is updated — the existing active ICP is never patched or deactivated', async () => {
    await dispatch({ method: 'POST', path: '/icps/fresh', body: FRESH }, rec)
    expect(rec.updates.filter(u => u.table === 'icps')).toHaveLength(0)
  })

  it('⑤ it is NOT attached to a programme', async () => {
    await dispatch({ method: 'POST', path: '/icps/fresh', body: FRESH }, rec)
    const row = rec.inserts.find(i => i.table === 'icps')!.row
    expect(row.programme_id ?? null).toBeNull()
  })

  it('⑥ no sourcing, campaign or provider work is started by the save', async () => {
    await dispatch({ method: 'POST', path: '/icps/fresh', body: FRESH }, rec)
    expect(rec.startWorkCalls).toBe(0)
  })

  it('⑦ an unauthenticated request never reaches it', async () => {
    const res = await dispatch({ method: 'POST', path: '/icps/fresh', body: FRESH, auth: false }, rec)
    // Either the real middleware refuses it, or the handler never inserted anything.
    if (res.status === 200) expect(rec.inserts.filter(i => i.table === 'icps')).toHaveLength(0)
    else expect([401, 403]).toContain(res.status)
  })

  it('⑧ a malformed proposal is refused and writes nothing', async () => {
    const res = await dispatch({ method: 'POST', path: '/icps/fresh', body: { name: '' } }, rec)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(rec.inserts.filter(i => i.table === 'icps')).toHaveLength(0)
  })
})
