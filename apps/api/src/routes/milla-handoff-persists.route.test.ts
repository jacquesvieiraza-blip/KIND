// ═══════════════════════════════════════════════════════════════════════════════════════
// O1 — THE SENTENCE A CUSTOMER TYPES BEFORE THE NAVIGATION ACTUALLY ARRIVES, ONCE.
//
// ── THE DEFECT ─────────────────────────────────────────────────────────────────────────
//
// On 14 Sep the second stateless `/milla/chat` engine was removed from `AgentColumn`'s Milla
// card. Correct, and it stays removed. But that card still has a COMPOSER, and its `onSend`
// receives THE CUSTOMER'S TYPED MESSAGE and navigates. The message was handed to
// `/dashboard/assistant?q=…` and died twice:
//
//   1. `middleware.ts` rewrites signed-in `/dashboard/*` → `/milla/*` via
//      `new URL(path, base)` — which carries NO query string. `?q=` was gone at the redirect.
//   2. Nothing at the destination has ever read `?q=`.
//
// A customer typed into Milla's own card, the screen changed, and Milla greeted them as if
// they had said nothing. Founder ruling: the customer never retypes because our system
// failed.
//
// ── WHAT THIS FILE PROVES, AND WHY IT IS NOT A SOURCE-TEXT GUARD ───────────────────────
//
// 🛑 EVERY LINK IN THE CHAIN IS EXECUTED, NOT INSPECTED:
//
//   CUSTOMER TYPES IN THE AGENT CARD   → the REAL `stashMillaHandoff`
//   NAVIGATION / TRANSITION            → a new claim on the other side of it
//   CANONICAL MILLA PATH RECEIVES IT   → the REAL `claimMillaHandoff`, claim-once
//   CANONICAL PERSISTENCE STORES IT    → the REAL `POST /milla/sessions/:id/chat` handler
//                                         from `routes/milla.ts`, writing `milla_messages`
//   EXACTLY ONE COPY                   → counted in the table the route actually wrote
//   READ-BACK / RE-ENTRY CONTAINS IT   → the REAL `GET /milla/sessions/:id/messages` handler
//
// The store is an in-memory `milla_messages` whose ONLY writer is the production route's own
// `.insert(...)` and whose ONLY reader is the production route's own `.select(...)`. Nothing
// here asserts that a prop exists, that a query parameter exists, or that a navigation
// happened. If the handoff never reaches the route, the row is never written and the
// read-back is empty — which is exactly the RED this was captured against.
//
// Mocks only. No provider, no database, no network.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  stashMillaHandoff, claimMillaHandoff, releaseMillaHandoff, peekMillaHandoff,
  resetMillaHandoffPageLoad, MILLA_HANDOFF_KEY, type HandoffStore,
} from '@kind/shared'

type Row = Record<string, any>

/** The ONE store in this test, written and read only by the production route. */
let millaMessages: Row[] = []
let seq = 0

/**
 * A `sessionStorage` stand-in — the browser API the portal uses, driven here.
 *
 * ⚠️ IT IS A STORE, NOT A STUB OF THE FUNCTIONS UNDER TEST. `stashMillaHandoff` and
 * `claimMillaHandoff` are the real exported implementations; only the bucket is ours, which
 * is the same substitution jsdom would make.
 */
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
        create: async () => ({ content: [{ type: 'text', text: 'Got it — tell me more.' }] }),
      }
    }
    return { default: FakeAnthropic }
  })

  vi.doMock('@kind/db', () => {
    const build = (table: string) => {
      const q: any = { _session: null as string | null, _asc: true }
      q.select = () => q
      q.eq = (col: string, val: unknown) => { if (col === 'session_id') q._session = String(val); return q }
      q.order = (_c: string, o?: { ascending?: boolean }) => { q._asc = o?.ascending !== false; return q }
      q.limit = () => q
      q.not = () => q
      // The session exists and belongs to the client — the two checks both routes make.
      q.single = async () => (table === 'milla_sessions'
        ? { data: { id: 'sess-1' }, error: null }
        : { data: null, error: null })
      q.maybeSingle = async () => ({ data: { id: 'c1', company_name: 'House' }, error: null })
      q.insert = (row: Row) => {
        // 🛑 THIS IS THE ONLY WRITER. Nothing else in this file appends to `milla_messages`.
        if (table === 'milla_messages') {
          millaMessages.push({ id: `m-${++seq}`, created_at: new Date(2026, 8, 15, 0, 0, seq).toISOString(), ...row })
        }
        return { then: (r: (v: unknown) => void) => r({ error: null }) }
      }
      q.then = (r: (v: unknown) => void) => {
        if (table === 'milla_messages') {
          // 🛑 AND THIS IS THE ONLY READER — the route's own select, filtered as it filters.
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
      progress: { delivered: 0, authorised: 0, outcomesAchieved: 0 },
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

/** Pull one live handler off the REAL router — never a re-implementation of it. */
async function handlerFor(path: string, method: 'post' | 'get') {
  const { millaRouter } = await import('./milla')
  const layer = (millaRouter as unknown as { stack: any[] }).stack.find(
    l => l.route?.path === path && l.route?.methods?.[method],
  )
  if (!layer) throw new Error(`the canonical Milla route ${method.toUpperCase()} ${path} is gone`)
  return layer.route.stack[layer.route.stack.length - 1].handle
}

/**
 * THE CANONICAL PERSISTED MILLA PATH, driven end to end.
 *
 * This is what `MillaConversation.send()` does in production: post the message to
 * `/milla/sessions/:id/chat`. The route persists both turns itself.
 */
async function sendThroughCanonicalMilla(message: string) {
  const handler = await handlerFor('/sessions/:sessionId/chat', 'post')
  const req = { params: { sessionId: 'sess-1' }, userId: 'u1', body: { message }, headers: {} }
  let payload: Row = {}
  let code = 200
  const res = { status: (c: number) => { code = c; return res }, json: (b: Row) => { payload = b; return res } } as any
  await handler(req, res, () => {})
  return { code, payload }
}

/** THE RE-ENTRY READ — the same call `MillaConversation` makes when the client comes back. */
async function readCanonicalThread() {
  const handler = await handlerFor('/sessions/:sessionId/messages', 'get')
  const req = { params: { sessionId: 'sess-1' }, userId: 'u1', headers: {} }
  let payload: Row = {}
  const res = { status: () => res, json: (b: Row) => { payload = b; return res } } as any
  await handler(req, res, () => {})
  return (payload.data ?? []) as Row[]
}

beforeEach(() => {
  vi.resetModules()
  millaMessages = []
  seq = 0
  resetMillaHandoffPageLoad()
  // The Anthropic client is MOCKED above; this only gets past the "no key" short-circuit so
  // the route runs its persistence. It cannot reach a provider or spend anything (R66).
  process.env.ANTHROPIC_API_KEY = 'test-key-not-a-real-key'
  installMocks()
})
afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY
  vi.restoreAllMocks(); vi.resetModules()
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('THE CHAIN — typed in the card, persisted once by canonical Milla, there on re-entry', () => {
  const TYPED = 'We want to book qualified meetings with fintech founders in Germany'

  it('🛑 the whole chain, executed: card → navigation → canonical route → one stored copy → read-back', async () => {
    // ── 1. THE CUSTOMER TYPES IN THE AGENT CARD ──────────────────────────────────────
    // This is literally what `AgentColumn`'s `onSend` now does with their message.
    const store = makeStore()
    const parked = stashMillaHandoff(TYPED, store)
    expect(parked, 'the card did not park the customer\'s sentence at all').not.toBeNull()

    // ── 2. NAVIGATION / TRANSITION ───────────────────────────────────────────────────
    // The old page is gone; nothing is carried but the store the browser keeps. Proving the
    // point: the URL itself carries nothing, exactly as the middleware redirect leaves it.
    const arrivedAt = new URL('/milla', 'https://app.example.test')
    expect(arrivedAt.search, 'this proof must not depend on a query string surviving').toBe('')

    // ── 3. THE CANONICAL MILLA PATH RECEIVES IT ──────────────────────────────────────
    // What `MillaConversationProvider` does on mount.
    const claimed = claimMillaHandoff(store)
    expect(claimed?.text, 'the canonical conversation received nothing — the message was lost')
      .toBe(TYPED)

    // ── 4. CANONICAL PERSISTENCE STORES IT ───────────────────────────────────────────
    // Through the REAL route, which is the only thing in this product that writes a Milla
    // message. Nothing below inserts a row by hand.
    const { code } = await sendThroughCanonicalMilla(claimed!.text)
    expect(code, 'the canonical chat route rejected the handed-over message').toBe(200)

    // ── 5. EXACTLY ONE COPY ──────────────────────────────────────────────────────────
    const copies = millaMessages.filter(m => m.role === 'user' && m.content === TYPED)
    expect(copies, `the customer's sentence was stored ${copies.length} times, not once`)
      .toHaveLength(1)
    expect(copies[0].session_id, 'it was stored against a different session').toBe('sess-1')
    expect(copies[0].client_id, 'it was stored against a different client').toBe('c1')

    // ── 6. CANONICAL READ-BACK / RE-ENTRY CONTAINS THAT SAME MESSAGE ─────────────────
    const thread = await readCanonicalThread()
    const onReentry = thread.filter(m => m.role === 'user' && m.content === TYPED)
    expect(onReentry, 'the customer came back and their sentence was not in the thread')
      .toHaveLength(1)
    // …and Milla answered it in the same thread, so it was a turn and not a stored orphan.
    expect(thread.some(m => m.role === 'assistant'),
      'the message was stored but the canonical conversation never answered it').toBe(true)
  })

  it('🛑 a second mount claims nothing, so the thread is never doubled', async () => {
    // StrictMode's double-mount, a remount, a back-navigation. The in-page claim guard means
    // only the first arrival has anything to send.
    //
    // ⛓️ 15 Sep (O1 durability) — THE CLAIM NO LONGER DELETES, so the store still holds the
    // sentence here. That is deliberate: it is released only once canonical Milla owns the
    // turn, which is what makes a provider failure recoverable. Exactly-once is now the
    // `milla_messages` primary key, proven behaviourally in
    // `milla-handoff-durability.route.test.ts`.
    const store = makeStore()
    stashMillaHandoff(TYPED, store)

    const first = claimMillaHandoff(store)
    const second = claimMillaHandoff(store)
    expect(first?.text).toBe(TYPED)
    expect(second, 'a second mount would re-send the customer\'s sentence').toBeNull()
    expect(store.raw.has(MILLA_HANDOFF_KEY), 'the sentence was let go before anything owned it')
      .toBe(true)

    // Drive the canonical route exactly as the provider would: once for a claim, never for a
    // null. The store is the evidence, not the intention.
    for (const claimed of [first, second]) if (claimed) await sendThroughCanonicalMilla(claimed.text)
    expect(millaMessages.filter(m => m.role === 'user' && m.content === TYPED),
      'two mounts produced two copies of one sentence').toHaveLength(1)

    // …and once the turn is owned, the handoff is released.
    releaseMillaHandoff(first!.id, store)
    expect(peekMillaHandoff(store), 'a completed turn left the sentence waiting').toBeNull()

    const thread = await readCanonicalThread()
    expect(thread.filter(m => m.role === 'user' && m.content === TYPED)).toHaveLength(1)
  })

  it('the customer never retypes: the words stored are the words they typed', async () => {
    // Not summarised, not encoded, not trimmed into something else. Awkward input included.
    const store = makeStore()
    const awkward = '  Können wir Meetings mit CEOs buchen? 50% + "qualified" — ASAP  '
    stashMillaHandoff(awkward, store)
    const claimed = claimMillaHandoff(store)
    // Surrounding whitespace is all the handoff is allowed to touch.
    expect(claimed?.text).toBe(awkward.trim())
    await sendThroughCanonicalMilla(claimed!.text)
    const thread = await readCanonicalThread()
    expect(thread.filter(m => m.role === 'user').map(m => m.content)).toContain(awkward.trim())
  })

  it('an empty composer parks nothing and sends nothing', async () => {
    // A blank send must not create a turn, and must not consume a real waiting sentence.
    const store = makeStore()
    expect(stashMillaHandoff('   ', store)).toBeNull()
    expect(claimMillaHandoff(store)).toBeNull()
    expect(millaMessages, 'a blank composer reached canonical persistence').toHaveLength(0)
  })

  it('no store (server render, privacy mode) degrades to the old behaviour, never to a crash', () => {
    expect(stashMillaHandoff('anything', null)).toBeNull()
    expect(claimMillaHandoff(null)).toBeNull()
    expect(() => releaseMillaHandoff('any-id', null)).not.toThrow()
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
// THE WIRING — a SUPPLEMENT to the executed chain above, never a substitute for it.
//
// The chain proves the mechanism works. These prove the two production call sites are still
// plugged into it: without them the mechanism could be perfect and unreachable, which is the
// precise shape of the defect being fixed.
describe('BOTH CALL SITES ARE STILL ON THE CANONICAL PATH', () => {
  const read = (p: string) => readFileSync(join(__dirname, '../../../../', p), 'utf8')

  it('the agent card hands its message over instead of dropping it into a query string', () => {
    const src = read('apps/portal/src/app/(dashboard)/AgentColumn.tsx')
    const milla = src.slice(src.indexOf('agentId="milla"'), src.indexOf("if (agentId === 'vida')"))
    expect(milla, 'the Milla card no longer hands the typed message over')
      .toMatch(/stashMillaHandoff\(\s*msg\s*\)/)
    // ⚠️ PROPS, NOT PROSE. Both removals are recorded in struck-through `⛓️ ~~…~~` comments
    // inside this block, and history is not current truth (CLAUDE.md rule 4) — so these match
    // the JSX PROP LINES, which is the only form that can put either back into production.
    expect(milla, 'a live chat endpoint prop came back to the Milla card — a second Milla')
      .not.toMatch(/^\s*liveChatEndpoint=/m)
    expect(milla, 'the typed message is back in a query string the redirect drops')
      .not.toMatch(/^\s*onSend=.*\?q=/m)
  })

  it('the canonical conversation claims on arrival and sends through its own sender', () => {
    const src = read('apps/portal/src/components/milla/MillaConversation.tsx')
    expect(src, 'the destination no longer claims the handed-over message')
      .toMatch(/const handed = claimMillaHandoff\(\)/)
    // 🛑 THROUGH `send()`. Not a new endpoint, not a direct insert, not a seeded transcript.
    expect(src, 'the handed-over message bypasses the canonical sender')
      .toMatch(/if \(handed\) \{ await send\(handed\.text, \{ handoffId: handed\.id \}\)/)
    // ⚑ 15 Sep (O1 durability) — and it is let go ONLY on a confirmed canonical turn.
    expect(src, 'the handoff is released without canonical Milla owning the turn')
      .toMatch(/if \(opts\?\.handoffId\) releaseMillaHandoff\(opts\.handoffId\)/)
    // ⚑ 15 Sep (O1, canonical boundary) — EVERY send goes through the one identity rule,
    // not just the handed-over one. That is the half the previous round left open.
    expect(src, 'the ordinary composer sends without a stable identity')
      .toMatch(/const intent = millaSendIdentity\(msg, pendingSend\.current, opts\?\.handoffId\)/)
    expect(src, 'a send leaves the browser without carrying its identity')
      .toMatch(/const body = \{ message: msg, messageId: intent\.id \}/)
    // The canonical sender still posts to the one persisted chat route.
    expect(src).toContain('/milla/sessions/${sid}/chat')
  })
})
