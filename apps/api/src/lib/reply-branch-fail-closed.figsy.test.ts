import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── #1527 · THE ON-REPLY BRANCH FAILS CLOSED ───────────────────────────────────────────────
//
// `applyReplyBranching` decides whether the next sequence step may go to a person who has
// REPLIED. It reads two things: how many replies arrived since the last decision, and the
// campaign's configured `settings.steps`. Before this fix both reads ignored their `error`:
//
//   · a failed reply-count read left `count` null → 'send'
//   · a failed campaign read left `steps` null → "no configured sequence" → 'continue' → 'send'
//     (and that null was CACHED for the rest of the run, for every enrolment on the campaign)
//
// so a database hiccup kept emailing somebody who had answered us. A read we could not complete
// is not permission to send. Both failures now return 'skip' — the callers `continue` without
// touching the enrolment, so it stays due and the next run decides with a clean read.
//
// EXECUTED, not a placement guard: the real function runs against a mocked `db`.

const state = {
  countResult: { count: 0 as number | null, error: null as { message: string } | null },
  campaignResult: { data: null as unknown, error: null as { message: string } | null },
  enrollmentUpdates: [] as Record<string, unknown>[],
  campaignReads: 0,
}

vi.mock('@kind/db', () => ({
  db: {
    rpc: async () => ({ data: null, error: null }),
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select() { return q },
        eq() { return q }, gt() { return q }, is() { return q }, in() { return q },
        order() { return q }, limit() { return q },
        update(row: Record<string, unknown>) {
          if (table === 'figsy_enrollments') state.enrollmentUpdates.push(row)
          const chain: Record<string, unknown> = {
            eq() { return chain },
            then(r: (v: unknown) => unknown) { return Promise.resolve({ data: null, error: null }).then(r) },
          }
          return chain
        },
        async maybeSingle() {
          if (table === 'figsy_campaigns') { state.campaignReads++; return state.campaignResult }
          if (table === 'figsy_replies') return { data: { classification: 'hot' }, error: null }
          return { data: null, error: null }
        },
        then(r: (v: unknown) => unknown) {
          // The only awaited-without-terminal query in this function is the reply count.
          const v = table === 'figsy_replies' ? state.countResult : { data: [], error: null, count: 0 }
          return Promise.resolve(v).then(r)
        },
      }
      return q
    },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: async () => undefined }))

import { applyReplyBranching } from './figsy'

const enrollment = () => ({
  id: 'e1', campaign_id: 'camp1', current_step: 1,
  enrolled_at: '2026-09-01T00:00:00Z', reply_branch_handled_at: null,
})
type Cache = Parameters<typeof applyReplyBranching>[1]

beforeEach(() => {
  state.countResult = { count: 1, error: null }
  state.campaignResult = { data: null, error: null }
  state.enrollmentUpdates = []
  state.campaignReads = 0
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('#1527 · applyReplyBranching fails closed on a read it could not complete', () => {
  it('(i) a reply exists and the CAMPAIGN read errors → HOLD (skip), nothing stamped, nothing cached', async () => {
    state.campaignResult = { data: null, error: { message: 'connection reset' } }
    const cache: Cache = new Map()
    const out = await applyReplyBranching(enrollment(), cache)
    expect(out).toBe('skip')
    // Holding must not STOP or stamp the enrolment — the next run retries with a clean read.
    expect(state.enrollmentUpdates).toEqual([])
    // A failed read must not be remembered as "no configured sequence" for the rest of the run.
    expect(cache.has('camp1')).toBe(false)
    // …so the next enrolment on the same campaign reads again rather than inheriting a null.
    state.campaignResult = { data: { settings: { steps: [{ step: 1, on_reply: 'continue' }] } }, error: null }
    expect(await applyReplyBranching(enrollment(), cache)).toBe('send')
    expect(state.campaignReads).toBe(2)
  })

  it('(ii) the REPLY-COUNT read errors → HOLD (skip), campaign never read, nothing stamped', async () => {
    state.countResult = { count: null, error: { message: 'statement timeout' } }
    const out = await applyReplyBranching(enrollment(), new Map())
    expect(out).toBe('skip')
    expect(state.campaignReads).toBe(0)
    expect(state.enrollmentUpdates).toEqual([])
  })

  it('(iii) read SUCCEEDS with no configured steps → unchanged legacy behaviour: continue → send', async () => {
    state.campaignResult = { data: { settings: {} }, error: null }
    const cache: Cache = new Map()
    const out = await applyReplyBranching(enrollment(), cache)
    expect(out).toBe('send')
    expect(state.enrollmentUpdates).toHaveLength(1)
    expect(state.enrollmentUpdates[0]).toHaveProperty('reply_branch_handled_at')
    expect(state.enrollmentUpdates[0]).not.toHaveProperty('status')
    // A genuine "no steps" answer IS cached, exactly as before.
    expect(cache.has('camp1')).toBe(true)
    expect(cache.get('camp1')).toBeNull()
  })

  it('(iii-b) no campaign row at all (read succeeded, data null) → unchanged legacy send', async () => {
    state.campaignResult = { data: null, error: null }
    expect(await applyReplyBranching(enrollment(), new Map())).toBe('send')
  })

  it('(iv) read SUCCEEDS with steps → unchanged: on_reply stop marks replied and skips', async () => {
    state.campaignResult = { data: { settings: { steps: [{ step: 1, on_reply: 'stop' }] } }, error: null }
    const out = await applyReplyBranching(enrollment(), new Map())
    expect(out).toBe('skip')
    expect(state.enrollmentUpdates[0]).toMatchObject({ status: 'replied', next_send_at: null })
  })

  it('(iv-b) read SUCCEEDS with steps → unchanged: on_reply continue sends', async () => {
    state.campaignResult = { data: { settings: { steps: [{ step: 1, on_reply: 'continue' }] } }, error: null }
    expect(await applyReplyBranching(enrollment(), new Map())).toBe('send')
  })

  it('no reply since the last decision (clean read, count 0) → send, campaign not read', async () => {
    state.countResult = { count: 0, error: null }
    expect(await applyReplyBranching(enrollment(), new Map())).toBe('send')
    expect(state.campaignReads).toBe(0)
  })
})
