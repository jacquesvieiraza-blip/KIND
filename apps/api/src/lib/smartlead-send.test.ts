import { describe, it, expect, vi, beforeEach } from 'vitest'

// PROMPT 7 — THE HAND-OFF, DRIVEN AGAINST A MOCKED SMARTLEAD.
//
// The pure tests prove WHO may be pushed and WHAT the bytes look like. They cannot prove the
// sequence of calls: find-or-create the campaign, save the sequence ONLY on create, then add
// the lead. That ordering is where the damage lives — re-saving a sequence on every approval
// would overwrite the campaign's copy mid-flight for every prospect already in it.

const state = {
  campaigns: [] as { id: number; name: string }[],
  calls: [] as { method: string; path: string; body?: unknown }[],
  failOn: null as string | null,
  inbox: true,
  isDemo: false,
  sequenceSteps: [{ channel: 'email', subject: 'Hi {{first_name}}', body: 'About {{company}}' }] as unknown[],
}

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'order', 'limit', 'is', 'not', 'ilike']) q[m] = () => q
      // HC-3 — the push now writes `leads.smartlead_campaign_id` after a successful addLeads.
      // Without an `update` on the mock the happy path throws AFTER the lead reached Smartlead,
      // which would fail these tests for a reason that has nothing to do with what they assert.
      q.update = () => ({ eq: async () => ({ error: null }) })
      q.maybeSingle = async () => {
        if (table === 'clients') return { data: { id: 'c1', is_demo: state.isDemo, company_name: 'Acme' } }
        // HC-3 — `country: 'United States'` because the push now carries the R50 launch-country
        // gate: a lead with no country is HELD, and this file's subject is the API hand-off, not
        // geography. `company: 'Acme'` has no corporate marker but the country is not UK, so
        // PECR passes it as out-of-scope. Both gates are proved in `smartlead-hc3.test.ts`.
        if (table === 'leads') return { data: { id: 'l1', email: 'ada@acme.com', first_name: 'Ada', last_name: 'L', company: 'Acme', country: 'United States' } }
        // Nobody is on the blocklist here — a hit would refuse the push for the WRONG reason and
        // quietly fake a pass on every "nothing is sent" assertion below.
        if (table === 'opt_out_blocklist') return { data: null, error: null }
        if (table === 'client_inboxes') return { data: state.inbox ? { id: 'i1' } : null }
        if (table === 'figsy_sequences') return { data: { steps: state.sequenceSteps } }
        return { data: null }
      }
      return q
    },
  },
}))

vi.mock('./instantly-push', () => ({ houseClientId: () => 'house-client' }))

// The network, replaced. Every call is recorded so the ORDER can be asserted.
vi.mock('./smartlead', () => ({
  smartleadConfigured: () => true,
  listCampaignsTyped: async () => {
    state.calls.push({ method: 'GET', path: '/campaigns' })
    if (state.failOn === 'list') return { ok: false, status: 500, error: 'boom' }
    return { ok: true, data: state.campaigns }
  },
  createCampaign: async (name: string) => {
    state.calls.push({ method: 'POST', path: '/campaigns/create', body: { name } })
    if (state.failOn === 'create') return { ok: false, status: 500, error: 'boom' }
    const c = { id: 77, name }
    state.campaigns.push(c)
    return { ok: true, data: c }
  },
  saveSequence: async (id: string, sequence: unknown[]) => {
    state.calls.push({ method: 'POST', path: `/campaigns/${id}/sequences`, body: sequence })
    if (state.failOn === 'sequence') return { ok: false, status: 500, error: 'boom' }
    return { ok: true, data: {} }
  },
  addLeads: async (id: string, leadList: unknown[]) => {
    state.calls.push({ method: 'POST', path: `/campaigns/${id}/leads`, body: leadList })
    if (state.failOn === 'leads') return { ok: false, status: 500, error: 'boom' }
    return { ok: true, data: { added_count: leadList.length } }
  },
}))

import { pushApprovedLeadToSmartlead, campaignNameFor, smartleadRefusalIsNews } from './smartlead-send'

beforeEach(() => {
  state.campaigns = []
  state.calls = []
  state.failOn = null
  state.inbox = true
  state.isDemo = false
  state.sequenceSteps = [{ channel: 'email', subject: 'Hi {{first_name}}', body: 'About {{company}}' }]
  process.env.AUTO_OUTREACH_ENABLED = 'true'
})

describe('the happy path — a client with a mailbox', () => {
  it('creates the campaign, saves the sequence, then adds the lead — in that order', async () => {
    const r = await pushApprovedLeadToSmartlead('l1', 'c1')
    expect(r.pushed).toBe(true)
    expect(state.calls.map(c => c.path)).toEqual([
      '/campaigns', '/campaigns/create', '/campaigns/77/sequences', '/campaigns/77/leads',
    ])
  })

  it('reuses an existing campaign rather than creating a second', async () => {
    state.campaigns = [{ id: 77, name: campaignNameFor('c1') }]
    await pushApprovedLeadToSmartlead('l1', 'c1')
    expect(state.calls.some(c => c.path === '/campaigns/create')).toBe(false)
  })

  it('DOES NOT re-save the sequence on a later approval', async () => {
    // The one that matters. Re-saving would overwrite the campaign's copy mid-flight, and a
    // prospect halfway through would suddenly receive step 2 of a different email.
    state.campaigns = [{ id: 77, name: campaignNameFor('c1') }]
    await pushApprovedLeadToSmartlead('l1', 'c1')
    expect(state.calls.some(c => c.path.endsWith('/sequences'))).toBe(false)
  })

  it('sends OUR rendered copy, with no unresolved tokens', async () => {
    await pushApprovedLeadToSmartlead('l1', 'c1')
    const seq = state.calls.find(c => c.path.endsWith('/sequences'))!
    expect(JSON.stringify(seq.body)).toContain('Ada')
    expect(JSON.stringify(seq.body)).not.toContain('{{')
  })

  it('the lead goes up in Smartlead\'s field names', async () => {
    await pushApprovedLeadToSmartlead('l1', 'c1')
    const add = state.calls.find(c => c.path.endsWith('/leads'))!
    expect(JSON.stringify(add.body)).toContain('company_name')
    expect(JSON.stringify(add.body)).toContain('ada@acme.com')
  })
})

describe('nothing is sent when it must not be', () => {
  it('a demo pushes NOTHING — not one call', async () => {
    state.isDemo = true
    const r = await pushApprovedLeadToSmartlead('l1', 'c1')
    expect(r.pushed).toBe(false)
    expect(state.calls).toHaveLength(0)
  })

  it('the kill-switch off pushes NOTHING', async () => {
    process.env.AUTO_OUTREACH_ENABLED = 'false'
    await pushApprovedLeadToSmartlead('l1', 'c1')
    expect(state.calls).toHaveLength(0)
  })

  it('THE HOUSE CLIENT is refused — our outreach goes via Instantly', async () => {
    const r = await pushApprovedLeadToSmartlead('l1', 'house-client')
    expect(r.pushed).toBe(false)
    expect(r.pushed === false && r.reason).toBe('is_house_client')
    expect(state.calls).toHaveLength(0)
  })

  it('a client with no Smartlead mailbox is refused before any network call', async () => {
    state.inbox = false
    const r = await pushApprovedLeadToSmartlead('l1', 'c1')
    expect(r.pushed === false && r.reason).toBe('no_smartlead_inbox')
    expect(state.calls).toHaveLength(0)
  })

  it('no sequence means no campaign is created at all', async () => {
    // Creating an empty campaign would leave a client looking set up with nothing to send.
    state.sequenceSteps = []
    const r = await pushApprovedLeadToSmartlead('l1', 'c1')
    expect(r.pushed === false && r.reason).toBe('no_sequence')
    expect(state.calls.some(c => c.path === '/campaigns/create')).toBe(false)
  })
})

describe('every API failure is returned, never thrown', () => {
  for (const [stage, expectPath] of [['list', '/campaigns'], ['create', '/campaigns/create'], ['sequence', '/sequences'], ['leads', '/leads']] as const) {
    it(`a failure at ${stage} returns api_error rather than throwing`, async () => {
      // This runs after the client has been charged; a throw here would surface as a failed
      // approve on a lead they have paid for.
      state.failOn = stage
      const r = await pushApprovedLeadToSmartlead('l1', 'c1')
      expect(r.pushed).toBe(false)
      expect(r.pushed === false && r.reason).toBe('api_error')
      expect(r.pushed === false && r.detail).toBeTruthy()
      expect(state.calls.some(c => c.path.includes(expectPath.replace('/campaigns', '')) || c.path === expectPath)).toBe(true)
    })
  }

  it('a sequence that fails to save does NOT then add the lead', async () => {
    // Otherwise the prospect sits in a campaign with no copy — enrolled and permanently silent.
    state.failOn = 'sequence'
    await pushApprovedLeadToSmartlead('l1', 'c1')
    expect(state.calls.some(c => c.path.endsWith('/leads'))).toBe(false)
  })
})

describe('which refusals are worth waking the founder for', () => {
  it('only a real failure', () => {
    expect(smartleadRefusalIsNews('api_error')).toBe(true)
    expect(smartleadRefusalIsNews('no_sequence')).toBe(true)
  })
  it('NOT the five that are the system working correctly', () => {
    // Alerting on these fires on every approval and trains the founder to ignore the alert,
    // which is how a real one gets missed.
    for (const r of ['is_demo', 'kill_switch_off', 'is_house_client', 'no_api_key', 'no_smartlead_inbox']) {
      expect(smartleadRefusalIsNews(r), r).toBe(false)
    }
  })
})

describe('the campaign name', () => {
  it('is derived from the client id', () => {
    expect(campaignNameFor('abc-123')).toContain('abc-123')
  })
  it('two clients never share a campaign', () => {
    expect(campaignNameFor('a')).not.toBe(campaignNameFor('b'))
  })
})
