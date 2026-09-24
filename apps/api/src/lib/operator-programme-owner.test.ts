// ═══════════════════════════════════════════════════════════════════════════════════════
// 24 Sep — VIDA COULD NOT SHOW ANY PROGRAMME CLIENT. Found on the founder's House walk: Vida
// said *"This programme belongs to a different client, so nothing can be prepared, paused,
// authorised or re-frozen from it."* for a client looking at its OWN programme.
//
// Since 13 Sep (BL-1) Vida refuses any programme whose owner it cannot read. The server SELECTED
// `client_id` and then built the operator view without it — so every programme arrived unowned.
// This runs the real server builder against a programme row and hands its answer to Vida's own
// decision, which is the exact path that failed.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi } from 'vitest'
import { decideProgrammeResponse } from '../../../admin/src/lib/vida-programme-isolation'

const ROW = {
  id: 'p-1', client_id: 'c-house', status: 'RECOMMENDED', meeting_target: 10, recommended_volume: 2500,
  first_paid_at: null, second_paid_at: null, first_payment_ref: null, second_payment_ref: null,
  sourcing_ceiling: 0, sourced_used: 0, sourced_reserved: 0, approved_at: null, went_live_at: null,
  paused_at: null, pause_reason: null, review_required_at: null, review_reason: null, review_resolved_at: null,
  first_authorised_at: null, second_authorised_at: null,
}

/** A chainable fake: every builder method returns the builder; awaiting it gives the table's rows. */
function fakeDb() {
  const rowsFor = (t: string) => (t === 'programmes' ? [ROW] : [])
  const builder = (t: string): any => {
    const b: any = new Proxy({}, {
      get(_o, k) {
        if (k === 'then') return (res: (v: unknown) => void) => res({ data: rowsFor(t), error: null, count: 0 })
        if (k === 'maybeSingle' || k === 'single') return async () => ({ data: rowsFor(t)[0] ?? null, error: null })
        return () => b
      },
    })
    return b
  }
  return { db: { from: (t: string) => builder(t), rpc: async () => ({ data: null, error: null }) } }
}

describe('Vida can read its own client\'s programme', () => {
  it('🛑 the operator view carries the owner, and Vida accepts it for that client', async () => {
    vi.resetModules()
    vi.doMock('@kind/db', () => fakeDb())
    const { programmeTruthFor } = await import('./operator-programme')
    const t = await programmeTruthFor('c-house')
    expect(t.programme?.client_id).toBe('c-house')
    const outcome = decideProgrammeResponse({
      requestedClientId: 'c-house', selectedClientId: 'c-house',
      requestGeneration: 1, currentGeneration: 1,
      apiSuccess: true, apiError: null, programme: t.programme,
    })
    expect(outcome.action, outcome.message).toBe('accept')
  })
})
