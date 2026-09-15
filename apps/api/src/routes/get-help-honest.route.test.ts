import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// RT-008 — GET HELP. THE BUTTON A STUCK CLIENT PRESSES WHEN MILLA CANNOT RECOVER.
//
// 🛑 THE DEFECT, AND IT IS NOT THE ONE ANYBODY LOOKED FOR. The route exists, is mounted, is
// authenticated, and resolves the client correctly. What it could not do is tell the truth.
// `sendFounderAlert` tracked all three delivery channels internally — email, Slack, the
// durable `founder_alerts` row — and returned `void`, throwing every one of those results
// away. So `POST /support/escalate` answered `{ success: true }` whether a human had been
// reached or whether the function had just logged "⛔ ALERT LOST — no channel delivered".
//
// A client already stuck in the Brief pressed Get help, was told the team had been told, and
// waited. A button that reports a rescue that did not happen is worse than one that admits it
// could not — because the client stops trying.
//
// ⚠️ DELIVERY ITSELF IS UNCHANGED. Same three channels, same order, each failure still
// swallowed so an alert can never throw into a caller's path. Only the REPORT changed.
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
vi.mock('../middleware/auth', () => ({
  requireAuth: (req: { userId?: string }, _r: unknown, n: () => void) => { req.userId = 'user-1'; n() },
}))
vi.mock('../lib/rate-limit', () => ({
  rateLimit: () => (_q: unknown, _s: unknown, n: () => void) => n(),
}))
vi.mock('../lib/brief-draft', () => ({
  briefDraftFor: async () => ({ facts: { company_name: 'Redmayne & Co.' }, conversation: [] }),
  draftProgress: () => ({ count: 7, total: 11, missing: ['exclusions'] }),
}))
vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q,
        async maybeSingle() { return { data: null, error: null } },
      }
      return q
    },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'ellis@redmayne.co.uk' } } }) } },
  },
}))

beforeEach(() => {
  alert.calls = []
  alert.delivery = { delivered: true, emailOk: true, slackOk: false, durableOk: true }
})

async function escalate(message: string) {
  const { supportRouter } = await import('./support')
  const layer = (supportRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/escalate' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /support/escalate is not mounted — Get Help has no door')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const res = {
    status(c: number) { out.code = c; return res },
    json(p: Record<string, unknown>) { out.payload = p; return res },
  }
  await handler({ body: { message }, headers: {}, userId: 'user-1' }, res, () => {})
  return out
}

const STUCK = '🆘 A client is STUCK IN THE MILLA BRIEF and asked for help from the onboarding screen.'

describe('🛑 RT-008 · Get Help reaches a human, or says it could not', () => {
  it('the door the Milla screen calls actually exists and is reachable', async () => {
    const r = await escalate(STUCK)
    expect(r.code).toBe(200)
    expect(r.payload.success).toBe(true)
    expect(alert.calls).toHaveLength(1)
    expect(alert.calls[0].kind).toBe('support_escalation')
  })

  it('🛑 NOTHING DELIVERED → THE CLIENT IS TOLD, not thanked', async () => {
    alert.delivery = { delivered: false, emailOk: false, slackOk: false, durableOk: false }
    const r = await escalate(STUCK)
    expect(r.code, 'a failed escalation still reported success').toBe(503)
    expect(r.payload.success).toBe(false)
    expect(r.payload.retryable).toBe(true)
    // They are told plainly, and told their words are safe, without a technical reason.
    const said = String(r.payload.error)
    expect(said).toContain('Nothing you typed is lost')
    expect(said).not.toMatch(/resend|slack|founder_alerts|insert|undefined|null/i)
  })

  it('🛑 THE DURABLE ROW ALONE IS ENOUGH — a recoverable alert is a delivered one', async () => {
    // Email and Slack may be unconfigured in an environment; a row in `founder_alerts` is
    // still a message an operator can find. Refusing here would tell a client we failed when
    // we had not.
    alert.delivery = { delivered: true, emailOk: false, slackOk: false, durableOk: true }
    const r = await escalate(STUCK)
    expect(r.code).toBe(200)
    expect(r.payload.success).toBe(true)
  })

  it('the operator is told who, where they are stuck, and what the client saw', async () => {
    await escalate(`${STUCK}\nBrief progress: 7 of 11 facts held.`)
    const lines = alert.calls[0].lines.join('\n')
    expect(lines).toContain('Redmayne & Co.')
    expect(lines).toContain('ellis@redmayne.co.uk')
    expect(lines).toContain('STUCK IN THE MILLA BRIEF')
  })

  it('🛑 AND THE ALERT HELPER REPORTS DELIVERY AT ALL — the root cause', async () => {
    // The whole defect in one line: this used to be `Promise<void>`, so no caller could be
    // honest even if it wanted to be.
    const src = (await import('fs')).readFileSync(
      (await import('path')).join(process.cwd(), 'apps/api/src/lib/alerts.ts'), 'utf8')
    const live = src.split('\n').filter(l => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//')).join('\n')
    expect(live, 'sendFounderAlert reports nothing again').toContain('Promise<AlertDelivery>')
    expect(live).toContain('return { delivered: emailOk || slackOk || durableOk')
  })
})
