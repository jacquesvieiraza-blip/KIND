// ═══════════════════════════════════════════════════════════════════════════════════════
// A FRESH, NON-HOUSE PROGRAMME — the path no customer had ever walked.
//
// 🛑 WHAT THE AUDIT FOUND, AND IT WOULD HAVE STOPPED THE FIRST PAYING CLIENT DEAD. Two facts a
// programme needs before `READY_FOR_APPROVAL` had exactly ONE writer each in the whole product,
// and both writers were House's:
//
//   ① `figsy_sequences.campaign_id` — written only by `applyHouseProgrammeSequence`. Every
//      other route that puts words on a campaign writes the SENDING store
//      (`settings.sequence`, `settings.applied_sequence_id`) and leaves the canonical link
//      NULL. `resolveProgrammeChain` therefore resolved no sequence for any other programme,
//      and NULL is correctly read as "not this programme's work" — so preparation refused.
//
//   ② `programmes.send_schedule` — written only by the same House helper. NULL correctly means
//      REFUSE, and nothing generic could ever clear it.
//
// House passed the whole chain because House-specific code ran. That is the definition of a
// path that has never been walked, and it is why this file builds a fixture that has NONE of
// House's affordances: no House programme id, no House audience, no House sequence helper, no
// House schedule helper, no historical leads, no NULL-programme enrolments, no pre-existing
// campaign and no pre-existing sequence.
//
// ⚠️ THE FIXTURE'S WHOLE JOB IS TO FAIL IF HOUSE CODE IS WHAT MAKES IT PASS. `isHouseLaunchProgramme`
// answers NO for it — proved below rather than assumed — so any case that goes green here went
// green through the generic path.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})
import { join } from 'node:path'

type Row = Record<string, unknown>
const state: {
  programmes: Row[]; icps: Row[]; campaigns: Row[]; sequences: Row[]; clients: Row[]
} = { programmes: [], icps: [], campaigns: [], sequences: [], clients: [] }

/** A tiny in-memory Supabase stand-in — eq / select / insert / update / maybeSingle. */
function table(name: keyof typeof state) {
  const rows = () => state[name]
  const q: Record<string, unknown> & { _f: ((r: Row) => boolean)[] } = {
    _f: [], _mode: '', _payload: null as Row | null,
    select() { return q }, order() { return q }, limit() { return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    not(c: string, _o: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) !== v); return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    insert(p: Row) { q._mode = 'insert'; q._payload = p; return q },
    update(p: Row) { q._mode = 'update'; q._payload = p; return q },
    _hit() { return rows().filter(r => q._f.every(f => f(r))) },
    _run() {
      if (q._mode === 'insert') {
        const row = { id: `${String(name)}-${rows().length + 1}`, ...(q._payload as Row) }
        rows().push(row); return { data: row, error: null }
      }
      if (q._mode === 'update') {
        const h = q._hit(); for (const r of h) Object.assign(r, q._payload)
        return { data: h, error: null }
      }
      return { data: q._hit(), error: null, count: q._hit().length }
    },
    async maybeSingle() { return { data: q._hit()[0] ?? null, error: null } },
    async single() { return q._mode === 'insert' ? q._run() : { data: q._hit()[0] ?? null, error: null } },
    then(res: (v: unknown) => unknown) { return Promise.resolve(q._run()).then(res) },
  } as never
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(
      t === 'programmes' ? 'programmes' : t === 'icps' ? 'icps'
      : t === 'figsy_campaigns' ? 'campaigns' : t === 'figsy_sequences' ? 'sequences' : 'clients',
    ),
    rpc: async () => ({ data: null, error: null }),
  },
}))

// ⚠️ THE AUDIENCE RESOLVER ANSWERS 'client', NEVER 'house'. The real one reads the AUTH USER,
// which this stand-in has no notion of; left real, every case would take its catch and prove
// nothing. Answering 'client' is what makes the fixture genuinely non-House.
vi.mock('./provider-boundary', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  audienceForClientStrict: async () => 'client' as const,
}))

import { applyProgrammeSequence, setProgrammeSendSchedule, ensureProgrammeSendSchedule, DEFAULT_PROGRAMME_SEND_SCHEDULE } from './programme-sequence'
import { isHouseLaunchProgramme } from './house-sequence'
import { isSendSchedule } from './send-schedule'
import { preparationBlockers, onlyPreparationBlocks, type PreparationFacts } from './preparation-readiness'

const CLIENT = '11111111-1111-4111-8111-111111111111'
const PROG = '22222222-2222-4222-8222-222222222222'
const ICP = '33333333-3333-4333-8333-333333333333'
/** A DIFFERENT client's programme, used to prove nothing bleeds across the boundary. */
const OTHER_CLIENT = '44444444-4444-4444-8444-444444444444'
const OTHER_PROG = '55555555-5555-4555-8555-555555555555'

const STEPS = [
  { subject: 'One', body: 'first', wait_days: 3 },
  { subject: 'Two', body: 'second', wait_days: 4 },
  { subject: 'Three', body: 'third', wait_days: 0 },
]

function seedFresh(): void {
  state.clients.push({ id: CLIENT, company_name: 'Fresh Co' })
  state.programmes.push({
    id: PROG, client_id: CLIENT, status: 'SOURCING',
    send_schedule: null, paused_at: null,
    first_authorised_at: 'p1', second_authorised_at: null,
  })
  state.icps.push({ id: ICP, client_id: CLIENT, programme_id: PROG, name: 'Fresh ICP' })
  // A campaign exists because PREPARATION creates it — as a draft, before approval.
  state.campaigns.push({ id: 'camp-fresh', client_id: CLIENT, icp_id: ICP, status: 'draft' })
}

beforeEach(() => {
  state.programmes = []; state.icps = []; state.campaigns = []; state.sequences = []; state.clients = []
  delete process.env.HOUSE_LAUNCH_PROGRAMME_ID
  seedFresh()
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE FIXTURE IS GENUINELY NOT HOUSE
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('① nothing here can pass through House-specific code', () => {
  it('🛑 the fixture programme is NOT the House launch programme', async () => {
    expect(await isHouseLaunchProgramme(PROG, CLIENT)).toBe(false)
  })

  it('…and is still not, even if the House id is configured for a different programme', async () => {
    process.env.HOUSE_LAUNCH_PROGRAMME_ID = '99999999-9999-4999-8999-999999999999'
    expect(await isHouseLaunchProgramme(PROG, CLIENT)).toBe(false)
  })

  it('the fixture starts with no canonical sequence and no schedule — the real fresh state', () => {
    expect(state.sequences).toHaveLength(0)
    expect(isSendSchedule(state.programmes[0].send_schedule)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② THE CANONICAL SEQUENCE — CRITICAL 1
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('② a fresh programme can obtain its canonical sequence', () => {
  it('🛑 writes exactly one row, bound to the programme\'s own campaign', async () => {
    const r = await applyProgrammeSequence(PROG, STEPS, 'Fresh sequence')
    expect(r.ok, r.ok ? '' : r.reason).toBe(true)
    if (!r.ok) return
    expect(r.created).toBe(true)
    expect(r.campaignId).toBe('camp-fresh')
    expect(state.sequences).toHaveLength(1)
    // 🛑 THE LINK THAT WAS MISSING. NULL here is what made every non-House programme unreachable.
    expect(state.sequences[0].campaign_id).toBe('camp-fresh')
    expect(state.sequences[0].client_id).toBe(CLIENT)
  })

  it('numbers the steps from their order, and preserves everything else about them', async () => {
    await applyProgrammeSequence(PROG, [{ subject: 'a', body: 'b', wait_days: 2, channel: 'email' }])
    const steps = state.sequences[0].steps as Record<string, unknown>[]
    expect(steps[0].step).toBe(1)
    expect(steps[0].channel, 'a field the caller carried was dropped').toBe('email')
  })

  it('🛑 IDEMPOTENT — a second apply updates the same row, never adds a rival', async () => {
    await applyProgrammeSequence(PROG, STEPS)
    await applyProgrammeSequence(PROG, STEPS)
    await applyProgrammeSequence(PROG, STEPS)
    expect(state.sequences, 'a rival canonical sequence was created').toHaveLength(1)
  })

  it('a later apply replaces the words rather than appending them', async () => {
    await applyProgrammeSequence(PROG, STEPS)
    await applyProgrammeSequence(PROG, [{ subject: 'only', body: 'one', wait_days: 0 }])
    expect(state.sequences).toHaveLength(1)
    expect((state.sequences[0].steps as unknown[]).length).toBe(1)
  })

  it('🛑 refuses when the campaign already carries two — ambiguity is reported, not resolved', async () => {
    state.sequences.push({ id: 's1', client_id: CLIENT, campaign_id: 'camp-fresh', steps: [] })
    state.sequences.push({ id: 's2', client_id: CLIENT, campaign_id: 'camp-fresh', steps: [] })
    const r = await applyProgrammeSequence(PROG, STEPS)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('ambiguous')
    expect(state.sequences, 'a third row was added to an already-ambiguous campaign').toHaveLength(2)
  })

  it('🛑 refuses rather than creating a campaign — preparation owns that object', async () => {
    state.campaigns = []
    const r = await applyProgrammeSequence(PROG, STEPS)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('no campaign yet')
    expect(state.campaigns, 'the sequence writer created a campaign').toHaveLength(0)
  })

  it('refuses an empty sequence', async () => {
    const r = await applyProgrammeSequence(PROG, [])
    expect(r.ok).toBe(false)
    expect(state.sequences).toHaveLength(0)
  })

  it('🛑 NO CROSS-CLIENT BLEED — another client\'s programme gets its own row, never this one', async () => {
    state.clients.push({ id: OTHER_CLIENT, company_name: 'Other Co' })
    state.programmes.push({ id: OTHER_PROG, client_id: OTHER_CLIENT, status: 'SOURCING', send_schedule: null, paused_at: null })
    state.icps.push({ id: 'icp-other', client_id: OTHER_CLIENT, programme_id: OTHER_PROG })
    state.campaigns.push({ id: 'camp-other', client_id: OTHER_CLIENT, icp_id: 'icp-other', status: 'draft' })

    await applyProgrammeSequence(PROG, STEPS)
    await applyProgrammeSequence(OTHER_PROG, [{ subject: 'x', body: 'y', wait_days: 1 }])

    expect(state.sequences).toHaveLength(2)
    const mine = state.sequences.find(s => s.campaign_id === 'camp-fresh')!
    const theirs = state.sequences.find(s => s.campaign_id === 'camp-other')!
    expect(mine.client_id).toBe(CLIENT)
    expect(theirs.client_id).toBe(OTHER_CLIENT)
    expect((mine.steps as unknown[]).length).toBe(3)
    expect((theirs.steps as unknown[]).length).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ THE SEND SCHEDULE — CRITICAL 2
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('③ a fresh programme can obtain its send schedule', () => {
  it('the canonical default is itself a valid schedule', () => {
    expect(isSendSchedule(DEFAULT_PROGRAMME_SEND_SCHEDULE)).toBe(true)
  })

  it('🛑 NULL still means REFUSE — the safety rule is untouched', () => {
    expect(isSendSchedule(null)).toBe(false)
    expect(isSendSchedule(undefined)).toBe(false)
    expect(isSendSchedule({})).toBe(false)
  })

  it('an operator schedule is validated by the same predicate the gate uses', async () => {
    const bad = await setProgrammeSendSchedule(PROG, { days: [], start: '09:00', end: '17:00', default_tz: 'Europe/London' })
    expect(bad.ok, 'a schedule with no days was accepted').toBe(false)
    const worse = await setProgrammeSendSchedule(PROG, { days: [1], start: '9am', end: '17:00', default_tz: 'Europe/London' })
    expect(worse.ok, 'a malformed time was accepted').toBe(false)
    expect(isSendSchedule(state.programmes[0].send_schedule), 'a refused schedule was written anyway').toBe(false)
  })

  it('a valid operator schedule is stored on the exact programme', async () => {
    const r = await setProgrammeSendSchedule(PROG, { days: [2, 4], start: '10:00', end: '16:00', default_tz: 'Europe/Dublin' })
    expect(r.ok).toBe(true)
    expect(isSendSchedule(state.programmes[0].send_schedule)).toBe(true)
    expect((state.programmes[0].send_schedule as { days: number[] }).days).toEqual([2, 4])
  })

  it('🛑 `ensure` FILLS AN ABSENCE AND NEVER OVERWRITES A CHOICE', async () => {
    await setProgrammeSendSchedule(PROG, { days: [3], start: '11:00', end: '12:00', default_tz: 'Europe/Dublin' })
    await ensureProgrammeSendSchedule(PROG)
    // The operator narrowed the window; a later ensure must not widen it back to the default.
    expect((state.programmes[0].send_schedule as { days: number[] }).days).toEqual([3])
    expect((state.programmes[0].send_schedule as { start: string }).start).toBe('11:00')
  })

  it('…and does fill one when there is genuinely none', async () => {
    const r = await ensureProgrammeSendSchedule(PROG)
    expect(r.ok).toBe(true)
    expect(state.programmes[0].send_schedule).toEqual(DEFAULT_PROGRAMME_SEND_SCHEDULE)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ WHAT VIDA MAY OFFER — the button must be able to succeed
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('④ Vida never offers an action that cannot clear the blocker', () => {
  const facts = (over: Partial<PreparationFacts>): PreparationFacts => ({
    programmeId: PROG, programmeStatus: 'SOURCING', paused: false,
    attachedIcpId: ICP, batchId: 'b', reviewableLeads: 250,
    campaignId: null, campaignProgrammeLinked: false,
    sequenceId: null, sequenceCampaignLinked: false,
    messageSteps: 0, cadenceConfigured: false, sendScheduleConfigured: false,
    senderAssigned: true, eligibleEnrolments: 0, foreignEnrolments: 0, snapshotSupported: false,
    ...over,
  })

  // ⛓️ RETARGETED 9 Sep (later the same day). This read "🛑 a fresh programme with no sequence
  // is NOT preparable", on the reasoning that *preparation cannot author words* — true that
  // morning, and the reason the founder saw a dead button on the fresh-client path.
  //
  // 🛑 THE RULE THIS SECTION PROTECTS IS UNCHANGED: **Vida never offers an action that cannot
  // clear the blocker.** What changed is what preparation can do. It now writes any programme's
  // sequence from that client's own knowledge, approved brief and qualified audience, and sets
  // the default schedule — so for THIS scenario the control can succeed, and hiding it would be
  // the new version of the same defect: a fresh client stuck behind a button nobody drew.
  //
  // The "cannot succeed" half of the rule is still asserted, below, on `no_sender` — a mailbox
  // is something a human must connect and no amount of preparation will produce it.
  it('a fresh programme with no sequence IS preparable — preparation writes one', () => {
    const b = preparationBlockers(facts({}))
    expect(b.map(x => x.code), 'the sequence blocker is not present, so this proves nothing').toContain('no_sequence')
    expect(onlyPreparationBlocks(b)).toBe(true)
  })

  it('once its sequence and schedule exist, it IS preparable — with no House affordance', () => {
    const b = preparationBlockers(facts({
      sequenceId: 's', sequenceCampaignLinked: true, messageSteps: 3,
      cadenceConfigured: true, sendScheduleConfigured: true,
    }))
    expect(b.map(x => x.code).sort()).toEqual(['no_campaign', 'no_eligible_enrolments', 'no_snapshot'])
    expect(onlyPreparationBlocks(b), 'the generic path cannot reach preparable').toBe(true)
  })

  it('🛑 a missing sender still fails closed, sequence or no sequence', () => {
    const b = preparationBlockers(facts({
      sequenceId: 's', sequenceCampaignLinked: true, messageSteps: 3,
      cadenceConfigured: true, sendScheduleConfigured: true, senderAssigned: false,
    }))
    expect(b.map(x => x.code)).toContain('no_sender')
    expect(onlyPreparationBlocks(b), 'a programme with no mailbox was called preparable').toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ THE WIRING — one writer, and the seams that feed it
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('⑤ there is one canonical writer, and House uses it too', () => {
  const LIB = __dirname
  const strip = (s: string) => s.split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
  const HOUSE = strip(readFileSync(join(LIB, 'house-sequence.ts'), 'utf8'))
  const GEN = readFileSync(join(LIB, 'programme-sequence.ts'), 'utf8')
  const FIGSY_ROUTE = strip(readFileSync(join(LIB, '..', 'routes', 'figsy.ts'), 'utf8'))
  const OP_ROUTE = strip(readFileSync(join(LIB, '..', 'routes', 'operator.ts'), 'utf8'))
  const PROGRAMME = strip(readFileSync(join(LIB, 'programme.ts'), 'utf8'))

  it('🛑 House no longer writes the canonical row itself — it delegates', () => {
    expect(HOUSE).toContain('applyProgrammeSequence(programmeId, steps')
    expect(HOUSE.includes("db.from('figsy_sequences')"),
      'House writes the canonical sequence directly again — two implementations to drift').toBe(false)
  })

  it('the generic writer is the only place `campaign_id` is bound to a sequence', () => {
    expect(GEN).toContain('campaign_id: campaignId')
    // Nothing else in lib/ may write that link.
    //
    // ⚠️ SCOPED TO THE SEQUENCES TABLE, not to the words `campaign_id`. A bare search matched an
    // RPC parameter in `figsy.ts` and the enrolment/message inserts in `seed-showcase.ts` —
    // three legitimate uses of the same column name on entirely different tables. The rule is
    // about the CANONICAL SEQUENCE's link and nothing else.
    const { readdirSync } = require('node:fs') as typeof import('node:fs')
    const offenders: string[] = []
    for (const f of readdirSync(LIB)) {
      if (!f.endsWith('.ts') || f.endsWith('.test.ts') || f === 'programme-sequence.ts') continue
      const body = strip(readFileSync(join(LIB, f), 'utf8'))
      for (const m of [...body.matchAll(/from\('figsy_sequences'\)/g)]) {
        const stmt = body.slice(m.index ?? 0, (m.index ?? 0) + 400)
        // A read may filter on it; only an insert/update may not WRITE it.
        if (/\.(insert|update)\(/.test(stmt) && /campaign_id/.test(stmt)) { offenders.push(f); break }
      }
    }
    expect(offenders, `these write the canonical link directly: ${offenders.join(', ')}`).toEqual([])
  })

  it('applying a library sequence to a PROGRAMME campaign keeps the canonical store in step', () => {
    expect(FIGSY_ROUTE).toContain("await import('../lib/programme-sequence')")
    expect(FIGSY_ROUTE).toContain('applyProgrammeSequence(programmeId, steps as never')
    // 🛑 PROGRAMME-NESS IS PROVED THROUGH THE CAMPAIGN'S OWN ICP, never assumed from the client.
    expect(FIGSY_ROUTE).toContain("db.from('icps')")
    expect(FIGSY_ROUTE).toContain("select('programme_id')")
  })

  it('the operator has a door for both facts', () => {
    expect(OP_ROUTE).toContain("operatorRouter.post('/programme/:programmeId/sequence'")
    expect(OP_ROUTE).toContain("operatorRouter.post('/programme/:programmeId/send-schedule'")
    expect(OP_ROUTE).toContain('programme_sequence_set')
    expect(OP_ROUTE).toContain('programme_send_schedule_set')
  })

  it('every programme is created with a schedule, so preparation never has to ask', () => {
    expect(PROGRAMME).toContain('send_schedule: DEFAULT_PROGRAMME_SEND_SCHEDULE')
  })

  it('🛑 and nothing invents a schedule AT SEND TIME', () => {
    const SEND = strip(readFileSync(join(LIB, 'send-due.ts'), 'utf8'))
    const CORE = strip(readFileSync(join(LIB, 'figsy.ts'), 'utf8'))
    for (const src of [SEND, CORE]) {
      expect(src.includes('DEFAULT_PROGRAMME_SEND_SCHEDULE'),
        'a schedule default reached the send path — NULL must still mean refuse there').toBe(false)
    }
  })
})
