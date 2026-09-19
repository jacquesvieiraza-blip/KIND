// ══════════════════════════════════════════════════════════════════════════════════════════
// P6 §8.2 · THE TEN FAILURE CLASSES BATCH 1b DID NOT COVER
//
// Batch 1b already proved four of the founder's fourteen — F-PROVIDER (check 5, the eight-mode
// Apollo matrix), F-DBREAD (check 9), F-STUCK (check 8) and F-TIMEOUT (check 3). This file is
// the other ten, each asserted the way he specified it.
//
// ── WHAT MAKES A FAILURE-CLASS CHECK HONEST ─────────────────────────────────────────────
//
// ① IT BREAKS SOMETHING REAL. Every class here is produced by actually doing the bad thing —
//    a second identical webhook, a killed process, a provider answering 500, a client whose
//    email was never verified — never by asserting that a branch exists in the source.
//
// ② IT PROVES THE POSITIVE CONTROL. "Nothing was sent" is worthless if nothing could ever
//    have been sent: F-KILL is meaningless without J20 showing the SAME fixture does send
//    through the armed API. Each refusal check names the control that makes it discriminating.
//
// ③ IT READS THE DATABASE, NOT THE RESPONSE. An HTTP 200 is what the product SAID. What it
//    DID is a row — or the absence of one — and that is what these assert.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { createHmac, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

export function makeFailureChecks(kit) {
  const { ENV, http, api, operator, sql, ok, bad, note, fakeCount, fakeReset, fakeMode, fakeRequests } = kit

  const armed = (p, o = {}) => http(`${ENV.apiArmed}${p}`, {
    ...o,
    headers: { 'x-admin-key': ENV.secrets.adminKey, 'x-operator-email': 'fullstack-operator@example.invalid', ...(o.headers ?? {}) },
  })

  // ── A CLIENT THAT CAN ACTUALLY SEND ─────────────────────────────────────────────────────
  //
  // `send-due` selects on a chain of facts, every one of which is a real gate: an ACTIVE
  // campaign, an enrolment that is due, a lead the seam is allowed to email, and a mailbox to
  // ⚠️ BOTH PAYMENTS ARE AUTHORISED, AND THAT IS THE PRODUCT'S RULE RATHER THAN A SHORTCUT.
  // Outreach refuses with `second_payment_missing` until P2 exists — "Payment 1 authorises
  // sourcing and preparation", P2 authorises sending. A send fixture without it is not a
  // client who cannot send, it is a client who has not paid yet.
  //
  // send from. Building it with SQL rather than through the product is deliberate and is the
  // same choice Batch 1b made — driving the whole programme lifecycle to reach one send would
  // make this a journey check rather than a failure-class one, and a failure in the lifecycle
  // would then look like a failure in the kill-switch.
  async function makeSendable({ emailStatus = 'verified', prefix = 'fs' } = {}) {
    const userId = randomUUID()
    const tag = `${prefix}-${userId.slice(0, 8)}`
    await sql('insert into auth.users(id, email) values ($1, $2)', [userId, `${tag}@example.invalid`])
    const [{ id: clientId }] = await sql(
      `insert into public.clients(user_id, company_name, country, commercial_model)
       values ($1, $2, 'United Kingdom', 'programme') returning id`, [userId, `Sendable ${tag}`])
    const [{ id: programmeId }] = await sql(
      `insert into public.programmes(client_id, status, sourcing_ceiling, meeting_target, recommended_volume,
         price_per_meeting_cents, price_total_cents, first_payment_cents, second_payment_cents,
         first_authorised_at, second_authorised_at, approved_at, went_live_at, run_at, send_schedule)
       values ($1, 'LIVE', 100, 5, 100, 50000, 250000, 125000, 125000, now(), now(), now(), now(), now(), $2::jsonb)
       returning id`,
      // ⚠️ A SEND WINDOW IS REQUIRED, AND ITS ABSENCE IS A REFUSAL RATHER THAN A DEFAULT:
      // "a missing schedule is not permission to send at any hour". Every day, all day, in UTC
      // — so the harness's own clock cannot put a real send outside the window and turn a
      // delivery check into a flake that fails at 6pm and passes at 10am.
      [clientId, JSON.stringify({ days: [1, 2, 3, 4, 5, 6, 7], start: '00:00', end: '23:59', default_tz: 'UTC' })])
    const [{ id: icpId }] = await sql(
      `insert into public.icps(client_id, name, programme_id, job_titles, industries, geographies,
         seniority_levels, company_sizes)
       values ($1, 'Sendable ICP', $2, '{"Head of Operations"}', '{"logistics"}', '{"United Kingdom"}', '{}', '{}')
       returning id`, [clientId, programmeId])
    const [{ id: leadId }] = await sql(
      // ⚠️ `country` IS A SEND GATE, NOT DECORATION. R50 holds any lead outside the launch
      // countries, and a BLANK country is deliberately FALSE there — "an unknown country is
      // not evidence of an allowed one". Without it the seam logs `launch_hold: unknown` and
      // suppresses the send, which looks exactly like a delivery failure.
      `insert into public.leads(client_id, first_name, last_name, email, email_status, company, job_title, status, icp_id, country)
       values ($1, 'Send', 'Able', $2, $3, 'Acme Ltd', 'Head of Operations', 'scored', $4, 'United Kingdom') returning id`,
      [clientId, `prospect-${tag}@prospect.invalid`, emailStatus, icpId])
    // ⚠️ THE CAMPAIGN NAMES THE ICP, AND A SEQUENCE NAMES THE CAMPAIGN. Sending authority
    // resolves a canonical chain — programme → ICP → campaign → figsy_sequences — and refuses
    // with `sequence_not_canonical` if any link is missing, because without it there are no
    // APPROVED WORDS to send. The enrolment must then point at that exact sequence row: a
    // matching hash on an enrolment built from a different sequence proves nothing about what
    // actually leaves.
    const [{ id: campaignId }] = await sql(
      `insert into public.figsy_campaigns(client_id, name, status, icp_id) values ($1, $2, 'active', $3) returning id`,
      [clientId, `Sendable campaign ${tag}`, icpId])
    const [{ id: sequenceId }] = await sql(
      `insert into public.figsy_sequences(client_id, name, campaign_id, steps)
       values ($1, $2, $3, $4::jsonb) returning id`,
      [clientId, `Sendable sequence ${tag}`, campaignId,
       JSON.stringify([{ step: 1, subject: 'A quick question', body: 'Hello {{first_name}} — a short note about operations.', wait_days: 3 }])])
    // ⚠️ THREE FACTS THE REAL SYSTEM SUPPLIED, one failed run at a time — the kind a mocked
    // `supabase-js` never says. `client_id` is NOT NULL here; the step-1 copy has to exist or
    // there is nothing to send; and `programme_id` must NAME the client's open programme,
    // because the selection layer refuses any enrolment that does not positively attribute
    // itself to one. Without it the run answers 200 with `attempted: 0` — a silent no-op that
    // would have made J20 look like a delivery failure and F-KILL's zero look meaningful.
    //
    // ⚠️ AND `current_step` IS 0, NOT 1. The loop sends `current_step + 1`, so a row sitting at
    // 1 asks for STEP 2 copy — which this fixture does not have — and `enrollmentStep` returns
    // null and `continue`s WITHOUT incrementing any counter. The run then answers 200 with
    // every number zero and no skip recorded: the most misleading shape a no-op can take, and
    // it cost four rounds to find because nothing in the response pointed at it.
    const [{ id: enrolmentId }] = await sql(
      `insert into public.figsy_enrollments(campaign_id, lead_id, client_id, programme_id, sequence_id, status,
         current_step, next_send_at, step1_subject, step1_body, total_steps)
       values ($1, $2, $3, $4, $5, 'enrolled', 0, now() - interval '1 hour', $6, $7, 1) returning id`,
      [campaignId, leadId, clientId, programmeId, sequenceId,
       'A quick question', 'Hello {{first_name}} — a short note about operations.'])
    // ⚠️ A MAILBOX IS ONLY SENDABLE WITH CREDENTIALS. `sendablePool` filters on
    // `smtp_host && smtp_user && smtp_pass_enc` — a row without them is LIVE but not
    // SENDABLE, and the run then reports the client as `exhausted` with `skipped: 1` and
    // every other number zero. The password is encrypted with the product's OWN helper, so
    // the mailer decrypts it exactly as it would in production, and it points at the
    // harness's SMTP sink, which completes the protocol and delivers nothing.
    //
    // ⚠️ `verified_at` IS ALSO A GATE, not bookkeeping. Sending refuses with `sender_unsafe`
    // until somebody has proved the mailbox can log in — "a wrong password would only be
    // discovered by a bounce" — so a fixture without it is a mailbox nobody has tested.
    const { encryptSecret } = await import(`${ENV.tree}/apps/api/dist/lib/inbox-secret.js`)
    await sql(
      `insert into public.client_inboxes(client_id, email, kind, status, provider, daily_cap,
         smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, from_name, verified_at)
       values ($1, $2, 'pooled', 'active', 'smtp', 50, $3, $4, false, $2, $5, 'K.I.N.D Harness', now())`,
      [clientId, `sender-${tag}@sender.invalid`,
       process.env.SMTP_HOST ?? '127.0.0.1', Number(process.env.SMTP_PORT ?? 58514),
       encryptSecret('fullstack-smtp-password')])
    // ⚠️ THE MONEY GATE. `POST /operator/source` refuses a client who has never paid, so
    // without this row F-BROWSER's sourcing run is refused before it starts — which looked
    // exactly like "the work vanished with the tab". No money moves: this is the same row
    // Batch 1b's own fixture writes for the same reason.
    await sql(
      `insert into public.credit_transactions(client_id, type, amount) values ($1, 'wallet_topup', 299)`,
      [clientId])
    // ── 🛑 THE APPROVAL IS FROZEN TO WHAT WAS APPROVED ───────────────────────────────────
    //
    // Sending refuses with `preparation_changed` on a programme that is approved but "carries
    // no record of WHAT was approved, so it cannot be proved that the current work is the work
    // the client agreed to". The snapshot and its hash are therefore built by the PRODUCT'S OWN
    // functions against this very programme — never hand-written. A fabricated hash would make
    // the fixture pass the drift check while proving nothing about the frozen-approval rule,
    // and would quietly disable exactly the gate J16 exists to protect.
    const { buildPreparationSnapshot, preparationHash } = await import(`${ENV.tree}/apps/api/dist/lib/preparation-snapshot.js`)
    const snap = await buildPreparationSnapshot(programmeId)
    if (snap.ok) {
      await sql(
        `update public.programmes
            set approved_preparation_snapshot = $1::jsonb,
                approved_preparation_hash     = $2,
                approved_preparation_version  = 1,
                approved_at                   = now()
          where id = $3`,
        [JSON.stringify(snap.snapshot), preparationHash(snap.snapshot), programmeId])
    }
    return { userId, clientId, programmeId, icpId, leadId, campaignId, sequenceId, enrolmentId, tag, snapshotOk: !!snap.ok }
  }

  /** How many messages the SMTP sink has actually accepted — what LEFT, not what was written. */
  const smtpDelivered = async () => (await http(`${ENV.fakes.resend}/__fake/smtp`)).json?.calls ?? -1

  const dropUser = async (userId) => { try { await sql('delete from auth.users where id = $1', [userId]) } catch { /* best effort */ } }
  const sentCount = async (clientId) => Number((await sql(
    `select count(*)::int as n from public.figsy_sent_emails s
      join public.figsy_campaigns c on c.id = s.campaign_id where c.client_id = $1`, [clientId]))[0].n)

  // ════════════════════════════════════════════════════════════════════════════════════════
  // F-KILL · AUTO_OUTREACH_ENABLED unset → zero sends through every send path
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function fKill() {
    const id = 'F-KILL'
    const fx = await makeSendable({ prefix: 'kill' })
    try {
      const smtpBefore = await smtpDelivered()
      const before = await sentCount(fx.clientId)

      // ── EVERY SEND PATH THE PRODUCT HAS, not one of them ──
      //
      // The founder's words: "zero sends through every send path · Make Live sends zero ·
      // Run records authority with zero sends". The fixture is ALREADY past Make Live and Run
      // — `went_live_at` and `run_at` are both stamped — so this is precisely the state he
      // names: full authority, switch off.
      // ⛓️ THE FIRST CUT OF THIS CHECK PASSED FOR THE WRONG REASON, and J20 is what exposed
      // it: the path was written `/send-due/run-once` without the `/operator` mount, so the
      // API answered 404, nothing sent, and "zero sends" was really "route not found". A
      // refusal check whose request never arrives is the purest form of a vacuous pass.
      const paths = []
      paths.push(['POST /operator/send-due/run-once', await operator('/operator/send-due/run-once', {
        method: 'POST', body: JSON.stringify({ client_id: fx.clientId, max_sends: 5 }), timeoutMs: 120000 })])

      // 🛑 AND THE SEAM ITSELF, not only the route above it. `sendSequenceEmail` is the one
      // function every automatic send goes through; calling it directly removes any chance
      // that a gate ABOVE the kill-switch is what produced the zero.
      const { sendSequenceEmail } = await import(`${ENV.tree}/apps/api/dist/lib/figsy.js`)
      const seam = await sendSequenceEmail(fx.enrolmentId,
        { id: fx.leadId, email: `prospect-${fx.tag}@prospect.invalid`, first_name: 'Send', last_name: 'Able', company: 'Acme Ltd' },
        1, 'A quick question', 'Hello there.', fx.campaignId)
      paths.push([`sendSequenceEmail (the seam) → ${seam}`, { status: 'n/a' }])

      const after = await sentCount(fx.clientId)
      const smtpAfter = await smtpDelivered()

      if (after !== before) {
        return bad(id, `🛑 THE KILL-SWITCH LEAKED: figsy_sent_emails for this client went ${before} → ${after} with AUTO_OUTREACH_ENABLED unset`)
      }
      if (smtpAfter !== smtpBefore) {
        return bad(id, `🛑 THE KILL-SWITCH LEAKED AT THE WIRE: the SMTP sink accepted ${smtpAfter - smtpBefore} message(s) with the switch unset`)
      }

      // 🛑 AND RUN'S AUTHORITY IS STILL RECORDED — "Run records authority with zero sends".
      // A kill-switch that also erased the authority would pass the zero test and destroy the
      // state the operator needs.
      const [{ run_at, went_live_at }] = await sql('select run_at, went_live_at from public.programmes where id = $1', [fx.programmeId])
      if (!run_at || !went_live_at) return bad(id, `the kill-switch removed the programme's authority: run_at=${run_at} went_live_at=${went_live_at}`)

      const statuses = paths.map(([n, r]) => (r.status === 'n/a' ? n : `${n}→${r.status}`)).join(' · ')
      ok(id, `zero sends with AUTO_OUTREACH_ENABLED unset across ${paths.length} send path(s) (${statuses}) · figsy_sent_emails ${before}→${after} · the SMTP sink accepted nothing · Run authority intact (run_at + went_live_at still stamped)`)
    } finally { await dropUser(fx.userId) }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J20 · OUTBOUND DELIVERY — the positive control that makes F-KILL mean something
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j20() {
    const id = 'J20'
    const fx = await makeSendable({ prefix: 'deliver' })
    try {
      const before = await sentCount(fx.clientId)
      const smtpBefore = await smtpDelivered()
      const r = await armed('/operator/send-due/run-once', {
        method: 'POST', body: JSON.stringify({ client_id: fx.clientId, max_sends: 5 }), timeoutMs: 120000 })
      const after = await sentCount(fx.clientId)
      const smtpAfter = await smtpDelivered()

      if (after <= before) {
        return bad(id, `🛑 NOTHING WAS DELIVERED even with the kill-switch ON (HTTP ${r.status}) — figsy_sent_emails ${before}→${after}. ` +
          `Body: ${String(r.text).slice(0, 300)}. F-KILL's zero is therefore not discriminating and this run proves neither.`)
      }
      // 🛑 A ROW IS WHAT THE PRODUCT WROTE; A DELIVERY IS WHAT LEFT. The mailbox sends over
      // SMTP, so the evidence is the sink completing a conversation — not the Resend fake,
      // which this client does not use, and not the row, which is written either way.
      if (smtpAfter <= smtpBefore) {
        return bad(id, `a send row was written but the SMTP sink accepted nothing (${smtpBefore}→${smtpAfter}) — a row is not evidence that mail left`)
      }
      ok(id, `outbound delivery through the armed API: figsy_sent_emails ${before}→${after} · the SMTP sink accepted ${smtpAfter - smtpBefore} message(s) over a real protocol conversation · the ONLY difference from F-KILL's zero is AUTO_OUTREACH_ENABLED`)
    } finally { await dropUser(fx.userId) }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // F-SENDABLE · no verified business email → refused at the seam, Hunter never called
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function fSendable() {
    const id = 'F-SENDABLE'
    // The ONLY difference from J20's fixture is `email_status`. Everything else — programme
    // authority, active campaign, due enrolment, a mailbox — is identical and sufficient.
    const fx = await makeSendable({ emailStatus: 'guessed', prefix: 'unsendable' })
    try {
      const hunterBefore = await fakeCount('hunter')
      const before = await sentCount(fx.clientId)
      const r = await armed('/operator/send-due/run-once', {
        method: 'POST', body: JSON.stringify({ client_id: fx.clientId, max_sends: 5 }), timeoutMs: 120000 })
      const after = await sentCount(fx.clientId)
      const hunterAfter = await fakeCount('hunter')

      if (after !== before) {
        return bad(id, `🛑 AN UNVERIFIED PROSPECT WAS EMAILED (HTTP ${r.status}): figsy_sent_emails ${before}→${after}. FD-5 says QUALIFIED ≠ SENDABLE.`)
      }
      // 🛑 "Hunter never called" — the founder's second requirement, and the one that would
      // quietly cost money: the tempting repair for an unverified address is to go and verify
      // it, which is the provider FD-6 forbids.
      if (hunterAfter !== hunterBefore) {
        return bad(id, `🛑 HUNTER WAS CALLED to rescue an unverified address (${hunterBefore}→${hunterAfter}) — FD-6 forbids it`)
      }
      ok(id, `an unverified prospect is refused at the send seam through the ARMED api (the switch was ON, so nothing else refused it) · figsy_sent_emails ${before}→${after} · HUNTER_CALLS unchanged at ${hunterAfter}`)
    } finally { await dropUser(fx.userId) }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // F-TENANT · two clients, and no truth crosses between them
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function fTenant() {
    const id = 'F-TENANT'
    const a = await makeSendable({ prefix: 'tenant-a' })
    const b = await makeSendable({ prefix: 'tenant-b' })
    try {
      // 🛑 THE SAME HUMAN IS A PROSPECT OF BOTH CLIENTS. That is the whole hazard: an inbound
      // reply from this address is genuinely ambiguous unless the product uses evidence of who
      // actually emailed them.
      const shared = `shared-prospect-${a.tag}@prospect.invalid`
      await sql('update public.leads set email = $1 where id = $2', [shared, a.leadId])
      await sql('update public.leads set email = $1 where id = $2', [shared, b.leadId])

      // Only client A ever sent to them, and that send is the persisted evidence R131 requires.
      await sql(
        `insert into public.figsy_sent_emails(campaign_id, lead_id, subject, body, step)
         values ($1, $2, 'Hello', 'Body', 1)`, [a.campaignId, a.leadId])

      const payload = JSON.stringify({
        type: 'email.received',
        data: { email_id: `evt-${a.tag}`, from: shared, to: [`sender-${a.tag}@sender.invalid`], subject: 'Re: Hello', text: 'Interested, tell me more.' },
      })
      const r = await http(`${ENV.api}/figsy/replies/inbound`, {
        method: 'POST', body: payload,
        headers: { 'x-webhook-secret': ENV.secrets.resendWebhook, 'svix-id': `svix-${a.tag}` },
      })

      const rows = await sql(
        `select c.client_id from public.figsy_replies r join public.figsy_campaigns c on c.id = r.campaign_id
          where c.client_id = any($1)`, [[a.clientId, b.clientId]])
      const owners = [...new Set(rows.map(x => x.client_id))]

      if (owners.includes(b.clientId)) {
        return bad(id, `🛑 THE REPLY CROSSED A CLIENT BOUNDARY: client B received a reply to a prospect only client A emailed (HTTP ${r.status})`)
      }
      if (!owners.includes(a.clientId)) {
        return bad(id, `the reply reached nobody (HTTP ${r.status}, owners=${JSON.stringify(owners)}) — F-TENANT proves isolation, not loss; R132 requires it be retained and attributable`)
      }
      ok(id, `one shared prospect, two clients, one sender: the reply was written to the client that actually emailed them (A) and to nobody else — ${owners.length} owner(s), HTTP ${r.status}`)
    } finally { await dropUser(a.userId); await dropUser(b.userId) }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // F-INBOUND · a classifier throw and a malformed payload both RETAIN the reply
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function fInbound() {
    const id = 'F-INBOUND'
    const fx = await makeSendable({ prefix: 'inbound' })
    try {
      await sql(`insert into public.figsy_sent_emails(campaign_id, lead_id, subject, body, step)
                 values ($1, $2, 'Hello', 'Body', 1)`, [fx.campaignId, fx.leadId])
      const from = `prospect-${fx.tag}@prospect.invalid`

      // ── ① THE CLASSIFIER THROWS. The model is the classifier; the fake is put into a mode
      // that fails every call, so the throw is real rather than injected.
      await fakeMode('anthropic', 'provider_error')
      const rThrow = await http(`${ENV.api}/figsy/replies/inbound`, {
        method: 'POST',
        body: JSON.stringify({ type: 'email.received', data: { email_id: `thr-${fx.tag}`, from, to: [`sender-${fx.tag}@sender.invalid`], subject: 'Re: Hello', text: 'Sounds good' } }),
        headers: { 'x-webhook-secret': ENV.secrets.resendWebhook, 'svix-id': `svix-thr-${fx.tag}` },
        timeoutMs: 60000,
      })
      await fakeMode('anthropic', 'ok')

      const kept = await sql(
        `select r.id, r.classification from public.figsy_replies r
           join public.figsy_campaigns c on c.id = r.campaign_id where c.client_id = $1`, [fx.clientId])
      if (kept.length === 0) {
        return bad(id, `🛑 A CLASSIFIER FAILURE LOST THE REPLY (HTTP ${rThrow.status}) — the founder's requirement is "retained unclassified + task", never dropped`)
      }

      // ── ② A MALFORMED PAYLOAD. Authentic (the secret is right) but structurally wrong.
      const rBad = await http(`${ENV.api}/figsy/replies/inbound`, {
        method: 'POST', body: '{"type":"email.received","data":{"nonsense":true}',   // deliberately unparseable
        headers: { 'x-webhook-secret': ENV.secrets.resendWebhook, 'svix-id': `svix-bad-${fx.tag}` },
      })
      if (rBad.status >= 500 && rBad.status !== 500) {
        return bad(id, `a malformed inbound payload produced HTTP ${rBad.status}`)
      }

      const unclassified = kept.filter(r => !r.classification || r.classification === 'unclassified').length

      // ── 🛑 ⛓️ 19 Sep — THE TASK ROW, READ BACK. RETAINED IS NOT THE WHOLE REQUIREMENT ──
      //
      // The founder's requirement for this class is "classifier throw → reply retained
      // unclassified + TASK". A reply kept in a table nobody is told about is a reply nobody
      // reads: the unclassified row needs a person, and the person needs a row on their desk.
      const inboundTasks = await sql(
        `select id, kind, subject_id, status from public.operator_tasks
          where created_at > now() - interval '3 minutes'
            and (kind ilike '%repl%' or kind ilike '%classif%' or kind ilike '%inbound%' or client_id = $1)`, [fx.clientId])
      if (inboundTasks.length === 0) {
        return bad(id, `🛑 THE CLASSIFIER FAILED, THE REPLY WAS KEPT (${kept.length} row(s)) AND NOBODY WAS TOLD — "retained unclassified + task" is unmet (HTTP ${rThrow.status})`)
      }
      // ⚠️ AND THE PROVIDER MUST GET THE RIGHT ANSWER. Resend retries on a 5xx: answering
      // anything but a 2xx here would have it redeliver a reply we have already retained,
      // which is how one prospect's sentence becomes four rows on a client's desk.
      if (rThrow.status < 200 || rThrow.status >= 300) {
        return bad(id, `🛑 THE PROVIDER WAS ANSWERED HTTP ${rThrow.status} for a reply we RETAINED — Resend will redeliver it and the same sentence will land again`)
      }

      ok(id, `a classifier failure RETAINS the reply (${kept.length} row(s), ${unclassified} unclassified) AND raises ${inboundTasks.length} operator task(s) (${[...new Set(inboundTasks.map(t => t.kind))].join(', ')}) — read back from operator_tasks, not inferred · the provider was answered HTTP ${rThrow.status}, so it does not redeliver what we already hold · a malformed payload answered HTTP ${rBad.status} without losing anything`)
    } finally { await fakeMode('anthropic', 'ok'); await dropUser(fx.userId) }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // F-WEBHOOK + F-PAY · Stripe: duplicate · stripped metadata · delayed
  // ════════════════════════════════════════════════════════════════════════════════════════
  const stripeSig = (body) => {
    const t = Math.floor(Date.now() / 1000)
    const v1 = createHmac('sha256', ENV.secrets.stripeWebhook).update(`${t}.${body}`).digest('hex')
    return `t=${t},v1=${v1}`
  }
  const stripeEvent = (id, obj) => JSON.stringify({
    id, type: 'checkout.session.completed', data: { object: { id: `cs_${id}`, ...obj } },
  })
  const postStripe = (body) => http(`${ENV.api}/stripe/webhook`, {
    method: 'POST', body, headers: { 'stripe-signature': stripeSig(body), 'content-type': 'application/json' }, timeoutMs: 60000,
  })

  async function fPay() {
    const id = 'F-PAY'
    const fx = await makeSendable({ prefix: 'pay' })
    try {
      await sql(`update public.programmes set status = 'APPROVED', first_authorised_at = null, run_at = null, went_live_at = null where id = $1`, [fx.programmeId])
      const stamps = async () => (await sql(
        'select first_authorised_at, first_paid_at, second_authorised_at from public.programmes where id = $1', [fx.programmeId]))[0]
      const stamp = (r) => String(r.first_paid_at ?? r.first_authorised_at ?? '')

      // ── ① MISSING programmeId — money we cannot attribute ────────────────────────────
      //
      // 🛑 IT MUST NOT BE QUIETLY ACCEPTED AND IT MUST NOT GRANT. The founder's requirement for
      // this class is "exception/task where needed, nothing granted twice", and an event that
      // names no programme is the case where an exception is the ONLY correct outcome.
      const beforeOrphan = await stamps()
      const orphan = await postStripe(stripeEvent(`evt_pay_noprog_${fx.tag}`, { metadata: { type: 'programme_first', clientId: fx.clientId } }))
      const afterOrphan = await stamps()
      if (stamp(afterOrphan) !== stamp(beforeOrphan)) {
        return bad(id, `🛑 A PAYMENT EVENT WITH NO programmeId GRANTED AUTHORITY: the stamp moved ${stamp(beforeOrphan)} → ${stamp(afterOrphan)}`)
      }
      const orphanTasks = await sql(
        `select id, kind from public.operator_tasks
          where created_at > now() - interval '2 minutes'
            and (kind ilike '%payment%' or kind ilike '%unattributab%' or kind ilike '%stripe%')`)
      if (orphanTasks.length === 0) {
        return bad(id, `🛑 A PAYMENT THAT NAMES NO PROGRAMME PRODUCED NO EXCEPTION (HTTP ${orphan.status}) — nobody is told that money arrived we cannot attribute`)
      }

      // ── ② THE ORDINARY EVENT, THEN ③ THE SAME EVENT AGAIN (Stripe retries) ───────────
      const evId = `evt_pay_${fx.tag}`
      const body = stripeEvent(evId, { metadata: { type: 'programme_first', programmeId: fx.programmeId, clientId: fx.clientId } })

      const first = await postStripe(body)
      const afterFirst = await stamps()
      const second = await postStripe(body)
      const afterSecond = await stamps()
      if (stamp(afterFirst) && stamp(afterSecond) && stamp(afterFirst) !== stamp(afterSecond)) {
        return bad(id, `🛑 A DUPLICATE STRIPE EVENT GRANTED TWICE: the payment stamp moved ${stamp(afterFirst)} → ${stamp(afterSecond)}`)
      }

      // ── ④ A DELAYED EVENT — THE SAME INTENT, A NEW EVENT ID, ARRIVING LATE ───────────
      //
      // 🛑 THIS IS THE CASE IDEMPOTENCY-BY-EVENT-ID DOES NOT COVER, and it is the one that
      // actually happens: Stripe's delivery is delayed, the operator re-sends from the
      // dashboard, or a replay lands after the programme has already moved on. The event id is
      // NEW, so a dedupe keyed on it would let this through — and the programme must still
      // grant Payment 1 exactly once. The state is advanced first so "late" is real rather
      // than nominal.
      await sql(`update public.programmes set status = 'LIVE', went_live_at = now() where id = $1`, [fx.programmeId])
      const beforeLate = await stamps()
      const late = await postStripe(JSON.stringify({
        id: `evt_pay_late_${fx.tag}`, type: 'checkout.session.completed',
        // `created` is Stripe's own clock: two hours ago, delivered now.
        created: Math.floor(Date.now() / 1000) - 7200,
        data: { object: { id: `cs_evt_pay_${fx.tag}`, metadata: { type: 'programme_first', programmeId: fx.programmeId, clientId: fx.clientId } } },
      }))
      const afterLate = await stamps()
      if (stamp(beforeLate) && stamp(afterLate) && stamp(beforeLate) !== stamp(afterLate)) {
        return bad(id, `🛑 A DELAYED DUPLICATE GRANTED AGAIN: the payment stamp moved ${stamp(beforeLate)} → ${stamp(afterLate)} for a second copy of one payment`)
      }
      if (String(afterLate.second_authorised_at ?? '') !== String(beforeLate.second_authorised_at ?? '')) {
        return bad(id, `🛑 A DELAYED PAYMENT-1 EVENT MOVED PAYMENT 2's authority`)
      }

      ok(id, `missing programmeId → granted nothing and raised ${orphanTasks.length} exception task(s) (HTTP ${orphan.status}) · a repeated checkout.session.completed is idempotent (HTTP ${first.status} then ${second.status}; the stamp did not move) · a DELAYED copy of the same payment, new event id, Stripe-created 2h earlier, arriving after the programme went LIVE, granted nothing further (HTTP ${late.status}) · nothing granted twice`)
    } finally { await dropUser(fx.userId) }
  }

  async function fWebhook() {
    const id = 'F-WEBHOOK'
    const fx = await makeSendable({ prefix: 'hook' })
    try {
      const stamps = async () => (await sql(
        'select first_authorised_at, first_paid_at, second_authorised_at, second_paid_at, status from public.programmes where id = $1', [fx.programmeId]))[0]
      const p1 = (r) => String(r.first_paid_at ?? r.first_authorised_at ?? '')
      const p2 = (r) => String(r.second_paid_at ?? r.second_authorised_at ?? '')

      // ── ① OUT OF ORDER — PAYMENT 2 ARRIVES BEFORE PAYMENT 1 ─────────────────────────
      //
      // 🛑 THE ONE THING THAT MUST NOT HAPPEN IS P2 MANUFACTURING P1's AUTHORITY. Payment 1
      // authorises sourcing and preparation; Payment 2 authorises sending. A webhook delivered
      // out of order must never let the second grant the first, because that would put a
      // client into outreach on a programme nobody paid to source.
      await sql(`update public.programmes set status = 'APPROVED', first_authorised_at = null, first_paid_at = null,
                        second_authorised_at = null, second_paid_at = null, run_at = null, went_live_at = null
                  where id = $1`, [fx.programmeId])
      const beforeOoo = await stamps()
      const second = await postStripe(stripeEvent(`evt_ooo_second_${fx.tag}`, { metadata: { type: 'programme_second', programmeId: fx.programmeId, clientId: fx.clientId } }))
      const afterSecondFirst = await stamps()
      if (p1(afterSecondFirst) !== p1(beforeOoo)) {
        return bad(id, `🛑 A PAYMENT-2 EVENT GRANTED PAYMENT 1's AUTHORITY (${p1(beforeOoo)} → ${p1(afterSecondFirst)}) — an out-of-order webhook authorised sourcing nobody paid for`)
      }
      // Then the one that should have come first. The end state must be correct, once each.
      const firstLate = await postStripe(stripeEvent(`evt_ooo_first_${fx.tag}`, { metadata: { type: 'programme_first', programmeId: fx.programmeId, clientId: fx.clientId } }))
      const afterBoth = await stamps()

      // ── ② DELAYED — THE SAME PAYMENT-2 EVENT, REDELIVERED LATE ──────────────────────
      const beforeDelay = await stamps()
      const delayed = await postStripe(JSON.stringify({
        id: `evt_ooo_second_delayed_${fx.tag}`, type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000) - 3600,
        data: { object: { id: `cs_evt_ooo_second_${fx.tag}`, metadata: { type: 'programme_second', programmeId: fx.programmeId, clientId: fx.clientId } } },
      }))
      const afterDelay = await stamps()
      if (p2(beforeDelay) && p2(afterDelay) && p2(beforeDelay) !== p2(afterDelay)) {
        return bad(id, `🛑 A DELAYED REDELIVERY MOVED PAYMENT 2's stamp ${p2(beforeDelay)} → ${p2(afterDelay)} — one payment authorised twice`)
      }

      // ── ③ DUPLICATE — the identical event id, immediately ───────────────────────────
      const dupBody = stripeEvent(`evt_hook_dup_${fx.tag}`, { metadata: { type: 'programme_first', programmeId: fx.programmeId, clientId: fx.clientId } })
      await postStripe(dupBody)
      const afterDup1 = await stamps()
      await postStripe(dupBody)
      const afterDup2 = await stamps()
      if (p1(afterDup1) && p1(afterDup2) && p1(afterDup1) !== p1(afterDup2)) {
        return bad(id, `🛑 A DUPLICATE EVENT ID GRANTED TWICE (${p1(afterDup1)} → ${p1(afterDup2)})`)
      }

      // ── ④ STRIPPED METADATA — "tasked when attribution is impossible" ───────────────
      const evId = `evt_orphan_${fx.tag}`
      const r = await postStripe(stripeEvent(evId, { metadata: {} }))
      const tasks = await sql(
        `select id, kind from public.operator_tasks where created_at > now() - interval '2 minutes'
          and (kind ilike '%payment%' or kind ilike '%unattributab%' or kind ilike '%stripe%')`)
      if (tasks.length === 0) {
        return bad(id, `🛑 AN UNATTRIBUTABLE PAYMENT PRODUCED NO TASK (HTTP ${r.status}) — "tasked when attribution is impossible" is unmet`)
      }
      ok(id, `out-of-order: a programme_second delivered FIRST did not grant Payment 1 (HTTP ${second.status}; p1 stayed ${p1(beforeOoo) || 'null'}), and the late programme_first then settled it correctly (HTTP ${firstLate.status}; p1=${p1(afterBoth) ? 'set' : 'null'}, p2=${p2(afterBoth) ? 'set' : 'null'}) · delayed: a redelivery created 1h earlier moved nothing (HTTP ${delayed.status}) · duplicate: the identical event id granted once · stripped metadata: retained and TASKED (${tasks.length} task(s): ${[...new Set(tasks.map(t => t.kind))].join(', ')}) rather than silently accepted, HTTP ${r.status}`)
    } finally { await dropUser(fx.userId) }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // F-DUP · duplicate submit / concurrent replicas → one authoritative row
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function fDup() {
    const id = 'F-DUP'
    const fx = await makeSendable({ prefix: 'dup' })
    try {
      // Two IDENTICAL requests launched together — the double-click, and the two replicas.
      const both = await Promise.all([
        armed('/operator/send-due/run-once', { method: 'POST', body: JSON.stringify({ client_id: fx.clientId, max_sends: 5 }), timeoutMs: 120000 }),
        armed('/operator/send-due/run-once', { method: 'POST', body: JSON.stringify({ client_id: fx.clientId, max_sends: 5 }), timeoutMs: 120000 }),
      ])
      const rows = await sql(
        `select s.lead_id, s.step, count(*)::int as n from public.figsy_sent_emails s
           join public.figsy_campaigns c on c.id = s.campaign_id
          where c.client_id = $1 group by 1,2 having count(*) > 1`, [fx.clientId])
      if (rows.length) {
        return bad(id, `🛑 CONCURRENT RUNS DOUBLE-SENT: ${JSON.stringify(rows)} — the step claim is not atomic`)
      }

      // And the same for a duplicated inbound reply: one reply, not two.
      await sql(`insert into public.figsy_sent_emails(campaign_id, lead_id, subject, body, step)
                 values ($1, $2, 'Hello', 'Body', 1)`, [fx.campaignId, fx.leadId])
      const payload = JSON.stringify({ type: 'email.received', data: { email_id: `dup-${fx.tag}`, from: `prospect-${fx.tag}@prospect.invalid`, to: [`sender-${fx.tag}@sender.invalid`], subject: 'Re: Hello', text: 'yes' } })
      const hdr = { 'x-webhook-secret': ENV.secrets.resendWebhook, 'svix-id': `svix-dup-${fx.tag}` }
      await http(`${ENV.api}/figsy/replies/inbound`, { method: 'POST', body: payload, headers: hdr, timeoutMs: 60000 })
      await http(`${ENV.api}/figsy/replies/inbound`, { method: 'POST', body: payload, headers: hdr, timeoutMs: 60000 })
      const replies = await sql(
        `select count(*)::int as n from public.figsy_replies r join public.figsy_campaigns c on c.id = r.campaign_id
          where c.client_id = $1`, [fx.clientId])
      if (Number(replies[0].n) > 1) {
        return bad(id, `🛑 A REDELIVERED WEBHOOK WROTE ${replies[0].n} REPLIES — the dedupe key is not holding`)
      }
      ok(id, `two concurrent send runs produced no duplicated (lead, step) send · a redelivered inbound reply produced ${replies[0].n} reply row · HTTP ${both.map(b => b.status).join('/')}`)
    } finally { await dropUser(fx.userId) }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // F-BROWSER · the tab disappears after the server accepted the work
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function fBrowser() {
    const id = 'F-BROWSER'
    await fakeMode('apollo', 'success')
    const fx = await makeSendable({ prefix: 'browser' })
    try {
      await sql(`update public.programmes set status = 'SOURCING_AUTHORISED', run_at = null, went_live_at = null where id = $1`, [fx.programmeId])

      // ⛓️ THE FIRST CUT USED `prepare-for-review`, AND IT WAS THE WRONG WORK. On a programme
      // with nothing to prepare that route answers 202 and then correctly records nothing —
      // so the check reported "the work vanished with the tab" about work that never existed.
      // Proved by running it WITHOUT an abort and watching the same emptiness.
      //
      // Sourcing is server-owned work that genuinely writes: an `icp_run_outcomes` row and a
      // settled reservation on the programme. That is what must survive the tab closing.
      const ctl = new AbortController()
      const inflight = fetch(`${ENV.api}/operator/source`, {
        method: 'POST', signal: ctl.signal,
        headers: { 'content-type': 'application/json', 'x-admin-key': ENV.secrets.adminKey, 'x-operator-email': 'fullstack-operator@example.invalid' },
        body: JSON.stringify({ client_id: fx.clientId, count: 20, confirm: true }),
      }).then(() => ({ aborted: false })).catch(() => ({ aborted: true }))

      // 🛑 CUT THE SOCKET WHILE THE SERVER IS STILL WORKING. Measured, not guessed: an
      // unaborted run of this same fixture answers in a few hundred milliseconds, so 600ms
      // let the work FINISH before the tab closed and proved nothing. 80ms is after the
      // route has accepted the request and long before it has written anything.
      await new Promise(r => setTimeout(r, 80))
      ctl.abort()
      const how = await inflight
      if (!how.aborted) note('F-BROWSER: the request completed before the abort landed — the evidence below is still a real recording, but the disconnect was not exercised')

      // The server owns it now. Wait, then ask the DATABASE — never the response.
      await new Promise(r => setTimeout(r, 12000))
      const outcomes = await sql(
        `select status from public.icp_run_outcomes where client_id = $1 order by created_at desc`, [fx.clientId])
      const [auth] = await sql(
        'select sourced_used, sourced_reserved from public.programmes where id = $1', [fx.programmeId])
      const leads = Number((await sql('select count(*)::int as n from public.leads where client_id = $1', [fx.clientId]))[0].n)

      if (outcomes.length === 0) {
        return bad(id, `🛑 THE WORK VANISHED WITH THE TAB: the client disconnected after the server accepted the run and no icp_run_outcomes row was ever written`)
      }
      if (Number(auth.sourced_reserved) !== 0) {
        return bad(id, `the run was recorded but its reservation was never settled (sourced_reserved=${auth.sourced_reserved}) — a disconnect must not strand budget`)
      }
      ok(id, `the client socket was aborted 80ms into an accepted sourcing run and the server-owned work still COMPLETED and was RECORDED: icp_run_outcomes=${outcomes.map(o => o.status).join(',')} · leads written=${leads} · reservation settled back to 0 (sourced_used=${auth.sourced_used})`)
    } finally { await fakeMode('apollo', 'success'); await dropUser(fx.userId) }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // F-MODEL · the model throws / hangs / answers nonsense / refuses
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function fModel() {
    const id = 'F-MODEL'
    const fx = await makeSendable({ prefix: 'model' })
    try {
      const jwt = kit.mintJwt(fx.userId, `${fx.tag}@example.invalid`)
      const [{ id: sessionId }] = await sql(
        `insert into public.milla_sessions(client_id, title) values ($1, 'F-MODEL') returning id`, [fx.clientId])

      // ⚠️ THREE MODES, AND THEY ARE NOT THE SAME FACT. A 500 and an unparseable body are
      // FAILURES and must be reported as failures. A REFUSAL is a successful call that
      // carries no answer — the product is right to answer the client rather than error, so
      // what it owes there is an honest fallback and a durable turn, not an HTTP 500.
      const FAILURES = ['provider_error', 'malformed_body']
      const modes = [...FAILURES, 'refusal']
      const observed = []
      for (const mode of modes) {
        await fakeMode('anthropic', mode)
        const before = Number((await sql(
          `select count(*)::int as n from public.milla_messages where session_id = $1 and role = 'user'`, [sessionId]))[0].n)
        const r = await http(`${ENV.api}/milla/sessions/${sessionId}/chat`, {
          method: 'POST', body: JSON.stringify({ message: `a question during ${mode}` }),
          headers: { authorization: `Bearer ${jwt}` }, timeoutMs: 90000,
        })
        const after = Number((await sql(
          `select count(*)::int as n from public.milla_messages where session_id = $1 and role = 'user'`, [sessionId]))[0].n)
        observed.push({ mode, status: r.status, userTurnKept: after > before })
      }
      await fakeMode('anthropic', 'ok')

      // 🛑 "customer turn already durable" — the founder's first requirement, and the one the
      // product got wrong once: the question was written AFTER the model answered, so a model
      // failure erased what the client typed.
      const lost = observed.filter(o => !o.userTurnKept)
      if (lost.length) {
        return bad(id, `🛑 THE CLIENT'S OWN WORDS WERE LOST when the model failed (${lost.map(l => l.mode).join(', ')}) — the customer turn must be durable BEFORE the model is called`)
      }
      // "desk reflects failure" — an honest status, never a 200 carrying an apology in her voice.
      const pretended = observed.filter(o => FAILURES.includes(o.mode) && o.status === 200)
      if (pretended.length) {
        return bad(id, `🛑 A MODEL FAILURE ANSWERED HTTP 200 (${pretended.map(p => p.mode).join(', ')}) — to the client that reads as Milla having heard them and declined`)
      }

      // 🛑 AND NO SILENT RETRY LOOP — the founder's fourth requirement. One turn is one call;
      // a seam that quietly retries turns a provider outage into a bill and a hang.
      const callsPerTurn = await fakeCount('anthropic')
      const refusal = observed.find(o => o.mode === 'refusal')

      // ── 🛑 ⛓️ 19 Sep — THE FAILURE, PERSISTED AND READ BACK, THROUGH THE REAL API ───────
      //
      // An HTTP status and a durable turn are two of the founder's four requirements. The
      // other two — "failure recorded" and "desk reflects the failure" — are claims about
      // ROWS, and they are proven on the path that actually has to survive a dead model: the
      // scoring of a client's own prospects.
      //
      // ⚠️ DRIVEN THROUGH THE API, NOT BY IMPORTING THE MODULE HERE. The first cut called
      // `scoreLeadsForIcp` in this process; the failure WAS recorded, and the model fake
      // counted ZERO calls — so the recorded failure could not be attributed to the injected
      // one, and a provider call the harness cannot see is a provider call it cannot fence.
      // `/internal/figsy/rescore-stranded` runs the same function inside the API process,
      // whose provider base URLs are the harness's own.
      const stranded = 'SCORING_FAILED: seeded by the walk so the sweep has something to re-score'
      await sql(`update public.leads set score = null, score_reasoning = $2 where id = $1`, [fx.leadId, stranded])
      note('F-MODEL: the lead was SEEDED as already-stranded so the hourly re-score sweep has something to pick up — its FIRST stranding is J5-C8 subject matter, not this class')

      const scoreBefore = await fakeCount('anthropic')
      await fakeMode('anthropic', 'provider_error')
      const sweep = await armed('/internal/figsy/rescore-stranded', { method: 'POST', body: JSON.stringify({}), timeoutMs: 120000 })
      await fakeMode('anthropic', 'ok')
      const scoreCalls = (await fakeCount('anthropic')) - scoreBefore

      const [scored] = await sql('select score, score_reasoning from public.leads where id = $1', [fx.leadId])
      if (scored.score !== null && scored.score !== undefined) {
        return bad(id, `🛑 A DEAD MODEL PRODUCED A SCORE (${scored.score}) — a number nobody computed is worse than no number`)
      }
      if (!String(scored.score_reasoning ?? '').startsWith('SCORING_FAILED')) {
        return bad(id, `🛑 THE SCORING FAILURE WAS NOT RECORDED: score_reasoning is ${JSON.stringify(scored.score_reasoning)} — an unscored prospect is indistinguishable from one nobody has reached yet`)
      }
      // 🛑 AND THE CALL HAS TO HAVE REACHED THE FAKE, or this measures nothing: a seam that
      // ignored the harness's provider base URL would leave this at 0, and a zero would read
      // as "no retries" when it means "the harness never saw the call at all".
      if (scoreCalls < 1) {
        return bad(id, `🛑 THE SCORING SWEEP NEVER REACHED THE MODEL FAKE (${scoreCalls} call(s), HTTP ${sweep.status}) — the recorded failure cannot be attributed to the injected model failure`)
      }
      if (scoreCalls > 3) {
        return bad(id, `🛑 A DEAD MODEL WAS CALLED ${scoreCalls} TIMES for one batch — a silent retry loop turns an outage into a bill`)
      }

      ok(id, `${observed.map(o => `${o.mode}→HTTP ${o.status}`).join(' · ')} · every customer turn stayed durable through the failure · the two genuine failures were reported as failures, and a refusal (a successful call with no answer) answered the client honestly at HTTP ${refusal?.status} rather than erroring · PERSISTED AND READ BACK: the hourly re-score sweep ran against a dead model through the real API (HTTP ${sweep.status}, ${scoreCalls} call(s) recorded BY THE FAKE) and left the prospect score=null with score_reasoning recorded as SCORING_FAILED — so the desk shows "Not scored" rather than a number nobody computed · ${callsPerTurn} model call(s) across ${observed.length} chat turns and ${scoreCalls} for the failed batch, so no silent retry loop`)
    } finally { await fakeMode('anthropic', 'ok'); await dropUser(fx.userId) }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // F-RESTART · the API dies mid-flight; persisted state survives and nothing runs twice
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function fRestart() {
    const id = 'F-RESTART'
    const fx = await makeSendable({ prefix: 'restart' })
    try {
      // A piece of automatic work that is genuinely IN FLIGHT and persisted as such.
      const subject = randomUUID()
      const [{ id: workId }] = await sql(
        `insert into public.automatic_work(kind, subject_kind, subject_id, client_id, state, bound_seconds, requested_at, started_at)
         values ('proof_run', 'client', $1, $2, 'started', 60, now() - interval '3 hours', now() - interval '3 hours')
         returning id`, [subject, fx.clientId])

      // 🛑 KILL -9, NOT A GRACEFUL STOP. A graceful shutdown is the case that works; the one
      // that loses data is the process that dies without finishing anything.
      const pid = Number(readFileSync(`${ENV.runDir}/api-armed.pid`, 'utf8').trim())
      process.kill(pid, 'SIGKILL')
      await new Promise(r => setTimeout(r, 1500))

      // The state must be exactly where it was — it lives in PostgreSQL, not in the process.
      const [row] = await sql('select state, started_at from public.automatic_work where id = $1', [workId])
      if (!row || row.state !== 'started') {
        return bad(id, `the in-flight work did not survive the kill: ${JSON.stringify(row)}`)
      }

      // 🛑 AND THE STUCK DETECTOR STILL PRODUCES EXACTLY ONE TASK — run TWICE, because the
      // failure this guards is a restart turning one stuck job into a task per detector pass.
      const { detectOverdueAutomaticWork } = await import(`${ENV.tree}/apps/api/dist/lib/automatic-work.js`)
      await detectOverdueAutomaticWork({ nowMs: Date.now() })
      await detectOverdueAutomaticWork({ nowMs: Date.now() })
      const [after] = await sql('select state, detected_task_id from public.automatic_work where id = $1', [workId])
      const taskCount = Number((await sql(
        `select count(*)::int as n from public.operator_tasks where subject_id = $1`, [subject]))[0].n)
      if (after.state !== 'stuck') return bad(id, `after the restart the overdue row is '${after.state}', not 'stuck'`)
      if (taskCount !== 1) return bad(id, `the detector raised ${taskCount} tasks for one stuck row across two runs — want exactly 1`)

      // ⚠️ AND THE API IS PUT BACK, because every later check shares this stack. A harness that
      // leaves a process dead turns one check's evidence into every subsequent check's failure.
      await kit.restartArmedApi()
      ok(id, `the armed API was SIGKILLed mid-flight: the persisted work survived (state=${row.state}, started_at preserved) · the stuck detector then raised exactly ${taskCount} task across two runs · no duplicate work · the process was restarted`)
    } finally { await dropUser(fx.userId) }
  }

  return [
    { id: 'F-KILL', fn: fKill },
    { id: 'J20', fn: j20 },
    { id: 'F-SENDABLE', fn: fSendable },
    { id: 'F-TENANT', fn: fTenant },
    { id: 'F-INBOUND', fn: fInbound },
    { id: 'F-PAY', fn: fPay },
    { id: 'F-WEBHOOK', fn: fWebhook },
    { id: 'F-DUP', fn: fDup },
    { id: 'F-BROWSER', fn: fBrowser },
    { id: 'F-MODEL', fn: fModel },
    { id: 'F-RESTART', fn: fRestart },
  ]
}
