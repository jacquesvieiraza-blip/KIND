// ⚑ 1 Oct (C1, card #2074) — NOTHING SENDS A LINKEDIN MESSAGE AUTOMATICALLY, EVER.
// The founder: "C1 yes" — delete the PhantomBuster auto-send path and stay email-only.
// Automated LinkedIn breaks LinkedIn's terms, and the path could only ever get stuck or send
// by surprise. These guards hold the worst case: a key set, sending switched ON, every gate
// allowing — and still no call to PhantomBuster, and the step is left for a person to send.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const updates: unknown[] = []
vi.mock('@kind/db', () => {
  const chain = (table: string) => {
    const q: Record<string, unknown> = {}
    q.select = () => q
    q.eq = () => q
    q.update = (v: unknown) => { updates.push({ table, v }); return q }
    q.single = async () => ({ data: { linkedin_url: 'https://linkedin.com/in/p', connection_note: 'hi', lead_id: 'lead-1' }, error: null })
    q.maybeSingle = async () => ({ data: { email: 'p@prospect.test', company: 'Acme', linkedin_url: 'https://linkedin.com/in/p', client_id: 'client-1' }, error: null })
    q.then = (res: (v: unknown) => unknown) => res({ error: null })
    return q
  }
  return { db: { from: (t: string) => chain(t) } }
})
vi.mock('./send-gate', () => ({ checkSendAllowed: async () => ({ allowed: true }) }))
vi.mock('./programme-authority', () => ({ checkProgrammeAuthority: async () => ({ allowed: true }) }))
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: async () => ({ content: [{ type: 'text', text: 'x' }] }) } } }))

const fetched: string[] = []
const env0 = { auto: process.env.AUTO_OUTREACH_ENABLED, pb: process.env.PHANTOMBUSTER_API_KEY, ag: process.env.PHANTOMBUSTER_LINKEDIN_AGENT_ID }

beforeEach(() => {
  fetched.length = 0; updates.length = 0
  process.env.AUTO_OUTREACH_ENABLED = 'true'          // sending switched ON — the live state today
  process.env.PHANTOMBUSTER_API_KEY = 'pb-key'        // the worst case: somebody sets the key again
  process.env.PHANTOMBUSTER_LINKEDIN_AGENT_ID = 'agent-1'
  vi.stubGlobal('fetch', async (url: unknown) => {
    fetched.push(String(url))
    return { ok: true, status: 200, json: async () => ({ containerId: 'c1' }) } as unknown as Response
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  for (const [k, v] of [['AUTO_OUTREACH_ENABLED', env0.auto], ['PHANTOMBUSTER_API_KEY', env0.pb], ['PHANTOMBUSTER_LINKEDIN_AGENT_ID', env0.ag]] as const) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v
  }
})

describe('C1 — a LinkedIn step is never sent by the system', () => {
  it('key set, sending ON, every gate allowing: no PhantomBuster call, nothing marked sent', async () => {
    const { dispatchLinkedInStep } = await import('./linkedin')
    const r = await dispatchLinkedInStep('queue-1')
    expect(r).toEqual({ sent: false, method: 'manual' })
    expect(fetched.filter(u => /phantombuster/i.test(u)), 'PhantomBuster was called').toEqual([])
    expect(JSON.stringify(updates)).not.toContain('"sent"')
  })
})

const src = (f: string) => readFileSync(join(__dirname, f), 'utf8')
const code = (s: string) => s.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

describe('C1 — the auto-send code is gone, not just switched off', () => {
  it('linkedin.ts holds no PhantomBuster address, key or launch', () => {
    const c = code(src('linkedin.ts'))
    expect(c).not.toMatch(/phantombuster\.com/i)
    expect(c).not.toContain('PHANTOMBUSTER_API_KEY')
    expect(c).not.toContain('PHANTOMBUSTER_LINKEDIN_AGENT_ID')
    expect(c).not.toMatch(/await fetch\(/)
  })

  it('no file in the API calls PhantomBuster', () => {
    const { execSync } = require('node:child_process') as typeof import('node:child_process')
    const hits = execSync(`grep -rIl "api.phantombuster.com" ${join(__dirname, '..')} || true`, { encoding: 'utf8' })
      .split('\n').filter(Boolean).filter(f => !f.endsWith('.test.ts'))
    expect(hits).toEqual([])
  })
})
