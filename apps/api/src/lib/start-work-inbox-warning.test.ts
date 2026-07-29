import { describe, it, expect, vi, beforeEach } from 'vitest'

// #552 — THE AMBIGUITY, RESOLVED: WARN LOUDLY, DO NOT BLOCK.
//
// LAUNCH-PAD said *"Start work refuses without an inbox"*. The code did not — the refusal only
// ever fired at SEND time. One of the two was wrong and nobody had decided which, so the
// product had a documented gate that did not exist.
//
// The decision these tests pin: **sourcing proceeds, and the operator is told.** The two halves
// fail in opposite directions:
//
//   • Sourcing spends OUR data budget and fills the client's desk. Blocking it on a mailbox
//     idles a client who has ALREADY PAID — their $99 buys people; the mailbox is a separate
//     purchase we make days later. A hard refusal means paying clients sit with an empty desk
//     waiting on us.
//   • Sending touches a real prospect from a real mailbox. That is where fail-closed belongs,
//     and it is already there: figsy.ts refuses, rolls the step back, and never falls back to
//     a shared address.
//
// So the gate stays where the danger is and this makes the state VISIBLE — instead of an
// operator discovering it when the first send silently defers.

const state = {
  purchases: 1,
  awaiting: 0,
  icps: [{ id: 'icp-1' }] as { id: string }[],
  /** what resolveSendingInbox returns */
  resolution: { ok: true, inbox: { id: 'i1', email: 'ada@acme.com' }, from: 'Ada' } as Record<string, unknown>,
  /** make the readiness check itself explode */
  resolveThrows: false,
  runs: [] as { icpId: string; want: number }[],
}

function query(table: string) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'limit']) q[m] = () => q
  q.then = (resolve: (v: unknown) => void) => {
    if (table === 'credit_transactions') return resolve({ count: state.purchases, error: null })
    if (table === 'icps') return resolve({ data: state.icps, error: null })
    if (table === 'leads') return resolve({ count: state.awaiting, data: [], error: null })
    return resolve({ data: [], count: 0, error: null })
  }
  q.range = async () => ({ data: [], error: null })
  q.maybeSingle = async () => {
    if (table === 'clients') return { data: { user_id: 'user-1' }, error: null }
    return { data: null, error: null }
  }
  q.update = () => ({ in: () => ({ is: async () => ({ error: null }), then: (r: (v: unknown) => void) => r({ error: null }) }) })
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t) } }))
vi.mock('../routes/icps', () => ({
  runIcpJob: vi.fn(async (icpId: string, _c: string, _u: string, want: number) => {
    state.runs.push({ icpId, want })
    return { inserted: want }
  }),
}))
vi.mock('./alerts', () => ({ sendFounderAlert: vi.fn(async () => {}) }))

// THE POINT OF THE WHOLE DESIGN: the warning is derived from the SEND PATH'S OWN resolver.
// A re-implemented "does a row exist in client_inboxes?" check would drift the moment the
// send rules changed, and Vida would show a green light over a mailbox that cannot send.
vi.mock('./sending-inbox', () => ({
  resolveSendingInbox: async () => {
    if (state.resolveThrows) throw new Error('pg: connection reset')
    return state.resolution
  },
  refusalLabel: (r: string) => ({
    no_inbox: 'No sending mailbox assigned',
    warming_only: 'Mailbox still warming — cannot send yet',
    no_credentials: 'Mailbox has no SMTP details saved',
    no_secret_key: 'API cannot read mailbox passwords (INBOX_SECRET_KEY unset)',
    lookup_failed: 'Could not read this client\'s mailboxes — database problem, NOT a missing mailbox',
  }[r] ?? r),
}))

import { startWorkForClient, sendReadiness } from './start-work'

const refuse = (reason: string, detail = 'Assign one in Vida.') =>
  ({ ok: false, reason, detail })

beforeEach(() => {
  state.purchases = 1
  state.awaiting = 0
  state.icps = [{ id: 'icp-1' }]
  state.resolution = { ok: true, inbox: { id: 'i1', email: 'ada@acme.com' }, from: 'Ada' }
  state.resolveThrows = false
  state.runs = []
})

describe('the decision: sourcing is NOT blocked by a missing mailbox', () => {
  it('a client with NO inbox is still sourced — their $99 already bought these people', async () => {
    // The whole decision in one assertion. A hard refusal here idles a paying client's
    // onboarding waiting on a purchase WE control.
    state.resolution = refuse('no_inbox')
    const r = await startWorkForClient('client-1')
    expect(r.started).toBe(true)
    expect(r.sourced).toBe(200)
    expect(state.runs).toHaveLength(1)
  })

  it('…but the result CARRIES THE WARNING, so it cannot be discovered by accident', async () => {
    state.resolution = refuse('no_inbox')
    const r = await startWorkForClient('client-1')
    expect(r.sendWarning?.headline).toContain('cannot SEND')
    expect(r.sendWarning?.label).toContain('No sending mailbox assigned')
    expect(r.sendWarning?.reason).toBe('no_inbox')
  })

  it('a client WITH a usable inbox gets no warning at all', async () => {
    const r = await startWorkForClient('client-1')
    expect(r.sendWarning).toBeUndefined()
    expect(r.sourced).toBe(200)
  })

  it('an ALREADY-STOCKED client with no inbox still gets the warning', async () => {
    // The one an operator would otherwise assume is fine: nothing to source, nothing to
    // report, and a desk full of people nobody can be emailed about.
    state.awaiting = 500          // sourceTarget → 0
    state.resolution = refuse('no_inbox')
    const r = await startWorkForClient('client-1')
    expect(r.reason).toBe('already_stocked')
    expect(r.sendWarning?.reason).toBe('no_inbox')
  })

  it('the warning never fires BEFORE a more fundamental refusal', async () => {
    // An unpaid client's problem is that they have not paid. Leading with "no mailbox" would
    // send the operator to buy one for a client who owes us $99.
    state.purchases = 0
    state.resolution = refuse('no_inbox')
    const r = await startWorkForClient('client-1')
    expect(r.reason).toBe('not_paid')
    expect(r.sendWarning).toBeUndefined()
  })
})

describe('it reuses the SEND PATH\'s rules, so the two can never disagree', () => {
  it('a WARMING mailbox warns — a row existing is not the same as being able to send', async () => {
    // The trap a hand-rolled "does a client_inboxes row exist?" check falls into. Sending on
    // a warming mailbox is what un-warms it, so the send path refuses — and Vida would have
    // shown a green light over it.
    state.resolution = refuse('warming_only', 'Wait for it to go active.')
    const r = await startWorkForClient('client-1')
    expect(r.sendWarning?.label).toContain('warming')
  })

  it('a mailbox with NO SMTP details warns', async () => {
    state.resolution = refuse('no_credentials', 'Add the host, username and password.')
    expect((await startWorkForClient('client-1')).sendWarning?.reason).toBe('no_credentials')
  })

  it('a missing INBOX_SECRET_KEY warns — the password cannot be read', async () => {
    state.resolution = refuse('no_secret_key', 'Set it in Railway.')
    expect((await startWorkForClient('client-1')).sendWarning?.reason).toBe('no_secret_key')
  })

  it('a DATABASE failure says so, and says it is NOT a missing mailbox', async () => {
    // Sending an operator to assign a mailbox that is already there, while the database is
    // the thing that is down, is the wrong instruction confidently delivered.
    state.resolution = refuse('lookup_failed', 'DB unreachable.')
    const r = await startWorkForClient('client-1')
    expect(r.sendWarning?.label).toContain('NOT a missing mailbox')
  })

  it('the detail from the send path is passed through verbatim — it names the fix', async () => {
    state.resolution = refuse('no_inbox', 'Assign one in Vida before any outreach can leave.')
    expect((await startWorkForClient('client-1')).sendWarning?.detail)
      .toContain('Assign one in Vida before any outreach can leave.')
  })
})

describe('when the CHECK ITSELF fails', () => {
  it('reports UNKNOWN, never a green light', async () => {
    // "The check broke, so assume it's fine" is the exact failure shape this repo has spent
    // the week removing.
    state.resolveThrows = true
    const r = await sendReadiness('client-1')
    expect(r.canSend).toBe(false)
    expect(r.canSend === false && r.warning.headline).toContain('UNKNOWN')
    expect(r.canSend === false && r.warning.reason).toBe('check_failed')
  })

  it('says the absence of an answer is not evidence of a missing mailbox', async () => {
    state.resolveThrows = true
    const r = await sendReadiness('client-1')
    expect(r.canSend === false && r.warning.detail).toContain('not evidence')
  })

  it('and it STILL does not block the sourcing', async () => {
    // A warning that breaks the thing it annotates is worse than no warning.
    state.resolveThrows = true
    const r = await startWorkForClient('client-1')
    expect(r.sourced).toBe(200)
    expect(r.sendWarning?.reason).toBe('check_failed')
  })
})

describe('sendReadiness on its own', () => {
  it('says yes when the send path says yes', async () => {
    expect(await sendReadiness('client-1')).toEqual({ canSend: true })
  })

  it('never throws — it is a warning, not a gate', async () => {
    state.resolveThrows = true
    await expect(sendReadiness('client-1')).resolves.toBeTruthy()
  })
})
