// ══════════════════════════════════════════════════════════════════════════════════════════
// N3 · 6 Oct — "Confirm & source" IS ANSWERED AT ONCE, AND CANNOT BE PRESSED TWICE
//
// On 6 Oct the founder pressed "Source 250 leads" for House. After 45s Vida said "The API did not
// answer within 45s, so this request was abandoned", the confirm box stayed open — and the run had
// in fact finished (252 found, 249 qualified). A second press would have bought a second batch.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sourcePressOutcome, sourceRunView, SOURCING_LINE } from './programme-source-run'

describe('N3 · reading the press', () => {
  it('🛑 202 started → sourcing, not a failure', () => {
    expect(sourcePressOutcome(202, { success: true, started: true, requested: 250 })).toEqual({ kind: 'running' })
  })
  it('🛑 a 45s timeout is "sourcing", never "abandoned"', () => {
    expect(sourcePressOutcome(504, { success: false, timeout: true, error: 'The API did not answer within 45s, so this request was abandoned' }))
      .toEqual({ kind: 'running' })
  })
  it('🛑 a second press while one runs is told it is running, not a failure', () => {
    expect(sourcePressOutcome(409, { success: false, reason: 'already_sourcing', running: true, error: 'x' })).toEqual({ kind: 'running' })
  })
  it('a refusal still names the control that stopped it', () => {
    expect(sourcePressOutcome(409, { success: false, reason: 'sourcing_ceiling_reached', error: 'No authorised volume left.' }))
      .toEqual({ kind: 'error', message: 'No authorised volume left.' })
  })
  it('an older API that answers 200 with the result still reads as done', () => {
    expect(sourcePressOutcome(200, { success: true, inserted: 252, note: null })).toEqual({ kind: 'done', inserted: 252, note: null })
  })
})

describe('N3 · reading the run', () => {
  it('requested / started → the sourcing line', () => {
    expect(sourceRunView({ state: 'started' })).toEqual({ kind: 'running', line: SOURCING_LINE })
    expect(sourceRunView({ state: 'requested' }).kind).toBe('running')
  })
  it('completed → the count', () => {
    expect(sourceRunView({ state: 'completed', inserted: 252 }).line).toBe('Sourced 252 people for this programme. The new batch is in the pipeline above.')
  })
  it('failed → the reason; stuck → do not start another by hand', () => {
    expect(sourceRunView({ state: 'failed', failure_reason: 'Apollo said no' }).line).toMatch(/Apollo said no/)
    expect(sourceRunView({ state: 'stuck' }).line).toMatch(/Do not start another run by hand/)
  })
})

describe('N3 · wiring', () => {
  const strip = (s: string) => s.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n')
  const UI = strip(readFileSync(join(__dirname, '../components/vida/VidaConversation.tsx'), 'utf8'))
  const API = strip(readFileSync(join(__dirname, '../../../api/src/routes/operator.ts'), 'utf8'))
  const routeBody = (marker: string) => {
    const at = API.indexOf(marker)
    expect(at, `${marker} must exist`).toBeGreaterThan(-1)
    const next = API.indexOf('operatorRouter.', at + marker.length)
    return API.slice(at, next > at ? next : at + 4000)
  }

  it('🛑 Vida reads the press through sourcePressOutcome and the run through the status read', () => {
    expect(UI).toMatch(/sourcePressOutcome\(/)
    expect(UI).toMatch(/SOURCE_STATUS_ENDPOINT\(/)
    expect(UI).toMatch(/sourceRunView\(/)
  })

  it('🛑 the route claims one live run per programme BEFORE it answers, and answers 202', () => {
    const body = routeBody("operatorRouter.post('/programme/source'")
    const claim = body.indexOf("kind: 'programme_source'")
    const answer = body.indexOf('res.status(202)')
    expect(claim, 'no claim').toBeGreaterThan(-1)
    expect(answer, 'no 202').toBeGreaterThan(claim)
    expect(body).toMatch(/alreadyLive/)
    expect(body, 'the checks no longer run before the claim').toMatch(/checkProgrammeSource\(programme_id\)/)
  })

  it('🛑 the status read exists', () => {
    expect(routeBody("operatorRouter.get('/programme/source/status'")).toMatch(/latestAutomaticWork\('programme_source'/)
  })
})
