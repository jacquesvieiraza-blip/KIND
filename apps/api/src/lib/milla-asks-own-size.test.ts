// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 28 Sep (R170) — MILLA MUST ASK THE CLIENT'S OWN SIZE BEFORE ONBOARDING FINISHES.
//
// Found on the founder's end-to-end walk (test 2, AAA Operations Studio): the client finished
// onboarding without ever being asked their size, so their price waited on a person. Founder:
// "the client needs to set this in the onboarding part. this way its never a hold up. so Milla
// needs to capture this early … yes if a client does not we can. but we need to attempt".
//
// So the size is an ACCOUNT fact beside the country: answered by a number, or by the client
// plainly declining (then the company check and, failing that, a person in Vida set it).
// Silence never finishes onboarding. It is NOT a twelfth Brief fact.
// ═══════════════════════════════════════════════════════════════════════════════════════

process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BRIEF_FACTS } from '@kind/shared'

const authority = () => import('./brief-draft')

/** The eleven and the country — everything EXCEPT the client's own size. */
const NO_SIZE: Record<string, unknown> = {
  contact_name:        'Priya Shah',
  company_name:        'AAA Operations Studio',
  website_none:        true,
  what_they_do:        'runs back-office operations for growing service firms',
  target_category:     'accounting firms',
  geographies:         ['United Kingdom'],
  target_company_type: 'accounting firm',
  company_sizes:       ['11-50'],
  job_titles:          ['Managing Partner'],
  exclusions:          'no sole traders',
  desired_outcome:     'qualified meetings with firm owners',
  country:             'United Kingdom',
}

type Dispatched = {
  status: number; json: Record<string, unknown>; raw: string
  logs: string[]; prompts: string[]
  /** The draft as it stands AFTER the turn — the canonical record. */
  store: Record<string, unknown>
}

async function dispatch(
  modelInput: unknown,
  opts: { held?: Record<string, unknown>; userText?: string } = {},
): Promise<Dispatched> {
  vi.resetModules()
  const logs: string[] = []
  const prompts: string[] = []

  vi.doMock('@anthropic-ai/sdk', () => ({
    default: class {
      messages = {
        create: async (body: { system?: string }) => {
          prompts.push(String(body?.system ?? ''))
          return { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'milla_reply', input: modelInput }] }
        },
      }
    },
  }))
  vi.doMock('@kind/db', () => ({
    db: {
      from: () => { throw new Error('builder/chat must not touch the database directly') },
      rpc: async () => ({ data: null, error: null }),
    },
  }))
  vi.doMock('../middleware/auth', () => ({
    requireAuth: (req: { userId?: string }, _r: unknown, n: () => void) => {
      ;(req as { userId?: string }).userId = 'owner-user'; n()
    },
  }))
  // 🛑 A REAL MERGING STORE. "the resolution reaches the record" is a claim about state across
  // the write and the read-back, so the double merges exactly as `saveBriefDraft` does.
  const store: Record<string, unknown> = { ...(opts.held ?? {}) }
  vi.doMock('./brief-draft', async () => {
    const actual = await vi.importActual<typeof import('./brief-draft')>('./brief-draft')
    return {
      ...actual,
      saveBriefDraft: async (_u: string, facts: Record<string, unknown>) => {
        Object.assign(store, facts); return { ok: true }
      },
      briefDraftFor: async () => ({ confirmedAt: null, promotedClientId: null, facts: store }),
      writableBriefDraft: async () => ({ confirmedAt: null, promotedClientId: null, facts: store }),
      saveBriefConversation: async () => ({ ok: true }),
      rememberCustomerTurn: async () => ({ ok: true }),
      markBriefDraftPromoted: async () => ({ ok: true }),
    }
  })

  const err = console.error, log = console.log, warn = console.warn
  console.error = (...a: unknown[]) => { logs.push(a.map(String).join(' ')) }
  console.log = (...a: unknown[]) => { logs.push(a.map(String).join(' ')) }
  console.warn = (...a: unknown[]) => { logs.push(a.map(String).join(' ')) }
  try {
    const { icpRouter } = await import('../routes/icps')
    const express = (await import('express')).default
    const { createServer, request } = await import('http')
    const app = express(); app.use(express.json()); app.use('/icps', icpRouter)
    const server = createServer(app)
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
    const port = (server.address() as { port: number }).port
    try {
      const payload = JSON.stringify({
        messages: [{ role: 'user', content: opts.userText ?? 'Here is everything about us.' }],
        profile_required: true,
      })
      const out = await new Promise<{ status: number; json: Record<string, unknown>; raw: string }>((resolve, reject) => {
        const r = request({
          host: '127.0.0.1', port, path: '/icps/builder/chat', method: 'POST',
          headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(payload),
            authorization: 'Bearer t',
          },
        }, res => {
          let raw = ''
          res.on('data', c => { raw += c })
          res.on('end', () => {
            let json: Record<string, unknown> = {}
            try { json = JSON.parse(raw) } catch { json = { raw } }
            resolve({ status: res.statusCode ?? 0, json, raw })
          })
        })
        r.on('error', reject); r.write(payload); r.end()
      })
      return { ...out, logs, prompts, store }
    } finally { await new Promise<void>(r => server.close(() => r())) }
  } finally { console.error = err; console.log = log; console.warn = warn }
}

afterEach(() => {
  vi.doUnmock('@anthropic-ai/sdk'); vi.doUnmock('@kind/db')
  vi.doUnmock('../middleware/auth'); vi.doUnmock('./brief-draft')
  vi.resetModules()
})

const completeWith = (o: Record<string, unknown>) => ({
  type: 'complete', content: 'That is everything I need.',
  summary: 's', icp: { name: 'x' }, profile: {}, business: {}, brief_so_far: {}, ...o,
})
const typeOf = (d: Dispatched) => (d.json.data as { type?: string }).type
const nextOf = (d: Dispatched) =>
  (d.json.data as { brief_outstanding?: { next: { id: string; label: string } } }).brief_outstanding?.next

describe('the one authority: size answered, declined, or still needed', () => {
  it('🛑 everything but the size → NOT ready, and the size is what is missing', async () => {
    const { onboardingState } = await authority()
    const s = onboardingState(NO_SIZE)
    expect(s.state).toBe('conversing')
    expect(s.unresolvedTargeting, 'every Brief fact is held').toEqual([])
    expect(s.unresolvedAccount).toEqual(['own_size'])
    expect(s.unresolvedLabels).toEqual(['Roughly how many people work at your company'])
  })

  it('a headcount answers it', async () => {
    const { onboardingState } = await authority()
    expect(onboardingState({ ...NO_SIZE, company_employees: 12 }).state).toBe('ready')
  })

  it('a plain decline answers it too — "if a client does not we can"', async () => {
    const { onboardingState } = await authority()
    expect(onboardingState({ ...NO_SIZE, company_employees_declined: true }).state).toBe('ready')
  })

  it('silence, zero, or a false decline do NOT', async () => {
    const { onboardingState } = await authority()
    expect(onboardingState({ ...NO_SIZE, company_employees: 0 }).state).toBe('conversing')
    expect(onboardingState({ ...NO_SIZE, company_employees: null }).state).toBe('conversing')
    expect(onboardingState({ ...NO_SIZE, company_employees_declined: false }).state).toBe('conversing')
  })

  it('the confirm door refuses the same Brief', async () => {
    const { mayConfirmBrief } = await authority()
    const gate = mayConfirmBrief({ facts: NO_SIZE } as never)
    expect(gate.ok).toBe(false)
    expect(gate.missingLabels).toEqual(['Roughly how many people work at your company'])
  })

  it('it is NOT a twelfth Brief fact', async () => {
    const { onboardingState, ACCOUNT_FACTS } = await authority()
    expect(BRIEF_FACTS.length).toBe(11)
    expect([...ACCOUNT_FACTS]).toContain('own_size')
    expect(onboardingState(NO_SIZE).targeting.total).toBe(11)
  })
})

describe('🛑 Milla cannot finish without having asked', () => {
  it('a "complete" with no size is refused, and the size is what the client is asked next', async () => {
    const r = await dispatch(completeWith({ brief_so_far: NO_SIZE }))
    expect(typeOf(r)).toBe('outstanding')
    expect(nextOf(r)).toEqual({ id: 'own_size', label: 'Roughly how many people work at your company' })
    expect((r.json.data as { icp?: unknown }).icp, 'no plan is proposed').toBeUndefined()
  })

  it('the size given in the same turn finishes it, and is kept', async () => {
    const r = await dispatch(completeWith({ brief_so_far: { ...NO_SIZE, company_employees: 12 } }))
    expect(typeOf(r)).toBe('complete')
    expect(r.store.company_employees).toBe(12)
  })

  it('the size given in an EARLIER turn counts — never asked twice', async () => {
    const r = await dispatch(completeWith({ brief_so_far: {} }), { held: { ...NO_SIZE, company_employees: 12 } })
    expect(typeOf(r)).toBe('complete')
  })

  it('a plain decline finishes it, and the decline is kept for the person who sets it', async () => {
    const r = await dispatch(completeWith({ brief_so_far: { ...NO_SIZE, company_employees_declined: true } }))
    expect(typeOf(r)).toBe('complete')
    expect(r.store.company_employees_declined).toBe(true)
  })
})

describe('what Milla is told', () => {
  const ICPS = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
  it('ask it early, ask once more if skipped, and only a plain "rather not" is a decline', () => {
    expect(ICPS).toContain('You may not finish without having asked: if they skip it,')
    expect(ICPS).toContain('"company_employees_declined": true and move on')
    expect(ICPS).toContain("company_employees_declined: { type: 'boolean', description: 'true ONLY when you asked")
    expect(ICPS).not.toContain('If they would rather not say, move on: we check it ourselves.')
  })
})
