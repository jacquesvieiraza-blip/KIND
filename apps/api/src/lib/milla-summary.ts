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
import { PAID_TX_TYPES, PACK_PRICE_USD, LEAD_PRICE_USD, packState } from './onboarding-pack'

export interface MillaSummaryData {
  wallet_balance_usd: number
  has_funded: boolean
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
}

export async function buildMillaSummaryData(clientId: string): Promise<MillaSummaryData> {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

  const [{ data: client }, awaiting, meetings, campaign, replies, icps, approvedTotal, repliesTotal, meetingsTotal, purchases] = await Promise.all([
    db.from('clients').select('wallet_balance_usd').eq('id', clientId).maybeSingle(),
    // mirrors /for-approval — the exact set of masked cards the client can act on
    db.from('leads').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).not('delivered_at', 'is', null)
      .not('surfaced_for_approval_at', 'is', null)   // no TTL — see /for-approval
      .is('revealed_at', null).neq('status', 'passed'),
    db.from('calendar_bookings').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).eq('status', 'confirmed').gte('start_time', monthStart),
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
    db.from('calendar_bookings').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'confirmed'),
    // NO FREEBIES — has this client EVER paid? (any wallet top-up / purchase). Drives the
    // paywall: no purchase → the client is gated until they load their wallet.
    db.from('credit_transactions').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).in('type', PAID_TX_TYPES),
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
    // NO FREEBIES — true once the client has made their first purchase. The Milla
    // dashboard gates on this: no purchase → paywall to Billing.
    has_funded: (purchases.count ?? 0) > 0,
    // THE PACK — included approvals counted rather than faked into the wallet.
    pack,
    leads_awaiting:  awaiting.count ?? 0,
    meetings_booked: meetings.count ?? 0,
    // Real all-time totals + true $ spend.
    //
    // ⚠️ NOT `approved × $4`. The first PACK_LEADS approvals are INSIDE the pack, so a
    // client who used their included hundred was shown "$400 spent" against the pack
    // payment — a 4× overstatement, on the client's own Reports page. Same bug was
    // fixed on the Vida side and missed here, which is the worse of the two: they read
    // this one. Spend = the pack they bought + $4 for each approval BEYOND it.
    leads_approved_total: approvedTotal.count ?? 0,
    replies_total:        repliesTotal.count ?? 0,
    meetings_total:       meetingsTotal.count ?? 0,
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
