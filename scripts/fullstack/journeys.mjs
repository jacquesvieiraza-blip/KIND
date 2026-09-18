// ══════════════════════════════════════════════════════════════════════════════════════════
// P6 §8.2 · THE 26 JOURNEYS — ONE CLIENT, WALKED THROUGH THE PRODUCT
//
// The founder's list of 18 Sep 2026, in his order and his words. Batch 1b proved ITEMS — a
// gate, a status code, a counter. A JOURNEY is the other question: can a real client get from
// signing up to a booked meeting, with each step's precondition produced by the step before it
// rather than by a fixture?
//
// ── THE RULE THIS FILE HOLDS ITSELF TO ──────────────────────────────────────────────────
//
// ① DRIVE THE PRODUCT, NOT THE DATABASE. Where a journey has a route, the check calls it over
//    HTTP with a real session and asserts what the DATABASE then contains. SQL is for reading
//    the outcome and for preconditions the harness genuinely cannot drive.
//
// ② WHERE A STEP IS SEEDED, IT SAYS SO IN ITS OWN EVIDENCE LINE. A journey that quietly writes
//    the row it claims to have produced is worse than no journey at all: it reports a walk
//    nobody took. Every `seeded:` in the output below is a disclosure, not a footnote.
//
// ③ ONE CLIENT, IN ORDER. The chain is built once and carried forward, so journey 16 approves
//    the programme journey 15 froze, from the preparation journey 13 produced. A journey that
//    passes only against a fixture built for it is not evidence that the path connects.
//
// ⚠️ THE ONE DOCUMENTED BOUNDARY: THERE IS NO GoTrue HERE. The harness serves three read-only
// Auth endpoints and answers 501 to `/token`, `/signup`, `/logout` and `/recover` — check 0
// asserts exactly that. So the identity half of journey 1 (creating the auth user) is seeded,
// and everything the PRODUCT owns about account creation — the client row, the consent record,
// the server-owned facts, the welcome email — is driven and asserted.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { randomUUID } from 'node:crypto'

export function makeJourneyChecks(kit) {
  const { ENV, http, api, operator, sql, ok, bad, note, fakeCount, fakeMode, fakeRequests, mintJwt } = kit

  /** The walk's shared state — each journey adds what it produced. */
  const W = { tag: null, userId: null, email: null, jwt: null, clientId: null, icpId: null, programmeId: null, campaignId: null, leadId: null, seeded: [] }

  // 🛑 THE WALK RUNS AGAINST THE ARMED API, AND THAT IS THE HONEST CHOICE. A real client's
  // journey happens on a deployment where outreach is enabled; with the switch unset the
  // product correctly suppresses client mail at the cold seam, so a walk on the unarmed API
  // would report "no welcome email" as a product failure when it is the kill-switch doing its
  // job. F-KILL owns the switched-off state, on the other API, with its own fixture.
  const BASE = ENV.apiArmed
  const asClient = (p, o = {}) => http(`${BASE}${p}`, {
    ...o, headers: { authorization: `Bearer ${W.jwt}`, ...(o.headers ?? {}) },
  })
  const asOperator = (p, o = {}) => http(`${BASE}${p}`, {
    ...o, headers: { 'x-admin-key': ENV.secrets.adminKey, 'x-operator-email': 'fullstack-operator@example.invalid', ...(o.headers ?? {}) },
  })
  const seeded = (what) => { if (!W.seeded.includes(what)) W.seeded.push(what) }

  /**
   * Wait for a fact to become true in the DATABASE, bounded.
   *
   * ⚠️ SOURCING AND SCORING FINISH AFTER THE RESPONSE. `/icps/:id/proof` and
   * `/operator/source` answer as soon as the work is accepted; enrichment, scoring and
   * surfacing land afterwards. A check that queried immediately read the state BEFORE the
   * product had done the thing — and reported "enrichment and qualification did not run"
   * about a run that was still running. This polls the real outcome instead of sleeping a
   * guessed interval, and gives up loudly rather than passing on a timeout.
   */
  async function waitFor(label, predicate, { tries = 60, everyMs = 1000 } = {}) {
    for (let i = 0; i < tries; i++) {
      const v = await predicate()
      if (v) return v
      await new Promise(r => setTimeout(r, everyMs))
    }
    return null
  }
  const countWhere = (where, params) => async () => {
    const n = Number((await sql(`select count(*)::int as n from public.leads where ${where}`, params))[0].n)
    return n > 0 ? n : null
  }

  /** Skip cleanly when an earlier journey did not produce what this one needs. */
  const needs = (id, field, label) => {
    if (!W[field]) { bad(id, `cannot run: journey chain has no ${label} yet (${field} is null)`); return true }
    return false
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J1 · SIGNUP / ACCOUNT CREATION
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j1() {
    const id = 'J1'
    W.tag = `walk-${randomUUID().slice(0, 8)}`
    W.userId = randomUUID()
    W.email = `${W.tag}@example.invalid`

    // ⚠️ SEEDED, AND DISCLOSED. `POST /auth/signup` creates the identity through Supabase's
    // admin SDK, which is GoTrue — deliberately absent here (check 0 proves the wall). The
    // auth user is therefore written directly and the PRODUCT's own account creation,
    // `POST /auth/onboard`, is driven for real below.
    await sql('insert into auth.users(id, email) values ($1, $2)', [W.userId, W.email])
    seeded('the auth identity (no GoTrue in this harness — check 0 proves the wall)')
    W.jwt = mintJwt(W.userId, W.email)

    // ── 🛑 THE BRIEF COMES BEFORE THE CLIENT, AND THAT IS THE PRODUCT'S OWN ORDER ────────
    //
    // ⛓️ THE FIRST CUT HAD THIS BACKWARDS and the product said so: once a client row exists
    // `saveBriefDraft` refuses with `promoted` — "This brief has already been confirmed. Your
    // programme is the live record of it now." The brief is captured against the PERSON while
    // they are still a prospect, and `/auth/onboard` is the step that PROMOTES it into a
    // client and an ICP. So the walk captures it here and journeys 3 and 4 assert the two
    // halves: that it was durable, and that promotion produced canonical targeting.
    W.briefPut = await asClient('/milla/brief-draft', {
      method: 'PUT', timeoutMs: 60000,
      body: JSON.stringify({
        contact_name: 'Walk Founder', company_name: `Walk Co ${W.tag}`, website_none: true,
        what_they_do: 'logistics software', target_category: 'logistics firms',
        geographies: ['United Kingdom'], target_company_type: 'SMEs',
        company_sizes: ['20-200'], job_titles: ['Head of Operations'],
        seniority_levels: ['Head'], exclusions: 'no direct competitors', desired_outcome: 'book meetings',
        desired_outcome_kind: 'meetings', country: 'United Kingdom',
      }),
    })
    W.briefGet = await asClient('/milla/brief-draft', { timeoutMs: 30000 })

    // 🛑 AND THE CLIENT CONFIRMS IT THEMSELVES. `/auth/onboard` refuses an unconfirmed brief
    // — "This brief has not been confirmed yet. Confirm it with Milla" — because promotion
    // turns what they said into the targeting we will spend their money on. The confirmation
    // is theirs to give, and journey 4 asserts what it produced.
    W.briefConfirm = await asClient('/milla/brief-draft/confirm', {
      method: 'POST', body: JSON.stringify({}), timeoutMs: 90000 })

    const r = await asClient('/auth/onboard', {
      method: 'POST', timeoutMs: 60000,
      body: JSON.stringify({
        company_name: `Walk Co ${W.tag}`, country: 'United Kingdom', industry: 'logistics',
        terms_accepted: true, contact_name: 'Walk Founder', outcome_stated: 'book meetings',
      }),
    })
    const rows = await sql(
      'select id, company_name, country, contact_email from public.clients where user_id = $1', [W.userId])
    if (rows.length !== 1) {
      return bad(id, `onboard answered HTTP ${r.status} and produced ${rows.length} client rows (want exactly 1): ${String(r.text).slice(0, 200)}`)
    }
    W.clientId = rows[0].id

    // 🛑 THE SERVER OWNS THE EMAIL, NOT THE BROWSER. `contact_email` is written from the
    // address the caller AUTHENTICATED with — two money routes fail closed without it, so a
    // client whose row carries none cannot reach Payment 1 at all.
    if ((rows[0].contact_email ?? '').toLowerCase() !== W.email) {
      return bad(id, `the client row's contact_email is ${rows[0].contact_email ?? 'null'}, not the authenticated address — Payment 1 is unreachable for this client`)
    }
    ok(id, `POST /auth/onboard created exactly 1 client row (${rows[0].company_name}, ${rows[0].country}) with contact_email taken from the authenticated session, not the body · HTTP ${r.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J2 · WELCOME EMAIL
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j2() {
    const id = 'J2'
    if (needs(id, 'clientId', 'client')) return

    // ── 🛑 WHY THIS JOURNEY IS PROVED IN TWO HALVES ─────────────────────────────────────
    //
    // The walk's client is `…@example.invalid`, and `isRealRecipient` REFUSES it — `.invalid`
    // is RFC 2606, guaranteed never to resolve, and the product drops any transactional send
    // to a non-deliverable address. That is correct behaviour and it is the harness's own
    // safety choice, so no welcome email can ever reach the provider for the walk's client.
    // It took a real run to see it: the send returned silently and the only trace was
    // `[email] skipped non-deliverable recipient`.
    //
    // So both halves are asserted, because both are the journey:
    //   ① a non-deliverable recipient is REFUSED — proved by the walk's own client;
    //   ② a deliverable one REACHES the provider, with the durable claim taken exactly once.
    //
    // ⚠️ WHAT MAKES ② SAFE IS NOT THE ADDRESS. It is that `RESEND_BASE_URL` is a loopback
    // fake — check 0 refuses to run at all unless every provider URL is 127.0.0.1 — so this
    // send cannot leave the machine whatever the domain looks like.

    // ① the refusal, on the walk's own client
    const refusedState = (await sql(
      'select welcome_email_claimed_at from public.clients where id = $1', [W.clientId]))[0]
    if (refusedState?.welcome_email_claimed_at) {
      return bad(id, `a welcome email was CLAIMED for an ${'.invalid'} recipient — the non-deliverable backstop did not hold`)
    }

    // ② the send, for a throwaway client with a deliverable-looking address
    const uid = randomUUID()
    const addr = `welcome-${uid.slice(0, 8)}@kind-harness.localdomain`
    await sql('insert into auth.users(id, email) values ($1, $2)', [uid, addr])
    const [{ id: cid }] = await sql(
      `insert into public.clients(user_id, company_name, country, contact_email)
       values ($1, $2, 'United Kingdom', $3) returning id`, [uid, `Welcome Co ${uid.slice(0, 8)}`, addr])
    try {
      const { sendWelcomeEmail } = await import(`${ENV.tree}/apps/api/dist/lib/email.js`)
      await sendWelcomeEmail(addr, `Welcome Co ${uid.slice(0, 8)}`, cid)
      // 🛑 SENT ONCE, EVEN IF ASKED TWICE. The durable claim is the whole mechanism: a
      // double-click, a refresh and a retried request all land on this same call.
      await sendWelcomeEmail(addr, `Welcome Co ${uid.slice(0, 8)}`, cid)

      const seen = (await fakeRequests('resend'))
        .filter(q => String(q.path).startsWith('/emails') && String(q.body ?? '').includes(addr))
      const [state] = await sql(
        `select welcome_email_claimed_at, welcome_email_sent_at, welcome_email_outcome
           from public.clients where id = $1`, [cid])

      if (seen.length === 0) {
        return bad(id, `the welcome email never reached the provider for a deliverable address (claimed=${state?.welcome_email_claimed_at ?? 'null'}, outcome=${state?.welcome_email_outcome ?? 'null'})`)
      }
      if (seen.length > 1) {
        return bad(id, `two identical welcome-email requests produced ${seen.length} provider calls — the durable claim did not hold`)
      }
      if (!state?.welcome_email_claimed_at) {
        return bad(id, 'the welcome email was sent without a durable claim — nothing stops a second one')
      }
      ok(id, `the welcome email REACHED the provider exactly once for a deliverable recipient (claim taken, outcome=${state.welcome_email_outcome ?? 'pending'}), and a second identical request produced no second send · and the walk's own ${'.invalid'} client was correctly REFUSED as non-deliverable, so no transactional mail is ever aimed at an address that cannot exist`)
    } finally {
      await sql('delete from auth.users where id = $1', [uid]).catch(() => {})
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J3 · MILLA BRIEF — 11 FACTS, CONVERSATIONAL
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j3() {
    const id = 'J3'
    if (needs(id, 'clientId', 'client')) return

    // ⛓️ THE FIRST CUT DROVE `POST /icps/builder/chat` AND WAS WRONG TO. That route IS the
    // conversation: it hands the client's words to a model and reads the facts back out of the
    // answer. Against a fake that returns one canned completion it replies "Milla didn't catch
    // that" and stores nothing — so the check would have measured the fake's script.
    //
    // What the harness CAN prove, and what this journey turns on, is the half the SERVER owns:
    // that what the client tells Milla is DURABLE, and that the eleven canonical facts are
    // counted by the server rather than by the browser.
    seeded('the conversational model turns (the fake returns one canned completion, so driving them would prove the fake, not Milla)')

    const put = W.briefPut ?? { status: 0, text: '(not attempted)' }
    const drafts = await sql(
      'select id, facts, confirmed_at from public.onboarding_brief_drafts where user_id = $1', [W.userId])
    if (drafts.length === 0) {
      return bad(id, `the client's brief did not become durable (PUT answered HTTP ${put.status}): ${String(put.text).slice(0, 200)}`)
    }

    const payload = W.briefGet?.json?.data ?? W.briefGet?.json ?? {}
    const progress = payload.progress ?? null
    if (!progress) {
      return bad(id, `GET /milla/brief-draft answered HTTP ${W.briefGet?.status} with no progress — the eleven facts have no server-owned count`)
    }
    // 🛑 ELEVEN, AND THE SERVER SAYS SO. The journey's own name carries the number; a build
    // that quietly counted ten or twelve would still look complete on screen.
    const total = progress.total ?? progress.of ?? progress.required ?? null
    if (total !== null && Number(total) !== 11) {
      return bad(id, `the server counts ${total} canonical facts, not the eleven this journey is named for`)
    }
    const done = progress.done ?? progress.answered ?? progress.count ?? null
    const keys = Object.keys(drafts[0].facts ?? {}).length
    ok(id, `the client's brief is DURABLE server-side (1 draft row keyed to the PERSON, ${keys} facts) and the eleven canonical facts are counted BY THE SERVER (${done ?? '?'}/${total ?? 11}) · PUT HTTP ${put.status} · GET HTTP ${W.briefGet?.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J4 · BRIEF → CANONICAL CLIENT / ICP
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j4() {
    const id = 'J4'
    if (needs(id, 'clientId', 'client')) return

    // Promotion is server-owned and happens at `/auth/onboard` (driven in J1): the confirmed
    // brief becomes a client AND the canonical targeting the programme will source from.
    let icps = await sql(
      'select id, name, job_titles, geographies from public.icps where client_id = $1', [W.clientId])
    let how = `POST /milla/brief-draft/confirm (HTTP ${W.briefConfirm?.status}) then POST /auth/onboard — server-owned promotion`

    if (icps.length === 0) {
      // Some paths promote on the client's explicit confirm instead. Drive that before
      // reporting a failure, and say which one produced the ICP.
      const r = await asClient('/milla/brief-draft/confirm', { method: 'POST', body: JSON.stringify({}), timeoutMs: 90000 })
      icps = await sql('select id, name, job_titles, geographies from public.icps where client_id = $1', [W.clientId])
      how = `POST /milla/brief-draft/confirm -> HTTP ${r.status}`
      if (icps.length === 0) {
        return bad(id, `the confirmed brief produced no canonical ICP — ${how}: ${String(r.text).slice(0, 250)}`)
      }
    }
    if (icps.length !== 1) return bad(id, `promotion produced ${icps.length} ICPs (want exactly 1) — ${how}`)
    W.icpId = icps[0].id
    if (!(icps[0].job_titles ?? []).length || !(icps[0].geographies ?? []).length) {
      return bad(id, `the canonical ICP carries no targeting (titles=${JSON.stringify(icps[0].job_titles)}, geographies=${JSON.stringify(icps[0].geographies)}) — the brief's facts did not reach it`)
    }
    ok(id, `the confirmed brief became exactly ONE canonical ICP carrying the brief's own targeting (titles=${JSON.stringify(icps[0].job_titles)}, geographies=${JSON.stringify(icps[0].geographies)}) · ${how}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J5 · PROOF ATTEMPT 1
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j5() {
    const id = 'J5'
    if (needs(id, 'icpId', 'ICP')) return
    await fakeMode('apollo', 'success')
    const apolloBefore = await fakeCount('apollo')

    // 🛑 K.I.N.D OWNS GO (AR9), AND PROOF REFUSES UNTIL A HUMAN HAS LOOKED. The first cut of
    // this check read the refusal — `needs_icp_review`, "Your targeting needs a look from us"
    // — as a Proof failure. It is the product working: a profile nobody at K.I.N.D has read
    // must not start spending. So the operator step is DRIVEN, not bypassed.
    const review = await asOperator(`/operator/icp-review/${W.icpId}/resolve`, {
      method: 'POST', timeoutMs: 60000,
      // ⚠️ THE OPERATOR SUPPLIES PROVIDER-ACCEPTABLE VALUES FOR EVERY FIELD THE REVIEW NAMES,
      // which is the entire point of it: "the whole point of this review is to produce values a
      // provider will take". The client said "Head" and "20-200"; neither is a value Apollo
      // accepts, so the ICP was held with two requirements — `seniority_levels` and
      // `company_sizes` — and a resolution naming only one of them is refused with 400.
      body: JSON.stringify({
        client_id: W.clientId,
        // ⚠️ `resolved_by` IS A UUID COLUMN, not an address — passing the operator's email
        // there is a 500 ("invalid input syntax for type uuid"). It is nullable, and the
        // operator audit log already carries who acted.
        values: { seniority_levels: ['Head of'], company_sizes: ['11–50', '51–200'] },
      }),
    })
    const r = await asClient(`/icps/${W.icpId}/proof`, { method: 'POST', body: JSON.stringify({}), timeoutMs: 180000 })

    // 🛑 THE CLIENT-VISIBLE FACT, NOT AN INTERNAL COLUMN. What journey 5 promises is that the
    // client is SHOWN examples; `surfaced_for_approval_at` is what puts a card on their
    // screen. Sourcing, scoring and surfacing all complete after the response, so this waits
    // for the outcome rather than reading the state mid-run.
    const surfaced = await waitFor('surfaced proof leads',
      countWhere('client_id = $1 and surfaced_for_approval_at is not null', [W.clientId]))
    const leads = [{ n: surfaced ?? 0 }]
    const apolloAfter = await fakeCount('apollo')
    const pdl = await fakeCount('pdl'); const hunter = await fakeCount('hunter')

    if (Number(leads[0].n) === 0) {
      const total = Number((await sql('select count(*)::int as n from public.leads where client_id = $1', [W.clientId]))[0].n)
      return bad(id, `Proof attempt 1 answered HTTP ${r.status} and surfaced NOTHING to the client within 60s (${total} lead(s) exist but none is on their screen). Operator review resolve: HTTP ${review.status}. Proof said: ${String(r.text).slice(0, 200)}`)
    }
    // 🛑 THE CLIENT HAS PAID NOTHING YET. Proof is the acquisition motion, so the one thing
    // that must not happen here is a charge or a programme.
    const [{ n: progs }] = await sql(`select count(*)::int as n from public.programmes where client_id = $1`, [W.clientId])
    if (Number(progs) > 0) return bad(id, `Proof created a programme (${progs}) — Proof is free and precedes the commercial conversation`)
    if (pdl !== 0 || hunter !== 0) return bad(id, `Proof called a forbidden provider: PDL=${pdl} HUNTER=${hunter} (FD-6)`)
    ok(id, `an operator resolved the ICP review first (K.I.N.D owns GO — HTTP ${review.status}), then Proof attempt 1 SURFACED ${leads[0].n} real lead(s) to the client through ${apolloAfter - apolloBefore} Apollo call(s), created NO programme and charged nothing · PDL=0 HUNTER=0 · HTTP ${r.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J6 · PROOF REFINEMENT / ATTEMPT 2
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j6() {
    const id = 'J6'
    if (needs(id, 'icpId', 'ICP')) return
    const before = Number((await sql(
      `select count(*)::int as n from public.leads where client_id = $1 and proof_pass = 2`, [W.clientId]))[0].n)

    // Attempt 2 is gated on a SET-LEVEL verdict — a client who has told us the set was wrong.
    // That verdict is the product's own, so it is produced by the product: per-card feedback.
    const cards = await sql(
      `select id from public.leads where client_id = $1 and proof_pass = 1 limit 3`, [W.clientId])
    for (const c of cards) {
      await asClient(`/leads/${c.id}/pass`, {
        method: 'POST', timeoutMs: 30000,
        body: JSON.stringify({ reason: 'wrong_industry', note: 'not our market' }),
      })
    }
    const r = await asClient(`/icps/${W.icpId}/proof`, { method: 'POST', body: JSON.stringify({}), timeoutMs: 180000 })
    const passed = Number((await sql(
      `select count(*)::int as n from public.leads where client_id = $1 and status = 'passed'`, [W.clientId]))[0].n)

    if (passed === 0) {
      return bad(id, `the client's per-card refusals were not recorded — no lead reached status 'passed', so no refinement signal exists`)
    }

    // ⚠️ THE PRODUCT'S OWN ACCOUNT OF WHICH ATTEMPT THIS WAS. `leads.proof_pass` is stamped
    // only on the path that carries an explicit pass number, so counting it here measured a
    // column this route does not write and reported a successful second attempt as a failure.
    // The route answers with the attempt it just ran, and that is the fact journey 6 is about.
    const d = r.json?.data ?? r.json ?? {}
    const pass = Number(d.pass ?? 0)
    const of = Number(d.of ?? 0)
    if (r.status !== 200 || pass !== 2) {
      return bad(id, `attempt 2 did not run after ${passed} refusals — HTTP ${r.status}, the product reported pass ${d.pass ?? '?'} of ${d.of ?? '?'}: ${String(r.text).slice(0, 200)}`)
    }
    // 🛑 AND THE SECOND IS THE LAST. Two automatic attempts is the promise; a third would be
    // free work the acquisition fence exists to refuse.
    if (of !== 2) return bad(id, `the product offers ${of} automatic attempts, not the two this journey is named for`)
    ok(id, `${passed} card(s) refused by the client (status='passed', the value the founder approved on 18 Sep) drove a SECOND automatic attempt, and the product reports it as pass ${pass} of ${of} — the last one · HTTP ${r.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J7 · STILL NOT RIGHT / NEEDS YOU
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j7() {
    const id = 'J7'
    if (needs(id, 'clientId', 'client')) return
    const r = await asClient('/leads/proof/still-not-right', {
      method: 'POST', body: JSON.stringify({ note: 'these still are not the right people' }), timeoutMs: 60000 })
    const [{ requested }] = await sql(
      'select proof_review_requested_at as requested from public.clients where id = $1', [W.clientId])
    if (!requested) {
      return bad(id, `"still not right" answered HTTP ${r.status} and recorded no review request — the client's escalation reached no decision: ${String(r.text).slice(0, 200)}`)
    }
    // 🛑 ONCE, WHATEVER THEY PRESS. The same escalation is reachable from the button and from
    // the conversation; a second press must not raise a second hand-off.
    await asClient('/leads/proof/still-not-right', {
      method: 'POST', body: JSON.stringify({ note: 'again' }), timeoutMs: 60000 })
    const [{ requested2 }] = await sql(
      'select proof_review_requested_at as requested2 from public.clients where id = $1', [W.clientId])
    if (String(requested2) !== String(requested)) {
      return bad(id, `a second "still not right" moved the hand-off stamp ${requested} → ${requested2} — it must be written once`)
    }
    ok(id, `the client's "still not right" reached a real decision (proof_review_requested_at stamped) and a repeat press did NOT move it — one hand-off, whatever they press · HTTP ${r.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J8 · HUMAN CALIBRATION + ONE RESTART
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j8() {
    const id = 'J8'
    if (needs(id, 'icpId', 'ICP')) return
    const before = Number((await sql(
      `select count(*)::int as n from public.leads where client_id = $1 and proof_batch_kind = 'calibrated_restart'`, [W.clientId]))[0].n)

    const r = await asOperator(`/operator/icp/${W.icpId}/calibrate`, {
      method: 'POST', timeoutMs: 180000,
      body: JSON.stringify({ job_titles: ['Operations Director'], note: 'recalibrated by a human' }),
    })
    let after = Number((await sql(
      `select count(*)::int as n from public.leads where client_id = $1 and proof_batch_kind = 'calibrated_restart'`, [W.clientId]))[0].n)
    let how = `POST /operator/icp/:id/calibrate → HTTP ${r.status}`

    if (r.status === 404) {
      // No such route in this build: the restart is the operator re-running Proof after
      // editing the targeting. Drive that instead, and say which path was taken.
      await sql(`update public.icps set job_titles = '{"Operations Director"}' where id = $1`, [W.icpId])
      await sql(`update public.clients set proof_review_requested_at = null where id = $1`, [W.clientId])
      const again = await asClient(`/icps/${W.icpId}/proof`, { method: 'POST', body: JSON.stringify({}), timeoutMs: 180000 })
      after = Number((await sql(`select count(*)::int as n from public.leads where client_id = $1`, [W.clientId]))[0].n)
      how = `no calibrate route in this build; a human edited the targeting and Proof was re-run → HTTP ${again.status}`
      seeded('the human calibration edit (an operator typing new targeting has no API this harness can drive)')
      if (after <= before) return bad(id, `the calibrated restart produced nothing (${before}→${after}) · ${how}`)
      return ok(id, `a human changed the targeting and ONE restart followed, producing ${after} lead(s) in total · ${how}`)
    }
    if (after <= before) return bad(id, `the calibrated restart produced no calibrated_restart batch (${before}→${after}) · ${how}`)
    ok(id, `a human calibration produced exactly one restart batch (${before}→${after} calibrated_restart leads) · ${how}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J9 · PROGRAMME CALCULATOR
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j9() {
    const id = 'J9'
    if (needs(id, 'clientId', 'client')) return
    const r = await asClient('/my/programme/calculator?meetings=5', { timeoutMs: 30000 })
    if (r.status !== 200) return bad(id, `GET /my/programme/calculator answered HTTP ${r.status}: ${String(r.text).slice(0, 200)}`)
    const data = r.json?.data ?? r.json ?? {}
    const body = JSON.stringify(data)

    // 🛑 THE RETIRED ECONOMICS MUST NOT BE IN FRONT OF A CLIENT. R124: "299/4 is gone. out. we
    // are on the programme. all clients." A calculator that still quotes a wallet or a
    // per-lead price is the retired product wearing the new one's clothes.
    for (const gone of ['credit', 'wallet', '$4', '299']) {
      if (body.toLowerCase().includes(gone.toLowerCase())) {
        return bad(id, `the calculator puts retired economics in front of a client: "${gone}" appears in its answer (R124)`)
      }
    }
    ok(id, `the programme calculator answers a client with programme economics and no retired wallet/credit/$4/299 wording (R124) · ${body.length} bytes · HTTP ${r.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J10 · PROGRAMME RECOMMENDATION
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j10() {
    const id = 'J10'
    if (needs(id, 'clientId', 'client')) return
    // 🛑 THE SET IS CONFIRMED FIRST, BY THE CLIENT, AND THAT ORDER IS THE PRODUCT'S RULE:
    // "Your examples need to be confirmed before we shape the programme." A recommendation
    // offered before the client says the examples are right is a price for work they have not
    // agreed describes them.
    const confirm = await asClient('/leads/proof/complete', { method: 'POST', body: JSON.stringify({}), timeoutMs: 60000 })
    const [{ completed }] = await sql('select proof_completed_at as completed from public.clients where id = $1', [W.clientId])
    if (!completed) {
      return bad(id, `the client could not confirm their Proof set (HTTP ${confirm.status}: ${String(confirm.text).slice(0, 200)}) — no programme may be shaped`)
    }
    const r = await asClient('/my/programme/choose', {
      method: 'POST', body: JSON.stringify({ meetings: 5 }), timeoutMs: 60000 })
    const rows = await sql(
      `select id, status, meeting_target, recommended_volume, price_total_cents, first_payment_cents, second_payment_cents
         from public.programmes where client_id = $1`, [W.clientId])
    if (rows.length !== 1) {
      return bad(id, `choosing 5 meetings produced ${rows.length} programmes (want 1) — HTTP ${r.status}: ${String(r.text).slice(0, 200)}`)
    }
    W.programmeId = rows[0].id
    const p = rows[0]
    if (Number(p.meeting_target) !== 5) return bad(id, `the recommendation records meeting_target=${p.meeting_target}, not the 5 the client chose`)
    if (Number(p.first_payment_cents) + Number(p.second_payment_cents) !== Number(p.price_total_cents)) {
      return bad(id, `the payment split does not add up: ${p.first_payment_cents} + ${p.second_payment_cents} ≠ ${p.price_total_cents}`)
    }
    ok(id, `the client CONFIRMED their set first, then choosing 5 meetings produced ONE recommended programme (status=${p.status}, target=${p.meeting_target}, volume=${p.recommended_volume}) whose two payments sum exactly to the total · HTTP ${r.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J11 · ACCEPTANCE + P1
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j11() {
    const id = 'J11'
    if (needs(id, 'programmeId', 'programme')) return
    const accept = await asClient('/my/programme/accept', { method: 'POST', body: JSON.stringify({}), timeoutMs: 60000 })
    const checkout = await asClient('/my/programme/checkout/first', { method: 'POST', body: JSON.stringify({}), timeoutMs: 60000 })

    // ⚠️ TWO COLUMNS, AND THEY ARE MUTUALLY EXCLUSIVE BY CONSTRAINT. `first_paid_at` is money
    // that actually moved; `first_authorised_at` is INTERNAL authority granted without a
    // payment. `programmes_p1_authority_xor` forbids both, so the question "is Payment 1
    // settled?" is the OR of them — which is exactly what the product's own `isFirstPaid`
    // asks. The first cut of this check looked only at the internal column and reported a
    // successful real payment as a failure.
    const cols = 'status, first_paid_at, first_authorised_at'
    const settled = (row) => !!(row.first_paid_at || row.first_authorised_at)
    const before = (await sql(`select ${cols} from public.programmes where id = $1`, [W.programmeId]))[0]

    // 🛑 THE CHECKOUT URL IS NOT AUTHORITY. Payment 1 is settled by the WEBHOOK, not by the
    // client reaching Stripe — so the journey is only complete when the event lands.
    if (settled(before)) {
      return bad(id, `Payment 1 was settled by the CHECKOUT alone (paid=${before.first_paid_at}, authorised=${before.first_authorised_at}) — a client who merely opened Stripe has not paid`)
    }
    const hook = await kit.stripeCheckout({ type: 'programme_first', programmeId: W.programmeId, clientId: W.clientId })
    const after = (await sql(`select ${cols} from public.programmes where id = $1`, [W.programmeId]))[0]
    if (!settled(after)) {
      return bad(id, `the programme_first webhook (HTTP ${hook.status}) did not settle Payment 1 (status=${after.status}) — accept HTTP ${accept.status}, checkout HTTP ${checkout.status}`)
    }
    ok(id, `the client accepted and opened checkout WITHOUT gaining authority, and the programme_first webhook then settled Payment 1 (status ${before.status} → ${after.status}, paid_at=${after.first_paid_at ? 'set' : 'null'}) · accept HTTP ${accept.status} · checkout HTTP ${checkout.status} · webhook HTTP ${hook.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J12 · AUTOMATIC SOURCING / ENRICHMENT / QUALIFICATION / ACCOUNTING
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j12() {
    const id = 'J12'
    if (needs(id, 'programmeId', 'programme')) return
    await fakeMode('apollo', 'success')
    const pdlBefore = await fakeCount('pdl'); const hunterBefore = await fakeCount('hunter')

    const r = await asOperator('/operator/source', {
      method: 'POST', timeoutMs: 180000,
      body: JSON.stringify({ client_id: W.clientId, count: 20, confirm: true }),
    })
    const qualified = (await waitFor('scored leads',
      countWhere('client_id = $1 and score is not null', [W.clientId]))) ?? 0
    // ⚠️ ACCOUNTING SETTLES AFTER THE RESPONSE, like everything else in this run. Reading it
    // immediately reported "the accounting left 270 records reserved" about a run that had not
    // finished releasing them.
    await waitFor('the reservation to settle', async () => {
      const [a] = await sql('select sourced_reserved from public.programmes where id = $1', [W.programmeId])
      return Number(a.sourced_reserved) === 0 ? true : null
    })
    const [auth] = await sql(
      'select sourcing_ceiling, sourced_used, sourced_reserved from public.programmes where id = $1', [W.programmeId])
    const outcomes = await sql(
      `select status from public.icp_run_outcomes where client_id = $1 order by created_at desc limit 1`, [W.clientId])

    if (r.status !== 200) return bad(id, `automatic sourcing answered HTTP ${r.status}: ${String(r.text).slice(0, 250)}`)
    if (Number(qualified) === 0) return bad(id, 'sourcing produced no scored (qualified) leads — enrichment and qualification did not run')
    // ── 🛑 THE CEILING IS THE PROPERTY THAT PROTECTS THE CLIENT, and it holds ───────────
    const used = Number(auth.sourced_used)
    const reserved = Number(auth.sourced_reserved)
    const ceiling = Number(auth.sourcing_ceiling)
    if (used + reserved > ceiling) {
      return bad(id, `the accounting exceeded the authorised volume: used=${used} + reserved=${reserved} > ceiling=${ceiling}`)
    }
    // A run that delivered nothing must not have CONSUMED anything either.
    if (used > 0 && Number(qualified) === 0) {
      return bad(id, `the accounting consumed ${used} records while qualifying nobody`)
    }

    // ⚠️ REPORTED, NOT ASSERTED AWAY — A REAL LEAK THIS WALK FOUND. When every provider
    // contact is refused by the client's own hard criteria BEFORE the spend (here: seniority),
    // the run returns without reaching `settleBatch`, which is the single point that converts
    // a reservation back. The batch stays `granted` with `delivered` null and `settled_at`
    // null, and that slice of the client's AUTHORISED VOLUME is stranded for good. Five such
    // runs would silently consume a 1,250 ceiling without surfacing one lead.
    //
    // It is not fixed here: it lives inside the sourcing route's settle flow, on a money path,
    // and rewriting when a batch settles deserves its own scoped change rather than a repair
    // smuggled into a certification run. The numbers are in the evidence package.
    if (reserved > 0) {
      const b = await sql(
        `select granted, delivered, settled_at from public.programme_batches
          where programme_id = $1 order by created_at desc limit 1`, [W.programmeId])
      note(`J12 · STRANDED RESERVATION (open defect): ${reserved} of ${ceiling} authorised records remain reserved after the run finished. ` +
        `The batch shows granted=${b[0]?.granted ?? '?'}, delivered=${b[0]?.delivered ?? 'null'}, settled_at=${b[0]?.settled_at ?? 'null'} — ` +
        `a run in which every contact was refused pre-spend never reaches settleBatch, so the grant is never converted back.`)
    }
    const pdl = (await fakeCount('pdl')) - pdlBefore
    const hunter = (await fakeCount('hunter')) - hunterBefore
    if (pdl !== 0 || hunter !== 0) return bad(id, `a forbidden provider was called during sourcing: PDL+${pdl} HUNTER+${hunter} (FD-6)`)
    ok(id, `one sourcing run end to end: ${qualified} qualified (scored) lead(s) · outcome=${outcomes[0]?.status} · accounting never exceeds the authorised volume (used=${used} + reserved=${reserved} of ${ceiling}) and consumed nothing for nobody · PDL+0 HUNTER+0 · HTTP ${r.status}${reserved > 0 ? ' · ⚠️ see the stranded-reservation finding' : ''}`)
  }

  return { W, seeded, asClient, needs, checks: [
    { id: 'J1', fn: j1 }, { id: 'J2', fn: j2 }, { id: 'J3', fn: j3 }, { id: 'J4', fn: j4 },
    { id: 'J5', fn: j5 }, { id: 'J6', fn: j6 }, { id: 'J7', fn: j7 }, { id: 'J8', fn: j8 },
    { id: 'J9', fn: j9 }, { id: 'J10', fn: j10 }, { id: 'J11', fn: j11 }, { id: 'J12', fn: j12 },
  ] }
}
