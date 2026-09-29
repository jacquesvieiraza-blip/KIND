// ⚑ 29 Sep (R174 ① · PR 4d) — "MY TEAM" LIVES IN COMMAND CENTRE, AND ITS INVITE GIVES ACCESS.
//   · the old team invite (a row nothing reads) is retired: it writes nothing and says where to go;
//   · a colleague who logs in or signs up from the invite goes BACK to the invite, not to the Brief
//     (the Brief makes their own account, and the seat then refused them);
//   · only the invite page is accepted as a way back — the login page sends nobody elsewhere;
//   · the invite page shows the seat's real refusal, and no longer falls back to the dead invite;
//   · Teams Hub and Settings → Team both lead to Command Centre.
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, next: () => void) => next() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => { throw new Error('the retired invite must not touch the database') } }))

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('the old team invite', () => {
  it('refuses with where to go instead, and touches nothing', async () => {
    const mod = await import('./team')
    const router = (mod as unknown as { default: { stack: Array<Record<string, any>> } }).default
    const layer = router.stack.find(l => l.route?.path === '/invite' && l.route?.methods.post)
    const handler = layer!.route.stack[layer!.route.stack.length - 1].handle
    let status = 200; let body: Record<string, unknown> = {}
    const res: any = { status: (s: number) => { status = s; return res }, json: (b: Record<string, unknown>) => { body = b; return res } }
    await handler({ body: { email: 'a@b.co', role: 'member' }, userId: 'u1' }, res)
    expect(status).toBe(410)
    expect(body.error).toBe(mod.TEAM_INVITE_MOVED)
    expect(mod.TEAM_INVITE_MOVED).toContain('Command Centre → Seats')
  })
})

describe('the way back to an invite', () => {
  it('accepts only the invite page, with a real token', async () => {
    const { inviteReturn, loginForInvite, callbackToInvite } = await import('../../../portal/src/lib/invite-return')
    const tok = 'a'.repeat(64)
    expect(inviteReturn(`/invite/accept?token=${tok}`)).toBe(`/invite/accept?token=${tok}`)
    for (const bad of [null, '', '/milla', '//evil.com', 'https://evil.com/invite/accept?token=' + tok,
      `/invite/accept?token=${tok}&next=//evil.com`, '/invite/accept?token=short', `/invite/accept?token=${tok}/../x`]) {
      expect(inviteReturn(bad), String(bad)).toBeNull()
    }
    // the link the invite page hands out survives the trip through the login page's query string
    const link = loginForInvite(tok)
    expect(inviteReturn(new URL(link, 'https://x.test').searchParams.get('redirect'))).toBe(`/invite/accept?token=${tok}`)
    // …and so does the social sign-in hop: the callback reads `next` back as the invite page
    const cb = new URL(callbackToInvite('https://x.test', `/invite/accept?token=${tok}`))
    expect(cb.pathname).toBe('/auth/callback')
    expect(cb.searchParams.get('next')).toBe(`/invite/accept?token=${tok}`)
  })
  it('login, sign-up and social sign-in all go back to it', () => {
    const login = read('apps/portal/src/app/(auth)/login/page.tsx')
    expect(login).toContain("const backToInvite = inviteReturn(searchParams.get('redirect'))")
    expect(login).toContain("router.push(backToInvite ?? '/milla/welcome')")
    expect(login).toContain('} else if (backToInvite) {\n        router.push(backToInvite)')
    expect(login).toContain('? { redirectTo: callbackToInvite(window.location.origin, backToInvite) }')
    expect(login).toContain(': { redirectTo: `${window.location.origin}/auth/callback?next=/milla/welcome` },')
  })
})

describe('the invite page', () => {
  const page = read('apps/portal/src/app/invite/accept/page.tsx')
  it('uses the seat invite only, and shows its real refusal', () => {
    expect(page).toContain('/company/accept-invite')
    expect(page).not.toContain('/team/accept')
    expect(page).toContain("setReason(companyRes.status === 404 ? null : (body?.error ?? null))")
    expect(page).toContain("{reason ?? 'This invite has expired or already been used.'}")
    expect(page).toContain('href={loginForInvite(token!)}')
  })
})

describe('one place for the team', () => {
  it('Teams Hub redirects to Command Centre and leaves the menu; Settings points there', () => {
    const mw = read('apps/portal/src/middleware.ts')
    expect(mw).toContain("if (pathname === '/milla/teams' || pathname.startsWith('/milla/teams/')) {\n    return NextResponse.redirect(new URL('/milla/command-centre', base))")
    expect(mw).toContain("'team':       '/milla/command-centre',")
    expect(read('apps/portal/src/components/milla/MillaShell.tsx')).not.toContain("'/milla/teams'")
    const settings = read('apps/portal/src/app/(milla)/milla/settings/page.tsx')
    expect(settings).not.toContain('<TeamSection clientId={clientId} userRole={userRole} />')
    expect(settings).toContain('<p className="text-sm text-gray-500 mt-1 mb-3">{TEAM_MOVED_NOTE}</p>')
    expect(settings).toContain('href="/milla/command-centre"')
  })
})
