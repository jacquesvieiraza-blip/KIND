// ══════════════════════════════════════════════════════════════════════════════════════════
// BATCH 1b · THE PROVIDER FAKES — REAL LISTENING SERVERS THAT RECORD EVERY REQUEST
//
// ── WHY REAL SERVERS AND NOT MOCKS ──────────────────────────────────────────────────────
//
// `vi.mock` proves what the test author typed. These are processes on ports: the real API
// resolves a real base URL, opens a real socket, sends real headers and parses a real body.
// Everything between the product's `fetch` and the provider's wire format is therefore under
// test — which is the whole difference between the unit suite and a §8.2 run.
//
// 🛑 AND THE POINT OF PDL AND HUNTER IS THAT THEY ARE LISTENING. Batch 1's contract requires
// them to receive **zero calls with their keys SET**. A test that simply omits the key proves
// nothing about a pasted key; a server that is up, authenticated, willing to answer, and
// records a count of 0 is the only shape that does. If FD-6's code lock ever regresses, these
// two counters are what notices.
//
// ── WHAT EACH ONE IS ────────────────────────────────────────────────────────────────────
//
//   apollo   — mixed_people/api_search, people/bulk_match, usage_stats, with SCRIPTED modes
//   pdl      — every path 200s happily. Its only job is to be reachable and count. 🛑
//   hunter   — the same. 🛑
//   stripe   — record-only; answers the minimum shape the SDK will parse
//   google   — record-only (probe surface; the googleapis SDK path is not redirected)
//   resend   — record-only; /domains and /emails
//   anthropic— the model harness: canned Messages-API completions, no model call
//   smtp     — a sink that accepts and records a full SMTP conversation
//
// ⚠️ EVERY FAKE ANSWERS `/__fake/requests` AND `/__fake/reset`, on a path no provider SDK
// generates, so a check can read exactly what arrived without parsing a log.
//
// ⚠️ NOTHING HERE READS A REAL KEY, and no fake forwards anywhere. A fake that could proxy
// to a real provider would make the zero-spend property depend on configuration.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { createServer } from 'node:http'
import { createServer as createTcpServer } from 'node:net'

/** Every request a fake saw, in order. */
const makeRecorder = (name) => {
  const requests = []
  return {
    name,
    requests,
    record(req, body) {
      requests.push({
        at: new Date().toISOString(),
        method: req.method,
        path: (req.url || '').split('?')[0],
        query: (req.url || '').includes('?') ? (req.url || '').split('?')[1] : '',
        // ⚠️ HEADER NAMES ONLY FOR AUTH. A recorded Authorization value would put a key in a
        // log the run prints; the check needs to know a key WAS sent, never what it was.
        authPresent: Boolean(req.headers.authorization || req.headers['x-api-key'] || req.headers['api-key']),
        contentType: req.headers['content-type'] ?? null,
        body: body && body.length < 20000 ? body : `<${body ? body.length : 0} bytes>`,
      })
    },
  }
}

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', () => resolve(''))
  })

const json = (res, status, payload, headers = {}) => {
  res.writeHead(status, { 'content-type': 'application/json', ...headers })
  res.end(typeof payload === 'string' ? payload : JSON.stringify(payload))
}

/**
 * Start one fake.
 *
 * `handler(req, body, res, state)` returns true when it has answered; anything else falls
 * through to a recorded 200 `{}`, so an unexpected path is a recorded fact rather than a
 * connection error the product would classify as a network fault.
 */
function startFake({ name, port, handler }) {
  const rec = makeRecorder(name)
  const state = { mode: 'success', hangMs: 0, calls: 0 }

  const server = createServer(async (req, res) => {
    const path = (req.url || '').split('?')[0]

    // ── harness control plane, on paths no provider SDK generates ──
    if (path === '/__fake/requests') return json(res, 200, { name, calls: rec.requests.length, requests: rec.requests })
    if (path === '/__fake/count') return json(res, 200, { name, calls: rec.requests.length })
    if (path === '/__fake/reset') { rec.requests.length = 0; state.calls = 0; return json(res, 200, { ok: true }) }
    if (path === '/__fake/mode') {
      const body = await readBody(req)
      try {
        const next = JSON.parse(body || '{}')
        if (typeof next.mode === 'string') state.mode = next.mode
        if (typeof next.hangMs === 'number') state.hangMs = next.hangMs
      } catch { /* leave the mode alone rather than guessing */ }
      return json(res, 200, { mode: state.mode, hangMs: state.hangMs })
    }

    const body = await readBody(req)
    rec.record(req, body)
    state.calls++
    if (handler && (await handler(req, body, res, state))) return
    return json(res, 200, {})
  })

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`[fake:${name}] ${port}`)
      resolve({ name, port, server, rec, state })
    })
  })
}

// ── APOLLO ────────────────────────────────────────────────────────────────────────────────
//
// The eight scripted modes are the failure classes the contract names. Each reproduces the
// provider's ACTUAL shape, because `classifyProviderFailure` matches on the message rather
// than on `instanceof` — so a fake that returned a tidy `{error: "rate limited"}` would test
// nothing that production will see.
const apolloHandler = async (req, body, res, state) => {
  const path = (req.url || '').split('?')[0]
  void body

  if (state.mode === 'hang' || state.mode === 'timeout') {
    // 🛑 NEVER ANSWER. Holds the socket open so the product's own AbortSignal has to fire.
    // This is the only way to prove J5-C14's bound exists rather than is merely declared.
    await new Promise((r) => setTimeout(r, state.hangMs || 120000))
    return true
  }
  if (state.mode === 'unauthorised') return json(res, 401, { error: 'unauthorized' }), true
  if (state.mode === 'payment_required') return json(res, 402, { error: 'payment required' }), true
  if (state.mode === 'credits_exhausted') {
    // Apollo answers 422 for BOTH an invalid request and an exhausted pool. The word is what
    // separates them, and getting that wrong shows a client "your ICP is wrong".
    return json(res, 422, { error: 'insufficient credits remaining for this request' }), true
  }
  if (state.mode === 'malformed_request') {
    return json(res, 422, { error: 'Per page not supported', error_details: { code: 'SEARCH_VALIDATION_SEARCH_PARAMS_INVALID' } }), true
  }
  if (state.mode === 'rate_limited') return json(res, 429, { error: 'rate limit exceeded' }, { 'retry-after': '1' }), true
  if (state.mode === 'provider_error') return json(res, 500, { error: 'internal server error' }), true
  if (state.mode === 'malformed_body') {
    // Not JSON at all — the shape a proxy error page has.
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end('<html><body>upstream error</body></html>')
    return true
  }

  // ── success ──
  if (path.endsWith('/mixed_people/api_search')) {
    const person = (i) => ({
      id: `apollo-person-${i}`, first_name: 'Test', last_name: `Person${i}`,
      name: `Test Person${i}`, title: 'Head of Operations', linkedin_url: null,
      email_status: 'verified', email: null,
      organization: { id: `org-${i}`, name: `Fake Co ${i}`, website_url: `https://fake-${i}.invalid`, estimated_num_employees: 40, industry: 'logistics' },
      country: 'United Kingdom', city: 'London', state: 'England',
    })
    const perPage = 25
    return json(res, 200, {
      people: Array.from({ length: perPage }, (_, i) => person(i)),
      pagination: { page: 1, per_page: perPage, total_entries: perPage, total_pages: 1 },
    }), true
  }
  if (path.endsWith('/people/bulk_match')) {
    return json(res, 200, {
      matches: [{ id: 'apollo-person-0', email: 'test.person0@fake-0.invalid', email_status: 'verified', country: 'United Kingdom' }],
    }), true
  }
  if (path.includes('/usage_stats/')) {
    return json(res, 200, { per_hour: { 'api/v1/mixed_people/api_search': { consumed: 1, limit: 200 } }, lead_credits: { consumed: 3, limit: 1000 } }), true
  }
  return json(res, 200, { people: [], pagination: { page: 1, per_page: 0, total_entries: 0, total_pages: 0 } }), true
}

// ── THE OTHERS ────────────────────────────────────────────────────────────────────────────
const stripeHandler = async (req, body, res) => {
  void body
  const path = (req.url || '').split('?')[0]
  if (path === '/v1/balance') return json(res, 200, { object: 'balance', available: [{ amount: 0, currency: 'usd' }] }), true
  if (path.startsWith('/v1/checkout/sessions')) return json(res, 200, { id: 'cs_fake_1', object: 'checkout.session', url: 'http://127.0.0.1:0/fake-checkout' }), true
  return json(res, 200, { object: 'list', data: [] }), true
}

const resendHandler = async (req, body, res) => {
  void body
  const path = (req.url || '').split('?')[0]
  if (path === '/domains') return json(res, 200, { data: [{ id: 'dom_fake', name: 'get-kind.com', status: 'verified' }] }), true
  if (path.startsWith('/emails')) return json(res, 200, { id: 'email_fake_1' }), true
  return json(res, 200, { data: [] }), true
}

const anthropicHandler = async (req, body, res) => {
  void body
  // The Messages API shape, enough for the SDK to parse. No model is called and nothing is
  // generated — a canned completion is the correct evidence for "the model seam is wired".
  return json(res, 200, {
    id: 'msg_fake_1', type: 'message', role: 'assistant', model: 'fake-harness-model',
    content: [{ type: 'text', text: '{"ok":true,"harness":"batch1b"}' }],
    stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 },
  }), true
}

/**
 * 🛑 PDL AND HUNTER. Deliberately generous: any path, 200, a plausible body.
 *
 * If FD-6's code lock ever regressed, a call would SUCCEED here rather than error — so the
 * product would carry on and only the counter would notice. That is the point. A fake that
 * refused would let a regression look like an unrelated provider failure.
 */
const permissiveHandler = async (req, body, res) => {
  void body
  return json(res, 200, { status: 200, data: [], total: 0, matched: 0 }), true
}

// ── SMTP SINK ─────────────────────────────────────────────────────────────────────────────
//
// Just enough of the protocol for a client to complete a handshake and hand over a message.
// It delivers nothing anywhere, which is the entire requirement.
function startSmtpSink(port) {
  const messages = []
  const server = createTcpServer((socket) => {
    let stage = 'greet'
    let buffer = ''
    let current = { from: null, to: [], data: '' }
    socket.write('220 kind-fullstack smtp sink\r\n')
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8')
      let idx
      while ((idx = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        if (stage === 'data') {
          if (line === '.') { messages.push({ ...current, at: new Date().toISOString() }); current = { from: null, to: [], data: '' }; stage = 'greet'; socket.write('250 OK queued\r\n') }
          else current.data += line + '\n'
          continue
        }
        const upper = line.toUpperCase()
        if (upper.startsWith('EHLO') || upper.startsWith('HELO')) socket.write('250-kind-fullstack\r\n250 AUTH PLAIN LOGIN\r\n')
        else if (upper.startsWith('AUTH')) socket.write('235 authenticated\r\n')
        else if (upper.startsWith('MAIL FROM')) { current.from = line.slice(line.indexOf(':') + 1).trim(); socket.write('250 OK\r\n') }
        else if (upper.startsWith('RCPT TO')) { current.to.push(line.slice(line.indexOf(':') + 1).trim()); socket.write('250 OK\r\n') }
        else if (upper === 'DATA') { stage = 'data'; socket.write('354 end with .\r\n') }
        else if (upper === 'QUIT') { socket.write('221 bye\r\n'); socket.end() }
        else if (upper === 'RSET') { current = { from: null, to: [], data: '' }; socket.write('250 OK\r\n') }
        else socket.write('250 OK\r\n')
      }
    })
    socket.on('error', () => {})
  })
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => { console.log(`[fake:smtp] ${port}`); resolve({ name: 'smtp', port, server, messages }) })
  })
}

// ── MAIN ──────────────────────────────────────────────────────────────────────────────────
const P = Number(process.env.FULLSTACK_PORT_BASE || 58500)
const PORTS = {
  apollo: P + 1, pdl: P + 2, hunter: P + 3, stripe: P + 10,
  google: P + 11, resend: P + 12, anthropic: P + 13, smtp: P + 14,
  // ⚑ A SERVER THAT ACCEPTS AND NEVER ANSWERS. Check 3's second half needs the admin proxy to
  // reach its OWN 45s bound, and the only honest way to produce that without editing the bound
  // is an upstream that holds the connection open. A second admin instance is pointed here.
  hang: P + 15,
}

/** Accepts, records, and never responds. `keep-alive` so the socket is not closed for us. */
const hangHandler = async (req, body, res) => {
  void req; void body; void res
  await new Promise(() => {})   // deliberately never resolves
  return true
}

const started = await Promise.all([
  startFake({ name: 'apollo', port: PORTS.apollo, handler: apolloHandler }),
  startFake({ name: 'pdl', port: PORTS.pdl, handler: permissiveHandler }),
  startFake({ name: 'hunter', port: PORTS.hunter, handler: permissiveHandler }),
  startFake({ name: 'stripe', port: PORTS.stripe, handler: stripeHandler }),
  startFake({ name: 'google', port: PORTS.google, handler: permissiveHandler }),
  startFake({ name: 'resend', port: PORTS.resend, handler: resendHandler }),
  startFake({ name: 'anthropic', port: PORTS.anthropic, handler: anthropicHandler }),
  startSmtpSink(PORTS.smtp),
  startFake({ name: 'hang', port: PORTS.hang, handler: hangHandler }),
])

console.log(`[fakes] ${started.length} fakes up on ${P + 1}..${P + 15}`)

const shutdown = () => {
  for (const s of started) { try { s.server.close() } catch { /* already gone */ } }
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
