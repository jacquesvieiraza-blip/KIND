// ─────────────────────────────────────────────────────────────────────────────
// REVENUE EXCLUSIONS (admin app) — mirror of apps/api/src/lib/real-clients.ts.
// The two apps can't share code, so this is the admin-side single helper: every
// admin revenue page resolves its excluded client ids through THIS function.
//
// Founder-locked rule: admin money figures count real paying clients only —
// never demo/test accounts (clients.is_demo = true) and never the house account
// (the founder's own testing login, auth email = HOUSE_ACCOUNT_EMAIL).
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js'

/** The founder's own testing account — never revenue. Lower-cased for compares. */
export const HOUSE_ACCOUNT_EMAIL = 'hello@get-kind.com'

export interface AdminExclusions {
  /** demo ∪ house — drop from any revenue roll-up. */
  excludedClientIds: Set<string>
  demoClientIds: Set<string>
  houseClientIds: Set<string>
}

/**
 * Resolve demo + house client ids using a SERVICE-ROLE supabase client (server
 * components only — this reads the admin auth API). Fails OPEN: on any lookup
 * error the house set is simply empty, never throwing into a revenue page.
 */
export async function getRevenueExclusions(supabase: SupabaseClient): Promise<AdminExclusions> {
  const demoClientIds = new Set<string>()
  const houseClientIds = new Set<string>()
  const houseUserIds = new Set<string>()

  try {
    // Page through listUsers (perPage-cap agnostic: loop until an empty page).
    for (let page = 1; page <= 500; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
      const users = data?.users ?? []
      if (error || users.length === 0) break
      for (const u of users) {
        if ((u.email ?? '').trim().toLowerCase() === HOUSE_ACCOUNT_EMAIL) houseUserIds.add(u.id)
      }
    }
  } catch {
    // fail open — house simply isn't excluded rather than the page 500-ing.
  }

  const { data: clients } = await supabase.from('clients').select('id, user_id, is_demo')
  for (const c of (clients ?? []) as { id: string; user_id: string | null; is_demo: boolean | null }[]) {
    if (c.is_demo === true) demoClientIds.add(c.id)
    if (c.user_id && houseUserIds.has(c.user_id)) houseClientIds.add(c.id)
  }

  const excludedClientIds = new Set<string>([...demoClientIds, ...houseClientIds])
  return { excludedClientIds, demoClientIds, houseClientIds }
}
