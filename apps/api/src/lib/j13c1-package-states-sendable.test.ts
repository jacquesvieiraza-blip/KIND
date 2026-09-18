// ══════════════════════════════════════════════════════════════════════════════════════════
// J13-C1 · THE PACKAGE STATES HOW MANY WE MAY ACTUALLY EMAIL (FD-5 · LR 13)
//
// REQ: *"Preparation counts sendable from the fact; snapshot carries it"*.
//
// ── THE NUMBER THAT WAS NOT ON THE SCREEN THEY SAY YES TO ───────────────────────────────
//
// The frozen package listed WHO would receive this — `enrolled_lead_ids`, and a panel stat
// reading "Prospects in the package" — and never how many of them were reachable. FD-5:
// *"Verified business email required before send; QUALIFIED ≠ SENDABLE."* So a client
// approved "40 prospects" when the number we could write to was eighteen, and nothing on the
// approval screen said so.
//
// ── THE TWO CLAUSES, AND THEY ARE DIFFERENT THINGS ──────────────────────────────────────
//
// ① PREPARATION COUNTS IT, from the fact — `isSendable` over `leads.email_status` and the
//    address, never `apollo_consented`, which is set on a guess at insert and forced true at
//    reveal (J12-C3). It REPORTS; it does not block. FD-5 separates qualified from sendable
//    rather than making one the gate for the other, so a programme is not refused readiness
//    because the provider has not finished verifying.
//
// ② THE SNAPSHOT CARRIES IT, which puts it in the digest — and that is a deliberate trade.
//    A reveal landing between the freeze and the approval moves the number without moving the
//    enrolment set, so the hash changes and the freeze goes stale. "40 people, 18 reachable"
//    and "40 people, 25 reachable" are different promises; `refreezeForReview` exists exactly
//    so a programme caught mid-review gets a new version rather than being stranded.
//
// ⚠️ NULL IS NOT ZERO, ANYWHERE IN THIS ITEM. A count that could not be taken, and a frozen
// v2 package that predates the field, both read as "not stated" — never as "nobody is
// reachable", which is a claim about a number nobody took.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const code = (p: string): string =>
  readFileSync(join(__dirname, p), 'utf8')
    .split('\n')
    .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
    .join('\n')

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE SNAPSHOT CARRIES IT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J13-C1 · the frozen package carries the sendable count', () => {
  const SNAP = code('./preparation-snapshot.ts')

  it('🛑 `sendable_count` is a field of the snapshot', () => {
    expect(SNAP, 'the package still cannot state how many are reachable')
      .toMatch(/sendable_count: number \| null/)
    expect(SNAP).toMatch(/sendable_count: sendableCount/)
  })

  it('🛑 counted FROM THE FACT, not from the flag', () => {
    expect(SNAP, 'the count is taken from something other than the sendable fact')
      .toMatch(/isSendable\(r\)/)
    expect(SNAP, 'the count trusts `apollo_consented`, which is set on a guess')
      .not.toMatch(/apollo_consented/)
    expect(SNAP).toMatch(/\.select\('id, email, email_status'\)/)
  })

  /**
   * The counting block ALONE — bounded by the snapshot literal that follows it.
   *
   * ⚠️ NOT A FIXED CHARACTER WINDOW. A window wide enough to hold the block also swallowed the
   * snapshot literal below it, where `batch_lead_ids: batchLeadIds` sits — so the guard that
   * says "not counted over the batch" failed against correct code. A guard that reads past the
   * thing it judges is a guard about the wrong text.
   */
  const countBlock = (() => {
    const at = SNAP.indexOf('let sendableCount')
    expect(at, 'the count moved — this guard must be repointed').toBeGreaterThan(-1)
    const end = SNAP.indexOf('const snapshot: PreparationSnapshot', at)
    expect(end, 'the snapshot literal moved — this guard must be repointed').toBeGreaterThan(at)
    return SNAP.slice(at, end)
  })()

  it('counted over the ENROLLED set — who the package says will receive this', () => {
    expect(countBlock).toMatch(/enrolledLeadIds/)
    expect(countBlock, 'the count is taken over the batch, which is not who gets emailed')
      .not.toMatch(/batchLeadIds/)
  })

  it('🛑 A FAILED COUNT IS `null`, AND IT DOES NOT DEGRADE THE FREEZE', () => {
    expect(countBlock).toMatch(/unreadable \? null : counted/)
    // The freeze must still be possible when one count could not be taken.
    expect(countBlock, 'a failed count now blocks the whole freeze').not.toMatch(/return \{ ok: false/)
  })

  it('an empty enrolment set is 0 — that IS a number we took', () => {
    const at = SNAP.indexOf('let sendableCount')
    expect(SNAP.slice(at, at + 400)).toMatch(/enrolledLeadIds\.length === 0\) \{\s*sendableCount = 0/)
  })

  it('🛑 THE DIGEST VERSION MOVED — an old hash cannot silently pass a comparison it cannot answer', () => {
    expect(SNAP).toMatch(/v: 3\b/)
    expect(SNAP, 'a v2 literal survives, so some hashes are built on the old shape')
      .not.toMatch(/v: 2,/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② PREPARATION COUNTS IT — AND IT DOES NOT BLOCK
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J13-C1 · preparation counts it, and refuses nobody for it', () => {
  const PREP = code('./preparation-readiness.ts')

  it('🛑 `sendableEnrolments` is a preparation fact', () => {
    expect(PREP).toMatch(/sendableEnrolments: number \| null/)
    expect(PREP).toMatch(/sendableEnrolments,/)
  })

  it('counted from the same fact, over the same set', () => {
    expect(PREP).toMatch(/isSendable\(r\)/)
    expect(PREP).toMatch(/\.select\('id, email, email_status'\)/)
    expect(PREP, 'preparation counts sendability from the flag').not.toMatch(/apollo_consented/)
  })

  it('🛑 IT NEVER BLOCKS — FD-5 separates qualified from sendable, it does not gate one on the other', () => {
    // A programme refused readiness because the provider has not finished verifying would be
    // the opposite of the ruling: the number is REPORTED so the client can see it, not used
    // to withhold a package from them.
    //
    // ⚠️ READ FROM SOURCE, NOT IMPORTED. Importing this module pulls `@kind/db`, which throws
    // without the service credentials — so the import turned a guard about a product rule into
    // a guard about environment variables.
    const req = (() => {
      const at = PREP.indexOf('export const PREPARATION_REQUIREMENTS = [')
      expect(at, 'the requirement list moved — this guard must be repointed').toBeGreaterThan(-1)
      const end = PREP.indexOf('] as const', at)
      expect(end).toBeGreaterThan(at)
      return PREP.slice(at, end)
    })()
    expect(req, 'sendability became a preparation requirement').not.toMatch(/sendab/i)

    const blockers = (() => {
      const at = PREP.indexOf('export function preparationBlockers')
      expect(at, 'the blocker builder moved — this guard must be repointed').toBeGreaterThan(-1)
      const end = PREP.indexOf('export async function programmePreparationReadiness', at)
      expect(end).toBeGreaterThan(at)
      return PREP.slice(at, end)
    })()
    expect(blockers, 'the blocker list learned about sendability').not.toMatch(/sendab/i)
  })

  it('🛑 and a failed count never fails readiness', () => {
    // Bounded by the facts literal that follows, for the same reason as the snapshot guard: a
    // fixed window reads past the block and judges code the block does not contain.
    const at = PREP.indexOf('let sendableEnrolments')
    expect(at, 'the count moved — this guard must be repointed').toBeGreaterThan(-1)
    const end = PREP.indexOf('const facts: PreparationFacts', at)
    expect(end, 'the facts literal moved — this guard must be repointed').toBeGreaterThan(at)
    const block = PREP.slice(at, end)
    expect(block, 'a count we could not take now refuses the programme')
      .not.toMatch(/return notReady/)
    // It is not silent either — an operator can find out why the number is missing.
    expect(block).toMatch(/console\.error/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ AND IT REACHES THE SCREEN
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J13-C1 · the panel states it, from the frozen package', () => {
  const FACTS = code('./programme-lifecycle-facts.ts')
  const COPY = readFileSync(
    join(__dirname, '../../../admin/src/lib/vida-lifecycle-copy.ts'), 'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
    .join('\n')

  it('🛑 the lifecycle reads it OUT OF THE SNAPSHOT, not by re-counting', () => {
    // Re-counting would state a number that has moved since the freeze — which is exactly
    // what a frozen package exists to stop.
    expect(FACTS).toMatch(/sendable: typeof snap\.sendable_count === 'number' \? snap\.sendable_count : null/)
  })

  it('🛑 the panel shows it — the number the client approves against', () => {
    expect(COPY, 'the approval panel still says only how many prospects there are')
      .toMatch(/label: 'Sendable today'/)
  })

  it('🛑 AND IT IS OMITTED, NOT ZEROED, when the frozen package predates the field', () => {
    // A v2 freeze carries no count. "0 sendable" would tell an operator nobody in a frozen
    // package is reachable, which is a claim about a number nobody took.
    expect(COPY).toMatch(/typeof i\.frozenPackage\.sendable === 'number'/)
    expect(COPY, 'a missing count is coerced to a number').not.toMatch(/frozenPackage\.sendable \?\? 0/)
  })

  it('the existing prospect count is untouched — this ADDS a fact, it replaces none', () => {
    expect(COPY).toMatch(/label: i\.frozenPackage \? 'Prospects in the package' : 'Qualified prospects'/)
  })
})
