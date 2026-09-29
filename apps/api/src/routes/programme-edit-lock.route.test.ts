// ⚑ 29 Sep (R174 ② · PR 1d) — VIDA CANNOT REWRITE A PROGRAMME'S TARGETING OR EMAILS FROM "READY".
// The real routes, called with a fake database. A programme at READY_FOR_APPROVAL / APPROVED /
// LIVE locks its own ICP and sequence; anything else (no programme, an earlier stage, an ICP or
// sequence that is not the programme's) saves exactly as before. Unreadable refuses.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>
const st = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  failTable: null as string | null,
  writes: [] as { table: string; op: string }[],
}))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const filters: ((r: Row) => boolean)[] = []
      const rows = () => (st.tables[table] ?? []).filter(r => filters.every(f => f(r)))
      const fail = () => st.failTable === table
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return q },
        in: (c: string, vs: unknown[]) => { filters.push(r => vs.includes(r[c])); return q },
        is: () => q, neq: () => q, order: () => q, limit: () => q,
        async maybeSingle() { return fail() ? { data: null, error: { message: 'down' } } : { data: rows()[0] ?? null, error: null } },
        async single() { return { data: rows()[0] ?? { id: `${table}-new`, name: 'x' }, error: null } },
        then(r: (v: unknown) => unknown) {
          return Promise.resolve(fail() ? { data: null, error: { message: 'down' } } : { data: rows(), error: null }).then(r)
        },
        update: () => { st.writes.push({ table, op: 'update' }); return q },
        insert: () => { st.writes.push({ table, op: 'insert' }); return q },
      }
      return q
    },
    rpc: async () => ({ data: null, error: null }),
  },
}))
vi.mock('../lib/operator-audit', () => ({ writeOperatorAudit: async () => {}, campaignAuditAction: () => 'noop' }))
vi.mock('../lib/start-work', () => ({ ensureCampaignForIcp: async () => ({}) }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, next: () => void) => next() }))

async function post(path: string, body: Row) {
  const m = await import('./operator')
  const layer = (m.operatorRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === path && l.route?.methods.post)
  if (!layer) throw new Error(`POST ${path} not found`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: Row = {}; let status = 200
  const res: any = { json: (b: Row) => { payload = b }, status: (s: number) => { status = s; return res } }
  await handler({ body, params: {}, query: {}, headers: { 'x-operator-email': 'op@kind.test' } }, res, () => {})
  return { status, payload }
}

const setWorld = (programmeStatus: string | null) => {
  st.tables = {
    clients: [{ id: 'c1', company_name: 'Acme' }],
    programmes: programmeStatus ? [{ id: 'p1', client_id: 'c1', status: programmeStatus }] : [],
    icps: [{ id: 'icp-prog', client_id: 'c1', programme_id: 'p1' }, { id: 'icp-other', client_id: 'c1', programme_id: null }],
    figsy_campaigns: [{ id: 'camp-prog', icp_id: 'icp-prog' }],
    figsy_sequences: [{ id: 'seq-prog', client_id: 'c1', campaign_id: 'camp-prog' }, { id: 'seq-loose', client_id: 'c1', campaign_id: null }],
  }
}
const icpBody = (icp_id?: string) => ({ client_id: 'c1', ...(icp_id ? { icp_id } : {}), name: 'Ops leaders', industries: ['Software'] })
const seqBody = (sequence_id?: string) => ({ client_id: 'c1', ...(sequence_id ? { sequence_id } : {}), steps: [{ subject: 'Hi', body: 'Hello there' }] })

beforeEach(() => { st.failTable = null; st.writes = [] })

describe('from "Ready" the programme\'s targeting is fixed', () => {
  for (const status of ['READY_FOR_APPROVAL', 'APPROVED', 'LIVE']) {
    it(`${status}: a new ICP version is refused and nothing is written`, async () => {
      setWorld(status)
      const r = await post('/icp', icpBody())
      expect(r.status).toBe(409)
      expect(String(r.payload.error)).toContain('fixed from the client review onward')
      expect(st.writes).toEqual([])
    })
    it(`${status}: editing the programme's own ICP is refused`, async () => {
      setWorld(status)
      const r = await post('/icp', icpBody('icp-prog'))
      expect(r.status).toBe(409)
      expect(st.writes).toEqual([])
    })
    it(`${status}: rewriting the programme's own sequence is refused`, async () => {
      setWorld(status)
      const r = await post('/sequence', seqBody('seq-prog'))
      expect(r.status).toBe(409)
      expect(st.writes).toEqual([])
    })
  }

  it('an ICP that is not the programme\'s can still be edited', async () => {
    setWorld('LIVE')
    const r = await post('/icp', icpBody('icp-other'))
    expect(r.status).toBe(200)
  })

  it('a sequence that is not the programme\'s can still be edited, and a new one saved', async () => {
    setWorld('LIVE')
    expect((await post('/sequence', seqBody('seq-loose'))).status).toBe(200)
    expect((await post('/sequence', seqBody())).status).toBe(200)
  })
})

describe('before "Ready", and with no programme, nothing changes', () => {
  for (const status of [null, 'RECOMMENDED', 'SOURCING', 'COMPLETED']) {
    it(`${status ?? 'no programme'}: ICP and sequence save as before`, async () => {
      setWorld(status)
      expect((await post('/icp', icpBody())).status).toBe(200)
      expect((await post('/icp', icpBody('icp-prog'))).status).toBe(200)
      expect((await post('/sequence', seqBody('seq-prog'))).status).toBe(200)
    })
  }
})

describe('unreadable refuses', () => {
  it('if the programme cannot be read, the save is refused with 503 and nothing is written', async () => {
    setWorld('LIVE'); st.failTable = 'programmes'
    const r = await post('/icp', icpBody())
    expect(r.status).toBe(503)
    expect(st.writes).toEqual([])
  })
})

describe('the Sequence button no longer says "approve"', () => {
  it('only the client approves', () => {
    const vida = readFileSync(join(process.cwd(), 'apps/admin/src/app/vida/page.tsx'), 'utf8')
    expect(vida).toContain("seqEdit.id ? 'Save changes' : 'Save'")
  })
})
