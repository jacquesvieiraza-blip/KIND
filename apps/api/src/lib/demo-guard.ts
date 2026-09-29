// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 ② · PR 1f) — THE DEMO LOOKS REAL AND DOES NOTHING REAL.
//
// The audit found doors a demo account could walk through for real: send a real team invite
// (Resend), provision a company and email real seat invites, page the founder with a real
// "meeting challenged" alert, bind a real Google account, be settled, and be un-demoed from Money
// Path (which removes every R164 lock at once). Each door now asks one question first.
//
// ⚠️ THIS CHECK FAILS CLOSED. `isDemoClient` (lib/demo.ts) treats an unreadable row as NOT a demo
// — right for reads, wrong for a door that sends mail. Here "could not tell" is its own answer,
// and the caller refuses on it.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

export type DemoCheck = 'demo' | 'real' | 'unknown'

export const DEMO_NOTHING_DONE =
  'This is a demo account — it can never send an invite or an alert, connect a real account or move credit. Nothing was done.'
export const DEMO_UNKNOWN =
  'Whether this is a demo account could not be read, so nothing was sent. Please try again.'

export async function demoCheck(clientId: string | null | undefined): Promise<DemoCheck> {
  if (!clientId) return 'unknown'
  const { data, error } = await db.from('clients').select('is_demo').eq('id', clientId).maybeSingle()
  if (error || !data) return 'unknown'
  return (data as { is_demo?: boolean | null }).is_demo === true ? 'demo' : 'real'
}

export async function programmeDemoCheck(programmeId: string): Promise<DemoCheck> {
  const { data, error } = await db.from('programmes').select('client_id').eq('id', programmeId).maybeSingle()
  if (error || !data) return 'unknown'
  return demoCheck((data as { client_id?: string | null }).client_id)
}

/** The refusal for a door that must stay shut to a demo: 403 for a demo, 503 when unreadable. */
export function demoRefusal(check: DemoCheck): { status: 403 | 503; error: string } | null {
  if (check === 'demo') return { status: 403, error: DEMO_NOTHING_DONE }
  if (check === 'unknown') return { status: 503, error: DEMO_UNKNOWN }
  return null
}
