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
const BOUNDARY_SRC = readFileSync(join(__dirname, './provider-boundary.ts'), 'utf8')

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

// ── ② IDENTITY IS **POSITIVELY** PROVED, OR THE RUN STOPS (founder-locked 7 Sep) ────────
//
// `audienceForClient` fails closed to `'client'`, and `'client'` selects PDL — so an auth
// blink moved House onto the clients' provider silently. `audienceForClientStrict` throws
// instead: for a sourcing run, "we could not tell who this is" must stop the run.
//
// ⛓️ AND THE FIRST VERSION OF THAT FIX WAS A PARTIAL PASS. It closed the FAILING lookup but
// still answered `'client'` for a lookup that SUCCEEDED and told us nothing, because it asked
// the wrong question: it resolved the SET of House user ids and then read a non-membership as
// "positively not House". An empty set, a truncated page or a permission-limited listing is
// indistinguishable from a genuine ordinary client under that test — so the run continued, on
// PDL, on an identity nobody had established. Founder ruling, 7 Sep:
//
//   "The strict sourcing path must NEVER turn an indeterminate identity result into `client`.
//    House must NEVER silently fall to PDL."
//
// THE SHAPE OF THE FIX: ask about THE USER, not about the set. `getUserById` returns that one
// identity or it does not, and the answer is read off the identity's own email — the thing
// House actually is (#593: identity is the auth user, never the company name). Non-membership
// is never again evidence of anything.
//
//   null user_id                                   → client   (resolved: a seat has no auth user)
//   user found, email === House                    → house
//   user found, email present and not House        → client   (positively identified)
//   user missing / no email / blank email / empty response
//                                                  → THROW
//   lookup errored / threw / timed out             → THROW
//
// ⚠️ A NULL `user_id` IS AN ANSWER, NOT AN AMBIGUITY, and getting that wrong cost 74 tests
// across 14 files on the first attempt. `20260612_company_engine.sql` DROPS the NOT NULL so
// a company seat can exist without its own auth user, and House is identified by auth EMAIL —
// so a row with no auth user is definitively not House. The fixtures were right; the rule was.
//
// RED PROOF for this pass — before the fix, every "indeterminate" case below RESOLVES to
// `'client'` instead of throwing, and the timeout case never settles at all.

describe('② identity is POSITIVELY proved, or the sourcing run stops', () => {
  /** A real, ordinary, positively-identified client. Not House, and not a blank. */
  const OTHER_EMAIL = 'someone@a-real-client.test'

  const mockDb = (impl: {
    row?: Record<string, unknown> | null
    rowErr?: boolean
    getUser?: (id: string) => Promise<unknown>
  }) => {
    vi.resetModules()
    vi.doMock('@kind/db', () => ({
      db: {
        from: () => {
          const q: Record<string, unknown> = {}
          for (const m of ['select', 'eq', 'order', 'limit']) q[m] = () => q
          q.maybeSingle = async () => impl.rowErr
            ? { data: null, error: { message: 'connection reset' } }
            : { data: impl.row === undefined ? { user_id: 'u1' } : impl.row, error: null }
          return q
        },
        auth: {
          admin: {
            getUserById: impl.getUser
              ?? (async () => ({ data: { user: { id: 'u1', email: OTHER_EMAIL } }, error: null })),
            listUsers: async () => ({ data: { users: [] }, error: null }),
          },
        },
      },
    }))
  }
  const asHouse = async () => ({ data: { user: { id: 'house-user', email: HOUSE_ACCOUNT_EMAIL } }, error: null })

  afterEach(() => { vi.doUnmock('@kind/db'); vi.resetModules() })

  // ── A/B/C — the three POSITIVE answers ───────────────────────────────────────────────

  it('A · a positively identified House user → house', async () => {
    mockDb({ row: { user_id: 'house-user' }, getUser: asHouse })
    const { audienceForClientStrict } = await import('./provider-boundary')
    await expect(audienceForClientStrict('house-client')).resolves.toBe('house')
  })

  it('A2 · House is matched on the auth EMAIL, case- and whitespace-insensitively', async () => {
    mockDb({
      row: { user_id: 'house-user' },
      getUser: async () => ({ data: { user: { email: `  ${HOUSE_ACCOUNT_EMAIL.toUpperCase()} ` } }, error: null }),
    })
    const { audienceForClientStrict } = await import('./provider-boundary')
    await expect(audienceForClientStrict('house-client')).resolves.toBe('house')
  })

  it('B · a positively identified NON-House user → client', async () => {
    mockDb({ row: { user_id: 'someone-else' } })
    const { audienceForClientStrict } = await import('./provider-boundary')
    await expect(audienceForClientStrict('c2')).resolves.toBe('client')
  })

  it('C · a NULL user_id — a seat row — → client, never an error', async () => {
    mockDb({ row: { user_id: null }, getUser: async () => { throw new Error('must never be asked') } })
    const { audienceForClientStrict } = await import('./provider-boundary')
    await expect(audienceForClientStrict('seat')).resolves.toBe('client')
  })

  it('C2 · and the schema really does allow it — pinned, not assumed', () => {
    const mig = readFileSync(join(__dirname, '../../../../supabase/migrations/20260612_company_engine.sql'), 'utf8')
    expect(mig, 'clients.user_id is no longer nullable — test C reasoning has changed')
      .toMatch(/alter\s+column\s+user_id\s+drop\s+not\s+null/i)
  })

  // ── D/E — the lookup FAILED ──────────────────────────────────────────────────────────

  it('D · the identity lookup THROWS → loud failure, never client', async () => {
    mockDb({ row: { user_id: 'u1' }, getUser: async () => { throw new Error('auth service unavailable') } })
    const { audienceForClientStrict, AudienceUnresolvedError } = await import('./provider-boundary')
    await expect(audienceForClientStrict('c1')).rejects.toBeInstanceOf(AudienceUnresolvedError)
  })

  it('E · the identity lookup returns an ERROR → loud failure, never client', async () => {
    mockDb({ row: { user_id: 'u1' }, getUser: async () => ({ data: null, error: { message: 'permission denied' } }) })
    const { audienceForClientStrict, AudienceUnresolvedError } = await import('./provider-boundary')
    await expect(audienceForClientStrict('c1')).rejects.toBeInstanceOf(AudienceUnresolvedError)
  })

  it('E2 · the identity lookup HANGS → it times out and throws, it does not wait forever', async () => {
    // Founder rule 5: "Timeout → THROW / FAIL LOUDLY". A hang is worse than a wrong answer on
    // this path — the run neither proceeds nor reports. The bound is the resolver's own.
    mockDb({ row: { user_id: 'u1' }, getUser: () => new Promise(() => {}) })
    const { audienceForClientStrict, AudienceUnresolvedError } = await import('./provider-boundary')
    await expect(audienceForClientStrict('c1', { timeoutMs: 25 })).rejects.toBeInstanceOf(AudienceUnresolvedError)
  })

  it('E3 · and the PRODUCTION bound is real and finite — not a test-only courtesy', async () => {
    mockDb({})
    const { IDENTITY_LOOKUP_TIMEOUT_MS } = await import('./provider-boundary')
    expect(IDENTITY_LOOKUP_TIMEOUT_MS).toBeGreaterThan(0)
    expect(IDENTITY_LOOKUP_TIMEOUT_MS).toBeLessThanOrEqual(60_000)
  })

  it('E4 · the CLIENT lookup errors → loud failure', async () => {
    mockDb({ rowErr: true })
    const { audienceForClientStrict, AudienceUnresolvedError } = await import('./provider-boundary')
    await expect(audienceForClientStrict('c1')).rejects.toBeInstanceOf(AudienceUnresolvedError)
  })

  it('E5 · no client row at all → loud failure', async () => {
    mockDb({ row: null })
    const { audienceForClientStrict, AudienceUnresolvedError } = await import('./provider-boundary')
    await expect(audienceForClientStrict('ghost')).rejects.toBeInstanceOf(AudienceUnresolvedError)
  })

  // ── F — THE HOLE THIS TASK EXISTS TO CLOSE ───────────────────────────────────────────
  //
  // Every case here is a lookup that SUCCEEDED — no error, no throw — and still did not
  // establish who this is. Each one used to answer `'client'`, and `'client'` means PDL.

  it('F1 · a successful lookup that returns NO USER → throws, never client', async () => {
    mockDb({ row: { user_id: 'u1' }, getUser: async () => ({ data: { user: null }, error: null }) })
    const { audienceForClientStrict, AudienceUnresolvedError } = await import('./provider-boundary')
    await expect(audienceForClientStrict('c1')).rejects.toBeInstanceOf(AudienceUnresolvedError)
  })

  it('F2 · a user that came back with NO EMAIL FIELD AT ALL → throws, never client', async () => {
    // A MISSING FIELD IS NOT A NULL, and it is certainly not "not House" — House IS the email,
    // so a record without one cannot answer the question in either direction.
    mockDb({ row: { user_id: 'u1' }, getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) })
    const { audienceForClientStrict, AudienceUnresolvedError } = await import('./provider-boundary')
    await expect(audienceForClientStrict('c1')).rejects.toBeInstanceOf(AudienceUnresolvedError)
  })

  it('F3 · a user whose email is BLANK / whitespace → throws, never client', async () => {
    mockDb({ row: { user_id: 'u1' }, getUser: async () => ({ data: { user: { id: 'u1', email: '   ' } }, error: null }) })
    const { audienceForClientStrict, AudienceUnresolvedError } = await import('./provider-boundary')
    await expect(audienceForClientStrict('c1')).rejects.toBeInstanceOf(AudienceUnresolvedError)
  })

  it('F4 · a successful call with an EMPTY response shape → throws, never client', async () => {
    mockDb({ row: { user_id: 'u1' }, getUser: async () => ({ data: null, error: null }) })
    const { audienceForClientStrict, AudienceUnresolvedError } = await import('./provider-boundary')
    await expect(audienceForClientStrict('c1')).rejects.toBeInstanceOf(AudienceUnresolvedError)
  })

  it('F5 · a call that resolves to nothing at all → throws, never client', async () => {
    mockDb({ row: { user_id: 'u1' }, getUser: async () => undefined })
    const { audienceForClientStrict, AudienceUnresolvedError } = await import('./provider-boundary')
    await expect(audienceForClientStrict('c1')).rejects.toBeInstanceOf(AudienceUnresolvedError)
  })

  it('F6 · the error SAYS the identity was indeterminate — a silent stop is not loud', async () => {
    mockDb({ row: { user_id: 'u1' }, getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) })
    const { audienceForClientStrict } = await import('./provider-boundary')
    const err = await audienceForClientStrict('c1').catch((e: Error) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toMatch(/nothing was searched, reserved or spent/)
  })

  // ── G — TEETH. The hole was a QUESTION ABOUT A SET; asking it again reopens it. ───────

  it('G · the strict path identifies the user POSITIVELY — it never infers from an absence', () => {
    // ⛓️ THIS IS THE GUARD ON THE ACTUAL DEFECT. The partial fix answered `'client'` whenever
    // `houseUserIds.has(user_id)` was false — which is true both for a real ordinary client and
    // for a listing that simply returned nothing. Reintroducing that shape is what this catches.
    const src = code(BOUNDARY_SRC)
    const start = src.indexOf('export async function audienceForClientStrict')
    expect(start, 'audienceForClientStrict no longer exists').toBeGreaterThan(-1)
    const rest = src.slice(start + 1)
    const body = rest.slice(0, rest.indexOf('\nexport ') > -1 ? rest.indexOf('\nexport ') : rest.length)

    expect(body, 'the strict path no longer resolves the identity itself')
      .toMatch(/auth\.admin\.getUserById/)
    expect(body, 'the strict path is back to inferring "not house" from a set that may be empty')
      .not.toMatch(/\.has\(/)
    expect(body, 'the strict path is back to resolving the HOUSE SET instead of THIS user')
      .not.toMatch(/resolveHouseUserIds/)
    expect(body, 'the House decision is no longer made on the identity\'s own email')
      .toMatch(/HOUSE_ACCOUNT_EMAIL/)
  })

  it('G2 · and the only two ways out of the strict path are a PROVED audience or a throw', () => {
    const src = code(BOUNDARY_SRC)
    const start = src.indexOf('export async function audienceForClientStrict')
    const rest = src.slice(start + 1)
    const body = rest.slice(0, rest.indexOf('\nexport ') > -1 ? rest.indexOf('\nexport ') : rest.length)
    // Exactly three: the NULL-user_id seat, and the two arms of the email comparison.
    const clientReturns = [...body.matchAll(/return\s+'client'/g)].length
    expect(clientReturns, 'a new unproved path now answers "client" — that is the hole reopening').toBe(1)
    expect(body, 'the House/non-House answer is no longer a single decided expression')
      .toMatch(/return email === HOUSE_ACCOUNT_EMAIL \? 'house' : 'client'/)
  })

  // ── L — ORDERING: identity is settled BEFORE money and BEFORE any provider ───────────

  it('L · a failure THROWS, so it cannot reach the fence or a provider — it never returns', async () => {
    mockDb({ row: { user_id: 'u1' }, getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) })
    const { audienceForClientStrict } = await import('./provider-boundary')
    const result = await audienceForClientStrict('c1').then(() => 'RETURNED', () => 'THREW')
    expect(result).toBe('THREW')

    const c = code(ICPS_SRC)
    const at = c.indexOf('const audience = await audienceForClientStrict(clientId)')
    expect(at, 'the sourcing run no longer resolves the audience strictly').toBeGreaterThan(-1)
    expect(c.indexOf('try_spend_sourcing'), 'the cash fence now runs BEFORE the audience is proved')
      .toBeGreaterThan(at)
    // ⚠️ THE CALL, NOT THE IMPORT. `indexOf('searchPeopleWithFallback')` finds line 7 — the
    // import — which sits above everything and would fail this assertion no matter what the
    // ordering actually is. Every provider CALL passes the resolved `audience` through, so
    // that is the shape to look for.
    const calls = [...c.matchAll(/await searchPeopleWithFallback\(/g)].map(m => m.index ?? -1)
    expect(calls.length, 'the sourcing run no longer calls the provider search').toBeGreaterThan(0)
    for (const call of calls) {
      expect(call, 'a provider is now called BEFORE the audience is proved').toBeGreaterThan(at)
    }
  })

  it('9 · the PERMISSIVE resolver is untouched for every other caller', async () => {
    mockDb({ rowErr: true })
    const { audienceForClient } = await import('./provider-boundary')
    await expect(audienceForClient('anything')).resolves.toBe('client')
  })

  it('9b · and it still fails OPEN on an indeterminate identity — deliberately not strict', async () => {
    // The two resolvers exist because the safe default differs by caller. An admin revenue page
    // must survive a blink; a sourcing run must not. Proving they still DIFFER is the point.
    mockDb({ row: { user_id: 'u1' }, getUser: async () => ({ data: { user: null }, error: null }) })
    const { audienceForClient } = await import('./provider-boundary')
    await expect(audienceForClient('anything')).resolves.toBe('client')
  })
})

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
    // ⛓️ 7 Sep — RETARGETED, SAME FACT, WIDER SCOPE. This pinned the literal
    // `buildSearchBody(icp, page, { verifiedEmailOnly })`. Apollo caps a page at 100 records,
    // so a 250 batch is now a PAGED walk and the page argument is the loop's variable rather
    // than the caller's `page`. What must stay true is that the derived flag is handed to the
    // body builder at every call site — which is now stronger than before, because it rides
    // onto page 2 and page 3 as well. `apollo-search-contract.test.ts` proves that
    // behaviourally against a stubbed Apollo; this keeps the source-level guard.
    //
    // ⚠️ AND IT ASSERTS **EVERY** CALL, NOT "SOME CALL". A bare
    // `.toMatch(/buildSearchBody\(icp, \w+, \{ verifiedEmailOnly/)` passed while pass 1 had the
    // flag REMOVED, because passes 2 and 3 still carried it and one match is all a regex needs.
    // Proved by breaking it. The ladder's own body is extracted and every call inside it is
    // checked, so dropping the flag from any single pass goes red.
    const fnAt = APOLLO_CODE.indexOf('export async function searchPeopleWithFallback')
    expect(fnAt, 'the search ladder no longer exists').toBeGreaterThan(-1)
    const rest = APOLLO_CODE.slice(fnAt + 1)
    const ladder = rest.slice(0, rest.indexOf('\nexport ') > -1 ? rest.indexOf('\nexport ') : rest.length)
    const calls = [...ladder.matchAll(/buildSearchBody\(icp,[^)]*\)/g)].map(m => m[0])
    expect(calls.length, 'the ladder no longer builds a search body').toBeGreaterThan(0)
    for (const c of calls) {
      expect(c, `a search pass builds its body without the derived flag: ${c}`).toContain('verifiedEmailOnly')
    }
  })
})

// ── ⑤ VERIFIED-ONLY, AT THE RECORD — NOW ENFORCED IN TWO PLACES ───────────────────────
//
// ⛓️ RETARGETED 7 Sep, AFTER A 250 → 0 PRODUCTION RUN. This block used to assert one literal:
//
//     audience === 'house' && contact.email_status !== 'verified'      ← at insert
//
// That gate was correct about the RULE and wrong about the MOMENT. Apollo's People Search
// returns no `email_status` at all, so `undefined !== 'verified'` was true for all 250
// candidates and every one was rejected before the reveal that exists to supply the field.
//
// The rule did not weaken; it moved to where the fact exists, and SPLIT IN TWO:
//   · at search — reject a status we DO have and which is not `verified` (never an absent one)
//   · after the provider reveal — the hard gate, where an ABSENT status also fails
// Both are asserted below, and the second is what makes the House lock real.

describe('⑤ only a VERIFIED Apollo record becomes a House lead', () => {
  const ICPS_CODE = code(ICPS_SRC)
  const QUAL_CODE = code(readFileSync(join(__dirname, './icp-qualification.ts'), 'utf8'))
  const DELIVERY_CODE = code(DELIVERY_SRC)

  it('7-10 · the search-stage gate still tests `verified` exactly — on a status we HAVE', () => {
    expect(ICPS_CODE).toMatch(/audience === 'house' && statusKnown && contact\.email_status !== 'verified'/)
  })

  it('🛑 and it never rejects an ABSENT status — the exact 250 → 0 defect', () => {
    // `statusKnown` is what stops a field Apollo never sends from reading as a failed ICP.
    expect(ICPS_CODE).toMatch(/const statusKnown = typeof contact\.email_status === 'string'/)
  })

  it('🛑 the HARD gate lives after the reveal, and an absent status fails there', () => {
    expect(QUAL_CODE, 'the final gate no longer requires a verified status')
      .toMatch(/requireVerifiedBusinessEmail && facts\.emailStatus !== 'verified'/)
    expect(DELIVERY_CODE, "M&V's enrichment flow no longer applies the final gate")
      .toMatch(/finalVerdict\(/)
  })

  it('8 · `likely_to_engage` is NOT accepted as verified for House, at either gate', () => {
    // The pre-existing `apollo_consented` flag treats both as contactable; the House gate is
    // a separate, stricter test and must not be written in terms of that flag.
    expect(ICPS_CODE).not.toMatch(/audience === 'house' &&[^\n]*likely_to_engage/)
    expect(QUAL_CODE).not.toMatch(/likely_to_engage/)
  })

  it('the search skip is still a counted rejection, like every other guard in that loop', () => {
    const at = ICPS_CODE.indexOf("audience === 'house' && statusKnown && contact.email_status !== 'verified'")
    expect(at).toBeGreaterThan(-1)
    expect(ICPS_CODE.slice(at, at + 200)).toMatch(/skipped\+\+/)
  })

  it('and a post-reveal refusal is counted too — a silent drop is how 250 became 0', () => {
    expect(DELIVERY_CODE).toMatch(/refusals\[verdict\.reason\]/)
    expect(DELIVERY_CODE).toMatch(/stage=qualification/)
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
