// ⚑ 30 Sep (#2473) — EACH US PROSPECT IS EMAILED IN THEIR OWN TIME ZONE.
// House's 234 US prospects had no state on file, so every send waited for 08:30–17:00 to be open
// from Honolulu to New York at once (18:30–21:00 UTC) and the morning's runs deferred all 100 they
// tried. Apollo's reveal returns the state; these guards hold that it is kept, read and used — and
// that a prospect WITHOUT a state keeps exactly the old, safe whole-country window.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const dbState: { error: unknown; data: unknown; throws: boolean; updates: unknown[] } =
  { error: null, data: null, throws: false, updates: [] }
vi.mock('@kind/db', () => {
  const chain = () => {
    const q: Record<string, unknown> = {}
    q.update = (v: unknown) => { if (dbState.throws) throw new Error('boom'); dbState.updates.push(v); return q }
    q.select = () => { if (dbState.throws) throw new Error('boom'); return q }
    q.eq = () => q
    q.maybeSingle = async () => ({ data: dbState.data, error: dbState.error })
    q.then = (res: (v: unknown) => unknown) => res({ error: dbState.error })
    return q
  }
  return { db: { from: () => chain() } }
})

import { maySendNow, resolveRecipientZones } from './send-schedule'
import { windowRegionFor, isUsCountry, saveLeadState, readLeadState } from './lead-state'

const SCHEDULE = { start: '08:30', end: '17:00', days: [1, 2, 3, 4, 5], default_tz: 'Europe/London' }
const WED = '2026-09-30'   // a Wednesday, US daylight time (New York UTC-4)
const at = (hhmm: string) => new Date(`${WED}T${hhmm}:00Z`)
const house = (state: string | null) =>
  ({ country: 'United States', region: windowRegionFor('United States', state) })

describe('#2473 — a New York prospect is judged on New York time', () => {
  it('12:30 UTC (08:30 in New York): WITH a state it sends; WITHOUT one it still waits', () => {
    expect(maySendNow(SCHEDULE, at('12:30'), house('New York')).allowed).toBe(true)
    expect(maySendNow(SCHEDULE, at('12:30'), house(null)).allowed).toBe(false)
  })

  it('10:00 UTC — the run that deferred all 100 on 30 Sep — is 06:00 in New York: still no', () => {
    expect(maySendNow(SCHEDULE, at('10:00'), house('New York')).allowed).toBe(false)
  })

  it('a prospect with NO state keeps the old whole-country window: 18:30–21:00 UTC only', () => {
    expect(maySendNow(SCHEDULE, at('18:00'), house(null)).allowed).toBe(false)
    expect(maySendNow(SCHEDULE, at('19:00'), house(null)).allowed).toBe(true)
    expect(maySendNow(SCHEDULE, at('21:00'), house(null)).allowed).toBe(false)
  })

  it('a California prospect opens at 15:30 UTC (08:30 Pacific), not at 18:30', () => {
    expect(maySendNow(SCHEDULE, at('15:30'), house('California')).allowed).toBe(true)
    expect(maySendNow(SCHEDULE, at('15:29'), house('California')).allowed).toBe(false)
  })
})

describe('#2473 — every US state and DC resolves to one zone', () => {
  const STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia',
  ]
  const ABBR = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
    'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
    'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI',
    'WY', 'DC']

  it('all 50 states + DC, by name and by abbreviation', () => {
    expect(STATES).toHaveLength(51)
    expect(ABBR).toHaveLength(51)
    for (const s of [...STATES, ...ABBR]) {
      const r = resolveRecipientZones({ region: s, country: 'United States' })
      expect(r.ok && r.precision === 'region' && r.zones.length === 1, s).toBe(true)
    }
  })
})

describe('#2473 — the state is only ever used for a US prospect', () => {
  it('US spellings count; others do not', () => {
    for (const c of ['United States', 'united states of america', 'USA', 'us']) expect(isUsCountry(c), c).toBe(true)
    for (const c of ['Australia', 'United Kingdom', '', null, undefined]) expect(isUsCountry(c as string), String(c)).toBe(false)
  })

  it('"WA" in Australia is NOT Washington state', () => {
    expect(windowRegionFor('Australia', 'WA')).toBeNull()
    expect(windowRegionFor('United States', 'WA')).toBe('WA')
  })

  it('a blank state is no state', () => {
    expect(windowRegionFor('United States', '   ')).toBeNull()
    expect(windowRegionFor('United States', null)).toBeNull()
  })
})

describe('#2473 — the state helpers never break the path they sit on', () => {
  beforeEach(() => { dbState.error = null; dbState.data = null; dbState.throws = false; dbState.updates = [] })

  it('saveLeadState writes the trimmed state, and skips a blank one', async () => {
    await saveLeadState('l1', '  New York ')
    await saveLeadState('l1', '')
    await saveLeadState('l1', null)
    expect(dbState.updates).toEqual([{ state: 'New York' }])
  })

  it('a missing column (write error) or a throw is swallowed — the reveal carries on', async () => {
    dbState.error = { message: 'column "state" does not exist' }
    await expect(saveLeadState('l1', 'Texas')).resolves.toBeUndefined()
    dbState.throws = true
    await expect(saveLeadState('l1', 'Texas')).resolves.toBeUndefined()
  })

  it('readLeadState: a stored state is returned; an error or a throw reads as no state', async () => {
    dbState.data = { state: ' Ohio ' }
    expect(await readLeadState('l1')).toBe('Ohio')
    dbState.error = { message: 'column "state" does not exist' }
    expect(await readLeadState('l1')).toBeNull()
    dbState.throws = true
    expect(await readLeadState('l1')).toBeNull()
  })
})

// ── Source guards: the state is kept at BOTH reveal points and used at the ONE send gate ──
const src = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8')

describe('#2473 — wired end to end', () => {
  it("Apollo's reveal carries the state", () => {
    expect(src('lib/apollo.ts')).toContain('state:        m?.state ?? null')
  })

  it('both reveal paths store it', () => {
    expect(src('lib/lead-delivery.ts')).toContain('saveLeadState(r.id as string, person.state)')
    expect(src('lib/programme-qualification.ts')).toContain('saveLeadState(c.id, person.state)')
  })

  it('the send gate hands the window a US-only region', () => {
    const f = src('lib/figsy.ts')
    expect(f).toContain('recipientRegion:')
    expect(f).toContain('windowRegionFor(country, await readLeadState(lead.id))')
  })

  it('the migration exists and is registered for Vida → Engine', () => {
    expect(existsSync(join(__dirname, '../../../../supabase/migrations/20260930_lead_state.sql'))).toBe(true)
    expect(src('lib/pending-migrations.ts')).toContain("key: '20260930_lead_state'")
  })
})
