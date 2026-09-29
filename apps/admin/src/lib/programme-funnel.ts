// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 · 5i) — THE GTM FUNNEL IS THE PROGRAMME'S SIX STAGES.
//
// ⛓️ WAS visitors → signups → "started trial" → "paid", the last two read from subscriptions —
// which no client has on the programme, so it showed 0 paid for every real client. Now:
//   Brief → Proof → Paid → Approval → Results → Complete
// counted as a COHORT: each client counts at every stage up to the furthest they reached, so
// each stage is a subset of the one before and no conversion can exceed 100% (the old bug a
// snapshot count produced). The demo and House are left out of every stage. Pure.
// ═══════════════════════════════════════════════════════════════════════════════════════

export const FUNNEL_STAGES = ['Brief', 'Proof', 'Paid', 'Approval', 'Results', 'Complete'] as const
export type FunnelStage = typeof FUNNEL_STAGES[number]

export type FunnelProgramme = {
  client_id: string; status: string
  first_paid_at: string | null; approved_at: string | null
  went_live_at: string | null; run_at?: string | null
}

/** How far one programme got, as an index into FUNNEL_STAGES (Paid = 2 … Complete = 5). */
function programmeReach(p: FunnelProgramme): number {
  if (p.status === 'COMPLETED') return 5
  if (p.run_at || p.went_live_at) return 4
  if (p.approved_at) return 3
  if (p.first_paid_at) return 2
  return 1   // a programme exists without payment — they are at least through Proof
}

export function programmeFunnel(input: {
  clientIds: string[]                 // every client with an account (they started the Brief)
  proofClientIds: Set<string>         // clients who started a Proof
  programmes: FunnelProgramme[]
  excluded: Set<string>               // demo ∪ House
}): Array<{ stage: FunnelStage; count: number }> {
  const reach = new Map<string, number>()
  for (const id of input.clientIds) if (!input.excluded.has(id)) reach.set(id, 0)
  for (const id of input.proofClientIds) if (reach.has(id)) reach.set(id, Math.max(reach.get(id)!, 1))
  for (const p of input.programmes) {
    if (!reach.has(p.client_id)) continue
    reach.set(p.client_id, Math.max(reach.get(p.client_id)!, programmeReach(p)))
  }
  return FUNNEL_STAGES.map((stage, i) => ({ stage, count: [...reach.values()].filter(r => r >= i).length }))
}
