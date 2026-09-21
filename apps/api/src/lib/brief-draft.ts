// ═══════════════════════════════════════════════════════════════════════════════════════
// THE PRE-CONFIRMATION BRIEF — READ, WRITE, AND THE ONE DOOR OUT OF IT.
//
// 🛑 WHAT THIS EXISTS FOR. `/auth/signup` creates an auth user and nothing else; the `clients`
// row is created by the CONFIRM click. So the whole Brief conversation lived in React state in
// one browser tab — close it and everything Milla had collected was gone, and Vida never knew
// the person existed. Preview 07 ("signed up 14 minutes ago … 10 of 11 … confirmation
// pending") was not a state the product could reach.
//
// ⚠️ ONE AUTHORITATIVE WRITABLE BRIEF AT A TIME, and this file is where that is enforced:
//   · before promotion — the draft is the authoritative writable Brief state
//   · after promotion  — the clients row and the ICP are the operational truth
// `saveBriefDraft` REFUSES a promoted draft. Without that refusal the draft's
// `target_category` and the ICP's `target_category` could drift apart afterwards, which is
// precisely the competing-mutable-truth the founder ruled out.
//
// ⚠️ NOT A SECOND BRIEF MODEL. Completeness is never decided here. Every caller counts through
// `briefDraftFacts`, which is `briefFacts()` over the same eleven-fact list the builder gate
// uses. This module stores and guards; it does not define.
//
// ⚠️ IT FAILS SOFT ON READ AND CLOSED ON WRITE. A missing table (the migration not yet
// applied) must not break signup or blank Vida — so reads answer `null` and the product
// behaves exactly as it does today. A write that cannot be stored answers honestly, because
// silently discarding a client's answers is the defect this replaces.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
// ⚑ 14 Sep (S1-RT-006) — where we can commercially work. Deliberately NOT the provider
// vocabulary problem: no human can translate a country we do not operate in.
import { splitGeographies, unsupportedGeographyAsk } from '@kind/shared'
import { briefDraftFacts, type BriefDraftFacts, type BriefFactsResult } from '@kind/shared'
import { onboardingState } from './onboarding-state'

export type BriefDraft = {
  id: string
  userId: string
  facts: BriefDraftFacts
  /**
   * ⚑ 14 Sep (S1-RT-003) — THE CONVERSATION, so re-entry is a continuation not a restart.
   *
   * The column has existed since `20260911_onboarding_brief_drafts` — "the minimum needed to
   * resume the conversation in another tab" — and was never written to. The whole transcript
   * lived in one browser tab's React state, so a refresh, a closed tab or a logout left the
   * client talking to somebody with no memory of the last ten minutes, and Milla with no
   * context to continue from. The facts survived; the conversation did not.
   */
  conversation: BriefTurn[]
  /** Stamped when the client confirmed a COMPLETE brief. Never one of the eleven facts. */
  confirmedAt: string | null
  /** Once set, this row is evidence and may not be written again. */
  promotedClientId: string | null
  promotedAt: string | null
  createdAt: string
  updatedAt: string
}

type Row = {
  conversation?: unknown
  id: string
  user_id: string
  facts: unknown
  confirmed_at: string | null
  promoted_client_id: string | null
  promoted_at: string | null
  created_at: string
  updated_at: string
}

const COLUMNS = 'id, user_id, facts, conversation, confirmed_at, promoted_client_id, promoted_at, created_at, updated_at'

/**
 * ⚠️ A NON-OBJECT `facts` IS TREATED AS EMPTY, NEVER TRUSTED INTO THE COUNTER. jsonb will
 * happily hold a string, a number or null, and `briefFacts` reading `"x".contact_name` would
 * answer "0 of 11" for a row that is actually corrupt — which reads identically to a client
 * who has said nothing. Empty is the honest floor.
 */
function readFacts(v: unknown): BriefDraftFacts {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as BriefDraftFacts) : {}
}

/**
 * ⚑ 14 Sep (S1-RT-003) — ONE TURN OF THE BRIEF. Deliberately the two fields the portal
 * already renders and the model already consumes, and nothing else: this is a resume aid,
 * not a chat platform, and the table's own comment says so.
 */
export type BriefTurn = { role: 'user' | 'assistant'; content: string }

/**
 * 🛑 THE TRANSCRIPT IS BOUNDED, AND BOTH BOUNDS MATTER.
 *
 * `MAX` caps the rows so a long Brief cannot grow one jsonb value without limit; `MAX_CHARS`
 * caps each turn so a single pasted wall of text cannot do the same. The window keeps the
 * MOST RECENT turns because that is what continuing the conversation needs — and the eleven
 * facts are stored separately and completely, so nothing a trimmed turn carried is lost as
 * FACT. Trimming costs context, never truth.
 *
 * ⚠️ THE VALUES ARE THE SAME ONES THE ROUTE ALREADY SENDS THE MODEL. `/icps/builder/chat`
 * windows the transcript to the last 40 turns before every call, so storing 40 stores exactly
 * what a resumed conversation would have used anyway.
 */
export const BRIEF_TRANSCRIPT_MAX_TURNS = 40
export const BRIEF_TRANSCRIPT_MAX_CHARS = 4000

/**
 * ⚠️ VALIDATED ON THE WAY OUT, NOT TRUSTED. jsonb will hold anything, and a corrupt or
 * hand-edited value must read as "no transcript" rather than putting a number or an object
 * where the portal expects a string. Unknown roles are dropped: only the two the product
 * renders are admitted, so nothing can be replayed into the model as a role it never had.
 */
export function readConversation(v: unknown): BriefTurn[] {
  if (!Array.isArray(v)) return []
  const out: BriefTurn[] = []
  for (const raw of v) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const r = raw as { role?: unknown; content?: unknown }
    if (r.role !== 'user' && r.role !== 'assistant') continue
    if (typeof r.content !== 'string') continue
    const content = r.content.slice(0, BRIEF_TRANSCRIPT_MAX_CHARS)
    if (content.trim() === '') continue
    out.push({ role: r.role, content })
  }
  return out.slice(-BRIEF_TRANSCRIPT_MAX_TURNS)
}

function toDraft(r: Row): BriefDraft {
  return {
    id: r.id,
    userId: r.user_id,
    facts: readFacts(r.facts),
    conversation: readConversation(r.conversation),
    confirmedAt: r.confirmed_at,
    promotedClientId: r.promoted_client_id,
    promotedAt: r.promoted_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/**
 * ⚠️ "ABSENT" AND "UNREADABLE" ARE DIFFERENT ANSWERS, and the write path must be able to tell
 * them apart. A READER may treat both as "no draft" and fall back to today's behaviour. A
 * WRITER may not: `{ ok: true, draft: null }` means there is genuinely nothing yet and a new
 * row is correct, while `{ ok: false }` means we do not know — and writing on that answer
 * would upsert a facts object built from nothing, silently erasing every answer already
 * collected. That is the same class of defect as the authority gap below, arriving by a
 * quieter door.
 */
type ReadOutcome =
  | { ok: true; draft: BriefDraft | null }
  | { ok: false }

async function readDraft(userId: string): Promise<ReadOutcome> {
  try {
    const { data, error } = await db.from('onboarding_brief_drafts')
      .select(COLUMNS).eq('user_id', userId).maybeSingle()
    if (error) return { ok: false }
    return { ok: true, draft: data ? toDraft(data as unknown as Row) : null }
  } catch { return { ok: false } }
}

/**
 * 🛑 THE AUTHORITATIVE PROMOTION REALITY, NOT A FLAG THAT CAN FAIL TO PERSIST.
 *
 * ⚠️ THIS IS THE AUTHORITY FIX. Write eligibility used to be decided ONLY by
 * `promoted_client_id`, which `markBriefDraftPromoted` writes best-effort. So if the client
 * and the ICP were created and that one bookkeeping write failed, the draft stayed writable —
 * two mutable sources of truth for the same Brief, with nothing to say which was right. The
 * seal being cosmetic is fine; the AUTHORITY depending on the seal is not.
 *
 * A `clients` row for this user IS promotion having happened. It is created by the onboarding
 * insert, `clients.user_id` is UNIQUE, and no bookkeeping step stands between that insert and
 * this read. So the guard asks reality, and the flag becomes what it should always have been:
 * evidence of something that is already true elsewhere.
 */
type ClientLookup = { ok: true; clientId: string | null } | { ok: false }

async function promotedClientForUser(userId: string): Promise<ClientLookup> {
  try {
    const { data, error } = await db.from('clients')
      .select('id').eq('user_id', userId).maybeSingle()
    if (error) return { ok: false }
    return { ok: true, clientId: (data as { id?: string } | null)?.id ?? null }
  } catch { return { ok: false } }
}

/**
 * The draft for one authenticated user, or null.
 *
 * ⚠️ NULL IS "NO DRAFT", AND IT IS ALSO "WE COULD NOT READ ONE". For a READER both behave the
 * same: the product falls back to exactly today's behaviour, and a read failure that threw
 * would take signup down over a table that may not be migrated yet. The WRITE path uses
 * `readDraft` instead, because there the difference is load-bearing.
 */
export async function briefDraftFor(userId: string): Promise<BriefDraft | null> {
  const r = await readDraft(userId)
  return r.ok ? r.draft : null
}

/**
 * The draft ONLY while it is still the authoritative writable Brief.
 *
 * 🛑 WHY THIS IS NOT `briefDraftFor`. After promotion the draft is EVIDENCE — a snapshot of
 * what was said before the client and the ICP became the operational truth. Reading it back
 * into a live conversation would put a superseded copy of the Brief in front of Milla as if it
 * were current, which is the competing-mutable-truth the founder ruled out arriving by a
 * quieter door: nothing is written, but the model is told the old category wording is what
 * this client wants. `resume` is a READ with the same authority question as a WRITE.
 *
 * ⚠️ THE AUTHORITY IS THE SAME ONE `saveBriefDraft` ASKS — reality, not the flag. A `clients`
 * row for this user IS promotion having happened, whether or not the bookkeeping seal landed.
 *
 * ⚠️ AND IT FAILS CLOSED. An unknown state answers `null`, so a conversation that cannot
 * establish whether promotion has happened behaves exactly as it did before drafts existed
 * rather than guessing that it has not.
 */
export async function writableBriefDraft(userId: string): Promise<BriefDraft | null> {
  const read = await readDraft(userId)
  if (!read.ok || !read.draft) return null
  if (read.draft.promotedClientId) return null
  const promoted = await promotedClientForUser(userId)
  if (!promoted.ok || promoted.clientId) return null
  return read.draft
}

export type SaveOutcome =
  | { ok: true; draft: BriefDraft }
  | { ok: false; reason: 'promoted' | 'unstorable' | 'unverifiable' }

/**
 * Persist the partial Brief for this user, creating the draft if it does not exist.
 *
 * 🛑 A PROMOTED DRAFT IS REFUSED. It is evidence, not truth. Allowing a late write would let
 * the draft and the confirmed ICP disagree about the client's own category wording, with
 * nothing to say which was right.
 *
 * ⚠️ FACTS ARE MERGED, NOT REPLACED. Milla learns one thing at a time, and a PUT carrying only
 * the newest answer must not erase the ten before it. A caller that genuinely means "forget
 * this" sends the key with `null`, which is stored and read as absent by the counter.
 */
export async function saveBriefDraft(
  userId: string, facts: BriefDraftFacts,
): Promise<SaveOutcome> {
  const read = await readDraft(userId)
  // ⚠️ FAIL CLOSED ON AN UNKNOWN STATE. Writing when we could not read means upserting a
  // facts object assembled from nothing — every answer already collected, gone. The route
  // answers 503-retryable and the portal keeps its own copy, so nothing is lost and the next
  // save succeeds. An erased draft cannot be recovered by trying again.
  if (!read.ok) return { ok: false, reason: 'unverifiable' }
  const existing = read.draft

  // 🛑 AUTHORITY IS ASKED OF REALITY, NOT OF A FLAG. See `promotedClientForUser`: the flag is
  // written best-effort, so a failed seal after a successful client insert would otherwise
  // leave this draft writable alongside the confirmed client and ICP.
  const promoted = await promotedClientForUser(userId)
  if (!promoted.ok) return { ok: false, reason: 'unverifiable' }
  if (existing?.promotedClientId || promoted.clientId) return { ok: false, reason: 'promoted' }

  const merged: BriefDraftFacts = { ...(existing?.facts ?? {}), ...facts }
  const now = new Date().toISOString()
  try {
    const { data, error } = await db.from('onboarding_brief_drafts')
      .upsert({
        user_id: userId, facts: merged, updated_at: now,
        // 🛑 CHANGING THE BRIEF UN-CONFIRMS IT. "Confirmed" has to mean "confirmed THESE
        // facts". Without this a client could confirm, carry on talking to Milla, and be
        // promoted on a brief they never agreed to — the confirmation would be a stale
        // signature on a document that moved underneath it.
        confirmed_at: null,
      }, { onConflict: 'user_id' })
      .select(COLUMNS).maybeSingle()
    if (error || !data) return { ok: false, reason: 'unstorable' }
    return { ok: true, draft: toDraft(data as unknown as Row) }
  } catch { return { ok: false, reason: 'unstorable' } }
}

/**
 * ⚑ 14 Sep (S1-RT-003) — PERSIST THE CONVERSATION, so re-entry continues it.
 *
 * 🛑 A SEPARATE WRITER, AND THE SEPARATION IS LOAD-BEARING. `saveBriefDraft` sets
 * `confirmed_at: null` on every write, deliberately — changing the FACTS must un-confirm the
 * Brief, because "confirmed" has to mean "confirmed THESE facts". A transcript is not a fact:
 * storing the words that were exchanged changes nothing the client agreed to, so routing this
 * through that function would silently revoke a confirmation every time somebody spoke.
 *
 * ⚠️ IT NEVER CREATES A ROW. `facts` owns creation; this only records the conversation
 * belonging to a draft that already exists. Zero rows updated is a no-op, not an error — on
 * the very first turn the facts write has already created the row moments earlier, and a turn
 * that carried no facts at all has nothing to resume into.
 *
 * ⚠️ A PROMOTED DRAFT IS REFUSED, on the same authority as the facts writer and for the same
 * reason: after promotion the row is evidence.
 *
 * ⚠️ BEST-EFFORT BY CONTRACT. A transcript that could not be stored must never cost the
 * client their turn — the reply is already composed. The caller ignores the outcome.
 */
export async function saveBriefConversation(
  userId: string, turns: BriefTurn[],
): Promise<{ ok: boolean }> {
  const read = await readDraft(userId)
  if (!read.ok || !read.draft) return { ok: false }
  if (read.draft.promotedClientId) return { ok: false }
  const promoted = await promotedClientForUser(userId)
  if (!promoted.ok || promoted.clientId) return { ok: false }

  // ⚠️ BOUNDED BY THE SAME READER THAT LOADS IT, so what is stored and what is restored can
  // never disagree about the window or the per-turn cap.
  const bounded = readConversation(turns)
  try {
    const { error } = await db.from('onboarding_brief_drafts')
      .update({ conversation: bounded, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      // 🛑 THE SAME `.is(...)` FENCE THE SEAL USES. A promotion landing between the read
      // above and this write must not be overwritten by a transcript.
      .is('promoted_client_id', null)
    return { ok: !error }
  } catch { return { ok: false } }
}

/**
 * 🛑 ONCE THEY HAVE SENT IT, WE OWN IT. (Founder ruling: "Do not make the customer retype
 * because our AI/provider failed.")
 *
 * ⛓️ WHAT WAS WRONG. The transcript was written ONCE, at the very bottom of the turn, on the
 * success path only. So the order was: take their message → call Anthropic → if that fails,
 * return 503 and store NOTHING. The message survived only in the browser's React state. A
 * provider outage plus a refresh, or a closed tab, and everything they had typed since the
 * last successful turn was gone — and the banner told them to try again at something they
 * had already done correctly.
 *
 * 🛑 SO THE CUSTOMER'S TURN IS PERSISTED BEFORE THE MODEL IS CALLED. What they said is theirs
 * and is already true; whether we can answer it is our problem and happens afterwards.
 *
 * ⚠️ IT CREATES THE ROW, WHICH IS THE ONE THING `saveBriefConversation` DELIBERATELY WILL NOT
 * DO. On the very first turn there is no draft yet — the facts writer creates it later in the
 * same request — so a writer that refused to create would leave exactly the first message,
 * the one carrying the most context, unprotected. It creates a row with NO FACTS: a
 * transcript is not a fact, `confirmed_at` is untouched, and nothing here can assert anything
 * about the client's business.
 *
 * ⚠️ IDEMPOTENT BY CONSTRUCTION. The browser re-sends the whole transcript every turn, so
 * this stores a snapshot rather than appending. A retry of the same turn writes the same
 * array and cannot duplicate a message.
 *
 * ⚠️ BEST-EFFORT, AND IT NEVER COSTS THEM THE TURN. A transcript we could not store is worse
 * than one we could; refusing to answer them because of it would be worse still.
 */
export async function rememberCustomerTurn(
  userId: string, turns: BriefTurn[],
): Promise<{ ok: boolean }> {
  const bounded = readConversation(turns)
  if (bounded.length === 0) return { ok: true }
  try {
    const read = await readDraft(userId)
    // A promoted draft is evidence and is never written to, exactly as the other writers hold.
    if (read.ok && read.draft?.promotedClientId) return { ok: false }
    const promoted = await promotedClientForUser(userId)
    if (!promoted.ok || promoted.clientId) return { ok: false }
    const { error } = await db.from('onboarding_brief_drafts')
      .upsert({
        user_id: userId,
        conversation: bounded,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    return { ok: !error }
  } catch { return { ok: false } }
}

export type ConfirmOutcome =
  | { ok: true; draft: BriefDraft }
  | {
      /**
       * ⚑ 19 Sep — `store_unavailable` IS SPLIT OUT OF `unstorable`, AND THE SPLIT IS THE FIX.
       *
       * 🛑 THEY ARE NOT THE SAME FAILURE. `unstorable` now means only *"the row is right there
       * and the stamp would not write"* — a genuine transient on a record we can see, where a
       * retry can succeed and 503-retryable is the honest answer. `store_unavailable` means
       * the draft store itself could not be READ: most often
       * `20260911_onboarding_brief_drafts` was never applied. That one is permanent, identical
       * for every client and every retry, and answering it 503-retryable told the client to
       * try again forever — the same dead end the chat had, one click further along.
       *
       * ⚠️ AND THE PORTAL ALREADY EXPECTED THIS. `welcome/page.tsx` says it in as many words:
       * *"A client whose draft predates this table, OR WHOSE DRAFT COULD NOT BE STORED, has
       * nothing to confirm; promotion then behaves exactly as it did before drafts existed."*
       * It was the SERVER sending a status the portal could not act on.
       */
      ok: false; reason: 'no_draft' | 'promoted' | 'incomplete' | 'unstorable' | 'store_unavailable'
      /** The canonical eleven only, as ids. */
      missing?: string[]
      /** ⚑ 16 Sep — BOTH CLASSES, sentence-ready. `missing` alone cannot name the account
       *  requirement, and a refusal that lists nothing is worse than no refusal. */
      missingLabels?: string[]
    }
  /**
   * ⚑ 14 Sep (S1-RT-006) — THEY ASKED FOR A MARKET WE DO NOT WORK IN.
   *
   * ⚠️ A RECOVERABLE CONVERSATIONAL STATE, NOT AN ERROR. It carries the sentence Milla says
   * and the countries in question, so the portal can put it in the conversation and the
   * client can simply answer — which is the whole difference between this and the raw Zod
   * 400 that used to land AFTER their account had been created.
   */
  | { ok: false; reason: 'unsupported_geography'; unsupported: string[]; supported: string[]; ask: string }

/**
 * 🛑 THE CLIENT CONFIRMS THEIR BRIEF. THE SEPARATE GATE, AND THE ONLY PLACE IT IS GIVEN.
 *
 * ⚠️ CONFIRMATION IS NOT THE TWELFTH FACT AND IT IS NOT INFERRED FROM ELEVEN. Holding all
 * eleven facts means Milla has finished asking; it says nothing about whether the client has
 * READ what she understood and agreed to it. Proof is sourced against this brief and the
 * client is later asked for money on the strength of it, so the agreement has to be an act.
 * Eleven facts on their own must never start anything.
 *
 * ⚠️ AND IT IS NOT AN OPERATOR ACTION. This is reached from the client's own console with the
 * client's own token. No operator route confirms a brief on somebody's behalf — Vida's draft
 * surface is a read-only projection, and nothing on it writes here.
 *
 * ⚠️ THE ELEVEN ARE RE-CHECKED HERE, SERVER-SIDE. A disabled button is not a gate, and the
 * browser's claim about its own completeness is not evidence.
 *
 * ⚠️ IDEMPOTENT. Confirming twice is one confirmation: the second call re-stamps nothing it
 * has not already established and answers the same way, so a double click or a retry after an
 * ambiguous response cannot produce two different states.
 */
export async function confirmBriefDraft(userId: string): Promise<ConfirmOutcome> {
  const read = await readDraft(userId)
  // ⛓️ 19 Sep — WAS `reason: 'unstorable'`, which the route answered 503-retryable. If the
  // draft store is not there, that refusal is identical on every retry and for every client:
  // the journey simply ends. It is now its own reason and degrades to the pre-draft path.
  if (!read.ok) return { ok: false, reason: 'store_unavailable' }
  if (!read.draft) return { ok: false, reason: 'no_draft' }

  // Authority first, exactly as the write path asks it: reality, not the flag.
  const promoted = await promotedClientForUser(userId)
  if (!promoted.ok) return { ok: false, reason: 'unstorable' }
  if (read.draft.promotedClientId || promoted.clientId) return { ok: false, reason: 'promoted' }

  const gate = mayConfirmBrief(read.draft)
  if (!gate.ok) {
    return { ok: false, reason: 'incomplete', missing: gate.missing, missingLabels: gate.missingLabels }
  }

  // ── 🛑 ⚑ 14 Sep (S1-RT-006) — WE DO NOT CREATE A CLIENT WE CANNOT SERVE ─────────────
  //
  // 🛑 THE DEFECT THIS CLOSES. `geographiesSchema` refuses a country outside
  // `LAUNCH_SEND_COUNTRIES` — correctly, because a country we cannot send to is a country we
  // do not buy leads in. But it refuses on `POST /icps`, the THIRD leg of promotion, and
  // `/auth/onboard` has already created the canonical client row by then. A prospect who
  // said "Brazil" became a real client with no ICP, an unsealed draft and a raw validation
  // error on screen. Founder-ruled: if they cannot legitimately complete setup because we do
  // not operate where they sell, we do not create them and strand them.
  //
  // 🛑 HERE IS THE ONLY PLACE IT CAN GO. Confirmation is the door every other leg is behind:
  // `/auth/onboard` refuses a draft with no `confirmed_at`, and the ICP, the welcome email,
  // Proof authority and every provider call are downstream of that. Blocking the stamp blocks
  // ALL of them, structurally, without a second gate to keep in step.
  //
  // 🛑 AND IT IS NOT `NEEDS ICP REVIEW`. That state is for OUR provider vocabulary failing to
  // take the client's words, which a human can finish. No human can translate a country we do
  // not operate in — routing this there would promise an operator a job that does not exist
  // and grow a queue nobody can clear. Two different problems, two different mechanisms.
  //
  // ⚠️ THE SUPPORTED HALF IS KEPT, AND THE UNSUPPORTED HALF IS NOT DROPPED. Both travel in
  // the refusal so the client is told exactly what we can and cannot do and decides
  // themselves — "UK, US and Brazil" must never quietly become "UK and US".
  //
  // ⚠️ IT WRITES NOTHING. A refusal at this line leaves the draft exactly as it was: still
  // writable, still holding every answer, still holding the conversation. The client revises
  // by talking to Milla, `saveBriefDraft` replaces the geography key, and they confirm again.
  const geo = splitGeographies(read.draft.facts.geographies)
  if (geo.unsupported.length > 0) {
    return {
      ok: false, reason: 'unsupported_geography',
      unsupported: geo.unsupported, supported: geo.supported,
      ask: unsupportedGeographyAsk(geo),
    }
  }

  // ⚠️ ALREADY CONFIRMED IS A SUCCESS, NOT A SECOND CONFIRMATION. Re-stamping would move the
  // recorded moment of agreement every time a retry arrived.
  if (read.draft.confirmedAt) return { ok: true, draft: read.draft }

  const now = new Date().toISOString()
  try {
    const { data, error } = await db.from('onboarding_brief_drafts')
      .update({ confirmed_at: now, updated_at: now })
      .eq('user_id', userId).is('confirmed_at', null)
      .select(COLUMNS).maybeSingle()
    if (error) return { ok: false, reason: 'unstorable' }
    // A null row means another request confirmed between the read and the write. That is the
    // same outcome, not a failure — re-read rather than inventing one.
    if (!data) {
      const again = await readDraft(userId)
      return again.ok && again.draft && again.draft.confirmedAt
        ? { ok: true, draft: again.draft }
        : { ok: false, reason: 'unstorable' }
    }
    return { ok: true, draft: toDraft(data as unknown as Row) }
  } catch { return { ok: false, reason: 'unstorable' } }
}

/** How complete is this draft? The canonical answer, through the shared eleven-fact counter. */
export function draftProgress(d: BriefDraft | null): BriefFactsResult {
  return briefDraftFacts(d?.facts ?? null)
}

// ⛓️ 16 Sep (S1-ONB-001) — THE AUTHORITY LIVES IN `onboarding-state.ts`, AND THE MOVE IS
// STRUCTURAL, NOT TIDYING. It must be STATICALLY importable by `routes/icps.ts`, because the
// eleven-fact gate is a Zod refinement and cannot await — and this file imports `@kind/db`,
// so a static import of it would (a) drag the database client into that module graph and
// (b) break every existing suite that replaces `./brief-draft` wholesale with a double,
// taking the whole route down with a 503. The verdict is pure; it belongs somewhere pure.
//
// ⚠️ RE-EXPORTED SO EXISTING CALLERS ARE UNAFFECTED, and so there is still exactly one
// definition — this is a second NAME for the same function, never a second answer.
export {
  onboardingState, ACCOUNT_FACTS, ACCOUNT_FACT_LABEL,
  type OnboardingState, type AccountFactId,
} from './onboarding-state'

/**
 * 🛑 MAY THIS DRAFT BE CONFIRMED?
 *
 * ⚠️ ALL ELEVEN, AND THE CHECK IS THE SERVER'S. A disabled button is not a gate: the confirm
 * route calls this and refuses, so a client (or a screen) cannot promote a brief that is short
 * of the facts Proof will be run against.
 *
 * ⚠️ CONFIRMATION IS NOT THE TWELFTH FACT. This answers only "are the eleven present". Whether
 * the client has confirmed is `confirmedAt`, and it is asked separately everywhere.
 */
export function mayConfirmBrief(
  d: BriefDraft | null,
): { ok: boolean; missing: string[]; missingLabels: string[] } {
  // ⛓️ 16 Sep (S1-ONB-001) — DELEGATED, NOT REIMPLEMENTED. This used to count the eleven over
  // the draft alone, which is a NARROWER input than the chat gate's, and it knew nothing about
  // the account class — so a brief with no country was confirmable and the refusal arrived two
  // legs later at `/auth/onboard`, after `confirmed_at` had already been stamped.
  //
  // ⚠️ `missing` KEEPS ITS SHAPE AND ITS MEANING: the canonical eleven, in the approved order,
  // as ids that `BRIEF_FACT_LABEL` can render. Existing callers are unaffected. The account
  // class travels in `missingLabels`, which is the complete sentence-ready list.
  const s = onboardingState(d?.facts ?? null)
  return { ok: s.state === 'ready', missing: s.unresolvedTargeting, missingLabels: s.unresolvedLabels }
}

/**
 * Close the draft: it became this client.
 *
 * ⚠️ STAMPED AFTER THE CLIENT ROW EXISTS, NEVER BEFORE. The ordering is the whole safety: if
 * promotion is recorded first and the client insert then fails, the draft is sealed against
 * further writes and the person is left with no client and no editable Brief — every answer
 * they gave stranded behind a closed door.
 *
 * ⚠️ BEST-EFFORT, AND THAT IS DELIBERATE. By the time this runs the client and the ICP exist;
 * failing the whole onboarding because the evidence row could not be stamped would throw away
 * a successful promotion over bookkeeping. It is logged loudly instead.
 */
export async function markBriefDraftPromoted(
  userId: string, clientId: string,
): Promise<{ ok: boolean }> {
  const now = new Date().toISOString()
  try {
    // ⛓️ MVP1 — `confirmed_at` IS NO LONGER WRITTEN HERE. It used to be stamped at promotion,
    // which quietly made "confirmed" a synonym for "promoted" — and a synonym cannot be the
    // gate that must happen BEFORE promotion. The client's own confirmation is stamped by
    // `confirmBriefDraft`, and `/auth/onboard` refuses to promote a draft that has not been.
    // ── ⚑ 12 Sep (S1-AUDIT-003) — THE FIRST PROMOTION IS THE ONE RECORDED ─────────────
    //
    // ⚠️ `.is('promoted_client_id', null)` MATTERS NOW THAT THIS IS CALLED FROM TWO PLACES.
    // The seal moved to `POST /icps` (the last durable step of promotion) and the replay
    // branch there calls it too, so an interrupted promotion can be finished by a retry.
    // Without this filter a replay would re-stamp `promoted_at`, moving the recorded moment
    // of promotion to whenever somebody last pressed the button — and this row is evidence.
    // Zero rows matched is success: it means the seal was already taken.
    const { error } = await db.from('onboarding_brief_drafts')
      .update({ promoted_client_id: clientId, promoted_at: now, updated_at: now })
      .eq('user_id', userId)
      .is('promoted_client_id', null)
    if (error) {
      console.warn('[brief-draft] promotion not stamped (run 20260911_onboarding_brief_drafts):', error.message)
      return { ok: false }
    }
    return { ok: true }
  } catch (e) {
    console.warn('[brief-draft] promotion not stamped:', e instanceof Error ? e.message : String(e))
    return { ok: false }
  }
}

/**
 * The open drafts Vida's rail projects — never promoted, newest first.
 *
 * ⚠️ A PROJECTION, NOT A CLIENT LIST. These rows are not clients and never become clients by
 * being rendered beside them: "a client" still means a confirmed client in the worklist, the
 * lifecycle board and every count. The rail merges two reads; nothing downstream is asked to
 * change its mind about what a client is.
 *
 * ⚠️ AND NEVER ONE PERSON TWICE. A promoted draft is excluded by the same condition that makes
 * it evidence, so the moment a draft becomes a client it stops being a draft row on the rail.
 */
export async function openBriefDrafts(limit = 50): Promise<BriefDraft[]> {
  try {
    const { data, error } = await db.from('onboarding_brief_drafts')
      .select(COLUMNS).is('promoted_client_id', null)
      .order('created_at', { ascending: false }).limit(limit)
    if (error || !data) return []
    return (data as unknown as Row[]).map(toDraft)
  } catch { return [] }
}
