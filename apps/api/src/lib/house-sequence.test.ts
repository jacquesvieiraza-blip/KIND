// ═══════════════════════════════════════════════════════════════════════════════════════
// THE APPROVED HOUSE SEQUENCE — verbatim, five steps, and it survives the send path.
//
// 🛑 THE DEFECT THIS SUITE EXISTS BECAUSE OF, FOUND BEFORE DEPLOY. `sequence-apply.ts` filters
// every stored sequence through `emailSteps`, which keeps only `channel === 'email'`. The
// canonical steps `programme-chain.ts` resolved carried no `channel`, so they were filtered to
// NOTHING — `buildDraftFromSequence` returned null, `usingSequence` went false, and
// `autoEnrollLead` fell through to the **AI draft path**. The enrolment would have carried
// `sequence_id` pointing at the approved words while containing words a model invented, and
// every guard downstream would have been satisfied by it.
//
// ⚠️ SO THE CENTRAL CASE HERE IS NOT "are the words right" — it is "do the approved words
// actually reach an enrolment". Content that is correct and unreachable is the more dangerous
// of the two failures, because it looks finished.
//
// ⚠️ AND THE COPY IS ASSERTED VERBATIM. These are the founder's own sentences; a paraphrase
// that reads the same is a different message going to a real person.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

// ── THE WRITE RECORDER, for section ⑦ ────────────────────────────────────────────────
//
// ⚠️ EVERY WRITE IS RECORDED AND NONE IS PERFORMED. The question section ⑦ asks is not "what
// did the function return" — a refusal that returned `ok: false` AFTER writing the row would
// satisfy a return-value assertion and still have put the approved copy in the wrong campaign.
// So the assertion is on `writes`, and the reads are a fixture that resolves a full chain for
// ANY programme id: nothing about the chain is allowed to be the reason a rival is refused.
const writes: { table: string; op: 'insert' | 'update'; payload: unknown }[] = []
/** null ⟹ the campaign has no sequence yet, so the seed path is genuinely open. */
let existingSequence: Record<string, unknown> | null = null

vi.mock('@kind/db', () => {
  const q = (table: string): Record<string, unknown> => {
    const self: any = {
      _mode: null as null | 'insert' | 'update', _payload: null as unknown,
      select() { return self },
      eq() { return self },
      insert(p: unknown) { self._mode = 'insert'; self._payload = p; return self },
      update(p: unknown) { self._mode = 'update'; self._payload = p; return self },
      async maybeSingle() {
        if (table === 'programmes') return { data: { id: 'any', client_id: 'house' }, error: null }
        return { data: null, error: null }
      },
      async single() {
        if (self._mode) { writes.push({ table, op: self._mode, payload: self._payload }) }
        return { data: { id: 'seq-written' }, error: null }
      },
      _rows() {
        if (table === 'icps') return [{ id: 'icp1', client_id: 'house' }]
        if (table === 'figsy_campaigns') return [{ id: 'camp1', client_id: 'house', settings: null }]
        if (table === 'figsy_sequences') return existingSequence ? [existingSequence] : []
        return []
      },
      then(res: (v: unknown) => unknown) {
        if (self._mode) writes.push({ table, op: self._mode, payload: self._payload })
        return Promise.resolve({ data: self._mode ? [] : self._rows(), error: null }).then(res)
      },
    }
    return self
  }
  return { db: { from: (t: string) => q(t) } }
})

/** The audience half of the gate, driveable — the real resolver needs an auth user. */
let audience: 'house' | 'client' | 'throw' = 'house'
vi.mock('./provider-boundary', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  audienceForClientStrict: async () => {
    if (audience === 'throw') throw new Error('identity could not be proved')
    return audience
  },
}))

import {
  HOUSE_SEQUENCE_STEPS, HOUSE_CADENCE, HOUSE_SEND_SCHEDULE,
  houseLaunchProgrammeId, isHouseLaunchProgramme, applyHouseProgrammeSequence,
} from './house-sequence'
import { emailSteps, buildDraftStepsFromSequence, applyTokens, MAX_SEQUENCE_STEPS } from './sequence-apply'
import { cadenceIsConfigured } from './preparation-readiness'
import { maySendNow, isSendSchedule } from './send-schedule'

// ── ① THE WORDS, VERBATIM ────────────────────────────────────────────────────────────

describe('① five steps, each with a distinct job, exactly as approved', () => {
  it('there are exactly five, and the platform can carry them', () => {
    expect(HOUSE_SEQUENCE_STEPS).toHaveLength(5)
    expect(MAX_SEQUENCE_STEPS, 'the shared cap is below the approved length').toBeGreaterThanOrEqual(5)
  })

  it('🛑 the subjects are the approved subjects', () => {
    expect(HOUSE_SEQUENCE_STEPS.map(s => s.subject)).toEqual([
      "{{first_name}}, who's building your pipeline this quarter?",
      'How this actually works',
      'Why outbound usually stops',
      // ⛓️ CORRECTED BY THE FOUNDER: "before it exists" was logically wrong — the work exists,
      // and what is being approved is that it goes OUT.
      'You approve it before it goes out',
      'Closing the loop, {{first_name}}',
    ])
  })

  it('🛑 each body carries its approved opening sentence', () => {
    const opens = HOUSE_SEQUENCE_STEPS.map(s => s.body.split('\n')[0])
    expect(opens[0]).toBe("Hi {{first_name}} — if your senior people are still spending time finding prospects, they're doing work M&V can take off their plate.")
    expect(opens[1]).toBe('Two halves.')
    expect(opens[2]).toBe('Outbound usually becomes difficult when the list drifts, follow-up stops after one email, or whoever owns it gets pulled onto something more urgent.')
    expect(opens[3]).toBe("Nothing goes out that you haven't seen.")
    expect(opens[4]).toBe("I'll leave it here.")
  })

  it('🛑 no fabricated proof, ROI, meeting counts or customer names', () => {
    const all = HOUSE_SEQUENCE_STEPS.map(s => `${s.subject} ${s.body}`).join(' ').toLowerCase()
    for (const banned of ['case study', 'roi', '% more', 'x more', 'guarantee', 'guaranteed',
                          'meetings booked', 'our clients see', 'average client', 'ai-powered']) {
      expect(all, `the approved copy claims "${banned}", which we cannot substantiate`).not.toContain(banned)
    }
  })

  it('the tokens used are ones the substituter actually resolves', () => {
    const used = new Set<string>()
    for (const s of HOUSE_SEQUENCE_STEPS) {
      for (const m of `${s.subject} ${s.body}`.matchAll(/\{\{\s*([\w]+)\s*\}\}/g)) used.add(m[1])
    }
    expect([...used].sort()).toEqual(['company', 'first_name'])
    // Proved by substituting, not by reading the map: a token that renders as an empty string
    // leaves "Hi ," in somebody's inbox.
    const lead = { first_name: 'Ada', last_name: 'Lovelace', company: 'Northwind' }
    for (const s of HOUSE_SEQUENCE_STEPS) {
      const out = `${applyTokens(s.subject, lead)} ${applyTokens(s.body, lead)}`
      expect(out, 'a literal token reached the rendered message').not.toContain('{{')
    }
    expect(applyTokens(HOUSE_SEQUENCE_STEPS[0].subject, lead)).toBe("Ada, who's building your pipeline this quarter?")
    expect(applyTokens(HOUSE_SEQUENCE_STEPS[1].body, lead)).toContain('for Northwind?')
  })
})

// ── ② THEY SURVIVE THE SEND PATH ─────────────────────────────────────────────────────

describe('② the approved words actually reach an enrolment', () => {
  it('🛑 every step is an EMAIL step — without it the whole sequence is filtered away', () => {
    // `emailSteps` keeps only `channel === 'email'`. A sequence filtered to nothing does not
    // fail: it silently becomes an AI draft, with the approved sequence id still on the row.
    expect(HOUSE_SEQUENCE_STEPS.every(s => s.channel === 'email')).toBe(true)
    expect(emailSteps(HOUSE_SEQUENCE_STEPS as never), 'the approved sequence is dropped by the send path')
      .toHaveLength(5)
  })

  it('🛑 and the enrolment step array built from them is all five, in order, tokenised', () => {
    const built = buildDraftStepsFromSequence(
      HOUSE_SEQUENCE_STEPS as never,
      { first_name: 'Ada', last_name: 'Lovelace', company: 'Northwind' },
    )
    expect(built, 'the approved sequence produces fewer steps than were approved').toHaveLength(5)
    expect(built[0].subject).toBe("Ada, who's building your pipeline this quarter?")
    expect(built[3].subject).toBe('You approve it before it goes out')
    expect(built.map(s => s.wait_days)).toEqual([3, 4, 5, 6, 0])
  })

  it('🛑 the CHAIN preserves the channel too — that is where it was being dropped', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const CHAIN = readFileSync(join(__dirname, './programme-chain.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
    expect(CHAIN, 'the resolved steps lose their channel again, and the send path drops them all')
      .toContain('out.push({ channel, subject, body, wait_days: wait })')
    // An absent channel defaults to email: a stored step with a subject and a body IS an email
    // step, and refusing one for a missing discriminator empties a real sequence.
    expect(CHAIN).toContain("(ch === 'linkedin' || ch === 'call' || ch === 'whatsapp') ? ch : 'email' as const")
  })
})

// ── ③ CADENCE AND SCHEDULE ───────────────────────────────────────────────────────────

describe('③ Day 0 · 3 · 7 · 12 · 18, Mon–Fri, 08:30–17:00 recipient-local', () => {
  // 🛑 THE ASSERTION IS ON THE DAYS, BECAUSE THE DAYS ARE THE PRODUCT DECISION.
  //
  // The founder locked the cadence twice — as `[0,3,4,5,6]` and as "Day 0 · 3 · 7 · 12 · 18" —
  // and the two disagree under this product's own semantics. `send-due.ts` passes the CURRENT
  // step's `wait_days` as `waitDaysNext`, so the value is the wait AFTER that step; persisting
  // `[0,3,4,5,6]` literally would wait ZERO days after step 1 and put two emails in the same
  // prospect's inbox on day one. The days are unambiguous, so the days are what is honoured.
  it('🛑 the persisted waits produce the approved DAYS: 0 · 3 · 7 · 12 · 18', () => {
    const days: number[] = []
    let acc = 0
    for (const w of HOUSE_CADENCE) { days.push(acc); acc += w }
    expect(days, 'the persisted cadence no longer produces the approved send days').toEqual([0, 3, 7, 12, 18])
    // And the encoding that produces them, stated so a change to either is visible in the diff.
    expect(HOUSE_CADENCE).toEqual([3, 4, 5, 6, 0])
  })

  it('🛑 NO TWO STEPS LAND ON THE SAME DAY — the failure the literal array would have caused', () => {
    const days: number[] = []
    let acc = 0
    for (const w of HOUSE_CADENCE) { days.push(acc); acc += w }
    expect(new Set(days).size, 'two messages reach the same prospect on the same day').toBe(days.length)
    // Every gap is a real gap: a zero wait between real steps is a burst, not a cadence.
    expect(HOUSE_CADENCE.slice(0, -1).every(w => w > 0)).toBe(true)
  })

  it('and readiness accepts it as a real configured cadence', () => {
    expect(cadenceIsConfigured(HOUSE_CADENCE)).toBe(true)
  })

  it('🛑 the schedule is Mon–Fri 08:30–17:00 and is well-formed', () => {
    expect(HOUSE_SEND_SCHEDULE).toEqual({ days: [1, 2, 3, 4, 5], start: '08:30', end: '17:00', default_tz: 'Europe/London' })
    expect(isSendSchedule(HOUSE_SEND_SCHEDULE)).toBe(true)
  })

  it('🛑 and under it, no unplaced American is reached at 05:30 Pacific', () => {
    // 12:30 UTC = 08:30 New York = 05:30 Los Angeles. The intersection refuses it.
    expect(maySendNow(HOUSE_SEND_SCHEDULE, new Date('2026-09-09T12:30:00Z'), { country: 'United States' }).allowed).toBe(false)
    // A UK morning is fine, and the US intersection opens later in the day.
    expect(maySendNow(HOUSE_SEND_SCHEDULE, new Date('2026-09-09T08:00:00Z'), { country: 'United Kingdom' }).allowed).toBe(true)
    expect(maySendNow(HOUSE_SEND_SCHEDULE, new Date('2026-09-09T18:30:00Z'), { country: 'United States' }).allowed).toBe(true)
    // Weekends refuse under the approved schedule.
    expect(maySendNow(HOUSE_SEND_SCHEDULE, new Date('2026-09-12T10:00:00Z'), { country: 'United Kingdom' }).allowed).toBe(false)
  })
})

// ── ④ THE APPLY GRANTS NOTHING AND RUNS BY ITSELF NOWHERE ────────────────────────────

describe('④ persisting the words is not approving, sending or scheduling anything', () => {
  const src = (async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    return readFileSync(join(__dirname, './house-sequence.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
  })()

  it('🛑 it writes two rows and nothing else', async () => {
    const SRC = await src
    for (const banned of ["status: 'APPROVED'", "status: 'LIVE'", 'approved_at', 'second_authorised_at',
                          'went_live_at', 'markReadyForApproval', 'autoEnrollLead', 'sendSequenceEmail',
                          'ensureCampaignForIcp', 'review_preparation_hash']) {
      expect(SRC, `the apply reaches ${banned}`).not.toContain(banned)
    }
    // Exactly two update targets: the canonical sequence, and the programme's schedule.
    //
    // ⛓️ RETARGETED 9 Sep — the sequence WRITE moved to `applyProgrammeSequence`, the single
    // generic writer every programme now uses. This file was the only thing in the product that
    // set `figsy_sequences.campaign_id`, which is precisely why House could reach
    // READY_FOR_APPROVAL and no paying client could. The duty is unchanged: House writes the
    // canonical sequence and the schedule, and nothing else.
    expect(SRC).toContain('applyProgrammeSequence(programmeId, steps')
    expect(SRC).toContain('send_schedule: HOUSE_SEND_SCHEDULE')
    // 🛑 AND NOT THE LEGACY STORE. Writing the words into campaign settings too would recreate
    // the dual truth this package spent a whole pass removing.
    expect(SRC, 'the words are being written into the campaign settings copy as well')
      .not.toContain("db.from('figsy_campaigns')")
  })

  // ⛓️ REVERSED 8 Sep BY THE FOUNDER, AND THE REVERSAL IS THE POINT. This case used to assert
  // that NOTHING called the helper. That design required a human to run preparation, notice the
  // refusal, remember to apply the sequence, and run preparation again — *"a production path
  // that depends on someone manually invoking a magic call order"*. The orchestrator owns the
  // order now. What must still be true is that there is exactly ONE caller and it is that
  // orchestrator: a second caller is a second preparation system.
  it('🛑 7 · exactly one caller, and it is the preparation orchestrator', async () => {
    const { readdirSync, readFileSync } = await import('fs')
    const { join } = await import('path')
    const roots = [__dirname, join(__dirname, '../routes')]
    const callers: string[] = []
    for (const dir of roots) {
      for (const f of readdirSync(dir)) {
        if (!f.endsWith('.ts') || f.endsWith('.test.ts') || f === 'house-sequence.ts') continue
        // ⛓️ RETARGETED 9 Sep — EXECUTABLE LINES ONLY. `programme-sequence.ts` explains, in
        // its header, that House now delegates to it; a bare file search read that sentence as
        // a second caller. The duty — one caller, and it is the preparation orchestrator — is
        // unchanged.
        const body = readFileSync(join(dir, f), 'utf8')
          .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
        if (body.includes('applyHouseProgrammeSequence')) callers.push(f)
      }
    }
    expect(callers, `applyHouseProgrammeSequence is invoked by: ${callers.join(', ')}`)
      .toEqual(['programme-preparation.ts'])
  })

  it('🛑 it refuses rather than creating a campaign', async () => {
    const SRC = await src
    // ⛓️ RETARGETED 9 Sep — the campaign refusal moved with the write, into the generic
    // `applyProgrammeSequence`. It is asserted there, and House still surfaces its reason.
    const { readFileSync: rf } = await import('fs')
    const { join: jn } = await import('path')
    const GEN = rf(jn(__dirname, 'programme-sequence.ts'), 'utf8')
    expect(GEN).toContain('if (!campaignId) {')
    expect(GEN, 'the generic writer creates a campaign instead of refusing')
      .not.toContain('ensureCampaignForIcp')
    // The operator-facing sentence moved with the refusal, and still names the fix.
    expect(GEN).toContain('Prepare the programme first')
  })

  it('🛑 it is idempotent — a second run updates, it does not add a rival sequence', async () => {
    const SRC = await src
    // ⛓️ RETARGETED 9 Sep — idempotency moved into the generic writer with the write itself.
    // It is now STRONGER than the rule this case pinned: the generic writer updates the row
    // that exists, and REFUSES outright if it ever finds two, because a campaign carrying two
    // canonical sequences is a programme `resolveProgrammeChain` will not resolve at all.
    const { readFileSync: rf2 } = await import('fs')
    const { join: jn2 } = await import('path')
    const GEN2 = rf2(jn2(__dirname, 'programme-sequence.ts'), 'utf8')
    expect(GEN2).toContain('if (rows[0]) {')
    expect(GEN2).toContain('rows.length > 1')
    expect(GEN2).toContain("campaign_id: campaignId")
    // A rival sequence on one campaign is exactly what `resolveProgrammeChain` refuses to
    // choose between, so creating one would BREAK the programme rather than duplicate it.
  })
})

// ── ⑤ THE ORCHESTRATOR OWNS THE ORDER ────────────────────────────────────────────────
//
// 🛑 THE HAZARD: preparation creates the campaign and then requires the sequence. Left as two
// manual steps, the only way through was run-preparation → remember-to-apply → run-again. A
// production path that depends on somebody remembering a magic call order is a path that will
// one day be run in the wrong order, and the wrong order here means enrolments built from
// words nobody approved.

describe('⑤ the canonical sequence exists before anyone is enrolled', () => {
  const PREP = (() => {
    const { readFileSync } = require('fs') as typeof import('fs')
    const { join } = require('path') as typeof import('path')
    return readFileSync(join(__dirname, './programme-preparation.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
  })()

  it('🛑 7 · the helper is REACHABLE from production preparation — not an orphan', () => {
    expect(PREP, 'applyHouseProgrammeSequence is an orphan again; production depends on a manual call')
      .toContain("await import('./house-sequence')")
    expect(PREP).toContain('await applyHouseProgrammeSequence(programmeId)')
  })

  it('🛑 3 · and it runs BEFORE the enrolment loop, after the campaign', () => {
    const campaignAt = PREP.indexOf('const camp = await ensureCampaignForIcp(')
    const applyAt = PREP.indexOf('await applyHouseProgrammeSequence(programmeId)')
    const enrolAt = PREP.indexOf('await autoEnrollLead(lead.id, p.client_id')
    expect(campaignAt).toBeGreaterThan(-1)
    expect(applyAt, 'the sequence is applied before the campaign it must attach to').toBeGreaterThan(campaignAt)
    expect(enrolAt, 'enrolment happens before the canonical sequence exists').toBeGreaterThan(applyAt)
  })

  // ⛓️ REWRITTEN 8 Sep — THE GATE THIS ASSERTED WAS TOO WIDE, and the founder caught it. It read
  // `audienceForClientStrict(p.client_id) === 'house'`, which proves a CLASSIFICATION: every
  // House programme satisfies it, including a second one created next month and every historical
  // one. The behavioural proof that the seed reaches exactly ONE programme is
  // `programme-preparation.test.ts ⑩`; what remains here is the structural half — that the
  // orchestrator asks the two-fact question rather than any single-fact one.
  it('🛑 8 · the orchestrator asks for the exact programme, not for a classification', () => {
    expect(PREP, 'the seed is gated on something other than the two-fact identity')
      .toContain('if (await isHouseLaunchProgramme(programmeId, p.client_id)) {')
    // ⚠️ AND NOT ON ANY OF THE SIGNALS THAT MATCH MORE THAN ONE PROGRAMME. Each of these was a
    // plausible way to answer "is this the launch programme?" and each is wrong: the audience
    // matches every House programme, `HOUSE_CLIENT_ID` is a parked variable about a different
    // path entirely, and a name or a created-at ordering matches whatever was typed or created
    // last.
    //
    // ⚠️ BOUNDED TO THE SEED BLOCK, NOT THE FILE. A whole-file `not.toContain('p.name')` reads
    // `icp.name` on the campaign line 90 lines above and fails while the code is right — an
    // assertion that cannot be satisfied teaches people to weaken it.
    const from = PREP.indexOf('if (!chainRes.chain.sequenceId || chainRes.chain.steps.length === 0) {')
    expect(from, 'the seed block is gone').toBeGreaterThan(-1)
    const block = PREP.slice(from, PREP.indexOf('cadenceIsConfigured', from))
    expect(block).toContain('isHouseLaunchProgramme(programmeId, p.client_id)')
    for (const inferred of ["audienceForClientStrict", 'HOUSE_CLIENT_ID', 'p.name', 'created_at']) {
      expect(block, `the seed gate infers identity from ${inferred}`).not.toContain(inferred)
    }
  })

  it('🛑 it only SEEDS — an existing sequence is never overwritten', () => {
    const at = PREP.indexOf('let isHouse = false')
    const guard = PREP.slice(Math.max(0, at - 400), at)
    expect(guard).toContain('if (!chainRes.chain.sequenceId || chainRes.chain.steps.length === 0) {')
  })

  it('🛑 6 · a NON-house programme with no sequence still REFUSES — no copy, no AI draft', () => {
    const at = PREP.indexOf('This programme has no canonical sequence with message steps')
    expect(at, 'the refusal for a customer programme with no sequence is gone').toBeGreaterThan(-1)
    expect(PREP.slice(at - 200, at)).toContain('if (!chainRes.chain.sequenceId')
  })

  it('🛑 10 · and the cadence is validated before anybody is enrolled', () => {
    const cadenceAt = PREP.indexOf('cadenceIsConfigured(chainRes.chain.cadence)')
    const enrolAt = PREP.indexOf('await autoEnrollLead(lead.id, p.client_id')
    expect(cadenceAt, 'the cadence is no longer validated during preparation').toBeGreaterThan(-1)
    expect(enrolAt).toBeGreaterThan(cadenceAt)
  })

  it('the re-resolve is a READ of what was stored, not an assumption that it was', () => {
    const at = PREP.indexOf('await applyHouseProgrammeSequence(programmeId)')
    expect(PREP.slice(at, at + 500)).toContain('chainRes = await resolveProgrammeChain(programmeId)')
  })
})

// ── ⑥ THE CADENCE ARITHMETIC, AS THE SEND LOOP ACTUALLY DOES IT ──────────────────────

describe('⑥ [3,4,5,6,0] really does produce Day 0 · 3 · 7 · 12 · 18', () => {
  /**
   * The executable calculation, mirroring the send loop: step N is sent, and the NEXT send is
   * scheduled `wait_days` of the step just sent from now (`send-due.ts` passes the current
   * step's `wait_days` as `waitDaysNext`; `sendSequenceEmailCore` does
   * `Date.now() + waitDays * 86400000`).
   */
  function sendDays(waits: readonly number[]): number[] {
    const days: number[] = []
    let today = 0
    for (let step = 1; step <= waits.length; step++) {
      days.push(today)                 // this step goes out today
      today += waits[step - 1]         // the next one is scheduled that many days out
    }
    return days
  }

  it('🛑 1 · the approved waits give the approved days', () => {
    expect(sendDays(HOUSE_CADENCE)).toEqual([0, 3, 7, 12, 18])
  })

  it('🛑 2 · and the LITERAL array would put two emails in one inbox on Day 0', () => {
    // Kept as an executable demonstration rather than a claim: [0,3,4,5,6] waits ZERO days
    // after step 1, so steps 1 and 2 both land on day zero.
    const literal = sendDays([0, 3, 4, 5, 6])
    expect(literal).toEqual([0, 0, 3, 7, 12])
    expect(new Set(literal).size, 'the literal array collides two sends on one day').toBeLessThan(literal.length)
  })

  it('ABSOLUTE DAY vs WAIT-AFTER — the two notations, stated so they cannot be confused again', () => {
    const absoluteDays = [0, 3, 7, 12, 18]          // what the founder specified
    const waitsAfter = [3, 4, 5, 6, 0]              // what this codebase stores
    expect(HOUSE_CADENCE).toEqual(waitsAfter)
    expect(sendDays(waitsAfter)).toEqual(absoluteDays)
    // The gaps ARE the differences between consecutive days; the terminal 0 is never read.
    expect(waitsAfter.slice(0, -1))
      .toEqual(absoluteDays.slice(1).map((d, i) => d - absoluteDays[i]))
  })

  it('and the length is not hardcoded — a 3-step and a 7-step cadence work the same way', () => {
    expect(sendDays([4, 5, 0])).toEqual([0, 4, 9])
    expect(sendDays([2, 2, 2, 2, 2, 2, 0])).toEqual([0, 2, 4, 6, 8, 10, 12])
  })
})

// ── ⑦ THE APPLY'S OWN SCOPE GATE — DEFENCE IN DEPTH, WITH ITS OWN TEETH ──────────────
//
// 🛑 WHY THIS SECTION EXISTS SEPARATELY FROM THE ORCHESTRATOR'S TESTS. The gate is asserted in
// two places: `prepareProgrammeOutreach` checks before calling, and this function checks again
// before writing. Proving the pair together proves neither — reverting the ORCHESTRATOR's gate
// to the old audience-only check left ⑩'s cases green, because this one caught it. A layer that
// is only ever exercised through another layer has no teeth of its own, and the day somebody
// adds a second caller is the day that matters.
//
// ⚠️ SO EVERY CASE HERE CALLS `applyHouseProgrammeSequence` DIRECTLY, and asserts on the WRITES
// rather than on the return value. A refusal that returns `ok: false` after writing the row is
// still the approved copy sitting in the wrong campaign.

describe('⑦ the apply refuses any programme but the configured one, on its own', () => {
  const LAUNCH = '11111111-1111-4111-8111-111111111111'
  const RIVAL  = '22222222-2222-4222-8222-222222222222'

  beforeEach(() => {
    writes.length = 0
    existingSequence = null
    audience = 'house'
    delete process.env.HOUSE_LAUNCH_PROGRAMME_ID
  })

  it('🛑 the positive control — the configured programme IS written, both rows', async () => {
    process.env.HOUSE_LAUNCH_PROGRAMME_ID = LAUNCH
    const r = await applyHouseProgrammeSequence(LAUNCH)

    expect(r.ok, r.ok ? '' : r.reason).toBe(true)
    expect(writes.map(w => `${w.table}:${w.op}`)).toEqual(['figsy_sequences:insert', 'programmes:update'])
    const seeded = (writes[0].payload as { steps: { subject: string }[] }).steps
    expect(seeded.map(s => s.subject)).toEqual(HOUSE_SEQUENCE_STEPS.map(s => s.subject))
    expect((writes[1].payload as { send_schedule: unknown }).send_schedule).toEqual(HOUSE_SEND_SCHEDULE)
  })

  it('🛑 a rival House programme is refused, and NOTHING is written', async () => {
    process.env.HOUSE_LAUNCH_PROGRAMME_ID = LAUNCH
    const r = await applyHouseProgrammeSequence(RIVAL)

    expect(r.ok).toBe(false)
    expect(writes, 'a rival programme was written to before the refusal was returned').toEqual([])
    expect(r.ok === false && r.reason).toContain('not the configured House launch programme')
  })

  it('🛑 unset seeds nothing — not even the programme somebody meant', async () => {
    expect(houseLaunchProgrammeId()).toBeNull()
    const r = await applyHouseProgrammeSequence(LAUNCH)
    expect(r.ok).toBe(false)
    expect(writes).toEqual([])
  })

  it('🛑 the configured id with a NON-house client is refused — both facts are required', async () => {
    process.env.HOUSE_LAUNCH_PROGRAMME_ID = LAUNCH
    audience = 'client'
    const r = await applyHouseProgrammeSequence(LAUNCH)
    expect(r.ok).toBe(false)
    expect(writes, "a customer's programme was written with M&V's own pitch").toEqual([])
  })

  it('🛑 an UNPROVABLE audience is refused — a throw is never read as yes', async () => {
    process.env.HOUSE_LAUNCH_PROGRAMME_ID = LAUNCH
    audience = 'throw'
    const r = await applyHouseProgrammeSequence(LAUNCH)
    expect(r.ok).toBe(false)
    expect(writes).toEqual([])
  })

  it('🛑 the id is matched EXACTLY — no prefix, no whitespace-tolerant near-miss', async () => {
    for (const bad of [LAUNCH.slice(0, 8), LAUNCH.slice(0, -1), `${LAUNCH}0`, 'not-a-uuid', '']) {
      process.env.HOUSE_LAUNCH_PROGRAMME_ID = bad
      expect(houseLaunchProgrammeId(), `"${bad}" was accepted as a programme id`).not.toBe(LAUNCH)
      writes.length = 0
      expect((await applyHouseProgrammeSequence(LAUNCH)).ok).toBe(false)
      expect(writes).toEqual([])
    }
    // Case and surrounding whitespace are normalised, because a value pasted from a console
    // carries both and refusing it would look like the gate is broken.
    process.env.HOUSE_LAUNCH_PROGRAMME_ID = `  ${LAUNCH.toUpperCase()}  `
    expect(houseLaunchProgrammeId()).toBe(LAUNCH)
  })

  it('🛑 the value is read at CALL time — a corrected id does not need a redeploy', async () => {
    process.env.HOUSE_LAUNCH_PROGRAMME_ID = RIVAL
    expect(await isHouseLaunchProgramme(LAUNCH, 'house')).toBe(false)
    process.env.HOUSE_LAUNCH_PROGRAMME_ID = LAUNCH
    expect(await isHouseLaunchProgramme(LAUNCH, 'house')).toBe(true)
  })
})
