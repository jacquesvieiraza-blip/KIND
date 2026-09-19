// ══════════════════════════════════════════════════════════════════════════════════════════
// P6 §8.2 · THE 26 JOURNEYS AND THE 14 FAILURE CLASSES — THE CERTIFICATION CONTRACT
//
// Supplied by the founder on 18 Sep 2026 as the authoritative, already-locked set:
// *"This is the existing locked journey set. Do not invent additional journeys. Do not remove
// or combine journeys in a way that loses evidence. Each must be represented in the final
// 26-journey evidence table with the check(s) that prove it."*
//
// ── WHY THIS FILE IS A GATE AND NOT A TABLE ─────────────────────────────────────────────
//
// A coverage table that is merely PRINTED is decoration: it says what somebody intended, and
// it keeps saying it after the check behind a row is deleted, renamed or quietly skipped. The
// failure mode is specific and this repo has met it — a green summary over an assertion that
// no longer runs.
//
// So every row here names the check(s) that prove it, and `assessCoverage` resolves those
// names against the checks that ACTUALLY RAN AND PASSED in this process. A journey whose
// check was removed, renamed, skipped by `FULLSTACK_ONLY`, or failed is an UNPROVEN row and
// fails the run. There is no way to claim a journey without a passing check behind it.
//
// ⚠️ A ROW MAY NAME SEVERAL CHECKS, and it needs ALL of them. Journeys are not single
// assertions — "campaign preparation" is a freeze, a sender, and a refusal — so a row is
// proven only when every check it names passed. Partial evidence is not evidence.
// ══════════════════════════════════════════════════════════════════════════════════════════

/**
 * The 26 journeys, verbatim from the founder's 18 Sep list, in his order.
 *
 * `provenBy` names check ids. Numeric ids are Batch 1b's original checks; string ids are the
 * §8.2 additions. A row with an empty `provenBy` is UNPROVEN by construction and fails.
 */
export const JOURNEYS = [
  { n: 1,  name: 'Signup / account creation',                                        provenBy: ['J1'] },
  { n: 2,  name: 'Welcome email',                                                     provenBy: ['J2'] },
  { n: 3,  name: 'Milla Brief — 11 facts, conversational',                            provenBy: ['J3'] },
  { n: 4,  name: 'Brief → canonical client / ICP',                                    provenBy: ['J4'] },
  { n: 5,  name: 'Proof attempt 1',                                                   provenBy: ['J5'] },
  { n: 6,  name: 'Proof refinement / attempt 2',                                      provenBy: ['J6'] },
  { n: 7,  name: 'Still not right / Needs you',                                       provenBy: ['J7'] },
  { n: 8,  name: 'Human calibration + one restart',                                   provenBy: ['J8'] },
  { n: 9,  name: 'Programme calculator',                                              provenBy: ['J9'] },
  { n: 10, name: 'Programme recommendation',                                          provenBy: ['J10'] },
  { n: 11, name: 'Acceptance + P1',                                                   provenBy: ['J11'] },
  { n: 12, name: 'Automatic sourcing / enrichment / qualification / accounting',      provenBy: [4, 6, 'J12'] },
  { n: 13, name: 'Campaign preparation',                                              provenBy: ['J13'] },
  { n: 14, name: 'Sender assignment & verification',                                  provenBy: ['J14'] },
  { n: 15, name: 'Freeze / ready for approval',                                       provenBy: ['J15'] },
  { n: 16, name: 'Milla client approval',                                             provenBy: ['J16'] },
  { n: 17, name: 'P2',                                                                provenBy: ['J17'] },
  { n: 18, name: 'Make Live',                                                         provenBy: ['J18'] },
  { n: 19, name: 'Run',                                                               provenBy: ['J19'] },
  { n: 20, name: 'Outbound delivery',                                                 provenBy: ['J20'] },
  { n: 21, name: 'Kill-switch safety',                                                provenBy: ['F-KILL'] },
  { n: 22, name: 'Replies / review',                                                  provenBy: ['J22'] },
  { n: 23, name: 'Meetings',                                                          provenBy: ['J23'] },
  { n: 24, name: 'Results',                                                           provenBy: ['J24'] },
  { n: 25, name: 'Completion',                                                        provenBy: ['J25'] },
  { n: 26, name: 'Retry / recovery / idempotency',                                    provenBy: ['F-DUP', 'F-RESTART'] },
]

/**
 * The 14 failure classes, verbatim from the founder's 18 Sep list.
 *
 * `requires` records the truths HE named for each class, so the report states what was proven
 * rather than only that something passed. They are prose on purpose: the assertions live in
 * the checks, and duplicating them here would create a second definition to drift.
 */
export const FAILURE_CLASSES = [
  {
    id: 'F-PROVIDER', name: 'Apollo: 401 · 402 · 422 credits · 422 malformed · 429 · 500 · timeout/hang · malformed body',
    requires: ['reservation released', 'correct icp_run_outcomes status', 'exactly one correctly-kinded task', 'PDL_CALLS=0', 'HUNTER_CALLS=0'],
    provenBy: [5, 7],
  },
  {
    id: 'F-DBREAD', name: 'A decisive DB read fails / relation is absent',
    requires: ['surface says UNREADABLE', 'never 0', 'never "nothing needs you"'],
    provenBy: [9],
  },
  {
    id: 'F-BROWSER', name: 'Browser/tab disappears after the server accepts work',
    requires: ['server-owned work still completes and is recorded'],
    provenBy: ['F-BROWSER'],
  },
  {
    id: 'F-RESTART', name: 'API/process restarts during automatic work',
    requires: ['persisted state survives', 'stuck detection works', 'one task', 'no duplicate work'],
    provenBy: ['F-RESTART'],
  },
  {
    id: 'F-DUP', name: 'Duplicate submit / double click / concurrent replicas',
    requires: ['one authoritative row/claim/outcome'],
    provenBy: ['F-DUP'],
  },
  {
    id: 'F-WEBHOOK', name: 'Duplicate, delayed, out-of-order or stripped-metadata webhook',
    requires: ['idempotent', 'retained', 'tasked when attribution is impossible'],
    provenBy: ['F-WEBHOOK'],
  },
  {
    id: 'F-STUCK', name: 'Automatic work exceeds its bound',
    requires: ['state → stuck', 'exactly one task across repeated detector runs', 'task linked to the row'],
    provenBy: [8],
  },
  {
    id: 'F-TIMEOUT', name: 'Upstream hangs',
    requires: ['bounded timeout', 'admin proxy returns 504 timeout:true', 'never "API unreachable"'],
    provenBy: [3],
  },
  {
    id: 'F-KILL', name: 'AUTO_OUTREACH_ENABLED unset',
    requires: ['zero sends through every send path', 'Make Live sends zero', 'Run records authority with zero sends'],
    provenBy: ['F-KILL'],
  },
  {
    id: 'F-SENDABLE', name: 'Prospect without an Apollo-verified business email reaches the send seam',
    requires: ['send refused independently of every other gate', 'Hunter never called'],
    provenBy: ['F-SENDABLE'],
  },
  {
    id: 'F-TENANT', name: 'Two-client isolation',
    requires: ['ICP/programme/reply/meeting truth never crosses client boundaries', 'reply goes only to the client actually emailed'],
    provenBy: ['F-TENANT'],
  },
  {
    id: 'F-MODEL', name: 'Model: throw · timeout · malformed JSON · refusal',
    requires: ['customer turn already durable', 'failure recorded', 'desk reflects failure', 'no silent retry loop'],
    provenBy: ['F-MODEL'],
  },
  {
    id: 'F-PAY', name: 'Stripe: missing programmeId · duplicate event · delayed event',
    requires: ['exception/task where needed', 'nothing granted twice'],
    provenBy: ['F-PAY'],
  },
  {
    id: 'F-INBOUND', name: 'Resend inbound: classifier throw · malformed payload',
    requires: ['classifier throw → reply retained unclassified + task', 'malformed payload → retained, never dropped'],
    provenBy: ['F-INBOUND'],
  },
]

/**
 * Resolve every journey and failure class against the checks that actually ran.
 *
 * @param results the run's own result list: `{ n, pass }`, where `n` is the check id.
 * @returns the two tables with a verdict per row, and the ids that nothing claimed.
 */
export function assessCoverage(results) {
  const passed = new Set(results.filter(r => r.pass).map(r => String(r.n)))
  const ran = new Set(results.map(r => String(r.n)))

  const verdict = (provenBy) => {
    if (!provenBy || provenBy.length === 0) return { proven: false, why: 'no check claims this row' }
    const missing = provenBy.filter(id => !ran.has(String(id)))
    if (missing.length) return { proven: false, why: `did not run: ${missing.join(', ')}` }
    const failed = provenBy.filter(id => !passed.has(String(id)))
    if (failed.length) return { proven: false, why: `failed: ${failed.join(', ')}` }
    return { proven: true, why: provenBy.join(' + ') }
  }

  const journeys = JOURNEYS.map(j => ({ ...j, ...verdict(j.provenBy) }))
  const classes = FAILURE_CLASSES.map(f => ({ ...f, ...verdict(f.provenBy) }))

  // ⚠️ AND THE OTHER DIRECTION: a check that ran but no row claims. That is not a failure —
  // Batch 1b's checks 0, 1, 2 and 10 are component and regression checks rather than journeys
  // — but it is reported, because an unclaimed check is usually a row somebody forgot to map.
  const claimed = new Set([...JOURNEYS, ...FAILURE_CLASSES].flatMap(r => r.provenBy.map(String)))
  const unclaimed = [...ran].filter(id => !claimed.has(id))

  return {
    journeys,
    classes,
    unclaimed,
    allProven: journeys.every(j => j.proven) && classes.every(c => c.proven),
  }
}

/** The evidence table, printed exactly as the contract asks for it. */
export function printCoverage(cov) {
  console.log('')
  console.log('══════════════════ §8.2 · THE 26 JOURNEYS ══════════════════')
  for (const j of cov.journeys) {
    const mark = j.proven ? '✅' : '❌'
    console.log(`  ${mark} ${String(j.n).padStart(2)} ${j.name.padEnd(62)} ${j.why}`)
  }
  console.log('')
  console.log('══════════════════ §8.2 · THE 14 FAILURE CLASSES ══════════════════')
  for (const f of cov.classes) {
    const mark = f.proven ? '✅' : '❌'
    console.log(`  ${mark} ${f.id.padEnd(12)} ${f.name}`)
    console.log(`     ${f.proven ? 'proved by' : 'UNPROVEN —'} ${f.why}`)
    console.log(`     required: ${f.requires.join(' · ')}`)
  }
  if (cov.unclaimed.length) {
    console.log('')
    console.log(`  ⚠️ checks that ran but no §8.2 row claims: ${cov.unclaimed.join(', ')}`)
    console.log('     (0/1/2/10 are component and regression checks, not journeys — expected)')
  }
}
