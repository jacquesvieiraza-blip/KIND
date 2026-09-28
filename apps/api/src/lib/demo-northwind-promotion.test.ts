// R164 · the Northwind login confirming its Brief must NEVER become an ordinary account.
//
// The real promotion creates a normal client row and starts Proof, which sources real people.
// A presenter walking the demo from Brief would do exactly that on a sales call. So the demo
// login is handed to `promoteNorthwindBrief` (made-up cast, `is_demo`) before anything is written.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ inserts: [] as string[], handoff: vi.fn() }))

vi.mock('@kind/db', () => {
  // A chainable stand-in: every read finds nothing, every insert is recorded by table.
  const chain = (table: string): unknown => new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => void) => res({ data: null, error: null })
      if (prop === 'insert') { h.inserts.push(table); return () => chain(table) }
      if (prop === 'single' || prop === 'maybeSingle') return async () => ({ data: null, error: null })
      return () => chain(table)
    },
  })
  return { db: { from: (t: string) => chain(t), rpc: async () => ({ data: null, error: null }) } }
})
vi.mock('./demo-northwind', async (orig) => ({
  ...(await orig<typeof import('./demo-northwind')>()),
  promoteNorthwindBrief: h.handoff,
}))

import { promoteConfirmedBrief } from './promotion'
import { NORTHWIND_EMAIL, isNorthwindLogin } from './demo-northwind-data'

const draft = { facts: { company_name: 'Anything', country: 'United Kingdom' }, confirmedAt: '2026-09-28T10:00:00Z' } as never

describe('R164 · the Northwind login confirming its Brief is handed to the demo, never promoted for real', () => {
  beforeEach(() => { h.inserts.length = 0; h.handoff.mockReset() })

  it('the demo login: the demo builds its own account and nothing is inserted by the real promotion', async () => {
    h.handoff.mockResolvedValue({ ok: true, clientId: 'demo-client', icpId: 'demo-icp' })
    const r = await promoteConfirmedBrief('u1', draft, { authEmail: NORTHWIND_EMAIL })
    expect(h.handoff).toHaveBeenCalledWith('u1')
    expect(h.inserts).toEqual([])
    expect(r).toMatchObject({ ok: true, clientId: 'demo-client', icpId: 'demo-icp' })
  })

  it('matching is exact and case-blind — a lookalike address is an ordinary client', async () => {
    expect(isNorthwindLogin(NORTHWIND_EMAIL.toUpperCase())).toBe(true)
    expect(isNorthwindLogin(`x${NORTHWIND_EMAIL}`)).toBe(false)
    expect(isNorthwindLogin(null)).toBe(false)
    await promoteConfirmedBrief('u2', draft, { authEmail: 'hannah@northwind.example' })
    expect(h.handoff).not.toHaveBeenCalled()
    expect(h.inserts).toContain('clients')
  })

  it('a failed demo build is reported, never silently turned into a real account', async () => {
    h.handoff.mockResolvedValue({ ok: false, reason: 'client_unwritable', detail: 'boom' })
    const r = await promoteConfirmedBrief('u3', draft, { authEmail: NORTHWIND_EMAIL })
    expect(r).toMatchObject({ ok: false, reason: 'client_unwritable' })
    expect(h.inserts).toEqual([])
  })
})
