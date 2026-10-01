// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (#2050) — A HUNG DATABASE CALL ENDS IN AN ERROR, IT NEVER HANGS THE RUN.
//
// `packages/db/src/client.ts` set no request timeout. These prove the deadline with the real
// Supabase client over a fetch that never answers: the query comes back as an ERROR (so every
// caller's "unreadable → refuse" path runs), and a normal answer is untouched.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { timedFetch, dbRequestTimeoutMs, DB_REQUEST_TIMEOUT_MS_DEFAULT } from '../../../../packages/db/src/timed-fetch'

/** A database that never answers — but does stop when asked to. */
const hanging: typeof fetch = (_input, init) => new Promise((_resolve, reject) => {
  init?.signal?.addEventListener('abort', () => reject(init.signal!.reason ?? new Error('aborted')), { once: true })
})
const answering: typeof fetch = async () =>
  new Response(JSON.stringify([{ id: 'row-1' }]), { status: 200, headers: { 'content-type': 'application/json' } })

const client = (f: typeof fetch) => createClient('http://db.test', 'service-key', { auth: { persistSession: false }, global: { fetch: f } })

describe('#2050 — every database request has a deadline', () => {
  it('🛑 a database that never answers: the query returns an error, it does not hang', async () => {
    const started = Date.now()
    // `.retry(false)`: the client retries a failed READ up to 3 more times (1s · 2s · 4s backoff),
    // so in production a hang ends after at most 4 deadlines plus 7s — bounded, where before it
    // was forever. The retries are the library's; here we prove one deadline.
    const { data, error } = await client(timedFetch(50, hanging)).from('programmes').select('id').retry(false)
    expect(data).toBeNull()
    expect(error).not.toBeNull()
    expect(String(error?.message)).toMatch(/timed out after 50ms/)
    expect(Date.now() - started).toBeLessThan(2_000)
  })

  it('a normal answer comes back untouched', async () => {
    const { data, error } = await client(timedFetch(50, answering)).from('programmes').select('id')
    expect(error).toBeNull()
    expect(data).toEqual([{ id: 'row-1' }])
  })

  it('the caller\'s own abort still works', async () => {
    const ctl = new AbortController()
    const p = timedFetch(60_000, hanging)('http://db.test', { signal: ctl.signal })
    ctl.abort(new Error('caller stopped'))
    await expect(p).rejects.toThrow('caller stopped')
  })

  it('the deadline is a minute unless DB_REQUEST_TIMEOUT_MS sets a sane one', () => {
    expect(DB_REQUEST_TIMEOUT_MS_DEFAULT).toBe(60_000)
    expect(dbRequestTimeoutMs({})).toBe(60_000)
    expect(dbRequestTimeoutMs({ DB_REQUEST_TIMEOUT_MS: '15000' })).toBe(15_000)
    expect(dbRequestTimeoutMs({ DB_REQUEST_TIMEOUT_MS: '0' })).toBe(60_000)
    expect(dbRequestTimeoutMs({ DB_REQUEST_TIMEOUT_MS: 'soon' })).toBe(60_000)
  })

  it('🛑 the real client is built with the deadline', () => {
    const src = readFileSync(join(__dirname, '../../../../packages/db/src/client.ts'), 'utf8')
    expect(src).toContain('global: { fetch: timedFetch(dbRequestTimeoutMs()) }')
  })
})
