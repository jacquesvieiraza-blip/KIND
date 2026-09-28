// ═══════════════════════════════════════════════════════════════════════════════════════
// 28 Sep — SECTION A OF THE END-TO-END CHECK (R172): WHAT STOPPED A CLIENT.
//
// Founder: "i dont want a bandaid fix. i want it checked and reported back." These are the six
// verified blockers and the raw error that reached the client's screen. A1 and A3 are database
// rules, proved against a real PostgreSQL in `realdb/walk-blockers.realdb.test.ts`; the rest are
// pinned here.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const src = (f: string) => readFileSync(join(__dirname, f), 'utf8')
const PROMOTION = src('promotion.ts')
const CHOICE = src('client-programme-choice.ts')
const ICP = src('programme-icp.ts')
const ADVANCE = src('programme-advance.ts')
const MIGRATIONS = src('pending-migrations.ts')

describe('A1 · A3 · the database rules match what the code writes', () => {
  it('both migrations are in the runner, AFTER the rules they replace', () => {
    const at = (k: string) => MIGRATIONS.indexOf(`key: '${k}'`)
    expect(at('20260928_programme_one_payment')).toBeGreaterThan(at('20260828_programme_money_engine'))
    expect(at('20260928_proof_pass_unlimited_checks')).toBeGreaterThan(at('20260922_unlimited_proof_refinement'))
    expect(MIGRATIONS).toContain('AND first_payment_cents > 0 AND second_payment_cents >= 0')
    expect(MIGRATIONS).toContain("CHECK (authority = 'calibrated_restart' OR authority ~ '^automatic_[1-9][0-9]*$')")
    expect(MIGRATIONS).toContain('CHECK (proof_pass IS NULL OR proof_pass >= 1)')
  })
})

describe('🛑 A2 · the size the client told Milla reaches their account', () => {
  it('written at promotion, BEFORE the size check the confirm route starts next', () => {
    const write = PROMOTION.indexOf(".update({ size_stated_employees: stated, size_stated_at: new Date().toISOString() })")
    expect(write).toBeGreaterThan(-1)
    expect(PROMOTION.slice(write, write + 200), 'fill-when-empty — a replay never moves it').toContain(".is('size_stated_employees', null)")
    // Before the promotion returns — the confirm route's `ensureClientSize` runs after it.
    expect(write).toBeLessThan(PROMOTION.indexOf('// ── 4 · THE PROOF HAND-OFF'))
    const confirm = readFileSync(join(__dirname, '../routes/milla.ts'), 'utf8')
    expect(confirm.indexOf('await promoteConfirmedBrief(')).toBeLessThan(confirm.indexOf('m.ensureClientSize(cid'))
  })
})

describe('🛑 A4 · a Brief awaiting targeting review is not entered into Proof', () => {
  it('the promotion reads the review and refuses BEFORE the claim, as the proof route does', () => {
    const review = PROMOTION.indexOf('icpNeedsReview(review.icp_review, review.icp_review_resolved_at ?? null)')
    const claim = PROMOTION.indexOf('const claim = await claimProofAuthority(clientId, icpId)')
    expect(review).toBeGreaterThan(-1)
    expect(review).toBeLessThan(claim)
    expect(PROMOTION).toContain("throw new Error(rvErr ? 'review_unreadable' : 'awaiting_icp_review')")
  })
})

describe('🛑 A5 · a next programme gets its own copy of the targeting', () => {
  it('copies only from a FINISHED programme, and never moves the old ICP', () => {
    expect(ICP).toContain('export async function attachIcpForNextProgramme(programmeId: string, icpId: string)')
    expect(ICP).toContain('if (!holder || !TERMINAL_STATUSES.includes(holder.status)) return first')
    expect(ICP).toContain("await db.from('icps').update({ is_active: false }).eq('id', icpId)")
    expect(ICP, 'run state and provider cursors are not copied').not.toMatch(/CARRIED_ICP_COLUMNS = \[[^\]]*(last_run_at|pdl_scroll|programme_id)/)
  })
  it('choosing refuses — never sends the client to pay — when the targeting cannot be attached', () => {
    expect(CHOICE).toContain('const att = await attachIcpForNextProgramme(programme.id, icp.id)')
    expect(CHOICE).toContain("return { ok: false, reason: 'icp_unattached', detail: PROGRAMME_NOT_SAVED }")
  })
})

describe('🛑 A6 · a preparation that stops after sourcing tells the founder', () => {
  it('both failure branches raise the task, and email only when the task is new', () => {
    expect(ADVANCE.match(/await tellPreparationStopped\(/g)).toHaveLength(2)
    expect(ADVANCE).toContain("if (!task.ok || ('alreadyOpen' in task && task.alreadyOpen)) return")
    expect(ADVANCE).toContain('dedupeKey = `preparation_stopped:${programmeId}`')
  })
})

describe('🛑 A7 · database text never reaches the client', () => {
  it('every choose refusal the client reads is the plain sentence', () => {
    expect(CHOICE).toContain("'We could not save your programme just now. Nothing has been charged, and our team has been told — please try again in a few minutes.'")
    expect(CHOICE).not.toContain("detail: created.reason ??")
    expect(CHOICE).not.toContain('`The programme could not be saved (${message}). Nothing was changed.`')
    expect(CHOICE).toContain('detail: PROGRAMME_NOT_SAVED,')
  })
})
