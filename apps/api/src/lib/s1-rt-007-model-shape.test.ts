import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-RT-007 — A VALID CUSTOMER TURN MUST NOT BECOME A 503 BECAUSE THE MODEL VARIED ITS SHAPE.
//
// ── THE LIVE FAILURE, FROM PRODUCTION LOGS ─────────────────────────────────────────────
//
//   {"stage":"reply","category":"INVALID_SHAPE","stop_reason":"tool_use",
//    "content_blocks":1,"input_key_count":8,"zod_paths":["brief"]}      → 503
//   {"stage":"reply","category":"INVALID_SHAPE","stop_reason":"tool_use",
//    "content_blocks":1,"input_key_count":6,"zod_paths":["icp"]}        → 503
//
// Both times the customer pressed Try again WITHOUT changing a word, and the identical
// transcript returned 200. So the customer's input was never the problem: the model produced
// tool output, OUR reply contract refused it, and a different sample passed.
//
// ── WHAT EACH PATH ACTUALLY IS ─────────────────────────────────────────────────────────
//
// 🛑 `["brief"]` IS NOT A SHAPE ERROR AT ALL. `MillaReplyInput` has no `brief` key. The path
// comes from `millaReplyFor`'s own `ctx.addIssue({ path: ['brief'] })` — the ELEVEN-FACT
// GATE. The model declared `complete` while holding fewer than eleven facts, and a model
// misjudging its own readiness was being charged to the CUSTOMER as a failed turn.
//
// 🛑 `["icp"]` IS A SHAPE ERROR, AND A HARMLESS ONE. Every field is `.optional()`, which in
// Zod means `T | undefined` and NOT `T | null`. A model that says "I have no ICP yet" the
// obvious way — `icp: null` — is refused, while the same model omitting the key entirely is
// accepted. Those two mean exactly the same thing and only one of them worked.
//
// ⚠️ EVERY TEST BELOW DRIVES THE REAL ROUTE. The Anthropic SDK is a double returning an exact
// tool payload; the schema, the gate and the response are the live ones. No network, no
// provider, no spend.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The two live customer turns, verbatim. */
const TURN_1 =
  "I'm Jacques and I run Northstar Revenue. We don't have a website yet. We're a B2B sales " +
  'consultancy that helps founder-led service businesses build predictable pipeline. Our best ' +
  'customers are agencies and consultancies in the UK and US, usually around 11–50 employees. ' +
  'We normally want to speak with founders, CEOs, CROs and VP-level sales leaders. We don\'t ' +
  'want recruitment agencies or software companies. The goal is to book qualified sales ' +
  'conversations with companies that genuinely need help building pipeline.'

const TURN_2 =
  "Any type of agency or consultancy is fine as long as they're founder-led B2B service " +
  "businesses. I'd especially lean towards marketing agencies, creative agencies, management " +
  'consultancies and sales consultancies.'

const TURN_3 =
  'Also remember that I do not want recruitment agencies or software companies, and I ' +
  'specifically want marketing agencies, creative agencies, management consultancies and ' +
  'sales consultancies.'

const TURN_4 =
  'One thing is still missing. Please exclude recruitment agencies and software companies. ' +
  'Keep everything else exactly as it is.'

void TURN_3

type Saved = { facts: Record<string, unknown> }

async function dispatch(
  modelInput: unknown,
  // `held` is what the DURABLE Brief already contains before this turn — the cumulative
  // record every earlier answer merged into. The confirmation must read it.
  opts: {
    userText: string; profileRequired?: boolean; held?: Record<string, unknown>
    /** The full transcript, when a test needs more than one turn of context. */
    turns?: Array<{ role: 'user' | 'assistant'; content: string }>
    /** Make the durable-Brief read THROW — not "empty", but "unreadable". */
    heldThrows?: boolean
  },
): Promise<{ status: number; json: Record<string, unknown>; logs: string[]; saved: Saved[] }> {
  vi.resetModules()
  const logs: string[] = []
  const saved: Saved[] = []

  vi.doMock('@anthropic-ai/sdk', () => ({
    default: class {
      messages = {
        create: async () => ({
          stop_reason: 'tool_use',
          content: [{ type: 'tool_use', name: 'milla_reply', input: modelInput }],
        }),
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
  // 🛑 A REAL STORE, NOT A STUB. "the confirmation reads the cumulative record" is a claim
  // about state across the save and the read-back, so the double MERGES exactly as
  // `saveBriefDraft` does and answers `briefDraftFor` from the merged result.
  const store: Record<string, unknown> = { ...(opts.held ?? {}) }
  vi.doMock('./brief-draft', () => ({
    saveBriefDraft: async (_u: string, facts: Record<string, unknown>) => {
      saved.push({ facts }); Object.assign(store, facts); return { ok: true }
    },
    briefDraftFor: async () => {
      if (opts.heldThrows) throw new Error('durable brief unreadable')
      return { confirmedAt: null, promotedClientId: null, facts: store }
    },
    saveBriefConversation: async () => ({ ok: true }),
    writableBriefDraft: async () => null,
    markBriefDraftPromoted: async () => ({ ok: true }),
  }))

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
        messages: opts.turns ?? [{ role: 'user', content: opts.userText }],
        profile_required: opts.profileRequired !== false,
      })
      const out = await new Promise<{ status: number; json: Record<string, unknown> }>((resolve, reject) => {
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
            resolve({ status: res.statusCode ?? 0, json })
          })
        })
        r.on('error', reject); r.write(payload); r.end()
      })
      if (out.status !== 200) logs.push('STATUS ' + out.status)
      return { ...out, logs, saved }
    } finally { await new Promise<void>(r => server.close(() => r())) }
  } finally {
    console.error = err; console.log = log; console.warn = warn
  }
}

afterEach(() => {
  vi.doUnmock('@anthropic-ai/sdk'); vi.doUnmock('@kind/db')
  vi.doUnmock('../middleware/auth'); vi.doUnmock('./brief-draft')
  vi.resetModules()
})

/** Everything the customer said in TURN 1, as the model would carry it forward. */
const TURN_1_FACTS = {
  contact_name: 'Jacques',
  company_name: 'Northstar Revenue',
  website_none: true,
  what_they_do: 'B2B sales consultancy helping founder-led service businesses build predictable pipeline',
  target_category: 'agencies and consultancies',
  geographies: ['United Kingdom', 'United States'],
  target_company_type: 'agency',
  company_sizes: ['11–50'],
  job_titles: ['Founder', 'CEO', 'CRO', 'VP Sales'],
  seniority_levels: ['C-Suite'],
  exclusions: 'no recruitment agencies or software companies',
  desired_outcome: 'book qualified sales conversations with companies that need help building pipeline',
}

const zodPathsIn = (logs: string[]): string[] => {
  const line = logs.find(l => l.includes('unusable model reply'))
  if (!line) return []
  const m = line.match(/"zod_paths":\[(.*?)\]/)
  return m ? m[1].split(',').map(s => s.replace(/"/g, '')).filter(Boolean) : []
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// § A — THE TWO LIVE FAILURES, REPRODUCED THEN REQUIRED TO PASS
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 S1-RT-007 · the two live customer turns must not 503', () => {
  it('🛑 TURN 2 · `icp: null` — "I have no ICP yet", said the obvious way', async () => {
    // The live shape: `zod_paths:["icp"]`, 6 keys. `null` and "key omitted" mean the same
    // thing, and only one of them worked.
    const r = await dispatch({
      type: 'question',
      content: 'Got it — and roughly how many people do those agencies usually have?',
      icp: null,
      profile: null,
      business: null,
      brief_so_far: { target_category: 'agencies and consultancies' },
    }, { userText: TURN_2 })
    expect(r.status, `zod_paths were ${JSON.stringify(zodPathsIn(r.logs))}`).toBe(200)
    expect((r.json.data as Record<string, unknown>).type).toBe('question')
    expect((r.json.data as Record<string, unknown>).content).toContain('how many people')
  })

  it('🛑 TURN 2 · `icp: null` on a COMPLETION keeps the conversation too', async () => {
    // ⚠️ MY FIRST VERSION OF THIS TEST EXPECTED `complete`, AND THAT WAS WRONG. A completion
    // carrying no ICP is not a completion — `millaReplyFor` refuses it at path `icp`, which
    // is the SAME readiness class as the eleven-fact gate. So the right outcome is the same:
    // keep the customer's turn, keep asking. The premise was mine, not the fix's.
    const r = await dispatch({
      type: 'complete',
      content: 'One more thing — roughly how big are the agencies you do your best work with?',
      summary: 'Here is what I have.',
      profile: { company_name: 'Northstar Revenue', country: 'United Kingdom', contact_name: 'Jacques', website_none: true },
      icp: null,
      business: null,
      brief_so_far: { ...TURN_1_FACTS, country: 'United Kingdom' },
    }, { userText: TURN_2 })
    expect(r.status, `zod_paths were ${JSON.stringify(zodPathsIn(r.logs))}`).toBe(200)
    const d = r.json.data as Record<string, unknown>
    expect(d.type).toBe('question')
    expect(d.content).toContain('how big')
  })

  it('🛑 TURN 1 · a PREMATURE completion keeps the conversation, it does not 503', async () => {
    // The live shape: `zod_paths:["brief"]`, 8 keys. The model declared `complete` while the
    // eleven-fact gate could only resolve nine — a model misjudging its own readiness, which
    // was being charged to the customer as a failed turn.
    const { exclusions: _x, desired_outcome: _d, ...nineFacts } = TURN_1_FACTS
    const r = await dispatch({
      type: 'complete',
      content: 'Before I put this together — who would you rather we did NOT contact?',
      summary: 'A plan for founder-led agencies.',
      profile: { company_name: 'Northstar Revenue', country: 'United Kingdom', contact_name: 'Jacques', website_none: true },
      icp: { target_category: 'agencies and consultancies', geographies: ['United Kingdom', 'United States'] },
      business: { product: 'B2B sales consultancy' },
      campaign_intent: '',
      brief_so_far: nineFacts,
    }, { userText: TURN_1 })
    expect(r.status, `zod_paths were ${JSON.stringify(zodPathsIn(r.logs))}`).toBe(200)
    const d = r.json.data as Record<string, unknown>
    // 🛑 THE BRIEF IS NOT COMPLETE AND MUST NOT SAY IT IS. The customer keeps their turn and
    // Milla keeps asking — which is the product rule, not a relaxation of it.
    expect(d.type, 'a premature completion may NEVER be reported as complete').toBe('question')
    expect(d.content, "and it is MILLA'S sentence, never one we wrote").toContain('NOT contact')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § B — WHAT MUST STILL FAIL CLOSED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 S1-RT-007 · genuinely unsafe replies still fail closed', () => {
  it('🛑 a WRONG-TYPE `icp` is still refused — null is nothing, a string is malformed', async () => {
    const r = await dispatch({
      type: 'complete',
      icp: 'agencies and consultancies',
      brief_so_far: TURN_1_FACTS,
    }, { userText: TURN_1 })
    expect(r.status).toBe(503)
    expect(zodPathsIn(r.logs)).toContain('icp')
  })

  it('🛑 an ARRAY where an object belongs is still refused', async () => {
    const r = await dispatch({
      type: 'complete', icp: ['agencies'], brief_so_far: TURN_1_FACTS,
    }, { userText: TURN_1 })
    expect(r.status).toBe(503)
  })

  it('🛑 a premature completion with NO usable sentence is still refused', async () => {
    // Nothing to say and nothing to fabricate. A question we invented would be words in
    // Milla's mouth, which is the one thing this route may never do.
    const { exclusions: _x, desired_outcome: _d, ...nineFacts } = TURN_1_FACTS
    const r = await dispatch({
      type: 'complete',
      summary: 'A plan for founder-led agencies.',
      brief_so_far: nineFacts,
    }, { userText: TURN_1 })
    expect(r.status).toBe(503)
    expect(zodPathsIn(r.logs)).toContain('brief')
  })

  it('🛑 a first-run completion missing the company name may NEVER complete', async () => {
    // ⚠️ ALSO CORRECTED FROM MY FIRST VERSION, which expected a 503. A missing company name is
    // a READINESS refusal like the other three, so the customer keeps their turn — but the
    // requirement itself is untouched: this must never be reported as complete, and the
    // account can still not be created without it.
    const { company_name: _drop, ...noCompany } = TURN_1_FACTS
    const r = await dispatch({
      type: 'complete',
      content: 'And what is the company called?',
      profile: { country: 'United Kingdom' },
      icp: { target_category: 'agencies' },
      brief_so_far: noCompany,
    }, { userText: TURN_1 })
    expect(r.status).toBe(200)
    expect((r.json.data as Record<string, unknown>).type,
      'a completion missing the company name is still not a completion').toBe('question')
  })

  it('🛑 and with NO usable sentence that same reply is refused outright', async () => {
    const { company_name: _drop, ...noCompany } = TURN_1_FACTS
    const r = await dispatch({
      type: 'complete',
      profile: { country: 'United Kingdom' },
      icp: { target_category: 'agencies' },
      brief_so_far: noCompany,
    }, { userText: TURN_1 })
    expect(r.status).toBe(503)
    expect(zodPathsIn(r.logs).join(',')).toContain('profile.company_name')
  })

  it('🛑 A MALFORMED `icp` IS REFUSED EVEN WHEN THE REPLY CARRIES A USABLE SENTENCE', async () => {
    // 🛑 THE TOOTH THAT DID NOT BITE THE FIRST TIME. `icp: "agencies"` raises `invalid_type`
    // at path `icp`; a completion with NO icp raises our own `custom` issue at the SAME path.
    // Only the issue CODE separates "the model has nothing yet" from "the model sent
    // nonsense". Without a usable `content` the downgrade fails anyway and this passes for
    // the wrong reason — so the sentence is present, and the code check is the only thing
    // left standing between a malformed reply and a 200.
    const r = await dispatch({
      type: 'complete',
      content: 'And roughly how big are they?',
      icp: 'agencies and consultancies',
      brief_so_far: TURN_1_FACTS,
    }, { userText: TURN_1 })
    expect(r.status, 'a string where an object belongs is not "nothing"').toBe(503)
    expect(zodPathsIn(r.logs)).toContain('icp')
  })

  it('🛑 and a malformed NESTED value is refused the same way', async () => {
    const r = await dispatch({
      type: 'complete',
      content: 'And roughly how big are they?',
      icp: { geographies: 'United Kingdom' },   // a string where a list belongs
      brief_so_far: TURN_1_FACTS,
    }, { userText: TURN_1 })
    expect(r.status).toBe(503)
  })

  it('🛑 an unknown `type` is still refused', async () => {
    const r = await dispatch({ type: 'finished', content: 'x' }, { userText: TURN_1 })
    expect(r.status).toBe(503)
  })

  it('🛑 a blank question is still refused — nothing may put words in Milla\'s mouth', async () => {
    const r = await dispatch({ type: 'question', content: '   ' }, { userText: TURN_1 })
    expect(r.status).toBe(503)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § C — CUSTOMER TRUTH IS NEITHER LOST NOR INVENTED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 S1-RT-007 · truth is preserved, never fabricated', () => {
  it('🛑 the facts are SAVED even on a premature completion', async () => {
    const { exclusions: _x, desired_outcome: _d, ...nineFacts } = TURN_1_FACTS
    const r = await dispatch({
      type: 'complete',
      content: 'And who should we avoid?',
      brief_so_far: nineFacts,
    }, { userText: TURN_1 })
    expect(r.saved).toHaveLength(1)
    expect(r.saved[0].facts.company_name).toBe('Northstar Revenue')
    expect(r.saved[0].facts.target_category).toBe('agencies and consultancies')
  })

  it('🛑 EXCLUSIONS are not lost when they ARE given', async () => {
    const r = await dispatch({
      type: 'question', content: 'Noted.', icp: null,
      brief_so_far: { exclusions: 'no recruitment agencies or software companies' },
    }, { userText: TURN_1 })
    expect(r.status).toBe(200)
    expect(r.saved[0].facts.exclusions).toBe('no recruitment agencies or software companies')
  })

  it('🛑 a `null` fact is DROPPED, never written as a value over a captured one', async () => {
    // `saveBriefDraft` MERGES, so a key present-but-null would overwrite a real answer with
    // nothing. Normalising drops the key so the merge leaves the stored fact alone.
    const r = await dispatch({
      type: 'question', content: 'Thanks.',
      brief_so_far: { company_name: 'Northstar Revenue', exclusions: null, target_category: null },
    }, { userText: TURN_2 })
    expect(r.status).toBe(200)
    expect(r.saved[0].facts.company_name).toBe('Northstar Revenue')
    expect('exclusions' in r.saved[0].facts, 'a null must not reach the merge').toBe(false)
    expect('target_category' in r.saved[0].facts).toBe(false)
  })

  it('🛑 A FALSY ANSWER IS AN ANSWER — `website_none: false` must survive normalisation', async () => {
    // 🛑 THE SECOND TOOTH THAT DID NOT BITE. Normalisation drops `null`; if it dropped
    // FALSY it would silently destroy real customer statements — `website_none: false` is
    // "I do have a website", not "I said nothing", and an empty string is a cleared answer.
    const r = await dispatch({
      type: 'question', content: 'Thanks — what is the site?',
      brief_so_far: { company_name: 'Northstar Revenue', website_none: false, website: '' },
    }, { userText: TURN_1 })
    expect(r.status).toBe(200)
    expect(r.saved[0].facts.website_none, 'false is a statement, not an absence').toBe(false)
    // ⛓️ 14 Sep (S1-RT-009) — CORRECTED PREMISE. An empty STRING from the model is noise, not
    // a value: it has no way to express a clear and the prompt tells it to omit what it does
    // not know. Merging `''` would erase a website the customer gave earlier. The customer's
    // own clear mechanism is `PUT /milla/brief-draft`, which is untouched.
    expect('website' in r.saved[0].facts, 'model emptiness must not reach the merge').toBe(false)
  })

  it('🛑 nothing is INVENTED — a missing fact stays missing', async () => {
    const r = await dispatch({
      type: 'question', content: 'What do you do?', icp: null, profile: null,
      brief_so_far: { contact_name: 'Jacques' },
    }, { userText: TURN_1 })
    expect(r.status).toBe(200)
    expect(Object.keys(r.saved[0].facts)).toEqual(['contact_name'])
  })

  it('a complete reply that really is complete still completes', async () => {
    const r = await dispatch({
      type: 'complete',
      summary: 'Founder-led UK & US agencies.',
      profile: { company_name: 'Northstar Revenue', country: 'United Kingdom', contact_name: 'Jacques', website_none: true },
      icp: { target_category: 'agencies and consultancies', target_company_type: 'agency',
             geographies: ['United Kingdom', 'United States'], company_sizes: ['11–50'],
             job_titles: ['Founder', 'CEO'], seniority_levels: ['C-Suite'] },
      business: { product: 'B2B sales consultancy', bad_fit: 'no recruitment agencies or software companies' },
      campaign_intent: 'book qualified sales conversations',
      brief_so_far: { ...TURN_1_FACTS, country: 'United Kingdom' },
    }, { userText: TURN_2 })
    expect(r.status, `zod_paths were ${JSON.stringify(zodPathsIn(r.logs))}`).toBe(200)
    expect((r.json.data as Record<string, unknown>).type).toBe('complete')
  })

  it('🛑 REPLAY of the same turn does not duplicate it — the route holds no turn state', async () => {
    const input = { type: 'question' as const, content: 'And who should we avoid?', icp: null,
                    brief_so_far: { contact_name: 'Jacques' } }
    const a = await dispatch(input, { userText: TURN_1 })
    const b = await dispatch(input, { userText: TURN_1 })
    expect(a.status).toBe(200); expect(b.status).toBe(200)
    // Each request saves exactly once; the draft write MERGES by key, so a replay of the same
    // facts is the same state rather than a second copy.
    expect(a.saved).toHaveLength(1)
    expect(b.saved).toHaveLength(1)
    expect(b.saved[0].facts).toEqual(a.saved[0].facts)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § D — S1-RT-009B · THE CLIENT'S OWN COUNTRY IS NOT A BRIEF FACT
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 S1-RT-009B · target geography never becomes company country', () => {
  it('🛑 4 · eleven valid facts COMPLETE without the client\'s own country', async () => {
    // TURN 1 gives all eleven and never says where Northstar Revenue is based. Until now
    // that completion was REFUSED, so the only way through was for the model to infer a
    // country from the client's TARGET market.
    const r = await dispatch({
      type: 'complete',
      summary: 'Founder-led UK & US agencies.',
      profile: { company_name: 'Northstar Revenue', contact_name: 'Jacques', website_none: true },
      icp: { target_category: 'agencies and consultancies', target_company_type: 'agency',
             geographies: ['United Kingdom', 'United States'], company_sizes: ['11–50'],
             job_titles: ['Founder', 'CEO'], seniority_levels: ['C-Suite'] },
      business: { product: 'B2B sales consultancy', bad_fit: 'no recruitment agencies or software companies' },
      campaign_intent: 'book qualified sales conversations',
      brief_so_far: TURN_1_FACTS,
    }, { userText: TURN_1 })
    expect(r.status, `zod_paths were ${JSON.stringify(zodPathsIn(r.logs))}`).toBe(200)
    expect((r.json.data as Record<string, unknown>).type).toBe('complete')
  })

  it('🛑 5 · and the completion does NOT invent a company country from UK/US targets', async () => {
    const r = await dispatch({
      type: 'complete',
      summary: 'x',
      profile: { company_name: 'Northstar Revenue', contact_name: 'Jacques', website_none: true },
      icp: { target_category: 'agencies and consultancies', geographies: ['United Kingdom', 'United States'] },
      business: { product: 'B2B sales consultancy' },
      brief_so_far: TURN_1_FACTS,
    }, { userText: TURN_1 })
    expect(r.status).toBe(200)
    const d = r.json.data as Record<string, unknown>
    const profile = d.profile as Record<string, unknown>
    // 🛑 UNKNOWN STAYS UNKNOWN. The portal renders "still needed" and asks at promotion.
    expect(profile.country, 'the client never said where THEIR business is').toBe('')
    // …while the TARGET geography is intact and unconfused with it.
    expect(d.brief_geographies).toEqual(['United Kingdom', 'United States'])
  })

  it('🛑 an explicitly stated own-country IS preserved', async () => {
    // ⛓️ 14 Sep (GAP 1) — the fixture now carries the CUSTOMER saying it. The rule tightened
    // from "the model supplied a country" to "the customer established one", so a country
    // that appears nowhere in their words is refused — which is the point of § G below.
    const r = await dispatch({
      type: 'complete', summary: 'x',
      profile: { company_name: 'Northstar Revenue', country: 'Ireland', contact_name: 'Jacques', website_none: true },
      icp: { target_category: 'agencies', geographies: ['United Kingdom', 'United States'] },
      business: { product: 'B2B sales consultancy' },
      brief_so_far: TURN_1_FACTS,
    }, {
      userText: TURN_1,
      turns: [{ role: 'user', content: TURN_1 }, { role: 'user', content: 'We are based in Ireland.' }],
    })
    expect(r.status).toBe(200)
    expect((r.json.data as Record<string, unknown>).profile).toMatchObject({ country: 'Ireland' })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § E — S1-RT-009 · THE BRIEF IS CUMULATIVE AND THE CONFIRMATION READS IT
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 S1-RT-009A · exclusions survive and are shown', () => {
  it('🛑 6+10 · a completion that never mentions exclusions still carries the STORED ones', async () => {
    // The live shape: the customer stated exclusions on turn 1, repeated them twice, and the
    // completing turn's sample said nothing about them. Before this, the confirmation showed
    // nothing — the durable Brief had them the whole time.
    const r = await dispatch({
      type: 'complete',
      summary: 'x',
      profile: { company_name: 'Northstar Revenue', country: 'Ireland', contact_name: 'Jacques', website_none: true },
      icp: { target_category: 'agencies', geographies: ['United Kingdom'] },
      business: { product: 'B2B sales consultancy' },      // ← no bad_fit this turn
      brief_so_far: { target_category: 'agencies' },        // ← no exclusions this turn
    }, {
      userText: TURN_4,
      // what the durable Brief already holds, from the earlier turns
      held: { ...TURN_1_FACTS, country: 'Ireland' },
    })
    expect(r.status, r.logs.filter(l => l.includes('icps/builder')).join(' || ')).toBe(200)
    const d = r.json.data as Record<string, unknown>
    expect(d.brief_exclusions, 'fact #10 comes from the durable record, not this sample')
      .toBe('no recruitment agencies or software companies')
    expect((d.business as Record<string, unknown>).bad_fit)
      .toBe('no recruitment agencies or software companies')
  })

  it('🛑 11 · and so does the target geography', async () => {
    const r = await dispatch({
      type: 'complete', summary: 'x',
      profile: { company_name: 'Northstar Revenue', country: 'Ireland', contact_name: 'Jacques', website_none: true },
      icp: { target_category: 'agencies' },                 // ← no geographies this turn
      business: { product: 'B2B sales consultancy' },
      brief_so_far: { target_category: 'agencies' },
    }, { userText: TURN_4, held: { ...TURN_1_FACTS, country: 'Ireland' } })
    expect(r.status).toBe(200)
    expect((r.json.data as Record<string, unknown>).brief_geographies)
      .toEqual(['United Kingdom', 'United States'])
  })

  it('🛑 a fact the CUSTOMER changes this turn still wins over the stored one', async () => {
    const r = await dispatch({
      type: 'complete', summary: 'x',
      profile: { company_name: 'Northstar Revenue', country: 'Ireland', contact_name: 'Jacques', website_none: true },
      icp: { target_category: 'agencies' },
      business: { product: 'B2B sales consultancy' },
      brief_so_far: { exclusions: 'actually only exclude recruitment agencies' },
    }, { userText: TURN_4, held: { ...TURN_1_FACTS, country: 'Ireland' } })
    expect(r.status).toBe(200)
    expect((r.json.data as Record<string, unknown>).brief_exclusions)
      .toBe('actually only exclude recruitment agencies')
  })
})

describe('🛑 S1-RT-009 · model emptiness cannot erase stored customer truth', () => {
  it('🛑 7 · an empty-string exclusions from the model is NOT saved over a stored one', async () => {
    const r = await dispatch({
      type: 'question', content: 'Noted.',
      brief_so_far: { company_name: 'Northstar Revenue', exclusions: '' },
    }, { userText: TURN_4 })
    expect(r.status).toBe(200)
    expect('exclusions' in r.saved[0].facts, 'an empty string is model noise, not a clear').toBe(false)
    expect(r.saved[0].facts.company_name).toBe('Northstar Revenue')
  })

  it('🛑 8 · an empty LIST cannot erase a captured geography either', async () => {
    const r = await dispatch({
      type: 'question', content: 'Noted.',
      brief_so_far: { company_name: 'Northstar Revenue', geographies: [], job_titles: ['  ', ''] },
    }, { userText: TURN_4 })
    expect(r.status).toBe(200)
    expect('geographies' in r.saved[0].facts).toBe(false)
    expect('job_titles' in r.saved[0].facts, 'a list of blanks is still nothing').toBe(false)
  })

  it('🛑 9 · ONE malformed field does not discard the other valid facts in the turn', async () => {
    // `geographies` as a string fails `BriefSoFar`. All-or-nothing, that silently threw away
    // every other fact the customer gave in the same breath.
    const r = await dispatch({
      type: 'question', content: 'Noted.',
      brief_so_far: {
        company_name: 'Northstar Revenue',
        exclusions: 'no recruitment agencies or software companies',
        geographies: 'United Kingdom and United States',    // ← wrong type
      },
    }, { userText: TURN_1 })
    expect(r.status).toBe(200)
    expect(r.saved, 'the turn must still save').toHaveLength(1)
    expect(r.saved[0].facts.company_name).toBe('Northstar Revenue')
    expect(r.saved[0].facts.exclusions).toBe('no recruitment agencies or software companies')
    // 🛑 AND THE UNREADABLE ONE IS NOT GUESSED AT — it is simply absent.
    expect('geographies' in r.saved[0].facts).toBe(false)
    expect(r.logs.some(l => l.includes('brief snapshot partially unreadable'))).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § F — S1-RT-009 · THE CONFIRMATION SCREEN RENDERS CANONICAL TRUTH
//
// ⚠️ There is no React component-test runtime in this repo, so the DECISIONS are proved by
// execution above (what the server resolves and sends) and the WIRING is pinned here. Each
// pin names the whole live expression, so a dead `if (false && …)` around it could not keep
// it green — these are JSX attributes and state assignments, not guards.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 S1-RT-009 · the confirmation is wired to canonical truth', () => {
  const PAGE = readFileSync(
    join(process.cwd(), 'apps/portal/src/app/(milla)/milla/welcome/page.tsx'), 'utf8')

  it('🛑 10 · the exclusions the client gave are RENDERED before they approve', () => {
    // ⛓️ `bad_fit` was declared on the Business type and rendered by nothing. The client said
    // it three times and the screen never showed it back once.
    expect(PAGE).toContain('Who we will NOT contact — ')
    expect(PAGE).toContain('{briefExclusions.trim() && <div>')
    expect(PAGE).toContain('{briefExclusions}</span>')
    // 🛑 AND IT IS THE SERVER'S CANONICAL RESOLUTION, NOT A HARD-CODED STRING.
    expect(PAGE).toContain("setBriefExclusions(typeof d.brief_exclusions === 'string' ? d.brief_exclusions : '')")
    expect(PAGE, 'nothing about the live conversation may be hard-coded into the screen')
      .not.toContain('recruitment agencies')
  })

  it('🛑 11 · the geography chips prefer the durable Brief over one sample', () => {
    expect(PAGE).toContain('chips(briefGeographies.length ? briefGeographies : proposed.geographies)')
    expect(PAGE).toContain('setBriefGeographies(Array.isArray(d.brief_geographies) ? d.brief_geographies : [])')
  })

  it('🛑 12 · the account block still shows country as STILL NEEDED when unknown', () => {
    // Unknown must look unknown. The panel already had this; what changed is that it is now
    // reachable, because the completion no longer forces the model to invent a country.
    expect(PAGE).toContain('Based in — ')
    expect(PAGE).toContain('{profile!.country || <span className="text-[#c9a0a0]">still needed</span>}')
  })

  it('🛑 the server sends both canonical facts on every completion', () => {
    const ICPS = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
    expect(ICPS).toContain("brief_exclusions: resolved.exclusions ?? ''")
    expect(ICPS).toContain('brief_geographies: resolved.geographies ?? []')
    // 🛑 AND `resolved` IS THE CUMULATIVE ONE — the durable record, not this sample.
    expect(ICPS).toContain('? { ...parsed, brief_so_far: { ...held, ...(parsed.brief_so_far ?? {}) } as never }')
  })

  it('🛑 the ELEVEN-FACT GATE counts the durable record too', () => {
    const ICPS = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
    expect(ICPS).toContain('const millaReplyFor = (profileRequired: boolean, held: Record<string, unknown> = {}) =>')
    expect(ICPS).toContain('millaReplyFor(profile_required, held).safeParse(replyInput)')
    expect(ICPS).toContain('? { ...v, brief_so_far: { ...held, ...(v.brief_so_far ?? {}) } as never }')
  })

  it('🛑 the country rule is GONE from the completion gate', () => {
    const ICPS = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
    const live = ICPS.split('\n').filter(l => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*')).join('\n')
    expect(live, 'requiring it to complete made inventing it the only way through')
      .not.toContain('if (!resolved.country)')
    expect(live, 'and no completion rule may name the country path')
      .not.toContain("path: ['profile', 'country']")
    // …while the company-name rule, which IS one of the eleven, is untouched.
    expect(live).toContain('if (!resolved.companyName)')
  })

  it('🛑 and the ACCOUNT still cannot be opened without one — the ask just moved', () => {
    // `onboardSchema.country` is unchanged, so the `clients` row still cannot be written
    // without a country and the 'South Africa' column default is still unreachable. The
    // portal asks for it conversationally at promotion, which is where it belongs.
    const AUTH = readFileSync(join(process.cwd(), 'apps/api/src/routes/auth.ts'), 'utf8')
    expect(AUTH).toContain('country:      z.string().min(2),')
    expect(PAGE).toContain("!p?.country?.trim() ? 'which country your business is based in' : ''")
    expect(PAGE).toContain('Before I can open your account I still need ')
  })

  it('🛑 14+15 · the provider and Proof gates are untouched', () => {
    const ICPS = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
    // Needs ICP Review: still derived server-side and still written with the targeting.
    expect(ICPS).toContain('const decided = deriveProviderReview(')
    expect(ICPS).toContain('icp_review: decided.review, icp_review_at: new Date().toISOString()')
    // runIcpJob and the Proof route still refuse an ICP under review.
    expect(ICPS).toContain('if (icpNeedsReview(')
    expect(ICPS).toContain("code: 'needs_icp_review'")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § G — GAP 1 · COMPANY COUNTRY REQUIRES CUSTOMER EVIDENCE
//
// Removing the completion requirement stopped the product FORCING the invention. It did not
// stop the model volunteering one, and `profile.country` was taken at face value — so the
// live failure survived that fix untouched.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 GAP 1 · target geography can never become company country', () => {
  const COMPLETE_BODY = (country: string) => ({
    type: 'complete',
    summary: 'Founder-led agencies in the UK and US.',
    profile: { company_name: 'Northstar Revenue', country, contact_name: 'Jacques', website_none: true },
    icp: { target_category: 'agencies and consultancies', target_company_type: 'agency',
           geographies: ['United Kingdom', 'United States'], company_sizes: ['11–50'],
           job_titles: ['Founder'], seniority_levels: ['C-Suite'] },
    business: { product: 'B2B sales consultancy', bad_fit: 'no recruitment agencies or software companies' },
    campaign_intent: 'book qualified sales conversations',
    brief_so_far: TURN_1_FACTS,
  })

  it('🛑 the model emits profile.country="United Kingdom" from a TARGET-only transcript → UNKNOWN', async () => {
    // The transcript mentions the UK exactly once, as where their CUSTOMERS are.
    const r = await dispatch(COMPLETE_BODY('United Kingdom'), {
      userText: TURN_1,
      turns: [{ role: 'user', content: TURN_1 }, { role: 'user', content: TURN_2 }],
    })
    expect(r.status).toBe(200)
    const d = r.json.data as Record<string, unknown>
    expect((d.profile as Record<string, unknown>).country,
      'they never said where THEIR business is').toBe('')
    // …and fact #6 is untouched and unconfused with it.
    expect(d.brief_geographies).toEqual(['United Kingdom', 'United States'])
  })

  it('🛑 the same for "UK", "Britain" and "England" — spelling is not evidence', async () => {
    for (const spelling of ['UK', 'Britain', 'England', 'united kingdom']) {
      const r = await dispatch(COMPLETE_BODY(spelling), {
        userText: TURN_1, turns: [{ role: 'user', content: TURN_1 }],
      })
      expect((r.json.data as Record<string, unknown>).profile, spelling)
        .toMatchObject({ country: '' })
    }
  })

  it('🛑 POSITIVE CONTROL · "we are based in Ireland" → Ireland survives', async () => {
    const r = await dispatch(COMPLETE_BODY('Ireland'), {
      userText: TURN_1,
      turns: [
        { role: 'user', content: TURN_1 },
        { role: 'user', content: 'We are based in Ireland, by the way.' },
      ],
    })
    expect(r.status).toBe(200)
    expect((r.json.data as Record<string, unknown>).profile).toMatchObject({ country: 'Ireland' })
  })

  it('🛑 POSITIVE CONTROL · when WE asked, their answer counts even if it is also a target', async () => {
    // A UK firm selling into the UK must be able to say so. `approve()` sends exactly this
    // question, so the existing flow is what establishes the evidence — and without this the
    // promotion ask would loop for ever.
    const r = await dispatch(COMPLETE_BODY('United Kingdom'), {
      userText: TURN_1,
      turns: [
        { role: 'user', content: TURN_1 },
        { role: 'assistant', content: 'Before I can open your account I still need which country your business is based in — could you tell me?' },
        { role: 'user', content: 'We are in the UK.' },
      ],
    })
    expect(r.status).toBe(200)
    expect((r.json.data as Record<string, unknown>).profile).toMatchObject({ country: 'United Kingdom' })
  })

  it('🛑 a country NOBODY said is refused even when it is not a target', async () => {
    const r = await dispatch(COMPLETE_BODY('Australia'), {
      userText: TURN_1, turns: [{ role: 'user', content: TURN_1 }],
    })
    expect((r.json.data as Record<string, unknown>).profile).toMatchObject({ country: '' })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § H — GAP 2 · AN UNREADABLE DURABLE BRIEF MAY NOT PRODUCE A CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 GAP 2 · a failed durable read cannot become a confirmation', () => {
  it('A · read fails + QUESTION → the turn still answers safely', async () => {
    const r = await dispatch({
      type: 'question', content: 'And who should we avoid?',
      brief_so_far: { contact_name: 'Jacques' },
    }, { userText: TURN_1, heldThrows: true })
    expect(r.status).toBe(200)
    expect((r.json.data as Record<string, unknown>).type).toBe('question')
    expect((r.json.data as Record<string, unknown>).content).toContain('avoid')
  })

  it('🛑 B · read fails + COMPLETE → NO confirmation is presented', async () => {
    const r = await dispatch({
      type: 'complete',
      content: 'One more thing before I put this together — anything else to avoid?',
      summary: 'Founder-led agencies.',
      profile: { company_name: 'Northstar Revenue', contact_name: 'Jacques', website_none: true },
      icp: { target_category: 'agencies', geographies: ['United Kingdom'] },
      business: { product: 'B2B sales consultancy' },
      brief_so_far: TURN_1_FACTS,
    }, { userText: TURN_1, heldThrows: true })
    expect(r.status).toBe(200)
    const d = r.json.data as Record<string, unknown>
    // 🛑 A plan assembled from one sample while the record was unreachable must never be put
    // in front of the client to approve.
    expect(d.type, 'no confirmation may be built without the durable record').toBe('question')
    expect(d.icp, 'and no targeting is proposed').toBeUndefined()
    expect(r.logs.some(l => l.includes('BRIEF_UNREADABLE_NO_CONFIRMATION'))).toBe(true)
  })

  it('🛑 B2 · with no usable sentence it refuses outright rather than inventing one', async () => {
    const r = await dispatch({
      type: 'complete', summary: 'Founder-led agencies.', brief_so_far: TURN_1_FACTS,
      profile: { company_name: 'Northstar Revenue' }, icp: { target_category: 'agencies' },
    }, { userText: TURN_1, heldThrows: true })
    expect(r.status).toBe(503)
  })

  it('🛑 C · no customer truth is mutated or lost by the failure', async () => {
    const r = await dispatch({
      type: 'complete', content: 'Anything else to avoid?',
      profile: { company_name: 'Northstar Revenue' }, icp: { target_category: 'agencies' },
      brief_so_far: { company_name: 'Northstar Revenue', exclusions: 'no recruitment agencies' },
    }, { userText: TURN_1, heldThrows: true })
    expect(r.status).toBe(200)
    // The snapshot write happens BEFORE the read, so the turn's facts are already safe.
    expect(r.saved).toHaveLength(1)
    expect(r.saved[0].facts.exclusions).toBe('no recruitment agencies')
    expect(r.saved[0].facts.company_name).toBe('Northstar Revenue')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § I — GAP 3 · THE FINAL CONFIRMATION CARRIES ONE TRUTH
//
// ⛓️ THIS SECTION USED TO PROVE A SCREEN ON THE MODEL'S SUMMARY. The screen caught invented
// locations and contradictory geographies and, by construction, could not catch a reworded
// exclusion — "you want recruitment agencies in the UK" against a record that EXCLUDES them
// would have gone straight through. A partial screen on a second version of the client's
// truth is still a second version of the client's truth. The summary is no longer sent.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 GAP 3 · the model\'s completion summary never reaches the client', () => {
  const withSummary = (summary: string) => ({
    type: 'complete', summary,
    profile: { company_name: 'Northstar Revenue', contact_name: 'Jacques', website_none: true },
    icp: { target_category: 'agencies and consultancies', target_company_type: 'agency',
           geographies: ['United Kingdom', 'United States'], company_sizes: ['11–50'],
           job_titles: ['Founder'], seniority_levels: ['C-Suite'] },
    business: { product: 'B2B sales consultancy', bad_fit: 'no recruitment agencies or software companies' },
    campaign_intent: 'book qualified sales conversations',
    brief_so_far: TURN_1_FACTS,
  })
  const turns = [{ role: 'user' as const, content: TURN_1 }]

  it('🛑 a summary that CONTRADICTS THE EXCLUSIONS does not reach the client', async () => {
    // The case the screen could never have caught: the record excludes them, the sentence
    // says the client wants them.
    const r = await dispatch(
      withSummary('You want recruitment agencies and software companies in the UK.'),
      { userText: TURN_1, turns })
    expect(r.status).toBe(200)
    expect((r.json.data as Record<string, unknown>).summary).toBeNull()
  })

  it('🛑 a summary that INVENTS A COMPANY COUNTRY does not reach the client', async () => {
    const r = await dispatch(
      withSummary('Northstar Revenue is based in the UK and sells to founder-led agencies.'),
      { userText: TURN_1, turns })
    expect(r.status).toBe(200)
    const d = r.json.data as Record<string, unknown>
    expect(d.summary).toBeNull()
    expect((d.profile as Record<string, unknown>).country).toBe('')
  })

  it('🛑 and neither does a PERFECTLY ACCURATE one — the cards carry the facts, not prose', async () => {
    // Not a judgement on this sentence. Nothing factual reaches the client through a channel
    // nobody checked, so there is no channel to check.
    const r = await dispatch(
      withSummary('Founder-led agencies and consultancies in the UK and US, 11–50 staff.'),
      { userText: TURN_1, turns })
    expect(r.status).toBe(200)
    expect((r.json.data as Record<string, unknown>).summary).toBeNull()
  })

  it('🛑 the CANONICAL confirmation is complete and correct in its place', async () => {
    const r = await dispatch(withSummary('anything at all'), { userText: TURN_1, turns })
    const d = r.json.data as Record<string, unknown>
    const icp = d.icp as Record<string, unknown>
    expect(d.brief_exclusions).toBe('no recruitment agencies or software companies')
    expect(d.brief_geographies).toEqual(['United Kingdom', 'United States'])
    expect((d.profile as Record<string, unknown>).company_name).toBe('Northstar Revenue')
    expect(icp.target_category).toBe('agencies and consultancies')
    expect(icp.target_company_type).toBe('agency')
    expect(icp.job_titles).toEqual(['Founder'])
    expect(icp.company_sizes).toEqual(['11–50'])
    expect(d.campaign_intent).toBe('book qualified sales conversations')
  })

  it('🛑 Milla is not silenced — a QUESTION is still entirely her words', async () => {
    const r = await dispatch({
      type: 'question', content: 'And who would you rather we did not contact?',
      brief_so_far: { contact_name: 'Jacques' },
    }, { userText: TURN_1, turns })
    expect(r.status).toBe(200)
    expect((r.json.data as Record<string, unknown>).content)
      .toBe('And who would you rather we did not contact?')
  })

  it('🛑 the route sends no raw summary at all', async () => {
    // ⚠️ SCOPED TO THIS HANDLER. `/icps/revise` has its own unrelated `parsed.summary`, and a
    // whole-file search would report that as this defect.
    const ICPS = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
    const from = ICPS.indexOf("icpRouter.post('/builder/chat'")
    expect(from).toBeGreaterThan(-1)
    const to = ICPS.indexOf('icpRouter.post(', from + 10)
    const route = ICPS.slice(from, to > from ? to : undefined)
    const live = route.split('\n').filter(l => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*')).join('\n')
    expect(live).toContain('summary: null,')
    expect(live, 'no path may put the model\'s prose in front of the client')
      .not.toContain('parsed.summary')
  })
})

describe('🛑 GAP 1 · self-location counts even when it is also a target market', () => {
  it('🛑 "ABCV Logistics, based in the US" while TARGETING the US → the US is accepted', async () => {
    // ⚠️ THIS CASE WAS FOUND BY AN OLDER FIXTURE, NOT BY DESIGN. The first version of the rule
    // refused any country that was also a target, which threw away a plain statement about
    // the speaker and would have refused every firm that sells at home.
    //
    // ⛓️ THE CANONICAL COMPANY NAME IS NOW PART OF THE FIXTURE, and it was wrong before. The
    // Brief said the company was "Northstar Revenue" while the turn located "ABCV Logistics" —
    // two different companies, which under the V4 rule is precisely a sentence about somebody
    // else. A customer who types "ABCV Logistics, based in the US" has ABCV Logistics in their
    // Brief; the fixture now says so, and the sentence still establishes the US.
    const r = await dispatch({
      type: 'complete', summary: 'US logistics buyers.',
      profile: { company_name: 'ABCV Logistics', country: 'United States', contact_name: 'Jacques', website_none: true },
      icp: { target_category: 'IT and tech firms', target_company_type: 'company',
             geographies: ['United States'], company_sizes: ['51–200'],
             job_titles: ['Head of Ops'], seniority_levels: ['Head of'] },
      business: { product: 'Logistics', bad_fit: 'no recruitment agencies' },
      brief_so_far: { ...TURN_1_FACTS, company_name: 'ABCV Logistics', geographies: ['United States'] },
      campaign_intent: 'book meetings',
    }, {
      userText: 'ABCV Logistics, based in the US',
      turns: [{ role: 'user', content: 'ABCV Logistics, based in the US' }],
    })
    expect(r.status).toBe(200)
    expect((r.json.data as Record<string, unknown>).profile).toMatchObject({ country: 'United States' })
  })

  it('🛑 but NAMING the same country about their CUSTOMERS still does not', async () => {
    const r = await dispatch({
      type: 'complete', summary: 'US logistics buyers.',
      profile: { company_name: 'ABCV Logistics', country: 'United States', contact_name: 'Jacques', website_none: true },
      icp: { target_category: 'IT and tech firms', target_company_type: 'company',
             geographies: ['United States'], company_sizes: ['51–200'],
             job_titles: ['Head of Ops'], seniority_levels: ['Head of'] },
      business: { product: 'Logistics', bad_fit: 'no recruitment agencies' },
      campaign_intent: 'book meetings',
      brief_so_far: { ...TURN_1_FACTS, geographies: ['United States'] },
    }, {
      userText: 'Our customers are IT firms in the US',
      turns: [{ role: 'user', content: 'Our customers are IT firms in the US' }],
    })
    expect(r.status).toBe(200)
    expect((r.json.data as Record<string, unknown>).profile).toMatchObject({ country: '' })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// § J — GAP 1 (V3) · ONLY EXPLICIT SELF-LOCATION, OR THE ANSWER TO OUR QUESTION
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 GAP 1 V3 · a mention is not evidence, and an old question is not an answer', () => {
  const completeWith = (country: string) => ({
    type: 'complete', summary: 'x',
    profile: { company_name: 'Northstar Revenue', country, contact_name: 'Jacques', website_none: true },
    icp: { target_category: 'agencies and consultancies', target_company_type: 'agency',
           geographies: ['United Kingdom', 'United States'], company_sizes: ['11–50'],
           job_titles: ['Founder'], seniority_levels: ['C-Suite'] },
    business: { product: 'B2B sales consultancy', bad_fit: 'no recruitment agencies or software companies' },
    campaign_intent: 'book qualified sales conversations',
    brief_so_far: TURN_1_FACTS,
  })
  const countryOf = (r: { json: Record<string, unknown> }) =>
    ((r.json.data as Record<string, unknown>).profile as Record<string, unknown>).country

  it('🛑 PROBLEM A · an old target mention + a later question the client DID NOT ANSWER', async () => {
    // The exact sequence the review named. Pairing any historical question with any
    // historical mention recreates the original defect.
    const r = await dispatch(completeWith('United Kingdom'), {
      userText: TURN_1,
      turns: [
        { role: 'user', content: 'My target customers are in the UK and US.' },
        { role: 'assistant', content: 'Which country is your business based in?' },
        { role: 'user', content: "I'm not sure." },
      ],
    })
    expect(countryOf(r), 'an unanswered question is not an answer').toBe('')
  })

  it('🛑 PROBLEM B · "We have clients in Ireland" is not a head office', async () => {
    const r = await dispatch(completeWith('Ireland'), {
      userText: TURN_1,
      turns: [{ role: 'user', content: TURN_1 }, { role: 'user', content: 'We have clients in Ireland.' }],
    })
    expect(countryOf(r)).toBe('')
  })

  it('🛑 PROBLEM B · nor is a partner, a refusal, or an office', async () => {
    for (const said of [
      'Our partner is in Ireland.',
      "We don't sell into Ireland.",
      'We opened an office in Ireland.',
      'We sometimes work with a supplier in Ireland.',
    ]) {
      const r = await dispatch(completeWith('Ireland'), {
        userText: TURN_1,
        turns: [{ role: 'user', content: TURN_1 }, { role: 'user', content: said }],
      })
      expect(countryOf(r), said).toBe('')
    }
  })

  it('🛑 and a NEGATED self-location is not a location', async () => {
    const r = await dispatch(completeWith('Ireland'), {
      userText: TURN_1,
      turns: [{ role: 'user', content: TURN_1 }, { role: 'user', content: 'We are not based in Ireland any more.' }],
    })
    expect(countryOf(r)).toBe('')
  })

  it('🛑 POSITIVE · "We are based in Ireland" → Ireland', async () => {
    const r = await dispatch(completeWith('Ireland'), {
      userText: TURN_1,
      turns: [{ role: 'user', content: TURN_1 }, { role: 'user', content: 'We are based in Ireland.' }],
    })
    expect(countryOf(r)).toBe('Ireland')
  })

  it('🛑 POSITIVE · "We\'re an Irish company" → Ireland', async () => {
    const r = await dispatch(completeWith('Ireland'), {
      userText: TURN_1,
      turns: [{ role: 'user', content: TURN_1 }, { role: 'user', content: "We're an Irish company, for what it's worth." }],
    })
    expect(countryOf(r)).toBe('Ireland')
  })

  it('🛑 POSITIVE · our question, answered immediately with "the UK" → United Kingdom', async () => {
    const r = await dispatch(completeWith('United Kingdom'), {
      userText: TURN_1,
      turns: [
        { role: 'user', content: 'My target customers are in the UK and US.' },
        { role: 'assistant', content: 'Before I can open your account I still need which country your business is based in — could you tell me?' },
        { role: 'user', content: 'The UK.' },
      ],
    })
    expect(countryOf(r)).toBe('United Kingdom')
  })

  it('🛑 POSITIVE · "ABCV Logistics, based in the US" → United States', async () => {
    const r = await dispatch({
      ...completeWith('United States'),
      profile: { company_name: 'ABCV Logistics', country: 'United States', contact_name: 'Jacques', website_none: true },
      icp: { target_category: 'IT firms', target_company_type: 'company', geographies: ['United States'],
             company_sizes: ['51–200'], job_titles: ['Head of Ops'], seniority_levels: ['Head of'] },
      brief_so_far: { ...TURN_1_FACTS, company_name: 'ABCV Logistics', geographies: ['United States'] },
    }, {
      userText: 'ABCV Logistics, based in the US',
      turns: [{ role: 'user', content: 'ABCV Logistics, based in the US' }],
    })
    expect(countryOf(r)).toBe('United States')
  })

  // ═════════════════════════════════════════════════════════════════════════════════════
  // § J-2 (V4) — WHO the sentence puts there is the whole question.
  //
  // Every case below reached the OPPOSITE result before this fix. The location pattern made
  // the SUBJECT optional, so a bare `is`/`are` carried it; the demonym rule asked only
  // whether `we`/`our` appeared somewhere in the sentence; and route B accepted any country
  // mentioned in the reply that followed our question, answer or not.
  // ═════════════════════════════════════════════════════════════════════════════════════

  it('🛑 V4 · somebody ELSE being based there is not the client being based there', async () => {
    for (const said of [
      'Our partner is based in Ireland.',
      'Our client is based in Ireland.',
      'Recruitment agencies are based in Ireland.',
      'One of our suppliers is headquartered in Ireland.',
      'Our supplier is headquartered in Ireland.',
    ]) {
      const r = await dispatch(completeWith('Ireland'), {
        userText: TURN_1,
        turns: [{ role: 'user', content: TURN_1 }, { role: 'user', content: said }],
      })
      expect(countryOf(r), said).toBe('')
    }
  })

  it('🛑 V4 · a demonym about their CUSTOMERS or TARGETS is not their own country', async () => {
    for (const said of [
      'We target Irish companies.',
      'Our best customers are Irish companies.',
      'We have Irish clients.',
      'We only sell to Irish businesses.',
    ]) {
      const r = await dispatch(completeWith('Ireland'), {
        userText: TURN_1,
        turns: [{ role: 'user', content: TURN_1 }, { role: 'user', content: said }],
      })
      expect(countryOf(r), said).toBe('')
    }
  })

  it('🛑 V4 · following our question is NOT the same as answering it', async () => {
    // ⚠️ THE MODEL EMITS THE COUNTRY IN EVERY ONE OF THESE. That is the point: the reply comes
    // straight after the ask and names a real country, and it still says nothing about where
    // THEIR business is.
    for (const [said, emitted] of [
      ["I'm not sure, but our customers are in the UK.", 'United Kingdom'],
      ['We sell mainly into the UK.', 'United Kingdom'],
      ['Our partner is in Ireland.', 'Ireland'],
      ['Most of the agencies we want are in the UK.', 'United Kingdom'],
    ] as const) {
      const r = await dispatch(completeWith(emitted), {
        userText: TURN_1,
        turns: [
          { role: 'user', content: TURN_1 },
          { role: 'assistant', content: 'Which country is your business based in?' },
          { role: 'user', content: said },
        ],
      })
      expect(countryOf(r), said).toBe('')
    }
  })

  it('🛑 V4 POSITIVE · the four ways a client locates their own business', async () => {
    for (const said of [
      'We are based in Ireland.',
      'Our company is based in Ireland.',
      'Northstar Revenue is based in Ireland.',
      'We are headquartered in Ireland.',
      "We're headquartered in Ireland.",
      "We're an Irish company.",
    ]) {
      const r = await dispatch(completeWith('Ireland'), {
        userText: TURN_1,
        turns: [{ role: 'user', content: TURN_1 }, { role: 'user', content: said }],
      })
      expect(countryOf(r), said).toBe('Ireland')
    }
  })

  it('🛑 V5 · an OFFICE or a PERSON is not the business, even straight after our question', async () => {
    // ⚠️ THE BARE-ANSWER PATH IS NOT A SECOND WAY IN. Each of these follows the ask and names
    // a country, and each locates something that is not the client's business: an office, or
    // the person typing. The frozen rule is that neither establishes company country.
    for (const said of [
      'Our office is in Ireland.',
      'My office is in Ireland.',
      'I am in Ireland.',
      "I'm currently in Ireland.",
    ]) {
      const r = await dispatch(completeWith('Ireland'), {
        userText: TURN_1,
        turns: [
          { role: 'user', content: TURN_1 },
          { role: 'assistant', content: 'Which country is your business based in?' },
          { role: 'user', content: said },
        ],
      })
      expect(countryOf(r), said).toBe('')
    }
  })

  it('🛑 V5 POSITIVE · a bare country, or a SUBJECT that passes the ownership rule', async () => {
    for (const said of ['Ireland.', 'We are based in Ireland.', 'Our company is in Ireland.']) {
      const r = await dispatch(completeWith('Ireland'), {
        userText: TURN_1,
        turns: [
          { role: 'user', content: TURN_1 },
          { role: 'assistant', content: 'Which country is your business based in?' },
          { role: 'user', content: said },
        ],
      })
      expect(countryOf(r), said).toBe('Ireland')
    }
  })

  it('🛑 V4 POSITIVE · our question, directly answered', async () => {
    for (const said of [
      'The UK.', 'United Kingdom.', 'Yes, the UK.',
      "We're in the UK.", 'Our business is in the UK.', 'Our company is in the UK.',
      'Northstar Revenue is in the UK.',
    ]) {
      const r = await dispatch(completeWith('United Kingdom'), {
        userText: TURN_1,
        turns: [
          { role: 'user', content: TURN_1 },
          { role: 'assistant', content: 'Which country is your business based in?' },
          { role: 'user', content: said },
        ],
      })
      expect(countryOf(r), said).toBe('United Kingdom')
    }
  })

  it('🛑 the answer must follow the MOST RECENT ask, not an older one', async () => {
    // A question, an answer that named nothing, then a later unrelated mention of a country.
    const r = await dispatch(completeWith('Ireland'), {
      userText: TURN_1,
      turns: [
        { role: 'assistant', content: 'Where is your business based?' },
        { role: 'user', content: 'I would rather not say.' },
        { role: 'user', content: 'We have clients in Ireland.' },
      ],
    })
    expect(countryOf(r), 'the reply to the ask named no country').toBe('')
  })
})
