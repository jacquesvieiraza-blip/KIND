// ═══════════════════════════════════════════════════════════════════════════
// ONE CLIENT → ONE ACTIVE CAMPAIGN — and the invariant FAILS CLOSED.
//
// `figsy.ts` routes a lead to the campaign matching `leads.icp_id` and falls back to
// "whichever active campaign is newest". Both are first-match-wins: fine with one active
// campaign, silently arbitrary with two. Nothing in the schema prevents two.
//
// ⚠️ THE FIRST IMPLEMENTATION GOT THE RULE BACKWARDS (found in review, 22 Aug round 4).
// It let the NEW campaign win and auto-paused the client's others — and when that pause
// failed it logged and carried on, which is exactly how a client ends up with two live
// campaigns and an operation that reported success. The founder's rule is the opposite:
// activating a second campaign is REFUSED until a human pauses the first. Nothing is
// paused on the client's behalf, and an invariant we cannot verify is an activation we
// do not perform.
//
// ⚠️ THESE TESTS RUN THE REAL `ensureCampaignForIcp` — not a mock of it. Every other
// suite that touches this function mocks it away, which is how the first implementation's
// behaviour shipped without a single test noticing. Only the database is simulated.
//
// ⚠️ AND THE FUNCTION HAS TWO MODES (integration fix, same day). The invariant above is the
// ACTIVATE mode — K.I.N.D's GO. The default is SCAFFOLD: Milla parks `campaign_intent` on a
// DRAFT campaign row, because storing what a client wants must not be the event that makes
// a campaign live. Both are asserted below, and the default being the harmless one is
// itself the point — a caller that forgets the flag can only fail to activate.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Sim = {
  /** The campaign already born from THIS ICP, if any. */
  existing?: { id: string; status: string } | null
  /** Another ACTIVE campaign — belonging to whom is part of the test. */
  otherActive?: { id: string; name: string | null; client_id: string } | null
  /** Force the active-campaign visibility check itself to error. */
  blockingCheckError?: boolean
  /** Force the insert / re-activate write to error. */
  writeError?: boolean
}
type Rec = { inserts: Array<Record<string, unknown>>; updates: Array<{ patch: Record<string, unknown>; id: string | null }> }

async function ensure(sim: Sim, rec: Rec, clientId = 'c1', opts?: { activate?: boolean }) {
  vi.resetModules()
  vi.doMock('@kind/db', () => {
    const campaignQuery = () => {
      const filters: Array<[string, string, unknown]> = []
      const q: Record<string, unknown> = {}
      for (const m of ['eq', 'neq', 'in', 'is', 'not', 'order', 'or']) {
        q[m] = (col: string, val: unknown) => { filters.push([m, col, val]); return q }
      }
      q.select = () => q
      q.limit = () => q
      q.maybeSingle = async () => {
        const has = (m: string, col: string) => filters.some(f => f[0] === m && f[1] === col)
        const val = (col: string) => filters.find(f => f[1] === col)?.[2]
        // The per-ICP lookup filters on icp_id; the blocking lookup filters on status=active.
        if (has('eq', 'icp_id')) return { data: sim.existing ?? null, error: null }
        if (has('eq', 'status') && val('status') === 'active') {
          if (sim.blockingCheckError) return { data: null, error: { message: 'boom' } }
          const o = sim.otherActive
          // The query is client-scoped, so another client's active row is invisible to it —
          // exactly the isolation the mock must reproduce.
          if (!o || o.client_id !== val('client_id')) return { data: null, error: null }
          if (has('neq', 'id') && val('id') !== undefined && filters.some(f => f[0] === 'neq' && f[1] === 'id' && f[2] === o.id)) {
            return { data: null, error: null }
          }
          return { data: { id: o.id, name: o.name }, error: null }
        }
        return { data: null, error: null }
      }
      q.update = (patch: Record<string, unknown>) => {
        const chain: Record<string, unknown> = {}
        let id: string | null = null
        chain.eq = (col: string, v: string) => { if (col === 'id') id = v; return chain }
        ;(chain as { then: unknown }).then = (resolve: (v: unknown) => void) => {
          rec.updates.push({ patch, id })
          resolve({ error: sim.writeError ? { message: 'boom' } : null })
        }
        return chain
      }
      q.insert = (row: Record<string, unknown>) => {
        rec.inserts.push(row)
        return { select: () => ({ single: async () => (sim.writeError
          ? { data: null, error: { message: 'boom' } }
          : { data: { id: 'new-camp' }, error: null }) }) }
      }
      return q
    }
    return { db: { from: () => campaignQuery(), rpc: async () => ({ data: null, error: null }) } }
  })
  const { ensureCampaignForIcp } = await import('./start-work')
  return ensureCampaignForIcp(clientId, 'icp-1', 'Test ICP', opts)
}
/** GO — the only mode that makes a campaign live. */
const activateMode = (sim: Sim, rec: Rec, clientId = 'c1') => ensure(sim, rec, clientId, { activate: true })

const prev = { url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY }

describe('one client, one active campaign — refusal, not silent repair', () => {
  let rec: Rec
  beforeEach(() => {
    rec = { inserts: [], updates: [] }
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.resetModules()
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('CAMPAIGN A ACTIVE → CAMPAIGN B IS REFUSED, AND A IS NOT TOUCHED', async () => {
    const r = await activateMode({ otherActive: { id: 'camp-A', name: 'First push', client_id: 'c1' } }, rec)
    // The refusal names what blocked it, so the operator knows what to pause.
    expect(r && 'refused' in r && r.refused?.blockingCampaignId).toBe('camp-A')
    expect((r as { id?: string })?.id).toBeUndefined()
    // NOTHING was created and NOTHING was paused — pausing is a human's decision.
    expect(rec.inserts).toHaveLength(0)
    expect(rec.updates.filter(u => u.patch.status === 'paused')).toHaveLength(0)
  })

  it('pause A first → B may then be created and activated', async () => {
    const r = await activateMode({ otherActive: null }, rec)
    expect((r as { id?: string })?.id).toBe('new-camp')
    expect(rec.inserts).toHaveLength(1)
    expect(rec.inserts[0].status).toBe('active')
  })

  it('reusing the SAME active campaign succeeds — it is not a second campaign', async () => {
    const r = await activateMode({ existing: { id: 'camp-A', status: 'active' } }, rec)
    expect((r as { id?: string })?.id).toBe('camp-A')
    expect(rec.inserts).toHaveLength(0)
  })

  it('re-activating this ICP\'s PAUSED campaign is allowed only when nothing else is live', async () => {
    const r = await activateMode({ existing: { id: 'camp-A', status: 'paused' }, otherActive: null }, rec)
    expect((r as { id?: string })?.id).toBe('camp-A')
    expect(rec.updates.some(u => u.patch.status === 'active' && u.id === 'camp-A')).toBe(true)
  })

  it('…and is REFUSED while another campaign is live', async () => {
    const r = await activateMode({
      existing: { id: 'camp-A', status: 'paused' },
      otherActive: { id: 'camp-B', name: 'Other push', client_id: 'c1' },
    }, rec)
    expect(r && 'refused' in r && r.refused?.blockingCampaignId).toBe('camp-B')
    expect(rec.updates.some(u => u.patch.status === 'active')).toBe(false)
  })

  it('ANOTHER CLIENT\'S ACTIVE CAMPAIGN NEVER BLOCKS THIS CLIENT', async () => {
    const r = await activateMode({ otherActive: { id: 'camp-X', name: 'Someone else', client_id: 'c2' } }, rec)
    expect((r as { id?: string })?.id).toBe('new-camp')
  })

  it('A FAILED VISIBILITY CHECK REFUSES RATHER THAN PROCEEDS', async () => {
    // If we cannot SEE whether another campaign is active, we do not get to assume there
    // isn't one. Proceeding here is how a db hiccup mints a second live campaign.
    const r = await activateMode({ blockingCheckError: true }, rec)
    expect(r).toBeNull()
    expect(rec.inserts).toHaveLength(0)
  })

  it('A FAILED WRITE CANNOT REPORT SUCCESS', async () => {
    const r = await activateMode({ existing: { id: 'camp-A', status: 'paused' }, otherActive: null, writeError: true }, rec)
    expect(r).toBeNull()
  })
})

// ── SCAFFOLD MODE — MILLA STORES INTENT, AND NOTHING GOES LIVE ────────────────
//
// `persistMillaUnderstanding` needs a campaign row to hang `campaign_intent` on. It used to
// get one through the ACTIVATE path, so merely telling Milla what you wanted made a campaign
// live — before payment, before an operator looked — and that live campaign then refused the
// operator's own GO through the invariant above. Found by review of the assembled journey.
describe('scaffold mode — a campaign row without a live campaign', () => {
  let rec: Rec
  beforeEach(() => {
    rec = { inserts: [], updates: [] }
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.resetModules()
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('THE DEFAULT IS SCAFFOLD — a forgotten flag can only fail to activate', async () => {
    const r = await ensure({ otherActive: null }, rec)          // no opts at all
    expect((r as { id?: string })?.id).toBe('new-camp')
    expect(rec.inserts).toHaveLength(1)
    expect(rec.inserts[0].status, 'the default made a campaign LIVE').toBe('draft')
  })

  it('AN EXISTING CAMPAIGN IS RETURNED UNTOUCHED — no waking, no pausing', async () => {
    // Re-running Milla must never wake a campaign an operator deliberately paused…
    const paused = await ensure({ existing: { id: 'camp-A', status: 'paused' } }, rec)
    expect((paused as { id?: string })?.id).toBe('camp-A')
    // …nor demote a live one.
    const live = await ensure({ existing: { id: 'camp-A', status: 'active' } }, rec)
    expect((live as { id?: string })?.id).toBe('camp-A')
    expect(rec.updates).toHaveLength(0)
    expect(rec.inserts).toHaveLength(0)
  })

  it('A LIVE CAMPAIGN ELSEWHERE DOES NOT BLOCK A SCAFFOLD — a draft collides with nothing', async () => {
    // The invariant is about ACTIVE campaigns. Refusing to store a client's intent because
    // another campaign happens to be running would break onboarding for no safety gain.
    const r = await ensure({ otherActive: { id: 'camp-A', name: 'First push', client_id: 'c1' } }, rec)
    expect((r as { id?: string })?.id).toBe('new-camp')
    expect(rec.inserts[0].status).toBe('draft')
  })
})
