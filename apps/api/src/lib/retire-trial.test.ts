import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  signupSubscriptionRow,
  SIGNUP_SUBSCRIPTION_STATUS,
  SIGNUP_SUBSCRIPTION_PRODUCT,
  isLegacyStatus,
} from './signup-subscription'
import { ENUM_PRESENT_BEFORE, statusGrantsAccess } from './subscription-status'
import { PENDING_MIGRATIONS } from './pending-migrations'
import { stripCommentsForEnvScan } from './env-inventory'

// #607 — THE TRIAL STATE IS RETIRED. These tests pin the three things that can silently
// come back: the status a signup writes, the two crons, and the client-facing email.
//
// The failure mode is not a crash. Every one of these regressions is SILENT — a signup that
// starts writing `trialing` again looks identical from the outside until, fourteen days later,
// a real person is emailed "your trial ends in 4 days, subscribe now" about a product we do
// not sell. So the guards read the real source files, not a mock of them.

const API = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')

describe('what a signup writes', () => {
  const row = signupSubscriptionRow('client-1', '2026-08-01T00:00:00.000Z')

  it('is dormant, not trialing', () => {
    expect(row.status).toBe('paused')
    expect(SIGNUP_SUBSCRIPTION_STATUS).toBe('paused')
    expect(row.status).not.toBe('trialing')
  })

  it('carries NO trial end date and NO fabricated billing period', () => {
    // These two fields fed the retired expiry cron its "N days left" arithmetic. A row that
    // is not a trial must not carry the dates that make a trial computable.
    expect(row.trial_ends_at).toBeNull()
    expect(row.current_period_end).toBeNull()
  })

  it('still carries the ENTITLEMENT — retiring the trial must not remove the product', () => {
    expect(row.product).toBe(SIGNUP_SUBSCRIPTION_PRODUCT)
    expect(row.product).toBe('lead_gen_figsy')
    expect(row.client_id).toBe('client-1')
  })

  it('uses a status PROVEN to be in the production enum — the #342 trap', () => {
    // This is the assertion that stops someone "improving" the status to a clearer word.
    // subscriptions.status is a Postgres ENUM; an unknown value raises 22P02, and
    // routes/auth.ts THROWS on a failed subscription insert — so an invented status here
    // does not degrade, it 500s every signup. #342 is that exact bug still live elsewhere.
    expect(ENUM_PRESENT_BEFORE as readonly string[]).toContain(row.status)
  })

  it('grants no access on its own — the wallet is the gate, not the row', () => {
    expect(statusGrantsAccess(row.status)).toBe(false)
  })

  it('routes/auth.ts writes THIS row and does not hand-roll a trial', () => {
    const auth = API('../routes/auth.ts')
    expect(auth).toContain('signupSubscriptionRow(clientId, now)')
    // The literals that used to be here. Bound to the source because the defect this
    // prevents is someone re-adding them, not the helper changing.
    expect(auth).not.toContain("status: 'trialing'")
    expect(auth).not.toMatch(/trialEnd/)
    expect(auth).not.toMatch(/setDate\(.*\+ 14\)/)
  })
})

describe('the two crons are gone, and cannot be fired by hand either', () => {
  const cron = API('../cron.ts')
  const internal = API('../routes/internal.ts')

  it('neither trial job is scheduled', () => {
    expect(cron).not.toMatch(/cron\.schedule\([^)]*\)\s*=>\s*callInternal\('\/ae\/nurture'\)/)
    expect(cron).not.toContain("callInternal('/ae/nurture')")
    expect(cron).not.toContain("callInternal('/ae/trial-expiry')")
  })

  it('the PAID onboarding sequence is untouched — this retires trials, not lifecycle email', () => {
    expect(cron).toContain("callInternal('/onboarding/activation-sequence')")
    expect(cron).toContain("callInternal('/ae/at-risk')")
    expect(cron).toContain("callInternal('/ae/zero-credits')")
  })

  it('both endpoints refuse with 410 rather than being left loaded', () => {
    // Removing the schedule alone leaves a live endpoint any stale scheduler or run-book
    // entry can still POST. A 410 cannot send an email.
    for (const route of ['/ae/trial-expiry', '/ae/nurture']) {
      const at = internal.indexOf(`internalRouter.post('${route}'`)
      expect(at, `${route} handler missing`).toBeGreaterThan(-1)
      const body = internal.slice(at, at + 600)
      expect(body, `${route} does not refuse`).toContain('res.status(410)')
    }
  })

  it('neither retired handler can still send: no resend call survives in them', () => {
    for (const route of ['/ae/trial-expiry', '/ae/nurture']) {
      const at = internal.indexOf(`internalRouter.post('${route}'`)
      const body = internal.slice(at, at + 600)
      expect(body).not.toContain('resend.emails.send')
      expect(body).not.toContain('sendNurtureEmail')
    }
  })
})

describe('the client-facing trial copy is off the send path', () => {
  it('nothing that can send still says "trial ends" or "Subscribe now"', () => {
    // The retired expiry email said: "Your K.I.N.D trial ends in 4 days… Subscribe now →".
    //
    // COMMENTS ARE STRIPPED FIRST, and that is the whole subtlety. The first version of this
    // test read the raw file and failed — on the comments ABOVE the retired handlers, which
    // quote the copy in order to explain why it was removed. A guard that cannot tell a
    // sendable string from an explanation of its removal would force whoever retires
    // something next to delete the reason with it. Strip, then assert.
    const internal = stripCommentsForEnvScan(API('../routes/internal.ts'))
    expect(internal).not.toContain('trial ends in')
    expect(internal).not.toContain('Subscribe now')
    expect(internal).not.toContain('Your K.I.N.D trial has ended')
    expect(internal).not.toContain('Your free trial has ended')
  })

  it('the nurture template is marked NOT CALLED rather than left looking live', () => {
    // #397's lesson: an unused export in a live file reads as live. It is kept (CORE-MAP
    // rule 3) but labelled, so nobody wires it up without reading why it stopped.
    const email = API('./email.ts')
    const at = email.indexOf('export async function sendNurtureEmail(')
    expect(at).toBeGreaterThan(-1)
    expect(email.slice(Math.max(0, at - 500), at)).toContain('#607')
  })
})

describe('grandfathering is explicit, and both halves exist', () => {
  it("legacy 'trialing' rows still grant access until the migration runs", () => {
    // The half that stops anyone losing access the moment this deploys.
    expect(statusGrantsAccess('trialing')).toBe(true)
    expect(isLegacyStatus('trialing')).toBe(true)
    expect(isLegacyStatus('paused')).toBe(false)
  })

  it('the tolerance is LABELLED as legacy, not left reading as current behaviour', () => {
    const src = API('./subscription-status.ts')
    const at = src.indexOf('export function statusGrantsAccess')
    expect(src.slice(Math.max(0, at - 900), at)).toContain('#607')
  })

  it('the migration is REGISTERED in the runner, not only recorded on disk', () => {
    // TECH-STACK: recording a migration and running one are two different acts. The runner
    // reads this constant; it never reads the directory.
    const m = PENDING_MIGRATIONS.find(x => x.key === '20260801_retire_trial_status')
    expect(m, 'migration not registered in PENDING_MIGRATIONS').toBeTruthy()
    expect(m!.sql).toContain("SET status        = 'paused'")
    expect(m!.sql).toContain("WHERE status = 'trialing'")
    expect(m!.sql).toContain('trial_ends_at = NULL')
  })

  it('and the canonical .sql file exists beside it', () => {
    const sql = readFileSync(
      join(__dirname, '../../../../supabase/migrations/20260801_retire_trial_status.sql'), 'utf8')
    expect(sql).toContain("WHERE status = 'trialing'")
    expect(sql).toContain("SET status         = 'paused'")
  })

  it('the remaining count is REPORTED so it can be watched to zero', () => {
    const status = API('../routes/status.ts')
    expect(status).toContain('legacy_trialing')
    expect(status).toContain("eq('status', 'paused')")
  })
})

describe('the drip no longer halts on a trial that cannot exist', () => {
  const internal = API('../routes/internal.ts')

  it('the trial-expired-unconverted halt is gone', () => {
    expect(internal).not.toContain('hasValidTrial')
    expect(internal).not.toContain('FIGSY trial expired unconverted')
  })

  it('the wallet gate that actually protects us is still there', () => {
    // The halt was removable precisely because this line already refuses every unfunded
    // client — and with no freebies since 24 Jul, balance > 0 means paid or comped.
    expect(internal).toContain('if (balance < 1) continue')
  })

  it('the 3x free-leads cap is untouched — it was never trial-specific', () => {
    expect(internal).toContain('3× free-leads cap')
  })
})

// ── 4 AUG — THE LIVE SCHEMA REFUSED THE HONEST ROW, AND THE FOUNDER WAS THE FIRST TO KNOW ──
//
// #607's row writes current_period_end: null on purpose. Production's subscriptions table has
// NOT NULL on that column, the relaxing migration cannot run (schema frozen), and the insert
// died 23502 — EVERY signup failed at the front door for two days until the founder signed up
// himself and hit it. The claim "the code works with or without the migration" was false, and
// nothing here tested it against a schema that refuses null. These pin the fallback.
import {
  PERIOD_END_SENTINEL, isPeriodEndNotNullRejection, signupSubscriptionRowCompat,
} from './signup-subscription'

describe('the schema-refuses-null fallback (found 4 Aug, by the founder, in production)', () => {
  it('recognises exactly the rejection production threw', () => {
    // The founder's screenshot, verbatim: code 23502, column current_period_end.
    expect(isPeriodEndNotNullRejection({ code: '23502',
      message: 'null value in column "current_period_end" of relation "subscriptions" violates not-null constraint' })).toBe(true)
  })
  it('and nothing else — any other failure must still surface loudly', () => {
    expect(isPeriodEndNotNullRejection(null)).toBe(false)
    expect(isPeriodEndNotNullRejection({ code: '23502', message: 'null value in column "client_id"' })).toBe(false)
    expect(isPeriodEndNotNullRejection({ code: '22P02', message: 'current_period_end' })).toBe(false)
  })
  it('the retry row differs from the honest row in ONE field only', () => {
    const honest = signupSubscriptionRow('c1', '2026-08-04T00:00:00.000Z')
    const compat = signupSubscriptionRowCompat('c1', '2026-08-04T00:00:00.000Z')
    expect(compat).toEqual({ ...honest, current_period_end: PERIOD_END_SENTINEL })
  })
  it('the sentinel is far-future — a near date would flag every dormant signup "at risk"', () => {
    expect(new Date(PERIOD_END_SENTINEL).getFullYear()).toBeGreaterThanOrEqual(2099)
  })
  it('auth.ts tries honest-first and retries with the sentinel — the wiring, not just the parts', () => {
    const src = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/auth.ts'), 'utf8'))
    expect(src).toContain('isPeriodEndNotNullRejection(subErr)')
    expect(src).toContain('signupSubscriptionRowCompat(clientId, now)')
  })
})

