import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// BUILD 5 — VIDA'S WORDS ARE HERS, OR THERE ARE NONE. Driven through the REAL route.
//
// 🛑 TWO CANNED SENTENCES LIVED IN `/operator/command` AFTER BUILD 3: "Here — take a look and
// confirm if that is right." when she proposed without speaking, and "I did not catch that —
// say it again?" when the model returned nothing. The second is the regex router's own
// fallback with the regexes removed — it tells the operator she HEARD them and did not
// understand, when what happened is that no reply came back. A third, "I can't reach my
// brain right now…", answered `success: true` when there was no model key at all.
//
// The founder's rule for Milla is the rule for Vida: nothing composes a sentence on her
// behalf. A failed turn is reported as a failed turn, in the console's voice, not hers.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const box = vi.hoisted(() => ({ reply: null as unknown }))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class { messages = { create: async () => box.reply } }
}))
vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, neq: () => q, in: () => q, is: () => q,
        order: () => q, limit: () => q, upsert: () => q, insert: () => q, update: () => q,
        async maybeSingle() {
          if (table === 'clients') return { data: { id: 'c1', company_name: 'Redmayne & Co.' }, error: null }
          return { data: null, error: null }
        },
        async single() { return { data: null, error: null } },
        then(r: (v: unknown) => unknown) { return Promise.resolve({ data: [], error: null, count: 0 }).then(r) },
      }
      return q
    },
    rpc: async () => ({ data: null, error: null }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'op@kind.test' } } }) } },
  },
}))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../lib/operator-audit', () => ({
  writeOperatorAudit: async () => {}, campaignAuditAction: () => 'noop',
}))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, next: () => void) => next() }))

async function command(text: string) {
  const m = await import('./operator')
  const layer = (m.operatorRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/command' && l.route?.methods.post)
  if (!layer) throw new Error('POST /command not found')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: Row = {}; let status = 200
  const res: any = { json: (b: Row) => { payload = b }, status: (s: number) => { status = s; return res } }
  await handler({ body: { client_id: 'c1', text }, params: {}, query: {}, headers: { 'x-operator-email': 'op@kind.test' } }, res, () => {})
  return { payload, status }
}

const KEY_BEFORE = process.env.ANTHROPIC_API_KEY
beforeEach(() => { box.reply = null; process.env.ANTHROPIC_API_KEY = 'test-key-not-real' })
afterEach(() => {
  if (KEY_BEFORE === undefined) delete process.env.ANTHROPIC_API_KEY
  else process.env.ANTHROPIC_API_KEY = KEY_BEFORE
})

const REPO = process.cwd()
const live = (src: string) =>
  src.split('\n').filter(l => {
    const t = l.trimStart()
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
  }).join('\n')

describe('🛑 BUILD 5 · nothing composes a sentence for Vida', () => {
  it('her words and her proposal both reach the operator — the normal turn', async () => {
    box.reply = { stop_reason: 'tool_use', content: [
      { type: 'text', text: 'I can pull another forty for them — want me to set that up?' },
      { type: 'tool_use', id: 't1', name: 'propose_sourcing', input: { count: 40 } },
    ] }
    const { payload, status } = await command('get me 40 more')
    expect(status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.reply).toContain('another forty')
    expect((payload.proposal as Row).kind).toBe('propose_sourcing')
  })

  it('🛑 A PROPOSAL WITHOUT WORDS IS STILL AN ANSWER — and no sentence is invented for it', async () => {
    box.reply = { stop_reason: 'tool_use', content: [
      { type: 'tool_use', id: 't1', name: 'propose_sourcing', input: { count: 40 } },
    ] }
    const { payload, status } = await command('get me 40 more')
    expect(status).toBe(200)
    expect(payload.success).toBe(true)
    expect((payload.proposal as Row).kind).toBe('propose_sourcing')
    expect(payload.reply, 'a canned sentence was attached to her proposal').toBe('')
  })

  it('🛑 NOTHING AT ALL IS A FAILED TURN, NOT "I DID NOT CATCH THAT"', async () => {
    box.reply = { stop_reason: 'end_turn', content: [] }
    const { payload, status } = await command('where are we with these guys?')
    expect(status).toBe(503)
    expect(payload.success).toBe(false)
    expect(payload.retryable).toBe(true)
    expect(payload.reply, 'a sentence was put in her mouth').toBeUndefined()
    expect(String(payload.error)).not.toContain('did not catch that')
  })

  it('🛑 NO MODEL KEY IS AN OPERATIONAL FAULT, REPORTED AS ONE — not Vida speaking', async () => {
    delete process.env.ANTHROPIC_API_KEY
    box.reply = { stop_reason: 'end_turn', content: [{ type: 'text', text: 'should never be reached' }] }
    const { payload, status } = await command('status?')
    expect(status).toBe(503)
    expect(payload.success).toBe(false)
    expect(payload.reply).toBeUndefined()
    expect(String(payload.error)).not.toContain("can't reach my brain")
  })

  it('🛑 THE THREE SENTENCES ARE GONE FROM THE ROUTE', () => {
    const OP = readFileSync(join(REPO, 'apps/api/src/routes/operator.ts'), 'utf8')
    const from = OP.indexOf("operatorRouter.post('/command'")
    const to = OP.indexOf('operatorRouter.', from + 10)
    const route = live(OP.slice(from, to))
    expect(route).not.toContain('Here — take a look and confirm if that is right')
    expect(route).not.toContain('I did not catch that')
    expect(route).not.toContain("I can't reach my brain")
  })

  it('and the console renders a failed turn as a notice, never as one of her bubbles', () => {
    const VC = live(readFileSync(join(REPO, 'apps/admin/src/components/vida/VidaConversation.tsx'), 'utf8'))
    expect(VC).toContain("role: 'notice'")
    expect(VC, 'an error is being pushed as a Vida bubble again')
      .not.toMatch(/role:\s*'vida',\s*text:\s*e instanceof Error/)
    // An empty reply beside a proposal shows the card and no bubble.
    expect(VC).toMatch(/json\.reply\.trim\(\)\)\s*\{\s*setCmdLog/)
  })
})
