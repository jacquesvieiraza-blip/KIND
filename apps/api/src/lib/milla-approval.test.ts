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

  it('the frozen payload carries the messages, the timing, the population and the schedule', () => {
    const at = ROUTE.indexOf('const frozen = snapObj ?')
    expect(at, 'the frozen payload is gone').toBeGreaterThan(-1)
    // ⛓️ 11 Sep (DAY 3) — 1200 → 2200, and `version:` JOINS THE REQUIRED FIELDS. The payload
    // gained the version the client is reading, plus the comment explaining why it exists, so
    // the window widened; the DUTY is unchanged and one field stronger.
    const block = ROUTE.slice(at, at + 2200)
    for (const field of ['version:', 'messages:', 'wait_days:', 'prospects:', 'send_schedule:', 'at:']) {
      expect(block, `the frozen payload lost ${field}`).toContain(field)
    }
  })

  it('🛑 AND NO IDENTIFIERS REACH THE CUSTOMER', () => {
    const at = ROUTE.indexOf('const frozen = snapObj ?')
    const block = ROUTE.slice(at, at + 2200)
    // The snapshot holds all of these; none of them is the customer's business.
    for (const leak of ['enrolled_lead_ids:', 'batch_lead_ids', 'campaign_id', 'sequence_id', 'sender']) {
      expect(block.includes(leak), `${leak} was handed to the customer`).toBe(false)
    }
  })

  it('the screen renders the frozen messages and says they are frozen', () => {
    expect(APPROVAL).toContain('frozen.messages.map')
    expect(APPROVAL).toContain('This is the version prepared for you on')
    expect(APPROVAL).toContain('If anything changes, we will ask you again.')
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
    expect(APPROVAL).toContain('Approve programme')
    expect(APPROVAL).toContain("'/my/programme/approve'")
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
    expect(APPROVAL).toContain('You approved this programme.')
    const at = APPROVAL.indexOf('if (p.approved_at) {')
    expect(at).toBeGreaterThan(-1)
    expect(APPROVAL.slice(at, APPROVAL.indexOf('return (', at) + 900))
      .not.toContain('Approve programme')
  })
})

describe('④ approving spends nothing and sends nothing', () => {
  it('🛑 the screen has no payment, go-live, run or send path', () => {
    const c = code(APPROVAL)
    for (const forbidden of ['checkout', 'stripe', 'go-live', 'goLive', 'make-live', 'send-due', 'run-once']) {
      expect(c.toLowerCase().includes(forbidden.toLowerCase()), `the approval screen reaches ${forbidden}`).toBe(false)
    }
  })

  it('the only write it makes is the approval itself', () => {
    const posts = [...code(APPROVAL).matchAll(/api\.post<[^>]*>\(\s*'([^']+)'/g)].map(m => m[1])
    expect(posts).toEqual(['/my/programme/approve'])
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
    expect(PAGE).toContain('review.canApprove || review.programme.approved_at')
  })
})
