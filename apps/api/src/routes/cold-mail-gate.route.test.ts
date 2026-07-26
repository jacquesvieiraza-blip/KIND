import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// RULE 6: nothing reaches a prospect while the kill-switch is off.
//
// A consent request is an unsolicited email to a stranger. `icps.ts` already carried the
// scar — *"consent sends must obey the same kill-switch as outreach; previously they sent
// unconditionally, so a 'safe test' ICP run still cold-emailed real execs"* — but that fix
// was applied to the sourcing path only. Five consent doors in leads.ts were still open,
// the worst being PATCH /:id/status, where a bookkeeping change silently cold-emailed.
//
// Route-level, so the gate is proved where it has to hold.

vi.mock('@kind/db', () => ({
  db: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'client-1' }, error: null }) }) }) }), rpc: async () => ({ data: null, error: null }) },
}))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _s: unknown, n: () => void) => n() }))
vi.mock('../lib/rate-limit', () => ({ rateLimit: () => (_q: unknown, _s: unknown, n: () => void) => n() }))

const sent: string[] = []
vi.mock('../lib/email', () => ({
  sendConsentEmail: async (to: string) => { sent.push(to); },
  isRealRecipient: () => true,
}))

const CONSENT_ROUTES = ['/:id/consent', '/:id/resend-consent', '/consent/bulk', '/bulk-consent']

async function call(path: string) {
  const { leadRouter } = await import('./leads')
  const layer = (leadRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === path && l.route?.methods.post)
  if (!layer?.route) throw new Error(`POST ${path} not found`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const fakeRes = { status(c: number) { res.code = c; return fakeRes }, json(p: Record<string, unknown>) { res.payload = p; return fakeRes } }
  await handler({ body: { lead_ids: ['l1'] }, userId: 'user-1', params: { id: 'l1' } }, fakeRes, () => {})
  return res
}

const original = process.env.AUTO_OUTREACH_ENABLED
beforeEach(() => { sent.length = 0 })
afterEach(() => { process.env.AUTO_OUTREACH_ENABLED = original })

describe('consent mail obeys the outreach kill-switch', () => {
  for (const path of CONSENT_ROUTES) {
    it(`POST ${path} sends nothing while outreach is off`, async () => {
      process.env.AUTO_OUTREACH_ENABLED = 'false'
      const res = await call(path)
      expect(res.code).toBe(409)
      expect(res.payload.error).toBe('outreach_paused')
      expect(sent).toEqual([])
    })
  }

  it('the refusal explains itself and says nothing else changed', async () => {
    process.env.AUTO_OUTREACH_ENABLED = 'false'
    const res = await call('/:id/consent')
    expect(String(res.payload.message)).toMatch(/switched off/i)
    expect(String(res.payload.message)).toMatch(/nothing else changed/i)
  })
})
