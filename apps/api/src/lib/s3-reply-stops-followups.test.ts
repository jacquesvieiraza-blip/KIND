// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (card #2558 · S3) — ANY HUMAN REPLY STOPS A PROGRAMME'S FOLLOW-UPS.
//
// What was wrong: a prospect who answered "not interested", "send me more info" or "talk to
// Sarah" still got steps 2, 3, 4 and 5 ("just bumping this") in the client's name. Only a reply
// classified `hot`, or an explicit opt-out, stopped the sequence — and at send time a programme
// campaign has no per-step `on_reply` settings, so the branch fell to the legacy "continue".
// Milla showed "Interested · we're replying" or "Closed" while the next cold follow-up went out.
//
// The rule now, for every programme enrolment: any reply stops the sequence — the enrolment is
// set to `replied` and nothing further is scheduled — except an out-of-office, which is a robot
// and lets the sequence carry on. Proved at BOTH doors: when the reply arrives, and again at
// send time, so a missed write on arrival still cannot send the next step.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>

const state = {
  classification: 'cold' as string,
  enrollment: { id: 'enr-1', campaign_id: 'camp-1', programme_id: 'prog-1' } as Row,
  enrollmentUpdates: [] as { id: unknown; patch: Row }[],
  /** replies on file for the enrolment, for the send-time check */
  replies: [] as { classification: string | null; received_at: string }[],
}

vi.mock('@kind/db', () => ({
  db: {
    rpc: async () => ({ data: null, error: null }),
    from: (table: string) => {
      const eqs: Record<string, unknown> = {}
      let patch: Row | null = null
      let head = false
      const q: Record<string, unknown> = {
        select(_c?: unknown, o?: { head?: boolean }) { head = o?.head === true; return q },
        eq(c: string, v: unknown) { eqs[c] = v; return q },
        in() { return q }, is() { return q }, not() { return q }, order() { return q },
        limit() { return q }, gt() { return q }, gte() { return q }, neq() { return q }, or() { return q },
        update(p: Row) { patch = p; return q },
        insert() {
          const ins: Record<string, unknown> = {
            select() { return ins },
            async single() { return { data: { id: 'reply-1' }, error: null } },
            async maybeSingle() { return { data: { id: 'reply-1' }, error: null } },
            then(r: (v: unknown) => unknown) { return Promise.resolve({ data: null, error: null }).then(r) },
          }
          return ins
        },
        async maybeSingle() {
          if (table === 'figsy_enrollments') return { data: { ...state.enrollment }, error: null }
          if (table === 'clients') return { data: { company_name: 'Acme' }, error: null }
          if (table === 'figsy_campaigns') return { data: { settings: {} }, error: null }   // no per-step settings
          if (table === 'figsy_replies') return { data: state.replies[0] ?? null, error: null }
          return { data: null, error: null }
        },
        async single() { return { data: null, error: null } },
        then(r: (v: unknown) => unknown) {
          if (table === 'figsy_enrollments' && patch) {
            state.enrollmentUpdates.push({ id: eqs.id, patch })
            return Promise.resolve({ data: null, error: null }).then(r)
          }
          if (table === 'figsy_replies' && head) return Promise.resolve({ data: null, count: state.replies.length, error: null }).then(r)
          if (table === 'figsy_replies') return Promise.resolve({ data: state.replies, error: null }).then(r)
          return Promise.resolve({ data: [], error: null, count: 0 }).then(r)
        },
      }
      return q
    },
  },
}))

vi.mock('./reply-ingest', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  findLeadMatches: async () => [{ id: 'lead-1', client_id: 'client-A' }],
  resolveInboxOwner: async () => null,
  sentLeadIdsFor: async () => new Set<string>(),
  suppressOptOut: async () => {},
  alertDroppedReply: async () => {},
}))
vi.mock('./alerts', () => ({ sendFounderAlert: async () => ({ delivered: true, emailOk: true, slackOk: false, durableOk: true, taskOk: true }) }))
vi.mock('./operator-tasks', () => ({ raiseOperatorTask: async () => ({ ok: true, taskId: 't-1' }), dedupeKeyFor: () => 'global' }))
vi.mock('./outcomes', () => ({ logOutcomeEvent: async () => {} }))
vi.mock('./crm', () => ({ pushDealToCrm: async () => {} }))
vi.mock('./hubspot', () => ({ syncFigsyInterestedToHubspot: async () => {} }))
vi.mock('./push', () => ({ sendPushToClient: async () => {} }))
vi.mock('../routes/signals', () => ({ emitSignal: () => {} }))
vi.mock('./unattributed-reply', () => ({ retainUnattributedReply: async () => ({ ok: true, id: 'ret-1' }) }))
vi.mock('./figsy', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  classifyReply: async () => ({ classification: state.classification, reasoning: 'test' }),
  isRiskyReply: () => false,
  recomputeCampaignCounters: async () => {},
}))

const INBOUND = {
  fromEmail: 'ada@prospect.com', fromName: 'Ada', toEmail: 'hello@sender.test',
  subject: 'Re: your note', body: 'Thanks, but not for us.', providerMessageId: 'msg-1',
}
const arrive = async () => (await import('./reply-pipeline'))
  .processInboundReply(INBOUND as never, { rawPayload: {}, eventKey: 'evt-1' } as never)

const stopped = () => state.enrollmentUpdates.some(u =>
  u.id === 'enr-1' && u.patch.status === 'replied' && u.patch.next_send_at === null)

beforeEach(() => {
  state.classification = 'cold'
  state.enrollment = { id: 'enr-1', campaign_id: 'camp-1', programme_id: 'prog-1' }
  state.enrollmentUpdates = []
  state.replies = []
})

describe('① when the reply ARRIVES — a programme sequence stops on any human reply', () => {
  for (const c of ['cold', 'warm', 'wrong_person', 'referral', 'other']) {
    it(`🛑 a "${c}" reply stops the follow-ups: status replied, nothing scheduled`, async () => {
      state.classification = c
      await arrive()
      expect(stopped(), `a ${c} reply still leaves the next step due`).toBe(true)
    })
  }

  it('an out-of-office is a robot — the sequence carries on', async () => {
    state.classification = 'out_of_office'
    await arrive()
    expect(stopped()).toBe(false)
  })

  it('a hot reply still stops it, exactly as before', async () => {
    state.classification = 'hot'
    await arrive()
    expect(state.enrollmentUpdates.some(u => u.id === 'enr-1' && u.patch.status === 'replied')).toBe(true)
  })

  it('positive control: a LEGACY enrolment (no programme) keeps its old behaviour on a cold reply', async () => {
    state.enrollment = { id: 'enr-1', campaign_id: 'camp-1', programme_id: null }
    await arrive()
    expect(stopped()).toBe(false)
  })
})

describe('② at SEND time — a missed write on arrival still cannot send the next step', () => {
  const enrollment = (programme_id: string | null) => ({
    id: 'enr-1', campaign_id: 'camp-1', programme_id, current_step: 1,
    enrolled_at: '2026-10-01T00:00:00Z', reply_branch_handled_at: null,
  })

  it('🛑 a programme enrolment with a human reply on file is HELD and stopped, even with no per-step settings', async () => {
    state.replies = [{ classification: 'cold', received_at: '2026-10-02T09:00:00Z' }]
    const { applyReplyBranching } = await import('./figsy')
    expect(await applyReplyBranching(enrollment('prog-1') as never, new Map())).toBe('skip')
    expect(stopped()).toBe(true)
  })

  it('🛑 a reply we could not classify counts as human — the step is not sent', async () => {
    state.replies = [{ classification: null, received_at: '2026-10-02T09:00:00Z' }]
    const { applyReplyBranching } = await import('./figsy')
    expect(await applyReplyBranching(enrollment('prog-1') as never, new Map())).toBe('skip')
  })

  it('only out-of-office replies on file → the next step goes', async () => {
    state.replies = [{ classification: 'out_of_office', received_at: '2026-10-02T09:00:00Z' }]
    const { applyReplyBranching } = await import('./figsy')
    expect(await applyReplyBranching(enrollment('prog-1') as never, new Map())).toBe('send')
    expect(stopped()).toBe(false)
  })

  it('positive control: a LEGACY enrolment with no per-step settings keeps its old "continue"', async () => {
    state.replies = [{ classification: 'cold', received_at: '2026-10-02T09:00:00Z' }]
    const { applyReplyBranching } = await import('./figsy')
    expect(await applyReplyBranching(enrollment(null) as never, new Map())).toBe('send')
  })
})
