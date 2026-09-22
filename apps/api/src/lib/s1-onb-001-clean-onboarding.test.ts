// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-ONB-001 — ONE MEMORY, ONE READINESS AUTHORITY, ONE PROGRESSION GATE.
//
// ── WHAT THIS REPLACES ─────────────────────────────────────────────────────────────────
//
// Readiness was decided in nine places that did not read the same thing, and the customer met
// the disagreement on screen: a finished targeting plan with a live "Confirm my brief" button
// above a line reading **"Based in — still needed"**. Three mechanisms made that possible:
//
//   ① the completion gate counted the eleven over `draft ∪ this model reply`, while
//      `mayConfirmBrief` counted them over the DRAFT ALONE — a narrower input, because
//      `saveBriefDraft` only ever received `brief_so_far` while `resolveBriefFacts` reads
//      `profile.*`, `business.*`, `icp.*` AND `brief_so_far`;
//   ② the client's own country was required by NOTHING on the server — `onboardSchema` needs
//      it, `clients.country` defaults to 'South Africa', and the only check lived in the
//      browser and ran AFTER the Confirm click;
//   ③ the portal gated the plan and the CTA on `proposed !== null`, which records that a
//      completion once arrived in this tab — not a fact check at all.
//
// ── THE SHAPE NOW ──────────────────────────────────────────────────────────────────────
//
//   model turn → resolve all four homes → PERSIST that into the draft → `onboardingState`
//   over persisted truth → conversing or ready → the portal obeys the server.
//
// ⚠️ EVERY BEHAVIOURAL TEST DRIVES THE REAL ROUTE. The Anthropic SDK is a double returning an
// exact tool payload; the schema, the gate, the prompt, the persist and the response are the
// live ones. The double counts its invocations and the count is asserted.
// ═══════════════════════════════════════════════════════════════════════════════════════

process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BRIEF_FACTS } from '@kind/shared'

/** ⚠️ IMPORTED LAZILY. `brief-draft.ts` pulls `@kind/db`, which refuses to load before the env
 *  assignment above — and ESM hoists static imports above it. */
const authority = () => import('./brief-draft')

/** Everything the eleven need, and nothing else. No country. */
const ELEVEN: Record<string, unknown> = {
  contact_name:        'Daniel Brooks',
  company_name:        'Cedar Peak Advisory',
  website_none:        true,
  what_they_do:        'helps B2B service businesses build a predictable new-business pipeline',
  target_category:     'founder-led agencies and consultancies',
  geographies:         ['United Kingdom', 'United States'],
  target_company_type: 'consultancy',
  company_sizes:       ['11-50'],
  job_titles:          ['Founder', 'CEO', 'Managing Director'],
  exclusions:          'no recruitment agencies, no software companies',
  desired_outcome:     'qualified new-business meetings',
}
/** The eleven plus the one account fact. This is READY. */
const READY_FACTS = { ...ELEVEN, country: 'United Kingdom' }

type Dispatched = {
  status: number; json: Record<string, unknown>; raw: string
  logs: string[]; prompts: string[]
  /** The draft as it stands AFTER the turn — the canonical record. */
  store: Record<string, unknown>
}

async function dispatch(
  modelInput: unknown,
  opts: { held?: Record<string, unknown>; userText?: string } = {},
): Promise<Dispatched> {
  vi.resetModules()
  const logs: string[] = []
  const prompts: string[] = []

  vi.doMock('@anthropic-ai/sdk', () => ({
    default: class {
      messages = {
        create: async (body: { system?: string }) => {
          prompts.push(String(body?.system ?? ''))
          return { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'milla_reply', input: modelInput }] }
        },
      }
    },
  }))
  vi.doMock('@kind/db', () => ({
    db: {
      from: () => { throw new Error('builder/chat must not touch the database directly') },
      rpc: async () => ({ data: null, error: null }),
    },
  }))
  vi.doMock('../middleware/auth', () => ({
    requireAuth: (req: { userId?: string }, _r: unknown, n: () => void) => {
      ;(req as { userId?: string }).userId = 'owner-user'; n()
    },
  }))
  // 🛑 A REAL MERGING STORE. "the resolution reaches the record" is a claim about state across
  // the write and the read-back, so the double merges exactly as `saveBriefDraft` does.
  const store: Record<string, unknown> = { ...(opts.held ?? {}) }
  vi.doMock('./brief-draft', async () => {
    const actual = await vi.importActual<typeof import('./brief-draft')>('./brief-draft')
    return {
      ...actual,
      saveBriefDraft: async (_u: string, facts: Record<string, unknown>) => {
        Object.assign(store, facts); return { ok: true }
      },
      briefDraftFor: async () => ({ confirmedAt: null, promotedClientId: null, facts: store }),
      writableBriefDraft: async () => ({ confirmedAt: null, promotedClientId: null, facts: store }),
      saveBriefConversation: async () => ({ ok: true }),
      rememberCustomerTurn: async () => ({ ok: true }),
      markBriefDraftPromoted: async () => ({ ok: true }),
    }
  })

  const err = console.error, log = console.log, warn = console.warn
  console.error = (...a: unknown[]) => { logs.push(a.map(String).join(' ')) }
  console.log = (...a: unknown[]) => { logs.push(a.map(String).join(' ')) }
  console.warn = (...a: unknown[]) => { logs.push(a.map(String).join(' ')) }
  try {
    const { icpRouter } = await import('../routes/icps')
    const express = (await import('express')).default
    const { createServer, request } = await import('http')
    const app = express(); app.use(express.json()); app.use('/icps', icpRouter)
    const server = createServer(app)
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
    const port = (server.address() as { port: number }).port
    try {
      const payload = JSON.stringify({
        messages: [{ role: 'user', content: opts.userText ?? 'Here is everything about us.' }],
        profile_required: true,
      })
      const out = await new Promise<{ status: number; json: Record<string, unknown>; raw: string }>((resolve, reject) => {
        const r = request({
          host: '127.0.0.1', port, path: '/icps/builder/chat', method: 'POST',
          headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(payload),
            authorization: 'Bearer t',
          },
        }, res => {
          let raw = ''
          res.on('data', c => { raw += c })
          res.on('end', () => {
            let json: Record<string, unknown> = {}
            try { json = JSON.parse(raw) } catch { json = { raw } }
            resolve({ status: res.statusCode ?? 0, json, raw })
          })
        })
        r.on('error', reject); r.write(payload); r.end()
      })
      return { ...out, logs, prompts, store }
    } finally { await new Promise<void>(r => server.close(() => r())) }
  } finally { console.error = err; console.log = log; console.warn = warn }
}

afterEach(() => {
  vi.doUnmock('@anthropic-ai/sdk'); vi.doUnmock('@kind/db')
  vi.doUnmock('../middleware/auth'); vi.doUnmock('./brief-draft')
  vi.resetModules()
})

/** A `complete` declaration carrying only what each test puts in it. */
const completeWith = (o: Record<string, unknown>) => ({
  type: 'complete', content: 'That is everything I need.',
  summary: 's', icp: { name: 'x' }, profile: {}, business: {}, brief_so_far: {}, ...o,
})
const typeOf = (d: Dispatched) => (d.json.data as { type?: string }).type
const outstandingOf = (d: Dispatched) =>
  (d.json.data as { brief_outstanding?: { remaining: number; total: number; next: { id: string; label: string } } })
    .brief_outstanding

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('Ⓐ the authority is pure, and it is the only definition of ready', () => {
  it('the eleven plus country → ready', async () => {
    const { onboardingState } = await authority()
    const s = onboardingState(READY_FACTS)
    expect(s.state).toBe('ready')
    expect(s.unresolvedTargeting).toEqual([])
    expect(s.unresolvedAccount).toEqual([])
    expect(s.unresolvedLabels).toEqual([])
  })

  it('the eleven WITHOUT country → conversing, and it says why', async () => {
    const { onboardingState } = await authority()
    const s = onboardingState(ELEVEN)
    expect(s.state, 'eleven facts alone are not enough to open an account').toBe('conversing')
    expect(s.unresolvedTargeting, 'every Brief fact is held').toEqual([])
    expect(s.unresolvedAccount).toEqual(['country'])
    expect(s.unresolvedLabels).toEqual(['Which country your business is based in'])
  })

  it('a missing Brief fact → conversing, in the canonical order', async () => {
    const { onboardingState } = await authority()
    const { exclusions: _drop, ...short } = READY_FACTS
    const s = onboardingState(short)
    expect(s.state).toBe('conversing')
    expect(s.unresolvedTargeting).toEqual(['exclusions'])
    expect(s.unresolvedLabels).toEqual(['Exclusions'])
  })

  it('targeting is listed before the account class, always', async () => {
    const { onboardingState } = await authority()
    const s = onboardingState({ contact_name: 'D' })
    expect(s.unresolvedLabels[s.unresolvedLabels.length - 1]).toBe('Which country your business is based in')
    expect(s.unresolvedLabels.length).toBe(10 + 1)
  })

  it('🛑 COUNTRY IS NOT A TWELFTH BRIEF FACT', async () => {
    const { onboardingState, ACCOUNT_FACTS } = await authority()
    expect(BRIEF_FACTS.length, 'the canonical count is eleven and stays eleven').toBe(11)
    expect([...BRIEF_FACTS]).not.toContain('country')
    expect([...ACCOUNT_FACTS]).toEqual(['country'])
    // And the denominator every surface reads is still eleven.
    expect(onboardingState(ELEVEN).targeting.total).toBe(11)
  })

  it('phone is optional and can never block readiness', async () => {
    const { onboardingState, ACCOUNT_FACTS } = await authority()
    expect(onboardingState(READY_FACTS).state).toBe('ready')
    expect(onboardingState({ ...READY_FACTS, phone: '' }).state).toBe('ready')
    expect([...ACCOUNT_FACTS]).not.toContain('phone')
  })

  it('mayConfirmBrief DELEGATES — same verdict, same input', async () => {
    const { mayConfirmBrief } = await authority()
    const asDraft = (facts: Record<string, unknown>) => ({ facts } as never)
    expect(mayConfirmBrief(asDraft(READY_FACTS)).ok).toBe(true)
    const gate = mayConfirmBrief(asDraft(ELEVEN))
    expect(gate.ok, 'a Brief with no country is NOT confirmable').toBe(false)
    expect(gate.missing, 'the eleven are all held, so the id list is empty').toEqual([])
    expect(gate.missingLabels, 'and the reason is still named').toEqual(['Which country your business is based in'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('Ⓑ the canonical record receives everything the gate counts', () => {
  it('facts given ONLY in profile.* are persisted', async () => {
    const r = await dispatch(completeWith({
      profile: { company_name: 'Cedar Peak Advisory', contact_name: 'Daniel Brooks', country: 'United Kingdom' },
    }))
    expect(r.store.company_name).toBe('Cedar Peak Advisory')
    expect(r.store.contact_name).toBe('Daniel Brooks')
    // 🛑 THE ONE THAT WAS SILENTLY LOST. The model routinely puts the country here alone, so
    // it reached the browser and the client row but NEVER the draft — which is why a refresh
    // lost it and the panel said "Based in — still needed" about an answer already given.
    expect(r.store.country, 'the account fact reaches the record').toBe('United Kingdom')
  })

  it('facts given ONLY in business.* are persisted', async () => {
    const r = await dispatch(completeWith({
      business: { product: 'B2B sales consultancy', bad_fit: 'no recruitment agencies' },
    }))
    expect(r.store.what_they_do).toBe('B2B sales consultancy')
    expect(r.store.exclusions).toBe('no recruitment agencies')
  })

  it('facts given ONLY in icp.* are persisted', async () => {
    const r = await dispatch(completeWith({
      icp: { name: 'x', target_category: 'agencies', geographies: ['United Kingdom'], company_sizes: ['11-50'], job_titles: ['Founder'] },
    }))
    expect(r.store.target_category).toBe('agencies')
    expect(r.store.geographies).toEqual(['United Kingdom'])
    expect(r.store.company_sizes).toEqual(['11-50'])
    expect(r.store.job_titles).toEqual(['Founder'])
  })

  it('🛑 BLANKS NEVER ERASE HELD TRUTH', async () => {
    const r = await dispatch({
      type: 'question', content: 'And who should we avoid?',
      profile: { company_name: '', country: '' },
      icp: { name: 'x', geographies: [], company_sizes: [] },
      business: { product: '' },
      brief_so_far: {},
    }, { held: READY_FACTS })
    expect(r.store.company_name).toBe('Cedar Peak Advisory')
    expect(r.store.country).toBe('United Kingdom')
    expect(r.store.geographies).toEqual(['United Kingdom', 'United States'])
    expect(r.store.what_they_do).toBe(READY_FACTS.what_they_do)
  })

  it('this turn’s brief_so_far still WINS over a value derived from another home', async () => {
    const r = await dispatch(completeWith({
      profile: { company_name: 'From Profile' },
      brief_so_far: { company_name: 'From Snapshot' },
    }))
    expect(r.store.company_name, 'the explicit snapshot is not overridden').toBe('From Snapshot')
  })

  it('a correction replaces prior truth', async () => {
    const r = await dispatch({
      type: 'question', content: 'Noted.',
      brief_so_far: { target_category: 'independent jewellers' },
    }, { held: READY_FACTS })
    expect(r.store.target_category).toBe('independent jewellers')
    expect(r.store.exclusions, 'and everything else survives').toBe(READY_FACTS.exclusions)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('Ⓒ the conversation continues until the system is genuinely ready', () => {
  it('everything in ONE natural message reaches ready', async () => {
    const r = await dispatch(completeWith({ brief_so_far: READY_FACTS }))
    expect(typeOf(r), 'a single complete turn is allowed to finish').toBe('complete')
    expect((r.json.data as { onboarding_state?: string }).onboarding_state).toBe('ready')
    expect(r.prompts, 'one model call for the turn').toHaveLength(1)
  })

  it('across several turns it stays CONVERSING until enough is held', async () => {
    const first = await dispatch({ type: 'question', content: 'And where are they?', brief_so_far: { contact_name: 'Daniel Brooks', company_name: 'Cedar Peak Advisory' } })
    expect(typeOf(first)).toBe('question')
    const second = await dispatch(completeWith({ brief_so_far: ELEVEN }), { held: first.store })
    expect(typeOf(second), 'eleven without country is not ready').toBe('outstanding')
    const third = await dispatch(completeWith({ brief_so_far: { country: 'United Kingdom' } }), { held: second.store })
    expect(typeOf(third), 'and the last missing thing finishes it').toBe('complete')
  })

  it('a DIFFERENT answer order reaches the same readiness', async () => {
    const a = await dispatch({ type: 'question', content: '?', brief_so_far: { country: 'United Kingdom', desired_outcome: READY_FACTS.desired_outcome } })
    const b = await dispatch(completeWith({ brief_so_far: ELEVEN }), { held: a.store })
    expect(typeOf(b), 'outcome and country first, the rest after').toBe('complete')
  })

  it('several facts in one answer are all persisted', async () => {
    const r = await dispatch({
      type: 'question', content: 'Got it.',
      brief_so_far: { target_category: 'agencies', geographies: ['United Kingdom'], company_sizes: ['11-50'] },
    })
    expect(r.store.target_category).toBe('agencies')
    expect(r.store.geographies).toEqual(['United Kingdom'])
    expect(r.store.company_sizes).toEqual(['11-50'])
  })

  it('🛑 THE MODEL SAYING "complete" CANNOT MANUFACTURE READY', async () => {
    const r = await dispatch(completeWith({ brief_so_far: ELEVEN }))
    expect(typeOf(r), 'the gate refuses; the safety net answers').toBe('outstanding')
    expect((r.json.data as { icp?: unknown }).icp, 'no plan is proposed').toBeUndefined()
    const o = outstandingOf(r)!
    expect(o.next.id).toBe('country')
    expect(o.next.label).toBe('Which country your business is based in')
    expect(o.total, 'the denominator stays eleven').toBe(11)
  })

  it('and the prompt asks for it naturally, from the same authority', async () => {
    const r = await dispatch(completeWith({ brief_so_far: {} }), { held: ELEVEN })
    const system = r.prompts[0]
    expect(system).toContain('WHAT IS STILL OUTSTANDING')
    expect(system).toContain('· Which country your business is based in')
    expect(system, 'one thing outstanding').toContain('the ONE thing')
    expect(system).toContain('DO NOT ASK FOR ANY OF THESE AGAIN')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// Ⓘ S1-ONB-002 — THE TWO CLASSES ARE COUNTED SEPARATELY, AND EVERY NUMBER IS TRUE.
//
// 🛑 WHAT THIS CLOSES. `remaining` was `unresolvedLabels.length`, which added the account class
// to the Brief class while `total` stayed at eleven. Two things followed, and neither was
// internal: the portal renders `remaining` VERBATIM, so an empty Brief was reported to the
// customer as **"12 things still needed"** about an eleven-fact Brief; and the portal derives
// operator progress as `total - remaining`, so a client holding **10 of 11** facts with no
// country was emailed to a human as **"9 of 11 facts held"**.
//
// ⚠️ READY, QUESTION ORDER, CONFIRMATION AND PROOF ARE UNTOUCHED BY THIS — `state` never read
// either number. The group below pins that too, so a future count change cannot leak into them.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('Ⓘ canonical Brief progress and account readiness are separate numbers', () => {
  it('① an EMPTY onboarding: eleven of eleven outstanding, country counted apart', async () => {
    const r = await dispatch(completeWith({ brief_so_far: {} }))
    const o = outstandingOf(r)!
    expect(o.total, 'the canonical denominator').toBe(11)
    expect(o.remaining, 'the canonical Brief facts ALONE — never 12').toBe(11)
    expect(o.account, 'the account class, counted separately').toBe(1)
    // 🛑 AND THE CUSTOMER CAN NEVER BE TOLD "12". The portal renders `remaining` verbatim.
    expect(o.remaining).toBeLessThanOrEqual(o.total)
  })

  it('② TEN of eleven + country missing → 10 of 11, and the account gap is its own', async () => {
    const { exclusions: _drop, ...tenPlusCountryMissing } = ELEVEN
    const r = await dispatch(completeWith({ brief_so_far: {} }), { held: tenPlusCountryMissing })
    const o = outstandingOf(r)!
    expect(o.remaining, 'one Brief fact outstanding').toBe(1)
    expect(o.total - o.remaining, 'operator progress: 10 of 11 — not 9').toBe(10)
    expect(o.account).toBe(1)
    expect(o.next.id, 'targeting is asked first, in the canonical order').toBe('exclusions')
  })

  it('③ ELEVEN of eleven + country missing → 11 of 11, conversing, and country is next', async () => {
    const r = await dispatch(completeWith({ brief_so_far: {} }), { held: ELEVEN })
    const o = outstandingOf(r)!
    expect(o.remaining, 'no Brief fact is outstanding').toBe(0)
    expect(o.total - o.remaining, 'operator progress: 11 of 11').toBe(11)
    expect(o.account).toBe(1)
    expect(o.next.id, 'the account fact is still what is asked for').toBe('country')
    // 🛑 AND THE NOTICE MUST NOT SAY "0 things still needed" WHILE ASKING FOR IT.
    expect(PORTAL).toContain('outstanding.remaining === 0')
    expect(PORTAL, 'a count of zero is never printed as a count').toContain("'Just one more thing'")
    // …and the state is still conversing: a count of 0 is not readiness.
    const { onboardingState } = await authority()
    expect(onboardingState(ELEVEN).state).toBe('conversing')
  })

  it('④ ELEVEN of eleven + country present → ready', async () => {
    const r = await dispatch(completeWith({ brief_so_far: {} }), { held: READY_FACTS })
    expect(typeOf(r)).toBe('complete')
    const { onboardingState } = await authority()
    expect(onboardingState(READY_FACTS).state).toBe('ready')
  })

  it('🛑 OPERATOR PROGRESS IS THE ELEVEN MINUS THE BRIEF GAP, AND NOTHING ELSE', () => {
    // ⛓️ This guard exists because mutation B did NOT go red without it: the API-level
    // assertions above prove the SHAPE, and nothing proved the portal's own arithmetic. The
    // count in the Get Help email is `total - remaining` — subtracting the account gap as well
    // is exactly the "9 of 11 for a client holding 10" defect, one layer further out.
    expect(PORTAL).toContain('setBriefProgress({ count: Math.max(0, o.total - o.remaining), total: o.total })')
    expect(PORTAL, 'the account class must never enter the progress arithmetic')
      .not.toMatch(/setBriefProgress\([^)]*o\.account/)
    // …and the sentence it feeds still reads out of the canonical denominator.
    expect(PORTAL).toContain('facts held')
  })

  it('🛑 NEITHER CLASS MAY BE FOLDED INTO THE OTHER, in the source', () => {
    expect(ICPS, 'the Brief count is the targeting class alone')
      .toContain('remaining: st.unresolvedTargeting.length')
    expect(ICPS, 'the combined label list is NOT a count')
      .not.toContain('remaining: st.unresolvedLabels.length')
    expect(ICPS, 'and the account class is its own number')
      .toContain('account:   st.unresolvedAccount.length')
  })

  it('🛑 AND THE COUNTS REACH NO AUTHORITY', async () => {
    const { onboardingState } = await authority()
    const ONB_SRC = readFileSync(join(process.cwd(), 'apps/api/src/lib/onboarding-state.ts'), 'utf8')
    // `state` is derived from completeness and the account class, never from any length
    // arithmetic against the denominator.
    expect(ONB_SRC).toContain("state: targeting.complete && unresolvedAccount.length === 0 ? 'ready' : 'conversing'")
    expect(ONB_SRC, 'no readiness verdict is derived from a subtraction').not.toMatch(/state:[^\n]*total\s*-/)
    // And the verdict is identical whichever way the counts land.
    expect(onboardingState(ELEVEN).state).toBe('conversing')
    expect(onboardingState({}).state).toBe('conversing')
    expect(onboardingState(READY_FACTS).state).toBe('ready')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
const ICPS   = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
const MILLA  = readFileSync(join(process.cwd(), 'apps/api/src/routes/milla.ts'), 'utf8')
const DRAFT  = readFileSync(join(process.cwd(), 'apps/api/src/lib/brief-draft.ts'), 'utf8')
/** The authority's own module — DB-free, so `routes/icps.ts` can import it statically. */
const ONB    = readFileSync(join(process.cwd(), 'apps/api/src/lib/onboarding-state.ts'), 'utf8')
const PORTAL = readFileSync(join(process.cwd(), 'apps/portal/src/app/(milla)/milla/welcome/page.tsx'), 'utf8')

describe('Ⓓ there is ONE readiness definition, and everything calls it', () => {
  it('every boundary calls onboardingState', () => {
    expect(ONB, 'defined once, in the DB-free module').toContain('export function onboardingState(')
    expect(ONB, '🛑 AND IT TOUCHES NO DATABASE — that is what makes it statically importable')
      .not.toContain('@kind/db')
    expect(DRAFT, 'brief-draft re-exports it rather than redefining it').toContain("} from './onboarding-state'")
    expect(DRAFT, 'mayConfirmBrief delegates').toMatch(/mayConfirmBrief[\s\S]{0,900}onboardingState\(/)
    expect(ICPS, 'the chat gate').toContain('onboardingState(draftFactsFromResolved(resolved))')
    expect(ICPS, 'the prompt block').toContain('onboardingState(draft.facts).unresolvedLabels')
    expect(MILLA, 'the portal boundary').toContain('onboardingState(draft?.facts ?? null)')
  })

  it('🛑 NO SECOND ELEVEN-FACT MAPPING, AND THE ROUTE CANNOT COUNT AT ALL', () => {
    // `briefFactsFor` is deleted: a route that cannot count cannot disagree about the count.
    expect(ICPS).not.toContain('function briefFactsFor')
    expect(ICPS, 'the route no longer counts the eleven itself').not.toContain('briefFacts({')
    // ⛓️ 22 Sep — the counter is still the shared one and is still called exactly once here;
    // it now receives a second argument (founder-locked: a fact answered in words we cannot
    // turn into a provider value is outstanding, so Milla asks again rather than the client
    // being stranded behind a review that blocks all sourcing). Asserted as the call and its
    // first argument, so a LOCAL count reappearing here still fails.
    expect(ONB, 'the counter is the shared one').toContain('briefDraftFacts(facts ?? null,')
    expect((ONB.match(/briefDraftFacts\(/g) ?? []).length,
      'onboarding-state counts the eleven more than once — a second call is a second answer')
      .toBe(1)
    expect(ONB, 'and no fact list lives here').not.toContain("'target_category'")
    expect(DRAFT, 'nor here').not.toContain("'target_category'")
  })

  it('🛑 THE SAME DRAFT PRODUCES THE SAME VERDICT AT EVERY BOUNDARY', async () => {
    const { onboardingState, mayConfirmBrief } = await authority()
    for (const [name, facts] of [
      ['ready',            READY_FACTS],
      ['country missing',  ELEVEN],
      ['a fact missing',   { ...READY_FACTS, exclusions: '' }],
      ['empty',            {}],
    ] as const) {
      const truth = onboardingState(facts as Record<string, unknown>)
      // ① the confirm boundary — `POST /milla/brief-draft/confirm` and `/auth/onboard`
      expect(mayConfirmBrief({ facts } as never).ok, `${name}: confirm boundary`).toBe(truth.state === 'ready')
      // ② and the sentence it refuses with names the SAME things, in the same order.
      expect(mayConfirmBrief({ facts } as never).missingLabels, `${name}: refusal names the gap`)
        .toEqual(truth.unresolvedLabels)
    }
  })

  it('🛑 AND THE BOUNDARIES READ THE AUTHORITY, NOT A COPY OF ITS ARITHMETIC', () => {
    // A boundary that re-derives `ready` from the eleven alone would agree with the authority
    // right up until an account fact is the only thing outstanding — which is exactly the
    // split this build closes. Each call site is pinned to the function, not to a count.
    expect(MILLA, 'the portal boundary').toContain('onboarding_state: onboarding.state')
    expect(MILLA, 'and never from the eleven-fact progress object')
      .not.toMatch(/onboarding_state:\s*progress\./)
    expect(MILLA, 'the confirm refusal names both classes').toContain('r.missingLabels')
    expect(DRAFT, 'and the confirm gate delegates').toMatch(/mayConfirmBrief[\s\S]{0,900}onboardingState\(/)
  })

  it('the portal holds no readiness authority of its own', () => {
    for (const forbidden of ['BRIEF_FACTS', 'briefFacts(', 'onboardingState', 'nextBriefFact', "'exclusions'"]) {
      expect(PORTAL, `the portal must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('🛑 THE BROWSER-LOCAL ACCOUNT CHECK IS GONE', () => {
    expect(PORTAL).not.toContain('which country your business is based in')
    expect(PORTAL).not.toContain('Before I can open your account I still need')
  })
})

describe('Ⓔ the portal gates on the server’s state, not on `proposed`', () => {
  it('the plan and the CTA require serverReady AND the plan content', () => {
    expect(PORTAL, 'the old gate is gone').not.toContain('{!proposed ? (')
    expect(PORTAL).toContain('{!(serverReady && proposed) ? (')
    // ⛓️ 22 Sep — WAS: *"and the step dots follow the same authority"*, pinning
    // ~~`stepDot(2, 'Your target', serverReady && proposed ? 'done' : 'on')`~~.
    //
    // 🛑 THE STEP DOTS NO LONGER EXIST. Welcome · Your target · Your plan · Go live was a
    // fifth stage vocabulary that predates MVP1; when the first run moved inside the portal
    // (founder-locked 22 Sep) it would have sat directly under the shell's FLOW ribbon — two
    // progress indicators, counting different things, on a client's first screen. The ribbon
    // reads the canonical six from `@kind/shared/mvp1-stage`, which is the same constant
    // Vida's reads.
    //
    // ⚠️ THE AUTHORITY RULE THIS ASSERTED IS UNTOUCHED AND STILL PROVEN ABOVE: the plan and
    // the CTA gate on `serverReady && proposed`, never on `proposed` alone. What is gone is a
    // second surface that had to be kept in step with it.
    expect(PORTAL, 'the retired four-step vocabulary is back on the first-run screen')
      .not.toContain('stepDot(')
  })

  it('serverReady comes only from the server, and a question turn closes it', () => {
    expect(PORTAL).toContain("setServerReady(d.type === 'complete' && d.onboarding_state === 'ready')")
    expect(PORTAL, 'a vetoed completion closes it too').toMatch(/type === 'outstanding'[\s\S]{0,700}setServerReady\(false\)/)
    expect(PORTAL, 'and a refresh takes it from the draft')
      .toContain("setServerReady(d.data?.onboarding_state === 'ready')")
  })

  it('refresh hydrates the cards from canonical facts — mapped SERVER-side', () => {
    // 🛑 THE MAPPING LIVES ON THE SERVER, and that is why the guard above can stay strict: the
    // portal never learns our fact vocabulary, it assigns finished render objects.
    expect(MILLA).toContain("country:      onboardingText('country')")
    expect(MILLA).toContain("bad_fit: onboardingText('exclusions')")
    expect(MILLA, 'and the state travels with them').toContain('onboarding_state: onboarding.state')
    expect(PORTAL, 'the portal only assigns what it is given').toContain('op.country      || prev?.country')
    expect(PORTAL).toContain('d.data?.onboarding_profile')
  })
})

describe('Ⓕ confirmation stays an explicit act, and the same truth protects it', () => {
  it('READY does not imply confirmed', () => {
    expect(DRAFT, 'the stamp is its own write').toContain('confirmed_at: now')
    expect(DRAFT, 'and changing the facts un-confirms').toContain('confirmed_at: null')
  })

  it('the confirm route names the account requirement too', () => {
    expect(MILLA).toContain('missingLabels')
    expect(MILLA).toContain('before you can confirm.')
  })

  it('one model call per turn — no corrective re-roll exists', () => {
    expect((ICPS.match(/await callModel\(/g) ?? []).length, 'the two pre-existing transport attempts only').toBe(2)
  })

  it('nothing composes a customer-facing question', () => {
    expect(ICPS).toContain("THE SENTENCE IS MILLA'S OR THERE IS NONE")
  })
})
