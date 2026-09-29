// ⚑ 29 Sep (R174 ② · PR 1e) — A SECRET NEVER LEAVES THE SERVER.
// `GET /clients/me` sent the CRM API key and the Google Calendar access + refresh tokens to the
// browser on every Milla page. The real routes, called against a fake database.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>
const st = vi.hoisted(() => ({
  row: {} as Record<string, unknown>,
  upserts: [] as Record<string, unknown>[],
  tested: [] as { type: string; key: string }[],
}))

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q,
        async single() { return { data: st.row, error: null } },
        async maybeSingle() { return { data: st.row, error: null } },
        upsert: (patch: Row) => { st.upserts.push(patch); st.row = { ...st.row, ...patch }; return q },
      }
      return q
    },
  },
}))
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))
vi.mock('../lib/crm', () => ({
  testCrmConnection: async (type: string, key: string) => { st.tested.push({ type, key }); return { success: true } },
}))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, next: () => void) => next() }))

async function call(method: 'get' | 'patch' | 'post', path: string, body: Row = {}) {
  const { clientRouter } = await import('./clients')
  const layer = (clientRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === path && l.route?.methods[method])
  if (!layer) throw new Error(`${method} ${path} not found`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: Row = {}; let status = 200
  const res: any = { json: (b: Row) => { payload = b; return res }, status: (s: number) => { status = s; return res } }
  await handler({ body, params: {}, query: {}, headers: {}, userId: 'u1' }, res, () => {})
  return { status, payload }
}

const SECRETS = ['crm_api_key', 'google_calendar_access_token', 'google_calendar_refresh_token', 'invite_token']

beforeEach(() => {
  st.upserts = []; st.tested = []
  st.row = {
    id: 'c1', company_name: 'Acme', crm_type: 'hubspot', crm_api_key: 'pat-na1-REAL-KEY',
    google_calendar_access_token: 'ya29.ACCESS', google_calendar_refresh_token: '1//REFRESH',
    invite_token: 'inv-123', share_token: 'share-abc',
  }
})

describe('what the browser receives', () => {
  it('GET /clients/me carries no key or token — only whether a CRM key is saved', async () => {
    const r = await call('get', '/me')
    const data = r.payload.data as Row
    for (const k of SECRETS) expect(data, k).not.toHaveProperty(k)
    expect(JSON.stringify(r.payload)).not.toContain('REAL-KEY')
    expect(JSON.stringify(r.payload)).not.toContain('REFRESH')
    expect(data.crm_api_key_set).toBe(true)
    expect(data.company_name).toBe('Acme')
    expect(data.share_token).toBe('share-abc')
  })

  it('the PATCH answer does not echo the key back either', async () => {
    const r = await call('patch', '/me', { crm_type: 'hubspot', crm_api_key: 'pat-na1-NEW' })
    const data = r.payload.data as Row
    for (const k of SECRETS) expect(data, k).not.toHaveProperty(k)
    expect(data.crm_api_key_set).toBe(true)
  })
})

describe('saving without the key in hand', () => {
  it('an empty key field keeps the saved key', async () => {
    await call('patch', '/me', { crm_type: 'hubspot', crm_api_key: '', crm_sync_enabled: true })
    expect(st.upserts[0]).not.toHaveProperty('crm_api_key')
    expect(st.row.crm_api_key).toBe('pat-na1-REAL-KEY')
  })
  it('a new key replaces it', async () => {
    await call('patch', '/me', { crm_type: 'hubspot', crm_api_key: 'pat-na1-NEW' })
    expect(st.row.crm_api_key).toBe('pat-na1-NEW')
  })
  it('switching the CRM off clears it', async () => {
    const r = await call('patch', '/me', { crm_type: 'none', crm_api_key: '' })
    expect(st.row.crm_api_key).toBeNull()
    expect((r.payload.data as Row).crm_api_key_set).toBe(false)
  })
})

describe('Test connection', () => {
  it('with nothing typed, tests the key on file', async () => {
    const r = await call('post', '/me/crm/test', { crm_type: 'hubspot' })
    expect(r.payload.success).toBe(true)
    expect(st.tested).toEqual([{ type: 'hubspot', key: 'pat-na1-REAL-KEY' }])
  })
  it('a typed key is tested as typed', async () => {
    await call('post', '/me/crm/test', { crm_type: 'pipedrive', crm_api_key: 'pd-typed' })
    expect(st.tested).toEqual([{ type: 'pipedrive', key: 'pd-typed' }])
  })
  it('no key typed and none saved: a plain 400', async () => {
    st.row = { ...st.row, crm_api_key: null }
    const r = await call('post', '/me/crm/test', { crm_type: 'hubspot' })
    expect(r.status).toBe(400)
    expect(st.tested).toEqual([])
  })
})

describe('neither settings page puts the saved key in the form', () => {
  for (const f of ['apps/portal/src/app/(milla)/milla/settings/page.tsx', 'apps/portal/src/app/(dashboard)/dashboard/settings/page.tsx']) {
    it(f.split('/app/')[1], () => {
      const src = readFileSync(join(process.cwd(), f), 'utf8')
      expect(src).not.toContain('crm_api_key: c.crm_api_key')
      expect(src).toContain('crm_api_key_set')
    })
  }
})
