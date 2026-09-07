// ═══════════════════════════════════════════════════════════════════════════════════════
// THE WHOLE HOUSE JOURNEY, END TO END: search → reveal → qualify → lead (7 Sep).
//
// 🛑 WHY A BEHAVIOURAL TEST AND NOT MORE SOURCE SCANS. The source-level guards in
// `house-apollo-only.test.ts` prove the gate EXISTS. They do not prove it RUNS: putting the
// final qualification behind `if (false)`, or having the caller stop passing the customer's
// criteria, left every one of them green. Both are precisely the failure this whole task is
// about — *"silently return success with zero because candidates were filtered at the wrong
// stage"* — so both are proved here against the real functions instead.
//
// THE FLOW UNDER TEST, exactly as production runs it:
//
//   Apollo People Search  → id + title only. No email, no email_status, no country,
//                           surname obfuscated. NOTHING to qualify on yet.
//   M&V enrichment        → `enrichAndDeliverLeads`. Apollo's paid reveal is ONE provider
//                           step inside it, not the flow itself.
//   final qualification   → the customer's FULL ICP, judged on facts that now exist.
//
// Mocks only — `@kind/db` and `./apollo` are stubbed, no network, no provider, no spend.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, afterEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

/** The House ICP in the customer's terms: founder-led B2B agencies, UK and US. */
const HOUSE_ICP = { geographies: ['United Kingdom', 'United States'], requireVerifiedBusinessEmail: true }

type Revealed = { email: string; email_status: string | null; country: string | null; last_name: string | null }

interface Harness {
  updates: { id: string; patch: Record<string, unknown> }[]
  revealAsked: string[]
}

/**
 * Every candidate arrives from SEARCH with no email — exactly what `mixed_people/api_search`
 * gives us — and the stubbed reveal decides what each one turns out to be.
 */
async function runFlow(
  reveal: Record<string, Revealed>,
  opts: { hunterAllowed?: boolean; qualifyAgainst?: typeof HOUSE_ICP } = {},
): Promise<Harness> {
  const h: Harness = { updates: [], revealAsked: [] }
  const ids = Object.keys(reveal)

  vi.resetModules()
  vi.doMock('./apollo', () => ({
    bulkMatchEmails: async (apolloIds: string[]) => {
      h.revealAsked.push(...apolloIds)
      return new Map(Object.entries(reveal).filter(([k]) => apolloIds.includes(k)))
    },
  }))
  vi.doMock('./enrichment', () => ({ waterfallEnrich: async () => ({ email: null, source: 'none' }) }))
  vi.doMock('./alerts', () => ({ sendFounderAlert: async () => {} }))
  vi.doMock('@kind/db', () => ({
    db: {
      from: (table: string) => {
        let pending: Record<string, unknown> | null = null
        let target: string | null = null
        const q: Record<string, unknown> = {}
        for (const m of ['select', 'in', 'is', 'not', 'order', 'limit']) q[m] = () => q
        q.update = (patch: Record<string, unknown>) => { pending = patch; return q }
        q.eq = (col: string, val: string) => { if (col === 'id') target = val; return q }
        q.then = (resolve: (v: unknown) => void) => {
          if (pending && target) { h.updates.push({ id: target, patch: pending }); pending = null; return resolve({ data: null, error: null }) }
          if (pending) { pending = null; return resolve({ data: [], error: null }) }   // bulk claim
          if (table === 'leads') {
            // Candidates as SEARCH left them: an Apollo id, no email, obfuscated surname.
            const revealedIds = new Set(h.updates.filter(u => u.patch.email).map(u => u.id))
            return resolve({
              data: ids.filter(i => !revealedIds.has(i)).map(id => ({
                id, email: null, apollo_id: id, first_name: 'Ada', last_name: 'La***n',
                company: 'An Agency', linkedin_url: null,
              })),
              error: null,
            })
          }
          return resolve({ data: [], error: null })
        }
        return q
      },
      rpc: async () => ({ data: null, error: null }),
    },
  }))

  const { enrichAndDeliverLeads } = await import('./lead-delivery')
  await enrichAndDeliverLeads('house-client', ids, { hunterAllowed: false, qualifyAgainst: HOUSE_ICP, ...opts })
  return h
}

const emailed = (h: Harness) => h.updates.filter(u => u.patch.email).map(u => u.id)

afterEach(() => { vi.doUnmock('@kind/db'); vi.doUnmock('./apollo'); vi.doUnmock('./enrichment'); vi.doUnmock('./alerts'); vi.resetModules() })

// ── ① THE CANDIDATE REACHES THE REVEAL AT ALL ─────────────────────────────────────────

describe('① a search candidate with nothing to qualify on still reaches enrichment', () => {
  it('🛑 it is ASKED about — the 250 → 0 run never got this far', async () => {
    const h = await runFlow({ 'apollo-1': { email: 'ada@agency.co.uk', email_status: 'verified', country: 'United Kingdom', last_name: 'Lawson' } })
    expect(h.revealAsked, 'the candidate never reached the reveal step').toContain('apollo-1')
  })
})

// ── ② THE FULL ICP IS ENFORCED ON THE REVEALED FACTS ──────────────────────────────────

describe('② after the reveal, the customer\'s whole ICP decides', () => {
  it('🛑 a verified UK business email SURVIVES and becomes a usable lead', async () => {
    const h = await runFlow({ ok: { email: 'ada@agency.co.uk', email_status: 'verified', country: 'United Kingdom', last_name: 'Lawson' } })
    expect(emailed(h)).toEqual(['ok'])
    expect(h.updates[0].patch).toMatchObject({ email: 'ada@agency.co.uk', apollo_consented: true })
  })

  it('a US one survives too — both of the customer\'s geographies are honoured', async () => {
    const h = await runFlow({ ok: { email: 'sam@agency.com', email_status: 'verified', country: 'United States', last_name: 'Reed' } })
    expect(emailed(h)).toEqual(['ok'])
  })

  it('🛑 WRONG geography fails — and no email is ever written to that lead', async () => {
    const h = await runFlow({ br: { email: 'joao@agency.com.br', email_status: 'verified', country: 'Brazil', last_name: 'Silva' } })
    expect(emailed(h)).toEqual([])
  })

  it('🛑 UNKNOWN geography fails — we asked and still cannot prove it', async () => {
    const h = await runFlow({ nogeo: { email: 'ada@agency.co.uk', email_status: 'verified', country: null, last_name: 'Lawson' } })
    expect(emailed(h)).toEqual([])
  })

  it('🛑 an UNVERIFIED email fails for House', async () => {
    const h = await runFlow({ guessed: { email: 'ada@agency.co.uk', email_status: 'guessed', country: 'United Kingdom', last_name: 'Lawson' } })
    expect(emailed(h)).toEqual([])
  })

  it('🛑 `likely_to_engage` fails for House — a prediction is not a verification', async () => {
    const h = await runFlow({ lte: { email: 'ada@agency.co.uk', email_status: 'likely_to_engage', country: 'United Kingdom', last_name: 'Lawson' } })
    expect(emailed(h)).toEqual([])
  })

  it('🛑 a PERSONAL email fails even when the provider calls it verified', async () => {
    const h = await runFlow({ personal: { email: 'ada@gmail.com', email_status: 'verified', country: 'United Kingdom', last_name: 'Lawson' } })
    expect(emailed(h)).toEqual([])
  })

  it('a candidate the provider could not reveal at all is simply not a lead', async () => {
    const h = await runFlow({})
    expect(emailed(h)).toEqual([])
  })

  it('🛑 a MIXED batch keeps exactly the qualifying ones — this is the whole behaviour', async () => {
    const h = await runFlow({
      keep_uk:  { email: 'ada@agency.co.uk',   email_status: 'verified',         country: 'United Kingdom', last_name: 'Lawson' },
      keep_us:  { email: 'sam@agency.com',     email_status: 'verified',         country: 'United States',  last_name: 'Reed' },
      bad_geo:  { email: 'joao@agency.com.br', email_status: 'verified',         country: 'Brazil',         last_name: 'Silva' },
      bad_stat: { email: 'kim@agency.co.uk',   email_status: 'guessed',          country: 'United Kingdom', last_name: 'Park' },
      personal: { email: 'lee@gmail.com',      email_status: 'verified',         country: 'United States',  last_name: 'Lee' },
      no_geo:   { email: 'raj@agency.com',     email_status: 'verified',         country: null,             last_name: 'Raj' },
      lte:      { email: 'eve@agency.com',     email_status: 'likely_to_engage', country: 'United States',  last_name: 'Eve' },
    })
    expect(emailed(h).sort()).toEqual(['keep_uk', 'keep_us'])
    // …and every one of the seven was asked about. Nothing was dropped before the reveal.
    expect(h.revealAsked.sort()).toHaveLength(7)
  })

  it('the revealed surname replaces the obfuscated one — search only gave us "La***n"', async () => {
    const h = await runFlow({ ok: { email: 'ada@agency.co.uk', email_status: 'verified', country: 'United Kingdom', last_name: 'Lawson' } })
    expect(h.updates[0].patch).toMatchObject({ last_name: 'Lawson', country: 'United Kingdom' })
  })
})

// ── ③ THE GATE MUST ACTUALLY RUN ──────────────────────────────────────────────────────

describe('③ the qualification is not optional on the House path', () => {
  it('🛑 with the customer\'s criteria passed, a failing candidate is REFUSED', async () => {
    const h = await runFlow({ bad: { email: 'joao@agency.com.br', email_status: 'verified', country: 'Brazil', last_name: 'Silva' } })
    expect(emailed(h)).toEqual([])
  })

  it('🛑 and the House caller really does pass them — not a default nobody sets', async () => {
    // Breaking the CALLER (icps.ts no longer sending `qualifyAgainst`) must be catchable, so
    // this asserts the call site itself carries the customer's criteria.
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const icps = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') }).join('\n')
    expect(icps, 'the sourcing run no longer hands the ICP to the qualification step')
      .toMatch(/qualifyAgainst:\s*\{/)
    expect(icps, "the customer's geographies are no longer part of the final gate")
      .toMatch(/geographies:\s*\(\(icp as/)
    expect(icps, 'the House verified-only lock is no longer stated at the call site')
      .toMatch(/requireVerifiedBusinessEmail:\s*audience === 'house'/)
  })
})
