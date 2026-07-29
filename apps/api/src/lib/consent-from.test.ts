import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// #547 — WHICH OF OUR DOMAINS THE CONSENT REQUEST LEAVES FROM.
//
// PR #1211 settled that the consent email stays OURS rather than going out from the client's
// own mailbox, and that part is correct and untouched: it is genuinely our mail, the audit
// trail belongs to us, its links resolve on our domain, and it fires BEFORE consent exists —
// putting pre-consent mail on a client's freshly-warmed branded mailbox is exactly what
// un-warms it.
//
// What #1211 left open was which of OUR domains. It sent from the TRANSACTIONAL identity
// (hello@get-kind.com), while D4 in lib/deliverability.ts states plainly that cold-adjacent
// mail must never poison that domain — because that domain also carries every invoice,
// password reset and seat invite a paying client needs to actually receive.
//
// A POPIA consent request IS cold-adjacent. It goes to a stranger who has never heard of us,
// and other than consenting the only thing they can do is mark it spam. So the complaint now
// lands on the domain built to absorb cold complaints. This file pins that split: consent on
// the cold identity, everything else in email.ts still on the transactional one.

const sent: { from: string; to: unknown; subject: string }[] = []

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: { from: string; to: unknown; subject: string }) => {
        sent.push(payload)
        return { data: { id: 'msg-1' }, error: null }
      },
    }
  },
}))
vi.mock('./demo', () => ({ isDemoClient: async () => false }))
vi.mock('@kind/db', () => ({ db: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) } }))

const TRANSACTIONAL = 'K.I.N.D <hello@get-kind.com>'
const COLD = 'K.I.N.D Outreach <hello@kind-reach.com>'

/**
 * email.ts reads FIGSY_COLD_FROM through deliverability.ts at MODULE LOAD, so the env has to
 * be set before the import and the registry reset between cases. Importing fresh per test is
 * the only way to exercise both the configured and unset branches in one file.
 */
async function loadEmail(coldFrom: string | undefined) {
  vi.resetModules()
  if (coldFrom === undefined) delete process.env.FIGSY_COLD_FROM
  else process.env.FIGSY_COLD_FROM = coldFrom
  return import('./email')
}

const ORIGINAL_COLD = process.env.FIGSY_COLD_FROM
const ORIGINAL_KEY = process.env.RESEND_API_KEY

beforeEach(() => {
  sent.length = 0
  process.env.RESEND_API_KEY = 'test-key'   // without a key every send is a no-op
})

afterEach(() => {
  if (ORIGINAL_COLD === undefined) delete process.env.FIGSY_COLD_FROM
  else process.env.FIGSY_COLD_FROM = ORIGINAL_COLD
  if (ORIGINAL_KEY === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = ORIGINAL_KEY
})

const consent = (m: Awaited<ReturnType<typeof loadEmail>>) =>
  m.sendConsentEmail('stranger@acme.com', 'Thandi', 'Rivo', 'https://app.get-kind.com/opt-out/tok')

describe('the consent request leaves from the COLD domain', () => {
  it('uses FIGSY_COLD_FROM, not the transactional identity', async () => {
    const mod = await loadEmail(COLD)
    await consent(mod)
    expect(sent).toHaveLength(1)
    expect(sent[0].from).toBe(COLD)
    expect(sent[0].from).not.toBe(TRANSACTIONAL)
  })

  it('still identifies K.I.N.D as the sender in the body — only the domain moved', async () => {
    // #1211's decision is that this is OUR mail, sent on the client's behalf. Moving the
    // FROM must not turn it into mail from the client, or the footer becomes a lie and the
    // consent record gets weaker rather than stronger.
    const mod = await loadEmail(COLD)
    await consent(mod)
    const html = (sent[0] as unknown as { html: string }).html
    expect(html).toContain('on behalf of Rivo via K.I.N.D')
  })
})

describe('transactional mail did NOT move', () => {
  it('the welcome email still uses the transactional identity', async () => {
    const mod = await loadEmail(COLD)
    await mod.sendWelcomeEmail('client@acme.com', 'Acme')
    expect(sent).toHaveLength(1)
    expect(sent[0].from).toBe(TRANSACTIONAL)
  })

  it('a consent send and a welcome send in the same process use DIFFERENT domains', async () => {
    // The whole point of the split, asserted as one fact rather than two separate ones.
    const mod = await loadEmail(COLD)
    await consent(mod)
    await mod.sendWelcomeEmail('client@acme.com', 'Acme')
    expect(sent.map(s => s.from)).toEqual([COLD, TRANSACTIONAL])
  })
})

describe('FIGSY_COLD_FROM unset — it degrades, it does not fail closed', () => {
  it('STILL SENDS, from the transactional identity', async () => {
    // Refusing here would block consent collection for every client on an unconfigured
    // environment. A reputation risk is worth managing; not collecting consent at all is not
    // a trade — it stops the product working.
    const mod = await loadEmail(undefined)
    await consent(mod)
    expect(sent).toHaveLength(1)
    expect(sent[0].from).toBe(TRANSACTIONAL)
  })

  it('WARNS, and the warning names CONSENT specifically', async () => {
    // deliverability.ts already warns at startup, but it says "cold outreach" — an operator
    // reading that line would not know this path was affected too.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mod = await loadEmail(undefined)
    await consent(mod)
    const text = warn.mock.calls.map(c => c.join(' ')).join(' ')
    expect(text).toContain('CONSENT')
    expect(text).toContain('FIGSY_COLD_FROM')
    warn.mockRestore()
  })

  it('the warning says what is actually at risk — invoices and password resets', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mod = await loadEmail(undefined)
    await consent(mod)
    const text = warn.mock.calls.map(c => c.join(' ')).join(' ')
    expect(text).toContain('invoices')
    expect(text).toContain('password resets')
    warn.mockRestore()
  })

  it('warns ONCE per process, not on every consent send', async () => {
    // These fire in a loop at sourcing time — one per lead. A per-send warning would bury
    // every other line in the log and train the operator to scroll past it.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mod = await loadEmail(undefined)
    await consent(mod); await consent(mod); await consent(mod)
    const consentWarnings = warn.mock.calls.filter(c => c.join(' ').includes('CONSENT emails are sending'))
    expect(consentWarnings).toHaveLength(1)
    expect(sent).toHaveLength(3)   // all three still went
    warn.mockRestore()
  })

  it('does NOT warn when the cold domain IS configured', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mod = await loadEmail(COLD)
    await consent(mod)
    const text = warn.mock.calls.map(c => c.join(' ')).join(' ')
    expect(text).not.toContain('CONSENT emails are sending')
    warn.mockRestore()
  })
})
