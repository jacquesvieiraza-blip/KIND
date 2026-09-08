// ═══════════════════════════════════════════════════════════════════════════════════════
// WHICH MAILBOX SENDS FOR THIS PROGRAMME — the two unsafe answers, proved by calling.
//
// 🛑 THESE CASES EXIST BECAUSE THE FIRST VERSION HAD NO TESTS AT ALL, and the teeth harness
// said so: breaking `if (others.length > 0)` and `if (tied.length > 1)` to `if (false)` left
// every suite green. A guard nothing calls is a comment.
//
// ⚠️ BEHAVIOURAL, NOT SOURCE-SHAPE. Both refusals are decisions over rows, so they are made by
// running the function against rows — a `toContain` on the refusal MESSAGE survives the guard
// being disabled, which is exactly how these two got through the first time.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
  process.env.INBOX_SECRET_KEY ??= '0'.repeat(64)
})

type Row = Record<string, unknown>
const state: { inboxes: Row[]; readFails: boolean } = { inboxes: [], readFails: false }

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {}
      const filters: Array<(r: Row) => boolean> = []
      q.select = () => q
      q.eq = (c: string, v: unknown) => { filters.push(r => r[c] === v); return q }
      q.then = (res: (v: unknown) => unknown) => Promise.resolve(
        state.readFails
          ? { data: null, error: { message: 'connection reset' } }
          : { data: state.inboxes.filter(r => filters.every(f => f(r))), error: null },
      ).then(res)
      return q
    },
  },
}))

import { programmeSenderSafety } from './programme-sender'

/** A mailbox that `pickSendingInbox` considers genuinely sendable. */
const box = (over: Row = {}): Row => ({
  id: 'inbox-1', client_id: 'house', email: 'hello@meetandvibe.com', kind: 'branded',
  status: 'active', provider: 'smtp', daily_cap: 30,
  smtp_host: 'smtp.example.net', smtp_port: 587, smtp_secure: false,
  smtp_user: 'hello@meetandvibe.com', smtp_pass_enc: 'enc', from_name: 'M&V', ...over,
})

beforeEach(() => { state.inboxes = []; state.readFails = false })

describe('① one clear mailbox is safe', () => {
  it('a single sendable box binds cleanly', async () => {
    state.inboxes = [box()]
    const r = await programmeSenderSafety('house')
    expect(r.ok, r.ok ? '' : r.detail).toBe(true)
    expect(r.ok && r.email).toBe('hello@meetandvibe.com')
    expect(r.ok && r.inboxId).toBe('inbox-1')
  })

  it('🛑 and a client with NO usable mailbox is refused, with the resolver\'s own reason', async () => {
    state.inboxes = []
    const r = await programmeSenderSafety('house')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toBe('no_sender')
  })

  it('a warming mailbox is not a sender — the existing rule, unchanged', async () => {
    state.inboxes = [box({ status: 'warming' })]
    const r = await programmeSenderSafety('house')
    expect(r.ok).toBe(false)
  })
})

// ── ② 20 · AMBIGUITY ─────────────────────────────────────────────────────────────────

describe('② an unbroken tie is arbitrary, and arbitrary is not a decision', () => {
  it('🛑 20 · two equally-ranked sendable boxes REFUSE, and name them', async () => {
    // Same status, same kind ⇒ identical rank ⇒ the winner is whatever order the database
    // returned. A frozen snapshot whose sender is a coin toss freezes nothing.
    state.inboxes = [box(), box({ id: 'inbox-2', email: 'team@meetandvibe.com' })]
    const r = await programmeSenderSafety('house')
    expect(r.ok, 'an arbitrary sender was accepted').toBe(false)
    expect(r.ok === false && r.reason).toBe('ambiguous_sender')
    expect(r.ok === false && r.detail).toContain('team@meetandvibe.com')
  })

  it('🛑 BUT A SECOND BOX AT A LOWER RANK IS FINE — #610 rotation is not undone', async () => {
    // The founder ruled "inbox x 2 yes for now but volume is key". A clear first choice with
    // spread behind it is deterministic; only a tie at the top is refused.
    state.inboxes = [box(), box({ id: 'inbox-2', email: 'team@meetandvibe.com', kind: 'pooled' })]
    const r = await programmeSenderSafety('house')
    expect(r.ok, r.ok ? '' : r.detail).toBe(true)
    expect(r.ok && r.email, 'the higher-ranked branded box must win').toBe('hello@meetandvibe.com')
  })
})

// ── ③ 19 · THE SAME PHYSICAL MAILBOX ON TWO LIVE CLIENTS ─────────────────────────────

describe('③ two programmes cannot send as the same human', () => {
  it('🛑 19 · the same address live on another client REFUSES, and names that client', async () => {
    state.inboxes = [
      box(),
      // The same physical mailbox, attached to a second tenant. Two programmes, two stories,
      // one reputation — and neither client's suppression can see the other's sends.
      box({ id: 'inbox-9', client_id: 'mbf', status: 'active' }),
    ]
    const r = await programmeSenderSafety('house')
    expect(r.ok, 'a shared physical mailbox was accepted').toBe(false)
    expect(r.ok === false && r.reason).toBe('shared_sender')
    expect(r.ok === false && r.detail).toContain('mbf')
  })

  it('the same address on a RETIRED row elsewhere is fine — only live rows collide', async () => {
    state.inboxes = [box(), box({ id: 'inbox-9', client_id: 'mbf', status: 'retired' })]
    const r = await programmeSenderSafety('house')
    expect(r.ok, r.ok ? '' : r.detail).toBe(true)
  })
})

// ── ④ FAIL CLOSED ────────────────────────────────────────────────────────────────────

describe('④ an unreadable answer is never a safe one', () => {
  it('🛑 a failed read refuses rather than binding', async () => {
    state.readFails = true
    const r = await programmeSenderSafety('house')
    expect(r.ok).toBe(false)
    // Whatever the layer that failed, "we could not tell" must not become "it is fine".
    expect(r.ok === false && ['unreadable', 'no_sender']).toContain(r.ok === false ? r.reason : '')
  })
})
