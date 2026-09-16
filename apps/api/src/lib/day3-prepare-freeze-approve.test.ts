import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 11 Sep — DAY 3, THE REST OF IT: PREPARE → SENDER → FREEZE → VERSION → APPROVE → P2
//
// Nine locked requirements, and the five defects reconciliation actually found:
//
// ③ SENDER ASSIGNED AND SENDER VERIFIED WERE ONE BOOLEAN. `programmeSenderSafety` has told
//    `no_sender` apart from `unverified_sender` since 10 Sep, and readiness collapsed both to
//    `senderAssigned = safety.ok` one line later — so an operator whose client HAD a warmed,
//    branded, live mailbox with a mistyped password was told *"No sending mailbox is assigned"*
//    and sent to assign a second one, which `ambiguous_sender` then refuses. A loop built out
//    of a wrong sentence.
//
// ④ THE FREEZE DID NOT COVER THE TARGET. `meeting_target` drives the recommended volume, the
//    price and the shape of what was bought, and it lived outside the digest — so a target
//    edited while the client was reading changed the deal and the drift check said `unchanged`.
//
// ⑤ THE CLIENT WAS SHOWN A LIVE RECOMPUTATION AND ASKED TO APPROVE A FREEZE, fifty at a time,
//    with a total that could say 250 and no parameter anywhere that could fetch the other 200.
//
// ⑥ THE VERSIONING RULE WAS FULLY ENFORCED AND HAD NO REMEDY. `reviewDrift` refuses an approval
//    whose package moved; the only writer of a review freeze runs from SOURCING, and nothing
//    moves a programme back there. So the first approval-relevant change under a reviewing
//    client made the programme PERMANENTLY unapprovable. A rule with no path forward is an
//    outage with good manners.
//
// ⑧ P2 WAS CHARGED AGAINST A STATUS, NOT AN APPROVAL. `maySecondCharge` asks
//    `status === 'APPROVED'` and nothing else, so a programme whose work drifted after approval
//    — which the RUN gate correctly refuses to make live — could still be charged its second
//    half. Money against an approval that no longer covers the work.
//
// 🛑 NOTHING HERE SENDS, CHARGES, DEPLOYS OR MIGRATES. Every Stripe path asserted below is
// asserted to have minted NOTHING.
// ═══════════════════════════════════════════════════════════════════════════════════════

// 🛑 NO REAL DATABASE, ANYWHERE IN THIS FILE. Most cases here are pure functions or source
// guards; the ones that do read replace this with their own fixture through `vi.doMock`. A
// default that could reach Supabase would make a test suite a runtime actor.
vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q }, is() { return q }, not() { return q },
        in() { return q }, order() { return q }, limit() { return q },
        async maybeSingle() { return { data: null, error: null } },
        then: (r: (v: unknown) => unknown) => r({ data: [], error: null }),
      }
      return q
    },
  },
}))

const LIB = (f: string) => readFileSync(join(__dirname, f), 'utf8')
const ROUTE = (f: string) => readFileSync(join(__dirname, '../routes', f), 'utf8')

/** Source with `//` and `/* *\/` comments removed — a guard must not pass on its own prose. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
}

/** One exported function's body, bounded at the NEXT top-level export — never a fixed window. */
function fnBody(src: string, decl: string): string {
  const i = src.indexOf(decl)
  expect(i, `${decl} is no longer in this file`).toBeGreaterThan(-1)
  const next = src.indexOf('\nexport ', i + decl.length)
  return src.slice(i, next === -1 ? src.length : next)
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① PREPARE AUTHORITY — no P1, no sourcing, no preparation, no provider call
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 ① Prepare requires valid P1 authority', () => {
  const PREP = LIB('programme-preparation.ts')
  const CONT = LIB('programme-p1-continuation.ts')

  it('1 · pre-approval preparation refuses without P1, in the ONE place that decides', async () => {
    const { preparationStageFor } = await import('./programme-preparation')
    const base = { id: 'p1', client_id: 'c1', status: 'SOURCING_AUTHORISED', paused_at: null,
      first_paid_at: null, first_authorised_at: null, approved_at: null,
      second_paid_at: null, second_authorised_at: null } as never

    const noP1 = preparationStageFor(base)
    expect(noP1.ok, 'preparation was authorised with no P1').toBe(false)
    expect(noP1.ok === false && noP1.reason).toContain('no P1 authority')

    // Paid → pre-approval preparation, and ONLY pre-approval.
    const paid = preparationStageFor({ ...(base as object), first_paid_at: '2026-09-11T09:00:00Z' } as never)
    expect(paid.ok).toBe(true)
    expect(paid.ok === true && paid.stage).toBe('pre_approval')

    // House's internal authority is the same door, not a bypass of it.
    const internal = preparationStageFor({ ...(base as object), first_authorised_at: '2026-09-11T09:00:00Z' } as never)
    expect(internal.ok).toBe(true)
    expect(internal.ok === true && internal.stage).toBe('pre_approval')
  })

  it('2 · the sourcing run is not reachable before P1 either — the verdict proves it first', () => {
    const body = fnBody(code(CONT), 'export async function p1ContinuationVerdict')
    expect(body).toContain('if (!p1Authorised(p))')
    // 🛑 AND IT IS PROVED FROM THE ROW, never from what the caller believes. The webhook knows a
    // payment succeeded; it does not know whether this programme is paused or targeted.
    expect(body).toContain("db.from('programmes').select('*').eq('id', id)")
    expect(body).not.toContain('req.body')
  })

  it('3 · preparation itself never grants approval, P2, LIVE or a send', () => {
    const body = code(PREP)
    for (const forbidden of [
      "status: 'APPROVED'", "status: 'LIVE'", 'approved_at:', 'went_live_at:',
      'second_paid_at:', 'second_authorised_at:', 'sendEmail', 'sendNow',
    ]) {
      expect(body, `preparation writes ${forbidden}`).not.toContain(forbidden)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② THE HEALTHY PATH IS AUTOMATIC — no GO, no "Source now", no operator approval
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 ② a healthy programme prepares itself once P1 is committed', () => {
  const CONT = code(LIB('programme-p1-continuation.ts'))

  it('4 · committed P1 starts the chain with no human act in between', () => {
    const start = fnBody(CONT, 'export async function startProgrammeAfterP1')
    // The trigger is the AUTHORITY, and all three ways of committing it reach the same door.
    expect(LIB('programme-p1-continuation.ts')).toContain("'stripe_first_payment' | 'internal_first_authority' | 'operator_retry'")
    expect(start).toContain("await import('./programme-sourcing')")
    expect(start).toContain('sourceProgramme(id)')
    // 🛑 NOTHING WAITS FOR A PRESS. No gate, no flag, no queue for an operator to drain.
    for (const manual of ['awaitOperator', 'requiresApproval', 'pendingOperator', 'needsGo']) {
      expect(start, `the automatic start waits on ${manual}`).not.toContain(manual)
    }
  })

  it('5 · House goes through the SAME door, not around it', () => {
    const AUTH = code(LIB('programme.ts'))
    const internal = fnBody(AUTH, 'export async function authoriseFirstInternal')
    // 🛑 HOUSE-ONLY, and proved against the canonical House classification rather than the
    // revenue exclusion set — they answer different questions (corrected 11 Sep).
    expect(internal).toContain('houseClientIds')
    // ⚠️ THE CONTINUATION IS ORCHESTRATED BY THE ROUTE, NOT BY THE WRITER — the same shape the
    // Stripe webhook uses: commit the authority, then let the authority start the work. So the
    // assertion belongs where the sequencing lives.
    const OP = code(readFileSync(join(__dirname, '../routes/programme.ts'), 'utf8'))
    const door = OP.slice(OP.indexOf("programmeRouter.post('/:id/authorise/first'"))
      .slice(0, OP.slice(OP.indexOf("programmeRouter.post('/:id/authorise/first'")).indexOf('}))'))
    expect(door).toContain('authoriseFirstInternal(req.params.id)')
    expect(door).toContain("startProgrammeAfterP1(req.params.id, 'internal_first_authority'")
    // 🛑 AND ONLY IF THE AUTHORITY ACTUALLY LANDED. Starting a run for a refused authorisation
    // would spend a client's entitlement against nothing.
    expect(door).toContain('if (r.ok)')
    // The paid door does the same thing with the same function — one definition of what P1 starts.
    const STRIPE = code(readFileSync(join(__dirname, '../routes/stripe.ts'), 'utf8'))
    expect(STRIPE).toContain("startProgrammeAfterP1(meta.programmeId, 'stripe_first_payment'")
  })

  it('6 · a continuation that did NOT finish is reported, never silently retried', async () => {
    const health = fnBody(CONT, 'export async function p1ContinuationHealth')
    expect(health).toContain('stopped: true')
    // 🛑 A SPEND WITH NO RECORDED OUTCOME IS NOT RETRIED. What it bought is unknown and buying
    // it again is not free.
    expect(health).toContain('spent === true')
    expect(health).not.toContain('sourceProgramme')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ SENDER ASSIGNED ≠ SENDER VERIFIED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 ③ assigned and verified are two facts', () => {
  const READY = {
    programmeId: 'p1', programmeStatus: 'SOURCING', paused: false,
    attachedIcpId: 'icp-1', batchId: 'b1', reviewableLeads: 40,
    campaignId: 'ca1', campaignProgrammeLinked: true,
    sequenceId: 's1', sequenceCampaignLinked: true,
    messageSteps: 3, cadenceConfigured: true, sendScheduleConfigured: true,
    senderAssigned: true, senderVerified: true, senderProblem: null,
    eligibleEnrolments: 40, foreignEnrolments: 0, snapshotSupported: true,
  }

  it('7 · no mailbox at all blocks as `no_sender`', async () => {
    const { preparationBlockers } = await import('./preparation-readiness')
    const b = preparationBlockers({ ...READY, senderAssigned: false, senderVerified: false })
    expect(b.map(x => x.code)).toContain('no_sender')
    expect(b.map(x => x.code), 'both halves were reported for one problem').not.toContain('sender_unverified')
  })

  it('8 · an ASSIGNED but UNVERIFIED mailbox blocks under its own name, with its own sentence', async () => {
    const { preparationBlockers } = await import('./preparation-readiness')
    const b = preparationBlockers({
      ...READY, senderAssigned: true, senderVerified: false,
      senderProblem: 'Nobody has proved ellis@redmayne.test can log in.',
    })
    const codes = b.map(x => x.code)
    expect(codes).toContain('sender_unverified')
    // 🛑 AND IT DOES NOT SAY "NO MAILBOX IS ASSIGNED", which is the sentence that sent an
    // operator to assign a second one.
    expect(codes).not.toContain('no_sender')
    expect(b.find(x => x.code === 'sender_unverified')!.detail).toContain('can log in')
  })

  it('9 · an unverified sender blocks the FREEZE, not merely the send', async () => {
    const { preparationBlockers } = await import('./preparation-readiness')
    expect(preparationBlockers({ ...READY, senderVerified: false }).length,
      'an unverified sender let the programme become reviewable').toBeGreaterThan(0)
    // ⛓️ 16 Sep (MVP1 · C1d) — RE-POINTED. This test's OWN duty — "an unverified sender blocks
    // the FREEZE" — is asserted above and is untouched: the programme still has blockers and
    // still cannot become reviewable.
    //
    // 🛑 WHAT WAS RE-POINTED IS THE CLAUSE BENEATH IT: ~~"a mailbox login is not something a
    // preparation run can go and prove, so listing it would draw a button that cannot
    // succeed."~~ That was true of preparation as it was. `prepareProgrammeOutreach` now
    // claims a pooled mailbox from the env-backed inventory and runs the existing `verifyInbox`
    // against it (step ⓿), so proving a login is now precisely what a preparation run does —
    // and withholding the button would leave an operator staring at a blocker with no control,
    // which is the same defect pointing the other way.
    const { PREPARATION_CLEARS } = await import('./preparation-readiness')
    expect(PREPARATION_CLEARS).toContain('sender_unverified')
    expect(PREPARATION_CLEARS).toContain('no_sender')
  })

  // ⛓️ 11 Sep — THESE TWO CASES EXIST BECAUSE A TOOTH DID NOT BITE. The mapping from the sender
  // SAFETY VERDICT to the two facts was four lines inside an async database function, watched
  // only by a source scan that pinned ONE of them. Deliberately flipping `senderVerified` to
  // true for an `unverified_sender` verdict — the precise defect the split exists to prevent —
  // passed the whole suite. The mapping is now a pure function, and every branch of it is
  // asserted here rather than described in a comment.
  it('10 · ONLY `unverified_sender` means a mailbox is settled', async () => {
    const { senderFactsFrom } = await import('./preparation-readiness')
    expect(senderFactsFrom({ ok: true })).toEqual({
      senderAssigned: true, senderVerified: true, senderProblem: null,
    })
    const unverified = senderFactsFrom({ ok: false, reason: 'unverified_sender', detail: 'no login proof' })
    expect(unverified.senderAssigned, 'an unverified mailbox is still an ASSIGNED one').toBe(true)
    expect(unverified.senderVerified, 'an unverified mailbox was treated as verified').toBe(false)
    expect(unverified.senderProblem).toBe('no login proof')

    // 🛑 EVERY OTHER REFUSAL MEANS *WHICH* MAILBOX SENDS IS UNDECIDED, so verification has no
    // subject — and none of them may report as assigned.
    for (const reason of ['no_sender', 'ambiguous_sender', 'shared_sender']) {
      const f = senderFactsFrom({ ok: false, reason, detail: `because ${reason}` })
      expect(f.senderAssigned, `${reason} reported an assigned mailbox`).toBe(false)
      expect(f.senderVerified, `${reason} reported a verified mailbox`).toBe(false)
      expect(f.senderProblem).toBe(`because ${reason}`)
    }
  })

  it('11 · no refusal of any kind can ever produce a VERIFIED sender', async () => {
    const { senderFactsFrom } = await import('./preparation-readiness')
    // 🛑 EXHAUSTIVE OVER THE VERDICT TYPE, plus a reason that does not exist yet. A new refusal
    // added to `programme-sender.ts` must not silently arrive as "verified" — the default for
    // an unrecognised answer is the safe one, and this proves it rather than trusting it.
    for (const reason of ['no_sender', 'ambiguous_sender', 'shared_sender', 'unverified_sender',
                          'unreadable', 'some_future_reason']) {
      expect(senderFactsFrom({ ok: false, reason, detail: 'x' }).senderVerified,
        `${reason} produced a verified sender`).toBe(false)
    }
  })

  it('12 · the IO shell uses that one function, and an unreadable answer still refuses to judge', () => {
    const body = fnBody(code(LIB('preparation-readiness.ts')), 'export async function programmePreparationReadiness')
    expect(body).toContain('sender = senderFactsFrom(safety)')
    // A second, inline copy of the mapping is the drift this extraction exists to stop.
    expect(body).not.toContain("senderAssigned = safety.reason")
    expect(body).not.toContain('senderVerified = ')
    // An unreadable answer is a refusal to judge at all, never a pass.
    expect(body).toContain("safety.reason === 'unreadable'")
    expect(body).toContain('return notReady(safety.detail)')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ THE FREEZE PACKAGE IS EXACT
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 ④ the frozen package holds everything the client is agreeing to', () => {
  const SNAP = LIB('preparation-snapshot.ts')

  it('11 · every locked element is inside the digest', () => {
    const iface = SNAP.slice(SNAP.indexOf('export interface PreparationSnapshot'), SNAP.indexOf('export type SnapshotResult'))
    for (const field of [
      'batch_lead_ids',      // the exact prospects
      'enrolled_lead_ids',   // the exact approved audience
      'steps',               // the message bodies
      'cadence',             // the waits
      'send_schedule',       // the window
      'sender',              // which mailbox
      'meeting_target',      // the target — a TARGET, never a guarantee
      'sequence_id', 'campaign_id',
    ]) {
      expect(iface, `${field} is not part of the frozen package`).toContain(field)
    }
  })

  it('12 · the target is READ FROM THE ROW into the snapshot, and a missing one is null not zero', async () => {
    const builder = fnBody(code(SNAP), 'export async function buildPreparationSnapshot')
    expect(builder).toContain("select('id, send_schedule, meeting_target')")
    expect(builder).toContain('meeting_target: meetingTarget')
    // 🛑 A COERCED ZERO WOULD BE A DIFFERENT PROMISE. Unknown and "we targeted nothing" must
    // hash differently, or the digest cannot tell them apart.
    expect(builder).toContain("typeof rawTarget === 'number'")
    expect(builder).not.toContain('meeting_target ?? 0')
  })

  it('13 · adding the target moved the digest version, so no old hash can silently pass', () => {
    expect(code(SNAP)).toContain('v: 2')
    expect(code(SNAP)).not.toContain('v: 1,')
  })

  it('14 · the hash is deterministic and covers the target', async () => {
    const { preparationHash } = await import('./preparation-snapshot')
    const base = {
      v: 2 as const, programme_id: 'p1', meeting_target: 12, batch_id: 'b1',
      batch_lead_ids: ['a', 'b'], campaign_id: 'ca1', sequence_id: 's1',
      steps: [{ subject: 'Hi', body: 'Hello', wait_days: 3 }] as never,
      cadence: [3, 0], send_schedule: { days: [1, 2, 3, 4, 5] }, sender: 'i1|ellis@redmayne.test',
      enrolled_lead_ids: ['a', 'b'],
    }
    expect(preparationHash(base)).toBe(preparationHash({ ...base }))
    // 🛑 THE TARGET CHANGING IS A CHANGE. Before v2 these two hashed identically.
    expect(preparationHash({ ...base, meeting_target: 20 })).not.toBe(preparationHash(base))
    // And so is every other locked element.
    expect(preparationHash({ ...base, send_schedule: { days: [0, 6] } })).not.toBe(preparationHash(base))
    expect(preparationHash({ ...base, sender: 'i2|other@redmayne.test' })).not.toBe(preparationHash(base))
    expect(preparationHash({ ...base, enrolled_lead_ids: ['a'] })).not.toBe(preparationHash(base))
    expect(preparationHash({ ...base, cadence: [5, 0] })).not.toBe(preparationHash(base))
  })

  it('15 · Milla reads the package from the PERSISTED snapshot, never by re-resolving it', () => {
    const body = code(ROUTE('my-programme.ts'))
    expect(body).toContain('review_preparation_snapshot')
    // 🛑 NO LIVE RE-RESOLUTION OF THE WORK ON THE REVIEW SCREEN. That would show whatever is
    // true now and collect consent against it.
    expect(body).not.toContain('resolveProgrammeChain')
    expect(body).not.toContain('buildPreparationSnapshot')
    // The client sees the sending ADDRESS — their own from-line — and never the inbox id.
    expect(body).toContain('sender_email')
    expect(body).toContain('meeting_target: typeof snapObj.meeting_target')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ FULL FROZEN PROSPECT RETRIEVAL
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 ⑤ the whole frozen set can actually be read', () => {
  const leads = Array.from({ length: 130 }, (_, i) => ({
    id: `lead-${String(i).padStart(3, '0')}`, client_id: 'c1', programme_id: 'p1',
    first_name: 'Ada', last_name: 'Byron', job_title: 'Head of Ops', company: `Co ${i}`,
    industry: 'Legal', country: 'GB', score: i, score_reasoning: 'Ada Byron runs the team.',
    created_at: '2026-09-01T00:00:00Z', surfaced_for_approval_at: '2026-09-02T00:00:00Z',
    email: `a${i}@x.test`,
  }))
  const reads: { cols: string; ids: string[] }[] = []

  beforeEach(() => { reads.length = 0; vi.resetModules() })

  function mockDb() {
    vi.doMock('@kind/db', () => ({
      db: {
        from() {
          const st: { cols: string; ids: string[] } = { cols: '', ids: [] }
          const q: Record<string, unknown> = {
            select(c: string) { st.cols = c; return q },
            eq() { return q },
            in(_c: string, v: string[]) { st.ids = v; return q },
            then(resolve: (v: unknown) => unknown) {
              reads.push({ ...st })
              return resolve({ data: leads.filter(l => st.ids.includes(l.id)), error: null })
            },
          }
          return q
        },
      },
    }))
  }

  it('16 · the total is the FROZEN size — exact, never a floor', async () => {
    mockDb()
    const { readFrozenReviewPage } = await import('./programme-review')
    const ids = leads.map(l => l.id)
    const page = await readFrozenReviewPage('c1', 'p1', ids, 0, 50)
    expect(page.total).toBe(130)
    expect(page.prospects).toHaveLength(50)
    expect(page.missing).toBe(0)
  })

  it('17 · page two returns the NEXT fifty — there is no fake "view all"', async () => {
    mockDb()
    const { readFrozenReviewPage } = await import('./programme-review')
    const ids = leads.map(l => l.id)
    const one = await readFrozenReviewPage('c1', 'p1', ids, 0, 50)
    const two = await readFrozenReviewPage('c1', 'p1', ids, 50, 50)
    const three = await readFrozenReviewPage('c1', 'p1', ids, 100, 50)
    expect(two.prospects).toHaveLength(50)
    expect(three.prospects).toHaveLength(30)
    // 🛑 EVERY FROZEN PROSPECT IS REACHABLE EXACTLY ONCE. Ranking inside a page rather than
    // across the whole set would put one person on two pages and another on none.
    const seen = [...one.prospects, ...two.prospects, ...three.prospects].map(p => p.id)
    expect(new Set(seen).size).toBe(130)
  })

  it('18 · the order is best-scoring first across the WHOLE set, and stable', async () => {
    mockDb()
    const { readFrozenReviewPage } = await import('./programme-review')
    const ids = leads.map(l => l.id)
    const one = await readFrozenReviewPage('c1', 'p1', ids, 0, 50)
    expect(one.prospects[0].id).toBe('lead-129')
    expect((await readFrozenReviewPage('c1', 'p1', ids, 0, 50)).prospects.map(p => p.id))
      .toEqual(one.prospects.map(p => p.id))
  })

  it('19 · it reads the FROZEN ids and re-derives no eligibility of its own', async () => {
    mockDb()
    const { readFrozenReviewPage } = await import('./programme-review')
    await readFrozenReviewPage('c1', 'p1', ['lead-000', 'lead-001'], 0, 50)
    // Tenancy is re-asserted even though the ids came from our own snapshot.
    const body = fnBody(code(LIB('programme-review.ts')), 'export async function readFrozenReviewPage')
    expect(body).toContain(".eq('client_id', clientId)")
    expect(body).toContain(".eq('programme_id', programmeId)")
    // And the cards stay masked: no name, no email, no phone leaves.
    expect(reads.every(r => !r.cols.includes('email'))).toBe(true)
  })

  it('20 · an id in the package with no row behind it is COUNTED and REPORTED, not dropped', async () => {
    mockDb()
    const { readFrozenReviewPage } = await import('./programme-review')
    const page = await readFrozenReviewPage('c1', 'p1', ['lead-000', 'ghost-1', 'ghost-2'], 0, 50)
    expect(page.total, 'the package shrank on screen').toBe(3)
    expect(page.missing).toBe(2)
    expect(page.prospects).toHaveLength(1)
  })

  it('21 · a failed read throws rather than silently shrinking the approved audience', async () => {
    vi.doMock('@kind/db', () => ({
      db: {
        from: () => {
          const q: Record<string, unknown> = {
            select() { return q }, eq() { return q }, in() { return q },
            then: (r: (v: unknown) => unknown) => r({ data: null, error: { message: 'leads unreadable' } }),
          }
          return q
        },
      },
    }))
    const { readFrozenReviewPage } = await import('./programme-review')
    await expect(readFrozenReviewPage('c1', 'p1', ['lead-000'], 0, 50)).rejects.toThrow(/unreadable/)
  })

  it('22 · the route serves the FREEZE when there is one, and falls back only where there is none', () => {
    const body = code(ROUTE('my-programme.ts'))
    expect(body).toContain('readFrozenReviewPage(clientId, p.id, frozenLeadIds, offset, REVIEW_PAGE)')
    expect(body).toContain('from_freeze: !(\'live\' in set)')
    expect(body).toContain('offset: set.offset')
    // The live desk survives ONLY for a programme with no package to read.
    expect(body).toContain('frozen\n      ? await readFrozenReviewPage')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑥ POST-FREEZE VERSIONING AND MANDATORY RE-APPROVAL
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 ⑥ a change makes a NEW version; nothing is mutated in place', () => {
  const PROG = code(LIB('programme.ts'))

  it('23 · the first freeze is version 1 and the re-freeze counts up from what is stored', () => {
    expect(fnBody(PROG, 'export async function markReadyForApproval')).toContain('review_preparation_version: 1')
    const re = fnBody(PROG, 'export async function refreezeForReview')
    expect(re).toContain("current.review_preparation_version === 'number' ? current.review_preparation_version : 0) + 1")
  })

  it('24 · re-freezing is only possible from READY_FOR_APPROVAL — never on approved work', () => {
    const re = fnBody(PROG, 'export async function refreezeForReview')
    expect(re).toContain("p.status !== 'READY_FOR_APPROVAL'")
    // 🛑 RE-FREEZING AN APPROVED PROGRAMME *IS* THE IN-PLACE MUTATION THE RULE FORBIDS.
    expect(re).not.toContain("'APPROVED'")
    expect(re).not.toContain('approved_preparation_hash')
    expect(re).not.toContain('approved_at')
  })

  it('25 · it re-proves readiness first, so a re-freeze cannot rescue an unready programme', () => {
    const re = fnBody(PROG, 'export async function refreezeForReview')
    expect(re).toContain('programmePreparationReadiness(programmeId)')
    expect(re).toContain("code: 'not_ready'")
  })

  it('26 · an UNCHANGED package writes nothing, so a reopened screen cannot churn the version', () => {
    const re = fnBody(PROG, 'export async function refreezeForReview')
    expect(re).toContain('current.review_preparation_hash === built.hash')
    expect(re).toContain('changed: false')
  })

  it('27 · the new version is claimed against the OLD hash, so two re-freezes cannot skip one', () => {
    const re = fnBody(PROG, 'export async function refreezeForReview')
    expect(re).toContain(".eq('status', 'READY_FOR_APPROVAL')")
    expect(re).toContain(".eq('review_preparation_hash', current.review_preparation_hash)")
  })

  it('28 · the approved version is COPIED from the review one and left behind by a later re-freeze', () => {
    const cols = PROG.slice(PROG.indexOf('async function approvedPreparationColumns'),
                            PROG.indexOf('export async function approveProgramme('))
    expect(cols).toContain('approved_preparation_version: rp.review_preparation_version ?? null')
    // 🛑 NOT DEFAULTED TO 1. A programme frozen before versioning carries no version, and
    // recording one would invent a claim about which package was read.
    expect(cols).not.toContain('review_preparation_version ?? 1')
  })

  it('29 · both new columns exist in BOTH homes — the file and the runner (AR6)', async () => {
    const { PENDING_MIGRATIONS } = await import('./pending-migrations')
    const entry = PENDING_MIGRATIONS.find(m => m.key === '20260911_preparation_version')
    expect(entry, 'the runner cannot apply what only exists as a file').toBeDefined()
    for (const col of ['review_preparation_version', 'approved_preparation_version',
                       'approved_by_kind', 'approved_by_user_id']) {
      expect(entry!.sql).toContain(col)
      expect(readFileSync(join(__dirname, '../../../../supabase/migrations/20260911_preparation_version.sql'), 'utf8'))
        .toContain(col)
      expect(readFileSync(join(__dirname, '../../../../packages/db/src/schema.sql'), 'utf8')).toContain(col)
    }
    // Expand-only: nullable, no backfill, nothing dropped.
    expect(entry!.sql).toContain('ADD COLUMN IF NOT EXISTS')
    expect(entry!.sql).not.toContain('NOT NULL')
    expect(entry!.sql).not.toContain('DROP')
    expect(entry!.sql).not.toContain('UPDATE ')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑦ THE CLIENT APPROVES THE EXACT VERSION THEY READ, AND IT RECORDS WHO
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 ⑦ approval is exact, and has an author', () => {
  const PROG = code(LIB('programme.ts'))
  const APPROVE = fnBody(PROG, 'export async function approveProgrammeAsCustomer')

  it('30 · a version that is not the frozen one refuses, and charges nothing', () => {
    expect(APPROVE).toContain("code: 'stale_version'")
    expect(APPROVE).toContain('expectedVersion !== frozenNow')
    expect(APPROVE).toContain('Nothing has been charged')
  })

  it('31 · no version at all is also a refusal when a frozen one exists', () => {
    expect(APPROVE).toContain('frozenNow && expectedVersion === null')
  })

  it('32 · the version is pinned by the WRITE, not only by the read', () => {
    expect(APPROVE).toContain("claim.eq('review_preparation_hash', frozenNow)")
    expect(APPROVE).toContain(".eq('status', 'READY_FOR_APPROVAL')")
  })

  it('33 · the approval persists hash, snapshot, timestamp, version AND identity', () => {
    expect(APPROVE).toContain("approved_by_kind: 'client'")
    expect(APPROVE).toContain('approved_by_user_id: approvedByUserId')
    expect(APPROVE).toContain('...prepared')
    const cols = PROG.slice(PROG.indexOf('async function approvedPreparationColumns'),
                            PROG.indexOf('export async function approveProgramme('))
    for (const c of ['approved_preparation_hash', 'approved_preparation_snapshot',
                     'approved_preparation_at', 'approved_preparation_version']) {
      expect(cols).toContain(c)
    }
  })

  it('34 · the author comes from the SESSION and there is no body field for it', () => {
    const body = code(ROUTE('my-programme.ts'))
    expect(body).toContain('approveProgrammeAsCustomer(clientId, p.id, version || null, req.userId ?? null)')
    for (const smuggled of ['req.body?.user', 'req.body.user', 'req.body?.approved_by', 'req.body.approved_by']) {
      expect(body, `the approver can be supplied as ${smuggled}`).not.toContain(smuggled)
    }
  })

  // ⛓️ 11 Sep (DAY 3 HOLD) — THIS CASE IS REVERSED, AND THE REVERSAL IS THE POINT.
  //
  // 🛑 IT USED TO ASSERT THAT THE OPERATOR DOOR RECORDED OPERATOR AUTHORITY — which quietly
  // normalised a route that should not exist. `approveProgramme` took a programme id and
  // nothing else: no client, no ownership, no House check. Anybody with the admin key could
  // approve ANY client's programme, and the row afterwards was indistinguishable to every
  // downstream reader from the client having agreed.
  //
  // The founder's rule: client approval is CLIENT-OWNED, an operator may not substitute for it,
  // and House is not an exception — internal P1/P2 are a MONEY COLLECTION exception only.
  it('35 · the operator approval is WITHDRAWN — it refuses, and writes nothing', () => {
    const op = fnBody(PROG, 'export async function approveProgramme(')
    expect(op).toContain('only be approved by the client')
    expect(op).toContain('House is not an exception')
    for (const written of ["status: 'APPROVED'", 'approved_at:', 'approved_by_kind',
                           'approved_by_user_id', 'setStatus', '...prepared', '.update(']) {
      expect(op, `the withdrawn operator approval still writes ${written}`).not.toContain(written)
    }
  })

  it('36 · exactly ONE authority in the repo can write APPROVED, and it proves tenancy', () => {
    const writers = [...code(LIB('programme.ts')).matchAll(/status: 'APPROVED'/g)]
    expect(writers, 'a second writer of APPROVED exists').toHaveLength(1)
    // 🛑 AND IT IS THE CUSTOMER'S, SCOPED TO THEIR OWN CLIENT. `clientId` is the first argument
    // and there is no shape of this call without it.
    expect(APPROVE).toContain(".eq('client_id', clientId)")
    expect(APPROVE).toContain("approved_by_kind: 'client'")
  })

  it('37 · `approved_by_kind` has exactly one writable value, so it cannot become a bypass', () => {
    const P = code(LIB('programme.ts'))
    const kinds = [...P.matchAll(/approved_by_kind: '([a-z_]+)'/g)].map(m => m[1])
    // ⚠️ ONE VALUE, `client`. The column still permits NULL — meaning "approved before identity
    // was recorded" — and nothing in the product can write anything else. A second writable
    // value is exactly how an operator approval would come back.
    expect(new Set(kinds)).toEqual(new Set(['client']))
  })

  it('38 · approval writes no money, no live, no send', () => {
    for (const forbidden of ['second_paid_at:', 'second_authorised_at:', 'went_live_at:',
                             'run_at:', 'createProgrammeCheckoutSession', 'sendEmail']) {
      expect(APPROVE, `the customer approval writes ${forbidden}`).not.toContain(forbidden)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑧ P2 IS MONEY ONLY, AND ONLY AGAINST AN APPROVAL THAT STILL COVERS THE WORK
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 ⑧ P2 authority', () => {
  const ROUTE_SRC = code(ROUTE('my-programme.ts'))

  // ── THE REAL ROUTE, WITH NO REAL STRIPE AND NO REAL DATABASE ─────────────────────────
  //
  // 🛑 `sessions` IS THE ASSERTION. Every case below that must refuse asserts the checkout
  // session list is still EMPTY — not that a string appears in a file.
  const sessions: Record<string, unknown>[] = []
  const APPROVED = {
    id: 'prog-2', client_id: 'client-1', status: 'APPROVED', meeting_target: 12,
    recommended_volume: 3000, paused_at: null, went_live_at: null,
    approved_at: '2026-09-10T10:00:00Z', second_paid_at: null, second_payment_ref: null,
    second_authorised_at: null, first_paid_at: '2026-09-01T10:00:00Z',
  }

  async function checkoutSecond(opts: { drift: Record<string, unknown> }) {
    vi.resetModules()
    sessions.length = 0
    vi.doMock('@kind/db', () => ({
      db: {
        from: (t: string) => {
          const rows = t === 'clients'
            ? [{ id: 'client-1', user_id: 'user-1', contact_email: 'ellis@redmayne.test' }]
            : t === 'programmes' ? [APPROVED] : []
          const q: Record<string, unknown> = {
            select() { return q }, eq() { return q }, is() { return q }, not() { return q },
            or() { return q }, in() { return q }, order() { return q }, limit() { return q },
            async maybeSingle() { return { data: rows[0] ?? null, error: null } },
            then: (r: (v: unknown) => unknown) => r({ data: rows, error: null }),
          }
          return q
        },
      },
    }))
    vi.doMock('../middleware/auth', () => ({
      requireAuth: (_q: unknown, _s: unknown, next: () => void) => next(),
    }))
    // 🛑 NO REAL STRIPE. A case that reaches this has already been asserted to be allowed.
    vi.doMock('./programme-checkout', () => ({
      createProgrammeCheckoutSession: async (p: Record<string, unknown>) => {
        sessions.push(p); return { url: 'https://stripe.test/session' }
      },
    }))
    vi.doMock('./preparation-snapshot', () => ({
      preparationDrift: async () => opts.drift,
      reviewDrift: async () => opts.drift,
      buildPreparationSnapshot: async () => ({ ok: false, degraded: 'not built in this test' }),
      preparationHash: () => 'h',
      canonicalJson: (v: unknown) => JSON.stringify(v),
    }))

    const { myProgrammeRouter } = await import('../routes/my-programme')
    const layer = (myProgrammeRouter as unknown as {
      stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
    }).stack.find(l => l.route?.path === '/checkout/second' && l.route?.methods.post)
    const handler = layer!.route!.stack[layer!.route!.stack.length - 1].handle
    const out: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
    const res = { status(c: number) { out.code = c; return res }, json(pl: Record<string, unknown>) { out.payload = pl; return res } }
    await handler({ body: {}, headers: {}, params: {}, query: {}, userId: 'user-1' }, res, () => {})
    return out
  }
  const second = ROUTE_SRC.slice(ROUTE_SRC.indexOf('const gate = maySecondCharge(p)'),
                                 ROUTE_SRC.indexOf("const { data: c } = await db.from('clients')"))

  it('37 · an unapproved programme cannot be charged the second half', async () => {
    const { maySecondCharge } = await import('./programme')
    const base = { id: 'p1', status: 'READY_FOR_APPROVAL', paused_at: null, went_live_at: null } as never
    expect(maySecondCharge(base).allowed).toBe(false)
    expect(maySecondCharge({ ...(base as object), status: 'LIVE' } as never).allowed).toBe(false)
    expect(maySecondCharge({ ...(base as object), status: 'APPROVED' } as never).allowed).toBe(true)
  })

  // ⛓️ 11 Sep — THIS CASE WAS A SOURCE SCAN AND A DELIBERATE REGRESSION WALKED PAST IT.
  // Replacing `if (drift.state === 'changed')` with `if (false)` — the whole P2 money gate,
  // disabled — passed every test, because the refusal STRING was still sitting in the now
  // unreachable block and the scan only asked whether it existed. **A guard that checks a
  // string is present cannot see a branch being switched off.** So the gate is driven through
  // the real route instead, and the assertion is that no Stripe session was minted.
  it('38 · an approval that no longer covers the work refuses P2, and mints nothing', async () => {
    const r = await checkoutSecond({ drift: { state: 'changed', approved: 'a', current: 'b', detail: 'moved' } })
    expect(r.code).toBe(409)
    expect(r.payload.error).toBe('approval_superseded')
    expect(String(r.payload.message)).toContain('Nothing has been charged')
    expect(sessions, 'a Stripe session was minted against a superseded approval').toEqual([])
  })

  it('39 · "we cannot tell" refuses P2 too, and mints nothing', async () => {
    for (const drift of [
      { state: 'unreadable' as const, detail: 'the programme could not be read' },
      { state: 'not_approved' as const },
    ]) {
      const r = await checkoutSecond({ drift })
      expect(r.code, `${drift.state} was allowed to charge`).toBe(503)
      expect(r.payload.error).toBe('approval_unverifiable')
      expect(r.payload.retryable).toBe(true)
      expect(sessions, `a Stripe session was minted on ${drift.state}`).toEqual([])
    }
  })

  it('40 · an approval that STILL covers the work is the only one that reaches checkout', async () => {
    const r = await checkoutSecond({ drift: { state: 'unchanged', hash: 'h1' } })
    expect(r.code).toBe(200)
    expect(sessions).toHaveLength(1)
    expect(sessions[0].stage).toBe('programme_second')
  })

  it('41 · the drift is decided BEFORE a session is minted, in source order too', () => {
    expect(second).toContain('preparationDrift(p.id)')
    expect(ROUTE_SRC.indexOf('preparationDrift(p.id)'))
      .toBeLessThan(ROUTE_SRC.indexOf('createProgrammeCheckoutSession'))
  })

  it('42 · P2 grants money and nothing else — no Make Live, no run, no arm, no send', () => {
    const REC = code(LIB('programme.ts'))
    const rec = fnBody(REC, 'export async function recordSecondPayment')
    // ⚠️ WRITES, NOT MENTIONS. `went_live_at` is READ in this function (to answer "was it
    // recorded but not live?"), and banning the word would fail on an honest read — the kind of
    // guard that gets edited rather than obeyed. What must not happen is a WRITE.
    for (const written of ['went_live_at:', "status: 'LIVE'", 'run_at:', 'kill_switch',
                           'sendEmail', 'activate: true']) {
      expect(rec, `the second payment writes ${written}`).not.toContain(written)
    }
    // R108, founder-locked: *"P2 does not Make Live."* The money is committed on its own.
    expect(rec).toContain('second_paid_at:')
    // And the internal equivalent is the same rule.
    const internal = fnBody(REC, 'export async function authoriseSecondInternal')
    for (const written of ['went_live_at:', "status: 'LIVE'", 'run_at:']) {
      expect(internal, `internal P2 writes ${written}`).not.toContain(written)
    }
  })

  it('43 · the client payment route mints nothing for either stage without its own gate', () => {
    // Both stages refuse before `createProgrammeCheckoutSession` is even imported.
    const i = ROUTE_SRC.indexOf('createProgrammeCheckoutSession')
    for (const gate of ["error: 'not_accepted'", "error: 'acceptance_unavailable'",
                        "error: 'approval_superseded'", "error: 'wrong_state'"]) {
      expect(ROUTE_SRC.indexOf(gate), `${gate} is decided after the session is minted`).toBeLessThan(i)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑦B WAITING ON A CLIENT IS NOT A TASK — BUT A CLIENT WHO CANNOT APPROVE IS
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 ⑦B the approval stage interrupts an operator exactly once', () => {
  const FACTS = {
    programme: {
      status: 'READY_FOR_APPROVAL', approved: false, live: false, paused: false,
      secondAuthorised: false, firstAuthorised: true, completed: false,
    },
    proofStarted: true, preparationStopped: false, preparing: false,
    humanBlockers: [], readinessReady: true, sends: 0, repliesAwaitingDecision: 0,
    senderSendable: true, killSwitchOff: true, operatorRunEnabled: true,
    remainingEntitlement: 0, hasNewerProgramme: false, repeatDismissed: false,
  }

  it('47 · an ordinary review is NEVER a task — Vida cannot approve for a client', async () => {
    const { deriveLifecycle } = await import('./programme-lifecycle')
    const v = deriveLifecycle({ ...FACTS } as never)
    expect(v.state).toBe('approval')
    expect(v.needsYou, 'waiting on a client was raised as an operator task').toBe(false)
    expect(v.needsYouReason).toBeNull()
    expect(v.mode).toBe('No action needed')
  })

  it('48 · a client who CANNOT approve is a task, and it names the control that fixes it', async () => {
    const { deriveLifecycle } = await import('./programme-lifecycle')
    const v = deriveLifecycle({ ...FACTS, reviewPackageStale: true } as never)
    expect(v.state).toBe('approval_package_stale')
    expect(v.needsYou).toBe(true)
    expect(v.needsYouReason).toBe('review_package_stale')
    expect(v.mode).toBe('Needs you')
    // ⚠️ STILL THE APPROVAL STAGE. A stuck client has not moved backwards.
    expect(v.stage).toBe('approval')
  })

  it('49 · an UNREADABLE drift check never invents a task', () => {
    // 🛑 `false`, NOT `true`. Being wrong this way costs one un-raised task the client's own
    // refusal surfaces anyway; being wrong the other way puts every healthy reviewing client
    // into Needs you, which is how a Needs-you list stops being read.
    const body = code(LIB('programme-lifecycle-facts.ts'))
    expect(body).toContain('let reviewPackageStale = false')
    expect(body).toContain("(await reviewDrift(p.id)).state === 'changed'")
    expect(body).toContain('catch { ')
    // And it is asked ONLY where a frozen package exists to have moved.
    expect(body).toContain("if (p.status === 'READY_FOR_APPROVAL') {")
  })

  it('50 · the operator door re-freezes and grants nothing', () => {
    const OP = code(readFileSync(join(__dirname, '../routes/programme.ts'), 'utf8'))
    const i = OP.indexOf("programmeRouter.post('/:id/refreeze'")
    expect(i, 'there is no door to the remedy').toBeGreaterThan(-1)
    const door = OP.slice(i, OP.indexOf("programmeRouter.post('/:id/approve'"))
    expect(door).toContain('refreezeForReview(req.params.id)')
    expect(door).toContain("money: 'none")
    for (const forbidden of ['approveProgramme', 'goLive', 'recordSecondPayment', 'authoriseSecond']) {
      expect(door, `the re-freeze door calls ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('51 · Vida offers the control on the stuck state, and NO approval control anywhere', () => {
    const COPY = readFileSync(join(__dirname, '../../../admin/src/lib/vida-lifecycle-copy.ts'), 'utf8')
    const stale = COPY.slice(COPY.indexOf("case 'approval_package_stale':"),
                             COPY.indexOf("case 'approval':\n    case 'approval_awaiting_second_payment':"))
    expect(stale).toContain("key: 'refreeze_package'")
    // 🛑 VIDA STILL CANNOT APPROVE. The client's approval is consent to email real strangers on
    // their behalf; an operator button here would make that consent ours to give.
    // ⚠️ BOUNDED AT THE NEXT `case`, never a fixed character window. The ordinary branch grew
    // when it started reading the frozen package, and a 2,600-character slice stopped reaching
    // its `actions:` line — a guard failing on length rather than on substance.
    const from = COPY.indexOf("case 'approval':\n    case 'approval_awaiting_second_payment':")
    const ordinary = COPY.slice(from, COPY.indexOf("case 'live_ready_to_make_live':", from))
    expect(ordinary).toContain('actions: [],')
    for (const banned of ["key: 'approve'", 'approveProgramme', 'approve_for_client']) {
      expect(COPY, `Vida offers ${banned}`).not.toContain(banned)
    }
  })

  it('52 · the re-freeze is NOT inside the six-action lifecycle helper', () => {
    const VIDA = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
    // ⚠️ THE REPO'S OWN RULE, and the first cut of this change broke it: `lifecycle()` carries
    // the six approved DRAFT→LIVE moves and a guard holds it at exactly six so a seventh cannot
    // be slipped in beside them. A re-freeze moves no status and grants no authority, so it
    // gets its own function exactly as `pauseProgramme` does.
    const ladder = [...VIDA.matchAll(/lifecycle\('([^']+)'/g)].map(m => m[1])
    expect(new Set(ladder)).toEqual(new Set([
      'recommend', 'await-first-payment', 'authorise/first',
      'ready-for-approval', 'authorise/second', 'go-live',
    ]))
    expect(VIDA).toContain('const refreezePackage = useCallback')
    expect(VIDA).toContain("case 'refreeze_package': return void refreezePackage()")
    expect(VIDA).toContain('NOTHING is approved, charged or sent.')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤B MILLA CAN ACTUALLY OPEN THE REST OF THE SET
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 ⑤B the "view all" is real', () => {
  const REVIEW = readFileSync(join(__dirname, '../../../portal/src/components/milla/ProgrammeReview.tsx'), 'utf8')

  it('53 · the screen fetches by offset and re-reads on every page change', () => {
    expect(REVIEW).toContain('/my/programme/review?offset=${offset}')
    expect(REVIEW).toContain('}, [token, offset])')
    // 🛑 NOTHING IS RANKED OR ACCUMULATED LOCALLY. Ordering a page in the browser puts the same
    // prospect on two pages and another on none.
    expect(REVIEW).not.toContain('.sort(')
    expect(REVIEW).not.toContain('[...prospects,')
  })

  it('54 · the page size is the SERVER\'s, never a constant chosen here', () => {
    expect(REVIEW).toContain('const pageSize = d.page_size')
    expect(REVIEW).not.toMatch(/const PAGE(_SIZE)? = \d+/)
  })

  it('55 · both controls exist and say what they do', () => {
    expect(REVIEW).toContain("data-testid=\"review-next\"")
    expect(REVIEW).toContain("data-testid=\"review-prev\"")
    expect(REVIEW).toContain('Show the next ')
    // ⛓️ THE OLD SENTENCE — "showing the top 50" of a total that could read 250, with nothing
    // behind it — is gone from the RENDERED text.
    //
    // ⚠️ SCANNED WITH COMMENTS STRIPPED, and that is not a loosening. Both files that record
    // WHY the sentence was removed quote it, so a raw scan fails on its own explanation — the
    // exact defect that has bitten three guards in this repo. What must not exist is the
    // sentence in the JSX.
    expect(code(REVIEW), 'the fake view-all sentence is still on screen').not.toContain('showing the top ')
  })

  it('56 · a package that lost rows says so rather than quietly shrinking', () => {
    expect(REVIEW).toContain('d.missing')
    expect(REVIEW).toContain('still part of what you’d be approving')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑨ NO STAGE GRANTS THE NEXT ONE'S AUTHORITY
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 ⑨ the ladder holds — each rung grants only itself', () => {
  it('44 · the re-freeze grants nothing at all', () => {
    const re = fnBody(code(LIB('programme.ts')), 'export async function refreezeForReview')
    for (const forbidden of ['approved_at', 'second_paid_at', 'went_live_at', 'run_at',
                             "status: 'APPROVED'", "status: 'LIVE'"]) {
      expect(re, `the re-freeze writes ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('45 · the frozen reader grants nothing and writes nothing', () => {
    const body = fnBody(code(LIB('programme-review.ts')), 'export async function readFrozenReviewPage')
    expect(body).not.toContain('.update(')
    expect(body).not.toContain('.insert(')
    expect(body).not.toContain('.delete(')
  })

  it('46 · the review route is still a read plus exactly ONE customer write', () => {
    const body = code(ROUTE('my-programme.ts'))
    // The only write in the file is the approval, through the canonical function.
    expect(body.split('approveProgrammeAsCustomer').length - 1).toBe(2)
    expect(body).not.toContain("db.from('programmes').update")
    expect(body).not.toContain("db.from('leads').update")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 11 Sep (DAY 3 HOLD) — THE FOUR NARROW CONTROL POINTS
// ═══════════════════════════════════════════════════════════════════════════════════════

// ── ① CLIENT APPROVAL OWNERSHIP ────────────────────────────────────────────────────────
describe('🛑 HOLD-① client approval is CLIENT-OWNED, and an operator cannot substitute', () => {
  const PROG = code(LIB('programme.ts'))

  it('H1 · the admin-key route refuses with 403 and audits that nothing happened', () => {
    const OP = code(readFileSync(join(__dirname, '../routes/programme.ts'), 'utf8'))
    const i = OP.indexOf("programmeRouter.post('/:id/approve'")
    const door = OP.slice(i, OP.indexOf('}))', i))
    expect(door).toContain("res.status(403)")
    expect(door).toContain("error: 'client_owned'")
    expect(door).toContain("money: 'none")
    // 🛑 403, NOT 400. This is not a wrong state or a bad request — it is an act an operator
    // does not have the authority to perform, in any state, for any client.
    expect(door).not.toContain('r.ok ? 200')
  })

  it('H2 · House is refused by the same sentence — the money exception is not an approval one', () => {
    const op = fnBody(PROG, 'export async function approveProgramme(')
    expect(op).toContain('House is not an exception')
    expect(op).toContain('internal P1 and P2 authority cover money collection only')
  })

  it('H3 · House internal P1 and P2 write no approval of any kind', () => {
    for (const fn of ['export async function authoriseFirstInternal',
                      'export async function authoriseSecondInternal']) {
      const body = fnBody(PROG, fn)
      for (const written of ["status: 'APPROVED'", 'approved_at:', 'approved_by_kind',
                             'approved_by_user_id', 'approved_preparation_hash']) {
        expect(body, `${fn} writes ${written}`).not.toContain(written)
      }
    }
  })

  it('H4 · every allowed `approved_by_kind` value, and why none of them is a bypass', () => {
    // ⚠️ EXACTLY ONE WRITABLE VALUE: `client`. The column also permits NULL, which means
    // "approved before identity was recorded" and is never written by this code. There is no
    // `operator` value any more, so the column cannot carry an operator approval even if some
    // future route tried to mint one — it would have to invent the value first, and this
    // assertion is what would fail.
    const kinds = [...PROG.matchAll(/approved_by_kind: ('[a-z_]+'|[A-Za-z][A-Za-z0-9_.]*)/g)].map(m => m[1])
    expect(new Set(kinds)).toEqual(new Set(["'client'"]))
  })

  it('H5 · the ONE writer of APPROVED proves tenancy from the session, not the body', () => {
    expect([...PROG.matchAll(/status: 'APPROVED'/g)]).toHaveLength(1)
    const cust = fnBody(PROG, 'export async function approveProgrammeAsCustomer')
    expect(cust).toContain(".eq('client_id', clientId)")
    expect(cust).toContain("approved_by_kind: 'client'")
    // The client id is the FIRST argument: there is no shape of this call without it.
    expect(PROG).toMatch(/approveProgrammeAsCustomer\(\s*\n?\s*clientId: string/)
  })
})

// ── ② EXACT FROZEN PACKAGE — ONE CANONICAL TRUTH ──────────────────────────────────────
describe('🛑 HOLD-② Milla and Vida read the SAME persisted package', () => {
  it('H6 · every locked element is inside the persisted digest', () => {
    const SNAP = LIB('preparation-snapshot.ts')
    const iface = SNAP.slice(SNAP.indexOf('export interface PreparationSnapshot'),
                             SNAP.indexOf('export type SnapshotResult'))
    for (const field of ['batch_lead_ids', 'enrolled_lead_ids', 'steps', 'cadence',
                         'send_schedule', 'sender', 'meeting_target']) {
      expect(iface, `${field} is not in the frozen package`).toContain(field)
    }
    // The version, the digest and the timestamp are columns beside it, written in the same
    // conditional UPDATE as the status.
    const PROG = code(LIB('programme.ts'))
    const freeze = fnBody(PROG, 'export async function markReadyForApproval')
    for (const col of ['review_preparation_hash', 'review_preparation_snapshot',
                       'review_preparation_at', 'review_preparation_version']) {
      expect(freeze, `${col} is not written with the freeze`).toContain(col)
    }
  })

  it('H7 · a change to ANY of the six approval-relevant elements moves the digest', async () => {
    // ⚠️ THE REAL MODULE. The P2 cases above stub `./preparation-snapshot` through `doMock`,
    // and a stubbed `preparationHash` returns a constant — which would make every comparison
    // below pass or fail for a reason that has nothing to do with the digest.
    vi.resetModules(); vi.doUnmock('./preparation-snapshot')
    const { preparationHash } = await import('./preparation-snapshot')
    const base = {
      v: 2 as const, programme_id: 'p1', meeting_target: 12, batch_id: 'b1',
      batch_lead_ids: ['a', 'b', 'c'], campaign_id: 'ca1', sequence_id: 's1',
      steps: [{ subject: 'Hi', body: 'Hello there', wait_days: 3 },
              { subject: 'Following up', body: 'Just checking', wait_days: 0 }] as never,
      cadence: [3, 0], send_schedule: { days: [1, 2, 3, 4, 5], from: '08:30', to: '17:00' },
      sender: 'i1|ellis@redmayne.test', enrolled_lead_ids: ['a', 'b', 'c'],
    }
    const h = preparationHash(base)
    const cases: [string, Record<string, unknown>][] = [
      // ① PROSPECTS — both the batch membership and the approved audience.
      ['prospects (audience)', { enrolled_lead_ids: ['a', 'b'] }],
      ['prospects (batch)',    { batch_lead_ids: ['a', 'b'] }],
      // ② MESSAGES — the words themselves, not just how many.
      ['message body',    { steps: [{ subject: 'Hi', body: 'Hello THERE', wait_days: 3 },
                                    { subject: 'Following up', body: 'Just checking', wait_days: 0 }] }],
      ['message subject', { steps: [{ subject: 'Hey', body: 'Hello there', wait_days: 3 },
                                    { subject: 'Following up', body: 'Just checking', wait_days: 0 }] }],
      ['message removed', { steps: [{ subject: 'Hi', body: 'Hello there', wait_days: 3 }] }],
      // ③ CADENCE — a retiming with no word moved.
      ['cadence', { cadence: [5, 0] }],
      // ④ WINDOW — days and hours.
      ['window (days)',  { send_schedule: { days: [0, 6], from: '08:30', to: '17:00' } }],
      ['window (hours)', { send_schedule: { days: [1, 2, 3, 4, 5], from: '06:00', to: '22:00' } }],
      // ⑤ SENDER — which mailbox it comes from.
      ['sender', { sender: 'i2|other@redmayne.test' }],
      // ⑥ TARGET — what was promised as a target.
      ['target', { meeting_target: 20 }],
    ]
    for (const [what, patch] of cases) {
      expect(preparationHash({ ...base, ...patch } as never),
        `changing the ${what} did not move the frozen digest`).not.toBe(h)
    }
    // 🛑 AND NOTHING ELSE MOVES IT. A digest that changes when nothing changed trains everybody
    // to re-approve reflexively, which is how a REAL change gets waved through.
    expect(preparationHash({ ...base })).toBe(h)
    expect(preparationHash({ ...base, enrolled_lead_ids: ['c', 'b', 'a'].sort() })).toBe(h)
  })

  it('H8 · reviewDrift reports `changed` when and only when the REAL digest moved', async () => {
    // ⚠️ THE REAL BUILDER, DRIVEN BY A REAL FIXTURE. The first cut of this case stubbed
    // `buildPreparationSnapshot` with a spy — which never intercepted, because `reviewDrift`
    // calls the module-local binding rather than the export object, so the case was measuring
    // a degraded read instead of a digest comparison. Driving the actual fixture proves the
    // path that runs in production.
    vi.resetModules(); vi.doUnmock('./preparation-snapshot')
    const world = {
      frozen: null as string | null,
      enrolled: [{ lead_id: 'l1' }, { lead_id: 'l2' }],
      schedule: { days: [1, 2, 3, 4, 5], from: '08:30', to: '17:00' } as unknown,
    }
    vi.doMock('@kind/db', () => ({
      db: { from: (t: string) => {
        const rows = t === 'programmes'
          ? [{ id: 'p1', review_preparation_hash: world.frozen, send_schedule: world.schedule, meeting_target: 12 }]
          : t === 'programme_batches' ? [{ id: 'b1', seq: 1 }]
          : t === 'leads' ? [{ id: 'l1' }, { id: 'l2' }]
          : t === 'figsy_enrollments' ? world.enrolled
          : []
        const q: Record<string, unknown> = {
          select() { return q }, eq() { return q }, order() { return q },
          async maybeSingle() { return { data: rows[0] ?? null, error: null } },
          then: (r: (v: unknown) => unknown) => r({ data: rows, error: null }),
        }
        return q
      } },
    }))
    vi.doMock('./programme-chain', () => ({
      resolveProgrammeChain: async () => ({
        ok: true,
        chain: { clientId: 'c1', campaignId: 'ca1', sequenceId: 's1',
                 steps: [{ subject: 'Hi', body: 'Hello', wait_days: 3 }], cadence: [3, 0] },
      }),
    }))
    vi.doMock('./sending-inbox', () => ({
      resolveSendingInbox: async () => ({ ok: true, inbox: { id: 'i1', email: 'ellis@redmayne.test' } }),
    }))
    const snapshot = await import('./preparation-snapshot')

    // 🛑 NO FROZEN HASH IS `unreadable`, NEVER `unchanged`. "We have no record of what they were
    // shown" must not resolve to "yes, it matches".
    expect((await snapshot.reviewDrift('p1')).state).toBe('unreadable')

    // Freeze it, then read again with nothing changed.
    const built = await snapshot.buildPreparationSnapshot('p1')
    expect(built.ok).toBe(true)
    world.frozen = built.ok ? built.hash : ''
    expect((await snapshot.reviewDrift('p1')).state).toBe('unchanged')

    // ① Move the AUDIENCE — one prospect drops out of the approved set.
    world.enrolled = [{ lead_id: 'l1' }]
    let d = await snapshot.reviewDrift('p1')
    expect(d.state, 'a changed audience read as unchanged').toBe('changed')
    expect(d.state === 'changed' && d.detail).toContain('not what would run')
    world.enrolled = [{ lead_id: 'l1' }, { lead_id: 'l2' }]
    expect((await snapshot.reviewDrift('p1')).state).toBe('unchanged')

    // ② Move the WINDOW — same words, different hours.
    world.schedule = { days: [1, 2, 3, 4, 5], from: '06:00', to: '22:00' }
    d = await snapshot.reviewDrift('p1')
    expect(d.state, 'a retimed sending window read as unchanged').toBe('changed')
  })

  it('H9 · Vida reads the persisted package and asserts nothing of its own', () => {
    const COPY = readFileSync(join(__dirname, '../../../admin/src/lib/vida-lifecycle-copy.ts'), 'utf8')
    const from = COPY.indexOf("case 'approval':\n    case 'approval_awaiting_second_payment':")
    const branch = COPY.slice(from, COPY.indexOf("case 'live_ready_to_make_live':", from))
    // ⛓️ THIS TICK WAS `done: true`, UNCONDITIONALLY — a tick that is always ticked is not a
    // check, and it was decorating the one fact the whole approval boundary rests on.
    expect(branch).toContain("{ label: 'Review snapshot frozen', done: !!i.frozenPackage }")
    expect(branch, 'Vida still asserts a freeze it has not checked').not.toContain("'Review snapshot frozen', done: true")
    // The numbers come from the package, with the live figures used only where there is none.
    expect(branch).toContain('i.frozenPackage ? i.frozenPackage.prospects')
    expect(branch).toContain('i.frozenPackage ? i.frozenPackage.target')
    // 🛑 TARGET, NEVER GUARANTEE — on the operator screen too.
    expect(branch).toContain('not a guarantee')
  })

  it('H10 · the frozen package is read from the columns, never rebuilt, on the Vida path', () => {
    const FACTS = code(LIB('programme-lifecycle-facts.ts'))
    const block = FACTS.slice(FACTS.indexOf('const frozenPackage = ((): {'),
                              FACTS.indexOf('const entitlementTotal'))
    expect(block).toContain('review_preparation_snapshot')
    expect(block).toContain('review_preparation_version')
    // 🛑 IT REBUILDS NOTHING AND RECOUNTS NOTHING.
    for (const forbidden of ['buildPreparationSnapshot', 'resolveProgrammeChain', "db.from('leads')"]) {
      expect(block, `the Vida read reconstructs the package via ${forbidden}`).not.toContain(forbidden)
    }
    // And the columns are actually SELECTED, or every panel would read "not frozen".
    const AUTH = code(LIB('programme-authority.ts'))
    expect(AUTH).toContain('review_preparation_snapshot')
  })

  it('H11 · approving V1 does not carry forward to V2 — the approved version stays put', () => {
    const PROG = code(LIB('programme.ts'))
    const re = fnBody(PROG, 'export async function refreezeForReview')
    // A re-freeze moves the REVIEW version and never the approved one.
    expect(re).toContain('review_preparation_version: nextVersion')
    for (const approved of ['approved_preparation_version', 'approved_preparation_hash',
                            'approved_preparation_snapshot', 'approved_at']) {
      expect(re, `the re-freeze mutated ${approved}`).not.toContain(approved)
    }
    // And the new version requires a new client approval: the approval pins the frozen hash on
    // both the read and the write, so a client holding V1 cannot approve V2 by pressing again.
    const cust = fnBody(PROG, 'export async function approveProgrammeAsCustomer')
    expect(cust).toContain('expectedVersion !== frozenNow')
    expect(cust).toContain("claim.eq('review_preparation_hash', frozenNow)")
  })
})

// ── ④ NUMERICAL SEMANTICS ──────────────────────────────────────────────────────────────
describe('🛑 HOLD-④ four separate numbers, and none of them is derived from another', () => {
  it('H12 · remaining entitlement comes from the CEILING, never from the frozen set', () => {
    const FACTS = code(LIB('programme-lifecycle-facts.ts'))
    // 🛑 THE RULE. `authorised − frozen` is NOT remaining entitlement: a prospect absent from
    // the frozen set may have been suppressed, unqualified, opted out or simply not enrolled,
    // and none of those returns entitlement. Remaining is ceiling − used − reserved, which is
    // programme-entitlement truth and is what `try_spend_sourcing` actually accounts against.
    expect(FACTS).toContain('Math.max(0, entitlementTotal - entitlementUsed - (p.sourced_reserved ?? 0))')
    // ⚠️ THE BAN IS ON SUBTRACTION ACROSS THE FOUR FACTS, not on counting the package. Reading
    // `enrolled_lead_ids.length` to say how big the frozen set IS is correct and necessary;
    // subtracting it from the ceiling to produce an entitlement is the fabrication.
    // ⚠️ THE WHITESPACE LIVES INSIDE THE LOOKAHEAD. Written as `-\s*(?!entitlementUsed)` the
    // `\s*` backtracks to zero width and the lookahead then sees a SPACE, so the negative
    // succeeds and the guard matches its own legitimate line.
    for (const forbidden of [/entitlementTotal\s*-(?!\s*entitlementUsed)/,
                             /ceiling\s*-\s*(?:enrolled|frozen|prospects)/,
                             /(?:enrolled_lead_ids\.length|frozenPackage\.prospects)\s*-/,
                             /-\s*(?:frozenPackage|enrolled_lead_ids)/]) {
      expect(FACTS, `remaining entitlement was derived via ${forbidden}`).not.toMatch(forbidden)
    }
  })

  it('H13 · the four numbers answer four questions, and no screen subtracts across them', () => {
    const COPY = readFileSync(join(__dirname, '../../../admin/src/lib/vida-lifecycle-copy.ts'), 'utf8')
    const REVIEW = readFileSync(join(__dirname, '../../../portal/src/components/milla/ProgrammeReview.tsx'), 'utf8')
    const APPROVAL = readFileSync(join(__dirname, '../../../portal/src/components/milla/ProgrammeApproval.tsx'), 'utf8')
    // A · authorised volume   B · frozen outreach set   C · worked/contacted   D · remaining
    // Each is rendered from its OWN source. The prohibition is arithmetic BETWEEN them.
    for (const [name, src] of [['Vida', COPY], ['Milla review', REVIEW], ['Milla approval', APPROVAL]] as const) {
      for (const arithmetic of [
        /entitlementTotal\s*-(?!\s*entitlementUsed)/, /ceiling\s*-\s*(?:enrolled|frozen|prospects)/,
        /prospects\s*-\s*(?:total|entitlement)/, /total\s*-\s*(?:enrolled|frozen)/,
        /sourced\s*-\s*(?:enrolled|qualified)/,
      ]) {
        expect(code(src), `${name} derives one programme number from another`).not.toMatch(arithmetic)
      }
    }
    // ⚠️ AND THE LABELS SAY WHICH NUMBER IS WHICH. "Remaining" beside "Used" and "Total" is
    // entitlement; the frozen count is labelled as the package, never as a remainder.
    expect(COPY).toContain("label: 'Programme entitlement'")
    // ⚠️ THE FROZEN COUNT IS LABELLED AS THE PACKAGE, never as a remainder. It is written as a
    // conditional label, so the assertion matches the string rather than a whole line.
    expect(COPY).toContain("'Prospects in the package'")
    expect(COPY).toContain("label: 'Used'")
    expect(COPY).toContain("label: 'Remaining'")
  })

  it('H14 · nothing anywhere explains WHY a prospect is absent from the frozen set', () => {
    // 🛑 FOUNDER-LOCKED: do not invent reasons for prospects excluded from a frozen set. A
    // prospect can be absent because they were suppressed, unqualified, opted out, evicted,
    // blocklisted, or simply not reached by the preparation budget — and no surface here knows
    // which. Saying "54 were unsuitable" would be a fabrication about real people.
    const COPY = readFileSync(join(__dirname, '../../../admin/src/lib/vida-lifecycle-copy.ts'), 'utf8')
    const REVIEW = readFileSync(join(__dirname, '../../../portal/src/components/milla/ProgrammeReview.tsx'), 'utf8')
    for (const [name, src] of [['Vida', COPY], ['Milla', REVIEW]] as const) {
      for (const invented of ['were unsuitable', 'did not qualify for this batch',
                              'excluded because', 'left over', 'were dropped']) {
        expect(src, `${name} invents a reason for prospects outside the frozen set`).not.toContain(invented)
      }
    }
    // The one thing Milla DOES say about a gap is the honest one: we could not display them,
    // and they are still part of the package.
    expect(REVIEW).toContain('still part of what you’d be approving')
  })
})
