// ══════════════════════════════════════════════════════════════════════════════════════════
// J1-C3 · THE REFERRAL AND THE T&C TICK ARE PERSISTED AT SIGNUP, SERVER-SIDE
//
// ── THE DEFECT: A BINDING LEGAL RECORD LIVES IN `localStorage` ──────────────────────────
//
// Both facts are established at SIGNUP and neither reaches the server until `/auth/onboard`,
// which is after the whole of Milla's first-run conversation:
//
//     login/page.tsx:73    localStorage.setItem('kind_referral', ref)
//     login/page.tsx:111   localStorage.setItem('kind_terms_accepted', '1')
//     milla/welcome        reads both back and posts them to /auth/onboard
//
// 🛑 SO THE EVIDENCE THAT SOMEBODY ACCEPTED OUR TERMS IS A BROWSER KEY. A client who ticks the
// box, signs up, and finishes their brief in a different browser — or on their phone, or after
// clearing site data, or in a private window — gets an account with NO consent record at all.
// Nothing fails, nothing is logged, and the row simply has `signup_terms_accepted_at: null`
// for ever. Item 186 created that column so that "even a trial user who never pays has proof
// of acceptance"; the proof was being couriered by the client.
//
// ⚠️ AND THE REFERRAL HAS THE SAME WINDOW WITH A DIFFERENT COST. `referred_by` is written ONLY
// on the insert and deliberately never updated (P4), so a partner referral lost in that gap is
// unrecoverable — the partner is never paid and nobody can tell it happened.
//
// ── AND THE TIMESTAMP WAS WRONG EVEN WHEN IT WORKED ─────────────────────────────────────
//
// `signup_terms_accepted_at` was stamped `now` — the moment the client finished their brief,
// which can be days after they actually ticked the box. A consent record should say when
// consent was given.
//
// ⚠️ THE FALLBACK IS KEPT, DELIBERATELY. A client mid-signup when this deploys has the old
// browser keys and no metadata, and must not lose their consent to the fix for losing consent.
// The body is a FALLBACK now, never the authority.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>

const store = vi.hoisted(() => ({
  created: [] as Row[],
  users: {} as Record<string, Row>,
  clients: [] as Row[],
  seq: 0,
}))

vi.mock('@kind/db', () => {
  const from = (t: string) => {
    const f: ((r: Row) => boolean)[] = []
    const rows = () => (t === 'clients' ? store.clients : [])
    const q: Record<string, unknown> = {
      select() { return q },
      eq(c: string, v: unknown) { f.push(r => r[c] === v); return q },
      is() { return q }, in() { return q }, not() { return q }, order() { return q }, limit() { return q },
      async maybeSingle() { return { data: rows().filter(r => f.every(fn => fn(r)))[0] ?? null, error: null } },
      insert(row: Row) {
        const made = { id: `c-${++store.seq}`, ...row }
        store.clients.push(made)
        const done = { data: made, error: null as unknown }
        return {
          select: () => ({ async single() { return done }, async maybeSingle() { return done } }),
          then: (res: (v: unknown) => unknown) => res(done),
        }
      },
      then(res: (v: unknown) => unknown) { return res({ data: rows().filter(r => f.every(fn => fn(r))), error: null }) },
    }
    return q
  }
  return {
    db: {
      from,
      auth: {
        admin: {
          createUser: async (input: Row) => {
            store.created.push(input)
            const id = `user-${++store.seq}`
            store.users[id] = { id, user_metadata: input.user_metadata ?? {} }
            return { data: { user: store.users[id] }, error: null }
          },
        },
      },
    },
  }
})

beforeEach(() => {
  store.created = []; store.users = {}; store.clients = []; store.seq = 0
  vi.resetModules()
})

describe('J1-C3 · signup records what signup knows', () => {
  async function signup(body: Row) {
    const { authRouter } = await import('../routes/auth')
    const layer = (authRouter as unknown as {
      stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
    }).stack.find(l => l.route?.path === '/signup' && l.route?.methods.post)
    if (!layer?.route) throw new Error('POST /auth/signup not found')
    const handler = layer.route.stack[layer.route.stack.length - 1].handle
    const out: { code: number; payload: Row } = { code: 200, payload: {} }
    const res = { status(c: number) { out.code = c; return res }, json(p: Row) { out.payload = p; return res } }
    await handler({ body, headers: {}, socket: { remoteAddress: '203.0.113.9' } }, res, () => {})
    return out
  }

  it('🛑 the T&C tick is persisted AT SIGNUP, not couriered by the browser', async () => {
    const r = await signup({ email: 'ada@redmayne.co.uk', password: 'hunter2hunter2', terms_accepted: true })
    expect(r.code, `signup refused: ${JSON.stringify(r.payload)}`).toBe(200)
    const meta = (store.created[0]?.user_metadata ?? {}) as Row
    expect(
      meta.signup_terms_accepted_at,
      'the only record that this client accepted our terms is a localStorage key — a different '
      + 'browser, a private window or cleared site data and the account has no consent at all',
    ).toBeTruthy()
  })

  it('🛑 the recorded moment is when they TICKED, not when they finished their brief', async () => {
    // A consent record should say when consent was given. `signup_terms_accepted_at` was
    // stamped `now` at onboard, which can be days later.
    const before = Date.now()
    await signup({ email: 'ada@redmayne.co.uk', password: 'hunter2hunter2', terms_accepted: true })
    const at = String(((store.created[0].user_metadata ?? {}) as Row).signup_terms_accepted_at)
    expect(Date.parse(at)).toBeGreaterThanOrEqual(before - 5_000)
    expect(Date.parse(at)).toBeLessThanOrEqual(Date.now() + 5_000)
  })

  it('the IP is recorded with it — a consent record with no origin is weaker evidence', async () => {
    await signup({ email: 'ada@redmayne.co.uk', password: 'hunter2hunter2', terms_accepted: true })
    const meta = (store.created[0].user_metadata ?? {}) as Row
    expect(meta.signup_terms_accepted_ip).toBe('203.0.113.9')
  })

  it('🛑 the REFERRAL is persisted at signup too — it can never be set again afterwards', async () => {
    await signup({ email: 'ada@redmayne.co.uk', password: 'hunter2hunter2', referred_by: 'PARTNER1' })
    const meta = (store.created[0].user_metadata ?? {}) as Row
    expect(
      meta.referred_by,
      'a partner referral still depends on the browser remembering it across the whole brief '
      + 'conversation, and `referred_by` is written once and never updated',
    ).toBe('PARTNER1')
  })

  it('a signup that ticks nothing records nothing — absence is not a consent', async () => {
    await signup({ email: 'ada@redmayne.co.uk', password: 'hunter2hunter2' })
    const meta = (store.created[0].user_metadata ?? {}) as Row
    expect(meta.signup_terms_accepted_at, 'a consent was invented for somebody who gave none').toBeFalsy()
    expect(meta.referred_by).toBeFalsy()
  })

  it('🛑 `terms_accepted: false` is NOT a consent either', async () => {
    await signup({ email: 'ada@redmayne.co.uk', password: 'hunter2hunter2', terms_accepted: false })
    const meta = (store.created[0].user_metadata ?? {}) as Row
    expect(meta.signup_terms_accepted_at).toBeFalsy()
  })

  it('an unusable signup still answers — recording a fact never costs somebody their account', async () => {
    // The consent write rides on account creation and must never be what fails it.
    const r = await signup({ email: 'not-an-email', password: 'x' })
    expect(r.code).toBe(400)
  })
})

describe('J1-C3 · onboard prefers the server-owned facts over the body', () => {
  const CODE = readFileSync(join(__dirname, '../routes/auth.ts'), 'utf8')
    .split('\n')
    .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
    .join('\n')
  const ONBOARD = (() => {
    const at = CODE.indexOf("authRouter.post('/onboard'")
    const next = CODE.indexOf('authRouter.', at + 30)
    return CODE.slice(at, next > at ? next : CODE.length)
  })()

  it('🛑 the consent stamp comes from the signup-time record, not from `now`', () => {
    // ⚠️ THE DECISION, NOT THE WORD. `/signupMeta|metaTermsAt/` over the whole handler was the
    // first cut and it was useless: `signupMeta` is declared at the top of the same body, so
    // the guard stayed green with the fix reverted. Found by reverting and re-running, which is
    // the only thing that ever finds this. It now reads the expression that actually decides.
    expect(
      ONBOARD,
      'onboard still stamps the consent with the moment the brief finished, which can be days '
      + 'after the client actually ticked the box',
    ).toMatch(/const consentAt = metaTermsAt \?\?/)
    expect(ONBOARD, 'the stamp no longer comes from the resolved consent moment')
      .toMatch(/signup_terms_accepted_at: consentAt/)
  })

  it('🛑 the referral falls back to the body but is not AUTHORITATIVE from it', () => {
    expect(ONBOARD, 'the browser is still the only source of the referral')
      .toMatch(/const referred_by = metaReferredBy \?\? bodyReferredBy/)
  })

  it('🛑 the PORTAL sends them at signup — a capability nobody feeds is not a fix', () => {
    const login = readFileSync(
      join(__dirname, '../../../portal/src/app/(auth)/login/page.tsx'), 'utf8',
    ).split('\n')
      .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
      .join('\n')
    const at = login.indexOf("/auth/signup")
    expect(at, 'the signup post moved — this guard must be repointed').toBeGreaterThan(-1)
    const call = login.slice(at, at + 900)
    expect(call, 'the T&C tick is still left behind in localStorage').toMatch(/terms_accepted/)
    expect(call, 'the referral is still left behind in localStorage').toMatch(/referred_by/)
  })

  it('the body is still READ — a client mid-signup when this deployed keeps their consent', () => {
    // ⚠️ THE FALLBACK IS THE POINT OF THIS CASE. Somebody who ticked the box before this
    // shipped has the old browser keys and no metadata, and must not lose their consent to
    // the fix for losing consent.
    expect(ONBOARD).toMatch(/terms_accepted/)
  })
})
