// 7e·3 (#2547) — THE FOUNDER'S MORNING BRIEF SPEAKS THE PROGRAMME MODEL.
//
// It counted revenue from the retired wallet's credit purchases (R0 on the day a client paid for
// a programme) and listed programme clients as "0 credits".

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { programmeRevenueCents, formatUsd, liveProgrammeLine, liveProgrammeBlocker, gateRefusalWords } from './founder-brief-programmes'

const SINCE = '2026-10-01T05:00:00.000Z'
const row = (o: Record<string, unknown>) => ({ client_id: 'c1', first_paid_at: null, first_payment_cents: 0, wallet_applied_cents: 0, second_paid_at: null, second_payment_cents: 0, ...o })

describe('7e·3 — revenue is programme money, in dollars', () => {
  it('a first payment paid today counts, net of the wallet credit it used', () => {
    const r = programmeRevenueCents([row({ first_paid_at: '2026-10-01T09:00:00Z', first_payment_cents: 450000, wallet_applied_cents: 5000 })] as never, SINCE, new Set())
    expect(r).toEqual({ cents: 445000, payments: 1 })
    expect(formatUsd(r.cents)).toBe('$4,450.00')
  })
  it('older payments, demo and House count nothing; a second payment today counts', () => {
    const r = programmeRevenueCents([
      row({ first_paid_at: '2026-09-20T09:00:00Z', first_payment_cents: 100000, second_paid_at: '2026-10-01T10:00:00Z', second_payment_cents: 200000 }),
      row({ client_id: 'house', first_paid_at: '2026-10-01T09:00:00Z', first_payment_cents: 999999 }),
    ] as never, SINCE, new Set(['house']))
    expect(r).toEqual({ cents: 200000, payments: 1 })
    expect(formatUsd(0)).toBe('$0.00')
  })
})

describe('7e·3 — one line per live programme', () => {
  it('sent, replies, meetings against target, and what blocks it', () => {
    expect(liveProgrammeLine({ companyName: 'Acme Ltd', paused: false, run: true, sent24h: 48, replies24h: 3, meetings: 2, targetMeetings: 10 }))
      .toBe('Acme Ltd: 48 sent · 3 replies (24h) · 2 of 10 meetings · nothing blocking')
    expect(liveProgrammeBlocker({ paused: true, run: true })).toBe('Paused')
    expect(liveProgrammeBlocker({ paused: false, run: false })).toMatch(/press Run/)
  })
  // ⚑ 3 Oct (review S13) — "nothing blocking" only when the send gate itself allows sends.
  it('a programme the send gate refuses is never "nothing blocking"', () => {
    for (const reason of ['founder_not_approved', 'preparation_changed', 'sender_unsafe', 'review_required']) {
      const line = liveProgrammeLine({ companyName: 'Acme Ltd', paused: false, run: true, sent24h: 0, replies24h: 0, meetings: 0, targetMeetings: 10,
        refusal: gateRefusalWords({ allowed: false, reason }) })
      expect(line, reason).not.toContain('nothing blocking')
      expect(line, reason).toContain('blocked: ')
    }
    expect(gateRefusalWords({ allowed: false, reason: 'founder_not_approved' })).toBe('waiting for your approval of the emails in Vida')
    expect(gateRefusalWords(null)).toBe('could not be checked')
    expect(gateRefusalWords({ allowed: true })).toBeNull()
    expect(gateRefusalWords({ allowed: false, reason: 'outside_send_window' })).toBeNull()
  })
})

describe('7e·3 — House is listed, the demo is not', () => {
  const src = readFileSync(join(__dirname, '../routes/internal.ts'), 'utf8')
  it('the live lines leave out only the demo, and ask the send gate', () => {
    expect(src).toContain("return c?.is_demo !== true })")
    expect(src).toContain("refusal: gateRefusalWords(gate)")
    expect(src).toContain("gate = await checkProgrammeAuthority(p.client_id, 'OUTREACH')")
  })
})

describe('7e·3 — the brief uses them', () => {
  const src = readFileSync(join(__dirname, '../routes/internal.ts'), 'utf8')
  const brief = src.slice(src.indexOf("internalRouter.post('/founder-brief'"))
  it('no credit purchases and no rand in the revenue line', () => {
    expect(brief.slice(0, 20000)).not.toMatch(/from\('credit_transactions'\)/)
    expect(brief.slice(0, 20000)).not.toMatch(/`R\$\{revenueToday/)
    expect(brief).toContain('${formatUsd(revenueToday)}')
  })
  it('programme clients are fenced out of the low-credit list', () => {
    expect(brief).toContain('.filter(c => fencedFromCredits !== null && !fencedFromCredits.has(c.id))')
  })
})
