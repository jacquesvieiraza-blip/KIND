// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 HOW MANY MEETINGS THIS CLIENT'S POOL CARRIES — assembled ONCE, read by every surface
//
// ── WHY THIS IS A MODULE AND NOT A SECOND COPY OF THE ROUTE BODY ────────────────────────
//
// `GET /icps/:id/capacity` already carried this assembly, and `icps.ts` says in its own words
// why it must not be duplicated: *"the figure a client is given at Brief, at Proof and at the
// Programme slider has to be one derivation or the slider will eventually stop at a number
// Milla never promised."* The Programme slider is now that third caller (R136 ⑥), so the
// assembly moved here rather than being written a second time.
//
// ⚠️ THE ARITHMETIC IS STILL NOT HERE EITHER. `poolCapacity` lives in `@kind/shared`; this
// module only gathers the three inputs it takes. Two layers, one derivation each.
//
// ── THE THREE READS, AND WHY EACH ONE IS THE READ IT IS ─────────────────────────────────
//
// ① MATCHED — the provider's own count for this targeting. Free: People Search costs nothing,
//    the reveal is the cost. An unreachable provider yields `known: false`, never a zero.
//
// ② EXCLUDED — anchored to the stamped `excluded:` sentence, which `removalReason` writes for
//    exactly the criterion that is an INSTRUCTION FROM THE CLIENT. Everything else the gate
//    sets aside is a person we could still contact, and must not be subtracted from a pool we
//    are about to make a promise against.
//
// ③ ALREADY WORKED — client-wide, NOT ICP-scoped, because the sourcing dedupe is keyed
//    `(client_id, apollo_id)` with no ICP in it. Somebody sourced under older targeting is
//    still unavailable under this one; scoping this count to `icp_id` would count them as
//    fresh and re-promise humans the product will decline to hand over.
//
// 🛑 `benchmark` AND `headroom` ARE DELIBERATELY ABSENT FROM THE CLIENT SHAPE. Founder-locked
// and reaffirmed 23 Sep — *"i said 400 internally. we dont disclose this."* A caller that needs
// them is an operator surface and calls `poolCapacity` itself.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { previewCount } from './apollo'

/** What a CLIENT surface may be told. No benchmark, no headroom, no rate. */
export interface ClientCapacity {
  matched: number
  excluded: number
  already_worked: number
  workable: number
  /** Meetings we can commit to against this pool. The number the slider stops at. */
  committed: number
  /**
   * ⚠️ AN HONEST NULL, NEVER A ZERO DRESSED AS AN ANSWER. If the provider could not be reached
   * we do not know the pool size, and "0 people · 0 meetings" would read as a fact about this
   * client's market rather than about our connection to a vendor.
   */
  known: boolean
}

type IcpRow = Parameters<typeof previewCount>[0] & { id: string }

/**
 * Assemble this client's capacity for one targeting.
 *
 * ⚠️ IT COSTS NOTHING AND WRITES NOTHING — a free provider preview plus two `head: true`
 * counts over rows we already own. Safe to call on a screen load; NOT safe to call per
 * keystroke, which is why the Programme calculator reads it once rather than per quote.
 */
export async function clientCapacityFor(clientId: string, icp: IcpRow): Promise<ClientCapacity> {
  const { poolCapacity } = await import('@kind/shared')

  const { count: excluded } = await db.from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId).eq('icp_id', icp.id)
    .like('set_aside_reason', 'excluded:%')

  const { count: worked } = await db.from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)

  const preview = await previewCount(icp, 'client')
  const matched = typeof preview?.count === 'number' ? preview.count : 0
  const cap = poolCapacity(matched, excluded ?? 0, worked ?? 0)

  return {
    matched,
    excluded: excluded ?? 0,
    already_worked: worked ?? 0,
    workable: cap.workable,
    committed: cap.committed,
    known: preview?.error == null,
  }
}

/**
 * The targeting a programme will actually source from: the client's live ICP, else their newest.
 *
 * 🛑 THE SAME RESOLUTION `client-programme-choice.ts` USES, and it has to stay the same one.
 * The slider stops at the capacity of the ICP the programme will run on; resolving a different
 * row here would cap the client against a pool their programme never touches.
 */
export async function activeIcpFor(clientId: string): Promise<IcpRow | null> {
  const { data: live } = await db.from('icps')
    .select('*').eq('client_id', clientId).eq('is_active', true)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if ((live as { id?: string } | null)?.id) return live as unknown as IcpRow
  const { data } = await db.from('icps')
    .select('*').eq('client_id', clientId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return (data as unknown as IcpRow | null) ?? null
}
