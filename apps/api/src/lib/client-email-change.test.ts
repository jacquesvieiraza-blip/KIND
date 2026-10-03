// ⚑ 3 Oct (R195 ③ · sequencing piece 6 — the founder's blueprint view 7). The client changes an
// email by TALKING TO MILLA (R196); it goes to the founder FIRST, then back to the client.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@kind/db', () => ({ db: {} }))
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseEmailRewrite, withEmailChanged } from './client-email-change'

const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
const STEPS = [
  { channel: 'email' as const, subject: 'One', body: 'B1', wait_days: 4, job: 'Problem' },
  { channel: 'email' as const, subject: 'Two', body: 'B2', wait_days: 5, job: 'Impact' },
]

describe('Milla rewrites ONE email; nothing else moves', () => {
  it('reads the rewrite, refuses half of one', () => {
    expect(parseEmailRewrite('ok {"subject":"S","body":"B"}')).toEqual({ subject: 'S', body: 'B' })
    expect(parseEmailRewrite('{"subject":"S"}')).toBeNull()
    expect(parseEmailRewrite('nothing')).toBeNull()
  })
  it('🛑 only that email\'s words change — its job and its timing (R195 ③: never timing) stay', () => {
    const r = withEmailChanged(STEPS, 2, { subject: 'New', body: 'NB' })
    expect(r[0]).toEqual(STEPS[0])
    expect(r[1]).toEqual({ ...STEPS[1], subject: 'New', body: 'NB' })
    expect(r.map(s => s.wait_days)).toEqual([4, 5])
  })
})

describe('🛑 founder first, then the client — by construction', () => {
  const lib = read('client-email-change.ts')
  it('only while waiting for the client\'s approval, and only on the version they are looking at', () => {
    expect(lib).toContain("if (row.status !== 'READY_FOR_APPROVAL' || row.approved_at || row.paused_at) {")
    expect(lib).toContain('if (!input.version || row.review_preparation_hash !== input.version) {')
  })
  it('the rewrite passes the same writing rules before anything is written', () => {
    expect(lib.indexOf('lintSequence(gapsBeforeEachStep(changed)')).toBeLessThan(lib.indexOf('rewriteProgrammeMessages(row.id'))
  })
  it('it goes through the ONE rewrite door — every person updated, re-frozen as a new version', () => {
    expect(lib).toContain('rewriteProgrammeMessages(row.id, {')
    const rw = read('programme-rewrite.ts')
    expect(rw).toContain('const gen = opts?.writer ? await opts.writer() : await generateProgrammeSequence(id, { replaceExisting: true })')
  })
  it('a new version is not covered by the founder\'s earlier approval — his approval is per version', () => {
    const fa = read('founder-approval.ts')
    expect(fa).toMatch(/snapshot_hash/)
    const route = read('../routes/my-programme.ts')
    expect(route).toContain("messages: founderApproved ? frozen.messages : []")
  })
})

describe('🛑 R196 — said to Milla in the middle, never typed on the right', () => {
  it('the panel only opens the conversation; Milla posts the change', () => {
    const panel = read('../../../portal/src/components/milla/ProgrammeApproval.tsx')
    expect(panel).toContain('data-testid="change-email-with-milla"')
    expect(panel).toContain("focus(`email:${m.step}`")
    expect(panel).not.toContain('/my/programme/emails/change')
    // The piece-6 block itself holds no typing box (the panel's older concern box is reported separately).
    const block = panel.slice(panel.indexOf('data-testid="change-email-with-milla"') - 600, panel.indexOf('Change this email with Milla'))
    expect(block).not.toMatch(/<(input|textarea)\b/)
    const conv = read('../../../portal/src/components/milla/MillaConversation.tsx')
    expect(conv).toContain("api.post('/my/programme/emails/change', { step: emailBase.step, instruction: msg, version: emailBase.version }")
    expect(read('../routes/my-programme.ts')).toContain("myProgrammeRouter.post('/emails/change'")
  })
})
