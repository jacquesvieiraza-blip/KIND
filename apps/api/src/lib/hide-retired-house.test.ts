// ⚑ 6 Oct (item 3 · founder "yes hide it. lock that") — THE OLD HOUSE ACCOUNT LEAVES VIDA'S LISTS.
//
// Vida listed two "HOUSE" clients: the live House (login jacques.vieiraza+house@gmail.com, R152)
// and the old one, "K.I.N.D (house — Client Zero)" (the retired login hello@get-kind.com), whose
// draft campaign never sent and whose "Needs you", "no sending mailbox" and "not approved" were
// read by the founder as the live House's. R152 (24 Sep) did not repair the old account; this
// hides it from Vida's client list, its "Needs you" board and its worklist. NOTHING about the
// account changes: no row is written, and it stays on the House list so its history stays out
// of every revenue figure.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@kind/db', () => ({ db: {} }))
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { retiredHouseClientIds } from './real-clients'
import { RETIRED_HOUSE_ACCOUNT_EMAILS, HOUSE_ACCOUNT_EMAIL } from '@kind/shared'

const strip = (s: string) => s.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')

describe('item 3 — which accounts are hidden', () => {
  const clients = [
    { id: 'live-house', user_id: 'u-new' },
    { id: 'old-house', user_id: 'u-old' },
    { id: 'a-client', user_id: 'u-client' },
    { id: 'no-owner', user_id: null },
  ]

  it('only a client owned by a RETIRED House login is hidden — never the live House, never a client', () => {
    expect([...retiredHouseClientIds(clients, new Set(['u-old']))]).toEqual(['old-house'])
  })

  it('no retired login resolved → nothing hidden (a lookup failure shows the account; it never hides a real one)', () => {
    expect(retiredHouseClientIds(clients, new Set()).size).toBe(0)
  })

  it('the live House login is not on the retired list; the old one is', () => {
    expect(RETIRED_HOUSE_ACCOUNT_EMAILS).toContain('hello@get-kind.com')
    expect(RETIRED_HOUSE_ACCOUNT_EMAILS).not.toContain(HOUSE_ACCOUNT_EMAIL)
  })
})

describe('item 3 — Vida\'s three lists leave it out, and nothing is written', () => {
  const src = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
  const route = (path: string) => {
    const at = src.indexOf(`operatorRouter.get('${path}',`)
    expect(at).toBeGreaterThan(-1)
    return strip(src.slice(at, src.indexOf('operatorRouter.', at + 20)))
  }

  for (const path of ['/clients', '/lifecycle-board', '/worklist']) {
    it(`${path} drops the retired House account`, () => {
      const body = route(path)
      expect(body).toContain('getRetiredHouseClientIds()')
      expect(body).toMatch(/!hidden\.has\(/)
      for (const w of ['.insert(', '.update(', '.upsert(', '.delete(']) expect(body).not.toContain(w)
    })
  }

  it('the helper only reads', () => {
    const lib = readFileSync(join(__dirname, 'real-clients.ts'), 'utf8')
    for (const w of ['.insert(', '.update(', '.upsert(', '.delete(']) expect(lib).not.toContain(w)
  })
})
