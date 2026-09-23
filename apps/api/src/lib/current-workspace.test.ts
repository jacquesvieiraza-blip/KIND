// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CURRENT WORKSPACE — House's live Milla was showing its retired desk as current work
//
// 🛑 THE FOUNDER'S SCREENSHOT. House was set to `commercial_model = 'programme'` and has no
// open programme. Vida read it correctly. Milla did not: three prospect cards from the retired
// per-lead desk under "Earlier activity", a reply in Recent Replies, and historical campaign
// and meeting numbers — every one of them presented as the CURRENT workspace.
//
// ── THE CAUSE, AND WHY TWO FIXES MISSED IT ──────────────────────────────────────────────
//
// #1633 scoped these reads to the OPEN PROGRAMME: `if (!programmeId) return everything()`. That
// is the C2 defect in the read model — "no programme row" read as "no boundary" — and House has
// no programme, so every read fell back to the unbounded client-scoped list.
//
// ⛓️ THE SECOND ATTEMPT MADE THE SAME MISTAKE WITH A DIFFERENT COLUMN, and this suite is where
// that is recorded. It read `clients.proof_passes_done > 0` and, on a non-zero count, handed
// back the unbounded desk. That counter answers *"has this account EVER claimed a pass"* — never
// *"does THIS ROW belong to that pass"* — so a declared programme client with old legacy leads
// who later ran a proof they were entitled to run got every historical card back. The founder
// caught it before it shipped. **"No programme ⇒ show everything" had simply become "ever
// proofed ⇒ show everything".**
//
// ── WHAT THE BOUNDARY IS NOW ────────────────────────────────────────────────────────────
//
// `leads.proof_pass`, stamped by the run that created the row from the pass
// `try_claim_proof_pass` granted. This module answers WHICH RULE APPLIES; the row answers WHICH
// ROWS QUALIFY — which is why House and a genuine new customer now take the IDENTICAL scope and
// are separated by their data rather than by a verdict about their account.
//
// ⚠️ THE BEHAVIOURAL PROOF LIVES IN `proof-attribution-boundary.test.ts` — one account holding
// BOTH histories, asserting that the modern cards show AND the historical ones do not. This
// file asserts the SHAPE of the boundary: what it may be made of, and what it may not.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

const state: {
  client: Row | null
  clientError: { message: string } | null
  programme: Row | null
  programmeError: { message: string } | null
  /** every table read, in order — proves a scope costs what it claims to cost */
  reads: string[]
} = { client: null, clientError: null, programme: null, programmeError: null, reads: [] }

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'not', 'is', 'in', 'gte', 'order', 'limit']) q[m] = () => q
      q.maybeSingle = async () => {
        state.reads.push(table)
        if (table === 'clients')    return { data: state.client, error: state.clientError }
        if (table === 'programmes') return { data: state.programme, error: state.programmeError }
        return { data: null, error: null }
      }
      q.single = q.maybeSingle
      q.then = (r: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(r)
      return q
    },
  },
}))

import { currentWorkspaceScope, showsCurrentOutreach } from './current-workspace'

const PROG = { id: 'p-new', client_id: 'c1', status: 'LIVE' }
const API = join(__dirname, '..')
const strip = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') }).join('\n')
const raw = (p: string) => strip(readFileSync(join(API, p), 'utf8'))

beforeEach(() => {
  state.client = { commercial_model: null, proof_passes_done: 0, proof_started_at: null }
  state.clientError = null
  state.programme = null
  state.programmeError = null
  state.reads = []
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE FOUR SCOPES — and the one that was withdrawn
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① the boundary of a client\'s current work', () => {
  it('🛑 HOUSE AND A NEW CUSTOMER MID PROOF TAKE THE IDENTICAL SCOPE — the ROWS separate them', async () => {
    // ⛓️ THIS IS THE CORRECTION, AS AN ASSERTION. These two were previously answered `none` and
    // `proof` from `proof_passes_done`, which is a verdict about the ACCOUNT. It cannot be one:
    // the same account can hold retired legacy rows AND a legitimate modern proof at once, and
    // any account-level verdict must then be wrong about half its own data. So the scope is the
    // same for both and `leads.proof_pass` decides which rows are current work.
    state.client = { commercial_model: 'programme', proof_passes_done: 0, proof_started_at: null }
    expect((await currentWorkspaceScope('c1')).kind).toBe('proof')

    state.client = { commercial_model: 'programme', proof_passes_done: 2, proof_started_at: '2026-09-03T09:00:00Z' }
    expect((await currentWorkspaceScope('c1')).kind).toBe('proof')
  })

  it('🛑 P_NEW — a programme is open → PROGRAMME, and it carries the id for positive attribution', async () => {
    state.client = { commercial_model: 'programme', proof_passes_done: 0, proof_started_at: null }
    state.programme = PROG
    const s = await currentWorkspaceScope('c1')
    expect(s.kind).toBe('programme')
    expect(s.kind === 'programme' && s.programmeId).toBe('p-new')
  })

  it('🛑 a STORED-legacy client → PROOF scope, like any programme client with no programme (R137)', async () => {
    // ⛓️ INVERTED 23 Sep (R137). WAS: `'a DECLARED LEGACY client → LEGACY — client-scoped,
    // exactly as it always was'`. Founder, verbatim: *"the 299/4 is retired/ this must go. everything must be updated to new programme pricing model."*
    // The history is not deleted; it is no longer presented as current work.
    state.client = { commercial_model: 'legacy', proof_passes_done: 0, proof_started_at: null }
    expect((await currentWorkspaceScope('c1')).kind).toBe('proof')
  })

  it('🛑 an UNCLASSIFIED client → PROOF scope; WITH a programme → scoped to it (R137)', async () => {
    // ⛓️ INVERTED 23 Sep (R137). WAS: `'⚠️ NON-VACUOUS: an UNCLASSIFIED client → LEGACY. This
    // is the whole live book.'` The whole live book is on the programme now. ⚠️ STATED PLAINLY:
    // a formerly unclassified client with no open programme no longer sees their historical
    // cards, replies or campaign in Milla — the rows stay, and Vida still reads them.
    expect((await currentWorkspaceScope('c1')).kind).toBe('proof')
    state.programme = PROG
    expect((await currentWorkspaceScope('c1')).kind, 'unclassified WITH a programme is scoped to it')
      .toBe('programme')
  })

  it('🛑 an UNREADABLE model → unreadable, never legacy and never proof', async () => {
    state.clientError = { message: 'connection reset' }
    expect((await currentWorkspaceScope('c1')).kind).toBe('unreadable')
  })

  it('🛑 CALIBRATION IS NOT OUTREACH — only programme and legacy may show a campaign, replies or meetings', () => {
    // Free proof sends nobody an email, so any campaign, reply or meeting readable for a
    // proof-scoped client is by construction an earlier motion's. `unreadable` is deliberately
    // false here too: each caller degrades it its own way, and flattening that into this
    // boolean would silently change one of them.
    expect(showsCurrentOutreach({ kind: 'programme', programmeId: 'x' })).toBe(true)
    expect(showsCurrentOutreach({ kind: 'legacy' })).toBe(true)
    expect(showsCurrentOutreach({ kind: 'proof' })).toBe(false)
    expect(showsCurrentOutreach({ kind: 'unreadable', reason: 'x' })).toBe(false)
  })

  it('🛑 EVERY PATH COSTS EXACTLY TWO READS — the second clients read is gone', async () => {
    // The withdrawn version took a second trip to `clients` for `proof_passes_done`. With
    // attribution on the row there is nothing left to ask, and this asserts the counter cannot
    // creep back in as a read.
    for (const model of [null, 'legacy', 'programme']) {
      state.client = { commercial_model: model, proof_passes_done: 2, proof_started_at: null }
      state.reads = []
      await currentWorkspaceScope('c1')
      expect(state.reads, `${String(model)} must cost clients + programmes and nothing more`)
        .toEqual(['clients', 'programmes'])
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② IT IS NOT A NAME, A DATE CUTOFF, A COUNTER, OR A HOUSE SPECIAL CASE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② the discriminator is positive, stored on the row, and about nobody in particular', () => {
  it('🛑 no company name, no HOUSE_CLIENT_ID, no env var, no hardcoded id', () => {
    const src = raw('lib/current-workspace.ts')
    for (const banned of ['company_name', 'HOUSE_CLIENT_ID', 'get-kind.com', 'process.env', 'is_demo']) {
      expect(src, `the boundary must never be decided by ${banned}`).not.toContain(banned)
    }
  })

  it('🛑 IT WRITES NOTHING — no history is deleted, backfilled or restamped', () => {
    const src = raw('lib/current-workspace.ts')
    for (const w of ['.update(', '.insert(', '.delete(', '.upsert(', '.rpc(']) {
      expect(src, `the boundary must not write: ${w}`).not.toContain(w)
    }
  })

  it('🛑 NO CUMULATIVE CLIENT STATE — the withdrawn rule cannot come back by edit', () => {
    const src = raw('lib/current-workspace.ts')
    expect(src, 'proof_passes_done is "has this account ever", never "is this row"')
      .not.toMatch(/proof_passes_done/)
    expect(src, 'proof_started_at is rewritten on every claim and hides pass 1')
      .not.toMatch(/proof_started_at/)
  })

  it('🛑 NO CLOCK — not a cutoff, not a stamp, not arithmetic, not a range filter', () => {
    const src = raw('lib/current-workspace.ts')
    expect(src, 'the boundary must not compare timestamps')
      .not.toMatch(/Date\.now\(\)|new Date\(|getTime\(\)|\.gte\(|\.lte\(|\.gt\(|\.lt\(/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ EVERY LIVE PATH THE FOUNDER'S SCREENSHOT SHOWED CONSUMES IT
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ the four surfaces that were rendering history as current work', () => {
  const summary = raw('lib/milla-summary.ts')
  const leadsRt = raw('routes/leads.ts')

  it('🛑 THE PROSPECT CARDS — bounded by a POSITIVE ROW FACT, not by an account verdict', () => {
    const fn = leadsRt.slice(leadsRt.indexOf("leadRouter.get('/for-approval'"))
    expect(fn).toContain('currentWorkspaceScope(clientId)')
    expect(fn).toContain("if (scope.kind === 'programme') q = q.eq('programme_id', scope.programmeId)")
    expect(fn, 'a proof desk shows attributed proof rows and nothing else')
      .toContain("if (scope.kind === 'proof') q = q.not('proof_pass', 'is', null)")
    // 🛑 AND STILL NO TIME BOUND — "two labelled proof sets, nothing deleted or filtered away"
    // is founder-locked, and a bound here hid pass 1 from a client on pass 2.
    expect(fn, 'no server-side filter may separate the proof batches')
      .not.toMatch(/\.(gte|gt|lte|lt)\(\s*['"]surfaced_for_approval_at/)
    // ⚠️ AND THE BOUNDARY IS APPLIED BEFORE THE ROWS ARE FETCHED, not filtered afterwards.
    expect(fn.indexOf('currentWorkspaceScope')).toBeLessThan(fn.indexOf('const { data, error } = await q'))
  })

  it('🛑 RECENT REPLIES — the rail two fixes did not close', () => {
    const fn = summary.slice(summary.indexOf('async function recentRepliesFor'))
      .slice(0, summary.slice(summary.indexOf('async function recentRepliesFor')).indexOf('export async function'))
    expect(fn, 'the old open-programme scoping must be gone')
      .not.toContain('openProgrammeForClient')
    expect(fn).toContain('currentWorkspaceScope(clientId)')
    expect(fn, 'calibration has no replies — stated positively as an empty rail')
      .toMatch(/if \(scope\.kind === 'proof'\) return \{ data: \[\] as Record<string, unknown>\[\], error: null \}/)
    expect(fn, 'and legacy still takes the identical query it always took')
      .toMatch(/if \(scope\.kind === 'legacy'\) return base\(\)/)
  })

  it('🛑 THE CAMPAIGN SENTENCE — fail-closed, and silent for a calibration workspace', () => {
    const fn = summary.slice(summary.indexOf('async function campaignFor'))
      .slice(0, summary.indexOf('async function recentRepliesFor') - summary.indexOf('async function campaignFor'))
    expect(fn).not.toContain('openProgrammeForClient')
    expect(fn).toContain('currentWorkspaceScope(clientId)')
    expect(fn).toMatch(/if \(scope\.kind === 'proof'\) return \{ data: null, error: null \}/)
    expect(fn, 'an unreadable scope must not assert a campaign either')
      .toMatch(/if \(scope\.kind === 'unreadable'\)[\s\S]{0,300}return \{ data: null, error: null \}/)
    expect(fn).toMatch(/if \(scope\.kind === 'legacy'\) return newest\(\)/)
  })

  it('🛑 THE WAITING COUNT AND THE MEETING COUNT — the two numbers beside the cards', () => {
    expect(summary).toContain('const summaryScope = await currentWorkspaceScope(clientId)')
    expect(summary, 'and the count is not bounded by a date either')
      .not.toMatch(/\.gte\(\s*'surfaced_for_approval_at'/)
    // THE SAME BOUNDARY THE CARD LIST APPLIES, CLAUSE FOR CLAUSE — the count and the cards
    // cannot disagree, which is how House reaches 0 with nothing deleted.
    expect(summary).toContain("if (summaryScope.kind === 'programme') q = q.eq('programme_id', summaryScope.programmeId)")
    expect(summary).toContain("if (summaryScope.kind === 'proof') q = q.not('proof_pass', 'is', null)")
    expect(summary, 'calibration books nobody, so this month has no meetings')
      .toContain('outreach\n      ? meetingCounts(')
    expect(summary, 'and an open programme scopes the month to THAT programme')
      .toContain('{ clientId, programmeId: summaryScope.programmeId, since: monthStart }')
    // ⚠️ THE ALL-TIME REPORT FIGURES ARE DELIBERATELY UNTOUCHED. They are labelled as history
    // and are the one place history belongs — this is what "preserved, not deleted" looks like.
    expect(summary).toContain('meetingCounts({ clientId }),')
  })

  it('🛑 THE "EARLIER ACTIVITY" BANNER IS DRIVEN BY THE CARD LIST, so it goes with them', () => {
    const page = strip(readFileSync(join(API, '../../portal/src/app/(milla)/milla/page.tsx'), 'utf8'))
    expect(page).toContain('leads && leads.length > 0 && proofPassesDone === 0 && (')
    expect(page, 'the founder-locked wording itself is untouched').toContain('Earlier activity')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ TENANCY, AND THE ARCHIVE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ what does not change', () => {
  it('🛑 EVERY BOUNDED QUERY IS STILL CLIENT-SCOPED — the boundary narrows, never widens', () => {
    const leadsRt = raw('routes/leads.ts')
    const fn = leadsRt.slice(leadsRt.indexOf("leadRouter.get('/for-approval'"))
      .slice(0, 3000)
    expect(fn).toContain(".eq('client_id', clientId)")
    // MBF cannot leak into House and House cannot leak into MBF: the tenancy filter is not
    // conditional on the scope, and the scope only ever ADDS a filter.
    expect(fn.indexOf(".eq('client_id', clientId)"), 'tenancy is applied unconditionally')
      .toBeLessThan(fn.indexOf("if (scope.kind === 'programme')"))
  })

  it('🛑 NOTHING IN THE LIVE PATHS DELETES OR UPDATES A HISTORICAL ROW', () => {
    const summary = raw('lib/milla-summary.ts')
    for (const w of ['.delete(', '.update(']) {
      expect(summary, `milla-summary is a read model: ${w}`).not.toContain(w)
    }
  })
})
