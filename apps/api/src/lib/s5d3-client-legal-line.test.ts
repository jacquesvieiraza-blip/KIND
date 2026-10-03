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

// ⚑ 3 Oct (review S15) — K.I.N.D's line is the fallback for LEGACY clients only. A programme
// client's email waits for its own line; it never goes out naming K.I.N.D as the sender.
describe('5d·3 — a programme client\'s email waits for its own line', () => {
  const src = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
  const fn = src.slice(src.indexOf('let programmeFooterLine: string | null = null'))
  it('decided at the authority check, before anything is claimed, and deferred when missing', () => {
    const decide = fn.indexOf("if (verdict.mode === 'programme' && lead.client_id) {")
    expect(decide).toBeGreaterThan(0)
    const block = fn.slice(decide, decide + 900)
    expect(block).toContain('programmeFooterLine = await clientFooterLine(lead.client_id)')
    expect(block).toContain("return 'deferred'")
    expect(decide).toBeLessThan(fn.indexOf('const footerLine = '))
  })
  it('the send uses the decided line first', () => {
    expect(fn).toContain('const footerLine = programmeFooterLine ?? (')
  })
})
