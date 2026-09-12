import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// MVP1 BRIEF — THE TWO SIGNUP DEFECTS, DRIVEN THROUGH THE REAL /onboard HANDLER.
//
// ① C27 — `clients.contact_email` HAS NO WRITER, AND CHECKOUT REFUSES WITHOUT IT.
//
//    The column exists (schema.sql:532, migration 20260710) and TWO money routes read it
//    before they will mint a Stripe session: `routes/programme.ts:49` and
//    `routes/my-programme.ts:247`. Both fail closed — deliberately, because Stripe accepts a
//    session with no `customer_email` and the client would simply never receive a receipt.
//
//    🛑 NOTHING ANYWHERE WRITES IT. So on today's code every client reaches Programme, is
//    shown a price, presses pay — and the route answers "this client has no contact email".
//    Payment 1 is unreachable for every client who has ever signed up, which makes every
//    stage after it unreachable too. This is the single highest-leverage line in the Brief
//    package: without it the approved MVP1 flow stops at stage 3 for everybody.
//
//    The address is not a new fact to collect. It is `user.email` — the address they
//    authenticated with, already in hand at the top of the handler, and the correct one to
//    receipt to.
//
// ② C22 — A SECOND ONBOARDING EMAIL, SENT BY A FIRE-AND-FORGET fetch().
//
//    `sendWelcomeEmail` is the onboarding email. The handler ALSO posts to
//    `/founder/cs/followup`, which generates a CS follow-up with a model and sends it to the
//    same client. The MVP1 rule is one onboarding/welcome email; this is the second.
//
//    ⚠️ THE ROUTE ITSELF IS NOT DELETED. An operator may still send a follow-up on purpose.
//    What is removed is the automatic call fired at signup that nobody chose.
//
// Both are asserted against the REAL handler, because the lesson this repo keeps relearning
// is that a helper can be right and the route can call it wrong.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const state = {
  authEmail: 'ellis@redmayne.co.uk' as string | null,
  /** an existing clients row for this user, or null for a first signup */
  existingClient: null as Row | null,
  /** every insert, by table */
  inserts: [] as { table: string; row: Row }[],
  /** every update, by table */
  updates: [] as { table: string; patch: Row }[],
  existingSub: null as Row | null,
  /** every outbound fetch the handler fired */
  fetches: [] as string[],
  /** every welcome email the handler sent */
  welcomes: [] as { to: string; company: string }[],
  /** the caller's brief draft, or null for a journey that never had one */
  draft: null as Record<string, unknown> | null,
  confirmable: { ok: true, missing: [] as string[] },
  /** every client id the draft was sealed against */
  sealed: [] as string[],
}

function query(table: string) {
  const q: Record<string, unknown> = {
    select() { return q },
    eq() { return q },
    async maybeSingle() {
      if (table === 'clients') return { data: state.existingClient, error: null }
      if (table === 'subscriptions') return { data: state.existingSub, error: null }
      return { data: null, error: null }
    },
    insert(row: Row) {
      state.inserts.push({ table, row })
      const made = { id: 'client-new', ...row }
      return {
        select: () => ({ async single() { return { data: made, error: null } } }),
        then: (r: (v: unknown) => unknown) => r({ data: null, error: null }),
      }
    },
    upsert(row: Row) {
      state.inserts.push({ table, row })
      return { then: (r: (v: unknown) => unknown) => r({ data: null, error: null }) }
    },
    update(patch: Row) {
      state.updates.push({ table, patch })
      const made = { id: (state.existingClient?.id as string) ?? 'client-new', ...patch }
      return {
        eq: () => ({
          select: () => ({ async single() { return { data: made, error: null } } }),
          then: (r: (v: unknown) => unknown) => r({ error: null }),
        }),
        then: (r: (v: unknown) => unknown) => r({ error: null }),
      }
    },
    then(resolve: (v: unknown) => unknown) { return resolve({ data: [], error: null }) },
  }
  return q
}

// ⚑ MVP1 — the promotion gate reads the draft before it creates anything. These cases are
// about the ACCOUNT half, so the draft is absent by default: `briefDraftFor` answers null and
// the gate stands aside, exactly as it does for a legacy client re-onboarding.
vi.mock('../lib/brief-draft', () => ({
  briefDraftFor: async () => state.draft,
  mayConfirmBrief: () => state.confirmable,
  markBriefDraftPromoted: async (_u: string, c: string) => { state.sealed.push(c); return { ok: true } },
}))
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => query(t),
    auth: {
      getUser: async () => ({
        data: { user: state.authEmail ? { id: 'user-1', email: state.authEmail } : null },
        error: state.authEmail ? null : { message: 'no user' },
      }),
    },
  },
}))
vi.mock('../lib/email', () => ({
  sendWelcomeEmail: async (to: string, company: string) => { state.welcomes.push({ to, company }) },
}))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: async () => {} }))
vi.mock('../lib/rate-limit', () => ({ rateLimit: () => (_q: unknown, _s: unknown, n: () => void) => n() }))

async function onboard(body: Row) {
  const { authRouter } = await import('./auth')
  const layer = (authRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/onboard' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /onboard not found on the auth router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: { code: number; payload: Row } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { res.code = c; return fakeRes },
    json(p: Row) { res.payload = p; return fakeRes },
  }
  await handler(
    { body, headers: { authorization: 'Bearer t' }, socket: { remoteAddress: '1.2.3.4' } },
    fakeRes, () => {},
  )
  // the handler fires `sendWelcomeEmail(...).catch()` without awaiting
  await new Promise(r => setTimeout(r, 0))
  return res
}

const BODY = {
  company_name: 'Redmayne & Co.',
  country: 'United Kingdom',
  contact_name: 'Ellis Warner',
  website: 'https://redmayne.co.uk',
  terms_accepted: true,
}

/** every patch this handler applied to `clients`, merged — the row as it ends up */
const clientRow = () => ({
  ...(state.inserts.find(i => i.table === 'clients')?.row ?? {}),
  ...state.updates.filter(u => u.table === 'clients').reduce((a, u) => ({ ...a, ...u.patch }), {}),
})

beforeEach(() => {
  vi.resetModules()
  state.authEmail = 'ellis@redmayne.co.uk'
  state.existingClient = null
  state.inserts = []
  state.updates = []
  state.existingSub = null
  state.fetches = []
  state.welcomes = []
  state.draft = null
  state.confirmable = { ok: true, missing: [] }
  state.sealed = []
  vi.stubGlobal('fetch', async (url: string) => {
    state.fetches.push(String(url))
    return { ok: true, json: async () => ({}) } as unknown as Response
  })
})

describe('① C27 — the client is reachable for checkout', () => {
  it('🛑 a first signup persists contact_email from the authenticated user', async () => {
    const res = await onboard(BODY)
    expect(res.code).toBe(200)
    expect(clientRow().contact_email).toBe('ellis@redmayne.co.uk')
  })

  it('a returning client who re-onboards still ends up with an address', async () => {
    state.existingClient = { id: 'client-1', signup_terms_accepted_at: null }
    await onboard(BODY)
    expect(clientRow().contact_email).toBe('ellis@redmayne.co.uk')
  })

  // ⚠️ NEVER CLOBBER AN ADDRESS SOMEBODY CORRECTED BY HAND. The authenticated address is the
  // default, not an override: an operator who fixed a typo in Vida must not have it undone
  // the next time the client touches onboarding. Fill when empty, leave alone when set.
  it('an address already on the row is left exactly as it is', async () => {
    state.existingClient = {
      id: 'client-1', signup_terms_accepted_at: null, contact_email: 'accounts@redmayne.co.uk',
    }
    await onboard(BODY)
    const patched = state.updates
      .filter(u => u.table === 'clients')
      .some(u => 'contact_email' in u.patch)
    expect(patched, 'a stored address must not be overwritten by the login address').toBe(false)
  })

  it('the address is trimmed and bounded, never stored raw', async () => {
    state.authEmail = `  ${'a'.repeat(400)}@redmayne.co.uk  `
    await onboard(BODY)
    const stored = String(clientRow().contact_email ?? '')
    expect(stored.startsWith(' ')).toBe(false)
    expect(stored.length).toBeLessThanOrEqual(320)
  })
})

describe('② C22 — exactly one onboarding email', () => {
  it('the welcome email is sent', async () => {
    await onboard(BODY)
    expect(state.welcomes).toHaveLength(1)
    expect(state.welcomes[0].to).toBe('ellis@redmayne.co.uk')
  })

  it('🛑 nothing calls /founder/cs/followup at signup', async () => {
    await onboard(BODY)
    const followups = state.fetches.filter(u => u.includes('/founder/cs/followup'))
    expect(followups, `a second onboarding email was fired: ${followups.join(', ')}`).toHaveLength(0)
  })

  it('the handler fires no outbound HTTP call of any kind at signup', async () => {
    await onboard(BODY)
    expect(state.fetches).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ PROMOTION — GATED ON THE ELEVEN, AND IDEMPOTENT
//
// ⚠️ THE GATE IS THE SERVER'S. This handler turns a draft Brief into a client, an ICP and a
// Proof run. A disabled button in the portal is not what stops an incomplete brief from being
// promoted; this is.
//
// ⚠️ AND IT REFUSES BEFORE ANYTHING IS CREATED. A partial state where the client exists,
// promotion is stamped and the brief was never complete seals the person out of their own
// Brief with no working account — strictly worse than a clean refusal.
// ═══════════════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ MVP1 — 12 · WHAT THEY SAID THEY WANT SURVIVES PROMOTION, IN THEIR OWN WORDS.
//
// 🛑 THE SENTENCE IS THE CLIENT'S AND THE CLASSIFICATION IS OURS. If the request could name
// the `kind`, a screen could declare a "meetings" outcome for an answer that never mentioned
// one — and a meeting target would later be agreed against it.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ 12 · the desired outcome reaches the client row', () => {
  it('the client’s own sentence is stored verbatim', async () => {
    await onboard({ ...BODY, outcome_stated: 'Book qualified meetings with founders and MDs.' })
    expect(clientRow().outcome_stated).toBe('Book qualified meetings with founders and MDs.')
  })

  it('and the KIND is DERIVED here, never accepted from the request', async () => {
    await onboard({
      ...BODY,
      outcome_stated: 'Book qualified meetings with founders and MDs.',
      // A screen trying to declare the classification itself. It must be ignored.
      outcome_kind: 'event',
    })
    expect(clientRow().outcome_kind).toBe('meetings')
  })

  it('🛑 an absent outcome is left absent — nothing is invented on their behalf', async () => {
    await onboard(BODY)
    expect(clientRow().outcome_stated).toBeUndefined()
    expect(clientRow().outcome_kind).toBeUndefined()
  })
})

describe('③ promotion is gated and idempotent', () => {
  // ⚑ MVP1 — A DRAFT THE CLIENT HAS CONFIRMED. `confirmedAt` is load-bearing: eleven facts
  // are not permission to promote, and the handler refuses a draft without it (see the
  // "eleven facts are not a confirmation" cases below).
  const withDraft = (ok: boolean, missing: string[] = []) => {
    state.draft = { promotedClientId: null, confirmedAt: '2026-09-11T16:41:00Z' }
    state.confirmable = { ok, missing }
  }

  it('🛑 an incomplete brief is refused, and NOTHING is created', async () => {
    withDraft(false, ['company_type'])
    const res = await onboard(BODY)
    expect(res.code).toBe(400)
    expect(state.inserts.filter(i => i.table === 'clients')).toHaveLength(0)
    expect(state.sealed, 'nothing may be sealed on a refusal').toEqual([])
    expect(state.welcomes, 'no welcome email for an account that was not opened').toEqual([])
  })

  it('the refusal names what is still missing', async () => {
    withDraft(false, ['company_type'])
    const res = await onboard(BODY)
    expect(String(res.payload.error)).toContain('Company type')
  })

  it('a complete brief promotes, and the draft is sealed AFTER the client exists', async () => {
    withDraft(true)
    const res = await onboard(BODY)
    expect(res.code).toBe(200)
    expect(state.inserts.filter(i => i.table === 'clients')).toHaveLength(1)
    expect(state.sealed).toEqual(['client-new'])
  })

  it('🛑 7 · promotion retried cannot create a SECOND client', async () => {
    withDraft(true)
    await onboard(BODY)
    // The retry finds the client that now exists and takes the update branch.
    state.existingClient = { id: 'client-new', signup_terms_accepted_at: null, contact_email: 'ellis@redmayne.co.uk' }
    state.inserts = []
    const res = await onboard(BODY)
    expect(res.code).toBe(200)
    expect(state.inserts.filter(i => i.table === 'clients'), 'a retry inserted a second client').toHaveLength(0)
  })

  // ── 🛑 ⚑ MVP1 — ELEVEN FACTS ARE NOT A CONFIRMATION ─────────────────────────────────
  //
  // Proof is sourced against this brief and the $299 is asked for on the strength of it, so
  // the client's agreement has to be an ACT. Never a count, never silence, never the fact
  // that a browser got as far as calling this route.
  it('🛑 6 · a COMPLETE but UNCONFIRMED brief is refused, and nothing is created', async () => {
    state.draft = { promotedClientId: null, confirmedAt: null }
    state.confirmable = { ok: true, missing: [] }
    const res = await onboard(BODY)
    expect(res.code).toBe(400)
    expect(res.payload.needs_confirmation).toBe(true)
    expect(state.inserts.filter(i => i.table === 'clients'), 'a client was created without consent').toHaveLength(0)
    expect(state.sealed, 'nothing may be sealed without a confirmation').toEqual([])
    expect(state.welcomes, 'no welcome email for an account that was not opened').toEqual([])
  })

  it('🛑 14 · and nothing downstream of promotion runs either — no subscription row', async () => {
    state.draft = { promotedClientId: null, confirmedAt: null }
    state.confirmable = { ok: true, missing: [] }
    await onboard(BODY)
    expect(state.inserts.filter(i => i.table === 'subscriptions')).toHaveLength(0)
  })

  it('the same brief promotes the moment it IS confirmed', async () => {
    state.draft = { promotedClientId: null, confirmedAt: '2026-09-11T16:41:00Z' }
    state.confirmable = { ok: true, missing: [] }
    const res = await onboard(BODY)
    expect(res.code).toBe(200)
    expect(state.inserts.filter(i => i.table === 'clients')).toHaveLength(1)
  })

  it('a journey with no draft is untouched — legacy re-onboarding still works', async () => {
    state.draft = null
    const res = await onboard(BODY)
    expect(res.code).toBe(200)
    expect(state.sealed, 'nothing to seal when there was never a draft').toEqual([])
  })

  it('an already-promoted draft is not re-sealed', async () => {
    state.draft = { promotedClientId: 'client-old' }
    const res = await onboard(BODY)
    expect(res.code).toBe(200)
    expect(state.sealed).toEqual([])
  })
})
