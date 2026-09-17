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
// MAY: strip a leading `/rest/v1`, forward verbatim, stream the response back verbatim.
// MUST NOT: read a body, parse SQL, rewrite a query string, translate an error, cache, or
// answer any request itself. If a future edit makes this file understand a PostgREST concept,
// it has become the shim Fable ruled out and the run's evidence is no longer about PostgREST.
//
// ⚠️ IT ALSO COUNTS. Every forwarded request is recorded, so a check can ask "did this run
// touch the database at all?" — and so the run can show its own request volume rather than
// asserting it. `/__gateway/stats` is harness-only and lives under a path `supabase-js`
// cannot generate.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { createServer, request as httpRequest } from 'node:http'

const UPSTREAM_PORT = Number(process.env.GATEWAY_UPSTREAM_PORT || 58599)
const PORT = Number(process.env.GATEWAY_PORT || 58598)
const PREFIX = '/rest/v1'

let forwarded = 0
const byPath = new Map()

const server = createServer((req, res) => {
  const original = req.url || '/'

  // Harness-only introspection. `supabase-js` never builds this path, so it cannot collide.
  if (original.startsWith('/__gateway/stats')) {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ forwarded, byPath: Object.fromEntries(byPath) }))
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
  console.log(`[gateway] ${PORT} → postgrest ${UPSTREAM_PORT} (strips ${PREFIX}, forwards everything else verbatim)`)
})
