import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// THE SIX FINDINGS FROM THE 27-JUL FULL AUDIT.
//
// Every one was found by READING a file end to end, not by grep — which is why they had
// survived. Each test below is the finding stated as an assertion.

vi.mock('@kind/db', () => ({ db: { from: () => ({}) } }))

import { readProgress, unavailableNote, PROGRESS_KEYS } from './onboarding-progress'
import { normalisePort, refusalLabel } from './sending-inbox'
import { PURCHASE_TX_TYPES } from './onboarding-pack'
import { bookingUrlForLead } from './booking-token'

// ── ① a client paid and the checklist said they hadn't ────────────────────────────────
describe('① the payment types the checklist must count', () => {
  it('wallet_topup IS a purchase — it is what Stripe writes for the $99', () => {
    // routes/stripe.ts:330 writes `type: 'wallet_topup'`. The checklist counted only
    // 'purchase', so the step proving they are a paying client never ticked.
    expect(PURCHASE_TX_TYPES).toContain('wallet_topup')
    expect(PURCHASE_TX_TYPES).toContain('purchase')
    expect(PURCHASE_TX_TYPES).toContain('credit_purchase')
  })

  it('the ROUTE uses the list, not a single hardcoded type', () => {
    // The constant was always right; the route ignored it. Asserting the constant alone
    // would be a placebo — this reads the route and fails if the narrow match comes back.
    const src = readFileSync(join(__dirname, '../routes/onboarding.ts'), 'utf8')
    expect(src).toContain('PURCHASE_TX_TYPES')
    // COMMENT LINES ARE STRIPPED. The first version of this guard failed on the comment
    // that QUOTES the old code to explain the bug — a check that forbids you from
    // describing what you fixed is a bad check.
    const code = src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    expect(code).not.toMatch(/\.eq\(\s*'type'\s*,\s*'purchase'\s*\)/)
  })

  it('a paid client reads as paid', () => {
    const { flags } = readProgress({
      hasIcp: { ok: true, count: 1 }, hasLeads: { ok: true, count: 1 },
      hasReveal: { ok: true, count: 0 }, hasEnrollment: { ok: true, count: 0 },
      hasPurchase: { ok: true, count: 1 },
    })
    expect(flags.hasPurchase).toBe(true)
  })
})

// ── ② a failed count rendered as zero ─────────────────────────────────────────────────
describe('② "we could not check" is not "you have not done it"', () => {
  const base = {
    hasIcp: { ok: true as const, count: 1 }, hasLeads: { ok: true as const, count: 1 },
    hasReveal: { ok: true as const, count: 1 }, hasEnrollment: { ok: true as const, count: 1 },
    hasPurchase: { ok: true as const, count: 1 },
  }

  it('a failed count is LISTED, not silently false', () => {
    const r = readProgress({ ...base, hasReveal: { ok: false, why: 'timeout' } })
    expect(r.unavailable).toEqual(['hasReveal'])
  })

  it('the flag still renders false — an unticked box is the safer mistake', () => {
    const r = readProgress({ ...base, hasReveal: { ok: false, why: 'timeout' } })
    expect(r.flags.hasReveal).toBe(false)
  })

  it('a genuine zero and a failure are DISTINGUISHABLE — the whole bug', () => {
    const zero = readProgress({ ...base, hasReveal: { ok: true, count: 0 } })
    const broke = readProgress({ ...base, hasReveal: { ok: false, why: 'timeout' } })
    expect(zero.flags.hasReveal).toBe(broke.flags.hasReveal)   // both false…
    expect(zero.unavailable).toEqual([])                       // …but only one is trusted
    expect(broke.unavailable).toEqual(['hasReveal'])
  })

  it('all five clean means the flags are the whole truth', () => {
    expect(readProgress(base).unavailable).toEqual([])
    expect(unavailableNote([])).toBeNull()
  })

  it('the note never says "not done"', () => {
    const note = unavailableNote(['hasReveal', 'hasPurchase'])!
    expect(note).toContain("couldn't check")
    expect(note).toContain('does NOT mean')
  })

  it('covers every key, so a new step cannot be silently unchecked', () => {
    expect(PROGRESS_KEYS).toHaveLength(5)
  })
})

// ── ③ a localhost booking link in a real prospect's inbox ─────────────────────────────
describe('③ no localhost link ever reaches a prospect', () => {
  const client = { calendar_booking_enabled: true, booking_url: 'https://cal.example/acme' }

  beforeEach(() => { process.env.ADMIN_SECRET_KEY = 'x'.repeat(40) })
  afterEach(() => { delete process.env.PORTAL_URL })

  it('with PORTAL_URL set, it builds the tokenised link', () => {
    process.env.PORTAL_URL = 'https://app.get-kind.com'
    const url = bookingUrlForLead(client, 'lead-1', 'client-1')!
    expect(url.startsWith('https://app.get-kind.com/book/')).toBe(true)
  })

  it('with PORTAL_URL UNSET it falls back to the client link — never localhost', () => {
    delete process.env.PORTAL_URL
    const url = bookingUrlForLead(client, 'lead-1', 'client-1')
    expect(url).toBe('https://cal.example/acme')
    expect(url).not.toContain('localhost')
  })

  it('with no PORTAL_URL and no client link it sends NO link at all', () => {
    // No link beats a dead link. A prospect clicking through to nothing is worse than a
    // prospect who was never offered a booking.
    delete process.env.PORTAL_URL
    expect(bookingUrlForLead({ calendar_booking_enabled: true, booking_url: null }, 'l', 'c')).toBeNull()
  })

  it('a trailing slash does not produce a double slash in the link', () => {
    process.env.PORTAL_URL = 'https://app.get-kind.com/'
    expect(bookingUrlForLead(client, 'lead-1', 'client-1')).not.toContain('.com//book')
  })
})

// ── ⑤ the transport ignored the port guard written for it ─────────────────────────────
describe('⑤ a junk port never reaches the mail server', () => {
  it('an empty box does not become port 0', () => {
    // Number('') === 0. Left unguarded that is a connection to nowhere that burns the full
    // 20s socket timeout on EVERY send.
    expect(normalisePort('', undefined).port).toBe(587)
  })
  it('undefined does not become NaN', () => {
    expect(normalisePort(undefined, undefined).port).toBe(587)
  })
  it('junk text falls back rather than propagating', () => {
    expect(normalisePort('abc', undefined).port).toBe(587)
  })
  it('an out-of-range port falls back', () => {
    expect(normalisePort(99999, undefined).port).toBe(587)
    expect(normalisePort(-1, undefined).port).toBe(587)
  })
  it('465 implies TLS and 587 does not — the pair that hangs when mismatched', () => {
    expect(normalisePort(465, undefined).secure).toBe(true)
    expect(normalisePort(587, undefined).secure).toBe(false)
  })
  it('a string port from a form field still works', () => {
    expect(normalisePort('465', undefined)).toEqual({ port: 465, secure: true })
  })
})

// ── ⑥ a database failure labelled as a missing mailbox ────────────────────────────────
describe('⑥ a database failure is not a configuration problem', () => {
  it('has its own reason, distinct from "nothing assigned"', () => {
    expect(refusalLabel('lookup_failed')).not.toBe(refusalLabel('no_inbox'))
  })
  it('the label says DATABASE, so nobody goes and assigns a mailbox that is already there', () => {
    const l = refusalLabel('lookup_failed')
    expect(l.toLowerCase()).toContain('database')
    expect(l.toLowerCase()).not.toContain('no sending mailbox assigned')
  })
  it('the genuine missing-mailbox label is unchanged', () => {
    expect(refusalLabel('no_inbox')).toBe('No sending mailbox assigned')
  })
})
