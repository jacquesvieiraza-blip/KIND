// 7e·1 (#2547) — A LIVE PROGRAMME WHOSE SENDS ARE REFUSED IS REPORTED ONCE, NOT LOGGED FOREVER.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const open = new Set<string>()
let tableMissing = false
const tasks: string[] = []
const emails: string[] = []

vi.mock('./operator-tasks', () => ({
  raiseOperatorTask: async (t: { dedupeKey: string }) => {
    if (tableMissing) return { ok: false, tableMissing: true }
    if (open.has(t.dedupeKey)) return { ok: true, alreadyOpen: true }
    open.add(t.dedupeKey); tasks.push(t.dedupeKey); return { ok: true, taskId: 't1' }
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: async (_k: string, subject: string) => { emails.push(subject); return { delivered: true } } }))

import { reportSendRefusal, sendRefusalTask } from './send-refusal-alert'

beforeEach(() => { open.clear(); tasks.length = 0; emails.length = 0; tableMissing = false })

describe('7e·1 — once per programme', () => {
  it('the first refusal raises a task and emails; the next hundred file nothing', async () => {
    expect(await reportSendRefusal('sender_unsafe', 'p1', 'c1', 'Two boxes tie.')).toBe('raised')
    for (let i = 0; i < 100; i++) await reportSendRefusal('sender_unsafe', 'p1', 'c1', 'Two boxes tie.')
    expect(tasks).toEqual(['send_refused:sender_unsafe:p1'])
    expect(emails).toHaveLength(1)
  })
  it('a different programme, or a different reason, is its own report', async () => {
    await reportSendRefusal('sender_unsafe', 'p1', 'c1', 'x')
    await reportSendRefusal('sender_unsafe', 'p2', 'c2', 'x')
    await reportSendRefusal('preparation_changed', 'p1', 'c1', 'x')
    expect(tasks).toHaveLength(3)
  })
  it('no task table → one email per programme per process, never one per send', async () => {
    tableMissing = true
    await reportSendRefusal('preparation_changed', 'p9', 'c9', 'x')
    await reportSendRefusal('preparation_changed', 'p9', 'c9', 'x')
    expect(emails).toHaveLength(1)
  })
  it('the words say what stopped and what fixes it', () => {
    const t = sendRefusalTask('preparation_changed', 'p1', 'c1', 'The subject of step 2 changed.')
    expect(t.title).toMatch(/no longer what the client approved/)
    expect(t.lines.join('\n')).toMatch(/Every send for this client is refused/)
  })
  it('the one send gate reports both refusals', () => {
    const gate = readFileSync(join(__dirname, 'programme-authority.ts'), 'utf8')
    expect(gate).toContain("m.reportSendRefusal('sender_unsafe', programme.id, programme.client_id, senderSafe.detail)")
    expect(gate).toContain("m.reportSendRefusal('preparation_changed', programme.id, programme.client_id, drift.detail)")
  })
})
