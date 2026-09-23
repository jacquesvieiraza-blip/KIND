// ═══════════════════════════════════════════════════════════════════════════════════════
// O1 DURABILITY — ONCE THE CUSTOMER HAS SENT IT, WE OWN IT. EVEN WHEN WE FAIL.
//
// ── THE DEFECT THIS CLOSES ─────────────────────────────────────────────────────────────
//
// The handoff itself worked: a sentence typed into the agent card reached canonical Milla.
// What it did not do was SURVIVE OUR FAILURE. At 5a1d6995 the sequence was
//
//   claim DELETES the sentence from the browser store
//     → `send()` posts to `/milla/sessions/:id/chat`
//       → the route calls the MODEL FIRST and only then writes `milla_messages`
//
// so a provider failure left the customer's words in React state and nowhere else. One
// reload and they had to retype — the exact thing the founder's rule forbids.
//
// ── WHAT IS PROVEN HERE, AND HOW ───────────────────────────────────────────────────────
//
// 🛑 THE DATABASE DOUBLE HONOURS THE PRIMARY KEY, and that is what makes the exactly-once
// claim mean anything. `milla_messages.id` is `uuid primary key default gen_random_uuid()`
// (supabase/migrations/008_milla.sql and 20260525_milla_vida_tables.sql), so a second insert
// of the same id is a Postgres 23505 unique violation. The double below returns exactly that
// and nothing else dedupes: if the route stopped supplying a stable id, two rows would
// appear here just as they would in production.
//
// ⚠️ REAL / MOCKED / SIMULATED, stated plainly so nothing reads as more than it is:
//   REAL      — `stashMillaHandoff` / `claimMillaHandoff` / `releaseMillaHandoff`, the REAL
//               `POST /milla/sessions/:sessionId/chat` and `GET /sessions/:id/messages`
//               handlers off `millaRouter`, and the route's own id derivation and ordering.
//   MOCKED    — `@kind/db` (in-memory, primary key enforced), the Anthropic SDK, the
//               programme/summary readers, founder alerts, auth.
//   SIMULATED — the browser store (a Map behind the real `HandoffStore` interface), a page
//               reload (`resetMillaHandoffPageLoad`, which a real reload does by
//               re-evaluating the module), and the HTTP hop (handlers are invoked directly).
//   NOT COVERED — the React mount itself. There is no jsdom/component-test infrastructure in
//               this repository; the mount is held by the source-wiring guards in
//               `milla-handoff-persists.route.test.ts`, which supplement this file and do
//               not substitute for it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  stashMillaHandoff, claimMillaHandoff, releaseMillaHandoff, peekMillaHandoff,
  resetMillaHandoffPageLoad, millaSendIdentity, unansweredCustomerTurn,
  type HandoffStore, type MillaSendIntent,
} from '@kind/shared'

type Row = Record<string, any>

/** The canonical store. Its ONLY writer is the production route's own `.insert(...)`. */
let millaMessages: Row[] = []
/** How many times the model was actually asked — a retry that replays must not re-ask. */
let modelCalls = 0
/** Make the provider fail, the way a 529 or a dropped response does. */
let modelFails = false
/** Make the canonical write fail for a reason that is NOT a duplicate. */
let storeFails = false

function makeStore(): HandoffStore & { raw: Map<string, string> } {
  const raw = new Map<string, string>()
  return {
    raw,
    getItem: k => (raw.has(k) ? raw.get(k)! : null),
    setItem: (k, v) => { raw.set(k, v) },
    removeItem: k => { raw.delete(k) },
  }
}

function installMocks() {
  vi.doMock('@anthropic-ai/sdk', () => {
    class FakeAnthropic {
      messages = {
        create: async () => {
          modelCalls += 1
          if (modelFails) throw new Error('provider unavailable (529)')
          return { content: [{ type: 'text', text: 'Got it — tell me more.' }] }
        },
      }
    }
    return { default: FakeAnthropic }
  })

  vi.doMock('@kind/db', () => {
    const build = (table: string) => {
      const q: any = { _session: null as string | null, _id: null as string | null, _asc: true }
      q.select = () => q
      q.eq = (col: string, val: unknown) => {
        if (col === 'session_id') q._session = String(val)
        if (col === 'id') q._id = String(val)
        return q
      }
      q.order = (_c: string, o?: { ascending?: boolean }) => { q._asc = o?.ascending !== false; return q }
      q.limit = () => q
      q.not = () => q
      q.single = async () => (table === 'milla_sessions'
        ? { data: { id: 'sess-1' }, error: null }
        : { data: null, error: null })
      q.maybeSingle = async () => {
        // The reply-replay lookup: a real primary-key read against the rows the route wrote.
        if (table === 'milla_messages') {
          const hit = millaMessages.find(m => m.id === q._id)
          return { data: hit ? { content: hit.content, sources: hit.sources } : null, error: null }
        }
        return { data: { id: 'c1', company_name: 'House' }, error: null }
      }
      q.insert = (row: Row) => {
        const run = () => {
          if (table !== 'milla_messages') return { error: null }
          if (storeFails) return { error: { code: '08006', message: 'connection failure' } }
          // 🛑 THE PRIMARY KEY, ENFORCED. This is the only dedup in this file.
          if (row.id != null && millaMessages.some(m => m.id === row.id)) {
            return { error: { code: '23505', message: 'duplicate key value violates unique constraint "milla_messages_pkey"' } }
          }
          millaMessages.push({ created_at: new Date(2026, 8, 15, 0, 0, millaMessages.length).toISOString(), ...row })
          return { error: null }
        }
        return { then: (r: (v: unknown) => void) => r(run()) }
      }
      q.then = (r: (v: unknown) => void) => {
        if (table === 'milla_messages') {
          const rows = millaMessages.filter(m => !q._session || m.session_id === q._session)
          r({ data: q._asc ? rows : [...rows].reverse(), error: null })
          return
        }
        r({ data: [], error: null })
      }
      return q
    }
    return { db: { from: (t: string) => build(t), rpc: async () => ({ data: null, error: null }) } }
  })

  vi.doMock('../lib/customer-programme', () => ({
    readCustomerProgramme: async () => ({
      stage: 'Proof', quickAction: 'Show me stronger examples',
      paused: false, pausedCopy: null, reviewOpen: false,
      outcome: { kind: 'meetings', target: null },
      progress: { delivered: 0, sourcingAuthorised: false, outcomesAchieved: 0 },
      money: { totalCents: 0, firstPaidAt: null, secondPaidAt: null },
      approvedAt: null, wentLiveAt: null,
    }),
  }))
  vi.doMock('../lib/milla-summary', () => ({
    buildMillaSummaryData: async () => ({ meetings_booked: 0, meetings_total: 0, replies_total: 0 }),
  }))
  vi.doMock('../lib/alerts', () => ({ sendFounderAlert: async () => {} }))
  vi.doMock('../middleware/auth', () => ({
    requireAuth: (_q: Row, _s: Row, n: () => void) => n(),
  }))
}

async function handlerFor(path: string, method: 'post' | 'get') {
  const { millaRouter } = await import('./milla')
  const layer = (millaRouter as unknown as { stack: any[] }).stack.find(
    l => l.route?.path === path && l.route?.methods?.[method],
  )
  if (!layer) throw new Error(`the canonical Milla route ${method.toUpperCase()} ${path} is gone`)
  return layer.route.stack[layer.route.stack.length - 1].handle
}

/**
 * EXACTLY WHAT `MillaConversation.send(text, handoffId)` DOES — post to the canonical route,
 * and release the handoff only on a success. The release rule is the component's; it is
 * reproduced here because the component cannot be mounted in this repository (see header).
 */
async function sendThroughCanonicalMilla(
  text: string, handoffId?: string, store?: HandoffStore,
): Promise<{ code: number; reply?: string }> {
  const handler = await handlerFor('/sessions/:sessionId/chat', 'post')
  const body = handoffId ? { message: text, messageId: handoffId } : { message: text }
  let code = 200
  let payload: Row = {}
  const res = { status: (c: number) => { code = c; return res }, json: (b: Row) => { payload = b; return res } } as any
  await handler({ params: { sessionId: 'sess-1' }, userId: 'u1', body, headers: {} }, res, () => {})
  if (code === 200 && handoffId) releaseMillaHandoff(handoffId, store)
  return { code, reply: payload.reply as string | undefined }
}

/**
 * 🛑 THE ORDINARY MILLA COMPOSER, DRIVEN THROUGH ITS OWN PRODUCTION RULE.
 *
 * `MillaConversation.send()` is a React function this repository cannot mount, so the piece
 * that decides identity was extracted into `@kind/shared` and is CALLED HERE — this is
 * `millaSendIdentity`, the real exported implementation, not a copy of its logic. What is
 * reproduced is only the component's three-line bookkeeping around it: hold the intent while
 * it is unresolved, clear it when the turn is answered.
 */
class Composer {
  pending: MillaSendIntent | null = null
  /** One customer send. Returns the identity it actually used, for the tests to assert on. */
  async send(text: string, handoffId?: string, store?: HandoffStore) {
    const intent = millaSendIdentity(text.trim(), this.pending, handoffId)
    this.pending = intent
    const r = await sendThroughCanonicalMilla(intent.text, intent.id, store)
    if (r.code === 200) this.pending = null            // resolved — no longer continuable
    return { ...r, id: intent.id }
  }
  /** A reload: React state, and with it the pending intent, is gone. The thread is not. */
  reload() { this.pending = null; resetMillaHandoffPageLoad() }
  /** What the provider does on mount: continue a customer turn canonical Milla never answered. */
  async continueUnanswered(rows: Row[]) {
    const waiting = unansweredCustomerTurn(rows as never)
    if (!waiting) return null
    return this.send(waiting.text, waiting.id)
  }
}

/** The re-entry read — the same call `MillaConversation` makes when the client comes back. */
async function readCanonicalThread(): Promise<Row[]> {
  const handler = await handlerFor('/sessions/:sessionId/messages', 'get')
  let payload: Row = {}
  const res = { status: () => res, json: (b: Row) => { payload = b; return res } } as any
  await handler({ params: { sessionId: 'sess-1' }, userId: 'u1', headers: {} }, res, () => {})
  return (payload.data ?? []) as Row[]
}

const userTurns = (text: string) =>
  millaMessages.filter(m => m.role === 'user' && m.content === text)
const assistantTurns = () => millaMessages.filter(m => m.role === 'assistant')

beforeEach(() => {
  vi.resetModules()
  millaMessages = []; modelCalls = 0; modelFails = false; storeFails = false
  resetMillaHandoffPageLoad()
  // Mocked Anthropic above; this only clears the "no key" short-circuit (R66, zero spend).
  process.env.ANTHROPIC_API_KEY = 'test-key-not-a-real-key'
  installMocks()
})
afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY
  vi.restoreAllMocks(); vi.resetModules()
})

const TYPED = 'We want to book qualified meetings with fintech founders in Germany'

// ════════════════════════════════════════════════════════════════════════════════════════
describe('O1 DURABILITY — our failure never costs the customer their sentence', () => {

  it('TEST 1 — SUCCESS: typed once → one customer turn, one Milla turn, present on re-entry', async () => {
    const store = makeStore()
    const handed = stashMillaHandoff(TYPED, store)!            // the agent card
    expect(handed.text).toBe(TYPED)
    const claimed = claimMillaHandoff(store)!                  // the canonical provider, on mount
    const { code } = await sendThroughCanonicalMilla(claimed.text, claimed.id, store)

    expect(code).toBe(200)
    expect(userTurns(TYPED), 'not exactly one canonical customer turn').toHaveLength(1)
    expect(assistantTurns(), 'not exactly one Milla turn').toHaveLength(1)
    // The handoff is let go only now — the turn is durably owned.
    expect(peekMillaHandoff(store), 'a completed turn left the sentence waiting').toBeNull()

    const thread = await readCanonicalThread()
    expect(thread.filter(m => m.role === 'user' && m.content === TYPED)).toHaveLength(1)
    expect(thread.some(m => m.role === 'assistant')).toBe(true)
  })

  it('TEST 2 — 🛑 PROVIDER FAILS: the customer turn is already ours, and the sentence is still held', async () => {
    const store = makeStore()
    const handed = stashMillaHandoff(TYPED, store)!
    const claimed = claimMillaHandoff(store)!
    modelFails = true
    const { code } = await sendThroughCanonicalMilla(claimed.text, claimed.id, store)

    expect(code).toBe(500)                                      // the turn failed, honestly
    // 🛑 AND THE CUSTOMER'S WORDS ARE OWNED ANYWAY — written before the model was asked.
    expect(userTurns(TYPED), 'the provider failed and canonical persistence kept NO customer turn')
      .toHaveLength(1)
    expect(assistantTurns(), 'a reply was stored for a turn that never produced one').toHaveLength(0)
    // …and the browser still holds it, because nothing confirmed a completed turn.
    expect(peekMillaHandoff(store)?.text, 'a failed send threw the sentence away').toBe(TYPED)
    expect(peekMillaHandoff(store)?.id, 'the recovery id changed — a retry would duplicate')
      .toBe(handed.id)
  })

  it('TEST 3 — RECOVERY: the retry completes the same turn and creates no second customer row', async () => {
    const store = makeStore()
    const handed = stashMillaHandoff(TYPED, store)!
    modelFails = true
    const first = claimMillaHandoff(store)!
    await sendThroughCanonicalMilla(first.text, first.id, store)
    expect(userTurns(TYPED)).toHaveLength(1)

    // The provider comes back; the client retries the SAME handoff.
    modelFails = false
    resetMillaHandoffPageLoad()
    const again = claimMillaHandoff(store)!
    expect(again.id, 'recovery minted a new id instead of replaying the original').toBe(handed.id)
    const { code } = await sendThroughCanonicalMilla(again.text, again.id, store)

    expect(code).toBe(200)
    expect(userTurns(TYPED), 'recovery created a duplicate customer turn').toHaveLength(1)
    expect(assistantTurns(), 'recovery did not produce Milla\'s answer').toHaveLength(1)
    expect(peekMillaHandoff(store), 'a completed recovery left the sentence waiting').toBeNull()

    const thread = await readCanonicalThread()
    expect(thread.filter(m => m.role === 'user' && m.content === TYPED)).toHaveLength(1)
  })

  it('TEST 4 — 🛑 AMBIGUOUS RESPONSE: the send already succeeded, the caller retries anyway', async () => {
    // The hard case. The backend accepted and persisted BOTH turns; the response never
    // reached the browser, so the client believes it failed and recovers.
    const store = makeStore()
    const handed = stashMillaHandoff(TYPED, store)!
    const first = claimMillaHandoff(store)!
    await sendThroughCanonicalMilla(first.text, first.id, store)
    expect(userTurns(TYPED)).toHaveLength(1)
    expect(modelCalls).toBe(1)

    // The client never saw the 200. It still holds the handoff (simulated: put it back
    // exactly as a lost response would have left it) and retries after a reload.
    store.setItem('kind:milla:handoff:v1', JSON.stringify(handed))
    resetMillaHandoffPageLoad()
    const retry = claimMillaHandoff(store)!
    const { code, reply } = await sendThroughCanonicalMilla(retry.text, retry.id, store)

    expect(code).toBe(200)
    // 🛑 EXACTLY ONE CUSTOMER TURN. This is the primary key refusing the replay.
    expect(userTurns(TYPED), `an ambiguous retry created ${userTurns(TYPED).length} canonical customer turns`)
      .toHaveLength(1)
    // 🛑 AND EXACTLY ONE MILLA TURN — the stored answer is replayed, not re-asked.
    expect(assistantTurns(), 'the retry produced a second Milla reply to one sentence').toHaveLength(1)
    expect(modelCalls, 'the retry spent a second model call on a turn that had already run').toBe(1)
    expect(reply).toBe('Got it — tell me more.')

    const thread = await readCanonicalThread()
    expect(thread.filter(m => m.role === 'user' && m.content === TYPED)).toHaveLength(1)
    expect(thread.filter(m => m.role === 'assistant')).toHaveLength(1)
  })

  it('TEST 5 — 🛑 RELOAD after a failed attempt: nothing is retyped', async () => {
    const store = makeStore()
    stashMillaHandoff(TYPED, store)
    modelFails = true
    const claimed = claimMillaHandoff(store)!
    await sendThroughCanonicalMilla(claimed.text, claimed.id, store)

    // THE RELOAD. React state is gone by definition; a fresh page load re-evaluates the
    // module, so the in-page claim guard starts empty. `sessionStorage` survives.
    resetMillaHandoffPageLoad()
    const afterReload = claimMillaHandoff(store)
    expect(afterReload?.text, 'after a failed send and a reload the customer must retype').toBe(TYPED)

    // …and it still completes into the one canonical thread, once.
    modelFails = false
    const { code } = await sendThroughCanonicalMilla(afterReload!.text, afterReload!.id, store)
    expect(code).toBe(200)
    expect(userTurns(TYPED)).toHaveLength(1)
    const thread = await readCanonicalThread()
    expect(thread.filter(m => m.role === 'user' && m.content === TYPED)).toHaveLength(1)
  })

  it('🛑 FAIL-CLOSED: a turn we cannot store is not answered', async () => {
    // Answering a question we did not manage to record is how a conversation silently loses
    // a turn. A 23505 is "already ours"; anything else must stop before the model.
    const store = makeStore()
    const handed = stashMillaHandoff(TYPED, store)!
    storeFails = true
    const { code } = await sendThroughCanonicalMilla(handed.text, handed.id, store)
    expect(code, 'an unstorable turn was answered anyway').toBe(503)
    expect(modelCalls, 'the model was asked about a turn we could not record').toBe(0)
    expect(peekMillaHandoff(store)?.text, 'the sentence was released despite no durable turn')
      .toBe(TYPED)
  })

  it('a double mount in ONE page load sends once — two replies to one sentence is also a defect', async () => {
    const store = makeStore()
    stashMillaHandoff(TYPED, store)
    const first = claimMillaHandoff(store)
    const second = claimMillaHandoff(store)      // StrictMode's second mount
    expect(first?.text).toBe(TYPED)
    expect(second, 'a second mount in the same page load fired a second request').toBeNull()
    // …and the sentence is still held, because claiming is not owning.
    expect(peekMillaHandoff(store)?.text).toBe(TYPED)
  })

  it('release is id-matched, so a late release cannot eat a newer sentence', async () => {
    const store = makeStore()
    const old = stashMillaHandoff('the first thing they said', store)!
    const fresh = stashMillaHandoff('no wait, this instead', store)!
    expect(fresh.id).not.toBe(old.id)
    releaseMillaHandoff(old.id, store)           // a superseded attempt reporting success
    expect(peekMillaHandoff(store)?.text, 'a stale release deleted the customer\'s newer sentence')
      .toBe('no wait, this instead')
  })

  it('an ordinary composer send still behaves exactly as before (no id supplied)', async () => {
    const { code } = await sendThroughCanonicalMilla('typed straight into Milla')
    expect(code).toBe(200)
    expect(userTurns('typed straight into Milla')).toHaveLength(1)
    expect(assistantTurns()).toHaveLength(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE CANONICAL BOUNDARY — THE ORDINARY COMPOSER IS THE OTHER HALF OF O1.
//
// ⛓️ THE PREVIOUS ROUND FIXED ONE CALLER. The handed-over sentence carried a stable id; the
// ordinary composer sent none, so the route minted a fresh uuid per request — and because the
// same round moved the customer's row ABOVE the model call, the composer's own failure path
// became a duplicate factory: send once, row A, model fails, the composer is refilled with
// their sentence (C01), they press send, row B. Two canonical turns for one thing said.
//
// Every test below drives the REAL `millaSendIdentity` / `unansweredCustomerTurn` through the
// REAL route. The identity decision is production code; only the component's bookkeeping
// around it is reproduced (see `Composer`).
describe('O1 CANONICAL BOUNDARY — one send intent is one canonical turn, whatever the entry path', () => {
  const TEXT = 'Can you pause my programme please'

  it('C — ORDINARY COMPOSER, SUCCESS: a stable id, one customer turn, one Milla turn', async () => {
    const c = new Composer()
    const { code, id } = await c.send(TEXT)
    expect(code).toBe(200)
    expect(id, 'the ordinary composer sent no stable identity').toBeTruthy()
    expect(userTurns(TEXT)).toHaveLength(1)
    expect(assistantTurns()).toHaveLength(1)
    expect(millaMessages.find(m => m.role === 'user')!.id, 'the row was not written under the send id')
      .toBe(id)
    expect(c.pending, 'an answered turn is still marked unresolved').toBeNull()
  })

  it('D — 🛑 ORDINARY COMPOSER, PROVIDER FAILS: the turn is ours and they need not retype', async () => {
    const c = new Composer()
    modelFails = true
    const { code } = await c.send(TEXT)
    expect(code).toBe(500)
    // Owned before the model was asked — so the sentence is not the browser's problem.
    expect(userTurns(TEXT), 'the provider failed and canonical persistence kept NO customer turn')
      .toHaveLength(1)
    expect(assistantTurns()).toHaveLength(0)
    // Their words are handed back to the composer (C01), and the turn stays continuable.
    expect(c.pending?.text, 'the failed turn is not held for continuation').toBe(TEXT)
    const thread = await readCanonicalThread()
    expect(thread.filter(m => m.role === 'user' && m.content === TEXT)).toHaveLength(1)
  })

  it('E — 🛑 ORDINARY COMPOSER, RETRY: the same intent, the same id, still one row', async () => {
    const c = new Composer()
    modelFails = true
    const first = await c.send(TEXT)
    modelFails = false
    // The customer presses send on the sentence the failure put back in the composer.
    const retry = await c.send(TEXT)
    expect(retry.id, 'the retry minted a new identity for the same send intent').toBe(first.id)
    expect(retry.code).toBe(200)
    expect(userTurns(TEXT), `one send intent produced ${userTurns(TEXT).length} canonical turns`)
      .toHaveLength(1)
    expect(assistantTurns(), 'the retry did not produce the missing answer').toHaveLength(1)
    expect(modelCalls, 'the retry should ask the model exactly once more').toBe(2)
    expect(c.pending).toBeNull()
  })

  it('F — 🛑 ORDINARY COMPOSER, AMBIGUOUS RESPONSE: accepted and answered, caller retries anyway', async () => {
    const c = new Composer()
    const first = await c.send(TEXT)
    expect(modelCalls).toBe(1)
    // The 200 never reached the browser, so the component still holds the intent.
    c.pending = { id: first.id, text: TEXT }
    const retry = await c.send(TEXT)
    expect(retry.id).toBe(first.id)
    expect(userTurns(TEXT), 'an ambiguous retry created a second canonical customer turn').toHaveLength(1)
    expect(assistantTurns(), 'an ambiguous retry created a second authoritative reply').toHaveLength(1)
    expect(modelCalls, 'the retry spent a second model call on a turn that had already run').toBe(1)
    expect(retry.reply).toBe('Got it — tell me more.')
  })

  it('G — 🛑 RELOAD AFTER PROVIDER FAILURE: canonical persistence owns the turn, not the browser', async () => {
    const c = new Composer()
    modelFails = true
    await c.send(TEXT)
    expect(userTurns(TEXT)).toHaveLength(1)

    // THE RELOAD. React state — including the pending intent and the refilled composer — is
    // gone. Nothing of this turn survives in the browser at all.
    c.reload()
    expect(c.pending).toBeNull()

    const thread = await readCanonicalThread()
    expect(thread.filter(m => m.role === 'user' && m.content === TEXT),
      'the customer came back and their sentence was not in the thread').toHaveLength(1)

    // …and re-entry continues THAT turn, from the thread, with no retyping.
    modelFails = false
    const cont = await c.continueUnanswered(thread)
    expect(cont, 're-entry did not continue the unanswered turn').not.toBeNull()
    expect(cont!.id, 'the continuation invented a new identity').toBe(thread[thread.length - 1].id)
    expect(userTurns(TEXT), 're-entry duplicated the customer turn').toHaveLength(1)
    expect(assistantTurns()).toHaveLength(1)

    // A finished thread is left alone — nothing to continue, no second model call.
    const before = modelCalls
    expect(await c.continueUnanswered(await readCanonicalThread())).toBeNull()
    expect(modelCalls).toBe(before)
  })

  it('H — 🛑 SAME TEXT, TWO INTENTIONAL SENDS: two identities, two legitimate rows', async () => {
    // The distinction the whole design turns on. This is NOT text deduplication.
    const c = new Composer()
    const first = await c.send('yes')
    const second = await c.send('yes')
    expect(second.id, 'two deliberate sends collapsed into one turn — that is text dedup')
      .not.toBe(first.id)
    expect(userTurns('yes'), 'two things the customer said were stored as one').toHaveLength(2)
    expect(assistantTurns(), 'two turns did not get two answers').toHaveLength(2)
  })

  it('🛑 a DIFFERENT sentence after a failure is a new turn, not a continuation of the old one', async () => {
    // The other half of H, and the one that proves the rule is scoped to the unresolved turn
    // rather than "reuse whatever is pending". A customer whose turn failed and who then says
    // something else has said TWO things, and both are theirs.
    const c = new Composer()
    modelFails = true
    const failed = await c.send('Can you pause my programme please')
    modelFails = false
    const different = await c.send('actually, how is my ROI looking')
    expect(different.id, 'a new sentence was folded into the failed turn').not.toBe(failed.id)
    expect(userTurns('Can you pause my programme please')).toHaveLength(1)
    expect(userTurns('actually, how is my ROI looking')).toHaveLength(1)
    expect(millaMessages.filter(m => m.role === 'user'), 'two things said were not two turns')
      .toHaveLength(2)
  })

  it('the identity rule itself: retry reuses, edit mints, handoff wins', () => {
    // The production rule, called directly. Nothing here reimplements it.
    const pending: MillaSendIntent = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', text: 'hello' }
    expect(millaSendIdentity('hello', pending).id, 'an unchanged retry lost its identity')
      .toBe(pending.id)
    expect(millaSendIdentity('hello there', pending).id, 'an edited sentence reused a turn')
      .not.toBe(pending.id)
    expect(millaSendIdentity('hello', null).id, 'a first send got no identity').toBeTruthy()
    expect(millaSendIdentity('hello', pending, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb').id,
      'a handed-over sentence did not keep the id minted at the card').toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
  })

  it('only a thread ENDING on the customer is waiting for us', () => {
    expect(unansweredCustomerTurn([])).toBeNull()
    expect(unansweredCustomerTurn([{ id: 'u1', role: 'user', content: 'hi' }])?.id).toBe('u1')
    expect(unansweredCustomerTurn([
      { id: 'u1', role: 'user', content: 'hi' },
      { id: 'a1', role: 'assistant', content: 'hello' },
    ]), 'a finished exchange was treated as waiting').toBeNull()
    expect(unansweredCustomerTurn([{ role: 'user', content: 'hi' }]),
      'a row with no id cannot be continued safely').toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE 23505 ABOVE IS NOT A CONVENIENCE OF THE DOUBLE.
//
// The whole exactly-once claim rests on `milla_messages.id` being a PRIMARY KEY in the real
// schema. If that ever stopped being true, the double would still dedupe and the tests would
// still pass while production duplicated — so the schema is asserted, in both of its homes.
describe('the exactly-once primitive is the real table, not the test double', () => {
  const read = (p: string) => readFileSync(join(__dirname, '../../../../', p), 'utf8')

  for (const m of ['supabase/migrations/008_milla.sql', 'supabase/migrations/20260525_milla_vida_tables.sql']) {
    it(`${m} declares milla_messages.id as a primary key`, () => {
      const sql = read(m)
      const block = sql.slice(sql.indexOf('create table if not exists public.milla_messages'))
        .slice(0, 600)
      expect(block, 'milla_messages lost its primary key — nothing dedupes a replayed send')
        .toMatch(/id\s+uuid\s+primary key/)
    })
  }

  it('the route derives the reply row id from the customer row id, and supplies both', () => {
    // Behaviour is proven above; this pins the MECHANISM so a refactor to random ids is
    // visible rather than silently reintroducing the duplicate-reply case.
    //
    // ⛓️ REPOINTED 18 Sep (J3-C2) · THE MECHANISM MOVED AND IS NOW SHARED.
    // WHAT THIS REPLACED: the same four assertions read against `routes/milla.ts`, where the
    // derivation, the id choice and the `23505` reading were all private to this one route.
    // The Brief path had built the identical shape a day earlier, and that is precisely how a
    // THIRD door (`/icps/chat-build`) came to be built with neither — J3-C2's defect. The rule
    // now lives in `lib/customer-turn.ts` and both doors import it, so these assertions follow
    // it there and the route is asserted to USE it rather than to re-implement it.
    const rule = read('apps/api/src/lib/customer-turn.ts')
    expect(rule).toMatch(/function replyRowIdFor\s*\(/)
    expect(rule, 'the 23505 duplicate signal is no longer read as "already ours"')
      .toMatch(/code === '23505'/)
    expect(rule, 'the reply id is no longer derived from the customer row id')
      .toMatch(/replyRowIdFor\(input\.userRowId\)/)

    const src = read('apps/api/src/routes/milla.ts')
    expect(src, 'the session door stopped going through the shared rule').toMatch(/ownCustomerTurn/)
    expect(src).toMatch(/userRowId:\s*messageId \?\? randomUUID\(\)/)
    expect(src, 'the route grew a second private copy of the derivation')
      .not.toMatch(/function replyRowIdFor\s*\(/)
  })
})
