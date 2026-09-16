// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-ONB-003 — A FACT THAT REACHED NO DATABASE MAY NOT ADVANCE ONBOARDING.
//
// ── THE QUESTION THIS ANSWERS ──────────────────────────────────────────────────────────
//
// S1-ONB-001 made the draft SUFFICIENT: the turn resolves all four homes and writes that
// resolution into `onboarding_brief_drafts`, so one authority reading the draft alone agrees
// with the chat gate. `held` is deliberately only advanced `if (saved.ok)`.
//
// 🛑 BUT THE GATE DOES NOT COUNT `held`. It counts `resolvedBriefFor(v, held)` — the durable
// record UNIONED WITH THIS TURN'S MODEL REPLY. That union is correct while the write
// succeeds, because the write stored exactly the same projection. It is NOT correct when the
// write FAILS: `held` correctly stays behind, and the reply half of the union carries the
// final fact anyway.
//
// So the shape under test is precisely:
//
//   persisted draft is missing ONE required item
//   → the customer supplies it in THIS turn
//   → the model returns a valid `complete`
//   → `saveBriefDraft` FAILS
//   → the record still lacks that item
//   → may the API answer `complete` / `onboarding_state: 'ready'`?
//
// ⚠️ THE RULE: NO DURABLE WRITE = NO NEW FACT AUTHORITY = NO READY ADVANCEMENT. A model may
// understand something perfectly; if that truth did not reach canonical memory, the turn must
// not advance onboarding on it. The client's next act after `ready` is CONFIRM, which promotes
// a draft — and a draft that never received the fact cannot honour the plan they approved.
//
// ⚠️ THIS IS THE WRITE-SIDE TWIN OF `mustNotConfirm`. An unreadable record already withholds
// a completion (S1-RT-009). An unWRITEable one did not.
//
// ⚠️ EVERY TEST DRIVES THE REAL ROUTE. The Anthropic SDK is a double returning an exact tool
// payload; the schema, the gate, the persist and the response are the live ones. The double
// counts its invocations and the count is asserted — no fix here may cost a second call.
// ═══════════════════════════════════════════════════════════════════════════════════════

process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Everything the eleven need, and the one account fact. No `exclusions` — that is the fact
 *  each scenario below supplies in the CURRENT turn. */
const HELD_BUT_ONE: Record<string, unknown> = {
  contact_name:        'Daniel Brooks',
  company_name:        'Cedar Peak Advisory',
  website_none:        true,
  what_they_do:        'helps B2B service businesses build a predictable new-business pipeline',
  target_category:     'founder-led agencies and consultancies',
  geographies:         ['United Kingdom', 'United States'],
  target_company_type: 'consultancy',
  company_sizes:       ['11-50'],
  job_titles:          ['Founder', 'CEO', 'Managing Director'],
  desired_outcome:     'qualified new-business meetings',
  country:             'United Kingdom',
}

/** The final item, given by the customer in the turn under test. */
const FINAL_ITEM = 'no recruitment agencies, no software companies'

type SaveMode = 'ok' | 'unstorable' | 'unverifiable' | 'throws'

type Dispatched = {
  status: number; json: Record<string, unknown>; raw: string
  logs: string[]
  /** How many times the model was called. A fix may not add a second call. */
  calls: number
  /** The draft as it stands AFTER the turn — the canonical record. */
  store: Record<string, unknown>
}

async function dispatch(
  modelInput: unknown,
  opts: { held?: Record<string, unknown>; save?: SaveMode } = {},
): Promise<Dispatched> {
  vi.resetModules()
  const logs: string[] = []
  const counter = { calls: 0 }
  const save: SaveMode = opts.save ?? 'ok'

  vi.doMock('@anthropic-ai/sdk', () => ({
    default: class {
      messages = {
        create: async () => {
          counter.calls += 1
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
  // 🛑 A REAL MERGING STORE, AND A REAL REFUSAL. On a failed save the store is left exactly as
  // it was — which is the whole point: the record genuinely does not hold the final item.
  const store: Record<string, unknown> = { ...(opts.held ?? {}) }
  vi.doMock('./brief-draft', async () => {
    const actual = await vi.importActual<typeof import('./brief-draft')>('./brief-draft')
    return {
      ...actual,
      saveBriefDraft: async (_u: string, facts: Record<string, unknown>) => {
        if (save === 'throws') throw new Error('write blew up')
        if (save !== 'ok') return { ok: false, reason: save }
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
        messages: [{ role: 'user', content: 'No recruitment agencies and no software companies, please.' }],
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
      return { ...out, logs, store, calls: counter.calls }
    } finally { await new Promise<void>(r => server.close(() => r())) }
  } finally { console.error = err; console.log = log; console.warn = warn }
}

afterEach(() => {
  vi.doUnmock('@anthropic-ai/sdk'); vi.doUnmock('@kind/db')
  vi.doUnmock('../middleware/auth'); vi.doUnmock('./brief-draft')
  vi.resetModules()
})

/** The model declares the Brief finished and supplies the final item in THIS reply. */
const COMPLETE_WITH_FINAL_ITEM = {
  type: 'complete',
  content: 'That is everything I need.',
  summary: 'Founder-led agencies in the UK and US.',
  icp: { name: 'Founder-led agencies' },
  profile: {}, business: {},
  brief_so_far: { exclusions: FINAL_ITEM },
}

const dataOf = (d: Dispatched) => (d.json.data ?? {}) as Record<string, unknown>
const typeOf = (d: Dispatched) => dataOf(d).type as string | undefined

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('Ⓐ the control — the same turn, with the write SUCCEEDING', () => {
  it('the final item reaches the record and the turn is allowed to complete', async () => {
    const d = await dispatch(COMPLETE_WITH_FINAL_ITEM, { held: HELD_BUT_ONE, save: 'ok' })

    expect(d.status, 'a good turn is not a failure').toBe(200)
    expect(typeOf(d), 'the write succeeded, so READY is earned').toBe('complete')
    expect(dataOf(d).onboarding_state).toBe('ready')
    expect(d.store.exclusions, 'and the record actually holds it').toBe(FINAL_ITEM)
    expect(d.calls, 'exactly one model call').toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('Ⓑ 🛑 THE DEFECT — the write FAILS and the fact exists only in the reply', () => {
  //  Each mode is a real `SaveOutcome` from `saveBriefDraft`: `unstorable` is the upsert
  //  erroring or the migration not being applied; `unverifiable` is fail-closed because the
  //  row could not be read first, which is the MORE dangerous one — it means we do not know
  //  what the record holds at all.
  for (const mode of ['unstorable', 'unverifiable'] as const) {
    it(`a failed save (${mode}) MUST NOT produce a completion`, async () => {
      const d = await dispatch(COMPLETE_WITH_FINAL_ITEM, { held: HELD_BUT_ONE, save: mode })

      expect(d.store.exclusions, 'precondition: the record still lacks the final item').toBeUndefined()
      expect(typeOf(d), 'a fact that reached no database may not advance onboarding').not.toBe('complete')
      expect(dataOf(d).onboarding_state, 'and READY is never claimed').not.toBe('ready')
    })

    it(`a failed save (${mode}) grants no Confirm authority and promotes nothing`, async () => {
      const d = await dispatch(COMPLETE_WITH_FINAL_ITEM, { held: HELD_BUT_ONE, save: mode })
      const data = dataOf(d)

      // `proposed` is built from `data.icp`; without it the portal has no plan content, and
      // `serverReady && proposed` therefore cannot open the Confirm CTA on either half.
      expect(data.icp, 'no plan content may be presented for approval').toBeFalsy()
      expect(d.store.confirmed_at, 'nothing is confirmed').toBeUndefined()
      expect(d.store.promoted_client_id, 'nothing is promoted').toBeUndefined()
    })

    it(`a failed save (${mode}) fabricates nothing and costs no second model call`, async () => {
      const d = await dispatch(COMPLETE_WITH_FINAL_ITEM, { held: HELD_BUT_ONE, save: mode })

      expect(d.calls, 'NO SECOND PROVIDER CALL — a failed write is not a reason to re-roll').toBe(1)
      // The record is the record. A failure must not invent the fact, a default, or a blank.
      expect(Object.keys(d.store).sort(), 'the record is untouched by a failed write')
        .toEqual(Object.keys(HELD_BUT_ONE).sort())
    })

    it(`a failed save (${mode}) reads as OUR failure, not as Milla and not as a missing fact`, async () => {
      const d = await dispatch(COMPLETE_WITH_FINAL_ITEM, { held: HELD_BUT_ONE, save: mode })

      // 🛑 AN HONEST SYSTEM FAILURE. Retryable, and the portal renders it as an error.
      expect(d.status).toBe(503)
      expect((d.json as { retryable?: boolean }).retryable).toBe(true)
      expect(d.json.success).toBe(false)

      // 🛑 NOTHING IS ATTRIBUTED TO MILLA. Her closing sentence was written to END the
      // conversation; delivering it as the turn meant to CONTINUE it is the Cedar Peak
      // stranding (AR22). It must not appear anywhere in the response.
      expect(d.raw).not.toContain('That is everything I need')

      // 🛑 AND WE DO NOT ASK FOR SOMETHING THEY ALREADY GAVE. The S1-RT-010 recovery names an
      // OUTSTANDING fact; here nothing is outstanding — we simply failed to keep it. Naming
      // `exclusions` would be false.
      expect(d.json.data, 'no recovery state on a write failure').toBeUndefined()
      expect(d.raw).not.toContain('exclusions')

      // The write failure is diagnosable, and it is told apart from the read failure.
      expect(d.logs.join('\n')).toContain('BRIEF_UNWRITTEN_NO_CONFIRMATION')
      expect(d.logs.join('\n')).toContain('"stage":"brief_write"')
    })
  }

  it('a save that THROWS cannot produce a completion either', async () => {
    const d = await dispatch(COMPLETE_WITH_FINAL_ITEM, { held: HELD_BUT_ONE, save: 'throws' })

    expect(typeOf(d), 'an exception is not an advancement').not.toBe('complete')
    expect(dataOf(d).onboarding_state).not.toBe('ready')
    expect(d.store.exclusions, 'and nothing was written').toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('Ⓒ a failed write does not break the ordinary conversation', () => {
  // F · a question-shaped reply, through a failed write AND through a store that is not
  //     there at all. ADVANCEMENT fails closed; the CONVERSATION does not.
  for (const [label, held] of [
    ['a failed write', HELD_BUT_ONE],
    ['no durable store at all', {}],
  ] as const) {
    it(`a QUESTION turn still answers through ${label} — it needs no durable truth`, async () => {
      const ASKED = 'And who should we leave out?'
      const d = await dispatch(
        { type: 'question', content: ASKED, brief_so_far: { exclusions: FINAL_ITEM } },
        { held, save: 'unstorable' },
      )

      expect(d.status, 'the client is never charged a failed turn for our write').toBe(200)
      expect(typeOf(d)).toBe('question')
      expect(dataOf(d).onboarding_state, 'answering is not advancing').not.toBe('ready')
      // 🛑 MILLA'S OWN SENTENCE, UNCHANGED AND UNWRITTEN BY US. Nothing composes English on
      // her behalf here or anywhere — the conversation must not become a form (R121).
      expect(dataOf(d).content).toBe(ASKED)
      expect(d.calls, 'one model call').toBe(1)
    })
  }

  it('a completion that was ALREADY short stays short — the write outcome changes nothing', async () => {
    const short = { ...HELD_BUT_ONE }
    delete short.country
    const d = await dispatch(COMPLETE_WITH_FINAL_ITEM, { held: short, save: 'unstorable' })

    expect(typeOf(d), 'still not a completion').not.toBe('complete')
  })

})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('Ⓔ 🛑 NO DURABLE CANONICAL BRIEF AT ALL — the same answer (S1-ONB-004)', () => {
  // ⛓️ 16 Sep — THIS BLOCK USED TO ASSERT THE OPPOSITE. S1-ONB-003 deliberately spared the
  // case where no durable record had been read, because the gate had counted the model sample
  // alone in that state since long before S1-ONB-001, and widening it was a product decision
  // I reported rather than took. **The founder ruled: FAIL CLOSED UNIVERSALLY.** The old
  // best-effort degradation is SUPERSEDED, and the reason is that the two states look
  // identical to the person on the screen — a finished plan with a live "Confirm my brief" is
  // one click from PROMOTION, and a promotion whose Brief was never written is a client whose
  // targeting exists nowhere. "We could not keep what you told us" is the only honest answer.
  //
  // ⚠️ THE MODEL SUPPLIES EVERYTHING HERE. Nothing is missing, nothing is premature, the
  // reply would satisfy the gate on its own — and that is precisely the point being refused.
  const EVERYTHING = { ...HELD_BUT_ONE, exclusions: FINAL_ITEM }
  const FULL_REPLY = { ...COMPLETE_WITH_FINAL_ITEM, brief_so_far: EVERYTHING }

  for (const [label, mode] of [
    ['D · no durable draft + a failed write', 'unstorable'],
    ['E · the draft store wholly unavailable', 'unverifiable'],
  ] as const) {
    it(`${label} → NOT ready, and nothing is presented for approval`, async () => {
      const d = await dispatch(FULL_REPLY, { held: {}, save: mode })

      expect(typeOf(d), 'a complete turn that cannot durably establish the Brief cannot complete')
        .not.toBe('complete')
      expect(dataOf(d).onboarding_state).not.toBe('ready')
      expect(dataOf(d).icp, 'no plan').toBeFalsy()
      expect(d.status, 'and it reads as our failure').toBe(503)
      expect((d.json as { retryable?: boolean }).retryable).toBe(true)
      expect(d.store.confirmed_at, 'nothing confirmed').toBeUndefined()
      expect(d.store.promoted_client_id, 'nothing promoted').toBeUndefined()
      expect(Object.keys(d.store), 'and the store is still empty — nothing was invented').toEqual([])
      expect(d.calls, 'one model call').toBe(1)
    })
  }

  it('🛑 and no country is inferred, defaulted or borrowed from the target geography', async () => {
    const noCountry = { ...EVERYTHING }
    delete noCountry.country
    const d = await dispatch(
      { ...FULL_REPLY, brief_so_far: noCountry },
      { held: {}, save: 'unstorable' },
    )

    expect(typeOf(d)).not.toBe('complete')
    // `geographies` names where their BUYERS are. It is not where the CLIENT is, and a
    // fallback from it would fabricate an account country out of a market list (AR23).
    expect(d.raw).not.toContain('South Africa')
    expect(d.store.country, 'and none was written').toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('Ⓓ the rule is in the source, not only in behaviour', () => {
  const ICPS = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')

  it('`held` is still advanced ONLY on a successful save', () => {
    expect(ICPS).toContain('if (saved.ok) held = { ...held, ...toStore }')
  })

  it('the write outcome is carried to the completion boundary, not discarded', () => {
    expect(ICPS, 'the write outcome is recorded').toContain('heldWritable = false')
    expect(ICPS, 'the completion boundary knows whether the write landed')
      .toMatch(/mustNotConfirm\s*=\s*\(!heldReadable \|\| !heldWritable\)/)
  })

  it('🛑 the rule is UNCONDITIONAL — the old `held non-empty` exception is gone', () => {
    // ⛓️ 16 Sep (S1-ONB-004, founder-locked). A failed canonical write blocks a completion
    // whether or not a record had been read. This assertion is the exception's tombstone.
    expect(ICPS).toContain('if (!saved.ok) {')
    // Anchored to the start of a line, so the struck-through record of the old form inside
    // the comment above it is not mistaken for the statement returning.
    expect(ICPS, 'no scope exception may return')
      .not.toMatch(/^\s*if \(!saved\.ok && Object\.keys\(held\)\.length > 0\)/m)
  })

  it('the scope is COMPLETIONS only — a failed write never refuses the conversation', () => {
    expect(ICPS).toMatch(/mustNotConfirm\s*=\s*\(!heldReadable \|\| !heldWritable\) && declaredType === 'complete'/)
  })

  it('the route still owns no second readiness definition', () => {
    // The fix adds a PRECONDITION on advancement; it must not add a rival counter. (Both
    // surviving `briefFactsFor` strings are struck-through prose recording its deletion.)
    expect(ICPS, 'the route cannot count the eleven at all').not.toMatch(/function\s+briefFactsFor\b/)
    expect(ICPS, 'and there is still one authority').not.toMatch(/function\s+\w*[Rr]eadiness\w*\s*\(/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('Ⓕ the UNREADABLE case (S1-RT-009) is unchanged by this fix', () => {
  const ICPS = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')

  it('an unreadable record still DEMOTES to the conversation, keeping Milla’s sentence', () => {
    // 🛑 THE TWO CASES SPLIT ON THE SENTENCE. Unreadable = we do not know what they told us,
    // so Milla carries the turn. Unwriteable = we know and failed to keep it, so it is our
    // error. Collapsing them would either strand the customer or hide a real system failure.
    expect(ICPS).toContain("parsed = heldReadable ? null : (asQuestion.success ? asQuestion.data : null)")
    expect(ICPS).toContain('BRIEF_UNREADABLE_NO_CONFIRMATION')
  })
})
