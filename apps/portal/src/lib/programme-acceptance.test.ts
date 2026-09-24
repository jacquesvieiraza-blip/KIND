import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  acceptanceGate, paymentUnlocked, postAcceptance,
  PROGRAMME_ACCEPT_PATH, ACCEPT_FAILED_COPY, ACCEPTANCE_STAGE,
  type AcceptanceFacts, type AcceptResponse,
} from './programme-acceptance'

// ═══════════════════════════════════════════════════════════════════════════════════════
// B1 — THE CLIENT CAN ACCEPT THEIR RECOMMENDATION, AND ONLY THEN PAY.
//
// 🛑 THE DEFECT. `POST /my/programme/accept` is the only writer of
// `programmes.recommendation_accepted_at`, and NO Milla control called it. `checkout/first`
// refuses while it is null, so the journey ended at a payment button that answered
// `409 not_accepted` for every client, for ever.
//
// ⚠️ THESE ARE BEHAVIOURAL, NOT SOURCE SCANS. The rule is "payment opens only on PERSISTED
// acceptance", and the way that gets broken is a browser-side boolean unlocking the card on a
// request that never landed. So the decision is a pure function over the SERVER payload and
// every failure mode is driven for real — including the one where the POST throws.
// ═══════════════════════════════════════════════════════════════════════════════════════

const AT = '2026-09-13T09:00:00.000Z'

/** A programme sitting at Recommendation, chosen but not yet accepted. */
const CHOSEN: AcceptanceFacts = {
  hasProgramme: true,
  stage: ACCEPTANCE_STAGE,
  recommendation: { acceptedAt: null },
  money: { firstPaidAt: null, firstAuthorisedAt: null },
}

describe('B1-A · payment is gated until acceptance is persisted', () => {
  it('🛑 not accepted → the payment step is NOT available', () => {
    expect(paymentUnlocked(CHOSEN)).toBe(false)
    expect(acceptanceGate(CHOSEN)).toBe('accept_required')
  })

  it('🛑 an API response with NO recommendation block fails closed', () => {
    // Acceptance cannot be established, so it is not assumed. The client is asked (safe and
    // idempotent) and payment stays shut.
    const older: AcceptanceFacts = { hasProgramme: true, stage: ACCEPTANCE_STAGE, money: { firstPaidAt: null } }
    expect(paymentUnlocked(older)).toBe(false)
    expect(acceptanceGate(older)).toBe('accept_required')
  })

  it('no programme at all → nothing is asked and nothing is unlocked', () => {
    const none: AcceptanceFacts = { hasProgramme: false, stage: 'Proof', recommendation: null, money: { firstPaidAt: null } }
    expect(acceptanceGate(none)).toBe('hidden')
    expect(paymentUnlocked(none)).toBe(false)
  })

  it('a stage that is not Recommendation is not the moment to ask', () => {
    expect(acceptanceGate({ ...CHOSEN, stage: 'Proof' })).toBe('hidden')
    expect(acceptanceGate({ ...CHOSEN, stage: 'Preparation' })).toBe('hidden')
  })

  it('🛑 CHOOSING A SIZE IS NOT ACCEPTING — a chosen programme still has to be accepted', () => {
    // `chooseProgramme` creates/prices the programme and writes NOTHING to
    // `recommendation_accepted_at`. If this ever passes as 'accepted', the two acts merged.
    expect(acceptanceGate(CHOSEN)).toBe('accept_required')
  })
})

describe('B1-C · persisted acceptance opens the payment step', () => {
  it('accepted → payment becomes reachable', () => {
    const accepted: AcceptanceFacts = { ...CHOSEN, recommendation: { acceptedAt: AT } }
    expect(paymentUnlocked(accepted)).toBe(true)
    expect(acceptanceGate(accepted)).toBe('accepted')
  })

  it('🛑 ACCEPTING IS NOT PAYING — acceptance alone settles no money', () => {
    const accepted: AcceptanceFacts = { ...CHOSEN, recommendation: { acceptedAt: AT } }
    expect(accepted.money.firstPaidAt).toBeNull()
    expect(accepted.money.firstAuthorisedAt ?? null).toBeNull()
  })
})

describe('B1-E · already accepted — re-entry never asks twice', () => {
  it('a reload of an accepted programme shows the accepted state, not the question', () => {
    expect(acceptanceGate({ ...CHOSEN, recommendation: { acceptedAt: AT } })).toBe('accepted')
  })

  it('a programme whose P1 is already PAID is past acceptance', () => {
    expect(acceptanceGate({ ...CHOSEN, recommendation: { acceptedAt: null }, money: { firstPaidAt: AT } })).toBe('accepted')
  })

  it('and one settled by INTERNAL authority (House) is too — it is never shown a price', () => {
    expect(acceptanceGate({
      ...CHOSEN, recommendation: { acceptedAt: null },
      money: { firstPaidAt: null, firstAuthorisedAt: AT },
    })).toBe('accepted')
  })
})

describe('B1-B · the acceptance goes through the ONE canonical route', () => {
  it('🛑 posts exactly POST /my/programme/accept', async () => {
    const calls: Array<{ path: string; body: unknown }> = []
    const r = await postAcceptance(async (path, body) => {
      calls.push({ path, body })
      return { success: true, accepted_at: AT, already_accepted: false }
    })
    expect(calls).toHaveLength(1)
    expect(calls[0].path).toBe('/my/programme/accept')
    expect(PROGRAMME_ACCEPT_PATH).toBe('/my/programme/accept')
    expect(r).toEqual({ ok: true, acceptedAt: AT, alreadyAccepted: false })
  })

  it('🛑 it never posts a timestamp — the server stamps it', async () => {
    const bodies: unknown[] = []
    await postAcceptance(async (_p, body) => { bodies.push(body); return { success: true, accepted_at: AT } })
    expect(JSON.stringify(bodies[0])).not.toMatch(/accepted_at|recommendation_accepted_at|20\d\d-/)
  })
})

describe('B1-D · a failed acceptance must NOT unlock payment', () => {
  it('🛑 a refusal leaves the canonical field null, so the gate stays shut', async () => {
    const r = await postAcceptance(async () => ({ success: false, code: 'locked', error: 'Your programme is already under way.' }))
    expect(r.ok).toBe(false)
    // The page re-reads the server; the payload is unchanged, so payment is still gated.
    expect(paymentUnlocked(CHOSEN)).toBe(false)
    expect(acceptanceGate(CHOSEN)).toBe('accept_required')
  })

  it('the server’s own sentence is shown, not a generic apology', async () => {
    const r = await postAcceptance(async () => ({ success: false, error: 'Your programme is already under way (sourcing), so its size cannot be changed from here.' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toContain('already under way')
  })

  it('a THROWN request (timeout, network) is a failure, never a silent success', async () => {
    const r = await postAcceptance(async () => { throw new Error('Request timed out — please try again') })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe('Request timed out — please try again')
  })

  it('an unusable response body falls back to the locked failure copy', async () => {
    const r = await postAcceptance(async () => ({} as AcceptResponse))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe(ACCEPT_FAILED_COPY)
  })

  it('🛑 a 500-shaped throw with a huge body does not leak a stack trace to the client', async () => {
    const r = await postAcceptance(async () => { throw new Error('x'.repeat(5000)) })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe(ACCEPT_FAILED_COPY)
  })
})

describe('B1-F · double click and duplicate responses agree', () => {
  it('🛑 already_accepted is SUCCESS — the second press does not show an error', async () => {
    const r = await postAcceptance(async () => ({ success: true, accepted_at: AT, already_accepted: true }))
    expect(r).toEqual({ ok: true, acceptedAt: AT, alreadyAccepted: true })
  })

  it('two presses produce the same canonical truth, not two different ones', async () => {
    const post = async (): Promise<AcceptResponse> => ({ success: true, accepted_at: AT, already_accepted: true })
    const a = await postAcceptance(post)
    const b = await postAcceptance(post)
    expect(a).toEqual(b)
    if (a.ok && b.ok) expect(a.acceptedAt).toBe(b.acceptedAt)
  })

  it('and the gate after either press is the same: accepted', () => {
    expect(acceptanceGate({ ...CHOSEN, recommendation: { acceptedAt: AT } })).toBe('accepted')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE WIRING — and why THIS part is structural while everything above is behavioural.
//
// ⚠️ STATED, NOT HIDDEN. The repo has no component-test runtime (`@testing-library/react`
// and `jsdom` are not installed, and adding them is a dependency change this batch is not
// authorised to make). So "the page renders the control and gates the payment card on the
// persisted column" is asserted on the source. The DECISION it wires — every branch of it —
// is driven for real above.
//
// This is exactly the guard the founder's regression tooth aims at: "remove/bypass the accept
// call while leaving payment visible → the test MUST FAIL".
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

describe('🛑 B1 wiring — the product actually reaches the canonical route', () => {
  const COMPONENT = 'apps/portal/src/components/milla/ProgrammeAcceptance.tsx'
  const PAGE = 'apps/portal/src/app/(milla)/milla/programme/page.tsx'

  it('the Milla component posts through `postAcceptance`, not a hand-typed path', () => {
    const src = read(COMPONENT)
    expect(src).toMatch(/import \{[^}]*postAcceptance[^}]*\} from '@\/lib\/programme-acceptance'/)
    expect(src).toMatch(/await postAcceptance\(/)
    // No second spelling of the route anywhere in the component.
    expect(src).not.toMatch(/'\/my\/programme\/accept'/)
  })

  it('🛑 it holds NO local accepted flag — success re-reads the server', () => {
    const src = read(COMPONENT)
    expect(src).toMatch(/onAccepted\(\)/)
    expect(src, 'a browser-side accepted flag appeared').not.toMatch(/set(Accepted|IsAccepted|HasAccepted)\(/)
  })

  it('🛑 it never sends a client-side timestamp', () => {
    expect(read(COMPONENT)).not.toMatch(/accepted_at:\s|new Date\(\)\.toISOString\(\)/)
  })

  // ⛓️ 24 Sep (R145 step 4 · #27) — THE ACCEPTANCE IS NOW PART OF THE ONE BUTTON. Founder: *"from one screen to
  // one choice to the next"*; tracker #27, approved 24 Sep: one "Accept and pay P1". The separate
  // "Accept this recommendation" card is gone from the page, and the SAME canonical writer
  // (`postAcceptance` → `/my/programme/accept`) is called by the Programme panel's button, before
  // the checkout — B1's duty, that acceptance is persisted server-side first, is what is pinned now.
  it('🛑 the panel records the acceptance through the canonical writer, before any checkout', () => {
    const calc = read('apps/portal/src/components/milla/ProgrammeCalculator.tsx')
    expect(calc).toContain("import { postAcceptance, type AcceptResponse } from '@/lib/programme-acceptance'")
    const accept = calc.indexOf('await postAcceptance(')
    const checkout = calc.indexOf("'/my/programme/checkout/first'")
    expect(accept).toBeGreaterThan(-1)
    expect(accept, 'the checkout can be created before the acceptance is stored').toBeLessThan(checkout)
    expect(calc).toContain('if (!accepted.ok) throw new Error(accepted.message)')
  })

  // ⛓️ 24 Sep (R145 step 4 · #27) — THE TOOTH MOVED WITH THE CARD. There is no separate P1 card to gate: the only
  // path to the first checkout is the panel's button, and it cannot reach the checkout unless the
  // acceptance succeeded (asserted above). A skipped re-accept is allowed ONLY when the server
  // already records acceptance at the same size.
  it('🛑 THE TOOTH: an already-accepted programme skips only when the SERVER says it is accepted', () => {
    const src = read(PAGE)
    expect(src).toContain("alreadyAccepted={acceptanceGate(p) === 'accepted'}")
    expect(src, 'a second P1 card came back beside the panel').not.toMatch(/stage="first"/)
  })

  it('the re-read after acceptance is the page’s own canonical load', () => {
    expect(read(PAGE)).toMatch(/onChosen=\{\(\) => \{ void load\(\) \}\}/)
  })
})
