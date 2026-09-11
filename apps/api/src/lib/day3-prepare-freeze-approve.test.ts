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
    // ⚠️ AND PREPARATION CANNOT CLEAR IT — a mailbox login is not something a preparation run
    // can go and prove, so listing it would draw a button that cannot succeed.
    const { PREPARATION_CLEARS } = await import('./preparation-readiness')
    expect(PREPARATION_CLEARS).not.toContain('sender_unverified')
    expect(PREPARATION_CLEARS).not.toContain('no_sender')
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

  it('35 · the operator door records OPERATOR authority and no invented person', () => {
    const op = fnBody(PROG, 'export async function approveProgramme(')
    expect(op).toContain("approved_by_kind: 'operator'")
    expect(op).toContain('approved_by_user_id: null')
  })

  it('36 · approval writes no money, no live, no send', () => {
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
