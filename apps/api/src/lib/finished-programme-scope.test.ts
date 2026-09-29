// ⚑ 29 Sep (R174 · PR 3a) — A FINISHED PROGRAMME STAYS THE CLIENT'S CURRENT VIEW, UNTIL THEIR NEXT PROOF.
// The real scope rule against a fake database. Every current screen (Pipeline, Inbox, Coaching,
// Meetings, the latest-inbox rail, the badges) reads this one rule, so they move together.
// And a finished programme still cannot send: the scope is for READING only.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>
const st = vi.hoisted(() => ({
  programmes: [] as Row[], claims: [] as Row[], icps: [] as Row[], leads: [] as Row[], failProgrammes: false,
}))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const filters: ((r: Row) => boolean)[] = []
      const byTable: Record<string, () => Row[]> = {
        programmes: () => st.programmes, leads: () => st.leads, proof_pass_claims: () => st.claims, icps: () => st.icps,
      }
      let rows = (): Row[] => byTable[table]?.() ?? []
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return q },
        order: (col: string) => { const base = rows; rows = () => [...base()].sort((a, b) => String(b[col]).localeCompare(String(a[col]))); return q },
        limit: () => q,
        async maybeSingle() { return { data: rows().filter(r => filters.every(f => f(r)))[0] ?? null, error: null } },
        then(r: (v: unknown) => unknown) {
          if (table === 'programmes' && st.failProgrammes) return Promise.resolve({ data: null, error: { message: 'down' } }).then(r)
          return Promise.resolve({ data: rows().filter(x => filters.every(f => f(x))), error: null }).then(r)
        },
      }
      return q
    },
  },
}))
vi.mock('./commercial-model', () => ({
  clientCommercialModel: async () => ({ model: 'programme', declared: true, openProgramme: null }),
  isLegacyModel: () => false,
}))

beforeEach(() => {
  st.failProgrammes = false
  // The programme's own Proof ran on the ICP that was then attached to it.
  st.claims = [{ client_id: 'c1', icp_id: 'icp-p1', claimed_at: '2026-08-01T10:00:00Z' }]
  st.icps = [{ id: 'icp-p1', programme_id: 'p1' }, { id: 'icp-new', programme_id: null }]
  st.programmes = [
    { id: 'p-old', client_id: 'c1', status: 'COMPLETED', created_at: '2026-05-01T00:00:00Z' },
    { id: 'p1', client_id: 'c1', status: 'COMPLETED', created_at: '2026-08-10T00:00:00Z' },
  ]
  st.leads = [{ id: 'l1', client_id: 'c1', programme_id: 'p1' }, { id: 'l-old', client_id: 'c1', programme_id: 'p-old' }]
})

describe('the programme that just finished stays current', () => {
  it('completed, no Proof since: the finished programme is the scope', async () => {
    const { currentWorkspaceScope } = await import('./current-workspace')
    expect(await currentWorkspaceScope('c1')).toEqual({ kind: 'programme', programmeId: 'p1', finished: true })
  })
  it('cancelled counts as finished too', async () => {
    st.programmes[1].status = 'CANCELLED'
    const { currentWorkspaceScope } = await import('./current-workspace')
    expect((await currentWorkspaceScope('c1')).kind).toBe('programme')
  })
  it('its outreach is exactly that programme\'s people — not the older one\'s', async () => {
    const { currentOutreachLeads } = await import('./current-outreach')
    expect(await currentOutreachLeads('c1')).toEqual({ mode: 'ids', ids: ['l1'], programmeId: 'p1' })
  })
})

describe('…until the next Proof, then R91 applies as before', () => {
  it('a new Proof claim, on an ICP outside the programme: the empty proof scope', async () => {
    st.claims.push({ client_id: 'c1', icp_id: 'icp-new', claimed_at: '2026-09-28T09:00:00Z' })
    const { currentWorkspaceScope } = await import('./current-workspace')
    expect(await currentWorkspaceScope('c1')).toEqual({ kind: 'proof' })
    const { currentOutreachLeads } = await import('./current-outreach')
    expect((await currentOutreachLeads('c1')).mode).toBe('none')
  })
  it('a claim naming no ICP is not evidence of a new Proof', async () => {
    st.claims = [{ client_id: 'c1', icp_id: null, claimed_at: '2026-09-28T09:00:00Z' }]
    const { currentWorkspaceScope } = await import('./current-workspace')
    expect((await currentWorkspaceScope('c1')).kind).toBe('programme')
  })
  it('no programme ever: proof, as before', async () => {
    st.programmes = []
    const { currentWorkspaceScope } = await import('./current-workspace')
    expect(await currentWorkspaceScope('c1')).toEqual({ kind: 'proof' })
  })
  it('the programme cannot be read: unreadable, never a guess', async () => {
    st.failProgrammes = true
    const { currentWorkspaceScope } = await import('./current-workspace')
    expect((await currentWorkspaceScope('c1')).kind).toBe('unreadable')
  })
})

describe('a finished programme cannot send, source or enrol', () => {
  it('authority refuses every action on a terminal programme', async () => {
    const { authorityFor } = await import('./programme-authority')
    for (const status of ['COMPLETED', 'CANCELLED']) {
      for (const action of ['OUTREACH', 'SOURCING', 'NEXT_BATCH'] as const) {
        const v = authorityFor({ id: 'p1', client_id: 'c1', status, paused_at: null } as never, action)
        expect(v.allowed, `${status} ${action}`).toBe(false)
        expect((v as { reason?: string }).reason).toBe('programme_terminal')
      }
    }
  })
  it('and the scope is read by screens only — no send path reads it', () => {
    const send = ['figsy.ts', 'figsy-send.ts', 'send-gate.ts'].map(f => {
      try { return readFileSync(join(__dirname, f), 'utf8') } catch { return '' }
    }).join('\n')
    expect(send).not.toContain('currentWorkspaceScope(')
    expect(send).not.toContain('currentOutreachLeads(')
  })
})

describe('the Inbox only says "no emails have gone out" when that is true', () => {
  it('an empty scope claims zero only for a client who never had a programme', () => {
    const f = readFileSync(join(__dirname, '..', 'routes', 'figsy.ts'), 'utf8')
    expect(f).toContain("res.json({ success: true, data: [], sent: [], sent_total: neverHadProgramme ? 0 : null }); return")
    expect(f).not.toContain("if (scope.mode === 'none') { res.json({ success: true, data: [], sent: [], sent_total: 0 }); return }")
  })
})
