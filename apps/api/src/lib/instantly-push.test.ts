import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// THE WIRING — the gap the founder caught.
//
// Prompt 4 shipped the client (`instantly.ts`) and the judgement (`instantly-map.ts`) and
// wired NEITHER into anything. He asked; I grepped for callers; the answer was "tests only".
// This file covers the missing hand-off, now called from `approve-lead.ts` step 9.

vi.mock('@kind/db', () => ({ db: { from: () => ({
  select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }), maybeSingle: async () => ({ data: null }) }),
    order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
}) } }))

import { houseClientId, pushRefusalIsNews, HOUSE_CAMPAIGN_NAME } from './instantly-push'

beforeEach(() => { delete process.env.HOUSE_CLIENT_ID })
afterEach(() => { delete process.env.HOUSE_CLIENT_ID })

describe('the house client is an ID, never a name', () => {
  it('is unset by default — and unset means NOTHING is ever pushed', () => {
    // Fail closed. Guessing wrong here means emailing real people from the wrong account.
    expect(houseClientId()).toBeNull()
  })

  it('reads and trims HOUSE_CLIENT_ID when set', () => {
    process.env.HOUSE_CLIENT_ID = '  client-zero  '
    expect(houseClientId()).toBe('client-zero')
  })

  it('an empty or blank value counts as unset, not as a client id', () => {
    process.env.HOUSE_CLIENT_ID = '   '
    expect(houseClientId()).toBeNull()
  })

  it('is an ID, because exact-string NAME matching has bitten us twice', () => {
    // `MBF Holdings` vs the live `MBF Demo` broke the demo reset AND the stray-account
    // check (#584, #582). A company name is a label a human edits; an id is not.
    process.env.HOUSE_CLIENT_ID = '3f9a-uuid'
    expect(houseClientId()).toBe('3f9a-uuid')
  })
})

describe('which refusals are worth waking the founder for', () => {
  it('the four EXPECTED states are SILENT', () => {
    // A demo, the kill-switch, a client (who goes via Smartlead) and a missing key are all
    // the system working. Alerting on them would page the founder on EVERY approval and
    // train them to ignore the alert — which is how a real one gets missed.
    for (const r of ['is_demo', 'kill_switch_off', 'not_house_client', 'no_api_key']) {
      expect(pushRefusalIsNews(r)).toBe(false)
    }
  })

  it('a real API failure or a missing sequence IS news', () => {
    expect(pushRefusalIsNews('api_error')).toBe(true)
    expect(pushRefusalIsNews('no_sequence')).toBe(true)
  })
})

describe('the campaign we own inside Instantly', () => {
  it('has a fixed name, so the lookup is stable across runs', () => {
    expect(HOUSE_CAMPAIGN_NAME).toBe('K.I.N.D — Client Zero')
  })
})
