// ══════════════════════════════════════════════════════════════════════════════════════════
// J12-C3 · SENDABLE IS A FACT, AND IT IS NOT QUALIFIED (FD-5)
//
// REQ: *"True only on Apollo email_status=verified business address; entitlement counts
// qualified"* (FD-5; FD-6; R106).
//
// ── WHAT DECIDED WHO GOT EMAILED ────────────────────────────────────────────────────────
//
//     (l.apollo_consented === true || l.status === 'consent_given') && not opted_out/rejected
//
// 🛑 `apollo_consented` IS UNRELIABLE IN TWO INDEPENDENT WAYS, AND THIS REPOSITORY ALREADY
// SAYS SO IN TWO PLACES:
//
//   ① At INSERT it is `email_status === 'verified' || email_status === 'likely_to_engage'`,
//      under a comment that states the cost plainly: *"`likely_to_engage` is Apollo's
//      PREDICTION that an address will engage, not a verification that it exists. This is the
//      one write that sets the flag on a guess."*
//   ② At REVEAL, `lead-delivery.ts` patches `{ email, email_status, apollo_consented: true }`
//      — TRUE unconditionally, whatever came back. So the flag the send gate read is forced
//      true on every revealed lead, including the ones the reveal proved unverified.
//
// And nothing asked whether the address was a BUSINESS address. `isBusinessEmail` existed and
// was consulted only by `finalVerdict`, whose `requireVerifiedBusinessEmail` is set for the
// HOUSE audience alone — so a customer's programme could enrol a personal mailbox carrying a
// predicted status.
//
// ── AND THE SECOND HALF OF THE REQ IS A PROHIBITION ─────────────────────────────────────
//
// *"entitlement counts qualified."* QUALIFIED ≠ SENDABLE is the point of FD-5: a prospect can
// be a correct match for the customer's targeting and still not be someone we may email today.
// The programme ceiling is consumed by QUALIFIED, and counting it on sendability would charge
// a customer's entitlement for our provider's verification rate.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  isSendable, notSendableReason, sendableBreakdown, SENDABLE_EMAIL_STATUS, NOT_SENDABLE_COPY,
} from './sendable'

const code = (p: string): string =>
  readFileSync(join(__dirname, p), 'utf8')
    .split('\n')
    .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
    .join('\n')

const VERIFIED = { email: 'ada@fathom.co.uk', email_status: 'verified' }

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE FACT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J12-C3 · sendable is true only on a verified business address', () => {
  it('a verified business address is sendable', () => {
    expect(isSendable(VERIFIED)).toBe(true)
    expect(notSendableReason(VERIFIED)).toBeNull()
  })

  it('🛑 `likely_to_engage` IS NOT VERIFIED — it is a prediction, and it was being sent to', () => {
    // The one write that set the old flag on a guess. Apollo predicts the address will
    // engage; it has not checked that it exists.
    expect(isSendable({ ...VERIFIED, email_status: 'likely_to_engage' })).toBe(false)
    expect(notSendableReason({ ...VERIFIED, email_status: 'likely_to_engage' })).toBe('unverified_email')
    expect(SENDABLE_EMAIL_STATUS, 'the prediction became a verification again').toBe('verified')
  })

  it('🛑 AN ABSENT STATUS IS NOT A VERIFICATION', () => {
    // A row we never revealed and a reveal that returned nothing read the same way: we have
    // not been told the address exists.
    for (const st of [null, undefined, '', '   ']) {
      expect(isSendable({ email: 'ada@fathom.co.uk', email_status: st }), String(st)).toBe(false)
    }
  })

  it('🛑 a PERSONAL mailbox is not sendable, however verified it is', () => {
    expect(isSendable({ email: 'ada@gmail.com', email_status: 'verified' })).toBe(false)
    expect(notSendableReason({ email: 'ada@gmail.com', email_status: 'verified' })).toBe('personal_email')
  })

  it('no address, and a placeholder address, are told apart', () => {
    expect(notSendableReason({ email: null, email_status: 'verified' })).toBe('no_email')
    expect(notSendableReason({ email: '   ', email_status: 'verified' })).toBe('no_email')
    expect(notSendableReason({ email: 'noreply@example.com', email_status: 'verified' }))
      .toBe('placeholder_email')
  })

  it('every refusal has a sentence, and none of them is a score', () => {
    for (const k of Object.keys(NOT_SENDABLE_COPY) as (keyof typeof NOT_SENDABLE_COPY)[]) {
      expect(NOT_SENDABLE_COPY[k].length, k).toBeGreaterThan(20)
      expect(NOT_SENDABLE_COPY[k], `${k} names a score`).not.toMatch(/score|rank|\d+%/)
    }
  })

  it('a set can be explained, not just counted', () => {
    const b = sendableBreakdown([
      VERIFIED,
      { ...VERIFIED, email_status: 'likely_to_engage' },
      { email: 'ada@gmail.com', email_status: 'verified' },
      { email: null, email_status: null },
    ])
    expect(b).toEqual({
      sendable: 1,
      total: 4,
      reasons: { unverified_email: 1, personal_email: 1, no_email: 1 },
    })
  })

  it('the fact touches no database, no provider and no send', () => {
    const src = code('./sendable.ts')
    expect(src).not.toMatch(/@kind\/db|db\.from|fetch\(|apollo|resend/i)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② THE GATE THAT DECIDES WHO IS EMAILED ASKS IT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J12-C3 · the enrol gate reads the fact, not the flag', () => {
  const FIGSY = code('./figsy.ts')
  const gate = (() => {
    const at = FIGSY.indexOf('export async function campaignReadyLeadIds')
    expect(at, 'the enrol gate moved — this guard must be repointed').toBeGreaterThan(-1)
    return FIGSY.slice(at, FIGSY.indexOf('\n}', FIGSY.indexOf('.map((l: { id: string })', at)))
  })()

  it('🛑 it asks `isSendable`', () => {
    expect(gate, 'the one read that decides who gets emailed still trusts a flag')
      .toMatch(/isSendable\(l\)/)
  })

  it('🛑 and it no longer reads `apollo_consented` at all', () => {
    expect(gate, 'the flag set on a guess, and forced true at reveal, still decides sends')
      .not.toMatch(/apollo_consented/)
  })

  it('🛑 it selects the columns the fact needs — a missing one reads as not sendable', () => {
    // `email_status` absent from the select would make `isSendable` false for everybody and
    // silently stop all outreach. It is in the select, and this says so.
    expect(gate).toMatch(/\.select\('id, email, email_status, status'\)/)
  })

  it('the opt-out and rejection refusals are untouched', () => {
    expect(gate).toMatch(/l\.status !== 'opted_out' && l\.status !== 'rejected'/)
  })

  it('it is still client-scoped', () => {
    expect(gate).toMatch(/\.eq\('client_id', clientId\)/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ QUALIFIED ≠ SENDABLE — AND THE ENTITLEMENT STILL COUNTS QUALIFIED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J12-C3 · the entitlement is not charged for our verification rate', () => {
  const ICPS = code('../routes/icps.ts')

  it('🛑 the programme settle counts QUALIFIED rows, not sendable ones', () => {
    const at = ICPS.indexOf("const { count: qualified, error: qErr } = await db.from('leads')")
    expect(at, 'the settle count moved — this guard must be repointed').toBeGreaterThan(-1)
    const body = ICPS.slice(at, at + 500)
    expect(body).toMatch(/\.not\('qualified_at', 'is', null\)/)
    expect(body, 'the customer\'s ceiling is being charged for our provider\'s verification rate')
      .not.toMatch(/email_status|isSendable|sendable/)
    expect(ICPS).toMatch(/settleBatch\(programmeBatch\.id, qualified \?\? 0\)/)
  })

  it('🛑 and the qualification verdict does NOT grow a sendability opinion', () => {
    // Two answers to one question is what J5-C5 spent an item removing. `finalVerdict` judges
    // deliverability for the HOUSE audience via its own flag; the send gate judges sendability
    // for everyone. They stay separate, and FD-5 is why: qualified ≠ sendable.
    expect(code('./icp-qualification.ts'), 'the qualification verdict imported the send fact')
      .not.toMatch(/isSendable|from '\.\/sendable'/)
  })

  it('the sendable fact is not read by anything that consumes entitlement', () => {
    for (const p of ['./programme.ts', './programme-qualification.ts']) {
      expect(code(p), `${p} counts entitlement on sendability`).not.toMatch(/isSendable/)
    }
  })
})
