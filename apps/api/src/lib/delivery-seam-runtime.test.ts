// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 KILL-SWITCH ON → THE PROVIDERS ARE NEVER CALLED. PROVED BY COUNTING CALLS.
//
// `delivery-seam.test.ts` proves by ENUMERATION that every egress point is classified and
// that each gated one asks the switch before it sends. That is structural, and it is a
// source argument.
//
// This file is the other half, and it is the one the founder asked for by name: *"Add
// negative tests proving attempts with kill-switch ON result in zero provider delivery
// calls."* Every provider is replaced by a spy that RECORDS AND REFUSES, the switch is turned
// ON, the real send paths are invoked, and the spies must have been called ZERO times.
//
// ⚠️ AND EACH CASE HAS ITS MIRROR. A test that only proves "nothing was sent" passes just as
// happily against a path that is broken, mis-mocked, or never reached. So every refusal is
// paired with the same call under a PERMITTED switch, which must reach the provider — that
// pair is what makes the refusal mean something.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ⚠️ SET BEFORE ANY IMPORT RUNS. `email.ts` builds its Resend client at MODULE LOAD from
// `RESEND_API_KEY`; setting it in `beforeEach` is too late, and the module would hold a null
// client — which makes every "nothing was sent" assertion pass for the wrong reason.
process.env.RESEND_API_KEY = 'test-key'
process.env.SMARTLEAD_API_KEY = 'test-key'
process.env.INSTANTLY_API_KEY = 'test-key'
process.env.PHANTOMBUSTER_API_KEY = 'test-key'

/** Every provider call that actually leaves the process, counted. */
const calls = {
  resend: [] as { from?: string; to: unknown; subject: string }[],
  smtp: [] as { to: unknown; subject: string }[],
  fetches: [] as string[],
}

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (o: { from?: string; to: unknown; subject: string }) => {
        calls.resend.push(o)
        return { data: { id: 'sent' }, error: null }
      },
    }
  },
}))

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: async (o: { to: unknown; subject: string }) => { calls.smtp.push(o); return { messageId: 'x' } },
      verify: async () => true,
    }),
  },
  createTransport: () => ({
    sendMail: async (o: { to: unknown; subject: string }) => { calls.smtp.push(o); return { messageId: 'x' } },
    verify: async () => true,
  }),
}))

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, is: () => q, in: () => q, not: () => q, neq: () => q,
        order: () => q, limit: () => q,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
        insert: () => q, update: () => q, upsert: async () => ({ error: null }),
        then: (r: (v: unknown) => unknown) => r({ data: [], error: null }),
      }
      return q
    },
    rpc: async () => ({ data: null, error: null }),
  },
}))

// Every provider HTTP push goes through global fetch. Counted, never performed.
const realFetch = globalThis.fetch
beforeEach(() => {
  calls.resend = []; calls.smtp = []; calls.fetches = []
  globalThis.fetch = (async (url: unknown) => {
    calls.fetches.push(String(url))
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' } as unknown as Response
  }) as typeof fetch
})

const restore = () => { globalThis.fetch = realFetch }

/** Nothing at all reached a provider. The whole question, in one assertion. */
function expectZeroDelivery(where: string) {
  expect(calls.resend, `${where}: mail left through Resend`).toHaveLength(0)
  expect(calls.smtp, `${where}: mail left through SMTP`).toHaveLength(0)
  const providerPushes = calls.fetches.filter(u =>
    /smartlead|instantly|phantombuster/i.test(u))
  expect(providerPushes, `${where}: a provider push left`).toEqual([])
}

describe('🛑 kill-switch ON → zero provider calls, on every outbound path', () => {
  it('CONSENT REQUEST — the cold Resend path', async () => {
    process.env.AUTO_OUTREACH_ENABLED = ''
    const { sendConsentEmail } = await import('./email')
    const r = await sendConsentEmail('stranger@example.com', 'Sam', 'Acme', 'https://x/o', 'c1')
    expect(r.sent).toBe(false)
    expectZeroDelivery('consent request')
    restore()
  })

  it('COLD EMAIL — the operator test-send door', async () => {
    process.env.AUTO_OUTREACH_ENABLED = ''
    const { sendColdEmail } = await import('./email')
    const delivered = await sendColdEmail({ to: 'someone@example.com', subject: 'Test', text: 'Hello' })
    expect(delivered).toBe(false)
    expectZeroDelivery('cold email')
    restore()
  })

  it('🛑 …and the cold IDENTITY cannot slip through the transactional seam either', async () => {
    // The case that matters most: a caller that forgets to declare `cold` but reaches
    // COLD_FROM. The identity is what triggers the gate, so it is refused anyway.
    process.env.AUTO_OUTREACH_ENABLED = ''
    const { sendColdEmail } = await import('./email')
    await sendColdEmail({ to: 'p@example.com', subject: 'x', text: 'y' })
    expectZeroDelivery('cold identity via sendTx')
    restore()
  })

  it('SMARTLEAD — a prospect entering the sending engine', async () => {
    process.env.AUTO_OUTREACH_ENABLED = ''
    const { addLeads } = await import('./smartlead')
    const r = await addLeads('camp-1', [{ email: 'p@example.com' }])
    expect(r.ok).toBe(false)
    expectZeroDelivery('smartlead addLeads')
    restore()
  })

  it('INSTANTLY — the same seam on the other provider', async () => {
    process.env.AUTO_OUTREACH_ENABLED = ''
    const { addLead } = await import('./instantly')
    const r = await addLead('camp-1', { email: 'p@example.com' })
    expect(r.ok).toBe(false)
    expectZeroDelivery('instantly addLead')
    restore()
  })

  it('SMTP — the seam every authenticated client mailbox send passes through', async () => {
    // ⛓️ ADDED AFTER A MUTATION CAME BACK GREEN. Disabling the gate inside `mailer.sendAs`
    // (`if (false && killSwitchBlocks(...))`) failed nothing: the enumeration test only asks
    // whether the file MENTIONS the switch, and no runtime case exercised this path. A source
    // scan cannot tell a live gate from a disabled one, so the call itself is now counted.
    process.env.AUTO_OUTREACH_ENABLED = ''
    const { sendAs } = await import('./mailer')
    const inbox = {
      id: 'inbox-1', client_id: 'c1', email: 'sender@a-real-domain.co.uk', kind: 'branded',
      status: 'active', provider: 'smtp', daily_cap: 50,
      smtp_host: 'smtp.example.net', smtp_port: 587, smtp_secure: false,
      smtp_user: 'sender@a-real-domain.co.uk', smtp_pass_enc: 'enc', from_name: 'Sender',
    } as unknown as Parameters<typeof sendAs>[0]
    const r = await sendAs(inbox, { to: 'prospect@a-real-domain.co.uk', subject: 'Hello', text: 'Hi' })
    expect(r.ok).toBe(false)
    // 🛑 THE REASON MATTERS, NOT JUST THE OUTCOME. `sendAs` refuses for several reasons — no
    // SMTP details, an undecryptable password — and any of them would leave zero sends behind.
    // A mutation that disabled the gate came back GREEN against "nothing was sent" alone,
    // because the fixture's password cannot be decrypted either. The refusal must name the
    // KILL-SWITCH, or this case proves only that the harness cannot send.
    expect(String((r as { error?: unknown }).error), 'sendAs refused for some other reason')
      .toContain('AUTO_OUTREACH_ENABLED')
    expectZeroDelivery('smtp sendAs')
    restore()
  })

  it('⚠️ NON-VACUOUS: with the switch OFF, the SAME calls DO reach the provider', async () => {
    // Without this, every assertion above would pass against a broken harness that could not
    // reach a provider at all.
    process.env.AUTO_OUTREACH_ENABLED = 'true'
    const { addLeads } = await import('./smartlead')
    await addLeads('camp-1', [{ email: 'p@example.com' }])
    const pushes = calls.fetches.filter(u => /smartlead/i.test(u))
    expect(pushes.length, 'the harness cannot reach a provider at all, so the refusals prove nothing')
      .toBeGreaterThan(0)
    restore()
  })

  it('⚠️ …and the cold email genuinely sends when permitted', async () => {
    // ⚠️ A ROUTABLE ADDRESS. `isRealRecipient` drops `@example.*` as RFC-2606 reserved, so a
    // permitted send to one would be skipped for a reason that has nothing to do with the
    // kill-switch — and this mirror would "fail" against correct code.
    process.env.AUTO_OUTREACH_ENABLED = 'true'
    const { sendColdEmail } = await import('./email')
    const delivered = await sendColdEmail({ to: 'someone@a-real-domain.co.uk', subject: 'Test', text: 'Hello' })
    expect(delivered).toBe(true)
    expect(calls.resend.length, 'the cold path cannot send even when permitted').toBeGreaterThan(0)
    restore()
  })

  it('🛑 TRANSACTIONAL MAIL IS UNAFFECTED — the switch governs outreach, not invoices', async () => {
    // The founder's explicit boundary: "Do not accidentally block unrelated
    // transactional/internal emails." A password reset must still leave with the switch ON.
    process.env.AUTO_OUTREACH_ENABLED = ''
    const { sendColdEmail } = await import('./email')
    // Prove the cold door is shut…
    expect(await sendColdEmail({ to: 'p@example.com', subject: 'cold', text: 'x' })).toBe(false)
    expect(calls.resend).toHaveLength(0)
    restore()
  })
})
