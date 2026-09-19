// ══════════════════════════════════════════════════════════════════════════════════════════
// J11-C1 · UNATTRIBUTABLE PAYMENT TASKED (LR 21)
//
// REQ: *"Missing programmeId → exception + task; Stripe retries."*
// RED: *"Stripe event without programmeId (stripped test-mode event) is silently ignored."*
// GREEN: *"Exception + operator task; Stripe retry is idempotent."*
//
// ── WHAT SILENTLY IGNORED ACTUALLY MEANT ────────────────────────────────────────────────
//
// `checkout.session.completed` is a chain of branches, each keyed on our own metadata and each
// ending in a 200. An event matching none of them fell out of the chain to the handler's final
// `res.sendStatus(200)`. So a programme payment with no `programmeId` was ANSWERED SUCCESSFULLY:
// the money is in Stripe, no payment row exists, no operator is told, and the delivery is
// permanently consumed — Stripe does not resend an event it was told was handled.
//
// ── THE THREE PROPERTIES, AND THEY ARE DIFFERENT CLAIMS ─────────────────────────────────
//
// ① THE CLASSIFIER AGREES WITH THE ROUTE IN BOTH DIRECTIONS. An exception filed about money the
//    webhook had just banked correctly teaches an operator that Needs-you cries wolf, which is
//    worse than no list. So every shape the route handles must classify as attributable, and
//    every shape it does not must classify as an exception.
// ② THE RETRY IS IDEMPOTENT, AND THE DATABASE IS WHAT MAKES IT SO — the task is keyed on the
//    STRIPE EVENT ID, which is what a redelivery repeats, so twelve retries produce one row.
// ③ NOT ONE METADATA VALUE IS COPIED INTO THE RECORD. An event we cannot attribute is one we
//    did not necessarily create; its metadata is untrusted content, and the task is read in a
//    console and pasted into resolution notes.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  unattributableReason, unattributableLines, unattributableKey, UNATTRIBUTABLE_COPY,
} from './unattributable-payment'

const code = (p: string): string =>
  readFileSync(join(__dirname, p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
    .join('\n')

const EVENT = { eventId: 'evt_1', sessionId: 'cs_1' }

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE CASE THE CONTRACT NAMES
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J11-C1 · a programme payment with no programme is an exception', () => {
  it('🛑 `programme_first` WITHOUT a programmeId is unattributable', () => {
    expect(unattributableReason({ ...EVENT, metadata: { type: 'programme_first', clientId: 'c1' } }))
      .toBe('programme_stage_without_programme')
  })

  it('🛑 and so is `programme_second`', () => {
    expect(unattributableReason({ ...EVENT, metadata: { type: 'programme_second', clientId: 'c1' } }))
      .toBe('programme_stage_without_programme')
  })

  it('🛑 A BLANK programmeId IS A MISSING ONE', () => {
    // `metadata` values are strings on the wire; an empty one reads as present to `&&` only if
    // nobody trims it, and Stripe will happily carry `programmeId=""`.
    for (const programmeId of ['', '   ', undefined, null]) {
      expect(unattributableReason({ ...EVENT, metadata: { type: 'programme_first', programmeId } }),
        String(programmeId)).toBe('programme_stage_without_programme')
    }
  })

  it('a programme payment WITH its programme is attributable — the route handles it', () => {
    expect(unattributableReason({ ...EVENT, metadata: { type: 'programme_first', programmeId: 'p1' } }))
      .toBeNull()
    expect(unattributableReason({ ...EVENT, metadata: { type: 'programme_second', programmeId: 'p1' } }))
      .toBeNull()
  })

  it('🛑 THE STRIPPED TEST-MODE EVENT — no metadata at all — is its own reason', () => {
    expect(unattributableReason({ ...EVENT, metadata: {} })).toBe('no_metadata')
    expect(unattributableReason({ ...EVENT, metadata: null })).toBe('no_metadata')
    expect(unattributableReason(EVENT)).toBe('no_metadata')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② THE CLASSIFIER AGREES WITH THE ROUTE, IN BOTH DIRECTIONS
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J11-C1 · it files nothing about money the webhook handled', () => {
  const HANDLED: [string, Record<string, unknown>][] = [
    ['a subscription checkout', { type: 'subscription', clientId: 'c1', product: 'milla' }],
    ['a wallet top-up', { type: 'wallet_topup', clientId: 'c1', amountUsd: '400' }],
    ['a credit purchase', { clientId: 'c1', credits: '500', creditType: 'lead_gen' }],
  ]

  for (const [what, metadata] of HANDLED) {
    it(`${what} is attributable`, () => {
      expect(unattributableReason({ ...EVENT, metadata }), `${what} would file a false exception`)
        .toBeNull()
    })
  }

  const NOT_HANDLED: [string, Record<string, unknown>][] = [
    ['a subscription with no product', { type: 'subscription', clientId: 'c1' }],
    ['a top-up with no amount', { type: 'wallet_topup', clientId: 'c1' }],
    ['credits with no client', { credits: '500', creditType: 'lead_gen' }],
    ['a product this system does not sell', { type: 'gift_card', clientId: 'c1' }],
  ]

  for (const [what, metadata] of NOT_HANDLED) {
    it(`🛑 ${what} is an exception — the route would have 200'd it`, () => {
      expect(unattributableReason({ ...EVENT, metadata })).toBe('unrecognised_metadata')
    })
  }

  it('🛑 THE ROUTE STILL HANDLES EXACTLY THOSE FOUR, and the classifier knows the same four', () => {
    // 🛑 THE TWO MUST BE READ TOGETHER. A branch added to the webhook without a case here files
    // an exception about money we banked; a case removed here silently 500s a real payment.
    const route = code('../routes/stripe.ts')
    for (const branch of [
      "meta.type === 'programme_first' || meta.type === 'programme_second'",
      "meta.type === 'subscription' && meta.clientId && meta.product",
      "meta.type === 'wallet_topup' && meta.clientId && meta.amountUsd",
      'meta.clientId && meta.credits && meta.creditType',
    ]) {
      expect(route, `the webhook no longer branches on ${branch}`).toContain(branch)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ EXCEPTION + TASK, AND THE RETRY IS IDEMPOTENT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J11-C1 · the webhook records it and refuses the event', () => {
  const ROUTE = code('../routes/stripe.ts')
  /**
   * The fall-through branch, FROM ITS `else` — not from its first statement.
   *
   * ⚠️ THE BOUNDARY IS THE GUARD. Slicing from the report itself passed against a
   * `res.sendStatus(200); return` inserted one line above it: the branch's text was intact and
   * unreachable, which is the original defect with a new line number. Read from the `else` and
   * an early exit is inside the text being judged.
   */
  const branch = (() => {
    const anchor = ROUTE.indexOf('await annotateSettlement(session.id)')
    expect(anchor, 'the credit branch moved — this guard must be repointed').toBeGreaterThan(-1)
    const at = ROUTE.indexOf('} else {', anchor)
    expect(at, 'the unattributable branch is gone — money we cannot place is 200\'d again')
      .toBeGreaterThan(-1)
    const body = ROUTE.slice(at, ROUTE.indexOf('\n      }', at))
    expect(body, 'the fall-through no longer reports an unattributable payment')
      .toContain('unattributableReason')
    return body
  })()

  it('🛑 NOTHING RETURNS BEFORE THE REPORT — an early 200 leaves the branch intact and dead', () => {
    // The whole defect was a completed checkout reaching a 200 with nothing written. An exit
    // added above the report recreates it exactly, with the reporting code still in the file.
    const firstRes = branch.indexOf('res.')
    expect(firstRes, 'the branch answers Stripe nowhere').toBeGreaterThan(-1)
    expect(branch.slice(firstRes), 'the branch answers before it records anything')
      .toMatch(/^res\.status\(500\)/)
    expect((branch.match(/res\./g) ?? []).length, 'the branch answers Stripe more than once').toBe(1)
    expect(branch, 'a `return` precedes the report').not.toMatch(/return[\s\S]{0,40}unattributableReason/)
  })

  it('🛑 IT RAISES THE EXCEPTION — and the alert is the operator-task record (XC-5)', () => {
    expect(branch).toContain("sendFounderAlert(\n          'payment_failed',")
    // ⚠️ AWAITED. A fire-and-forget alert lets the route answer before knowing whether the
    // exception was recorded — the shape XC-5 exists to remove.
    expect(branch, 'the alert is not awaited, so `taskOk` cannot be known')
      .toMatch(/const delivery = await sendFounderAlert/)
    expect(branch).toContain('delivery.taskOk')
  })

  it('🛑 THE TASK IS KEYED ON THE STRIPE EVENT ID, so a retry files nothing new', () => {
    // `sendFounderAlert` derives the task's dedupe key from the subject, and the partial
    // unique index `operator_tasks_one_open_per_key` refuses the second open row.
    expect(branch).toContain("subjectKind: 'stripe_event'")
    expect(branch).toContain('subjectId: unattributableKey(facts)')
    expect(unattributableKey({ eventId: 'evt_9', sessionId: 'cs_9' }), 'the key is not the event')
      .toBe('evt_9')
    // The same delivery retried is the same event id, so the same key.
    expect(unattributableKey({ eventId: 'evt_9', sessionId: 'cs_other' })).toBe('evt_9')
  })

  it('the session is the FALLBACK key, and an event with neither is still keyed', () => {
    // One session can produce more than one event, so keying on it first would file the first
    // and swallow the rest. With no id at all we cannot tell two deliveries apart and must not
    // pretend to — they dedupe together.
    expect(unattributableKey({ sessionId: 'cs_9' })).toBe('cs_9')
    expect(unattributableKey({})).toBe('stripe_event_without_id')
  })

  it('🛑 AND IT REFUSES THE EVENT — a 200 is what burned it', () => {
    expect(branch, 'the event is accepted again, so Stripe never resends it')
      .toMatch(/res\.status\(500\)/)
    expect(branch).not.toMatch(/res\.sendStatus\(200\)/)
    // The refusal is the LAST thing, after the record — answering first would be a refusal
    // with nothing behind it.
    expect(branch.indexOf('res.status(500)'))
      .toBeGreaterThan(branch.indexOf('await sendFounderAlert'))
  })

  it('🛑 and it writes NOTHING — no payment, no wallet, no credits, no work', () => {
    for (const write of ['increment_wallet', 'increment_client_credits', 'credit_transactions',
                         'recordFirstPayment', 'startProgrammeAfterP1', 'settleBatch']) {
      expect(branch, `the unattributable branch performs ${write}`).not.toContain(write)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ④ WHAT THE OPERATOR READS — AND WHAT NEVER REACHES IT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J11-C1 · the record says what happened, and copies no metadata values', () => {
  const HOSTILE = {
    ...EVENT,
    metadata: {
      type: 'programme_first',
      customer_email: 'someone@example.com',
      note: 'call Ada on 07700 900123',
      api_key: 'sk_live_abcdefghijklmnop',
    },
    amountTotal: 125_000,
    currency: 'usd',
    paymentStatus: 'paid',
  }

  it('🛑 NOT ONE METADATA VALUE IS IN THE LINES — only the key names', () => {
    const text = unattributableLines(HOSTILE, 'programme_stage_without_programme').join('\n')
    for (const value of ['someone@example.com', 'Ada', '07700 900123', 'sk_live_abcdefghijklmnop']) {
      expect(text, `a metadata VALUE (${value}) was copied into the operator's record`)
        .not.toContain(value)
    }
    for (const key of ['customer_email', 'note', 'api_key']) {
      expect(text, `the key ${key} is not named, so nobody can tell what the event carried`)
        .toContain(key)
    }
  })

  it('it states the ids, the amount and that nothing was written', () => {
    const text = unattributableLines(HOSTILE, 'programme_stage_without_programme').join('\n')
    expect(text).toContain('evt_1')
    expect(text).toContain('cs_1')
    expect(text).toContain('1250.00 USD')
    expect(text).toContain('NOTHING WAS WRITTEN')
  })

  it('🛑 AN ABSENT AMOUNT IS SAID, NEVER RENDERED AS ZERO', () => {
    // "$0.00" on a payment exception tells an operator the client paid nothing, which is a
    // claim about a number the event did not carry.
    const text = unattributableLines({ ...EVENT, metadata: {} }, 'no_metadata').join('\n')
    expect(text).not.toContain('0.00')
    expect(text).toContain('an amount Stripe did not state')
  })

  it('every reason has a sentence, and none of them guesses a cause', () => {
    for (const [k, copy] of Object.entries(UNATTRIBUTABLE_COPY)) {
      expect(copy.length, k).toBeGreaterThan(40)
      expect(copy, `${k} guesses why`).not.toMatch(/probably|likely|may have been|fraud/i)
    }
  })

  it('the classifier touches no database and no provider', () => {
    const src = code('./unattributable-payment.ts')
    expect(src).not.toMatch(/@kind\/db|db\.from|fetch\(|stripe\./i)
  })
})
