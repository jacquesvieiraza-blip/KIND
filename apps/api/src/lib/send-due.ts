// ═══════════════════════════════════════════════════════════════════════════════════════
// ONE SEND RUN — the cron's and the founder's, and there is only one of them.
//
// ⚑ 2 Sep. Two defects and one launch need met in a single place, because splitting them
// would have produced a second emailing implementation — and two send engines is how one of
// them quietly stops honouring a gate the other still has.
//
// 🛑 DEFECT 1 — THE CAMPAIGN PATH NEVER ROTATED. `sendSequenceEmail` resolved its mailbox
// ONCE PER EMAIL through `pickSendingInbox`, which ranks active-before-assigned and
// branded-before-pooled and returns the FIRST row. On a two-box client every message
// therefore left from the same box and the second mailbox never sent at all. Rotation
// existed — `sendablePool` + `nextFromRotation` — but only `sendDay1OutreachBatch` called
// it, so the tests were green and the production path was untouched by them.
//
// 🛑 DEFECT 2 — `client_inboxes.daily_cap` WAS NEVER READ ON THIS PATH. A mailbox's own
// 30/day was decorative during a campaign run; only the global and per-client caps applied.
//
// 🔐 THE LAUNCH NEED — `AUTO_OUTREACH_ENABLED` is one global switch that arms every automatic
// path across every client at once. A launch canary needs the opposite: one client, one run,
// pressed by hand, global switch still off. So this function has two modes, and the ONLY
// difference between them is which send entry point is called and what bounds the run.
//
// ⚠️ EVERY GATE IS SHARED. Suppression, PECR, country, demo backstop, programme authority,
// the review queue, the atomic step claim, the global cap, the per-client cap, the
// per-campaign cap and the send window all live inside the core both modes call. This file
// decides WHICH enrolments are offered and WHICH mailbox carries each one. It never decides
// whether a send is allowed.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import type { InboxRow } from './sending-inbox'

/**
 * AUTOMATIC — what the 2-hourly cron asks for. Every active campaign, bounded by the shared
 * daily budget. Authority is unchanged: `AUTO_OUTREACH_ENABLED` or nothing sends.
 *
 * OPERATOR_RUN — a founder-pressed run. ONE named client, an explicit ceiling, and the
 * operator send authority. There is deliberately no "all clients" shape: the type itself
 * makes an unscoped operator run unrepresentable, so it cannot be reached by forgetting a
 * parameter.
 */
export type SendDueMode =
  | { mode: 'automatic' }
  | { mode: 'operator_run'; clientId: string; maxSends: number }

export type SendDueResult = {
  mode: 'automatic' | 'operator_run'
  /** The founder's explicit ceiling for this execution; null on the automatic path. */
  requested_max_sends: number | null
  /** Enrolments we actually called the send path for. */
  attempted: number
  sent: number
  deferred: number
  suppressed: number
  queued: number
  failed: number
  /** Skipped BEFORE the send path: campaign cap, send window, reply branching, exhaustion. */
  skipped: number
  /** Successful sends per mailbox address, for THIS execution only. Never persisted. */
  per_mailbox: Record<string, number>
  /** Clients whose every mailbox reached its own daily_cap during this run. */
  exhausted_clients: string[]
  /** Mailboxes dropped from rotation after a confirmed SMTP failure, this run only. */
  evicted_mailboxes: string[]
  clients_served: number
  daily_limit: number
  remaining_today: number
  campaign_capped_skips: number
  window_skips: number
  campaigns_outside_window: number
  no_active_campaigns?: true
  capped?: true
  /**
   * ⚑ 18 Sep (J20-C1 · LR 21) — THE RUN STOPPED BECAUSE A READ FAILED, AND SAYS WHICH.
   *
   * ── 🛑 WHY THIS IS NOT "NOTHING TO SEND" ────────────────────────────────────────────────
   *
   * Four reads in this selector discarded their error, and the two that count did something
   * worse than stopping: they WIDENED A CAP. `sentToday` unread became `?? 0`, so the global
   * budget read as the full daily limit however many had already gone out today; and the
   * per-campaign tally unread became an empty map, so every campaign's own daily cap read as
   * zero-used. A database hiccup was therefore a licence to send the whole day's allowance
   * again — the exact inversion this item exists to remove.
   *
   * ⚠️ A HALT IS A DISTINCT OUTCOME, NOT AN EMPTY RESULT. `no_active_campaigns` and `capped`
   * are TRUE statements about a healthy run; reporting a failed read as either of them is how
   * an operator watches a cron report "nothing to do" for a week.
   */
  halted?: { reason: SendDueHaltReason; detail: string }
}

/** Which read could not be completed. Each one is a different thing to go and look at. */
export type SendDueHaltReason =
  | 'daily_total_unreadable'
  | 'active_campaigns_unreadable'
  | 'campaign_tallies_unreadable'
  | 'due_enrolments_unreadable'

type RotationSlot = { id: string; dailyCap: number | null; sentThisBatch: number; row: InboxRow }

/**
 * ⚑ 18 Sep (J20-C1 · LR 21) — STOP THE RUN, AND LEAVE A RECORD THAT IT STOPPED.
 *
 * ⚠️ THE TASK IS THE PERSISTED TRUTH, NOT THE RETURN VALUE. `runSendDue`'s result is read by
 * the caller and discarded; a cron that halts every two hours with nobody told is the same
 * silence this item removes, wearing a different shape. `sendFounderAlert` writes the
 * `operator_tasks` row (XC-5) that Vida Needs-you reads, and `sends_stalled` is exactly this
 * class. It dedupes per reason, so a database that is unwell for a day produces one task.
 *
 * ⚠️ IT NEVER THROWS INTO THE RUN. An exception-reporting path that breaks the path it rides
 * on is worse than one that reports nothing — and the run has already decided to send nothing.
 */
async function halt(
  mode: SendDueMode, dailyLimit: number, reason: SendDueHaltReason, detail: string,
  remainingToday = 0,
): Promise<SendDueResult> {
  console.error(`[send-due] HALTED (${reason}) — ${detail}`)
  try {
    const { sendFounderAlert } = await import('./alerts')
    await sendFounderAlert('sends_stalled', 'The send run stopped — a read failed, so nothing was selected', [
      `Mode: ${mode.mode}${mode.mode === 'operator_run' ? ` (client ${mode.clientId}, max ${mode.maxSends})` : ''}.`,
      detail,
      'No enrolment was selected, no cap was assumed, and no email left. The next run will try again.',
    ], { subjectKind: 'send_run', subjectId: reason })
  } catch (err) {
    console.error('[send-due] the halt could not be reported:', err)
  }
  return empty(mode, dailyLimit, { remaining_today: remainingToday, halted: { reason, detail } })
}

const empty = (mode: SendDueMode, dailyLimit: number, extra: Partial<SendDueResult> = {}): SendDueResult => ({
  mode: mode.mode,
  requested_max_sends: mode.mode === 'operator_run' ? mode.maxSends : null,
  attempted: 0, sent: 0, deferred: 0, suppressed: 0, queued: 0, failed: 0, skipped: 0,
  per_mailbox: {}, exhausted_clients: [], evicted_mailboxes: [],
  clients_served: 0, daily_limit: dailyLimit, remaining_today: 0,
  campaign_capped_skips: 0, window_skips: 0, campaigns_outside_window: 0,
  ...extra,
})

export async function runSendDue(mode: SendDueMode): Promise<SendDueResult> {
  const dailyLimit = process.env.FIGSY_DAILY_SEND_LIMIT ? parseInt(process.env.FIGSY_DAILY_SEND_LIMIT, 10) : 200
  const todayUTC = new Date()
  todayUTC.setUTCHours(0, 0, 0, 0)

  // ── ⚑ 18 Sep (J20-C1 · LR 21) — A READ WE COULD NOT COMPLETE HALTS THE RUN ─────────────
  //
  // 🛑 ~~`const { count: sentToday } = await …`~~ DISCARDED ITS ERROR, and the fallback below
  // was `sentToday ?? 0` — so a failed count did not stop the run, it told the run that NOTHING
  // had been sent today. The global budget then opened to the full daily limit on top of
  // whatever had already gone out. A database hiccup was a licence to send the day's allowance
  // twice, and nothing anywhere said so.
  const { count: sentToday, error: sentTodayErr } = await db.from('figsy_sent_emails')
    .select('id', { count: 'exact', head: true })
    .gte('sent_at', todayUTC.toISOString())
  if (sentTodayErr || sentToday === null || sentToday === undefined) {
    return halt(mode, dailyLimit, 'daily_total_unreadable',
      `today's send total could not be read (${sentTodayErr?.message ?? 'no count returned'}), so the remaining daily budget is unknown. Nothing was selected and nothing was sent.`)
  }

  const remaining = Math.max(0, dailyLimit - sentToday)
  if (remaining === 0) return empty(mode, dailyLimit, { capped: true })

  // ⚠️ `max_sends` NARROWS, IT NEVER WIDENS. The founder's ceiling is intersected with the
  // shared daily budget rather than replacing it, so an operator run cannot be used to send
  // past a limit the automatic path would have respected.
  const budget = mode.mode === 'operator_run' ? Math.min(remaining, mode.maxSends) : remaining
  if (budget === 0) return empty(mode, dailyLimit, { remaining_today: remaining })

  // Only send for ACTIVE campaigns — paused / archived / low-performance campaigns must stop
  // sending. An operator run is scoped to ONE client here, at the query, so no later filter
  // can be forgotten and no other client's campaign can enter the run at all.
  let campQ = db.from('figsy_campaigns').select('id, client_id, settings').eq('status', 'active')
  if (mode.mode === 'operator_run') campQ = campQ.eq('client_id', mode.clientId)
  // ⚠️ AND AN UNREADABLE CAMPAIGN LIST IS NOT "no active campaigns". That is a TRUE statement
  // about a healthy account; reporting a failed read as one is how an operator watches a cron
  // say "nothing to do" for a week while a client's outreach is stopped.
  const { data: activeCamps, error: campErr } = await campQ
  if (campErr) {
    return halt(mode, dailyLimit, 'active_campaigns_unreadable',
      `the active campaigns could not be listed (${campErr.message}). Nothing was selected and nothing was sent.`)
  }

  const activeCampaignIds = (activeCamps ?? []).map((c: { id: string }) => c.id)
  if (activeCampaignIds.length === 0) {
    return empty(mode, dailyLimit, { remaining_today: remaining, no_active_campaigns: true })
  }

  // Per-campaign daily cap (#320): `settings.daily_send_limit` caps that campaign's sends for
  // the UTC day (0 = paused today); null/absent = no per-campaign cap.
  const campaignLimit = new Map<string, number | null>()
  for (const c of activeCamps ?? []) {
    const dl = (c as { settings?: { daily_send_limit?: unknown } | null }).settings?.daily_send_limit
    campaignLimit.set((c as { id: string }).id, typeof dl === 'number' && dl >= 0 ? dl : null)
  }

  // SEND WINDOW — fails OPEN (no window, or one we cannot parse, means send): the kill-switch,
  // the caps and the approval queue are the real safety gates, and a garbled preference field
  // must never silently halt a client's outreach.
  const { withinSendWindow } = await import('./campaign-settings')
  const windowNow = new Date()
  const outsideWindow = new Set<string>()
  for (const c of activeCamps ?? []) {
    const row = c as { id: string; settings?: unknown }
    if (!withinSendWindow(row.settings, windowNow)) outsideWindow.add(row.id)
  }

  // 🛑 THE SECOND CAP THAT WIDENED ON A FAILED READ. An unread tally left `sentByCampaign`
  // empty, and an empty map means every campaign has sent nothing today — so a campaign at its
  // own daily cap was offered its whole allowance again.
  const { data: sentRows, error: sentRowsErr } = await db.from('figsy_sent_emails')
    .select('campaign_id')
    .gte('sent_at', todayUTC.toISOString())
    .in('campaign_id', activeCampaignIds)
  if (sentRowsErr) {
    return halt(mode, dailyLimit, 'campaign_tallies_unreadable',
      `today's per-campaign send tallies could not be read (${sentRowsErr.message}), so each campaign's own daily cap is unknown. Nothing was selected and nothing was sent.`)
  }
  const sentByCampaign = new Map<string, number>()
  for (const r of sentRows ?? []) {
    const cid = (r as { campaign_id: string | null }).campaign_id
    if (cid) sentByCampaign.set(cid, (sentByCampaign.get(cid) ?? 0) + 1)
  }

  const now = new Date().toISOString()
  const fetchCeil = Math.min(Math.max(budget, 1) * 5, 2000)
  // ⚠️ AND AN UNREADABLE CANDIDATE SET IS NOT AN EMPTY ONE. This one fails closed either way —
  // no rows, no sends — but "we selected nobody" and "we could not ask who was due" are
  // different facts, and only one of them needs a human.
  // ── 🛑 ⚑ 18 Sep (P6 §8.2 · J20) — `client_id` IS SELECTED ON THE LEAD, AND IT IS LOAD-BEARING
  //
  // 🛑 WITHOUT IT NOTHING COULD EVER SEND. The send seam resolves the client's mailbox from
  // `lead.client_id` (`figsy.ts`: `const inboxFor = lead.client_id ?? null`) and REFUSES when
  // it is absent — "This lead has no client on it, so there is no mailbox to send from." This
  // projection did not ask for the column, so every enrolment reached the seam with an
  // undefined client, every send was deferred, the step was rolled back to stay due, and a
  // `sends_stalled` alert fired. The run reported `attempted: 1, deferred: 1` and zero sent,
  // for every client, on every run.
  //
  // ⚠️ THE UNIT SUITE CANNOT SEE THIS, and that is the point of the full-stack run. Those
  // tests construct the `lead` object by hand and naturally include `client_id`; only a real
  // PostgREST answering a real embedded select omits what the projection did not name.
  const { data: due, error: dueErr } = await db.from('figsy_enrollments')
    .select('*, leads(id,client_id,first_name,last_name,email,job_title,company,industry,seniority,country,tech_stack,score,score_reasoning)')
    .in('status', ['enrolled', 'in_progress'])
    .in('campaign_id', activeCampaignIds)
    .lte('next_send_at', now)
    .order('next_send_at', { ascending: true })
    .limit(fetchCeil)
  if (dueErr) {
    return halt(mode, dailyLimit, 'due_enrolments_unreadable',
      `the due enrolments could not be read (${dueErr.message}). Nothing was selected and nothing was sent.`, remaining)
  }

  // ── ⚑ POSITIVE ATTRIBUTION AT THE SELECTION LAYER ───────────────────────────────────────
  //
  // 🛑 TWO INDEPENDENT GATES, AND BOTH ARE REQUIRED. `checkEnrollmentAuthority` refuses
  // history at send time; this one stops it ever being OFFERED. Relying on authority alone
  // would mean every one of House's ~263 legacy enrollments entered the candidate set on
  // every run, consumed budget accounting, and was refused one by one — and a single gap in
  // the authority path would put a real historical person back in a live send queue.
  //
  // The rule matches the authority layer exactly, so the two can never disagree:
  //   • client has an open programme → the enrollment must NAME that programme;
  //   • client has none             → genuine legacy, selected exactly as before;
  //   • programme state unreadable  → FAIL CLOSED, select nothing for that client.
  //
  // ⚠️ ONE READ PER CLIENT, not one per enrollment — a per-row read would issue hundreds of
  // queries per run for the exact case this exists to reject.
  const openProgrammeByClient = new Map<string, string | null>()
  for (const cid of new Set((due ?? []).map(e => (e as { client_id?: string | null }).client_id).filter(Boolean))) {
    try {
      // ⛓️ C2 — THE COMMERCIAL MODEL DECIDES, NOT THE ABSENCE OF A ROW. `openId == null` below
      // means "genuine legacy client, select their work as before". For a DECLARED programme
      // client with no open programme that reading was wrong: their historical enrolments would
      // have been selected for sending under legacy authority. `'__none__'` marks them, and the
      // filter selects nothing for them at all — no programme, no authority, no send.
      const { clientCommercialModel } = await import('./commercial-model')
      const model = await clientCommercialModel(cid as string)
      if (model.model === 'unreadable') throw new Error(model.reason)
      if (model.model === 'programme' && !model.openProgramme) {
        openProgrammeByClient.set(cid as string, '__none__')
        continue
      }
      // ── 🛑 10 Sep (H) — ARMED IS NOT STARTED. AN UN-RUN PROGRAMME IS NOT OFFERED ────────
      //
      // `checkEnrollmentAuthority` refuses `programme_not_run` at send time, and that is the
      // real gate. This one stops the work ENTERING the candidate set — the same two-layer
      // shape the attribution rule above uses, and for the same reason: a run should not be
      // spending its budget accounting on rows it is about to refuse one by one, and a single
      // gap in the authority path must not put a real prospect in a live send queue.
      //
      // ⚠️ `run_at` MISSING READS AS NOT RUN. Before `20260910_programme_run_authority` the
      // column does not exist and comes back `undefined`; that selects nothing, which is the
      // safe direction and matches what the authority layer decides about the same row.
      if (model.openProgramme && !model.openProgramme.run_at) {
        openProgrammeByClient.set(cid as string, '__not_run__')
        continue
      }
      openProgrammeByClient.set(cid as string, model.openProgramme?.id ?? null)
    } catch (err) {
      // ⛓️ C2 — the throw now also comes from an UNREADABLE commercial model, deliberately: a
      // model we cannot resolve and a programme we cannot read are the same refusal. Neither a
      // database hiccup nor an unresolved model may read as "legacy client, proceed".
      console.error(`[send-due] programme state unreadable for client ${cid} — selecting nothing for them this run:`, err)
      openProgrammeByClient.set(cid as string, '__unreadable__')
    }
  }

  const dueRows = (due ?? []).filter(e => {
    const cid = (e as { client_id?: string | null }).client_id ?? null
    if (!cid) return false
    const openId = openProgrammeByClient.get(cid)
    if (openId === '__unreadable__') return false          // fail closed
    // 🛑 A PROGRAMME-MODEL CLIENT WITH NO PROGRAMME HAS NOTHING TO SEND. Not an error — a
    // waiting state. Their history is preserved and simply carries no send authority.
    if (openId === '__none__') return false
    // 🛑 ARMED BUT NEVER RUN. Also a waiting state, and the one this whole change exists for:
    // Make Live leaves every enrolment due, so without this the cron would send the moment
    // the kill-switch opened, with nobody having pressed Run.
    if (openId === '__not_run__') return false
    if (openId == null) return true                        // genuine legacy client — unchanged
    return (e as { programme_id?: string | null }).programme_id === openId
  })

  // FAIR ORDER (#320): group by client, then interleave round-robin so one client's backlog
  // cannot starve another under the shared cap.
  const byClient = new Map<string, typeof dueRows>()
  for (const e of dueRows) {
    const cid = ((e as { client_id?: string | null }).client_id) ?? 'unknown'
    if (!byClient.has(cid)) byClient.set(cid, [])
    byClient.get(cid)!.push(e)
  }
  const clientQueues = [...byClient.values()]
  const maxLen = clientQueues.reduce((m, q) => Math.max(m, q.length), 0)
  const fairOrder: typeof dueRows = []
  for (let i = 0; i < maxLen; i++) {
    for (const q of clientQueues) if (i < q.length) fairOrder.push(q[i])
  }

  // ── #610 ROTATION, BUILT ONCE PER CLIENT ────────────────────────────────────────────────
  //
  // 🛑 ONCE PER CLIENT, NOT ONCE PER EMAIL. That distinction IS the defect: a tally rebuilt
  // per message resets to zero every time, so "least-used" always answers the same box and
  // rotation becomes a silent no-op. It lives here because this scope is the run.
  //
  // ⚠️ THE COUNTS ARE IN MEMORY AND THAT IS A LIMIT, NOT A CHOICE. `figsy_sent_emails` has no
  // column naming the mailbox that sent, so "how many has THIS box sent today?" cannot be
  // read back from the database. Within one run the spread and the per-box caps are exact;
  // two runs in one day could put a box over its own cap, bounded still by the global cap.
  // The fix is one column (#610), and it is deliberately not in this build.
  const { sendablePool, nextFromRotation } = await import('./sending-inbox')
  const { secretState } = await import('./inbox-secret')
  const secretOk = secretState().ok
  const rotationByClient = new Map<string, RotationSlot[]>()

  async function rotationFor(clientId: string): Promise<RotationSlot[]> {
    const cached = rotationByClient.get(clientId)
    if (cached) return cached
    // ⚠️ SCOPED AT THE QUERY. RULEBOOK 12.2 — a sender is never shared across clients; one
    // client's spam complaints poison the rest. A client's map entry can only ever hold rows
    // that came back from `.eq('client_id', …)`.
    const { data } = await db.from('client_inboxes')
      .select('id, email, kind, status, provider, daily_cap, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, from_name')
      .eq('client_id', clientId).not('status', 'in', '("released","retired")')
    const pool = sendablePool((data ?? []) as unknown as InboxRow[], secretOk)
    const slots: RotationSlot[] = pool.ok
      ? pool.boxes.map(b => ({ id: String(b.id), dailyCap: b.daily_cap ?? null, sentThisBatch: 0, row: b }))
      : []
    rotationByClient.set(clientId, slots)
    return slots
  }

  const { sendSequenceEmail, sendSequenceEmailOperatorRun, applyReplyBranching, enrollmentStep } = await import('./figsy')
  const send = mode.mode === 'operator_run' ? sendSequenceEmailOperatorRun : sendSequenceEmail

  const stepsCache = new Map<string, { step: number; on_reply?: 'stop' | 'skip_next' | 'continue' }[] | null>()
  const r = empty(mode, dailyLimit)
  const exhaustedClients = new Set<string>()
  const evicted = new Set<string>()

  for (const enrollment of fairOrder) {
    // The founder's ceiling and the shared budget are the same test — `budget` already
    // intersects them, so there is one place a run can stop counting up.
    if (r.sent >= budget) break
    const lead = Array.isArray(enrollment.leads) ? enrollment.leads[0] : enrollment.leads
    if (!lead?.email) continue

    const nextStep = enrollment.current_step + 1
    const stepView = enrollmentStep(enrollment, nextStep)
    if (!stepView) continue

    const campId = enrollment.campaign_id as string
    const capForCampaign = campaignLimit.get(campId)
    if (capForCampaign != null && (sentByCampaign.get(campId) ?? 0) >= capForCampaign) {
      r.campaign_capped_skips++; r.skipped++; continue
    }
    if (outsideWindow.has(campId)) { r.window_skips++; r.skipped++; continue }

    const clientId = (enrollment as { client_id?: string | null }).client_id ?? lead.client_id ?? null
    // No client on the row means no mailbox to rotate and no isolation guarantee. Skip rather
    // than guess — a guessed client is how one client's mail leaves another's mailbox.
    if (!clientId) { r.skipped++; continue }

    // 🛑 EXHAUSTION IS PER CLIENT AND NEVER ENDS THE RUN. `break` here would abandon every
    // OTHER client still in `fairOrder` because one of them ran out of mailbox capacity.
    if (exhaustedClients.has(clientId)) { r.skipped++; continue }

    try {
      if (await applyReplyBranching(enrollment, stepsCache) === 'skip') { r.skipped++; continue }
    } catch (err) {
      console.error('[send-due] branching', enrollment.id, ':', err)
    }

    // Which mailbox carries THIS message? Least-used first; a box at its own daily_cap drops
    // out; null means every box for this client is at its cap.
    const rotation = await rotationFor(clientId)
    const pickedId = rotation.length > 0 ? nextFromRotation(rotation) : null
    if (!pickedId) {
      // Logged ONCE per client, not once per enrolment — a per-enrolment warning on a large
      // backlog is an error storm that buries the line that matters.
      exhaustedClients.add(clientId)
      console.warn(`[send-due] client ${clientId} — every mailbox is at its daily cap (or none is sendable); remaining enrolments left due and untouched.`)
      r.skipped++
      continue
    }
    const slot = rotation.find(s => s.id === pickedId)!

    try {
      r.attempted++
      const outcome = await send(enrollment.id, lead, nextStep, stepView.subject, stepView.body, campId, {
        totalSteps: stepView.total, waitDaysNext: stepView.wait_days, inbox: slot.row,
      })

      if (outcome === 'sent') {
        // ⚠️ AFTER SUCCESS, NEVER ON ATTEMPT. Incrementing on attempt would let a broken
        // mailbox consume quota it never used and eat the batch.
        r.sent++
        slot.sentThisBatch++
        const addr = String(slot.row.email)
        r.per_mailbox[addr] = (r.per_mailbox[addr] ?? 0) + 1
        sentByCampaign.set(campId, (sentByCampaign.get(campId) ?? 0) + 1)
      } else if (outcome === 'failed') {
        // 🛑 EVICT ON `'failed'` AND ONLY ON `'failed'`. That outcome is returned in exactly
        // one place — immediately after `sendAs` comes back not-ok — so it means the mail
        // server refused, never that a healthy gate deferred. Without eviction, an unchanged
        // `sentThisBatch` keeps a broken box permanently least-used, so it would be chosen
        // for every remaining enrolment and the whole run would fail against one mailbox.
        //
        // ⚠️ THIS RUN ONLY. Nothing is persisted: a mailbox that failed at 09:00 is a fresh
        // candidate at 11:00, because the cause is usually transient and a durable health
        // record is architecture this build was not given.
        r.failed++
        const idx = rotation.findIndex(s => s.id === slot.id)
        if (idx >= 0) rotation.splice(idx, 1)
        evicted.add(String(slot.row.email))
        console.warn(`[send-due] mailbox ${slot.row.email} failed to send — evicted from this run's rotation for client ${clientId}.`)
      } else if (outcome === 'deferred') r.deferred++
      else if (outcome === 'suppressed') r.suppressed++
      else if (outcome === 'queued') r.queued++
    } catch (err) {
      console.error('[send-due] enrollment', enrollment.id, ':', err)
    }
  }

  r.exhausted_clients = [...exhaustedClients]
  r.evicted_mailboxes = [...evicted]
  r.clients_served = byClient.size
  r.remaining_today = remaining - r.sent
  r.campaigns_outside_window = outsideWindow.size
  return r
}
