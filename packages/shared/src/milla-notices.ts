// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R162) — WHAT MILLA TELLS A CLIENT WHEN THEIR PROGRAMME MOVES, IN ONE PLACE.
//
// The founder's House walk: Milla's "this is now version 4" lines vanished on a refresh — they
// were drawn on screen and never kept. These sentences are now SAVED into the client's Milla
// thread, and the server composes them from a KIND, never from text the browser sends, so a
// client screen cannot put words in Milla's mouth. Milla's screen draws the same sentences
// from the same function, so what is shown and what is kept cannot differ.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { MILLA_STAGES } from './programme-stage'

export const MILLA_NOTICE_KINDS = ['new_version', 'first', 'second', 'live', 'paused', 'resumed', 'stage'] as const
export type MillaNoticeKind = (typeof MILLA_NOTICE_KINDS)[number]

/** The client-facing stage names a `stage` notice may carry — Milla's own list; anything else is refused. */
export const MILLA_NOTICE_STAGES: readonly string[] = MILLA_STAGES

export function isMillaNoticeKind(k: unknown): k is MillaNoticeKind {
  return typeof k === 'string' && (MILLA_NOTICE_KINDS as readonly string[]).includes(k)
}

/**
 * The sentences for one notice. `param` is a version number for `new_version` and a stage name
 * for `stage`; it is ignored otherwise. `null` means the notice cannot be composed (unknown kind,
 * or a stage outside the list) and nothing is shown or kept.
 */
export function millaNoticeLines(kind: MillaNoticeKind, param?: string | number | null): string[] | null {
  switch (kind) {
    case 'new_version': {
      const n = typeof param === 'number' ? param : Number(param)
      const which = Number.isInteger(n) && n > 0 ? `version ${n}` : 'a new version'
      return [
        `I’ve rewritten your emails — this is now ${which}, and your screen has updated to show it.`,
        'Please read them again before you approve. Nothing has been sent.',
      ]
    }
    case 'first':   return ['Your programme is authorised — I’m finding and preparing your people now. Nothing is sent until you approve.']
    case 'second':  return ['Your programme is fully authorised. It goes live next — nothing is sent until then.']
    case 'live':    return ['Your programme is now live.']
    case 'paused':  return ['Your programme is paused. Nothing is being sent.']
    case 'resumed': return ['Your programme has resumed.']
    case 'stage': {
      const s = typeof param === 'string' ? param : ''
      return MILLA_NOTICE_STAGES.includes(s)
        ? [`Your programme has moved on to ${s} — this screen has updated.`]
        : null
    }
  }
}
