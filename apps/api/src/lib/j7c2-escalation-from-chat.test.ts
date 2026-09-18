// ══════════════════════════════════════════════════════════════════════════════════════════
// J7-C2 · "STILL NOT RIGHT", SAID IN CHAT, REACHES THE ONE CANONICAL ESCALATION
//
// REQ: *"Model-interpreted 'still not right' → canonical escalation once; silence/timers
// never"* (FD-3; R121).
//
// ── THE GAP ────────────────────────────────────────────────────────────────────────────
//
// `POST /leads/proof/still-not-right` is the canonical escalation and it works. It is reached
// by ONE control on the Proof panel. A client who instead typed *"honestly these still aren't
// the right people"* into their own Milla conversation got a conversational reply and nothing
// else — the desk chat returns text and only text, so the sentence reached no decision.
//
// ── AND THE HALF OF FD-3 THAT IS A PROHIBITION ─────────────────────────────────────────
//
// 🛑 *"silence/timers never."* The founder's lock, already quoted in `calibrationVerdict`:
// escalation may be triggered ONLY by an explicit client action equivalent to "Still not
// right" — *"not by silence, not by a timer, not by the model's read of the client's mood,
// and not by Attempt 2 completing."*
//
// ⚠️ "MODEL-INTERPRETED" AND "THE MODEL'S READ OF THEIR MOOD" ARE DIFFERENT THINGS, and the
// tool description is where the line is drawn. Reading *"these still aren't right"* as the
// statement it plainly is, is interpretation. Concluding from frustration, terseness, a delay
// or a run of rejections that somebody is probably unhappy is what the lock forbids.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  STILL_NOT_RIGHT_TOOL, STILL_NOT_RIGHT_TOOL_NAME, readStillNotRight,
} from './proof-escalation-signal'

const code = (p: string): string =>
  readFileSync(join(__dirname, p), 'utf8')
    .split('\n')
    .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
    .join('\n')

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE SIGNAL IS READ FROM A TOOL CALL, NOT FROM WORDS ON A PAGE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J7-C2 · the signal is structure, not a keyword match', () => {
  it('a tool call is the signal, and the client\'s own words ride with it', () => {
    const r = readStillNotRight([
      { type: 'text' },
      { type: 'tool_use', name: STILL_NOT_RIGHT_TOOL_NAME, input: { said: "these still aren't the right people" } },
    ])
    expect(r.said).toBe(true)
    if (!r.said) throw new Error('unreachable')
    expect(r.quote).toBe("these still aren't the right people")
  })

  it('an ordinary reply is not a signal', () => {
    expect(readStillNotRight([{ type: 'text' }]).said).toBe(false)
    expect(readStillNotRight([]).said).toBe(false)
    expect(readStillNotRight(null).said).toBe(false)
    expect(readStillNotRight(undefined).said).toBe(false)
  })

  it('another tool is not this tool', () => {
    expect(readStillNotRight([{ type: 'tool_use', name: 'propose_targeting', input: {} }]).said).toBe(false)
  })

  it('🛑 a quote we cannot produce is reported ABSENT, never invented', () => {
    // An escalation attributed to words nobody can produce is the unfalsifiable shape this
    // repo refuses everywhere. The tool call is still the signal — the model called it.
    const r = readStillNotRight([{ type: 'tool_use', name: STILL_NOT_RIGHT_TOOL_NAME, input: {} }])
    expect(r.said).toBe(true)
    if (!r.said) throw new Error('unreachable')
    expect(r.quote).toBe('')
  })

  it('🛑 NO KEYWORD MATCHING ANYWHERE — a regex gets this wrong in both directions', () => {
    // "what happens if these aren't right?" would escalate a question; "still miles off"
    // would be missed entirely. The reader looks at the tool and nothing else.
    const src = code('./proof-escalation-signal.ts')
    expect(src, 'the signal is decided by matching text').not.toMatch(/\.(includes|match|test)\(/)
    expect(src).not.toMatch(/toLowerCase\(\)/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② THE PROHIBITION IS IN THE ONE PLACE THE MODEL READS
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J7-C2 · silence, timers and moods are named and refused', () => {
  const d = STILL_NOT_RIGHT_TOOL.description

  it('🛑 the tool tells the model it is recognising a STATEMENT', () => {
    expect(d).toMatch(/plainly SAID/)
  })

  for (const [name, pattern] of [
    ['a mood', /frustrated/i],
    ['terseness', /terse/i],
    ['a run of rejections', /marked several prospects/i],
    ['silence', /gone quiet/i],
    ['a timer', /time has\s+passed/i],
    ['a guess', /probably unhappy/i],
  ] as const) {
    it(`🛑 ${name} is named as NOT a signal`, () => {
      expect(d, `${name} is not ruled out where the model reads`).toMatch(pattern)
    })
  }

  it('a QUESTION about it is ruled out too — and that is the ordinary false positive', () => {
    expect(d).toMatch(/asking a question about it/)
  })

  it('uncertainty resolves to asking, never to escalating', () => {
    expect(d).toMatch(/not sure.*do not call it/is)
  })

  it('the tool takes the client\'s words, and says they must not be a paraphrase', () => {
    expect(STILL_NOT_RIGHT_TOOL.input_schema.required).toEqual(['said'])
    expect(String(STILL_NOT_RIGHT_TOOL.input_schema.properties.said.description))
      .toMatch(/Never your paraphrase/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ ONE ESCALATION PATH, AND IT FIRES AT MOST ONCE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J7-C2 · it reaches the canonical escalation, and only that', () => {
  const ROUTE = code('../routes/milla.ts')
  const CHAT = code('./milla.ts')

  it('🛑 the desk chat carries the tool — it returned text and only text', () => {
    expect(CHAT, 'the client\'s sentence still reaches no decision').toMatch(/STILL_NOT_RIGHT_TOOL/)
    expect(CHAT, 'the tool is declared and never sent').toMatch(/tools:\s+\[STILL_NOT_RIGHT_TOOL/)
    expect(CHAT).toMatch(/readStillNotRight\(/)
  })

  it('ONE model call, not two — no second round trip on a Sonnet surface', () => {
    const at = CHAT.indexOf('tools:      [STILL_NOT_RIGHT_TOOL')
    expect(at).toBeGreaterThan(-1)
    expect((CHAT.match(/anthropic\.messages\.create\(/g) ?? []).length)
      .toBe(1)
  })

  it('🛑 the branch is LIVE, not disabled beside a stale reference', () => {
    // ⚠️ MY FIRST CUT OF THE GUARD BELOW SEARCHED FOR THE CALL AND FOUND IT INSIDE
    // `if (false && stillNotRight.said)`. A source scan that only asks "is the call written
    // down" passes against a branch nothing can enter.
    expect(ROUTE, 'the escalation branch is guarded by something that is never true')
      .toMatch(/\n    if \(stillNotRight\.said\) \{/)
  })

  it('🛑 THE SAME CALL THE BUTTON MAKES — not a second escalation path', () => {
    const at = ROUTE.indexOf('stillNotRight.said')
    expect(at, 'the chat signal reaches nothing').toBeGreaterThan(-1)
    const region = ROUTE.slice(at, at + 900)
    expect(region, 'the chat invented its own escalation instead of using the canonical one')
      .toMatch(/closeCalibrationLoop\(clientId, 'still_not_right'\)/)
    // 🛑 AND NOTHING ELSE: no direct write, no second trigger, no alert standing in for one.
    expect(region, 'the chat writes the escalation columns itself').not.toMatch(/from\('clients'\)/)
    expect(region, 'a second trigger name appeared').not.toMatch(/proof_escalation_trigger/)
  })

  it('🛑 ONCE — the canonical write is the thing that guarantees it', () => {
    // A client who presses the button AND says it, or says it twice, escalates once. That is
    // not promised by the chat; it is a property of `closeCalibrationLoop`'s predicate.
    const io = code('./proof-calibration-io.ts')
    const at = io.indexOf('export async function closeCalibrationLoop')
    expect(at).toBeGreaterThan(-1)
    const fn = io.slice(at, io.indexOf('\n}', io.indexOf('return { closed: true', at)))
    expect(fn, 'the one-escalation lock is gone').toMatch(/\.is\('proof_review_requested_at', null\)/)
  })

  it('🛑 and it can never turn the client\'s message into an error', () => {
    const at = ROUTE.indexOf('stillNotRight.said')
    expect(ROUTE.slice(at, at + 1200)).toMatch(/catch/)
  })

  it('the escalation still REFUSES before the second set exists', () => {
    // FD-3 makes the signal reachable; it does not make it a bypass. `calibrationVerdict`
    // still answers `close: false` below two passes, so a client saying it during attempt 1
    // is not handed to a person before the product has finished trying.
    const cal = code('./proof-calibration.ts')
    expect(cal).toMatch(/if \(s\.passesDone < 2\) return \{ close: false \}/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ④ NOTHING ELSE LEARNED TO ESCALATE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J7-C2 · no timer and no silence anywhere near it', () => {
  it('🛑 the live trigger list is still exactly one', () => {
    const cal = code('./proof-calibration.ts')
    expect(cal).toMatch(/LIVE_ESCALATION_TRIGGERS = \['client_said_still_not_right'\] as const/)
  })

  it('🛑 no elapsed-time or absence condition reaches the escalation', () => {
    // The two files that could grow one. A `setTimeout`, a "days since" or a cron reaching
    // `closeCalibrationLoop` is the exact thing the founder's lock forbids.
    for (const p of ['./proof-calibration.ts', './proof-calibration-io.ts']) {
      const src = code(p)
      expect(src, `${p} grew a timer`).not.toMatch(/setTimeout|setInterval|cron/i)
      expect(src, `${p} escalates on elapsed time`).not.toMatch(/days_since|daysSince|hoursSince|stale/i)
    }
  })

  it('the only callers of the canonical close are the button and the chat', () => {
    // A third caller is a third way to be escalated, and it would not have to obey the tool's
    // rules about moods and timers.
    const callers: string[] = []
    for (const p of ['../routes/leads.ts', '../routes/milla.ts', '../routes/operator.ts', './proof-run-launch.ts']) {
      try {
        if (/closeCalibrationLoop\(clientId, 'still_not_right'\)/.test(code(p))) callers.push(p)
      } catch { /* the file does not exist in this tree */ }
    }
    expect(callers.sort()).toEqual(['../routes/leads.ts', '../routes/milla.ts'])
  })
})
