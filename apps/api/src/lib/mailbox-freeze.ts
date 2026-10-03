// ═══════════════════════════════════════════════════════════════════════════════════════
// AN APPROVED PROGRAMME'S MAILBOXES DO NOT CHANGE UNDER IT.
//
// ⛓️ R189 ② (2 Oct): the two mailboxes are "set up before approval and approved together …
// nothing changes after approval, so nothing stops". R185 ③: never add a mailbox to a live
// programme to raise its volume. Card #2559: adding a mailbox, switching one live or releasing
// one changed the sender the client approved, and every send was then refused as
// `preparation_changed` — silently, with nobody told.
//
// So on a client whose open programme is approved and running, Vida's add, assign and
// status-change buttons are REFUSED with the reason and the way through. Fixing a password is
// allowed (it does not change which mailboxes send — though the mailbox must pass Test
// connection again before it sends, #2602).
// ═══════════════════════════════════════════════════════════════════════════════════════

// ⛓️ 3 Oct (review S2 · S6) — THE FIRST VERSION HAD NO WAY OUT. It froze every approved open
// programme, and nothing ever clears `approved_at`, so "pause, change, approve again" unlocked
// nothing: the founder could not even retire a bouncing or compromised mailbox, nor switch a
// warmed branded box live. Now:
//   · only an approved programme that is RUNNING (not paused) is frozen;
//   · stopping a mailbox (released / retired) is ALWAYS allowed — it never sends from a new box,
//     and the changed sender then stops sends until re-approved, which is the safe direction;
//   · recording a warming mailbox is allowed (it sends nothing);
//   · the sentence names the path that exists: pause → change → New version for approval →
//     you approve → the client approves in Milla → resume (#2544 item 6).
export const MAILBOX_FROZEN_COPY =
  "This client's programme is approved and running, and its mailboxes were approved with it (R189). Changing one now would stop every send. To change it: pause the programme, make the change, press \"New version for approval\", approve the emails here, and once the client has approved them in Milla, resume. Releasing or retiring a mailbox is always allowed."

export type MailboxChange =
  | { kind: 'assign' }
  | { kind: 'add'; status: string }
  | { kind: 'status'; to: string }

/** Changes that can never put a new mailbox in front of a prospect. */
export function changeIsAlwaysSafe(change: MailboxChange): boolean {
  if (change.kind === 'status') return change.to === 'released' || change.to === 'retired'
  if (change.kind === 'add') return change.status === 'warming'
  return false
}

/** The refusal sentence, or null when the change may go ahead. An unreadable answer refuses. */
export async function mailboxChangeRefusal(clientId: string, change: MailboxChange): Promise<string | null> {
  if (changeIsAlwaysSafe(change)) return null
  const { db } = await import('@kind/db')
  const { TERMINAL_STATUSES } = await import('./programme')
  const { data, error } = await db.from('programmes')
    .select('id, approved_at, paused_at').eq('client_id', clientId)
    .not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
  if (error) return `Whether this client's programme is approved could not be checked (${error.message}), so no mailbox was changed.`
  return ((data ?? []) as { approved_at: string | null; paused_at: string | null }[])
    .some(p => !!p.approved_at && !p.paused_at) ? MAILBOX_FROZEN_COPY : null
}
