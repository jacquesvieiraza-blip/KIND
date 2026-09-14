import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// F5 — VIDA'S MEMORY. ONE THREAD PER OPERATOR PER CLIENT, AND NO LEAKS.
//
// 🛑 WHAT MAKES THIS WORTH TESTING AT ALL. `vida_conversations` is keyed on TWO columns. Get
// either wrong and the failure is silent and serious: read by `client_id` alone and one
// operator is handed another's half-finished thought; read by `operator` alone and client A's
// conversation walks into client B's console, in front of somebody about to act on it.
//
// ⚠️ THE STORE IS EXERCISED THROUGH ITS REAL FUNCTIONS against an in-memory table that
// behaves like the real one: an upsert keyed on (operator, client_id), and a select filtered
// by whatever `.eq()` calls were made. If the module stopped sending one of those filters,
// the fake obeys the same rules the database would and the leak shows up here.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = { operator: string; client_id: string; conversation: unknown; updated_at: string }

const table = vi.hoisted(() => ({
  rows: [] as Row[],
  failNext: false,
  /** every filter set the module actually sent, so "both keys or nothing" is observable */
  lastFilters: [] as Array<Record<string, unknown>>,
}))

vi.mock('@kind/db', () => ({
  db: {
    from: (name: string) => {
      if (name !== 'vida_conversations') throw new Error(`unexpected table ${name}`)
      const filters: Record<string, unknown> = {}
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (col: string, val: unknown) => { filters[col] = val; return q },
        async maybeSingle() {
          table.lastFilters.push({ ...filters })
          if (table.failNext) { table.failNext = false; return { data: null, error: { message: 'down' } } }
          const hit = table.rows.find(r =>
            Object.entries(filters).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v))
          return { data: hit ? { conversation: hit.conversation } : null, error: null }
        },
        upsert(row: Row) {
          if (table.failNext) { table.failNext = false; return { then: (r: (v: unknown) => unknown) => r({ error: { message: 'down' } }) } }
          const i = table.rows.findIndex(x => x.operator === row.operator && x.client_id === row.client_id)
          if (i >= 0) table.rows[i] = { ...table.rows[i], ...row }
          else table.rows.push({ ...row })
          return { then: (r: (v: unknown) => unknown) => r({ error: null }) }
        },
      }
      return q
    },
  },
}))

beforeEach(() => { table.rows = []; table.failNext = false; table.lastFilters = [] })

const turn = (role: 'operator' | 'vida', text: string) => ({ role, text, at: '2026-09-14T10:00:00Z' })

describe('🛑 F5 · Vida remembers, per operator, per client', () => {
  it('F5 the thread is ordered and comes back as it went in', async () => {
    const { appendVidaConversation, vidaConversationFor } = await import('./vida-conversation')
    await appendVidaConversation('op@kind.test', 'c-1', [turn('operator', 'first'), turn('vida', 'second')])
    await appendVidaConversation('op@kind.test', 'c-1', [turn('operator', 'third'), turn('vida', 'fourth')])
    const got = await vidaConversationFor('op@kind.test', 'c-1')
    expect(got.map(t => t.text)).toEqual(['first', 'second', 'third', 'fourth'])
  })

  it('F5 re-entry on the same client continues the same thread', async () => {
    const { appendVidaConversation, vidaConversationFor } = await import('./vida-conversation')
    await appendVidaConversation('op@kind.test', 'c-1', [turn('operator', 'where are we')])
    // A reload is simply a fresh read — the module holds nothing in memory.
    const first = await vidaConversationFor('op@kind.test', 'c-1')
    const second = await vidaConversationFor('op@kind.test', 'c-1')
    expect(second).toEqual(first)
    expect(second).toHaveLength(1)
  })

  it('F5 🛑 BOTH KEYS ON EVERY READ — never client alone, never operator alone', async () => {
    const { vidaConversationFor } = await import('./vida-conversation')
    await vidaConversationFor('op@kind.test', 'c-1')
    const f = table.lastFilters[table.lastFilters.length - 1]
    expect(Object.keys(f).sort(), 'the read is not keyed on both columns').toEqual(['client_id', 'operator'])
    expect(f.operator).toBe('op@kind.test')
    expect(f.client_id).toBe('c-1')
  })

  it('F5 🛑 TWO OPERATORS × TWO CLIENTS — four threads, zero leakage', async () => {
    const { appendVidaConversation, vidaConversationFor } = await import('./vida-conversation')
    await appendVidaConversation('alice@kind.test', 'c-red', [turn('operator', 'alice on redmayne')])
    await appendVidaConversation('alice@kind.test', 'c-nor', [turn('operator', 'alice on northstar')])
    await appendVidaConversation('bob@kind.test',   'c-red', [turn('operator', 'bob on redmayne')])
    await appendVidaConversation('bob@kind.test',   'c-nor', [turn('operator', 'bob on northstar')])

    for (const [op, cid, expected] of [
      ['alice@kind.test', 'c-red', 'alice on redmayne'],
      ['alice@kind.test', 'c-nor', 'alice on northstar'],
      ['bob@kind.test',   'c-red', 'bob on redmayne'],
      ['bob@kind.test',   'c-nor', 'bob on northstar'],
    ] as const) {
      const got = await vidaConversationFor(op, cid)
      expect(got.map(t => t.text), `${op} on ${cid} sees the wrong thread`).toEqual([expected])
    }
    expect(table.rows).toHaveLength(4)
  })

  it('F5 a read that fails is empty, never another thread', async () => {
    const { appendVidaConversation, vidaConversationFor } = await import('./vida-conversation')
    await appendVidaConversation('op@kind.test', 'c-1', [turn('operator', 'held')])
    table.failNext = true
    const got = await vidaConversationFor('op@kind.test', 'c-1')
    // ⚠️ FAIL-SOFT TO EMPTY. An error must never fall through to an unfiltered row: Vida
    // answering from a thread that is not this operator's is worse than answering from none.
    expect(got).toEqual([])
  })

  it('F5 a failed write loses the memory, never the turn, and never duplicates', async () => {
    const { appendVidaConversation, vidaConversationFor } = await import('./vida-conversation')
    await appendVidaConversation('op@kind.test', 'c-1', [turn('operator', 'one')])
    table.failNext = true
    const bad = await appendVidaConversation('op@kind.test', 'c-1', [turn('operator', 'two')])
    expect(bad.ok, 'a failed write reported success').toBe(false)
    // The thread is unchanged, not half-written.
    expect((await vidaConversationFor('op@kind.test', 'c-1')).map(t => t.text)).toEqual(['one'])
    // And the operator says it again — one copy, not two.
    await appendVidaConversation('op@kind.test', 'c-1', [turn('operator', 'two')])
    expect((await vidaConversationFor('op@kind.test', 'c-1')).map(t => t.text)).toEqual(['one', 'two'])
  })

  it('F5 the thread is bounded, and the bound is the same on write and read', async () => {
    const { appendVidaConversation, vidaConversationFor, VIDA_MAX_TURNS } = await import('./vida-conversation')
    await appendVidaConversation('op@kind.test', 'c-1',
      Array.from({ length: VIDA_MAX_TURNS + 25 }, (_, i) => turn('operator', `t${i}`)))
    const got = await vidaConversationFor('op@kind.test', 'c-1')
    expect(got).toHaveLength(VIDA_MAX_TURNS)
    // ⚠️ THE TAIL, NOT THE HEAD — continuing a conversation needs the most recent turns.
    expect(got[got.length - 1].text).toBe(`t${VIDA_MAX_TURNS + 24}`)
  })

  it('F5 ⚠️ READ-MODIFY-WRITE IS THE ACCEPTED RACE, AND IT IS PINNED HERE', async () => {
    // 🛑 STATED, NOT HIDDEN. `appendVidaConversation` reads the thread, merges, and writes it
    // back. Two writes that interleave can lose the earlier one. That is acceptable HERE and
    // nowhere else: one operator is one person typing in one console, and the loss would be a
    // cosmetic gap in a transcript. The Brief — which is customer truth — is merged
    // server-side under its own rules and is untouched by this file.
    const src = (await import('fs')).readFileSync(
      (await import('path')).join(process.cwd(), 'apps/api/src/lib/vida-conversation.ts'), 'utf8')
    expect(src, 'the accepted race is no longer documented where somebody would read it')
      .toContain('READ-MODIFY-WRITE')
    // And the real consequence is bounded: a concurrent pair still leaves ONE of them stored,
    // never a corrupted row.
    const { appendVidaConversation, vidaConversationFor } = await import('./vida-conversation')
    await Promise.all([
      appendVidaConversation('op@kind.test', 'c-1', [turn('operator', 'A')]),
      appendVidaConversation('op@kind.test', 'c-1', [turn('operator', 'B')]),
    ])
    const got = await vidaConversationFor('op@kind.test', 'c-1')
    expect(got.length).toBeGreaterThanOrEqual(1)
    expect(got.every(t => t.role === 'operator' && typeof t.text === 'string')).toBe(true)
  })
})
