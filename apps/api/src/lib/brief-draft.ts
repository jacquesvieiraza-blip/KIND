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
import { briefDraftFacts, type BriefDraftFacts, type BriefFactsResult } from '@kind/shared'

export type BriefDraft = {
  id: string
  userId: string
  facts: BriefDraftFacts
  /** Stamped when the client confirmed a COMPLETE brief. Never one of the eleven facts. */
  confirmedAt: string | null
  /** Once set, this row is evidence and may not be written again. */
  promotedClientId: string | null
  promotedAt: string | null
  createdAt: string
  updatedAt: string
}

type Row = {
  id: string
  user_id: string
  facts: unknown
  confirmed_at: string | null
  promoted_client_id: string | null
  promoted_at: string | null
  created_at: string
  updated_at: string
}

const COLUMNS = 'id, user_id, facts, confirmed_at, promoted_client_id, promoted_at, created_at, updated_at'

/**
 * ⚠️ A NON-OBJECT `facts` IS TREATED AS EMPTY, NEVER TRUSTED INTO THE COUNTER. jsonb will
 * happily hold a string, a number or null, and `briefFacts` reading `"x".contact_name` would
 * answer "0 of 11" for a row that is actually corrupt — which reads identically to a client
 * who has said nothing. Empty is the honest floor.
 */
function readFacts(v: unknown): BriefDraftFacts {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as BriefDraftFacts) : {}
}

function toDraft(r: Row): BriefDraft {
  return {
    id: r.id,
    userId: r.user_id,
    facts: readFacts(r.facts),
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
      .upsert({ user_id: userId, facts: merged, updated_at: now }, { onConflict: 'user_id' })
      .select(COLUMNS).maybeSingle()
    if (error || !data) return { ok: false, reason: 'unstorable' }
    return { ok: true, draft: toDraft(data as unknown as Row) }
  } catch { return { ok: false, reason: 'unstorable' } }
}

/** How complete is this draft? The canonical answer, through the shared eleven-fact counter. */
export function draftProgress(d: BriefDraft | null): BriefFactsResult {
  return briefDraftFacts(d?.facts ?? null)
}

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
export function mayConfirmBrief(d: BriefDraft | null): { ok: boolean; missing: string[] } {
  const p = draftProgress(d)
  return { ok: p.complete, missing: p.missing }
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
    const { error } = await db.from('onboarding_brief_drafts')
      .update({ confirmed_at: now, promoted_client_id: clientId, promoted_at: now, updated_at: now })
      .eq('user_id', userId)
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
