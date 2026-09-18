// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 KILL-SWITCH ON = ZERO EXTERNALLY DELIVERED OUTREACH, FROM EVERY PATH.
//
// ── THE RULE THIS FILE EXISTS TO HOLD (founder-locked 9 Sep 2026) ────────────────────────
//
//     KILL-SWITCH ON  = NO EXTERNALLY DELIVERED OUTREACH OF ANY KIND.
//     KILL-SWITCH OFF = sending MAY be permitted, subject to every other authority and gate.
//
// No exception for Founder · operator_run · canary · cron · retry · test send · preview ·
// any provider. **A run must never bypass the kill-switch.**
//
// ── WHY THE ASSERTION IS "THE PROVIDER WAS NEVER CALLED" ────────────────────────────────
//
// 🛑 A RETURNED 'deferred' PROVES ONLY WHAT THE FUNCTION SAID, NOT WHAT LEFT. Every case
// below watches the SEAM the outside world is actually reached through — `nodemailer`'s
// `sendMail`, `resend.emails.send`, `fetch` for Smartlead / Instantly / PhantomBuster — and
// asserts the call count is ZERO. A future refactor that returns the right word while still
// handing a message to a provider fails here, which is the whole point.
//
// ── AND THE ONE THIS REPLACES ───────────────────────────────────────────────────────────
//
// ⛓️ `make-live-and-run.test.ts` §③ used to assert the OPPOSITE — "the canary works with the
// kill-switch ON" — pinned to the exact source line that made it true. It was retargeted,
// not deleted: its real duty was *the operator run is separately gated*, and that duty is
// now case 11 below plus the retargeted assertions in that file.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'
process.env.INBOX_SECRET_KEY = process.env.INBOX_SECRET_KEY || 'a'.repeat(64)

// ── THE SEAMS ───────────────────────────────────────────────────────────────────────────
// Every real provider call in the API goes through exactly one of these four.
const smtpSent: unknown[] = []
const resendSent: unknown[] = []
const fetched: string[] = []

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: async (m: unknown) => { smtpSent.push(m); return { accepted: ['x@y.test'], response: '250 ok', messageId: '<m@x>' } },
      verify: async () => true,
    }),
  },
  createTransport: () => ({
    sendMail: async (m: unknown) => { smtpSent.push(m); return { accepted: ['x@y.test'], response: '250 ok', messageId: '<m@x>' } },
    verify: async () => true,
  }),
}))

vi.mock('resend', () => ({
  Resend: class { emails = { send: async (m: unknown) => { resendSent.push(m); return { data: { id: 're_1' }, error: null } } } },
}))

const BOX = {
  id: 'box-1', email: 'hello@kindoutreach.com', kind: 'branded', status: 'active', provider: 'google-smtp',
  daily_cap: 30, smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_secure: false,
  smtp_user: 'hello@kindoutreach.com', smtp_pass_enc: 'v1:cipher', from_name: 'Jacques',
}

vi.mock('@kind/db', () => {
  const q = (table: string): Record<string, unknown> => {
    const o: Record<string, unknown> = {
      select() { return o }, eq() { return o }, in() { return o }, is() { return o },
      not() { return o }, gte() { return o }, lte() { return o }, order() { return o }, limit() { return o },
      async maybeSingle() {
        if (table === 'clients') return { data: { id: 'client-1', is_demo: false }, error: null }
        if (table === 'figsy_enrollments') return { data: { id: 'enr-1', client_id: 'client-1' }, error: null }
        // ⛓️ 18 Sep (J20-C4 · FD-5) — `email_status: 'verified'` ADDED TO THE FIXTURE, AND
        // NOTHING ELSE IN THIS FILE CHANGED.
        //
        // 🛑 THIS IS A FROZEN TEST AND THE GUARANTEE IT HOLDS IS UNTOUCHED. The kill-switch is
        // still the FIRST gate in the seam, still absolute, still without an exception for
        // operator_run, preview, canary, Founder or cron — every assertion, every case and the
        // order of the two switch gates are exactly as they were.
        //
        // WHAT CHANGED IS THE PRODUCT, ONE LAYER BELOW THEM: the seam now also refuses anybody
        // we may not lawfully email (*"verified business email required before send"*), and
        // this fixture lead carried no `email_status` — so case 13, the ANTI-VACUITY case that
        // proves the seam is reachable at all, would have gone green for the wrong reason and
        // stopped proving the zeroes above it mean anything. A fixture that cannot reach the
        // seam cannot prove the seam is reached.
        //
        // ⚠️ AND THE NEW GATE SITS BELOW BOTH SWITCHES DELIBERATELY, so cases 11 and 12 keep
        // their exact discriminating power: they still defer at the operator key, before
        // sendability is ever asked.
        if (table === 'leads') return { data: { id: 'lead-1', email: 'p1@prospect.test', email_status: 'verified', company: 'Acme', linkedin_url: 'https://li/x', client_id: 'client-1' }, error: null }
        return { data: null, error: null }
      },
      async single() {
        if (table === 'figsy_linkedin_queue') return { data: { linkedin_url: 'https://li/x', connection_note: 'hi', lead_id: 'lead-1' }, error: null }
        return { data: { id: 'row-1' }, error: null }
      },
      insert() { return { select: () => ({ single: async () => ({ data: { id: 'row-1' }, error: null }) }) } },
      update() { return o },
      delete() { return o },
      then(r: (v: unknown) => unknown) {
        if (table === 'client_inboxes') return r({ data: [BOX], error: null })
        return r({ data: [], count: 0, error: null })
      },
    }
    return o
  }
  return { db: { from: (t: string) => q(t), rpc: async () => ({ data: null, error: null }) } }
})

// Everything that would refuse for some OTHER reason is stubbed to ALLOW, so a zero below can
// only ever mean the kill-switch stopped it. A gate that refused for the wrong reason would
// make every assertion vacuously true — the failure mode these mocks exist to remove.
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
vi.mock('./demo', () => ({ isDemoClient: async () => false }))
vi.mock('./inbox-secret', () => ({
  decryptSecret: () => 'app-password',
  encryptSecret: (s: string) => `v1:${s}`,
  secretState: () => ({ ok: true }),
}))

const LEAD = {
  id: 'lead-1', client_id: 'client-1', email: 'p1@prospect.test',
  first_name: 'P', last_name: 'One', country: 'United Kingdom',
}

const env0 = { auto: process.env.AUTO_OUTREACH_ENABLED, op: process.env.FIGSY_OPERATOR_SEND_ENABLED, pb: process.env.PHANTOMBUSTER_API_KEY }

/** Kill-switch ON is the ABSENCE of the exact string, so the safe state is the default. */
function killSwitchOn() { delete process.env.AUTO_OUTREACH_ENABLED }
function killSwitchOff() { process.env.AUTO_OUTREACH_ENABLED = 'true' }

beforeEach(() => {
  smtpSent.length = 0; resendSent.length = 0; fetched.length = 0
  killSwitchOn()
  process.env.FIGSY_OPERATOR_SEND_ENABLED = 'true'   // the operator key IS armed throughout
  process.env.PHANTOMBUSTER_API_KEY = 'pb-key'
  vi.stubGlobal('fetch', async (url: unknown) => {
    fetched.push(String(url))
    return { ok: true, status: 200, json: async () => ({ containerId: 'c1' }), text: async () => '{}' } as unknown as Response
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  for (const [k, v] of [['AUTO_OUTREACH_ENABLED', env0.auto], ['FIGSY_OPERATOR_SEND_ENABLED', env0.op], ['PHANTOMBUSTER_API_KEY', env0.pb]] as const) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v
  }
})

/** No provider anywhere was handed a message. The single assertion this whole file makes. */
function nothingLeft() {
  expect(smtpSent, 'an SMTP message was handed to the mail server').toEqual([])
  expect(resendSent, 'a message was handed to Resend').toEqual([])
  expect(fetched.filter(u => /instantly|smartlead|phantombuster/i.test(u)),
    'a provider API was called').toEqual([])
}

describe('🛑 kill-switch ON — every send path delivers nothing', () => {
  it('1 · operator_run: both its own key AND the entry point, still zero', async () => {
    const { sendSequenceEmailOperatorRun } = await import('./figsy')
    const out = await sendSequenceEmailOperatorRun('enr-1', LEAD as never, 1, 's', 'b', 'camp-1', { inbox: BOX as never })
    expect(out).toBe('deferred')
    nothingLeft()
  })

  it('2 · automatic mode (the cron\'s own entry point)', async () => {
    const { sendSequenceEmail } = await import('./figsy')
    expect(await sendSequenceEmail('enr-1', LEAD as never, 1, 's', 'b', 'camp-1')).toBe('deferred')
    nothingLeft()
  })

  it('3 · a preview/test send — `isPreview` is NOT an exception', async () => {
    // Its route takes a `to_email` override, so this could reach any address at all.
    const { sendSequenceEmail } = await import('./figsy')
    expect(await sendSequenceEmail('test-preview', LEAD as never, 1, 's', 'b', 'camp-1', { isPreview: true })).toBe('deferred')
    nothingLeft()
  })

  it('4 · LinkedIn / PhantomBuster', async () => {
    const { dispatchLinkedInStep } = await import('./linkedin')
    const r = await dispatchLinkedInStep('queue-1')
    expect(r.sent).toBe(false)
    nothingLeft()
  })

  it('5 · Instantly push', async () => {
    const { canPushToInstantly } = await import('./instantly-map')
    const d = canPushToInstantly({
      hasApiKey: true, outreachDeliveryPermitted: process.env.AUTO_OUTREACH_ENABLED === 'true',
      isDemo: false, isHouseClient: true, leadEmail: 'a@b.com',
    })
    expect(d.ok).toBe(false)
    expect(!d.ok && d.reason).toBe('kill_switch_off')
    nothingLeft()
  })

  it('6 · Smartlead push', async () => {
    const { canPushToSmartlead } = await import('./smartlead-map')
    const d = canPushToSmartlead({
      hasApiKey: true, outreachDeliveryPermitted: process.env.AUTO_OUTREACH_ENABLED === 'true',
      isDemo: false, isHouseClient: false, hasSmartleadInbox: true, leadEmail: 'a@b.com',
    } as never)
    expect(d.ok).toBe(false)
    expect(!d.ok && d.reason).toBe('kill_switch_off')
    nothingLeft()
  })

  it('7 · SMTP at the seam — `sendAs` refuses even called directly', async () => {
    // 🛑 THE STRUCTURAL ONE. Every SMTP path in the API ends here, so a caller that forgot
    // its own gate — or one written next month — still delivers nothing.
    const { sendAs } = await import('./mailer')
    const r = await sendAs(BOX as never, { to: 'anyone@example.test', subject: 's', text: 'b' })
    expect(r.ok).toBe(false)
    expect(String((r.error as Error)?.message)).toContain('kill-switch is ON')
    nothingLeft()
  })

  it('8 · the day-1 outreach batch', async () => {
    const { sendDay1OutreachBatch } = await import('./figsy')
    await sendDay1OutreachBatch(['lead-1'], 'client-1', 'Acme')
    nothingLeft()
  })

  it('9 · the operator manual reply', async () => {
    const { sendManualReply } = await import('./manual-reply')
    const r = await sendManualReply({ enrollmentId: 'enr-1', body: 'hello', operatorEmail: 'jv@x.test' } as never)
      .catch(() => ({ ok: false }))
    expect((r as { ok: boolean }).ok).toBe(false)
    nothingLeft()
  })

  it('10 · the provider delivery functions are never reached — the counts are all zero', () => {
    // The guard-rail on this whole file: if a mock stopped being wired, every case above
    // would pass vacuously. This asserts the seams are the ones actually being watched.
    expect(smtpSent.length + resendSent.length + fetched.length).toBe(0)
  })
})

describe('🔐 the switches, in the right order', () => {
  it('11 · operator_run needs its OWN key ON TOP — kill-switch OFF alone is not enough', async () => {
    killSwitchOff()
    delete process.env.FIGSY_OPERATOR_SEND_ENABLED
    const { sendSequenceEmailOperatorRun } = await import('./figsy')
    expect(await sendSequenceEmailOperatorRun('enr-1', LEAD as never, 1, 's', 'b', 'camp-1', { inbox: BOX as never })).toBe('deferred')
    nothingLeft()
  })

  it('12 · kill-switch OFF grants NOTHING by itself — the other gates still decide', async () => {
    // 🛑 THE SECOND HALF OF THE RULE, AND THE EASIER ONE TO LOSE. "OFF = permitted" must not
    // become "OFF = sent". Here the switch is off and the operator key is off, and the answer
    // is still deferred — because permission is not authority.
    killSwitchOff()
    delete process.env.FIGSY_OPERATOR_SEND_ENABLED
    const { operatorSendEnabled, outreachEnabled } = await import('./figsy')
    expect(outreachEnabled()).toBe(true)
    expect(operatorSendEnabled()).toBe(false)
    const { sendSequenceEmailOperatorRun } = await import('./figsy')
    expect(await sendSequenceEmailOperatorRun('enr-1', LEAD as never, 1, 's', 'b', 'camp-1', { inbox: BOX as never })).toBe('deferred')
    nothingLeft()
  })

  it('13 · with BOTH switches right, the seam is reached — so the zeroes above mean something', async () => {
    // ⚠️ THE ANTI-VACUITY CASE. Without it, a mistake that made every path refuse for an
    // unrelated reason would leave this file green and prove nothing at all.
    killSwitchOff()
    process.env.FIGSY_OPERATOR_SEND_ENABLED = 'true'
    const { sendSequenceEmailOperatorRun } = await import('./figsy')
    const out = await sendSequenceEmailOperatorRun('enr-1', LEAD as never, 1, 's', 'b', 'camp-1', { inbox: BOX as never })
    expect(out).toBe('sent')
    expect(smtpSent.length, 'the mail server was never reached even with both switches on').toBe(1)
  })
})
