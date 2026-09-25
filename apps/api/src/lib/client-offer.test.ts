// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R158 · R163) — THE CLIENT'S OFFER, IN THEIR OWN WORDS, FEEDS THE EMAILS.
//
// Four boxes after choosing a programme; skippable; a result is used in emails ONLY with the
// client's tick. These hold the permission rule end to end: stored always, quoted only if ticked.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const state = vi.hoisted(() => ({ pitch: {} as Record<string, unknown>, upserts: [] as Record<string, unknown>[] }))

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const chain: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in']) chain[m] = () => chain
      chain.maybeSingle = async () => ({ data: { data: state.pitch }, error: null })
      chain.then = (resolve: (v: unknown) => void) => resolve({ data: [{ kind: 'pitch', data: state.pitch }], error: null })
      chain.upsert = async (row: Record<string, unknown>) => { state.upserts.push(row); return { error: null } }
      return chain
    },
  },
}))

import { cleanOffer, offerDigestLines, saveOffer, OFFER_FIELD_MAX } from './client-offer'
import { VALUE_SPINE } from './sequence-templates'

const ROUTE = readFileSync(join(__dirname, '..', 'routes', 'my-programme.ts'), 'utf8')
const PORTAL = join(__dirname, '..', '..', '..', 'portal', 'src')
const CARD = readFileSync(join(PORTAL, 'components', 'milla', 'OfferCard.tsx'), 'utf8')
const PAGE = readFileSync(join(PORTAL, 'app', '(milla)', 'milla', 'programme', 'page.tsx'), 'utf8')

beforeEach(() => { state.pitch = {}; state.upserts = [] })

describe('what a client sends', () => {
  it('is trimmed and capped; nothing at all is nothing to save', () => {
    const o = cleanOffer({ problems: '  slow pipeline  ', impact: 'x'.repeat(900) })!
    expect(o.problems).toBe('slow pipeline')
    expect(o.impact.length).toBe(OFFER_FIELD_MAX)
    expect(cleanOffer({ problems: '   ' })).toBeNull()
  })

  it('🛑 permission is only ever an explicit true', () => {
    expect(cleanOffer({ roi: '12 meetings', roiMayQuote: true })!.roiMayQuote).toBe(true)
    for (const v of [undefined, 'yes', 1, 'true', null]) expect(cleanOffer({ roi: 'x', roiMayQuote: v })!.roiMayQuote).toBe(false)
  })
})

describe('🛑 a result reaches the emails only with the client\'s tick', () => {
  const offer = { problems: 'founders buried in prospecting', impact: 'deals stall', roi: 'a client booked 12 meetings in month one', solution: 'we book the meetings' }

  it('without the tick: problems, impact and solution are used — the result is not', () => {
    const lines = offerDigestLines({ offer: { ...offer, roi_may_quote: false } }).join('\n')
    expect(lines).toContain('founders buried in prospecting')
    expect(lines).toContain('deals stall')
    expect(lines).toContain('we book the meetings')
    expect(lines).not.toContain('12 meetings')
  })

  it('with the tick: the result is used, marked as permitted and exact', () => {
    const lines = offerDigestLines({ offer: { ...offer, roi_may_quote: true } }).join('\n')
    expect(lines).toContain('PERMITTED us to quote, exactly as stated: a client booked 12 meetings in month one')
  })

  it('the email writer\'s grounding carries it — end to end through getClientKnowledgeForOutreach', async () => {
    const { getClientKnowledgeForOutreach } = await import('./figsy')
    state.pitch = { product: 'meeting booking', offer: { ...offer, roi_may_quote: false } }
    expect(await getClientKnowledgeForOutreach('c1')).not.toContain('12 meetings')
    state.pitch = { product: 'meeting booking', offer: { ...offer, roi_may_quote: true } }
    expect(await getClientKnowledgeForOutreach('c1')).toContain('12 meetings')
  })

  it('the value spine allows ONLY a permitted result, used exactly as stated', () => {
    expect(VALUE_SPINE).toContain('The ONLY exception is a result the grounding block marks as PERMITTED to quote, used exactly as stated and never changed.')
    expect(VALUE_SPINE).toContain('NEVER a number, percentage, price, result, timeframe or customer of our own')
  })
})

describe('saving never overwrites what the Brief already knows', () => {
  it('🛑 the Brief\'s own pitch fields are kept exactly', async () => {
    state.pitch = { product: 'meeting booking', pain_points: 'from the Brief', proof_all: ['kept'] }
    await saveOffer('c1', { problems: 'p', impact: 'i', roi: 'r', roiMayQuote: false, solution: 's' })
    const data = state.upserts[0].data as Record<string, unknown>
    expect(data.product).toBe('meeting booking')
    expect(data.pain_points).toBe('from the Brief')
    expect(data.proof_all).toEqual(['kept'])
    expect((data.offer as Record<string, unknown>).roi_may_quote).toBe(false)
  })
})

describe('the doors', () => {
  it('the client can read, save and skip — and an empty save writes nothing', () => {
    expect(ROUTE).toContain("myProgrammeRouter.get('/offer'")
    expect(ROUTE).toContain("myProgrammeRouter.post('/offer'")
    expect(ROUTE).toContain("myProgrammeRouter.post('/offer/skip'")
    expect(ROUTE).toContain("'Answer at least one of the four questions, or skip for now.'")
  })

  it('🛑 the card: four questions, the permission tick OFF by default, a skip, Milla introduces it', () => {
    for (const q of ['What problems do you solve?', 'What does that problem cost them?', 'Have you seen a return for customers?', 'What is your solution?']) {
      expect(CARD).toContain(q)
    }
    expect(CARD).toContain('const [roiMayQuote, setRoiMayQuote] = useState(false)')
    expect(CARD).toContain('You may mention this result in our emails.')
    expect(CARD).toContain('Skip for now')
    expect(CARD).toContain("announceOnce('offer-intro'")
  })

  it('it appears straight after a programme is chosen', () => {
    expect(PAGE).toContain("{p.hasProgramme && p.stage !== 'Completion' && <OfferCard />}")
  })
})
