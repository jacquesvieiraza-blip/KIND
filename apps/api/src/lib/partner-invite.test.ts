import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── THE ONE PATH THAT WORKS (16 Aug) ────────────────────────────────────────────────────
//
// The founder tested it himself and reported: "i created a seat. recieved the email clicked
// reset password and was in. simple."
//
// Two other mechanisms were tried that evening and both failed where he could see:
//   • Resend from partners@get-kind.com — the screen said "Invited", no email ever arrived
//   • Supabase inviteUserByEmail — the email arrived and its link bounced him to sign-in with
//     "confirmation failed", because an admin-generated invite returns its session in a URL
//     FRAGMENT and /auth/callback can only read a `?code=` query parameter
//
// So there is one path now, and these tests exist to stop a second one growing back.

const createUser = vi.fn()
const resetPasswordForEmail = vi.fn()
const generateLink = vi.fn()

vi.mock('@kind/db', () => ({
  db: {
    auth: {
      admin: { createUser: (...a: unknown[]) => createUser(...a), generateLink: (...a: unknown[]) => generateLink(...a) },
      resetPasswordForEmail: (...a: unknown[]) => resetPasswordForEmail(...a),
    },
  },
}))

const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

describe('the account exists BEFORE the email is sent', () => {
  beforeEach(() => {
    createUser.mockReset(); resetPasswordForEmail.mockReset(); generateLink.mockReset()
    createUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    resetPasswordForEmail.mockResolvedValue({ error: null })
    generateLink.mockResolvedValue({ data: { properties: { action_link: 'https://x.supabase.co/auth/v1/verify?token=abc' } } })
    process.env.PORTAL_URL = 'https://app.get-kind.com'
  })

  it('creates the account, THEN sends — the order is the whole point', async () => {
    // ⚠️ Supabase's password email does NOT error for an unknown address; it silently sends
    // nothing, so nobody can probe which emails are registered. Send first and a brand-new
    // partner gets no email AND no error — the exact shape of failure that cost an evening.
    const { invitePartner } = await import('./partner-invite')
    const r = await invitePartner({ email: 'her@example.com', packPath: '/partner-onboarding?token=t1' })
    expect(createUser).toHaveBeenCalledOnce()
    expect(resetPasswordForEmail).toHaveBeenCalledOnce()
    expect(createUser.mock.invocationCallOrder[0]).toBeLessThan(resetPasswordForEmail.mock.invocationCallOrder[0])
    expect(r.sent).toBe(true)
    expect(r.userId).toBe('u1')
  })

  it('an account that ALREADY exists is not a failure — the email still goes', async () => {
    createUser.mockResolvedValue({ data: null, error: { message: 'already been registered' } })
    const { invitePartner } = await import('./partner-invite')
    const r = await invitePartner({ email: 'her@example.com', packPath: '/p?token=t' })
    expect(resetPasswordForEmail).toHaveBeenCalledOnce()
    expect(r.sent).toBe(true)
    expect(r.userId).toBeNull()
  })

  it('and it lands her through the callback, which is the redirect he actually walked', async () => {
    const { invitePartner } = await import('./partner-invite')
    await invitePartner({ email: 'her@example.com', packPath: '/partner-onboarding?token=t1' })
    const [, opts] = resetPasswordForEmail.mock.calls[0] ?? []
    expect((opts as { redirectTo?: string })?.redirectTo).toContain('/auth/callback?next=')
    expect((opts as { redirectTo?: string })?.redirectTo).toContain('partner-onboarding')
  })
})

describe('a failure is reported, never dressed as success', () => {
  beforeEach(() => {
    createUser.mockReset(); resetPasswordForEmail.mockReset(); generateLink.mockReset()
    createUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    generateLink.mockResolvedValue({ data: { properties: { action_link: 'https://x.supabase.co/auth/v1/verify?token=abc' } } })
  })

  it('a REFUSED email returns sent:false and the reason', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: { message: 'rate limit exceeded' } })
    const { invitePartner } = await import('./partner-invite')
    const r = await invitePartner({ email: 'a@b.com', packPath: '/p?token=t' })
    expect(r.sent).toBe(false)
    expect(r.error).toContain('rate limit')
  })

  it('a THROWN error is caught and reported, not swallowed', async () => {
    resetPasswordForEmail.mockRejectedValue(new Error('network down'))
    const { invitePartner } = await import('./partner-invite')
    const r = await invitePartner({ email: 'a@b.com', packPath: '/p?token=t' })
    expect(r.sent).toBe(false)
    expect(r.error).toContain('network down')
  })
})

describe('there is always a link, even when no email goes out', () => {
  beforeEach(() => {
    createUser.mockReset(); resetPasswordForEmail.mockReset(); generateLink.mockReset()
    createUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  })

  it('a link comes back even when the send FAILED — that is the point of it', async () => {
    // Without this, an undeliverable address is a seat nobody can ever occupy: she cannot
    // reach the "send me a fresh link" screen without a link.
    resetPasswordForEmail.mockResolvedValue({ error: { message: 'nope' } })
    generateLink.mockResolvedValue({ data: { properties: { action_link: 'https://x.supabase.co/auth/v1/verify?token=zzz' } } })
    const { invitePartner } = await import('./partner-invite')
    const r = await invitePartner({ email: 'a@b.com', packPath: '/p?token=t' })
    expect(r.sent).toBe(false)
    expect(r.inviteUrl).toContain('/auth/v1/verify')
  })

  it('and if even the link cannot be made, the plain page URL comes back rather than nothing', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null })
    generateLink.mockRejectedValue(new Error('no'))
    const { invitePartner } = await import('./partner-invite')
    expect((await invitePartner({ email: 'a@b.com', packPath: '/p?token=t' })).inviteUrl).toContain('/p?token=t')
  })
})

describe('ONE mechanism — no second path may grow back', () => {
  const raw = read('apps/api/src/lib/partner-invite.ts')
  // ⚠️ EXECUTABLE LINES ONLY. The file explains, in comments, which mechanisms were tried and
  // why they failed — and a check that forbids you from describing what you fixed is a bad
  // check. This is the third time today a pin matched its own explanatory comment.
  const src = raw.split('\n').filter(l => {
    const t = l.trim()
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
  }).join('\n')

  it('no invite-type link: it arrives in a URL fragment the callback cannot read', () => {
    expect(src).not.toContain('inviteUserByEmail')
    expect(src).not.toMatch(/type:\s*'invite'/)
  })

  it('no Resend anywhere near it', () => {
    expect(src).not.toMatch(/from 'resend'|PARTNERS_FROM|emails\.send/)
  })

  it('and both doors — new seat and resend — go through this one function', () => {
    const operator = read('apps/api/src/routes/operator.ts')
    const routes = read('apps/api/src/routes/partners.ts')
    const seatRoute = operator.slice(operator.indexOf("operatorRouter.post('/seats/client-partner'"), operator.indexOf("operatorRouter.post('/seats/client-partner'") + 9000)
    expect(seatRoute).toContain('invitePartner(')
    expect(seatRoute).not.toContain('sendPartnerInvite(')
    const resendRoute = routes.slice(routes.indexOf("partnersRouter.post('/admin/:partnerId/resend-invite'"), routes.indexOf("partnersRouter.post('/admin/:partnerId/resend-invite'") + 3000)
    expect(resendRoute).toContain('invitePartner(')
  })

  it('the operator still gets the reason and the link', () => {
    const operator = read('apps/api/src/routes/operator.ts')
    const seatRoute = operator.slice(operator.indexOf("operatorRouter.post('/seats/client-partner'"), operator.indexOf("operatorRouter.post('/seats/client-partner'") + 9000)
    expect(seatRoute).toContain('invite_error: inviteError')
    expect(seatRoute).toContain('invite_url: inviteUrl')
  })
})
