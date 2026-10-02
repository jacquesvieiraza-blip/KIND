// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R185 ⑦ · card #2548 · S8) — THE CLIENT'S PAUSE ANSWERS AT ONCE AND CHECKS IT SAVED.
//
// R185 ⑦: *"The client's Pause answers at once and checks that it saved"* (*"yes. lock"*).
// On 2 Oct the founder pressed Pause and Milla said "Request timed out" over a pause that had
// worked — the route waited for the founder alert email first, and the portal gives up at 15s.
// And `pauseProgramme` never looked at its own write, so a pause that did not save said "paused".
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const state = { writeError: null as null | { message: string }, writes: [] as Record<string, unknown>[] }

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q },
        update(row: Record<string, unknown>) { state.writes.push(row); return q },
        async maybeSingle() {
          return { data: { id: 'prog-1', client_id: 'c1', status: 'LIVE', paused_at: null }, error: null }
        },
        then(r: (v: unknown) => unknown) { return Promise.resolve({ data: null, error: state.writeError }).then(r) },
      }
      return q
    },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: async () => ({ delivered: true }) }))

beforeEach(() => { state.writeError = null; state.writes = [] })

describe('the save is checked — Pause and Resume never claim a change that did not land', () => {
  it('🛑 a pause whose save failed says "Not paused — nothing changed"', async () => {
    state.writeError = { message: 'connection reset' }
    const { pauseProgramme } = await import('./programme')
    const r = await pauseProgramme('prog-1', 'client')
    expect(r.ok).toBe(false)
    expect(!r.ok && r.reason).toMatch(/^Not paused — .*nothing changed/i)
  })

  it('a pause that saved says paused', async () => {
    const { pauseProgramme } = await import('./programme')
    expect((await pauseProgramme('prog-1', 'client')).ok).toBe(true)
    expect(state.writes[0]).toMatchObject({ pause_reason: 'client' })
  })

  it('🛑 a resume whose save failed says it is still paused', async () => {
    state.writeError = { message: 'connection reset' }
    const { resumeProgramme } = await import('./programme')
    const r = await resumeProgramme('prog-1')
    expect(r.ok).toBe(false)
    expect(!r.ok && r.reason).toMatch(/Not resumed — .*still paused/i)
  })
})

describe('the client is answered the moment the pause is saved', () => {
  const src = readFileSync(join(__dirname, '..', 'routes', 'my-programme.ts'), 'utf8')
  const route = src.slice(src.indexOf("myProgrammeRouter.post('/pause'"), src.indexOf("myProgrammeRouter.post('/meetings/challenge'"))

  it('🛑 the answer goes BEFORE the founder alert, and the alert is never awaited by the request', () => {
    const answered = route.indexOf('res.json({ success: true, data: { paused: true } })')
    const alerted = route.indexOf('sendFounderAlert(')
    expect(answered, 'the route no longer answers a successful pause').toBeGreaterThan(-1)
    expect(answered, 'the client still waits for the alert email before hearing back').toBeLessThan(alerted)
    expect(route).toContain('void (async () => {')
    expect(route).not.toMatch(/await sendFounderAlert\('support_escalation'[\s\S]*res\.json\(\{ success: true, data: \{ paused: true \} \}\)/)
  })
})

describe('Milla shows the server\'s sentence, not its code', () => {
  const realFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = realFetch })

  it('🛑 a refused pause reads "Not paused — …", never "not_paused"', async () => {
    globalThis.fetch = (async () => new Response(
      JSON.stringify({ success: false, error: 'not_paused', message: 'Not paused — the change did not save, so nothing changed. Please try again.' }),
      { status: 409, headers: { 'content-type': 'application/json' } })) as typeof fetch
    const { api } = await import('../../../portal/src/lib/api')
    await expect(api.post('/my-programme/pause', {}, 'token')).rejects.toThrow(/^Not paused — /)
  })

  it('a route that sends only a sentence in `error` still shows it, as before', async () => {
    globalThis.fetch = (async () => new Response(
      JSON.stringify({ success: false, error: 'Client not found' }),
      { status: 404, headers: { 'content-type': 'application/json' } })) as typeof fetch
    const { api } = await import('../../../portal/src/lib/api')
    await expect(api.get('/x', 'token')).rejects.toThrow('Client not found')
  })
})
