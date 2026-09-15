// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CUSTOMER'S TYPED SENTENCE, CARRIED ACROSS ONE NAVIGATION — AND CLAIMED EXACTLY ONCE.
//
// ── THE DEFECT THIS EXISTS FOR (O1, 15 Sep) ────────────────────────────────────────────
//
// `AgentColumn`'s Milla card has a composer. A customer types into it, presses send, and the
// card's `onSend` NAVIGATES — it does not chat, because the second stateless `/milla/chat`
// engine was removed from that card on 14 Sep and must stay removed. The sentence they typed
// was handed to `router.push('/dashboard/assistant?q=…')` and then died twice over:
//
//   1. `middleware.ts` rewrites every signed-in `/dashboard/*` to `/milla/*` with
//      `new URL(path, base)` — which CARRIES NO QUERY STRING. `?q=` was gone before the
//      destination existed.
//   2. Nothing at the destination has ever read `?q=`. Not `/dashboard/assistant`, not
//      `(milla)/milla/chat/page.tsx`, not `MillaConversation`.
//
// So the customer typed a sentence, watched the screen change, and Milla greeted them as if
// they had said nothing. Founder ruling: THE CUSTOMER NEVER RETYPES BECAUSE OUR SYSTEM
// FAILED. Losing their words at a navigation we chose to perform is our failure, not theirs.
//
// ── WHAT THIS IS, AND WHAT IT DELIBERATELY IS NOT ──────────────────────────────────────
//
// ⚠️ THIS IS NOT A MESSAGE STORE, AND IT IS NOT A SECOND MILLA. It holds ONE in-flight
// sentence for the length of ONE navigation and then destroys it. It talks to no endpoint,
// keeps no history, and has no opinion about what Milla does with the words. The message is
// persisted by exactly one mechanism — `POST /milla/sessions/:id/chat` writing to
// `milla_messages`, the same route the canonical conversation has always used. Nothing here
// duplicates that, and nothing here is readable after the claim.
//
// ⚠️ CLAIM-ONCE IS THE WHOLE DESIGN. `claimMillaHandoff` DELETES BEFORE IT RETURNS, so a
// second reader — React's StrictMode double-mount in dev, a re-render, a back-navigation,
// two tabs racing the same key — gets `null` and sends nothing. That is what makes "persisted
// exactly once" a property of the mechanism rather than a hope about call sites.
//
// ⚠️ THE PATTERN IS ALREADY IN THIS REPO. `VidaConversation.tsx` carries an ICP handoff
// across a navigation through `sessionStorage` in exactly this shape. A new mechanism would
// be a second way to do a thing we already do; this is the existing one, made claim-once.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * The slice of the Web Storage API this needs — nothing more.
 *
 * ⚠️ INJECTABLE ON PURPOSE. `sessionStorage` does not exist on the server, throws outright in
 * some privacy modes, and cannot be driven by a test. Taking the store as an argument is what
 * lets the RED→GREEN proof drive the REAL functions rather than a re-implementation of them.
 */
export interface HandoffStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * ONE key. Not one per agent, not one per route.
 *
 * There is ONE Milla conversation (R121), so there is at most one sentence waiting to enter
 * it. A keyspace would let two handoffs exist at once, and two would have to be ordered,
 * merged or dropped — three ways to lose a customer's words where there is currently none.
 */
export const MILLA_HANDOFF_KEY = 'kind:milla:handoff:v1'

/**
 * The browser's own store, or `null` where there isn't one (server render, privacy mode).
 *
 * ⚠️ REACHED THROUGH `globalThis`, NOT THROUGH THE `DOM` LIB. `@kind/shared` is imported by
 * the API server; adding `"lib": ["DOM"]` to it so one function could name `sessionStorage`
 * would make every browser global type-check inside server code — a far larger door than
 * this needs. A property read on `globalThis` is absent-safe on the server by construction.
 */
function browserStore(): HandoffStore | null {
  try {
    return (globalThis as unknown as { sessionStorage?: HandoffStore }).sessionStorage ?? null
  } catch {
    return null
  }
}

/**
 * Park the sentence the customer just typed, for the destination to claim on arrival.
 *
 * @returns whether anything was parked. `false` means the caller's navigation is about to
 *          lose the message — which is the state this module exists to make VISIBLE rather
 *          than silent. A blank sentence is not a message and is never parked.
 */
export function stashMillaHandoff(
  text: unknown, store: HandoffStore | null = browserStore(),
): boolean {
  const msg = String(text ?? '').trim()
  if (!msg || !store) return false
  try { store.setItem(MILLA_HANDOFF_KEY, msg); return true } catch { return false }
}

/**
 * Take the waiting sentence — and take it AWAY.
 *
 * 🛑 THE REMOVE HAPPENS BEFORE THE RETURN, ALWAYS, including when the value is unusable. A
 * claim that returned the text and left it behind would send it again on the next mount, and
 * a duplicated customer message in a persisted thread is worse than a lost one: it is our
 * words put in their mouth twice.
 *
 * @returns their sentence exactly as typed, or `null` when there is nothing waiting.
 */
export function claimMillaHandoff(
  store: HandoffStore | null = browserStore(),
): string | null {
  if (!store) return null
  let raw: string | null = null
  try { raw = store.getItem(MILLA_HANDOFF_KEY) } catch { return null }
  try { store.removeItem(MILLA_HANDOFF_KEY) } catch { /* claimed regardless */ }
  const msg = String(raw ?? '').trim()
  return msg || null
}
