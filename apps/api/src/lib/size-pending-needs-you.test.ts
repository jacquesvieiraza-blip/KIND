// ═══════════════════════════════════════════════════════════════════════════════════════
// 28 Sep — FOUND ON THE FOUNDER'S END-TO-END WALK (test 2, AAA Operations Studio).
//
// The client gave no size and no website, so their price waited on a person ("A person is on
// it"). Vida said "No action needed", and the Company size box only appeared once a programme
// existed — which it cannot before a price. The person could neither see the task nor do it.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deriveLifecycle, type LifecycleFacts } from './programme-lifecycle'

const base: LifecycleFacts = {
  programme: null, proofStarted: true, proofCalibrationFailed: false, proofCompleted: true,
  proofNoEligibleSet: false, awaitingIcpTranslation: false,
  preparationStopped: false, preparing: false, humanBlockers: [], readinessReady: false,
  sends: 0, repliesAwaitingDecision: 0, senderSendable: true, killSwitchOff: true, operatorRunEnabled: false,
  remainingEntitlement: 0, hasNewerProgramme: false, repeatDismissed: false,
} as LifecycleFacts

describe('🛑 a client whose price waits on a person NEEDS YOU', () => {
  it('at the calculator, size waiting → Needs you, with its reason', () => {
    const v = deriveLifecycle({ ...base, sizeAwaitingPerson: true })
    expect(v).toMatchObject({ state: 'recommendation_size_pending', stage: 'recommendation', needsYou: true, needsYouReason: 'size_awaiting_person', mode: 'Needs you' })
  })

  it('⛓️ size set, or unreadable → the ordinary calm Recommendation, exactly as before', () => {
    expect(deriveLifecycle({ ...base, sizeAwaitingPerson: false })).toMatchObject({ state: 'recommendation', needsYou: false })
    expect(deriveLifecycle({ ...base, sizeAwaitingPerson: null })).toMatchObject({ state: 'recommendation', needsYou: false })
    expect(deriveLifecycle({ ...base })).toMatchObject({ state: 'recommendation', needsYou: false })
  })

  it('before Proof is finished it does not jump the queue', () => {
    expect(deriveLifecycle({ ...base, proofCompleted: false, sizeAwaitingPerson: true })).toMatchObject({ stage: 'proof', needsYou: false })
  })
})

describe('the fact is read for one client AND for the whole board', () => {
  const src = readFileSync(join(__dirname, 'programme-lifecycle-facts.ts'), 'utf8')
  it('single client and board both pass it, board in ONE read (never per client)', () => {
    expect(src).toContain('export async function sizeAwaitingPersonFor(clientId: string)')
    expect(src).toContain('sizeAwaitingPersonFor(clientId),')
    expect(src).toContain("sizeAwaitingPerson: sizeRead ? sizeWaiting.has(clientId) : null,")
    expect(src).toContain(".select('id, size_review_reason, size_locked_at').in('id', ids)")
  })
})

describe('Vida', () => {
  const page = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
  const copy = readFileSync(join(__dirname, '../../../admin/src/lib/vida-lifecycle-copy.ts'), 'utf8')

  it('🛑 the Company size box shows in the Programme tab BEFORE any programme exists', () => {
    const tab = page.indexOf("{shownTab === 'Programme' && (<>")
    const box = page.indexOf('{selected && <ClientSizePanel clientId={selected} />}')
    const firstProgrammeOnly = page.indexOf('Commercial model — {prog.commercial.label}')
    expect(tab).toBeGreaterThan(-1)
    expect(box).toBeGreaterThan(tab)
    expect(box, 'the box is still behind the programme panel').toBeLessThan(firstProgrammeOnly)
    expect(page.match(/<ClientSizePanel /g)).toHaveLength(1)
  })

  it('says what is waiting and where to do it', () => {
    expect(copy).toContain("case 'recommendation_size_pending':")
    expect(copy).toContain("subtitle: 'Waiting on us — their company size'")
    expect(copy).toContain('Client tools → Programme → Company size')
  })
})
