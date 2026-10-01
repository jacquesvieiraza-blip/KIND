// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 · Coaching F2 · #2484) — EXPANSION MOMENTS: 25% · 50% · 75%.
//
// The founder's model, verbatim: the trigger is *"verified qualified meetings delivered ÷ purchased
// meeting target"*; *"Every milestone fires once per programme. Milla opens the client
// conversation, the right panel renders the relevant action, the client's response is remembered,
// and Enterprise is never offered Coaching because it already owns it."* (R180 Q5: a feature of
// Milla, not a product.) 25% shows value with no hard sale; 50% is the Full Coaching offer
// (Founders/Growth) or expansion (Enterprise); 75% is continuation first, and Coaching re-opens
// only after "not now" — never after "no thanks".
//
// DELIVERED is `programmeDelivery` — the same qualified-meeting count settlement uses. Never the
// calendar, never a booking we cannot verify.
// ONLY THE HIGHEST MILESTONE CROSSED FIRES. A programme that jumps from 20% to 60% gets the 50%
// moment, not 25% then 50% in one breath; 25% is then simply passed.
// MEMORY lives in `outcome_events` (event_type `expansion_moment`) — append-only, no migration.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'
import { BAND_PRICE_PER_MEETING_USD, FULL_COACHING_UPLIFT_PER_MEETING_USD, coachingIncluded, fullCoachingActivationUsd, type SizeBand } from '@kind/shared'

export const MILESTONES = [25, 50, 75] as const
export type Milestone = typeof MILESTONES[number]
export const RESPONSES = ['shown', 'engaged', 'accepted', 'not_now', 'declined'] as const
export type MomentResponse = typeof RESPONSES[number]
export const isResponse = (v: unknown): v is MomentResponse => typeof v === 'string' && (RESPONSES as readonly string[]).includes(v)

/** The highest milestone this delivery has crossed, or null below 25%. */
export function milestoneFor(delivered: number, target: number): Milestone | null {
  if (!(target > 0) || !(delivered >= 0)) return null
  for (const m of [...MILESTONES].reverse()) if (delivered * 100 >= m * target) return m
  return null
}

export type Plan = SizeBand
export type MomentView = {
  milestone: Milestone
  plan: Plan
  delivered: number
  target: number
  remaining: number
  /** What the client answered at THIS milestone (latest), and at 50% — 75% reads it. */
  response: MomentResponse | null
  response50: MomentResponse | null
  coachingIncluded: boolean
  /** ⛓️ 1 Oct (F3): the client pressed "Turn on" (50% or 75%) and the payment is NOT recorded yet —
   *  they opened the payment page and left. ~~Until F3 a yes was a request to our team.~~ */
  coachingRequested: boolean
  /** ⚑ 1 Oct (F3 · #2485) — Full Coaching is ON for this programme: a paid, not-refunded activation. */
  coachingActive: boolean
  pricePerMeeting: number
  upliftPerMeeting: number
  activationTotal: number
  chat: string
  /** ⚑ 1 Oct (#2518) — Enterprise at 25% only: Coaching Review #1, from the client's own answers
   *  (`meeting-debrief.ts`). `null` when it could not be read — the moment still shows. */
  review?: import('./meeting-debrief').CoachingReview | null
}

/** Milla's opening line for the moment. Pure — the copy is tested, not eyeballed. */
export function momentChat(v: Pick<MomentView, 'milestone' | 'plan' | 'delivered' | 'target' | 'remaining' | 'response50' | 'coachingRequested'> & { coachingActive?: boolean }): string {
  const part = `${v.delivered} of your ${v.target} qualified meetings`
  if (v.milestone === 25) {
    if (v.plan === 'enterprise') return `You're a quarter of the way: ${part} are delivered. Full Coaching is part of your plan, so open Coaching before each meeting for your prep brief.`
    if (v.plan === 'growth') return `You're a quarter of the way: ${part} are delivered. Your plan already includes meeting prep. Open Coaching before each meeting to get it. Nothing to buy.`
    return `You're a quarter of the way: ${part} are delivered. Before your next meeting, open Coaching for a prep brief on the person you're meeting. It's a taste of what Coaching does. Nothing to buy today.`
  }
  if (v.milestone === 50) {
    if (v.plan === 'enterprise') return `You're halfway: ${part} are delivered. Full Coaching is already part of your plan, so I'm not going to sell it to you again. Let's look at what's next: more meetings, another segment, or your next programme.`
    // ⛓️ 1 Oct (F3) — ~~"You asked for Full Coaching. Our team will confirm it and send the one payment."~~
    // The client now pays at the press (R180 Q2), so the line says what is true: on, or not finished.
    if (v.coachingActive) return `You're halfway: ${part} are delivered. Full Coaching is on for the meetings still to come.`
    if (v.coachingRequested) return `You're halfway: ${part} are delivered. You started turning on Full Coaching. Finish the one payment and it switches on.`
    return `You're halfway: ${part} are delivered. From here, Full Coaching would help turn the next ${v.remaining === 1 ? 'meeting' : `${v.remaining} meetings`} into deals: follow-up, objections, deal strategy and roleplay. It's $${FULL_COACHING_UPLIFT_PER_MEETING_USD} more for each meeting still to come, paid once.`
  }
  const next = `You're three-quarters of the way: ${part} are delivered. Before we finish, let's plan your next programme so there's no gap in your pipeline.`
  if (v.plan !== 'enterprise' && v.response50 === 'not_now') return `${next} And since you said "not now" to Full Coaching at halfway, it's still open if the timing is better now.`
  return next
}

async function latestResponses(programmeId: string): Promise<Map<Milestone, MomentResponse> | null> {
  const { data, error } = await db.from('outcome_events')
    .select('payload, occurred_at')
    .eq('event_type', 'expansion_moment').eq('payload->>programme_id', programmeId)
    .order('occurred_at', { ascending: false }).limit(100)
  if (error) { console.error('[expansion-moments] read failed:', error.message); return null }
  const out = new Map<Milestone, MomentResponse>()
  for (const r of (data ?? []) as Array<{ payload?: Record<string, unknown> | null }>) {
    const m = Number(r.payload?.milestone) as Milestone
    const resp = r.payload?.response
    if ((MILESTONES as readonly number[]).includes(m) && isResponse(resp) && !out.has(m)) out.set(m, resp)
  }
  return out
}

async function writeResponse(clientId: string, programmeId: string, milestone: Milestone, response: MomentResponse): Promise<boolean> {
  const { error } = await db.from('outcome_events').insert({
    client_id: clientId, event_type: 'expansion_moment', channel: 'milla',
    payload: { programme_id: programmeId, milestone, response },
    occurred_at: new Date().toISOString(),
  })
  if (error) console.error('[expansion-moments] write failed:', error.message)
  return !error
}

type ProgrammeLite = {
  id: string; meeting_target: number | null; size_band?: string | null; status?: string | null; coaching_on?: boolean
  // ⚑ 1 Oct (F3) — what the Coaching checkout checks; the route passes the full open-programme row.
  client_id?: string | null; paused_at?: string | null; disputed_at?: string | null; shortfall_credited_at?: string | null
}

/**
 * The moment this programme is at, firing it (once) if it is new: a remembered `shown`, and Milla's
 * opening line in the client's chat. `null` = no moment (below 25%, no target, or a read failed —
 * a moment is never shown on a number we could not read).
 */
export async function ensureMoment(clientId: string, p: ProgrammeLite): Promise<MomentView | null> {
  const plan = (['founders', 'growth', 'enterprise'] as const).find(b => b === p.size_band)
  const target = Number(p.meeting_target ?? 0)
  if (!plan || !(target > 0)) return null
  const { programmeDelivery } = await import('./meeting-truth')
  const d = await programmeDelivery(p.id)
  if (!d) return null
  const milestone = milestoneFor(d.delivered, target)
  if (!milestone) return null
  const memo = await latestResponses(p.id)
  if (!memo) return null

  // ⚑ 1 Oct (F3) — is Full Coaching on? Enterprise owns it and is never read. An unreadable answer
  // shows "not on" here; the checkout re-reads it and refuses on unreadable, so this never charges.
  let coachingActive = false
  if (!coachingIncluded(plan)) {
    const { coachingActivated } = await import('./coaching-access')
    coachingActive = await coachingActivated(p.id)
  }
  const response50 = memo.get(50) ?? null
  const view: MomentView = {
    milestone, plan, delivered: d.delivered, target, remaining: Math.max(0, target - d.delivered),
    response: memo.get(milestone) ?? null, response50,
    coachingIncluded: coachingIncluded(plan), coachingActive,
    coachingRequested: !coachingActive && (response50 === 'accepted' || memo.get(75) === 'accepted'),
    pricePerMeeting: BAND_PRICE_PER_MEETING_USD[plan], upliftPerMeeting: FULL_COACHING_UPLIFT_PER_MEETING_USD,
    activationTotal: fullCoachingActivationUsd(Math.max(0, target - d.delivered)), chat: '',
  }
  view.chat = momentChat(view)
  // ⚑ 1 Oct (#2518 · R180) — ENTERPRISE COACHING REVIEW #1 at 25%. Counted from the client's own
  // "How did it go?" answers and debriefs for THIS programme; "too early" below two. A failed read
  // drops the review, never the moment (and never shows "too early" on a number we could not read).
  if (plan === 'enterprise' && milestone === 25) {
    try {
      const { readCoachingReview } = await import('./meeting-debrief')
      view.review = await readCoachingReview(clientId, p.id)
    } catch (err) { console.error('[expansion-moments] coaching review not read:', err); view.review = null }
  }

  if (!view.response) {
    // FIRES ONCE: the remembered `shown` is what stops it firing again.
    if (!(await writeResponse(clientId, p.id, milestone, 'shown'))) return null
    view.response = 'shown'
    await postChat(clientId, p.id, milestone, view.chat)
  }
  return view
}

async function postChat(clientId: string, programmeId: string, milestone: Milestone, text: string): Promise<void> {
  try {
    const { data: sessions } = await db.from('milla_sessions').select('id').eq('client_id', clientId)
      .order('created_at', { ascending: false }).limit(1)
    const sessionId = sessions?.[0]?.id as string | undefined
    if (!sessionId) return
    await db.from('milla_messages').insert({
      session_id: sessionId, client_id: clientId, role: 'assistant', content: text,
      sources: { kind: 'expansion_moment', programme_id: programmeId, milestone },
    })
  } catch (err) { console.error('[expansion-moments] chat line not posted:', err) }
}

export type RespondResult = { ok: true; url?: string } | { ok: false; status: number; error: string }

/**
 * The client's answer to the moment on screen. Only the current milestone can be answered.
 *
 * ⛓️ 1 Oct (F3 · #2485) — "accepted" NOW OPENS THE ONE PAYMENT (R180 Q2). ~~Until Coaching billing
 * existed, a yes raised a `full_coaching_requested` task and our team sent the payment by hand.~~
 * The answer is remembered only once the checkout exists: a refused checkout (demo, Enterprise,
 * already on, nothing still to come) changes nothing. Coaching switches on when Stripe confirms
 * the payment (`recordCoachingActivation`), never at this press.
 */
export async function respondToMoment(
  clientId: string, p: ProgrammeLite, milestone: unknown, response: unknown,
  urls?: { successUrl?: string; cancelUrl?: string },
): Promise<RespondResult> {
  if (!isResponse(response) || response === 'shown') return { ok: false, status: 400, error: 'Unknown answer.' }
  const view = await ensureMoment(clientId, p)
  if (!view || view.milestone !== Number(milestone)) return { ok: false, status: 409, error: 'This moment has moved on. Refresh to see the current one.' }
  // 🛑 ENTERPRISE IS NEVER SOLD COACHING — "accepted" means nothing for a plan that owns it.
  if (response === 'accepted' && view.coachingIncluded) return { ok: false, status: 400, error: 'Full Coaching is already part of your plan.' }
  if (response === 'accepted') {
    const { createCoachingCheckout } = await import('./coaching-billing')
    const r = await createCoachingCheckout(clientId, p, String(urls?.successUrl ?? ''), String(urls?.cancelUrl ?? ''))
    if (!r.ok) return r
    // Memory only: a failed write never blocks a payment the client chose (logged in writeResponse).
    await writeResponse(clientId, p.id, view.milestone, 'accepted')
    return { ok: true, url: r.url }
  }
  if (!(await writeResponse(clientId, p.id, view.milestone, response))) {
    return { ok: false, status: 503, error: "We couldn't save that just now. Nothing changed — please try again." }
  }
  return { ok: true }
}
