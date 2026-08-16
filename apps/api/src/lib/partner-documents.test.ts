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

describe('tailored from seat onboarding — nobody fills in a contract by hand', () => {
  // Founder review of the pack, 16 Aug: "when we sign up a partner. they give us their
  // address, mobile number etc and when we sign them up each document is tailored to them.
  // i should not need to fill anything out."
  const tailored = partnerDocuments({
    seatType: 'client_partner', retainRate: 0.08, name: 'Test Walk',
    address: '12 Loop Street, Cape Town, 8001', country: 'South Africa',
    phone: '+27 82 000 0000', dated: '2026-08-16',
  })
  const signable = (pack: ReturnType<typeof partnerDocuments>) => pack.filter(d => !d.live)

  it('the party line, the date and the signature block carry the real details', () => {
    // The three SIGNED documents name the parties. The comp plan is a reference sheet with no
    // parties and no signature block, so it carries no address — asserting one there would be
    // asserting a bug.
    for (const doc of tailored.filter(d => d.signatureRequired)) {
      expect(doc.body, `${doc.id} is missing the address`).toContain('12 Loop Street, Cape Town, 8001')
      expect(doc.body, `${doc.id} is missing the country`).toContain('South Africa')
    }
    const agreement = tailored.find(d => d.id === 'commission-agreement')!
    expect(agreement.body).toContain('Dated: 2026-08-16')
    expect(agreement.body).toContain('Contact: +27 82 000 0000')
    expect(agreement.body).toContain('Name: Test Walk')
  })

  it('and NO bracket placeholder survives in a tailored document', () => {
    // The whole point: a placeholder left in a generated contract is a blank somebody has to
    // fill in, which is what the founder asked to stop.
    for (const doc of signable(tailored)) {
      expect(doc.body, `${doc.id} still carries a placeholder`).not.toMatch(/\[ADDRESS\]|\[COUNTRY\]|\[DATE\]|\[FULL NAME\]/)
    }
  })

  it('a LEGACY seat with no details keeps the brackets — a guessed address is worse than a blank', () => {
    // Referral partners predate this capture. Inventing an address for a contract would read
    // as agreed; an obvious blank reads as unfinished, which is the honest state.
    const legacy = partnerDocuments({ seatType: 'partner', name: 'Demmy Oshodi' })
    const agreement = legacy.find(d => d.id === 'commission-agreement')!
    expect(agreement.body).toContain('[ADDRESS]')
    expect(agreement.body).toContain('[COUNTRY]')
    expect(agreement.body).toContain('Dated: [DATE]')
  })

  it('an empty-string detail is treated as missing, not written into the contract', () => {
    const blank = partnerDocuments({ seatType: 'client_partner', name: 'X', address: '  ', country: '' })
    expect(blank.find(d => d.id === 'nda')!.body).toContain('[ADDRESS]')
  })
})

describe('country-neutral — not every partner is in South Africa', () => {
  // Founder, 16 Aug: "so just a head up not every partner will be in south africa".
  const inNigeria = partnerDocuments({
    seatType: 'client_partner', retainRate: 0.08, name: 'A Partner',
    address: '5 Marina Road, Lagos', country: 'Nigeria', phone: '+234 000', dated: '2026-08-16',
  })

  it('no document pays anyone in rand — the currency follows the partner', () => {
    for (const doc of inNigeria.filter(d => !d.live)) {
      expect(doc.body.toLowerCase(), `${doc.id} still mentions rand`).not.toMatch(/\brand\b/)
    }
    expect(inNigeria.find(d => d.id === 'commission-agreement')!.body).toContain('local currency')
  })

  it('tax and data-protection duties follow the country where the partner works', () => {
    const agreement = inNigeria.find(d => d.id === 'commission-agreement')!
    expect(agreement.body).toContain('country where they are resident and work')
    expect(agreement.body).toContain('data\nprotection law of the country where they work')
  })

  it('South Africa survives ONLY as a named example, never as the assumed jurisdiction', () => {
    const agreement = inNigeria.find(d => d.id === 'commission-agreement')!
    // It may be cited as an example of the employment risk and of a named privacy law...
    expect(agreement.body).toContain('South Africa,\n> where the first seat is based, is a clear example')
    // ...but the partner's own country is what the contract binds to.
    expect(agreement.body).toContain('of 5 Marina Road, Lagos, Nigeria')
    expect(agreement.body).not.toContain('performs this work in South Africa')
  })

  it('the lawyer open points ask per-country questions', () => {
    const agreement = inNigeria.find(d => d.id === 'commission-agreement')!
    expect(agreement.body).toContain("reviewed PER COUNTRY as seats are added")
    expect(agreement.body).not.toContain('under South African law')
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
