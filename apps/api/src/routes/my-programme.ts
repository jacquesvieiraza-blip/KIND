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
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import {
  millaStage, type MillaStage, STAGE_QUICK_ACTION, MILLA_FAILURE_COPY,
  type EngineProgrammeStatus,
} from '@kind/shared'

export const myProgrammeRouter = Router()
myProgrammeRouter.use(requireAuth)

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

/**
 * What the customer's workspace needs to render one stage.
 *
 * ⚠️ EVERY FIELD IS A ROW THAT EXISTS OR A SUBTRACTION OF TWO. No projected completion date,
 * no confidence score, no "on track" — the same rule the operator read model follows, applied
 * where it matters more: a made-up number in front of a client is a promise.
 */
export type CustomerProgramme = {
  stage: MillaStage
  quickAction: string
  /** Orthogonal to stage — a paused programme keeps the stage it will return to. */
  paused: boolean
  /** LOCKED founder copy, sent from the server so the client cannot drift from it. */
  pausedCopy: string | null
  /** A review decision is waiting. Distinct from paused: live delivery continues. */
  reviewOpen: boolean
  outcome: {
    /** 'meetings' today; anything else was captured conversationally and routed to a human. */
    kind: 'meetings' | 'other'
    target: number | null
  }
  progress: {
    /** Delivered against what the programme authorised. Both straight off the row. */
    delivered: number
    authorised: number
    /** Booked meetings — from public.meetings, the sole meeting truth. null = unreadable. */
    outcomesAchieved: number | null
  }
  money: {
    totalCents: number
    firstPaidAt: string | null
    secondPaidAt: string | null
  }
  approvedAt: string | null
  wentLiveAt: string | null
}

myProgrammeRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db.from('programmes')
      .select('id, status, meeting_target, price_total_cents, sourcing_ceiling, sourced_used, ' +
              'first_paid_at, second_paid_at, approved_at, went_live_at, paused_at, ' +
              'review_required_at, review_resolved_at')
      .eq('client_id', clientId)
      .not('status', 'in', '(COMPLETED,CANCELLED)')
      .limit(1).maybeSingle()

    // 🛑 A FAILED READ IS NOT "NO PROGRAMME". Returning `{ programme: null }` here would render
    // the Proof stage to a client who has paid — telling them their programme does not exist.
    // 503 + the locked sentence instead, which says what has NOT changed.
    if (error) {
      console.error('[programme/me] read failed for client', clientId, error.message)
      res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
      return
    }

    // No row is a real answer: this client has not started a programme. Proof stage.
    if (!data) {
      res.json({
        success: true,
        data: {
          stage: 'Proof' as MillaStage,
          quickAction: STAGE_QUICK_ACTION.Proof,
          paused: false, pausedCopy: null, reviewOpen: false,
          outcome: { kind: 'meetings' as const, target: null },
          progress: { delivered: 0, authorised: 0, outcomesAchieved: 0 },
          money: { totalCents: 0, firstPaidAt: null, secondPaidAt: null },
          approvedAt: null, wentLiveAt: null,
        } satisfies CustomerProgramme,
      })
      return
    }

    const p = data as unknown as Record<string, unknown>
    const reviewOpen = Boolean(p.review_required_at) && !p.review_resolved_at
    const stage = millaStage({ status: p.status as EngineProgrammeStatus, reviewOpen })

    // ⚠️ MEETINGS COME FROM `public.meetings` AND NOWHERE ELSE — the sole meeting truth
    // (BUILD-003 PR1). `null` means unreadable and is passed through as null: rendering a
    // storage failure as "0 meetings booked" would tell a client their programme has produced
    // nothing, which is the most damaging possible false statement on this screen.
    let outcomesAchieved: number | null = null
    try {
      const { clientMeetingCounts } = await import('../lib/meeting-truth')
      const counts = await clientMeetingCounts([clientId])
      outcomesAchieved = counts === null ? null : (counts[clientId] ?? 0)
    } catch (err) {
      console.error('[programme/me] meeting counts unreadable for', clientId, err)
    }

    const out: CustomerProgramme = {
      stage,
      quickAction: STAGE_QUICK_ACTION[stage],
      paused: Boolean(p.paused_at),
      pausedCopy: p.paused_at ? MILLA_FAILURE_COPY.sourcingPaused : null,
      reviewOpen,
      // Option C: only a meetings programme exists in the engine today. A non-meeting outcome
      // is captured in conversation and routed to a human — it never reaches this row, so a
      // row that exists is always a meetings programme. Stated as data rather than assumed.
      outcome: { kind: 'meetings', target: Number(p.meeting_target ?? 0) || null },
      progress: {
        delivered: Number(p.sourced_used ?? 0),
        authorised: Number(p.sourcing_ceiling ?? 0),
        outcomesAchieved,
      },
      money: {
        totalCents: Number(p.price_total_cents ?? 0),
        firstPaidAt: (p.first_paid_at as string | null) ?? null,
        secondPaidAt: (p.second_paid_at as string | null) ?? null,
      },
      approvedAt: (p.approved_at as string | null) ?? null,
      wentLiveAt: (p.went_live_at as string | null) ?? null,
    }
    res.json({ success: true, data: out })
  } catch (err) {
    console.error('[programme/me]', err)
    res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
  }
})
