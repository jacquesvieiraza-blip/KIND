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
 * The draft for one authenticated user, or null.
 *
 * ⚠️ NULL IS "NO DRAFT", AND IT IS ALSO "WE COULD NOT READ ONE". Both must behave the same at
 * every call site: the product falls back to exactly today's behaviour. A read failure that
 * threw would take signup down over a table that may not be migrated yet.
 */
export async function briefDraftFor(userId: string): Promise<BriefDraft | null> {
  try {
    const { data, error } = await db.from('onboarding_brief_drafts')
      .select(COLUMNS).eq('user_id', userId).maybeSingle()
    if (error || !data) return null
    return toDraft(data as unknown as Row)
  } catch { return null }
}

export type SaveOutcome =
  | { ok: true; draft: BriefDraft }
  | { ok: false; reason: 'promoted' | 'unstorable' }

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
  const existing = await briefDraftFor(userId)
  if (existing?.promotedClientId) return { ok: false, reason: 'promoted' }

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
