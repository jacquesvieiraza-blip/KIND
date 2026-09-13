// ═══════════════════════════════════════════════════════════════════════════════════════
// THE HOUSE RUNTIME FAILURE — the plain-text upstream error, and the partial write beneath it.
//
// ⛓️ 9 Sep. The founder pressed *Ready for approval* on the House programme. It ran for several
// minutes and then Vida showed:
//
//     Unexpected token 'u', "upstream error" is not valid JSON
//
// Afterwards the programme still said SOURCING, the entitlement was untouched — 246 used, 0
// reserved, 2254 left — and the legacy onboarding strip had moved from 75% to 88%, its
// *Sequence written* gap closed and *Campaign live* still open.
//
// ── WHAT THIS FILE PINS ─────────────────────────────────────────────────────────────────
//
//   ① the error string is INFRASTRUCTURE, not ours — no code path produces it
//   ② Vida no longer parses a non-JSON body as JSON, and says something true instead
//   ③ the onboarding move is explained by the sequence write, and that strip is CLIENT-WIDE
//      legacy wording with no authority over programme state
//   ④ *Campaign live* staying open is CORRECT — a pre-approval campaign is a draft
//   ⑤ a half-applied House sequence (row written, schedule not) is repaired on retry
//   ⑥ nothing in the failed attempt could have sent, activated a campaign, or moved money
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})
import { join } from 'node:path'

const LIB = join(__dirname)
const VIDA = readFileSync(join(LIB, '..', '..', '..', 'admin', 'src', 'app', 'vida', 'page.tsx'), 'utf8')
const PROXY = readFileSync(
  join(LIB, '..', '..', '..', 'admin', 'src', 'app', 'api', 'proxy', '[...path]', 'route.ts'), 'utf8')
const PREP = readFileSync(join(LIB, 'programme-preparation.ts'), 'utf8')
const START_WORK = readFileSync(join(LIB, 'start-work.ts'), 'utf8')
const FIGSY = readFileSync(join(LIB, 'figsy.ts'), 'utf8')
const OP_ROUTE = readFileSync(join(LIB, '..', 'routes', 'operator.ts'), 'utf8')

describe('① "upstream error" is not ours', () => {
  it('no source file produces that body', () => {
    // The string appears in exactly one place in the repo — a test fixture describing a
    // Resend failure — and nowhere in any code path this press touches.
    //
    // ⚠️ EXECUTABLE LINES ONLY. The routes now carry a comment explaining the very failure this
    // case is about, so a bare file search matches the explanation and reads it as the cause.
    const code = (src: string) => src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    for (const [name, src] of [['preparation', PREP], ['start-work', START_WORK], ['figsy', FIGSY], ['operator route', OP_ROUTE], ['proxy', PROXY]] as const) {
      expect(code(src).includes('upstream error'), `${name} produces the literal upstream error body`).toBe(false)
    }
  })

  it('our own proxy answers JSON on every branch it controls', () => {
    // 🛑 THE PROXY IS NOT THE CULPRIT AND THIS PROVES IT RATHER THAN ASSUMING IT. Every exit
    // it owns is `NextResponse.json`, including the unreachable-API and non-JSON-upstream
    // branches. A plain-text body therefore came from something IN FRONT of it.
    expect(PROXY).toContain("error: 'API unreachable'")
    expect(PROXY).toContain('API returned non-JSON response')
    expect(PROXY.includes('res.send('), 'the proxy can answer with a non-JSON body').toBe(false)
  })
})

describe('② Vida never shows a JSON parse error as the product error', () => {
  const handler = VIDA.slice(VIDA.indexOf('const lifecycle = useCallback'), VIDA.indexOf('const createProgrammeNow'))

  it('reads the body as text and parses defensively', () => {
    expect(handler).toContain('await res.text()')
    expect(handler).toContain('JSON.parse(raw)')
    // 🛑 THE LIFECYCLE RESPONSE ITSELF is never parsed straight to JSON — that is the line that
    // turned a lost connection into `Unexpected token 'u'`. Asserted on the POST, not on the
    // whole handler: the background poll below legitimately reads a small GET as JSON, and it
    // is not the response that failed.
    const post = handler.slice(handler.indexOf('await fetch(`/api/proxy/programmes/'))
    const postCall = post.slice(0, post.indexOf('await res.text()'))
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    expect(postCall, 'the lifecycle response is still parsed straight to JSON').not.toContain('.json()')
  })

  it('says something true and actionable when the body is not JSON', () => {
    const at = handler.indexOf('if (j === null)')
    expect(at, 'the non-JSON branch is gone').toBeGreaterThan(-1)
    const branch = handler.slice(at, at + 700)
    expect(branch).toContain('did not answer in time')
    // 🛑 THE MOST IMPORTANT SENTENCE ON THE SCREEN. The work may still be running; pressing
    // again is the one thing that must not be encouraged.
    expect(branch).toContain('do not press again')
    expect(branch).toContain('last preparation attempt')
    // The raw body is evidence, and it belongs in the log rather than on the desk.
    expect(branch).toContain('console.error')
  })

  it('the 202 background start is reported as started, not as done', () => {
    // ⛓️ 13 Sep (BL-1) — COMMENTS STRIPPED BEFORE THE WINDOW IS TAKEN, and this is a
    // strengthening rather than a workaround. The branch is sliced by CHARACTER COUNT, so an
    // explanatory comment added inside it pushes the code being asserted out of the window —
    // the guard then fails for a reason that has nothing to do with the rule it guards, which
    // is the same class of false signal as a comment SATISFYING an assertion. Stripping first
    // fixes both directions: the window now measures code, and no comment can answer for it.
    const code = handler.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    const at = code.indexOf("action === 'ready-for-approval' && res.status === 202")
    expect(at, 'the background start is not handled').toBeGreaterThan(-1)
    const branch = code.slice(at, at + 900)
    // The server's own sentence, never a cheerful one invented here.
    expect(branch).toContain('bg?.headline')
    expect(branch).toContain('preparing')
  })
})

describe('③ the onboarding strip is legacy, client-wide, and has no authority here', () => {
  const at = OP_ROUTE.indexOf("{ key: 'sequence',")
  const checks = OP_ROUTE.slice(at - 600, at + 600)

  it('"Sequence written" counts ANY client sequence row — which is why 75% became 88%', () => {
    // 🛑 THE EXPLANATION FOR THE NUMBER THE FOUNDER SAW. This check is a client-wide count of
    // `figsy_sequences`, with no programme scoping at all. The House sequence write landing is
    // sufficient to close it — and that is a legacy onboarding label moving, not a statement
    // about the programme's preparation.
    expect(checks).toContain("label: 'Sequence written'")
    expect(checks).toContain('(sequences.data ?? []).length > 0')
    // ⚠️ THE QUERY THAT FEEDS *THIS* STRIP, not the first `figsy_sequences` read in the file —
    // there are five, and the others belong to unrelated routes. Anchored by walking back from
    // the check itself to the read that produced `sequences`.
    const seqRead = OP_ROUTE.lastIndexOf("db.from('figsy_sequences').select('id, name, steps, created_at, updated_at')", at)
    expect(seqRead, 'the sequences read feeding the onboarding strip is gone').toBeGreaterThan(-1)
    const seqQuery = OP_ROUTE.slice(seqRead, seqRead + 220)
    expect(seqQuery).toContain(".eq('client_id', cid)")
    expect(seqQuery.includes('programme_id'), 'the legacy check is programme-scoped after all').toBe(false)
  })

  it('"Campaign live" requires an ACTIVE campaign — so it MUST stay open before approval', () => {
    // ⚠️ THIS GAP IS CORRECT, AND READING IT AS A BLOCKER WOULD BE THE DANGEROUS MISTAKE.
    // Pre-approval preparation creates the campaign as a DRAFT on purpose; `activate: true` is
    // the only door to `active`, and it stays shut until Make live. A closed "Campaign live"
    // before approval would mean something had gone wrong, not right.
    expect(checks).toContain("label: 'Campaign live'")
    expect(checks).toContain("c.status === 'active'")
  })

  it('the readiness rule — the one that actually gates the client — is separate from it', () => {
    // The programme gate is `programmePreparationReadiness`; the strip is `checks`. Nothing
    // reads the strip to decide a programme question.
    const strip = OP_ROUTE.slice(at - 900, at + 900)
    expect(strip.includes('programmePreparationReadiness'), 'the onboarding strip feeds the programme gate').toBe(false)
  })
})

describe('④ a half-applied House sequence is repaired, not wedged', () => {
  it('preparation re-applies the approved schedule when the sequence exists and the schedule does not', () => {
    // 🛑 THE RETRY WEDGE THIS CLOSES. `applyHouseProgrammeSequence` writes the sequence row and
    // THEN the schedule, as two statements — and the auto-apply above it runs only when NO
    // sequence resolves. So a run interrupted between the two writes would, on every retry,
    // find the sequence, skip the apply, and be refused at readiness with `no_send_schedule`
    // for ever. This is exactly the shape a killed request produces.
    const at2 = PREP.indexOf('A HALF-APPLIED HOUSE SEQUENCE IS REPAIRED')
    expect(at2, 'the schedule repair is gone').toBeGreaterThan(-1)
    // ⚠️ THE EXECUTABLE LINES OF THE BLOCK, bounded by the next real statement. The prose above
    // it names `applyHouseProgrammeSequence` while explaining the two-write gap, so a raw
    // substring search reads the explanation as the call it forbids.
    const block = PREP.slice(at2, PREP.indexOf('const { autoEnrollLead }', at2))
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    expect(block).toContain('isSendSchedule')
    expect(block).toContain('isHouseLaunchProgramme')
    // 🛑 THE SCHEDULE-ONLY WRITE, NEVER THE FULL APPLY. Calling `applyHouseProgrammeSequence`
    // here would ALSO update the sequence steps back to the approved copy, discarding an
    // operator's edit — the exact thing the 8 Sep never-overwrite lock forbids. Caught by the
    // existing preparation test when the first cut of this repair did precisely that.
    expect(block).toContain('applyHouseSendSchedule')
    expect(block.includes('applyHouseProgrammeSequence'),
      'the schedule repair calls the full apply and would overwrite an edited sequence').toBe(false)
  })

  it('the schedule-only write touches one column and is scope-gated', () => {
    const HOUSE_SEQ = readFileSync(join(LIB, 'house-sequence.ts'), 'utf8')
    const fn = HOUSE_SEQ.slice(
      HOUSE_SEQ.indexOf('export async function applyHouseSendSchedule'),
      HOUSE_SEQ.indexOf('export type ApplyScheduleResult'))
    expect(fn).toContain('isHouseLaunchProgramme(programmeId, clientId)')
    expect(fn).toContain('send_schedule: HOUSE_SEND_SCHEDULE')
    // Not the words, not the status, not an enrolment.
    for (const forbidden of ['figsy_sequences', 'steps', 'status', 'figsy_enrollments']) {
      expect(fn.includes(forbidden), `the schedule-only write also touches ${forbidden}`).toBe(false)
    }
  })

  it('it runs AFTER the sequence is proved present, so it cannot mask a missing sequence', () => {
    const seqRefusal = PREP.indexOf('has no canonical sequence with message steps')
    const repair = PREP.indexOf('A HALF-APPLIED HOUSE SEQUENCE IS REPAIRED')
    expect(repair).toBeGreaterThan(seqRefusal)
  })

  it('it is scoped to the proved House launch programme and to a genuinely missing schedule', () => {
    const at2 = PREP.indexOf('A HALF-APPLIED HOUSE SEQUENCE IS REPAIRED')
    const block = PREP.slice(at2, PREP.indexOf('const { autoEnrollLead }', at2))
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    // Not "every programme", and not "always" — the condition is the missing schedule.
    expect(block).toContain('if (!isSendSchedule(')
    expect(block).toContain('await isHouseLaunchProgramme(programmeId, p.client_id)')
  })
})

describe('⑤ the failed attempt could not have sent or activated anything', () => {
  it('pre-approval preparation creates the campaign as a DRAFT', () => {
    expect(PREP).toContain("{ activate: false }")
    const draft = START_WORK.slice(START_WORK.indexOf('if (!activate) {'), START_WORK.indexOf('if (!activate) {') + 500)
    expect(draft).toContain("status: 'draft'")
  })

  it('activation is reachable only through the going-live authority', () => {
    // `activate: true` is the only door to `status: 'active'`, and it is guarded by
    // `checkProgrammeAuthority('OUTREACH')` / `assertGoingLive`, which demand approval AND P2.
    expect(START_WORK).toContain("checkProgrammeAuthority(clientId, 'OUTREACH'")
    expect(START_WORK).toContain('assertGoingLive')
  })

  it('step one is refused twice over for a pre-approval programme', () => {
    // ⚠️ ENROLMENT CALLS THE SEND — and the send is gated by the kill-switch AND by OUTREACH
    // authority, which requires approval, P2 and status LIVE. Both return before any provider
    // call, so the 246 enrolments a completed run would create are inert BY CONSTRUCTION.
    expect(FIGSY).toContain("AUTO_OUTREACH_ENABLED != true")
    expect(FIGSY).toContain("checkEnrollmentAuthority(enrollmentId, 'OUTREACH'")
    const gate = FIGSY.slice(FIGSY.indexOf("checkEnrollmentAuthority(enrollmentId, 'OUTREACH'"))
    expect(gate.slice(0, 400)).toContain("return 'deferred'")
  })

  it('programme enrolment never touches the legacy wallet', () => {
    // The founder's House wallet is inert history; a programme enrolment must not spend it,
    // and must not create a per-lead charge, invoice or revenue row.
    expect(FIGSY).toContain('(isDemo || opts?.prepaid || programmeFulfilment) ? \'skipped\'')
  })

  it('the cron can only pick ACTIVE campaigns, so a draft is unreachable by it', () => {
    const SEND_DUE = readFileSync(join(LIB, 'send-due.ts'), 'utf8')
    expect(SEND_DUE).toContain("db.from('figsy_campaigns').select('id, client_id, settings').eq('status', 'active')")
    expect(SEND_DUE).toContain('.in(\'campaign_id\', activeCampaignIds)')
  })
})
