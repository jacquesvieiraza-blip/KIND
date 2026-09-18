// ══════════════════════════════════════════════════════════════════════════════════════════
// J3-C5 · A FAILED RESTORE SAYS SO — it is never rendered as a new conversation
//
// ── THE DEFECT ──────────────────────────────────────────────────────────────────────────
//
// `MillaConversation` restores the thread on mount and ended with:
//
//     } catch { /* no thread yet — the greeting stands on its own */ }
//
// 🛑 TWO OPPOSITE FACTS, ONE BRANCH. "This client has never spoken to Milla" and "we could not
// read what they said" produce the identical screen: the greeting, alone, as if the
// conversation were beginning. A client with twenty turns of history sees a blank thread and a
// friendly hello.
//
// ⚠️ AND IT IS WORSE THAN A COSMETIC LIE, because the composer still works. `send()` resolves
// the canonical session for itself, so their next sentence lands in the REAL thread — joining a
// history the screen has just told them does not exist. They re-explain things they already
// said, to a Milla who was given the whole transcript as context.
//
// LR 17 is that our failure never costs them their words; LR 21 is that a failed read is
// reported rather than rendered as an answer. This is both, on the one screen the product is.
//
// ── WHY IT IS A PURE RULE ───────────────────────────────────────────────────────────────
//
// Four states, and three of them have a wrong screen: an alarm over a genuine first visit, a
// greeting over a failure, and either one over a thread that loaded fine. A `catch` in an
// effect cannot be driven through those; this can, and is.
// ══════════════════════════════════════════════════════════════════════════════════════════

export type RestoreRead =
  /** Rows came back — however many, including none. */
  | { ok: true; count: number }
  /** The session list or the message read failed. */
  | { ok: false; error: string }
  /** Still in flight. */
  | { ok: 'pending' }

export type RestoreView =
  /** Say nothing: the thread is on screen, or this really is a first conversation. */
  | { kind: 'silent'; message?: undefined; greet: boolean }
  /** We could not read their thread. Say so, and do NOT greet them as if new. */
  | { kind: 'unreadable'; message: string; greet: false }
  /** Still loading. Neither claim. */
  | { kind: 'loading'; message?: undefined; greet: false }

/**
 * The sentence for a thread we could not read.
 *
 * ⚠️ IT SAYS THEIR WORDS ARE SAFE, because they are — the transcript is in `milla_messages`
 * and this is a read failure, not a loss. Telling somebody their conversation "could not be
 * loaded" without that is an invitation to assume the worse thing.
 *
 * ⚠️ AND IT WARNS THEM THAT MILLA CAN STILL SEE IT. Otherwise they re-explain what they have
 * already said, which is the concrete cost of the old behaviour.
 */
export const RESTORE_FAILED_COPY =
  'We could not load your earlier conversation just now — it is not lost, and Milla can still '
  + 'see it. Reload in a moment to bring it back.'

export function restoreView(read: RestoreRead): RestoreView {
  if (read.ok === 'pending') return { kind: 'loading', greet: false }
  if (read.ok === false) return { kind: 'unreadable', message: RESTORE_FAILED_COPY, greet: false }
  // 🛑 `count === 0` IS THE ONLY STATE THAT EARNS THE GREETING. It is a read that worked and
  // found nothing, which is a genuine first conversation — the one case the old `catch` was
  // written for, and the only one it was right about.
  return { kind: 'silent', greet: read.count === 0 }
}
