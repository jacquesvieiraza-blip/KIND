// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C3 · THE LEGACY BELL STOPS RINGING FOR PROGRAMME CLIENTS
//
// REQ: *"new_client_icp and pack chips never render for programme clients"* (PV 07; R117).
//
// ── THE SIXTH SURFACE R117 DID NOT REACH ────────────────────────────────────────────────
//
// R117 is explicit: **ONE DERIVATION, FIVE SURFACES** — the ribbon, the stage word on every
// row, Vida's message, the right panel and the Needs-you filter all render one server-side
// verdict, because *"five copies of 'where is this client' is five chances to disagree"*. And
// **NORMAL IS SILENT**: *"NORMAL HEALTHY AUTOMATION MUST NOT APPEAR IN NEEDS YOU. Do not
// invent fake urgency."*
//
// 🛑 `/operator/alerts` IS A SIXTH SURFACE, AND IT DERIVES NOTHING. It is the V17 bell, and it
// answers "does this client need us?" from the RETIRED per-lead model's facts:
//
//     new_client_icp  "New client — first ICP is waiting on us"        severity: high
//     no_campaign     "ICP approved, no campaign yet — they can't be worked"
//
// Both sentences describe an operator who approves an ICP and then builds a campaign. Under
// the programme model neither is a thing that happens: promotion is server-owned (J4-C1),
// Proof starts itself (J5-C1), and preparation runs automatically (XC-6). So a brand-new
// programme client — healthy, automatic, nothing owed by anybody — rang the bell at HIGH
// severity on the day they signed up, and kept ringing it until somebody built them a
// `figsy_campaigns` row by hand.
//
// ⚠️ THE PACK CHIP WAS ALREADY FIXED AND IS PINNED HERE, NOT RE-DONE. C2 (3 Sep) gated
// "88 of your 100 included leads left" behind `modelView === 'legacy'`. The REQ names it, so
// it gets a guard; the guard is a pin on existing work and says so.
//
// ⚠️ AND THE MODEL-NEUTRAL ALERTS ARE UNTOUCHED, DELIBERATELY. `icp_revised` and `replies`
// are facts about any client under any commercial model — a reply waiting on a person is
// exactly what R117 says Needs-you IS for. Silencing them would be the opposite defect.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>

const state: {
  clients: Row[]; icps: Row[]; camps: Row[]; replies: Row[]; programmes: Row[]
  unattributed: Row[]; excluded: Row[]
} = { clients: [], icps: [], camps: [], replies: [], programmes: [], unattributed: [], excluded: [] }

/** Set by a test to make the `programmes` membership read fail, like a real outage. */
let programmesUnreadable = false

function table(name: string) {
  const rows = (): Row[] =>
    name === 'clients' ? state.clients : name === 'icps' ? state.icps
    : name === 'figsy_campaigns' ? state.camps : name === 'figsy_replies' ? state.replies
    : name === 'programmes' ? state.programmes
    : name === 'unattributed_replies' ? state.unattributed : []
  const q: any = {
    _f: [] as ((r: Row) => boolean)[], _limit: 0,
    select() { return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    neq(c: string, v: unknown) { q._f.push((r: Row) => r[c] !== v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    gte(c: string, v: unknown) { q._f.push((r: Row) => String(r[c] ?? '') >= String(v)); return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    not(c: string, op: string, v: unknown) {
      if (op === 'is' && v === null) { q._f.push((r: Row) => (r[c] ?? null) !== null); return q }
      return q
    },
    order() { return q },
    range() { return q },
    limit(n: number) { q._limit = n; return q },
    _hit() {
      const all = rows().filter(r => q._f.every((f: (r: Row) => boolean) => f(r)))
      return q._limit > 0 ? all.slice(0, q._limit) : all
    },
    async maybeSingle() { return { data: q._hit()[0] ?? null, error: null } },
    async single() { return { data: q._hit()[0] ?? null, error: null } },
    then(res: (v: unknown) => unknown) {
      if (name === 'programmes' && programmesUnreadable) {
        return Promise.resolve({ data: null, error: { message: 'programmes unreadable (simulated)' } }).then(res)
      }
      return Promise.resolve({ data: q._hit(), error: null, count: q._hit().length }).then(res)
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    rpc: async () => ({ data: null, error: null }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'nobody@example.com' } } }) } },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../middleware/auth', () => ({
  requireAuth: (_r: unknown, _s: unknown, next: () => void) => next(),
}))
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: async () => ({ content: [] }) } } }))
// The route asks which clients an operator has excluded from the board. Not what is under
// test, and it reads a table this harness does not model.
vi.mock('./real-clients', () => ({ getExcludedClientIds: async () => new Set<string>() }))
vi.mock('../lib/real-clients', () => ({ getExcludedClientIds: async () => new Set<string>() }))

const NOW = Date.now()
const RECENT = new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString()

/** A brand-new client with an ICP and no campaign — the state that rings the legacy bell. */
function signedUpWithIcp(id: string, over: Row = {}) {
  state.clients.push({ id, company_name: `Co ${id}`, created_at: RECENT, is_demo: false, ...over })
  state.icps.push({ client_id: id, name: 'Core ICP', created_at: RECENT, updated_at: null, is_active: true })
}

async function alerts(): Promise<Array<Record<string, any>>> {
  const mod = await import('../routes/operator')
  const layer = (mod.operatorRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/alerts' && l.route?.methods.get)
  if (!layer) throw new Error('GET /alerts not found on operatorRouter')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: any = null
  const res: any = { json: (b: unknown) => { payload = b }, status: () => res }
  await handler({ query: {}, body: {}, params: {}, headers: {} }, res, () => {})
  return (payload?.data ?? []) as Array<Record<string, any>>
}
const kinds = (rows: Array<Record<string, any>>, id: string) =>
  rows.filter(r => r.client_id === id).map(r => String(r.kind)).sort()

beforeEach(() => {
  state.clients = []; state.icps = []; state.camps = []; state.replies = []
  state.programmes = []; state.unattributed = []
  programmesUnreadable = false
})

describe('J5-C3 · the legacy bell does not ring for a programme client', () => {
  it('🛑 a DECLARED programme client raises no `new_client_icp`', async () => {
    signedUpWithIcp('p1', { commercial_model: 'programme' })
    expect(
      kinds(await alerts(), 'p1'),
      'a healthy programme signup was reported as "first ICP is waiting on us", at HIGH severity',
    ).not.toContain('new_client_icp')
  })

  it('🛑 nor `no_campaign` — preparation is automatic, so nobody is being waited on', async () => {
    // XC-6 runs `programme_prepare` on its own. "ICP approved, no campaign yet — they can't
    // be worked" describes an operator who builds campaigns by hand, which this model has no
    // step for; it would sit on the bell until someone hand-made a row to clear it.
    signedUpWithIcp('p1', { commercial_model: 'programme' })
    expect(kinds(await alerts(), 'p1')).not.toContain('no_campaign')
  })

  it('🛑 a client with a PROGRAMME ROW is a programme client even if undeclared', async () => {
    // The worklist already treats membership and the declared model as the same question —
    // `withProgramme.has(id) || commercial_model === 'programme'`. Reading only the column
    // here would leave every client whose programme was created before the column was written.
    signedUpWithIcp('p2')
    state.programmes.push({ client_id: 'p2' })
    expect(kinds(await alerts(), 'p2')).not.toContain('new_client_icp')
  })

  it('🛑 A LEGACY CLIENT IS COMPLETELY UNAFFECTED — this silences nobody else', async () => {
    signedUpWithIcp('l1')
    expect(
      kinds(await alerts(), 'l1'),
      'the alert that tells an operator a legacy client is waiting was silenced too',
    ).toContain('new_client_icp')
  })

  it('an older legacy client with an ICP and no campaign still raises `no_campaign`', async () => {
    state.clients.push({
      id: 'l2', company_name: 'Old Co', is_demo: false,
      created_at: '2026-01-01T00:00:00.000Z',
    })
    state.icps.push({ client_id: 'l2', created_at: '2026-01-01T00:00:00.000Z', updated_at: null })
    expect(kinds(await alerts(), 'l2')).toContain('no_campaign')
  })

  it('🛑 the MODEL-NEUTRAL alerts still reach a programme client', async () => {
    // R117: a reply waiting on a person is exactly what Needs-you is FOR. Silencing these
    // would be the opposite defect — an operator told nothing needs them while someone waits.
    signedUpWithIcp('p3', { commercial_model: 'programme' })
    state.camps.push({ client_id: 'p3', status: 'active', created_at: RECENT })
    state.icps.push({
      client_id: 'p3', created_at: RECENT,
      updated_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
    })
    state.replies.push({
      client_id: 'p3', classification: 'interested', received_at: RECENT, qualified_at: null,
    })
    const k = kinds(await alerts(), 'p3')
    expect(k, 'a prospect reply to a programme client stopped reaching the bell').toContain('replies')
    expect(k, 'targeting that moved under a live campaign stopped being reported').toContain('icp_revised')
  })

  it('🛑 AN UNREADABLE PROGRAMME TABLE STILL SUPPRESSES A DECLARED PROGRAMME CLIENT', async () => {
    // The membership read is a second query and can fail. The declared column rides the
    // clients fetch this route already makes, so a failure there must not put the retired
    // model's sentence back in front of an operator for a client we KNOW is on a programme.
    signedUpWithIcp('p4', { commercial_model: 'programme' })
    programmesUnreadable = true
    expect(kinds(await alerts(), 'p4')).not.toContain('new_client_icp')
  })

  it('and an unreadable programme table leaves every OTHER client exactly as today', async () => {
    signedUpWithIcp('l3')
    programmesUnreadable = true
    expect(kinds(await alerts(), 'l3')).toContain('new_client_icp')
  })
})

describe('J5-C3 · the pack chip', () => {
  const PAGE = readFileSync(
    join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
    .join('\n')

  it('🛑 the retired pack counter renders for a LEGACY client only (pins C2, 3 Sep)', () => {
    // "88 of your 100 included leads left" is the retired $299 pack, counted down and shown
    // as CURRENT commercial state. A programme client never bought one. Already gated; the
    // REQ names it, so it is pinned rather than left to a comment.
    expect(PAGE, 'the retired pack quota is rendered without asking which model this client is on')
      .toMatch(/pack\.active && modelView === 'legacy'/)
    expect(PAGE, 'a second, ungated pack render appeared')
      .not.toMatch(/\{selectedWork\.pack\.active &&\s*\(/)
  })

  it('and the money rail does not tick a payment a programme client never made', () => {
    // #619/C2 — `Paid $299` is the retired onboarding pack; a programme client buys a
    // programme at P1 and P2. The rail asks `modelView` rather than printing it blind.
    expect(PAGE).toMatch(/flowStepLabel\(n, label, selectedWork\.funded_via, modelView\)/)
  })
})
