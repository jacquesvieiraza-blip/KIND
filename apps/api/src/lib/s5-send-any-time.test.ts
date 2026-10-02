// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R185 ① ② · card #2545 · S5) — PROGRAMMES SEND AT ANY TIME, IN ANY ZONE, ON UK
// WEEKDAYS, SPREAD THROUGH THE DAY, AND NO CLIENT STARVES ANOTHER.
//
// The founder: *"we need to send no matter the time of day or zone. when the campaign is hit
// go. we go. simple. we dont align in time zones."* · *"Q3 Yes spread. Q4 Yes. Only on
// weekdays."*
//
// What was wrong (House, 30 Sep – 2 Oct): the recipient-local 08:30–17:00 window needed all
// seven US zones open for a lead with no state, so one 2-hourly run a day could send; a South
// African lead could never send at all; each run spent the day's whole allowance in one burst;
// the due read took the oldest rows across every client, so one client's backlog could starve
// another. (The scheduler giving up after five minutes is the second half of this card, in its
// own change.)
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── the fake database: it APPLIES the filters, the order and the limit, so a read that takes
// "the oldest N across every client" really does starve the client whose rows are newer.
type Row = Record<string, unknown>
const db = {
  sentToday: 0,
  campaigns: [] as Row[],
  enrollments: [] as Row[],
  inboxes: [] as Row[],
  /** mailbox id → emails it has already sent today */
  mailboxSent: new Map<string, number>(),
}

vi.mock('@kind/db', () => ({
  db: {
    rpc: async () => ({ data: null, error: null }),
    from: (table: string) => {
      const filters: ((r: Row) => boolean)[] = []
      let head = false
      let limit = Infinity
      let orderBy: string | null = null
      const q: Record<string, unknown> = {
        select(_c?: unknown, opts?: { head?: boolean }) { head = opts?.head === true; return q },
        eq(col: string, v: unknown) { filters.push(r => r[col] === v); return q },
        in(col: string, vs: unknown[]) { filters.push(r => vs.includes(r[col])); return q },
        not() { return q }, is() { return q }, gte() { return q },
        lte(col: string, v: unknown) { filters.push(r => String(r[col]) <= String(v)); return q },
        order(col: string) { orderBy = col; return q },
        limit(n: number) { limit = n; return q },
        insert() { return q }, update() { return q },
        async maybeSingle() { return { data: null, error: null } },
        async single() { return { data: null, error: null } },
        then(res: (v: unknown) => unknown) {
          if (table === 'figsy_sent_emails' && head) return res({ data: null, count: db.sentToday, error: null })
          if (table === 'figsy_sent_emails') return res({ data: [], error: null })
          const source = table === 'figsy_campaigns' ? db.campaigns
            : table === 'figsy_enrollments' ? db.enrollments
            : table === 'client_inboxes' ? db.inboxes : []
          let rows = source.filter(r => filters.every(f => f(r)))
          if (orderBy) rows = [...rows].sort((a, b) => String(a[orderBy!]).localeCompare(String(b[orderBy!])))
          return res({ data: rows.slice(0, limit), count: rows.length, error: null })
        },
      }
      return q
    },
  },
}))

const sends: { enrollmentId: string; inbox: string }[] = []
vi.mock('./figsy', () => ({
  sendSequenceEmail: async (enrollmentId: string, _l: unknown, _s: number, _sub: string, _b: string, _c: string, o: { inbox: { email: string } }) => {
    sends.push({ enrollmentId, inbox: o.inbox.email }); return 'sent'
  },
  sendSequenceEmailOperatorRun: async (enrollmentId: string, _l: unknown, _s: number, _sub: string, _b: string, _c: string, o: { inbox: { email: string } }) => {
    sends.push({ enrollmentId, inbox: o.inbox.email }); return 'sent'
  },
  applyReplyBranching: async () => 'send',
  enrollmentStep: () => ({ subject: 'Hello', body: 'Body', total: 3, wait_days: 3 }),
}))
vi.mock('./commercial-model', () => ({
  clientCommercialModel: async (cid: string) => ({
    model: 'programme', openProgramme: { id: `prog-${cid}`, run_at: '2026-09-30T12:00:00Z' },
  }),
}))
vi.mock('./inbox-secret', () => ({ secretState: () => ({ ok: true }) }))
vi.mock('./sending-inbox', async () => {
  const actual = await vi.importActual<typeof import('./sending-inbox')>('./sending-inbox')
  return { ...actual, sendablePool: (rows: unknown[]) => ({ ok: true, boxes: rows }) }
})
vi.mock('./mailbox-daily-cap', async () => {
  const actual = await vi.importActual<typeof import('./mailbox-daily-cap')>('./mailbox-daily-cap')
  return {
    ...actual,
    seedRotationFromToday: async (slots: { id: string; dailyCap: number | null }[]) =>
      slots.map(s => ({ ...s, dailyCap: actual.mailboxDailyCap(s.dailyCap), sentThisBatch: db.mailboxSent.get(s.id) ?? 0 })),
  }
})
vi.mock('./alerts', () => ({ sendFounderAlert: async () => ({ delivered: true }) }))

function client(cid: string, opts: { due: number; firstDueAt?: string; mailboxCap?: number }) {
  db.campaigns.push({ id: `camp-${cid}`, client_id: cid, status: 'active', settings: {} })
  db.inboxes.push({ id: `box-${cid}`, client_id: cid, email: `send@${cid}.example`, status: 'active', daily_cap: opts.mailboxCap ?? 50 })
  for (let i = 0; i < opts.due; i++) {
    const at = new Date(Date.parse(opts.firstDueAt ?? '2026-09-30T00:00:00Z') + i * 60_000).toISOString()
    db.enrollments.push({
      id: `${cid}-e${i}`, client_id: cid, programme_id: `prog-${cid}`, campaign_id: `camp-${cid}`,
      status: 'enrolled', current_step: 0, next_send_at: at,
      leads: { id: `${cid}-l${i}`, client_id: cid, email: `p${i}@${cid}-prospect.example` },
    })
  }
}

const runAutomatic = async () => (await import('./send-due')).runSendDue({ mode: 'automatic' })

beforeEach(() => {
  db.sentToday = 0; db.campaigns = []; db.enrollments = []; db.inboxes = []; db.mailboxSent = new Map()
  sends.length = 0
  process.env.FIGSY_DAILY_SEND_LIMIT = '1000'
})
afterEach(() => { vi.useRealTimers(); delete process.env.FIGSY_DAILY_SEND_LIMIT })

const at = (iso: string) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(iso)) }

// ── ① ANY TIME, ANY ZONE, UK WEEKDAYS ────────────────────────────────────────────────────
describe('① a programme email may leave at any hour, for any country, Monday to Friday (UK days)', () => {
  const SCHEDULE = { days: [1, 2, 3, 4, 5], start: '08:30', end: '17:00', default_tz: 'Europe/London' }

  it('🛑 a US lead with no state sends at 03:00 UTC on a Wednesday (the old window refused it)', async () => {
    const { maySendNow } = await import('./send-schedule')
    expect(maySendNow(SCHEDULE, new Date('2026-10-07T03:00:00Z'), { country: 'United States' }).allowed).toBe(true)
  })

  it('🛑 a South African lead sends (the old window had no zone for South Africa, so it never could)', async () => {
    const { maySendNow } = await import('./send-schedule')
    expect(maySendNow(SCHEDULE, new Date('2026-10-07T10:00:00Z'), { country: 'South Africa' }).allowed).toBe(true)
  })

  it('a UK lead sends at 22:30 on a weekday, and a lead with no country at all sends too', async () => {
    const { maySendNow } = await import('./send-schedule')
    expect(maySendNow(SCHEDULE, new Date('2026-10-07T22:30:00Z'), { country: 'United Kingdom' }).allowed).toBe(true)
    expect(maySendNow(SCHEDULE, new Date('2026-10-07T22:30:00Z'), null).allowed).toBe(true)
  })

  it('🛑 Saturday and Sunday send nothing, whatever the hour or the country', async () => {
    const { maySendNow } = await import('./send-schedule')
    for (const iso of ['2026-10-03T12:00:00Z', '2026-10-04T09:00:00Z']) {
      const v = maySendNow(SCHEDULE, new Date(iso), { country: 'United Kingdom' })
      expect(v.allowed, iso).toBe(false)
      if (!v.allowed) expect(v.reason).toBe('wrong_day')
    }
  })

  it('the day is the UK day: Friday 23:30 UTC in summer is Saturday in London (no send); Sunday 23:30 UTC is Monday (send)', async () => {
    const { maySendNow, isUkSendingDay } = await import('./send-schedule')
    expect(maySendNow(SCHEDULE, new Date('2026-10-02T23:30:00Z'), { country: 'United States' }).allowed).toBe(false)
    expect(maySendNow(SCHEDULE, new Date('2026-10-04T23:30:00Z'), { country: 'United States' }).allowed).toBe(true)
    // In winter London is on UTC, so Friday 23:30 UTC is still Friday.
    expect(isUkSendingDay(new Date('2026-12-04T23:30:00Z'))).toBe(true)
    expect(isUkSendingDay(new Date('2026-12-06T23:30:00Z'))).toBe(false)
  })

  it('the stored hours and days no longer narrow it — the approval record is left exactly as it was', async () => {
    const { maySendNow } = await import('./send-schedule')
    const narrow = { days: [2, 3, 4], start: '08:30', end: '17:00', default_tz: 'Europe/London' }
    // Monday 20:00 UTC: outside the old days AND the old hours — but a UK weekday.
    expect(maySendNow(narrow, new Date('2026-10-05T20:00:00Z'), { country: 'United States' }).allowed).toBe(true)
  })
})

// ── ② SPREAD THROUGH THE DAY ─────────────────────────────────────────────────────────────
describe('② each run sends its share of the day, never the whole day in one burst', () => {
  it('runs left today: 12 at midnight, 11 at 02:00, 6 at 13:00, 1 at 22:00 and after', async () => {
    const { runsLeftToday, SEND_RUN_EVERY_HOURS } = await import('./send-due')
    expect(SEND_RUN_EVERY_HOURS).toBe(2)
    expect(runsLeftToday(new Date('2026-10-07T00:00:30Z'))).toBe(12)
    expect(runsLeftToday(new Date('2026-10-07T01:15:00Z'))).toBe(12)
    expect(runsLeftToday(new Date('2026-10-07T02:00:05Z'))).toBe(11)
    expect(runsLeftToday(new Date('2026-10-07T13:00:00Z'))).toBe(6)
    expect(runsLeftToday(new Date('2026-10-07T22:00:00Z'))).toBe(1)
    expect(runsLeftToday(new Date('2026-10-07T23:59:00Z'))).toBe(1)
  })

  it('a mailbox share is what is left of its day divided by the runs left, rounded up — never past its limit', async () => {
    const { spreadForThisRun } = await import('./send-due')
    const one = (dailyCap: number, sentThisBatch: number, runsLeft: number) =>
      spreadForThisRun([{ id: 'b', dailyCap, sentThisBatch }], runsLeft)[0].dailyCap
    expect(one(50, 0, 12)).toBe(5)     // 50 a day over 12 runs → 5 this run
    expect(one(50, 45, 1)).toBe(50)    // the last run may finish the day
    expect(one(30, 30, 6)).toBe(30)    // already at its limit → nothing more
    expect(one(30, 0, 12)).toBe(3)
  })

  it('🛑 a run at midnight sends 3 from a 30-a-day mailbox, not 30, even with 40 people due', async () => {
    at('2026-10-07T00:00:10Z')
    client('c1', { due: 40, mailboxCap: 30 })
    const r = await runAutomatic()
    expect(r.sent).toBe(3)
    expect(sends).toHaveLength(3)
  })

  it('🛑 the shared daily limit is spread too: 20 a day sends 2 at midnight, not 20', async () => {
    at('2026-10-07T00:00:10Z')
    process.env.FIGSY_DAILY_SEND_LIMIT = '20'
    client('c1', { due: 40, mailboxCap: 50 })
    const r = await runAutomatic()
    expect(r.sent).toBe(2)
  })

  it('the last run of the day may send what is left', async () => {
    at('2026-10-07T22:00:10Z')
    client('c1', { due: 40, mailboxCap: 30 })
    db.mailboxSent.set('box-c1', 25)
    db.sentToday = 25
    const r = await runAutomatic()
    expect(r.sent).toBe(5)
  })

  it('a run the founder presses with an explicit number is not spread — the number is the decision', async () => {
    at('2026-10-07T00:00:10Z')
    client('c1', { due: 40, mailboxCap: 30 })
    const { runSendDue } = await import('./send-due')
    const r = await runSendDue({ mode: 'operator_run', clientId: 'c1', maxSends: 10 })
    expect(r.sent).toBe(10)
  })
})

// ── FAIRNESS ─────────────────────────────────────────────────────────────────────────────
describe('one client’s backlog never starves another', () => {
  it('🛑 a client with one person due is served even when another has a long, older backlog', async () => {
    at('2026-10-07T00:00:10Z')
    process.env.FIGSY_DAILY_SEND_LIMIT = '24'          // 2 this run → the old read took the 10 oldest
    client('big', { due: 30, firstDueAt: '2026-09-01T00:00:00Z' })
    client('small', { due: 1, firstDueAt: '2026-10-06T00:00:00Z' })
    const r = await runAutomatic()
    expect(r.sent).toBe(2)
    expect(sends.map(s => s.enrollmentId)).toContain('small-e0')
    expect(sends.map(s => s.enrollmentId)).toContain('big-e0')
  })
})

// ── WEEKENDS ─────────────────────────────────────────────────────────────────────────────
describe('weekends', () => {
  it('🛑 on a Saturday a run attempts no programme email at all (nothing is sent and nothing is refused one by one)', async () => {
    at('2026-10-03T12:00:10Z')
    client('c1', { due: 5 })
    const r = await runAutomatic()
    expect(r.attempted).toBe(0)
    expect(r.sent).toBe(0)
    expect(r.window_skips).toBe(5)
    expect(sends).toHaveLength(0)
  })
})

// ── THE SPREAD MATHS MATCHES THE REAL TIMETABLE ──────────────────────────────────────────
describe('the share of the day is worked out from the real run timetable', () => {
  it('🛑 the send run is scheduled every SEND_RUN_EVERY_HOURS hours — change one, the other must follow', async () => {
    const { SEND_RUN_EVERY_HOURS } = await import('./send-due')
    const src = readFileSync(join(__dirname, '..', 'cron.ts'), 'utf8')
    expect(src).toContain(`cron.schedule('0 */${SEND_RUN_EVERY_HOURS} * * *', () => callInternal('/figsy/send-due-all')`)
  })
})

// ── MILLA'S APPROVAL WORDING ─────────────────────────────────────────────────────────────
describe('Milla tells the client the truth about when emails go', () => {
  const src = readFileSync(join(__dirname, '..', '..', '..', 'portal', 'src', 'components', 'milla', 'ProgrammeApproval.tsx'), 'utf8')

  it('🛑 it says "Weekdays, spread through the day" and no longer promises the recipient’s own time', () => {
    expect(src).toContain('Weekdays, spread through the day')
    expect(src).not.toMatch(/recipient[’']s own time/)
  })
})
