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
const state: { inboxes: Row[]; readFails: boolean; failSelect: string | null } =
  { inboxes: [], readFails: false, failSelect: null }

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {}
      const filters: Array<(r: Row) => boolean> = []
      // ⚑ 10 Sep (I2) — THE MOCK REMEMBERS WHICH COLUMNS WERE ASKED FOR, so ONE read can be
      // made to fail. `readFails` breaks every read, which means the FIRST read fails and the
      // verification read is never reached — a mutation that disabled the verification-read
      // guard stayed green under it. A targeted failure is the only way to prove that branch.
      let selected = ''
      q.select = (cols?: string) => { selected = String(cols ?? ''); return q }
      // ⚑ 10 Sep (I2) — the verification read is `.limit(1)`ed, so the mock has to speak it.
      q.limit = () => q
      q.eq = (c: string, v: unknown) => { filters.push(r => r[c] === v); return q }
      q.then = (res: (v: unknown) => unknown) => Promise.resolve(
        state.readFails || (state.failSelect && selected.includes(state.failSelect))
          ? { data: null, error: { message: 'connection reset' } }
          : { data: state.inboxes.filter(r => filters.every(f => f(r))), error: null },
      ).then(res)
      return q
    },
  },
}))

import { programmeSenderSafety } from './programme-sender'

/**
 * A mailbox that `pickSendingInbox` considers genuinely sendable.
 *
 * ⛓️ ⚑ 10 Sep (I2) — `verified_at` JOINED THE FIXTURE, and this is a retarget rather than a
 * relaxation. Every case below protects a duty about AMBIGUITY, SHARING or WARMING; none of
 * them was ever about an unproved credential. Leaving it off would have made all three suites
 * fail for a reason they are not testing — and the new duty ("nobody has proved this mailbox
 * can log in") gets its own section ⑤, where it can be broken on purpose.
 */
const box = (over: Row = {}): Row => ({
  id: 'inbox-1', client_id: 'house', email: 'hello@meetandvibe.com', kind: 'branded',
  status: 'active', provider: 'smtp', daily_cap: 30,
  smtp_host: 'smtp.example.net', smtp_port: 587, smtp_secure: false,
  smtp_user: 'hello@meetandvibe.com', smtp_pass_enc: 'enc', from_name: 'M&V',
  verified_at: '2026-09-10T08:00:00Z', verify_failed_at: null, verify_detail: 'Connected.',
  ...over,
})

beforeEach(() => { state.inboxes = []; state.readFails = false; state.failSelect = null })

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

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ ⚑ 10 Sep (I2) — HAS ANYONE PROVED THIS MAILBOX CAN ACTUALLY LOG IN?
//
// 🛑 THE GAP. Everything above, and everything in `sending-inbox.ts`, asks whether the ROW is
// well formed: a live status, a host, a username, a saved password, a readable secret key.
// None of it asks whether those credentials WORK. `verifyInbox` has answered exactly that
// since #552 and the answer went nowhere but an audit row's `detail`, so a typed-but-wrong
// password passed readiness, reached READY_FOR_APPROVAL, and surfaced when a real prospect's
// first email failed on a warmed mailbox.
//
// ⚠️ THIS IS THE "FRESH CLIENT" CASE SPECIFICALLY. An established mailbox has been proved by
// having worked; a brand-new one has been proved by nothing at all.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('⑤ a mailbox nobody has proved can log in is not a sender', () => {
  it('🛑 NEVER CHECKED refuses, and names the button that fixes it', async () => {
    state.inboxes = [box({ verified_at: null, verify_failed_at: null, verify_detail: null })]
    const r = await programmeSenderSafety('house')
    expect(r.ok, 'an unproved mailbox was accepted as a sender').toBe(false)
    expect(r.ok === false && r.reason).toBe('unverified_sender')
    // ⚠️ A REFUSAL AN OPERATOR CANNOT ACT ON IS A DEAD END. It must name the control.
    expect(r.ok === false && r.detail).toContain('Test connection')
  })

  it('🛑 A FAILED CHECK IS A DIFFERENT SENTENCE FROM NEVER CHECKED', async () => {
    // They send an operator to different places: one is a button nobody has pressed, the other
    // is a credential to fix. Collapsing them is how somebody presses Test connection twice and
    // concludes the product is broken.
    state.inboxes = [box({
      verified_at: null, verify_failed_at: '2026-09-10T08:00:00Z',
      verify_detail: 'The mailbox refused the username and password.',
    })]
    const r = await programmeSenderSafety('house')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toBe('unverified_sender')
    expect(r.ok === false && r.detail).toContain('refused the username and password')
    expect(r.ok === false && r.detail).toContain('failed its last login check')
  })

  it('a proved mailbox binds cleanly — the check is a gate, not a wall', async () => {
    state.inboxes = [box()]
    expect((await programmeSenderSafety('house')).ok).toBe(true)
  })

  it('🛑 HOUSE FOLLOWS THE SAME RULE — no bypass for internal clients', async () => {
    // Founder, 10 Sep: "House follows the same system. No special bypasses." House may hold
    // several valid Google inboxes; the programme's ONE sender still has to have been proved.
    state.inboxes = [box({ client_id: 'house', email: 'jacques@meetandvibe.com', verified_at: null })]
    const r = await programmeSenderSafety('house')
    expect(r.ok, 'House was let through an unverified mailbox').toBe(false)
  })

  it('🛑 MULTIPLE VALID INBOXES ARE FINE — the rule is one unambiguous SENDER, not one mailbox', async () => {
    // Founder, 10 Sep: "Do not introduce a one-mailbox-per-client rule." Three verified boxes
    // with a clear rank winner is a decision, not an ambiguity.
    state.inboxes = [
      box(),
      box({ id: 'inbox-2', email: 'team@meetandvibe.com', kind: 'pooled' }),
      box({ id: 'inbox-3', email: 'hi@meetandvibe.com', kind: 'pooled', status: 'assigned' }),
    ]
    const r = await programmeSenderSafety('house')
    expect(r.ok, r.ok ? '' : r.detail).toBe(true)
    expect(r.ok && r.inboxId, 'the unambiguous winner is the branded active box').toBe('inbox-1')
  })
})

// ── ⑥ ⚑ 10 Sep (I2) — AND "WE COULD NOT TELL" IS STILL NOT "IT IS FINE" ────────────────
//
// 🛑 THIS SECTION EXISTS BECAUSE A MUTATION PROVED §④ DID NOT COVER IT. Disabling the
// verification read's own error branch left every suite green: `readFails` breaks the FIRST
// read, so `resolveSendingInbox` refuses and the verification read is never reached. A guard
// downstream of another guard needs a failure aimed at it specifically.

describe('⑥ an unreadable verification state refuses, and says what to run', () => {
  it('🛑 the verification read failing on its own is a refusal', async () => {
    state.inboxes = [box()]
    state.failSelect = 'verified_at'
    const r = await programmeSenderSafety('house')
    expect(r.ok, 'an unreadable verification state was treated as verified').toBe(false)
    expect(r.ok === false && r.reason).toBe('unreadable')
  })

  it('🛑 and it names the migration, so a missing column sends somebody to the runner', async () => {
    // Before the migration runs, the columns do not exist and this is the error an operator
    // sees. "Nothing may be bound to an unverifiable mailbox" alone reads as a broken mailbox,
    // and they would go looking for one that is fine.
    state.inboxes = [box()]
    state.failSelect = 'verified_at'
    const r = await programmeSenderSafety('house')
    expect(r.ok === false && r.detail).toContain('20260910_inbox_verification')
  })

  it('the other reads still refuse for their own reasons — this did not replace them', async () => {
    state.inboxes = [box()]
    state.readFails = true
    const r = await programmeSenderSafety('house')
    expect(r.ok).toBe(false)
  })
})

// ── ⑦ ⚑ 10 Sep (I2) — AND A DATABASE FAILURE IS NOT A MISSING MAILBOX ──────────────────
//
// ⛓️ `sending-inbox.ts` gave `lookup_failed` its own reason on 27 Jul because "No sending
// mailbox assigned" sent an operator off to configure a mailbox that was already there, while
// the database was the thing that was down. This module then flattened every refusal back to
// `no_sender` — the detail sentence stayed honest, the REASON did not, and the reason is what
// every caller branches on.

describe('⑦ our failure and the client\'s are different answers', () => {
  it('🛑 an unreadable mailbox table reports `unreadable`, not `no_sender`', async () => {
    state.inboxes = [box()]
    state.readFails = true
    const r = await programmeSenderSafety('house')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason,
      'a database outage was reported as a client with no mailbox').toBe('unreadable')
  })

  it('a client who genuinely has no mailbox still reports `no_sender`', async () => {
    // ⚠️ THE COMPLEMENT, so the case above cannot pass by everything becoming `unreadable`.
    state.inboxes = []
    state.readFails = false
    const r = await programmeSenderSafety('house')
    expect(r.ok === false && r.reason).toBe('no_sender')
  })
})
