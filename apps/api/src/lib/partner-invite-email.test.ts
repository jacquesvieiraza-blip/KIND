import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── THE SILENT EMAIL FAILURE (16 Aug) ───────────────────────────────────────────────────
//
// The founder created a Client Partner seat. Vida said "Invited — referral code jacque7mx2".
// No email existed anywhere.
//
// Cause: this module called `await resend.emails.send(...)` and then `return true`. Resend
// does NOT throw when it rejects a send — an unverified sender, a bad address or a rate limit
// come back as `{ data: null, error }` in the RETURN VALUE. So the boolean meant "we called
// the API and it did not crash", never "the email was accepted", and every caller, every
// audit row and every screen repeated a success nobody had verified.
//
// alerts.ts already did this correctly, with a comment naming the exact trap. The lesson is
// the one that keeps recurring: an assertion (or a return value) that describes the INTENTION
// rather than the EFFECT is worse than none, because it is believed.

const send = vi.fn()
vi.mock('resend', () => ({ Resend: class { emails = { send: send } } }))

const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

describe('a sender reports only what Resend actually accepted', () => {
  beforeEach(() => {
    vi.resetModules()
    send.mockReset()
    process.env.RESEND_API_KEY = 'test-key'
    process.env.FOUNDER_EMAIL = 'founder@example.com'
  })
  afterEach(() => { delete process.env.RESEND_API_KEY })

  it('a REJECTED send returns ok:false and the reason — this is the bug that shipped', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'The get-kind.com domain is not verified' } })
    const { sendPartnerInvite } = await import('./partner-invite-email')
    const r = await sendPartnerInvite({ name: 'A', email: 'a@example.com', inviteUrl: 'https://x' })
    expect(r.ok).toBe(false)
    expect(r.error).toContain('not verified')
  })

  it('an ACCEPTED send returns ok:true', async () => {
    send.mockResolvedValue({ data: { id: 'msg_123' }, error: null })
    const { sendPartnerInvite } = await import('./partner-invite-email')
    expect((await sendPartnerInvite({ name: 'A', email: 'a@example.com', inviteUrl: 'https://x' })).ok).toBe(true)
  })

  it('accepted-with-no-message-id is NOT a send we can claim happened', async () => {
    send.mockResolvedValue({ data: {}, error: null })
    const { sendPartnerInvite } = await import('./partner-invite-email')
    expect((await sendPartnerInvite({ name: 'A', email: 'a@example.com', inviteUrl: 'https://x' })).ok).toBe(false)
  })

  it('a THROWN error is caught and reported, not swallowed', async () => {
    send.mockRejectedValue(new Error('socket hang up'))
    const { sendPartnerInvite } = await import('./partner-invite-email')
    const r = await sendPartnerInvite({ name: 'A', email: 'a@example.com', inviteUrl: 'https://x' })
    expect(r.ok).toBe(false)
    expect(r.error).toContain('socket hang up')
  })

  it('and ALL THREE senders behave the same way — one helper, one thing to get right', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'nope' } })
    const m = await import('./partner-invite-email')
    expect((await m.sendPartnerInvite({ name: 'A', email: 'a@x.com', inviteUrl: 'u' })).ok).toBe(false)
    expect((await m.sendCountersignAlert({ partnerName: 'A', vidaUrl: 'u' })).ok).toBe(false)
    expect((await m.sendPartnerLiveEmail({ name: 'A', email: 'a@x.com', referralLink: 'r', portalUrl: 'p' })).ok).toBe(false)
  })

  it('a missing API key is a reported failure, not a silent one', async () => {
    delete process.env.RESEND_API_KEY
    vi.resetModules()
    const { sendPartnerInvite } = await import('./partner-invite-email')
    const r = await sendPartnerInvite({ name: 'A', email: 'a@example.com', inviteUrl: 'https://x' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/RESEND_API_KEY/)
  })

  it('the module never returns a bare `true` after a send again', () => {
    // The literal shape of the bug, pinned so it cannot come back by tidying.
    const src = read('apps/api/src/lib/partner-invite-email.ts')
    expect(src).not.toMatch(/await resend\.emails\.send\([\s\S]{0,2000}?\}\)\s*\n\s*return true/)
    expect(src).toContain('const { data, error } = await resend.emails.send')
  })
})

describe('it is an INVITATION, not a password reset in disguise', () => {
  // ⛓️ RE-POINTED 16 Aug, later the same evening. These pinned the invite/recovery loop that
  // lived in operator.ts and generated a link for RESEND to email. The founder then received
  // nothing for a third seat, and reading the code showed why: every email he had actually
  // received all day came from Supabase, and this path's only email was a Resend send from
  // partners@get-kind.com — an address used by nothing but a partner programme never run.
  //
  // The invitation now goes through Supabase itself (lib/partner-invite.ts), so what these
  // tests protected — an invitation rather than a password recovery, and no throwaway account
  // — is asserted at the new home in partner-invite.test.ts. What remains here is the part
  // that is still about THIS file: the page must ask her to create a password, not reset one.
  const page = readFileSync(join(REPO, 'apps/portal/src/app/partner-onboarding/page.tsx'), 'utf8')

  it('NO account is pre-created with a throwaway password', () => {
    const operator = readFileSync(join(REPO, 'apps/api/src/routes/operator.ts'), 'utf8')
    const seatRoute = operator.slice(operator.indexOf("operatorRouter.post('/seats/client-partner'"), operator.indexOf("operatorRouter.post('/seats/client-partner'") + 12000)
    expect(seatRoute).not.toMatch(/auth\.admin\.createUser\(/)
    expect(seatRoute).not.toMatch(/password: `Kp\$\{Math\.random/)
  })

  it('the page asks her to CREATE a password — never to reset or recover one', () => {
    // Comments stripped first: the block explains that this is NOT a recovery, and the word
    // "recovering" inside that explanation failed the assertion. A check that forbids you from
    // describing what you fixed is a bad check.
    const raw = page.slice(page.indexOf('step === 1 && hasSession'), page.indexOf('step === 2 || step === 3'))
    const step1 = raw.split('\n').filter(l => {
      const t = l.trim()
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('{/*') && !t.startsWith('/*')
    }).join('\n')
    expect(step1).toMatch(/Create a password/)
    expect(step1).not.toMatch(/reset|recover|Choose a password to get started/i)
  })
})

describe('the operator is told WHY, and always has a way in', () => {
  const operator = read('apps/api/src/routes/operator.ts')
  const routes = read('apps/api/src/routes/partners.ts')
  const vida = read('apps/admin/src/app/vida/partners/page.tsx')

  it('seat creation records the failure reason in the response AND the audit row', () => {
    const seatRoute = operator.slice(operator.indexOf("operatorRouter.post('/seats/client-partner'"))
    expect(seatRoute.slice(0, 10000)).toContain('invite_error: inviteError')
    expect(seatRoute.slice(0, 10000)).toMatch(/invite_url: inviteUrl/)
    // ⛓️ RE-POINTED 16 Aug: the reason now arrives from invitePartner (Supabase) rather than
    // from the Resend sender's result. What is asserted is unchanged — the reason must reach
    // the operator — only where it comes from moved.
    expect(seatRoute.slice(0, 10000)).toMatch(/const inviteError = invite\.error/)
  })

  it('the counter-signature does the same for the "you are live" email', () => {
    const counter = routes.slice(
      routes.indexOf("partnersRouter.post('/admin/:partnerId/countersign'"),
      routes.indexOf("partnersRouter.post('/admin/:partnerId/resend-invite'"))
    expect(counter).toContain('liveEmailError')
    expect(counter).toMatch(/live_email_error: liveEmailError/)
  })

  it('there is a RESEND endpoint, admin-guarded, and it audits', () => {
    expect(routes).toContain("partnersRouter.post('/admin/:partnerId/resend-invite', requireAdminKey")
    const resend = routes.slice(routes.indexOf("partnersRouter.post('/admin/:partnerId/resend-invite'"))
    expect(resend.slice(0, 3000)).toContain("action: 'client_partner_invite_resent'")
    expect(resend.slice(0, 3000)).toMatch(/invite_sent_at: new Date\(\)\.toISOString\(\)/)
  })

  it('and it returns the link EVEN WHEN THE EMAIL FAILS AGAIN — that is the point', () => {
    // Without this, an undeliverable address is a seat nobody can ever occupy: she cannot
    // reach the "send me a fresh link" screen without a link.
    const resend = routes.slice(routes.indexOf("partnersRouter.post('/admin/:partnerId/resend-invite'"))
    expect(resend.slice(0, 3000)).toMatch(/data: \{ sent: r\.ok, error: r\.error, invite_url: inviteUrl \}/)
  })

  it('Vida shows the link, copyable, and a resend button on an invited seat', () => {
    expect(vida).toContain('resendInvite')
    expect(vida).toContain('Resend invite')
    expect(vida).toContain('navigator.clipboard')
    expect(vida).toMatch(/The email did NOT send — use this link/)
  })
})
