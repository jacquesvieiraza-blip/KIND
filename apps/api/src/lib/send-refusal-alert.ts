// ═══════════════════════════════════════════════════════════════════════════════════════
// A LIVE PROGRAMME'S SENDS ARE REFUSED → THE FOUNDER IS TOLD, ONCE PER PROGRAMME.
//
// ⚑ 2 Oct (#2547 · 7e, paying-client check). Two refusals stop every send for a client and
// were only ever a log line:
//   · `sender_unsafe` — the sending mailbox is ambiguous or shared live with another client;
//   · `preparation_changed` — the work being sent is no longer the work the client approved.
// Both last until a person acts, so the client's programme silently stops sending.
//
// ⚠️ ONCE PER PROGRAMME, NOT ONCE PER SEND. The refusal fires on every send attempt; this
// raises one operator task per (reason, programme) and emails only when that task is NEW. While
// it stays open, later refusals file nothing. When it is resolved and the problem returns, a new
// task (and email) follows.
//
// ⚠️ FIRE-AND-FORGET from the send gate: a failure here is logged and never changes the verdict.
// ═══════════════════════════════════════════════════════════════════════════════════════

export type ReportedRefusal = 'sender_unsafe' | 'preparation_changed'

export function sendRefusalTask(reason: ReportedRefusal, programmeId: string, clientId: string, detail: string) {
  const title = reason === 'sender_unsafe'
    ? 'A live programme cannot send: its sending mailbox is not safe to use'
    : 'A live programme cannot send: what it would send is no longer what the client approved'
  return {
    title,
    lines: [
      `Client ${clientId} · programme ${programmeId}.`,
      detail,
      reason === 'sender_unsafe'
        ? 'Every send for this client is refused until the mailbox is fixed in Vida → Engine (every mailbox of this client must be theirs alone and pass Test connection).'
        : 'Every send for this client is refused until the change is undone or the client approves the new version.',
    ],
    dedupeKey: `send_refused:${reason}:${programmeId}`,
  }
}

// Bounds the fallback below: with no task table, each process emails a programme once.
const emailedWithoutTask = new Set<string>()

export async function reportSendRefusal(reason: ReportedRefusal, programmeId: string, clientId: string, detail: string): Promise<'raised' | 'already_open' | 'emailed_without_task' | 'skipped'> {
  const t = sendRefusalTask(reason, programmeId, clientId, detail)
  const { raiseOperatorTask } = await import('./operator-tasks')
  const r = await raiseOperatorTask({
    kind: 'sends_stalled', severity: 'critical', title: t.title, detail: t.lines.join('\n'),
    clientId, programmeId, dedupeKey: t.dedupeKey, evidence: { reason },
  })
  if (r.ok && r.alreadyOpen) return 'already_open'
  if (!r.ok) {
    if (emailedWithoutTask.has(t.dedupeKey)) return 'skipped'
    emailedWithoutTask.add(t.dedupeKey)
  }
  const { sendFounderAlert } = await import('./alerts')
  // Same key: the email's mirror task collapses into the one raised above.
  await sendFounderAlert('sends_stalled', t.title, t.lines, { clientId, programmeId, dedupeKey: t.dedupeKey })
  return r.ok ? 'raised' : 'emailed_without_task'
}
