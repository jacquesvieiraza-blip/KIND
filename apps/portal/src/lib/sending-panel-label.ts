// ⚑ 2 Oct (#2551 · R187 ②) — the "Next send" cell of the client's sending panel.
export type SendingState = 'sending' | 'paused' | 'not_started' | 'finished' | 'on_hold'

// ⚑ 3 Oct (review S12) — a programme that cannot send says why, never "Due now".
const NOT_SENDING: Record<string, string> = {
  paused: 'Paused', not_started: 'Not started yet', finished: 'Finished', on_hold: 'On hold — our team is on it',
}

export function nextSendLabel(iso: string | null, now = new Date(), state?: SendingState | null): string {
  if (state === null) return '—'
  if (state && state !== 'sending') return NOT_SENDING[state]
  if (!iso) return 'Nothing scheduled'
  const d = new Date(iso)
  if (d.getTime() <= now.getTime()) return 'Due now'
  return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

