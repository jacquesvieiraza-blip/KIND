// ══════════════════════════════════════════════════════════════════════════════════════════
// BATCH 1b · THE TEN CHECKS — REAL PROCESSES, REAL HTTP, REAL POSTGRES
//
// Every assertion below travels over a socket to a process that was started from the built
// artifact, and every piece of state is read back out of PostgreSQL. Nothing is mocked and
// nothing is asserted from source text: that is what separates this from the unit suite, and
// it is why it finds things the unit suite cannot.
//
// ⚠️ READ THE VERDICTS LITERALLY. A check that cannot establish its fact reports FAIL with the
// reason, never "probably fine". Two of them found real defects on their first run and say so.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { Client } from 'pg'
import { createHmac, randomUUID } from 'node:crypto'
import { makeFailureChecks } from './failure-classes.mjs'
import { makeJourneyChecks } from './journeys.mjs'
import { assessCoverage, printCoverage } from './coverage.mjs'

const ENV = JSON.parse(readFileSync(process.argv[2] ?? `${process.env.TMPDIR ?? '/tmp'}/kind-fullstack/env.json`, 'utf8'))
const results = []
const findings = []

const ok = (n, detail) => { results.push({ n, pass: true, detail }); console.log(`   ✅ CHECK ${n} — ${detail}`) }
const bad = (n, detail) => { results.push({ n, pass: false, detail }); console.log(`   ❌ CHECK ${n} — ${detail}`) }
const note = (text) => { findings.push(text); console.log(`      ⚠️ ${text}`) }

// ── PLUMBING ──────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ `x-forwarded-proto: https` ON EVERY PORTAL/ADMIN REQUEST, and it is not a workaround.
 * Both Next middlewares bump http → https at the entry point (`middleware.ts`), honouring the
 * header Railway's TLS terminator sets in production. Without it every request 308s to
 * `https://localhost:<port>`, which is what the first run did. Sending the header is what the
 * production edge does; not sending it would be testing a configuration that never exists.
 */
const HTTPS_FWD = { 'x-forwarded-proto': 'https' }

async function http(url, { method = 'GET', headers = {}, body, timeoutMs = 20000 } = {}) {
  const started = Date.now()
  try {
    const res = await fetch(url, {
      method, body,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
      signal: AbortSignal.timeout(timeoutMs),
    })
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch { /* not JSON — the caller may care */ }
    return { status: res.status, text, json, ms: Date.now() - started }
  } catch (err) {
    return { status: 0, text: String(err), json: null, ms: Date.now() - started, error: err }
  }
}

const api = (p, o = {}) => http(`${ENV.api}${p}`, o)
const operator = (p, o = {}) => http(`${ENV.api}${p}`, {
  ...o, headers: { 'x-admin-key': process.env.ADMIN_SECRET_KEY ?? 'fullstack-admin-secret', 'x-operator-email': 'fullstack-operator@example.invalid', ...(o.headers ?? {}) },
})
const portal = (p, o = {}) => http(`${ENV.portal}${p}`, { ...o, headers: { ...HTTPS_FWD, ...(o.headers ?? {}) } })
const admin = (p, o = {}) => http(`${ENV.admin}${p}`, { ...o, headers: { ...HTTPS_FWD, ...(o.headers ?? {}) } })

// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE ADMIN SESSION COOKIE — DERIVED FROM THE INSTALLED LIBRARY, NEVER FROM MEMORY
//
// Check 3's timeout half must cross the REAL admin middleware, which reads its session from a
// cookie whose NAME and ENCODING are `@supabase/ssr`'s business, not ours. Both were read out
// of the installed package rather than recalled:
//
//   · NAME — `@supabase/ssr@0.4.1`'s `createServerClient` sets `storageKey` only when
//     `cookieOptions.name` is given. `middleware.ts` does not give one, so the default from
//     `@supabase/supabase-js@2.105.4` applies: `sb-${baseUrl.hostname.split(".")[0]}-auth-token`.
//     Against the gateway (`http://127.0.0.1:<port>`) that is `sb-127-auth-token` — derived
//     below from ENV rather than hardcoded, so a port or host change cannot silently break it.
//   · ENCODING — `createServerClient` defaults `cookieEncoding` to `"base64url"`, and
//     `cookies.js` writes `BASE64_PREFIX + stringToBase64URL(value)` where `BASE64_PREFIX`
//     is the literal `"base64-"`. The encoder is IMPORTED from the package, so the harness
//     cannot disagree with the reader about the format.
//
// ⚠️ THE SESSION IS A REAL SIGNED TOKEN, and the gateway verifies its signature. This cookie
// is not an assertion the middleware takes on trust; it is the credential the middleware
// checks. Used ONLY by check 3 — check 1 deliberately sends no session at all.
// ══════════════════════════════════════════════════════════════════════════════════════════
const { stringToBase64URL } = await import('@supabase/ssr/dist/main/utils/base64url.js')

function adminSessionCookie() {
  if (!ENV.adminJwt) throw new Error('env.json has no adminJwt — fullstack.sh did not seed the admin identity')
  const host = new URL(ENV.supabaseUrl ?? ENV.gateway).hostname
  const name = `sb-${host.split('.')[0]}-auth-token`
  const session = {
    access_token: ENV.adminJwt,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'fullstack-harness-no-refresh',
    user: { id: ENV.adminUserId, email: ENV.adminEmail, aud: 'authenticated', role: 'authenticated' },
  }
  return `${name}=base64-${stringToBase64URL(JSON.stringify(session))}`
}

/**
 * Ask real PostgREST for a table and hand back the error body VERBATIM.
 *
 * ⚠️ IT GOES THROUGH THE GATEWAY WITH THE SERVICE JWT, exactly as the product's supabase-js
 * client does — same path, same auth, same binary. The point is to observe the code PostgREST
 * itself chooses, so nothing here interprets or normalises it.
 */
async function pgrstError(table) {
  const r = await http(`${ENV.gateway}/rest/v1/${table}?select=id&limit=1`, {
    headers: { apikey: ENV.serviceJwt, authorization: `Bearer ${ENV.serviceJwt}` },
  })
  return { status: r.status, code: r.json?.code ?? '', message: r.json?.message ?? r.text }
}

const fakeCount = async (name) => (await http(`${ENV.fakes[name]}/__fake/count`)).json?.calls ?? -1
const fakeRequests = async (name) => (await http(`${ENV.fakes[name]}/__fake/requests`)).json?.requests ?? []
const fakeReset = (name) => http(`${ENV.fakes[name]}/__fake/reset`)
const fakeMode = (name, mode, hangMs) => http(`${ENV.fakes[name]}/__fake/mode`, { method: 'POST', body: JSON.stringify({ mode, hangMs }) })

let db
const sql = async (q, v = []) => (await db.query(q, v)).rows

// ── FIXTURE ───────────────────────────────────────────────────────────────────────────────
//
// A paying client with an AUTHORISED programme and an ATTACHED ICP — the shape the MVP1
// sourcing path requires. Built with SQL rather than through the product, because building it
// through the product would be Batch 2's journeys, not Batch 1's items.
async function makeClient({ ceiling = 100, proofMode = false } = {}) {
  const userId = randomUUID()
  await sql('insert into auth.users(id, email) values ($1, $2)', [userId, `fs-${userId}@example.invalid`])
  const [{ id: clientId }] = await sql(
    `insert into public.clients(user_id, company_name, country, commercial_model)
     values ($1, $2, 'United Kingdom', $3) returning id`,
    [userId, `Fullstack Co ${userId.slice(0, 8)}`, proofMode ? null : 'programme'],
  )
  // The money gate on POST /operator/source: a client who has never paid sources nothing.
  //
  // ⚠️ TWO SCHEMA FACTS THE REAL DATABASE SUPPLIED, one run at a time. `amount` is NOT NULL
  // with no default; and `type` carries a CHECK over twelve values, of which `pack_purchase`
  // — the name I guessed — is not one. `wallet_topup` is in `PURCHASE_TX_TYPES`, so it is a
  // type the gate accepts AND the database allows. No money moves anywhere: this row exists
  // only so `POST /operator/source` does not refuse with its 402.
  await sql(
    `insert into public.credit_transactions(client_id, type, amount) values ($1, 'wallet_topup', 299)`,
    [clientId],
  )

  let programmeId = null
  if (!proofMode) {
    const [{ id }] = await sql(
      `insert into public.programmes(client_id, status, sourcing_ceiling, meeting_target, recommended_volume,
         price_per_meeting_cents, price_total_cents, first_payment_cents, second_payment_cents, first_authorised_at)
       values ($1, 'SOURCING_AUTHORISED', $2, 5, $2, 50000, 250000, 125000, 125000, now()) returning id`,
      [clientId, ceiling],
    )
    programmeId = id
  }
  const [{ id: icpId }] = await sql(
    `insert into public.icps(client_id, name, programme_id, job_titles, industries, geographies,
       seniority_levels, company_sizes)
     values ($1, 'Fullstack ICP', $2, '{"Head of Operations"}', '{"logistics"}', '{"United Kingdom"}', '{}', '{}')
     returning id`,
    [clientId, programmeId],
  )
  return { userId, clientId, programmeId, icpId }
}

const drop = async (userId) => { try { await sql('delete from auth.users where id = $1', [userId]) } catch { /* best effort */ } }

// ══════════════════════════════════════════════════════════════════════════════════════════
// CHECK 0 — the harness is what it claims to be
// ══════════════════════════════════════════════════════════════════════════════════════════
async function check0() {
  const pgrst = ENV.postgrestVersion ?? ''
  if (!/^PostgREST \d/.test(pgrst)) return bad(0, `the database gateway is not real PostgREST: ${pgrst}`)
  // Every provider base URL must point at loopback. One unset variable would mean a real call.
  const bad_urls = Object.entries(ENV.fakes).filter(([, u]) => !u.startsWith('http://127.0.0.1:'))
  if (bad_urls.length) return bad(0, `a fake is not on loopback: ${JSON.stringify(bad_urls)}`)
  // And the database must be the disposable one.
  if (!/127\.0\.0\.1.*kind_test/.test(ENV.db)) return bad(0, `not the disposable database: ${ENV.db}`)
  const gw = await http(`${ENV.gateway}/__gateway/stats`)
  if (gw.status !== 200) return bad(0, `the Supabase gateway is not answering: ${gw.status}`)

  // ══════════════════════════════════════════════════════════════════════════════════════
  // 🛑 THE AUTH WALL — EXACTLY THREE READS EXIST, AND GoTrue'S OWN ENDPOINTS DO NOT
  //
  // Fable's C-8/C-10 ruling authorised three read-only Auth surfaces and nothing else. That
  // boundary is worth no more than the test that holds it: the four endpoints below are the
  // ones that would turn this harness into GoTrue — a login, a signup, a logout and a
  // password recovery — and each must answer 501.
  //
  // ⚠️ 501 IS THE REQUIRED ANSWER, NOT MERELY "NOT 200". A 404 would be ambiguous (a typo
  // looks the same) and forwarding would produce PostgREST's misleading PGRST125. 501 is the
  // gateway saying "this is a GoTrue endpoint I deliberately do not have".
  // ══════════════════════════════════════════════════════════════════════════════════════
  const wall = []
  for (const [p, method] of [['/auth/v1/token?grant_type=password', 'POST'], ['/auth/v1/signup', 'POST'],
                             ['/auth/v1/logout', 'POST'], ['/auth/v1/recover', 'POST']]) {
    const r = await http(`${ENV.gateway}${p}`, { method, body: '{}' })
    if (r.status !== 501) wall.push(`${p} → ${r.status} (want 501)`)
  }
  if (wall.length) return bad(0, `🛑 THE AUTH WALL LEAKS: ${wall.join(', ')} — this harness must not have GoTrue endpoints`)

  // And the three authorised reads must behave: the session read must REFUSE an unsigned token.
  const forged = await http(`${ENV.gateway}/auth/v1/user`, { headers: { authorization: 'Bearer aaa.bbb.ccc' } })
  if (forged.status !== 401) return bad(0, `🛑 GET /auth/v1/user accepted a forged token (HTTP ${forged.status}) — it must verify the signature, not decode it`)
  const noTok = await http(`${ENV.gateway}/auth/v1/user`)
  if (noTok.status !== 401) return bad(0, `GET /auth/v1/user with no token → ${noTok.status}, want 401`)

  ok(0, `${pgrst} behind a path-rewriting gateway · all fakes on loopback · db=${ENV.db.replace(/.*@/, '')} · auth wall: /token /signup /logout /recover all 501, forged+absent session tokens both 401`)
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// CHECK 1 — XC-4 / XC-11 · three services name the commit they are running
// ══════════════════════════════════════════════════════════════════════════════════════════
async function check1() {
  // 🛑 A SECOND DEFECT THIS RUN FOUND, AND IT DISABLES XC-11's WHOLE PURPOSE.
  //
  // `deployed-commit.ts` truncates to `SHORT_SHA_LENGTH = 7`. `git rev-parse --short HEAD` is
  // ADAPTIVE and in this repository returns **8** characters (`abf9d110`). `ship.sh` compares
  // its 8-character `$HEAD` against `/health`'s 7-character answer with `[ "$GOT" = "$HEAD" ]`,
  // so the four-service confirmation can NEVER match — it would print NOT CONFIRMED after
  // every single deploy, for ever, on a perfectly healthy ship.
  //
  // Reported, NOT fixed: changing either the constant or ship.sh's comparison is a product
  // change beyond Batch 1b's permitted one. This check therefore compares against the
  // 7-character truncation — the value the services can actually produce — and records the
  // mismatch as a finding rather than passing over it.
  const full = ENV.commit
  const want = full.slice(0, 7)
  if (full.length !== 7) {
    note(`SHA LENGTH MISMATCH — git rev-parse --short gives ${full.length} chars ("${full}") but /health truncates to SHORT_SHA_LENGTH=7 ("${want}"). ship.sh compares them with [ "$GOT" = "$HEAD" ], so XC-11's four-service confirmation can never succeed in this repository. Found by running the real services; unit tests compare a value against itself and cannot see it.`)
  }
  const seen = {}

  const a = await api('/health')
  seen.api = a.json?.commit ?? `HTTP ${a.status}`
  const p = await portal('/api/health')
  seen.portal = p.json?.commit ?? `HTTP ${p.status}`
  const d = await admin('/api/health')
  seen.admin = d.json?.commit ?? `HTTP ${d.status} ${d.json?.error ?? ''}`.trim()

  const matched = Object.entries(seen).filter(([, v]) => v === want).map(([k]) => k)

  // 🛑 THE DEFECT THIS RUN FOUND, IN MY OWN BATCH 1 WORK.
  if (d.status === 401) {
    note(`ADMIN /api/health RETURNS 401 TO AN UNAUTHENTICATED CALLER — apps/admin/src/middleware.ts:59 treats only /login and /auth* as public, so every /api path is gated. ship.sh reads it with plain curl and no Supabase session, so XC-11's admin identity read can NEVER succeed in production. Found by a real process, not by reading. Reported, NOT fixed: a middleware change is beyond Batch 1b's permitted product change.`)
  }
  if (seen.api !== want || seen.portal !== want) {
    return bad(1, `commit mismatch — want ${want}, got ${JSON.stringify(seen)}`)
  }
  if (d.status === 401) {
    return bad(1, `api and portal report ${want}; ADMIN is unreadable (401 from its own middleware). 2 of 3 — see the finding above`)
  }
  if (matched.length !== 3) return bad(1, `only ${matched.join(', ')} reported ${want}: ${JSON.stringify(seen)}`)
  ok(1, `api, portal and admin all report ${want} (commitSource: ${a.json?.commitSource})`)
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// CHECK 2 — XC-8 / J14-C1 · the six capability stages, at boot, from a real process
// ══════════════════════════════════════════════════════════════════════════════════════════
async function check2() {
  const log = readFileSync(`${ENV.runDir}/api.log`, 'utf8')
  if (!log.includes('GO-LIVE READINESS')) return bad(2, 'the boot log has no GO-LIVE READINESS block')

  const stages = ['PAYMENTS', 'LEAD ENGINE', 'PREPARATION', 'CLIENT SENDING', 'REPLIES', 'MEETINGS']
  const missing = stages.filter((s) => !log.includes(s))
  if (missing.length) return bad(2, `capability stages missing from boot: ${missing.join(', ')}`)

  // 🛑 FD-6: the lead engine must be Apollo, and PDL/Hunter must not be required anywhere.
  if (!/LEAD ENGINE.*Apollo/.test(log)) return bad(2, 'the LEAD ENGINE stage does not name Apollo')
  if (/MISSING:[^\n]*(PDL_API_KEY|HUNTER_API_KEY)/.test(log)) {
    return bad(2, 'a capability still REQUIRES PDL or Hunter — FD-6 says they are not MVP1 providers')
  }
  // The pooled sender must be under PREPARATION (XC-8's finding: it was in neither the
  // register nor the capabilities while being what the automatic sender claim draws from).
  if (!/PREPARATION/.test(log)) return bad(2, 'no PREPARATION stage')

  // And the harness must be visibly redirected — a production process must never print this.
  if (!log.includes('REDIRECTED AWAY FROM PRODUCTION')) {
    return bad(2, 'boot did not announce that providers are redirected — the harness would be indistinguishable from production')
  }
  const leadLine = log.split('\n').find((l) => l.includes('LEAD ENGINE')) ?? ''
  ok(2, `six stages listed · ${leadLine.trim().slice(0, 58)} · redirect announced`)
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// CHECK 3 — XC-3 · ledger truth through admin → API → PostgREST, and 504 ≠ unreachable
// ══════════════════════════════════════════════════════════════════════════════════════════
async function check3() {
  // (a) LEDGER TRUTH, through the whole hop. The admin proxy requires a Supabase session, so
  //     the state read goes API-direct with the operator key — the same route the proxy calls.
  const state = await operator('/operator/migrations/state')
  if (state.status !== 200) return bad(3, `GET /operator/migrations/state → HTTP ${state.status}`)
  const d = state.json?.data
  if (!d) return bad(3, 'the state endpoint returned no data')
  if (d.ok !== true) return bad(3, `the ledger could not be read: ${d.note}`)
  if (!Array.isArray(d.rows) || d.rows.length === 0) return bad(3, 'the ledger returned no rows')
  if (typeof d.counts?.applied !== 'number') return bad(3, 'no counts in the state payload')

  // 🛑 IT MUST BE READ FROM THE DATABASE, NOT REPLAYED. Proven by writing a row directly and
  // seeing the endpoint report it — a replay could not know about it.
  const probeKey = `fullstack_probe_${Date.now()}`
  await sql(
    `insert into public.app_migrations_applied(key, applied_at, last_outcome, last_run_at, run_count)
     values ($1, now(), 'ok', now(), 1)`, [probeKey],
  )
  const again = await operator('/operator/migrations/state')
  const sawProbe = (again.json?.data?.rows ?? []).some((r) => r.key === probeKey)
  await sql('delete from public.app_migrations_applied where key = $1', [probeKey])
  if (!sawProbe) return bad(3, 'the state endpoint did not report a row written directly to the database — it is not reading the ledger')

  // (b) THE ADMIN PROXY'S TIMEOUT. A second admin process is pointed at an upstream that never
  //     answers, so the real proxy code has to hit its own 45s bound. That is the only way to
  //     prove "504 timeout:true" rather than "API unreachable" without editing the bound.
  if (!ENV.adminSlow) {
    note('the 504 sub-case was not run: no second admin instance was booted (FULLSTACK_SLOW_ADMIN=0)')
    return ok(3, `ledger truth read from the database through the stack (${d.counts.applied} applied, ${d.counts.failed} failed) — timeout sub-case skipped`)
  }
  // 🛑 THE REQUEST CARRIES A REAL SESSION COOKIE (Fable C-8, 17 Sep) — AND THE MIDDLEWARE
  //    IS NOT BYPASSED, IT IS SATISFIED.
  //
  // The first version of this sub-case sent no session. `apps/admin/src/app/api/proxy/[...path]`
  // sits behind the admin middleware, which treats only `/login` and `/auth*` as public —
  // correctly, because the proxy injects ADMIN_SECRET_KEY and #308 requires it to verify its
  // caller. So the proxy answered 401 and the 45s bound was never reached; the sub-case was
  // reported NOT-RUN. Fable's ruling was to use the middleware's OWN authentication path
  // rather than weaken it: the harness seeds one allowlisted `auth.users` row, mints a
  // session token for it, and the gateway answers `GET /auth/v1/user` by VERIFYING that
  // token's HS256 signature against the same secret PostgREST validates.
  //
  // ⚠️ THE MIDDLEWARE RUNS IN FULL. `supabase.auth.getUser()` really goes out, the signature
  // is really checked, and the allowlist comparison against ADMIN_ALLOWED_EMAILS really
  // happens. There is no header bypass, no VIDA_DEV_PREVIEW, and no product change.
  // ⚠️ A 401 HERE IS NOW A FAILURE, NOT A NOTE. With a session supplied, 401 means the
  // session mechanism is broken — and a check that shrugged at that would be back to
  // reporting NOT-RUN as though it were fine.
  const slow = await http(`${ENV.adminSlow}/api/proxy/operator/migrations/run`, {
    method: 'POST', body: '{}', headers: { ...HTTPS_FWD, cookie: adminSessionCookie() }, timeoutMs: 70000,
  })

  if (slow.status === 401) {
    return bad(3, `the admin proxy answered 401 WITH a real session cookie (${adminSessionCookie().split('=')[0]}) — `
      + `the middleware did not accept the harness session, so the 45s bound was never reached. `
      + `Check the gateway's GET /auth/v1/user and ADMIN_ALLOWED_EMAILS=${ENV.adminEmail}. `
      + `Body: ${slow.text.slice(0, 160)}`)
  }
  if (slow.status !== 504) return bad(3, `a hanging upstream gave HTTP ${slow.status}, not 504 (body: ${slow.text.slice(0, 120)})`)
  if (slow.json?.timeout !== true) return bad(3, `504 without timeout:true — ${slow.text.slice(0, 120)}`)
  if (/API unreachable/i.test(slow.text)) return bad(3, 'the timeout is still reported as "API unreachable"')
  ok(3, `ledger truth from the database (${d.counts.applied} applied) · hanging upstream → 504 timeout:true in ${Math.round(slow.ms / 1000)}s, never "unreachable"`)
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// CHECK 4 — XC-13 / J12-C0 · one provider, and reserve → execute → settle
// ══════════════════════════════════════════════════════════════════════════════════════════
async function check4() {
  await fakeReset('apollo'); await fakeReset('pdl'); await fakeReset('hunter')
  await fakeMode('apollo', 'success')
  const f = await makeClient({ ceiling: 100 })
  try {
    const r = await operator('/operator/source', { method: 'POST', body: JSON.stringify({ client_id: f.clientId, count: 20, confirm: true }), timeoutMs: 120000 })
    if (r.status !== 200) return bad(4, `POST /operator/source → HTTP ${r.status}: ${r.text.slice(0, 200)}`)

    const apolloCalls = await fakeCount('apollo')
    const pdl = await fakeCount('pdl')
    const hunter = await fakeCount('hunter')
    if (apolloCalls < 1) return bad(4, 'the run reached no provider at all — Apollo was never called')
    if (pdl !== 0 || hunter !== 0) return bad(4, `🛑 FD-6 VIOLATED: pdl=${pdl}, hunter=${hunter} (their keys were SET and their fakes answer 200)`)

    const paths = [...new Set((await fakeRequests('apollo')).map((q) => q.path))]
    const [batch] = await sql(
      `select status, requested, granted, delivered from public.programme_batches where programme_id = $1 order by created_at desc limit 1`,
      [f.programmeId],
    )
    if (!batch) return bad(4, 'no programme_batches row — the reservation never happened')
    if (!['served', 'released'].includes(batch.status)) return bad(4, `the batch did not settle: status=${batch.status}`)
    const [auth] = await sql('select sourcing_ceiling, sourced_used, sourced_reserved from public.programmes where id = $1', [f.programmeId])
    if (auth.sourced_reserved !== 0) return bad(4, `the reservation was not released: reserved=${auth.sourced_reserved}`)
    if (auth.sourced_used + auth.sourced_reserved > auth.sourcing_ceiling) return bad(4, 'authority exceeded the ceiling')

    ok(4, `apollo=${apolloCalls} (${paths.join(', ')}) · PDL=0 HUNTER=0 with keys SET · batch ${batch.status} granted=${batch.granted} delivered=${batch.delivered} · reserved back to 0`)
  } finally { await drop(f.userId) }
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// CHECK 5 — XC-13 / XC-5 · the eight-case Apollo failure matrix
// ══════════════════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════════════════
// THE MATRIX: fake mode → the `icp_run_outcomes.status` it must record → the ONE operator
// task kind it must raise.
//
// ⚠️ THE THIRD COLUMN WAS WRONG FOR THREE CLASSES, AND THE CHECK PASSED ANYWAY — WHICH IS
// THE MORE IMPORTANT HALF OF THIS NOTE. The loop destructured `[mode, wantStatus]` and simply
// never read the third element: the kind was printed in the table and asserted nowhere. So
// `rate_limited → provider_rate_limited` and `timeout|provider_error → provider_down` sat
// here reading like verified expectations while being **names the product does not have**.
// A green check was hiding one of the four facts the contract requires of it ("exactly one
// CORRECTLY-KINDED task"), and an unread expectation is worse than a missing one, because it
// looks like coverage.
//
// 🛑 THE VALUES BELOW ARE TAKEN FROM THE PRODUCT'S OWN DECLARED TABLE — `provider-failure.ts`
// lines 156-209, where each class is declared as `(mode, run status, task kind, severity,
// retryable)` — and NOT from the output of a run. They are written here as INDEPENDENT
// LITERALS rather than imported from it, deliberately: importing the table would assert the
// product against itself and this check would agree with any future edit to it, including a
// wrong one. `provider_unavailable`, `provider_refused` and `provider_credits_exhausted` are
// also the only three provider kinds `operator-tasks.ts` declares (lines 52-54).
// ══════════════════════════════════════════════════════════════════════════════════════════
const MATRIX = [
  // fake mode            icp_run_outcomes.status   the one operator task kind
  ['unauthorised',      'failed',           'provider_refused'],
  ['payment_required',  'quota_exhausted',  'provider_credits_exhausted'],
  ['credits_exhausted', 'quota_exhausted',  'provider_credits_exhausted'],
  ['malformed_request', 'failed',           'provider_refused'],
  ['rate_limited',      'failed',           'provider_unavailable'],
  ['provider_error',    'failed',           'provider_unavailable'],
  ['timeout',           'failed',           'provider_unavailable'],
  ['malformed_body',    'failed',           'provider_refused'],
]

async function check5() {
  const rows = []
  for (const [mode, wantStatus, wantKind] of MATRIX) {
    await fakeReset('apollo'); await fakeReset('pdl'); await fakeReset('hunter')
    // A short hang, so the 8-case matrix does not take 16 minutes; the product's own bound is
    // what aborts it, and check 7 proves the real bound separately.
    await fakeMode('apollo', mode, mode === 'timeout' ? 20000 : 0)
    const f = await makeClient({ ceiling: 100 })
    let verdict = { mode, status: null, tasks: null, reserved: null, pdl: null, hunter: null }
    try {
      // ⚠️ THE RESPONSE IS KEPT, BECAUSE DISCARDING IT COST AN HOUR. An earlier version fired
      // and never looked: when every class came back `status=(none)` the table said only that
      // nothing had been recorded, which reads as eight product defects and was in fact one
      // refusal at the door. A check that throws away the answer it was given cannot tell
      // "the run failed correctly" from "the run never started".
      const res = await operator('/operator/source', { method: 'POST', body: JSON.stringify({ client_id: f.clientId, count: 20, confirm: true }), timeoutMs: 180000 })

      const outcomes = await sql('select status from public.icp_run_outcomes where client_id = $1 order by created_at desc limit 1', [f.clientId])
      const [authority] = await sql('select sourced_reserved from public.programmes where id = $1', [f.programmeId])
      const tasks = await sql(`select kind, status from public.operator_tasks where client_id = $1 and status = 'open'`, [f.clientId])

      verdict = {
        mode,
        status: outcomes[0]?.status ?? '(none)',
        tasks: tasks.length,
        kinds: [...new Set(tasks.map((t) => t.kind))],
        reserved: authority?.sourced_reserved,
        pdl: await fakeCount('pdl'),
        hunter: await fakeCount('hunter'),
      }
      const problems = []
      // A run that never started is a HARNESS fault, and it must say so instead of being
      // counted as eight wrong outcomes.
      if (verdict.status === '(none)') {
        problems.push(`no icp_run_outcomes row at all — POST /operator/source answered HTTP ${res.status}: ${String(res.text).slice(0, 160)}`)
      }
      if (verdict.status !== wantStatus) problems.push(`status=${verdict.status} want=${wantStatus}`)
      if (verdict.status === 'no_match') problems.push('🛑 recorded as no_match — a failure was reported as an empty market')
      if (verdict.reserved !== 0) problems.push(`reservation NOT released (reserved=${verdict.reserved})`)
      if (verdict.tasks !== 1) problems.push(`${verdict.tasks} open tasks, want exactly 1`)
      // ⚠️ THE KIND, NOT JUST THE COUNT. "One task was raised" and "the right person was told
      // the right thing" are different facts: a credits-exhausted class that raises
      // `provider_unavailable` sends somebody to check whether Apollo is down instead of to
      // top up the account. The contract's wording is "exactly one CORRECTLY-KINDED task".
      else if (verdict.kinds[0] !== wantKind) problems.push(`task kind=${verdict.kinds[0]} want=${wantKind}`)
      if (verdict.pdl !== 0 || verdict.hunter !== 0) problems.push(`🛑 PDL=${verdict.pdl} HUNTER=${verdict.hunter}`)
      rows.push({ ...verdict, problems })
    } finally { await drop(f.userId) }
  }
  await fakeMode('apollo', 'success')

  console.log('')
  console.log('      ── APOLLO FAILURE MATRIX ' + '─'.repeat(54))
  console.log('      mode               run status        tasks  kind                         reserved  PDL  HUN')
  for (const r of rows) {
    console.log(`      ${String(r.mode).padEnd(18)} ${String(r.status).padEnd(17)} ${String(r.tasks).padEnd(6)} ${String((r.kinds ?? []).join(',')).padEnd(28)} ${String(r.reserved).padEnd(9)} ${String(r.pdl).padEnd(4)} ${r.hunter}`)
  }
  console.log('')

  const failed = rows.filter((r) => r.problems.length)
  if (failed.length) return bad(5, `${failed.length}/8 classes wrong — ${failed.map((r) => `${r.mode}: ${r.problems.join('; ')}`).join(' | ')}`)
  ok(5, `all 8 failure classes: reservation released, icp_run_outcomes correct, exactly one task each OF THE RIGHT KIND, PDL=0 HUNTER=0 throughout`)
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// CHECK 6 — J5-C9 · the free-Proof fence counts RECORDS
// ══════════════════════════════════════════════════════════════════════════════════════════
async function check6() {
  // ══════════════════════════════════════════════════════════════════════════════════════
  // 🛑 THE FENCE MUST BE PRESENT, AND ITS ABSENCE IS A NAMED FAILURE — NOT A STACK TRACE
  //    AND NEVER A SKIP (Fable C-12, 17 Sep).
  //
  // This check's first RED was rejected precisely here. The harness had seeded the CURRENT
  // schema behind a PRE-BATCH-1 product, so `try_reserve_proof_records` existed at a commit
  // that does not contain it and the check PASSED — a green light earned entirely by the
  // harness. The schema now comes from the same tree as the product
  // (`REALDB_SCHEMA_TREE`), which means on an older tree this function is genuinely gone.
  //
  // ⚠️ SO IT IS ASKED FOR BY NAME FIRST. Letting the `select` throw would also fail, but it
  // would fail as "threw: ... function does not exist" three frames deep — indistinguishable
  // at a glance from a harness fault, which is the exact ambiguity that produced the invalid
  // RED. A check that cannot establish its fact says which fact and why.
  // ══════════════════════════════════════════════════════════════════════════════════════
  // ⚠️ THE ARTIFACT TO ASK FOR IS THE **RECORDS COLUMN**, NOT THE FUNCTION. My first version of
  // this precondition asked whether `try_reserve_proof_records` existed — and it does at
  // 4357bc7f, created by `20260822_free_proof_acquisition.sql` in its DOLLAR-based form. (That
  // pre-existence is the same fact check 10 exploits: J5-C9's migration is a `CREATE OR
  // REPLACE`, which is why a deliberate return-type conflict makes it fail.) So the
  // precondition passed and the check then threw on the missing column three frames deep.
  // What makes the fence a RECORDS fence is `money_settings.proof_monthly_cap_records`, so
  // that is what is asked for by name.
  const missing = []
  for (const t of ['money_settings', 'proof_ledger']) {
    const [{ c }] = await sql(`select count(*)::int as c from information_schema.tables where table_schema='public' and table_name=$1`, [t])
    if (c === 0) missing.push(`table public.${t}`)
  }
  if (!missing.length) {
    const [{ col }] = await sql(`select count(*)::int as col from information_schema.columns
                                 where table_schema='public' and table_name='money_settings' and column_name='proof_monthly_cap_records'`)
    if (col === 0) missing.push('column public.money_settings.proof_monthly_cap_records (the RECORDS unit — the fence here is still dollar-based)')
  }
  if (missing.length) {
    return bad(6, `THE RECORD FENCE IS NOT IN THIS SCHEMA — absent: ${missing.join(', ')}. `
      + `This is the correct verdict for a tree without J5-C9's proof-fence migration; the fence cannot be `
      + `proved against a schema that does not contain it.`)
  }

  await sql(`insert into public.money_settings(id) values (1) on conflict (id) do nothing`)
  await sql(`update public.money_settings set proof_monthly_cap_records = 25 where id = 1`)
  await sql('delete from public.proof_ledger')
  const a = await makeClient({ proofMode: true })
  const b = await makeClient({ proofMode: true })
  try {
    const r1 = await sql('select try_reserve_proof_records($1::uuid, 20) as out', [a.clientId])
    const g1 = r1[0].out
    if (g1.granted !== 20 || g1.reason !== 'GRANTED') return bad(6, `first reservation: ${JSON.stringify(g1)}`)

    // 🛑 THE FENCE MUST BIND IN RECORDS. Under FD-6 an Apollo record costs $0, so a dollar
    // fence divides an untouched budget by a rate that buys nothing and never refuses.
    const booked = await sql('select records, cost_usd::text as cost_usd from public.proof_ledger where client_id = $1', [a.clientId])
    // ⚠️ NO ROW IS ITS OWN VERDICT, NOT A TypeError. A fence that grants without booking
    // leaves `proof_ledger` empty, and destructuring that threw three frames deep — the same
    // "is this the product or the harness?" ambiguity that produced the invalid check-6 RED.
    // This is the exact shape the GOOD→BAD→RESTORED teeth proof puts the check into.
    if (booked.length === 0) {
      return bad(6, `the reservation reported GRANTED but booked NO proof_ledger row — entitlement was handed out `
        + `without being recorded, so the monthly fence has nothing to count and cannot ever bind.`)
    }
    const { records, cost_usd } = booked[0]
    if (records !== 20) return bad(6, `the ledger booked ${records} records, not 20`)
    if (Number(cost_usd) !== 0) return bad(6, `🛑 a PDL rate was booked: cost_usd=${cost_usd}`)

    const r2 = await sql('select try_reserve_proof_records($1::uuid, 20) as out', [b.clientId])
    if (r2[0].out.granted !== 5) return bad(6, `the ceiling did not clamp the second prospect: ${JSON.stringify(r2[0].out)}`)
    const c = await makeClient({ proofMode: true })
    const r3 = await sql('select try_reserve_proof_records($1::uuid, 5) as out', [c.clientId])
    await drop(c.userId)
    if (r3[0].out.reason !== 'MONTHLY_PROOF_BUDGET_REACHED') return bad(6, `at the ceiling the reason was ${r3[0].out.reason}`)
    ok(6, `records booked at cost_usd=0 · the 25-record ceiling clamped 20→5 then refused with MONTHLY_PROOF_BUDGET_REACHED`)
  } finally { await drop(a.userId); await drop(b.userId); await sql(`update public.money_settings set proof_monthly_cap_records = 1071 where id = 1`) }
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// CHECK 7 — J5-C14 · a hanging Apollo request terminates at the shared timeout
// ══════════════════════════════════════════════════════════════════════════════════════════
async function check7() {
  const { APOLLO_REQUEST_TIMEOUT_MS, PROOF_WAIT_MS } = await import('@kind/shared')
  await fakeReset('apollo')
  // Hang for far longer than the product's own bound, so only the product can end it.
  await fakeMode('apollo', 'hang', APOLLO_REQUEST_TIMEOUT_MS * 6)
  const f = await makeClient({ ceiling: 100 })
  const started = Date.now()
  try {
    await operator('/operator/source', { method: 'POST', body: JSON.stringify({ client_id: f.clientId, count: 20, confirm: true }), timeoutMs: PROOF_WAIT_MS + 60000 })
    const elapsed = Date.now() - started
    const calls = await fakeCount('apollo')
    if (calls < 1) return bad(7, 'Apollo was never called, so nothing was bounded')
    // 🛑 THE POINT: the product ABANDONED the call. Before J5-C14 `searchPeople` had no
    // timeout and Node's fetch has no default, so this would have run until something else
    // gave up — the "started and never came back" state XC-6's detector exists to find.
    if (elapsed > PROOF_WAIT_MS) return bad(7, `the run took ${Math.round(elapsed / 1000)}s, past the ${PROOF_WAIT_MS / 1000}s desk bound`)
    const perCall = elapsed / calls
    if (perCall > APOLLO_REQUEST_TIMEOUT_MS * 2.5) return bad(7, `~${Math.round(perCall / 1000)}s per hung call against a ${APOLLO_REQUEST_TIMEOUT_MS / 1000}s timeout`)
    ok(7, `${calls} hung Apollo call(s) abandoned; whole run ${Math.round(elapsed / 1000)}s ≤ the ${PROOF_WAIT_MS / 1000}s desk bound (~${Math.round(perCall / 1000)}s per call vs a ${APOLLO_REQUEST_TIMEOUT_MS / 1000}s timeout)`)
  } finally { await drop(f.userId); await fakeMode('apollo', 'success') }
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// CHECK 8 — XC-6 / XC-5 · overdue automatic work becomes stuck, once
// ══════════════════════════════════════════════════════════════════════════════════════════
async function check8() {
  const f = await makeClient({ ceiling: 50 })
  try {
    const subject = randomUUID()
    await sql(
      `insert into public.automatic_work(kind, subject_kind, subject_id, client_id, state, bound_seconds, requested_at, started_at)
       values ('proof_run', 'client', $1, $2, 'started', 60, now() - interval '2 hours', now() - interval '2 hours')`,
      [subject, f.clientId],
    )
    const before = await sql(`select count(*)::int as n from public.operator_tasks where status = 'open'`)

    const r1 = await operator('/operator/automatic-work/detect', { method: 'POST', body: '{}', timeoutMs: 60000 })
    if (r1.status === 404) {
      // No HTTP entry point for the detector: it is a cron job. Invoke it the way the cron
      // does, in the API's own process, through the built artifact.
      note('no POST /operator/automatic-work/detect route — the detector was invoked through its module instead of over HTTP (it is a cron job, and RUN_CRONS=false here)')
      const { detectOverdueAutomaticWork } = await import(`${ENV.tree}/apps/api/dist/lib/automatic-work.js`)
      await detectOverdueAutomaticWork({ nowMs: Date.now() })
      await detectOverdueAutomaticWork({ nowMs: Date.now() })
    } else if (r1.status !== 200) {
      return bad(8, `the detector endpoint answered HTTP ${r1.status}`)
    } else {
      await operator('/operator/automatic-work/detect', { method: 'POST', body: '{}', timeoutMs: 60000 })
    }

    const [{ state, detected_task_id }] = await sql('select state, detected_task_id from public.automatic_work where subject_id = $1', [subject])
    if (state !== 'stuck') return bad(8, `the row is still '${state}', not 'stuck'`)
    const after = await sql(`select count(*)::int as n from public.operator_tasks where status = 'open'`)
    const created = after[0].n - before[0].n
    if (created !== 1) return bad(8, `the detector created ${created} open tasks across TWO runs — want exactly 1`)
    if (!detected_task_id) return bad(8, 'the row was marked stuck but carries no detected_task_id')
    ok(8, `overdue 'started' → 'stuck', exactly 1 task across two detector runs (no duplicate), task id recorded on the row`)
  } finally { await drop(f.userId) }
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// CHECK 9 — XC-5 · alert classes become operator tasks; resolving needs a note
// ══════════════════════════════════════════════════════════════════════════════════════════
async function check9() {
  const { ALERT_KINDS } = await import(`${ENV.tree}/apps/api/dist/lib/alerts.js`)
  const { sendFounderAlert } = await import(`${ENV.tree}/apps/api/dist/lib/alerts.js`)
  const kinds = Array.isArray(ALERT_KINDS) ? ALERT_KINDS : Object.keys(ALERT_KINDS ?? {})
  if (!kinds.length) return bad(9, 'ALERT_KINDS is empty — nothing to fire')

  // ══════════════════════════════════════════════════════════════════════════════════════
  // 🛑 THE DEDUPE SPACE IS CLEARED FIRST, AND THAT IS NOT TIDYING — IT IS THE DIFFERENCE
  //    BETWEEN THIS CHECK MEASURING THE PRODUCT AND MEASURING CHECK ORDER.
  //
  // `raiseOperatorTask` is idempotent per `(kind, dedupeKey)` *while the previous task is
  // still open*, and `alerts.ts` deduped classes globally (`alert:<kind>:…`). So a class that
  // already has an open task does NOT get a second one — correct behaviour, and exactly what
  // an operator queue should do.
  //
  // ⚠️ IT COST A RUN TO LEARN. Once checks 4/5/7 began reaching Apollo for real, `apollo.ts`
  // fired its own `source_down` alert during sourcing. Check 9 then fired all ten classes and
  // found nine marker-titled tasks: `source_down` had correctly deduped onto the task the
  // sourcing run had already raised, whose title carries no marker. The check reported
  // "NO TASK FOR: source_down" — a false defect report about the one class that had behaved
  // best. Clearing the OPEN alert-derived tasks first makes every class start from the same
  // state, so "one class, one task" is a fact about the product and not about what ran before.
  // ══════════════════════════════════════════════════════════════════════════════════════
  const cleared = await sql(
    `delete from public.operator_tasks where dedupe_key like 'alert:%' and status = 'open' returning kind`,
  )

  const marker = `fullstack-${Date.now()}`
  for (const kind of kinds) {
    await sendFounderAlert(kind, `${marker} ${kind}`, ['fullstack check 9'])
  }
  const tasks = await sql(`select kind, title, status, id from public.operator_tasks where title like $1`, [`%${marker}%`])
  if (tasks.length < kinds.length) {
    // ⚠️ NAME THE CLASS, NEVER JUST THE COUNT. "9 of 10" sends somebody hunting; "new_signup
    // produced no task" is a defect report. The first run of this check printed the count and
    // that was not good enough to act on.
    const got = new Set(tasks.map((t) => String(t.title).replace(`${marker} `, '')))
    const missing = kinds.filter((k) => !got.has(k))
    return bad(9, `${kinds.length} alert classes fired, ${tasks.length} tasks exist — NO TASK FOR: ${missing.join(', ')} (an email is not a queue)`)
  }

  // Vida's endpoint must LIST them.
  const listed = await operator('/operator/tasks')
  if (listed.status !== 200) return bad(9, `GET /operator/tasks → HTTP ${listed.status}`)
  const body = listed.json?.data ?? listed.json
  const rows = body?.tasks ?? body?.rows ?? (Array.isArray(body) ? body : [])
  const seen = rows.filter((t) => String(t.title ?? '').includes(marker)).length
  if (seen < 1) return bad(9, `the tasks endpoint listed none of the ${tasks.length} new tasks`)

  // Resolving REQUIRES a note.
  const target = tasks[0]
  const noNote = await operator(`/operator/tasks/${target.id}/resolve`, { method: 'POST', body: JSON.stringify({}) })
  if (noNote.status === 200) return bad(9, 'a task was resolved with NO note — the audit record would say nothing')
  const withNote = await operator(`/operator/tasks/${target.id}/resolve`, { method: 'POST', body: JSON.stringify({ note: 'resolved by the fullstack check' }) })
  if (withNote.status !== 200) return bad(9, `resolving WITH a note → HTTP ${withNote.status}: ${withNote.text.slice(0, 140)}`)

  await sql(`delete from public.operator_tasks where title like $1`, [`%${marker}%`])

  // ══════════════════════════════════════════════════════════════════════════════════════
  // C-9 · THE ABSENCE CODE THE PRODUCT ACTUALLY RECEIVES — PGRST205, NOT 42P01
  //
  // ── WHY THIS CANNOT BE A UNIT TEST ────────────────────────────────────────────────────
  //
  // Batch 1 gave these paths loud absent-table tolerance keyed on PostgreSQL's `42P01`, and
  // it was green. But the product reads tables through PostgREST, which resolves the name
  // against its own SCHEMA CACHE before any SQL is planned and answers its own code —
  // `PGRST205`. So the tolerance could not fire on the seam it was written for. No mock could
  // show that: a mock returns whatever code the test author believed in. Only a real
  // PostgREST, with a real missing table, produces the real code.
  //
  // ⚠️ THE RELOAD IS THE LOAD-BEARING STEP, and it is what distinguishes the two codes.
  // Renaming the table alone leaves it in PostgREST's cache, so the query IS planned and
  // PostgreSQL answers `42P01`. After `NOTIFY pgrst, 'reload schema'` the table is gone from
  // the cache and PostgREST answers `PGRST205` without touching the database. Both are
  // absence and `isRelationAbsent` accepts both — which is exactly why both are asserted
  // here rather than one being assumed.
  //
  // 🛑 RESTORED IN A `finally`. A harness that left `operator_tasks` renamed would poison
  // every later check in the run, and the failure would look like a product defect.
  // ══════════════════════════════════════════════════════════════════════════════════════
  let absence = ''
  try {
    await sql('alter table public.operator_tasks rename to operator_tasks_c9_hidden')

    // PHASE 1 — cache still warm: PostgreSQL plans the query and refuses it.
    const stale = await pgrstError('operator_tasks')
    // PHASE 2 — cache reloaded: PostgREST refuses it itself, without planning anything.
    await sql(`notify pgrst, 'reload schema'`)
    await new Promise((r) => setTimeout(r, 1500))
    const fresh = await pgrstError('operator_tasks')

    if (fresh.code !== 'PGRST205') {
      return bad(9, `a missing table through real PostgREST gave code ${fresh.code || '(none)'} `
        + `("${String(fresh.message).slice(0, 90)}"), not PGRST205 — the premise of C-9 does not hold on this binary`)
    }

    // …and now the PRODUCT, through its own endpoint, on that same absent table.
    const loud = await operator('/operator/tasks')
    if (loud.status === 200) {
      return bad(9, `🛑 GET /operator/tasks answered 200 with the table ABSENT — `
        + `${JSON.stringify(loud.json?.data?.tasks ?? []).slice(0, 60)}. An unreadable queue was reported as a calm one, `
        + `which is the exact defect XC-5's tolerance exists to prevent.`)
    }
    if (loud.json?.table_missing !== true) {
      return bad(9, `the queue read failed but did not report table_missing (HTTP ${loud.status}): ${loud.text.slice(0, 160)}`)
    }
    if (!/NOT an empty queue/i.test(loud.text)) {
      return bad(9, `the absence message no longer says it is NOT an empty queue: ${loud.text.slice(0, 160)}`)
    }
    absence = ` · C-9: real PostgREST gave ${stale.code || '(no code)'} with a warm cache and PGRST205 after reload; `
      + `/operator/tasks answered HTTP ${loud.status} table_missing=true, never an empty queue`
  } finally {
    await sql('alter table if exists public.operator_tasks_c9_hidden rename to operator_tasks').catch(() => {})
    await sql(`notify pgrst, 'reload schema'`).catch(() => {})
    await new Promise((r) => setTimeout(r, 1500))
  }

  ok(9, `${kinds.length} alert classes → ${tasks.length} persisted tasks · listed by /operator/tasks · resolve refused without a note (HTTP ${noNote.status}), accepted with one`
    + absence
    + (cleared.length ? ` · ${cleared.length} already-open alert task(s) cleared first, incl. the source_down one the live sourcing raised — dedupe is working, see the note in this check` : ''))
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// CHECK 10 — XC-3 / XC-11 · the runner records every outcome, failures included
// ══════════════════════════════════════════════════════════════════════════════════════════
async function check10() {
  // 🛑 A DELIBERATELY FAILING KEY, made to fail for a REAL reason. `try_reserve_proof_records`
  // is pre-created with a different return type, so J5-C9's `CREATE OR REPLACE` cannot
  // succeed (42P13 "cannot change return type of existing function"). Nothing is mocked: the
  // migration genuinely fails against the database.
  const FAILING_KEY = '20260917_proof_fence_in_records'
  await sql('drop function if exists public.try_reserve_proof_records(uuid, int)')
  await sql('create function public.try_reserve_proof_records(uuid, int) returns int language sql as $$ select 0 $$')

  const run = await operator('/operator/migrations/run', { method: 'POST', body: '{}', timeoutMs: 600000 })
  if (run.status !== 200) {
    note(`POST /operator/migrations/run → HTTP ${run.status}: ${run.text.slice(0, 200)}`)
  }

  const state = await operator('/operator/migrations/state')
  const rows = state.json?.data?.rows ?? []
  const known = rows.filter((r) => r.known)
  const failedRow = rows.find((r) => r.key === FAILING_KEY)

  const unknownState = known.filter((r) => r.state === 'unknown').length
  const problems = []
  if (!rows.length) problems.push('the ledger reported no rows')
  if (unknownState > 0) problems.push(`${unknownState} keys still 'unknown' after a run — outcomes were not recorded`)
  if (!failedRow) problems.push(`${FAILING_KEY} is not in the ledger at all`)
  else if (failedRow.state !== 'failed') problems.push(`the deliberately broken migration reports '${failedRow.state}', NOT 'failed' — a failure presented as success`)
  else if (!failedRow.lastError) problems.push('it is marked failed but carries no error text')

  // Restore the real function so later checks and the real-DB suite are unaffected.
  await sql('drop function if exists public.try_reserve_proof_records(uuid, int)')
  const sqlText = readFileSync(`${ENV.tree}/supabase/migrations/20260917_proof_fence_in_records.sql`, 'utf8')
  await db.query(sqlText)

  if (problems.length) return bad(10, problems.join(' | '))
  ok(10, `${known.length} runner keys all recorded (0 unknown) · the deliberately broken ${FAILING_KEY} reports state=failed with "${String(failedRow.lastError).slice(0, 60)}…"`)
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// RUN
// ══════════════════════════════════════════════════════════════════════════════════════════
const CHECKS = [check0, check1, check2, check3, check4, check5, check6, check7, check8, check9, check10]

// `FULLSTACK_ONLY=5` / `FULLSTACK_ONLY=0,5,7` runs a subset against an already-`up` stack.
// ⚠️ FOR ITERATING AND FOR PROVING A CHECK'S TEETH, NEVER FOR A REPORTED RUN — a subset cannot
// establish the cumulative claim, so the summary below says loudly when one was used.
const ONLY = (process.env.FULLSTACK_ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const SELECTED = ONLY.length ? ONLY.map(Number).map((n) => CHECKS[n]).filter(Boolean) : CHECKS
if (ONLY.length) console.log(`\n   ⚠️  FULLSTACK_ONLY=${ONLY.join(',')} — A SUBSET. This is not a cumulative run.\n`)

db = new Client({ connectionString: ENV.db })
await db.connect()

for (const c of SELECTED) {
  try { await c() } catch (err) { bad(CHECKS.indexOf(c), `threw: ${err instanceof Error ? err.stack?.split('\n').slice(0, 3).join(' | ') : String(err)}`) }
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// P6 §8.2 — THE JOURNEYS AND FAILURE CLASSES BATCH 1b DID NOT COVER
//
// ⚠️ THEY RUN AFTER, AND AGAINST THE SAME STACK. Batch 1b's eleven checks are the regression
// half of this run and are not re-implemented: the contract asks for the complete set, not a
// replacement for the set that already works.
// ══════════════════════════════════════════════════════════════════════════════════════════

/** A Supabase-shaped session for a user the check created — see `jwtSecret` in env.json. */
function mintJwt(sub, email) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const header = b64({ alg: 'HS256', typ: 'JWT' })
  const payload = b64({ role: 'authenticated', iss: 'kind-fullstack-harness', iat: now, exp: now + 86400, sub, aud: 'authenticated', email })
  const sig = createHmac('sha256', ENV.jwtSecret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

/**
 * Put the ARMED API back after F-RESTART kills it.
 *
 * 🛑 A CHECK THAT LEAVES A PROCESS DEAD TURNS ITS OWN EVIDENCE INTO EVERY LATER CHECK'S
 * FAILURE. F-RESTART's whole method is SIGKILL, so it owes the stack a live process
 * afterwards — and restarting it here, from the same environment `cmd_checks` exported, is
 * the same artifact with the same variables the harness booted.
 */
async function restartArmedApi() {
  const port = new URL(ENV.apiArmed).port
  const child = spawn('node', ['dist/index.js'], {
    cwd: `${ENV.tree}/apps/api`,
    env: { ...process.env, PORT: port, AUTO_OUTREACH_ENABLED: 'true' },
    detached: true, stdio: 'ignore',
  })
  child.unref()
  writeFileSync(`${ENV.runDir}/api-armed.pid`, String(child.pid))
  for (let i = 0; i < 60; i++) {
    const r = await http(`${ENV.apiArmed}/health`, { timeoutMs: 2000 })
    if (r.status === 200) return true
    await new Promise(r2 => setTimeout(r2, 1000))
  }
  throw new Error('the armed API did not come back after F-RESTART killed it')
}

/**
 * Deliver a signed `checkout.session.completed` to the real Stripe webhook route.
 *
 * ⚠️ SIGNED THE WAY STRIPE SIGNS. The route verifies `t=…,v1=…` over `${t}.${body}` with the
 * webhook secret; an unsigned post is refused with 400, exactly as in production. Nothing
 * here reaches Stripe — the product's Stripe base URL is a loopback fake.
 */
async function stripeCheckout(metadata, { eventId = `evt_${randomUUID()}` } = {}) {
  const body = JSON.stringify({
    id: eventId, type: 'checkout.session.completed',
    data: { object: { id: `cs_${eventId}`, metadata } },
  })
  const t = Math.floor(Date.now() / 1000)
  const v1 = createHmac('sha256', ENV.secrets.stripeWebhook).update(`${t}.${body}`).digest('hex')
  return http(`${ENV.api}/stripe/webhook`, {
    method: 'POST', body,
    headers: { 'stripe-signature': `t=${t},v1=${v1}`, 'content-type': 'application/json' },
    timeoutMs: 60000,
  })
}

const KIT = {
  ENV, http, api, operator, portal, admin, sql, ok, bad, note,
  fakeCount, fakeRequests, fakeReset, fakeMode, makeClient, mintJwt, restartArmedApi, stripeCheckout,
}

// ⚠️ THE JOURNEYS RUN FIRST AND IN ORDER. They are a single walk — one client carried from
// signup to completion — so each one's precondition is the step before it, and running them
// out of order would prove only that a fixture can be built.
const WALK = ONLY.length ? { checks: [] } : makeJourneyChecks(KIT)
const EXTRA = ONLY.length ? [] : [...WALK.checks, ...makeFailureChecks(KIT)]
if (ONLY.length) console.log('   ⚠️  FULLSTACK_ONLY is set — the §8.2 journey and failure-class checks are SKIPPED, so coverage cannot be established.')

for (const c of EXTRA) {
  try { await c.fn() } catch (err) {
    bad(c.id, `threw: ${err instanceof Error ? (err.stack?.split('\n').slice(0, 3).join(' | ')) : String(err)}`)
  }
}

// ── THE ZERO-CALL PROOF ───────────────────────────────────────────────────────────────────
const PDL_CALLS = await fakeCount('pdl')
const HUNTER_CALLS = await fakeCount('hunter')
const gwStats = (await http(`${ENV.gateway}/__gateway/stats`)).json ?? {}

await db.end()

console.log('')
console.log('══════════════════ BATCH 1b FULL-STACK RESULT ══════════════════')
console.log(`tree            ${ENV.tree}`)
console.log(`commit          ${ENV.commit}`)
console.log(`postgrest       ${ENV.postgrestVersion}`)
console.log(`db requests     ${gwStats.forwarded ?? '?'} forwarded through the gateway to PostgREST`)
console.log('')
for (const r of results) console.log(`  ${r.pass ? '✅' : '❌'} CHECK ${r.n}`)
console.log('')
console.log(`PDL_CALLS=${PDL_CALLS}`)
console.log(`HUNTER_CALLS=${HUNTER_CALLS}`)
console.log('   (both keys were SET for the entire run and both fakes answer 200 — a regression')
console.log('    of FD-6 would SUCCEED here and only these counters would notice)')

if (findings.length) {
  console.log('')
  console.log('── FINDINGS (reported, not fixed) ────────────────────────────────')
  for (const f of findings) console.log(`  ⚠️ ${f}`)
}

// ── §8.2 COVERAGE — THE 26 JOURNEYS AND THE 14 FAILURE CLASSES ───────────────────────────
//
// 🛑 THE TABLE IS A GATE, NOT A REPORT. Every row resolves against the checks that actually
// ran and passed in THIS process, so a journey whose check was deleted, renamed or skipped is
// an UNPROVEN row and fails the run. A printed table nobody enforces is how a certification
// becomes a decoration.
if (WALK.W && WALK.W.seeded && WALK.W.seeded.length) {
  console.log('')
  console.log('── THE WALK\'S SEEDED PRECONDITIONS (disclosed, not hidden) ──────────────')
  for (const s2 of WALK.W.seeded) console.log(`  · ${s2}`)
}

const coverage = assessCoverage(results)
printCoverage(coverage)

const failed = results.filter((r) => !r.pass)
const zeroCallOk = PDL_CALLS === 0 && HUNTER_CALLS === 0
const unproven = [...coverage.journeys.filter(j => !j.proven).map(j => `journey ${j.n}`),
                  ...coverage.classes.filter(c => !c.proven).map(c => c.id)]
console.log('')
if (failed.length === 0 && zeroCallOk && coverage.allProven) {
  console.log(`✅ ALL ${results.length} CHECKS PASSED · 26/26 JOURNEYS · 14/14 FAILURE CLASSES · PDL_CALLS=0 · HUNTER_CALLS=0`)
  process.exit(0)
}
if (failed.length) console.log(`🛑 ${failed.length} CHECK(S) FAILED: ${failed.map((r) => r.n).join(', ')}`)
if (!zeroCallOk) console.log(`🛑 ZERO-CALL PROOF BROKEN: PDL=${PDL_CALLS} HUNTER=${HUNTER_CALLS}`)
if (unproven.length) console.log(`🛑 ${unproven.length} §8.2 ROW(S) UNPROVEN: ${unproven.join(', ')}`)
process.exit(1)
