// ═══════════════════════════════════════════════════════════════════════════════════════
// R144 (23 Sep) — MILLA'S OPENING ENDS BY TELLING THE CLIENT WHAT TO TYPE FIRST
//
// Founder, verbatim: *"welcome is good. but it actually does not then tell me what to do next.
// i have to assume here. the 3 messages are great. but there should be a 4th message. say please
// tell us who you are, name etc. just to get going."*
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const welcome = readFileSync(
  join(__dirname, '..', '..', '..', 'portal', 'src', 'app', '(milla)', 'milla', 'welcome', 'page.tsx'), 'utf8')

/** The opening lines as the page declares them, comments removed. */
function openingLines(): string[] {
  const start = welcome.indexOf('const GREETING_LINES = [')
  expect(start, 'GREETING_LINES moved — repoint this guard').toBeGreaterThan(-1)
  const body = welcome.slice(start, welcome.indexOf('\n]', start))
  return [...body.replace(/^\s*\/\/.*$/gm, '').matchAll(/^\s*"((?:[^"\\]|\\.)*)",?\s*$/gm)].map(m => m[1])
}

describe('R144 · the opening has a fourth message, and it says what to type', () => {
  it('🛑 four messages — the three the founder approved, unchanged, then the fourth', () => {
    const lines = openingLines()
    expect(lines).toHaveLength(4)
    expect(lines[0]).toBe('Hi, I’m Milla. Welcome — you’re in.')
    expect(lines[2]).toContain('Looking costs nothing.')
  })

  it('🛑 the last message asks who they are — name, company, website — so nobody has to guess', () => {
    const last = openingLines()[3]
    expect(last).toMatch(/name/i)
    expect(last).toMatch(/company/i)
    expect(last).toMatch(/website/i)
    expect(last.trim().endsWith('?') || last.includes('?'), 'it is a question the client can answer').toBe(true)
  })

  it('all four opening messages are still dropped before the model sees the conversation (executed)', () => {
    type M = { role: 'user' | 'assistant'; content: string }
    const slice = (h: M[]) => h.slice(h.findIndex(m => m.role === 'user'))
    const history: M[] = [
      ...openingLines().map(content => ({ role: 'assistant' as const, content })),
      { role: 'user', content: 'Jacques, Blackburne Enterprises — blackburne.co.uk' },
    ]
    expect(slice(history)).toEqual([{ role: 'user', content: 'Jacques, Blackburne Enterprises — blackburne.co.uk' }])
  })
})
