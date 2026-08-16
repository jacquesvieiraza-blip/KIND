import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── THE INVITATION GOES THROUGH THE MAILER THAT ACTUALLY DELIVERS (16 Aug) ──────────────
//
// The founder created three seats across the evening and received no invitation for any of
// them, while the screen said "Invited" each time.
//
// What the code showed, with lines:
//   • every email he DID receive came from Supabase — `resetPasswordForEmail`
//     (apps/portal/src/app/(auth)/login/page.tsx:166) sends, and it reached him every time
//   • `generateLink` does not send anything at all; it returns a URL
//   • so the invite path contained exactly one email: a Resend send from
//     `partners@get-kind.com`, an address used by nothing but a partner programme that has
//     never been run
//
// The invitation now goes through Supabase. These tests exist so it cannot quietly go back,
// and so the failure branches are exercised rather than assumed.

const inviteUserByEmail = vi.fn()
const resetPasswordForEmail = vi.fn()
const generateLink = vi.fn()

vi.mock('@kind/db', () => ({
  db: {
    auth: {
      admin: { inviteUserByEmail: (...a: unknown[]) => inviteUserByEmail(...a), generateLink: (...a: unknown[]) => generateLink(...a) },
      resetPasswordForEmail: (...a: unknown[]) => resetPasswordForEmail(...a),
    },
  },
}))

const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

describe('a first invitation is sent by Supabase, and creates the account', () => {
  beforeEach(() => {
    inviteUserByEmail.mockReset(); resetPasswordForEmail.mockReset(); generateLink.mockReset()
    generateLink.mockResolvedValue({ data: { properties: { action_link: 'https://x.supabase.co/auth/v1/verify?token=abc' } } })
    process.env.PORTAL_URL = 'https://app.get-kind.com'
  })

  it('calls inviteUserByEmail — the one call that creates the account AND sends', async () => {
    inviteUserByEmail.mockResolvedValue({ error: null })
    const { invitePartner } = await import('./partner-invite')
    const r = await invitePartner({ email: 'her@example.com', packPath: '/partner-onboarding?token=t1' })
    expect(inviteUserByEmail).toHaveBeenCalledOnce()
    expect(r.sent).toBe(true)
    expect(r.existingAccount).toBe(false)
  })

  it('and lands her through the callback, not straight on the page', async () => {
    // Straight to the page means arriving with no session — the bug that made the first
    // version of this flow dead on arrival at step one. Self-contained: reading a call the
    // PREVIOUS test made is a test that passes for the wrong reason (beforeEach clears them).
    inviteUserByEmail.mockResolvedValue({ error: null })
    const { invitePartner } = await import('./partner-invite')
    await invitePartner({ email: 'her@example.com', packPath: '/partner-onboarding?token=t1' })
    const [, opts] = inviteUserByEmail.mock.calls[0] ?? []
    expect((opts as { redirectTo?: string })?.redirectTo).toContain('/auth/callback?next=')
    expect((opts as { redirectTo?: string })?.redirectTo).toContain('partner-onboarding')
  })

  it('a REFUSED invitation is reported with its reason, never as success', async () => {
    inviteUserByEmail.mockResolvedValue({ error: { message: 'SMTP provider not configured' } })
    const { invitePartner } = await import('./partner-invite')
    const r = await invitePartner({ email: 'her@example.com', packPath: '/p?token=t' })
    expect(r.sent).toBe(false)
    expect(r.error).toContain('SMTP')
  })

  it('a THROWN error is reported too, not swallowed', async () => {
    inviteUserByEmail.mockRejectedValue(new Error('network down'))
    const { invitePartner } = await import('./partner-invite')
    const r = await invitePartner({ email: 'her@example.com', packPath: '/p?token=t' })
    expect(r.sent).toBe(false)
    expect(r.error).toContain('network down')
  })
})

describe('an address that already has an account is not a failure', () => {
  beforeEach(() => {
    inviteUserByEmail.mockReset(); resetPasswordForEmail.mockReset(); generateLink.mockReset()
    generateLink.mockResolvedValue({ data: { properties: { action_link: 'https://x.supabase.co/auth/v1/verify?token=abc' } } })
  })

  it('falls back to the reset email — the exact call that has been delivering', async () => {
    inviteUserByEmail.mockResolvedValue({ error: { message: 'A user with this email address has already been registered' } })
    resetPasswordForEmail.mockResolvedValue({ error: null })
    const { invitePartner } = await import('./partner-invite')
    const r = await invitePartner({ email: 'her@example.com', packPath: '/p?token=t' })
    expect(resetPasswordForEmail).toHaveBeenCalledOnce()
    expect(r.sent).toBe(true)
    expect(r.existingAccount).toBe(true)
    expect(r.error).toBeUndefined()
  })

  it('and if THAT fails too, it says so — no silent success anywhere on this path', async () => {
    inviteUserByEmail.mockResolvedValue({ error: { message: 'already registered' } })
    resetPasswordForEmail.mockResolvedValue({ error: { message: 'rate limited' } })
    const { invitePartner } = await import('./partner-invite')
    const r = await invitePartner({ email: 'her@example.com', packPath: '/p?token=t' })
    expect(r.sent).toBe(false)
    expect(r.error).toContain('rate limited')
  })
})

describe('there is always a link, even when no email goes out', () => {
  beforeEach(() => {
    inviteUserByEmail.mockReset(); resetPasswordForEmail.mockReset(); generateLink.mockReset()
  })

  it('a working link comes back with a successful invite', async () => {
    inviteUserByEmail.mockResolvedValue({ error: null })
    generateLink.mockResolvedValue({ data: { properties: { action_link: 'https://x.supabase.co/auth/v1/verify?token=abc' } } })
    const { invitePartner } = await import('./partner-invite')
    expect((await invitePartner({ email: 'a@b.com', packPath: '/p?token=t' })).inviteUrl).toContain('/auth/v1/verify')
  })

  it('and a link comes back even when the send FAILED — that is the point of it', async () => {
    // Without this, an undeliverable address is a seat nobody can ever occupy: she cannot
    // reach the "send me a fresh link" screen without a link.
    inviteUserByEmail.mockResolvedValue({ error: { message: 'nope' } })
    generateLink.mockResolvedValue({ data: { properties: { action_link: 'https://x.supabase.co/auth/v1/verify?token=zzz' } } })
    const { invitePartner } = await import('./partner-invite')
    const r = await invitePartner({ email: 'a@b.com', packPath: '/p?token=t' })
    expect(r.sent).toBe(false)
    expect(r.inviteUrl).toContain('/auth/v1/verify')
  })

  it('and if even the link cannot be made, the plain page URL comes back rather than nothing', async () => {
    inviteUserByEmail.mockResolvedValue({ error: null })
    generateLink.mockRejectedValue(new Error('no'))
    const { invitePartner } = await import('./partner-invite')
    expect((await invitePartner({ email: 'a@b.com', packPath: '/p?token=t' })).inviteUrl).toContain('/p?token=t')
  })
})

describe('Resend is out of the invite path', () => {
  it('neither seat creation nor resend calls the Resend sender any more', () => {
    const operator = read('apps/api/src/routes/operator.ts')
    const routes = read('apps/api/src/routes/partners.ts')
    const seatRoute = operator.slice(operator.indexOf("operatorRouter.post('/seats/client-partner'"), operator.indexOf("operatorRouter.post('/seats/client-partner'") + 9000)
    expect(seatRoute).toContain('invitePartner(')
    expect(seatRoute).not.toContain('sendPartnerInvite(')

    const resendRoute = routes.slice(routes.indexOf("partnersRouter.post('/admin/:partnerId/resend-invite'"), routes.indexOf("partnersRouter.post('/admin/:partnerId/resend-invite'") + 3000)
    expect(resendRoute).toContain('invitePartner(')
    expect(resendRoute).not.toContain('sendPartnerInvite(')
  })

  it('and the invite module itself imports no mail provider at all', () => {
    const src = read('apps/api/src/lib/partner-invite.ts')
    expect(src).not.toMatch(/from 'resend'|PARTNERS_FROM|emails\.send/)
  })

  it('the seat still reports the reason and the link to the operator', () => {
    const operator = read('apps/api/src/routes/operator.ts')
    const seatRoute = operator.slice(operator.indexOf("operatorRouter.post('/seats/client-partner'"), operator.indexOf("operatorRouter.post('/seats/client-partner'") + 9000)
    expect(seatRoute).toContain('invite_error: inviteError')
    expect(seatRoute).toContain('invite_url: inviteUrl')
  })
})
