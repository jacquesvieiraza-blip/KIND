// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C11 · A CLIENT'S REASON AND THEIR NOTE ARE DURABLE BEFORE THEY ARE ACKNOWLEDGED (LR 17)
//
// ── WHAT THIS REPLACES, AND IT IS THE SAME TWO LINES TWICE ──────────────────────────────
//
//     async function sendNote(leadId) {
//       const text = noteText.trim()
//       setNoteFor(null); setNoteText('')          // ← the box closes, the words are ERASED
//       try { await api.post(…) }
//       catch { /* never surfaced: … a lost note is not their problem */ }
//     }
//
// 🛑 THE ACKNOWLEDGEMENT CAME FIRST AND THE EVIDENCE CAME SECOND. The client types *"too
// corporate, we want independent agencies"*, presses Send, and the box closes and clears
// before the request is made. If the write fails, their sentence no longer exists anywhere —
// not on the server, not on their screen, not in their hands. Nothing is told and nothing is
// retried. `sendReason` is the same shape: `setJustPassed(null)` dismisses the chip row, then
// the POST, then a silent catch.
//
// ⚠️ AND THE CHIP IS NOT A NICETY, WHICH ITS OWN COMMENT SAYS. *"THIS TAP IS A SPEND GATE
// OPENING, AND SOMETIMES A LOOP CLOSING"* — the reason unlocks "Show me stronger examples" on
// attempt 1, and on attempt 2 the same tap can be the trigger that hands the client to a
// person. A silently lost reason means the client taps and the gate never opens, with nothing
// on screen to say why.
//
// ── WHAT IT DOES NOT CHANGE — THE P32 RULE STANDS ───────────────────────────────────────
//
// *"One tap, never mandatory, never blocks the action."* The ACTION is the pass, and the pass
// completed on its own route before either of these is offered. Nothing here makes a reason or
// a note required, gates the next card, or delays anything the client can do. What changes is
// that we stop claiming to have saved something we did not: the words stay in their hands, the
// failure is stated once, and resending is one tap rather than retyping.
// ══════════════════════════════════════════════════════════════════════════════════════════

/** Founder-plain, and it claims nothing: it does not promise a later save or blame anyone. */
export const NOTE_FAILED_COPY =
  'Milla couldn’t save that just now — your words are still here. Send it again whenever you like.'

/** Attempts in total, including the first. Two retries is the repo's shape for a network op. */
export const NOTE_ATTEMPTS = 3

/** Backoff between attempts, in milliseconds. Short: someone is watching this happen. */
export const NOTE_BACKOFF_MS = [400, 1200] as const

export type NoteOutcome =
  /** It is durable. Only now may the screen acknowledge it. */
  | { kind: 'saved' }
  /**
   * It is NOT durable, after every attempt. The screen keeps the client's words and says so.
   * `attempts` is what actually happened, never what was configured.
   */
  | { kind: 'failed'; message: string; attempts: number }

/**
 * Send something the client wrote, and do not report success until it is stored.
 *
 * ⚠️ THE RETRY IS BOUNDED AND THE COUNT IS REPORTED. An unbounded retry on a screen someone is
 * watching is a spinner that never ends, and a retry whose count nobody can see is a claim
 * about behaviour rather than a record of it.
 *
 * ⚠️ `wait` IS INJECTABLE SO THE GUARD IS NOT A SLEEP. A test that really waited 1.6 seconds
 * to prove a backoff is a test people delete.
 */
export async function saveDurably(
  send: () => Promise<unknown>,
  opts?: { attempts?: number; wait?: (ms: number) => Promise<void> },
): Promise<NoteOutcome> {
  const total = Math.max(1, opts?.attempts ?? NOTE_ATTEMPTS)
  const wait = opts?.wait ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)))
  for (let attempt = 1; attempt <= total; attempt++) {
    try {
      await send()
      return { kind: 'saved' }
    } catch {
      // ⚠️ NO BACKOFF AFTER THE LAST ATTEMPT. Waiting after the final failure delays the
      // sentence that tells the client what happened, for nothing.
      if (attempt < total) {
        await wait(NOTE_BACKOFF_MS[Math.min(attempt - 1, NOTE_BACKOFF_MS.length - 1)])
      }
    }
  }
  return { kind: 'failed', message: NOTE_FAILED_COPY, attempts: total }
}
