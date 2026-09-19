// ══════════════════════════════════════════════════════════════════════════════════════════
// J3-C2 · THE CUSTOMER'S TURN IS DURABLE BEFORE THE MODEL, ON EVERY MILLA DOOR
//
// ── THE DEFECT: ONE TRANSCRIPT, TWO DURABILITY RULES ────────────────────────────────────
//
// `MillaConversation` is one conversation on one screen, and it posts through two endpoints
// depending on what the client is doing:
//
//     ordinary turn → POST /milla/sessions/:id/chat  → written to `milla_messages` BEFORE
//                                                       the model, fail-closed (O1, 15 Sep)
//     targeting turn → POST /icps/chat-build         → nothing at all
//
// Both replies land in the SAME visible transcript. The endpoint's own comment says it:
// *"this door received twenty turns of BROWSER history and nothing else … no durable
// transcript"*, and the component's says *"`/icps/chat-build` proposes and writes NOTHING —
// no ICP, no version, no message row."*
//
// 🛑 SO A CLIENT RELOADS AFTER A PROVIDER WOBBLE AND HALF THEIR CONVERSATION IS THERE, with
// nothing on screen to mark which half or why. This is the door a PAYING client uses to change
// their targeting — the endpoint's own header calls it that — so the turns being lost are the
// ones where they explain what they actually want.
//
// LR 17's rule is that OUR failure never costs them their words. "Half their words" is the
// same failure with a smaller blast radius.
//
// ── WHY THE RULE IS NOW A MODULE ────────────────────────────────────────────────────────
//
// It had been built twice, once per door, each with its own copy of the idempotency shape —
// which is exactly how a third door gets built without it. `lib/customer-turn.ts` is that
// shape extracted, and this file drives it directly against the failures that matter.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>

const store = vi.hoisted(() => ({
  messages: [] as Row[],
  /** The insert fails for a reason that is NOT a duplicate key. */
  unwritable: false,
}))

vi.mock('@kind/db', () => {
  const from = (_t: string) => {
    const f: ((r: Row) => boolean)[] = []
    const q: Record<string, unknown> = {
      select() { return q },
      eq(c: string, v: unknown) { f.push(r => r[c] === v); return q },
      order() { return q }, limit() { return q },
      async maybeSingle() { return { data: store.messages.filter(r => f.every(fn => fn(r)))[0] ?? null, error: null } },
      insert(row: Row) {
        if (store.unwritable) {
          return { then: (res: (v: unknown) => unknown) => res({ error: { code: '08006', message: 'connection failure' } }) }
        }
        const dup = store.messages.some(r => r.id === row.id)
        if (dup) {
          return { then: (res: (v: unknown) => unknown) => res({ error: { code: '23505', message: 'duplicate key value' } }) }
        }
        store.messages.push({ ...row })
        return { then: (res: (v: unknown) => unknown) => res({ error: null }) }
      },
      then(res: (v: unknown) => unknown) { return res({ data: store.messages.filter(r => f.every(fn => fn(r))), error: null }) },
    }
    return q
  }
  return { db: { from } }
})

const SESSION = 's1111111-1111-4111-8111-111111111111'
const CLIENT = 'c2222222-2222-4222-8222-222222222222'
const TURN = 'm3333333-3333-4333-8333-333333333333'

beforeEach(() => {
  store.messages = []
  store.unwritable = false
  vi.resetModules()
})

describe('J3-C2 · the rule itself', () => {
  async function own(over: Partial<{ userRowId: string; content: string }> = {}) {
    const { ownCustomerTurn } = await import('./customer-turn')
    return ownCustomerTurn({
      sessionId: SESSION, clientId: CLIENT,
      content: over.content ?? 'stop targeting recruitment agencies',
      userRowId: over.userRowId ?? TURN,
    })
  }

  it('🛑 the customer\'s words are stored, and are still there for a reload', async () => {
    const r = await own()
    expect(r.ok).toBe(true)
    const row = store.messages.find(m => m.id === TURN)
    expect(row, 'the turn was never stored — one reload and their sentence is gone').toBeTruthy()
    expect(row!.role).toBe('user')
    expect(row!.content).toBe('stop targeting recruitment agencies')
    expect(row!.session_id).toBe(SESSION)
    expect(row!.client_id).toBe(CLIENT)
  })

  it('🛑 a REPLAY of the same send is one row, not two', async () => {
    const a = await own()
    const b = await own()
    expect(a.ok && b.ok).toBe(true)
    expect(b.ok && b.alreadyOwned, 'the replay was not recognised as already ours').toBe(true)
    expect(
      store.messages.filter(m => m.role === 'user'),
      'a retried send showed the client their own sentence twice for one thing they said once',
    ).toHaveLength(1)
  })

  it('🛑 FAIL-CLOSED — an unstorable turn refuses, so the model is never asked', async () => {
    store.unwritable = true
    const r = await own()
    expect(r.ok, 'we answered a question we did not manage to record').toBe(false)
    expect(store.messages).toHaveLength(0)
  })

  it('a NEW sentence gets its own row — idempotency is per turn, not per client', async () => {
    await own()
    await own({ userRowId: 'm4444444-4444-4444-8444-444444444444', content: 'and add Manchester' })
    expect(store.messages.filter(m => m.role === 'user')).toHaveLength(2)
  })

  it('🛑 one sentence may have exactly ONE stored answer, whatever the retry count', async () => {
    const { storeMillaReply, replyRowIdFor, existingReply } = await import('./customer-turn')
    const r = await own()
    expect(r.ok).toBe(true)
    const aid = r.ok ? r.assistantRowId : ''
    expect(aid).toBe(replyRowIdFor(TURN))
    await storeMillaReply({ assistantRowId: aid, sessionId: SESSION, clientId: CLIENT, content: 'Got it.' })
    await storeMillaReply({ assistantRowId: aid, sessionId: SESSION, clientId: CLIENT, content: 'Got it.' })
    expect(store.messages.filter(m => m.role === 'assistant')).toHaveLength(1)
    expect((await existingReply(aid))?.content).toBe('Got it.')
  })

  it('a reply that will not store does NOT fail the exchange — their words are already safe', async () => {
    // The opposite rule to the customer's turn, deliberately: the client has the answer on
    // screen, and failing now would tell them an exchange that happened did not.
    const { storeMillaReply } = await import('./customer-turn')
    const r = await own()
    store.unwritable = true
    await expect(storeMillaReply({
      assistantRowId: r.ok ? r.assistantRowId : 'x', sessionId: SESSION, clientId: CLIENT, content: 'Got it.',
    })).resolves.toBeUndefined()
  })
})

describe('J3-C2 · every door goes through it', () => {
  const API = join(__dirname, '..')
  const code = (p: string): string =>
    readFileSync(join(API, p), 'utf8')
      .split('\n')
      .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
      .join('\n')

  it('🛑 /icps/chat-build owns the turn BEFORE it calls the model', () => {
    const src = code('routes/icps.ts')
    const at = src.indexOf("icpRouter.post('/chat-build'")
    expect(at, 'the chat-build route moved — this guard must be repointed').toBeGreaterThan(-1)
    const body = src.slice(at, src.indexOf("icpRouter.post(", at + 40))
    expect(body, 'the targeting door still persists nothing — a reload loses those turns')
      .toMatch(/ownCustomerTurn/)
    // 🛑 ORDER IS THE WHOLE PROPERTY. Storing it afterwards is too late by exactly the window
    // that fails, so the write must appear before the provider call in the same body.
    const own = body.indexOf('ownCustomerTurn')
    const model = body.search(/anthropic\.messages\.create|\bchat\(|callModel/)
    expect(model, 'no model call found in chat-build — this guard must be repointed').toBeGreaterThan(-1)
    expect(own, 'the turn is stored AFTER the model — the failure window is unchanged').toBeLessThan(model)
  })

  it('🛑 the CONVERSATION sends the ids the door needs — a route nobody feeds is not a fix', () => {
    const src = readFileSync(
      join(__dirname, '../../../portal/src/components/milla/MillaConversation.tsx'), 'utf8',
    ).split('\n')
      .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
      .join('\n')
    const at = src.indexOf("'/icps/chat-build'")
    expect(at, 'the targeting post moved — this guard must be repointed').toBeGreaterThan(-1)
    const call = src.slice(at, at + 400)
    expect(call, 'the turn is sent with no session, so the server has nowhere to store it').toMatch(/sessionId/)
    expect(call, 'the turn is sent with no id, so a retry would store it twice').toMatch(/messageId/)
  })

  it('🛑 the session chat uses the SAME rule, not its own second copy', () => {
    const src = code('routes/milla.ts')
    expect(src, 'the session door kept a private copy of the durability rule').toMatch(/ownCustomerTurn/)
    expect(
      src,
      'the reply-id derivation is spelled twice — two copies of "one sentence, one answer" is '
      + 'how the two doors come to disagree about what a replay is',
    ).not.toMatch(/function replyRowIdFor/)
  })
})
