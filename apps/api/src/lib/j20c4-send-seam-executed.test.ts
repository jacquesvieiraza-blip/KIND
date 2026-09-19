// ══════════════════════════════════════════════════════════════════════════════════════════
// J20-C4 · THE REAL SEND SEAM, EXECUTED — a non-sendable row never reaches the mailer (FD-5)
//
// RED: *"A non-sendable row reaches the send seam and is sent (F-SENDABLE)."*
//
// ── WHY THIS FILE EXISTS BESIDE THE SOURCE GUARD ────────────────────────────────────────
//
// `j20c4-send-seam-refuses-non-sendable.test.ts` reads the source: it proves the gate is
// WRITTEN, in the right place, asking the right question. That is genuinely weaker than
// watching an address fail to leave, and this repository has the scar: #617 existed because a
// call existed in two functions and not a third, which reads as "handled" to anything counting
// occurrences.
//
// 🛑 SO THIS FILE RUNS THE REAL `sendSequenceEmail` AND WATCHES THE MAILER. Every address that
// reaches `sendAs` is an address we emailed. The four not-sendable shapes must produce an empty
// list, and a verified business address must produce exactly one — because a file where
// NOTHING sends proves nothing at all.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = {
  /** What the `leads` row says about this person, for the gate under test. */
  leadRow: { email: 'prospect@acme.com', email_status: 'verified' } as
    { email?: string | null; email_status?: string | null } | null,
  /** When set, the sendable read REJECTS — the fail-closed case. */
  leadReadError: null as { message: string } | null,
  mailerCalls: [] as string[],
}

vi.mock('@kind/db', () => ({
  db: {
    rpc: async () => ({ data: null, error: null }),
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q }, is() { return q }, in() { return q },
        not() { return q }, order() { return q }, limit() { return q },
        insert() {
          const ins: Record<string, unknown> = {
            select() { return ins },
            async single() { return { data: { id: 'se1' }, error: null } },
            async maybeSingle() { return { data: { id: 'se1' }, error: null } },
            then(r: (v: unknown) => unknown) { return Promise.resolve({ data: null, error: null }).then(r) },
          }
          return ins
        },
        update(row: Record<string, unknown>) {
          // The atomic step claim must be GRANTED or the verified lead never sends and the
          // positive control passes for the wrong reason (the #617 harness failure).
          const granted = table === 'figsy_enrollments' && 'current_step' in row ? { id: 'e1' } : null
          const chain: Record<string, unknown> = {
            eq() { return chain }, is() { return chain }, in() { return chain }, select() { return chain },
            maybeSingle() { return Promise.resolve({ data: granted, error: null }) },
            single() { return Promise.resolve({ data: granted, error: null }) },
            then(r: (v: unknown) => unknown) { return Promise.resolve({ data: null, error: null }).then(r) },
          }
          return chain
        },
        async maybeSingle() {
          // 🛑 THE ROW UNDER TEST.
          if (table === 'leads') {
            if (state.leadReadError) return { data: null, error: state.leadReadError }
            return { data: state.leadRow, error: null }
          }
          if (table === 'opt_out_blocklist')  return { data: null, error: null }
          if (table === 'figsy_enrollments')  return { data: { client_id: 'c1' }, error: null }
          if (table === 'clients')            return { data: { id: 'c1', commercial_model: null }, error: null }
          return { data: null, error: null }
        },
        async single() { return { data: null, error: null } },
        then(r: (v: unknown) => unknown) { return Promise.resolve({ data: [], error: null, count: 0 }).then(r) },
      }
      return q
    },
  },
}))

vi.mock('./demo',        () => ({ isDemoClient: async () => false }))
vi.mock('./suppression', () => ({ isSuppressed: () => false }))
vi.mock('./pecr',        () => ({ pecrVerdict: () => ({ allow: true }), pecrSkipReason: () => '' }))
vi.mock('./programme-authority', () => ({
  checkEnrollmentAuthority: async () => ({ allowed: true, reason: 'ok', message: '' }),
}))
vi.mock('./outcomes', () => ({ logOutcomeEvent: async () => {} }))
vi.mock('./alerts',   () => ({ sendFounderAlert: async () => undefined }))
vi.mock('./billing-rules', () => ({
  normalizeRevealEmail: (e: string | null) => (e ? e.trim().toLowerCase() : null),
  normalizeRevealEmails: (xs: (string | null)[]) => xs.filter(Boolean).map(e => String(e).trim().toLowerCase()),
  canEnroll: () => ({ ok: true }),
}))
// THE OBSERVATION POINT. Every address that gets here is an address we emailed.
vi.mock('./mailer', () => ({
  sendAs: async (_i: unknown, mail: { to: string }) => { state.mailerCalls.push(mail.to); return { ok: true, id: 'm1', error: null } },
}))
const INBOX = {
  id: 'ib1', email: 'ada@acme-client.com', kind: 'branded', status: 'active', provider: 'smtp',
  daily_cap: 30, smtp_host: 'smtp.acme.com', smtp_port: 587, smtp_secure: true,
  smtp_user: 'ada@acme-client.com', smtp_pass_enc: 'v1:a:b:c', from_name: 'Ada',
}
vi.mock('./sending-inbox', () => ({
  resolveSendingInbox: async () => ({ ok: true, inbox: INBOX }),
  refusalLabel: () => 'no mailbox',
  sendablePool: () => ({ ok: true, boxes: [INBOX] }),
  nextFromRotation: (rot: { id: string }[]) => rot[0]?.id ?? null,
}))
vi.mock('./inbox-secret', () => ({ secretState: () => ({ ok: true }) }))

const LEAD = {
  id: 'l1', client_id: 'c1', email: 'prospect@acme.com',
  first_name: 'Ada', last_name: 'Lovelace', company: 'Acme Ltd', country: 'United States',
} as never

async function send() {
  process.env.AUTO_OUTREACH_ENABLED = 'true'
  const { sendSequenceEmail } = await import('./figsy')
  return sendSequenceEmail('e1', LEAD, 1, 'Subject', 'Body', 'camp-1')
}

beforeEach(() => {
  state.mailerCalls = []
  state.leadReadError = null
  state.leadRow = { email: 'prospect@acme.com', email_status: 'verified' }
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE POSITIVE CONTROL FIRST — or every refusal below proves nothing
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J20-C4 · a verified business address DOES send', () => {
  it('🛑 THE ANTI-VACUITY CASE — the mailer is reached exactly once', async () => {
    expect(await send()).toBe('sent')
    expect(state.mailerCalls, 'nothing sends in this harness, so every refusal below is vacuous')
      .toEqual(['prospect@acme.com'])
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② AND EVERY NOT-SENDABLE SHAPE IS REFUSED, AT THE SEAM
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J20-C4 · a non-sendable row never reaches the mailer', () => {
  const CASES: [string, { email?: string | null; email_status?: string | null } | null][] = [
    ['an unverified address', { email: 'prospect@acme.com', email_status: null }],
    ['a PREDICTED address — `likely_to_engage` is not a verification',
      { email: 'prospect@acme.com', email_status: 'likely_to_engage' }],
    ['a personal mailbox, however verified', { email: 'ada@gmail.com', email_status: 'verified' }],
    ['a placeholder address', { email: 'noreply@example.com', email_status: 'verified' }],
    ['no address at all', { email: null, email_status: 'verified' }],
    ['no row for this lead', null],
  ]

  for (const [what, row] of CASES) {
    it(`🛑 ${what} is DEFERRED and nothing leaves`, async () => {
      state.leadRow = row
      expect(await send()).toBe('deferred')
      expect(state.mailerCalls, `${what} was emailed`).toEqual([])
    })
  }

  it('🛑 AND A FAILED READ IS REFUSED TOO — fail closed', async () => {
    state.leadReadError = { message: 'connection reset' }
    expect(await send()).toBe('deferred')
    expect(state.mailerCalls, 'a database hiccup silently permitted a send').toEqual([])
  })

  it('a verified address whose ROW disagrees with the caller is judged by the ROW', async () => {
    // The caller's `Lead` is whatever a cron loaded minutes ago; the row is current. A stale
    // in-memory address must not be able to authorise a send the row would refuse.
    state.leadRow = { email: 'ada@gmail.com', email_status: 'verified' }
    expect(await send()).toBe('deferred')
    expect(state.mailerCalls).toEqual([])
  })
})
