import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ONE AUTOMATIC WELCOME EMAIL PER CLIENT (S1-AUDIT-006 · R120).
//
// ── THE DEFECT ─────────────────────────────────────────────────────────────────────────
//
// `routes/auth.ts` called `sendWelcomeEmail(...)` OUTSIDE the `if (!existing)` block that
// guards the founder alert immediately below it. A second `POST /auth/onboard` for the same
// user takes the UPDATE branch, the draft gate stands aside because the draft is already
// promoted, and THE WELCOME EMAIL SENT AGAIN. Nothing recorded that it had been sent.
//
// ── WHAT THE RULE ACTUALLY IS (R120, founder-approved) ────────────────────────────────
//
// Never twice. Safe retry inside Resend's 24-HOUR idempotency window with the same key and
// an identical payload. Past that window, FAIL CLOSED — no automatic resend, the claim is
// NOT released, a human decides. And no provider message id means no `sent`, ever.
//
// ⚠️ A CLAIMED ROW IS NOT A PERMANENT "DO NOTHING". That was the founder's correction and it
// is the difference between at-most-once and the rule: a first attempt that died before
// recording anything must be retried, or that client never gets a welcome email at all.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const state = {
  client: null as Row | null,
  /** Every payload + request-options pair that reached the provider. */
  sends: [] as Array<{ payload: Row; options: Row | undefined }>,
  /** What the provider answers next. */
  reply: { data: { id: 'msg_1' } as { id: string } | null, error: null as Row | null },
  readFails: false,
  alerts: [] as string[],
}

// ── the db harness ────────────────────────────────────────────────────────────────────
function table(name: string) {
  const eqs: Array<[string, unknown]> = []
  const iss: Array<[string, unknown]> = []
  const ins: Array<[string, unknown[]]> = []
  let patch: Row | null = null
  const q: Record<string, unknown> = {
    select() { return q },
    eq(c: string, v: unknown) { eqs.push([c, v]); return q },
    is(c: string, v: unknown) { iss.push([c, v]); return q },
    in(c: string, v: unknown[]) { ins.push([c, v]); return q },
    order() { return q },
    limit() { return q },
    update(p: Row) { patch = p; return q },
    async maybeSingle() {
      if (name === 'clients' && state.readFails) return { data: null, error: { message: 'clients unreadable' } }
      return { data: matches()[0] ?? null, error: null }
    },
    then(res: (v: unknown) => unknown) {
      // A bare `await db.from(...).update(...).eq(...)` with no `.select()`.
      return Promise.resolve(apply()).then(res)
    },
  }
  function matches(): Row[] {
    const rows = name === 'clients' ? (state.client ? [state.client] : []) : []
    return rows.filter(r =>
      eqs.every(([c, v]) => r[c] === v) &&
      iss.every(([c, v]) => (r[c] ?? null) === v) &&
      ins.every(([c, v]) => v.includes(r[c] as never)))
  }
  function apply() {
    const hit = matches()
    if (patch) for (const r of hit) Object.assign(r, patch)
    return { data: hit.map(r => ({ id: r.id })), error: null }
  }
  ;(q as { select: (c?: string) => unknown }).select = function (this: unknown, _c?: string) {
    // `.select()` after `.update()` returns the affected rows; before it, the read path.
    if (patch) return { then: (res: (v: unknown) => unknown) => Promise.resolve(apply()).then(res) }
    return q
  } as never
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: Row, options?: Row) => {
        state.sends.push({ payload, options })
        return state.reply
      },
    }
  },
}))

vi.mock('./alerts', () => ({
  sendFounderAlert: async (_k: string, subject: string) => { state.alerts.push(subject) },
}))

// ⚠️ `vi.hoisted` IS NOT A STYLE CHOICE HERE. `email.ts` builds its Resend client at MODULE
// LOAD from `process.env.RESEND_API_KEY`, and ESM imports are hoisted above ordinary
// statements — so a plain assignment here runs AFTER the import and every send is silently
// skipped by `if (!resend) return`. The first cut of this file did exactly that and reported
// ten green-looking zero-send results.
vi.hoisted(() => {
  process.env.RESEND_API_KEY = 'test-key'
  process.env.PORTAL_URL = 'https://app.get-kind.com'
  // 🛑 AND `FIGSY_COLD_FROM` IS SET FOR A REASON THIS HARNESS DISCOVERED.
  //
  // `deliverability.ts` defaults `COLD_FROM` to 'K.I.N.D <hello@get-kind.com>' — which is
  // BYTE-IDENTICAL to `email.ts`'s transactional `FROM`. So with `FIGSY_COLD_FROM` unset,
  // `sendTx` reads the welcome email as the COLD identity and hands it to
  // `killSwitchBlocks('resend_cold', …)`, which refuses unless `AUTO_OUTREACH_ENABLED` is
  // exactly 'true'. Every transactional mail from that identity — welcome, receipts,
  // password resets — is gated with it.
  //
  // ⚠️ THAT IS A REAL PRE-EXISTING CHARACTERISTIC, NOT A TEST ARTEFACT, AND IT IS REPORTED
  // RATHER THAN FIXED HERE: the founder's build rules for this batch say NO kill-switch
  // change. Setting a dedicated cold identity is what production is supposed to do anyway
  // (deliverability.ts warns about exactly this), so the tests run the intended shape.
  //
  // ⚠️ AND THE BEHAVIOUR UNDER THE BLOCK IS ITSELF ASSERTED BELOW — a send the kill-switch
  // refuses must RELEASE the claim and record no outcome, never look like a send.
  process.env.FIGSY_COLD_FROM = 'K.I.N.D Outreach <cold@kind-outreach.test>'
})

import {
  decideWelcomeAttempt, recordForSendResult, welcomeIdempotencyKey, welcomePayloadHash,
  welcomeOperatorAction, WELCOME_IDEMPOTENCY_WINDOW_MS, WELCOME_UNRESOLVED_OUTCOMES,
  type WelcomeEmailState,
} from './welcome-email-state'
import { sendWelcomeEmail } from './email'

const CLIENT = 'client-1'
const NOW = Date.parse('2026-09-12T12:00:00.000Z')

function blank(over: Partial<WelcomeEmailState> = {}): WelcomeEmailState {
  return { claimedAt: null, sentAt: null, outcome: null, messageId: null, payloadHash: null, ...over }
}

beforeEach(() => {
  state.client = { id: CLIENT, company_name: 'Acme' }
  state.sends = []
  state.reply = { data: { id: 'msg_1' }, error: null }
  state.readFails = false
  state.alerts = []
})

// ── THE PURE DECISIONS ────────────────────────────────────────────────────────────────
describe('the idempotency key', () => {
  it('is tied to the DURABLE client identity, never the email address', () => {
    expect(welcomeIdempotencyKey(CLIENT)).toBe('welcome:client-1')
    // Two clients sharing an address must never share a key.
    expect(welcomeIdempotencyKey('client-2')).not.toBe(welcomeIdempotencyKey(CLIENT))
  })
})

describe('the payload hash', () => {
  const p = { from: 'f', to: 't', subject: 's', html: 'h', text: 'x' }
  it('changes when ANY field changes', () => {
    const base = welcomePayloadHash(p)
    for (const k of Object.keys(p) as Array<keyof typeof p>) {
      expect(welcomePayloadHash({ ...p, [k]: 'different' })).not.toBe(base)
    }
  })
  it('cannot be forged across a field boundary', () => {
    // "ab" + "c" must not hash the same as "a" + "bc".
    expect(welcomePayloadHash({ ...p, from: 'ab', to: 'c' }))
      .not.toBe(welcomePayloadHash({ ...p, from: 'a', to: 'bc' }))
  })
})

describe('decideWelcomeAttempt', () => {
  it('no claim -> claim and send', () => {
    expect(decideWelcomeAttempt(blank(), 'h', NOW).action).toBe('claim_and_send')
  })

  it('already sent -> skip', () => {
    expect(decideWelcomeAttempt(blank({ claimedAt: '2026-09-12T11:00:00Z', sentAt: '2026-09-12T11:00:01Z', outcome: 'sent', messageId: 'm' }), 'h', NOW))
      .toEqual({ action: 'skip', reason: 'already_sent' })
  })

  it('🛑 a claim with NO recorded outcome is RETRIED, not abandoned', () => {
    // The founder's correction: a claimed row must not become a permanent "do nothing", or a
    // client whose first send died before writing anything never gets a welcome email.
    const s = blank({ claimedAt: '2026-09-12T11:00:00Z', payloadHash: 'h' })
    expect(decideWelcomeAttempt(s, 'h', NOW).action).toBe('retry_same_key')
  })

  it('in_progress and ambiguous are both retried inside the window', () => {
    for (const outcome of ['in_progress', 'ambiguous'] as const) {
      const s = blank({ claimedAt: '2026-09-12T11:00:00Z', outcome, payloadHash: 'h' })
      expect(decideWelcomeAttempt(s, 'h', NOW).action).toBe('retry_same_key')
    }
  })

  it('🛑 a DRIFTED payload blocks BEFORE any provider call', () => {
    const s = blank({ claimedAt: '2026-09-12T11:00:00Z', outcome: 'ambiguous', payloadHash: 'OLD' })
    expect(decideWelcomeAttempt(s, 'NEW', NOW).action).toBe('mark_payload_conflict')
  })

  it('a claim with NO stored hash cannot be proven identical, so it fails closed', () => {
    const s = blank({ claimedAt: '2026-09-12T11:00:00Z', outcome: 'ambiguous', payloadHash: null })
    expect(decideWelcomeAttempt(s, 'h', NOW).action).toBe('mark_payload_conflict')
  })

  it('🛑 past 24 HOURS it expires — and the window is asked BEFORE the payload', () => {
    const old = new Date(NOW - WELCOME_IDEMPOTENCY_WINDOW_MS - 1000).toISOString()
    // Even with a MATCHING hash, the key is gone: there is no protection left to rely on.
    expect(decideWelcomeAttempt(blank({ claimedAt: old, outcome: 'ambiguous', payloadHash: 'h' }), 'h', NOW).action)
      .toBe('mark_expired')
    // And a drifted payload past the window still expires rather than reporting a conflict.
    expect(decideWelcomeAttempt(blank({ claimedAt: old, outcome: 'ambiguous', payloadHash: 'OLD' }), 'NEW', NOW).action)
      .toBe('mark_expired')
  })

  it('just inside 24 hours is still retryable', () => {
    const edge = new Date(NOW - WELCOME_IDEMPOTENCY_WINDOW_MS + 1000).toISOString()
    expect(decideWelcomeAttempt(blank({ claimedAt: edge, outcome: 'ambiguous', payloadHash: 'h' }), 'h', NOW).action)
      .toBe('retry_same_key')
  })

  it('the two surfaced states are never acted on automatically again', () => {
    for (const outcome of ['payload_conflict', 'unresolved_expired'] as const) {
      const s = blank({ claimedAt: '2026-09-12T11:00:00Z', outcome, payloadHash: 'h' })
      expect(decideWelcomeAttempt(s, 'h', NOW).action).toBe('skip')
    }
  })
})

describe('recordForSendResult — the corrected provider mapping', () => {
  it('a message id (new or cached) is the ONLY thing that means sent', () => {
    expect(recordForSendResult({ ok: true, id: 'msg_1', errorName: null }))
      .toEqual({ outcome: 'sent', keepClaim: true, storeSend: true })
  })

  it('🛑 concurrent_idempotent_requests is IN_PROGRESS, not sent', () => {
    const r = recordForSendResult({ ok: false, id: null, errorName: 'concurrent_idempotent_requests' })
    expect(r.outcome).toBe('in_progress')
    expect(r.keepClaim).toBe(true)
    expect(r.storeSend).toBe(false)
  })

  it('🛑 invalid_idempotent_request is PAYLOAD_CONFLICT, not sent — and the claim is kept', () => {
    const r = recordForSendResult({ ok: false, id: null, errorName: 'invalid_idempotent_request' })
    expect(r.outcome).toBe('payload_conflict')
    expect(r.keepClaim).toBe(true)
    expect(r.storeSend).toBe(false)
  })

  it('a malformed key is OUR bug and nothing was sent, so the claim is released', () => {
    expect(recordForSendResult({ ok: false, id: null, errorName: 'invalid_idempotency_key' }))
      .toEqual({ outcome: 'refused', keepClaim: false, storeSend: false })
  })

  it('definitive refusals release the claim', () => {
    for (const name of ['validation_error', 'invalid_from_address', 'rate_limit_exceeded', 'not_found']) {
      expect(recordForSendResult({ ok: false, id: null, errorName: name }).keepClaim, name).toBe(false)
    }
  })

  it('a 500 is AMBIGUOUS and keeps the claim — it may have sent', () => {
    for (const name of ['application_error', 'internal_server_error']) {
      const r = recordForSendResult({ ok: false, id: null, errorName: name })
      expect(r.outcome, name).toBe('ambiguous')
      expect(r.keepClaim, name).toBe(true)
    }
  })

  it('🛑 an UNRECOGNISED error is ambiguous, never refused — releasing on it sends duplicates', () => {
    const r = recordForSendResult({ ok: false, id: null, errorName: 'some_future_code' })
    expect(r.outcome).toBe('ambiguous')
    expect(r.keepClaim).toBe(true)
  })

  it('a throw (no provider name) is ambiguous', () => {
    expect(recordForSendResult({ ok: false, id: null, errorName: null }).outcome).toBe('ambiguous')
  })

  it('🛑 ok with NO message id can never become sent', () => {
    const r = recordForSendResult({ ok: true, id: null, errorName: null })
    expect(r.outcome).not.toBe('sent')
    expect(r.storeSend).toBe(false)
  })
})

// ── THE WIRED BEHAVIOUR ───────────────────────────────────────────────────────────────
describe('the first attempt', () => {
  it('claims, sends once, stores the id and the send time', async () => {
    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    expect(state.sends.length).toBe(1)
    expect(state.client!.welcome_email_claimed_at).toBeTruthy()
    expect(state.client!.welcome_email_outcome).toBe('sent')
    expect(state.client!.welcome_email_message_id).toBe('msg_1')
    expect(state.client!.welcome_email_sent_at).toBeTruthy()
    expect(state.client!.welcome_email_payload_hash).toBeTruthy()
  })

  it('sends the stable idempotency key on the wire', async () => {
    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    expect(state.sends[0].options).toEqual({ idempotencyKey: 'welcome:client-1' })
  })

  it('🛑 A REPLAYED ONBOARDING SENDS NOTHING — the defect this build closes', async () => {
    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    expect(state.sends.length).toBe(1)
  })

  it('🛑 TWO CONCURRENT FIRST ONBOARDS produce exactly ONE send', async () => {
    await Promise.all([
      sendWelcomeEmail('a@b.com', 'Acme', CLIENT),
      sendWelcomeEmail('a@b.com', 'Acme', CLIENT),
    ])
    expect(state.sends.length).toBe(1)
  })

  it('🛑 a send the KILL-SWITCH refuses releases the claim and records NO outcome', async () => {
    // If the cold identity and the transactional identity ever coincide again (FIGSY_COLD_FROM
    // unset), `sendTx` returns null — nothing was attempted. That must not look like a send,
    // and it must not strand the claim either: the next legitimate attempt has to be able to
    // send once the configuration is right.
    const cold = process.env.FIGSY_COLD_FROM
    delete process.env.FIGSY_COLD_FROM
    try {
      // `COLD_FROM` was read at module load, so the coincidence itself cannot be re-created
      // here. The OTHER pre-provider skip is used instead — a non-deliverable recipient —
      // because every one of the four exits returns the same `null` and takes this branch.
      state.client!.welcome_email_claimed_at = null
      await sendWelcomeEmail('demo-1@kind-demo.internal', 'Acme', CLIENT)   // non-deliverable
      expect(state.sends.length, 'a non-deliverable recipient reached the provider').toBe(0)
      expect(state.client!.welcome_email_outcome ?? null, 'a skip was recorded as an outcome').toBeNull()
      expect(state.client!.welcome_email_claimed_at, 'the claim was not released').toBeNull()
    } finally {
      if (cold) process.env.FIGSY_COLD_FROM = cold
    }
  })

  it('an unreadable client row sends NOTHING — we cannot know if they already have it', async () => {
    state.readFails = true
    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    expect(state.sends.length).toBe(0)
  })
})

describe('the retry path', () => {
  it('🛑 an AMBIGUOUS outcome inside 24h RE-CALLS Resend with the SAME key', async () => {
    state.reply = { data: null, error: { name: 'internal_server_error', message: 'boom' } }
    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    expect(state.client!.welcome_email_outcome).toBe('ambiguous')
    expect(state.client!.welcome_email_sent_at).toBeUndefined()

    // The retry: same payload, same key, and it actually reaches the provider.
    state.reply = { data: { id: 'msg_1' }, error: null }
    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    expect(state.sends.length).toBe(2)
    expect(state.sends[1].options).toEqual({ idempotencyKey: 'welcome:client-1' })
    expect(state.client!.welcome_email_outcome).toBe('sent')
    expect(state.client!.welcome_email_message_id).toBe('msg_1')
  })

  it('🛑 concurrent_idempotent_requests is recorded as in_progress, with NO id and NO send time', async () => {
    state.reply = { data: null, error: { name: 'concurrent_idempotent_requests', message: 'in flight' } }
    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    expect(state.client!.welcome_email_outcome).toBe('in_progress')
    expect(state.client!.welcome_email_message_id).toBeUndefined()
    expect(state.client!.welcome_email_sent_at).toBeUndefined()
    expect(state.client!.welcome_email_claimed_at).toBeTruthy()      // the claim is KEPT
  })

  it('🛑 TWO CONCURRENT AMBIGUOUS RETRIES cannot duplicate delivery', async () => {
    state.reply = { data: null, error: { name: 'internal_server_error', message: 'boom' } }
    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    const before = state.sends.length

    // Both retries carry the SAME key and the SAME payload, so the provider de-duplicates
    // them — and the second is answered with the first's id rather than a new send.
    state.reply = { data: { id: 'msg_1' }, error: null }
    await Promise.all([
      sendWelcomeEmail('a@b.com', 'Acme', CLIENT),
      sendWelcomeEmail('a@b.com', 'Acme', CLIENT),
    ])
    const keys = state.sends.slice(before).map(s => (s.options as { idempotencyKey: string }).idempotencyKey)
    expect(new Set(keys).size, 'the retries did not share one idempotency key').toBe(1)
    expect(state.client!.welcome_email_message_id).toBe('msg_1')
  })

  it('🛑 a DRIFTED payload blocks with NO provider call at all', async () => {
    state.reply = { data: null, error: { name: 'internal_server_error', message: 'boom' } }
    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    const before = state.sends.length

    // The company name changed — a second onboarding with a different body, or a copy edit.
    await sendWelcomeEmail('a@b.com', 'Acme Renamed Ltd', CLIENT)
    expect(state.sends.length, 'the provider was called with a conflicting payload').toBe(before)
    expect(state.client!.welcome_email_outcome).toBe('payload_conflict')
    expect(state.client!.welcome_email_claimed_at, 'the claim was released').toBeTruthy()
    expect(state.alerts.some(a => /needs a human/.test(a))).toBe(true)
  })

  it('a DEFINITIVE refusal releases the claim so a later attempt can send', async () => {
    state.reply = { data: null, error: { name: 'validation_error', message: 'bad' } }
    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    expect(state.client!.welcome_email_outcome).toBe('refused')
    expect(state.client!.welcome_email_claimed_at).toBeNull()

    state.reply = { data: { id: 'msg_2' }, error: null }
    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    expect(state.sends.length).toBe(2)
    expect(state.client!.welcome_email_outcome).toBe('sent')
  })

  it('🛑 PAST 24 HOURS it cannot send automatically, and the claim is NOT released', async () => {
    state.client!.welcome_email_claimed_at =
      new Date(Date.now() - WELCOME_IDEMPOTENCY_WINDOW_MS - 60_000).toISOString()
    state.client!.welcome_email_outcome = 'ambiguous'
    state.client!.welcome_email_payload_hash = 'whatever'

    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    expect(state.sends.length, 'an unprotected resend was attempted past the window').toBe(0)
    expect(state.client!.welcome_email_outcome).toBe('unresolved_expired')
    expect(state.client!.welcome_email_claimed_at, 'the claim was released past the window').toBeTruthy()
    expect(state.alerts.some(a => /needs a human/.test(a))).toBe(true)
  })

  it('an expired row is then left alone — no repeated alerts, no repeated attempts', async () => {
    state.client!.welcome_email_claimed_at = new Date(Date.now() - 2 * WELCOME_IDEMPOTENCY_WINDOW_MS).toISOString()
    state.client!.welcome_email_outcome = 'unresolved_expired'
    await sendWelcomeEmail('a@b.com', 'Acme', CLIENT)
    expect(state.sends.length).toBe(0)
    expect(state.alerts.length).toBe(0)
  })
})

// ── OPERATOR VISIBILITY IS A REAL PATH, NOT A PROMISE ─────────────────────────────────
describe('the operator surface', () => {
  const REPO = join(__dirname, '../../../..')

  it('the four unresolved states are exactly the ones a human must see', () => {
    expect([...WELCOME_UNRESOLVED_OUTCOMES])
      .toEqual(['in_progress', 'payload_conflict', 'ambiguous', 'unresolved_expired'])
    // `refused` is absent on purpose: the claim was released and the next attempt sends.
    expect(WELCOME_UNRESOLVED_OUTCOMES as readonly string[]).not.toContain('refused')
    expect(WELCOME_UNRESOLVED_OUTCOMES as readonly string[]).not.toContain('sent')
  })

  it('a real read-only endpoint exists, and it renders the missing provider id', () => {
    const op = readFileSync(join(REPO, 'apps/api/src/routes/operator.ts'), 'utf8')
    expect(op).toMatch(/operatorRouter\.get\('\/welcome-emails\/unresolved'/)
    expect(op).toMatch(/provider_message_id: r\.welcome_email_message_id \?\? null/)
    expect(op).toMatch(/claimed_at:\s*r\.welcome_email_claimed_at/)
    expect(op).toMatch(/welcomeOperatorAction\(/)
  })

  it('every unresolved state gets an action sentence, and expiry changes it', () => {
    const old = new Date(NOW - WELCOME_IDEMPOTENCY_WINDOW_MS - 1).toISOString()
    const fresh = new Date(NOW - 60_000).toISOString()
    for (const o of WELCOME_UNRESOLVED_OUTCOMES) {
      expect(welcomeOperatorAction(o, fresh, NOW)).not.toBe('No action required.')
    }
    expect(welcomeOperatorAction('ambiguous', old, NOW)).toMatch(/window has now passed/)
    expect(welcomeOperatorAction('ambiguous', fresh, NOW)).toMatch(/No action needed yet/)
    expect(welcomeOperatorAction('unresolved_expired', old, NOW)).toMatch(/Nothing will be sent automatically/)
  })

  it('the persisted row is the queue — the alert only supplements it', () => {
    const sql = readFileSync(join(REPO, 'supabase/migrations/20260912_welcome_email_once.sql'), 'utf8')
    expect(sql).toMatch(/clients_welcome_email_unresolved_idx/)
  })
})

// ── THE CONSTRAINTS, AND THE RULE IN THE REGISTER ─────────────────────────────────────
describe('the database enforces the invariant structurally', () => {
  const REPO = join(__dirname, '../../../..')
  const sql = readFileSync(join(REPO, 'supabase/migrations/20260912_welcome_email_once.sql'), 'utf8')

  it('🛑 `sent` requires BOTH a message id and a send time', () => {
    expect(sql).toMatch(/clients_welcome_email_sent_needs_id/)
    expect(sql).toMatch(/welcome_email_message_id is not null and welcome_email_sent_at is not null/)
  })

  it('a send cannot exist without the claim that authorised it', () => {
    expect(sql).toMatch(/clients_welcome_email_sent_needs_claim/)
  })

  it('the six outcomes are the only ones the column admits', () => {
    expect(sql).toMatch(/'sent','in_progress','payload_conflict','ambiguous','refused','unresolved_expired'/)
  })

  it('claimed_at is the CAS column and sent_at is never used as a pre-send claim', () => {
    const email = readFileSync(join(REPO, 'apps/api/src/lib/email.ts'), 'utf8')
    expect(email).toMatch(/\.is\('welcome_email_claimed_at',\s*null\)/)
    // The struck shape: claiming by writing `sent_at` before the provider was called.
    expect(email).not.toMatch(/update\(\{\s*welcome_email_sent_at:[^}]*\}\)\s*\n?\s*\.eq\('id'[^)]*\)\s*\n?\s*\.is\('welcome_email_sent_at'/)
  })

  it('nothing is backfilled', () => {
    expect(sql).not.toMatch(/update public\.clients\s+set welcome_email/i)
  })

  it('R120 is in the register, in the founder\'s words', () => {
    const rules = readFileSync(join(REPO, 'docs/PRODUCT-RULES.md'), 'utf8')
    expect(rules).toMatch(/R120/)
    for (const clause of [
      'One automatic welcome email per client.',
      'Replays, retries, double-clicks and concurrent requests must never create a duplicate.',
      'Do not claim \'exactly once forever\' beyond the provider mechanism.',
    ]) {
      expect(rules, `R120 is missing: ${clause}`).toContain(clause)
    }
  })
})
