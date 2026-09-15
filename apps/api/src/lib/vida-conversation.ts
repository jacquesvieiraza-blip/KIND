import { db } from '@kind/db'

// ═══════════════════════════════════════════════════════════════════════════════════════
// VIDA'S MEMORY — ONE THREAD PER OPERATOR, PER CLIENT. (R121, BUILD 3.)
//
// 🛑 SHE HAD NONE. The operator's transcript lived in React state and died on reload, while
// the CLIENT's own Milla thread had been persisted for a day. A colleague who forgets the
// conversation every time you refresh is not a colleague.
//
// ⚠️ BEST-EFFORT BY CONTRACT, EXACTLY LIKE THE BRIEF TRANSCRIPT. A memory that cannot be
// stored must never cost the operator their answer — the reply is already composed by the
// time this is called. Every function here answers rather than throwing.
// ═══════════════════════════════════════════════════════════════════════════════════════

export type VidaTurn = { role: 'operator' | 'vida'; text: string; at: string }

/**
 * ⚠️ BOUNDED IN BOTH DIRECTIONS. 40 turns is what the model is given and what is kept; a
 * thread that grew without limit would eventually cost more in context than it is worth and
 * would push the model call past the proxy's budget.
 */
export const VIDA_MAX_TURNS = 40
export const VIDA_MAX_CHARS = 4000

/** Whatever is in the column, read defensively — it is JSON and nothing validates it there. */
export function readVidaConversation(v: unknown): VidaTurn[] {
  if (!Array.isArray(v)) return []
  const out: VidaTurn[] = []
  for (const raw of v) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const r = raw as { role?: unknown; text?: unknown; at?: unknown }
    if (r.role !== 'operator' && r.role !== 'vida') continue
    if (typeof r.text !== 'string') continue
    const text = r.text.slice(0, VIDA_MAX_CHARS)
    if (text.trim() === '') continue
    out.push({ role: r.role, text, at: typeof r.at === 'string' ? r.at : '' })
  }
  return out.slice(-VIDA_MAX_TURNS)
}

/**
 * 🛑 THE THREAD FOR THIS OPERATOR AND THIS CLIENT, AND NOBODY ELSE'S.
 *
 * ⚠️ BOTH KEYS OR NOTHING. Reading by `client_id` alone would hand one operator another's
 * half-finished thought as context; reading by `operator` alone would carry client A's
 * conversation into client B, which is the leak this build is tested against.
 */
export async function vidaConversationFor(
  operator: string, clientId: string,
): Promise<VidaTurn[]> {
  return (await readThread(operator, clientId)).turns
}

/**
 * 🛑 "THERE IS NO THREAD" AND "WE COULD NOT READ THE THREAD" ARE DIFFERENT FACTS.
 *
 * ⛓️ 14 Sep (F5) — THEY USED TO BE THE SAME `[]`, and that cost the operator their history.
 * `appendVidaConversation` reads, merges and writes back. When the read FAILED it received an
 * empty list, merged this turn onto nothing, and upserted the result — so a transient
 * database blip did not lose one turn, it **overwrote the entire conversation with the single
 * turn that happened to be in flight**, and reported `ok: true` while doing it.
 *
 * It is the same shape as the defect the Brief closed on the model path: an EMPTY that means
 * "we do not know" being written as if it meant "there is nothing".
 *
 * ⚠️ READING STILL FAILS SOFT. A caller that only wants to SHOW the thread gets `[]` and Vida
 * answers without her memory, which is right — an unreadable thread must never cost the
 * operator their answer. Only the WRITER is allowed to care about the difference, because
 * only the writer can destroy something.
 */
async function readThread(
  operator: string, clientId: string,
): Promise<{ ok: boolean; turns: VidaTurn[] }> {
  try {
    const { data, error } = await db.from('vida_conversations')
      .select('conversation').eq('operator', operator).eq('client_id', clientId).maybeSingle()
    if (error) return { ok: false, turns: [] }
    if (!data) return { ok: true, turns: [] }          // genuinely no thread yet
    return { ok: true, turns: readVidaConversation((data as { conversation: unknown }).conversation) }
  } catch { return { ok: false, turns: [] } }
}

/**
 * Append this exchange and store the bounded tail.
 *
 * ⚠️ READ-MODIFY-WRITE, AND THAT IS ACCEPTABLE HERE. One operator is one person typing in one
 * console; a lost message under concurrent writes would be a cosmetic loss in a transcript,
 * not a loss of customer truth. The Brief — which IS customer truth — is merged server-side
 * under its own rules and is untouched by anything in this file.
 */
export async function appendVidaConversation(
  operator: string, clientId: string, turns: VidaTurn[],
): Promise<{ ok: boolean }> {
  if (turns.length === 0) return { ok: true }
  try {
    // 🛑 FAIL CLOSED ON AN UNKNOWN THREAD. Writing when we could not read means upserting a
    // conversation assembled from nothing — every turn already exchanged, gone, replaced by
    // whichever message happened to be in flight. The operator loses their answer for this
    // turn; they do not lose the conversation.
    const existing = await readThread(operator, clientId)
    if (!existing.ok) return { ok: false }
    const merged = readVidaConversation([...existing.turns, ...turns])
    const { error } = await db.from('vida_conversations')
      .upsert({
        operator, client_id: clientId,
        conversation: merged,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'operator,client_id' })
    return { ok: !error }
  } catch { return { ok: false } }
}
