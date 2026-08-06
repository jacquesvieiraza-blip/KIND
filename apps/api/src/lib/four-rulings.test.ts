// THE FOUR RULINGS OF 6 AUG — the cap is 7 · stranded leads get enrolled · #301 is moot.
//
// The founder closed four open questions in one message: *"all with your recomendfaion. lets
// close these off."* Three of them leave enforceable traces; this file is those traces.
//
// ⚠️ ASSERTIONS ARE BOUND TO THE THING THEY ASSERT ABOUT — the entry, the branch, the constant.
// Never a fixed character window, never an anchor that only exists in a comment. Both have
// produced tests in this repo that passed with the code deleted.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { MAX_STEPS } from './sequence-quality'
import { mayEnrolStranded, describeEnrolOutcome } from './stranded-leads'
import { stripCommentsForEnvScan } from './env-inventory'

const read = (p: string) => stripCommentsForEnvScan(readFileSync(join(__dirname, p), 'utf8'))

// ── RULING 1: THE CAP IS 7 ────────────────────────────────────────────────────────────────

describe('the sequence cap is 7 — and the editor and the gate agree about it', () => {
  it('the gate enforces 7', () => {
    expect(MAX_STEPS).toBe(7)
  })

  it('THE AGREEMENT: the Vida editor stops at the same number the gate blocks at', () => {
    // ⚠️ REWRITTEN 6 Aug, AND THE REASON IS THE POINT (O8 — a guard must assert the INTENT,
    // not the literal). This test used to demand the exact string `seqEdit.steps.length < 7`.
    // That was right while the number HAD to be duplicated — `apps/admin` cannot import from
    // `apps/api`. The R3 audit removed the duplication entirely by moving the constant to
    // `@kind/shared`, which all four apps can read… and this test went RED for the fix,
    // because it was pinned to the workaround rather than to the agreement.
    //
    // A test that fails when the defect is properly cured is worse than no test: it argues
    // for keeping the defect. So it now asserts what actually matters — the editor reads the
    // ONE constant, and no digit is typed anywhere near the comparison.
    const vida = read('../../../admin/src/app/vida/page.tsx')
    expect(vida, 'the add-step control must read the shared constant').toContain('seqEdit.steps.length < MAX_SEQUENCE_STEPS')
    expect(vida, 'the constant must actually be imported, not shadowed').toMatch(/import\s*\{[^}]*MAX_SEQUENCE_STEPS[^}]*\}\s*from\s*'@kind\/shared'/)
    expect(vida, 'no hard-coded step limit may survive — that is how it drifted').not.toMatch(/steps\.length\s*[<>]=?\s*(?:3|7|10)\b/)
  })

  it('the gate HARD-blocks rather than warning — a warning would not have prevented anything', () => {
    const gate = read('sequence-quality.ts')
    const at = gate.indexOf('steps.length > MAX_STEPS')
    expect(at, 'the cap check must exist').toBeGreaterThan(-1)
    const branch = gate.slice(at, gate.indexOf('\n', gate.indexOf("add('", at)) + 1)
    expect(branch).toContain("'hard'")
  })
})

// ── RULING 2: THE STRANDED LEADS GET ENROLLED ─────────────────────────────────────────────

describe('#631 mayEnrolStranded — who may be rescued', () => {
  const base = { exists: true, isDemo: false, approved: true, alreadyEnrolled: false }

  it('a paid, approved, unenrolled lead is exactly the case this exists for', () => {
    expect(mayEnrolStranded(base)).toEqual({ ok: true })
  })

  it('REFUSES a second press — one lead must never enter two sequences', () => {
    // The prospect would receive the same campaign twice from the same mailbox, which is the
    // complaint that burns a domain. A refusal here is the correct outcome, not an error.
    const v = mayEnrolStranded({ ...base, alreadyEnrolled: true })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.code).toBe('already_enrolled')
  })

  it('REFUSES a demo client — nothing can ever be sent to them', () => {
    const v = mayEnrolStranded({ ...base, isDemo: true })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.code).toBe('demo')
  })

  it('REFUSES a lead nobody approved — it is not stranded, it is untouched', () => {
    const v = mayEnrolStranded({ ...base, approved: false })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.code).toBe('not_approved')
  })

  it('demo beats every other refusal, so the reason named is the most specific one', () => {
    const v = mayEnrolStranded({ exists: true, isDemo: true, approved: false, alreadyEnrolled: true })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.code).toBe('demo')
  })
})

describe('#631 describeEnrolOutcome — the verdict is READ BACK, never assumed', () => {
  it('a row that actually appeared is the only thing that counts as enrolled', () => {
    const o = describeEnrolOutcome({ enrolledAfter: true, hasActiveCampaign: true })
    expect(o.state).toBe('enrolled')
  })

  it('and "enrolled" says out loud that NOTHING was sent and NOTHING was charged', () => {
    // An operator who reads "enrolled" as "sent" goes looking for a delivery that was never
    // meant to happen — the kill-switch and the warming guard both still sit downstream.
    const o = describeEnrolOutcome({ enrolledAfter: true, hasActiveCampaign: true })
    expect(o.detail).toContain('NOTHING has been sent')
    expect(o.detail).toContain('No charge')
  })

  it('⚠️ no row + no error = STILL STRANDED, never success — this is the #625 shape', () => {
    // `autoEnrollLead` returns void and its no-campaign branch RETURNS rather than throwing.
    // Reading the absence of an exception as the presence of work is the exact defect that
    // told the founder a lead was approved when it had entered nothing.
    const o = describeEnrolOutcome({ enrolledAfter: false, hasActiveCampaign: false })
    expect(o.state).not.toBe('enrolled')
    expect(o.detail).toContain('STILL stranded')
  })

  it('no campaign is named as the CAUSE, with the action, not left as a shrug', () => {
    const o = describeEnrolOutcome({ enrolledAfter: false, hasActiveCampaign: false })
    expect(o.state).toBe('no_campaign')
    if (o.state === 'no_campaign') {
      expect(o.action).toContain('campaign')
      // Starting a campaign must not read as "this will start sending".
      expect(o.action).toContain('does not send')
    }
  })

  it('a campaign exists and it still failed → reported as failed, not as no_campaign', () => {
    const o = describeEnrolOutcome({ enrolledAfter: false, hasActiveCampaign: true })
    expect(o.state).toBe('failed')
  })

  it('a thrown error is surfaced verbatim and confirms nothing was charged', () => {
    const o = describeEnrolOutcome({ enrolledAfter: false, hasActiveCampaign: true, threw: 'boom' })
    expect(o.state).toBe('failed')
    expect(o.detail).toContain('boom')
    expect(o.detail).toContain('Nothing was charged')
  })
})

describe('#631 the route: same machinery, no money, verified after', () => {
  const route = read('../routes/operator.ts')
  const at = route.indexOf("post('/clients/:clientId/enrol-stranded'")
  const body = route.slice(at, route.indexOf('operatorRouter.', at + 10))

  it('the route exists', () => {
    expect(at, 'the operator enrol route must exist').toBeGreaterThan(-1)
  })

  it('it goes through autoEnrollLead — never a hand-rolled enrollment insert', () => {
    // That function owns the ICP→campaign resolution, the PECR gate, suppression and opt-out.
    // A direct insert would create an enrolment none of those rules had seen.
    expect(body).toContain('autoEnrollLead(')
    expect(body).not.toMatch(/from\('figsy_enrollments'\)\s*\.insert/)
  })

  it('it CHARGES NOTHING — the client already paid at approve (M2/#424)', () => {
    expect(body).toContain('prepaid: true')
    expect(body).not.toContain('chargeFigsyEnroll')
    expect(body).not.toContain('try_charge_wallet')
  })

  it('it re-reads figsy_enrollments AFTER the attempt', () => {
    const call = body.indexOf('autoEnrollLead(')
    const recheck = body.indexOf("from('figsy_enrollments')", call)
    expect(recheck, 'the verification read must come AFTER the enrol call').toBeGreaterThan(call)
  })

  it('it audits, and records that no money moved', () => {
    expect(body).toContain("action: 'enrol_stranded'")
    expect(body).toContain('charged: false')
  })

  it('every read is CHECKED, never swallowed (#349)', () => {
    expect(body).toContain('leads.error')
    expect(body).toContain('enrolled.error')
  })
})

// ── RULING 3: #301 IS MOOT ────────────────────────────────────────────────────────────────

describe('the register reflects the rulings', () => {
  const rules = readFileSync(join(__dirname, '../../../../docs/PRODUCT-RULES.md'), 'utf8')

  it('D14 is RULED, not still flagged as unreconciled', () => {
    expect(rules).toContain('RULED 6 Aug — THE CAP IS 7')
    expect(rules).not.toContain('⚠️ **UNRECONCILED — needs a founder glance.**')
  })

  it('and D14 is off the open list — an answered question must not still be asked', () => {
    const open = rules.slice(rules.indexOf('## Open — the founder has not ruled'))
    expect(open).not.toContain('the sequence cap: 10 (locked 8 Jul) vs 7')
  })

  it('#301 is off the open list too', () => {
    const open = rules.slice(rules.indexOf('## Open — the founder has not ruled'))
    expect(open).not.toContain('The Denise price conflict')
  })

  it('the stranded leads are off the open list', () => {
    const open = rules.slice(rules.indexOf('## Open — the founder has not ruled'))
    expect(open).not.toContain('2 paid leads sit in NO sequence')
  })
})
