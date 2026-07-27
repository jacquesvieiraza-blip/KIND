// A MESSAGE CARRIES ITS TONE (P3-1).
//
// Vida's cockpit had one `saveMsg` string and ten render sites, every one hardcoded to
// `text-[#0e7c86]` — teal, the success colour. Fifteen failure paths wrote into that same
// string: *"Could not save the ICP"*, *"Could not send the ask"*, *"Failed to load people"*,
// and the Run/Pause refusal added in #590.
//
// **Every error in the operator console rendered as a success.** Found on the screen whose
// entire prompt was about not lying, while fixing that screen.
//
// The fix is to make tone impossible to omit: the message is a `{ text, tone }` pair, so a
// caller cannot write a failure without saying it is one, and the class comes from the tone
// rather than from whatever was copied into the nearest JSX.

export type NoticeTone = 'ok' | 'error'

export type Notice = { text: string; tone: NoticeTone }

export const notice = {
  ok: (text: string): Notice => ({ text, tone: 'ok' }),
  error: (text: string): Notice => ({ text, tone: 'error' }),
}

/**
 * The class for a tone.
 *
 * `error` must be visually distinct from `ok` at a glance — an operator scanning a console
 * reads colour before words, which is exactly why fifteen failures went unnoticed in teal.
 */
export function noticeClass(tone: NoticeTone): string {
  return tone === 'error'
    ? 'text-red-700'
    : 'text-[#0e7c86]'
}

/** Coerce anything a catch block produced into a sentence, never an empty string. */
export function noticeText(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message.trim()) return e.message
  if (typeof e === 'string' && e.trim()) return e
  return fallback
}
