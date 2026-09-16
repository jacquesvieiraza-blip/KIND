// ⚑ 16 Sep (MVP1 · D1–D4) — RUN, RESULTS AND MEETING TRUTH.
//
// Four defects, and every one of them is the same shape: a control or a sentence that
// DESCRIBED an authority without touching it.
//
// ── D1: THE RUN BUTTON DID NOT RUN ────────────────────────────────────────────────────
//
// 🛑 `programmes.run_at` is the external-delivery authority. `POST /programmes/:id/run` is the
// route that writes it, and it is audited. Vida's lifecycle panel offers a "Run" action —
// and `onLifecycleAction`'s `case 'run'` called `runOnceWith`, i.e. `POST
// /operator/send-due/run-once`: the operator's SEND-ONCE tool. So an operator could press Run,
// watch emails go out, and `run_at` would still be NULL — the authority the whole ladder is
// built on was never granted by the button named after it.
//
// ── D2: MILLA SAID "RUNNING" BEFORE ANYTHING HAD RUN ──────────────────────────────────
//
// 🛑 `ProgrammeWorkspace.tsx` returned `'Running — nothing needed from you'` for the `Live`
// stage, and `Live` is `status === 'LIVE'`, which Make Live alone produces. The client payload
// carried NEITHER `run_at` NOR a send count, so the screen could not have known better. A
// client whose programme was armed and silent was told it was running.
//
// ── D3: A REVIEW HOLD COULD BE RAISED AND NEVER CLEARED ───────────────────────────────
//
// 🛑 `programme-authority.ts` writes `review_required_at`. NOTHING in the product writes
// `review_resolved_at` — grep returns reads only. `reviewIsOpen` is
// `review_required_at && !review_resolved_at`, so once raised it is true for ever and the
// programme's next batch authority never returns.
//
// ── D4: "MARK BOOKED" DID NOT BOOK A MEETING ──────────────────────────────────────────
//
// 🛑 It wrote `figsy_replies.meeting_booked_at` and an outcome event. `meetings` is the
// canonical meeting truth that Milla's count, the programme results and the review trigger
// all read — and nothing was inserted into it. The outcome the client is buying was recorded
// in a place none of those three look.

process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@kind/db', () => ({ db: { from: () => ({}), rpc: async () => ({ data: null, error: null }) } }))

import { programmeIsRunning } from '@kind/shared'

const REPO = join(__dirname, '../../../..')
const codeOnly = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')
const src = (p: string) => codeOnly(readFileSync(join(REPO, p), 'utf8'))

// ─────────────────────────────────────────────────────────────────────────────
// Ⓐ D1 — THE RUN ACTION GRANTS THE AUTHORITY
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓐ · D1 · the lifecycle Run action calls the canonical Run', () => {
  const page = () => src('apps/admin/src/app/vida/page.tsx')

  it('🛑 `case \'run\'` NO LONGER CALLS THE SEND-ONCE TOOL', () => {
    const s = page()
    const at = s.indexOf("case 'run':")
    expect(at, 'the run case moved').toBeGreaterThan(0)
    expect(s.slice(at, at + 200), 'the lifecycle Run still fires the operator send-once tool')
      .not.toMatch(/runOnceWith/)
  })

  it('it calls a helper that POSTs the canonical programme Run route', () => {
    const s = page()
    expect(s).toMatch(/\/programmes\/\$\{encodeURIComponent\([a-zA-Z]+\)\}\/run/)
  })

  it('🛑 SEND-ONCE SURVIVES AS ITS OWN TOOL — the three are never conflated', () => {
    const s = page()
    // Make Live, Run and send-once are three different acts. All three must still exist.
    expect(s).toMatch(/send-due\/run-once/)
    expect(s).toMatch(/lifecycle\('go-live'/)
  })

  it('and Run needs no ceiling, because Run sends nothing', () => {
    const copy = src('apps/admin/src/lib/vida-lifecycle-copy.ts')
    const at = copy.indexOf("key: 'run'")
    expect(at).toBeGreaterThan(0)
    expect(copy.slice(at, at + 120), 'the lifecycle Run still demands a send ceiling — that is send-once\'s input')
      .not.toMatch(/needsCeiling: true/)
  })

  it('🛑 AND NO SEND GATE WAS WEAKENED — Run records an authority, it delivers nothing', () => {
    const route = src('apps/api/src/routes/programme.ts')
    const at = route.indexOf("programmeRouter.post('/:id/run'")
    const r = route.slice(at, at + 1200)
    expect(r).toMatch(/runProgramme\(req\.params\.id/)
    // 🛑 NO SEND CALL. The route's own audit strings legitimately contain the WORD "delivery"
    // (it records that authority was granted and that nothing was sent), so the guard must
    // look for an actual send, not for the vocabulary.
    for (const sendCall of ['sendSequenceEmail', 'send-due', 'sendDue', 'enrichAndDeliverLeads']) {
      expect(r, `the Run route now calls ${sendCall} — Run grants authority and sends nothing`)
        .not.toContain(sendCall)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓑ D2 — "RUNNING" MEANS SOMETHING LEFT THE BUILDING
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓑ · D2 · Milla cannot say Running before a real delivery', () => {
  it('🛑 ARMED IS NOT RUNNING — LIVE with no Run authority', () => {
    expect(programmeIsRunning({ runAt: null, delivered: 0 })).toBe(false)
  })

  it('🛑 RUN AUTHORITY ALONE IS NOT RUNNING — nothing has gone out yet', () => {
    expect(programmeIsRunning({ runAt: '2026-09-16T00:00:00Z', delivered: 0 })).toBe(false)
  })

  it('🛑 AND A SEND WITHOUT RUN IS NOT RUNNING EITHER', () => {
    // Defensive: a delivery with no Run authority is a state that should not exist, and
    // reading it as "running" would paper over it.
    expect(programmeIsRunning({ runAt: null, delivered: 5 })).toBe(false)
  })

  it('BOTH, AND ONLY BOTH, IS RUNNING', () => {
    expect(programmeIsRunning({ runAt: '2026-09-16T00:00:00Z', delivered: 1 })).toBe(true)
  })

  it('an unreadable send count is NOT running — it fails closed', () => {
    expect(programmeIsRunning({ runAt: '2026-09-16T00:00:00Z', delivered: null })).toBe(false)
  })

  it('🛑 THE CLIENT PAYLOAD ACTUALLY CARRIES THE TWO FACTS', () => {
    const cp = src('apps/api/src/lib/customer-programme.ts')
    expect(cp, 'the client payload still has no Run authority in it').toMatch(/runAt/)
    expect(cp, 'the client payload still has no real send count in it').toMatch(/delivered/)
    // 🛑 REAL SENDS, from the send table — never a status, never a flag.
    expect(cp).toMatch(/figsy_sent_emails/)
  })

  it('🛑 AND THE SEND COUNT IS SCOPED TO THIS PROGRAMME', () => {
    const cp = src('apps/api/src/lib/customer-programme.ts')
    const at = cp.indexOf("figsy_sent_emails")
    const region = cp.slice(Math.max(0, at - 700), at + 400)
    // A client-wide count beside a programme reads as that programme's result — the exact
    // House defect. It must go through this programme's campaign.
    expect(region, 'the send count is not scoped through this programme')
      .toMatch(/campaign_id|programme/)
  })

  it('the workspace headline asks the shared rule, not the stage', () => {
    const ws = src('apps/portal/src/components/milla/ProgrammeWorkspace.tsx')
    expect(ws, 'the Live stage still hardcodes "Running"')
      .not.toMatch(/case 'Live':\s*return 'Running — nothing needed from you'/)
    expect(ws).toMatch(/programmeIsRunning/)
  })

  it('🛑 AND CO-PILOT IS UNCHANGED — a queue is not a delivery', () => {
    // Run exists, messages sit awaiting per-email approval, zero real sends: not Running.
    // This is the same assertion as "run without delivery", stated in Co-Pilot's terms
    // because that is the live configuration it protects.
    expect(programmeIsRunning({ runAt: '2026-09-16T00:00:00Z', delivered: 0 })).toBe(false)
    // Co-Pilot's own mechanism lives in `campaign-settings.ts` (`settings.review_required`,
    // which makes `sendSequenceEmail` enqueue for per-email approval instead of sending).
    // Nothing in this build touches it, and this asserts it is still there.
    const settings = src('apps/api/src/lib/campaign-settings.ts')
    expect(settings, 'Co-Pilot review_required was altered — it is explicitly out of scope')
      .toMatch(/review_required/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓒ D3 — A REVIEW HOLD CAN BE CLEARED
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓒ · D3 · the review hold has a resolution', () => {
  it('🛑 SOMETHING NOW WRITES `review_resolved_at`', () => {
    const all = [
      'apps/api/src/lib/programme-authority.ts',
      'apps/api/src/routes/programme.ts',
      'apps/api/src/routes/operator.ts',
    ].map(src).join('\n')
    expect(all, 'review_resolved_at is still write-only in name — nothing sets it')
      .toMatch(/review_resolved_at:\s/)
  })

  it('it refuses when there is no OPEN hold', () => {
    const auth = src('apps/api/src/lib/programme-authority.ts')
    const at = auth.indexOf('export async function resolveProgrammeReview')
    expect(at, 'the resolver does not exist').toBeGreaterThan(0)
    const fn = auth.slice(at, at + 2600)
    expect(fn).toMatch(/review_required_at/)
    expect(fn, 'a programme with no hold can be "resolved"').toMatch(/not_open|no open|already/i)
  })

  it('🛑 IT IS AUDITED — clearing a hold is an operator act on a money path', () => {
    const route = src('apps/api/src/routes/programme.ts')
    expect(route).toMatch(/programme_review_resolved/)
  })

  it('🛑 AND THE TRIGGER LOGIC IS UNTOUCHED — only the resolution is new', () => {
    const auth = src('apps/api/src/lib/programme-authority.ts')
    // `reviewIsOpen` keeps its exact definition, and the raise site keeps its threshold.
    expect(auth).toMatch(/Boolean\(r\.review_required_at\) && !r\.review_resolved_at/)
    expect(auth).toMatch(/review_required_at: new Date\(\)\.toISOString\(\)/)
  })

  it('and nothing resolves a hold automatically', () => {
    const auth = src('apps/api/src/lib/programme-authority.ts')
    const at = auth.indexOf('export async function resolveProgrammeReview')
    const fn = auth.slice(at, at + 2600)
    // It takes an operator identity. A resolver with no actor is a resolver a cron can call.
    expect(fn).toMatch(/by|operator|pressedBy/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓓ D4 — MARK BOOKED ENTERS CANONICAL MEETING TRUTH
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓓ · D4 · a reply marked booked becomes a meeting', () => {
  const figsy = () => src('apps/api/src/routes/figsy.ts')
  const route = () => {
    const s = figsy()
    const at = s.indexOf("figsyRouter.post('/replies/:id/mark-booked'")
    expect(at, 'the mark-booked route moved').toBeGreaterThan(0)
    return s.slice(at, at + 4000)
  }

  it('🛑 IT RECORDS A CANONICAL MEETING', () => {
    expect(route(), 'mark-booked still only stamps the reply')
      .toMatch(/recordBooking\(/)
  })

  it('and it resolves the attribution from the enrolment, never a guess', () => {
    expect(route()).toMatch(/resolveBookingAttribution\(/)
  })

  it('🛑 THE REPLY STAMP IS KEPT — nothing that worked was removed', () => {
    const r = route()
    expect(r).toMatch(/meeting_booked_at: new Date\(\)\.toISOString\(\)/)
    expect(r).toMatch(/logOutcomeEvent/)
    expect(r).toMatch(/recomputeCampaignCounters/)
  })

  it('🛑 AND IT IS STILL IDEMPOTENT — a second press creates no second meeting', () => {
    const r = route()
    // The existing early return on an already-booked reply is the first fence…
    expect(r).toMatch(/already_booked/)
    // …and `recordBooking`'s own unique index is the second, which is what makes a race safe.
    const truth = src('apps/api/src/lib/meeting-truth.ts')
    expect(truth).toMatch(/isUniqueViolation\(error\)/)
  })

  it('🛑 THE MEETING STATE MACHINE IS UNTOUCHED', () => {
    const truth = src('apps/api/src/lib/meeting-truth.ts')
    // The state is still DERIVED from the presence of a Google event id — a caller cannot
    // ask for BOOKED without the proof.
    expect(truth).toMatch(/verified \? 'BOOKED' : 'BOOKED_UNVERIFIED'/)
    expect(route(), 'mark-booked invented a calendar event id').not.toMatch(/googleEventId/)
  })

  it('and `calendar_bookings` and the calendar path are left alone', () => {
    const cal = src('apps/api/src/routes/calendar.ts')
    expect(cal).toMatch(/meeting_booked_at/)
    expect(cal).toMatch(/recordBooking\(/)
  })
})
