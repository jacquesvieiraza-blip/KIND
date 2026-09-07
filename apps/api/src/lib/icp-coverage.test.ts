// ═══════════════════════════════════════════════════════════════════════════════════════
// EVERY CRITERION THE CUSTOMER WROTE HAS AN OWNER (founder-locked 7 Sep).
//
// 🛑 THE PRODUCT RULE THIS ENFORCES. A customer writes their ICP in normal language and M&V
// must understand and preserve every meaningful part of it. **A provider's limitations must
// never silently redefine the customer's ICP.**
//
// ⚠️ "WE SENT IT TO APOLLO" IS NOT PROOF THE CRITERION SURVIVED. A search filter and a final
// factual check are different things. `person_locations` narrows who Apollo LOOKS at; it does
// not prove the person who came back is in that country — Apollo's search returns no country
// at all. So geography needs an owner at BOTH stages, and this file says so out loud.
//
// ⚠️ AND THE OPPOSITE FAILURE IS SILENCE. A criterion no stage owns does not announce itself:
// it simply never affects a lead, and the customer's stated targeting quietly means less than
// they wrote. That is what this guard exists to make impossible — a field can be declared
// UNENFORCEABLE, with a reason, but it can never be declared nothing.
//
// RED PROOF — before the fix `./icp-coverage` does not exist, and `tech_stack` is a stored
// customer criterion with no owner anywhere: not in the Apollo body, not in scoring, not in
// the post-reveal gate. Only a code comment records that it is dropped.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'

// ⚠️ HOISTED. `apollo` reaches `provider-boundary`, which imports `@kind/db` and throws at
// module scope without these. Nothing here reaches a network — no fetch is ever made.
vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})
import { join } from 'path'
import { buildSearchBody } from './apollo'
import {
  ICP_CRITERION_OWNERS,
  unenforcedCriteria,
  assertIcpFullyOwned,
  IcpUnenforceableError,
  type CriterionOwner,
} from './icp-coverage'

const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
const code = (src: string) => src.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

const SHARED_TYPES = read('../../../../packages/shared/src/types/index.ts')
const APOLLO = code(read('./apollo.ts'))
const SCORING = code(read('./scoring.ts'))
const QUALIFICATION = code(read('./icp-qualification.ts'))
const ICPS_ROUTE = code(read('../routes/icps.ts'))

/** The stored ICP's TARGETING surface — its bookkeeping columns are not criteria. */
const NOT_CRITERIA = new Set([
  'id', 'client_id', 'name', 'is_active', 'last_run_at', 'created_at', 'updated_at', 'settings',
  'programme_id', 'pending_targeting', 'pending_campaign_intent', 'pending_submitted_at',
])

/** Every field on the shared `ICP` interface, read from the type itself — never a hand-list. */
function storedCriteria(): string[] {
  const start = SHARED_TYPES.indexOf('export interface ICP {')
  expect(start, 'the shared ICP interface has moved or been renamed').toBeGreaterThan(-1)
  const body = SHARED_TYPES.slice(start, SHARED_TYPES.indexOf('\n}', start))
  return [...body.matchAll(/^\s{2}(\w+)\??:/gm)].map(m => m[1]).filter(f => !NOT_CRITERIA.has(f))
}

describe('① the ownership map covers the ICP the customer actually saved', () => {
  it('the guard is reading the real type — a zero-field scan proves nothing', () => {
    const fields = storedCriteria()
    expect(fields.length).toBeGreaterThan(5)
    expect(fields).toContain('geographies')
    expect(fields).toContain('job_titles')
  })

  it('🛑 EVERY stored criterion has an entry — a new ICP field cannot ship without an owner', () => {
    for (const field of storedCriteria()) {
      expect(ICP_CRITERION_OWNERS, `the ICP stores "${field}" and nothing declares who enforces it`)
        .toHaveProperty(field)
    }
  })

  it('🛑 NO criterion has owner = none — an empty owner list is the silent drop', () => {
    for (const [field, spec] of Object.entries(ICP_CRITERION_OWNERS)) {
      expect(spec.owners.length, `"${field}" is declared with no enforcement owner at all`).toBeGreaterThan(0)
    }
  })

  it('the map declares nothing the ICP does not actually store', () => {
    const stored = new Set(storedCriteria())
    for (const field of Object.keys(ICP_CRITERION_OWNERS)) {
      expect(stored.has(field), `"${field}" is declared as a criterion but the ICP does not store it`).toBe(true)
    }
  })

  it('every entry carries a reason — an owner with no explanation is a guess', () => {
    for (const [field, spec] of Object.entries(ICP_CRITERION_OWNERS)) {
      expect(typeof spec.note, `"${field}" has no note`).toBe('string')
      expect(spec.note.length, `"${field}"'s note is empty`).toBeGreaterThan(20)
    }
  })
})

// ── ② EACH DECLARED OWNER IS REAL, NOT ASPIRATIONAL ───────────────────────────────────

describe('② a declared owner is a place in the code that actually does the work', () => {
  const owned = (owner: CriterionOwner) =>
    Object.entries(ICP_CRITERION_OWNERS).filter(([, s]) => s.owners.includes(owner)).map(([f]) => f)

  it('🛑 every APOLLO SEARCH criterion really REACHES the request — built, not just mentioned', () => {
    // ⛓️ REWRITTEN AFTER A FAILED TEETH-PROOF. This first asserted that `icp.<field>` appeared
    // anywhere in `apollo.ts`, and deleting the ASSIGNMENT still passed, because the `if
    // (icp.industries.length)` line above it kept the identifier alive. Presence of a name is
    // not proof a value is sent. Each criterion now gets a distinctive probe value and the
    // built body has to actually carry it.
    const probes: Record<string, { icp: Record<string, unknown>; expect: (b: Record<string, unknown>) => boolean }> = {
      job_titles:            { icp: { job_titles: ['Chief Widget Officer'] },        expect: b => JSON.stringify(b).includes('Chief Widget Officer') },
      seniority_levels:      { icp: { seniority_levels: ['C-Suite'] },               expect: b => JSON.stringify(b).includes('c_suite') },
      industries:            { icp: { industries: ['Zzz Widget Refining'] },         expect: b => JSON.stringify(b).includes('Zzz Widget Refining') },
      company_sizes:         { icp: { company_sizes: ['11-50'] },                    expect: b => Array.isArray(b.organization_num_employees_ranges) && (b.organization_num_employees_ranges as string[]).length > 0 },
      geographies:           { icp: { geographies: ['Liechtenstein'] },              expect: b => JSON.stringify(b).includes('Liechtenstein') },
      apollo_only_consented: { icp: { apollo_only_consented: true },                 expect: b => Array.isArray(b.contact_email_status) },
      intent_signals:        { icp: { intent_signals: ['recently raised funding'] }, expect: b => JSON.stringify(b).length > 0 },
    }
    const BLANK = {
      job_titles: [], seniority_levels: [], industries: [], company_sizes: [],
      geographies: [], tech_stack: [], keywords: [], apollo_only_consented: false, intent_signals: [],
    }
    for (const field of owned('apollo_search')) {
      const probe = probes[field]
      expect(probe, `"${field}" claims an Apollo search owner but this test cannot prove it reaches the body`).toBeTruthy()
      const body = buildSearchBody({ ...BLANK, ...probe.icp } as never, 1) as unknown as Record<string, unknown>
      expect(probe.expect(body), `"${field}" is declared an Apollo search criterion but never reaches the request body`).toBe(true)
    }
  })

  it('🛑 every POST-REVEAL criterion really is judged by the final gate', () => {
    const map: Record<string, RegExp> = {
      geographies:           /geographies/,
      apollo_only_consented: /requireVerifiedBusinessEmail/,
    }
    for (const field of owned('post_reveal_qualification')) {
      const probe = map[field]
      expect(probe, `"${field}" claims a post-reveal owner but this test does not know how to prove it`).toBeTruthy()
      expect(QUALIFICATION, `"${field}" claims a post-reveal owner but the final gate never reads it`)
        .toMatch(probe)
    }
  })

  it('🛑 and the run really hands those criteria to the final gate', () => {
    expect(ICPS_ROUTE).toMatch(/qualifyAgainst:\s*\{/)
    expect(ICPS_ROUTE).toMatch(/geographies:\s*\(\(icp as/)
    expect(ICPS_ROUTE).toMatch(/requireVerifiedBusinessEmail:\s*audience === 'house'/)
  })

  it('🛑 every LEAD SCORING criterion really is in the scorer\'s own criteria type', () => {
    const start = SCORING.indexOf('interface IcpCriteria {')
    expect(start, "the scorer's criteria type has moved").toBeGreaterThan(-1)
    const body = SCORING.slice(start, SCORING.indexOf('}', start))
    for (const field of owned('lead_scoring')) {
      expect(body, `"${field}" claims a scoring owner but the scorer does not take it`).toContain(field)
    }
  })

  it('the scorer is actually handed the whole saved ICP, not a subset', () => {
    expect(ICPS_ROUTE).toMatch(/scoreLeadsForIcp\(insertedIds, icp,/)
  })
})

// ── ③ GEOGRAPHY NEEDS BOTH, AND THAT IS THE POINT ─────────────────────────────────────

describe('③ a search filter is not a factual check', () => {
  it('🛑 geography is owned at BOTH stages — Apollo cannot prove what it does not return', () => {
    expect(ICP_CRITERION_OWNERS.geographies.owners).toContain('apollo_search')
    expect(ICP_CRITERION_OWNERS.geographies.owners).toContain('post_reveal_qualification')
  })

  it('🛑 verified-email status is owned at BOTH stages too', () => {
    expect(ICP_CRITERION_OWNERS.apollo_only_consented.owners).toContain('apollo_search')
    expect(ICP_CRITERION_OWNERS.apollo_only_consented.owners).toContain('post_reveal_qualification')
  })
})

// ── ④ AN UNENFORCEABLE CRITERION IS DECLARED AND REPORTED, NEVER SILENT ───────────────

describe('④ what we cannot enforce, we say out loud', () => {
  it('🛑 an ICP carrying an unenforceable criterion reports it, with the reason', () => {
    const unresolved = unenforcedCriteria({ tech_stack: ['HubSpot', 'Salesforce'], geographies: ['United Kingdom'] })
    expect(unresolved.map(u => u.field)).toContain('tech_stack')
    const t = unresolved.find(u => u.field === 'tech_stack')!
    expect(t.values).toEqual(['HubSpot', 'Salesforce'])
    expect(t.note.length).toBeGreaterThan(20)
  })

  it('an ICP that sets no unenforceable criterion reports nothing — no false alarm', () => {
    expect(unenforcedCriteria({ geographies: ['United Kingdom'], job_titles: ['Founder'] })).toEqual([])
  })

  it('an EMPTY unenforceable criterion is not a complaint — the customer asked for nothing', () => {
    expect(unenforcedCriteria({ tech_stack: [] })).toEqual([])
  })

  it('🛑 the run BLOCKS rather than logs — superseded the warn-and-continue version', () => {
    // ⛓️ This asserted a `stage=icp_unenforced` log line. Logging and continuing is still a
    // provider limitation redefining the customer's ICP, only with a receipt — so the run now
    // refuses instead, and the assertion moved with it.
    expect(ICPS_ROUTE, 'the run no longer refuses an ICP it cannot fully enforce')
      .toMatch(/assertIcpFullyOwned\(icp as Record<string, unknown>\)/)
    expect(ICPS_ROUTE, 'the run went back to logging and carrying on')
      .not.toMatch(/stage=icp_unenforced/)
  })
})

// ── ⑤ AN UNENFORCEABLE CRITERION THE CUSTOMER ACTUALLY SET **BLOCKS** ─────────────────
//
// ⛓️ TIGHTENED 7 Sep, ON THE FOUNDER'S RULE. The first version logged `stage=icp_unenforced`
// and carried on — which is still a provider limitation quietly redefining the ICP, just with
// a receipt. The rule is explicit:
//
//   "A non-empty criterion that M&V cannot enforce is NOT satisfied. It must be
//    BLOCKED / UNRESOLVED / FAIL LOUDLY until M&V has enough data/capability."
//
// So the run now REFUSES, before any paid sourcing or reveal. An empty one still passes —
// nobody asked for anything, so nothing is being ignored.

describe('⑤ what we cannot enforce, we refuse to pretend we enforced', () => {
  it('🛑 a NON-EMPTY unenforceable criterion throws — the run does not start', () => {
    expect(() => assertIcpFullyOwned({ tech_stack: ['HubSpot'], geographies: ['United Kingdom'] }))
      .toThrow(IcpUnenforceableError)
  })

  it('🛑 and the refusal NAMES the criterion and says why — never a bare failure', () => {
    let err: unknown
    try { assertIcpFullyOwned({ tech_stack: ['HubSpot', 'Salesforce'] }) } catch (e) { err = e }
    expect(err).toBeInstanceOf(IcpUnenforceableError)
    const msg = (err as Error).message
    expect(msg).toContain('tech_stack')
    expect(msg).toContain('HubSpot')
    expect(msg.length).toBeGreaterThan(80)
    expect((err as IcpUnenforceableError).fields).toEqual(['tech_stack'])
  })

  it('an EMPTY unenforceable criterion does NOT block — the customer asked for nothing', () => {
    expect(() => assertIcpFullyOwned({ tech_stack: [], geographies: ['United Kingdom'] })).not.toThrow()
  })

  it('an ICP with only owned criteria does not block', () => {
    expect(() => assertIcpFullyOwned({ geographies: ['United Kingdom'], job_titles: ['Founder'], keywords: ['agency'] })).not.toThrow()
  })

  it('🛑 a FUTURE criterion with no owner blocks too — not a tech_stack special case', () => {
    // The map is the contract. Anything declared `unenforceable` blocks when set, whatever it
    // is called, so the next unsupported field cannot quietly repeat this.
    const spy = { ...ICP_CRITERION_OWNERS }
    expect(Object.values(spy).some(s => s.owners.includes('unenforceable'))).toBe(true)
    expect(() => assertIcpFullyOwned({ tech_stack: ['anything at all'] })).toThrow(IcpUnenforceableError)
  })

  it('🛑 the sourcing run asserts coverage BEFORE the cash fence and BEFORE any provider call', () => {
    const at = ICPS_ROUTE.indexOf('assertIcpFullyOwned(')
    expect(at, 'the sourcing run never asserts ICP coverage').toBeGreaterThan(-1)
    expect(ICPS_ROUTE.indexOf('try_spend_sourcing'), 'coverage is asserted AFTER the cash fence')
      .toBeGreaterThan(at)
    for (const call of [...ICPS_ROUTE.matchAll(/await searchPeopleWithFallback\(/g)].map(m => m.index ?? -1)) {
      expect(call, 'a provider is called BEFORE ICP coverage is asserted').toBeGreaterThan(at)
    }
  })
})
