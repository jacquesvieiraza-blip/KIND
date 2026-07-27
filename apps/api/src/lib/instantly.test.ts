import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// THE NETWORK HALF, WITH THE NETWORK MOCKED. No real sends, per the prompt.
//
// What is worth testing here is not "does fetch work" — it is the three things that would
// hurt: the key leaking into a log or a response, an unexpected shape being coerced into a
// confident-looking empty list, and a PLAN limit being reported as a code fault.

const calls: Array<{ url: string; init: RequestInit }> = []
let respond: () => { status: number; body: string }

beforeEach(() => {
  calls.length = 0
  process.env.INSTANTLY_API_KEY = 'sk_live_SECRET_VALUE_123'
  respond = () => ({ status: 200, body: '[]' })
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init })
    const r = respond()
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      text: async () => r.body,
    } as unknown as Response
  })
})
afterEach(() => { vi.unstubAllGlobals(); delete process.env.INSTANTLY_API_KEY })

async function lib() { return await import('./instantly') }

describe('the key', () => {
  it('is sent as a bearer token, and appears in NOTHING else', async () => {
    const { listAccounts } = await lib()
    await listAccounts()
    expect(calls[0].init.headers).toMatchObject({ Authorization: 'Bearer sk_live_SECRET_VALUE_123' })
    expect(calls[0].url).not.toContain('sk_live')   // never in a query string
  })

  it('is scrubbed out of any error text before it can reach a log or a response', async () => {
    // An API that echoes the key back in its error body is not hypothetical, and a raw
    // console.error would put a live credential into a log aggregator permanently.
    const { redact } = await lib()
    expect(redact('failed with key sk_live_SECRET_VALUE_123 oops'))
      .toBe('failed with key [INSTANTLY_API_KEY] oops')
  })

  it('an error returned to a caller never carries the key', async () => {
    respond = () => ({ status: 500, body: 'bad key sk_live_SECRET_VALUE_123' })
    const { listAccounts } = await lib()
    const r = await listAccounts()
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error).not.toContain('sk_live_SECRET_VALUE_123')
    expect(!r.ok && r.error).toContain('[INSTANTLY_API_KEY]')
  })

  it('with no key set, it refuses instead of calling with an empty bearer', async () => {
    delete process.env.INSTANTLY_API_KEY
    vi.resetModules()
    const { listAccounts, instantlyConfigured } = await import('./instantly')
    expect(instantlyConfigured()).toBe(false)
    const r = await listAccounts()
    expect(r.ok).toBe(false)
    expect(calls).toHaveLength(0)      // nothing was sent
  })
})

describe('a PLAN limit is reported as a plan limit, not a bug', () => {
  it('402 says the Growth plan is required', async () => {
    respond = () => ({ status: 402, body: 'upgrade required' })
    const { listAccounts } = await lib()
    const r = await listAccounts()
    expect(!r.ok && r.error).toContain('Growth plan')
    expect(!r.ok && r.error).toContain('plan limit, not a code fault')
  })

  it('403 says the same — both mean the workspace cannot use v2', async () => {
    respond = () => ({ status: 403, body: 'forbidden' })
    const { listAccounts } = await lib()
    expect(!(await listAccounts()).ok).toBe(true)
    respond = () => ({ status: 403, body: 'forbidden' })
    const r = await (await lib()).listAccounts()
    expect(!r.ok && r.error).toContain('Growth plan')
  })

  it('a 500 does NOT claim to be a plan limit', async () => {
    respond = () => ({ status: 500, body: 'server error' })
    const r = await (await lib()).listAccounts()
    expect(!r.ok && r.error).not.toContain('Growth plan')
  })
})

describe('unexpected shapes are reported, never coerced to an empty list', () => {
  it('accepts a bare array', async () => {
    respond = () => ({ status: 200, body: JSON.stringify([{ email: 'a@b.com' }]) })
    const r = await (await lib()).listAccounts()
    expect(r.ok && r.data).toHaveLength(1)
  })

  it('accepts the { items: [...] } wrapper v2 list endpoints use', async () => {
    respond = () => ({ status: 200, body: JSON.stringify({ items: [{ email: 'a@b.com' }] }) })
    const r = await (await lib()).listAccounts()
    expect(r.ok && r.data).toHaveLength(1)
  })

  it('an unrecognised shape FAILS rather than reporting zero mailboxes', async () => {
    // This is the one that matters. Silently returning [] would render "0 mailboxes
    // connected" on the System screen as though it had been measured — the exact
    // empty-is-not-broken failure this project keeps finding.
    respond = () => ({ status: 200, body: JSON.stringify({ mailboxes: [{ email: 'a@b.com' }] }) })
    const r = await (await lib()).listAccounts()
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error).toContain('unrecognised shape')
  })

  it('a non-JSON body is reported as such', async () => {
    respond = () => ({ status: 200, body: '<html>maintenance</html>' })
    const r = await (await lib()).listAccounts()
    expect(!r.ok && r.error).toContain('not JSON')
  })
})

describe('NOT_POSSIBLE is stated in code, not discovered later', () => {
  it('names the plan limit, the unverified reply endpoint, and the absent rate limit', async () => {
    const { NOT_POSSIBLE } = await lib()
    const all = NOT_POSSIBLE.map(n => `${n.what} ${n.why}`).join(' ').toLowerCase()
    expect(all).toContain('growth plan')
    expect(all).toContain('repl')
    expect(all).toContain('rate limit')
    expect(NOT_POSSIBLE.length).toBeGreaterThanOrEqual(4)
  })
})
