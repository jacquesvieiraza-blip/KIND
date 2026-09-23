// ═══════════════════════════════════════════════════════════════════════════════════════
// VIDA'S RETRY PROOF SENDS THE NOTE THE SERVER REQUIRES — BOTH SIDES OF ONE HANDSHAKE
//
// ⚑ 23 Sep. XC-12 (18 Sep) made `POST /operator/proof-retry/:clientId` refuse any recovery
// without a `note`. The Vida button posted `{ icp_id }` only and had no way to ask for one, so
// every press came back "A note is required: a recovery has to record what it is recovering
// from." — no Proof could be retried from Vida, for any client. The founder found it on
// Blackburne Enterprises: "nothing".
//
// The server was tested (xc12-recovery-control) and the button existed; nothing tested that the
// one spoke the other's language. This file reads BOTH, so a rename on either side goes red.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const vida = readFileSync(join(__dirname, '..', 'app', 'vida', 'page.tsx'), 'utf8')
const operator = readFileSync(join(__dirname, '..', '..', '..', 'api', 'src', 'routes', 'operator.ts'), 'utf8')

function slice(src: string, start: string, end: string): string {
  const a = src.indexOf(start)
  expect(a, `${start} moved — repoint this guard`).toBeGreaterThan(-1)
  const b = src.indexOf(end, a)
  expect(b, `${end} not found after ${start}`).toBeGreaterThan(a)
  return src.slice(a, b)
}

const button = slice(vida, 'const retryProof = useCallback(async () => {', '}, [selected, cockpit, clients, loadProgramme])')
const route = slice(operator, "operatorRouter.post('/proof-retry/:clientId'", 'const RECOVERABLE')

describe('Retry Proof — the Vida button and the server agree', () => {
  it('🛑 the server still requires a `note` (if this changes, the button must change with it)', () => {
    expect(route).toContain("req.body?.note")
    expect(route).toContain('A note is required')
  })

  it('🛑 the button SENDS the note in the body', () => {
    expect(button).toMatch(/body: JSON\.stringify\(\{ icp_id: icp\.id, note \}\)/)
  })

  it('🛑 the note is ASKED of the operator, never invented', () => {
    expect(button).toContain('window.prompt(')
    const ask = button.indexOf('window.prompt(')
    const post = button.indexOf('fetch(')
    expect(ask, 'the operator is asked before anything is posted').toBeLessThan(post)
    // No hard-coded note string in the body: the value sent is the operator's answer.
    expect(button).not.toMatch(/note:\s*['"`]/)
  })

  it('🛑 an empty answer posts NOTHING and says why', () => {
    const guard = button.indexOf("if (!note) {")
    expect(guard).toBeGreaterThan(-1)
    expect(guard, 'the empty-note refusal sits before the request').toBeLessThan(button.indexOf('fetch('))
    expect(button.slice(guard, button.indexOf('\n', guard))).toContain('return')
  })
})
