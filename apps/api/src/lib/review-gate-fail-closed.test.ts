import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── C7 — THE HUMAN-REVIEW GATE MUST FAIL CLOSED ───────────────────────────────────────────
//
// THE DEFECT, in one sentence: `sendSequenceEmail` asked the database whether this campaign
// requires human review, threw the error away, and read a failed answer as "no review needed".
//
//     const { data: camp } = await db.from('figsy_campaigns').select('settings')…
//     const reviewRequired = (camp?.settings)?.review_required === true
//
// A rejected query returns `data: null`. `null?.review_required === true` is `false`. So the
// function fell straight through to the send. A co-pilot client — one who explicitly asked to
// approve every email before it goes out — had their step sent UNREVIEWED, and nothing logged
// it, because from the code's point of view nothing had gone wrong.
//
// The fix mirrors the queue-insert failure twenty lines below, which was already fail-closed:
// do not send, do not pause, return 'deferred' so a later cron retries.
//
// ⚠️ THE TRAP, stated because getting it backwards is worse than the original bug:
// `maybeSingle()` returns `{ data: null, error: null }` when the campaign row does not EXIST.
// That is not a failure — it is a legitimate "no settings, therefore no review". Failing closed
// on `!camp` rather than on `error` would defer every send whose campaign row is missing,
// forever. The last case in the first block pins that.

const state = {
  campaignSettings: null as Record<string, unknown> | null,
  /** When set, the campaign-settings read REJECTS with this error — the defect's trigger. */
  campaignReadError: null as { message: string } | null,
  blocked: false,
  mailerCalls: 0,
  queueInserts: [] as Record<string, unknown>[],
  enrollmentUpdates: [] as Record<string, unknown>[],
}

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select() { return q },
        eq() { return q },
        is() { return q },
        in() { return q },
        order() { return q },
        limit() { return q },
        insert(row: Record<string, unknown>) {
          if (table === 'figsy_approval_queue') state.queueInserts.push(row)
          return Promise.resolve({ data: null, error: null })
        },
        update(row: Record<string, unknown>) {
          if (table === 'figsy_enrollments') state.enrollmentUpdates.push(row)
          // Chainable AND thenable: the real code writes `.update(x).eq(a).eq(b)` in places and
          // `.update(x).eq(a)` in others. A mock that only handled one `.eq` failed on the
          // OTHER call site, not on anything this file is testing.
          // Chainable on every builder verb the real code uses after `.update()`, and thenable
          // so it can be awaited at any point in the chain.
          const chain: Record<string, unknown> = {
            eq() { return chain }, is() { return chain }, in() { return chain },
            select() { return chain }, maybeSingle() { return Promise.resolve({ data: null, error: null }) },
            single() { return Promise.resolve({ data: null, error: null }) },
            then(res: (v: unknown) => unknown) { return Promise.resolve({ data: null, error: null }).then(res) },
          }
          return chain
        },
        async maybeSingle() {
          if (table === 'figsy_campaigns') {
            // THE ONE READ THIS FILE IS ABOUT.
            if (state.campaignReadError) return { data: null, error: state.campaignReadError }
            return { data: state.campaignSettings ? { settings: state.campaignSettings } : null, error: null }
          }
          if (table === 'opt_out_blocklist')   return { data: state.blocked ? { id: 'b1' } : null, error: null }
          if (table === 'figsy_approval_queue') return { data: null, error: null }   // no duplicate draft
          if (table === 'figsy_enrollments')    return { data: { client_id: 'c1' }, error: null }
          return { data: null, error: null }
        },
        async single() { return { data: null, error: null } },
      }
      return q
    },
  },
}))

// Everything between the top of the function and the review gate, neutralised so the test is
// about the gate and nothing else.
vi.mock('./demo',        () => ({ isDemoClient: async () => false }))
vi.mock('./suppression', () => ({ isSuppressed: () => false }))
vi.mock('./billing-rules', () => ({
  normalizeRevealEmail: (e: string | null) => (e ? e.trim().toLowerCase() : null),
  normalizeRevealEmails: (xs: (string | null)[]) => xs.filter(Boolean).map(e => String(e).trim().toLowerCase()),
  canEnroll: () => ({ ok: true }),
}))
// If the mailer is ever reached, that IS the bug — so it counts calls rather than sending.
vi.mock('./mailer', () => ({
  sendAs: async () => { state.mailerCalls++; return { ok: true, id: 'm1', error: null } },
}))

const LEAD = {
  id: 'l1', client_id: 'c1', email: 'prospect@acme.com',
  first_name: 'Ada', last_name: 'Lovelace', company: 'Acme Ltd', country: 'United States',
} as never

async function callSend() {
  process.env.AUTO_OUTREACH_ENABLED = 'true'
  const { sendSequenceEmail } = await import('./figsy')
  return sendSequenceEmail('e1', LEAD, 1, 'Subject', 'Body', 'camp-1')
}

beforeEach(() => {
  state.campaignSettings = null
  state.campaignReadError = null
  state.blocked = false
  state.mailerCalls = 0
  state.queueInserts = []
  state.enrollmentUpdates = []
})

describe('C7 RED PROOF — the OLD logic sends when the settings read fails', () => {
  // The two lines exactly as they were, run against a rejected read. This is the defect
  // reproduced in isolation: no mocking sleight of hand, just the expression that shipped.
  function oldReviewRequired(read: { data: { settings?: unknown } | null; error: unknown }): boolean {
    const camp = read.data                                            // ← error discarded
    return (camp?.settings as { review_required?: boolean } | null)?.review_required === true
  }
  function newReviewGate(read: { data: { settings?: unknown } | null; error: unknown }): 'deferred' | boolean {
    if (read.error) return 'deferred'                                  // ← the fix
    return (read.data?.settings as { review_required?: boolean } | null)?.review_required === true
  }

  const FAILED_READ = { data: null, error: { message: 'connection terminated unexpectedly' } }

  it('OLD: a failed read renders as "no review needed" — the step would SEND UNREVIEWED', () => {
    expect(oldReviewRequired(FAILED_READ)).toBe(false)   // ← RED. false means "send it".
  })

  it('NEW: the same failed read defers instead', () => {
    expect(newReviewGate(FAILED_READ)).toBe('deferred')  // ← GREEN
  })

  it('and a campaign that requires review was ALSO invisible on a failed read', () => {
    // The client had review_required: true. The read failed. The old expression still said
    // false — so the very client who asked to approve everything is the one who got sent.
    expect(oldReviewRequired({ data: { settings: { review_required: true } }, error: null })).toBe(true)
    expect(oldReviewRequired(FAILED_READ)).toBe(false)
  })
})

describe('C7 — the REAL sendSequenceEmail, executed', () => {
  it('GREEN: a failed settings read returns "deferred" and the mailer is never reached', async () => {
    state.campaignReadError = { message: 'connection terminated unexpectedly' }

    const loggedErrors: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => { loggedErrors.push(a.join(' ')) })
    let outcome: string
    try { outcome = await callSend() } finally { spy.mockRestore() }

    expect(outcome).toBe('deferred')
    expect(state.mailerCalls, 'nothing may be sent when the review requirement is unknown').toBe(0)
    expect(loggedErrors.join('\n'), 'and it must say so loudly, not defer in silence')
      .toContain('cannot establish whether human review is required')
    expect(state.queueInserts, 'and nothing is queued either — we do not know if review applies').toEqual([])
  })

  it('does NOT pause the enrollment — it stays due so a later cron retries', async () => {
    state.campaignReadError = { message: 'timeout' }

    await callSend()

    // Pausing would strand the enrollment on a transient database error. The queue-insert
    // failure below behaves the same way, deliberately.
    expect(state.enrollmentUpdates.some(u => 'next_send_at' in u && u.next_send_at === null)).toBe(false)
  })

  it('THE TRAP: a campaign row that does not exist is NOT a failure — the gate lets it through', async () => {
    // `{ data: null, error: null }`. If this fail-closed, every send without a campaign row
    // would stall forever.
    //
    // Asserted on the fail-closed LOG rather than the return value, deliberately: a no-row send
    // can still end in 'deferred' further down for an unrelated reason (the daily cold cap), so
    // asserting `not.toBe('deferred')` would have been testing the mock, not the gate.
    const errs: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => { errs.push(a.join(' ')) })
    try {
      state.campaignReadError = null
      state.campaignSettings  = null
      await callSend()
    } finally { spy.mockRestore() }

    expect(errs.join('\n'), 'a missing row must not trip the fail-closed path').not.toContain('cannot establish whether human review is required')
    expect(state.queueInserts, 'no review configured → nothing queued').toEqual([])
  })

  it('a successful read that DOES require review still queues and pauses, unchanged', async () => {
    state.campaignSettings = { review_required: true }

    const outcome = await callSend()

    expect(outcome).toBe('queued')
    expect(state.queueInserts).toHaveLength(1)
    expect(state.mailerCalls, 'a co-pilot step is never sent before a human sees it').toBe(0)
    expect(state.enrollmentUpdates.some(u => u.next_send_at === null), 'queued steps pause').toBe(true)
  })
})

describe('C7 GUARD — the error cannot be dropped again', () => {
  const src = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
  // Anchor inside sendSequenceEmail, NOT on the first `figsy_campaigns` read in the file. The
  // first one is a different function (the on-reply steps lookup) — the guard's first version
  // pointed at it and reported the fix missing while it was sitting right there.
  const fn = src.slice(src.indexOf('export async function sendSequenceEmail'))
  const body = fn.slice(0, fn.indexOf('export async function', 20))
  const at = body.indexOf("from('figsy_campaigns')")
  const gate = body.slice(at - 900, at + 1200)

  it('the read destructures its error', () => {
    expect(gate).toMatch(/const \{ data: camp, error: campErr \}/)
  })

  it('and checks it BEFORE reading settings — order is the whole fix', () => {
    const errAt      = gate.indexOf('if (campErr)')
    const settingsAt = gate.indexOf('camp?.settings')
    expect(errAt, 'the error check must exist').toBeGreaterThan(-1)
    expect(errAt, 'the error must be checked before settings are read').toBeLessThan(settingsAt)
  })

  it('the failure path returns deferred, not a send', () => {
    const block = gate.slice(gate.indexOf('if (campErr)'), gate.indexOf('const reviewRequired'))
    expect(block).toContain("return 'deferred'")
  })

  it('it fails closed on the ERROR, never on a missing row', () => {
    // Guarding this direction too: `if (!camp) return 'deferred'` would be a regression that
    // looks like extra safety and would stall every campaign-less send.
    const block = gate.slice(gate.indexOf('if (campErr)'), gate.indexOf('const reviewRequired'))
    expect(block).not.toMatch(/if \(!camp\)/)
  })
})
