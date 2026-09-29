// ⚑ 29 Sep (R174 · PR 8a) — THE DEMO PRESS DOES NOT TIME OUT.
// ① The rebuild behind Accept · Pay and Approve does side by side what has no order between it,
//   and still keeps every foreign-key order (a fake database where every call takes time, and
//   logs when it started and finished).
// ② The three presses wait a minute, not 15 seconds.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Ev = { key: string; start: number; end: number }
const st = vi.hoisted(() => ({ log: [] as Ev[], clock: 0, open: 0, maxOpen: 0 }))

vi.mock('@kind/db', () => {
  const timed = (key: string, data: unknown) => ({
    then(r: (v: unknown) => unknown) {
      const ev = { key, start: st.clock++, end: -1 }
      st.log.push(ev); st.open++; st.maxOpen = Math.max(st.maxOpen, st.open)
      return new Promise(res => setTimeout(res, 5)).then(() => { ev.end = st.clock++; st.open--; return { data, error: null } }).then(r)
    },
  })
  return {
    db: {
      from: (table: string) => {
        let op = 'select'
        const q: Record<string, unknown> = {
          select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q,
          delete: () => { op = 'delete'; return q },
          update: () => { op = 'update'; return q },
          insert: () => { op = 'insert'; return q },
          maybeSingle: () => timed(`select:${table}`, table === 'clients' ? { id: 'old', is_demo: true } : null),
          then: (r: (v: unknown) => unknown) =>
            timed(`${op}:${table}`, table === 'figsy_campaigns' && op === 'select' ? [{ id: 'camp-old' }] : null).then(r),
        }
        return q
      },
    },
  }
})
vi.mock('./meeting-truth', () => ({
  clearDemoMeetings: async () => { const ev = { key: 'clear:meetings', start: st.clock++, end: -1 }; st.log.push(ev); await new Promise(r => setTimeout(r, 5)); ev.end = st.clock++ },
  writeDemoMeetings: async () => { const ev = { key: 'write:meetings', start: st.clock++, end: -1 }; st.log.push(ev); await new Promise(r => setTimeout(r, 5)); ev.end = st.clock++ },
}))
vi.mock('./preparation-snapshot', () => ({ buildPreparationSnapshot: async () => ({ ok: true, snapshot: {}, hash: 'h' }) }))

const ev = (key: string) => {
  const e = st.log.find(x => x.key === key)
  expect(e, `${key} never happened`).toBeTruthy()
  return e!
}
/** `later` only starts once `first` has finished. */
const after = (later: string, first: string) =>
  expect(ev(later).start, `${later} started before ${first} finished`).toBeGreaterThan(ev(first).end)

beforeEach(() => { st.log = []; st.clock = 0; st.open = 0; st.maxOpen = 0 })

describe('the rebuild keeps every foreign-key order', () => {
  it('clearing: meetings before replies, replies and sent emails before enrolments, the account last', async () => {
    const { setNorthwindStage } = await import('./demo-northwind')
    const r = await setNorthwindStage('Results', { userId: 'u1', meetings: 10 })
    expect(r.ok, JSON.stringify(r)).toBe(true)
    after('delete:figsy_replies', 'clear:meetings')
    after('delete:figsy_enrollments', 'delete:figsy_replies')
    after('delete:figsy_enrollments', 'delete:figsy_sent_emails')
    after('delete:vida_sessions', 'delete:vida_messages')
    after('delete:figsy_sequences', 'delete:figsy_enrollments')
    after('delete:figsy_campaigns', 'delete:figsy_sequences')
    const wipeEnd = ev('delete:clients').end
    for (const e of st.log.filter(x => x.key.startsWith('delete:') || x.key.startsWith('update:opt') || x.key.startsWith('update:unattributed')))
      if (e.key !== 'delete:clients' && e.key !== 'delete:onboarding_brief_drafts') expect(e.end, e.key).toBeLessThan(ev('delete:clients').start)
    expect(ev('insert:clients').start).toBeGreaterThan(wipeEnd)
  })

  it('writing: the account first, then each row only after the row it points at', async () => {
    const { setNorthwindStage } = await import('./demo-northwind')
    await setNorthwindStage('Results', { userId: 'u1', meetings: 10 })
    for (const t of ['milla_sessions', 'programmes', 'figsy_knowledge']) after(`insert:${t}`, 'insert:clients')
    after('insert:milla_messages', 'insert:milla_sessions')
    after('insert:icps', 'insert:programmes')
    after('insert:proof_pass_claims', 'insert:icps')
    after('insert:figsy_campaigns', 'insert:icps')
    after('insert:figsy_sequences', 'insert:figsy_campaigns')
    after('insert:leads', 'insert:figsy_sequences')
    after('insert:figsy_enrollments', 'insert:leads')
    after('insert:figsy_sent_emails', 'insert:figsy_enrollments')
    after('insert:figsy_replies', 'insert:figsy_enrollments')
    after('write:meetings', 'insert:figsy_replies')
  })
})

describe('…and does side by side what has no order between it', () => {
  it('independent steps overlap', async () => {
    const { setNorthwindStage } = await import('./demo-northwind')
    await setNorthwindStage('Results', { userId: 'u1', meetings: 10 })
    expect(st.maxOpen, 'every step still waits for the one before it').toBeGreaterThanOrEqual(3)
    const overlap = (a: string, b: string) => ev(a).start < ev(b).end && ev(b).start < ev(a).end
    expect(overlap('insert:milla_sessions', 'insert:programmes')).toBe(true)
    expect(overlap('insert:figsy_sent_emails', 'insert:figsy_replies')).toBe(true)
    expect(overlap('delete:vida_messages', 'clear:meetings')).toBe(true)
  })
})

describe('the presses wait a minute', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
  it('the constant is 60 seconds', () => {
    expect(read('apps/portal/src/lib/api.ts')).toContain('export const PRESS_TIMEOUT_MS = 60_000')
  })
  it('Accept · Pay, Pay and Approve all use it', () => {
    expect(read('apps/portal/src/components/milla/ProgrammeCalculator.tsx')).toMatch(/'\/my\/programme\/checkout\/first',[\s\S]{0,400}\}, tk, PRESS_TIMEOUT_MS\)/)
    expect(read('apps/portal/src/components/milla/ProgrammePayment.tsx')).toContain('session?.access_token, PRESS_TIMEOUT_MS,')
    expect(read('apps/portal/src/components/milla/ProgrammeApproval.tsx')).toContain("'/my/programme/approve', { version: data.frozen?.version ?? null }, session?.access_token, PRESS_TIMEOUT_MS)")
  })
})
