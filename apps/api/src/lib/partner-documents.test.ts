import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { partnerDocuments } from './partner-documents'
import { RATES } from './comp-engine'
import { PACK_PRICE_USD } from '@kind/shared'

// ── THE DOCUMENT PACK (#202) ────────────────────────────────────────────────────────────
//
// The founder asked for the contracts to live in Vida under Partners (16 Aug). Before that,
// her vault menu named five documents and opened none — the labels were a hover state.
//
// Two things these tests exist to stop:
//   1. A DOCUMENT THAT CONTRADICTS THE BILLING ENGINE. A contract saying 8% while the engine
//      pays 5% is not a typo, it is a dispute, and a person could have signed it. So every
//      rate in a document is asserted to come from the same constant the money comes from.
//   2. THE DISCLAIMER BEING QUIETLY EDITED OUT. These are drafts written by Claude Code with
//      no lawyer involved — "Opus drafts. I have no counsel" (15 Aug). The sentence saying so
//      is the single most important line in the pack.

const routes = readFileSync(join(__dirname, '../routes/partners.ts'), 'utf8')
const seatPage = readFileSync(
  join(__dirname, '../../../portal/src/app/(seat)/dashboard/client-partner/page.tsx'), 'utf8')

const clientPartnerPack = partnerDocuments({ seatType: 'client_partner', retainRate: 0.08, name: 'Test Walk' })
const legacyPack = partnerDocuments({ seatType: 'partner', retainRate: null, name: 'Legacy Partner' })

describe('the pack a seat actually receives', () => {
  it('carries every document the vault menu names — no label without a document', () => {
    const ids = clientPartnerPack.map(d => d.id)
    expect(ids).toContain('commission-agreement')
    expect(ids).toContain('nda')
    expect(ids).toContain('ip-assignment')
    expect(ids).toContain('comp-plan')
    expect(ids).toContain('payout-statements')
  })

  it('every document that is not a live view has a real body, not a stub', () => {
    for (const doc of clientPartnerPack.filter(d => !d.live)) {
      expect(doc.body.length, `${doc.id} has no body`).toBeGreaterThan(1200)
      expect(doc.title.length).toBeGreaterThan(3)
    }
  })

  it('EVERY document says a lawyer has not read it', () => {
    // The one line that must never be tidied away.
    for (const doc of clientPartnerPack.filter(d => !d.live)) {
      expect(doc.body, `${doc.id} lost the disclaimer`).toContain('not by a lawyer')
      expect(doc.body, `${doc.id} lost the disclaimer`).toContain('not legal advice')
    }
  })

  it('the payout statement is declared LIVE, because it is derived and not a stored file', () => {
    const statement = clientPartnerPack.find(d => d.id === 'payout-statements')!
    expect(statement.live).toBe(true)
    expect(statement.body).toBe('')
  })
})

describe('no document may contradict the engine that pays the money', () => {
  it("her agreement states HER seat's retain rate, taken from the constant", () => {
    const agreement = clientPartnerPack.find(d => d.id === 'commission-agreement')!
    const expected = `${Math.round(RATES.CLIENT_PARTNER_RETENTION * 100)}%`
    expect(agreement.body).toContain(expected)
  })

  it('a legacy referral seat gets the PLAN rate instead — the document follows the seat', () => {
    const agreement = legacyPack.find(d => d.id === 'commission-agreement')!
    const planRate = `${Math.round(RATES.PARTNER_RETENTION * 100)}%`
    const herRate = `${Math.round(RATES.CLIENT_PARTNER_RETENTION * 100)}%`
    expect(agreement.body).toContain(planRate)
    expect(agreement.body).not.toContain(herRate)
  })

  it('the landing fee is the pack price times the acquisition rate — never a typed number', () => {
    const plan = clientPartnerPack.find(d => d.id === 'comp-plan')!
    const landed = (PACK_PRICE_USD * RATES.PARTNER_ACQUISITION).toFixed(2)
    expect(plan.body).toContain(`$${landed}`)
    expect(plan.body).toContain(`$${PACK_PRICE_USD.toFixed(2)}`)
  })

  it('NO money is hard-coded in the module — every figure is interpolated', () => {
    const src = readFileSync(join(__dirname, 'partner-documents.ts'), 'utf8')
    const code = src.split('\n').filter(l => {
      const t = l.trim()
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('>')
    }).join('\n')
    // A literal "$299" or "20%" typed into a document body is the failure this catches:
    // it would survive a price change that the engine picked up.
    expect(code).not.toMatch(/\$\d{2,}/)
    expect(code).not.toMatch(/\*\*\d{1,2}%\*\*/)
  })
})

describe('the documents are reachable — the bug was a menu with nothing behind it', () => {
  it('the seat can fetch her own pack', () => {
    expect(routes).toContain("partnersRouter.get('/documents', requireAuth")
  })

  it('and an operator can fetch a seat pack from Vida', () => {
    expect(routes).toContain("partnersRouter.get('/admin/:partnerId/documents', requireAdminKey")
  })

  it('the seat route resolves the seat by EXACT identity, like every other seat lookup (#370)', () => {
    const block = routes.slice(routes.indexOf("partnersRouter.get('/documents'"))
    expect(block.slice(0, 1200)).toContain('normaliseSeatEmail(userEmail)')
  })

  it('her vault menu OPENS documents now instead of naming them', () => {
    // `VaultItem` used to be a div with a hover state and no handler.
    expect(seatPage).toMatch(/VaultItem[\s\S]{0,400}?(onClick|href|onSelect)/)
  })
})
