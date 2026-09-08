// ═══════════════════════════════════════════════════════════════════════════════════════
// EVERY OUTBOUND PATH REACHES THE APPROVED-PREPARATION COMPARISON — the bypass audit.
//
// 🛑 WHY THIS FILE EXISTS, AND IT IS NOT A HAPPY REASON. The first cut of HOUSE-026 wired the
// comparison into `checkProgrammeAuthority` and I reported the item complete. An adversarial
// re-read found TWO outbound paths that never touch that function:
//
//   ① `checkEnrollmentAuthority` — THE MAIN SEND PATH — ended in a bare `authorityFor(p, action)`,
//      a PURE call. `sendSequenceEmailCore` (both the cron and the operator Run) reaches outreach
//      authority through it, so a sequence rewritten, retimed or re-audienced after approval was
//      sendable with the old consent still attached. The comparison existed and did not apply.
//
//   ② `sendDay1OutreachBatch` asked NO programme authority at all — demo flag, kill-switch, and
//      then cold email to real prospects. A paused, unapproved, unpaid or not-LIVE programme
//      would have been day-1 mailed the moment the kill-switch was on.
//
// ⚠️ THE LESSON IS THE SHAPE OF THE MISTAKE. "The gate is in the authority module" is not the
// same statement as "every sender reaches the gate", and only the second one is worth anything.
// A guard is a property of the CALL GRAPH, not of the module it lives in.
//
// ⚠️ SO THIS SUITE IS AN ENUMERATION, NOT A SAMPLE. It lists every function in the product that
// can cause an outbound touch and requires each to reach one of the two authority doors — and
// it requires BOTH doors to run the comparison, so neither can drift into being the lax one.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

/** Executable lines only — a promise made in a comment is not a property of the code. */
const code = (f: string) => readFileSync(join(__dirname, f), 'utf8')
  .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')

const AUTH = code('./programme-authority.ts')

/** The body of one exported function, so an assertion cannot be satisfied by a neighbour. */
function fn(src: string, name: string): string {
  const at = src.indexOf(`async function ${name}(`)
  expect(at, `${name} is gone — re-read this guard`).toBeGreaterThan(-1)
  const rest = src.slice(at + 10)
  const end = rest.indexOf('\nexport ')
  return rest.slice(0, end > -1 ? end : rest.length)
}

// ── ① BOTH AUTHORITY DOORS RUN THE COMPARISON ────────────────────────────────────────

describe('① there are exactly two doors to OUTREACH authority, and both compare', () => {
  it('🛑 checkProgrammeAuthority compares', () => {
    expect(fn(AUTH, 'checkProgrammeAuthority'))
      .toContain('outreachStillMatchesApproval(programme, verdict, ctx)')
  })

  it('🛑 checkEnrollmentAuthority compares — THE MAIN SEND PATH, and it did not', () => {
    const body = fn(AUTH, 'checkEnrollmentAuthority')
    expect(body, 'the enrollment door returns the PURE verdict again — every sequence send bypasses the freeze')
      .toContain('outreachStillMatchesApproval(p, enrolVerdict, ctx)')
    // 🛑 AND THE PURE CALL MUST NOT BE THE THING RETURNED. `return authorityFor(p, action)` is
    // the exact line that was the bypass; it reads correct and skips the comparison.
    expect(body, 'the bypass line is back verbatim').not.toContain('return authorityFor(p, action)')
  })

  it('the comparison itself is defined once, not once per door', () => {
    expect((AUTH.match(/async function outreachStillMatchesApproval/g) ?? []).length).toBe(1)
    expect((AUTH.match(/outreachStillMatchesApproval\(/g) ?? []).length,
      'a third call site appeared — check it is a door and not a bypass').toBe(3)
    // ⚑ 8 Sep — every guard the OUTREACH doors enforce lives INSIDE that one function, so the
    // schedule, the sender safety and the approved-preparation comparison cannot drift apart
    // into "the enrollment door checks two of the three".
    const gate = fn(AUTH, 'outreachStillMatchesApproval')
    // ⚠️ EACH GUARD'S *BRANCH*, NOT ITS NAME. A call whose result nobody acts on is not a gate,
    // and a `toContain` on the call site stays green when the `if` around it becomes `if (false)`.
    expect(gate, 'the send window is no longer enforced at the single door').toContain('maySendNow(')
    expect(gate, 'the window verdict is computed and then ignored').toContain('if (!when.allowed) {')
    expect(gate, 'sender safety is no longer enforced at the single door').toContain('programmeSenderSafety(')
    expect(gate, 'the sender verdict is computed and then ignored').toContain('if (!senderSafe.ok) {')
    expect(gate, 'the approved-preparation comparison is gone').toContain('preparationDrift(')
    // 🛑 AND NOTHING MAY RETURN BEFORE IT. A bare `return verdict` inserted above the drift
    // check leaves every assertion above satisfied while the comparison never runs — which is
    // exactly what teeth-proof 23 did, to a green suite.
    // ⚠️ ADJACENCY, NOT ORDERING. My first attempt compared indexes — drift computed before the
    // first `return verdict` — and the teeth-proof walked straight through it by inserting a
    // bare `return verdict` on the line BETWEEN them: the comparison still ran, its answer was
    // simply unreachable. What has to be true is that nothing at all sits in the gap.
    expect(gate, 'something returns the allowing verdict between the comparison and its result')
      .toContain("const drift = await preparationDrift(programme.id)\n  if (drift.state === 'unchanged') return verdict")
  })

  it('🛑 it fails CLOSED when the comparison cannot be made', () => {
    const body = fn(AUTH, 'outreachStillMatchesApproval')
    // Only `unchanged` returns the allowing verdict. `unreadable` and `changed` both refuse.
    expect(body).toContain("if (drift.state === 'unchanged') return verdict")
    expect(body).toContain("reason: 'preparation_changed'")
    // An approved programme with no stored hash is `unreadable` at source, so it lands here.
    const SNAP = code('./preparation-snapshot.ts')
    expect(SNAP).toContain('if (!p.approved_preparation_hash) {')
  })

  it('and only on OUTREACH — sourcing happens before there is an approval to drift from', () => {
    expect(fn(AUTH, 'checkProgrammeAuthority')).toContain("action !== 'OUTREACH'")
    expect(fn(AUTH, 'checkEnrollmentAuthority')).toContain("action !== 'OUTREACH'")
  })
})

// ── ② THE ENUMERATION — every outbound path, and where it asks ───────────────────────
//
// 🛑 A LIST THAT IS ALLOWED TO BE INCOMPLETE PROVES NOTHING, so the last case in this block
// re-derives the list from the source and fails if a new sender appears that is not named here.

const OUTBOUND: { file: string; name: string; expect: string }[] = [
  // The sequence sender — both the cron and the operator Run funnel into the core.
  { file: './figsy.ts', name: 'sendSequenceEmailCore', expect: 'checkEnrollmentAuthority' },
  // Day-1 cold outreach. Had NO programme gate at all until 7 Sep.
  { file: './figsy.ts', name: 'sendDay1OutreachBatch', expect: 'checkProgrammeAuthority' },
  // The two provider pushes — handing a prospect to an external engine that will send.
  { file: './smartlead-send.ts', name: 'pushApprovedLeadToSmartlead', expect: 'checkProgrammeAuthority' },
  { file: './instantly-push.ts', name: 'pushApprovedLeadToInstantly', expect: 'checkProgrammeAuthority' },
  // LinkedIn dispatch — a connection request is a touch on the client's behalf.
  { file: './linkedin.ts', name: 'dispatchLinkedInStep', expect: 'checkProgrammeAuthority' },
  // Campaign ACTIVATION — the door to `status: 'active'`, which is what makes work sendable.
  { file: './start-work.ts', name: 'ensureCampaignForIcp', expect: 'checkProgrammeAuthority' },
]

describe('② every outbound path asks one of the two doors', () => {
  for (const path of OUTBOUND) {
    it(`🛑 ${path.name} asks ${path.expect}`, () => {
      const src = code(path.file)
      const at = src.indexOf(`function ${path.name}(`)
      expect(at, `${path.name} is gone — re-read this guard`).toBeGreaterThan(-1)
      const rest = src.slice(at)
      const end = rest.indexOf('\nexport ')
      const body = rest.slice(0, end > -1 ? end : rest.length)
      // ⚠️ THE CALL AND THE BRANCH, NOT THE NAME. A teeth-proof that renamed the import to
      // `checkProgrammeAuthority: _unused` and hard-coded `{ allowed: true }` left a
      // `toContain('checkProgrammeAuthority')` assertion GREEN — the identifier was still in
      // the file, being deliberately not called. Presence of a name is not proof of a call,
      // and a call whose result nobody reads is not a gate.
      expect(body, `${path.name} names the guard but does not AWAIT it on OUTREACH`)
        .toMatch(new RegExp(`await ${path.expect}\\([^;]*'OUTREACH'`))
      expect(body, `${path.name} calls the guard and never branches on the verdict`)
        .toMatch(/if \(!\w+\.allowed\)/)
    })
  }

  it('🛑 the list above is COMPLETE — a new sender cannot appear unguarded', () => {
    // Every exported function in the send-capable modules whose name says it sends, dispatches
    // or pushes. If one appears that is not in OUTBOUND, this fails BY NAME rather than
    // silently leaving a path unaudited — which is exactly how the two bypasses survived.
    const named = new Set(OUTBOUND.map(p => p.name))
    // Senders that are deliberately NOT programme outreach, each with its reason.
    const EXEMPT = new Set([
      // Wrappers that delegate straight into sendSequenceEmailCore, which is audited above.
      'sendSequenceEmail', 'sendSequenceEmailOperatorRun',
      // Transport primitives — they send whatever a caller already decided to send.
      'send', 'sendAs', 'sendTemplateMessage', 'sendTextMessage',
      // OUR OWN operational mail, to the founder or to a client — never to a prospect.
      'sendFounderAlert', 'sendCountersignAlert', 'sendLowCreditsWarning', 'sendZeroCreditsWarning',
      'sendCampaignPausedEmail', 'sendWeeklyLeadsDigest', 'sendFirstLeadsReadyEmail',
      'sendOnboardingEmail', 'sendWelcomeEmail', 'sendSeatInviteEmail', 'sendPartnerInvite',
      'sendPartnerLiveEmail', 'sendPushToClient', 'sendNurtureEmail',
      // A human answering a human. `mayReplyToProspect` governs it, and a reply is deliberately
      // NOT blocked by a preparation change — see the note in ③.
      'sendManualReply',
      // A prospect-facing consent request, gated by AUTO_OUTREACH_ENABLED with the rest.
      'sendConsentEmail',
      // Reads, not writes.
      'sendReadiness', 'sendablePool', 'pushRefusalIsNews',
      // Enqueues a LinkedIn step; `dispatchLinkedInStep` is what actually touches anybody.
      'enqueueLinkedInStep',
    ])
    const files = ['./figsy.ts', './smartlead-send.ts', './instantly-push.ts', './linkedin.ts',
                   './start-work.ts', './send-due.ts', './sending-inbox.ts', './email.ts']
    const found: string[] = []
    for (const f of files) {
      let src: string
      try { src = code(f) } catch { continue }
      for (const m of src.matchAll(/export (?:async )?function ((?:send|dispatch|push|enqueue)[A-Za-z0-9_]*)/g)) {
        found.push(m[1])
      }
    }
    const unaudited = [...new Set(found)].filter(n => !named.has(n) && !EXEMPT.has(n)).sort()
    expect(unaudited, `outbound-capable functions nobody audited: ${unaudited.join(', ')}`).toEqual([])
    // Vacuity guard: the sweep must actually be finding functions.
    expect(found.length, 'the sweep found no senders at all — the regex or the file list is wrong')
      .toBeGreaterThan(10)
  })
})

// ── ③ WHAT IS DELIBERATELY *NOT* BEHIND THE COMPARISON, AND WHY ──────────────────────

describe('③ replies are conversation, and are deliberately outside this gate', () => {
  it('mayReplyToProspect is a PURE verdict and never consults the comparison', () => {
    const body = fn(AUTH.replace('export function mayReplyToProspect', 'export async function mayReplyToProspect'), 'mayReplyToProspect')
    expect(body).not.toContain('outreachStillMatchesApproval')
    // ⚠️ STATED, NOT HIDDEN. A reply exists only because outreach we WERE authorised to send
    // arrived and a human answered it. Refusing to answer them because the sequence was later
    // edited would leave a real person mid-conversation with silence — worse for the client
    // than the risk it would remove. This is a scope decision and it belongs to the founder;
    // it is asserted here so it stays a decision rather than becoming an accident.
    expect(body).toContain('REPLY_FORGIVEN')
  })

  it('🛑 but pause and terminal still bite on replies — forgiveness is a closed list', () => {
    const list = AUTH.slice(AUTH.indexOf('const REPLY_FORGIVEN'), AUTH.indexOf('export function mayReplyToProspect'))
    expect(list).not.toContain('programme_paused')
    expect(list).not.toContain('programme_terminal')
    // And `preparation_changed` is NOT forgiven by accident — it is simply never evaluated on
    // this path, because `authorityFor` is pure. Asserted so a future edit cannot quietly add it.
    expect(list).not.toContain('preparation_changed')
  })
})

// ── ④ THE SELECTION LAYER IS A SECOND, INDEPENDENT FENCE ─────────────────────────────

describe('④ a draft campaign is never even offered to the sender', () => {
  // ⚠️ BOTH QUERIES, AND THE SOURCE OF THE LIST. `.in('campaign_id', activeCampaignIds)` appears
  // TWICE in this file — the per-campaign cap read and the due-work read — so a teeth-proof that
  // deleted one left a `toContain` assertion green while half the fence was gone. And the list
  // itself is only worth anything because the query that BUILDS it filters on `status = 'active'`.
  it('🛑 send-due selects only ACTIVE campaigns — both queries, and the list is genuinely active', () => {
    const DUE = code('./send-due.ts')
    expect((DUE.match(/\.in\('campaign_id', activeCampaignIds\)/g) ?? []).length,
      'one of the two active-campaign restrictions in send-due has gone').toBe(2)
    expect(DUE, 'the "active campaigns" list is no longer filtered on status')
      .toContain("db.from('figsy_campaigns').select('id, client_id, settings').eq('status', 'active')")
  })

  it('so a pre-approval DRAFT campaign cannot enter the send queue at all', () => {
    // This is the structural half of "preparation is non-sending": authority refuses it, AND
    // the selection layer never offers it. Two independent fences, which is the shape this
    // repository already uses for historical enrolments.
    const PREP = code('./programme-preparation.ts')
    expect(PREP).toContain(': { activate: false })')
  })
})
