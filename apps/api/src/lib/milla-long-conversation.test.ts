// ══════════════════════════════════════════════════════════════════════════════════════════
// A LONG CONVERSATION IS NOT A BAD REQUEST (19 Sep)
//
// 🛑 WHAT EARNED THIS, AND THE FOUNDER COUNTED AT LEAST FIFTY. `POST /icps/chat-build` — the
// door Milla's brief runs through — declared `history: z.array(...).max(20)`. The browser
// posts the WHOLE conversation on every turn, so the twenty-first message made the route
// answer **400 before the model was ever called**, and every turn after it did the same.
//
// The client was shown *"Milla didn't catch that — your last answer is still here, so there's
// no need to retype it. Just try again in a moment."* The retry re-posted the same
// conversation, which was still over twenty. **It could never succeed.** Every client who has
// a real conversation hits it, at the same depth.
//
// ⛓️ AND ITS OWN TWIN WAS FIXED A MONTH AGO. `/icps/builder/chat` carries the note from 26
// Aug: *".max(40) used to REFUSE the whole request once a one-question-at-a-time onboarding
// ran long… The cap now bounds abuse (200), and the model window below takes the most recent
// 40 turns."* Same defect, same repair, applied to one of two doors.
//
// ⚠️ TWO FAULTS, AND THE SECOND HID THE FIRST. A deterministic 400 answered `retryable: true`
// with copy promising a retry would help. Eight sites share that sentence and some of them
// ARE transient — so every failure looked alike and nobody could tell which was which.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

const ROUTE = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')

/** The `/chat-build` request schema, as the route now declares it. */
const historySchema = z.array(z.object({
  role: z.enum(['user', 'assistant']), content: z.string().max(4000),
})).max(200).default([])

const turns = (n: number) => Array.from({ length: n }, (_, i) => ({
  role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
  content: `turn ${i}`,
}))

describe('the conversation that used to be refused', () => {
  it('🛑 THE TWENTY-FIRST TURN IS ACCEPTED — this is the exact message that 400d', () => {
    expect(() => historySchema.parse(turns(21))).not.toThrow()
  })

  it('🛑 AND SO IS A CONVERSATION FAR LONGER THAN ANY REAL BRIEF', () => {
    for (const n of [25, 40, 80, 150]) {
      expect(() => historySchema.parse(turns(n)), `${n} turns was refused`).not.toThrow()
    }
  })

  it('a pathological history is still refused — the bound is abuse, not conversation', () => {
    // Nobody reaches 200 turns talking to Milla. A script posting a megabyte does.
    expect(() => historySchema.parse(turns(201))).toThrow()
  })

  it('the short, ordinary cases are untouched', () => {
    expect(historySchema.parse([])).toEqual([])
    expect(historySchema.parse(turns(2))).toHaveLength(2)
    expect(() => historySchema.parse(undefined)).not.toThrow()
  })
})

describe('the route itself', () => {
  it('🛑 NO 20-TURN REFUSAL SURVIVES ON THE BRIEF DOOR', () => {
    expect(ROUTE, 'the twenty-turn cap is back on the chat door')
      .not.toMatch(/content: z\.string\(\) \}\)\)\.max\(20\)/)
    expect(ROUTE, 'the abuse bound is missing').toMatch(/\}\)\)\.max\(200\)\.default\(\[\]\)/)
  })

  it('🛑 THE MODEL IS WINDOWED INSTEAD OF THE CLIENT BEING REFUSED', () => {
    // The whole point: bound what the provider reads, never what the client may say.
    expect(ROUTE).toMatch(/const MILLA_MODEL_WINDOW = \d+/)
    expect(ROUTE, 'the model still receives the unbounded history')
      .toMatch(/\.\.\.history\.slice\(-MILLA_MODEL_WINDOW\)/)
  })

  it('🛑 AND A REQUEST WE REFUSED NO LONGER CLAIMS A RETRY WILL HELP', () => {
    // A body the schema rejected is rejected identically every time. Saying otherwise is what
    // made fifty occurrences of one bug look like fifty different transient hiccups.
    const deterministic = ROUTE.match(/res\.status\(400\)\.json\(\{ success: false, error: MILLA_RETRY_ERROR, retryable: (true|false) \}\)/g) ?? []
    expect(deterministic.length, 'the two deterministic refusals are not both here').toBe(2)
    for (const line of deterministic) {
      expect(line, 'a 400 still tells the client to try again').toContain('retryable: false')
    }
  })

  it('a genuinely transient failure still says a retry may help', () => {
    // The 503s are the model hiccuping. Those ARE worth retrying, and must keep saying so —
    // otherwise this fix would have traded one wrong answer for another.
    expect(ROUTE).toMatch(/res\.status\(503\)\.json\(\{ success: false, error: MILLA_RETRY_ERROR, retryable: true \}\)/)
  })
})
