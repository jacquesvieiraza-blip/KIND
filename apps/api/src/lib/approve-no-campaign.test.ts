// #625 — A FREE RE-APPROVE MUST NOT STRAND A LEAD.
//
// THE FAILURE, CAUGHT LIVE ON THE FOUNDER'S OWN MONEY WALK (A9, 5 Aug). Step 3c of `approveLead`
// fails closed when a client has no active campaign — the $4 buys WORK, so if the work cannot
// run we must not take the money. But the **#424 charge-once branch at 3b sits BEFORE that gate
// and returns early**, so a re-approved contact skipped it: revealed, enrolled nowhere, and the
// caller told "approved".
//
// ⚠️ AND THE SAFETY NET UNDER IT DID NOT FIRE EITHER. 3b wraps `autoEnrollLead` in a `.catch`
// that alerts — but its no-campaign branch is a silent `return`, not a throw. Two guards, both
// real, and the failure walked between them. The Integrity panel surfaced it hours later:
// *"2 paid lead(s) across 1 client(s) are in NO sequence."*
//
// ⚠️ BOTH DIRECTIONS, ALWAYS. A gate that refuses everything would pass every "it refuses" test
// and silently kill the working case — so each refusal here is paired with the approval that
// must still succeed.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ⚑ 23 Sep (R137) — 🧪 LEGACY-ERA FIXTURE. Production no longer resolves any client to the retired
// per-lead model (founder: *"the 299/4 is retired/ this must go."*), so the code this file tests
// is unreachable from production and is removed, with these tests, by its own follow-up PR.
// Until then it runs against the resolver exactly as it stood before R137 — the only state in
// which it was reachable — rather than being deleted or skipped (R131). See
// `apps/api/test-support/legacy-era-commercial-model.ts`; production's behaviour is proven in
// `commercial-model.test.ts`, which does not use it.
vi.mock('./commercial-model', async (importOriginal) =>
  (await import('../../test-support/legacy-era-commercial-model'))
    .legacyEraCommercialModel(await importOriginal()))
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

const rpcCalls: Array<{ fn: string; args: unknown }> = []
let rpcReturns: Record<string, unknown> = {}
let leadRow: Record<string, unknown> | null = null
/** The client's active campaign. null ⟹ nothing to work the lead with. */
let campaignRow: Record<string, unknown> | null = { id: 'camp1' }
/** Rows a `.update({status:'active'})` on figsy_campaigns returns — the paused-resume path. */
let resumedRows: Array<{ id: string }> = []
let claimWins = true
const tableInserts: Array<{ table: string; row: unknown }> = []
const leadUpdates: Array<Record<string, unknown>> = []
let isDemo = false

function makeQuery(table: string) {
  const q: any = {
    _isCount: false,
    update(row: Record<string, unknown>) {
      if (table === 'leads') leadUpdates.push(row)
      q._update = row
      return q
    },
    insert(row: unknown) {
      tableInserts.push({ table, row })
      return { then: (r: any) => r({ error: null }), select: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }) }
    },
    delete() { return q },
    select(_c?: string, opts?: { count?: string; head?: boolean }) { q._isCount = !!opts?.count; return q },
    eq() { return q }, neq() { return q }, is() { return q }, in() { return q }, not() { return q },
    order() { return q }, limit() { return q },
    async maybeSingle() {
      // ⚑ 3 Sep (PR B) — A LEGACY CLIENT WITH NO PROGRAMME, STATED RATHER THAN IMPLIED.
      // `approveLead` now opens with the legacy per-lead fence, which reads `programmes`
      // and fails closed on anything it cannot interpret. Without this line the fallthrough
      // answered that read with `leadRow` and the fence saw a lead as an open programme.
      // These tests are the $299 pack model — the no-programme case the founder locked as
      // UNCHANGED — so "no programme" is the honest fixture answer.
      if (table === 'programmes') return { data: null, error: null }
      // ⛓️ 3 Sep (C2) — THE CLIENT ROW CARRIES THE COLUMN, because `clientCommercialModel`
      // selects it and a MISSING FIELD is now `unreadable` rather than a NULL. A fixture that
      // answers `select('commercial_model')` with a row that has no such key was never faithful
      // to PostgREST, which either returns the column or errors. `commercial_model: null` is the
      // UNCLASSIFIED state the whole live book holds, so every assertion keeps its meaning.
      if (table === 'clients') return { data: { id: 'c1', commercial_model: null }, error: null }
      return { data: table === 'figsy_campaigns' ? campaignRow : leadRow, error: null }
    },
    async single() {
      if (table === 'programmes') return { data: null, error: null }
      // ⛓️ 3 Sep (C2) — THE CLIENT ROW CARRIES THE COLUMN, because `clientCommercialModel`
      // selects it and a MISSING FIELD is now `unreadable` rather than a NULL. A fixture that
      // answers `select('commercial_model')` with a row that has no such key was never faithful
      // to PostgREST, which either returns the column or errors. `commercial_model: null` is the
      // UNCLASSIFIED state the whole live book holds, so every assertion keeps its meaning.
      if (table === 'clients') return { data: { id: 'c1', commercial_model: null }, error: null }
      return { data: table === 'figsy_campaigns' ? campaignRow : leadRow, error: null }
    },
    then(resolve: (v: unknown) => unknown) {
      if (q._isCount) return resolve({ count: 1, error: null })
      // The paused-campaign resume: update(...).select('id').limit(1) resolves to the rows it flipped.
      if (q._update && table === 'figsy_campaigns') return resolve({ data: resumedRows, error: null })
      if (q._update && table === 'leads') return resolve({ data: claimWins ? [leadRow] : [], error: null })
      return resolve({ data: [], error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => makeQuery(table),
    rpc: async (fn: string, args: unknown) => { rpcCalls.push({ fn, args }); return { data: rpcReturns[fn], error: null } },
  },
}))
const autoEnrollLead = vi.fn(async () => {})
vi.mock('./figsy', () => ({ autoEnrollLead: (...a: unknown[]) => autoEnrollLead(...(a as [])) }))
vi.mock('./enrichment', () => ({ waterfallEnrich: vi.fn(async () => ({ email: 'found@acme.com' })) }))
vi.mock('./demo', () => ({ isDemoClient: vi.fn(async () => isDemo) }))
vi.mock('./billing-rules', () => ({ normalizeRevealEmail: (e: string | null) => (e ? e.toLowerCase() : null) }))
const sendFounderAlert = vi.fn(async () => {})
vi.mock('./alerts', () => ({ sendFounderAlert: (...a: unknown[]) => sendFounderAlert(...(a as [])) }))

const { approveLead } = await import('./approve-lead')

beforeEach(() => {
  rpcCalls.length = 0; tableInserts.length = 0; leadUpdates.length = 0
  rpcReturns = {}; campaignRow = { id: 'camp1' }; resumedRows = []
  claimWins = true; isDemo = false
  leadRow = { id: 'lead-1', client_id: 'c1', email: 'owned@acme.com', crm_existing: false }
  autoEnrollLead.mockClear(); sendFounderAlert.mockClear()
})

/** The #424 charge-once door: this client already paid for this contact. */
const asOwnedContact = () => { rpcReturns.reveal_is_owned = true }

describe('the charge-once door now respects the no-campaign gate', () => {
  it('THE BUG — a free re-approve with NO active campaign is REFUSED, not stranded', async () => {
    asOwnedContact()
    campaignRow = null

    const out = await approveLead('lead-1', 'c1')

    expect(out.status).toBe('no_campaign')
    expect(out.revealed).toBe(false)
    // The lead must be handed BACK, not left revealed-but-unworked.
    expect(leadUpdates.some(u => u.revealed_at === null), 'the claim must be released').toBe(true)
    // And nothing may be enrolled into a campaign that does not exist.
    expect(autoEnrollLead).not.toHaveBeenCalled()
  })

  it('THE OTHER DIRECTION — the same free re-approve WITH a campaign still works', async () => {
    // Without this, refusing every re-approve would pass the test above and break the feature.
    asOwnedContact()
    campaignRow = { id: 'camp1' }

    const out = await approveLead('lead-1', 'c1')

    expect(out.status).toBe('approved')
    expect(out.charged, 'a re-approve of an owned contact is FREE — #424').toBe(false)
    expect(autoEnrollLead).toHaveBeenCalled()
  })

  it('the refusal takes NO money — this door was already free and must stay free', async () => {
    asOwnedContact()
    campaignRow = null
    await approveLead('lead-1', 'c1')
    expect(rpcCalls.some(c => c.fn === 'try_charge_wallet')).toBe(false)
  })

  it('and it tells the operator, naming the charge-once history', async () => {
    // An operator reading the alert needs to know money already moved on an earlier approval —
    // "they were not charged" alone would be true of the request and misleading about the account.
    asOwnedContact()
    campaignRow = null
    await approveLead('lead-1', 'c1')
    const body = JSON.stringify(sendFounderAlert.mock.calls)
    expect(body).toContain('no active campaign')
    expect(body).toContain('charge-once')
  })
})

describe('a client coming back from a cold suspension is rescued at BOTH doors', () => {
  it('the charge-once door resumes a paused campaign rather than refusing', async () => {
    // The 30-day cold check suspends by PAUSING. Approving is the signal they are back, so a
    // paused campaign must revive here too — otherwise one door rescues them and the other
    // locks them out, which is exactly the drift this refactor exists to prevent.
    asOwnedContact()
    campaignRow = null
    resumedRows = [{ id: 'camp-resumed' }]

    const out = await approveLead('lead-1', 'c1')

    expect(out.status).toBe('approved')
    expect(autoEnrollLead).toHaveBeenCalled()
  })

  it('the paid door resumes it too — the behaviour 3c always had, unchanged', async () => {
    rpcReturns.reveal_is_owned = false
    rpcReturns.try_charge_wallet = true
    campaignRow = null
    resumedRows = [{ id: 'camp-resumed' }]

    const out = await approveLead('lead-1', 'c1')

    expect(out.status).not.toBe('no_campaign')
  })
})

describe('the ORIGINAL 3c gate is untouched', () => {
  it('a FIRST approval with no campaign still refuses BEFORE charging', async () => {
    rpcReturns.reveal_is_owned = false
    campaignRow = null

    const out = await approveLead('lead-1', 'c1')

    expect(out.status).toBe('no_campaign')
    expect(rpcCalls.some(c => c.fn === 'try_charge_wallet'), 'must not charge for work that cannot run').toBe(false)
    expect(leadUpdates.some(u => u.revealed_at === null)).toBe(true)
  })
})

// ── LAYER 3 — the silent return learns to speak ────────────────────────────────────────────
describe('autoEnrollLead no longer bails silently on a FORCED enrol', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, 'figsy.ts'), 'utf8'))
  const at = src.indexOf('if (!campaign) {')
  const block = src.slice(at, src.indexOf('const { data: lead }', at))

  it('the no-campaign branch exists and is scoped to this function', () => {
    expect(at).toBeGreaterThan(-1)
    expect(block.length).toBeGreaterThan(50)
  })

  it('a FORCED enrol (an explicit human approval) alerts', () => {
    expect(block).toContain('opts?.force')
    expect(block).toContain('sendFounderAlert')
  })

  it('the CRON path stays silent — alerting on every campaignless client trains it to be ignored', () => {
    // The alert must sit INSIDE the force check, not beside it.
    const forceAt = block.indexOf('opts?.force')
    const alertAt = block.indexOf('sendFounderAlert')
    expect(forceAt).toBeGreaterThan(-1)
    expect(alertAt).toBeGreaterThan(forceAt)
  })

  it('it still returns — the alert reports, it does not change the outcome', () => {
    expect(block).toContain('return')
  })
})

describe('one rule, two doors', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, 'approve-lead.ts'), 'utf8'))

  it('both doors call the SAME resolver — a copied lookup would miss the paused-resume', () => {
    expect(src.split('resolveActiveCampaign(').length - 1).toBeGreaterThanOrEqual(3) // def + 2 calls
  })

  it('both doors refuse the SAME way', () => {
    expect(src.split('refuseNoCampaign(').length - 1).toBeGreaterThanOrEqual(3)
  })

  it('the old inlined campaign lookup is GONE from the body — one copy only', () => {
    // Two lookups is how 3b and 3c came to disagree in the first place.
    expect(src.split("eq('status', 'active')").length - 1).toBe(1)
  })
})
