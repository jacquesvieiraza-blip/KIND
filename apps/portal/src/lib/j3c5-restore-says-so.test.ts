// ══════════════════════════════════════════════════════════════════════════════════════════
// J3-C5 · A FAILED RESTORE IS VISIBLE, AND IS NEVER A NEW CONVERSATION
//
// The defect and the reasoning are in `conversation-restore.ts`'s own header. In short: the
// restore's `catch` said *"no thread yet — the greeting stands on its own"*, which is true of
// a first visit and false of a failed read, and both produced the same screen — a greeting over
// a blank thread for a client with twenty turns of history. Their composer still worked, so
// their next sentence joined a real thread the screen had just denied existed.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { restoreView, RESTORE_FAILED_COPY } from './conversation-restore'

describe('J3-C5 · the four states are four screens', () => {
  it('🛑 a FAILED restore says so, and does NOT greet', () => {
    const v = restoreView({ ok: false, error: 'Server error (502)' })
    expect(v.kind, 'a failed read was rendered as a fresh conversation').toBe('unreadable')
    expect(v.greet, 'the client was greeted as new over a thread we simply could not read').toBe(false)
    expect(v.message).toBe(RESTORE_FAILED_COPY)
  })

  it('🛑 the sentence tells them their words are SAFE, and that Milla can still see them', () => {
    // Without the first, "could not load" invites the worse assumption. Without the second they
    // re-explain everything they have already said — the concrete cost of the old behaviour.
    expect(RESTORE_FAILED_COPY, 'the client is left thinking their conversation is gone').toMatch(/not lost/i)
    expect(RESTORE_FAILED_COPY, 'nothing tells them Milla still has the context').toMatch(/Milla can still see/i)
  })

  it('a GENUINE first conversation still gets the greeting — the one case the old catch was right about', () => {
    const v = restoreView({ ok: true, count: 0 })
    expect(v.kind).toBe('silent')
    expect(v.greet, 'a real first-time client lost their greeting').toBe(true)
  })

  it('a restored thread neither greets nor alarms', () => {
    const v = restoreView({ ok: true, count: 14 })
    expect(v.kind).toBe('silent')
    expect(v.greet, 'a returning client with a thread on screen was greeted as new').toBe(false)
  })

  it('a restore still in flight claims NEITHER', () => {
    const v = restoreView({ ok: 'pending' })
    expect(v.kind).toBe('loading')
    expect(v.greet).toBe(false)
    expect(v.message).toBeUndefined()
  })
})

describe('J3-C5 · the component uses it', () => {
  const SRC = readFileSync(join(__dirname, '../components/milla/MillaConversation.tsx'), 'utf8')
  const CODE = SRC.split('\n')
    .filter(l => {
      const t = l.trim()
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*')
    })
    .join('\n')

  it('🛑 the restore records its failure instead of swallowing it', () => {
    const at = CODE.indexOf("'/milla/sessions'")
    expect(at, 'the restore moved — this guard must be repointed').toBeGreaterThan(-1)
    const block = CODE.slice(at, at + 1200)
    expect(
      block,
      'the restore still treats a failed read exactly like a client who has never spoken to Milla',
    ).toMatch(/setRestore|restoreErr/)
  })

  it('🛑 the empty `catch` that conflated the two states is gone', () => {
    // ⚠️ ON CODE, NOT SOURCE: the chained note explaining the change quotes the old comment.
    expect(CODE, 'the swallowing catch came back')
      .not.toMatch(/catch\s*\{\s*\/\*\s*no thread yet/)
  })

  it('the component consults the rule rather than deciding in JSX', () => {
    expect(CODE, 'the component decides the screen itself again').toMatch(/restoreView/)
  })
})
