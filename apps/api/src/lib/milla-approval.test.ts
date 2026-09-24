// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CLIENT'S APPROVAL — what they see, and that it is the FROZEN version.
//
// 🛑 THE GAP THIS CLOSES. The backend handoff worked: a programme reached READY_FOR_APPROVAL
// with its set frozen and `POST /my/programme/approve` waiting. The EXPERIENCE did not exist —
// the client saw a stage name, an outcome and a sourced count, with no sight of the people, no
// sight of the words that would go out in their name, no statement that what they were reading
// was fixed, and no way to say yes.
//
// Being asked to approve something you cannot see is not an approval, and everybody downstream
// treats `approved_at` as consent to email real strangers on this client's behalf.
//
// ⚠️ THE HARD RULE THESE CASES EXIST FOR: what is rendered comes from
// `review_preparation_snapshot`, never from a live re-resolution. If the screen showed current
// state, the client would read one thing, approve, and the approval would faithfully record
// whatever was true at that instant — a perfect record of consent to something nobody looked at.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const API = __dirname
const PORTAL = join(API, '..', '..', '..', 'portal', 'src')
const ROUTE = readFileSync(join(API, '..', 'routes', 'my-programme.ts'), 'utf8')
const APPROVAL = readFileSync(join(PORTAL, 'components', 'milla', 'ProgrammeApproval.tsx'), 'utf8')
const PAGE = readFileSync(join(PORTAL, 'app', '(milla)', 'milla', 'programme', 'page.tsx'), 'utf8')

/** Executable lines only — these files explain themselves at length. */
const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
  .join('\n')

describe('① the client is shown the FROZEN work, never a live re-resolution', () => {
  it('🛑 the route reads the snapshot column, and resolves no sequence', () => {
    const at = ROUTE.indexOf("myProgrammeRouter.get('/review'")
    expect(at).toBeGreaterThan(-1)
    const body = code(ROUTE.slice(at, ROUTE.indexOf('myProgrammeRouter.post', at)))
    expect(body).toContain('review_preparation_snapshot')
    // 🛑 REBUILDING IT HERE IS THE DEFECT THE FREEZE EXISTS TO PREVENT.
    for (const forbidden of ['resolveProgrammeChain', 'buildPreparationSnapshot', 'figsy_sequences', 'applyProgrammeSequence']) {
      expect(body.includes(forbidden), `the review rebuilds the sequence via ${forbidden}`).toBe(false)
    }
  })

  /**
   * The frozen payload literal — from `const frozen = snapObj ? {` to the `} : null` that ends
   * it.
   *
   * ⛓️ 18 Sep (J16-C1) — ~~`ROUTE.slice(at, at + 2200)`~~, A FIXED CHARACTER WINDOW, AND IT
   * WAS MEASURING THE WRONG THING. It was widened 1200 → 2200 on 11 Sep when the payload gained
   * a field and a comment; on 18 Sep the payload gained `sendable` the same way and
   * `send_schedule:` fell off the end of the window — so a guard about what the client is sent
   * failed against a payload that had lost nothing and gained a field.
   *
   * 🛑 AND THE LEAK GUARD BELOW WAS PASSING BY ACCIDENT OF THAT WINDOW. It forbids the
   * substring `sender`, while the payload has deliberately carried `sender_email` since 11 Sep
   * — the client's own from-line, which the founder's own reversal put there. The only reason
   * it stayed green is that 2200 characters stopped short of it. Bounded properly, the
   * prohibition has to say what it actually means: the raw `sender` field, not the address.
   */
  const frozenBlock = (() => {
    const at = ROUTE.indexOf('const frozen = snapObj ?')
    expect(at, 'the frozen payload is gone').toBeGreaterThan(-1)
    const end = ROUTE.indexOf('} : null', at)
    expect(end, 'the frozen payload literal no longer ends where this expects').toBeGreaterThan(at)
    return ROUTE.slice(at, end)
  })()

  it('the frozen payload carries the messages, the timing, the population and the schedule', () => {
    for (const field of ['version:', 'messages:', 'wait_days:', 'prospects:', 'send_schedule:', 'at:']) {
      expect(frozenBlock, `the frozen payload lost ${field}`).toContain(field)
    }
  })

  it('🛑 AND NO IDENTIFIERS REACH THE CUSTOMER', () => {
    // The snapshot holds all of these; none of them is the customer's business.
    //
    // ⚠️ `sender:` WITH ITS COLON — the raw `id|email` field. The ADDRESS (`sender_email`) is
    // deliberately sent: it is the from-line every recipient sees, so it is part of what the
    // client approves. The inbox id, the provider and the credentials are what stay behind, and
    // the raw field is where the id lives.
    for (const leak of ['enrolled_lead_ids:', 'batch_lead_ids', 'campaign_id', 'sequence_id', 'sender:']) {
      expect(frozenBlock.includes(leak), `${leak} was handed to the customer`).toBe(false)
    }
    // And the id half of the raw field never reaches the payload even through the address.
    expect(frozenBlock).toContain('raw.slice(raw.indexOf(\'|\') + 1)')
  })

  it('the screen renders the frozen messages and says they are frozen', () => {
    expect(APPROVAL).toContain('frozen.messages.map')
    // ⛓️ 11 Sep (DAY 3) — THE SENTENCE GAINED A VERSION NUMBER and is now assembled from two
    // parts, so the old single-string scan broke on a change that STRENGTHENED it. The promise
    // it guards — *this is a fixed version, and a change means we ask again* — is asserted as
    // its parts. A client cannot say "I approved dc41f8…", so the version they were shown has
    // to be a number they can quote back.
    expect(APPROVAL).toContain('prepared for you on')
    expect(APPROVAL).toContain('version ${frozen.version_number}')
    expect(APPROVAL).toContain('If anything changes, we will ask you again.')
    // 🛑 AND THE REST OF THE PACKAGE IS ON THE SCREEN. A client was being asked to approve
    // outreach without being told which address it comes from, or against which target.
    expect(APPROVAL).toContain('frozen.sender_email')
    expect(APPROVAL).toContain('frozen.meeting_target')
    // Founder-locked: the caveat travels WITH the number.
    expect(APPROVAL).toContain('a target, not a guarantee')
  })

  it('🛑 the screen never re-resolves or re-counts anything of its own', () => {
    const c = code(APPROVAL)
    for (const forbidden of ['figsy_sequences', 'figsy_enrollments', 'resolveProgrammeChain', 'review_preparation_hash']) {
      expect(c.includes(forbidden), `the approval screen reaches ${forbidden}`).toBe(false)
    }
  })

  it('the frozen population is what is approved, not the live count', () => {
    expect(APPROVAL).toContain('const population = frozen?.prospects ?? data.total')
  })
})

describe('② the four things the client must be given', () => {
  it('the outcome and the people', () => {
    expect(APPROVAL).toContain('people we will write to')
    // Masked — role, company, industry, country. Never a name or an address.
    expect(APPROVAL).toContain('{x.role}')
    expect(APPROVAL).toContain('{x.company}')
    const c = code(APPROVAL)
    for (const leak of ['x.email', 'x.name', 'x.first_name', 'x.linkedin']) {
      expect(c.includes(leak), `${leak} was rendered to the customer`).toBe(false)
    }
  })

  it('the actual words, and when each one goes', () => {
    expect(APPROVAL).toContain('What we will send')
    expect(APPROVAL).toContain('whenLabel(frozen.messages, i)')
  })

  it('an explicit APPROVE PROGRAMME action', () => {
    // ⛓️ 18 Sep (J16-C1) — ~~`expect(APPROVAL).toContain('Approve programme')`~~, ON THE RAW
    // FILE. This screen's own label was replaced by the founder's locked one when the duplicate
    // button elsewhere was withdrawn — and the assertion kept passing, because the chained note
    // recording the change QUOTES the old label. A presence guard that a comment can satisfy is
    // a guard about the comment. Read from code, and name the constant.
    const c = code(APPROVAL)
    expect(c, 'the action no longer carries the founder\'s locked label').toContain('APPROVE_LABEL')
    expect(APPROVAL).toContain("export const APPROVE_LABEL = 'Approve this programme'")
    expect(c).toContain("'/my/programme/approve'")
  })

  it('and the P2 status, so the next step is never a guess', () => {
    expect(ROUTE).toContain('second_settled:')
    expect(APPROVAL).toContain('p.second_settled')
  })

  it('🛑 it refuses to imply the messages are readable when they are not', () => {
    // An empty frozen sequence must never render as "nothing to read, go ahead".
    expect(APPROVAL).toContain('Please don&apos;t approve until you can read')
  })
})

describe('③ the screen decides nothing', () => {
  it('🛑 `canApprove` is the SERVER\'s boolean and is not re-derived here', () => {
    expect(APPROVAL).toContain('data.canApprove ?')
    const c = code(APPROVAL)
    // A rule this file could compute is a rule anybody with the console open could satisfy.
    for (const derived of ["=== 'READY_FOR_APPROVAL'", 'total > 0 &&', 'status ===']) {
      expect(c.includes(derived), `the screen re-derives approvability from ${derived}`).toBe(false)
    }
  })

  it('the route computes it from the status, the pause and a non-empty set', () => {
    expect(ROUTE).toContain("canApprove: p.status === 'READY_FOR_APPROVAL' && !p.paused_at && set.total > 0")
  })

  it('a paused or not-ready programme is told why, never left with a dead button', () => {
    expect(APPROVAL).toContain('Your programme is paused, so there is nothing to approve right now.')
    expect(APPROVAL).toContain('This is not ready for your approval yet.')
  })

  it('an already-approved programme says so and offers nothing', () => {
    // ⛓️ 18 Sep (J16-C1) — ~~`toContain('You approved this programme.')`~~ was this screen's
    // own sentence, and the same comment-matching problem as the label above. The founder's
    // locked sentence is what an approved programme says now, and it is asserted verbatim.
    const c = code(APPROVAL)
    expect(c).toContain('{APPROVED_COPY}')
    expect(APPROVAL).toContain(
      "export const APPROVED_COPY = 'Approved — nothing is sent until the programme goes Live.'")
    const at = c.indexOf('if (p.approved_at) {')
    expect(at).toBeGreaterThan(-1)
    const approvedBranch = c.slice(at, c.indexOf('return (', at) + 900)
    for (const action of ['APPROVE_LABEL', 'onClick={approve}', 'data-testid="approve-programme"']) {
      expect(approvedBranch, `an approved programme is offered ${action}`).not.toContain(action)
    }
  })
})

describe('④ approving spends nothing and sends nothing', () => {
  it('🛑 the screen has no payment, go-live, run or send path', () => {
    const c = code(APPROVAL)
    for (const forbidden of ['checkout', 'stripe', 'go-live', 'goLive', 'make-live', 'send-due', 'run-once']) {
      expect(c.toLowerCase().includes(forbidden.toLowerCase()), `the approval screen reaches ${forbidden}`).toBe(false)
    }
  })

  it('the only writes it makes are the two client decisions, and neither spends or sends', () => {
    // ⛓️ 23 Sep (Section 4 #18) — WAS `toEqual(['/my/programme/approve'])`. The screen gained a
    // SECOND client decision: saying something is wrong, which HOLDS the programme. That is a
    // different act from approving, not a part of it, and the flat "exactly one post" check
    // could not tell the two apart.
    //
    // 🛑 SO THE GUARD ASSERTS WHAT IT ALWAYS MEANT. This section is "approving spends nothing
    // and sends nothing": what matters is that every write this screen can make is a client
    // DECISION, and that none of them is a payment, a checkout or a send. A third route, or
    // either of these being swapped for something that moves money, still fails here.
    const posts = [...code(APPROVAL).matchAll(/api\.post<[^>]*>\(\s*'([^']+)'/g)].map(m => m[1])
    expect([...posts].sort()).toEqual(['/my/programme/approve', '/my/programme/concern'])
    for (const path of posts) {
      expect(path, `the approval screen can now reach a spending or sending route: ${path}`)
        .not.toMatch(/checkout|stripe|pay|send|run|live/i)
    }
  })

  it('the approve route is the customer-scoped one, resolved from the SESSION', () => {
    const at = ROUTE.indexOf("myProgrammeRouter.post('/approve'")
    const body = ROUTE.slice(at, at + 1400)
    expect(body).toContain('const clientId = await getClientId(req.userId!)')
    expect(body).toContain('openProgrammeForSession(clientId)')
    // ⛓️ 11 Sep (DAY 3) — AND THE AUTHOR IS THE FOURTH ARGUMENT, from the session. An approval
    // recorded no identity at all before this; `req.userId` is what `requireAuth` proved, and
    // there is no body field for it, so there is nothing a browser can put a person into.
    expect(body).toContain('approveProgrammeAsCustomer(clientId, p.id, version || null, req.userId ?? null)')
    // ── 🛑 NO CLIENT-SUPPLIED PROGRAMME AUTHORITY ────────────────────────────────────────
    //
    // ⛓️ 11 Sep (DAY 3) — THE GUARD IS NARROWED TO WHAT IT ACTUALLY DEFENDS, not relaxed. The
    // body now carries ONE field: `version`, the frozen package the client was reading. It can
    // only cause a REFUSAL (`stale_version`) and can never widen authority — while a
    // body-supplied programme or client id would let a signed-in customer approve somebody
    // else's programme, which is the thing this case exists for. So the ids are banned by name
    // and the version is allowed, rather than banning the word `req.body` and calling it a
    // security property.
    expect(body).toContain("const clientId = await getClientId(req.userId!)")
    for (const smuggled of ['req.body?.id', 'req.body.id', 'req.body?.programme', 'req.body.programme', 'req.body?.client', 'req.body.client']) {
      expect(body.includes(smuggled), `the approval takes ${smuggled} from the request`).toBe(false)
    }
    // ⚠️ COMPARED AS FIELD NAMES, NOT SPELLINGS. `req.body?.version` and `req.body.version`
    // are one field read twice (the typeof guard and the value); asserting on the raw matches
    // would be asserting on punctuation.
    const bodyFields = [...new Set((body.match(/req\.body\??\.(\w+)/g) ?? []).map(m => m.split('.').pop()))]
    expect(bodyFields, 'the approval reads something other than the version from the body').toEqual(['version'])
  })
})

describe('⑤ it appears where the client already is, and only when it should', () => {
  it('the programme page renders it', () => {
    expect(PAGE).toContain('ProgrammeApproval')
    expect(PAGE).toContain("'/my/programme/review'")
  })

  it('🛑 a failed review read does not take the whole screen down', () => {
    // A programme that loads but whose review set does not must still render the programme.
    expect(PAGE).toContain('catch { setReview(null) }')
  })

  it('it is silent at every stage that is not an approval', () => {
    // ⛓️ 24 Sep (R145 step 5) — the same two states, now drawn as two places: the panel while it
    // can be approved, and its approved state after. Still silent at every other stage.
    expect(PAGE).toContain('review?.programme && review.canApprove && !review.programme.approved_at ? (')
    expect(PAGE).toContain('{review?.programme && review.programme.approved_at && (')
  })
})
