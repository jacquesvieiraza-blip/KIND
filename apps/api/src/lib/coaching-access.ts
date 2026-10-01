// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 · R184 · Coaching) — WHAT COACHING THIS CLIENT HAS. One answer, every feature.
//
// R180's ladder: every plan gets meeting prep and "How did it go?"; Growth ($199) also gets
// What's converting and post-meeting follow-up; Enterprise ($299) has the WHOLE Coaching product;
// Founders and Growth get the whole product once they turn on Full Coaching (F3 · R184: +$100 per
// meeting still to come). Every Coaching feature asks THIS function, never the band directly, so
// the ladder lives in one place.
//
// Unreadable → the lowest tier ('founders', not full): a feature is never unlocked on a guess.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'
import type { SizeBand } from '@kind/shared'

export type CoachingAccess = {
  plan: SizeBand | null
  /** Growth's own extras: What's converting, follow-up drafts. Growth, Enterprise, or Full Coaching. */
  growthExtras: boolean
  /** The whole Coaching product: Enterprise, or Founders/Growth with Full Coaching turned on. */
  full: boolean
  /** Full Coaching was bought for this programme (F3). Enterprise has it without buying it. */
  activated: boolean
  programmeId: string | null
}

const NONE: CoachingAccess = { plan: null, growthExtras: false, full: false, activated: false, programmeId: null }

/** Pure: the ladder. Tested directly. */
export function accessFrom(plan: SizeBand | null, activated: boolean): Omit<CoachingAccess, 'programmeId'> {
  const full = plan === 'enterprise' || activated
  return { plan, activated, full, growthExtras: full || plan === 'growth' }
}

/** Has Full Coaching been bought for this programme? An absent table (F3 not migrated) is "no". */
export async function coachingActivated(programmeId: string): Promise<boolean> {
  const { data, error } = await db.from('coaching_activations').select('id').eq('programme_id', programmeId).limit(1)
  if (error) return false
  return (data ?? []).length > 0
}

/** The client's Coaching access, from their open programme (or their latest one). */
export async function coachingAccessFor(clientId: string): Promise<CoachingAccess> {
  try {
    const { data, error } = await db.from('programmes').select('id, size_band, status, created_at')
      .eq('client_id', clientId).order('created_at', { ascending: false }).limit(5)
    if (error || !data || data.length === 0) return NONE
    const rows = data as Array<{ id: string; size_band: string | null; status: string }>
    const p = rows.find(r => !['COMPLETED', 'CANCELLED'].includes(r.status)) ?? rows[0]
    const plan = (['founders', 'growth', 'enterprise'] as const).find(b => b === p.size_band) ?? null
    const activated = plan && plan !== 'enterprise' ? await coachingActivated(p.id) : false
    return { ...accessFrom(plan, activated), programmeId: p.id }
  } catch { return NONE }
}
