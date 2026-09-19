// ══════════════════════════════════════════════════════════════════════════════════════════
// J7-C1 · AN UNREADABLE BOARD IS UNREADABLE — never "nothing needs you"
//
// ── THE DEFECT, AND IT HAS AN EMOJI ON IT ───────────────────────────────────────────────
//
// `VidaClients.tsx` reads the lifecycle board and swallows every failure:
//
//     fetch('/api/proxy/operator/lifecycle-board').then(r => r.json())
//       .then(j => { if (!alive() || !j?.success) return      // ← silently returns
//         … setLifecycle(m) })
//       .catch(() => { /* rows fall back to industry · country … */ }),
//
// The catch is deliberate and its stated reason is sound for the STAGE WORD: *"A FAILED READ
// LEAVES THE ROWS WITHOUT A STAGE WORD, never with a guessed one."* But `needs_you` is not a
// label, it is a QUESTION, and the component answers it from the same empty map:
//
//     const needsYou = (id: string) => lifecycle[id]?.needs_you === true
//
// 🛑 ABSENT IS NOT FALSE. On a failed read that predicate answers `false` for every client in
// the book, so the Needs-you filter empties and the component renders:
//
//     {visible.length === 0 && (clients?.length ?? 0) > 0 && <p>Nothing needs you right now. 🎉</p>}
//
// The most reassuring sentence this console prints, with a party emoji, produced by a broken
// read. `vida-operator-tasks.ts` already learned this lesson for the TASK queue — it keeps
// `failed` as a distinct state from `empty` precisely so the calm sentence cannot be the
// output of blindness — and the BOARD, which is the other half of the same answer, did not.
//
// ⚠️ AND THE SERVER CAN PRODUCE THE SAME LIE WITHOUT FAILING AT ALL. `GET /operator/worklist`
// and `GET /operator/clients` both destructure `const { data } = await db.from(…)` with no
// error check, so a failed read leaves them answering `200 { success: true, data: [] }`. The
// browser then correctly reports what it was told: nothing to do. A surface cannot be honest
// about a read whose failure never reached it.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { needsYouEmptyState } from './vida-needs-you-state'

describe('J7-C1 · the empty Needs-you sentence is gated on the board being READABLE', () => {
  it('🛑 a FAILED board read never produces "nothing needs you"', async () => {
    const s = needsYouEmptyState({
      board: { ok: false, error: 'Failed to read the lifecycle board' },
      clientCount: 12, visibleCount: 0,
    })
    expect(s.kind, 'a broken read rendered the calm sentence').toBe('board_unreadable')
    // ⚠️ THE TEST IS THAT IT DOES NOT *ASSERT* CALM, NOT THAT THE WORDS ARE ABSENT. The honest
    // sentence quotes the phrase in order to deny it — `panelView` does the same thing
    // ('this is NOT "nothing to do"') — and a blanket ban on the words would force the message
    // to be vaguer than the thing it is correcting.
    const { NEEDS_YOU_EMPTY_COPY } = await import('./vida-needs-you-state')
    expect(s.message, 'a broken read produced the calm copy verbatim').not.toBe(NEEDS_YOU_EMPTY_COPY)
    expect(s.message, 'the phrase appears without being denied').toMatch(/NOT "nothing needs you"/)
    expect(s.trustworthy).toBe(false)
  })

  it('🛑 the failed sentence says the absence PROVES NOTHING, and names the fix', () => {
    const s = needsYouEmptyState({
      board: { ok: false, error: 'the API returned no data' },
      clientCount: 12, visibleCount: 0,
    })
    // The `panelView` standard, applied to the board: what it could not do, and that the
    // empty list is unknown rather than clear.
    expect(s.message).toMatch(/NOT/)
    expect(s.message, 'the reason was swallowed').toContain('the API returned no data')
  })

  it('a GOOD board read with genuinely nothing pending still says so — calm is allowed when it is true', () => {
    const s = needsYouEmptyState({ board: { ok: true }, clientCount: 12, visibleCount: 0 })
    expect(s.kind).toBe('needs_you_empty')
    expect(s.message).toMatch(/nothing needs you/i)
    expect(s.trustworthy).toBe(true)
  })

  it('with rows to show, neither sentence appears', () => {
    expect(needsYouEmptyState({ board: { ok: true }, clientCount: 12, visibleCount: 3 }).kind).toBe('silent')
    expect(needsYouEmptyState({
      board: { ok: false, error: 'boom' }, clientCount: 12, visibleCount: 3,
    }).kind).toBe('silent')
  })

  it('🛑 a console with NO CLIENTS says nothing about needing you either way', () => {
    // An empty book is not "nothing needs you" and it is not "unreadable" — it is a console
    // nobody has signed up to yet, and both sentences would be about the wrong thing.
    expect(needsYouEmptyState({ board: { ok: true }, clientCount: 0, visibleCount: 0 }).kind).toBe('silent')
    expect(needsYouEmptyState({
      board: { ok: false, error: 'boom' }, clientCount: 0, visibleCount: 0,
    }).kind).toBe('silent')
  })

  it('a board read that has not finished yet is not a failure and not a clear board', () => {
    const s = needsYouEmptyState({ board: { ok: 'pending' as never }, clientCount: 12, visibleCount: 0 })
    expect(['loading', 'silent'], 'an in-flight read was resolved to one of the two answers').toContain(s.kind)
    if ('message' in s && s.message) expect(s.message).not.toMatch(/nothing needs you/i)
  })
})

describe('J7-C1 · the component actually uses it', () => {
  const SRC = readFileSync(join(__dirname, '../components/vida/VidaClients.tsx'), 'utf8')
  const CODE = SRC.split('\n')
    .filter(l => {
      const t = l.trim()
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*')
    })
    .join('\n')

  it('🛑 the bare sentence is GONE from the JSX — it can only come from the rule', () => {
    // ⚠️ ON CODE, NOT SOURCE. The chained note that explains the change quotes the old
    // sentence, and an absence assertion that reads comments asserts against its own
    // documentation — a trap this repository has now hit four times.
    expect(
      CODE,
      'the component can still print the calm sentence without asking whether the board was readable',
    ).not.toMatch(/Nothing needs you right now/)
    expect(CODE, 'the component does not consult the rule').toMatch(/needsYouEmptyState/)
  })

  it('🛑 the board read RECORDS its failure instead of swallowing it', () => {
    const at = CODE.indexOf("operator/lifecycle-board")
    expect(at, 'the board read moved — this guard must be repointed').toBeGreaterThan(-1)
    const block = CODE.slice(at, at + 900)
    expect(block, 'the board read still discards its own failure').toMatch(/setBoardError|boardError/)
  })
})

describe('J7-C1 · the server cannot answer 200-with-empty over a failed read', () => {
  const OPERATOR = readFileSync(join(__dirname, '../../../api/src/routes/operator.ts'), 'utf8')

  /** The body of one route, to the start of the next one. */
  const routeBody = (marker: string): string => {
    const at = OPERATOR.indexOf(marker)
    expect(at, `${marker} must exist`).toBeGreaterThan(-1)
    const next = OPERATOR.indexOf('operatorRouter.', at + marker.length)
    return OPERATOR.slice(at, next > at ? next : at + 3000)
  }

  for (const [name, marker] of [
    ['the worklist', "operatorRouter.get('/worklist'"],
    ['the client list', "operatorRouter.get('/clients'"],
    ['the lifecycle board', "operatorRouter.get('/lifecycle-board'"],
  ] as const) {
    it(`🛑 ${name} checks the error on its own decisive read`, () => {
      const body = routeBody(marker)
      // The shape that hides a failure: `const { data } = await db.from(...)` with no `error`.
      const destructures = [...body.matchAll(/const\s*\{\s*data[^}]*\}\s*=\s*await\s*db\s*\.from\(/g)]
      for (const m of destructures) {
        const decl = body.slice(m.index ?? 0, (m.index ?? 0) + 200)
        expect(
          decl,
          `${name} destructures a read without its error — a failed read becomes an empty list, `
          + 'and an empty list is what "nothing needs you" is computed from',
        ).toMatch(/\berror\b/)
      }
      expect(destructures.length, `${name} has no decisive read — this guard must be repointed`)
        .toBeGreaterThan(0)
    })
  }
})
