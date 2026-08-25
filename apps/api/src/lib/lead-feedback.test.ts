import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  REASON_CODES, REASON_LABELS, isReasonCode, normaliseFeedback,
  applicableAntiSignals, ANTI_SIGNAL_MIN_COUNT,
} from './lead-feedback'

// ── CALIBRATION v1 — CAPTURE (P32, 21 Aug) ─────────────────────────────────────────────────
//
// Founder doctrine: *"Approve/Pass IS the calibration event — capture the REASON and the
// product gets smarter every time a client clicks."* And the constraint that governs the whole
// thing: *"One tap, never mandatory, never blocks the action."*
//
// ⚠️ THIS IS PR 1 OF 2 — CAPTURE AND STORE. The founder split it: applying the signal to
// sourcing is PR 2. That means the assertions here are about what is RECORDED and what CANNOT
// go wrong for the client — not yet about what changes as a result.

const ROUTES = readFileSync(join(__dirname, '../routes/leads.ts'), 'utf8')
const MIGRATION = readFileSync(
  join(__dirname, '../../../../supabase/migrations/20260821_lead_feedback.sql'), 'utf8')
const RUNNER = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')
const codeOf = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the guard is reading real files', () => {
  it('routes, migration and runner are all present and non-trivial', () => {
    // A moved file leaves every source assertion below scanning an empty string and passing.
    expect(ROUTES.length).toBeGreaterThan(50_000)
    expect(MIGRATION.length).toBeGreaterThan(1_000)
    expect(RUNNER.length).toBeGreaterThan(50_000)
  })
})

describe('① the seven chips, exactly as the founder listed them', () => {
  it('are these seven, in his order', () => {
    expect([...REASON_CODES]).toEqual([
      'too_big', 'too_small', 'wrong_industry', 'wrong_role', 'wrong_geography', 'bad_timing', 'other',
    ])
  })

  it('every code has a label — a chip with no words is not a chip', () => {
    for (const c of REASON_CODES) expect(REASON_LABELS[c], c).toBeTruthy()
  })

  it('the database CHECK accepts exactly the same seven', () => {
    // Drift here is the worst kind: the UI offers a chip, the client taps it, and the write
    // fails the constraint — taking their free text with it and showing nothing.
    for (const c of REASON_CODES) expect(MIGRATION, `${c} missing from the CHECK`).toContain(`'${c}'`)
  })

  it('rejects anything that is not one of the seven', () => {
    for (const bad of ['TOO_BIG', 'too big', '', null, 42, undefined, 'wrong_size']) {
      expect(isReasonCode(bad), String(bad)).toBe(false)
    }
  })
})

describe('② ONE TAP, NEVER MANDATORY, NEVER BLOCKS THE ACTION', () => {
  it('⚠️ A PASS WITH NO REASON IS A VALID, COMPLETE ACTION', () => {
    // The founder's rule, asserted at the schema level: reason_code is NULLABLE. A NOT NULL
    // here would have forced the UI to make the chip mandatory — turning a one-tap nicety into
    // a gate on an action the client has already taken.
    const declared = MIGRATION.slice(MIGRATION.indexOf('reason_code'), MIGRATION.indexOf('free_text'))
    expect(declared, 'reason_code must be nullable').not.toMatch(/not\s+null/i)
  })

  it('feedback is a SEPARATE endpoint from the pass — the pass cannot fail because of it', () => {
    const code = codeOf(ROUTES)
    expect(code, 'the pass route still exists untouched').toMatch(/leadRouter\.post\('\/:id\/pass'/)
    expect(code, 'and feedback is its own route').toMatch(/leadRouter\.post\('\/:id\/feedback'/)
    // The pass handler must not reference feedback at all — coupling them would put a
    // nice-to-have write in front of a state change the client is watching.
    // ⚠️ SLICE TO THE NEXT ROUTE, NOT TO A NAMED ONE. The first version of this cut from
    // /pass to /consent — and the new /feedback route now sits BETWEEN them, so the slice
    // swallowed it and the assertion failed against code that was correct. The boundary was
    // wrong, not the handler.
    const passStart = code.indexOf("post('/:id/pass'")
    const passHandler = code.slice(passStart, code.indexOf('leadRouter.post(', passStart + 10))
    expect(passHandler, 'the pass handler is free of feedback').not.toMatch(/lead_feedback|feedback/i)
  })

  it('⚠️ NOTHING TO RECORD IS A SUCCESS, NOT AN ERROR', () => {
    // A client who taps a chip and untaps it, or a stale build sending an unknown code, must
    // not see an error for a call they never needed to make.
    const r = normaliseFeedback({ reason_code: 'nonsense', free_text: '  ' })
    expect(r).toEqual({ reasonCode: null, freeText: null, hasSomething: false })
  })

  it('an unknown code is DROPPED but the free text survives', () => {
    // Losing the client's own words because a chip name went stale would be the worse failure.
    const r = normaliseFeedback({ reason_code: 'not_a_code', free_text: 'too corporate for us' })
    expect(r.reasonCode).toBeNull()
    expect(r.freeText).toBe('too corporate for us')
    expect(r.hasSomething).toBe(true)
  })

  it('the endpoint never returns an error status for a failed WRITE', () => {
    // Read from the handler: a DB failure logs loudly and still answers success, because the
    // pass stands and the client is not the person who can fix a database.
    const h = codeOf(ROUTES).slice(codeOf(ROUTES).indexOf("post('/:id/feedback'"))
    const handler = h.slice(0, h.indexOf('\n})'))
    expect(handler).toMatch(/recorded: false/)
    expect(handler, 'a write failure is logged, not thrown at the client').toMatch(/NOT RECORDED/)
  })
})

describe('③ the row belongs to the client who wrote it', () => {
  it('the handler checks the lead belongs to THIS client before storing an opinion', () => {
    // Without this a client could attach calibration to another client's lead — and this table
    // is about to drive sourcing.
    const h = codeOf(ROUTES).slice(codeOf(ROUTES).indexOf("post('/:id/feedback'"))
    expect(h.slice(0, 2_400)).toMatch(/\.eq\('client_id', clientId\)/)
  })

  it('one row per (client, lead, action) — a corrected chip replaces, never accumulates', () => {
    expect(MIGRATION).toMatch(/unique index[\s\S]*?lead_feedback \(client_id, lead_id, action\)/)
    expect(codeOf(ROUTES)).toMatch(/onConflict: 'client_id,lead_id,action'/)
  })
})

describe('④ free text is stored and NEVER auto-applied (founder-gated)', () => {
  it('⚠️ THE ANTI-SIGNAL READ CANNOT SEE FREE TEXT', () => {
    // The promise decays the moment somebody adds one convenient regex. This asserts the
    // behaviour rather than the intention: identical rows, one with free text screaming
    // "too big", produce the same empty result.
    const rows = [
      { reason_code: null, free_text: 'way too big, all of these are enterprises' },
      { reason_code: null, free_text: 'too big again' },
      { reason_code: null, free_text: 'ENTERPRISE. TOO BIG.' },
      { reason_code: null, free_text: 'too big' },
    ]
    expect(applicableAntiSignals(rows).size, 'free text must not create a signal').toBe(0)
  })

  it('no parser exists in the library — asserted as an absence', () => {
    const lib = codeOf(readFileSync(join(__dirname, 'lead-feedback.ts'), 'utf8'))
    for (const smell of [/free_text.*\.match\(/, /free_text.*\.includes\(/, /parseFreeText/, /freeText.*test\(/]) {
      expect(lib, `a free-text parser appeared: ${smell}`).not.toMatch(smell)
    }
  })
})

describe('⑤ the anti-signal threshold is the founder\'s 3+', () => {
  it('two passes are not an opinion; three are', () => {
    const two   = [{ reason_code: 'too_big' as const }, { reason_code: 'too_big' as const }]
    const three = [...two, { reason_code: 'too_big' as const }]
    expect(applicableAntiSignals(two).size).toBe(0)
    expect(applicableAntiSignals(three).get('too_big')).toBe(3)
    expect(ANTI_SIGNAL_MIN_COUNT).toBe(3)
  })

  it('counts each reason independently — one loud opinion does not carry a quiet one', () => {
    const rows = [
      ...Array(4).fill({ reason_code: 'too_big' as const }),
      { reason_code: 'wrong_role' as const },
    ]
    const out = applicableAntiSignals(rows)
    expect(out.get('too_big')).toBe(4)
    expect(out.has('wrong_role'), 'one pass is not a pattern').toBe(false)
  })
})

describe('⑥ the migration is in BOTH homes (AR6) and the runner moved 28 → 29', () => {
  it('the runner carries the entry, and its SQL matches the file', () => {
    expect(RUNNER).toContain("key: '20260821_lead_feedback'")
    // Both homes must agree or the file is a lie about what production ran.
    expect(RUNNER, 'the table').toContain('create table if not exists public.lead_feedback')
    expect(RUNNER, 'the unique index').toContain('lead_feedback_one_per_lead_action')
    expect(RUNNER, 'RLS on').toContain('alter table public.lead_feedback enable row level security')
  })

  it('the runner carries P32, and the count is 33', () => {
    const keys = [...RUNNER.matchAll(/key: '([^']+)'/g)].map(m => m[1])
    // 29 -> 30 -> 31 on 21 Aug: P33's morning_brief_once_per_day, then P34's meeting_briefs.
    // 32 -> 33 on 25 Aug: 20260825_proof_widened_candidate — the ONE column that lets a
    // client's accepted widened proof become the targeting they pay for.
    expect(keys.length, `runner entries: ${keys.length}`).toBe(33)
    // ⚠️ WAS `keys[keys.length - 1]` — "P32 is LAST". That was only ever true until the
    // next migration existed, so it asserted a fact about the calendar rather than about
    // P32. What this test is FOR is that P32's entry is in the runner at all; that is now
    // what it checks, and it will not go red again the next time somebody adds a table.
    expect(keys).toContain('20260821_lead_feedback')
  })
})

describe('⑦ NO-TOUCH — pricing, gates and the pass itself are unchanged', () => {
  it('the min-20 approvals rule is untouched', () => {
    // The founder: "No new gate, no change to the min-20 approvals rule or any money rule."
    const gate = readFileSync(join(__dirname, 'approve-lead.ts'), 'utf8')
    expect(gate).toMatch(/20/)
    expect(codeOf(ROUTES), 'feedback never touches the wallet').not.toMatch(/lead_feedback[\s\S]{0,400}increment_wallet/)
  })

  it('the feedback route charges nothing and enrols nobody', () => {
    const h = codeOf(ROUTES).slice(codeOf(ROUTES).indexOf("post('/:id/feedback'"))
    const handler = h.slice(0, h.indexOf('\n})'))
    for (const forbidden of [/charge/i, /wallet/i, /enrol/i, /enroll/i, /price/i]) {
      expect(handler, `feedback must not ${forbidden}`).not.toMatch(forbidden)
    }
  })
})

describe('⑧ the chips actually reach the client — Milla renders them', () => {
  const MILLA = readFileSync(
    join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx'), 'utf8')

  it('all seven chips are rendered, with the same codes the API accepts', () => {
    // A chip list that drifts from REASON_CODES means a client taps something the database
    // rejects — and the CHECK constraint takes their free text down with it.
    for (const c of REASON_CODES) expect(MILLA, `${c} missing from Milla`).toContain(`'${c}'`)
  })

  it('⚠️ THE CHIP ROW APPEARS AFTER THE PASS, NOT BEFORE IT', () => {
    // Order matters more than presence here. `setJustPassed` must come AFTER the pass call
    // resolves — a chip shown first would be a prompt standing between the client and an
    // action they already decided on.
    const passIdx = MILLA.indexOf('/pass`')
    const chipIdx = MILLA.indexOf('setJustPassed({ id')
    expect(passIdx, 'the pass call exists').toBeGreaterThan(0)
    expect(chipIdx, 'the chip trigger exists').toBeGreaterThan(0)
    expect(chipIdx, 'the chip is triggered after the pass, not before').toBeGreaterThan(passIdx)
  })

  it('the chip send is fire-and-forget — it can never surface an error', () => {
    const fn = MILLA.slice(MILLA.indexOf('async function sendReason'))
    const body = fn.slice(0, fn.indexOf('\n  }'))
    expect(body, 'the feedback endpoint is called').toContain('/feedback')
    expect(body, 'and its failure is swallowed, never shown').toMatch(/catch \{/)
    expect(body, 'no error state is set from a chip').not.toMatch(/setError/)
  })

  it('there is a Skip — ignoring the prompt is a first-class action', () => {
    expect(MILLA).toContain('Skip')
    expect(MILLA, 'and skipping records nothing').toMatch(/onClick=\{\(\) => setJustPassed\(null\)\}/)
  })
})
