// ══════════════════════════════════════════════════════════════════════════════════════════
// BATCH 1b · THE SUPABASE GATEWAY — A PATH REWRITE, AND NOTHING ELSE
//
// 🛑 READ THIS BEFORE CONCLUDING ANYTHING ABOUT WHAT IT IS. This is **not** a PostgREST
// substitute. Fable's P1 ruling forbids one, and there is none here. Real PostgREST 13.0.4
// executes every query, every filter, every RPC, every error code. This file moves 8 bytes.
//
// ── WHY IT IS NEEDED AT ALL ─────────────────────────────────────────────────────────────
//
// `supabase-js` addresses tables at `/rest/v1/<table>`. PostgREST serves them at `/<table>`
// and has **no base-path option** — verified against the binary: `postgrest --dump-config`
// lists `db-root-spec` and `db-extra-search-path`, and nothing that mounts the API under a
// prefix. Production Supabase resolves this the same way, with Kong in front performing
// exactly this rewrite. Without it every request returns PGRST125 "Invalid path specified in
// request URL", which is what the first spike did.
//
// ── WHAT IT MAY AND MAY NOT DO ──────────────────────────────────────────────────────────
//
// MAY: strip a leading `/rest/v1`, forward verbatim, stream the response back verbatim — and
// answer exactly THREE non-PostgREST platform READS — `GET /auth/v1/admin/users`,
// `GET /auth/v1/admin/users/<id>` and `GET /auth/v1/user` — each documented and justified in
// its own block below, and each authorised by Fable's C-8/C-10 ruling of 17 Sep.
//
// MUST NOT: read a body, parse SQL, rewrite a query string, translate an error, cache, or
// answer anything in PostgREST's domain — no table, no view, no RPC, no filter. If a future
// edit makes this file understand a PostgREST concept, it has become the shim Fable ruled out
// and the run's evidence is no longer about PostgREST.
//
// ⚠️ THE LINE BETWEEN THE TWO IS THE POINT. `/rest/v1/*` is PostgREST's job and is forwarded
// untouched; `/auth/v1/admin/users*` is the Auth service's job and PostgREST cannot serve it at
// all. Answering the second does not make this a substitute for the first.
//
// ⚠️ IT ALSO COUNTS. Every forwarded request is recorded, so a check can ask "did this run
// touch the database at all?" — and so the run can show its own request volume rather than
// asserting it. `/__gateway/stats` is harness-only and lives under a path `supabase-js`
// cannot generate.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { createServer, request as httpRequest } from 'node:http'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { Client } from 'pg'

const UPSTREAM_PORT = Number(process.env.GATEWAY_UPSTREAM_PORT || 58599)
const PORT = Number(process.env.GATEWAY_PORT || 58598)
const PREFIX = '/rest/v1'
const DB_URL = process.env.GATEWAY_DB_URL || ''
/** The SAME secret PostgREST was started with — see `verifyBearer`. */
const JWT_SECRET = process.env.GATEWAY_JWT_SECRET || ''

let forwarded = 0
let authListings = 0
let authGets = 0
let authUserReads = 0
const byPath = new Map()
const AUTH_USERS = '/auth/v1/admin/users'
/** `<collection>/<uuid>`, and nothing else — a stricter test than "starts with". */
const AUTH_USER_BY_ID = new RegExp(`^${AUTH_USERS}/([0-9a-fA-F-]{36})/?(?:\\?.*)?$`)
const AUTH_USER = '/auth/v1/user'

// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE TWO ADMIN READS (the session read has its own block further down):
//      GET /auth/v1/admin/users        → `listUsers()`    → { users: [...], aud }
//      GET /auth/v1/admin/users/<id>   → `getUserById()`  → the user object ITSELF
//
// ── WHY, AND WHY THIS IS NOT "ADDING GoTrue" ────────────────────────────────────────────
//
// `runIcpJob` resolves whose work a run is through `audienceForClientStrict`, which asks
// `db.auth.admin.getUserById(user_id)`; `audienceForClient` and the admin revenue surfaces
// ask `resolveHouseUserIds` → `db.auth.admin.listUsers()`. Both are Supabase's **Auth admin
// API**, which PostgREST does not serve — so the requests arrived here, were forwarded
// verbatim, and PostgREST answered PGRST125 "Invalid path specified in request URL".
// `audienceForClientStrict` THROWS on an unresolved identity (deliberately — it fails
// closed), so **the entire MVP1 sourcing path was unreachable**: checks 4, 5 and 7 all died
// on it, which is the heart of XC-13.
//
// What is served here is a READ-ONLY READ of `auth.users`, a table this harness's own
// bootstrap creates and this gateway already fronts. There is no login, no password, no
// token issuance, no session, no refresh, no GoTrue. It is the same category as the
// `/rest/v1` path rewrite above: the harness supplying the PLATFORM surface Supabase
// supplies, so that the PRODUCT logic can run for real rather than be mocked.
//
// ⚠️ IT IS BEYOND BATCH 1b's LITERALLY PERMITTED COMPONENT LIST, and it is reported as such.
// The alternative was to leave the contract's own required checks unobtainable, or to mock
// the audience — which would mean asserting FD-6's provider boundary against a stubbed answer
// to the one question that decides which provider is chosen. Neither is acceptable evidence.
//
// ⚠️ THE TWO SHAPES ARE NOT INTERCHANGEABLE, AND CONFLATING THEM COSTS A WHOLE RUN. A first
// version matched the prefix and answered BOTH with the listing shape. `gotrue-js` passes the
// single-user body straight through as `data.user`, so `getUserById` resolved to
// `{ users: [...], aud }` — an object with no `email` — and the product did exactly what it
// should: it refused to guess an audience and stopped the run ("came back without an email,
// and House is an email"). The harness looked like a product bug for one whole run. The
// LONGER, more specific route is therefore matched FIRST, and the listing route only matches
// the collection path exactly (optionally with a query string).
//
// ⚠️ PAGINATION IS HONOURED on the listing, because the caller loops up to 500 pages and
// breaks on an empty result. Returning everything on every page would spin that loop 500 times.
// ══════════════════════════════════════════════════════════════════════════════════════════
let pg = null
async function db_() {
  if (!pg) { pg = new Client({ connectionString: DB_URL }); await pg.connect() }
  return pg
}
const authUserRow = (r) => ({
  id: r.id, email: r.email, aud: 'authenticated', role: 'authenticated',
  created_at: r.created_at, app_metadata: {}, user_metadata: {}, identities: [],
})
function authFail(res, what, err) {
  // ⚠️ A REAL ERROR, NOT AN EMPTY ANSWER. `resolveHouseUserIds` fails OPEN on an error (it
  // returns an empty set), and an empty set means "no house account" — which would silently
  // classify the House itself as an ordinary client. Better to answer 500 loudly.
  res.writeHead(500, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ msg: `gateway could not ${what}: ${String(err)}` }))
}

/** `listUsers()` — the COLLECTION. Wrapped in `{ users: [...] }` by `gotrue-js`'s contract. */
async function authAdminUsersList(url, res) {
  authListings++
  if (!DB_URL) return authFail(res, 'list auth.users', 'no GATEWAY_DB_URL')
  try {
    const q = new URL(url, 'http://x')
    const page = Math.max(1, Number(q.searchParams.get('page') || '1'))
    const perPage = Math.min(1000, Math.max(1, Number(q.searchParams.get('per_page') || '50')))
    const { rows } = await (await db_()).query(
      `select id::text, email, created_at from auth.users order by created_at, id offset $1 limit $2`,
      [(page - 1) * perPage, perPage],
    )
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ users: rows.map(authUserRow), aud: 'authenticated' }))
  } catch (err) { authFail(res, 'list auth.users', err) }
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE THIRD READ: GET /auth/v1/user — THE SESSION READ, AND IT REALLY VERIFIES
//
// Fable's C-8 ruling (17 Sep) authorised exactly this to prove check 3's admin-proxy 504
// through the REAL middleware without a browser login. `apps/admin/src/middleware.ts` calls
// `supabase.auth.getUser()`, which `@supabase/auth-js` sends as `GET /auth/v1/user` with the
// session's access token as a bearer. Without an answer the middleware sees no user, returns
// 401, and the proxy's 45s bound is never reached — so the timeout half was NOT-RUN.
//
// ⚠️ THE SIGNATURE IS VERIFIED, NOT TRUSTED. A gateway that decoded the payload and believed
// it would be a bypass wearing an endpoint's clothes: any caller could assert any email and
// walk through #308's allowlist. It recomputes HMAC-SHA256 over `header.payload` with the
// SAME secret PostgREST was started with, compares in constant time, and checks `exp`. An
// unsigned, foreign-signed, malformed or expired token is 401 — which is exactly what the
// real product does with one.
//
// ⚠️ IT IS STILL NOT GoTrue, AND THE DIFFERENCE IS NOT COSMETIC. There is no `/token`, no
// `/signup`, no `/logout`, no `/recover`, no password, no refresh, no session storage, no
// cookie minting — the harness hands the token it already minted and this endpoint only
// answers "whose token is this?" from a table it already fronts. Every other `/auth/v1/**`
// path returns 501 below, so the wall is enforced rather than promised.
// ══════════════════════════════════════════════════════════════════════════════════════════
function verifyBearer(req) {
  const raw = String(req.headers.authorization || '')
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim())
  if (!m) return { ok: false, why: 'no bearer token' }
  const parts = m[1].split('.')
  if (parts.length !== 3) return { ok: false, why: 'not a three-part JWT' }
  const [h, p, s] = parts
  if (!JWT_SECRET) return { ok: false, why: 'gateway has no GATEWAY_JWT_SECRET' }

  const expected = createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest('base64url')
  const a = Buffer.from(s), b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, why: 'bad signature' }

  let claims
  try { claims = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')) }
  catch { return { ok: false, why: 'payload is not JSON' } }
  if (typeof claims.exp === 'number' && claims.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, why: 'expired' }
  }
  if (!claims.sub) return { ok: false, why: 'no sub claim — this is a role token, not a session token' }
  return { ok: true, claims }
}

async function authUser(req, res) {
  authUserReads++
  const v = verifyBearer(req)
  if (!v.ok) {
    // The shape `auth-js` expects for a rejected session, so the middleware's `user` is null
    // and the product takes its own real unauthenticated branch.
    res.writeHead(401, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ code: 401, msg: `invalid session token: ${v.why}` }))
    return
  }
  if (!DB_URL) return authFail(res, 'read auth.users', 'no GATEWAY_DB_URL')
  try {
    const { rows } = await (await db_()).query(
      `select id::text, email, created_at from auth.users where id = $1::uuid`, [v.claims.sub],
    )
    if (rows.length === 0) {
      // ⚠️ A SIGNED TOKEN FOR A USER WHO NO LONGER EXISTS IS NOT A USER. 401, not a
      // synthesised row from the claims — believing the claims here is the bypass again.
      res.writeHead(401, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ code: 401, msg: `session subject ${v.claims.sub} is not in auth.users` }))
      return
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(authUserRow(rows[0])))
  } catch (err) { authFail(res, 'read auth.users', err) }
}

/** `getUserById()` — ONE user, returned BARE. A 404 for an unknown id, never an empty object:
 *  the strict resolver distinguishes "no such user" from "a user with no email", and both of
 *  those are throws it must be able to reach on their own evidence. */
async function authAdminUserById(id, res) {
  authGets++
  if (!DB_URL) return authFail(res, 'read auth.users', 'no GATEWAY_DB_URL')
  try {
    const { rows } = await (await db_()).query(
      `select id::text, email, created_at from auth.users where id = $1::uuid`, [id],
    )
    if (rows.length === 0) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ msg: `User not found`, code: 404 }))
      return
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(authUserRow(rows[0])))
  } catch (err) { authFail(res, 'read auth.users', err) }
}

const server = createServer((req, res) => {
  const original = req.url || '/'

  // Harness-only introspection. `supabase-js` never builds this path, so it cannot collide.
  if (original.startsWith('/__gateway/stats')) {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ forwarded, authListings, authGets, authUserReads, byPath: Object.fromEntries(byPath) }))
    return
  }

  // The two platform reads this gateway answers itself — see the block above. ⚠️ THE SINGLE-USER
  // ROUTE IS TESTED FIRST: it is the longer, more specific path, and answering it with the
  // collection's shape is the defect documented there.
  const byId = AUTH_USER_BY_ID.exec(original)
  if (byId) { void authAdminUserById(byId[1], res); return }
  if (original === AUTH_USERS || original.startsWith(`${AUTH_USERS}?`)) {
    void authAdminUsersList(original, res); return
  }
  if (original === AUTH_USER || original.startsWith(`${AUTH_USER}?`)) {
    void authUser(req, res); return
  }
  // 🛑 THE WALL. ANY OTHER `/auth/v1/**` PATH IS REFUSED LOUDLY — including `/token`,
  // `/signup`, `/logout` and `/recover`, the four that would make this GoTrue. It is not
  // forwarded to PostgREST either, which would answer the misleading PGRST125. Three reads
  // are authorised (Fable C-8/C-10, 17 Sep); a fourth is a scope decision for the founder,
  // not something this file absorbs quietly.
  if (original.startsWith('/auth/v1/')) {
    res.writeHead(501, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      msg: `the fullstack gateway serves only ${AUTH_USERS}, ${AUTH_USERS}/<id> and ${AUTH_USER}; ` +
        `${original.split('?')[0]} is a GoTrue endpoint this harness deliberately does not have`,
    }))
    return
  }

  // THE ENTIRE TRANSFORMATION.
  const path = original.startsWith(PREFIX) ? (original.slice(PREFIX.length) || '/') : original

  forwarded++
  const key = path.split('?')[0]
  byPath.set(key, (byPath.get(key) ?? 0) + 1)

  const upstream = httpRequest(
    {
      host: '127.0.0.1',
      port: UPSTREAM_PORT,
      method: req.method,
      path,
      // ⚠️ `host` IS REWRITTEN AND NOTHING ELSE IS. Every other header — Authorization,
      // apikey, Prefer, Accept, Range, Content-Profile — reaches PostgREST untouched, because
      // several of them ARE the semantics under test (`Prefer: return=representation`,
      // `Accept: application/vnd.pgrst.object+json` for `.single()`, `Prefer: count=exact`).
      headers: { ...req.headers, host: `127.0.0.1:${UPSTREAM_PORT}` },
    },
    (upRes) => {
      res.writeHead(upRes.statusCode || 502, upRes.headers)
      upRes.pipe(res)
    },
  )

  upstream.on('error', (err) => {
    // ⚠️ 502 WITH A REAL REASON, not an empty body. A gateway that fails silently would make
    // a PostgREST outage look like an empty result set — the single most expensive defect
    // shape in this codebase, reproduced in the harness itself.
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ message: `gateway could not reach PostgREST on ${UPSTREAM_PORT}: ${String(err)}` }))
  })

  req.pipe(upstream)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[gateway] ${PORT} → postgrest ${UPSTREAM_PORT} (strips ${PREFIX}; serves GET ${AUTH_USERS}, ${AUTH_USERS}/<id> and ${AUTH_USER} (HS256-verified) from auth.users, 501 for any other /auth/v1/**; forwards everything else verbatim)`)
})
