// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CORE MUST ACTUALLY USE THE MAILBOX THE RUN NAMED.
//
// ⚑ 2 Sep. `send-due-run-once.route.test.ts` proves the RUN picks the right box — but it
// stubs both send entry points, so it can only see what the run PASSED. It cannot see
// whether the core then used it. A RED proof exposed exactly that: reverting
// `opts.inbox ?? resolved.inbox` back to `resolved.inbox` left that whole suite green.
//
// 🛑 THAT ONE LINE IS THE FIX. Without it the core re-resolves through `pickSendingInbox`,
// which ranks branded-before-pooled and returns the FIRST row — so every message would leave
// from the same box however carefully the run rotated, which is the original defect intact
// underneath a passing rotation suite.
//
// So this file runs the REAL core and watches the REAL seam: `sendAs`.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'
process.env.INBOX_SECRET_KEY = process.env.INBOX_SECRET_KEY || 'a'.repeat(64)

type Row = Record<string, unknown>

const BOX = (email: string, over: Row = {}) => ({
  id: `box-${email}`, email, kind: 'branded', status: 'active', provider: 'google-smtp',
  daily_cap: 30, smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_secure: false,
  smtp_user: email, smtp_pass_enc: 'v1:cipher', from_name: 'Jacques', ...over,
})

/** What the client's own rows are — i.e. what `pickSendingInbox` would rank and choose. */
const CLIENT_ROWS = [
  BOX('jacques@kindoutreach.com'),                      // branded + active → ranks FIRST
  BOX('hello@kindoutreach.com', { kind: 'pooled' }),     // pooled + active → ranks second
]

const sentFrom: string[] = []

vi.mock('@kind/db', () => {
  const q = (table: string): Record<string, unknown> => {
    const o: Record<string, unknown> = {
      select() { return o }, eq() { return o }, in() { return o }, is() { return o },
      not() { return o }, gte() { return o }, lte() { return o }, order() { return o }, limit() { return o },
      async maybeSingle() {
        if (table === 'clients') return { data: { id: 'client-1', is_demo: false }, error: null }
        if (table === 'figsy_enrollments') return { data: { id: 'enr-1' }, error: null }
        return { data: null, error: null }
      },
      insert() { return { select: () => ({ single: async () => ({ data: { id: 'row-1' }, error: null }) }) } },
      update() { return o },
      delete() { return o },
      then(r: (v: unknown) => unknown) {
        if (table === 'client_inboxes') return r({ data: CLIENT_ROWS, error: null })
        return r({ data: [], count: 0, error: null })
      },
    }
    return o
  }
  return { db: { from: (t: string) => q(t), rpc: async () => ({ data: null, error: null }) } }
})

// THE SEAM. Whatever inbox reaches here is the mailbox that would really have sent.
vi.mock('./mailer', () => ({
  sendAs: async (inbox: { email?: string }) => {
    sentFrom.push(String(inbox?.email))
    return { ok: true, id: '<m@x>', error: null }
  },
  verifyInbox: async () => ({ ok: true, message: 'ok' }),
}))

// Keep the test on the ONE question: does the named inbox reach `sendAs`? Everything that
// would otherwise refuse before we get there is stubbed to allow.
vi.mock('./send-gate', () => ({ checkSendAllowed: async () => ({ allowed: true }) }))
vi.mock('./suppression', () => ({ isSuppressed: () => false }))
vi.mock('./pecr', () => ({ pecrVerdict: () => ({ allow: true }), pecrSkipReason: () => '' }))
vi.mock('./programme-authority', () => ({
  resolveLeadAttribution: async () => ({ allowed: true, mode: 'legacy', programme: null }),
  checkEnrollmentAuthority: async () => ({ allowed: true, mode: 'legacy', programme: null }),
  checkProgrammeAuthority: async () => ({ allowed: true, mode: 'legacy', programme: null }),
}))
vi.mock('./outcomes', () => ({ logOutcomeEvent: async () => {} }))
vi.mock('./alerts', () => ({ sendFounderAlert: async () => {} }))

// `country` is required: `isLaunchSendCountry` refuses an unknown one before the send, which
// would make every assertion below vacuously empty for the wrong reason.
const LEAD = { id: 'lead-1', client_id: 'client-1', email: 'p1@prospect.test', first_name: 'P', last_name: 'One', country: 'United Kingdom' }
const prevOp = process.env.FIGSY_OPERATOR_SEND_ENABLED

beforeEach(() => {
  sentFrom.length = 0
  process.env.FIGSY_OPERATOR_SEND_ENABLED = 'true'
  delete process.env.AUTO_OUTREACH_ENABLED
})
afterEach(() => {
  if (prevOp === undefined) delete process.env.FIGSY_OPERATOR_SEND_ENABLED
  else process.env.FIGSY_OPERATOR_SEND_ENABLED = prevOp
})

describe('the named mailbox reaches the real sender', () => {
  it('🛑 an explicitly passed inbox is used — NOT the top-ranked one the picker would choose', async () => {
    const { sendSequenceEmailOperatorRun } = await import('./figsy')
    // `hello@` is `pooled`, so `pickSendingInbox` would rank `jacques@` above it and return
    // that instead. If this assertion ever reads `jacques@`, the override line is gone and
    // rotation is a no-op again.
    await sendSequenceEmailOperatorRun('enr-1', LEAD as never, 1, 'subject', 'body', 'camp-1', {
      inbox: CLIENT_ROWS[1] as never,
    })
    expect(sentFrom).toEqual(['hello@kindoutreach.com'])
  })

  it('with no inbox passed, it still resolves the client\'s ranked mailbox as before', async () => {
    const { sendSequenceEmailOperatorRun } = await import('./figsy')
    await sendSequenceEmailOperatorRun('enr-1', LEAD as never, 1, 'subject', 'body', 'camp-1')
    expect(sentFrom).toEqual(['jacques@kindoutreach.com'])
  })

  it('🔐 the operator entry point sends NOTHING when its env key is absent', async () => {
    delete process.env.FIGSY_OPERATOR_SEND_ENABLED
    const { sendSequenceEmailOperatorRun } = await import('./figsy')
    const out = await sendSequenceEmailOperatorRun('enr-1', LEAD as never, 1, 's', 'b', 'camp-1', {
      inbox: CLIENT_ROWS[1] as never,
    })
    expect(out).toBe('deferred')
    expect(sentFrom).toEqual([])
  })

  it('🔐 the ORDINARY entry point still sends nothing with the kill-switch off, env or no env', async () => {
    // Both keys present for the operator path, and the automatic path is still shut.
    process.env.FIGSY_OPERATOR_SEND_ENABLED = 'true'
    const { sendSequenceEmail } = await import('./figsy')
    const out = await sendSequenceEmail('enr-1', LEAD as never, 1, 's', 'b', 'camp-1')
    expect(out).toBe('deferred')
    expect(sentFrom).toEqual([])
  })
})
