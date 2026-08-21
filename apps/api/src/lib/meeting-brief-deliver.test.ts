import { describe, it, expect, vi, beforeEach } from 'vitest'

// P34 — the delivery half. What is proved here is everything that only exists
// once there is a database: that a DRAFT can never reach a model, that an edit
// inserts rather than overwrites, that two tabs cannot both write version N,
// and that a client can never read or approve another client's brief.

type Row = Record<string, unknown>
const state: {
  rows: Row[]
  insertError: { code?: string; message: string } | null
  seenClientFilters: string[]
  seenStatusFilters: string[]
  icp: Row | null
  knowledge: Row[]
  feedback: Row[]
} = { rows: [], insertError: null, seenClientFilters: [], seenStatusFilters: [], icp: null, knowledge: [], feedback: [] }

vi.mock('@kind/db', () => {
  const make = (table: string) => {
    const filters: Record<string, unknown> = {}
    let result: unknown = { data: null, error: null }
    let pendingUpdate: Row | null = null
    let desc = false
    const q: Record<string, unknown> = {}
    const self = () => q as never

    const matching = () => state.rows.filter(r =>
      Object.entries(filters).every(([k, v]) => r[k] === v))

    Object.assign(q, {
      select: () => self(),
      eq: (col: string, val: unknown) => {
        filters[col] = val
        if (col === 'client_id') state.seenClientFilters.push(String(val))
        if (col === 'status') state.seenStatusFilters.push(String(val))
        return self()
      },
      not: self, in: self,
      order: (_c: string, o?: { ascending?: boolean }) => { desc = o?.ascending === false; return self() },
      limit: () => self(),
      maybeSingle: () => {
        if (table === 'icps') return Promise.resolve({ data: state.icp, error: null })
        if (pendingUpdate) {
          const hit = matching()[0] ?? null
          if (hit) Object.assign(hit, pendingUpdate)
          return Promise.resolve({ data: hit, error: null })
        }
        const rows = [...matching()].sort((a, b) =>
          desc ? Number(b.version) - Number(a.version) : Number(a.version) - Number(b.version))
        return Promise.resolve({ data: rows[0] ?? null, error: null })
      },
      single: () => Promise.resolve({ data: (result as { data?: unknown }).data ?? null, error: (result as { error?: unknown }).error ?? null }),
      // ⚠️ DEFERRED ON PURPOSE. The real call is
      // `.update(patch).eq(client_id).eq(version).eq(status).select().maybeSingle()`,
      // so the filters arrive AFTER update(). An earlier version of this fake applied
      // the patch immediately, against an empty filter set — it happily approved the
      // first row in the table, which made the tenant-isolation test pass for the
      // wrong reason and the re-approval test fail for the right one.
      update: (patch: Row) => { pendingUpdate = patch; return self() },
      insert: (row: Row) => {
        if (state.insertError) { result = { data: null, error: state.insertError }; return self() }
        const clash = state.rows.some(r => r.client_id === row.client_id && r.version === row.version)
        if (clash) {
          result = { data: null, error: { code: '23505', message: 'duplicate key' } }
          return self()
        }
        const full = { id: `b-${state.rows.length + 1}`, created_at: '2026-08-22T08:00:00Z', ...row }
        state.rows.push(full)
        result = { data: full, error: null }
        return self()
      },
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
        let out = result
        if (table === 'figsy_knowledge') out = { data: state.knowledge, error: null }
        else if (table === 'lead_feedback') out = { data: state.feedback, error: null }
        else if (table === 'meeting_briefs' && (result as { data?: unknown }).data === null) {
          const rows = [...matching()].sort((a, b) =>
            desc ? Number(b.version) - Number(a.version) : Number(a.version) - Number(b.version))
          out = { data: rows, error: null }
        }
        return Promise.resolve(out).then(resolve, reject)
      },
    })
    return q
  }
  return { db: { from: (t: string) => make(t) } }
})

const M = await import('./meeting-brief-deliver')

beforeEach(() => {
  state.rows = []; state.insertError = null
  state.seenClientFilters = []; state.seenStatusFilters = []
  state.icp = null; state.knowledge = []; state.feedback = []
})

const draft = (v: number, client = 'a', extra: Row = {}) =>
  ({ id: `b-${v}`, client_id: client, version: v, status: 'draft', provenance: {}, created_at: 'x', ...extra })
const approved = (v: number, client = 'a', extra: Row = {}) =>
  draft(v, client, { status: 'approved', ...extra })

describe('A DRAFT NEVER REACHES A MODEL — the rule the whole design turns on', () => {
  it('currentBrief ignores a draft, even at the highest version', () => {
    state.rows = [approved(1, 'a', { target_personas: 'COO' }), draft(4, 'a', { target_personas: 'ANYONE' })]
    return M.currentBrief('a').then(b => {
      expect(b?.version).toBe(1)
      expect(b?.content.target_personas).toBe('COO')
    })
  })

  it('the read is filtered on status — not just ordered by version', () => {
    // The failure mode this guards is a future "simplification" to MAX(version).
    state.rows = [approved(1, 'a')]
    return M.currentBrief('a').then(() => {
      expect(state.seenStatusFilters).toContain('approved')
    })
  })

  it('a client with only a draft has NO consumer context at all', async () => {
    state.rows = [draft(1, 'a', { target_personas: 'COO' })]
    expect(await M.briefContextFor('a')).toBeNull()
  })

  it('an approved brief DOES reach the prompt', async () => {
    state.rows = [approved(1, 'a', { target_personas: 'COO' })]
    const ctx = await M.briefContextFor('a')
    expect(ctx).toContain('Target personas: COO')
  })

  it('a client with no brief gets null — consumers behave exactly as today', async () => {
    expect(await M.briefContextFor('a')).toBeNull()
  })
})

describe('versions are immutable in content', () => {
  it('an edit INSERTS version 2 and leaves version 1 untouched', async () => {
    state.rows = [approved(1, 'a', { target_personas: 'COO', provenance: { target_personas: 'icp' } })]
    const before = JSON.stringify(state.rows[0])

    const r = await M.editBrief('a', { target_personas: 'Head of Ops' })
    expect(r.status).toBe('created')
    expect(state.rows).toHaveLength(2)
    expect(JSON.stringify(state.rows[0])).toBe(before)   // byte-for-byte
    expect(state.rows[1].version).toBe(2)
    expect(state.rows[1].target_personas).toBe('Head of Ops')
  })

  it('an edit is approved immediately — the client IS the approver', async () => {
    state.rows = [approved(1, 'a', { target_personas: 'COO' })]
    await M.editBrief('a', { target_personas: 'CFO' })
    expect(state.rows[1].status).toBe('approved')
    expect(state.rows[1].approved_by).toBe('client')
  })

  it('TWO CONCURRENT EDITS cannot both create version 2', async () => {
    state.rows = [approved(1, 'a', { target_personas: 'COO' })]
    const [x, y] = await Promise.all([
      M.editBrief('a', { target_personas: 'A' }),
      M.editBrief('a', { target_personas: 'B' }),
    ])
    const outcomes = [x.status, y.status].sort()
    expect(outcomes).toEqual(['conflict', 'created'])
    expect(state.rows).toHaveLength(2)      // never three
  })

  it('editing with no brief yet is refused, not invented', async () => {
    expect((await M.editBrief('a', { objective: 'x' })).status).toBe('no_base')
  })
})

describe('approval', () => {
  it('flips a draft to approved and stamps who', async () => {
    state.rows = [draft(1, 'a')]
    const r = await M.approveBrief('a', 1)
    expect(r.status).toBe('approved')
    expect(state.rows[0].status).toBe('approved')
    expect(state.rows[0].approved_by).toBe('client')
  })

  it('approving touches NO content column', async () => {
    state.rows = [draft(1, 'a', { target_personas: 'COO', objective: 'x' })]
    await M.approveBrief('a', 1)
    expect(state.rows[0].target_personas).toBe('COO')
    expect(state.rows[0].objective).toBe('x')
  })

  it('cannot re-approve an already-approved version', async () => {
    // Otherwise approved_at silently moves, rewriting when the client agreed.
    state.rows = [approved(1, 'a', { approved_at: 'FIRST' })]
    const r = await M.approveBrief('a', 1)
    expect(r.status).toBe('not_found')
    expect(state.rows[0].approved_at).toBe('FIRST')
  })
})

describe('tenant isolation', () => {
  it('Client A cannot read Client B\'s brief', async () => {
    state.rows = [approved(1, 'b', { target_personas: 'SECRET' })]
    expect(await M.currentBrief('a')).toBeNull()
    expect(await M.briefContextFor('a')).toBeNull()
  })

  it('Client A cannot approve Client B\'s draft', async () => {
    state.rows = [draft(1, 'b')]
    const r = await M.approveBrief('a', 1)
    expect(r.status).toBe('not_found')
    expect(state.rows[0].status).toBe('draft')     // untouched
  })

  it('every brief query filters on the requesting client', async () => {
    state.rows = [approved(1, 'a')]
    await M.currentBrief('a')
    expect(new Set(state.seenClientFilters)).toEqual(new Set(['a']))
  })
})

describe('assembly from real evidence', () => {
  it('builds v1 as a DRAFT from the ICP and knowledge', async () => {
    state.icp = { job_titles: ['COO'], industries: ['Logistics'] }
    state.knowledge = [{ kind: 'pitch', data: { pitch: 'we cut idle time' } }]
    const r = await M.ensureBrief('a')
    expect(r.status).toBe('created')
    expect(state.rows[0].status).toBe('draft')     // NOT live until confirmed
    expect(state.rows[0].target_personas).toBe('COO')
    expect(state.rows[0].proposition).toBe('we cut idle time')
  })

  it('a client with NO evidence gets no brief at all', async () => {
    // Rather than an empty "here's what I understand" that reads as broken.
    expect((await M.ensureBrief('a')).status).toBe('no_evidence')
    expect(state.rows).toHaveLength(0)
  })

  it('only REPEATED rejections become anti-signals', async () => {
    // One pass is a one-off; a pattern is what belongs in a targeting document.
    state.icp = { job_titles: ['COO'] }
    state.feedback = [{ reason_code: 'too_big' }, { reason_code: 'too_big' }, { reason_code: 'bad_timing' }]
    await M.ensureBrief('a')
    expect(String(state.rows[0].anti_signals)).toContain('too big')
    expect(String(state.rows[0].anti_signals)).not.toContain('bad timing')
  })

  it('is idempotent — a second call returns the existing brief', async () => {
    state.rows = [draft(1, 'a', { target_personas: 'COO' })]
    const r = await M.ensureBrief('a')
    expect(r.status).toBe('exists')
    expect(state.rows).toHaveLength(1)
  })
})

describe('the consumer rail', () => {
  it('NEVER THROWS — scoring and sequences must not break for a brief', async () => {
    const { db } = await import('@kind/db') as unknown as { db: { from: unknown } }
    const original = db.from
    ;(db as { from: unknown }).from = () => { throw new Error('database is gone') }
    try {
      expect(await M.briefContextFor('a')).toBeNull()
    } finally {
      ;(db as { from: unknown }).from = original
    }
  })
})
