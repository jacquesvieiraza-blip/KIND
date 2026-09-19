// ═══════════════════════════════════════════════════════════════════════════════════════
// A DRAFT STORE THAT IS NOT THERE MUST NOT END THE JOURNEY (19 Sep)
//
// 🛑 WHAT EARNED THIS, AND IT IS THE SECOND DOOR OF THE SAME DEAD END. The chat was fixed
// the same day: a failed `saveBriefDraft` used to withhold Milla's completion and show the
// client *"Milla didn't catch that — just try again in a moment"*, on a refusal that was
// identical on every retry. The founder reversed it (*"yes agreed"*).
//
// ⚠️ THAT FIX ALONE WOULD HAVE MOVED THE WALL, NOT REMOVED IT. `POST /milla/brief-draft/confirm`
// answered `unstorable` — which INCLUDED "the draft store could not be read at all" — with
// **503 retryable**, and `welcome/page.tsx` stops the journey on any status that is not 404 or
// 409. So a client whose `onboarding_brief_drafts` table is missing would now finish the
// conversation, see the plan, press Confirm, and be told *"please try again"* for ever.
//
// 🛑 THE PORTAL ALREADY EXPECTED THE OTHER ANSWER. Its own comment, unchanged since it was
// written: *"404 IS NOT A FAILURE. A client whose draft predates this table, OR WHOSE DRAFT
// COULD NOT BE STORED, has nothing to confirm; promotion then behaves exactly as it did
// before drafts existed."* The behaviour was specified; the server sent a status that could
// not reach it.
//
// ⚠️ AND THE SPLIT IS THE CARE HERE. `store_unavailable` (the READ failed — no readable draft
// exists for anybody) degrades to the pre-draft path. `unstorable` (the row is right there and
// the `confirmed_at` stamp would not write) stays 503-retryable, because a retry genuinely can
// succeed and a 404 would push that client into `/auth/onboard` only to be refused again with
// "this brief has not been confirmed yet". Two different failures, two different answers.
// ═══════════════════════════════════════════════════════════════════════════════════════

process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = join(__dirname, '../../../..')

type ConfirmReason = 'no_draft' | 'promoted' | 'incomplete' | 'unstorable' | 'store_unavailable'

type Dispatched = {
  status: number
  json: Record<string, unknown>
  alerts: Array<{ kind: string; about?: Record<string, unknown> }>
}

/** Drives the REAL route with `confirmBriefDraft` returning one exact outcome. */
async function dispatch(reason: ConfirmReason): Promise<Dispatched> {
  vi.resetModules()
  const alerts: Dispatched['alerts'] = []

  vi.doMock('@kind/db', () => ({
    db: { from: () => { throw new Error('the confirm route must not touch the database directly') },
      rpc: async () => ({ data: null, error: null }) },
  }))
  vi.doMock('../middleware/auth', () => ({
    requireAuth: (req: { userId?: string }, _r: unknown, n: () => void) => {
      ;(req as { userId?: string }).userId = 'owner-user'; n()
    },
  }))
  vi.doMock('./brief-draft', async () => {
    const actual = await vi.importActual<typeof import('./brief-draft')>('./brief-draft')
    return { ...actual, confirmBriefDraft: async () => ({ ok: false, reason }) }
  })
  vi.doMock('./alerts', async () => {
    const actual = await vi.importActual<typeof import('./alerts')>('./alerts')
    return {
      ...actual,
      sendFounderAlert: async (kind: string, _s: string, _l: string[], about?: Record<string, unknown>) => {
        alerts.push({ kind, about })
        return { delivered: true, emailOk: true, slackOk: false, durableOk: true, taskOk: true }
      },
    }
  })

  const err = console.error, log = console.log, warn = console.warn
  console.error = () => {}; console.log = () => {}; console.warn = () => {}
  try {
    const { millaRouter } = await import('../routes/milla')
    const express = (await import('express')).default
    const { createServer, request } = await import('http')
    const app = express(); app.use(express.json()); app.use('/milla', millaRouter)
    const server = createServer(app)
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
    const port = (server.address() as { port: number }).port
    try {
      const out = await new Promise<{ status: number; json: Record<string, unknown> }>((resolve, reject) => {
        const r = request({
          host: '127.0.0.1', port, path: '/milla/brief-draft/confirm', method: 'POST',
          headers: { 'content-type': 'application/json', 'content-length': '2', authorization: 'Bearer t' },
        }, res => {
          let raw = ''
          res.on('data', c => { raw += c })
          res.on('end', () => {
            let json: Record<string, unknown> = {}
            try { json = JSON.parse(raw) } catch { json = { raw } }
            resolve({ status: res.statusCode ?? 0, json })
          })
        })
        r.on('error', reject); r.write('{}'); r.end()
      })
      // 🛑 THE ALERT IS DELIBERATELY NOT AWAITED INTO THE RESPONSE — that is the contract, so
      // it has NOT landed when the client is answered. It arrives after a dynamic `import()`
      // resolves, which is several ticks, so this waits for it rather than sampling once.
      for (let i = 0; i < 50 && alerts.length === 0; i++) {
        await new Promise<void>(r => setTimeout(r, 5))
      }
      return { ...out, alerts }
    } finally { await new Promise<void>(r => server.close(() => r())) }
  } finally { console.error = err; console.log = log; console.warn = warn }
}

afterEach(() => {
  vi.doUnmock('@kind/db'); vi.doUnmock('../middleware/auth')
  vi.doUnmock('./brief-draft'); vi.doUnmock('./alerts')
  vi.resetModules()
})

describe('the Confirm door when the draft store cannot be read', () => {
  it('🛑 IT IS 404 — the one status the portal can carry the client through', async () => {
    const d = await dispatch('store_unavailable')

    // 404 and 409 are the two the portal tolerates; everything else ends the journey.
    expect(d.status, 'the client is stopped at Confirm by a store that is simply absent').toBe(404)
  })

  it('🛑 AND IT IS NOT SILENT — the founder is told and Vida gets one task', async () => {
    const d = await dispatch('store_unavailable')

    const raised = d.alerts.filter(a => a.kind === 'brief_write_failed')
    expect(raised.length, 'a store outage nobody is told about').toBe(1)
    // One condition, one row — every client hitting it must not file its own task.
    expect(raised[0].about?.dedupeKey).toBe('brief_write_failed:store_unavailable:owner-user')
  })

  it('🛑 A STAMP THAT WOULD NOT WRITE IS STILL RETRYABLE — the split is load-bearing', async () => {
    // The row is right there and readable; the UPDATE failed. A retry can genuinely succeed,
    // and 404 here would push this client into `/auth/onboard` to be refused again with
    // "this brief has not been confirmed yet" — a worse stranding than the one being fixed.
    const d = await dispatch('unstorable')

    expect(d.status).toBe(503)
    expect((d.json as { retryable?: boolean }).retryable).toBe(true)
    expect(d.alerts.length, 'a transient stamp failure is not a store outage').toBe(0)
  })

  it('an absent draft answers exactly as it always did', async () => {
    const d = await dispatch('no_draft')

    expect(d.status).toBe(404)
    expect(d.alerts.length, 'a client who never had a draft is not an incident').toBe(0)
  })

  it('🛑 AND THE PRODUCT REFUSALS ARE UNMOVED — this loosened infrastructure, not the gates', async () => {
    // An incomplete Brief is a real refusal about the client's own answers. If this fix had
    // reached it, we would be creating clients we cannot serve — the exact thing S1-RT-006
    // and the eleven-fact gate exist to prevent.
    const d = await dispatch('incomplete')

    expect(d.status, 'the eleven-fact gate was loosened by an infrastructure fix').toBe(400)
  })
})

describe('the contract is in the source, not only in behaviour', () => {
  it('the read-side failure has its own reason, separate from the write-side one', () => {
    const draft = readFileSync(join(REPO, 'apps/api/src/lib/brief-draft.ts'), 'utf8')
    expect(draft, 'the two unlike failures share one reason again')
      .toContain("if (!read.ok) return { ok: false, reason: 'store_unavailable' }")
  })

  it('🛑 THE PORTAL STILL TREATS 404 AS "CARRY ON" — this fix depends entirely on it', () => {
    // If this tolerance is ever removed, the 404 above becomes a dead end again and this
    // whole repair silently stops working. It is asserted here so that edit cannot be quiet.
    const page = readFileSync(join(REPO, 'apps/portal/src/app/(milla)/milla/welcome/page.tsx'), 'utf8')
    expect(page).toMatch(/if \(st !== 404 && st !== 409\)/)
  })
})
