import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// F8 · RT-008 — GET HELP. THE WHOLE PATH, NOT THE REPORT.
//
// The founder pressed it live and nothing happened. The previous round found ONE defect —
// the route answered success whether or not anybody was reached — and called RT-008 fixed.
// Honest reporting is not the same as working, so this walks every hop.
//
// ── THE HOPS ───────────────────────────────────────────────────────────────────────────
//   ① the button exists and is fenced against double-firing
//   ② it posts to POST /support/escalate, the route that actually exists
//   ③ the router is authenticated, and a person mid-onboarding with no client row passes
//   ④ the alert reaches a channel — tested with each channel alone, and with none
//   ⑤ the durable table has BOTH migration homes, or the last channel is a table that
//     does not exist
//
// 🛑 THE FINDING THIS ROUND. Hop ⑤ was broken. `supabase/migrations/20260710_founder_alerts
// .sql` has existed since 10 July and was NEVER added to `PENDING_MIGRATIONS`, which is what
// the Vida engine applies. So unless somebody ran it by hand, `founder_alerts` is absent in
// production — and with email and Slack unconfigured, "we told the team" was three failures
// in a row reported as a success.
//
// ⚠️ RUNTIME UNVERIFIED, AND SAID PLAINLY. Code cannot see production. This is the most
// likely cause, not a proven one. The preview checklist in the packet is how it is settled.
// ═══════════════════════════════════════════════════════════════════════════════════════

const alert = vi.hoisted(() => ({
  delivery: { delivered: true, emailOk: true, slackOk: false, durableOk: true },
  calls: [] as Array<{ kind: string; subject: string; lines: string[] }>,
}))
vi.mock('../lib/alerts', () => ({
  sendFounderAlert: async (kind: string, subject: string, lines: string[]) => {
    alert.calls.push({ kind, subject, lines })
    return alert.delivery
  },
}))
const auth = vi.hoisted(() => ({ userId: 'u-onboarding' as string | undefined }))
vi.mock('../middleware/auth', () => ({
  requireAuth: (req: { userId?: string }, res: { status: (n: number) => { json: (b: unknown) => void } }, n: () => void) => {
    if (!auth.userId) { res.status(401).json({ success: false, error: 'Missing token' }); return }
    req.userId = auth.userId; n()
  },
}))
vi.mock('../lib/rate-limit', () => ({ rateLimit: () => (_q: unknown, _s: unknown, n: () => void) => n() }))
const world = vi.hoisted(() => ({ hasClient: false }))
vi.mock('../lib/brief-draft', () => ({
  briefDraftFor: async () => ({ facts: { company_name: 'Redmayne & Co.' }, conversation: [] }),
  draftProgress: () => ({ count: 7, total: 11, missing: ['exclusions'] }),
}))
vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q,
        async maybeSingle() {
          return { data: world.hasClient ? { company_name: 'Redmayne & Co.' } : null, error: null }
        },
      }
      return q
    },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'ellis@redmayne.co.uk' } } }) } },
  },
}))

beforeEach(() => {
  alert.calls = []
  alert.delivery = { delivered: true, emailOk: true, slackOk: false, durableOk: true }
  auth.userId = 'u-onboarding'
  world.hasClient = false
})
afterEach(() => { auth.userId = 'u-onboarding' })

const REPO = process.cwd()
const readSrc = (p: string) => readFileSync(join(REPO, p), 'utf8')
const PAGE = 'apps/portal/src/app/(milla)/milla/welcome/page.tsx'

async function escalate(message: string) {
  const { supportRouter } = await import('./support')
  const stack = (supportRouter as unknown as { stack: Array<any> }).stack
  const layer = stack.find(l => l.route?.path === '/escalate' && l.route?.methods.post)
  if (!layer) throw new Error('POST /support/escalate is not mounted — Get Help has no door')
  const out: { code: number; payload: any } = { code: 200, payload: {} }
  const res: any = { status(c: number) { out.code = c; return res }, json(p: unknown) { out.payload = p; return res } }
  // ⚠️ RUN THE WHOLE STACK, ROUTER-LEVEL MIDDLEWARE FIRST. `requireAuth` is attached with
  // `supportRouter.use(...)`, so it is NOT in `route.stack` — a harness that skipped it
  // would "test" an authenticated route while never authenticating, and `req.userId` (the
  // only durable handle a person who has not been promoted yet actually has) would be
  // missing from the alert without anything failing.
  const req: any = { body: { message }, headers: {} }
  const routerMiddleware = stack.filter(l => !l.route)
  for (const m of routerMiddleware) {
    let advanced = false
    await m.handle(req, res, () => { advanced = true })
    if (!advanced) return out
  }
  for (const h of layer.route.stack) {
    let advanced = false
    await h.handle(req, res, () => { advanced = true })
    if (!advanced) break
  }
  return out
}

describe('🛑 F8 · RT-008 — the whole Get Help path', () => {
  it('F8 ① the button exists, is fenced, and posts to the route that exists', () => {
    const page = readSrc(PAGE)
    expect(page, 'the Get help button is gone').toContain('{helpButtonLabel(helpState)}')
    expect(page).toContain('void getHelp()')
    // 🛑 THE FENCE. Without it a second click raises a second alert for the same moment.
    expect(page).toContain('if (!mayStartHelp(helpState)) return')
    // 🛑 THE URL. A typo here is a 404 the client reads as "nothing happened".
    expect(page).toContain("api.post('/support/escalate'")
    const support = readSrc('apps/api/src/routes/support.ts')
    expect(support, 'the route the page posts to does not exist').toContain("'/escalate',")
  })

  it('F8 ② a person MID-ONBOARDING with no client row still reaches a human', async () => {
    world.hasClient = false          // they have signed up but were never promoted
    const r = await escalate('🆘 A client is STUCK IN THE MILLA BRIEF')
    expect(r.code, JSON.stringify(r.payload)).toBe(200)
    expect(alert.calls).toHaveLength(1)
    const lines = alert.calls[0].lines.join('\n')
    // The operator is told which identity to look for, since there is no company row.
    expect(lines).toContain('ONBOARDING (no client row yet)')
    expect(lines).toContain('ellis@redmayne.co.uk')
    expect(lines).toContain('u-onboarding')
  })

  it('F8 ③ each channel ALONE is enough; none is not', async () => {
    for (const [name, d] of [
      ['email only',   { delivered: true, emailOk: true,  slackOk: false, durableOk: false }],
      ['slack only',   { delivered: true, emailOk: false, slackOk: true,  durableOk: false }],
      ['durable only', { delivered: true, emailOk: false, slackOk: false, durableOk: true }],
    ] as const) {
      alert.delivery = d as typeof alert.delivery
      const r = await escalate('help')
      expect(r.code, `${name} was reported as a failure`).toBe(200)
      expect(r.payload.success).toBe(true)
    }
    // 🛑 AND NOTHING AT ALL IS TOLD TO THE CLIENT, not thanked away.
    alert.delivery = { delivered: false, emailOk: false, slackOk: false, durableOk: false }
    const r = await escalate('help')
    expect(r.code).toBe(503)
    expect(r.payload.success).toBe(false)
    expect(r.payload.retryable).toBe(true)
    expect(String(r.payload.error)).toContain('Nothing you typed is lost')
    expect(String(r.payload.error), 'a technical reason reached the client')
      .not.toMatch(/resend|slack|founder_alerts|insert|token/i)
  })

  it('F8 ④ 🛑 THE DURABLE TABLE HAS BOTH MIGRATION HOMES — the hop that was broken', () => {
    // ⛓️ IT HAD ONE. The .sql file has existed since 10 Jul; `PENDING_MIGRATIONS` — what the
    // Vida engine actually applies — had never heard of it. The last-resort channel was a
    // table that may not exist, which is the most likely reason Get Help did nothing live.
    expect(existsSync(join(REPO, 'supabase/migrations/20260710_founder_alerts.sql')),
      'the founder_alerts migration file is gone').toBe(true)
    const pending = readSrc('apps/api/src/lib/pending-migrations.ts')
    expect(pending, 'founder_alerts is missing from PENDING_MIGRATIONS again — S1-PD-09')
      .toContain("key: '20260710_founder_alerts'")
    // Idempotent, so applying it where the table already exists is a no-op.
    const from = pending.indexOf("key: '20260710_founder_alerts'")
    const block = pending.slice(from, from + 2400)
    expect(block).toContain('CREATE TABLE IF NOT EXISTS public.founder_alerts')
    expect(block).toContain('CREATE INDEX IF NOT EXISTS founder_alerts_created_idx')
    expect(block, 'a destructive statement crept into a migration').not.toMatch(/DROP |TRUNCATE |DELETE FROM/)
  })

  it('F8 ⑤ the client stays in the same conversation — Get Help starts no second engine', () => {
    const page = readSrc(PAGE)
    const code = page.split('\n').filter(l => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*')).join('\n')
    // It reports a state and nothing else: no navigation, no new thread, no cleared messages.
    expect(code).toContain('setHelpState')
    expect(code, 'Get Help now navigates the client away').not.toMatch(/getHelp[\s\S]{0,600}router\.push/)
    expect(code, 'Get Help now clears the conversation').not.toMatch(/getHelp[\s\S]{0,600}setMessages\(\[\]\)/)
    // And the escalation carries the conversation so the operator can pick it up.
    expect(code).toContain('Milla last asked')
    expect(code).toContain('They last answered')
  })
})
