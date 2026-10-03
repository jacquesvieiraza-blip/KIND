// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R185 ⑥ · card #2545 · S5 part 2) — THE SCHEDULER WAITS FOR A RUN TO REALLY FINISH.
//
// The founder's rule: *"Alerts and logs tell the truth — … no 'failed' while a run is still
// sending."* The scheduler called each job with `fetch`, which gives up after five minutes with
// no answer. A send run longer than that was recorded as FAILED — dead-lettered, and the founder
// alerted — while it was still sending in the same process.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import http from 'node:http'

vi.mock('@kind/db', () => ({ db: { from: () => ({}), rpc: async () => ({ data: null, error: null }) } }))
vi.mock('./alerts', () => ({ sendFounderAlert: async () => ({ delivered: true }) }))

const slowServer = (delayMs: number) => new Promise<{ url: string; close: () => void }>(resolve => {
  const srv = http.createServer((_req, res) => {
    setTimeout(() => { res.setHeader('content-type', 'application/json'); res.end('{"success":true}') }, delayMs)
  })
  srv.listen(0, () => {
    const port = (srv.address() as { port: number }).port
    resolve({ url: `http://localhost:${port}/internal/x`, close: () => srv.close() })
  })
})

describe('⑥ the scheduler waits for a run to really finish', () => {
  it('an answer that takes a while is waited for and read', async () => {
    const { postInternal } = await import('../cron')
    const s = await slowServer(600)
    try {
      const r = await postInternal(s.url, 'POST', {}, 5_000)
      expect(r.status).toBe(200)
      expect(JSON.parse(r.body)).toEqual({ success: true })
    } finally { s.close() }
  })

  it('only a run that gives no answer at all within the limit is recorded as failed', async () => {
    const { postInternal } = await import('../cron')
    const s = await slowServer(1_500)
    try {
      await expect(postInternal(s.url, 'POST', {}, 200)).rejects.toThrow(/no answer/)
    } finally { s.close() }
  })

  it('🛑 the limit is far beyond the old five minutes and shorter than the gap to the next run', async () => {
    const { INTERNAL_CALL_TIMEOUT_MS } = await import('../cron')
    expect(INTERNAL_CALL_TIMEOUT_MS).toBeGreaterThan(30 * 60_000)
    expect(INTERNAL_CALL_TIMEOUT_MS).toBeLessThan(2 * 60 * 60_000)
  })

  it('🛑 the scheduler no longer calls jobs with fetch, whose five-minute cut-off logged runs as failed', () => {
    const src = readFileSync(join(__dirname, '..', 'cron.ts'), 'utf8')
    const body = src.slice(src.indexOf('async function callInternal'), src.indexOf('// ── XC-6'))
    expect(body.length, 'callInternal moved — repoint this guard').toBeGreaterThan(200)
    expect(body).not.toMatch(/\bfetch\(/)
    expect(body).toContain('await postInternal(`${API_BASE}/internal${path}`')
  })
})
