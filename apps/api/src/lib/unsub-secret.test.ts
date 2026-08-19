import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── HC-2 — THE UNSUBSCRIBE SIGNING KEY STOPS FALLING BACK TO A PUBLISHED STRING ───────────
//
// The secret that signs every unsubscribe link fell through a four-rung ladder ending in a
// constant published in this repository.
//
// ⚠️ FIRST, THE CORRECTION — because the hard-check write-up overstated this and a test file is
// where an overstatement gets frozen into folklore. HC-2 was logged as "tokens may be signed
// with a string anyone can read". That rung is effectively UNREACHABLE on a running production
// API: it needs UNSUBSCRIBE_SECRET, ADMIN_SECRET_KEY *and* RESEND_API_KEY all unset, and
// RESEND_API_KEY is boot-critical, so the process would not have started. The REAL defect is
// the middle rung — with UNSUBSCRIBE_SECRET unset, the ADMIN key silently becomes the signing
// key. One secret doing two jobs: rotate the admin key and every unsubscribe link ever sent
// stops verifying, and anyone holding the admin key can mint them.
//
// Founder-ruled 19 Aug: boot-critical, and the signer FAILS CLOSED in production.

const ENV_KEYS = ['UNSUBSCRIBE_SECRET', 'ADMIN_SECRET_KEY', 'RESEND_API_KEY', 'NODE_ENV', 'IS_STAGING'] as const
let saved: Record<string, string | undefined> = {}

/**
 * No cache-busting needed: `resolveUnsubSecret()` reads process.env on every call rather than
 * freezing it in a module constant at import. That refactor is what makes this testable at all
 * — the old `const UNSUB_SECRET = ...` baked the value in before any test could set an env var,
 * so the production refusal could never have been proven to fire.
 *
 * (The first version of this file did use `import('./deliverability?ts=' + Math.random())`. The
 * query string made Vite treat the file as raw text, so it failed to parse TypeScript at all —
 * 10 of 14 cases died on a transform error rather than on anything to do with the code.)
 */
async function freshModule() {
  return await import('./deliverability')
}

beforeEach(() => {
  saved = {}
  for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k] }
})
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

describe('HC-2 — which rung of the ladder actually supplies the secret', () => {
  it('a dedicated UNSUBSCRIBE_SECRET wins over everything else', async () => {
    process.env.UNSUBSCRIBE_SECRET = 'dedicated-value'
    process.env.ADMIN_SECRET_KEY   = 'admin-value'
    const { resolveUnsubSecret } = await freshModule()
    expect(resolveUnsubSecret()).toEqual({ secret: 'dedicated-value', source: 'dedicated' })
  })

  it('THE REAL DEFECT — with it unset, the ADMIN key becomes the unsubscribe signing key', async () => {
    process.env.ADMIN_SECRET_KEY = 'admin-value'
    const { resolveUnsubSecret } = await freshModule()
    const r = resolveUnsubSecret()
    expect(r.source).toBe('admin_key')
    expect(r.secret).toBe('admin-value')   // one secret, two jobs — this is what HC-2 really was
  })

  it('and below that, the Resend key — which is why the published constant is near-unreachable', async () => {
    process.env.RESEND_API_KEY = 'resend-value'
    const { resolveUnsubSecret } = await freshModule()
    expect(resolveUnsubSecret().source).toBe('resend_key')
  })
})

describe('HC-2 RED PROOF — the signer refuses in production and only in production', () => {
  it('OLD behaviour: with every env unset it SIGNED with the published constant — the bug', async () => {
    // No envs set at all: the old code produced a token here without complaint. Reproduced by
    // signing outside production, which still uses that exact constant.
    const { unsubscribeToken } = await freshModule()
    expect(unsubscribeToken('a@b.com')).toMatch(/^[\w-]+\.[\w-]{24}$/)   // ← signs happily
  })

  it('NEW behaviour: the same state in PRODUCTION refuses to sign', async () => {
    process.env.NODE_ENV = 'production'
    const { unsubscribeToken } = await freshModule()
    expect(() => unsubscribeToken('a@b.com')).toThrow(/UNSUBSCRIBE_SECRET is not set/)
  })

  it('production WITH the secret set signs normally — the guard must not block the happy path', async () => {
    process.env.NODE_ENV = 'production'
    process.env.UNSUBSCRIBE_SECRET = 'a-real-long-random-secret'
    const { unsubscribeToken, verifyUnsubscribeToken } = await freshModule()
    const t = unsubscribeToken('Person@Acme.com')
    expect(verifyUnsubscribeToken(t)).toBe('person@acme.com')   // round-trip, and normalised
  })

  it('production falling back to the ADMIN key still signs — this PR does not break today', async () => {
    // Deliberate. The admin-key rung is a defect worth closing, not a reason to stop a send
    // mid-flight on the deploy that ships this. Only the published constant refuses.
    process.env.NODE_ENV = 'production'
    process.env.ADMIN_SECRET_KEY = 'admin-value'
    const { unsubscribeToken } = await freshModule()
    expect(() => unsubscribeToken('a@b.com')).not.toThrow()
  })

  it('STAGING is exempt — a preview deploy that cannot send is a preview nobody can walk', async () => {
    process.env.NODE_ENV = 'production'
    process.env.IS_STAGING = 'true'
    const { unsubscribeToken } = await freshModule()
    expect(() => unsubscribeToken('a@b.com')).not.toThrow()
  })
})

describe('HC-2 — VERIFY stays permissive, on purpose', () => {
  it('a link already in somebody inbox still verifies in production without the secret set', async () => {
    // Sign in dev with the constant...
    const dev = await freshModule()
    const token = dev.unsubscribeToken('someone@acme.com')

    // ...then verify on a production API that has no secret set. Signing there refuses;
    // verifying must NOT, because the person clicking is trying to OPT OUT. Refusing to honour
    // an opt-out is the one failure this whole area exists to prevent.
    process.env.NODE_ENV = 'production'
    const prod = await freshModule()
    expect(() => prod.unsubscribeToken('x@y.com')).toThrow()
    expect(prod.verifyUnsubscribeToken(token)).toBe('someone@acme.com')
  })

  it('a forged signature is still rejected', async () => {
    const { verifyUnsubscribeToken } = await freshModule()
    expect(verifyUnsubscribeToken('aGVsbG8.notarealsignature000')).toBeNull()
    expect(verifyUnsubscribeToken('')).toBeNull()
    expect(verifyUnsubscribeToken('nodot')).toBeNull()
  })
})

describe('HC-2 — the boot check is loud, in BOTH homes', () => {
  const ROOT = join(__dirname, '../../../..')
  const check = readFileSync(join(__dirname, 'startup-check.ts'), 'utf8')
  const doc   = readFileSync(join(ROOT, 'docs/ENVIRONMENT.md'), 'utf8')

  it('startup-check treats it as CRITICAL — the API refuses to start without it', () => {
    expect(check).toMatch(/key: 'UNSUBSCRIBE_SECRET',\s*level: 'critical'/)
  })

  it('critical really does abort the boot — the tier is not decorative', () => {
    expect(check).toContain('Startup aborted')
    expect(check).toMatch(/if \(level === 'critical'\)\s+missing\.push\(spec\)/)
  })

  it('ENVIRONMENT.md lists it under Required, not Important — the doc is the other home', () => {
    const requiredBlock = doc.slice(doc.indexOf('### 🔴 Required'), doc.indexOf('### 🟠 Important'))
    expect(requiredBlock).toContain('`UNSUBSCRIBE_SECRET`')
    const importantBlock = doc.slice(doc.indexOf('### 🟠 Important'), doc.indexOf('### ⚪ Optional'))
    expect(importantBlock).not.toContain('`UNSUBSCRIBE_SECRET`')
  })

  it('staging still boots — only the two Supabase vars stay hard-critical there', () => {
    expect(check).toContain("const STAGING_CRITICAL = new Set(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])")
  })
})
