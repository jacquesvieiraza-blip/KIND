// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 · 4a) — DELETING A CLIENT'S ROWS, MOVED OUT OF THE MBF DEMO UNCHANGED.
//
// Founder: *"remove MBF"* (R164 ruled one demo — Northwind). The MBF seed/reset went with it,
// but two jobs lived in that file that are not about MBF: deleting a demo client row and all it
// owns (`DELETE /admin/demos/:id`), and wiping a test client's rows (`/seed-data/wipe-client`).
// They are moved here word for word; only the helper's name lost "Mbf" (`wipeMbf` → `wipeClientRows`).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

/** Every row a client owns, children first. It does not delete the client row itself. */
export async function wipeClientRows(clientId: string): Promise<void> {
  const { data: leads } = await db.from('leads').select('id').eq('client_id', clientId).limit(2000)
  const leadIds = (leads ?? []).map((l: { id: string }) => l.id)
  const { data: camps } = await db.from('figsy_campaigns').select('id').eq('client_id', clientId).limit(100)
  const campIds = (camps ?? []).map((c: { id: string }) => c.id)

  // Children first — anything holding a lead_id or campaign_id goes before the parents.
  if (campIds.length > 0) {
    await db.from('figsy_sent_emails').delete().in('campaign_id', campIds).then(() => {}, () => {})
  }
  await db.from('figsy_replies').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('calendar_bookings').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('figsy_enrollments').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('outcome_events').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('figsy_approval_queue').delete().eq('client_id', clientId).then(() => {}, () => {})
  if (leadIds.length > 0) await db.from('leads').delete().in('id', leadIds).then(() => {}, () => {})
  await db.from('figsy_sequences').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('figsy_campaigns').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('icps').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('credit_transactions').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('sourcing_ledger').delete().eq('client_id', clientId).then(() => {}, () => {})
}

/**
 * PURGE A DEMO CLIENT — actually delete it, rows and all.
 *
 * `DELETE /admin/demos/:id` only ever set `demo_expires_at`, so "Delete" removed nothing:
 * the client row stayed, its leads stayed, and on the legacy Apollo demos that meant real
 * strangers' names and companies stayed in the database — the exact thing the one-demo rule
 * exists to stop. The button said "cannot be undone" over a no-op.
 *
 * REFUSES anything that is not flagged `is_demo`. That check is the whole safety of this
 * function: it is the only place in the codebase that deletes a client row, and a real
 * client deleted here is unrecoverable.
 */
export async function purgeDemoClient(clientId: string): Promise<{ purged: boolean; reason?: string }> {
  const { data: c } = await db.from('clients')
    .select('id, is_demo, user_id, company_name').eq('id', clientId).maybeSingle()
  if (!c) return { purged: false, reason: 'No such client.' }
  if (c.is_demo !== true) return { purged: false, reason: 'Refusing — that client is not a demo account.' }

  // Everything the client owns, children first (children first).
  await wipeClientRows(clientId)
  // Rows `wipeClientRows` does not touch, which an older demo might hold.
  for (const t of ['figsy_memory', 'client_inboxes', 'subscriptions', 'push_subscriptions', 'milla_messages', 'milla_sessions', 'operator_audit_log']) {
    await db.from(t).delete().eq('client_id', clientId).then(() => {}, () => {})
  }
  const { error } = await db.from('clients').delete().eq('id', clientId).eq('is_demo', true)
  if (error) return { purged: false, reason: error.message }

  // The throwaway auth user goes too, so a deleted demo cannot be signed into.
  if (c.user_id) await db.auth.admin.deleteUser(c.user_id as string).then(() => {}, () => {})
  console.log(`[demo] purged ${c.company_name ?? clientId} — client row and all owned rows deleted`)
  return { purged: true }
}
