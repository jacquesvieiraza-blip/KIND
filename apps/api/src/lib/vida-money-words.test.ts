// ⚑ 29 Sep (R174 · PR 2c) — VIDA'S PAYMENT AND CREDIT WORDS FOLLOW EACH PROGRAMME'S OWN TERMS.
// A size-band programme is one payment (R166 ③) and earns the once-only, 90-day shortfall credit
// (R166 ⑤, "Once only, 90 days, new programmes"). One on the older terms keeps its two halves
// and its non-expiring credit. Internal authority is House's alone (R152).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lifecycleCopy, type LifecycleCopyInput, type LifecycleState } from '../../../admin/src/lib/vida-lifecycle-copy'

const BASE: LifecycleCopyInput = {
  clientName: 'Acme', state: 'signup', mode: 'No action needed',
  counts: { sourced: 0, qualified: 0, rejected: 0, stillToCheck: 0, enrolled: 20, sends: 0, replies: 0, positive: 0, meetings: 0, repliesAwaitingDecision: 0 },
  programme: { meetingTarget: 8, entitlementUsed: 0, entitlementTotal: 2000, entitlementRemaining: 2000 },
  replyAwaiting: null, stoppedDetail: null, humanBlockers: [],
  killSwitchOff: true, operatorRunEnabled: true, senderSendable: true,
}
const words = (state: LifecycleState, over: Partial<LifecycleCopyInput>) =>
  JSON.stringify(lifecycleCopy({ ...BASE, state, ...over }))

const ADMIN = join(__dirname, '..', '..', '..', 'admin', 'src')
const PAGE = readFileSync(join(ADMIN, 'app', 'vida', 'page.tsx'), 'utf8')

describe('one-payment programmes are never described in halves', () => {
  it('Recommendation: awaiting one payment, in full', () => {
    const w = words('recommendation', { onePayment: true })
    expect(w).toContain('Awaiting payment — one payment, in full')
    expect(w).toContain('pays for the programme in full')
    expect(w).not.toContain('first payment')
  })
  it('Sourcing: paid in full, not "the first payment is authorised"', () => {
    const w = words('sourcing', { onePayment: true })
    expect(w).toContain('The programme is paid in full.')
    expect(w).not.toContain('first payment')
  })
  it('Ready to make live and ready to run: "Paid in full", never "Second payment"', () => {
    for (const s of ['live_ready_to_make_live', 'live_ready_to_run'] as LifecycleState[]) {
      const w = words(s, { onePayment: true, paidInFull: true })
      expect(w, s).toContain('Paid in full')
      expect(w, s).not.toContain('Second payment')
      expect(w, s).not.toContain('second payment is authorised')
    }
  })
})

describe('older two-part programmes keep their wording', () => {
  it('first payment, then second payment', () => {
    expect(words('recommendation', {})).toContain('Awaiting first payment')
    expect(words('sourcing', {})).toContain('The first payment is authorised.')
    expect(words('live_ready_to_make_live', {})).toContain('Second payment')
  })
})

describe('the server says which terms, and Vida passes them on', () => {
  it('pays_in_full comes from the one predicate, over the size_band column', () => {
    const op = readFileSync(join(__dirname, 'operator-programme.ts'), 'utf8')
    expect(op).toContain("pays_in_full: paysInFull(p as { size_band?: string | null }),")
    expect(op.slice(op.indexOf('const PROGRAMME_COLUMNS'), op.indexOf('const BATCH_COLUMNS'))).toContain("'size_band'")
    expect(PAGE).toContain('onePayment: prog?.programme?.pays_in_full === true,')
    expect(PAGE).toContain('|| (prog?.programme?.pays_in_full === true && !!(prog?.programme?.first_paid_at || prog?.programme?.first_authorised_at))')
  })
})

describe('the shortfall credit is worded by the terms, with the 90 from @kind/shared', () => {
  it('Settle and Complete use the one wording, never "credited to their wallet toward another run"', () => {
    expect(PAGE).toContain('once per client, for a new programme, valid ${SHORTFALL_CREDIT_EXPIRY_DAYS} days')
    expect(PAGE).toContain('on the terms they bought, it does not expire')
    expect(PAGE).toContain("shortfallCreditWords(prog?.programme?.pays_in_full === true, 'is')")
    expect(PAGE).toContain("shortfallCreditWords(prog?.programme?.pays_in_full === true, 'was')")
    expect(PAGE).not.toContain('credited to their WALLET toward another run')
    expect(PAGE).not.toContain('credited to their wallet toward another run')
    expect(PAGE).not.toMatch(/valid 90 days/)
  })
})

describe('internal authority is House\'s alone', () => {
  it('the two authorise buttons are drawn only for House, which the server says', () => {
    expect(PAGE).toContain("case 'authorise/first':      return p.status === 'AWAITING_FIRST_PAYMENT' && prog?.house === true")
    expect(PAGE).toContain("case 'authorise/second':     return p.status === 'APPROVED' && !p2 && prog?.house === true")
    const op = readFileSync(join(__dirname, '..', 'routes', 'operator.ts'), 'utf8')
    expect(op).toContain('const house = await isHouseClient(clientId).catch(() => false)')
  })
})
