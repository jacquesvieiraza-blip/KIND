// ══════════════════════════════════════════════════════════════════════════════════════════
// XC-2 · EVERY DECISIVE READ CHECKS ITS ERROR (LR 21)
//
// REQ: *"Every listed decisive read checks its error."*
// RED: *"A named decisive read ignores its error (fault injection)."*
//
// ── WHAT "DECISIVE" MEANS HERE, STATED RATHER THAN ASSUMED ──────────────────────────────
//
// `const { data } = await db.from(…)` discards the error, and supabase-js answers a failed
// read with `{ data: null, error }`. So the value the code then branches on is `null` — and on
// these three paths `null` is not a neutral value, it is a POSITIVE ANSWER that opens a gate:
//
//   · the SEND SEAM — no opt-out found, no demo client, no duplicate draft;
//   · the APPROVE path — no such lead, not charged, not already owned;
//   · the CREDIT HOLD path — no existing hold, no booking, no live enrolment.
//
// This repo already uses that definition: *"Consequential means: it sources, sends, enrols,
// charges, or grants legacy approval authority. A display surface may render `unreadable` as
// 'we cannot tell'; a path that spends money must refuse."*
//
// ⚠️ THE SCOPE IS THE THREE PATHS, AND THAT IS A DISCLOSURE. 550 reads across the API discard
// their error; most are display reads where a failure degrades into an empty panel. These
// three are where a discarded read emails a stranger who opted out, charges a second time for
// a reveal already owned, or releases money that should have been captured.
//
// ── THE GUARD IS A SCANNER, NOT A LIST ──────────────────────────────────────────────────
//
// A list of line numbers rots. This walks the three modules and fails on ANY read that does not
// bind its error, with an explicit, reasoned allowlist — so a read added tomorrow is caught by
// the same mechanism rather than by somebody remembering this file exists.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const strip = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n')
  .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
  .join('\n')

/** A read that throws away its error: `const { data … } = await db…` with no `error:`. */
const UNBOUND = /const \{ (?:data|count)(?:: \w+)? \} = await db\b/g

function unboundReads(src: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = []
  for (const m of src.matchAll(UNBOUND)) {
    out.push({ line: src.slice(0, m.index).split('\n').length, text: m[0] })
  }
  return out
}

const read = (p: string) => strip(readFileSync(join(__dirname, p), 'utf8'))

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE THREE PATHS CARRY NO UNBOUND READ AT ALL
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('XC-2 · the decisive paths bind every error', () => {
  it('🛑 THE CREDIT HOLD PATH — where an unread guard releases somebody\'s money', () => {
    const found = unboundReads(read('./credit-holds.ts'))
    expect(found, `a decisive read discards its error at line(s) ${found.map(f => f.line).join(', ')}`)
      .toEqual([])
  })

  it('🛑 THE APPROVE PATH — where an unread answer charges twice', () => {
    const found = unboundReads(read('./approve-lead.ts'))
    expect(found, `a decisive read discards its error at line(s) ${found.map(f => f.line).join(', ')}`)
      .toEqual([])
  })

  it('🛑 THE SEND SEAM — where an unread blocklist emails somebody who opted out', () => {
    const src = read('./figsy.ts')
    const at = src.indexOf('async function sendSequenceEmailCore')
    expect(at, 'the send seam moved — this guard must be repointed').toBeGreaterThan(-1)
    const end = src.indexOf('\nexport async function sendSequenceEmail(', at)
    expect(end).toBeGreaterThan(at)
    const seam = src.slice(at, end)
    const found = unboundReads(seam).map(f => f.line + src.slice(0, at).split('\n').length - 1)
    expect(found, `a read inside the send seam discards its error at line(s) ${found.join(', ')}`)
      .toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② AND EACH ONE FAILS CLOSED, IN THE DIRECTION THAT COSTS NOTHING
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('XC-2 · what each decisive read does when it cannot be completed', () => {
  const FIGSY = read('./figsy.ts')
  const APPROVE = read('./approve-lead.ts')
  const HOLDS = read('./credit-holds.ts')

  it('🛑 AN UNREADABLE OPT-OUT BLOCKLIST DEFERS THE SEND', () => {
    // The one with a legal edge: we may not email somebody we cannot prove has not opted out.
    const at = FIGSY.indexOf('const { data: blocked, error: blockedErr }')
    expect(at, 'the blocklist probe no longer binds its error').toBeGreaterThan(-1)
    expect(FIGSY.slice(at, at + 600)).toMatch(/if \(blockedErr\) \{[\s\S]{0,400}return 'deferred'/)
  })

  it('🛑 AN UNREADABLE CLIENT DEFERS — the demo backstop cannot run without one', () => {
    const at = FIGSY.indexOf('const { data: enr, error: enrErr }')
    expect(at).toBeGreaterThan(-1)
    expect(FIGSY.slice(at, at + 600)).toMatch(/if \(enrErr\) \{[\s\S]{0,400}return 'deferred'/)
  })

  it('🛑 A FAILED STEP CLAIM IS TOLD APART FROM A LOST RACE — both defer, one needs a human', () => {
    expect(FIGSY).toContain('const { data: claimed, error: claimErr }')
    expect(FIGSY).toMatch(/if \(claimErr\) \{[\s\S]{0,400}return 'deferred'/)
    expect(FIGSY, 'the lost-race branch was replaced rather than joined')
      .toContain('already claimed/advanced — skipping (no double-send)')
  })

  it('🛑 NO SEND-LOG ROW, NO SEND — and the claim goes back', () => {
    // The counter recomputes from this table, so an unlogged send is a send nothing can count,
    // on a step that has already been claimed.
    const at = FIGSY.indexOf('if (!emailId && !opts?.isPreview) {')
    expect(at, 'a send with no log row is possible again').toBeGreaterThan(-1)
    const block = FIGSY.slice(at, at + 700)
    expect(block).toContain('current_step: step - 1')
    expect(block).toContain("return 'deferred'")
  })

  it('🛑 THE APPROVE PATH ANSWERS `unavailable`, NOT `not_found` OR `charged: false`', () => {
    expect(APPROVE).toContain("| { status: 'unavailable'; revealed: false }")
    expect((APPROVE.match(/return \{ status: 'unavailable', revealed: false \}/g) ?? []).length)
      .toBeGreaterThanOrEqual(3)
    // And the route says so with a 503 rather than a 404.
    const LEADS = read('../routes/leads.ts')
    expect(LEADS).toContain("if (outcome.status === 'unavailable')")
    expect(LEADS).toMatch(/outcome\.status === 'unavailable'\)[\s\S]{0,300}res\.status\(503\)/)
  })

  it('🛑 AN UNREADABLE OWNERSHIP CHECK NEVER CHARGES — the most expensive read in the file', () => {
    const at = APPROVE.indexOf("const { data: owned, error: ownedErr }")
    expect(at, 'the ownership check no longer binds its error').toBeGreaterThan(-1)
    const block = APPROVE.slice(at, at + 700)
    expect(block).toMatch(/if \(ownedErr\) \{/)
    expect(block).toContain("status: 'unavailable'")
    // The refusal comes BEFORE the owned branch, so no charge can follow it.
    expect(block.indexOf('ownedErr')).toBeLessThan(block.indexOf('if (owned === true)'))
  })

  it('🛑 AN UNREADABLE EXISTING-HOLD CHECK PLACES NO HOLD', () => {
    const at = HOLDS.indexOf('const { data: existing, error: existingErr }')
    expect(at).toBeGreaterThan(-1)
    expect(HOLDS.slice(at, at + 600)).toContain("reason: 'unreadable'")
    expect(HOLDS, 'the refusal cannot say which read failed')
      .toContain("'insufficient_work_credits' | 'error' | 'unreadable'")
  })

  it('🛑 AND THE SWEEPER NEVER RELEASES ON A GUARD IT COULD NOT RUN', () => {
    // Both guards exist to STOP a release, so a discarded error turned each of them off.
    for (const guard of ['bookedErr', 'activeErr']) {
      const at = HOLDS.indexOf(`if (${guard}) {`)
      expect(at, `the sweeper's ${guard} guard is gone`).toBeGreaterThan(-1)
      expect(HOLDS.slice(at, at + 500)).toContain('continue')
    }
    // And a sweep that could not list its candidates is not a clean zero.
    expect(HOLDS).toContain("degraded: `the stale-hold sweep could not run:")
    expect(HOLDS).toMatch(/scanned: 0, released: 0, degraded/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ THE SCANNER ITSELF IS NOT BLIND
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('XC-2 · the scanner would catch a new unbound read', () => {
  it('🛑 IT MATCHES THE SHAPE IT CLAIMS TO', () => {
    // A scanner that matches nothing passes every file ever written.
    const sample = `
      const { data: x } = await db.from('leads').select('id')
      const { data: y, error: yErr } = await db.from('leads').select('id')
      const { count } = await db.from('leads').select('id', { count: 'exact' })
    `
    const found = unboundReads(sample)
    expect(found.length, 'the scanner does not recognise an unbound read').toBe(2)
    expect(found.map(f => f.text)).toEqual([
      'const { data: x } = await db',
      'const { count } = await db',
    ])
  })

  it('and it is reading real files, not empty ones', () => {
    for (const p of ['./credit-holds.ts', './approve-lead.ts', './figsy.ts']) {
      expect(read(p).length, `${p} read as empty — every assertion above would pass`)
        .toBeGreaterThan(2000)
    }
  })
})
