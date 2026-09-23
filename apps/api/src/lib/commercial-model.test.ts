// ═══════════════════════════════════════════════════════════════════════════════════════
// PR C2 — THE COMMERCIAL MODEL, APPLIED
//
// 🛑 THE DEFECT, IN ONE LINE. `authorityFor(null)` returned `{ allowed: true, mode: 'legacy' }`,
// so the ABSENCE of a programme row was read as the positive assertion "this client is legacy".
// House and MBF are declared PROGRAMME clients with no programme open today, and that inference
// therefore opened, for both of them: the per-lead approve/reveal/batch routes at $4 a lead, the
// wallet gate on enrolment, the retired low-credit and zero-credit emails, legacy sourcing with
// real provider spend, legacy sending of historical enrolments, the $299 pack checkout, and a
// Vida panel that told the operator in plain words that they were on the legacy model.
//
// ⚠️ WHAT THIS FILE PROVES, AND WHAT IT DELIBERATELY DOES NOT. It proves the RESOLVER against
// executed code, and it proves that each consequential path CONSUMES it. The behaviour of each
// individual gate under refusal is proved where that gate lives — `legacy-per-lead-fence`,
// `house-authority`, `programme-paths`, `programme-closure` — and duplicating those here would
// be a second copy of a rule, which is the shape this repository keeps removing.
//
// ⚠️ AND THE COMPATIBILITY HALF IS ASSERTED AS HARD AS THE NEW HALF. A client whose
// `commercial_model` is NULL — which on the live book is every client — must behave EXACTLY as
// they did before this column existed. A change that fenced the whole book on Friday would be a
// far worse bug than the one it fixed.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

const state: {
  client: Row | null
  clientError: { message: string; code?: string } | null
  programme: Row | null
  programmeError: { message: string } | null
} = { client: null, clientError: null, programme: null, programmeError: null }

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'not', 'is', 'in', 'order', 'limit']) q[m] = () => q
      q.maybeSingle = async () => {
        if (table === 'clients')    return { data: state.client, error: state.clientError }
        if (table === 'programmes') return { data: state.programme, error: state.programmeError }
        return { data: null, error: null }
      }
      q.single = q.maybeSingle
      q.then = (r: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(r)
      return q
    },
  },
}))

import {
  clientCommercialModel, mayUseLegacyCommercialPath, isLegacyModel, isProgrammeModel,
  storedModelFor, commercialModelLabel, type CommercialModel,
} from './commercial-model'

const API = join(__dirname, '..')
const raw = (p: string) => readFileSync(join(API, p), 'utf8')
/**
 * Source with every comment removed, so a guard never matches its own prose.
 *
 * ⚠️ BLOCK COMMENTS TOO, and that is not tidiness. A line-only strip left the CONTINUATION
 * lines of `{/* … *\/}` blocks in place, and the `$4` sweep below then fired on a comment about
 * the book-wide cost model — a guard reporting prose as copy, which is the same failure C1's
 * reader allowlist already had.
 */
const strip = (s: string) => s
  .split('\n').filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') })
  .join('\n')

/**
 * The same, plus `{/* … *\/}` blocks — used ONLY for the Vida copy sweep below.
 *
 * ⚠️ IT IS NOT THE DEFAULT, and the reason is a defect this helper already caused once. Several
 * API files contain a `/*` inside a regex or a string with no matching close, so a global block
 * pass swallowed real code — it ate `routes/icps.ts`'s model resolution and the layout's own
 * query, turning six passing guards red for a reason that had nothing to do with the product.
 * ⚠️ AND BLOCKS ARE REMOVED FIRST, not second. Doing lines first leaves a JSDoc's OPENING `/**`
 * behind — the body and closing lines start with `*` and are filtered, the opener does not — so
 * the block pass then runs from an orphan opener to the next close and eats real code. Vida's
 * own comment blocks are balanced, which is why this order is safe for the one file it is used on.
 */
const stripAll = (s: string) => strip(s.replace(/\/\*[\s\S]*?\*\//g, ''))

const PROG = { id: 'p1', client_id: 'c1', status: 'LIVE' }

beforeEach(() => {
  state.client = { commercial_model: null }
  state.clientError = null
  state.programme = null
  state.programmeError = null
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE FIVE STATES — every one reached, and none of them is a boolean
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① the resolver returns five distinguishable answers', () => {
  it('🛑 NULL + no programme → compat_programme — THE LIVE BOOK IS ON THE PROGRAMME (R137)', async () => {
    // ⛓️ INVERTED 23 Sep (R137). Founder, verbatim: *"the 299/4 is retired/ this must go.
    // everything must be updated to new programme pricing model."*
    // ⛓️ WAS: `'NULL + no programme → compat_legacy — TODAY'S BEHAVIOUR FOR THE WHOLE LIVE BOOK'`,
    // asserting `compat_legacy` and "the live book keeps the legacy path". That path — a $4
    // charge per approved lead — is exactly what R137 retires, for every account.
    const m = await clientCommercialModel('c1')
    expect(m.model).toBe('compat_programme')
    expect(m.declared, 'nobody declared this — it must not claim they did').toBe(false)
    expect(m.openProgramme, 'no programme is open, and that is a normal waiting state').toBeNull()
    expect(isProgrammeModel(m), 'an unclassified client is a programme client now').toBe(true)
    expect(mayUseLegacyCommercialPath(m), 'the retired per-lead path is closed to the live book').toBe(false)
  })

  it('NULL + an open programme → compat_programme — also today\'s behaviour', async () => {
    state.programme = PROG
    const m = await clientCommercialModel('c1')
    expect(m.model).toBe('compat_programme')
    expect(m.openProgramme).toEqual(PROG)
    expect(mayUseLegacyCommercialPath(m)).toBe(false)
  })

  it('🛑 DECLARED programme + NO open programme → programme, NOT legacy — THIS IS HOUSE', async () => {
    state.client = { commercial_model: 'programme' }
    const m = await clientCommercialModel('c1')
    expect(m.model).toBe('programme')
    expect(m.declared).toBe(true)
    expect(m.openProgramme, 'no programme is open, and that is a normal waiting state').toBeNull()
    expect(mayUseLegacyCommercialPath(m), 'the whole point of C2').toBe(false)
  })

  it('DECLARED programme + an open programme → programme, carrying the row', async () => {
    state.client = { commercial_model: 'programme' }
    state.programme = PROG
    const m = await clientCommercialModel('c1')
    expect(m.model).toBe('programme')
    expect(m.openProgramme).toEqual(PROG)
  })

  it('🛑 a STORED legacy + no programme → programme economics — a stale word buys nothing (R137)', async () => {
    // ⛓️ INVERTED 23 Sep (R137). Founder, verbatim: *"the 299/4 is retired/ this must go.
    // everything must be updated to new programme pricing model."*
    // ⛓️ WAS: `'DECLARED legacy + no programme → legacy — declaring it must actually mean it'`,
    // asserting `legacy` and the per-lead path open. The model it declared no longer exists;
    // `20260923_all_clients_programme` rewrites the word, and until it runs the word opens nothing.
    state.client = { commercial_model: 'legacy' }
    const m = await clientCommercialModel('c1')
    expect(m.model).toBe('compat_programme')
    expect(m.declared, 'it is not DECLARED programme — the row still says otherwise').toBe(false)
    expect(isProgrammeModel(m)).toBe(true)
    expect(mayUseLegacyCommercialPath(m), 'declaring the retired model no longer means anything').toBe(false)
  })

  it('🛑 a STORED legacy + AN OPEN PROGRAMME → the programme, not a conflict (R137)', async () => {
    // ⛓️ INVERTED 23 Sep (R137). Founder, verbatim: *"the 299/4 is retired/ this must go.
    // everything must be updated to new programme pricing model."*
    // ⛓️ WAS: `'DECLARED legacy + AN OPEN PROGRAMME → unreadable, and the reason names both'`.
    // That refusal existed because choosing legacy could charge $4 to a client whose programme
    // was already paid for. With the legacy path gone there is no second truth to disagree with,
    // and refusing would only block a paying programme until the migration rewrites the word.
    // ⚠️ THE SAFETY PROPERTY IS KEPT — no charge, no per-lead path — it is simply no longer
    // reached by refusing everything.
    state.client = { commercial_model: 'legacy' }
    state.programme = PROG
    const m = await clientCommercialModel('c1')
    expect(m.model).toBe('compat_programme')
    expect(m.openProgramme).toEqual(PROG)
    expect(mayUseLegacyCommercialPath(m), 'still never the per-lead path').toBe(false)
    expect(isProgrammeModel(m), 'the paid programme governs').toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② FAIL-CLOSED — "we could not tell" is never a licence
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② every unreadable state refuses, and none of them resolves to legacy', () => {
  it('🛑 the client read FAILS → unreadable', async () => {
    state.clientError = { message: 'connection reset' }
    const m = await clientCommercialModel('c1')
    expect(m.model).toBe('unreadable')
    expect(mayUseLegacyCommercialPath(m)).toBe(false)
  })

  it('🛑 THE COLUMN DOES NOT EXIST (42703 / PGRST204) → unreadable, not "everybody is NULL"', async () => {
    // If C1's migration were somehow not applied, PostgREST rejects the select. Treating that
    // as "unclassified" would run the whole product on an inference again, on a schema that is
    // not what the code expects — the #599 lesson, at the read.
    state.clientError = { message: 'column clients.commercial_model does not exist', code: '42703' }
    const m = await clientCommercialModel('c1')
    expect(m.model).toBe('unreadable')
  })

  it('🛑 the client ROW DOES NOT EXIST → unreadable, not defaulted', async () => {
    state.client = null
    const m = await clientCommercialModel('c1')
    expect(m.model).toBe('unreadable')
    expect(m.model === 'unreadable' && m.reason).toBe('no such client')
  })

  it('🛑 the PROGRAMME read fails → unreadable (openProgrammeFor throws, and that is honoured)', async () => {
    state.programmeError = { message: 'timeout' }
    const m = await clientCommercialModel('c1')
    expect(m.model).toBe('unreadable')
    expect(m.model === 'unreadable' && m.reason).toContain('programme read failed')
  })

  it('🛑 an UNRECOGNISED stored value → unreadable, never guessed at', async () => {
    // The CHECK constraint makes this unreachable through the database. It is handled anyway:
    // an unexpected value is exactly the case where guessing is worst.
    state.client = { commercial_model: 'enterprise' }
    const m = await clientCommercialModel('c1')
    expect(m.model).toBe('unreadable')
    expect(m.model === 'unreadable' && m.reason).toContain('enterprise')
  })

  // ── 🛑 A MISSING FIELD IS NOT A NULL ───────────────────────────────────────────
  //
  // Founder-ruled 3 Sep. `commercial_model: null` is an explicit database value meaning
  // UNCLASSIFIED; `undefined` means the key was not in the row at all. They were sharing one
  // branch through `raw ?? null`, so a row that never carried the field resolved to
  // `compat_legacy` and opened the per-lead paths — the C2 defect at the innermost point.
  //
  // ⚠️ "PostgREST would never do that" IS NOT THE ARGUMENT. It is true of the client we use today
  // and stops being true the day anything else calls this function. The safe rule lives in the
  // canonical resolver, not in an assumption about one driver.
  it('🛑 A ROW WITH NO commercial_model FIELD → unreadable, NOT compat_legacy', async () => {
    state.client = {}                       // the key is absent, not null
    const m = await clientCommercialModel('c1')
    expect(m.model, 'a missing field must never resolve to the compatibility model').toBe('unreadable')
    expect(m.model === 'unreadable' && m.reason).toContain('missing field is not a NULL')
    expect(mayUseLegacyCommercialPath(m), 'and it must not open the legacy paths').toBe(false)
  })

  it('🛑 A ROW WITH NO FIELD **AND AN OPEN PROGRAMME** → unreadable, NOT compat_programme', async () => {
    // The other half: absence must not be resolved by whatever the programme table happens to
    // say either. Not knowing the declaration is not knowing, whichever way it would have landed.
    state.client = {}
    state.programme = PROG
    const m = await clientCommercialModel('c1')
    expect(m.model).toBe('unreadable')
    expect(isProgrammeModel(m), 'it is not programme either — it is nothing').toBe(false)
    expect(isLegacyModel(m)).toBe(false)
  })

  it('⚠️ NON-VACUOUS: an EXPLICIT null on the same fixture is still compat, unchanged', async () => {
    // Without this pair the two assertions above would pass against a resolver that refused
    // every client — which on Friday would fence the entire live book.
    // ⛓️ 23 Sep (R137): the first expectation WAS `compat_legacy`; NULL resolves to programme now.
    state.client = { commercial_model: null }
    expect((await clientCommercialModel('c1')).model).toBe('compat_programme')
    state.programme = PROG
    expect((await clientCommercialModel('c1')).model).toBe('compat_programme')
  })

  it('🛑 CONSEQUENTIAL AUTHORITY REFUSES ON THE MISSING FIELD — proved through the real fence', async () => {
    // The resolution is only worth what the gates do with it. `checkLegacyPerLeadAuthority` is
    // the one that charges $4, so it is the one asked here.
    state.client = {}
    const { checkLegacyPerLeadAuthority } = await import('./programme-authority')
    const v = await checkLegacyPerLeadAuthority('c1')
    expect(v.allowed, 'a missing field must not authorise a charge').toBe(false)
    expect(!v.allowed && v.code).toBe('programme_unresolvable')
  })

  it('an EMPTY client id refuses without touching the database', async () => {
    const m = await clientCommercialModel('')
    expect(m.model).toBe('unreadable')
  })

  it('⚠️ NON-VACUOUS: the same fixture with a clean read RESOLVES — to programme', async () => {
    // Without this, every assertion above would pass against a resolver that refused always.
    // ⛓️ 23 Sep (R137) — WAS `'…with a clean read is ALLOWED'`, asserting the per-lead path
    // opened. What distinguishes a clean read from a refusal is now that it RESOLVES (to
    // programme); the per-lead path stays shut either way.
    const m = await clientCommercialModel('c1')
    expect(m.model).not.toBe('unreadable')
    expect(isProgrammeModel(m)).toBe(true)
    expect(mayUseLegacyCommercialPath(m)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ THE PREDICATES ARE TOTAL, AND THEY DISAGREE IN THE RIGHT PLACES
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ isLegacy / isProgramme / mayUseLegacy / storedModelFor', () => {
  const ALL: CommercialModel[] = [
    { model: 'programme', declared: true, openProgramme: null },
    { model: 'programme', declared: true, openProgramme: PROG as never },
    { model: 'legacy', declared: true, openProgramme: null },
    { model: 'compat_programme', declared: false, openProgramme: PROG as never },
    { model: 'compat_legacy', declared: false, openProgramme: null },
    { model: 'unreadable', declared: false, openProgramme: null, reason: 'x' },
  ]

  it('🛑 NOTHING IS BOTH, AND UNREADABLE IS NEITHER', async () => {
    for (const m of ALL) {
      expect(isLegacyModel(m) && isProgrammeModel(m), `${m.model} cannot be both`).toBe(false)
    }
    const u = ALL[ALL.length - 1]
    expect(isLegacyModel(u)).toBe(false)
    expect(isProgrammeModel(u)).toBe(false)
  })

  it('mayUseLegacyCommercialPath is exactly isLegacyModel — the two must never drift', () => {
    for (const m of ALL) expect(mayUseLegacyCommercialPath(m)).toBe(isLegacyModel(m))
    // ⚠️ AND NONE OF THE SIX SAYS YES, asserted as a count so a re-opening is visible.
    // ⛓️ 23 Sep (R137) — WAS "EXACTLY TWO" (legacy and compat_legacy). Even a hand-built
    // legacy state opens nothing now: *"the 299/4 is retired/ this must go."*
    expect(ALL.filter(mayUseLegacyCommercialPath)).toHaveLength(0)
    expect(ALL.filter(isLegacyModel)).toHaveLength(0)
    // …and every state we could READ is programme; only "we could not tell" is not.
    expect(ALL.filter(isProgrammeModel)).toHaveLength(ALL.length - 1)
  })

  it('storedModelFor recovers the column value, and says "unknown" rather than "not set"', () => {
    expect(storedModelFor(ALL[0])).toBe('programme')
    expect(storedModelFor(ALL[2])).toBe('legacy')
    expect(storedModelFor(ALL[3]), 'unclassified').toBeNull()
    expect(storedModelFor(ALL[4]), 'unclassified').toBeNull()
    expect(storedModelFor(ALL[5]), 'a row we could not read is not a row that is empty').toBe('unknown')
  })

  it('every state has an operator label, and no two consequential ones read the same', () => {
    const labels = ALL.map(commercialModelLabel)
    expect(labels.every(l => l.length > 0)).toBe(true)
    // ⚠️ ALL SIX ARE DISTINCT, including the two `programme` entries — "Programme" and
    // "Programme client · no active programme" are different operational situations and an
    // operator who cannot tell them apart cannot act on either.
    expect(new Set(labels).size, 'a label that cannot distinguish two states cannot be acted on')
      .toBe(labels.length)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ EVERY CONSEQUENTIAL PATH ASKS — and asks BEFORE it spends
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ the resolver is consumed at every path that sources, sends, enrols or charges', () => {
  it('🛑 SOURCING — icps refuses before the pool is served and before any provider call', () => {
    const icps = strip(raw('routes/icps.ts'))
    const at = icps.indexOf('clientCommercialModel(clientId)')
    expect(at, 'the sourcing path must resolve the model').toBeGreaterThan(-1)
    expect(at, 'before the pool is served').toBeLessThan(icps.indexOf('await servePoolLeads('))
    // ⛓️ RE-AIMED 17 Sep (XC-13 / FD-6) — the sourcing gate is now
    // `try_reserve_programme_sourcing`, called DIRECTLY. `try_spend_sourcing` does two jobs
    // in one body — programme AUTHORITY, and a `sourcing_ledger` row at $0.28 a PDL record
    // — and under FD-6 the second is a fabricated cost: *"We are not paying for PDL."*
    // HOUSE-009 already split the two; this points the client path at the half House uses.
    // The INVARIANT asserted here is byte-identical; only the RPC's name changed.
    expect(at, 'before the sourcing reservation RPC').toBeLessThan(icps.indexOf('p_requested: pdlRemainder'))
    expect(at, 'before any paid provider is reached').toBeLessThan(icps.indexOf('searchPeople('))
    // ⚠️ AND THE TWO REFUSALS ACTUALLY THROW, rather than merely being mentioned.
    expect(icps).toMatch(/if \(model\.model === 'unreadable'\) \{[\s\S]{0,400}throw new ProgrammeAuthorityError/)
    expect(icps).toMatch(/if \(model\.model === 'programme' && !model\.openProgramme\) \{[\s\S]{0,500}throw new ProgrammeAuthorityError/)
  })

  it('🛑 ENROLMENT — figsy asks before the wallet gate, not after it', () => {
    const figsy = strip(raw('lib/figsy.ts'))
    const fn = figsy.slice(figsy.indexOf('export async function autoEnrollLead'))
    const model = fn.indexOf('clientCommercialModel(clientId)')
    const wallet = fn.indexOf('canEnroll(client?.figsy_credits_remaining)')
    expect(model).toBeGreaterThan(-1)
    expect(wallet).toBeGreaterThan(-1)
    expect(model, 'a programme client must never be told they have no credits').toBeLessThan(wallet)
    // ⚠️ AND THE REFUSAL RETURNS, rather than falling through to the gate below it.
    expect(fn.slice(model, wallet)).toMatch(/if \(!mayUseLegacyCommercialPath\(model\)\) \{[\s\S]{0,300}return\b/)
  })

  it('🛑 CHARGING — the $299 pack checkout refuses a non-legacy client before Stripe', () => {
    const stripe = strip(raw('routes/stripe.ts'))
    const fn = stripe.slice(stripe.indexOf("stripeRouter.post('/checkout'"))
    const model = fn.indexOf('mayUseLegacyCommercialPath(model)')
    expect(model).toBeGreaterThan(-1)
    expect(model, 'the refusal precedes the Stripe session').toBeLessThan(fn.indexOf('createWalletCheckoutSession('))
    // ⚠️ AND THE CONDITION IS THE BARE NEGATION, WITH A RETURN. Asserting only that the call
    // APPEARS would pass against `if (false && !mayUse…)` — a guard that is present, correctly
    // ordered, and does nothing. The literal shape and the return are what make it a fence.
    expect(fn.slice(model - 40)).toMatch(/if \(!mayUseLegacyCommercialPath\(model\)\) \{[\s\S]{0,800}return\b/)
  })

  it('🛑 SENDING — send-due selects nothing for a programme client with no programme', () => {
    const sd = strip(raw('lib/send-due.ts'))
    expect(sd).toContain('clientCommercialModel(')
    expect(sd).toMatch(/model\.model === 'programme' && !model\.openProgramme/)
    expect(sd).toContain("openProgrammeByClient.set(cid as string, '__none__')")
    expect(sd, 'and the filter must actually act on the marker')
      .toMatch(/if \(openId === '__none__'\) return false/)
    // ⚠️ THE LEGACY BRANCH IS STILL THERE. `openId == null` is a genuine legacy client and
    // still selects their work — the property a fix like this most easily destroys.
    expect(sd).toMatch(/if \(openId == null\) return true/)
  })

  it('🛑 THE LEGACY PER-LEAD PATHS — the fence asks the model, not the programme row', () => {
    const pa = strip(raw('lib/programme-authority.ts'))
    const fn = pa.slice(pa.indexOf('export async function checkLegacyPerLeadAuthority'))
    expect(fn).toContain('mayUseLegacyCommercialPath(model)')
    expect(fn, 'the old question must be gone from this function')
      .not.toContain('const open = await openProgrammeFor(clientId)')
  })

  it('🛑 THE RETIRED WALLET EMAILS — the fence reads the declared model too', () => {
    const pn = strip(raw('lib/programme-notifications.ts'))
    const fn = pn.slice(pn.indexOf('export async function programmeClientIds'))
    expect(fn).toContain("select('id, commercial_model')")
    expect(fn).toMatch(/commercial_model === 'programme'/)
    expect(fn, 'a failed model read fences nothing and reports null, never an empty set')
      .toMatch(/if \(modelErr\) \{[\s\S]{0,200}return null/)
  })

  it('🛑 THE ROOT — authorityFor no longer reads a missing programme as "legacy" unconditionally', () => {
    const pa = strip(raw('lib/programme-authority.ts'))
    const fn = pa.slice(pa.indexOf('export function authorityFor'), pa.indexOf('const p = programme'))
    expect(fn).toMatch(/if \(model\?\.model === 'unreadable'\)/)
    expect(fn).toMatch(/if \(model\?\.model === 'programme'\)/)
    // ⚠️ AND COMPATIBILITY SURVIVES IT. With no model supplied, or a NULL one, the answer is
    // still legacy — which is what keeps every existing pure call site meaning what it meant.
    expect(fn).toContain("return { allowed: true, mode: 'legacy', programme: null }")
    const legacyAt = fn.indexOf("return { allowed: true, mode: 'legacy'")
    expect(legacyAt, 'the legacy fallthrough is LAST — the refusals are the special cases')
      .toBeGreaterThan(fn.indexOf("if (model?.model === 'programme')"))
  })

  it('🛑 LOOKALIKE — refused before the RPC, before the provider, before any lead insert', () => {
    // ⛓️ 3 Sep — THE DOOR THAT WAS STILL OPEN AFTER THE FIRST C2 PASS. This route asked
    // `openProgrammeForClient` and refused only when a programme was OPEN, so House and MBF —
    // declared programme, no programme open — fell straight through. House skips the AR8 spend
    // fence entirely (Apollo is prepaid), so it reached the provider with NO gate at all.
    const look = strip(raw('routes/lookalike.ts'))
    const at = look.indexOf('clientCommercialModel(String(client_id))')
    expect(at, 'the route must resolve the commercial model').toBeGreaterThan(-1)
    expect(look, 'the old question must be gone')
      .not.toContain('const openProgramme = await openProgrammeForClient(String(client_id))')
    // ⛓️ RE-AIMED 17 Sep (FD-6) — this route now calls NO sourcing RPC at all, and no PDL.
    // `mayUseLegacyCommercialPath` refuses a programme client above, so the only client who
    // reaches the provider is legacy or unclassified and has no programme to reserve against;
    // the PDL money fence it used to call books a cost we no longer incur. The property this
    // case guards — the model is resolved BEFORE anything is spent, searched or written — is
    // unchanged, and the two remaining anchors are the ones that still exist.
    expect(look, 'the retired PDL money fence must be gone').not.toContain("db.rpc('try_spend_sourcing'")
    expect(look, 'and nothing here calls PDL any more').not.toContain('pdlSearchPeople')
    expect(at, 'before Apollo — the one provider')
      .toBeLessThan(look.indexOf('await searchPeople(searchBody)'))
    expect(at, 'before any lead is written').toBeLessThan(look.indexOf("from('leads')"))
    // ⚠️ THE CONDITION IS THE BARE NEGATION, WITH A RETURN — not merely a mention.
    expect(look.slice(at - 60)).toMatch(/if \(!mayUseLegacyCommercialPath\(model\)\) \{[\s\S]{0,1400}return res\.json/)
  })

  it('🛑 CAMPAIGN ACTIVATION — the one door consults the model, and every activating caller uses it', () => {
    const sw = strip(raw('lib/start-work.ts'))
    const fn = sw.slice(sw.indexOf('export async function ensureCampaignForIcp'))
    // ⚠️ THE GATE IS ON THE ACTIVATE PATH, and `checkProgrammeAuthority` is what C2 made
    // model-aware — so a declared programme client with no programme is refused here without
    // this file needing its own copy of the rule.
    expect(fn).toMatch(/if \(activate\) \{[\s\S]{0,2000}checkProgrammeAuthority\(clientId, 'OUTREACH'/)
    expect(fn, 'a refused verdict must return, not fall through to the insert')
      .toMatch(/if \(!verdict\.allowed\) \{[\s\S]{0,900}return \{ refused/)
    // ⚠️ AND THE GATE PRECEDES EVERY CAMPAIGN WRITE, including the wake of a paused row.
    const gateAt = fn.indexOf("checkProgrammeAuthority(clientId, 'OUTREACH'")
    expect(gateAt).toBeLessThan(fn.indexOf("status: 'active'"))
    expect(gateAt).toBeLessThan(fn.indexOf("update({ status: 'active' })"))

    // 🛑 EVERY PRODUCTION CALLER THAT ACTIVATES IS ACCOUNTED FOR. A new one that passes
    // `activate: true` is fine — it inherits the gate — but a new FILE reaching this function
    // is a door nobody reviewed, so the file list is pinned.
    const files = ['routes/icps.ts', 'routes/operator.ts', 'lib/programme-preparation.ts']
    for (const f of files) expect(strip(raw(f)), f).toContain('ensureCampaignForIcp')
  })

  it('🛑 SEND SELECTION AND SOURCING ARE ORTHOGONAL TO is_demo — the resolver decides both', () => {
    // 🛑 FOUNDER-LOCKED 3 Sep. Neither path has ever had a demo notion, and that is the property
    // worth pinning: a future "skip this for demos" would hand MBF the retired workflow back.
    for (const f of ['lib/send-due.ts', 'routes/lookalike.ts']) {
      const src = strip(raw(f))
      expect(src, `${f} must not branch on demo-ness`).not.toContain('isDemoClient')
      expect(src, `${f} must not branch on demo-ness`).not.toContain('is_demo')
    }
    // And in figsy, the ONLY thing demo still skips is the wallet — never the model question.
    const figsy = strip(raw('lib/figsy.ts'))
    const fn = figsy.slice(figsy.indexOf('export async function autoEnrollLead'))
    expect(fn).toMatch(/if \(!programmeFulfilment\) \{[\s\S]{0,600}mayUseLegacyCommercialPath/)
    expect(fn).toContain('if (!isDemo && !programmeFulfilment && !canEnroll(client?.figsy_credits_remaining))')
  })

  it('🛑 THE RETIRED /dashboard SHELL TEACHES A PROGRAMME CLIENT NOTHING — one rule, one place', () => {
    // ⛓️ 3 Sep — `middleware.ts` sends every signed-in client from /dashboard into /milla EXCEPT
    // three persona sub-trees (partner · developer · client-partner), and `(milla)/layout.tsx`
    // actively SENDS a seat holder there. So this shell is reachable, and it was rendering
    // "Low credits · Top up now", "Your wallet is empty … a flat $4 per approved lead",
    // "Add credits to continue" and a chip whose tooltip reads "$4 per approved lead".
    const LAYOUT = join(__dirname, '../../../../apps/portal/src/app/(dashboard)/layout.tsx')
    const layout = strip(readFileSync(LAYOUT, 'utf8'))
    expect(layout, 'the model is read once, in its own isolated query')
      .toMatch(/from\('clients'\)\.select\('commercial_model'\)/)
    // ⛓️ 22 Sep — WAS: `commercial_model !== 'programme'` ALONE, which is TRUE for a NULL
    // model — and this file's own note says NULL is "the entire live book". So retired
    // economics were the DEFAULT and the programme was the exception a client had to be
    // declared into. Founder-locked 22 Sep: *"the last thing i need is the 299 model stale in
    // the background of the portals."* Retired means retired: it renders only for a client
    // somebody has explicitly declared into a non-programme model.
    expect(layout, 'the programme comparison is gone').toMatch(/!== 'programme'/)
    expect(layout, 'a client with NO declared model is shown retired economics again')
      .toMatch(/declared !== null && declared !== 'programme'/)
    // ONE boolean, and every retired-economics element obeys it.
    for (const el of ['<TrialExpiredOverlay', '<LowCreditsNotice', '<KeepFigsyFundedNudge']) {
      const i = layout.indexOf(el)
      expect(i, el).toBeGreaterThan(-1)
      expect(layout.slice(Math.max(0, i - 90), i), `${el} must obey the one rule`)
        .toContain('retiredWalletChrome')
    }
    expect(layout, 'the slim header chip too').toMatch(/retiredWalletChrome && \(\s*<span/)
    expect(layout, 'and the sidebar is told').toContain('showWallet={retiredWalletChrome}')

    // ⚠️ AN UNREADABLE MODEL SUPPRESSES — the same direction as every other C2 decision.
    // ⛓️ 22 Sep — the read still fails into SUPPRESS; what changed is that suppress is now
    // also where an ABSENT model lands, so "we could not tell" and "nobody said" agree.
    expect(layout, 'an unreadable model no longer resolves to nothing').toMatch(/!modelErr/)
    expect(layout).toMatch(/catch \{ retiredWalletChrome = false \}/)

    // ⚠️ AND NOTHING IS REMOVED FOR A LEGACY CLIENT. The sidebar prop defaults to `true`, so
    // every unclassified client — the whole live book — sees the shell exactly as today.
    const side = strip(readFileSync(join(__dirname, '../../../../apps/portal/src/components/layout/Sidebar.tsx'), 'utf8'))
    expect(side).toContain('showWallet = true')
    expect(side, 'both chips and the label obey it').toSatisfy((x: string) => [...x.matchAll(/showWallet &&/g)].length === 3)
  })

  it('⚠️ NON-VACUOUS: every file above was actually loaded and is not a stub', () => {
    for (const f of ['routes/icps.ts', 'lib/figsy.ts', 'routes/stripe.ts', 'lib/send-due.ts',
                     'lib/programme-authority.ts', 'lib/programme-notifications.ts',
                     'routes/lookalike.ts', 'lib/start-work.ts']) {
      expect(raw(f).length, f).toBeGreaterThan(1000)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ THE MODEL IS DECLARED, NEVER INFERRED — the founder's exact wording
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑤ nothing anywhere infers the model from a name, an email or an env var', () => {
  it('🛑 the resolver reads ONE column and nothing else', () => {
    const cm = strip(raw('lib/commercial-model.ts'))
    for (const banned of ['company_name', 'HOUSE_CLIENT_ID', 'get-kind.com', 'process.env', 'is_demo', 'auth.admin']) {
      expect(cm, `the model must never be inferred from ${banned}`).not.toContain(banned)
    }
    expect(cm).toContain("select('commercial_model')")
  })

  it('🛑 IT IS NOT HOUSE IDENTITY, AND THE TWO ARE NEVER SUBSTITUTED', () => {
    // Founder-locked 3 Sep: "Commercial model determines programme vs legacy. House identity
    // determines House internal P1/P2 wording/authority." Conflating them would make every
    // internally-billed client a programme client by accident, or the reverse.
    expect(strip(raw('lib/commercial-model.ts')), 'the resolver must not reach for House identity')
      .not.toContain('isHouseClient')
    expect(strip(raw('lib/house-client.ts')), 'and House identity must not reach for the model')
      .not.toContain('commercial_model')
  })

  it('🛑 THE COLUMN IS NEVER BACKFILLED — no sweep, no default, no bulk write', () => {
    for (const f of ['routes/operator.ts', 'routes/auth.ts', 'lib/commercial-model.ts']) {
      const src = strip(raw(f))
      // A bulk write would have to name the column beside an `in(` or a filter-less update.
      expect(src, `${f} must not write the model to many rows at once`)
        .not.toMatch(/update\(\s*\{[^}]*commercial_model[^}]*\}\s*\)\s*\.in\(/)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑥ WHAT THE OPERATOR AND THE CUSTOMER ARE TOLD
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑥ no surface asserts the legacy model at a programme client any more', () => {
  const VIDA = join(__dirname, '../../../../apps/admin/src/app/vida/page.tsx')
  const vida = stripAll(readFileSync(VIDA, 'utf8'))

  it('🛑 VIDA no longer says "they are on the legacy model" because no programme row exists', () => {
    // The exact sentence that shipped: "No programme for this client. They are on the legacy
    // model ($299 pack · 100 included · $4 per approved lead)". It stated a commercial fact
    // inferred from an absence, to the one person who acts on it.
    expect(vida, 'the unconditional sentence must be gone')
      .not.toContain('No programme for this client. They are on the legacy model')
    // It is replaced by four branches, one per resolved state — and the ORDER is the point:
    // every legacy sentence is reached by NAMING a resolved state, and the fall-through is the
    // neutral one. It used to end on the UNCLASSIFIED sentence, which names the $299 pack and
    // the $4 price, so a response carrying no `commercial` block at all printed legacy
    // economics and pointed at a control that was not rendered.
    expect(vida).toMatch(/prog\.commercial\?\.resolved === 'programme'/)
    expect(vida).toMatch(/prog\.commercial\?\.resolved === 'legacy'/)
    expect(vida, 'an explicit database NULL keeps its own named branch')
      .toMatch(/prog\.commercial\?\.resolved === 'compat_legacy'/)
    const panel = vida.slice(vida.indexOf("prog.commercial?.resolved === 'programme'"))
      .slice(0, 1600)
    expect(panel, 'the last branch must claim nothing about money')
      .toMatch(/: 'No active programme, and the commercial model for this client could not be resolved\./)
    expect(panel.lastIndexOf('$299'), 'no $299 sentence may sit in the fall-through position')
      .toBeLessThan(panel.indexOf('could not be resolved'))
    // ⚠️ AND THE LEGACY SENTENCE STILL EXISTS for a client who IS legacy. Deleting it would
    // hide the truth from the accounts it is true for.
    expect(vida).toContain('$299 pack · 100 included · $4 per approved lead')
  })

  it('🛑 THE WALLET ON A PROGRAMME CLIENT IS LABELLED HISTORICAL AND INACTIVE', () => {
    // ⛓️ CORRECTED twice. First it stood unqualified; then "· not used", which the founder ruled
    // still ambiguous — it reads as a temporary state of a LIVE wallet rather than a closed one.
    // The balance is HISTORY on a programme account: a real number from a model they are no
    // longer on. The word order puts what kind of number it is first.
    expect(vida).toContain('historical wallet · inactive')
    expect(vida, 'the retired ambiguous wording must be gone').not.toContain("' · not used'")
    // 🛑 AN UNRESOLVED MODEL IS MUTED TOO. Caught on the first screenshot pass: the conflict
    // state rendered an ordinary purple balance beside a red panel saying nothing was authorised.
    expect(vida).toContain('wallet · model unresolved')
    // ⚠️ AND IT IS VISUALLY MUTED, not merely relabelled — the founder asked for both.
    expect(vida).toMatch(/muted \? 'font-semibold text-\[#a9a2bd\][^']*' : 'font-bold text-\[#7C3AED\]/)
    // ⚠️ NOTHING IS DELETED OR ZEROED. The real balance is still rendered, in full, in all FOUR
    // states — programme, unresolved, loading and legacy. The founder's rule is that history is
    // preserved, not hidden; what changes between them is one word of framing, never the number.
    expect([...vida.matchAll(/wallet_balance_usd \?\? 0\)\.toLocaleString\(\)/g)]).toHaveLength(4)
  })

  it('🛑 VIDA NEVER TELLS A PROGRAMME CLIENT THEY PAID $299, OR OWE $4', () => {
    // 🛑 FOUNDER-RULED 3 Sep: the flow rail ticked "✓ Paid $299" for a programme account — a
    // payment that does not exist in their commercial model — on the one row an operator reads
    // before every action. Every retired money sentence in this console now asks one derived
    // boolean, so they cannot drift apart from one another.
    // ⛓️ CORRECTED — it was ONE BOOLEAN, and a boolean has only one else. An UNREADABLE model
    // (a failed read, a missing row, or the declared-legacy-with-an-open-programme conflict)
    // therefore fell into the LEGACY arm of every sentence and was shown "Paid $299", the pack
    // quota and the $4 copy — the original C2 defect reproduced one level up. Three states now.
    // 🛑 THE DERIVATION IS POSITIVE AND EXHAUSTIVE — that is the whole correctness of it.
    // Founder-ruled: UNKNOWN MUST NEVER BE PRESENTED AS LEGACY. So `legacy` is reached only by a
    // resolved answer that actually says legacy, and every other state — loading, a failed read,
    // a missing field, unreadable, the conflict, and anything a future resolver adds — falls to a
    // neutral treatment. The earlier versions had it the other way round and swallowed, in turn,
    // the conflict, then loading and a response with no `commercial` block at all.
    expect(vida, 'four presentation states, and legacy is only ever reached positively')
      .toMatch(/const modelView: 'programme' \| 'legacy' \| 'unresolved' \| 'loading' =/)
    expect(vida).toMatch(/modelResolved === 'programme' \|\| modelResolved === 'compat_programme' \? 'programme'/)
    expect(vida).toMatch(/modelResolved === 'legacy'\s*\|\| modelResolved === 'compat_legacy'\s*\? 'legacy'/)
    expect(vida, 'still loading is its own label, and it is not legacy')
      .toMatch(/\(!prog && !progErr\) \? 'loading'/)
    expect(vida, 'and everything else — read failure, missing field, unreadable — is neutral')
      .toMatch(/: 'unresolved'/)
    // ⚠️ AND THE FALL-THROUGH IS NEVER LEGACY. A `: 'legacy'` at the end of that chain is exactly
    // the defect this was rewritten to remove, twice.
    const chain = vida.slice(vida.indexOf('const modelView:'), vida.indexOf('const programmeModel'))
    expect(chain, 'the default must not be legacy').not.toMatch(/:\s*'legacy'\s*$/m)
    expect(vida).toContain("const unresolvedModel = modelView === 'unresolved' || modelView === 'loading'")
    // ① the rail
    expect(vida).toContain("if (view === 'programme') return 'Programme'")
    expect(vida).toContain("if (view === 'unresolved') return 'Model unresolved'")
    expect(vida).toContain("if (view === 'loading') return 'Checking…'")
    expect(vida).toContain('flowStepLabel(n, label, selectedWork.funded_via, modelView)')
    // ② the message an operator TYPES TO THE CLIENT — the sharpest of them
    expect(vida).toMatch(/programmeModel\s*\?\s*'Quick nudge — your programme is ready/)
    // ③ the legacy pack quota — rendered ONLY for a resolved legacy client, never for a
    // programme one and never for one we could not resolve.
    expect(vida).toContain("selectedWork.pack.active && modelView === 'legacy'")
    // ④/⑤/⑥ the per-lead $4 sentences: approvals, the no-campaign notice, the two booking ones
    const four = [...vida.matchAll(/\$4/g)]
    expect(four.length, 'every remaining $4 sentence is model-aware').toBeGreaterThan(0)
    for (const m of four) {
      const before = vida.slice(Math.max(0, m.index! - 900), m.index!)
      expect(before, `a $4 sentence with no model branch above it: …${vida.slice(m.index! - 90, m.index! + 60)}`)
        .toMatch(/programmeModel|declared legacy|no commercial model has been declared/)
      // 🛑 AND A THIRD ARM ABOVE IT. A `programmeModel ? … : …` with no `unresolvedModel` arm
      // sends an unresolved account down the legacy branch, which is the defect this round
      // exists to close. The panel's own four-way copy is exempt: it names the states directly.
      const panelCopy = /declared legacy|no commercial model has been declared/.test(before)
      if (!panelCopy) {
        expect(before, `a $4 sentence with no unresolved arm: …${vida.slice(m.index! - 90, m.index! + 60)}`)
          .toMatch(/unresolvedModel/)
      }
    }
    // ⚠️ AND EVERY LEGACY SENTENCE SURVIVES FOR A LEGACY CLIENT. Deleting them would hide the
    // truth from the accounts they are true of — which is the same defect in the other direction.
    expect(vida).toContain('$299 pack · 100 included · $4 per approved lead')
    expect(vida).toContain("Their 👍 charges $4 and starts the work")
    expect(vida).toContain('the $4 is deliberately NOT charged while no campaign is active')
    expect(vida).toContain("via === 'comp' ? 'Comped' : label")
  })

  it('🛑 AN UNRESOLVED MODEL NEVER RENDERS LEGACY ECONOMICS — every sentence has a third arm', () => {
    // 🛑 FOUNDER-RULED 3 Sep: an unreadable model must not visually fall through to legacy
    // merely because `programmeModel` is false. Each site below is checked for a THIRD branch,
    // in the same order the operator meets them on screen.
    //
    // ⚠️ THE CHECK IS THAT THE MONEY CLAUSE IS DROPPED, not that new wording was invented. Every
    // unresolved sentence is a strict subset of the legacy one: it asserts nothing about what
    // this client paid, owes, or has left. Claiming nothing is the only safe thing to say when
    // the answer is that we could not tell.
    // ① the rail
    expect(vida).toContain("if (view === 'unresolved') return 'Model unresolved'")
    // ② the tick — neither a programme nor an unresolved account earns the green paid tick
    expect(vida).toContain('const progStep = n === 2 && (programmeModel || unresolvedModel)')
    // ③ the pack quota — legacy only
    expect(vida).toContain("selectedWork.pack.active && modelView === 'legacy'")
    // ④ the message typed TO THE CLIENT
    expect(vida).toMatch(/unresolvedModel\s*\?\s*'Quick nudge — we are ready to move as soon as you are\.'/)
    // ⑤ the approvals sentence — the price clause is gone, nothing false replaces it
    expect(vida).toContain("'Their 👍 starts the work — you don\u2019t assign anyone.'")
    // ⑥ the no-campaign notice
    expect(vida).toContain("'Approvals are blocked while no campaign is active.'")
    // ⑦ the two booking sentences
    expect(vida).toContain("'Marked a no-show.'")
    expect(vida).toContain("'Second attempt used. The client has been told.'")
    expect(vida).toContain("'Two attempts used — the client has been told.'")
    // ⑧ the wallet chip, which already had one — and now reads from the SAME derivation as the
    // rest of the console rather than asking `resolved === 'unreadable'` for itself. The two
    // copies had already drifted: a loading or field-missing response left the chip fully active
    // and purple while every other sentence on the screen had gone neutral.
    expect(vida).toContain('wallet · model unresolved')
    expect(vida).toContain('wallet · checking…')
    expect(vida).toContain("const programmeWallet  = modelView === 'programme'")
    expect(vida).toContain("const unresolvedWallet = modelView === 'unresolved'")
    expect(vida, 'the chip must not re-derive the model for itself')
      .not.toMatch(/const r = prog\?\.commercial\?\.resolved/)

    // 🛑 EVERY `programmeModel ?` TERNARY IN THIS FILE HAS AN `unresolvedModel` ARM. The sweep is
    // the guard: a NEW money sentence added with two branches instead of three fails here.
    const ternaries = [...vida.matchAll(/programmeModel\s*\n?\s*\?/g)]
    expect(ternaries.length, 'the model-aware sentences are still there').toBeGreaterThanOrEqual(5)
    for (const m of ternaries) {
      const after = vida.slice(m.index!, m.index! + 900)
      expect(after, `a programmeModel ternary with no unresolved arm: …${vida.slice(m.index!, m.index! + 120)}`)
        .toMatch(/unresolvedModel/)
    }
  })

  it('🛑 THE OPERATOR CONTROL SETS THE MODEL BY THE SELECTED CLIENT ID, WITH A CONFIRMATION', () => {
    expect(vida).toContain('setCommercialModel(selectedClient.id')
    expect(vida, 'the operator must confirm against a named client and a named target')
      .toMatch(/window\.confirm\([\s\S]{0,200}\$\{name\}[\s\S]{0,60}\$\{target\}/)
    expect(vida, 'and the surface reloads from the server rather than patching itself')
      .toMatch(/await loadProgramme\(clientId\)/)
    // ⛓️ 23 Sep (R137) — WAS: three targets ('programme', 'legacy', null), asserted present.
    // The API accepts only 'programme' now (founder: *"the 299/4 is retired/ this must go."*),
    // so the console offers only that — a button the route refuses is a promise it cannot keep.
    expect(vida).toContain("company_name || 'this client', 'programme')")
    for (const t of ["'legacy')", 'null)']) expect(vida).not.toContain(`company_name || 'this client', ${t}`)
    expect(vida).not.toContain('Set legacy')
    expect(vida).not.toContain('Unclassify')
  })

  it('🛑 THE RETIRED /dashboard BILLING PAGE IS FENCED FOR A PROGRAMME CLIENT', () => {
    const BILL = join(__dirname, '../../../../apps/portal/src/app/(dashboard)/dashboard/billing/page.tsx')
    const bill = strip(readFileSync(BILL, 'utf8'))
    expect(bill).toContain('if (!walletApplies) return (')
    expect(bill, 'the fence must precede every legacy money statement on the page')
      .toSatisfy((s: string) => s.indexOf('if (!walletApplies) return (') < s.indexOf('One wallet. $'))
    // ⚠️ AND ONLY FOR THEM. The default is `true`, so a legacy or unclassified client — and a
    // client served by an API that does not send the field — sees the page exactly as before.
    expect(bill).toContain('useState(true)')
    expect(bill).toContain('wallet_applies !== false')
  })

  it('the wallet endpoint is what tells them, and it still returns the real balance', () => {
    const credits = strip(raw('routes/credits.ts'))
    expect(credits).toContain('wallet_applies:      mayUseLegacyCommercialPath(model)')
    expect(credits, 'hiding a real stored balance would be lying in the other direction')
      .toContain('wallet_balance_usd:  Number(client.wallet_balance_usd ?? 0)')
  })
})
