// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C10 · A PENDING ICP REVIEW IS A VIDA NEEDS-YOU
//
// ── THE DEFECT ──────────────────────────────────────────────────────────────────────────
//
// A client described their own market in their own words, our CLOSED provider vocabularies
// could not take part of it, and `deriveProviderReview` correctly kept their words and flagged
// the ICP. From that moment: Proof cannot start, no provider spend is possible, and the client
// has been told *"your targeting is being prepared"*. A person has to translate it.
//
// 🛑 AND NOTHING TOLD ANYBODY. There is a dedicated rail — `GET /operator/icp-review` — but
// R117 wants ONE queue, and `vida-operator-tasks.ts` opens with what the split cost:
// *"Northvale's ICP sat in unresolved `icp_review`, nothing ran, and Vida said no action was
// needed."* A rail nobody is sent to is a list nobody reads. J5-C2 built the Milla half of
// this item (`needs_icp_review` on the summary); this is Vida's half.
//
// ── WHY A DETECTOR AND NOT ONLY AN EVENT ────────────────────────────────────────────────
//
// A pending review is a persisted CONDITION (two columns on `icps`), not an event. An
// event-only raise at the write site would never find the reviews already sitting there —
// which is Northvale exactly: the event happened before the mechanism existed. So the sweep
// is the mechanism, and the write path calls the SAME raise for immediacy, because a client
// who has just confirmed their brief should not wait a cron tick for anybody to know.
//
// ⚠️ ONE MECHANISM, TWO TRIGGERS — NOT TWO MECHANISMS. Both ask `icpNeedsReview`, the one
// predicate the Proof gate and the Milla desk already use, and both raise with the same dedupe
// key, so the partial unique index makes them idempotent against each other. This is
// deliberately NOT a second opinion about whether a client is in review: there is exactly one,
// and a second would be the defect class this package spends most of its guards on.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { icpNeedsReview, PROVIDER_FIELD_LABEL, type ProviderField } from './icp-provider-translation'
import { raiseOperatorTask, resolveOperatorTasksForCondition, dedupeKeyFor } from './operator-tasks'

/** The task class, in one place, so the raise and the clear cannot disagree. */
const KIND = 'icp_review_pending' as const

/**
 * ⚠️ THE KEY IS THE ICP, NOT THE CLIENT. A client can hold more than one ICP and each needs
 * its own translation; keying per client would silently drop the second one's row on the floor.
 */
function keyFor(clientId: string | null, icpId: string): string {
  return dedupeKeyFor({ clientId: clientId ?? undefined, subjectKind: 'icp', subjectId: icpId })
}

type ReviewRow = {
  id: string
  client_id: string | null
  name: string | null
  icp_review: unknown
  icp_review_at: string | null
  icp_review_resolved_at: string | null
}

/** Which fields a person still has to translate, in the words Vida shows an operator. */
function fieldsOwed(review: unknown): string[] {
  const reqs = (review as { requirements?: Array<{ field?: unknown }> } | null)?.requirements
  if (!Array.isArray(reqs)) return []
  const out: string[] = []
  for (const r of reqs) {
    const f = r?.field
    if (typeof f === 'string' && f in PROVIDER_FIELD_LABEL) out.push(PROVIDER_FIELD_LABEL[f as ProviderField])
  }
  return [...new Set(out)]
}

/**
 * The sentence an operator reads in the queue.
 *
 * ⚠️ IT NAMES THE COMPANY AND THE FIELDS. "An ICP needs review" is a row somebody has to open
 * to understand; the company plus the fields owed is a row they can act on from the list.
 */
function sentence(company: string | null, fields: string[]): string {
  const who = (company ?? '').trim() || 'A client'
  const what = fields.length > 0 ? fields.join(' and ') : 'part of their targeting'
  return `${who} — we cannot translate their ${what.toLowerCase()} for the provider yet, so nothing can run`
}

const DETAIL =
  'The client described their market in their own words and our closed provider vocabulary '
  + 'could not take part of it. Their exact words are on the ICP review rail; supply '
  + 'provider-safe values there and the block clears by itself. Proof and every provider spend '
  + 'are refused until it does, and the client has been told their targeting is being prepared.'

export interface RaiseReviewTaskResult {
  ok: boolean
  /** True when a row was created. False when one was already open, which is not a failure. */
  raised: boolean
  error?: string
  tableMissing?: boolean
}

/**
 * Raise the Needs-you for ONE pending review. Idempotent, and safe to call from anywhere.
 *
 * ⚠️ IT NEVER THROWS AND NEVER FAILS ITS CALLER. A promotion that succeeded must not be
 * reported as broken because the queue could not be written to — the review itself is on the
 * row either way, and the sweep will find it on the next tick.
 */
export async function raiseIcpReviewTask(input: {
  icpId: string
  clientId: string | null
  companyName?: string | null
  review: unknown
}): Promise<RaiseReviewTaskResult> {
  try {
    const t = await raiseOperatorTask({
      kind: KIND,
      // ⚠️ `warn`, NOT `critical`. Nothing is being lost or spent — a client is WAITING, which
      // matters and is not an emergency. Reserving `critical` for money keeps it meaningful.
      severity: 'warn',
      clientId: input.clientId,
      subjectKind: 'icp',
      subjectId: input.icpId,
      dedupeKey: keyFor(input.clientId, input.icpId),
      title: sentence(input.companyName ?? null, fieldsOwed(input.review)),
      detail: DETAIL,
      // ⚠️ THE CLIENT'S WORDS ARE NOT COPIED INTO EVIDENCE. They are on the ICP already, the
      // rail renders them, and this table is copied into resolution notes — so the row carries
      // ids and field names, and the operator reads the words from the one place that owns them.
      evidence: { icp_id: input.icpId, fields: fieldsOwed(input.review) },
    })
    if (!t.ok) return { ok: false, raised: false, error: t.error, tableMissing: t.tableMissing }
    return { ok: true, raised: t.alreadyOpen !== true }
  } catch (err) {
    return { ok: false, raised: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * The review has been resolved, so the row closes itself.
 *
 * ⚠️ CALLED BY THE RESOLVE ROUTE, AND NOT FAILED ON. The operator has already supplied
 * provider-safe values and the flag is already cleared; refusing their resolution because a
 * task row would not close would be the tail wagging the dog.
 */
export async function clearIcpReviewTask(
  clientId: string | null, icpId: string,
): Promise<{ ok: boolean; closed: number; error?: string }> {
  const out = await resolveOperatorTasksForCondition(
    KIND, keyFor(clientId, icpId),
    'The ICP review was resolved — provider-safe values were supplied, so this no longer needs anybody.',
  )
  return { ok: out.ok, closed: out.closed, error: out.error }
}

export interface DetectReviewsResult {
  ok: boolean
  checked: number
  raised: number
  failed: number
  error?: string
}

/**
 * Sweep every unresolved ICP review into the queue.
 *
 * 🛑 IT READS THE SAME QUERY AS THE RAIL, and then asks `icpNeedsReview` anyway. The column
 * filters narrow the read; the predicate is what DECIDES — so this can never raise for a
 * client the Proof gate and the Milla desk consider fine.
 *
 * ⚠️ AN UNREADABLE ANSWER IS `ok: false`, NEVER "no reviews". "Nothing needs you" over a
 * failed read is the single inversion the whole Needs-you design exists to prevent, and it is
 * most dangerous in the thing whose job is to find what needs doing.
 *
 * ⚠️ ONE BAD ROW MUST NOT STOP THE SWEEP. A detector that abandons the list on its first
 * error reports one problem and hides the rest.
 *
 * Intended to be called from a CRON-CLAIMED slot, so two replicas cannot both sweep.
 */
export async function detectPendingIcpReviews(opts?: { limit?: number }): Promise<DetectReviewsResult> {
  let rows: ReviewRow[]
  try {
    const { data, error } = await db.from('icps')
      .select('id, client_id, name, icp_review, icp_review_at, icp_review_resolved_at')
      .not('icp_review', 'is', null)
      .is('icp_review_resolved_at', null)
      .order('icp_review_at', { ascending: true })
      .limit(opts?.limit ?? 200)
    if (error) {
      const msg = error.message ?? String(error)
      console.error(`[icp-review] detector read failed: ${msg}`)
      return { ok: false, checked: 0, raised: 0, failed: 0, error: msg }
    }
    rows = (data ?? []) as ReviewRow[]
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[icp-review] detector read threw: ${msg}`)
    return { ok: false, checked: 0, raised: 0, failed: 0, error: msg }
  }

  let raised = 0
  let failed = 0
  // Company names for the rows that have a client, read in ONE query rather than per row.
  const names = new Map<string, string | null>()
  const clientIds = [...new Set(rows.map(r => r.client_id).filter((v): v is string => !!v))]
  if (clientIds.length > 0) {
    try {
      const { data } = await db.from('clients').select('id, company_name').in('id', clientIds)
      for (const c of (data ?? []) as Array<{ id: string; company_name: string | null }>) {
        names.set(c.id, c.company_name ?? null)
      }
    } catch { /* the queue row is still worth raising without the company name */ }
  }

  for (const r of rows) {
    if (!icpNeedsReview(r.icp_review, r.icp_review_resolved_at)) continue
    const out = await raiseIcpReviewTask({
      icpId: r.id,
      clientId: r.client_id,
      companyName: r.client_id ? names.get(r.client_id) ?? null : null,
      review: r.icp_review,
    })
    if (!out.ok) { failed += 1; continue }
    if (out.raised) raised += 1
  }

  return { ok: true, checked: rows.length, raised, failed }
}
