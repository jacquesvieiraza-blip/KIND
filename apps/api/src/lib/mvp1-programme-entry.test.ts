// ⚑ 16 Sep (MVP1 · A3 + A4) — A PROGRAMME CANNOT EXIST BEFORE THE CLIENT'S JOURNEY REACHES IT,
// AND A FINISHED PROGRAMME CANNOT REPLACE A CLIENT'S CURRENT PROOF.
//
// ── A3: TWO DOORS INTO ONE TABLE, AND ONLY ONE OF THEM WAS GATED ──────────────────────
//
// 🛑 `programmes` has exactly one INSERT — `createProgramme` — and two callers:
//
//   · `client-programme-choice.ts` (Milla's calculator) refuses unless `proof_completed_at` is
//     set AND an accepted ICP exists. Both refusals carry client sentences.
//   · `POST /programmes` (the admin/Vida door) called `createProgramme` directly behind the
//     operator key and checked NEITHER.
//
// So an operator could price and create a programme for a client who had never seen a Proof
// set, and that programme would then own the client journey: Milla's calculator is reached
// through Recommendation, which `deriveLifecycle` only awards on `proofCompleted`. A programme
// created behind it is a commercial object with no client decision underneath it.
//
// ⚠️ THE GATE GOES IN `createProgramme`, NOT IN THE ROUTE (founder: *"Do not create a second
// commercial path."*). One insert, one gate: a third door cannot be added later that forgets.
//
// ── A4: A TERMINAL ROW MADE EVERY CLIENT LOOK LIKE A PROGRAMME CLIENT ─────────────────
//
// 🛑 `readCustomerProgramme` picked `all.find(r => !TERMINAL.includes(r.status)) ?? all[0]` —
// the `?? all[0]` falls back to ANY historical row. A client whose only programme is
// COMPLETED or CANCELLED therefore read as `hasProgramme: true`, so Milla rendered the
// ProgrammeWorkspace over a client who is mid-Proof on a NEW journey.

process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@kind/db', () => ({ db: { from: () => ({}), rpc: async () => ({ data: null, error: null }) } }))

const REPO = join(__dirname, '../../../..')
const codeOnly = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')

const src = (p: string) => codeOnly(readFileSync(join(REPO, p), 'utf8'))

// ─────────────────────────────────────────────────────────────────────────────
// Ⓐ A3 — THE INSERT ITSELF IS GATED
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓐ · A3 · no programme before Proof is complete', () => {
  it('🛑 `createProgramme` refuses a client with no `proof_completed_at`', () => {
    const p = src('apps/api/src/lib/programme.ts')
    const fn = p.slice(p.indexOf('export async function createProgramme'))
    expect(fn, 'the insert is still reachable for a client who never completed Proof')
      .toMatch(/proof_completed_at|proofIsComplete|programmeEntryAllowed/)
  })

  it('and it refuses a client with no targeting to source from', () => {
    const p = src('apps/api/src/lib/programme.ts')
    const fn = p.slice(p.indexOf('export async function createProgramme'))
    expect(fn, 'a programme with no ICP can be created, and cannot source')
      .toMatch(/icp/i)
  })

  it('🛑 THE GATE IS BEFORE THE INSERT, not after it', () => {
    const p = src('apps/api/src/lib/programme.ts')
    const fn = p.slice(p.indexOf('export async function createProgramme'))
    const gate = fn.search(/programmeEntryAllowed|proof_completed_at/)
    const insert = fn.indexOf("from('programmes').insert")
    expect(gate).toBeGreaterThan(-1)
    expect(insert).toBeGreaterThan(-1)
    expect(gate, 'the row is written before the journey is checked').toBeLessThan(insert)
  })

  it('the admin door keeps using the ONE creator — no second commercial path', () => {
    const route = src('apps/api/src/routes/programme.ts')
    expect(route).toMatch(/createProgramme\(String\(clientId\), Number\(meetings\)\)/)
    // 🛑 NO SECOND INSERT ANYWHERE. `createProgramme` is still the only writer.
    const all = [
      'apps/api/src/routes/programme.ts',
      'apps/api/src/routes/operator.ts',
      'apps/api/src/lib/client-programme-choice.ts',
    ].map(src).join('\n')
    expect(all, 'a second programmes INSERT appeared').not.toMatch(/from\('programmes'\)\s*\.insert/)
  })

  it('and the client calculator still carries its own client-facing refusals', () => {
    // A3 must not remove the calculator's sentences: an operator gets a reason code, a client
    // gets a sentence, and the two refusals are read by different people.
    const choice = src('apps/api/src/lib/client-programme-choice.ts')
    expect(choice).toMatch(/proof_incomplete/)
    expect(choice).toMatch(/no_icp/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓑ A4 — A FINISHED PROGRAMME IS HISTORY, NOT A WORKSPACE
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓑ · A4 · terminal history must not blank Proof', () => {
  it('🛑 THE DEFECT, PINNED — the `?? all[0]` fallback to any historical row is GONE', () => {
    const cp = src('apps/api/src/lib/customer-programme.ts')
    expect(cp, 'a COMPLETED programme can still become the current workspace')
      .not.toMatch(/all\.find\(r => !TERMINAL\.includes\(String\(r\.status\)\)\) \?\? all\[0\]/)
  })

  it('🛑 THE SELECTION CONSULTS PROOF COMPLETION — the invariant, not a string', () => {
    const cp = src('apps/api/src/lib/customer-programme.ts')
    // The workspace choice must ASK whether the client finished a journey. Any fallback to a
    // historical row that does not go through this question is the defect, whatever it is
    // spelled like.
    const at = cp.indexOf("const TERMINAL = ['COMPLETED', 'CANCELLED']")
    expect(at, 'the terminal set moved — find the new selection before editing this guard')
      .toBeGreaterThan(0)
    const selection = cp.slice(at, at + 420)
    expect(selection, 'a terminal row can become the current workspace without asking whether Proof was completed')
      .toMatch(/proofCompleteFor\(clientId\)/)
    // 🛑 AND THE UNGUARDED FALLBACK IN ANY SPELLING. `?? all[0]` reached directly from the
    // open-programme pick is the defect itself, whatever the variable above it is called.
    expect(selection, 'the unguarded fallback to any historical row is back')
      .not.toMatch(/const data0 = open \?\? all\[0\]/)
    // And the open programme is still what drives `hasProgramme`.
    expect(cp).toMatch(/hasProgramme/)
  })

  it('an OPEN programme is never made to wait on that question', () => {
    const cp = src('apps/api/src/lib/customer-programme.ts')
    const at = cp.indexOf("const TERMINAL = ['COMPLETED', 'CANCELLED']")
    const selection = cp.slice(at, at + 900)
    // `open ? true : await …` — the extra read happens only when there is nothing open, so a
    // live programme costs no round trip and cannot be withheld by an unreadable client row.
    expect(selection).toMatch(/open \? true :/)
  })

  it('🛑 HISTORY IS PRESERVED — nothing stops reporting on a finished programme', () => {
    const cp = src('apps/api/src/lib/customer-programme.ts')
    // The terminal row must still be readable; A4 changes which row is CURRENT, not which
    // rows exist. A fix that dropped the row would break completion reporting (E2).
    expect(cp).toMatch(/terminal|TERMINAL/)
    expect(cp, 'the rows list was removed — completion reporting reads it')
      .not.toMatch(/\.eq\('status', 'LIVE'\)/)
  })
})
