// #453 — DEMO MODE resolver. A client flagged `is_demo` (clients.is_demo) is a
// free, pool-only sales-demo account: it costs us $0 and must NEVER email a real
// prospect. This is the single source of truth for "is this client a demo?" used by
// the send backstop (lib/figsy.ts), the reveal endpoint (routes/leads.ts), sourcing
// (routes/icps.ts) and the enroll charge (chargeFigsyEnroll).
//
// Fail-SAFE for money (never charges a demo): on any lookup error we log and return
// false so a real client is never mis-treated as demo — the demo guarantees are
// enforced by MULTIPLE gates (backstop + call-site short-circuits), so a single
// failed lookup can't leak a prospect email on its own.

import { db } from '@kind/db'

export async function isDemoClient(clientId: string | null | undefined): Promise<boolean> {
  if (!clientId) return false
  try {
    const { data } = await db.from('clients').select('is_demo').eq('id', clientId).maybeSingle()
    return data?.is_demo === true
  } catch (err) {
    console.error('[demo] isDemoClient lookup failed (treating as non-demo):', err)
    return false
  }
}
