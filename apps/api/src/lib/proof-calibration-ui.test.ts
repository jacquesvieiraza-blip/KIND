// ═══════════════════════════════════════════════════════════════════════════════════════
// THE TWO SCREENS — Milla's controls and Vida's card.
//
// `proof-calibration.test.ts` proves the RULE and the view model. `proof-calibration-doors`
// proves the ROUTES obey it. This file proves the two SURFACES render the verdict rather
// than deciding anything — which is the whole reason the verdict is computed server-side:
// a spend rule a browser can work out is a spend rule anybody with devtools can satisfy.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  lifecycleCopy, type LifecycleCopyInput, type LifecycleState,
} from '../../../admin/src/lib/vida-lifecycle-copy'

const PORTAL = join(__dirname, '..', '..', '..', 'portal', 'src')
const ADMIN = join(__dirname, '..', '..', '..', 'admin', 'src')
const PROOF_UI = readFileSync(join(PORTAL, 'components', 'milla', 'ProofCalibration.tsx'), 'utf8')
const MILLA = readFileSync(join(PORTAL, 'app', '(milla)', 'milla', 'page.tsx'), 'utf8')
const LEADS = readFileSync(join(__dirname, '..', 'routes', 'leads.ts'), 'utf8')

const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
  .join('\n')

describe('🛑 ① Milla renders the verdict and decides nothing', () => {
  it('the controls come from the server, loaded with the set', () => {
    const c = code(MILLA)
    expect(c).toContain("api.get<{ data: ProofCalibrationState }>('/leads/proof/calibration'")
    expect(c).toContain('void loadCalibration()')
  })

  it('🛑 the component computes no spend rule of its own', () => {
    // Every `showX` / `enabled` is a field, never an expression. A count or a pass number in
    // this file would be a second copy of a rule the routes enforce independently.
    const c = code(PROOF_UI)
    for (const forbidden of [
      'passesDone', 'proof_passes_done', 'attempts.filter', 'notAFit', 'looksRight',
      'passesDone >', 'attempt === 2 &&', 'reasons[',
    ]) {
      expect(c.includes(forbidden), `the screen re-derives a spend rule: ${forbidden}`).toBe(false)
    }
    // The controls are drawn from the verdict's own booleans.
    for (const field of ['state.showStronger', 'state.strongerEnabled', 'state.showStillNotRight', 'state.showTheseAreRight']) {
      expect(c, `${field} is not read`).toContain(field)
    }
  })

  it('an unreadable verdict draws NOTHING rather than the attempt-1 shape', () => {
    // Falling back to "show the controls" would put a spend control in front of a client who
    // may already have been handed to a person.
    expect(code(MILLA)).toContain('setCalib(null)')
    expect(code(PROOF_UI)).toContain('if (!state.showTheseAreRight) return null')
  })

  it('the disabled improved-set control names the ACTION that unlocks it', () => {
    const c = code(PROOF_UI)
    expect(c).toContain('disabled={busy || !state.strongerEnabled}')
    expect(c).toContain('{state.strongerHint}')
  })

  it('🛑 no third-batch control exists in the component, in any wording', () => {
    // ⚠️ SCANNED OVER EXECUTABLE LINES ONLY. The component's own comment lists the controls
    // that must NOT exist ("no show me more, no find another set…"), so a raw substring
    // search matches the very prose that documents the ban.
    const c = code(PROOF_UI).toLowerCase()
    for (const banned of ['show me more', 'find another set', 'try again', 'another set', 'find more']) {
      expect(c.includes(banned), `a third-batch control is drawn: "${banned}"`).toBe(false)
    }
    // The two locked labels, and the two only.
    expect(PROOF_UI).toContain('These are right')
    expect(PROOF_UI).toContain('Show me stronger examples')
    expect(PROOF_UI).toContain('Still not right')
  })

  it('🛑 the escalated branch returns BEFORE any control is drawn', () => {
    const c = code(PROOF_UI)
    const escAt = c.indexOf('if (state.escalated) {')
    const acceptAt = c.indexOf('if (!state.showTheseAreRight) return null')
    expect(escAt).toBeGreaterThan(-1)
    expect(escAt, 'a control is drawn before the escalated check').toBeLessThan(acceptAt)
  })

  it('the phone confirmation sentence comes from the SERVER, never composed here', () => {
    // Composing it locally is how an SLA gets added by somebody being helpful.
    const c = code(PROOF_UI)
    expect(c).toContain('setConfirmed(msg)')
    expect(c.includes('a member of our team'), 'the screen composes the confirmation itself').toBe(false)
    expect(code(MILLA)).toContain("return j?.message ?? null")
  })

  it('🛑 no SLA anywhere in the component', () => {
    for (const promise of ['working day', 'within 24', '24 hours', 'today', 'tomorrow', 'shortly', 'asap']) {
      expect(PROOF_UI.toLowerCase().includes(promise), `an SLA is rendered: "${promise}"`).toBe(false)
    }
  })

  it('the legacy single control is gone, and its panel survives as the mechanism', () => {
    const c = code(MILLA)
    // "These aren't right" was the one button that spent the second pass.
    expect(c.includes("These aren&rsquo;t right"), 'the legacy spend button is back').toBe(false)
    expect(c).toContain('const refinePanel =')
    expect(c).toContain('onRequestStronger={openRefine}')
  })

  it('the calibration read is read-only and says so', () => {
    const c = code(LEADS)
    const at = c.indexOf("leadRouter.get('/proof/calibration'")
    expect(at).toBeGreaterThan(-1)
    const body = c.slice(at, at + 1800)
    expect(body).toContain('read_only:')
    for (const write of ['.update(', '.insert(', 'try_claim_proof_pass']) {
      expect(body.includes(write), `the read endpoint performs ${write}`).toBe(false)
    }
  })
})

// ── VIDA ────────────────────────────────────────────────────────────────────────────────

const BASE: LifecycleCopyInput = {
  clientName: 'KIND Internal Canary 1',
  state: 'proof_calibration_failed',
  mode: 'Needs you',
  counts: {
    sourced: 0, qualified: 0, rejected: 0, stillToCheck: 0, enrolled: 0,
    sends: 0, replies: 0, positive: 0, meetings: 0, repliesAwaitingDecision: 0,
  },
  programme: null,
  replyAwaiting: null,
  stoppedDetail: null,
  humanBlockers: [],
  killSwitchOff: false,
  operatorRunEnabled: false,
  senderSendable: true,
  calibration: {
    why: 'The client said the second set still was not right.',
    passesDone: 2,
    phone: '07700 900123',
    phoneConfirmedAt: '2026-09-10T09:00:00.000Z',
    operatorNote: null,
    mayRestart: false,
    mayRestartWhy: 'This calibration has not been resolved yet.',
    restartAt: null,
    restartUsedAt: null,
    resolvedAt: null,
    contactName: 'Ellis Warner',
    whatChanged: 'I’ve narrowed the kind of company based on what you marked, and looked again.',
    // ⚑ 11 Sep — `kind` IS ON EVERY SUMMARY NOW. The calibrated restart runs alongside pass 2
    // and is a different history event; a fixture that omitted it would be asserting against
    // a shape the server can no longer produce.
    attempts: [
      { pass: 1, kind: 'automatic', surfaced: 20, looksRight: 1, notAFit: 12,
        reasonLabels: { 'Wrong industry': 9, 'Too big': 3 }, notes: ['all consultancies'] },
      { pass: 2, kind: 'automatic', surfaced: 20, looksRight: 0, notAFit: 14,
        reasonLabels: { 'Wrong industry': 14 }, notes: [] },
    ],
  },
}
const copy = (over: Partial<LifecycleCopyInput> = {}) => lifecycleCopy({ ...BASE, ...over })

describe('🛑 ② the Vida card carries the evidence a phone call needs', () => {
  it('both attempts, with the reasons the client actually gave', () => {
    const whole = JSON.stringify(copy().cards)
    // ⛓️ 11 Sep — "Attempt 1" → "Automatic attempt 1". The label now names what the set IS,
    // because a third history event exists beside them (the calibrated restart) and
    // "Attempt 1/2/3" would imply it is a third automatic attempt. It is not.
    expect(whole).toContain('Automatic attempt 1')
    expect(whole).toContain('Automatic attempt 2')
    expect(whole, 'the restart is numbered as an automatic attempt').not.toContain('Automatic attempt 3')
    expect(whole).toContain('Wrong industry 9')
    expect(whole).toContain('20 shown · 1 looked right · 12 not a fit')
  })

  it('what changed between them, and their own words verbatim', () => {
    const whole = JSON.stringify(copy().cards)
    expect(whole).toContain('narrowed the kind of company')
    expect(whole).toContain('“all consultancies”')
  })

  it('the confirmed phone, and that it WAS confirmed', () => {
    const phone = copy().cards.find(c => c.kind === 'fact' && c.label === 'Phone')
    expect((phone as { value: string }).value).toBe('07700 900123')
    expect((phone as { caption: string }).caption).toContain('Confirmed by the client')
  })

  it('…and says plainly when there is no number', () => {
    const c = copy({ calibration: { ...BASE.calibration!, phone: null, phoneConfirmedAt: null } })
    const phone = c.cards.find(k => k.kind === 'fact' && k.label === 'Phone')
    expect((phone as { value: string }).value).toBe('Not given')
    expect(c.messages.join(' ')).toContain('have not given a number yet')
  })

  it('🛑 the pass counter is operator-only — the client never sees 2/2', () => {
    // ⛓️ 11 Sep — the label is 'Automatic attempts', because 2/2 is now specifically the
    // AUTOMATIC allowance and the calibrated restart is a separate door beside it.
    const passes = copy().cards.find(c => c.kind === 'fact' && c.label === 'Automatic attempts')
    expect((passes as { value: string }).value).toBe('2/2')
    // …and nothing in the CLIENT component RENDERS a counter. `attempt` exists on the
    // verdict type (the server sends it); what must never happen is the client reading a
    // pass number off their own screen — they were told a person will help, which is the
    // truthful version of the same fact.
    const c = code(PROOF_UI)
    expect(c.includes('2/2'), 'the client is shown a pass counter').toBe(false)
    expect(/\{\s*state\.attempt\s*\}/.test(c), 'the attempt number is rendered to the client').toBe(false)
    expect(/Attempt\s*\{/.test(c), 'an attempt label is rendered to the client').toBe(false)
  })

  it('Vida is Needs you, and the one primary action is the call', () => {
    const c = copy()
    expect(c.subtitle).toBe('Calibration needs a person')
    expect(c.actions.map(a => a.key)).toEqual(['contact_recalibrate'])
    const vida = c.cards.find(k => k.kind === 'fact' && k.label === 'Vida')
    expect((vida as { value: string }).value).toBe('Needs you')
  })

  it('🛑 Restart Proof appears ONLY once the server says it may', () => {
    expect(copy().actions.map(a => a.key)).not.toContain('restart_proof_calibrated')
    // ⛓️ 11 Sep — once the calibration IS resolved, "Record the calibration" is done and
    // drops away; the restart is the only remaining control. The pair is never both-and-done.
    const resolved = copy({ calibration: { ...BASE.calibration!, mayRestart: true, resolvedAt: '2026-09-10T11:00:00.000Z', operatorNote: 'Called — they want agencies only.' } })
    expect(resolved.actions.map(a => a.key)).toEqual(['restart_proof_calibrated'])
    const passes = resolved.cards.find(c => c.kind === 'fact' && c.label === 'Automatic attempts')
    expect((passes as { caption: string }).caption).toBe('One calibrated restart available')
  })

  it('…reads GRANTED once an operator has granted one, and USED once the client takes it', () => {
    // ⛓️ 11 Sep — GRANTED AND USED ARE TWO FACTS NOW, and the panel must tell them apart:
    // "one restart is waiting for the client" and "it has been taken" are different things
    // for an operator deciding whether to chase them.
    const granted = copy({ calibration: { ...BASE.calibration!, restartAt: '2026-09-10T12:00:00.000Z' } })
    expect((granted.cards.find(c => c.kind === 'fact' && c.label === 'Automatic attempts') as { caption: string }).caption)
      .toBe('Calibrated restart granted, not yet taken by the client')
    const used = copy({ calibration: { ...BASE.calibration!, restartAt: '2026-09-10T12:00:00.000Z', restartUsedAt: '2026-09-10T12:30:00.000Z' } })
    expect((used.cards.find(c => c.kind === 'fact' && c.label === 'Automatic attempts') as { caption: string }).caption)
      .toBe('Calibrated restart used. No further restart.')
    expect(used.actions.map(a => a.key), 'a second restart control survived').not.toContain('restart_proof_calibrated')
  })

  // ── ⚑ 11 Sep — THE THIRD HISTORY EVENT, RENDERED FROM PROVENANCE ────────────────────
  it('🛑 the calibrated restart is its own card, labelled from its KIND', () => {
    const withRestart = copy({ calibration: { ...BASE.calibration!,
      restartAt: '2026-09-10T12:00:00.000Z', restartUsedAt: '2026-09-10T12:30:00.000Z',
      attempts: [...BASE.calibration!.attempts,
        { pass: 2, kind: 'calibrated_restart', surfaced: 18, looksRight: 12, notAFit: 2, reasonLabels: {}, notes: [] }],
    } })
    const labels = withRestart.cards.map(c => c.label)
    expect(labels).toContain('Automatic attempt 1')
    expect(labels).toContain('Automatic attempt 2')
    expect(labels).toContain('Calibrated restart')
    // 🛑 AND IT DID NOT MERGE INTO ATTEMPT 2. The restart shares pass 2's NUMBER; only the
    // kind tells them apart, so a `find(a => a.pass === 2)` would have rendered one as the
    // other and the operator would read 18 shown where 20 were.
    const a2 = withRestart.cards.find(c => c.label === 'Automatic attempt 2')
    expect((a2 as { body: string }).body).toContain('20 shown')
    const r = withRestart.cards.find(c => c.label === 'Calibrated restart')
    expect((r as { body: string }).body).toContain('18 shown')
  })

  it('🛑 legacy rows with no kind still render as automatic history', () => {
    const legacy = copy({ calibration: { ...BASE.calibration!, attempts: [
      { pass: 1, kind: 'automatic', surfaced: 20, looksRight: 1, notAFit: 12, reasonLabels: {}, notes: [] },
      { pass: 2, kind: 'automatic', surfaced: 20, looksRight: 0, notAFit: 14, reasonLabels: {}, notes: [] },
    ] } })
    const labels = legacy.cards.map(c => c.label)
    expect(labels).toContain('Automatic attempt 1')
    expect(labels).toContain('Automatic attempt 2')
    expect(labels, 'a restart card appeared with no restart').not.toContain('Calibrated restart')
  })

  it('🛑 C43 · an unreadable calibration state offers NO restart and says so', () => {
    const blind = copy({ calibration: { ...BASE.calibration!,
      unreadable: true, mayRestart: false, attempts: [], phone: null, contactName: null,
      mayRestartWhy: 'the calibration state could not be read' } })
    expect(blind.actions.map(a => a.key), 'a restart was offered on an unreadable state')
      .not.toContain('restart_proof_calibrated')
    const whole = JSON.stringify(blind.cards)
    expect(whole).toContain('could not be read')
    expect(whole).toContain('nothing is sending')
    expect((blind.cards.find(c => c.kind === 'fact' && c.label === 'Automatic attempts') as { caption: string }).caption)
      .toContain('Unknown')
  })

  it('🛑 18 · the operator is given a NAME to ask for, not just a number', () => {
    const ask = copy().cards.find(c => c.kind === 'fact' && c.label === 'Ask for')
    expect((ask as { value: string }).value).toBe('Ellis Warner')
    const none = copy({ calibration: { ...BASE.calibration!, contactName: null } })
    expect((none.cards.find(c => c.kind === 'fact' && c.label === 'Ask for') as { value: string }).value)
      .toBe('Not given')
  })

  it('the card holds together with no evidence at all', () => {
    // An operator opening this before the evidence loads must not see an empty panel.
    const bare = copy({ calibration: null })
    expect(bare.cards.length).toBeGreaterThan(4)
    expect(JSON.stringify(bare.cards)).toContain('no set recorded')
    expect(bare.actions.map(a => a.key)).toEqual(['contact_recalibrate'])
    // ⚠️ AND THE RECORD CONTROL COLLECTS THE NOTE THE SERVER REQUIRES. A restart without one
    // is refused, so a control that could submit an empty note would only produce a refusal.
    expect(bare.actions[0].needsNote).toBe(true)
  })

  it('🛑 it names no plumbing — the operator is thinking about a client', () => {
    const whole = JSON.stringify(copy())
    for (const leak of ['proof_passes_done', 'proof_review', 'try_claim', 'icp_id', 'lead_feedback', 'RPC', 'Apollo', 'PDL']) {
      expect(whole.includes(leak), `the card leaks "${leak}"`).toBe(false)
    }
  })

  it('the healthy Proof state is untouched and still not a task', () => {
    const healthy = copy({ state: 'proof' as LifecycleState, calibration: null })
    expect(healthy.subtitle).toBe('Proof in progress')
    expect(healthy.actions).toEqual([])
    const vida = healthy.cards.find(k => k.kind === 'fact' && k.label === 'Vida')
    expect((vida as { value: string }).value).toBe('No action needed')
  })
})
