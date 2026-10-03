// 5d · part 3 (#2543 · R189 ⑥) — A CLIENT'S EMAILS END WITH THEIR OWN COMPANY NAME AND REGISTERED OFFICE.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

let row: Record<string, unknown> | null = null
let err: { message: string } | null = null
vi.mock('@kind/db', () => ({
  db: { from: () => { const q: Record<string, (...a: unknown[]) => unknown> = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: row, error: err }) }; return q } },
}))

import { clientFooterLine } from './figsy'

beforeEach(() => { row = null; err = null })

describe('5d·3 — the client\'s legal line', () => {
  it('company name · registered office', async () => {
    row = { company_name: 'Acme Ltd', registered_office: '10 High Street, London, EC1A 1BB' }
    expect(await clientFooterLine('c1')).toBe('Acme Ltd · 10 High Street, London, EC1A 1BB')
  })
  it('either half missing, or the column not there yet → null (K.I.N.D\'s line is used, never nothing)', async () => {
    row = { company_name: 'Acme Ltd', registered_office: null }
    expect(await clientFooterLine('c1')).toBeNull()
    err = { message: 'column clients.registered_office does not exist' }
    expect(await clientFooterLine('c1')).toBeNull()
  })
  it('the send uses it for every non-House client', () => {
    const src = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
    expect(src).toContain(': (lead.client_id ? await clientFooterLine(lead.client_id) : null) ?? POSTAL_FOOTER_LINE')
  })
})
