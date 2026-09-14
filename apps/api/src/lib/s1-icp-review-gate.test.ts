import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE NEEDS-ICP-REVIEW GATE, EXECUTED — `runIcpJob` itself refuses. (S1-RT-005.)
//
// ── WHY THIS FILE EXISTS, AND IT IS NOT A STYLE PREFERENCE ─────────────────────────────
//
// 🛑 THE FIRST VERSION OF THIS GUARD WAS A SOURCE PIN, AND IT DID NOT BITE. It asserted that
// `runIcpJob`'s body contains `icpNeedsReview(`, and a deliberate tooth — rewriting the
// condition as `if (false && icpNeedsReview(...))` — left the suite GREEN. The string was
// still there; the gate was gone. A guard that survives the removal of the thing it guards
// is worse than no guard, because it is believed.
//
// So the gate is proved by RUNNING IT: the real `runIcpJob`, against a database double, with
// every provider, reservation, ledger and insert seam watched. The assertion is not "the
// code mentions the check" but "nothing was sourced and nothing was spent".
//
// ⚠️ THE DOUBLE IS DELIBERATELY HOSTILE. Every table except `icps` throws on access, so if
// the refusal ever moves BELOW a spend the test fails with that table's name rather than
// passing quietly — the failure names its own cause.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const box = vi.hoisted(() => ({
  icp: null as Row | null,
  /** Every table the run touched after `icps`. Empty is the proof. */
  touched: [] as string[],
  /** Every RPC the run called. Empty is the proof. */
  rpcs: [] as string[],
}))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      if (table !== 'icps') {
        box.touched.push(table)
        throw new Error(`REFUSAL LEAKED: the run reached table "${table}" — the review gate must sit above every spend`)
      }
      const q: Record<string, unknown> = {
        select() { return q },
        eq() { return q },
        is() { return q },
        order() { return q },
        limit() { return q },
        async single() { return { data: box.icp, error: box.icp ? null : { message: 'not found' } } },
        async maybeSingle() { return { data: box.icp, error: null } },
        then(resolve: (v: unknown) => unknown) { return resolve({ data: box.icp ? [box.icp] : [], error: null }) },
      }
      return q
    },
    rpc: async (name: string) => {
      box.rpcs.push(name)
      throw new Error(`REFUSAL LEAKED: the run called RPC "${name}" — the review gate must sit above every spend`)
    },
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  },
}))

vi.mock('../middleware/auth', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}))

beforeEach(() => {
  box.icp = null
  box.touched = []
  box.rpcs = []
})

/** A healthy ICP row, with whatever review state the case is about. */
const icpRow = (over: Row = {}): Row => ({
  id: 'icp-1', client_id: 'client-1', name: 'UK agencies',
  industries: [], seniority_levels: [], company_sizes: [],
  geographies: ['United Kingdom'], job_titles: ['Founder'],
  keywords: [], tech_stack: [], is_active: true,
  icp_review: null, icp_review_resolved_at: null,
  ...over,
})

const OPEN_REVIEW = { requirements: [{ field: 'industries', said: ['B2B service businesses'] }] }

async function run() {
  const { runIcpJob } = await import('../routes/icps')
  return runIcpJob('icp-1', 'client-1', 'user-1', 50)
}

describe('🛑 an ICP awaiting review sources NOTHING and spends NOTHING', () => {
  it('🛑 runIcpJob REFUSES — and it is the run itself, not a screen, that refuses', async () => {
    box.icp = icpRow({ icp_review: OPEN_REVIEW })
    await expect(run()).rejects.toThrow(/still being prepared/i)
  })

  it('🛑 ZERO provider calls, ZERO reservations, ZERO ledger rows, ZERO leads', async () => {
    box.icp = icpRow({ icp_review: OPEN_REVIEW })
    await expect(run()).rejects.toThrow()
    // The double throws on ANY table but `icps`, so an empty list is the guarantee: the
    // refusal happened before sourcing could read a budget, reserve, spend or insert.
    expect(box.touched, `the run reached: ${box.touched.join(', ')}`).toEqual([])
    expect(box.rpcs, `the run called: ${box.rpcs.join(', ')}`).toEqual([])
  })

  it('🛑 a CORRUPT review refuses too — an unreadable state is never a licence to spend', async () => {
    box.icp = icpRow({ icp_review: 'not a review object' })
    await expect(run()).rejects.toThrow(/still being prepared/i)
    expect(box.touched).toEqual([])
  })

  it('🛑 and the refusal names the client, so an unattended row is findable', async () => {
    box.icp = icpRow({ icp_review: OPEN_REVIEW })
    const logs: string[] = []
    const spy = vi.spyOn(console, 'log').mockImplementation(m => { logs.push(String(m)) })
    await expect(run()).rejects.toThrow()
    spy.mockRestore()
    expect(logs.join('\n')).toContain('sourcing REFUSED for client client-1')
  })
})

describe('🛑 a RESOLVED review does not block — the gate opens when the work is done', () => {
  it('a resolved review lets the run proceed past the gate', async () => {
    box.icp = icpRow({ icp_review: OPEN_REVIEW, icp_review_resolved_at: '2026-09-14T10:00:00Z' })
    // ⚠️ IT STILL THROWS, and that is the correct outcome here: the hostile double refuses
    // the NEXT table the run legitimately reads. The distinction this case makes is WHICH
    // refusal — "REFUSAL LEAKED" means the gate let it through, which is exactly what a
    // resolved review is supposed to do.
    await expect(run()).rejects.toThrow(/REFUSAL LEAKED/)
    expect(box.touched.length, 'a resolved ICP must get past the gate').toBeGreaterThan(0)
  })

  it('an ICP that never needed review is completely unaffected — the normal path', async () => {
    box.icp = icpRow()   // icp_review: null
    await expect(run()).rejects.toThrow(/REFUSAL LEAKED/)
    expect(box.touched.length, 'a normal ICP must not be gated').toBeGreaterThan(0)
  })

  it('an EMPTY requirements array is not a block either', async () => {
    box.icp = icpRow({ icp_review: { requirements: [] } })
    await expect(run()).rejects.toThrow(/REFUSAL LEAKED/)
    expect(box.touched.length).toBeGreaterThan(0)
  })
})
