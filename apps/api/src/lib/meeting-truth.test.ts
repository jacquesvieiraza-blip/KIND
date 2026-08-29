// ═══════════════════════════════════════════════════════════════════════════════════════
// MEETING TRUTH — the acceptance matrix for BUILD-003 item 2.
//
// Two kinds of proof here, and the split is deliberate:
//
//   · BEHAVIOURAL — meeting-truth.ts is exercised against a mocked database, so the rules
//     that live in TypeScript (state derivation, refusals, the counting definition, the
//     reschedule ordering) are proven by running them.
//
//   · STRUCTURAL — the rules that live in POSTGRES (CHECK constraints, the two unique
//     indexes, the erasure trigger, function hardening) are asserted against the canonical
//     migration text. ⚠️ This is stated plainly rather than dressed up: a constraint is only
//     truly proven by a database rejecting a row, and this suite has no Postgres. What these
//     assertions DO prove is that the constraint is declared, is spelled the way the design
//     requires, and cannot be silently deleted — which is the failure mode that actually
//     happens. The live walkthrough is what proves the database enforces them.
//
// Mocks only. No network, no database, no spend.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

const MIGRATION = readFileSync(
  join(__dirname, '../../../../supabase/migrations/20260829_meetings.sql'), 'utf8')
// Comments quote the very constraints under test — this repo has burned five times on a
// guard tripping over its own documentation, so the SQL is read without them.
const SQL = stripCommentsForEnvScan(MIGRATION)

// ═══════════════════════════════════════════════════════════════════════════════════════
// A · THE DATABASE BOUNDARY — declared, spelled correctly, and not deletable in silence
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('the four states and their confirmation rules are constraints, not conventions', () => {
  it('exactly four states exist, and no fifth can be written', () => {
    expect(SQL).toMatch(/CHECK \(state IN \('BOOKED', 'BOOKED_UNVERIFIED', 'HELD', 'NO_SHOW'\)\)/)
  })

  it('HELD REQUIRES EXPLICIT CONFIRMATION — it is never inferred from the clock', () => {
    expect(SQL).toContain('meetings_held_requires_confirmation')
    expect(SQL).toMatch(/CHECK \(state <> 'HELD' OR held_confirmed_at IS NOT NULL\)/)
  })

  it('NO_SHOW REQUIRES EXPLICIT CONFIRMATION — a passed time is not evidence of absence', () => {
    expect(SQL).toContain('meetings_no_show_requires_confirmation')
    expect(SQL).toMatch(/CHECK \(state <> 'NO_SHOW' OR no_show_confirmed_at IS NOT NULL\)/)
  })

  it('a meeting cannot be both held and a no-show', () => {
    expect(SQL).toMatch(/CHECK \(held_confirmed_at IS NULL OR no_show_confirmed_at IS NULL\)/)
  })

  it('a confirmation stamp cannot exist without its matching state', () => {
    expect(SQL).toMatch(/CHECK \(held_confirmed_at IS NULL OR state = 'HELD'\)/)
    expect(SQL).toMatch(/CHECK \(no_show_confirmed_at IS NULL OR state = 'NO_SHOW'\)/)
  })

  it('BOOKED REQUIRES VERIFICATION, and deliberately NOT the event id', () => {
    // Requiring google_event_id here would make erasure impossible without falsifying the
    // outcome — the erasure trigger clears the pointer and leaves the booking verified.
    expect(SQL).toMatch(/CHECK \(state <> 'BOOKED' OR verified_at IS NOT NULL\)/)
    expect(SQL).not.toMatch(/state <> 'BOOKED' OR[^)]*google_event_id IS NOT NULL/)
  })

  it('BOOKED_UNVERIFIED cannot carry proof it does not have', () => {
    expect(SQL).toMatch(/CHECK \(state <> 'BOOKED_UNVERIFIED' OR verified_at IS NULL\)/)
  })
})

describe('the erasure boundary — the pointer goes, the outcome stays', () => {
  it('a BEFORE DELETE trigger on public.leads detaches the meeting', () => {
    expect(SQL).toMatch(/BEFORE DELETE ON public\.leads/)
    expect(SQL).toContain('meetings_detach_erased_lead')
  })

  it('it clears lead_id AND google_event_id together', () => {
    expect(SQL).toMatch(/SET lead_id\s*=\s*NULL,\s*google_event_id\s*=\s*NULL/)
  })

  it('IT DOES NOT DEMOTE BOOKED, AND DOES NOT ERASE verified_at', () => {
    // That a booking WAS verified is historical outcome evidence. Erasing it would falsify
    // the record rather than protect the person — the person is protected by removing the
    // pointer, which is what the trigger actually does.
    const fn = SQL.slice(SQL.indexOf('meetings_detach_erased_lead'))
    const body = fn.slice(0, fn.indexOf('REVOKE'))
    expect(body).not.toContain('BOOKED_UNVERIFIED')
    expect(body).not.toMatch(/verified_at\s*=\s*NULL/)
  })

  it('NO ORPHAN EVENT POINTER — and it backstops the trigger, so a missing trigger fails the DELETE', () => {
    // lead_id is ON DELETE SET NULL. If the trigger is ever dropped, deleting a lead nulls
    // lead_id while leaving google_event_id — and this CHECK makes the DELETE itself fail
    // rather than quietly leaving a route back to an erased person.
    expect(SQL).toContain('meetings_no_orphan_event_pointer')
    expect(SQL).toMatch(/CHECK \(google_event_id IS NULL OR lead_id IS NOT NULL\)/)
    expect(SQL).toMatch(/lead_id\s+uuid REFERENCES public\.leads\(id\)\s+ON DELETE SET NULL/)
  })

  it('the client FK is RESTRICT — and it is the ONLY delete prohibition on this table', () => {
    expect(SQL).toMatch(/client_id\s+uuid NOT NULL REFERENCES public\.clients\(id\) ON DELETE RESTRICT/)
    // No second custom prohibition: an earlier draft added a BEFORE DELETE trigger on
    // meetings itself, which the accepted spec removed as redundant with the FK.
    expect(SQL).not.toMatch(/BEFORE DELETE ON public\.meetings/)
  })
})

describe('duplicate and concurrent bookings are refused by the database', () => {
  it('DUPLICATE google_event_id IS REJECTED, and NULLs do not collide', () => {
    expect(SQL).toMatch(/CREATE UNIQUE INDEX[^;]*meetings_google_event_id_key[^;]*WHERE google_event_id IS NOT NULL/s)
  })

  it('ONE LIVE BOOKING PER LEAD — concurrent bookings lose at COMMIT, not at a check', () => {
    // Two replies arriving at once would each read "no meeting yet" and each insert one.
    // A read-then-write check cannot stop that; a unique index can.
    const idx = SQL.slice(SQL.indexOf('meetings_one_live_booking_per_lead'))
    const stmt = idx.slice(0, idx.indexOf(';'))
    expect(stmt).toContain('lead_id')
    expect(stmt).toContain("state IN ('BOOKED', 'BOOKED_UNVERIFIED')")
    // Superseded and excluded rows sit OUTSIDE the index, so a reschedule and an excluded
    // duplicate can coexist with the live booking they relate to.
    expect(stmt).toContain('superseded_by IS NULL')
    expect(stmt).toContain('excluded_reason IS NULL')
  })
})

describe('the meeting functions are hardened the way the packet requires', () => {
  const fns = [...SQL.matchAll(/CREATE OR REPLACE FUNCTION (public\.\w+)/g)].map(m => m[1])

  it('finds functions to check (a passing sweep over zero functions proves nothing)', () => {
    expect(fns.length).toBeGreaterThan(0)
  })

  for (const fn of ['public.meetings_detach_erased_lead']) {
    it(`${fn} is SECURITY INVOKER with an empty search_path and no PUBLIC execute`, () => {
      const body = SQL.slice(SQL.indexOf(`CREATE OR REPLACE FUNCTION ${fn}`))
      const decl = body.slice(0, body.indexOf('$$;') + 3)
      expect(decl).toContain('SECURITY INVOKER')
      expect(decl).toContain("SET search_path = ''")
      // Fully qualified: an empty search_path means an unqualified name would not resolve.
      expect(decl).toContain('public.meetings')
      expect(SQL).toContain(`REVOKE ALL ON FUNCTION ${fn}() FROM PUBLIC`)
    })
  }

  it('meetings is RLS-enabled with ZERO browser policies — service-role only', () => {
    expect(SQL).toContain('ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY')
    expect(SQL).not.toMatch(/CREATE POLICY[^;]*ON public\.meetings/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// B · BEHAVIOURAL — meeting-truth.ts, run against a mocked database
// ═══════════════════════════════════════════════════════════════════════════════════════

type Rec = { inserted: Record<string, unknown>[]; updated: Record<string, unknown>[]; rows: Record<string, unknown>[] }

async function withDb(rec: Rec, opts: { insertError?: { code?: string; message: string } } = {}) {
  vi.resetModules()
  vi.doMock('@kind/db', () => {
    const make = (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'is', 'not', 'gte', 'in', 'order', 'limit']) q[m] = () => q
      q.maybeSingle = async () => ({ data: rec.rows[0] ?? null, error: null })
      q.single = async () => ({ data: rec.rows[0] ?? null, error: null })
      q.insert = (row: Record<string, unknown>) => {
        if (table === 'meetings') rec.inserted.push(row)
        return {
          select: () => ({
            single: async () => opts.insertError
              ? { data: null, error: opts.insertError }
              : { data: { id: 'm-new', ...row }, error: null },
            maybeSingle: async () => ({ data: { id: 'm-new', ...row }, error: null }),
          }),
        }
      }
      q.update = (patch: Record<string, unknown>) => {
        if (table === 'meetings' || table === 'figsy_campaigns') rec.updated.push({ table, ...patch })
        const chain: Record<string, unknown> = {}
        chain.eq = () => chain
        ;(chain as { select: unknown }).select = () => ({
          single: async () => ({ data: { id: 'm-1', ...rec.rows[0], ...patch }, error: null }),
          maybeSingle: async () => ({ data: { id: 'm-1', ...rec.rows[0], ...patch }, error: null }),
        })
        ;(chain as { then: unknown }).then = (r: (v: unknown) => void) => r({ error: null })
        return chain
      }
      q.then = (r: (v: unknown) => void) => r({ data: rec.rows, count: rec.rows.length, error: null })
      return q
    }
    return { db: { from: (t: string) => make(t) } }
  })
  return import('./meeting-truth')
}

describe('a booking may not claim a calendar entry it does not have', () => {
  let rec: Rec
  beforeEach(() => { rec = { inserted: [], updated: [], rows: [] } })
  afterEach(() => { vi.doUnmock('@kind/db'); vi.resetModules() })

  it('an event id means BOOKED and stamps verified_at', async () => {
    const m = await withDb(rec)
    const r = await m.recordBooking({ clientId: 'c1', leadId: 'l1', scheduledAt: '2026-09-10T10:00:00Z', googleEventId: 'ev-1' })
    expect(r.ok).toBe(true)
    expect(rec.inserted[0].state).toBe('BOOKED')
    expect(rec.inserted[0].verified_at).not.toBeNull()
    expect(rec.inserted[0].google_event_id).toBe('ev-1')
  })

  it('NO EVENT ID MEANS BOOKED_UNVERIFIED — the state is derived, never passed in', async () => {
    const m = await withDb(rec)
    const r = await m.recordBooking({ clientId: 'c1', leadId: 'l1', scheduledAt: '2026-09-10T10:00:00Z' })
    expect(r.ok).toBe(true)
    expect(rec.inserted[0].state).toBe('BOOKED_UNVERIFIED')
    expect(rec.inserted[0].verified_at).toBeNull()
  })

  it('A CONCURRENT BOOKING IS REFUSED AS already_booked, NOT AS AN ERROR', async () => {
    // The database's live-booking index picked a winner. Reporting the loser as a failure
    // would send an operator to "fix" a correctly-prevented double booking.
    const m = await withDb(rec, { insertError: { code: '23505', message: 'duplicate key' } })
    const r = await m.recordBooking({ clientId: 'c1', leadId: 'l1', scheduledAt: '2026-09-10T10:00:00Z' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.refused.reason).toBe('already_booked')
  })

  it('A STORAGE FAILURE FAILS LOUD — it never looks like "no meeting happened"', async () => {
    const m = await withDb(rec, { insertError: { message: 'relation "meetings" does not exist' } })
    const r = await m.recordBooking({ clientId: 'c1', leadId: 'l1', scheduledAt: '2026-09-10T10:00:00Z' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.refused.reason).toBe('storage_unreadable')
  })
})

describe('HELD and NO_SHOW are confirmed by somebody, never by the clock', () => {
  let rec: Rec
  beforeEach(() => { rec = { inserted: [], updated: [], rows: [] } })
  afterEach(() => { vi.doUnmock('@kind/db'); vi.resetModules() })

  it('confirmHeld stamps held_confirmed_at, records WHO, and leaves no_show NULL', async () => {
    rec.rows = [{ id: 'm-1', state: 'BOOKED' }]
    const m = await withDb(rec)
    const r = await m.confirmHeld('m-1', 'jacques.vieiraza@gmail.com')
    expect(r.ok).toBe(true)
    const patch = rec.updated.find(u => u.table === 'meetings')!
    expect(patch.state).toBe('HELD')
    expect(patch.held_confirmed_at).not.toBeNull()
    expect(patch.no_show_confirmed_at).toBeNull()
    expect(patch.confirmed_by).toBe('jacques.vieiraza@gmail.com')
  })

  it('confirmNoShow is the mirror image, and never sets the held stamp', async () => {
    rec.rows = [{ id: 'm-1', state: 'BOOKED' }]
    const m = await withDb(rec)
    await m.confirmNoShow('m-1', 'operator')
    const patch = rec.updated.find(u => u.table === 'meetings')!
    expect(patch.state).toBe('NO_SHOW')
    expect(patch.held_confirmed_at).toBeNull()
  })

  it('AN OUTCOME IS CONFIRMED ONCE — a settled meeting is not re-settled', async () => {
    rec.rows = [{ id: 'm-1', state: 'HELD' }]
    const m = await withDb(rec)
    const r = await m.confirmNoShow('m-1', 'operator')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.refused.reason).toBe('illegal_transition')
    expect(rec.updated).toHaveLength(0)
  })
})

describe('a reschedule counts ONCE, and the old meeting survives', () => {
  let rec: Rec
  beforeEach(() => { rec = { inserted: [], updated: [], rows: [] } })
  afterEach(() => { vi.doUnmock('@kind/db'); vi.resetModules() })

  it('THE OLD ROW IS SUPERSEDED BEFORE THE NEW ONE IS INSERTED', async () => {
    // Ordering is the design: the live-booking index allows only one non-superseded booking
    // per lead, so inserting first would be refused as a double booking. It also means a
    // crash between the writes leaves NO live booking — visible and fixable — rather than
    // TWO, which silently inflates the outcome count.
    rec.rows = [{ id: 'm-1', client_id: 'c1', lead_id: 'l1', state: 'BOOKED', superseded_by: null }]
    const m = await withDb(rec)
    const r = await m.rescheduleMeeting('m-1', '2026-09-20T10:00:00Z')
    expect(r.ok).toBe(true)
    expect(rec.updated.length).toBeGreaterThan(0)
    expect(rec.updated[0].superseded_by).toBeTruthy()
    expect(rec.inserted).toHaveLength(1)
    expect(rec.inserted[0].rescheduled_from).toBe('m-1')
  })

  it('a meeting already rescheduled is not rescheduled again', async () => {
    rec.rows = [{ id: 'm-1', state: 'BOOKED', superseded_by: 'm-2' }]
    const m = await withDb(rec)
    const r = await m.rescheduleMeeting('m-1', '2026-09-20T10:00:00Z')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.refused.reason).toBe('illegal_transition')
  })

  it('a HELD meeting is history and is not moved', async () => {
    rec.rows = [{ id: 'm-1', state: 'HELD', superseded_by: null }]
    const m = await withDb(rec)
    const r = await m.rescheduleMeeting('m-1', '2026-09-20T10:00:00Z')
    expect(r.ok).toBe(false)
  })
})

describe('exclusions remove a meeting from the count, never from the record', () => {
  let rec: Rec
  beforeEach(() => { rec = { inserted: [], updated: [], rows: [{ id: 'm-1' }] } })
  afterEach(() => { vi.doUnmock('@kind/db'); vi.resetModules() })

  for (const reason of ['duplicate', 'spam', 'outside_icp'] as const) {
    it(`${reason} is recorded with its timestamp, and the row is not deleted`, async () => {
      const m = await withDb(rec)
      const r = await m.excludeMeeting('m-1', reason, 'note')
      expect(r.ok).toBe(true)
      const patch = rec.updated.find(u => u.table === 'meetings')!
      expect(patch.excluded_reason).toBe(reason)
      expect(patch.excluded_at).toBeTruthy()
    })
  }
})

describe('THE COUNT HAS ONE DEFINITION, AND IT LIVES HERE', () => {
  let rec: Rec
  beforeEach(() => { rec = { inserted: [], updated: [], rows: [] } })
  afterEach(() => { vi.doUnmock('@kind/db'); vi.resetModules() })

  it('a NO_SHOW still counts as BOOKED — the boundary is MEETING_BOOKED, not MEETING_HELD', async () => {
    rec.rows = [{ state: 'BOOKED' }, { state: 'HELD' }, { state: 'NO_SHOW' }, { state: 'BOOKED_UNVERIFIED' }]
    const m = await withDb(rec)
    const counts = await m.meetingCounts({ clientId: 'c1' })
    expect(counts).not.toBeNull()
    expect(counts!.booked).toBe(4)
    expect(counts!.held).toBe(1)
    expect(counts!.noShow).toBe(1)
    expect(counts!.unverified).toBe(1)
  })

  it('the query itself excludes excluded and superseded rows', async () => {
    // Asserted at the source, because the filter is what makes the number correct: a caller
    // re-deriving it is the six-call-site defect this module exists to end.
    const src = readFileSync(join(__dirname, 'meeting-truth.ts'), 'utf8')
    const fn = src.slice(src.indexOf('export async function meetingCounts'))
    expect(fn).toContain(".is('excluded_reason', null)")
    expect(fn).toContain(".is('superseded_by', null)")
  })

  it('AN UNREADABLE MEETINGS TABLE RETURNS null, NEVER ZERO', async () => {
    // "We could not read the table" and "there were no meetings" are opposite facts. This is
    // the `.data ?? []` shape this repo keeps rediscovering, pointed at the outcome number.
    vi.resetModules()
    vi.doMock('@kind/db', () => ({ db: { from: () => {
      const q: Record<string, unknown> = {}
      for (const k of ['select', 'eq', 'is', 'not', 'gte']) q[k] = () => q
      q.then = (r: (v: unknown) => void) => r({ data: null, error: { message: 'permission denied' } })
      return q
    } } }))
    const m = await import('./meeting-truth')
    expect(await m.meetingCounts({ clientId: 'c1' })).toBeNull()
    vi.doUnmock('@kind/db')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// C · CONFINEMENT — meeting writes exist in exactly one module
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('every write to public.meetings goes through meeting-truth.ts', () => {
  const API = join(__dirname, '..')

  function meetingWriters(dir: string): string[] {
    const { readdirSync, statSync } = require('fs') as typeof import('fs')
    const out: string[] = []
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f)
        if (statSync(p).isDirectory()) { walk(p); continue }
        if (!f.endsWith('.ts') || f.endsWith('.test.ts')) continue
        if (p.endsWith('meeting-truth.ts')) continue
        const src = stripCommentsForEnvScan(readFileSync(p, 'utf8'))
        // A write is insert/update/upsert/delete chained off .from('meetings').
        if (/\.from\('meetings'\)\s*\n?\s*\.(insert|update|upsert|delete)/.test(src)) {
          out.push(p.slice(API.length + 1))
        }
      }
    }
    walk(dir)
    return out
  }

  it('the checker catches the exact shape it forbids (it is not vacuous)', () => {
    // RED proof for the guard itself: without this, a checker that matched nothing would
    // pass forever and prove only that it was never written correctly.
    const bad = "await db.from('meetings')\n  .update({ state: 'HELD' })"
    expect(/\.from\('meetings'\)\s*\n?\s*\.(insert|update|upsert|delete)/.test(bad)).toBe(true)
  })

  it('NO MODULE OUTSIDE meeting-truth.ts WRITES public.meetings', () => {
    const writers = meetingWriters(API)
    expect(writers, `these modules write meetings directly, bypassing the one write layer: ${writers.join(', ')}`).toEqual([])
  })
})

describe('the derived cache is derived, and the read-modify-write is gone', () => {
  const figsy = stripCommentsForEnvScan(readFileSync(join(__dirname, 'figsy.ts'), 'utf8'))
  const calendar = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/calendar.ts'), 'utf8'))

  it('NOTHING INCREMENTS meetings_booked ANY MORE', () => {
    // The old path did `select meetings_booked` → `update meetings_booked = value + 1`,
    // a lost update the moment two bookings landed together: both read N, both wrote N+1,
    // and one real meeting vanished from the cache with nothing to reconcile it against.
    for (const [name, src] of [['figsy.ts', figsy], ['calendar.ts', calendar]] as const) {
      expect(src, `${name} still increments meetings_booked`).not.toMatch(/meetings_booked:\s*\(?[^)]*\)?\s*\+\s*1/)
    }
  })

  it('meetings_booked is NOT ratcheted — an exclusion must be able to bring it down', () => {
    // Every other counter takes max(computed, current) so a partial recount cannot lose
    // data. Applying that to meetings would make the number one-way, silently disabling
    // exclusions entirely.
    expect(figsy).not.toMatch(/meetings_booked:\s*mx\(/)
    expect(figsy).toMatch(/meetings_booked:\s*derivedMeetings/)
  })

  it('the campaign count comes from public.meetings, not from replies', () => {
    expect(figsy).toContain('campaignMeetingCount')
    const fn = figsy.slice(figsy.indexOf('export async function recomputeCampaignCounters'))
    const body = fn.slice(0, fn.indexOf('\n}'))
    expect(body).not.toMatch(/if \(r\.meeting_booked_at\) meetings\+\+/)
  })

  it('meeting_booked_at IS RETAINED AS HISTORY — still stamped, never read for truth', () => {
    // The founder's model keeps the historical stamp. Deleting it to make a point would
    // destroy a real fact about a reply; what changed is that nothing COUNTS from it.
    expect(calendar).toMatch(/meeting_booked_at:\s*new Date\(\)\.toISOString\(\)/)
  })
})

describe('a calendar failure records the booking instead of losing it', () => {
  const calendar = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/calendar.ts'), 'utf8'))

  it('the Google-failure branch records the booking rather than dropping it', () => {
    const branch = calendar.slice(calendar.indexOf('createMeeting failed after retries'))
    const upTo = branch.slice(0, branch.indexOf('const { error: insertErr }'))
    // Routed through the one helper — see the "no event id, no claimed verification" test
    // below, which is where that guarantee is actually asserted.
    expect(upTo).toContain('recordUnverifiedBooking')
  })

  // ⛓️ THE ASSERTION THAT STOOD HERE ASSERTED THE OPPOSITE, and it was wrong.
  //
  // It proved that a Google AUTH error did NOT reach the fallback, on my reasoning that a
  // disconnected calendar is a configuration problem rather than a transient one. The
  // founder's ruling is that the distinction I drew was drawn in the wrong place:
  //
  //   K.I.N.D APPLICATION auth/authorisation → fail closed, no booking, no meeting
  //   GOOGLE calendar auth / connection      → never make the prospect disappear
  //
  // A green test asserting the wrong rule is worse than no test, because it defends the
  // mistake. It is replaced, not amended.

  it('EVERY GOOGLE-SIDE FAILURE RECORDS THE BOOKING — NOTHING RETURNS BEFORE THE FALLBACK', () => {
    // ⚠️ THIS ASSERTION WAS REWRITTEN AFTER ITS OWN RED PROOF EXPOSED IT AS VACUOUS.
    // The first version checked that the three cause strings appeared in the file and that
    // the helper was called. Reverting the code to the WRONG rule — an early
    // `if (isGoogleAuthError(err)) return { status: 400 }` at the top of the catch — left
    // every one of those facts true, so the guard passed while defending the bug it exists
    // to stop. Presence proves nothing about ORDER; this checks the order.
    const catchStart = calendar.indexOf('} catch (err) {', calendar.indexOf('async function performBooking'))
    const body = calendar.slice(catchStart, calendar.indexOf('recordUnverifiedBooking', catchStart))
    expect(catchStart).toBeGreaterThan(-1)
    expect(body, 'a Google-side failure must not return before the booking is recorded — that is how the prospect disappears')
      .not.toMatch(/\breturn\b/)
    // And all three causes route through the one helper, so none grows its own policy.
    for (const cause of ['calendar_not_connected', 'google_auth_failed', 'google_unavailable']) {
      expect(calendar, `${cause} must reach the unverified-booking path`).toContain(cause)
    }
  })

  it('A GOOGLE AUTH FAILURE STILL SURFACES RECONNECTION — recorded AND reported', () => {
    // Recording the booking must not swallow the configuration problem: the client still
    // has to reconnect, and markDisconnected is what makes status/slots say so.
    const branch = calendar.slice(calendar.indexOf('createMeeting failed after retries') - 900)
    const upToFallback = branch.slice(0, branch.indexOf('recordUnverifiedBooking'))
    expect(upToFallback).toContain('markDisconnected')
    expect(calendar).toMatch(/Google Calendar is not connected — reconnect it/)
  })

  it('A DISCONNECTED CALENDAR NO LONGER RETURNS 400 AND RECORDS NOTHING', () => {
    // The old pre-check rejected outright, before the lead was even loaded, so an accepted
    // booking vanished with no trace. The check is not skipped — it is deferred past the
    // lead and duplicate checks so the refusal can record what actually happened.
    expect(calendar).toContain('const calendarConnected =')
    const guard = calendar.slice(calendar.indexOf('if (!calendarConnected)'))
    expect(guard.slice(0, 300)).toContain('recordUnverifiedBooking')
  })

  it('K.I.N.D APPLICATION AUTH FAILS CLOSED — an unauthenticated caller cannot reach the booking core', () => {
    // The strongest form of "fails closed": the path does not exist for them. `requireAuth`
    // gates the authed route and a signed token gates the public one, both BEFORE
    // performBooking, so no unauthenticated request can create a fallback meeting.
    expect(calendar).toMatch(/calendarRouter\.post\('\/book',[^)]*requireAuth/s)
    expect(calendar).toContain('verifyBookingToken')
    // And performBooking itself never authenticates a caller — it is only ever reached by
    // one that already has been.
    const core = calendar.slice(calendar.indexOf('async function performBooking'))
    expect(core.slice(0, core.indexOf('recordUnverifiedBooking'))).not.toContain('requireAuth')
  })

  it('NO FALLBACK EVER INVENTS AN EVENT ID OR CLAIMS VERIFICATION', () => {
    const helper = calendar.slice(calendar.indexOf('async function recordUnverifiedBooking'))
    const body = helper.slice(0, helper.indexOf('\n}'))
    expect(body).toMatch(/googleEventId:\s*null/)
    expect(body).not.toMatch(/verified_at/)
    expect(body).not.toMatch(/state:\s*'BOOKED'/)
  })
})
