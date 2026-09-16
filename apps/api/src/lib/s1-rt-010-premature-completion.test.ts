// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-RT-010 — A VETOED COMPLETION MUST NOT STRAND THE CUSTOMER.
//
// ── THE RUNTIME DEFECT, FROM A FRESH PRODUCTION SIGNUP (16 Sep) ────────────────────────
//
// Daniel Brooks / Cedar Peak Advisory reached **10 of 11** Brief facts. `exclusions` was
// never asked and never given. The model declared `complete` anyway, with:
//
//     "Great, that's everything I need — thanks Daniel!"
//
// The server's eleven-fact gate refused the completion — correctly. S1-RT-007 then demoted
// the reply to a question rather than charging the customer a failed turn — also correctly —
// but it KEPT THAT SENTENCE. A sentence written to CLOSE the conversation was delivered as
// the turn meant to CONTINUE it, because `MillaQuestionReply` asks only that `content` be
// non-empty. The portal never received `complete`, so no plan and no "Confirm my brief"
// rendered, the right-hand panel stayed on its placeholder, and the last thing the customer
// was told was that nothing more was needed. A genuinely new person had no next action.
//
// ── WHAT IS PROVEN HERE ────────────────────────────────────────────────────────────────
//
// A. the exact Cedar Peak turn · B. a different missing fact · C. canonical ordering ·
// D. a genuine completion is untouched · E. an UNREADABLE record keeps its old fail-closed
// behaviour · F. an ordinary question turn is untouched · G. the portal renders product
// state, not a Milla bubble · H. the prompt carries the authoritative outstanding facts.
//
// ⚠️ EVERY BEHAVIOURAL TEST DRIVES THE REAL ROUTE. The Anthropic SDK is a double returning an
// exact tool payload; the schema, the gate, the prompt and the response are the live ones.
// **NO SECOND MODEL CALL EXISTS TO MOCK** — the double counts its own invocations and the
// count is asserted.
// ═══════════════════════════════════════════════════════════════════════════════════════

process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BRIEF_FACTS } from '@kind/shared'

/** Cedar Peak's persisted Brief: ten facts held, `exclusions` absent.
 *  ⛓️ 16 Sep (S1-ONB-001) — `country` added. It is NOT a twelfth Brief fact; it is the account
 *  requirement onboarding readiness now includes, so without it every case below would be held
 *  back by the country instead of by the fact each test is actually named for. */
const CEDAR_10: Record<string, unknown> = {
  country:             'United Kingdom',
  contact_name:        'Daniel Brooks',
  company_name:        'Cedar Peak Advisory',
  website_none:        true,
  what_they_do:        'helps B2B service businesses improve their sales process and build a more predictable new-business pipeline',
  target_category:     'founder-led agencies and consultancies',
  geographies:         ['United Kingdom', 'United States'],
  target_company_type: 'consultancy',
  company_sizes:       ['11-50'],
  job_titles:          ['Founder', 'CEO', 'Managing Director'],
  desired_outcome:     'qualified new-business meetings',
}

/** The sentence that stranded them, verbatim. */
const VETOED_SENTENCE = "Great, that's everything I need — thanks Daniel!"

/** A `complete` payload shaped exactly as the live one was. */
function completeReply(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type:    'complete',
    content: VETOED_SENTENCE,
    summary: 'Here is the targeting plan I would recommend.',
    profile: { company_name: 'Cedar Peak Advisory', contact_name: 'Daniel Brooks', website_none: true },
    icp:     { target_category: 'founder-led agencies and consultancies', geographies: ['United Kingdom', 'United States'] },
    business: { product: 'B2B sales consultancy' },
    campaign_intent: '',
    brief_so_far: {},
    ...overrides,
  }
}

type Dispatched = {
  status: number
  json: Record<string, unknown>
  raw: string
  logs: string[]
  /** Every system prompt the model was called with. Length IS the call count. */
  prompts: string[]
}

async function dispatch(
  modelInput: unknown,
  opts: {
    held?: Record<string, unknown>
    /** Make the durable-Brief read THROW — not "empty", but "unreadable". */
    heldThrows?: boolean
    /** When false, `writableBriefDraft` answers null, as a brand-new client's would. */
    draftReadable?: boolean
    userText?: string
  } = {},
): Promise<Dispatched> {
  vi.resetModules()
  const logs: string[] = []
  const prompts: string[] = []

  vi.doMock('@anthropic-ai/sdk', () => ({
    default: class {
      messages = {
        create: async (body: { system?: string }) => {
          prompts.push(String(body?.system ?? ''))
          return {
            stop_reason: 'tool_use',
            content: [{ type: 'tool_use', name: 'milla_reply', input: modelInput }],
          }
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
  // A real merging store, so "the recovery names the fact the GATE refused on" is a claim
  // about state across the save and the read-back rather than about a stub.
  const store: Record<string, unknown> = { ...(opts.held ?? {}) }
  vi.doMock('./brief-draft', () => ({
    saveBriefDraft: async (_u: string, facts: Record<string, unknown>) => {
      Object.assign(store, facts); return { ok: true }
    },
    briefDraftFor: async () => {
      if (opts.heldThrows) throw new Error('durable brief unreadable')
      return { confirmedAt: null, promotedClientId: null, facts: store }
    },
    writableBriefDraft: async () =>
      opts.draftReadable === false ? null : { confirmedAt: null, promotedClientId: null, facts: store },
    saveBriefConversation: async () => ({ ok: true }),
    rememberCustomerTurn: async () => ({ ok: true }),
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
        messages: [{ role: 'user', content: opts.userText ?? 'That is everything about us.' }],
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
      return { ...out, logs, prompts }
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

type Outstanding = { remaining: number; total: number; next: { id: string; label: string } }
const outstandingOf = (d: Dispatched): Outstanding =>
  (d.json.data as { brief_outstanding: Outstanding }).brief_outstanding

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('Ⓐ the exact Cedar Peak turn — 10 of 11, exclusions absent', () => {
  it('is NOT reported complete, suppresses the vetoed sentence, and names exclusions', async () => {
    const r = await dispatch(completeReply(), { held: CEDAR_10 })

    expect(r.status).toBe(200)
    const d = r.json.data as Record<string, unknown>

    // 🛑 ①  NOT COMPLETE. No plan may be presented for approval on ten facts.
    expect(d.type, 'a vetoed completion may NEVER be reported as complete').toBe('outstanding')
    expect(d.icp, 'no targeting is proposed').toBeUndefined()
    expect(d.summary).toBeUndefined()

    // 🛑 ②  THE SENTENCE NEVER REACHES THE CUSTOMER. Asserted against the RAW body, so it
    // cannot hide in a nested field the assertions above do not read.
    expect(d.content, 'the vetoed sentence is not delivered as a turn').toBeUndefined()
    expect(r.raw, 'and it is nowhere in the response at all').not.toContain("everything I need")
    expect(r.raw).not.toContain('thanks Daniel')

    // 🛑 ③  THE AUTHORITATIVE MISSING FACT, from the server's own counter.
    const o = outstandingOf(r)
    expect(o.next.id, 'the fact the gate refused on').toBe('exclusions')
    expect(o.next.label).toBe('Exclusions')
    expect(o.remaining).toBe(1)
    expect(o.total).toBe(11)

    // 🛑 ④  ONE MODEL CALL. The founder ruled out a second corrective call; this is the proof
    // rather than a promise, because the double counts every invocation.
    expect(r.prompts, 'exactly one provider call for this turn').toHaveLength(1)

    // 🛑 ⑤  NOTHING IS FINISHED, PROMOTED OR GRANTED. The route never confirms, never
    // promotes and never touches Proof — and `@kind/db` throws on any direct table read, so
    // reaching one would have failed this test outright.
    expect(r.raw).not.toContain('confirmed_at')
    expect(r.raw).not.toContain('proof')
    expect(r.logs.join('\n')).toContain('premature completion vetoed')
  })
})

describe('Ⓑ a DIFFERENT missing fact — nothing is hard-coded to exclusions', () => {
  it('names desired_outcome when that is what is absent', async () => {
    const { desired_outcome: _drop, ...held } = CEDAR_10
    const r = await dispatch(completeReply(), { held: { ...held, exclusions: 'no recruitment agencies' } })

    expect((r.json.data as Record<string, unknown>).type).toBe('outstanding')
    const o = outstandingOf(r)
    expect(o.next.id).toBe('desired_outcome')
    expect(o.next.label).toBe('Desired outcome')
    expect(o.remaining).toBe(1)
  })

  it('names company_type when THAT is what is absent', async () => {
    const { target_company_type: _drop, ...held } = CEDAR_10
    const r = await dispatch(completeReply(), { held: { ...held, exclusions: 'no software companies' } })

    const o = outstandingOf(r)
    expect(o.next.id).toBe('company_type')
    expect(o.remaining).toBe(1)
  })
})

describe('Ⓒ several facts missing — the canonical order decides, never this route', () => {
  it('counts them all and surfaces the EARLIEST in the approved order', async () => {
    // Drop three, deliberately out of order, so a naive "last dropped" would answer wrong.
    const { desired_outcome: _a, target_company_type: _b, geographies: _c, ...held } = CEDAR_10
    const r = await dispatch(completeReply(), { held })

    const o = outstandingOf(r)
    // 🛑 THREE, NOT FOUR — AND THAT NUMBER IS THE PROOF THAT THIS USES THE GATE'S OWN
    // RESOLUTION. `geographies` was dropped from the DRAFT, but the reply's `icp.geographies`
    // still carries it, and `resolveBriefFacts` accepts a fact from EITHER home. So the gate
    // considers geography held, and the recovery agrees with it. A recovery computed from the
    // draft alone would have answered 4 and named a fact the customer had just supplied.
    expect(o.remaining, 'company_type + exclusions + desired_outcome').toBe(3)
    // `BRIEF_FACTS` is the one approved order; `company_type` precedes `exclusions`, which
    // precedes `desired_outcome`.
    expect(o.next.id).toBe('company_type')
    const order = [...BRIEF_FACTS]
    expect(order.indexOf('company_type')).toBeLessThan(order.indexOf('exclusions'))
    expect(order.indexOf('exclusions')).toBeLessThan(order.indexOf('desired_outcome'))
  })
})

describe('Ⓓ a GENUINE completion is untouched', () => {
  it('all eleven held → type complete, with its icp payload', async () => {
    const r = await dispatch(completeReply(), {
      held: { ...CEDAR_10, exclusions: 'no recruitment agencies, no software companies' },
    })

    expect(r.status).toBe(200)
    const d = r.json.data as Record<string, unknown>
    expect(d.type, 'the legitimate completion path is unchanged').toBe('complete')
    expect(d.icp, 'and it still carries the targeting').toBeTruthy()
    expect(d.brief_outstanding, 'no recovery state on a real completion').toBeUndefined()
    expect(r.prompts).toHaveLength(1)
  })
})

describe('Ⓔ an UNREADABLE durable Brief keeps its existing fail-closed behaviour', () => {
  it('claims no completion, and invents no missing fact', async () => {
    const r = await dispatch(completeReply(), { held: CEDAR_10, heldThrows: true })

    const d = r.json.data as Record<string, unknown>
    expect(d.type, 'never complete on a record we could not read').not.toBe('complete')
    expect(d.icp).toBeUndefined()
    // 🛑 NO FABRICATED RECOVERY TRUTH. We do not know what is missing, so we do not say —
    // and the customer is not asked to re-enter anything because OUR read failed.
    expect(d.brief_outstanding, 'nothing is inferred from an unreadable record').toBeUndefined()
    expect(r.raw).not.toContain('Exclusions')
    expect(r.logs.join('\n')).toContain('BRIEF_UNREADABLE_NO_CONFIRMATION')
  })
})

describe('Ⓕ an ordinary question turn is untouched', () => {
  it('a real question keeps Milla’s own sentence and emits no recovery state', async () => {
    const r = await dispatch({
      type: 'question',
      content: 'And who would you rather we did NOT contact?',
      brief_so_far: {},
    }, { held: CEDAR_10 })

    const d = r.json.data as Record<string, unknown>
    expect(d.type).toBe('question')
    expect(d.content, "her sentence is hers, and it is delivered").toContain('NOT contact')
    expect(d.brief_outstanding, 'recovery state ONLY when a completion was actually vetoed').toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// Ⓖ THE PORTAL — product state, never a Milla bubble.
//
// Source assertions, the same shape every other cross-surface guard in this repo uses. The
// claims are structural and a rendering test could not make them: that the notice lives
// OUTSIDE the message list, that nothing is appended to `messages`, that the composer is not
// disabled by it, and that this app holds no eleven-fact authority of its own.
// ═══════════════════════════════════════════════════════════════════════════════════════
const PORTAL = readFileSync(
  join(process.cwd(), 'apps/portal/src/app/(milla)/milla/welcome/page.tsx'), 'utf8',
)

describe('Ⓖ the portal consumes the structured recovery state', () => {
  it('handles the outstanding reply and appends NOTHING to the transcript', () => {
    const at = PORTAL.indexOf("if (d.type === 'outstanding')")
    expect(at, 'the branch exists').toBeGreaterThan(-1)
    const branch = PORTAL.slice(at, PORTAL.indexOf('return', at) + 10)
    // 🛑 NOT A MILLA BUBBLE. `setMessages` is how an assistant turn reaches the transcript;
    // this branch must never call it.
    expect(branch, 'no assistant message is fabricated').not.toContain('setMessages')
    expect(branch).toContain('setOutstanding(')
  })

  it('renders a notice outside the message list, and it is not attributed to Milla', () => {
    const at = PORTAL.indexOf('{outstanding && status === ')
    expect(at, 'the notice renders').toBeGreaterThan(-1)
    const block = PORTAL.slice(at, at + 1600)   // ⛓️ 16 Sep — the S1-ONB-002 comment widened it
    expect(block).toContain('role="status"')
    expect(block, 'the server\'s label, not a fact named here').toContain('{outstanding.label}')
    expect(block, 'no avatar, no Milla attribution').not.toContain('Milla')
  })

  it('the composer stays enabled — its disabled condition is unchanged', () => {
    // The input and the Send button gate on `status` / `thinking` / empty input ONLY. If
    // `outstanding` ever appeared in either, the recovery notice would be a dead end too.
    const form = PORTAL.slice(PORTAL.indexOf('<form onSubmit={e => { e.preventDefault(); send(input) }}'))
      .slice(0, 900)
    expect(form).toContain('disabled={status !== \'ready\'}')
    expect(form).toContain("disabled={status !== 'ready' || thinking || !input.trim()}")
    expect(form, 'the outstanding state must never close the composer').not.toContain('outstanding')
  })

  it('the recovery state is CLEARED by the next normal turn', () => {
    const deliver = PORTAL.slice(PORTAL.indexOf('const d = r.data'))
    expect(deliver).toContain('setOutstanding(null)')
  })

  it('this app holds no eleven-fact authority of its own', () => {
    for (const forbidden of ['BRIEF_FACTS', 'briefFacts(', 'nextBriefFact', "'exclusions'", 'BRIEF_FACT_LABEL']) {
      expect(PORTAL, `the portal must not contain ${forbidden}`).not.toContain(forbidden)
    }
    // 🛑 AND THE DENOMINATOR IS NEVER TYPED HERE. Both the count and the total come from the
    // server's own numbers — `o.total - o.remaining` — so an eleventh or twelfth fact cannot
    // make this screen disagree with the gate.
    expect(PORTAL).toContain('count: Math.max(0, o.total - o.remaining), total: o.total')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// Ⓗ RECURRENCE PREVENTION — the prompt is told what is outstanding, authoritatively.
//
// ⚠️ GUIDANCE, NOT AUTHORITY. The gate still refuses a short completion whatever the prompt
// says; Ⓐ above is that proof. This half exists so Milla ASKS rather than being refused.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('Ⓗ the prompt carries the authoritative outstanding facts', () => {
  it('names what is still outstanding, from the readable draft', async () => {
    const r = await dispatch(completeReply(), { held: CEDAR_10 })
    const system = r.prompts[0]

    expect(system, 'the outstanding block renders').toContain('WHAT IS STILL OUTSTANDING')
    expect(system, 'and it names the real gap').toContain('· Exclusions')
    expect(system, 'singular, because exactly one is missing').toContain('the ONE thing')
    // The held half is unchanged and still tells her not to re-ask.
    expect(system).toContain('WHAT THIS CLIENT HAS ALREADY TOLD YOU')
    expect(system).toContain('Cedar Peak Advisory')
    // 🛑 AND IT SAYS THE COMPLETION WILL BE REFUSED, so a model reading the prompt has no
    // reason to gamble on the sentence that stranded Cedar Peak.
    expect(system).toContain('may NOT answer "complete"')
  })

  it('says nothing outstanding when all eleven are held', async () => {
    const r = await dispatch(completeReply(), {
      held: { ...CEDAR_10, exclusions: 'no recruitment agencies' },
    })
    expect(r.prompts[0], 'no outstanding block when there is no gap').not.toContain('WHAT IS STILL OUTSTANDING')
  })

  it('degrades silently when the draft cannot be read', async () => {
    const r = await dispatch(completeReply(), { held: CEDAR_10, draftReadable: false })
    expect(r.prompts[0]).not.toContain('WHAT IS STILL OUTSTANDING')
    expect(r.status, 'and the turn still answers').toBe(200)
  })
})
