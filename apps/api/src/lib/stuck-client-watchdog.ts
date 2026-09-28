// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 28 Sep (founder, on the end-to-end walk) — IF A CLIENT IS STUCK, THE FOUNDER IS TOLD.
//
// Founder, after a paying client's Proof sat on "Your first examples are on their way" with
// nobody knowing: *"i would not be notified here. of anything. if a client is stuck we need to
// be notified."*
//
// 🛑 WHAT WAS MISSING. The pieces that notice existed — the overdue-work detector (XC-6) marks
// a silent Proof `stuck`, a failed Proof is recorded `failed`, a size check waits for a person,
// a programme holds for review — but they only ever wrote a Vida Needs-you row, and a failed
// Proof wrote nothing at all. Unless the founder was sitting in Vida, a client could wait
// forever. The client's own screen is founder-worded to promise that K.I.N.D is finishing the
// work (23 Sep copy, unchanged here) — this is what makes that promise true.
//
// WHAT IT DOES, every 10 minutes: finds each client waiting on US past a bound, and for each one
// raises ONE Needs-you task and sends ONE email — once per client per problem. While that task
// is open nothing is repeated; if the founder resolves it and the client is still stuck, it is
// raised again. It never retries or changes the work itself — it only makes sure a person knows.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

/** How long a client may wait on us before the founder must be told. */
export const STUCK_AFTER_MINUTES = {
  /** Proof: failed, or silent past its own bound (the detector's `stuck`), or overdue. */
  proof: 30,
  /** Paid, but the automatic start (P1 continuation / preparation) failed or went silent. */
  paid_not_started: 60,
  /** Price: their company size is waiting on a person. */
  price_waiting: 60,
  /** A programme held for the no-meeting review. */
  review_hold: 24 * 60,
} as const

export type StuckProblem = keyof typeof STUCK_AFTER_MINUTES

export type StuckFinding = {
  problem: StuckProblem
  clientId: string
  /** What the finding is about — the work unit, the programme or the client itself. */
  subjectId: string
  since: string
  reason: string | null
}

export type WorkRow = {
  id: string; kind: string; client_id: string | null; state: string
  requested_at: string | null; started_at: string | null; failed_at: string | null; stuck_at: string | null
  failure_reason: string | null
}
export type SizeRow = { id: string; size_review_reason: string | null; size_locked_at: string | null; size_checked_at: string | null }
export type ProgrammeRow = {
  id: string; client_id: string; status: string
  review_required_at: string | null; review_resolved_at: string | null
}

const PAID_WORK = new Set(['p1_continuation', 'programme_prepare'])
const TERMINAL_PROGRAMME = new Set(['COMPLETED', 'CANCELLED'])
const minutesSince = (iso: string | null, nowMs: number): number => {
  const t = iso ? new Date(iso).getTime() : NaN
  return Number.isFinite(t) ? (nowMs - t) / 60_000 : Number.POSITIVE_INFINITY
}

/**
 * Pure: which clients are stuck, from the rows as read. `work` must be the NEWEST unit per
 * (client, kind) — an older failure followed by a completed run is not a stuck client.
 */
export function findStuckClients(input: {
  work: WorkRow[]; sizes: SizeRow[]; programmes: ProgrammeRow[]; nowMs: number
}): StuckFinding[] {
  const out: StuckFinding[] = []
  for (const w of input.work) {
    if (!w.client_id) continue
    const problem: StuckProblem | null = w.kind === 'proof_run' ? 'proof' : PAID_WORK.has(w.kind) ? 'paid_not_started' : null
    if (!problem) continue
    // Failed or marked stuck: since then. Still requested/started: since it began.
    const since = w.state === 'failed' ? w.failed_at
      : w.state === 'stuck' ? (w.stuck_at ?? w.started_at ?? w.requested_at)
      : (w.state === 'requested' || w.state === 'started') ? (w.started_at ?? w.requested_at)
      : null
    if (!since) continue
    // A failure is stuck at once (nothing is running); a live unit only once past the bound.
    const bound = w.state === 'failed' ? 0 : STUCK_AFTER_MINUTES[problem]
    if (minutesSince(w.state === 'failed' ? since : (w.started_at ?? w.requested_at), input.nowMs) < bound) continue
    out.push({ problem, clientId: w.client_id, subjectId: w.id, since, reason: w.failure_reason })
  }
  for (const c of input.sizes) {
    if (!c.size_review_reason || c.size_locked_at) continue
    const since = c.size_checked_at
    if (minutesSince(since, input.nowMs) < STUCK_AFTER_MINUTES.price_waiting) continue
    out.push({ problem: 'price_waiting', clientId: c.id, subjectId: c.id, since: since ?? 'unknown', reason: c.size_review_reason })
  }
  for (const p of input.programmes) {
    if (TERMINAL_PROGRAMME.has(p.status) || !p.review_required_at) continue
    const resolvedAfter = p.review_resolved_at && new Date(p.review_resolved_at).getTime() >= new Date(p.review_required_at).getTime()
    if (resolvedAfter) continue
    if (minutesSince(p.review_required_at, input.nowMs) < STUCK_AFTER_MINUTES.review_hold) continue
    out.push({ problem: 'review_hold', clientId: p.client_id, subjectId: p.id, since: p.review_required_at, reason: null })
  }
  return out
}

const HEADLINE: Record<StuckProblem, string> = {
  proof: 'Proof has not reached them',
  paid_not_started: 'they have paid and the work has not started',
  price_waiting: 'their price is waiting on a company-size check',
  review_hold: 'their programme is held for review',
}
const ACTION: Record<StuckProblem, string> = {
  // ⛓️ 28 Sep (R172 · C1) — the button this names now exists for every failed or stuck run.
  proof: 'Vida → this client → Retry Proof. The reason is above; fix it first if it is ours, then press Retry Proof.',
  paid_not_started: 'Vida → this client → Programme. The reason is above; restart the preparation there once it is fixed.',
  price_waiting: 'Vida → this client → Client tools → Programme → "Company size": check it and set their band.',
  review_hold: 'Vida → this client → Programme → "Resolve review" once you have looked at it.',
}

/** The one key per client per problem — while its task is open, nothing is repeated. */
export const stuckDedupeKey = (f: StuckFinding): string => `stuck:${f.problem}:${f.clientId}:${f.subjectId}`

// ⚑ 28 Sep (R172 · C6) — `unmailed`: the task was filed but the EMAIL did not go (no key, no inbox,
// a provider error). Counted apart, because "told" must mean an email left, not that we tried.
export type WatchdogResult = { ok: boolean; found: number; told: number; alreadyOpen: number; unmailed?: number; error?: string }

/** Read, decide, and tell the founder — once per client per problem. Never throws. */
export async function runStuckClientWatchdog(opts: { nowMs: number }): Promise<WatchdogResult> {
  try {
    const recent = new Date(opts.nowMs - 14 * 24 * 60 * 60_000).toISOString()
    const [workRes, sizeRes, progRes] = await Promise.all([
      db.from('automatic_work')
        .select('id, kind, client_id, state, requested_at, started_at, failed_at, stuck_at, failure_reason')
        .in('kind', ['proof_run', 'p1_continuation', 'programme_prepare'])
        .gte('requested_at', recent)
        .order('requested_at', { ascending: false }).limit(2000),
      db.from('clients')
        .select('id, size_review_reason, size_locked_at, size_checked_at')
        .not('size_review_reason', 'is', null).is('size_locked_at', null).limit(500),
      db.from('programmes')
        .select('id, client_id, status, review_required_at, review_resolved_at')
        .not('review_required_at', 'is', null).limit(500),
    ])
    if (workRes.error) return { ok: false, found: 0, told: 0, alreadyOpen: 0, error: `automatic_work: ${workRes.error.message}` }

    // Newest unit per (client, kind): an older failure followed by a later run is history.
    const newest = new Map<string, WorkRow>()
    for (const w of (workRes.data ?? []) as WorkRow[]) {
      const k = `${w.client_id}:${w.kind}`
      if (!newest.has(k)) newest.set(k, w)
    }
    // A column or table that cannot be read hides that one check, never the others.
    const findings = findStuckClients({
      work: [...newest.values()],
      sizes: sizeRes.error ? [] : (sizeRes.data ?? []) as SizeRow[],
      programmes: progRes.error ? [] : (progRes.data ?? []) as ProgrammeRow[],
      nowMs: opts.nowMs,
    })
    if (findings.length === 0) return { ok: true, found: 0, told: 0, alreadyOpen: 0 }

    const ids = [...new Set(findings.map(f => f.clientId))]
    const { data: names } = await db.from('clients').select('id, company_name').in('id', ids)
    const nameOf = new Map(((names ?? []) as { id: string; company_name: string | null }[]).map(n => [n.id, n.company_name]))

    const { raiseOperatorTask } = await import('./operator-tasks')
    const { sendFounderAlert } = await import('./alerts')
    let told = 0
    let alreadyOpen = 0
    let unmailed = 0
    for (const f of findings) {
      const who = nameOf.get(f.clientId) || `client ${f.clientId.slice(0, 8)}`
      const title = `A client is stuck — ${who}: ${HEADLINE[f.problem]}`
      const lines = [
        `Client: ${who} (${f.clientId}).`,
        `Waiting since: ${f.since}.`,
        ...(f.reason ? [`Recorded reason: ${f.reason}`] : []),
        `What to do: ${ACTION[f.problem]}`,
        'You get this once. If you resolve the task and they are still stuck, you will be told again.',
      ]
      const dedupeKey = stuckDedupeKey(f)
      // ⚠️ THE TASK FIRST, THE EMAIL ONLY IF IT IS NEW. `sendFounderAlert` emails every time it
      // is called, so the open task is what stops a 10-minute email loop. The email then files
      // under the SAME key, so it cannot create a second row (the J22-C1 pattern).
      const task = await raiseOperatorTask({
        kind: 'support_escalation', severity: 'critical', title, detail: lines.join('\n'),
        clientId: f.clientId, subjectKind: `stuck_${f.problem}`, subjectId: f.subjectId, dedupeKey,
        evidence: { problem: f.problem, since: f.since, reason: f.reason },
      })
      if (!task.ok) continue                              // unrecorded → not emailed (no loop)
      if ('alreadyOpen' in task && task.alreadyOpen) { alreadyOpen++; continue }
      const sent = await sendFounderAlert('support_escalation', title, lines, {
        clientId: f.clientId, subjectKind: `stuck_${f.problem}`, subjectId: f.subjectId, dedupeKey,
      })
      if (sent?.emailOk === true) told++
      else {
        unmailed++
        console.error(`[watchdog] ${who} is stuck (${f.problem}) — the task is filed but NO EMAIL was sent. Check RESEND_API_KEY and FOUNDER_EMAIL.`)
      }
    }
    return { ok: true, found: findings.length, told, alreadyOpen, unmailed }
  } catch (err) {
    return { ok: false, found: 0, told: 0, alreadyOpen: 0, error: err instanceof Error ? err.message : String(err) }
  }
}
