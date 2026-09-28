// R164 · the demo's meeting writes (in meeting-truth.ts, the one write layer) touch demo accounts only.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ isDemo: false as boolean | null, writes: [] as string[] }))

vi.mock('@kind/db', () => {
  const chain = (table: string, op: string | null = null): unknown => new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => void) => { if (op) h.writes.push(`${op}:${table}`); res({ data: null, error: null }) }
      if (prop === 'maybeSingle') return async () => ({ data: table === 'clients' ? { is_demo: h.isDemo } : null, error: null })
      if (prop === 'insert' || prop === 'delete' || prop === 'update') return () => chain(table, String(prop))
      return () => chain(table, op)
    },
  })
  return { db: { from: (t: string) => chain(t) } }
})

import { writeDemoMeetings, clearDemoMeetings } from './meeting-truth'

describe('R164 · demo meetings are written and cleared for demo accounts only', () => {
  beforeEach(() => { h.writes.length = 0 })

  it('a real client: both refuse, and nothing is written', async () => {
    h.isDemo = false
    await expect(writeDemoMeetings('c1', [{ client_id: 'c1' }])).rejects.toThrow(/demo account/)
    await expect(clearDemoMeetings('c1')).rejects.toThrow(/demo account/)
    h.isDemo = null
    await expect(clearDemoMeetings('c1')).rejects.toThrow(/demo account/)
    expect(h.writes).toEqual([])
  })

  it('a row for another client is refused before anything is read or written', async () => {
    h.isDemo = true
    await expect(writeDemoMeetings('c1', [{ client_id: 'c1' }, { client_id: 'someone-else' }])).rejects.toThrow(/belong/)
    expect(h.writes).toEqual([])
  })

  it('the demo account: written and cleared', async () => {
    h.isDemo = true
    await writeDemoMeetings('c1', [{ client_id: 'c1' }])
    await clearDemoMeetings('c1')
    expect(h.writes).toEqual(['insert:meetings', 'delete:meetings'])
  })
})
