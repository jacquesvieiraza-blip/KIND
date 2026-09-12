// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 10 Sep (I1) — THE FACTS VIDA IS TOLD, AND THE ONE IT WAS NEVER TOLD.
//
// ── WHY THIS FILE DID NOT EXIST AND HAD TO ──────────────────────────────────────────────
//
// `programme-lifecycle.test.ts` proves the DERIVATION: given `preparationStopped: true`, a
// sourcing programme is an exception. It has always passed. The defect was one layer below it
// — nothing ever set that fact from a refused automatic start, so the derivation was asked a
// question with the wrong answer already in it and returned `sourcing` · **Working** about a
// programme that had bought nothing and never would.
//
// 🛑 A PURE FUNCTION TESTED IN ISOLATION CANNOT CATCH THAT. The bug lives in the gathering, so
// the test has to live here too.
//
// ⚠️ EVERY READ IN THE FILE UNDER TEST FAILS SOFT, which is exactly why it needs asserting:
// a gathering step that silently returns the calm answer is indistinguishable from one that
// was never written.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
  // ⚑ 10 Sep (I2) — the sender gate refuses outright without a readable secret key, and this
  // file's cases are about the mailbox, not about the environment.
  process.env.INBOX_SECRET_KEY ??= '0'.repeat(64)
})

type Row = Record<string, unknown>
const state: Record<string, Row[]> = {}
/** Tables whose next read throws, so "unreadable" can be told apart from "empty". */
const unreadable = new Set<string>()

function table(name: string) {
  const rows = () => state[name] ?? []
  const q: Record<string, unknown> & { _f: ((r: Row) => boolean)[] } = {
    _f: [], _order: null as null | { c: string; asc: boolean }, _limit: undefined as number | undefined,
    select() { return q },
    order(c: string, o?: { ascending?: boolean }) { q._order = { c, asc: o?.ascending !== false }; return q },
    limit(n: number) { q._limit = n; return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    not(c: string, _o: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) !== v); return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    _hit() {
      if (unreadable.has(name)) throw new Error(`${name} unreadable`)
      let h = rows().filter(r => q._f.every(f => f(r)))
      const o = q._order as null | { c: string; asc: boolean }
      if (o) h = [...h].sort((a, b) => String(a[o.c] ?? '').localeCompare(String(b[o.c] ?? '')) * (o.asc ? 1 : -1))
      const n = q._limit as number | undefined
      return typeof n === 'number' ? h.slice(0, n) : h
    },
    _run() {
      try { const h = q._hit(); return { data: h, count: h.length, error: null } }
      catch (e) { return { data: null, count: null, error: { message: (e as Error).message } } }
    },
    async maybeSingle() { const r = q._run(); return { data: (r.data ?? [])[0] ?? null, error: r.error } },
    then(res: (v: unknown) => unknown) { return Promise.resolve(q._run()).then(res) },
  } as never
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t), rpc: async () => ({ data: null, error: null }) } }))
vi.mock('./programme-chain', () => ({ resolveProgrammeChain: async () => ({ ok: false, reason: 'none' }) }))
vi.mock('./preparation-readiness', () => ({
  PREPARATION_CLEARS: [] as string[],
  programmePreparationReadiness: async () => ({ ready: false, blockers: [] }),
}))
vi.mock('./programme-advance', () => ({
  isAdvanceRunning: () => false,
  lastPreparationAttempt: async () => null,
}))
vi.mock('./outreach-kill-switch', () => ({ outreachDeliveryPermitted: () => false }))
vi.mock('./figsy', () => ({ operatorSendEnabled: () => false }))

import { lifecycleDetailFor, lifecycleBoard } from './programme-lifecycle-facts'

const CLIENT = '11111111-1111-4111-8111-111111111111'
const PROG = '22222222-2222-4222-8222-222222222222'

const refusal = 'No ICP is attached to this programme, so there is nothing it is authorised to source.'

const auditRow = (action: string, detail: string, created_at: string): Row => ({
  operator_email: 'stripe-webhook', action, subject_type: 'programme', subject_id: PROG,
  detail: { trigger: 'stripe_first_payment', detail }, created_at,
})

beforeEach(() => {
  unreadable.clear()
  for (const k of Object.keys(state)) delete state[k]
  // A paid programme that is authorised to source and has done nothing at all — the exact
  // shape a refused automatic start leaves behind.
  state.programmes = [{
    id: PROG, client_id: CLIENT, status: 'SOURCING_AUTHORISED', paused_at: null,
    approved_at: null, second_paid_at: null, second_payment_ref: null, second_authorised_at: null,
    first_paid_at: '2026-09-10', first_authorised_at: null, went_live_at: null, run_at: null,
    meeting_target: 10, sourcing_ceiling: 2500, sourced_used: 0, sourced_reserved: 0,
    recommended_volume: 2500, created_at: '2026-09-10T08:00:00Z',
  }]
  state.clients = [{ id: CLIENT, proof_review_requested_at: null, proof_review_resolved_at: null, proof_completed_at: '2026-09-10' }]
  // ⚑ 10 Sep (I2) — a mailbox that passes the WHOLE gate: live, credentialed, and proved to
  // log in. Everything the panel says about the sender is now the gate's own verdict.
  state.client_inboxes = [{
    id: 'inbox-1', client_id: CLIENT, email: 'hello@example.net', kind: 'branded', status: 'active',
    provider: 'smtp', daily_cap: 30, smtp_host: 'smtp.example.net', smtp_port: 587,
    smtp_secure: false, smtp_user: 'hello@example.net', smtp_pass_enc: 'enc', from_name: 'Example',
    verified_at: '2026-09-10T08:00:00Z', verify_failed_at: null, verify_detail: 'Connected.',
  }]
  state.programme_batches = []
  state.leads = []
  state.operator_audit_log = []
  // ⚑ 10 Sep (I4) — the outcome number the operator reads beside a programme.
  state.meetings = []
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⓪ C03 — THE CLIENT'S OWN OUTCOME REACHES THE OPERATOR
//
// 🛑 THE FACT VIDA WAS NEVER TOLD, AGAIN. `clients.outcome_stated` has existed since
// 20260910_client_stated_outcome and `vida-lifecycle-copy.ts` already TYPES `outcomeStated`
// and renders it in three places — "In their words" with the sentence beneath. But nothing
// ever supplied it: `lifecycleDetailFor` did not read the column and `vida/page.tsx` did not
// pass it. So every one of those three call sites fell to its else-branch and Vida said
// "Being agreed" / "Not stated yet" about every client in the book, including the ones who
// had said exactly what they wanted at signup.
//
// ⚠️ THE CONSUMER EXISTING IS WHAT MAKES THIS SO EASY TO MISS. Nothing is broken-looking:
// the card renders, the copy is grammatical, and the only way to tell is to know that a
// client DID state an outcome and see Vida claim otherwise.
//
// ⚠️ IT IS THE CLIENT'S SENTENCE, NOT THE PROGRAMME'S TARGET. A meeting target is agreed
// later, at Programme; this is what they said they wanted before any number existed. The two
// are different facts and Preview 07 shows them as different cards.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('⓪ C03 — the outcome the client stated in their own words', () => {
  it('🛑 reaches the operator when the client stated one', async () => {
    state.clients = [{
      id: CLIENT, proof_review_requested_at: null, proof_review_resolved_at: null,
      proof_completed_at: '2026-09-10',
      outcome_kind: 'meetings',
      outcome_stated: 'Book qualified sales meetings with founders, CEOs and MDs.',
    }]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.outcomeStated).toBe('Book qualified sales meetings with founders, CEOs and MDs.')
  })

  it('is null when the client has not stated one — never a fabricated sentence', async () => {
    state.clients = [{
      id: CLIENT, proof_review_requested_at: null, proof_review_resolved_at: null,
      proof_completed_at: '2026-09-10', outcome_stated: null,
    }]
    expect((await lifecycleDetailFor(CLIENT)).outcomeStated).toBeNull()
  })

  it('an empty or whitespace column is not a stated outcome', async () => {
    for (const v of ['', '   ']) {
      state.clients = [{
        id: CLIENT, proof_review_requested_at: null, proof_review_resolved_at: null,
        proof_completed_at: '2026-09-10', outcome_stated: v,
      }]
      expect((await lifecycleDetailFor(CLIENT)).outcomeStated, JSON.stringify(v)).toBeNull()
    }
  })

  // ⚠️ FAILS SOFT TO null, like every other read in this file. An unreadable column must not
  // blank the console, and it must not invent a sentence either — null asserts nothing.
  it('an unreadable clients table degrades to null rather than throwing', async () => {
    unreadable.add('clients')
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.outcomeStated).toBeNull()
  })

  // ── ⚠️ THE WHOLE CHAIN, NOT JUST THIS END ────────────────────────────────────────────
  //
  // 🛑 C03's DEFECT WAS A GAP BETWEEN TWO CORRECT HALVES. The copy module read
  // `outcomeStated`; the column existed; nobody joined them. A test that only proves this
  // function returns the value would have passed while Vida still said "Being agreed", so
  // the remaining legs are asserted against the real source.
  it('🛑 every leg of the plumbing exists — column → detail → page → copy', () => {
    const { readFileSync } = require('fs') as typeof import('fs')
    const { join } = require('path') as typeof import('path')
    const repo = join(__dirname, '../../../..')
    const read = (p: string) => readFileSync(join(repo, p), 'utf8')

    // ② the detail carries it
    const facts = read('apps/api/src/lib/programme-lifecycle-facts.ts')
    expect(facts).toContain('outcomeStated: string | null')
    expect(facts).toContain('async function outcomeStatedFor')

    // ③ the page passes it — the leg that was missing
    const page = read('apps/admin/src/app/vida/page.tsx')
    expect(page).toContain('outcomeStated: lc.outcomeStated ?? null')

    // ④ the copy module consumes it, and still distinguishes it from the meeting target
    const copy = read('apps/admin/src/lib/vida-lifecycle-copy.ts')
    expect(copy).toContain('outcomeStated?: string | null')
    expect(copy).toContain('i.outcomeStated')
  })

  it('it reaches the operator on a client with NO programme too', async () => {
    // ⚠️ BOTH RETURN BRANCHES. The no-programme branch is the Brief/Proof client — exactly
    // the one Preview 07 shows, and exactly the one whose outcome an operator most needs
    // before a target has been agreed.
    state.programmes = []
    state.clients = [{
      id: CLIENT, proof_review_requested_at: null, proof_review_resolved_at: null,
      proof_completed_at: null,
      outcome_stated: 'Book qualified sales meetings with founders, CEOs and MDs.',
    }]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.programme).toBeNull()
    expect(d.outcomeStated).toBe('Book qualified sales meetings with founders, CEOs and MDs.')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE DETAIL PANEL — the client an operator has actually opened
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('① a refused automatic start is reported, not rendered as work in progress', () => {
  it('🛑 THE BUG: with no continuation history at all it reads as Working', async () => {
    // The baseline. This is what EVERY stranded programme looked like, and it is still the
    // correct answer for a programme whose payment landed a second ago.
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.verdict.state).toBe('sourcing')
    expect(d.verdict.needsYou).toBe(false)
  })

  it('🛑 THE FIX: a refused start makes it an exception with the real reason', async () => {
    state.operator_audit_log = [auditRow('programme_p1_auto_refused', refusal, '2026-09-10T09:00:00Z')]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.verdict.state, 'a programme that never started still reads as working').toBe('sourcing_exception')
    expect(d.verdict.needsYou).toBe(true)
    expect(d.verdict.mode).toBe('Needs you')
    // ⚠️ THE REASON THE OPERATOR READS IS THE ONE THE REFUSAL ACTUALLY GAVE — not a generic
    // "something went wrong", which is the sentence that makes a person open a database.
    expect(d.stoppedDetail).toContain('No ICP is attached')
  })

  it('a successful start leaves it Working, because it genuinely is', async () => {
    state.operator_audit_log = [auditRow('programme_p1_auto_started', '250 prospect(s) obtained.', '2026-09-10T09:00:00Z')]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.verdict.state).toBe('sourcing')
    expect(d.verdict.needsYou).toBe(false)
  })

  it('🛑 a refusal the operator already fixed does not keep raising a task', async () => {
    state.operator_audit_log = [
      auditRow('programme_p1_auto_refused', refusal, '2026-09-10T09:00:00Z'),
      auditRow('programme_p1_auto_started', '250 prospect(s) obtained.', '2026-09-10T11:00:00Z'),
    ]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.verdict.state, 'a cleared exception is still in Needs you').toBe('sourcing')
  })

  it('🛑 a spend with no recorded outcome is stopped — it died mid-run', async () => {
    state.programme_batches = [{ id: 'b1', programme_id: PROG, seq: 1 }]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.verdict.state).toBe('sourcing_exception')
    expect(d.stoppedDetail).toContain('never recorded how it finished')
  })

  it('an unreadable audit trail invents no task', async () => {
    unreadable.add('operator_audit_log')
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.verdict.state).toBe('sourcing')
    expect(d.verdict.needsYou).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② THE BOARD — and why this one exception breaks the board's own under-count rule
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('② the LIST shows it too, because nothing else would make anybody open it', () => {
  it('🛑 a stranded programme is flagged on the row, not only in the opened panel', async () => {
    state.operator_audit_log = [auditRow('programme_p1_auto_refused', refusal, '2026-09-10T09:00:00Z')]
    const [row] = await lifecycleBoard([CLIENT])
    expect(row.state, 'the list still says Working, so nobody opens the client').toBe('sourcing_exception')
    expect(row.needs_you).toBe(true)
    expect(row.needs_you_reason).toBe('preparation_stopped')
  })

  it('a healthy programme is not flagged on the row', async () => {
    state.operator_audit_log = [auditRow('programme_p1_auto_started', 'obtained.', '2026-09-10T09:00:00Z')]
    const [row] = await lifecycleBoard([CLIENT])
    expect(row.needs_you).toBe(false)
  })

  it('🛑 and the newest outcome wins here as well', async () => {
    state.operator_audit_log = [
      auditRow('programme_p1_auto_refused', refusal, '2026-09-10T09:00:00Z'),
      auditRow('programme_p1_auto_started', 'obtained.', '2026-09-10T11:00:00Z'),
    ]
    const [row] = await lifecycleBoard([CLIENT])
    expect(row.needs_you, 'a fixed refusal keeps the badge lit for ever').toBe(false)
  })

  it('an unreadable trail leaves the board silent rather than alarmed', async () => {
    unreadable.add('operator_audit_log')
    const [row] = await lifecycleBoard([CLIENT])
    expect(row.needs_you).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ ⚑ 10 Sep (I2) — THE PANEL ASKS THE SEND GATE'S OWN QUESTION ABOUT THE SENDER
//
// 🛑 THIS SECTION EXISTS BECAUSE A MUTATION PROVED NOTHING COVERED IT. Reverting
// `senderSendableFor` to "always sendable" left every suite green, which is precisely the
// defect it was written to fix: the panel read `client_inboxes.status` and answered "yes" if
// any row was assigned or active, while `authorityFor(OUTREACH)` additionally refuses a TIE
// between equally-ranked boxes, an address live on ANOTHER client, and a mailbox nobody has
// proved can log in. A calm colour over an untested claim — the #565/#576 shape again.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('③ the sender the panel reports is the sender the gate would accept', () => {
  it('a fully proved mailbox reads as sendable, with nothing to say about it', async () => {
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.senderSendable).toBe(true)
    // ⚠️ NULL, NOT A REASSURING SENTENCE. A panel that always has a sender sentence to print
    // starts printing reassurance, and reassurance is what hid this.
    expect(d.senderDetail).toBeNull()
  })

  it('🛑 A MAILBOX NOBODY HAS PROVED CAN LOG IN IS NOT SENDABLE, and the panel says why', async () => {
    state.client_inboxes = [{ ...state.client_inboxes[0], verified_at: null }]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.senderSendable, 'the panel drew a healthy sender the send door would refuse').toBe(false)
    expect(d.senderDetail).toContain('Test connection')
  })

  it('🛑 TWO EQUALLY-RANKED MAILBOXES ARE NOT SENDABLE — an arbitrary sender is not a decision', async () => {
    state.client_inboxes = [
      state.client_inboxes[0],
      { ...state.client_inboxes[0], id: 'inbox-2', email: 'team@example.net' },
    ]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.senderSendable).toBe(false)
    expect(d.senderDetail).toContain('equally-ranked')
  })

  it('🛑 MULTIPLE VALID MAILBOXES ARE FINE when one clearly outranks the rest', async () => {
    // Founder, 10 Sep: "Do not introduce a one-mailbox-per-client rule." What must be
    // unambiguous is the PROGRAMME'S SENDER, not the size of the client's mailbox list.
    state.client_inboxes = [
      state.client_inboxes[0],
      { ...state.client_inboxes[0], id: 'inbox-2', email: 'team@example.net', kind: 'pooled' },
    ]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.senderSendable, 'a client with two good mailboxes was called broken').toBe(true)
  })

  it('an unreadable mailbox table still fails soft to sendable', async () => {
    // ⚠️ THE ONE PLACE THIS FILE DELIBERATELY DOES NOT FAIL CLOSED. A read error would raise a
    // sender alarm on every client at once, and a wall of false exceptions is how a real one
    // gets missed. The send gate itself still refuses — the panel is not the safety boundary.
    unreadable.add('client_inboxes')
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.senderSendable).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ ⚑ 10 Sep (I4) — THE PANEL'S MEETING COUNT IS THIS PROGRAMME'S, BEHAVIOURALLY
//
// 🛑 A SOURCE-SHAPE ASSERTION ALONE WAS NOT ENOUGH. `meeting-attribution.test.ts` §③ reads this
// file and checks it calls the programme-scoped accessor — useful, and it caught the mutation —
// but it proves what the code SAYS, not what the panel RENDERS. This section runs the gathering
// against two programmes on one client and reads the number back.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('④ the panel reports this programme\'s meetings and no others', () => {
  const OTHER_PROG = '33333333-3333-4333-8333-333333333333'
  const meeting = (id: string, programmeId: string | null, clientId = CLIENT): Row => ({
    id, client_id: clientId, programme_id: programmeId, campaign_id: 'camp-shared',
    state: 'BOOKED', excluded_reason: null, superseded_by: null, scheduled_at: '2026-09-01T10:00:00Z',
  })

  it('🛑 a SIBLING programme\'s meetings are not this programme\'s result', async () => {
    state.meetings = [meeting('m1', PROG), meeting('m2', OTHER_PROG), meeting('m3', OTHER_PROG)]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.counts.meetings, "another programme's meetings were counted here").toBe(1)
  })

  it('a meeting with no programme is nobody\'s result', async () => {
    // Every meeting booked before `resolveBookingAttribution` started stamping the column on
    // 9 Sep carries null. It is still counted in client-wide totals, just not here.
    state.meetings = [meeting('m1', null)]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.counts.meetings).toBe(0)
  })

  it('this programme\'s own meetings ARE counted — the scope is not a mute button', async () => {
    state.meetings = [meeting('m1', PROG), meeting('m2', PROG)]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.counts.meetings).toBe(2)
  })

  it('an unreadable meetings table renders 0 and says so in the log, never a wrong number', async () => {
    unreadable.add('meetings')
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.counts.meetings).toBe(0)
  })
})
