// ⚑ 29 Sep (R174 ⑥ · PR 6b) — VIDA'S WORDS for a client's stage and a meeting's state, as plain
// functions so the screens and the guard (apps/api/src/lib/vida-words.test.ts) read one source.
import { mvp1VidaStage, type EngineLifecycleStage } from '@kind/shared'

/**
 * ⚑ 29 Sep (R174 ⑥ · PR 6b) — A CLIENT ROW NAMES ONE OF THE SIX (R127), and the finer step
 * under it only where one of the six covers two engine stages (Prepare = recommendation or
 * sourcing, Run = live or review). It printed the eight engine words, so the row and the ribbon
 * disagreed. An unknown stage keeps the label rather than printing nothing.
 */
export function clientRowStage(r: { stage?: string; stage_label: string }): string {
  if (!r.stage) return r.stage_label
  const six = mvp1VidaStage(r.stage as EngineLifecycleStage)
  if (!six) return r.stage_label
  return ['recommendation', 'sourcing', 'live', 'review'].includes(r.stage) ? `${six} · ${r.stage_label}` : six
}

/**
 * ⚑ 29 Sep (R174 ⑥ · PR 6b) — THE PANEL SAYS WHAT HAPPENED, not the table's state code. It
 * printed BOOKED / HELD / NO_SHOW raw. An unknown code is printed in plain case rather than
 * disappearing, so a new state is still visible.
 */
export const MEETING_STATE_WORD: Record<string, string> = {
  BOOKED: 'Booked', BOOKED_UNVERIFIED: 'Booked — not yet confirmed', HELD: 'Held', NO_SHOW: 'No-show',
}
export const meetingStateWord = (state: string): string =>
  MEETING_STATE_WORD[state] ?? state.charAt(0) + state.slice(1).toLowerCase().replace(/_/g, ' ')
