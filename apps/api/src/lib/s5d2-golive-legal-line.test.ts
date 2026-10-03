// 5d · part 2 (#2543) — MAKE LIVE REFUSES A CLIENT WHOSE EMAILS CANNOT CARRY THEIR LEGAL LINE.
//
// ⛓️ R189 ⑥ (2 Oct): the client's company name and registered office, given by the client and
// CHECKED BEFORE GO-LIVE. House carries its own line and is not asked.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

let client: Record<string, unknown> | null = null
let clientErr: { message: string } | null = null
let house = false

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const q = {
        select: () => q, eq: () => q,
        maybeSingle: async () => t === 'programmes'
          ? { data: { client_id: 'c1' }, error: null }
          : { data: client, error: clientErr },
      }
      return q
    },
  },
}))
vi.mock('./house-client', () => ({ isHouseClient: async () => house }))

import { clientLegalLine, legalLineProblem, goLiveLegalLineProblem } from './client-legal-line'

beforeEach(() => { client = null; clientErr = null; house = false })

describe('5d·2 — the line and the rule', () => {
  it('company name · registered office, and nothing while either is missing', () => {
    expect(clientLegalLine('Acme Ltd', '10 High Street, London')).toBe('Acme Ltd · 10 High Street, London')
    expect(clientLegalLine('Acme Ltd', '  ')).toBeNull()
    expect(clientLegalLine(null, 'x')).toBeNull()
  })
  it('the refusal names exactly what is missing and where the client adds it', () => {
    expect(legalLineProblem('Acme Ltd', null)).toMatch(/registered office address is not on file/)
    expect(legalLineProblem('', '')).toMatch(/company name and registered office address are not on file/)
    expect(legalLineProblem('Acme Ltd', null)).toMatch(/Milla → Settings → Business Profile/)
    expect(legalLineProblem('Acme Ltd', '10 High Street')).toBeNull()
  })
})

describe('5d·2 — the go-live check', () => {
  it('a client with both is allowed', async () => {
    client = { company_name: 'Acme Ltd', registered_office: '10 High Street, London' }
    expect(await goLiveLegalLineProblem('p1')).toBeNull()
  })
  it('a client without a registered office is refused', async () => {
    client = { company_name: 'Acme Ltd', registered_office: null }
    expect(await goLiveLegalLineProblem('p1')).toMatch(/^Not taken live/)
  })
  it('House is not asked', async () => {
    house = true
    expect(await goLiveLegalLineProblem('p1')).toBeNull()
  })
  it('an unreadable client refuses, and says if the migration is the reason', async () => {
    clientErr = { message: 'column clients.registered_office does not exist' }
    expect(await goLiveLegalLineProblem('p1')).toMatch(/20261002_client_registered_office/)
  })
  it('Make Live asks it first, before anything is prepared', () => {
    const route = readFileSync(join(__dirname, '../routes/programme.ts'), 'utf8')
    const check = route.indexOf('goLiveLegalLineProblem(req.params.id)')
    const live = route.indexOf('goLiveProgramme(req.params.id, pressedBy(req))')
    expect(check).toBeGreaterThan(-1)
    expect(live).toBeGreaterThan(check)
  })
})
