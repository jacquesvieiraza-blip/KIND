// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CUSTOMER'S PROGRAMME — the only programme truth Milla is allowed to read.
//
// ⚠️ ITS OWN ROUTER, AND THAT IS NOT TIDINESS. `routes/programme.ts` is the BUILD-002 operator
// money surface and gates EVERY route behind `adminKeyValid` at the router level — checkout,
// approve, pause, complete. A customer read cannot live in it: it would either be unreachable
// from a browser or it would require loosening that gate, which is the last gate that should
// ever be loosened. Separate router, session auth, read-only.
//
// 🛑 WHY THIS IS NOT `/operator/programme`. That endpoint exists and returns the right facts,
// and reusing it would have been one line. It is admin-key gated, and it returns OPERATOR
// truth: stranded batch ids, reservation arithmetic, "needs reconciling by hand", the internal
// blocker vocabulary. None of that belongs in front of a paying customer — a client reading
// "batch 3 is STRANDED, 150 records held" learns only that something is broken and that we
// talk about them in machine. So the customer gets its own read model, scoped to their own
// client by their own session, returning the seven stages the founder specified and nothing
// else.
//
// ⚠️ TENANCY COMES FROM THE SESSION, NEVER FROM THE REQUEST. `getClientId(req.userId)` — the
// same shape every other customer route uses. No `client_id` query parameter exists here, so
// there is nothing for a browser to tamper with.
//
// ⚠️ READ-ONLY. This router performs no writes at all. Payment, approval and go-live already
// have their own routes with their own money guards; a read model that could also spend would
// be the wrong place for either.
//
// ⚠️ `null` IS "UNKNOWN", NEVER "FINE". A failed read returns a 503 carrying the founder's
// locked copy rather than an empty programme — because an empty programme renders as "you have
// no programme", which for a paying client is a lie with their money in it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { Router } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { db } from '@kind/db'
import { MILLA_FAILURE_COPY } from '@kind/shared'
// ⚑ 30 Aug (BUILD-004A-2) — THE READ MOVED, THE CONTRACT DID NOT. Milla's chat now needs the
// same programme facts this route serves, and a second reader would be a second truth — the
// exact defect the 4A-1 live walk found (a campaign row saying "Paused" beside a programme
// saying "Proof"). One reader, two doors. This route's response shape is unchanged.
import { readCustomerProgramme, type CustomerProgramme } from '../lib/customer-programme'

export type { CustomerProgramme }

export const myProgrammeRouter = Router()
myProgrammeRouter.use(requireAuth)

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

myProgrammeRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const data = await readCustomerProgramme(clientId)
    // 🛑 A FAILED READ IS NOT "NO PROGRAMME". Returning `{ programme: null }` here would render
    // the Proof stage to a client who has paid — telling them their programme does not exist.
    // 503 + the locked sentence instead, which says what has NOT changed.
    if (data === null) {
      res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
      return
    }
    res.json({ success: true, data })
  } catch (err) {
    console.error('[programme/me]', err)
    res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
  }
})
