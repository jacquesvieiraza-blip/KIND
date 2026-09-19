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
// ── ⚑ 18 Sep (P6 §8.2 · J20) — THE SMTP SINK NEEDS A WAY TO BE ASKED ─────────────────────
//
// The sink recorded every message it accepted and there was no way to READ that record: it is
// a TCP server, so it has no control plane of its own. J20 must prove mail actually LEFT, and
// a row in `figsy_sent_emails` is what the product wrote, not what the mailer delivered — the
// distinction the whole harness exists for. Every HTTP fake shares this process, so any of
// their control planes can answer for it.
const SMTP_DELIVERED = []

function startFake({ name, port, handler }) {
  const rec = makeRecorder(name)
  const state = { mode: 'success', hangMs: 0, calls: 0 }

  const server = createServer(async (req, res) => {
    const path = (req.url || '').split('?')[0]

    // ── harness control plane, on paths no provider SDK generates ──
    if (path === '/__fake/requests') return json(res, 200, { name, calls: rec.requests.length, requests: rec.requests })
    if (path === '/__fake/count') return json(res, 200, { name, calls: rec.requests.length })
    // The SMTP sink's record, reachable over HTTP from any fake port.
    if (path === '/__fake/smtp') return json(res, 200, { name: 'smtp', calls: SMTP_DELIVERED.length, messages: SMTP_DELIVERED })
    if (path === '/__fake/smtp/reset') { SMTP_DELIVERED.length = 0; return json(res, 200, { ok: true }) }
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
    // ── 🛑 ⚑ 19 Sep (J12) — A FRESH PAGE PER SEARCH, BECAUSE A REPEATED ONE PROVES NOTHING ──
    //
    // 🛑 THIS RETURNED THE SAME 25 IDENTITIES TO EVERY CALL, and the product's own dedupe then
    // hollowed out every run after the first one for a client: `already owned` removed all 20,
    // the run inserted nobody, and the sourcing journey passed on leads an EARLIER journey had
    // bought. One certification run showed exactly that — J12 reporting "20 qualified" while
    // its own sourcing call created no candidate at all. A check that can pass without the
    // work happening is the defect F-KILL taught this harness to look for.
    //
    // ⚠️ REAL APOLLO DOES NOT REPEAT ITSELF EITHER — a paged search walks forward — so this is
    // closer to the provider, not a convenience. Each call takes the next block of identities;
    // nothing else about the shape changes, and `bulk_match` still echoes the ids it is asked
    // about, so a page and its reveal always agree.
    const offset = state.peopleServed ?? 0
    const person = (i) => ({
      id: `apollo-person-${i}`, first_name: 'Test', last_name: `Person${i}`,
      name: `Test Person${i}`, title: 'Head of Operations', linkedin_url: null,
      // ⚠️ `seniority` IS A HARD CRITERION, and its absence refused every prospect. The
      // structural gate judges seniority before anything is spent; with the field missing,
      // every contact came back "unknown" and a programme run set aside all 20 — so the batch
      // existed with nobody in it and preparation refused with "no qualified prospect yet".
      // 'head' is Apollo's own token for the "Head of" level this walk's ICP asks for.
      seniority: 'head',
      email_status: 'verified', email: null,
      // ── 🛑 ⚑ 19 Sep — ONE HEADCOUNT KEY, AND IT IS THE ONE APOLLO SENDS ────────────────
      //
      // ⛓️ THIS FAKE USED TO EMIT BOTH `estimated_num_employees` AND `num_employees`, with a
      // note saying which key real Apollo sends was "RUNTIME UNVERIFIED AND MATTERS" and that
      // if it were `estimated_num_employees` then "no prospect would EVER clear the size
      // criterion in production". Carrying both meant the journey passed either way.
      //
      // 🛑 SO THE HARNESS SUPPLIED WHAT THE CODE WANTED, AND PRODUCTION DID NOT. 26/26
      // journeys were green while GREAT Studio's first real run sourced 20 people and
      // surfaced none — every one set aside on size. A fixture that answers the question the
      // code is asking proves the fixture, not the product.
      //
      // ⚠️ RUNTIME VERIFIED 19 Sep: Apollo sends `estimated_num_employees`. This fake now sends
      // ONLY that, so the harness can never again hide a mapping the live payload does not
      // have. `apolloHeadcount` reads both keys, so the product still tolerates either.
      organization: { id: `org-${i}`, name: `Fake Co ${i}`, website_url: `https://fake-${i}.invalid`, estimated_num_employees: 40, industry: 'logistics' },
      country: 'United Kingdom', city: 'London', state: 'England',
    })
    const perPage = 25
    state.peopleServed = offset + perPage
    return json(res, 200, {
      people: Array.from({ length: perPage }, (_, i) => person(offset + i)),
      pagination: { page: 1, per_page: perPage, total_entries: perPage, total_pages: 1 },
    }), true
  }
  if (path.endsWith('/people/bulk_match')) {
    // ── ⚑ 18 Sep (P6 §8.2) — MATCH THE PEOPLE ACTUALLY ASKED ABOUT ────────────────────────
    //
    // 🛑 THIS RETURNED ONE HARDCODED MATCH, and that quietly capped the whole product at one
    // sendable prospect. The final ICP gate (FD-1) reads the EMAIL, and search returns none —
    // Apollo only reveals addresses on match — so every candidate the match did not cover was
    // gated out, `qualifyCandidates` received an empty list, nothing was ever qualified, and
    // preparation refused with "no qualified prospect yet". Journeys 13 through 19 and 25 were
    // all unreachable behind it.
    //
    // ⚠️ THE IDS ARE ECHOED FROM THE REQUEST, so the answer is about the people the product
    // asked about rather than a fixture it happens to agree with.
    const asked = [...new Set((String(body ?? '').match(/apollo-person-\d+/g) ?? []))]
    const matches = (asked.length ? asked : ['apollo-person-0']).map(pid => ({
      id: pid,
      email: `${pid}@fake-harness.localdomain`,
      email_status: 'verified',
      country: 'United Kingdom',
    }))
    return json(res, 200, {
      matches,
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

// ── ⚑ 18 Sep (P6 §8.2 · F-MODEL) — THE MODEL FAKE HONOURS MODES TOO ───────────────────────
//
// 🛑 IT DID NOT, AND THAT MADE AN F-MODEL CHECK VACUOUS. `state` was already handed to every
// handler and this one ignored it, so `__fake/mode` on the anthropic port set a field nothing
// read: the model answered its canned completion, the route answered 200, and a check written
// to prove "a model failure is reported honestly" would have passed while nothing had failed.
// Found by the check going green for the wrong reason.
//
// The four modes are the four the contract names: throw · timeout · malformed JSON · refusal.
// Each reproduces the SHAPE the SDK actually meets, because the product classifies on what it
// receives — a tidy `{error:"failed"}` would test a path production never takes.
const anthropicHandler = async (req, body, res, state) => {
  void body
  if (state.mode === 'hang' || state.mode === 'timeout') {
    // Never answer: the product's own bound (AI_TURN_BOUND) has to be what ends this.
    await new Promise((r) => setTimeout(r, state.hangMs || 120000))
    return true
  }
  if (state.mode === 'unauthorised') return json(res, 401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }), true
  if (state.mode === 'provider_error') return json(res, 500, { type: 'error', error: { type: 'api_error', message: 'internal server error' } }), true
  if (state.mode === 'rate_limited') return json(res, 429, { type: 'error', error: { type: 'rate_limit_error', message: 'rate limited' } }, { 'retry-after': '1' }), true
  if (state.mode === 'malformed_body') {
    // A 200 whose body is not the Messages shape at all — the proxy-error-page case.
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end('<html><body>upstream error</body></html>')
    return true
  }
  if (state.mode === 'refusal') {
    // 🛑 A REFUSAL IS A SUCCESSFUL CALL. The HTTP layer is 200 and the SDK parses it happily;
    // what is missing is the ANSWER. Anything reading `content[0].text` gets an empty string,
    // which is exactly the case that used to render as Milla saying nothing at all.
    return json(res, 200, {
      id: 'msg_fake_refusal', type: 'message', role: 'assistant', model: 'fake-harness-model',
      content: [], stop_reason: 'refusal', usage: { input_tokens: 1, output_tokens: 0 },
    }), true
  }
  // ── ⚑ 18 Sep (P6 §8.2) — ONE SCRIPTED ANSWER SHAPE: LEAD SCORING ────────────────────────
  //
  // 🛑 WITHOUT IT THE WHOLE PROOF JOURNEY IS UNREACHABLE. `scoreLeads` asks for a JSON array
  // of `{id, score, reasoning, category_fit, category_fit_reason}` and, on anything it cannot
  // parse, CORRECTLY refuses to invent a score: the leads stay unscored, nothing is surfaced
  // to the client, and an alert fires. So against the generic canned completion every Proof
  // run sourced 20 people and showed the client none of them — journeys 5, 6, 7 and 12 could
  // not be walked at all.
  //
  // ⚠️ THE SCORES ARE THE HARNESS'S, AND NOTHING ABOUT SCORE QUALITY IS PROVEN BY THEM. What
  // this makes testable is the machinery on the far side of the model — qualification,
  // surfacing, accounting, the client's own view — which is what a journey is about. The ids
  // are read back out of the prompt so the answer is about the leads actually asked about; a
  // fake that returned a fixed id would exercise nothing.
  const prompt = String(body ?? '')
  if (prompt.includes('category_fit') && prompt.includes('JSON array')) {
    const ids = [...new Set((prompt.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []))]
    const scored = ids.map((id, i) => ({
      id, score: 70 + (i % 25),
      reasoning: 'Scored by the full-stack harness, not by a model.',
      category_fit: 'yes', category_fit_reason: 'harness fixture',
    }))
    return json(res, 200, {
      id: 'msg_fake_scoring', type: 'message', role: 'assistant', model: 'fake-harness-model',
      content: [{ type: 'text', text: JSON.stringify(scored) }],
      stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 },
    }), true
  }

  // ── ⚑ 18 Sep (P6 §8.2) — THE SECOND SCRIPTED SHAPE: SEQUENCE GENERATION ─────────────────
  //
  // 🛑 WITHOUT IT, PREPARATION DIES ON A TypeError. `generateSequence` hands its answer
  // straight to `draft.step1.subject` (figsy.ts:365) with no guard, so a model reply that is
  // not the expected object throws "Cannot read properties of undefined (reading 'subject')"
  // — surfaced to the operator as "The outreach for this programme could not be drafted".
  // That is REPORTED as a robustness finding in its own right: a malformed model answer
  // should be a clean refusal, not a stack trace, and F-MODEL's other three modes are handled
  // properly.
  //
  // ⚠️ THE COPY IS THE HARNESS'S AND PROVES NOTHING ABOUT WRITING. What it makes testable is
  // everything downstream — freeze, approval, Make Live, Run — which is what journeys 13-19
  // are about. The merge token is real so the linter's "names nobody" refusal is exercised
  // rather than dodged.
  if (prompt.includes('cold outreach emails') || prompt.includes('step1')) {
    const step = (n) => ({
      subject: `A quick question about operations (${n})`,
      // ⚠️ AND IT CARRIES A WAY OUT, because the quality linter HARD-REFUSES a sequence that
      // gives the reader no way to say stop — correctly, and it refused the first version of
      // this copy. Satisfying the rule rather than bypassing it keeps the linter real for
      // every later run.
      body: `Hi {{first_name}},\n\nHarness-written step ${n} for {{company}}. Worth a short conversation?\n\nIf not, just reply "stop" and I'll leave you alone.\n\nBest,\nK.I.N.D`,
    })
    return json(res, 200, {
      id: 'msg_fake_sequence', type: 'message', role: 'assistant', model: 'fake-harness-model',
      content: [{ type: 'text', text: JSON.stringify({ step1: step(1), step2: step(2), step3: step(3) }) }],
      stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 },
    }), true
  }

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
          if (line === '.') {
            const msg = { ...current, at: new Date().toISOString() }
            messages.push(msg)
            SMTP_DELIVERED.push({ from: msg.from, to: msg.to, at: msg.at, bytes: msg.data.length })
            current = { from: null, to: [], data: '' }; stage = 'greet'; socket.write('250 OK queued\r\n')
          }
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
