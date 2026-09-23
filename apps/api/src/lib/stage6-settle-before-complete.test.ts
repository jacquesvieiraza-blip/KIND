// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 23 Sep (MVP1 Stage 6 · R136 ④ ⑤) — A PROGRAMME IS SETTLED BEFORE IT COMPLETES
//
// Founder, verbatim: *"we dont give money back. we refund credits to their wallet internally to
// use towards another icp run."* · *"they pay for what they recieve."*
//
// WHAT WAS WRONG, ALL LIVE ON `main`:
//   · `mayComplete` allowed completion as soon as `sourced_used >= sourcing_ceiling` — the LIMIT,
//     which since R136 is where we stop, not where the client got what they bought — so a short
//     programme closed with its wallet credit never computed;
//   · `POST /programmes/:id/settle-shortfall` had no caller in Vida;
//   · Vida's programme read never SELECTED `value_settled_at`, so `may_complete` could not see a
//     settled programme even when one existed;
//   · the Complete dialog told the operator "unused programme value… never expires".
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@kind/db', () => ({ db: {} }))

const REPO = join(__dirname, '../../../..')
const code = (p: string) => readFileSync(join(REPO, p), 'utf8').split('\n')
  .filter(l => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('{/*')) })
  .join('\n')

describe('Stage 6 — settle, then complete (R136 ④)', () => {
  it('🛑 reaching the sourcing limit is not a settlement', async () => {
    const { mayComplete } = await import('./programme')
    const base = {
      id: 'p', client_id: 'c', status: 'LIVE', meeting_target: 10,
      sourcing_ceiling: 4000, sourced_used: 4000, sourced_reserved: 0, value_settled_at: null,
    } as never
    expect(mayComplete(base).allowed, 'a programme at the limit closed unsettled').toBe(false)
    expect(mayComplete({ ...(base as object), shortfall_credited_at: '2026-09-23' } as never).allowed).toBe(true)
    const fn = code('apps/api/src/lib/programme.ts')
    const body = fn.slice(fn.indexOf('export function mayComplete'), fn.indexOf('export async function completeProgramme'))
    expect(body).not.toMatch(/sourced_used\s*>=/)
    expect(body).not.toMatch(/never expires/)
  })

  it('🛑 Vida\'s programme read selects the settlement, so `may_complete` can see it', () => {
    const op = code('apps/api/src/lib/operator-programme.ts')
    const cols = op.slice(op.indexOf('const PROGRAMME_COLUMNS'), op.indexOf('const BATCH_COLUMNS'))
    for (const c of ['value_settled_at', 'shortfall_credited_at', 'shortfall_credit_cents', 'delivered_meetings']) {
      expect(cols, `${c} is not selected`).toContain(c)
    }
    expect(op).toContain('meetings_booked: meetingsBooked')
  })

  it('🛑 Vida calls settle-shortfall, and the Complete dialog no longer promises "never expires"', () => {
    const vida = code('apps/admin/src/app/vida/page.tsx')
    expect(vida).toContain('/settle-shortfall`')
    expect(vida).toContain('const settleProgramme = useCallback(async () => {')
    const complete = vida.slice(vida.indexOf('const completeProgramme = useCallback'), vida.indexOf('const settleProgramme'))
    expect(complete).not.toMatch(/never expires/)
    expect(complete).toMatch(/credited to their wallet/)
  })

  it('🛑 a finished client sees delivered-vs-target and the credit, from the settled row', () => {
    const cp = code('apps/api/src/lib/customer-programme.ts')
    expect(cp).toContain('shortfall_credited_at, shortfall_credit_cents, delivered_meetings')
    expect(cp).toMatch(/settlement: p\.shortfall_credited_at/)
    const ws = code('apps/portal/src/components/milla/ProgrammeWorkspace.tsx')
    expect(ws).toMatch(/p\.settlement\.deliveredMeetings/)
    expect(ws).toMatch(/programmeMoney\(p\.settlement\.creditCents\)/)
    expect(ws, 'the retired promise is back on the client screen').not.toMatch(/never expires/)
  })
})
