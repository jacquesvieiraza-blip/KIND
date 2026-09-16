import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync, existsSync } from 'fs'
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
    // the conversation continues — which is the product rule, not a relaxation of it.
    //
    // ⛓️ 16 Sep (S1-RT-010) — AND IT IS NO LONGER DELIVERED AS HER SENTENCE. Cedar Peak
    // Advisory proved why: with ten facts held the model wrote "Great, that's everything I
    // need — thanks Daniel!", and demoting THAT to a question delivered a sentence written to
    // CLOSE the conversation as the turn meant to continue it. The customer was stranded. The
    // vetoed sentence is now suppressed and the AUTHORITATIVE missing fact is returned as
    // product state instead. Stronger, not weaker: this used to prove only "not complete",
    // and now proves which fact blocked it.
    expect(d.type, 'a premature completion may NEVER be reported as complete').toBe('outstanding')
    expect(d.content, 'the completion sentence is not delivered as a turn').toBeUndefined()
    const o = d.brief_outstanding as { next: { id: string }; remaining: number }
    expect(o.next.id, 'TURN 1 gave no exclusions and no outcome').toBe('exclusions')
    expect(o.remaining).toBe(2)
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
    // ⛓️ 16 Sep (S1-RT-010) — still not a completion, and now it names the gap. `company` is
    // one of the eleven, so the missing-fact path owns this refusal.
    expect((r.json.data as Record<string, unknown>).type,
      'a completion missing the company name is still not a completion').toBe('outstanding')
  })

  it('🛑 and with NO usable sentence that same reply is refused outright', async () => {
    const { company_name: _drop, ...noCompany } = TURN_1_FACTS
    const r = await dispatch({
      type: 'complete',
      profile: { country: 'United Kingdom' },
      icp: { target_category: 'agencies' },
      brief_so_far: noCompany,
    }, { userText: TURN_1 })
    // ⛓️ 16 Sep (S1-RT-010) — THE REFUSAL NO LONGER NEEDS A SENTENCE TO SURVIVE ON. It used
    // to be a 503 ("Milla didn't catch that") purely because the reply carried no `content`
    // to demote — the customer paid for the model's silence. The missing fact is the server's
    // own truth, so it is returned whether or not the model wrote anything.
    expect(r.status).toBe(200)
    const d = r.json.data as Record<string, unknown>
    expect(d.type, 'never a completion').toBe('outstanding')
    expect(d.content, 'and never an invented sentence').toBeUndefined()
    // ⚠️ AND THE REFUSAL IS STILL NAMED IN THE LOG — as the outstanding FACT ID rather than
    // a zod path, because this path no longer reaches `millaReplyFailed`. `company` is fact
    // #2, so the company name is exactly what it reports.
    expect((d.brief_outstanding as { next: { id: string } }).next.id).toBe('company')
    expect(r.logs.join('\n')).toContain('premature completion vetoed')
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
  // ⛓️ 16 Sep (S1-ONB-001, founder-ruled) — THIS TEST IS RETARGETED, AND ONLY THIS HALF.
  //
  // ⛓️ IT USED TO READ "eleven valid facts COMPLETE without the client's own country", and
  // that expectation is SUPERSEDED. The eleven are still eleven and country is still NOT a
  // twelfth Brief fact — but the account cannot be opened without it (`onboardSchema` refuses,
  // `clients.country` defaults to 'South Africa'), so onboarding is not READY while it is
  // unknown. Before this, a client could be stamped CONFIRMED and only then be refused.
  //
  // 🛑 WHAT S1-RT-009B ACTUALLY PROTECTS IS UNTOUCHED AND IS PROVED IN THE SAME TEST: the
  // country is never INFERRED from the target market. That was always the point — the 503
  // retry loop that selected for invention is what has gone, replaced by asking the customer.
  it('🛑 4 · eleven facts WITHOUT the client\'s own country do NOT complete — and none is invented', async () => {
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
    const d4 = r.json.data as Record<string, unknown>
    expect(d4.type, 'not ready: the account cannot be opened without it').toBe('outstanding')
    const o4 = d4.brief_outstanding as { next: { id: string; label: string }; total: number }
    expect(o4.next.id, 'and the customer is asked for it, in the conversation').toBe('country')
    // 🛑 NOTHING IS INFERRED FROM THE TARGET MARKET. UK and US are where their CUSTOMERS are.
    expect(JSON.stringify(d4), 'no country is proposed anywhere in the reply').not.toContain('"country":"United Kingdom"')
    expect(JSON.stringify(d4)).not.toContain('"country":"United States"')
    expect(o4.total, 'and the Brief is still eleven facts').toBe(11)
  })

  it('🛑 4b · then the CUSTOMER supplies it, and only then does it complete', async () => {
    // The one acceptable path to account readiness: they said it. No default, no retry loop,
    // no inference — the same transcript plus one more customer answer.
    const r = await dispatch({
      type: 'complete',
      summary: 'Founder-led UK & US agencies.',
      profile: { company_name: 'Northstar Revenue', contact_name: 'Jacques', website_none: true, country: 'Ireland' },
      icp: { target_category: 'agencies and consultancies', target_company_type: 'agency',
             geographies: ['United Kingdom', 'United States'], company_sizes: ['11–50'],
             job_titles: ['Founder', 'CEO'], seniority_levels: ['C-Suite'] },
      business: { product: 'B2B sales consultancy', bad_fit: 'no recruitment agencies or software companies' },
      campaign_intent: 'book qualified sales conversations',
      brief_so_far: TURN_1_FACTS,
    }, {
      userText: TURN_1,
      turns: [{ role: 'user', content: TURN_1 }, { role: 'user', content: 'We are based in Ireland.' }],
    })
    expect(r.status, `zod_paths were ${JSON.stringify(zodPathsIn(r.logs))}`).toBe(200)
    const d = r.json.data as Record<string, unknown>
    expect(d.type).toBe('complete')
    expect((d.profile as Record<string, unknown>).country, 'THEIRS, not their market').toBe('Ireland')
    expect(d.brief_geographies, 'and the target market is untouched').toEqual(['United Kingdom', 'United States'])
    // ⚠️ AND IT IS PERSISTED, so a refresh cannot lose it and ask again.
    expect((r.saved.at(-1)?.facts as Record<string, unknown>).country).toBe('Ireland')
  })

  it('🛑 5 · and a refused completion does NOT invent a company country from UK/US targets', async () => {
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
    // ⛓️ 16 Sep — the reply is now the outstanding-fact recovery rather than a completion, so
    // there is no `profile` to inspect. The GUARANTEE is stronger, not weaker: UNKNOWN STAYS
    // UNKNOWN, and no country reaches the client at all.
    expect(d.type).toBe('outstanding')
    expect((d.brief_outstanding as { next: { id: string } }).next.id).toBe('country')
    expect(JSON.stringify(d), 'the target market never becomes their country')
      .not.toContain('"country":"United Kingdom"')
    // …and the stored TARGET geography is intact and unconfused with it.
    expect((r.saved.at(-1)?.facts as Record<string, unknown>).geographies)
      .toEqual(['United Kingdom', 'United States'])
    expect((r.saved.at(-1)?.facts as Record<string, unknown>).country,
      'no default is inserted').toBeUndefined()
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
    // ⛓️ 16 Sep (S1-RT-010) — that expression was written out in three places and is now ONE
    // function, which is a stronger guarantee than the substring: the gate, the completion
    // response and the premature-completion recovery cannot disagree about the resolution
    // because they call the same code. Both halves are pinned.
    expect(ICPS).toContain('const resolved = resolvedBriefFor(parsed, held)')
    expect(ICPS).toContain('{ ...v, brief_so_far: { ...held, ...(v.brief_so_far ?? {}) } as never }')
    // ⛓️ 16 Sep (S1-ONB-001) — five now, not four: the PERSIST calls it too, which is the
    // whole reconciliation. The resolution flows into the draft instead of being computed
    // twice beside it, so the gate and the confirm door stop being able to disagree.
    expect((ICPS.match(/resolvedBriefFor\(/g) ?? []).length,
      'defined once; called by the gate, the persist and both responses').toBe(5)
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

  it('🛑 and the ACCOUNT still cannot be opened without one — the ask moved AGAIN, earlier', () => {
    // `onboardSchema.country` is unchanged, so the `clients` row still cannot be written
    // without a country and the 'South Africa' column default is still unreachable.
    const AUTH = readFileSync(join(process.cwd(), 'apps/api/src/routes/auth.ts'), 'utf8')
    expect(AUTH).toContain('country:      z.string().min(2),')
    // ⛓️ 16 Sep (S1-ONB-001) — THE BROWSER-SIDE ASK IS GONE, and that is the fix, not a loss.
    // It ran AFTER the client pressed Confirm, so the plan rendered and the CTA was live while
    // the panel itself said "Based in — still needed". Country is now part of the server's
    // readiness answer, so Milla asks for it in the CONVERSATION and the button never appears.
    expect(PAGE).not.toContain("!p?.country?.trim() ? 'which country your business is based in' : ''")
    expect(PAGE).not.toContain('Before I can open your account I still need ')
    const ONB = readFileSync(join(process.cwd(), 'apps/api/src/lib/onboarding-state.ts'), 'utf8')
    expect(ONB, 'the requirement lives in the one authority now').toContain("ACCOUNT_FACTS = ['country']")
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
// § G — R121 · THE MODEL JUDGES THE CONVERSATION; THE SERVER NEITHER INVENTS NOR VETOES
//
// ⛓️ WHAT STOOD HERE WAS A PHRASE CATALOGUE, AND EVERY TEST IN IT ASSERTED A REGEX.
// "Our partner is based in Ireland" → UNKNOWN · "We target Irish companies" → UNKNOWN ·
// "Our office is in Ireland" → UNKNOWN. Each was green, each was added after the previous
// round shipped, and together they were a specification for a parser that could never be
// finished — there is no finite set of ways a person says where their business is.
//
// 🛑 WHAT REPLACES THEM IS THE PROPERTY THAT ACTUALLY MATTERS. The server has exactly two
// obligations about the client's country, and neither is semantic:
//
//   · IT NEVER INVENTS ONE. A model that says nothing about the country leaves it empty,
//     and empty still renders "still needed" and is still asked for conversationally.
//   · IT NEVER VETOES ONE. A country the model DID establish reaches the card unchanged —
//     no second opinion, no transcript re-reading, no silent override the client cannot see.
//
// ⚠️ AND THE WORDING-INVARIANCE TEST IS THE REAL GUARD (§ K). Whether the model reads a
// given sentence correctly is a MODEL question, answered by the live eval and the founder's
// walk — not by a unit test with a mocked model, which can only ever prove that the sentence
// somebody wrote into the fixture matches the regex somebody wrote into the source.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 R121 · the country is the model\'s judgement, and the server does not second-guess it', () => {
  const COMPLETE = (profile: Record<string, unknown>) => ({
    type: 'complete', summary: 'Founder-led agencies in the UK and US.',
    profile: { company_name: 'Northstar Revenue', contact_name: 'Jacques', website_none: true, ...profile },
    icp: { target_category: 'agencies and consultancies', target_company_type: 'agency',
           geographies: ['United Kingdom', 'United States'], company_sizes: ['11–50'],
           job_titles: ['Founder'], seniority_levels: ['C-Suite'] },
    business: { product: 'B2B sales consultancy', bad_fit: 'no recruitment agencies or software companies' },
    campaign_intent: 'book qualified sales conversations',
    // ⛓️ 16 Sep (S1-ONB-001) — the STORED country, so these tests still exercise what they are
    // named for: whether the MODEL's `profile.country` is invented or vetoed. Readiness now
    // requires a country, and without one every completion here would be refused before the
    // question this describe block asks could even be reached.
    brief_so_far: { ...TURN_1_FACTS, country: 'Ireland' },
  })
  const countryOf = (r: { json: Record<string, unknown> }) =>
    ((r.json.data as Record<string, unknown>).profile as Record<string, unknown>).country

  it('🛑 NEVER INVENTED · the model says nothing about the country → it stays unknown', async () => {
    // The transcript is FULL of countries — "the UK and US" are where their CUSTOMERS are —
    // and the server must not turn any of them into the client's own location.
    const r = await dispatch(COMPLETE({}), {
      userText: TURN_1, turns: [{ role: 'user', content: TURN_1 }, { role: 'user', content: TURN_2 }],
    })
    expect(r.status).toBe(200)
    // ⛓️ 16 Sep — the customer established Ireland earlier in the Brief, so THAT is what the
    // card shows. What must never appear is a country taken from the TARGET market, and the
    // transcript is full of them.
    expect(countryOf(r), 'their own country, from their own words').toBe('Ireland')
    expect(countryOf(r), 'never the market they sell into').not.toBe('United Kingdom')
    expect(countryOf(r)).not.toBe('United States')
    // …and fact #6 is untouched and never confused with it.
    expect((r.json.data as Record<string, unknown>).brief_geographies).toEqual(['United Kingdom', 'United States'])
  })

  it('🛑 NEVER VETOED · a country the model DID establish reaches the card unchanged', async () => {
    const r = await dispatch(COMPLETE({ country: 'Ireland' }), {
      userText: TURN_1,
      turns: [{ role: 'user', content: TURN_1 }, { role: 'user', content: 'We are based in Ireland.' }],
    })
    expect(r.status).toBe(200)
    expect(countryOf(r)).toBe('Ireland')
  })

  it('🛑 AND THE VERDICT DOES NOT DEPEND ON HOW THE CLIENT PHRASED IT', async () => {
    // ⚠️ THIS IS THE ANTI-PARSER TOOTH FOR THE COUNTRY. The SAME model output is replayed
    // against materially different transcripts — badly spelled, lower case, no punctuation,
    // a sentence about somebody else entirely. If any of them changes the stored country,
    // something in the server is reading the conversation again, and that is the defect
    // R121 exists to forbid.
    for (const said of [
      'We are based in Ireland.',
      'we uk based mate',                       // the model resolved this to Ireland? irrelevant —
      'Our partner is based in Ireland.',       // the server must not re-decide either way
      'HQ is Dublin',
      'i am in ireland',
      '',
    ]) {
      const r = await dispatch(COMPLETE({ country: 'Ireland' }), {
        userText: TURN_1,
        turns: [{ role: 'user', content: TURN_1 }, ...(said ? [{ role: 'user' as const, content: said }] : [])],
      })
      expect(countryOf(r), `the server re-read the transcript for: ${said || '(no second turn)'}`)
        .toBe('Ireland')
    }
  })

  it('🛑 NO DELETED PARSER MAY RETURN — the guard module is gone and nothing imports it', () => {
    expect(existsSync(join(process.cwd(), 'apps/api/src/lib/brief-truth-guards.ts')),
      'the language guard is back').toBe(false)
    const ICPS = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
    const live = ICPS.split('\n').filter(l => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*')).join('\n')
    expect(live).not.toContain('countryHasCustomerEvidence')
    expect(live).not.toContain('brief-truth-guards')
    // …and the country line is the same plain shape as the company name beside it.
    expect(live).toContain("country:      str(p.country) || resolved.country || ''")
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
    // ⛓️ 16 Sep (S1-ONB-001) — the stored country, so this block still tests what it is named
    // for: that the model's SUMMARY never reaches the client. Without it the completion would
    // be refused for readiness and there would be no summary to suppress.
    brief_so_far: { ...TURN_1_FACTS, country: 'Ireland' },
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
    // ⛓️ 16 Sep (S1-ONB-001) — the fixture now holds a STORED country (readiness requires one),
    // so the assertion sharpens from "empty" to "not the one the summary invented". The
    // guarantee is the same and stronger: the sentence claimed the UK and the card says Ireland.
    expect((d.profile as Record<string, unknown>).country, 'the card carries THEIR answer').toBe('Ireland')
    expect((d.profile as Record<string, unknown>).country,
      'never the country the suppressed summary asserted').not.toBe('United Kingdom')
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


// ═══════════════════════════════════════════════════════════════════════════════════════
// § K — R121 · THE CONVERSATIONAL INVARIANTS
//
// 🛑 WHAT THESE PROVE, AND WHAT THEY CANNOT. They prove the SERVER keeps its side of the
// bargain: it stores what the model understood, it never loses a fact to a correction, it
// never lets a badly-typed turn become a technical error, and — the one that matters most —
// IT DOES NOT READ THE CONVERSATION. Whether the model understands "we uk based mate" is a
// model question that only the live eval and the founder's walk can answer.
//
// ⚠️ THE ANTI-PARSER TOOTH IS THE FIRST TEST AND IT IS THE POINT OF THE WHOLE BUILD. The same
// model output is replayed against materially different transcripts. If the stored result
// changes, something deterministic is interpreting the customer's words — which is exactly
// what R121 forbids and exactly what five rounds of country regex kept re-introducing.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 R121 · the server stores meaning; it does not read English', () => {
  /** Materially different ways a person might say the same things. */
  const PHRASINGS = [
    "I'm Jacques and I run Northstar Revenue. We're a B2B sales consultancy.",
    'jacques here. northstar. we do b2b sales consulting',
    'JACQUES — NORTHSTAR REVENUE — b2b sales consultancy!!',
    'hi im jacques i run northstar revenu we help founders with there pipeline',
    'Northstar Revenue\nJacques\nB2B sales consultancy',
    'so basically, right, we are called Northstar Revenue, i am Jacques, and what we actually do, if you want the long version, is we help founder-led service businesses build predictable pipeline, which is a fancy way of saying we get them meetings',
  ]

  const SAME_REPLY = {
    type: 'question' as const,
    content: 'Got it. Who are your best customers?',
    brief_so_far: { contact_name: 'Jacques', company_name: 'Northstar Revenue', what_they_do: 'B2B sales consultancy' },
  }

  it('🛑 THE ANTI-PARSER TOOTH · the same understanding stores identically however it was typed', async () => {
    const results: string[] = []
    for (const said of PHRASINGS) {
      const r = await dispatch(SAME_REPLY, { userText: said, turns: [{ role: 'user', content: said }] })
      expect(r.status, `a customer's phrasing became a technical failure: ${said.slice(0, 40)}`).toBe(200)
      results.push(JSON.stringify(r.saved.map(s => s.facts)))
    }
    // Every transcript produced the identical durable record. A difference here means some
    // branch is reading the words.
    expect(new Set(results).size, `the stored Brief depended on HOW they typed it:\n${[...new Set(results)].join('\n')}`)
      .toBe(1)
  })

  it('🛑 several facts in ONE message are all captured — no one-fact-per-turn throttle', async () => {
    const r = await dispatch({
      type: 'question', content: 'And who should we avoid?',
      brief_so_far: {
        contact_name: 'Jacques', company_name: 'Northstar Revenue', website_none: true,
        what_they_do: 'B2B sales consultancy', target_category: 'agencies and consultancies',
        geographies: ['United Kingdom', 'United States'], company_sizes: ['11–50'],
        job_titles: ['Founder', 'CEO'], seniority_levels: ['C-Suite'],
      },
    }, { userText: TURN_1 })
    expect(r.status).toBe(200)
    expect(Object.keys(r.saved[0].facts).length, 'the server dropped facts the model understood').toBe(9)
  })

  it('🛑 A CORRECTION ADDS · "also the US" keeps the UK', async () => {
    const r = await dispatch({
      type: 'question', content: 'Added — anything else?',
      brief_list_ops: { geographies: { add: ['United States'] } },
    }, { userText: 'actually include the US as well', held: { geographies: ['United Kingdom'] } })
    expect(r.status).toBe(200)
    expect(r.saved[0].facts.geographies).toEqual(['United Kingdom', 'United States'])
  })

  it('🛑 A CORRECTION REMOVES · and the rest of the list survives', async () => {
    const r = await dispatch({
      type: 'question', content: 'Dropped.',
      brief_list_ops: { company_sizes: { remove: ['1–10'] } },
    }, { userText: 'forget the tiny ones', held: { company_sizes: ['1–10', '11–50', '51–200'] } })
    expect(r.status).toBe(200)
    expect(r.saved[0].facts.company_sizes).toEqual(['11–50', '51–200'])
  })

  it('🛑 A RESTATEMENT STILL REPLACES — the client may narrow to one market deliberately', async () => {
    const r = await dispatch({
      type: 'question', content: 'Just the UK then.',
      brief_so_far: { geographies: ['United Kingdom'] },
    }, { userText: 'actually just the UK now', held: { geographies: ['United Kingdom', 'United States'] } })
    expect(r.status).toBe(200)
    expect(r.saved[0].facts.geographies).toEqual(['United Kingdom'])
  })

  it('🛑 AN UNRELATED QUESTION MID-BRIEF IS STILL A TURN — facts held, no error', async () => {
    const r = await dispatch({
      type: 'question', content: 'We charge $299 to start, then per approved lead. Now — who should we avoid?',
      brief_so_far: { contact_name: 'Jacques' },
    }, { userText: 'hang on, how much does this cost?', held: { company_name: 'Northstar Revenue' } })
    expect(r.status).toBe(200)
    expect((r.json.data as Record<string, unknown>).type).toBe('question')
    expect(r.saved[0].facts.contact_name).toBe('Jacques')
  })

  it('🛑 NOTHING DETERMINISTIC READS THE TRANSCRIPT — the route never inspects message text', () => {
    // ⚠️ SCOPED TO THE HANDLER. `messages` is the customer's own words; the route may WINDOW
    // and FORWARD them, and must never test, match or search them. This is the guard that
    // makes a returning parser fail rather than merely look wrong in review.
    const ICPS = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
    const from = ICPS.indexOf("icpRouter.post('/builder/chat'")
    const to = ICPS.indexOf('icpRouter.post(', from + 10)
    const route = ICPS.slice(from, to > from ? to : undefined)
    const live = route.split('\n').filter(l => {
      const t = l.trimStart()
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
    }).join('\n')
    for (const forbidden of [
      /\bmessages\b[^\n]*\.(test|match|search)\(/,
      /\.(test|match)\([^)]*\b(content|userText|message)\b/,
      /\b(content|m\.content)\s*\.\s*(includes|toLowerCase|match|search)\s*\(/,
    ]) {
      expect(live, `the route is interpreting the customer's words: ${forbidden}`).not.toMatch(forbidden)
    }
  })
})
