import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// WE DO NOT CREATE A CLIENT WE CANNOT SERVE. (S1-RT-006.)
//
// ── THE DEFECT, AND IT WAS WORSE THAN THE 503 ──────────────────────────────────────────
//
// `geographiesSchema` refuses a country outside `LAUNCH_SEND_COUNTRIES` — correctly: a
// country we cannot send to is a country we do not buy leads in. But it refused on
// `POST /icps`, the THIRD leg of promotion, and `/auth/onboard` had already created the
// canonical client row by then. A prospect who said "Brazil" got:
//
//     confirm ✓ → clients row CREATED → POST /icps → raw Zod 400
//
// A real person, now a canonical client, with no ICP, no targeting, an unsealed draft and a
// validation error on screen.
//
// ── AND IT IS NOT THE PROVIDER-TRANSLATION PROBLEM ─────────────────────────────────────
//
//   · "founder-led consultancy" not mapping onto sixteen Apollo industries is OUR problem —
//     fail soft, NEEDS ICP REVIEW, a human finishes it. (S1-RT-005.)
//   · "Brazil" when we do not operate in Brazil is a REAL COMMERCIAL LIMIT. No human can
//     translate it and no review can resolve it, so routing it to that queue would promise an
//     operator a job that does not exist.
//
// 🛑 THESE CASES EXECUTE. The two false passes found earlier in this batch were source pins
// that survived `if (false && ...)`, so the authority claims here are driven through the real
// `confirmBriefDraft` against a stateful double: the assertion is "no stamp was written",
// not "the file mentions a check".
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const store = vi.hoisted(() => ({
  drafts: [] as Row[],
  clients: [] as Row[],
  /** Every table written to. The no-client-created proof reads this. */
  writes: [] as string[],
}))

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = []
  const rows = () => (name === 'clients' ? store.clients : store.drafts)
  const q: Record<string, unknown> = {
    select() { return q },
    eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
    is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === v); return q },
    order() { return q }, limit() { return q },
    async maybeSingle() {
      const hit = rows().filter(r => filters.every(f => f(r)))
      return { data: hit[0] ?? null, error: null }
    },
    insert(row: Row) {
      store.writes.push(name)
      if (name === 'clients') store.clients.push({ id: 'client-new', ...row })
      return { select: () => ({ async single() { return { data: { id: 'client-new' }, error: null } } }) }
    },
    upsert(row: Row) {
      store.writes.push(name)
      return { select: () => ({ async maybeSingle() {
        const i = store.drafts.findIndex(r => r.user_id === row.user_id)
        const made = i >= 0 ? { ...store.drafts[i], ...row } : { id: 'draft-1', ...row }
        if (i >= 0) store.drafts[i] = made; else store.drafts.push(made)
        return { data: made, error: null }
      } }) }
    },
    update(patch: Row) {
      store.writes.push(name)
      const uf: ((r: Row) => boolean)[] = []
      const u: Record<string, unknown> = {
        eq(c: string, v: unknown) { uf.push(r => r[c] === v); return u },
        is(c: string, v: unknown) { uf.push(r => (r[c] ?? null) === v); return u },
        select() { return u },
        async maybeSingle() {
          const hit = rows().filter(r => uf.every(f => f(r)))
          if (!hit.length) return { data: null, error: null }
          Object.assign(hit[0], patch); return { data: hit[0], error: null }
        },
        then(resolve: (v: unknown) => unknown) {
          for (const r of rows().filter(x => uf.every(f => f(x)))) Object.assign(r, patch)
          return resolve({ error: null })
        },
      }
      return u
    },
    then(resolve: (v: unknown) => unknown) {
      return resolve({ data: rows().filter(r => filters.every(f => f(r))), error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))

import { confirmBriefDraft, briefDraftFor, saveBriefDraft } from './brief-draft'
import { splitGeographies, geographySupported, unsupportedGeographyAsk, supportedCountriesPhrase } from '@kind/shared'

/** The eleven facts, complete, with whatever geography the case is about. */
const ELEVEN = (geographies: string[]) => ({
  contact_name: 'Jacques', company_name: 'Redmayne Partners',
  website: 'https://redmayne.example', what_they_do: 'Outbound for B2B service businesses',
  target_category: 'Agencies and consultancies', geographies,
  target_company_type: 'agency', company_sizes: ['11–50'],
  job_titles: ['Founder'], seniority_levels: ['C-Suite'],
  exclusions: 'No recruitment agencies.', desired_outcome: 'Qualified conversations.',
  country: 'United Kingdom',
})

const seedDraft = (geographies: string[], over: Row = {}) => {
  store.drafts.push({
    id: 'draft-1', user_id: 'user-1', facts: ELEVEN(geographies), conversation: [],
    confirmed_at: null, promoted_client_id: null, promoted_at: null,
    created_at: '2026-09-14T08:00:00Z', updated_at: '2026-09-14T08:00:00Z', ...over,
  })
}

beforeEach(() => { store.drafts = []; store.clients = []; store.writes = [] })

// ═══════════════════════════════════════════════════════════════════════════════════════
// § A · THE SPLIT — natural language in, an honest answer out
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 § A · what they asked for, against where we can work', () => {
  it('supported markets pass, in the client\'s own spelling', () => {
    expect(splitGeographies(['United Kingdom', 'US'])).toEqual({ supported: ['United Kingdom', 'US'], unsupported: [] })
    expect(geographySupported(['UK', 'United States', 'South Africa'])).toBe(true)
  })

  it('🛑 an unsupported market is NAMED, never silently dropped', () => {
    expect(splitGeographies(['Brazil'])).toEqual({ supported: [], unsupported: ['Brazil'] })
  })

  it('🛑 THE MIXED CASE — "UK, US and Brazil" keeps both halves', () => {
    const split = splitGeographies(['UK', 'US', 'Brazil'])
    expect(split.supported).toEqual(['UK', 'US'])
    expect(split.unsupported, 'Brazil must not vanish').toEqual(['Brazil'])
    expect(geographySupported(['UK', 'US', 'Brazil']), 'a mix is NOT supported until they decide').toBe(false)
  })

  it('an empty or blank list is not an objection — that is the eleven-fact gate\'s question', () => {
    expect(geographySupported([])).toBe(true)
    expect(geographySupported(['  ', ''])).toBe(true)
    expect(geographySupported(null)).toBe(true)
  })

  it('🛑 the sentence is truthful, names what THEY said, and ASKS', () => {
    const ask = unsupportedGeographyAsk(splitGeographies(['Brazil']))
    expect(ask).toContain('Brazil')
    expect(ask).toContain(supportedCountriesPhrase())
    expect(ask).toMatch(/\?$/)
    // no jargon, no enum, no field name, no provider
    expect(ask).not.toMatch(/enum|LAUNCH_SEND|geograph(y|ies)|apollo|pdl|400|invalid/i)
  })

  it('🛑 and it NEVER proposes a replacement market', () => {
    const ask = unsupportedGeographyAsk(splitGeographies(['Brazil']))
    expect(ask).not.toMatch(/shall I use|instead\b|I['’]ve set|I have set/i)
  })

  it('🛑 the mixed sentence says what we CAN do and makes them choose', () => {
    const ask = unsupportedGeographyAsk(splitGeographies(['UK', 'US', 'Brazil']))
    expect(ask).toContain('Brazil')
    expect(ask).toContain('UK and US')
    expect(ask).toMatch(/would you like/i)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § B · THE GATE, EXECUTED — no client, no ICP, no welcome, no Proof, no provider
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 § B · an unsupported market cannot be confirmed', () => {
  it('supported geography confirms normally', async () => {
    seedDraft(['United Kingdom', 'United States'])
    const r = await confirmBriefDraft('user-1')
    expect(r.ok).toBe(true)
    expect((await briefDraftFor('user-1'))?.confirmedAt).toBeTruthy()
  })

  it('🛑 UNSUPPORTED geography is REFUSED — and the refusal is recoverable, not an error', async () => {
    seedDraft(['Brazil'])
    const r = await confirmBriefDraft('user-1')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe('unsupported_geography')
      expect(r.reason === 'unsupported_geography' && r.unsupported).toEqual(['Brazil'])
      expect(r.reason === 'unsupported_geography' && r.ask).toContain('Brazil')
    }
  })

  it('🛑 NO CONFIRMATION STAMP IS WRITTEN — which is what blocks everything downstream', async () => {
    seedDraft(['Brazil'])
    await confirmBriefDraft('user-1')
    const draft = await briefDraftFor('user-1')
    expect(draft?.confirmedAt, 'an unconfirmed draft is what /auth/onboard refuses').toBeNull()
  })

  it('🛑 NO CLIENT ROW EXISTS — the whole point of moving the gate here', async () => {
    seedDraft(['Brazil'])
    await confirmBriefDraft('user-1')
    expect(store.clients, 'we do not create a client we cannot serve').toEqual([])
    expect(store.writes, 'a refusal writes nothing at all').toEqual([])
  })

  it('🛑 THE MIXED CASE IS REFUSED TOO — Brazil is not quietly dropped', async () => {
    seedDraft(['UK', 'US', 'Brazil'])
    const r = await confirmBriefDraft('user-1')
    expect(r.ok).toBe(false)
    if (!r.ok && r.reason === 'unsupported_geography') {
      expect(r.unsupported).toEqual(['Brazil'])
      expect(r.supported, 'what we CAN do travels with the refusal').toEqual(['UK', 'US'])
    }
    expect(store.clients).toEqual([])
  })

  it('🛑 the client\'s answers are NOT lost — the draft is untouched and still writable', async () => {
    seedDraft(['Brazil'])
    await confirmBriefDraft('user-1')
    const draft = await briefDraftFor('user-1')
    expect(draft?.facts.company_name).toBe('Redmayne Partners')
    expect(draft?.facts.geographies).toEqual(['Brazil'])
    expect(draft?.promotedClientId).toBeNull()
  })

  it('the incomplete-brief refusal still comes FIRST — geography is not a twelfth fact', async () => {
    store.drafts.push({
      id: 'draft-1', user_id: 'user-1', facts: { geographies: ['Brazil'] }, conversation: [],
      confirmed_at: null, promoted_client_id: null, promoted_at: null,
      created_at: 'x', updated_at: 'x',
    })
    const r = await confirmBriefDraft('user-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason, 'a short brief is short, whatever its geography').toBe('incomplete')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § C · REVISION — the client answers, and confirms
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 § C · the client revises conversationally and gets through', () => {
  it('🛑 a revised supported geography REPLACES the unsupported one and confirms', async () => {
    seedDraft(['UK', 'US', 'Brazil'])
    expect((await confirmBriefDraft('user-1')).ok).toBe(false)

    // "just the UK and US then" — Milla writes the revised fact, exactly as any other answer.
    const saved = await saveBriefDraft('user-1', { geographies: ['United Kingdom', 'United States'] })
    expect(saved.ok).toBe(true)

    const draft = await briefDraftFor('user-1')
    expect(draft?.facts.geographies, 'the revision REPLACES, it does not merge').toEqual(['United Kingdom', 'United States'])

    const again = await confirmBriefDraft('user-1')
    expect(again.ok, 'and now it confirms normally').toBe(true)
  })

  it('🛑 the revision PERSISTS across a re-read — refresh and re-entry keep it', async () => {
    seedDraft(['Brazil'])
    await confirmBriefDraft('user-1')
    await saveBriefDraft('user-1', { geographies: ['United Kingdom'] })
    // a fresh read, as a reloaded page or a new device would do
    const reread = await briefDraftFor('user-1')
    expect(reread?.facts.geographies).toEqual(['United Kingdom'])
    expect(reread?.facts.company_name, 'and every other answer survived with it').toBe('Redmayne Partners')
  })

  it('🛑 the UNRESOLVED state survives a re-read too — nothing is forgotten', async () => {
    seedDraft(['Brazil'])
    await confirmBriefDraft('user-1')
    const reread = await briefDraftFor('user-1')
    expect(reread?.facts.geographies, 'their unresolved request is still on the draft').toEqual(['Brazil'])
    expect(reread?.confirmedAt).toBeNull()
    // …and asking again gives the same recoverable answer, not a different one.
    const r = await confirmBriefDraft('user-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('unsupported_geography')
  })

  it('🛑 REPLAY after a successful confirm creates no duplicate and no second stamp', async () => {
    seedDraft(['United Kingdom'])
    const first = await confirmBriefDraft('user-1')
    expect(first.ok).toBe(true)
    const stamp = first.ok ? first.draft.confirmedAt : null
    const second = await confirmBriefDraft('user-1')
    expect(second.ok).toBe(true)
    expect(second.ok && second.draft.confirmedAt, 'the recorded moment of agreement must not move').toBe(stamp)
    expect(store.drafts).toHaveLength(1)
    expect(store.clients).toEqual([])
  })

  it('🛑 changing the brief after confirming UN-confirms it — the geography gate is re-asked', async () => {
    seedDraft(['United Kingdom'])
    expect((await confirmBriefDraft('user-1')).ok).toBe(true)
    // They come back and add Brazil. `saveBriefDraft` clears `confirmed_at` by design.
    await saveBriefDraft('user-1', { geographies: ['United Kingdom', 'Brazil'] })
    expect((await briefDraftFor('user-1'))?.confirmedAt).toBeNull()
    const r = await confirmBriefDraft('user-1')
    expect(r.ok, 'a confirmation cannot survive a change that breaks it').toBe(false)
    if (!r.ok) expect(r.reason).toBe('unsupported_geography')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § D · SERVER AUTHORITY AND THE TWO-MECHANISM SEPARATION
// ═══════════════════════════════════════════════════════════════════════════════════════
const API = join(__dirname, '..')
const AUTH = readFileSync(join(API, 'routes', 'auth.ts'), 'utf8')
const MILLA = readFileSync(join(API, 'routes', 'milla.ts'), 'utf8')
const ICPS = readFileSync(join(API, 'routes', 'icps.ts'), 'utf8')

describe('🛑 § D · the server is the authority, not the model', () => {
  it('🛑 /auth/onboard refuses an unsupported market even if a stamp already exists', () => {
    // A draft CONFIRMED BEFORE this build carries a stamp taken under the old rule. Without
    // this belt it would walk through the confirmed-check and create the client.
    expect(AUTH).toContain("code: 'unsupported_geography'")
    const at = AUTH.indexOf('const geoSplit = splitGeographies(draft.facts?.geographies)')
    expect(at, 'the belt must exist').toBeGreaterThan(-1)
    // …and it must sit ABOVE the client write.
    const insert = AUTH.indexOf('onboarded_at: now')
    expect(at, 'refusing after the client row is the defect').toBeLessThan(insert)
  })

  it('both doors use the SAME split and the SAME sentence — never a second country rule', () => {
    expect(AUTH).toContain('splitGeographies(draft.facts?.geographies)')
    expect(AUTH).toContain('unsupportedGeographyAsk(geoSplit)')
    const draftLib = readFileSync(join(API, 'lib', 'brief-draft.ts'), 'utf8')
    expect(draftLib).toContain('splitGeographies(read.draft.facts.geographies)')
    expect(draftLib).toContain('unsupportedGeographyAsk(geo)')
  })

  it('🛑 the confirm route returns a structured recoverable state, not a generic 400/503', () => {
    const at = MILLA.indexOf("if (r.reason === 'unsupported_geography')")
    expect(at).toBeGreaterThan(-1)
    const block = MILLA.slice(at, at + 500)
    expect(block).toContain('res.status(409)')
    expect(block).toContain("code: 'unsupported_geography'")
    expect(block).toContain('ask: r.ask')
    expect(block).toContain('unsupported: r.unsupported')
    expect(block).toContain('supported: r.supported')
  })

  it('🛑 NEEDS ICP REVIEW is NOT used for a market we do not operate in', () => {
    // Two different problems, two different mechanisms. A review nobody can resolve is a
    // queue that grows for ever, and it would promise an operator a job that does not exist.
    const draftLib = readFileSync(join(API, 'lib', 'brief-draft.ts'), 'utf8')
    expect(draftLib).not.toContain('icp_review')
    const geoLib = readFileSync(join(API, '..', '..', '..', 'packages', 'shared', 'src', 'geography-support.ts'), 'utf8')
    expect(geoLib).not.toContain('icpNeedsReview')
    // …and the review payload can only ever name the three PROVIDER fields.
    const trans = readFileSync(join(API, 'lib', 'icp-provider-translation.ts'), 'utf8')
    expect(trans).toContain("'industries' | 'seniority_levels' | 'company_sizes'")
    expect(trans).not.toContain('geograph')
  })

  it('🛑 the existing geography refusal on POST /icps is UNCHANGED — this adds a gate, it removes none', () => {
    expect(ICPS).toContain('if (!isLaunchSendCountry(g)) {')
    expect(ICPS).toContain('ctx.addIssue({ code: z.ZodIssueCode.custom, message: launchTargetRefusal(g) })')
  })

  it('Milla is told the real limit so she asks rather than walking them into it', () => {
    expect(ICPS).toContain('${supportedCountriesPhrase()}')
    expect(ICPS).toContain('NUMBER 6 HAS A REAL LIMIT')
  })

  it('🛑 the portal does not open an account on this refusal — it returns', () => {
    const P = readFileSync(join(API, '..', '..', 'portal', 'src', 'app', '(milla)', 'milla', 'welcome', 'page.tsx'), 'utf8')
    const at = P.indexOf("(e as { code?: string })?.code === 'unsupported_geography'")
    expect(at).toBeGreaterThan(-1)
    const block = P.slice(at, P.indexOf('const st = (e as { status?: number })?.status', at))
    expect(block).toContain('setSaving(false)')
    expect(block).toContain('return')
    expect(block, 'the refusal must not fall through to /auth/onboard').not.toContain('/auth/onboard')
    // Milla says it in her own thread.
    expect(block).toContain("role: 'assistant'")
  })
})
