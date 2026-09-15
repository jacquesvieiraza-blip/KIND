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
// ⚠️ THE PATTERN IS ALREADY IN THIS REPO. `VidaConversation.tsx` carries an ICP handoff
// across a navigation through `sessionStorage` in exactly this shape. A new mechanism would
// be a second way to do a thing we already do; this is the existing one, made durable.
//
// ── 🛑 ⚑ 15 Sep (O1 durability) — CLAIMING IS NOT THE SAME AS OWNING ───────────────────
//
// ⛓️ ~~`claimMillaHandoff` DELETED BEFORE IT RETURNED.~~ That bought exactly-once and paid
// for it with the founder's own rule. The sequence was: claim deletes → `send()` posts →
// the canonical route calls the MODEL FIRST and only then writes `milla_messages`. So when
// the provider failed there was no durable customer turn anywhere, the browser store had
// already been emptied, and the sentence existed only in React state. One reload and the
// customer had to retype it — which is the thing we are not allowed to make them do.
//
// 🛑 SO THE HANDOFF IS NOW HELD UNTIL SOMETHING DURABLE OWNS IT. `claim` hands the message
// over and LEAVES IT IN THE STORE; only `release` removes it, and the destination calls
// `release` only once the canonical route has confirmed the turn is in `milla_messages`.
// `sessionStorage` survives a reload, so a failed attempt is recoverable by construction.
//
// ⚠️ AND EXACTLY-ONCE MOVED TO WHERE IT BELONGS — THE DATABASE. Every handoff carries an
// `id` minted ONCE at stash time and never regenerated, which the route uses as the
// `milla_messages` PRIMARY KEY for the customer's row. A retry replays the same id, Postgres
// answers 23505, and no second row exists. That is the repo's own existing idempotency
// primitive (`webhook-idempotency.ts`, `morning-brief-deliver.ts`, `approve-lead.ts`), not a
// new one, and it needs no migration: `milla_messages.id` is already
// `uuid primary key default gen_random_uuid()`.
//
// ⚠️ THE IN-PAGE GUARD IS SEPARATE AND SMALLER. A module-level claimed-set stops React's
// StrictMode double-mount from firing two concurrent requests for one sentence. It is
// deliberately NOT durable: a reload builds a fresh module, so the pending handoff is
// re-claimable — which is exactly the recovery path. Correctness never rests on it; the
// primary key does.
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
 * One handed-over sentence and the identity the canonical row will be written under.
 *
 * 🛑 `id` IS THE EXACTLY-ONCE TOKEN. It is minted once, at stash time, and travels with the
 * message through every retry. The route writes `milla_messages.id = id` for the customer's
 * row, so a replay is a primary-key collision rather than a second message.
 */
export interface MillaHandoff {
  id: string
  text: string
}

/** A v4 UUID from whatever the runtime offers, with a dependency-free fallback. */
function newId(): string {
  const c = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto
  try { if (c?.randomUUID) return c.randomUUID() } catch { /* fall through */ }
  // ⚠️ THE FALLBACK IS SHAPE-CORRECT, because the server parses this as a UUID. It is only
  // reached on runtimes without `crypto.randomUUID`; collision risk over one browser tab's
  // handful of handoffs is not a real risk, and a collision would at worst suppress one
  // duplicate — never create one.
  const hex = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) { out += '-'; continue }
    if (i === 14) { out += '4'; continue }
    const r = Math.floor(Math.random() * 16)
    out += i === 19 ? hex[(r & 0x3) | 0x8] : hex[r]
  }
  return out
}

/**
 * 🛑 THE IN-PAGE CLAIM GUARD — one JS context, not one browser.
 *
 * StrictMode mounts effects twice in development, and a remount can happen at any time. Two
 * concurrent posts for one sentence would produce one customer row (the primary key holds)
 * but TWO Milla replies, so the send is gated here as well.
 *
 * ⚠️ DELIBERATELY NOT DURABLE. A reload builds a fresh module with an empty set, so a
 * handoff left pending by a failed attempt is claimable again — that IS the recovery path.
 */
const claimedInThisPageLoad = new Set<string>()

/**
 * Model a new page load (reload, or a fresh tab) in a test.
 *
 * ⚠️ A REAL BROWSER DOES THIS BY CONSTRUCTION — a reload re-evaluates the module and the set
 * above starts empty. This exists so a test can reach that state without a browser, and it
 * touches nothing else: the stored handoff is untouched, which is the point.
 */
export function resetMillaHandoffPageLoad(): void {
  claimedInThisPageLoad.clear()
}

/**
 * Park the sentence the customer just typed, for the destination to claim on arrival.
 *
 * @returns the handoff, including the id its canonical row will be written under, or `null`
 *          when nothing was parked. `null` means the caller's navigation is about to lose the
 *          message — the state this module exists to make VISIBLE rather than silent. A blank
 *          sentence is not a message and is never parked.
 */
export function stashMillaHandoff(
  text: unknown, store: HandoffStore | null = browserStore(),
): MillaHandoff | null {
  const msg = String(text ?? '').trim()
  if (!msg || !store) return null
  const handoff: MillaHandoff = { id: newId(), text: msg }
  try { store.setItem(MILLA_HANDOFF_KEY, JSON.stringify(handoff)); return handoff } catch { return null }
}

/** Read what is waiting without claiming or removing it. */
export function peekMillaHandoff(
  store: HandoffStore | null = browserStore(),
): MillaHandoff | null {
  if (!store) return null
  let raw: string | null = null
  try { raw = store.getItem(MILLA_HANDOFF_KEY) } catch { return null }
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<MillaHandoff>
    const text = String(p?.text ?? '').trim()
    const id = String(p?.id ?? '').trim()
    return text && id ? { id, text } : null
  } catch {
    // ⚠️ A PLAIN STRING IS A PRE-DURABILITY HANDOFF written by an older tab mid-deploy. It is
    // still the customer's sentence and must not be thrown away for being old — it is given
    // an id now, which costs it nothing but the duplicate protection it never had.
    const text = String(raw).trim()
    return text ? { id: newId(), text } : null
  }
}

/**
 * Take the waiting sentence — and DELIBERATELY LEAVE IT WHERE IT IS.
 *
 * 🛑 CLAIMING IS NOT OWNING. Until the canonical route has the customer's turn in
 * `milla_messages`, this store is the only thing holding their words; deleting here is what
 * made a provider failure cost them the sentence. The caller calls `releaseMillaHandoff`
 * once, and only once, the turn is durably owned.
 *
 * @returns the handoff, or `null` when nothing is waiting or it is already in flight in this
 *          page load.
 */
export function claimMillaHandoff(
  store: HandoffStore | null = browserStore(),
): MillaHandoff | null {
  const waiting = peekMillaHandoff(store)
  if (!waiting) return null
  if (claimedInThisPageLoad.has(waiting.id)) return null
  claimedInThisPageLoad.add(waiting.id)
  // A handoff that arrived without an id (older tab) is written back WITH one, so a retry
  // after a reload replays the same id rather than minting a second.
  if (store) { try { store.setItem(MILLA_HANDOFF_KEY, JSON.stringify(waiting)) } catch { /* best effort */ } }
  return waiting
}

/**
 * The turn is durably owned by canonical Milla — let the sentence go.
 *
 * ⚠️ ID-MATCHED. Releasing by id means a late release from a superseded attempt cannot delete
 * a NEWER sentence the customer has since typed and handed over.
 */
export function releaseMillaHandoff(
  id: string, store: HandoffStore | null = browserStore(),
): void {
  if (!store || !id) return
  const waiting = peekMillaHandoff(store)
  if (!waiting || waiting.id !== id) return
  try { store.removeItem(MILLA_HANDOFF_KEY) } catch { /* released regardless */ }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 ⚑ 15 Sep (O1, canonical boundary) — ONE SEND INTENT = ONE ID = ONE CANONICAL TURN.
//
// ⛓️ THE PREVIOUS ROUND FIXED ONE CALLER AND LEFT THE OTHER. The handed-over sentence got a
// stable id; the ORDINARY Milla composer got none, so the route minted a fresh uuid per
// request. And because that same round moved the customer's row ABOVE the model call, the
// ordinary composer's own failure path became a duplicate factory:
//
//   customer sends once → row A written → model fails → the composer is refilled with their
//   sentence (C01) → they press send → row B. Two canonical turns, one thing said.
//
// 🛑 SO IDENTITY BELONGS TO THE SEND, NOT TO THE ENTRY PATH. Both callers now come through
// the one rule below before the request leaves the browser, and the route's primary key
// finishes the job.
//
// ⚠️ AND IT IS NOT TEXT DEDUPLICATION. Only the ONE unresolved turn is eligible to be
// continued. Two deliberate "yes" sends are two intents and two rows, because the first is
// resolved and cleared before the second is typed — the test matrix proves exactly that.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** One thing the customer meant to say, and the identity its canonical row is written under. */
export interface MillaSendIntent {
  id: string
  text: string
}

/**
 * The identity for a send that is about to leave the browser.
 *
 * @param text     what the customer is sending, already trimmed.
 * @param pending  the one send this conversation has not yet resolved, or `null`.
 * @param handoffId an id already minted by the agent-card handoff, if this is that sentence.
 *
 * 🛑 THE RETRY RULE, EXACTLY: a send is a continuation of `pending` only when `pending` is
 * the unresolved turn AND the text is unchanged — which is the state the failure path leaves
 * behind when it puts their sentence back in the composer. Anything else is a new intent and
 * gets a new id, because it is a new thing to say.
 */
export function millaSendIdentity(
  text: string, pending: MillaSendIntent | null | undefined, handoffId?: string,
): MillaSendIntent {
  const msg = String(text ?? '').trim()
  if (handoffId) return { id: handoffId, text: msg }
  if (pending && pending.text === msg && pending.id) return pending
  return { id: newId(), text: msg }
}

/**
 * The customer turn canonical Milla never answered, read from the thread itself.
 *
 * 🛑 CANONICAL PERSISTENCE IS THE TRUTH AFTER A RELOAD, not the browser. React state is gone
 * and the composer is empty, but the turn is a row — so re-entry finds it here and continues
 * it under ITS OWN id, which is why continuing cannot produce a second row.
 *
 * ⚠️ ONLY THE TRAILING TURN. A user row with an answer after it is a finished exchange; only
 * a thread that ENDS on the customer is waiting for us.
 */
export function unansweredCustomerTurn(
  rows: ReadonlyArray<{ id?: string; role?: string; content?: string }> | null | undefined,
): MillaSendIntent | null {
  if (!rows || rows.length === 0) return null
  const last = rows[rows.length - 1]
  if (last?.role !== 'user') return null
  const id = String(last.id ?? '').trim()
  const text = String(last.content ?? '').trim()
  return id && text ? { id, text } : null
}
