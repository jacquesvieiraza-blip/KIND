// ═══════════════════════════════════════════════════════════════════════════════════════
// NORTHWIND — THE WRITER. Sets the one client demo to any of the six stages (R164; GO 28 Sep).
// The rows themselves are `demo-northwind-data.ts`; this file only finds the login, clears the
// account and writes those rows.
//
// 🛑 IT CAN ONLY EVER TOUCH ONE ACCOUNT. Every destructive step first proves the client row is
// BOTH `is_demo = true` AND owned by the Northwind login (`northwind@kind-demo.internal`). A row
// that fails either check is refused, never cleared — a real client can share the name, it can
// never share that login.
//
// ⚠️ RESET = CLEAR, THEN BUILD. Clearing deletes the client row (everything hanging off it
// cascades) after removing the five references that do NOT cascade, found against the real
// schema: `meetings` (ON DELETE RESTRICT — cleared and written through `meeting-truth.ts`, the
// one write layer for meetings), `vida_sessions`, `vida_messages`,
// `opt_out_blocklist.blocked_by_client_id`, `unattributed_replies.resolved_client_id`.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { randomUUID } from 'node:crypto'
import { db } from '@kind/db'
import { millaStage, mvp1MillaStageFromLegacy } from '@kind/shared'
import { clearDemoMeetings, writeDemoMeetings } from './meeting-truth'
import {
  NORTHWIND_CAST, NORTHWIND_EMAIL, NORTHWIND_NAME, NORTHWIND_REPLIES,
  northwindRows, type NorthwindIds, type NorthwindStage,
} from './demo-northwind-data'

export * from './demo-northwind-data'

type Result = { ok: true; clientId: string | null; icpId: string | null; stage: NorthwindStage; counts: Record<string, number> }
  | { ok: false; error: string }

/** Find the Northwind login's auth user id, or null. */
export async function findNorthwindUserId(): Promise<string | null> {
  // Fast path: the demo client row names its owner.
  const { data: rows } = await db.from('clients').select('user_id').eq('company_name', NORTHWIND_NAME).eq('is_demo', true).limit(5)
  for (const r of (rows ?? []) as { user_id: string }[]) {
    const { data } = await db.auth.admin.getUserById(r.user_id)
    if (data?.user?.email?.toLowerCase() === NORTHWIND_EMAIL) return r.user_id
  }
  // At Brief there is no client row — look the login up directly.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`Could not read logins: ${error.message}`)
    const users = data?.users ?? []
    const hit = users.find(u => u.email?.toLowerCase() === NORTHWIND_EMAIL)
    if (hit) return hit.id
    if (users.length < 1000) break
  }
  return null
}

/** The Northwind login — found, or created once. Never has a usable password. */
export async function ensureNorthwindUser(): Promise<string> {
  const found = await findNorthwindUserId()
  if (found) return found
  const { data, error } = await db.auth.admin.createUser({
    email: NORTHWIND_EMAIL, password: `Nw-${randomUUID()}`, email_confirm: true,
  })
  if (error || !data?.user) throw new Error(`Could not create the demo login: ${error?.message ?? 'unknown'}`)
  return data.user.id
}

/** The Northwind client row for this login, proven to be the demo — or null when there is none. */
async function northwindClient(userId: string): Promise<{ id: string } | null> {
  const { data, error } = await db.from('clients').select('id, is_demo').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`Could not read the demo account: ${error.message}`)
  const row = data as { id: string; is_demo: boolean | null } | null
  if (!row) return null
  // 🛑 The login is Northwind's, so this row is Northwind's — but a demo reset must never clear
  // an account that is not flagged as a demo, whatever login it hangs off.
  if (row.is_demo !== true) throw new Error('The demo login owns an account that is not marked as a demo. Nothing was changed.')
  return { id: row.id }
}

/** Remove the Northwind account (and, unless kept, its Brief draft). The login survives. */
export async function wipeNorthwind(userId: string, opts: { keepDraft?: boolean } = {}): Promise<void> {
  const client = await northwindClient(userId)
  const must = async (what: string, p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await p
    if (error) throw new Error(`Could not clear ${what}: ${error.message}`)
  }
  if (client) {
    const id = client.id
    await clearDemoMeetings(id)
    await must('Vida messages', db.from('vida_messages').delete().eq('client_id', id))
    await must('Vida sessions', db.from('vida_sessions').delete().eq('client_id', id))
    await must('opt-out links', db.from('opt_out_blocklist').update({ blocked_by_client_id: null }).eq('blocked_by_client_id', id))
    await must('reply links', db.from('unattributed_replies').update({ resolved_client_id: null }).eq('resolved_client_id', id))
    await must('replies', db.from('figsy_replies').delete().eq('client_id', id))
    const { data: camps } = await db.from('figsy_campaigns').select('id').eq('client_id', id)
    const campIds = ((camps ?? []) as { id: string }[]).map(c => c.id)
    if (campIds.length) await must('sent emails', db.from('figsy_sent_emails').delete().in('campaign_id', campIds))
    await must('enrolments', db.from('figsy_enrollments').delete().eq('client_id', id))
    await must('sequences', db.from('figsy_sequences').delete().eq('client_id', id))
    await must('campaigns', db.from('figsy_campaigns').delete().eq('client_id', id))
    await must('the account', db.from('clients').delete().eq('id', id).eq('is_demo', true))
  }
  if (!opts.keepDraft) await must('the Brief', db.from('onboarding_brief_drafts').delete().eq('user_id', userId))
}

function freshIds(userId: string): NorthwindIds {
  return {
    userId, clientId: randomUUID(), icpId: randomUUID(), programmeId: randomUUID(),
    campaignId: randomUUID(), sequenceId: randomUUID(), sessionId: randomUUID(),
    leadIds: NORTHWIND_CAST.map(() => randomUUID()),
    replyIds: NORTHWIND_REPLIES.map(() => randomUUID()),
  }
}

/**
 * Set the demo to a stage: clear it, then write exactly what the account holds there.
 *
 * `keepDraft` is the Brief-confirm path: the presenter just walked the real Brief chat, so the
 * draft they confirmed stays and is marked as promoted into the demo account.
 */
export async function setNorthwindStage(
  stage: NorthwindStage,
  opts: { userId?: string; keepDraft?: boolean; now?: Date } = {},
): Promise<Result> {
  try {
    const userId = opts.userId ?? await ensureNorthwindUser()
    await wipeNorthwind(userId, { keepDraft: opts.keepDraft })
    const ids = freshIds(userId)
    const rows = northwindRows(stage, ids, opts.now ?? new Date())
    const counts: Record<string, number> = {}
    const put = async (table: string, value: Record<string, unknown> | Record<string, unknown>[] | null) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return
      const { error } = await db.from(table).insert(value as never)
      if (error) throw new Error(`Could not write ${table}: ${error.message}`)
      counts[table] = Array.isArray(value) ? value.length : 1
    }
    await put('clients', rows.client)
    await put('milla_sessions', rows.session)
    await put('milla_messages', rows.messages)
    if (rows.draft) {
      if (opts.keepDraft) {
        const { error } = await db.from('onboarding_brief_drafts')
          .update({ promoted_client_id: ids.clientId, promoted_at: new Date().toISOString() })
          .eq('user_id', userId)
        if (error) throw new Error(`Could not mark the Brief as promoted: ${error.message}`)
      } else {
        await put('onboarding_brief_drafts', rows.draft)
      }
    }
    // The programme's sending window is the product's own default (never typed here).
    const { DEFAULT_PROGRAMME_SEND_SCHEDULE } = await import('./programme-sequence')
    await put('programmes', rows.programme ? { ...rows.programme, send_schedule: DEFAULT_PROGRAMME_SEND_SCHEDULE } : null)
    await put('icps', rows.icp)
    await put('proof_pass_claims', rows.proofClaim)
    await put('figsy_campaigns', rows.campaign)
    await put('figsy_sequences', rows.sequence)
    await put('leads', rows.leads)
    await put('figsy_enrollments', rows.enrollments)
    await put('figsy_knowledge', rows.offer)
    await put('figsy_sent_emails', rows.sentEmails)
    await put('figsy_replies', rows.replies)
    if (rows.meetings.length) { await writeDemoMeetings(ids.clientId, rows.meetings); counts.meetings = rows.meetings.length }
    // ── THE FROZEN PACKAGE the client approves (people, messages, cadence) — built by the product's
    // own `buildPreparationSnapshot` from the rows just written, and hashed by it, so the Approval
    // screen shows exactly what a real client sees and Approve's drift check agrees with it.
    // Sender stays null: a demo can never hold a usable mailbox (R164 A).
    if (rows.programme) {
      const { buildPreparationSnapshot } = await import('./preparation-snapshot')
      const b = await buildPreparationSnapshot(ids.programmeId)
      if (!b.ok) throw new Error(`Could not freeze the demo programme: ${String((b as { degraded?: unknown }).degraded ?? 'unknown')}`)
      const frozenAt = new Date((opts.now ?? new Date()).getTime() - 18 * 86_400_000).toISOString()
      const { error } = await db.from('programmes').update({
        review_preparation_snapshot: b.snapshot, review_preparation_hash: b.hash,
        review_preparation_at: frozenAt, review_preparation_version: 1,
      }).eq('id', ids.programmeId)
      if (error) throw new Error(`Could not store the demo programme's frozen package: ${error.message}`)
    }
    if (rows.campaign && rows.sentEmails.length) {
      await db.from('figsy_campaigns').update({
        emails_sent: rows.sentEmails.length, replies_total: rows.replies.length,
        leads_enrolled: rows.enrollments.length, meetings_booked: rows.meetings.length,
      }).eq('id', ids.campaignId)
    }
    return { ok: true, clientId: rows.client ? ids.clientId : null, icpId: rows.icp ? ids.icpId : null, stage, counts }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Which of the six stages the demo is at right now — the same projection the client's ribbon uses. */
export async function readNorthwind(): Promise<{ userExists: boolean; clientId: string | null; stage: NorthwindStage }> {
  const userId = await findNorthwindUserId()
  if (!userId) return { userExists: false, clientId: null, stage: 'Brief' }
  const client = await northwindClient(userId)
  if (!client) return { userExists: true, clientId: null, stage: 'Brief' }
  const { data: c } = await db.from('clients').select('proof_completed_at').eq('id', client.id).maybeSingle()
  const { data: progs } = await db.from('programmes').select('status, created_at').eq('client_id', client.id)
    .order('created_at', { ascending: false }).limit(1)
  const status = ((progs ?? []) as { status: string }[])[0]?.status ?? null
  const legacy = millaStage({
    status: status as never,
    proofComplete: Boolean((c as { proof_completed_at?: string | null } | null)?.proof_completed_at),
  })
  return { userExists: true, clientId: client.id, stage: mvp1MillaStageFromLegacy(legacy) }
}

/** A one-click link that opens Milla as the Northwind login. Nothing is emailed. */
export async function northwindOpenUrl(): Promise<string | null> {
  await ensureNorthwindUser()
  const portal = process.env.PORTAL_URL || 'https://app.get-kind.com'
  const { data } = await db.auth.admin.generateLink({
    type: 'magiclink', email: NORTHWIND_EMAIL, options: { redirectTo: `${portal}/milla` },
  })
  const otp = (data?.properties as { email_otp?: string } | undefined)?.email_otp
  return otp ? `${portal}/demo-login?e=${encodeURIComponent(NORTHWIND_EMAIL)}&o=${encodeURIComponent(otp)}` : null
}

/**
 * The Brief-confirm hand-off. When the Northwind login confirms its Brief, the real promotion
 * would create an ordinary account and start sourcing real people. Instead the demo moves to
 * Proof with its own made-up cast. Ensure-shaped, like the promotion it stands in for: a replay
 * finds the account already built and changes nothing.
 */
export async function promoteNorthwindBrief(userId: string): Promise<{ ok: boolean; clientId?: string; icpId?: string; replayed?: boolean; reason?: string; detail?: string }> {
  try {
    const existing = await northwindClient(userId)
    if (existing) {
      const { data: icp } = await db.from('icps').select('id').eq('client_id', existing.id).limit(1).maybeSingle()
      return { ok: true, clientId: existing.id, icpId: (icp as { id?: string } | null)?.id, replayed: true }
    }
  } catch (e) {
    return { ok: false, reason: 'unreadable', detail: e instanceof Error ? e.message : String(e) }
  }
  const r = await setNorthwindStage('Proof', { userId, keepDraft: true })
  if (!r.ok) return { ok: false, reason: 'client_unwritable', detail: r.error }
  return { ok: true, clientId: r.clientId ?? undefined, icpId: r.icpId ?? undefined }
}
