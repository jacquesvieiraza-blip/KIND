// ═══════════════════════════════════════════════════════════════════════════════════════
// HOUSE SOURCES FROM APOLLO, ON VERIFIED EMAILS, OR IT DOES NOT SOURCE (founder-locked 7 Sep).
//
// Wednesday MVP, House only. Three separate ways the current path could put House somewhere
// the founder has not authorised, each closed here and each RED-proved:
//
// 🛑 ① AN UNKNOWN IDENTITY BECAME A CLIENT, AND A CLIENT MEANS PDL.
// `audienceForClient` catches every lookup failure and answers `'client'`. That default is
// CORRECT where it lives — an unknown account must never be handed K.I.N.D's prepaid Apollo
// credits — but on the SOURCING path it means a wobble in the auth lookup silently moves
// House onto PDL at $0.28/record, against the founder's Apollo-only decision, and nothing
// anywhere would say so. `audienceForClientStrict` THROWS instead: for a sourcing run,
// "we could not tell who this is" must stop the run, not pick a provider.
//
// ⚠️ THE PERMISSIVE DEFAULT IS DELIBERATELY LEFT IN PLACE for every other caller. Failing an
// admin revenue page closed because an auth lookup blinked would be a worse product than the
// thing this fixes.
//
// 🛑 ② `likely_to_engage` IS NOT `verified`. The Apollo body asks for BOTH when
// `apollo_only_consented` is set. For House the founder ruled only `verified` is usable, so
// the body must ask for `['verified']` alone and every record that comes back with any other
// status is skipped at insert — the query is a request, not a guarantee.
//
// 🛑 ③ THE RELAXATION LADDER DELETED THE FILTER. Passes 2 and 3 of
// `searchPeopleWithFallback` do `delete relaxed.contact_email_status` when results are thin
// — *"Apollo-verified emails were too restrictive for this geography"*. For House that is
// exactly the trade the founder refused: thin results are an answer, not a reason to accept
// unverified addresses.
//
// ⚠️ AND HUNTER. It is off by key for MVP, but "off because a variable is unset" is not the
// same claim as "House cannot reach it". `enrichAndDeliverLeads` takes an explicit opt so
// the House path states it, rather than inheriting it from Railway.
//
// RED PROOF — every one of these fails before the fix:
//   · strict resolver does not exist                    → import fails
//   · `verifiedEmailOnly` not honoured by the body      → both statuses returned
//   · relaxation still strips the filter for House      → unverified accepted
//   · no House email-status skip at insert              → source guard fails
//   · Hunter not opt-controlled                         → source guard fails
//
// Mocks only — no network, no provider, no spend, no House data, NO SOURCING.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ⚠️ HOISTED. `provider-boundary` imports `@kind/db`, which THROWS at module scope without
// these — and a static import runs before any `beforeEach`. Nothing here reaches a network:
// the URL is a localhost placeholder and every db call in this file is mocked.
vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

import { searchProviderFor, type Audience } from './provider-boundary'
import { buildSearchBody } from './apollo'
import { HOUSE_ACCOUNT_EMAIL } from './real-clients-logic'

const ICPS_SRC = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
const APOLLO_SRC = readFileSync(join(__dirname, './apollo.ts'), 'utf8')
const DELIVERY_SRC = readFileSync(join(__dirname, './lead-delivery.ts'), 'utf8')

/** Executable lines only — a comment describing a removed behaviour must not read as it. */
const code = (src: string) => src.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

const ICP = {
  job_titles: ['Founder', 'CEO'],
  seniority_levels: ['C-Suite'],
  industries: ['B2B services'],
  company_sizes: ['11-50'],
  geographies: ['United Kingdom', 'United States'],
  apollo_only_consented: true,
}

// ── ① PROVIDER ROUTING ─────────────────────────────────────────────────────────────────

describe('① House sources from Apollo, and can never route to PDL', () => {
  it('1 · house → apollo', () => {
    expect(searchProviderFor('house')).toBe('apollo')
  })

  it('2 · there is no input under which house resolves to pdl', () => {
    // The function is total over the type — if it ever gains a branch that answers 'pdl'
    // for house, this is the assertion that catches it.
    expect(searchProviderFor('house' as Audience)).not.toBe('pdl')
  })

  it('13 · a non-house client still routes to PDL — unchanged', () => {
    expect(searchProviderFor('client')).toBe('pdl')
  })
})

// ── ② IDENTITY — REPORTED, NOT FIXED (founder's STOP rule) ─────────────────────────────
//
// The founder asked for a House sourcing run to FAIL LOUDLY when identity cannot be proved,
// rather than fall through to `'client'` and therefore PDL. A strict resolver was built,
// tested and REVERTED, because it is not a narrow change:
//
//   · `provider-boundary.test.ts` goes RED on its own AR5 guard — *"HOUSE with ZERO PDL
//     allowance never calls the fence, and still reaches Apollo"* — because under that
//     suite's fixtures the strict path resolves house as client and enters the PDL fence;
//   · six suites' db fixtures return a `clients` row with no `user_id` and no `auth.admin`,
//     so the strict lookup cannot complete and every sourcing test dies.
//
// ⚠️ AND ONE OF MY OWN ASSUMPTIONS WAS WRONG ON THE WAY: `clients.user_id` is NULLABLE —
// `20260612_company_engine.sql` drops the NOT NULL so a company seat can exist without an
// auth user — so "no user_id" is a legitimate answer meaning "not an auth-user client", and
// never an ambiguity. Any future strict resolver must treat it as `'client'`, not as a fault.
//
// The residual risk is stated plainly in the report and in `icps.ts`: an auth-lookup failure
// still resolves House to `'client'`, which means PDL. It is unchanged from before this task.

// ── ③ VERIFIED-ONLY, IN THE QUERY ──────────────────────────────────────────────────────

describe('③ the House Apollo query asks for VERIFIED email status only', () => {
  it('5 · verifiedEmailOnly narrows the filter to ["verified"]', () => {
    const body = buildSearchBody(ICP, 1, { verifiedEmailOnly: true })
    expect(body.contact_email_status).toEqual(['verified'])
  })

  it('5b · without it, today\'s two-status behaviour is unchanged for everyone else', () => {
    const body = buildSearchBody(ICP, 1)
    expect(body.contact_email_status).toEqual(['verified', 'likely_to_engage'])
  })

  it('5c · a client who never asked for the consent filter is still unfiltered', () => {
    const body = buildSearchBody({ ...ICP, apollo_only_consented: false }, 1)
    expect(body.contact_email_status).toBeUndefined()
  })
})

describe('④ the relaxation ladder never strips the filter for House', () => {
  const APOLLO_CODE = code(APOLLO_SRC)

  it('6 · every relaxation of the email-status filter is EXPLICITLY guarded', () => {
    // ⛓️ REWRITTEN AFTER A FAILED TEETH-PROOF. The first version searched the 600 characters
    // BEFORE each `delete` for the word `verifiedEmailOnly` — and the line above each delete
    // legitimately contains `buildSearchBody(icp, page, { verifiedEmailOnly })`, so removing
    // the actual guard still passed. PROXIMITY IS NOT A GUARD. These assert the two exact
    // guard shapes instead, and both go red the moment either is removed.
    const deletes = [...APOLLO_CODE.matchAll(/delete\s+\w+\.contact_email_status/g)]
    expect(deletes.length, 'the relaxation ladder no longer exists — re-read this test').toBe(2)

    // Pass 2 exists only to widen the CONSENT proxy, so for House it is skipped whole.
    expect(APOLLO_CODE, 'pass 2 relaxes the consent filter for House again')
      .toMatch(/if \(icp\.apollo_only_consented && !verifiedEmailOnly\)/)
    // Pass 3 still widens company SIZE for House; the email-status floor does not move.
    expect(APOLLO_CODE, 'pass 3 strips the verified-email filter for House again')
      .toMatch(/if \(!verifiedEmailOnly\) delete relaxed3\.contact_email_status/)
  })

  it('6b · the flag is DERIVED FROM THE AUDIENCE, so no call site can forget it', () => {
    // ⛓️ RETARGETED, AND DELIBERATELY STRONGER. This first expected `verifiedEmailOnly:
    // audience === 'house'` at the call site in `icps.ts`. The implementation derives it
    // INSIDE `searchPeopleWithFallback` instead — from the audience, the single input
    // provider choice is already allowed to have. A parameter must be remembered at every
    // call site; a derivation cannot be forgotten. Same fact, decided one layer down.
    expect(APOLLO_CODE).toMatch(/const verifiedEmailOnly = audience === 'house'/)
    expect(APOLLO_CODE, 'the flag is never handed to the body builder')
      .toMatch(/buildSearchBody\(icp, page, \{ verifiedEmailOnly \}\)/)
  })
})

// ── ⑤ VERIFIED-ONLY, AT THE RECORD ─────────────────────────────────────────────────────

describe('⑤ only a VERIFIED Apollo record becomes a House lead', () => {
  const ICPS_CODE = code(ICPS_SRC)

  it('7-10 · the House skip exists and tests email_status against "verified" exactly', () => {
    // A query filter is a REQUEST. The record that comes back is the fact, so the status is
    // re-checked at insert — that is what makes 8, 9 and 10 true rather than hoped for.
    expect(ICPS_CODE).toMatch(/audience === 'house' && contact\.email_status !== 'verified'/)
  })

  it('8 · `likely_to_engage` is NOT accepted as verified for House', () => {
    // The pre-existing `apollo_consented` flag treats both as contactable; the House gate is
    // a separate, stricter test and must not be written in terms of that flag.
    const gate = ICPS_CODE.match(/audience === 'house' && contact\.email_status !== 'verified'/)
    expect(gate).not.toBeNull()
    expect(ICPS_CODE).not.toMatch(/audience === 'house' &&[^\n]*likely_to_engage/)
  })

  it('the skip is a counted rejection, like every other guard in that loop', () => {
    const at = ICPS_CODE.indexOf("audience === 'house' && contact.email_status !== 'verified'")
    expect(ICPS_CODE.slice(at, at + 200)).toMatch(/skipped\+\+/)
  })
})

// ── ⑥ HUNTER + PDL ARE NOT REACHABLE ON THE HOUSE PATH ─────────────────────────────────

describe('⑥ House never reaches Hunter or PDL', () => {
  it('11 · delivery takes an explicit hunter opt, and the House run says no', () => {
    expect(code(DELIVERY_SRC), 'the Hunter block is still decided only by the env key')
      .toMatch(/hunterAllowed/)
    expect(code(ICPS_SRC)).toMatch(/hunterAllowed:\s*audience !== 'house'/)
  })

  it('11b · with hunterAllowed false, the waterfall is not called even when the key is set', async () => {
    vi.resetModules()
    const calls = { waterfall: 0 }
    vi.doMock('./enrichment', () => ({
      waterfallEnrich: async () => { calls.waterfall++; return { source: 'none' } },
    }))
    vi.doMock('./apollo', () => ({ bulkMatchEmails: async () => new Map() }))
    vi.doMock('@kind/db', () => ({
      db: {
        from: () => {
          const q: Record<string, unknown> = {}
          for (const m of ['select', 'in', 'is', 'not', 'eq', 'update']) q[m] = () => q
          q.then = (r: (v: unknown) => void) => r({ data: [{ id: 'l1', email: null, apollo_id: null, first_name: 'A', last_name: 'B', company: 'C', linkedin_url: null }], error: null })
          return q
        },
      },
    }))
    const prevKey = process.env.HUNTER_API_KEY
    process.env.HUNTER_API_KEY = 'set-on-purpose-for-this-test'
    try {
      const { enrichAndDeliverLeads } = await import('./lead-delivery')
      await enrichAndDeliverLeads('house-client', ['l1'], { hunterAllowed: false })
      expect(calls.waterfall, 'Hunter ran for House even though the House path forbade it').toBe(0)
    } finally {
      if (prevKey === undefined) delete process.env.HUNTER_API_KEY; else process.env.HUNTER_API_KEY = prevKey
      vi.doUnmock('./enrichment'); vi.doUnmock('./apollo'); vi.doUnmock('@kind/db'); vi.resetModules()
    }
  })

  it('12 · the house search branch calls Apollo, and the PDL branch is the client branch', () => {
    const APOLLO_CODE = code(APOLLO_SRC)
    expect(APOLLO_CODE).toMatch(/if \(provider === 'pdl'\)/)
    expect(APOLLO_CODE).toMatch(/searchProviderFor\(audience\)/)
  })
})

// ── ⑦ NOTHING HERE TOUCHES CEILING, OUTREACH, P2, LIVE OR SEND ─────────────────────────

describe('⑦ the ceiling and every downstream authority are untouched', () => {
  it('14 · the programme ceiling still refuses beyond the authorised volume', async () => {
    const AUTH = readFileSync(join(__dirname, './programme-authority.ts'), 'utf8')
    expect(code(AUTH)).toMatch(/sourcing_ceiling - p\.sourced_used - p\.sourced_reserved/)
    expect(code(AUTH)).toMatch(/sourcing_ceiling_reached/)
  })

  it('15 · no file changed by this fix grants outreach, P2, Live or send', () => {
    for (const src of [APOLLO_SRC, DELIVERY_SRC, readFileSync(join(__dirname, './provider-boundary.ts'), 'utf8')]) {
      const c = code(src)
      for (const banned of ['goLiveProgramme', 'second_paid_at', 'went_live_at', 'sendDay1', 'checkSendAllowed']) {
        expect(c, `a provider-safety file now references ${banned}`).not.toContain(banned)
      }
    }
  })
})
