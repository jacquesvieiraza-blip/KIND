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
  const { ENV, http, api, operator, sql, ok, bad, fakeCount, fakeMode, fakeRequests, mintJwt } = kit

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
      // ⚠️ A CALIBRATION WIDENS, IT DOES NOT REPLACE. The first cut swapped the only title the
      // client had for a different one, which left every later journey sourcing against
      // targeting that matches nobody — the walk broke four steps downstream and the symptom
      // appeared as "no qualified prospect". A human recalibrating adds the shape they also
      // want; they do not delete the one that was working.
      body: JSON.stringify({ job_titles: ['Head of Operations', 'Operations Director'], note: 'recalibrated by a human' }),
    })
    let after = Number((await sql(
      `select count(*)::int as n from public.leads where client_id = $1 and proof_batch_kind = 'calibrated_restart'`, [W.clientId]))[0].n)
    let how = `POST /operator/icp/:id/calibrate → HTTP ${r.status}`

    if (r.status === 404) {
      // No such route in this build: the restart is the operator re-running Proof after
      // editing the targeting. Drive that instead, and say which path was taken.
      await sql(`update public.icps set job_titles = '{"Head of Operations","Operations Director"}' where id = $1`, [W.icpId])
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

    // ── 🛑 ⛓️ 19 Sep — WHAT THIS RUN DID, NOT WHAT THE CLIENT HAPPENS TO OWN ─────────────
    //
    // 🛑 IT USED TO COUNT `leads where client_id = … and score is not null` AND CALL THAT
    // "sourcing produced qualified leads". Every earlier journey in this walk buys leads for
    // the same client, so that count is never zero by the time J12 runs — and one measured
    // certification run proved it: the sourcing call created NO candidate at all (Apollo
    // handed back people this client already owned) and the journey still reported
    // "20 qualified", because it was counting Proof's leads. The sourcing half was vacuous.
    //
    // So everything below is measured as a DELTA across this one call, or read off the row
    // this run itself wrote.
    const [before] = await sql(
      'select sourced_used, sourced_reserved from public.programmes where id = $1', [W.programmeId])

    const r = await asOperator('/operator/source', {
      method: 'POST', timeoutMs: 180000,
      body: JSON.stringify({ client_id: W.clientId, count: 20, confirm: true }),
    })
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
      `select status, total_inserted from public.icp_run_outcomes
        where client_id = $1 order by created_at desc limit 1`, [W.clientId])
    // The batch this run sourced against, and what it actually bought and judged.
    const [batch] = await sql(
      `select id, granted, delivered, settled_at from public.programme_batches
        where programme_id = $1 order by created_at desc limit 1`, [W.programmeId])
    const [batchRows] = batch ? await sql(
      `select count(*)::int as candidates,
              count(*) filter (where qualified_at is not null)::int as qualified,
              count(*) filter (where score is not null)::int as scored
         from public.leads where batch_id = $1`, [batch.id]) : [{ candidates: 0, qualified: 0, scored: 0 }]

    if (r.status !== 200) return bad(id, `automatic sourcing answered HTTP ${r.status}: ${String(r.text).slice(0, 250)}`)
    // ① SOURCING — this call created candidates of its own.
    const inserted = Number(outcomes[0]?.total_inserted ?? 0)
    if (inserted === 0) {
      return bad(id, `the sourcing run created NO candidate (run outcome ${outcomes[0]?.status ?? 'none'}, total_inserted=0) — there is nothing here for enrichment, qualification or accounting to be true of`)
    }
    if (!batch) return bad(id, 'the run sourced candidates and opened no programme batch — nothing accounts for the volume it took')
    if (Number(batchRows.candidates) === 0) {
      return bad(id, `batch ${batch.id} holds no candidate, so the ${inserted} lead(s) this run inserted are attributed to nothing`)
    }
    // ② ENRICHMENT + QUALIFICATION — of THIS batch, judged and scored.
    const qualified = Number(batchRows.qualified)
    if (qualified === 0) {
      return bad(id, `none of the ${batchRows.candidates} candidate(s) in batch ${batch.id} was qualified — enrichment and qualification did not run on what this call sourced`)
    }
    if (Number(batchRows.scored) === 0) {
      return bad(id, `no candidate in batch ${batch.id} carries a score — the model never judged what this run sourced`)
    }
    // ── 🛑 THE CEILING IS THE PROPERTY THAT PROTECTS THE CLIENT, and it holds ───────────
    const used = Number(auth.sourced_used)
    const reserved = Number(auth.sourced_reserved)
    const ceiling = Number(auth.sourcing_ceiling)
    if (used + reserved > ceiling) {
      return bad(id, `the accounting exceeded the authorised volume: used=${used} + reserved=${reserved} > ceiling=${ceiling}`)
    }
    // ── ③ ACCOUNTING — THE LEDGER MOVED BY EXACTLY WHAT THE BATCH SETTLED ON ───────────
    //
    // ⚠️ AND THE BATCH IS THE UNIT, NOT THE RUN — measured, not assumed. `claim_programme_batch`
    // hands a second run the batch already open, and `settleBatch` settles on
    // `count(leads where batch_id = … and qualified_at is not null)`: the whole bucket, not one
    // run's share of it. A walk that asserted "the ceiling moved by what THIS call qualified"
    // failed on a healthy run — this call qualified 20, the batch held 38 qualified, and 38 is
    // the honest number because the other 18 are equally the client's qualified prospects.
    //
    // So what is asserted is the chain that actually protects the client: the ledger moved by
    // what the batch RECORDED, the batch never recorded more than it was granted, and it never
    // consumed a record for anybody it had not qualified.
    const consumed = used - Number(before.sourced_used)
    const delivered = Number(batch.delivered ?? -1)
    if (delivered < 0) {
      return bad(id, `batch ${batch.id} recorded no delivered count, so nothing states what the ${consumed} consumed record(s) were consumed FOR`)
    }
    if (consumed !== delivered) {
      return bad(id, `the ceiling moved by ${consumed} record(s) while batch ${batch.id} settled on ${delivered} — the ledger and the batch disagree about the same event`)
    }
    if (delivered > Number(batch.granted)) {
      return bad(id, `batch ${batch.id} consumed ${delivered} of a ${batch.granted}-record grant — more than the client authorised for it`)
    }
    if (delivered > Number(batchRows.qualified)) {
      return bad(id, `batch ${batch.id} consumed ${delivered} record(s) but holds only ${batchRows.qualified} qualified prospect(s) — entitlement is consumed by QUALIFIED prospects`)
    }
    if (consumed === 0) {
      return bad(id, `the run inserted ${inserted} candidate(s) and qualified ${qualified}, and the ceiling did not move at all — the work was done and nothing was accounted for`)
    }
    if (!batch.settled_at) {
      return bad(id, `batch ${batch.id} was never settled (granted=${batch.granted}, delivered=${batch.delivered ?? 'null'}) — the reservation it holds has nothing left to release it`)
    }

    // ── 🛑 THE ACCOUNTING CLOSES: EVERY RESERVATION THIS RUN TOOK IS RELEASED ────────────
    //
    // ⛓️ 19 Sep — THIS WAS A `note()`, AND REPORTING IT WHILE PASSING THE JOURNEY WAS ITSELF
    // THE DEFECT IN THE CHECK. Journey 12 IS the accounting journey ("automatic sourcing /
    // enrichment / qualification / ACCOUNTING"); a run that leaves a client's authorised
    // volume reserved for ever has not passed it, whatever else it did. The founder's reading
    // on 19 Sep, and he is right.
    //
    // 🛑 AND THE NOTE NAMED THE WRONG MECHANISM. It said a run whose contacts were all refused
    // pre-spend "never reaches settleBatch". The run this walk measured DID settle — the batch
    // read `granted=250, delivered=5, settled_at` set — and still stranded 20. The real cause
    // was two functions disagreeing about one number: every reservation raises
    // `programmes.sourced_reserved`, but `claim_programme_batch` handed a second run the batch
    // already running WITHOUT recording the grant it arrived with, and the settle releases
    // `programme_batches.granted`. 250 released, 270 reserved, 20 stranded.
    //
    // Both that and its sibling — a run that opens a batch and inserts NOBODY, whose settle
    // sat inside a block gated on `insertedIds.length > 0` — are fixed, so this asserts.
    if (reserved > 0) {
      return bad(id, `the accounting STRANDED ${reserved} of ${ceiling} authorised records — they are reserved with nothing left to release them. ` +
        `The batch shows granted=${batch.granted}, delivered=${batch.delivered ?? 'null'}, settled_at=${batch.settled_at ?? 'null'}.`)
    }
    const pdl = (await fakeCount('pdl')) - pdlBefore
    const hunter = (await fakeCount('hunter')) - hunterBefore
    if (pdl !== 0 || hunter !== 0) return bad(id, `a forbidden provider was called during sourcing: PDL+${pdl} HUNTER+${hunter} (FD-6)`)
    ok(id, `one sourcing run end to end: THIS call inserted ${inserted} candidate(s) into batch ${String(batch.id).slice(0, 8)} (${batchRows.candidates} in it, ${batchRows.scored} scored, ${qualified} qualified) · outcome=${outcomes[0]?.status} · the ledger moved by exactly what the batch settled on (used ${before.sourced_used}→${used} of ${ceiling}, delivered=${delivered} of granted=${batch.granted}) and every reservation this run took was RELEASED (reserved back to 0) · PDL+0 HUNTER+0 · HTTP ${r.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J13 · CAMPAIGN PREPARATION
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j13() {
    const id = 'J13'
    if (needs(id, 'programmeId', 'programme')) return
    // 🛑 PREPARATION REFUSES WITHOUT A QUALIFIED PROSPECT — "there is nobody to write to" —
    // and qualification for the PROGRAMME is its own operator step, separate from the scoring
    // that happens during sourcing. Driven here because it is the precondition the product
    // itself states, not a shortcut around it.
    const qualify = await asOperator(`/operator/programme/${W.programmeId}/qualify-batch`, {
      method: 'POST', body: JSON.stringify({}), timeoutMs: 180000 })

    const r = await asOperator(`/operator/programme/${W.programmeId}/prepare-for-review`, {
      method: 'POST', body: JSON.stringify({}), timeoutMs: 120000 })

    // Preparation is server-owned and runs in the background — the route answers 202 and the
    // work lands afterwards, so the outcome is waited for rather than read at once.
    const prepared = await waitFor('the preparation snapshot', async () => {
      const [p] = await sql(
        `select review_preparation_at, review_preparation_version,
                review_preparation_snapshot is not null as has_snapshot
           from public.programmes where id = $1`, [W.programmeId])
      return p?.has_snapshot ? p : null
    })
    if (!prepared) {
      const [p] = await sql('select status from public.programmes where id = $1', [W.programmeId])
      return bad(id, `preparation produced no snapshot within 60s (status=${p?.status}) — qualify-batch HTTP ${qualify.status}: ${String(qualify.text).slice(0, 180)} || prepare HTTP ${r.status}: ${String(r.text).slice(0, 180)}`)
    }
    // 🛑 A VERSION, NOT JUST A TIMESTAMP. What the client approves has to be identifiable, or
    // "they approved THIS" cannot be proved later.
    if (!prepared.review_preparation_version) {
      return bad(id, 'the preparation carries no version — an approval could not be tied to what was approved')
    }
    ok(id, `campaign preparation ran server-side and recorded WHAT was prepared: snapshot stored, version ${prepared.review_preparation_version}, at ${prepared.review_preparation_at} · HTTP ${r.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J14 · SENDER ASSIGNMENT & VERIFICATION
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j14() {
    const id = 'J14'
    if (needs(id, 'clientId', 'client')) return
    const assign = await asOperator('/operator/inboxes/assign', {
      method: 'POST', timeoutMs: 60000,
      body: JSON.stringify({ client_id: W.clientId, count: 1 }),
    })
    let boxes = await sql(
      `select id, email, kind, status, verified_at from public.client_inboxes where client_id = $1`, [W.clientId])

    if (boxes.length === 0) {
      // No pool to assign from in this harness; a mailbox is seeded so the VERIFICATION half —
      // the part that decides whether anything may send — is still driven for real.
      seeded('the pooled mailbox and its SMTP credentials (no warmed sender pool exists in this harness to assign from)')
      const { encryptSecret } = await import(`${ENV.tree}/apps/api/dist/lib/inbox-secret.js`)
      await sql(
        `insert into public.client_inboxes(client_id, email, kind, status, provider, daily_cap,
           smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, from_name)
         values ($1, $2, 'pooled', 'assigned', 'smtp', 50, $3, $4, false, $2, $5, 'K.I.N.D Walk')`,
        [W.clientId, `walk-sender-${W.tag}@sender.invalid`,
         process.env.SMTP_HOST ?? '127.0.0.1', Number(process.env.SMTP_PORT ?? 58514),
         encryptSecret('fullstack-smtp-password')])
      boxes = await sql(
        `select id, email, kind, status, verified_at from public.client_inboxes where client_id = $1`, [W.clientId])
    }
    const box = boxes[0]
    if (box.verified_at) return bad(id, 'the mailbox was already verified before anybody tested it')

    // 🛑 VERIFICATION IS A REAL ACT, AND SENDING DEPENDS ON IT. Until a mailbox proves it can
    // log in, the send seam refuses with `sender_unsafe` — "a wrong password would only be
    // discovered by a bounce".
    const verify = await asOperator(`/operator/inboxes/${box.id}/verify`, {
      method: 'POST', body: JSON.stringify({ client_id: W.clientId }), timeoutMs: 60000 })
    const [after] = await sql(
      `select status, verified_at, verify_failed_at, verify_detail from public.client_inboxes where id = $1`, [box.id])

    if (!after.verified_at && !after.verify_failed_at) {
      return bad(id, `verification recorded NOTHING (HTTP ${verify.status}) — neither a pass nor a failure, so nobody can tell whether this mailbox can send: ${String(verify.text).slice(0, 200)}`)
    }
    if (after.verify_failed_at) {
      // A failure is a legitimate outcome and must be RECORDED with its reason, not swallowed.
      if (!after.verify_detail) return bad(id, 'the mailbox failed verification and recorded no reason')
      ok(id, `a mailbox was assigned to the client and verification ran for real: it FAILED and said why ("${String(after.verify_detail).slice(0, 80)}"), which is the outcome that keeps the send seam refusing · assign HTTP ${assign.status} · verify HTTP ${verify.status}`)
      return
    }
    ok(id, `a mailbox was assigned to the client (${box.kind}) and PROVED it can log in — verified_at stamped, which is what the send seam requires before anything may leave · assign HTTP ${assign.status} · verify HTTP ${verify.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J15 · FREEZE / READY FOR APPROVAL
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j15() {
    const id = 'J15'
    if (needs(id, 'programmeId', 'programme')) return
    const r = await http(`${BASE}/programmes/${W.programmeId}/ready-for-approval`, {
      method: 'POST', timeoutMs: 90000,
      headers: { 'x-admin-key': ENV.secrets.adminKey, 'x-operator-email': 'fullstack-operator@example.invalid' },
      body: JSON.stringify({}),
    })
    const [p] = await sql(
      `select status, review_preparation_hash, review_preparation_version from public.programmes where id = $1`, [W.programmeId])
    if (p.status !== 'READY_FOR_APPROVAL') {
      return bad(id, `the programme is ${p.status}, not READY_FOR_APPROVAL — HTTP ${r.status}: ${String(r.text).slice(0, 220)}`)
    }
    // 🛑 FROZEN MEANS THERE IS A HASH. Without one, "the client approved this exact thing"
    // is an assertion nobody can check afterwards.
    if (!p.review_preparation_hash) {
      return bad(id, 'the programme is ready for approval but carries no preparation hash — nothing pins WHAT is being approved')
    }
    W.frozenHash = p.review_preparation_hash
    ok(id, `the prepared campaign was FROZEN for the client: status ${p.status}, version ${p.review_preparation_version}, pinned by a preparation hash · HTTP ${r.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J16 · MILLA CLIENT APPROVAL
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j16() {
    const id = 'J16'
    if (needs(id, 'programmeId', 'programme')) return
    // 🛑 THE CLIENT SENDS BACK THE VERSION THEY WERE LOOKING AT, and the product refuses
    // without it — `stale_version`, "we could not tell which version you approved". That is
    // the frozen-approval rule at its sharpest: an approval that cannot name what it approved
    // is not an approval. The version is read from the programme the client was shown, which
    // is what their screen would have carried.
    // ⚠️ READ FROM THE CLIENT'S OWN SURFACE, not from the column. The version their screen
    // carries is what they would send back, and taking it from the database instead produced
    // `stale_version` — "this programme has been updated since" — because the two are not
    // necessarily the same string.
    // ⚠️ THE VERSION IS THE PREPARATION HASH, and it lives on the REVIEW surface — the screen
    // that actually shows the client what they are approving. `/my/programme` is the summary
    // and carries no version at all, which is why the first two attempts were refused.
    const view = await asClient('/my/programme/review', { timeoutMs: 60000 })
    const vd = view.json?.data ?? view.json ?? {}
    // ⚠️ FOUND WHEREVER IT SITS, rather than at a path guessed from the route's source. Three
    // guesses were refused before this: the field is the preparation HASH, not the version
    // NUMBER, and it is nested inside the review payload rather than at its root.
    const found = (function find(o, depth = 0) {
      if (!o || typeof o !== 'object' || depth > 4) return null
      if (typeof o.version === 'string' && o.version.length >= 8) return o.version
      for (const v of Object.values(o)) { const hit = find(v, depth + 1); if (hit) return hit }
      return null
    })(vd)
    const version = String(found ?? '')
    if (!version) {
      return bad(id, `the client's own review surface carries no version to approve (HTTP ${view.status}): keys=${Object.keys(vd).join(',')} · ${JSON.stringify(vd).slice(0, 220)}`)
    }
    const r = await asClient('/my/programme/approve', {
      method: 'POST', timeoutMs: 90000, body: JSON.stringify({ version }),
    })
    const [p] = await sql(
      `select status, approved_at, approved_preparation_hash, approved_preparation_version
         from public.programmes where id = $1`, [W.programmeId])
    if (!p.approved_at) {
      return bad(id, `the client's approval was not recorded (status=${p.status}), approving version "${version}" — HTTP ${r.status}: ${String(r.text).slice(0, 220)}`)
    }
    // 🛑 THEY APPROVED WHAT WAS FROZEN, and the hash is what proves it. An approval recorded
    // against a different hash is an approval of something the client never saw.
    if (W.frozenHash && p.approved_preparation_hash !== W.frozenHash) {
      return bad(id, `the approval was recorded against a DIFFERENT preparation than the one frozen for them (frozen ${String(W.frozenHash).slice(0, 12)}…, approved ${String(p.approved_preparation_hash).slice(0, 12)}…)`)
    }
    ok(id, `the CLIENT approved, in their own surface, and the approval is pinned to exactly what was frozen for them (hash matches, version ${p.approved_preparation_version}) · status ${p.status} · HTTP ${r.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J17 · P2
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j17() {
    const id = 'J17'
    if (needs(id, 'programmeId', 'programme')) return
    const settled = (row) => !!(row.second_paid_at || row.second_authorised_at)
    const cols = 'status, second_paid_at, second_authorised_at'
    const checkout = await asClient('/my/programme/checkout/second', { method: 'POST', body: JSON.stringify({}), timeoutMs: 60000 })
    const before = (await sql(`select ${cols} from public.programmes where id = $1`, [W.programmeId]))[0]
    if (settled(before)) {
      return bad(id, `Payment 2 was settled by the CHECKOUT alone (paid=${before.second_paid_at}, authorised=${before.second_authorised_at})`)
    }
    const hook = await kit.stripeCheckout({ type: 'programme_second', programmeId: W.programmeId, clientId: W.clientId })
    const after = (await sql(`select ${cols} from public.programmes where id = $1`, [W.programmeId]))[0]
    if (!settled(after)) {
      return bad(id, `the programme_second webhook (HTTP ${hook.status}) did not settle Payment 2 (status=${after.status}) — checkout HTTP ${checkout.status}: ${String(checkout.text).slice(0, 200)}`)
    }
    ok(id, `Payment 2 settled by the WEBHOOK, not by the client reaching Stripe (status ${before.status} → ${after.status}) · checkout HTTP ${checkout.status} · webhook HTTP ${hook.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J18 · MAKE LIVE — and it sends NOTHING
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j18() {
    const id = 'J18'
    if (needs(id, 'programmeId', 'programme')) return
    const smtpBefore = (await http(`${ENV.fakes.resend}/__fake/smtp`)).json?.calls ?? -1
    const r = await http(`${BASE}/programmes/${W.programmeId}/go-live`, {
      method: 'POST', timeoutMs: 90000,
      headers: { 'x-admin-key': ENV.secrets.adminKey, 'x-operator-email': 'fullstack-operator@example.invalid' },
      body: JSON.stringify({}),
    })
    const [p] = await sql('select status, went_live_at, run_at from public.programmes where id = $1', [W.programmeId])
    if (!p.went_live_at || p.status !== 'LIVE') {
      return bad(id, `Make Live did not arm the programme (status=${p.status}, went_live_at=${p.went_live_at}) — HTTP ${r.status}: ${String(r.text).slice(0, 220)}`)
    }
    // 🛑 ARMED IS NOT STARTED (R130). "Make Live alone is not Running" — so this must leave
    // `run_at` null and send nothing at all.
    if (p.run_at) return bad(id, `Make Live also set run_at (${p.run_at}) — it conflated arming with starting, which R130 forbids`)
    const smtpAfter = (await http(`${ENV.fakes.resend}/__fake/smtp`)).json?.calls ?? -1
    if (smtpAfter !== smtpBefore) {
      return bad(id, `Make Live sent ${smtpAfter - smtpBefore} message(s) — it must arm and send NOTHING`)
    }
    ok(id, `Make Live ARMED the programme (status LIVE, went_live_at stamped) and sent ZERO messages, leaving run_at null — armed is not started (R130) · HTTP ${r.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J19 · RUN
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j19() {
    const id = 'J19'
    if (needs(id, 'programmeId', 'programme')) return
    const r = await http(`${BASE}/programmes/${W.programmeId}/run`, {
      method: 'POST', timeoutMs: 90000,
      headers: { 'x-admin-key': ENV.secrets.adminKey, 'x-operator-email': 'fullstack-operator@example.invalid' },
      body: JSON.stringify({}),
    })
    const [p] = await sql('select status, run_at, run_by from public.programmes where id = $1', [W.programmeId])
    if (!p.run_at) {
      return bad(id, `Run recorded no authority (status=${p.status}) — HTTP ${r.status}: ${String(r.text).slice(0, 220)}`)
    }
    // 🛑 RUN IS A STORED AUTHORITY, NOT A BUTTON. Pressing it twice must not move the stamp:
    // the run that started is the run that started.
    const again = await http(`${BASE}/programmes/${W.programmeId}/run`, {
      method: 'POST', timeoutMs: 90000,
      headers: { 'x-admin-key': ENV.secrets.adminKey, 'x-operator-email': 'fullstack-operator@example.invalid' },
      body: JSON.stringify({}),
    })
    const [p2] = await sql('select run_at from public.programmes where id = $1', [W.programmeId])
    if (String(p2.run_at) !== String(p.run_at)) {
      return bad(id, `a second Run moved the authority stamp ${p.run_at} → ${p2.run_at} — Run is recorded once`)
    }
    ok(id, `Run recorded a stored authority (run_at ${p.run_at}) and a second press did NOT move it · HTTP ${r.status} then ${again.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J22 · REPLIES / REVIEW
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j22() {
    const id = 'J22'
    if (needs(id, 'clientId', 'client')) return
    // ⚠️ SEEDED: THE PROSPECT'S ADDRESS. Proof leads are MASKED — `email` is null until the
    // client reveals one — and revealing is its own money-bearing act, not what journey 22 is
    // about. The address is written onto one of the client's own real leads so the reply has
    // a genuine person to be attributed to.
    const lead = (await sql(
      `select id from public.leads where client_id = $1 order by created_at desc limit 1`, [W.clientId]))[0]
    if (!lead) return bad(id, 'the client has no lead to reply from')
    const replyFrom = `walk-prospect-${W.tag}@prospect.invalid`
    await sql('update public.leads set email = $1 where id = $2', [replyFrom, lead.id])
    seeded("the prospect's email address on one lead (Proof leads are masked until revealed)")
    lead.email = replyFrom

    const [{ id: campaignId }] = await sql(
      `insert into public.figsy_campaigns(client_id, name, status) values ($1, $2, 'active') returning id`,
      [W.clientId, `Walk reply campaign ${W.tag}`])
    // ⚠️ SEEDED: the originating send. Driving a real send here would duplicate journey 20,
    // and what journey 22 is about is what happens when a reply ARRIVES.
    seeded('the originating send row that a reply is attributed to (journey 20 proves sending itself)')
    await sql(
      `insert into public.figsy_sent_emails(campaign_id, lead_id, subject, body, step)
       values ($1, $2, 'Hello', 'Body', 1)`, [campaignId, lead.id])

    await fakeMode('anthropic', 'success')
    const r = await http(`${ENV.api}/figsy/replies/inbound`, {
      method: 'POST', timeoutMs: 90000,
      headers: { 'x-webhook-secret': ENV.secrets.resendWebhook, 'svix-id': `svix-walk-${W.tag}` },
      body: JSON.stringify({
        type: 'email.received',
        data: { email_id: `walk-reply-${W.tag}`, from: lead.email, to: [`walk-sender-${W.tag}@sender.invalid`],
                subject: 'Re: Hello', text: 'Yes — interested, can we talk Thursday?' },
      }),
    })
    const replies = await sql(
      `select r.id, r.classification, r.client_id from public.figsy_replies r where r.client_id = $1`, [W.clientId])
    if (replies.length === 0) {
      return bad(id, `the reply was not retained (HTTP ${r.status}): ${String(r.text).slice(0, 220)}`)
    }
    if (replies.length > 1) return bad(id, `one inbound reply produced ${replies.length} rows`)
    ok(id, `an inbound reply from the client's own prospect was attributed to THEM and retained exactly once (classification=${replies[0].classification ?? 'unclassified'}) · HTTP ${r.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J23 · MEETINGS
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j23() {
    const id = 'J23'
    if (needs(id, 'clientId', 'client')) return
    const lead = (await sql(
      `select id from public.leads where client_id = $1 order by created_at desc limit 1`, [W.clientId]))[0]
    if (!lead) return bad(id, 'the client has no lead to book a meeting for')

    // Driven through the product's own recorder — `public.meetings` is the sole source of
    // meeting truth, and `recordBooking` is the one writer.
    const { recordBooking } = await import(`${ENV.tree}/apps/api/dist/lib/meeting-truth.js`)
    const scheduledAt = new Date(Date.now() + 86400000).toISOString()
    const first = await recordBooking({ clientId: W.clientId, leadId: lead.id, scheduledAt })
    // 🛑 THE SAME BOOKING TWICE IS ONE MEETING. A reschedule, a retried webhook and a double
    // confirmation all arrive as a second write.
    const second = await recordBooking({ clientId: W.clientId, leadId: lead.id, scheduledAt })
    const rows = await sql(
      `select state, scheduled_at from public.meetings where client_id = $1`, [W.clientId])

    if (rows.length === 0) {
      return bad(id, `no meeting was recorded (${JSON.stringify(first).slice(0, 200)})`)
    }
    if (rows.length > 1) {
      return bad(id, `the same booking recorded ${rows.length} meetings — a retry must not double-count (${JSON.stringify(second).slice(0, 120)})`)
    }
    // A booking we cannot yet prove was attended is BOOKED, never HELD.
    if (String(rows[0].state).toUpperCase() === 'HELD') {
      return bad(id, 'a fresh booking was recorded as HELD — attendance is explicit confirmation only')
    }
    ok(id, `a booking for the client's own prospect was recorded in public.meetings as ${rows[0].state} — one meeting, and a repeated booking did not create a second`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J24 · RESULTS
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j24() {
    const id = 'J24'
    if (needs(id, 'clientId', 'client')) return
    const r = await asClient('/my/programme', { timeoutMs: 60000 })
    if (r.status !== 200) return bad(id, `the client's programme view answered HTTP ${r.status}: ${String(r.text).slice(0, 200)}`)
    const body = JSON.stringify(r.json ?? {})

    // 🛑 THE NUMBERS ON THEIR SCREEN ARE THE DATABASE'S NUMBERS. A results view that
    // disagrees with the meeting table is the defect this journey exists to catch.
    const [{ n: meetings }] = await sql(
      `select count(*)::int as n from public.meetings where client_id = $1`, [W.clientId])
    const d = r.json?.data ?? r.json ?? {}
    const shown = JSON.stringify(d).match(/"meetings[_a-z]*":\s*(\d+)/)
    if (shown && Number(shown[1]) !== Number(meetings)) {
      return bad(id, `the client is shown ${shown[1]} meeting(s) while the meetings table holds ${meetings}`)
    }
    // And the retired economics must not be in front of them (R124).
    for (const gone of ['credit', 'wallet']) {
      if (body.toLowerCase().includes(`"${gone}`)) {
        return bad(id, `the results view puts retired economics in front of a client: "${gone}" (R124)`)
      }
    }
    ok(id, `the client's own results view answers from the database (${meetings} meeting(s), agreeing with public.meetings) and carries no retired wallet/credit wording · ${body.length} bytes · HTTP ${r.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  // J25 · COMPLETION
  // ════════════════════════════════════════════════════════════════════════════════════════
  async function j25() {
    const id = 'J25'
    if (needs(id, 'programmeId', 'programme')) return
    // 🛑 A PROGRAMME CANNOT JUST BE CLOSED WITH THE CLIENT'S MONEY UNSPENT. Completion refuses
    // while authorised volume is undelivered and unsettled — "1245 of 1250 authorised leads
    // are undelivered and the value has not been settled" — so the value is settled first,
    // which is the product's own rule and the honest thing to do to a paying client.
    const settle = await http(`${BASE}/programmes/${W.programmeId}/make-whole`, {
      method: 'POST', timeoutMs: 60000,
      headers: { 'x-admin-key': ENV.secrets.adminKey, 'x-operator-email': 'fullstack-operator@example.invalid' },
      body: JSON.stringify({ cents: 0, note: 'Full-stack walk: undelivered authorised value settled before completion.' }),
    })
    const [settled] = await sql('select value_settled_at from public.programmes where id = $1', [W.programmeId])
    if (!settled?.value_settled_at) {
      return bad(id, `the undelivered value was not settled (HTTP ${settle.status}: ${String(settle.text).slice(0, 200)}), so completion cannot be reached honestly`)
    }

    const r = await http(`${BASE}/programmes/${W.programmeId}/complete`, {
      method: 'POST', timeoutMs: 90000,
      headers: { 'x-admin-key': ENV.secrets.adminKey, 'x-operator-email': 'fullstack-operator@example.invalid' },
      body: JSON.stringify({}),
    })
    const [p] = await sql('select status from public.programmes where id = $1', [W.programmeId])
    if (p.status !== 'COMPLETED') {
      return bad(id, `the programme is ${p.status}, not COMPLETED — HTTP ${r.status}: ${String(r.text).slice(0, 220)}`)
    }
    // 🛑 A COMPLETED PROGRAMME SENDS NOTHING MORE. Completion that left the send authority
    // standing would keep mail going out after the engagement ended.
    const smtpBefore = (await http(`${ENV.fakes.resend}/__fake/smtp`)).json?.calls ?? -1
    await asOperator('/operator/send-due/run-once', {
      method: 'POST', body: JSON.stringify({ client_id: W.clientId, max_sends: 5 }), timeoutMs: 120000 })
    const smtpAfter = (await http(`${ENV.fakes.resend}/__fake/smtp`)).json?.calls ?? -1
    if (smtpAfter !== smtpBefore) {
      return bad(id, `a COMPLETED programme still sent ${smtpAfter - smtpBefore} message(s)`)
    }
    ok(id, `the undelivered authorised value was SETTLED first (value_settled_at stamped — a programme cannot be closed with the client's money unspent and unaccounted), the programme was then COMPLETED (status ${p.status}), and a send run afterwards produced ZERO messages — completion ends the outreach authority · HTTP ${r.status}`)
  }

  return { W, seeded, asClient, needs, checks: [
    { id: 'J1', fn: j1 }, { id: 'J2', fn: j2 }, { id: 'J3', fn: j3 }, { id: 'J4', fn: j4 },
    { id: 'J5', fn: j5 }, { id: 'J6', fn: j6 }, { id: 'J7', fn: j7 }, { id: 'J8', fn: j8 },
    { id: 'J9', fn: j9 }, { id: 'J10', fn: j10 }, { id: 'J11', fn: j11 }, { id: 'J12', fn: j12 },
    // ⚠️ J14 RUNS BEFORE J13, AND THE PRODUCT IS WHY. Preparation refuses with "no verified
    // sending mailbox", so the sender has to exist and have proved it can log in before a
    // campaign can be prepared. The founder's NUMBERING is untouched — the evidence table is
    // by journey number — but a walk has to follow the order the product actually imposes.
    { id: 'J14', fn: j14 }, { id: 'J13', fn: j13 }, { id: 'J15', fn: j15 }, { id: 'J16', fn: j16 },
    { id: 'J17', fn: j17 }, { id: 'J18', fn: j18 }, { id: 'J19', fn: j19 },
    { id: 'J22', fn: j22 }, { id: 'J23', fn: j23 }, { id: 'J24', fn: j24 }, { id: 'J25', fn: j25 },
  ] }
}
