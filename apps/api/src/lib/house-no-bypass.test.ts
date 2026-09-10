// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 10 Sep (I6) — HOUSE FOLLOWS THE SAME SYSTEM.
//
// Founder, 10 Sep, verbatim: *"No special bypasses. House follows the same system. Only P1/P2
// money events differ via explicit internal authority. Multiple House inboxes are allowed; one
// programme sender must still be unambiguous."*
//
// ── THE SEVEN GATES THAT GET NO EXEMPTION ───────────────────────────────────────────────
//
//   client/programme approval truth · sender readiness · Make Live · Run · the kill-switch ·
//   meeting attribution · Completion
//
// ── HOW THIS IS PROVED, AND WHY IT IS NOT A LIST OF HOUSE FIXTURES ──────────────────────
//
// 🛑 THE STRONGEST ARGUMENT IS STRUCTURAL: most of these gates **cannot see who the client is**.
// `authorityFor` takes a programme row and an action. `programmeSenderSafety` takes a client id
// and asks the same three questions of it whoever it is. `killSwitchBlocks` takes a channel and
// a label. There is no parameter a House exemption could be written against — so the test is
// that no House IDENTITY is imported into them at all, plus behavioural cases proving a
// House-shaped row is refused exactly like anyone else's.
//
// ⚠️ AND THE ALLOWLIST BELOW IS THE POINT, NOT AN ESCAPE HATCH. Three kinds of file legitimately
// know about House, each for a reason the founder has stated, and each is named with that
// reason. A file that starts consulting House identity and is NOT on the list fails here.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
  process.env.INBOX_SECRET_KEY ??= '0'.repeat(64)
})

type Row = Record<string, unknown>
const state: { inboxes: Row[] } = { inboxes: [] }

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {}
      const filters: Array<(r: Row) => boolean> = []
      q.select = () => q
      q.limit = () => q
      q.eq = (c: string, v: unknown) => { filters.push(r => r[c] === v); return q }
      q.then = (res: (v: unknown) => unknown) =>
        Promise.resolve({ data: state.inboxes.filter(r => filters.every(f => f(r))), error: null }).then(res)
      return q
    },
  },
}))

import { authorityFor, type ProgrammeRow } from './programme-authority'
import { programmeSenderSafety } from './programme-sender'
import { killSwitchBlocks } from './outreach-kill-switch'

const LIB = join(__dirname)
const code = (file: string) => readFileSync(join(LIB, file), 'utf8')

/** Executable lines only — comments in these files EXPLAIN House and must not trip the check. */
const executable = (src: string) => src.split('\n')
  .filter(l => {
    const t = l.trim()
    return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*')
  })
  .join('\n')

/** Every way a module can learn that a client is House. */
const HOUSE_IDENTITY = [
  'isHouseClient', 'resolveHouseClientId', 'HOUSE_ACCOUNT_EMAIL', 'HOUSE_CLIENT_ID',
  'isHouseLaunchProgramme', 'houseClientId', 'audienceForClientStrict',
]

/**
 * The modules that decide whether work may happen. None of them may know who the client is.
 *
 * ⚠️ NAMED INDIVIDUALLY, NOT GLOBBED. A glob over `lib/` would silently start covering new
 * files and silently stop covering renamed ones; this list is the contract, and a gate that
 * leaves it leaves it visibly.
 */
const GATES: { file: string; guards: string }[] = [
  { file: 'programme-authority.ts',       guards: 'approval truth, Run, sender safety, preparation drift, the send window' },
  { file: 'programme-sender.ts',          guards: 'sender readiness — one unambiguous, unshared, proved mailbox' },
  { file: 'programme-lifecycle.ts',       guards: 'the lifecycle verdict, including Completion' },
  { file: 'programme-lifecycle-facts.ts', guards: 'the facts the verdict is derived from' },
  { file: 'programme-p1-continuation.ts', guards: 'the automatic start, and whether it may spend again' },
  { file: 'preparation-readiness.ts',     guards: 'whether a programme may be put in front of a client' },
  { file: 'outreach-kill-switch.ts',      guards: 'the absolute delivery kill-switch' },
  { file: 'meeting-truth.ts',             guards: 'meeting attribution — the product-outcome number' },
  { file: 'send-due.ts',                  guards: 'which enrolments may be sent right now' },
  { file: 'mailer.ts',                    guards: 'the SMTP seam every client send passes through' },
]

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① STRUCTURAL — the gates cannot see House even if somebody wanted them to
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('① no gate the founder named knows what House is', () => {
  for (const { file, guards } of GATES) {
    it(`${file} — ${guards}`, () => {
      const src = executable(code(file))
      for (const marker of HOUSE_IDENTITY) {
        expect(src.includes(marker),
          `${file} consults House identity via ${marker} — that is a bypass in a gate that must have none`).toBe(false)
      }
    })
  }

  it('🛑 the list is not empty and has not quietly shrunk', () => {
    // A confinement test whose subject list can be emptied proves nothing at all.
    expect(GATES.length).toBeGreaterThanOrEqual(10)
    for (const g of GATES) expect(code(g.file).length).toBeGreaterThan(500)
  })

  it('🛑 and the markers themselves still exist somewhere, so the check is not vacuous', () => {
    // ⚠️ IF `isHouseClient` WERE RENAMED, every assertion above would pass for the wrong reason.
    // House identity must still be a real thing this repo can express.
    const houseClient = code('house-client.ts')
    expect(houseClient).toContain('isHouseClient')
    expect(houseClient).toContain('HOUSE_ACCOUNT_EMAIL')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② THE ALLOWLIST — what may know about House, and the founder's reason for each
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ EVERY ENTRY IS A STATED REASON, and the reasons are the founder's own categories:
 *
 *   MONEY     — "Only P1/P2 money events differ via explicit internal authority."
 *   CONTENT   — one specific launch programme's approved copy. Not a gate: it decides what a
 *               sequence SAYS, never whether anything may run, and every other programme now
 *               writes its own from its own client context.
 *   PROVIDER  — the AR5 audience boundary (House → Apollo, verified-only, never PDL/Hunter).
 *               A sourcing rule about which vendor may be paid, not a delivery gate.
 *   OPERATIONS— exemptions from internal housekeeping (the 30-day cold clock, cleanup guards,
 *               revenue exclusion) that have never been client-facing gates.
 */
const ALLOWED: Record<string, string> = {
  'commercial-model.ts': 'MONEY — resolves which economics apply; internal authority is the House difference',
  'customer-programme.ts': 'MONEY — internalBilling, so House is not told it owes itself a payment',
  'house-client.ts': 'MONEY — the identity resolver itself',
  'house-sequence.ts': 'CONTENT — the one launch programme\'s approved five-step copy',
  'programme-preparation.ts': 'CONTENT — seeds that copy when the chain has no sequence, and nothing else',
  'programme-reconcile-availability.ts': 'CONTENT — reconciles that same one programme',
  'programme-sequence-generation.ts': 'CONTENT — states that it does NOT consult it',
  'provider-boundary.ts': 'PROVIDER — AR5, which vendor may be paid for a House audience',
  'instantly-map.ts': 'PROVIDER — AR5, which vendor a House audience may be pushed to',
  'instantly-push.ts': 'PROVIDER — AR5, the push itself is bounded by the same rule',
  'smartlead-map.ts': 'PROVIDER — AR5, the Smartlead half of the same audience boundary',
  'smartlead-send.ts': 'PROVIDER — AR5, and it sends nothing House-specific',
  'programme-batch-recovery.ts': 'PROVIDER — AR5, a House batch may only recover provider-VERIFIED business addresses',
  'startup-check.ts': 'OPERATIONS — names HOUSE_* env keys in its documentation strings; it decides nothing',
  'cold-client.ts': 'OPERATIONS — the 30-day cold clock exemption',
  'cleanup-guards.ts': 'OPERATIONS — House rows are never swept',
  'real-clients.ts': 'OPERATIONS — revenue figures exclude Client Zero',
  'real-clients-logic.ts': 'OPERATIONS — the same, as a pure rule',
  'system-probes.ts': 'OPERATIONS — health checks name the account they probe',
  'house-audit.ts': 'OPERATIONS — an audit OF House',
}

describe('② anything else that learns about House has to say why', () => {
  it('🛑 no unexplained House reference anywhere in lib/', () => {
    const { readdirSync } = require('node:fs') as typeof import('node:fs')
    const files = readdirSync(LIB).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    const unexplained: string[] = []
    for (const f of files) {
      if (ALLOWED[f]) continue
      const src = executable(code(f))
      if (HOUSE_IDENTITY.some(m => src.includes(m))) unexplained.push(f)
    }
    expect(unexplained,
      `these consult House identity with no stated reason: ${unexplained.join(', ')}`).toEqual([])
  })

  it('every allowlisted file exists and carries a real reason', () => {
    // ⚠️ AN ALLOWLIST THAT ACCUMULATES DEAD ENTRIES stops being a list of decisions and becomes
    // a list of names nobody has read since.
    for (const [file, reason] of Object.entries(ALLOWED)) {
      expect(() => code(file), `${file} is allowlisted but does not exist`).not.toThrow()
      expect(reason.length, `${file}'s reason is too short to be one`).toBeGreaterThan(20)
      expect(reason).toMatch(/^(MONEY|CONTENT|PROVIDER|OPERATIONS)/)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ BEHAVIOURAL — a House-shaped row is refused exactly like anyone else's
// ═══════════════════════════════════════════════════════════════════════════════════════

/** A House programme, fully authorised by INTERNAL authority and never paid a cent. */
const houseProgramme = (over: Partial<ProgrammeRow> = {}): ProgrammeRow => ({
  id: 'house-prog', client_id: 'house', status: 'LIVE',
  paused_at: null, disputed_at: null,
  first_paid_at: null, first_authorised_at: '2026-09-01',
  second_paid_at: null, second_payment_ref: null, second_authorised_at: '2026-09-05',
  approved_at: '2026-09-05', went_live_at: '2026-09-06',
  run_at: null,
  sourcing_ceiling: 2500, sourced_used: 0, sourced_reserved: 0,
  review_required_at: null, review_resolved_at: null,
  ...over,
} as ProgrammeRow)

/** A House mailbox: real, live, credentialed — and never proved to log in. */
const houseInbox = (over: Row = {}): Row => ({
  id: 'hb-1', client_id: 'house', email: 'jacques@meetandvibe.com', kind: 'branded',
  status: 'active', provider: 'smtp', daily_cap: 30,
  smtp_host: 'smtp.google.com', smtp_port: 587, smtp_secure: false,
  smtp_user: 'jacques@meetandvibe.com', smtp_pass_enc: 'enc', from_name: 'Jacques',
  verified_at: null, verify_failed_at: null, verify_detail: null, ...over,
})

beforeEach(() => { state.inboxes = [] })

describe('③ Run, approval and the kill-switch treat House like every other client', () => {
  it('🛑 RUN — a House programme that is LIVE but never Run may not send', () => {
    // Make Live arms and sends nothing; Run is the separate operator act. Internal authority
    // settles the MONEY and nothing else — it is not a substitute for pressing Run.
    const v = authorityFor(houseProgramme({ run_at: null }), 'OUTREACH')
    expect(v.allowed, 'House was allowed to send without ever being Run').toBe(false)
    expect(v.allowed === false && v.reason).toBe('programme_not_run')
  })

  it('and once Run it is allowed, so the refusal is a gate and not a wall', () => {
    const v = authorityFor(houseProgramme({ run_at: '2026-09-07' }), 'OUTREACH')
    expect(v.allowed, v.allowed ? '' : (v as { message: string }).message).toBe(true)
  })

  it('🛑 APPROVAL — internal P2 authority settles the money, it does not approve the work', () => {
    // ⚠️ THE ONE FOUNDER-SANCTIONED DIFFERENCE IS THE MONEY EVENT, and this proves it stops
    // there. A House programme carrying BOTH internal authority stamps — so nothing is owed —
    // but no `approved_at` and no `went_live_at` is still refused outreach. Internal authority
    // buys the work; it does not approve it and it does not make it live.
    const v = authorityFor(
      houseProgramme({ approved_at: null, went_live_at: null, run_at: null, status: 'READY_FOR_APPROVAL' }),
      'OUTREACH')
    expect(v.allowed, 'internal authority approved the work as well as the money').toBe(false)
    // ⚠️ THE REASON IS ASSERTED, not just the refusal. A refusal for the wrong reason would
    // pass a bare `toBe(false)` while the approval gate itself was gone.
    expect(v.allowed === false && ['programme_not_live', 'programme_not_approved'])
      .toContain(v.allowed === false ? v.reason : '')
  })

  it('🛑 SOURCING — House still needs P1 authority; it is exempt from nothing', () => {
    // ⚠️ AND THE MONEY DIFFERENCE IS EXACTLY WHERE THE FOUNDER PUT IT: the internal stamp
    // SATISFIES the requirement, it does not remove it. Strip both and House is refused.
    const withAuthority = authorityFor(
      houseProgramme({ status: 'SOURCING_AUTHORISED', approved_at: null, went_live_at: null }), 'SOURCING')
    expect(withAuthority.allowed, 'internal P1 authority did not satisfy the sourcing gate').toBe(true)

    const without = authorityFor(
      houseProgramme({ status: 'SOURCING_AUTHORISED', approved_at: null, went_live_at: null, first_authorised_at: null }),
      'SOURCING')
    expect(without.allowed, 'House sourced with no first-payment authority at all').toBe(false)
  })

  it('🛑 KILL-SWITCH — it is absolute, and House is not outside it', () => {
    const prev = process.env.AUTO_OUTREACH_ENABLED
    process.env.AUTO_OUTREACH_ENABLED = 'false'
    try {
      expect(killSwitchBlocks('smtp', 'jacques@meetandvibe.com → prospect@example.net'),
        'House sent while the kill-switch was on').toBe(true)
    } finally {
      if (prev === undefined) delete process.env.AUTO_OUTREACH_ENABLED
      else process.env.AUTO_OUTREACH_ENABLED = prev
    }
  })
})

describe('④ House sender readiness — multiple inboxes are fine, an unproved sender is not', () => {
  it('🛑 an unverified House mailbox is refused, exactly like a client\'s', async () => {
    state.inboxes = [houseInbox()]
    const r = await programmeSenderSafety('house')
    expect(r.ok, 'House was let through a mailbox nobody has proved can log in').toBe(false)
    expect(r.ok === false && r.reason).toBe('unverified_sender')
  })

  it('🛑 MULTIPLE VALID HOUSE INBOXES ARE ALLOWED — the founder said so explicitly', async () => {
    // "Multiple House inboxes are allowed; one programme sender must still be unambiguous."
    state.inboxes = [
      houseInbox({ verified_at: '2026-09-10' }),
      houseInbox({ id: 'hb-2', email: 'hello@meetandvibe.com', kind: 'pooled', verified_at: '2026-09-10' }),
      houseInbox({ id: 'hb-3', email: 'team@meetandvibe.com', kind: 'pooled', status: 'assigned', verified_at: '2026-09-10' }),
    ]
    const r = await programmeSenderSafety('house')
    expect(r.ok, r.ok ? '' : r.detail).toBe(true)
    expect(r.ok && r.inboxId, 'the unambiguous winner is the branded active box').toBe('hb-1')
  })

  it('🛑 but two EQUALLY-RANKED House inboxes are still ambiguous, and still refused', async () => {
    state.inboxes = [
      houseInbox({ verified_at: '2026-09-10' }),
      houseInbox({ id: 'hb-2', email: 'hello@meetandvibe.com', verified_at: '2026-09-10' }),
    ]
    const r = await programmeSenderSafety('house')
    expect(r.ok, 'House got an arbitrary sender where a client would be refused').toBe(false)
    expect(r.ok === false && r.reason).toBe('ambiguous_sender')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ ATTRIBUTION AND COMPLETION — the two reads, asked structurally
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('⑤ House\'s numbers and House\'s Completion come from the same code as everyone\'s', () => {
  it('🛑 meeting attribution has no House branch — it cannot even see a client name', () => {
    const src = executable(code('meeting-truth.ts'))
    for (const m of HOUSE_IDENTITY) expect(src.includes(m)).toBe(false)
    // And it is genuinely the only counter: a second one is how House's retired desk showed
    // a live client's meetings in the first place.
    expect(src).toContain('export async function meetingCounts')
  })

  it('🛑 Completion is not filtered for anybody, House included', () => {
    // The defect this replaced was a blanket `.not('status','in','(COMPLETED,CANCELLED)')` —
    // it hid every finished client from themselves, and House would have been hidden too.
    const src = executable(code('customer-programme.ts'))
    expect(src, 'finished programmes are filtered out of the client\'s own workspace again')
      .not.toContain("'(COMPLETED,CANCELLED)'")
  })

  it('the House reference customer-programme DOES carry is the money one, and only that', () => {
    // ⚠️ THIS FILE IS ON THE ALLOWLIST, so §② lets it through. This case says what for.
    const src = executable(code('customer-programme.ts'))
    expect(src).toContain('isHouseClient')
    expect(src).toContain('internalBilling')
    // It must not be reaching for House anywhere near the stage or the terminal state.
    const at = src.indexOf('isHouseClient')
    expect(src.slice(Math.max(0, at - 400), at + 400)).not.toContain('terminal')
  })
})
