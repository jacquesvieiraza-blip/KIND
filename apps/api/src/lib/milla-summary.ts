// THE CLIENT SNAPSHOT — one builder, every door.
//
// Extracted VERBATIM from /leads/milla-summary on 12 Aug so Milla's chat could speak from
// the same numbers the desk's KPIs show. The alternative — copying the queries into the
// chat path — is the drift bug this repo keeps re-learning (#570's "mirrors exactly"
// comment that didn't; the campaign lookup that was nearly copied into approve's 3b):
// two copies of "what is this client's state" WILL disagree, and the chat one would
// disagree in front of a client. So the route now calls this, and the chat calls this,
// and there is exactly one answer to the question.
//
// ⚠️ MONEY NOTE preserved from the route: spend is NOT `approved × $4`. The first
// PACK_LEADS approvals are INSIDE the pack price — see the inline comment at spend_usd,
// which fixed a 4× overstatement on the client's own Reports page.

import { db } from '@kind/db'
// BUILD-003 item 2 — public.meetings is the sole source of meeting counts.
import { meetingCounts } from './meeting-truth'
import { PAID_TX_TYPES, PACK_PRICE_USD, LEAD_PRICE_USD, packState } from './onboarding-pack'

export interface MillaSummaryData {
  wallet_balance_usd: number
  has_funded: boolean
  /** ⚑ 24 Aug — HOW MANY FREE-PROOF BATCHES THIS PROSPECT HAS ALREADY BEEN SHOWN.
   *  Read straight from `clients.proof_passes_done`, the SAME column
   *  `try_claim_proof_pass` increments — there is no second counter, and this is a
   *  read only. The desk needs it so it can tell three states apart WITHOUT pressing
   *  anything to find out: 0 = nothing spent · 1 = refinement and a second batch are
   *  available · 2 = both spent, a human takes it from here. Before this, the only way
   *  to learn the third state was to POST and read the 409. */
  proof_passes_done: number
  /**
   * ⚑ 26 Aug — WHEN THE CURRENT PROOF PASS WAS CLAIMED. ISO string, or null.
   *
   * Read straight from `clients.proof_started_at`, which `try_claim_proof_pass` writes in
   * the SAME atomic statement that increments the counter above. It therefore always
   * describes the LATEST claim — pass 1 sets it, pass 2 advances it, a refused claim never
   * reaches it — and the pass it belongs to is `proof_passes_done` in the same row.
   *
   * ⚠️ THIS IS THE DESK'S AUTHORITATIVE CLOCK, and it exists to end an inference. The desk
   * decides "still finding your matches" from the approved recovery copy by elapsed time,
   * and it used to get that from the browser: a `?since=` stamp written only AFTER the
   * /proof POST returned, mirrored into localStorage. A server that claimed the pass and
   * then lost its response left a claimed run whose start existed nowhere; a clean URL lost
   * it; another device never had it; a stale stamp from an older pass could make a fresh run
   * look old enough to have failed. None of that can happen to a value the claim itself
   * wrote.
   *
   * ⚠️ NULL MEANS UNKNOWN, NEVER "LONG AGO". Rows that predate the column stay null and are
   * never backfilled — there is no truthful source to backfill from. The desk treats null as
   * "may still be running" under its bounded poll rather than inventing an age.
   */
  proof_started_at: string | null
  pack: ReturnType<typeof packState>
  leads_awaiting: number
  meetings_booked: number
  leads_approved_total: number
  replies_total: number
  meetings_total: number
  spend_usd: number
  active_campaign: string | null
  campaign_name: string | null
  campaign_status: string | null
  recent_replies: { name: string; classification: string }[]
  icp_versions: { version: string; current: boolean; name: string; summary: string; created_at: string | null }[]
  /**
   * ⚑ 26 Aug — THE TERMINAL TRUTH OF THE LAST RUN, so the desk can stop guessing.
   *
   * The proof desk decided "still finding" from a URL flag and "finished" from leads
   * appearing. A run that finished with ZERO therefore spun forever: no leads ever
   * arrived, so nothing ever cleared the flag, and after ~60s the copy only changed to
   * "we're still finding your matches" — which was false. The run had ended.
   *
   * `runIcpJob` already records exactly one `icp_run_outcomes` row per completed run,
   * with canonical client copy from `runOutcomeMessage()`. It was simply never read.
   * This carries it on the summary the desk ALREADY polls — no new endpoint, no extra
   * request, no migration.
   *
   * ⚠️ `null` means NO RUN HAS EVER COMPLETED for this client — which is not the same as
   * "still running". The desk pairs this with the run it started; see `finished_at`.
   */
  proof_run: { status: string; message: string; total_inserted: number; finished_at: string | null } | null
}

export async function buildMillaSummaryData(clientId: string): Promise<MillaSummaryData> {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

  const [{ data: client }, awaiting, meetings, campaign, replies, icps, approvedTotal, repliesTotal, meetingsTotal, purchases, lastRun] = await Promise.all([
    db.from('clients').select('wallet_balance_usd, proof_passes_done, proof_started_at').eq('id', clientId).maybeSingle(),
    // mirrors /for-approval — the exact set of masked cards the client can act on
    db.from('leads').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).not('delivered_at', 'is', null)
      .not('surfaced_for_approval_at', 'is', null)   // no TTL — see /for-approval
      .is('revealed_at', null).neq('status', 'passed'),
    // ⛓️ COUNTED calendar_bookings (BUILD-003 item 2) — an operational record of what we
    // asked Google to create, blind to duplicates, spam and reschedules. Milla told the
    // client a number that could double-count a meeting they moved. Now public.meetings.
    meetingCounts({ clientId, since: monthStart }),
    // Name AND status of the newest campaign, whatever state it is in. Filtering to
    // status='active' meant a paused or cold-suspended client was indistinguishable from
    // one with no campaign at all — and Milla told both of them "Campaign live".
    db.from('figsy_campaigns').select('name, status').eq('client_id', clientId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('figsy_replies').select('from_name, from_email, classification, received_at')
      .eq('client_id', clientId).order('received_at', { ascending: false }).limit(4),
    // #495 — each icps row is a version; oldest = v1. Real history, no fabrication.
    db.from('icps').select('name, industries, geographies, seniority_levels, company_sizes, job_titles, created_at')
      .eq('client_id', clientId).order('created_at', { ascending: true }).limit(12),
    // (audit fix) REAL all-time counts for the report — the reports page was deriving these
    // from a 50-row ledger slice / a 4-row replies rail, so healthy accounts under-counted.
    db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('revealed_at', 'is', null),
    db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    // Same move, all-time.
    meetingCounts({ clientId }),
    // NO FREEBIES — has this client EVER paid? (any wallet top-up / purchase). Drives the
    // paywall: no purchase → the client is gated until they load their wallet.
    db.from('credit_transactions').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).in('type', PAID_TX_TYPES),
    // ⚑ 26 Aug — the newest COMPLETED run for this client, whatever it concluded.
    // `runIcpJob` writes exactly one of these at the end of every run it finishes, so its
    // presence is the terminal signal the desk was missing. Read across the client rather
    // than one ICP: the desk does not track which ICP a proof run belonged to, and a
    // prospect has exactly one core ICP anyway.
    db.from('icp_run_outcomes').select('status, message, total_inserted, created_at')
      .eq('client_id', clientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  // Pack state: bought it? how many of the included approvals have they used? Both derived
  // from rows that already exist, so there is no column to keep in sync.
  const { count: approvedEver } = await db.from('leads').select('id', { count: 'exact', head: true })
    .eq('client_id', clientId).not('revealed_at', 'is', null)
  const pack = packState((purchases.count ?? 0) > 0, approvedEver ?? 0)

  const icpRows = (icps.data ?? []) as Array<Record<string, unknown>>
  const arr = (v: unknown): string[] => Array.isArray(v) ? (v as string[]).filter(Boolean) : []
  const icp_versions = icpRows.map((r, i) => ({
    version: `v${i + 1}`,
    current: i === icpRows.length - 1,
    name: (r.name as string | null) ?? `ICP v${i + 1}`,
    summary: [
      arr(r.seniority_levels).join(' / ') || null,
      arr(r.industries).join(', ') || null,
      arr(r.geographies).join(', ') || null,
      arr(r.company_sizes).length ? `${arr(r.company_sizes)[0]}–${arr(r.company_sizes).slice(-1)[0]} staff` : null,
    ].filter(Boolean).join(' · '),
    created_at: (r.created_at as string | null) ?? null,
  }))

  return {
    wallet_balance_usd: Number((client as Record<string, number> | null)?.wallet_balance_usd ?? 0),
    // ⚑ 24 Aug — the existing column, read as-is. Fails to 0.
    //
    // ⛓️ CORRECTED 25 Aug: this said 0 "offers the refinement rather than hiding it". That
    // was the wrong way round and the founder caught it. The desk gates on
    // `proofPassesDone === 1`, so 0 HIDES the control. Failing to 0 is still the safe
    // direction — it just earns that description by offering nothing, not by offering
    // something. The behaviour is right; only the sentence describing it was wrong, and it
    // is the sentence that changed.
    proof_passes_done: Number((client as Record<string, number> | null)?.proof_passes_done ?? 0),
    // ⚑ 26 Aug — the claim's own stamp, passed through untouched. Absent column (migration
    // not yet run) and absent value both read as null, which the desk treats as UNKNOWN.
    proof_started_at: (() => {
      const v = (client as Record<string, unknown> | null)?.proof_started_at
      return typeof v === 'string' && v.length > 0 ? v : null
    })(),
    // ⚠️ NULL means no run has ever COMPLETED — never "still running". The desk decides
    // which by comparing `finished_at` against the moment it started the run it is
    // waiting on; an older outcome belongs to an earlier pass and must not end this one.
    proof_run: (() => {
      const r = (lastRun as { data?: Record<string, unknown> | null } | null)?.data
      if (!r) return null
      return {
        status:         String(r.status ?? ''),
        message:        String(r.message ?? ''),
        total_inserted: Number(r.total_inserted ?? 0),
        finished_at:    r.created_at ? String(r.created_at) : null,
      }
    })(),
    // NO FREEBIES — true once the client has made their first purchase. The Milla
    // dashboard gates on this: no purchase → paywall to Billing.
    has_funded: (purchases.count ?? 0) > 0,
    // THE PACK — included approvals counted rather than faked into the wallet.
    pack,
    leads_awaiting:  awaiting.count ?? 0,
    // ⚠️ null means the meetings read FAILED. Reporting 0 would tell a client with three
    // meetings that they had none — Milla speaking a false number in her own voice.
    meetings_booked: meetings?.booked ?? 0,
    // Real all-time totals + true $ spend.
    //
    // ⚠️ NOT `approved × $4`. The first PACK_LEADS approvals are INSIDE the pack, so a
    // client who used their included hundred was shown "$400 spent" against the pack
    // payment — a 4× overstatement, on the client's own Reports page. Same bug was
    // fixed on the Vida side and missed here, which is the worse of the two: they read
    // this one. Spend = the pack they bought + $4 for each approval BEYOND it.
    leads_approved_total: approvedTotal.count ?? 0,
    replies_total:        repliesTotal.count ?? 0,
    meetings_total:       meetingsTotal?.booked ?? 0,
    spend_usd:            pack.active
      ? PACK_PRICE_USD + Math.max(0, (approvedTotal.count ?? 0) - pack.included) * LEAD_PRICE_USD
      : (approvedTotal.count ?? 0) * LEAD_PRICE_USD,
    // active_campaign stays "the name of a LIVE campaign" so existing readers are
    // unchanged; campaign_status is the honest one.
    active_campaign: (campaign.data as { status?: string } | null)?.status === 'active'
      ? ((campaign.data as { name?: string } | null)?.name ?? null) : null,
    campaign_name:   (campaign.data as { name?: string } | null)?.name ?? null,
    campaign_status: (campaign.data as { status?: string } | null)?.status ?? null,
    recent_replies:  (replies.data ?? []).map((r: Record<string, unknown>) => ({
      name: (r.from_name as string | null) ?? (r.from_email as string | null) ?? 'Reply',
      classification: (r.classification as string | null) ?? 'reply',
    })),
    icp_versions,
  }
}
