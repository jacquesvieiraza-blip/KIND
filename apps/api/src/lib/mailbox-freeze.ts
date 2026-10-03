// ═══════════════════════════════════════════════════════════════════════════════════════
// AN APPROVED PROGRAMME'S MAILBOXES DO NOT CHANGE UNDER IT.
//
// ⛓️ R189 ② (2 Oct): the two mailboxes are "set up before approval and approved together …
// nothing changes after approval, so nothing stops". R185 ③: never add a mailbox to a live
// programme to raise its volume. Card #2559: adding a mailbox, switching one live or releasing
// one changed the sender the client approved, and every send was then refused as
// `preparation_changed` — silently, with nobody told.
//
// So on a client whose open programme is approved (or live), Vida's add, assign and
// status-change buttons are REFUSED with the reason and the way through. Recording a branded
// mailbox that is still warming is allowed (it sends nothing), and so is fixing a password
// (it does not change which mailboxes send).
// ═══════════════════════════════════════════════════════════════════════════════════════

export const MAILBOX_FROZEN_COPY =
  "This client's programme is approved, and its mailboxes were approved with it (R189). Changing them now would stop every send. To change a mailbox: pause the programme, make the change, then ask the client to approve again."

/** The refusal sentence, or null when the change may go ahead. An unreadable answer refuses. */
export async function mailboxChangeRefusal(clientId: string): Promise<string | null> {
  const { db } = await import('@kind/db')
  const { TERMINAL_STATUSES } = await import('./programme')
  const { data, error } = await db.from('programmes')
    .select('id, approved_at').eq('client_id', clientId)
    .not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
  if (error) return `Whether this client's programme is approved could not be checked (${error.message}), so no mailbox was changed.`
  return ((data ?? []) as { approved_at: string | null }[]).some(p => !!p.approved_at) ? MAILBOX_FROZEN_COPY : null
}
