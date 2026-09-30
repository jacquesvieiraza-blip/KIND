// ⚑ 29 Sep (R152 · fix) — WHICH ACCOUNT IS HOUSE IS DECIDED BY THE HOUSE LOGIN ONLY.
//
// R152: the new House login is `jacques.vieiraza+house@gmail.com`; the retired `hello@get-kind.com`
// stays on the House LIST only so its history is kept out of every revenue figure. The decision
// read the whole list, found both accounts, and refused — "the house account could not be
// resolved" — which blocked House setup, the House mailbox, System's House check and the test-
// account wipe. The decision now reads the login; exclusion still reads the whole list.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { decideHouseClient } from './house-client'

const st = vi.hoisted(() => ({ users: [] as { id: string; email: string | null }[] }))
vi.mock('@kind/db', () => ({
  db: {
    auth: { admin: { listUsers: async ({ page }: { page: number }) => ({ data: { users: page === 1 ? st.users : [] }, error: null }) } },
    from: () => ({}),
  },
}))

beforeEach(() => {
  st.users = [
    { id: 'u-new', email: 'jacques.vieiraza+house@gmail.com' },
    { id: 'u-old', email: 'hello@get-kind.com' },
    { id: 'u-client', email: 'someone@acme.com' },
  ]
})

describe('the House login, not the House list', () => {
  it('exclusion still covers both addresses; the decision reads only the login', async () => {
    const { resolveHouseUserIds, resolveHouseLoginUserIds } = await import('./real-clients')
    expect([...await resolveHouseUserIds()].sort()).toEqual(['u-new', 'u-old'])
    expect([...await resolveHouseLoginUserIds()]).toEqual(['u-new'])
  })
  it('with both House accounts in the database, House resolves to the new login\'s account', async () => {
    const { resolveHouseLoginUserIds } = await import('./real-clients')
    const clients = [
      { id: 'c-old', user_id: 'u-old', company_name: 'K.I.N.D (house — Client Zero)', is_demo: false },
      { id: 'c-new', user_id: 'u-new', company_name: 'K.I.N.D', is_demo: false },
      { id: 'c-acme', user_id: 'u-client', company_name: 'Acme', is_demo: false },
    ]
    // The old way — the whole list — refuses: this is the live failure.
    expect(decideHouseClient({ houseUserIds: ['u-new', 'u-old'], clients }).action).toBe('refuse')
    const d = decideHouseClient({ houseUserIds: [...await resolveHouseLoginUserIds()], clients })
    expect(d).toMatchObject({ action: 'adopt', clientId: 'c-new' })
  })
  it('every place that decides House uses the login resolver', () => {
    const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
    const op = read('apps/api/src/routes/operator.ts')
    expect((op.match(/houseUserIds = \[\.\.\.await resolveHouseLoginUserIds\(\)\]/g) ?? []).length).toBe(3)
    expect(op).not.toMatch(/houseUserIds = \[\.\.\.await resolveHouseUserIds\(\)\]/)
    expect(read('apps/api/src/routes/internal.ts')).toContain('houseUserIds: [...await resolveHouseLoginUserIds()],')
    expect(read('apps/api/src/lib/system-probes.ts')).toContain('houseUserIds: [...await resolveHouseLoginUserIds()],')
  })
})
