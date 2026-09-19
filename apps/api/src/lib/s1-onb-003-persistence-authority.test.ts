// ═══════════════════════════════════════════════════════════════════════════════════════
// ⛓️ 19 Sep — THIS RULE IS REVERSED BY THE FOUNDER, AND THE REVERSAL IS WHAT THIS FILE NOW
// PROVES. A FAILED BRIEF WRITE ALERTS US AND NEVER SILENCES MILLA.
//
// ── ⛓️ THE RULE THAT STOOD HERE, STRUCK 19 Sep ─────────────────────────────────────────
//
// ~~S1-ONB-003 / S1-ONB-004 — A FACT THAT REACHED NO DATABASE MAY NOT ADVANCE ONBOARDING.
// NO DURABLE WRITE = NO NEW FACT AUTHORITY = NO READY ADVANCEMENT, UNCONDITIONALLY.~~
//
// Its reasoning was sound and is recorded in full in PRODUCT-RULES AR24: a client shown a
// finished plan and a live "Confirm my brief" is one click from PROMOTION, and a promotion
// whose Brief was never written is a client whose targeting exists nowhere. Nothing below
// disputes that a durable Brief is better. What it got wrong is what to do when we cannot
// write one.
//
// 🛑 WHAT IT COST, MEASURED ON PRODUCTION, AND THE FOUNDER COUNTED FIFTY-TWO. The live log
// line is the whole diagnosis:
//
//     [icps/builder/chat] unusable model reply —
//       {"stage":"reply","category":"INVALID_SHAPE","stop_reason":"tool_use",
//        "model":"claude-sonnet-5","content_blocks":1,"input_key_count":5,"zod_paths":[]}
//
// `zod_paths: []` means `validated.success` — **Milla understood the client perfectly and
// produced a well-formed complete Brief.** The ONLY code that can null a validated completion
// is the `mustNotConfirm` branch, reached because `saveBriefDraft` refused and `heldWritable`
// went false. So a good answer was thrown away and the client was shown *"Milla didn't catch
// that — just try again in a moment."* The retry re-ran the identical state and was refused
// identically. **It could never succeed**, and every occurrence looked like a fresh transient
// hiccup because eight refusals share that one sentence.
//
// ⚠️ AND THE THREE REFUSALS IT FIRED ON ARE NOT THE CLIENT'S FAULT IN ANY OF THEM:
//   · `promoted`    — the draft is SEALED because the client is already real. Their targeting
//                     lives on `clients` + `icps`, which is a BETTER home than the draft.
//   · `unstorable`  — the upsert errored, e.g. `20260911_onboarding_brief_drafts` not applied.
//   · `unverifiable`— we could not read the row first, so we fail closed on the write itself.
// In all three the conversation is fine and the client is stopped by OUR infrastructure.
//
// 🛑 THE FOUNDER'S RULING (19 Sep), on the proposal *"if the notebook write fails, we alert
// you and let the client carry on — the way it worked before"*: **"yes agreed."** Before
// 16 Sep a failed draft write was logged and the journey continued; every client this product
// ever created was created that way. That behaviour is RESTORED, with one thing added that it
// never had: **the failure is now an alert and a Vida task**, so a silent degradation becomes
// a visible one.
//
// ⚠️ WHAT IS NOT WEAKENED, AND THIS IS THE CARE IN THE REVERSAL:
//   ① `held` is STILL only advanced on a successful save. A failed write grants no fact
//      authority — the gate simply no longer REFUSES on it.
//   ② The UNREADABLE case (S1-RT-009) is BYTE-UNCHANGED. Not knowing what the client told us
//      is a different thing from knowing and failing to keep it.
//   ③ Nothing is fabricated, no write is reported as succeeding, and there is NO SECOND
//      PROVIDER CALL.
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
  /**
   * ⚑ 19 Sep — every `sendFounderAlert` the turn raised. A degradation the founder is not
   * told about is the silent failure this reversal exists to end, so the alert is asserted
   * as load-bearing behaviour and not treated as decoration.
   */
  alerts: Array<{ kind: string; subject: string; lines: string[]; about?: Record<string, unknown> }>
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
  // ⚑ 19 Sep — the alert is observed, never sent. It must also never be AWAITED into the
  // client's turn: a founder's email vendor is not allowed to hold up somebody's answer.
  const alerts: Dispatched['alerts'] = []
  vi.doMock('./alerts', async () => {
    const actual = await vi.importActual<typeof import('./alerts')>('./alerts')
    return {
      ...actual,
      sendFounderAlert: async (kind: string, subject: string, lines: string[], about?: Record<string, unknown>) => {
        alerts.push({ kind, subject, lines, about })
        return { delivered: true, emailOk: true, slackOk: false, durableOk: true, taskOk: true }
      },
    }
  })
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
      // 🛑 THE ALERT IS DELIBERATELY NOT AWAITED INTO THE RESPONSE — that is the contract, so
      // it has NOT landed when the client is answered. It arrives after a dynamic `import()`
      // resolves, which is several ticks, so this waits for it rather than sampling once. A
      // single tick passed here by luck and would have been flaky in CI.
      const expectsAlert = (opts.save ?? 'ok') !== 'ok'
      for (let i = 0; i < 50 && expectsAlert && alerts.length === 0; i++) {
        await new Promise<void>(r => setTimeout(r, 5))
      }
      return { ...out, logs, store, calls: counter.calls, alerts }
    } finally { await new Promise<void>(r => server.close(() => r())) }
  } finally { console.error = err; console.log = log; console.warn = warn }
}

afterEach(() => {
  vi.doUnmock('@anthropic-ai/sdk'); vi.doUnmock('@kind/db')
  vi.doUnmock('../middleware/auth'); vi.doUnmock('./brief-draft'); vi.doUnmock('./alerts')
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
describe('Ⓑ 🛑 THE REVERSAL — the write FAILS and the client is carried through anyway', () => {
  //  Each mode is a real `SaveOutcome` from `saveBriefDraft`. `promoted` is the one that ran
  //  fifty-two times: the client is already real, so the draft is sealed by design and their
  //  targeting lives on `clients` + `icps` instead. `unstorable` is the upsert erroring or
  //  `20260911_onboarding_brief_drafts` not being applied. `unverifiable` is the row being
  //  unreadable before the write. NONE of the three is the client's doing, and under the old
  //  rule all three ended the conversation permanently.
  for (const mode of ['promoted', 'unstorable', 'unverifiable'] as const) {
    it(`🛑 a failed save (${mode}) STILL COMPLETES — this is the exact turn that 503'd`, async () => {
      const d = await dispatch(COMPLETE_WITH_FINAL_ITEM, { held: HELD_BUT_ONE, save: mode })

      expect(d.store.exclusions, 'precondition: the record still lacks the final item').toBeUndefined()
      expect(d.status, 'the client was charged our write failure').toBe(200)
      expect(typeOf(d), 'Milla understood perfectly and was silenced anyway').toBe('complete')
      expect(dataOf(d).onboarding_state).toBe('ready')
    })

    it(`a failed save (${mode}) delivers a plan to approve — and still narrates nothing`, async () => {
      const d = await dispatch(COMPLETE_WITH_FINAL_ITEM, { held: HELD_BUT_ONE, save: mode })
      const data = dataOf(d)

      // `proposed` is built from `data.icp`; without it the portal has no plan content and the
      // Confirm CTA can never open — which is precisely how the journey died.
      expect(data.icp, 'the plan the client is asked to approve').toBeTruthy()

      // 🛑 AND S1-RT-009 IS STILL IN FORCE. A completion deliberately carries `summary: null`:
      // the model's closing prose was the last client-facing sentence nobody checked, and it
      // sat beside cards built from the durable Brief. Carrying the client through a failed
      // write must not smuggle that sentence back — the facts live on the cards.
      expect(data.summary, 'the unchecked closing prose is back beside the plan').toBeNull()
    })

    it(`a failed save (${mode}) still writes nothing and costs no second model call`, async () => {
      const d = await dispatch(COMPLETE_WITH_FINAL_ITEM, { held: HELD_BUT_ONE, save: mode })

      expect(d.calls, 'NO SECOND PROVIDER CALL — a failed write is not a reason to re-roll').toBe(1)
      // 🛑 THE RECORD IS STILL THE RECORD. Carrying the client through must not be confused
      // with pretending the write happened: nothing is invented, defaulted or blanked.
      expect(Object.keys(d.store).sort(), 'the record is untouched by a failed write')
        .toEqual(Object.keys(HELD_BUT_ONE).sort())
      expect(d.store.confirmed_at, 'nothing is confirmed by a chat turn').toBeUndefined()
      expect(d.store.promoted_client_id, 'nothing is promoted by a chat turn').toBeUndefined()
    })

    it(`🛑 a failed save (${mode}) IS NOT SILENT — the founder is alerted and Vida gets a task`, async () => {
      const d = await dispatch(COMPLETE_WITH_FINAL_ITEM, { held: HELD_BUT_ONE, save: mode })

      // 🛑 THIS IS WHAT THE OLD BEHAVIOUR NEVER HAD. Before 16 Sep a failed write was logged
      // into a console nobody reads and the journey continued; the rule that replaced it
      // stopped the client instead. The answer is neither: carry the client, tell the founder.
      const raised = d.alerts.filter(a => a.kind === 'brief_write_failed')
      expect(raised.length, 'a degradation nobody is told about is the silent failure again').toBe(1)
      expect(raised[0].lines.join(' '), 'the alert does not name which refusal it was').toContain(mode)

      // One condition, one row — fifty-two turns must not file fifty-two tasks.
      expect(raised[0].about?.dedupeKey, 'every turn would file its own task').toBe(
        `brief_write_failed:${mode}:owner-user`,
      )

      // 🛑 AND NOTHING THE CLIENT SAID TRAVELS IN IT. An alert is our vocabulary — a reason
      // and an id — never their words.
      const text = JSON.stringify(raised[0])
      for (const secret of [FINAL_ITEM, 'Cedar Peak Advisory', 'Daniel Brooks']) {
        expect(text, `the client's own words reached an alert: ${secret}`).not.toContain(secret)
      }

      // The write failure stays diagnosable, and is still told apart from the read failure.
      expect(d.logs.join('\n')).toContain('"stage":"brief_write"')
      expect(d.logs.join('\n'), 'the reason must be greppable in the logs').toContain(mode)
    })

    it(`🛑 a failed save (${mode}) NEVER shows the retry sentence that could not work`, async () => {
      const d = await dispatch(COMPLETE_WITH_FINAL_ITEM, { held: HELD_BUT_ONE, save: mode })

      // ⛓️ THE FIFTY-TWO. `MILLA_RETRY_ERROR` promised that trying again would help, on a
      // refusal that was deterministic. It must not be reachable from a write outcome at all.
      expect(d.raw, 'the sentence that could never come true is back').not.toContain('didn’t catch that')
      expect(d.logs.join('\n'), 'the completion is being withheld again')
        .not.toContain('BRIEF_UNWRITTEN_NO_CONFIRMATION')
    })
  }

  it('a save that THROWS is carried exactly like a refusal', async () => {
    const d = await dispatch(COMPLETE_WITH_FINAL_ITEM, { held: HELD_BUT_ONE, save: 'throws' })

    expect(d.status, 'an exception must not be a dead end either').toBe(200)
    expect(typeOf(d)).toBe('complete')
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
describe('Ⓔ 🛑 NO DURABLE CANONICAL BRIEF AT ALL — carried too (reverses S1-ONB-004)', () => {
  // ⛓️ THIS BLOCK HAS NOW BEEN WRITTEN THREE TIMES, AND THE HISTORY IS THE POINT.
  //   · S1-ONB-003 (16 Sep) deliberately SPARED this case — no durable record had been read,
  //     and the gate had counted the model sample alone in that state for weeks.
  //   · S1-ONB-004 (16 Sep, same day) reversed that on the founder's ruling *"fail closed
  //     universally"*, because a finished plan one click from PROMOTION is dangerous.
  //   · 19 Sep — the founder reversed it again, on evidence: **"yes agreed."** Failing closed
  //     did not protect a single client, because no client got past it. A draft store that is
  //     wholly unavailable is exactly the state every client was in.
  //
  // ⚠️ THE DANGER S1-ONB-004 NAMED IS REAL AND IS ANSWERED ELSEWHERE, NOT DENIED. Promotion
  // without a draft does not invent targeting: `/auth/onboard` stands aside when there is no
  // draft (`auth.ts:252`), the draft override at `icps.ts:6444` stands aside, and the browser's
  // own four legs create the client exactly as they did before drafts existed — the path every
  // client this product has ever had was created through. What is NEW is that the founder is
  // told it happened.
  //
  // ⚠️ THE MODEL SUPPLIES EVERYTHING HERE. Nothing is missing and nothing is premature — so
  // the ONLY thing that could refuse this turn is the write outcome.
  const EVERYTHING = { ...HELD_BUT_ONE, exclusions: FINAL_ITEM }
  const FULL_REPLY = { ...COMPLETE_WITH_FINAL_ITEM, brief_so_far: EVERYTHING }

  for (const [label, mode] of [
    ['D · no durable draft + a failed write', 'unstorable'],
    ['E · the draft store wholly unavailable', 'unverifiable'],
  ] as const) {
    it(`🛑 ${label} → READY, with the plan presented and the founder told`, async () => {
      const d = await dispatch(FULL_REPLY, { held: {}, save: mode })

      expect(typeOf(d), 'a client with a complete Brief was stopped by our own storage')
        .toBe('complete')
      expect(dataOf(d).onboarding_state).toBe('ready')
      expect(dataOf(d).icp, 'the plan to approve').toBeTruthy()
      expect(d.status).toBe(200)
      expect(d.store.confirmed_at, 'nothing confirmed by a chat turn').toBeUndefined()
      expect(d.store.promoted_client_id, 'nothing promoted by a chat turn').toBeUndefined()
      expect(Object.keys(d.store), 'and the store is still empty — nothing was invented').toEqual([])
      expect(d.calls, 'one model call').toBe(1)
      expect(d.alerts.filter(a => a.kind === 'brief_write_failed').length, 'silently degraded').toBe(1)
    })
  }

  it('🛑 and no country is inferred, defaulted or borrowed from the target geography', async () => {
    // ⚠️ UNCHANGED IN INTENT BY THE REVERSAL. The turn now completes, but the gate that
    // refuses an INCOMPLETE Brief is untouched: a missing `country` is still missing, and it
    // is still never fabricated from the market list (AR23). This is the anti-vacuity proof
    // that the reversal loosened the WRITE rule and not the readiness rule.
    const noCountry = { ...EVERYTHING }
    delete noCountry.country
    const d = await dispatch(
      { ...FULL_REPLY, brief_so_far: noCountry },
      { held: {}, save: 'unstorable' },
    )

    expect(typeOf(d), 'an incomplete Brief completed — the readiness gate was loosened too')
      .not.toBe('complete')
    // `geographies` names where their BUYERS are. It is not where the CLIENT is, and a
    // fallback from it would fabricate an account country out of a market list (AR23).
    expect(d.raw).not.toContain('South Africa')
    expect(d.store.country, 'and none was written').toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('Ⓓ the rule is in the source, not only in behaviour', () => {
  const ICPS = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')

  it('🛑 `held` is STILL advanced ONLY on a successful save — this did NOT change', () => {
    // The reversal loosens what a failed write REFUSES. It must not loosen what a failed
    // write CLAIMS: the record still holds only what was actually kept.
    expect(ICPS).toContain('if (saved.ok) held = { ...held, ...toStore }')
  })

  it('🛑 THE WRITE OUTCOME CANNOT REACH THE COMPLETION BOUNDARY AT ALL', () => {
    // ⛓️ WAS: ~~`mustNotConfirm = (!heldReadable || !heldWritable) && …`~~. The flag is not
    // merely unset — no STATEMENT may declare or assign it, so no later edit can quietly
    // re-arm it. Anchored to the line start so the struck-through tombstones recording its
    // deletion are not mistaken for its return (the same guard the old Ⓓ block used).
    expect(ICPS, 'the flag that silenced fifty-two turns was re-declared')
      .not.toMatch(/^\s*(let|const|var) heldWritable/m)
    expect(ICPS, 'the flag that silenced fifty-two turns is being assigned again')
      .not.toMatch(/^\s*heldWritable\s*=/m)
    expect(ICPS, 'the completion boundary must consult the READ outcome alone')
      .toMatch(/mustNotConfirm\s*=\s*!heldReadable && declaredType === 'complete'/)
  })

  it('🛑 A FAILED WRITE IS ALERTED, NOT SWALLOWED — and never awaited into the turn', () => {
    // Restoring the pre-16-Sep behaviour without this would restore its silence too.
    expect(ICPS, 'the failure is not raised to the founder').toContain("'brief_write_failed'")
    expect(ICPS, 'the log the reason is greppable from').toContain('durable brief not written')
    // 🛑 FIRE-AND-FORGET BY CONTRACT. `void` + `.catch` is what keeps an email vendor out of
    // a client's turn; an `await` here would hand our outage to the person on the screen.
    expect(ICPS).toMatch(/void[\s\S]{0,400}sendFounderAlert/)
  })

  it('🛑 AND A THROWN SAVE IS CARRIED LIKE A REFUSAL, NOT PROPAGATED AS A 500', () => {
    // `saveBriefDraft` returns its failures, but a client must not be stranded by the one
    // path that throws instead — that would be the same dead end wearing a 500.
    expect(ICPS).toMatch(/try \{[\s\S]{0,200}await saveBriefDraft\(/)
  })

  it('the client is never told a retry will help on a deterministic write refusal', () => {
    expect(ICPS, 'the withheld-completion branch is back')
      .not.toContain('BRIEF_UNWRITTEN_NO_CONFIRMATION')
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
    // 🛑 THE TWO CASES ALWAYS SPLIT, AND ONLY ONE OF THEM MOVED ON 19 Sep. Unreadable = we do
    // not know what the client has told us, so a completion is demoted and Milla's own
    // sentence carries the turn. That is S1-RT-009 and it is untouched here — the reversal is
    // about the WRITE, where we know exactly what they said and merely failed to keep a copy.
    expect(ICPS).toContain('BRIEF_UNREADABLE_NO_CONFIRMATION')
    expect(ICPS, 'the unreadable demotion must survive the write-rule reversal')
      .toMatch(/parsed = asQuestion\.success \? asQuestion\.data : null/)
  })
})
