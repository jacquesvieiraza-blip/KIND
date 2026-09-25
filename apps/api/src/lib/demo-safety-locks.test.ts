// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep — A DEMO ACCOUNT CAN NEVER BE CHARGED, NEVER TAKE A REAL MAILBOX, NEVER SEND.
//
// Before the client demo is built (#2319), three gaps found by tracing today's demo support:
// Stripe refused only House, preparation would claim a real pooled mailbox for a demo, and the
// SMTP seam asked only the kill-switch. Each lock below is proved to refuse a demo AND to let a
// normal account through — a lock that blocked everyone would pass the first half alone.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const state = vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_demo_locks'
  return { demo: false, stripeCreates: 0, smtp: [] as unknown[], inboxOwner: 'client-1' as string | null }
})

vi.mock('./demo', () => ({ isDemoClient: async () => state.demo }))
vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { create: async () => { state.stripeCreates++; return { id: 'cs_1', url: 'https://checkout' } } } }
  },
}))
vi.mock('nodemailer', () => {
  const t = () => ({ sendMail: async (o: { to: string }) => { state.smtp.push(o); return { messageId: 'x', accepted: [o.to] } }, verify: async () => true })
  return { default: { createTransport: t }, createTransport: t }
})
vi.mock('./outreach-kill-switch', () => ({ killSwitchBlocks: () => false, KILL_SWITCH_REFUSAL: 'off' }))
vi.mock('./inbox-secret', () => ({ decryptSecret: () => 'pw' }))
vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const o: Record<string, unknown> = {}
      for (const m of ['select', 'eq']) o[m] = () => o
      o.maybeSingle = async () => ({ data: state.inboxOwner ? { client_id: state.inboxOwner } : null, error: null })
      return o
    },
  },
}))

import { createProgrammeCheckoutSession } from './programme-checkout'
import { sendAs } from './mailer'

const BOX = { id: 'inbox-1', email: 'jacques@kindoutreach.com', kind: 'branded', status: 'active', smtp_host: 'smtp.gmail.com', smtp_port: 465, smtp_secure: true, smtp_user: 'u', smtp_pass_enc: 'enc' } as never
const checkout = () => createProgrammeCheckoutSession({
  clientId: 'client-1', programmeId: 'p-1', meetings: 10, stage: 'programme_second',
  successUrl: 'https://x/ok', cancelUrl: 'https://x/no', clientEmail: 'c@realco.com',
})

beforeEach(() => { state.demo = false; state.stripeCreates = 0; state.smtp = []; state.inboxOwner = 'client-1' })

describe('🛑 Stripe — a demo account is never charged', () => {
  it('a demo: refused before any Stripe session exists', async () => {
    state.demo = true
    const r = await checkout()
    expect(r.url).toBeNull()
    expect(r.error).toContain('demo account')
    expect(state.stripeCreates).toBe(0)
  })

  it('a normal account still reaches Stripe', async () => {
    const r = await checkout()
    expect(r.url).toBe('https://checkout')
    expect(state.stripeCreates).toBe(1)
  })

  it('the client door says so before any stage gate', () => {
    const route = readFileSync(join(__dirname, '..', 'routes', 'my-programme.ts'), 'utf8')
    const body = route.slice(route.indexOf('async function programmeCheckout'))
    expect(body.indexOf("error: 'demo_account'")).toBeGreaterThan(-1)
    expect(body.indexOf("error: 'demo_account'")).toBeLessThan(body.indexOf("if (stage === 'programme_first') {"))
  })
})

describe('🛑 the SMTP seam — nothing to a fake address, nothing from a demo', () => {
  it('a reserved, never-deliverable recipient is refused and no mail server is touched', async () => {
    for (const to of ['p@mbf-demo.invalid', 'p@host.internal', 'p@kind-demo.io', 'p@example.com', 'p@localhost', 'not-an-address']) {
      const r = await sendAs(BOX, { to, subject: 's', text: 't' })
      expect(r.ok, to).toBe(false)
    }
    expect(state.smtp).toHaveLength(0)
  })

  it('a mailbox belonging to a demo account never sends', async () => {
    state.demo = true
    const r = await sendAs(BOX, { to: 'prospect@realco.co.uk', subject: 's', text: 't' })
    expect(r.ok).toBe(false)
    expect(String(r.error)).toContain('demo account')
    expect(state.smtp).toHaveLength(0)
  })

  it('a normal mailbox to a real address is still sent', async () => {
    const r = await sendAs(BOX, { to: 'prospect@realco.co.uk', subject: 's', text: 't' })
    expect(r.ok).toBe(true)
    expect(state.smtp).toHaveLength(1)
  })
})

describe('🛑 preparation never claims a real mailbox for a demo', () => {
  it('a demo is answered as "no inventory" and claimPooledSender is not called', () => {
    const src = readFileSync(join(__dirname, 'programme-preparation.ts'), 'utf8')
    expect(src).toContain("const senderClaim = await isDemoClient(p.client_id)")
    expect(src).toContain("? { ok: false as const, reason: 'no_inventory' as const, detail: 'demo account — a real pooled mailbox is never claimed for a demo' }")
    expect(src).toContain(': await claimPooledSender(p.client_id)')
  })
})
