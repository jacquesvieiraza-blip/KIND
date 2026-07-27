import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  decideLapse, webhookSuspectLines, LAPSED_STATUS, LAPSED_FALLBACK, STRIPE_STALE_DAYS,
  type LapseCandidate,
} from './subscription-lapse'
import { statusGrantsAccess, ENUM_PRESENT_BEFORE } from './subscription-status'

// #342 — THE LAPSE CRON HAS 500'd EVERY DAY SINCE IT WAS WRITTEN.
//
//     .update({ status: 'lapsed' }).eq('status','active').lt('current_period_end', now)
//
// `lapsed` is not in the production enum. Postgres rejects it, the handler rethrows, the
// route 500s. No subscription has ever been marked lapsed — so an unpaid client keeps
// access forever.

const NOW = new Date('2026-07-27T09:00:00Z')
const base: LapseCandidate = {
  id: 'sub-1', client_id: 'c1', product: 'virtual_assistant',
  status: 'active', current_period_end: '2026-06-27T00:00:00Z', stripe_subscription_id: null,
}

describe('what SHOULD lapse', () => {
  it('a hand-granted subscription whose period has ended', () => {
    // Nothing else in the system will ever expire these — no Stripe, no webhook, nothing.
    const d = decideLapse(base, NOW)
    expect(d.lapse).toBe(true)
    expect(d.reason).toContain('hand-granted')
  })

  it('and the status it lands on denies access', () => {
    expect(statusGrantsAccess(LAPSED_STATUS)).toBe(false)
  })
})

describe('what must NEVER be lapsed by this cron', () => {
  it('THE BIG ONE: a Stripe-managed subscription is left alone', () => {
    // `current_period_end` is only ever written by OUR webhook handler. Miss one delivery
    // and the column goes stale while the client pays perfectly well. Lapsing on that is
    // locking out a payer using our own bookkeeping error as the evidence.
    const d = decideLapse({ ...base, stripe_subscription_id: 'sub_stripe_123' }, NOW)
    expect(d.lapse).toBe(false)
    expect(d.reason).toContain('Stripe')
  })

  it('a subscription still inside its paid period', () => {
    expect(decideLapse({ ...base, current_period_end: '2026-08-27T00:00:00Z' }, NOW).lapse).toBe(false)
  })

  it('an OPEN-ENDED grant — indefinite on purpose, not expired', () => {
    // Partners, pilots and the founder's own account are set up this way. Expiring one
    // because a column is null revokes access nobody asked to revoke.
    const d = decideLapse({ ...base, current_period_end: null }, NOW)
    expect(d.lapse).toBe(false)
    expect(d.reason).toContain('indefinite')
  })

  it('an unreadable date — a typo must not lock an account', () => {
    expect(decideLapse({ ...base, current_period_end: 'not-a-date' }, NOW).lapse).toBe(false)
  })

  it('anything not currently active', () => {
    for (const s of ['cancelled', 'paused', 'past_due', 'lapsed', 'trialing']) {
      expect(decideLapse({ ...base, status: s }, NOW).lapse, s).toBe(false)
    }
  })

  it('a paused subscription is not quietly converted into a lapse', () => {
    // A pause is the client's decision (#190) with a resume date. Lapsing it would end the
    // arrangement they were promised.
    expect(decideLapse({ ...base, status: 'paused' }, NOW).lapse).toBe(false)
  })
})

describe('the missed-webhook signal', () => {
  it('a Stripe sub barely past its period end is ordinary billing lag, not a fault', () => {
    const d = decideLapse(
      { ...base, stripe_subscription_id: 'sub_x', current_period_end: '2026-07-26T09:00:00Z' }, NOW)
    expect(d.webhookSuspect).toBe(false)
  })

  it(`one more than ${STRIPE_STALE_DAYS} days past is flagged — we are probably missing webhooks`, () => {
    const d = decideLapse(
      { ...base, stripe_subscription_id: 'sub_x', current_period_end: '2026-07-20T09:00:00Z' }, NOW)
    expect(d.webhookSuspect).toBe(true)
    expect(d.lapse).toBe(false)   // flagged, still not locked out
  })

  it('a flagged subscription is STILL not lapsed — the alert is the action, not the lock', () => {
    const d = decideLapse(
      { ...base, stripe_subscription_id: 'sub_x', current_period_end: '2026-01-01T00:00:00Z' }, NOW)
    expect(d.webhookSuspect).toBe(true)
    expect(d.lapse).toBe(false)
  })

  it('a hand-granted subscription is never a webhook suspect — there is no webhook', () => {
    expect(decideLapse(base, NOW).webhookSuspect).toBe(false)
  })

  it('the alert says to check Stripe, and never claims the clients are unpaid', () => {
    const lines = webhookSuspectLines([{ client_id: 'c1', product: 'virtual_assistant', current_period_end: '2026-01-01' }]).join(' ')
    expect(lines).toContain('Webhooks')
    expect(lines).toContain('NOT lapsed')
    expect(lines.toLowerCase()).not.toContain('unpaid client')
  })
})

describe('every decision is explained', () => {
  it('no branch can act without a written reason', () => {
    const cases: LapseCandidate[] = [
      base,
      { ...base, stripe_subscription_id: 'x' },
      { ...base, current_period_end: null },
      { ...base, current_period_end: 'junk' },
      { ...base, current_period_end: '2099-01-01T00:00:00Z' },
      { ...base, status: 'cancelled' },
    ]
    for (const c of cases) expect(decideLapse(c, NOW).reason.length).toBeGreaterThan(10)
  })
})

// ── #342 IS ITSELF THE ENUM TRAP ─────────────────────────────────────────────────────────
describe('the value written must be one the database accepts', () => {
  it('the fallback is a status the enum already held', () => {
    // If the migration has not been run, the write must still land on something real and
    // still deny access — otherwise the row stays `active` and the bug is unchanged.
    expect(ENUM_PRESENT_BEFORE).toContain(LAPSED_FALLBACK)
  })

  it('the fallback denies access', () => {
    expect(statusGrantsAccess(LAPSED_FALLBACK)).toBe(false)
  })

  it('the fallback is past_due, NOT cancelled — nobody cancelled anything', () => {
    // Both deny access, but telling a client their subscription was cancelled when their
    // period simply ran out is a support conversation we would deserve.
    expect(LAPSED_FALLBACK).toBe('past_due')
    expect(LAPSED_FALLBACK).not.toBe('cancelled')
  })
})

// ── THE WIRING ───────────────────────────────────────────────────────────────────────────
describe('the cron is actually WIRED to this', () => {
  const code = (p: string) => readFileSync(join(__dirname, p), 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

  it('the blind bulk update is gone', () => {
    const src = code('../routes/internal.ts')
    expect(src).not.toMatch(/\.update\(\{\s*status:\s*'lapsed'\s*\}\)\s*\n?\s*\.eq\('status',\s*'active'\)/)
  })

  it('the cron decides per subscription', () => {
    expect(code('../routes/internal.ts')).toContain('decideLapse')
  })

  it('THE STATUS CHANGE IS NO LONGER GATED ON AN EMAIL SWITCH', () => {
    // LIFECYCLE_EMAILS_ENABLED=false skipped the whole handler, so turning off marketing
    // email silently disabled billing enforcement. The email is gated; the lapse is not.
    // COMMENTS STRIPPED — the comment above the fix QUOTES the old gate to explain it, and
    // this guard failed on that. Third time in this codebase: a check that forbids you from
    // describing what you fixed is a bad check.
    const src = code('../routes/internal.ts')
    const handler = src.slice(src.indexOf("'/subscriptions/check-lapsed'"), src.indexOf("'/subscriptions/check-lapsed'") + 5000)
    expect(handler).toContain('decideLapse')
    const beforeDecide = handler.slice(0, handler.indexOf('decideLapse'))
    expect(beforeDecide).not.toContain('lifecycleEmailsEnabled')
  })

  it('lapsed is in the enum migration', () => {
    expect(readFileSync(join(__dirname, './pending-migrations.ts'), 'utf8')).toContain("'lapsed'")
  })

  it('a lapsed subscription can be REACTIVATED by a successful payment', () => {
    // Otherwise a client who pays after lapsing stays locked out forever — the same "unpaid
    // clients keep access" bug pointed the other way.
    const src = code('../routes/stripe.ts')
    const idx = src.indexOf('invoice.payment_succeeded')
    expect(src.slice(idx, idx + 1600)).toContain("'lapsed'")
  })
})
