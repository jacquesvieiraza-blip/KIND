// ⚑ 28 Sep (R164 · demo B) — WALK THE NORTHWIND DEMO THROUGH ALL SIX STAGES, AGAINST THE REAL STACK.
//
// The founder opened the demo at Brief and got "Client not found" — a failure no unit test,
// no mocked route test and no real-database row test could see, because none of them was the
// client's own screen. This walks every stage the way the demo is used: Vida sets the stage
// (the real operator route, admin key), then every read the client's Milla screens make is
// called AS the demo login (a signed session the gateway verifies), and every read Vida makes
// for that client is called with the admin key. Each stage prints what a screen would show and
// fails on anything a presenter would see as broken.
//
// Usage (against `bash scripts/fullstack.sh up`):
//   node scripts/fullstack/demo-walk.mjs [/tmp/kind-fullstack/env.json] [out-dir]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHmac, randomUUID } from 'node:crypto'

const ENV = JSON.parse(readFileSync(process.argv[2] ?? '/tmp/kind-fullstack/env.json', 'utf8'))
const OUT = process.argv[3] ?? '/tmp/kind-fullstack/demo-walk'
mkdirSync(OUT, { recursive: true })
const EMAIL = 'northwind@kind-demo.internal'
const STAGES = ['Brief', 'Proof', 'Programme', 'Approval', 'Results', 'Complete']

const psql = (sql) => execFileSync(process.env.PSQL ?? '/usr/lib/postgresql/16/bin/psql',
  ['-X', '-A', '-t', '-q', ENV.db, '-c', sql], { encoding: 'utf8' }).trim()

// The harness has no GoTrue, so it cannot CREATE a login; the demo's own lookup (listUsers)
// finds one that exists. Seed it once, exactly as a created login would sit in auth.users.
let userId = psql(`select id from auth.users where lower(email) = '${EMAIL}'`)
if (!userId) { userId = randomUUID(); psql(`insert into auth.users(id, email) values ('${userId}', '${EMAIL}')`) }

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const now = Math.floor(Date.now() / 1000)
const head = b64({ alg: 'HS256', typ: 'JWT' })
const body = b64({ role: 'authenticated', iss: 'kind-fullstack-harness', iat: now, exp: now + 86400, sub: userId, aud: 'authenticated', email: EMAIL })
const USER_JWT = `${head}.${body}.${createHmac('sha256', ENV.jwtSecret).update(`${head}.${body}`).digest('base64url')}`
writeFileSync(`${OUT}/session.json`, JSON.stringify({ userId, email: EMAIL, jwt: USER_JWT }))

const ADMIN = { 'x-admin-key': ENV.secrets.adminKey, 'x-operator-email': 'fullstack-operator@example.invalid' }
async function call(method, path, { headers = {}, json } = {}) {
  const res = await fetch(`${ENV.api}${path}`, {
    method, headers: { 'content-type': 'application/json', ...headers }, body: json ? JSON.stringify(json) : undefined,
  })
  let data = null
  try { data = await res.json() } catch { /* not json */ }
  return { status: res.status, data }
}
const asClient = (path) => call('GET', path, { headers: { authorization: `Bearer ${USER_JWT}` } })
const asVida = (path) => call('GET', path, { headers: ADMIN })

const problems = []
const note = (stage, ok, what) => { if (!ok) problems.push(`${stage}: ${what}`); console.log(`   ${ok ? '✓' : '✗'} ${what}`) }

for (const stage of STAGES) {
  console.log(`\n── ${stage} ─────────────────────────────`)
  const set = await call('POST', '/operator/demo/northwind/stage', { headers: ADMIN, json: { stage } })
  note(stage, set.status === 200 && set.data?.success, `Vida set the stage (${set.status}) ${set.data?.message ?? set.data?.error ?? ''}`)
  const state = await asVida('/operator/demo/northwind')
  note(stage, state.data?.data?.stage === stage, `Vida's demo card reads "${state.data?.data?.stage}"`)
  const clientId = state.data?.data?.clientId

  const reads = {
    me: await asClient('/clients/me'),
    profile: await asClient('/clients/me/profile'),
    summary: await asClient('/leads/milla-summary'),
    forApproval: await asClient('/leads/for-approval'),
    programme: await asClient('/my/programme'),
    calculator: await asClient('/my/programme/calculator?meetings=8'),
    review: await asClient('/my/programme/review'),
    progMeetings: await asClient('/my/programme/meetings'),
    replies: await asClient('/figsy/replies/all'),
    meetings: await asClient('/leads/meetings'),
    briefDraft: await asClient('/milla/brief-draft'),
    icps: await asClient('/icps'),
    sessions: await asClient('/milla/sessions'),
    ...(clientId ? {
      vidaProgramme: await asVida(`/operator/programme?client_id=${clientId}`),
      vidaMeetings: await asVida(`/operator/meetings?client_id=${clientId}`),
    } : {}),
    vidaClients: await asVida('/operator/clients'),
    vidaBoard: await asVida('/operator/lifecycle-board'),
  }
  writeFileSync(`${OUT}/${stage}.json`, JSON.stringify(reads, null, 2))
  const st = Object.fromEntries(Object.entries(reads).map(([k, v]) => [k, v.status]))
  console.log(`   statuses: ${JSON.stringify(st)}`)

  const s = reads.summary.data?.data
  const p = reads.programme.data?.data
  // ⚠️ THE EXPECTED NUMBERS ARE THE DEMO'S OWN DATA (`apps/api/src/lib/demo-northwind-data.ts`):
  // 24 cast · 20 in the programme · 8 meetings bought at the growth band ($199) · 3 delivered at
  // Results (1 still ahead) · 6 replies at Results, 11 at Complete. Change the demo → change these.
  const lc = reads.vidaProgramme?.data?.data?.lifecycle?.verdict
  if (stage === 'Brief') {
    note(stage, reads.summary.status === 404, 'no account yet: the summary answers 404 (Home sends this to the Brief)')
    const turns = reads.briefDraft.data?.data?.conversation?.length ?? 0
    note(stage, reads.briefDraft.status === 200 && turns === 7, `the Brief chat opens half-way through (${turns} turns)`)
    continue
  }
  const sid = reads.sessions.data?.data?.[0]?.id
  const hist = sid ? await asClient(`/milla/sessions/${sid}/messages`) : null
  const nMsgs = hist?.data?.data?.length ?? 0
  const briefTurns = reads.briefDraft.data?.data?.conversation?.length ?? 0
  const minMsgs = { Proof: 1, Programme: 5, Approval: 7, Results: 12, Complete: 15 }[stage]
  note(stage, briefTurns === 14 && nMsgs >= minMsgs, `Milla's chat opens on history: ${briefTurns} Brief turns + ${nMsgs} messages (≥ ${minMsgs})`)
  note(stage, reads.me.status === 200 && reads.me.data?.data?.is_demo === true, 'the account exists and is flagged demo (Milla shows the Demo chip)')
  note(stage, reads.summary.status === 200, `Milla Home summary loads (${reads.summary.status})`)
  note(stage, (s?.icp_versions?.length ?? 0) > 0, `Home does not bounce to the Brief (icp_versions: ${s?.icp_versions?.length})`)
  const millaStage = { Proof: 'Proof', Programme: 'Recommendation', Approval: 'Approval', Results: 'Live', Complete: 'Completion' }[stage]
  note(stage, reads.programme.status === 200 && p?.stage === millaStage, `Milla's programme read is at ${p?.stage} (expected ${millaStage})`)
  // Vida: the same stage, and never a Needs-you a demo can't clear (no mailbox, Proof history).
  const vidaStage = { Proof: 'proof', Programme: 'recommendation', Approval: 'approval', Results: 'review', Complete: 'completion' }[stage]
  note(stage, lc?.stage === vidaStage, `Vida's lifecycle is at ${lc?.stage} (expected ${vidaStage})`)
  note(stage, lc?.needsYouReason !== 'sender_not_sendable', `Vida does not flag the demo's missing mailbox (${lc?.needsYouReason ?? 'no reason'})`)
  if (stage !== 'Results') note(stage, lc?.needsYou !== true, `Vida needs nothing from a person at ${stage} (${lc?.needsYouReason ?? 'none'})`)
  if (stage === 'Results') note(stage, lc?.needsYouReason === 'reply_needs_decision', `Vida's one Needs-you is the reply waiting for a person (${lc?.needsYouReason})`)
  if (stage === 'Proof') {
    const n = reads.forApproval.data?.data?.length ?? 0
    note(stage, reads.forApproval.status === 200 && n === 24, `the Proof desk shows ${n} people (expected 24)`)
  }
  if (stage === 'Programme') {
    const q = reads.calculator.data?.data
    note(stage, reads.calculator.status === 200 && q?.totalCents === 159200 && q?.secondPaymentCents === 0,
      `the calculator prices 8 meetings at $${(q?.totalCents ?? 0) / 100} in one payment (expected $1592)`)
  }
  if (stage === 'Approval') {
    const r = reads.review.data?.data
    const frozen = r?.frozen
    note(stage, reads.review.status === 200 && r?.canApprove === true, `the approval read loads and can be approved (${reads.review.status})`)
    note(stage, frozen?.messages?.length === 3, `the frozen package holds the 3-step sequence (${frozen?.messages?.length})`)
    note(stage, r?.total === 20, `the frozen package holds 20 people (${r?.total})`)
    note(stage, JSON.stringify(frozen ?? {}).includes('08:30'), 'the frozen package states its sending window (weekdays 08:30–17:00)')
  }
  if (stage === 'Results' || stage === 'Complete') {
    const want = stage === 'Results' ? { met: 3, sent: 29, replies: 6, meetings: 3, upcoming: 1 } : { met: 8, sent: 38, replies: 11, meetings: 8, upcoming: 0 }
    note(stage, p?.progress?.outcomesAchieved === want.met, `qualified meetings ${p?.progress?.outcomesAchieved} / 8 (expected ${want.met})`)
    note(stage, p?.sending?.emailsDelivered === want.sent, `emails sent ${p?.sending?.emailsDelivered} (expected ${want.sent})`)
    const rep = reads.replies.data?.data
    const mt = reads.meetings.data?.data
    if (stage === 'Results') {
      note(stage, reads.replies.status === 200 && Array.isArray(rep) && rep.length === want.replies, `the Inbox holds ${Array.isArray(rep) ? rep.length : '?'} replies (expected ${want.replies})`)
      note(stage, reads.meetings.status === 200 && Array.isArray(mt) && mt.length === want.meetings, `the Meetings page lists ${Array.isArray(mt) ? mt.length : '?'} meetings (expected ${want.meetings})`)
      const up = Array.isArray(mt) ? mt.filter(m => m.state === 'BOOKED' && new Date(m.start_time).getTime() > Date.now()).length : -1
      note(stage, up === want.upcoming, `${up} meeting still to come (expected ${want.upcoming})`)
    }
  }
}

console.log(`\n${problems.length === 0 ? '✅ every stage passed its checks' : `✗ ${problems.length} problem(s):\n  · ${problems.join('\n  · ')}`}`)
console.log(`full reads written to ${OUT}/<Stage>.json`)
if (problems.length > 0) process.exit(1)
