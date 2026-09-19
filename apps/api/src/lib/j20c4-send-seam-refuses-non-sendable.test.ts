// ══════════════════════════════════════════════════════════════════════════════════════════
// J20-C4 · THE SEND SEAM REFUSES ANYBODY WE MAY NOT EMAIL (FD-5 · LR 17)
//
// REQ: *"Independent of every other gate; Hunter never re-enabled."*
// RED: *"A non-sendable row reaches the send seam and is sent."*
//
// ── WHY THE ENROL GATE WAS NOT ENOUGH ───────────────────────────────────────────────────
//
// J12-C3 made `campaignReadyLeadIds` ask `isSendable`, so the wrong people stop being ENROLLED
// from that day forward. It cannot touch a row that is already enrolled and due — every
// enrollment created before the gate existed, and any lead reaching a send by a path the gate
// does not sit on. `sendSequenceEmailCore` is the single chokepoint every real sequence-step
// send funnels through (the demo backstop and the opt-out net above it say so in their own
// words), so one refusal here covers all of them.
//
// ── "INDEPENDENT OF EVERY OTHER GATE" IS THE REQUIREMENT, AND IT IS TESTABLE ────────────
//
// The refusal asks no other question: not programme authority, not the review queue, not the
// caps, not the claim, not whether anybody approved anything. It is a property of the PERSON,
// like the do-not-contact list and the opt-out blocklist — both of which are unconditional at
// this seam for the same reason, preview included.
//
// ── ⚠️ THE FROZEN KILL-SWITCH TEST, AND THE ONE LINE THAT HAD TO MOVE ───────────────────
//
// This item's own GREEN asks for two things at once: *"Send seam refuses independently of every
// other gate… kill-switch frozen test intact."* Both hold, and the seam between them is exactly
// one token wide.
//
// 🛑 THE GATE SITS BELOW THE TWO SWITCHES ON PURPOSE. The kill-switch stays the FIRST gate and
// the operator key stays second, so cases 11 and 12 of the frozen file keep their exact
// discriminating power: they still defer at the operator key, before sendability is ever asked.
// Every assertion, every case, and the order of those two gates are untouched.
//
// 🛑 WHAT COULD NOT BE AVOIDED is case 13 — the file's own ANTI-VACUITY case, which proves the
// seam is reachable at all by watching a message arrive at the mail server. Its fixture lead
// carried no `email_status`, so under FD-5 that lead is somebody we may not email, and no
// correct placement of a refusal lets an unsendable fixture reach the provider. A fixture that
// cannot reach the seam cannot prove the seam is reached.
//
// ⚠️ SO THE DEVIATION IS ONE FIELD ON ONE LINE, AND NOTHING ELSE — no added prose inside the
// frozen file, which is why this explanation lives here instead. `xc10-frozen-tests-intact.test.ts`
// PINS it: that file diffs the frozen tests against the certified baseline and fails if the
// kill-switch deviation is anything other than this single added field, so the exception cannot
// grow into a habit.
//
// ── AND HUNTER IS NOT RE-ENABLED — BY CONSTRUCTION, NOT BY PROMISE ─────────────────────
//
// FD-6 is Apollo only. The Hunter waterfall writes `{ email }` and NEVER an `email_status`, so
// an address it finds can never satisfy this gate: a Hunter-filled lead is unsendable by the
// shape of the data, whatever any environment variable says.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const code = (p: string): string =>
  readFileSync(join(__dirname, p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
    .join('\n')

const FIGSY = code('./figsy.ts')

/** The seam itself — from its signature to the demo backstop that follows the new gate. */
const seamHead = (() => {
  const at = FIGSY.indexOf('async function sendSequenceEmailCore(')
  expect(at, 'the send seam moved — this guard must be repointed').toBeGreaterThan(-1)
  const end = FIGSY.indexOf('#453 — DEMO BACKSTOP', at)
  const demo = FIGSY.indexOf('if (!opts?.isPreview) {', at)
  return FIGSY.slice(at, end === -1 ? demo : end)
})()

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE REFUSAL EXISTS, AT THE SEAM
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J20-C4 · the send seam asks whether we may email this person', () => {
  it('🛑 IT ASKS `notSendableReason`, AT THE CHOKEPOINT', () => {
    expect(seamHead, 'the seam sends without asking whether the address is one we may use')
      .toContain('notSendableReason(')
    expect(seamHead).toContain("await import('./sendable')")
  })

  it('🛑 IT READS THE STATUS FROM THE ROW — `Lead` does not carry it', () => {
    // The callers' `Lead` has no `email_status`, so trusting what was passed in would make the
    // gate ask a question nothing can answer and pass everybody.
    expect(seamHead).toContain(".select('email, email_status').eq('id', lead.id)")
  })

  it('🛑 AND IT FAILS CLOSED — a read we could not complete is not permission', () => {
    const at = seamHead.indexOf('sendableErr')
    expect(at, 'the read error is not handled').toBeGreaterThan(-1)
    const block = seamHead.slice(at, at + 400)
    expect(block).toContain("return 'deferred'")
  })

  it('🛑 THE ROW WINS WHEREVER THERE IS ONE, AND A MISSING ROW READS AS UNVERIFIED', () => {
    // The caller's `Lead` is whatever a cron loaded minutes ago; the row is what is true now.
    // A row saying this person has no address must refuse even while the caller holds one —
    // and `maybeSingle()` answers `{ data: null, error: null }` for a row that is not there,
    // which tells us nothing, so the status is `null` and the answer is the same refusal.
    expect(seamHead).toContain('row.email ?? null, email_status: row.email_status ?? null')
    expect(seamHead).toContain('notSendableReason({ email: lead.email, email_status: null })')
  })

  it('it defers rather than standing the enrollment down — a reveal can still verify them', () => {
    const at = seamHead.indexOf('const why = row')
    const block = seamHead.slice(at, at + 700)
    expect(block).toContain("return 'deferred'")
    expect(block, 'an unverified address is stood down permanently, so a later reveal cannot recover it')
      .not.toContain('next_send_at: null')
  })

  it('the log says which of the four reasons it was, in the operator\'s words', () => {
    expect(seamHead).toContain('NOT_SENDABLE_COPY[why]')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② INDEPENDENT OF EVERY OTHER GATE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J20-C4 · it depends on nothing else, and nothing else can turn it off', () => {
  const gate = (() => {
    const at = seamHead.indexOf('const { data: sendableRow, error: sendableErr }')
    expect(at, 'the sendable gate is gone — a non-sendable row reaches the provider')
      .toBeGreaterThan(-1)
    return seamHead.slice(at, seamHead.length)
  })()

  it('🛑 NO PREVIEW EXEMPTION — the provider call is `to: lead.email` on every path', () => {
    expect(gate, 'a preview can email an address we have not verified')
      .not.toMatch(/isPreview/)
    // And the seam really does send to the lead on every path, which is what makes that right.
    expect(FIGSY).toContain('to:       lead.email,')
  })

  it('🛑 IT ASKS NO OTHER AUTHORITY — not the programme, not the review queue, not the caps', () => {
    for (const other of ['checkEnrollmentAuthority', 'review_required', 'skipReview',
                         'figsy_campaigns', 'current_step']) {
      expect(gate, `the sendable refusal is entangled with ${other}`).not.toContain(other)
    }
  })

  it('🛑 AND IT IS NOT REACHABLE BEHIND ANY OPTION — no flag disables it', () => {
    expect(gate, 'a caller can opt out of the FD-5 refusal').not.toMatch(/opts[?.]/)
  })

  it('🛑 THE KILL-SWITCH IS STILL FIRST, AND THE OPERATOR KEY STILL SECOND', () => {
    // The frozen guarantee is untouched: this gate is below both, so a switch case can never
    // pass because sendability refused first.
    const kill = seamHead.indexOf('if (!outreachEnabled())')
    const key = seamHead.indexOf("opts.authority === 'operator_run' && !operatorSendEnabled()")
    const sendable = seamHead.indexOf('const { data: sendableRow')
    expect(kill).toBeGreaterThan(-1)
    expect(key, 'the operator key moved below the sendable gate').toBeGreaterThan(kill)
    expect(sendable, 'the sendable gate moved above a switch').toBeGreaterThan(key)
  })

  it('and the enrol gate still asks the same question — this ADDS a net, it replaces none', () => {
    expect(FIGSY).toContain('isSendable(l)')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ HUNTER IS NEVER RE-ENABLED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J20-C4 · a Hunter-filled address cannot be sent to, by construction', () => {
  const DELIVERY = code('./lead-delivery.ts')

  it('🛑 THE WATERFALL WRITES AN ADDRESS AND NEVER A STATUS', () => {
    // This is the load-bearing fact. FD-6 is Apollo only; an address Hunter found carries no
    // provider verification, so it can never satisfy the seam's gate — whatever any
    // environment variable says.
    const at = DELIVERY.indexOf('waterfallEnrich({')
    expect(at, 'the Hunter waterfall moved — this guard must be repointed').toBeGreaterThan(-1)
    const block = DELIVERY.slice(at, at + 700)
    expect(block).toContain("update({ email: enriched.email })")
    expect(block, 'the waterfall now stamps a verification Apollo never gave')
      .not.toContain('email_status')
  })

  it('🛑 AND IT IS STILL DOUBLE-GATED — the caller may refuse, and the key must be set', () => {
    expect(DELIVERY).toContain('if (hunterAllowed) {')
    expect(DELIVERY).toContain('if (process.env.HUNTER_API_KEY) {')
  })

  it('🛑 NOTHING IN THE PRODUCT SETS `HUNTER_API_KEY`', () => {
    expect(DELIVERY, 'the code sets the key it is supposed to be gated by')
      .not.toMatch(/process\.env\.HUNTER_API_KEY\s*=/)
  })

  it('the sendable fact names verified and nothing else', () => {
    const S = code('./sendable.ts')
    expect(S).toContain("export const SENDABLE_EMAIL_STATUS = 'verified'")
    expect(S, 'a second status became acceptable').not.toMatch(/likely_to_engage'\s*\]/)
  })
})
