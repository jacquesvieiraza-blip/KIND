export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Activity, CheckCircle2, Circle, AlertTriangle, Flag } from 'lucide-react'

// ITEM 192 — Onboarding activation tracking + nudges
// READ-ONLY funnel computed from EXISTING data. No new table / column / migration.
// Milestones (first-value path):
//   signup            → clients.created_at
//   ICP set           → an `icps` row exists for the client
//   first campaign    → a figsy_campaigns row with status='active' exists
//   first lead        → at least one `leads` row exists
//   first reply       → at least one `figsy_replies` row exists
// "Stalled" = the NEXT milestone hasn't been hit and the client has been
// waiting on it longer than that step's grace window (days since the previous
// milestone). Surfaced as a flag only — no notification infra is created.

const MILESTONES = ['signup', 'icp', 'campaign', 'lead', 'reply'] as const
type MilestoneKey = typeof MILESTONES[number]

const MILESTONE_LABEL: Record<MilestoneKey, string> = {
  signup: 'Signed up',
  icp: 'ICP set',
  campaign: 'First campaign live',
  lead: 'First lead delivered',
  reply: 'First reply',
}

// Grace window (days) allowed to reach EACH milestone after the previous one
// before the client is considered stalled on it. signup has no predecessor.
const STALL_DAYS: Record<Exclude<MilestoneKey, 'signup'>, number> = {
  icp: 3,        // 3 days after signup with no ICP → stalled
  campaign: 5,   // 5 days after ICP with no live campaign
  lead: 7,       // 7 days after campaign live with no lead
  reply: 14,     // 14 days after first lead with no reply
}

interface ClientActivation {
  id: string
  name: string
  created_at: string
  // timestamp each milestone was reached (or null if not yet)
  reached: Record<MilestoneKey, string | null>
  doneCount: number
  next: MilestoneKey | null          // next milestone to hit (null = fully activated)
  stalled: boolean
  stalledDays: number | null         // days waiting on `next` (if stalled)
}

function daysBetween(from: string, to: number): number {
  return Math.floor((to - new Date(from).getTime()) / 86400000)
}

async function getActivation(): Promise<{
  clients: ClientActivation[]
  funnel: Record<MilestoneKey, number>
  stalledCount: number
}> {
  const empty = {
    clients: [],
    funnel: { signup: 0, icp: 0, campaign: 0, lead: 0, reply: 0 } as Record<MilestoneKey, number>,
    stalledCount: 0,
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return empty

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  const [
    { data: clientsRaw },
    { data: icps },
    { data: campaigns },
    { data: leads },
    { data: replies },
  ] = await Promise.all([
    db.from('clients').select('id, company_name, created_at').order('created_at', { ascending: false }),
    db.from('icps').select('client_id, created_at'),
    db.from('figsy_campaigns').select('client_id, created_at, status').eq('status', 'active'),
    db.from('leads').select('client_id, created_at'),
    db.from('figsy_replies').select('client_id, received_at'),
  ])

  // For each table, keep the EARLIEST timestamp per client = when that milestone was first reached.
  function earliestByClient(rows: Array<Record<string, unknown>> | null, tsKey: string): Record<string, string> {
    const out: Record<string, string> = {}
    for (const r of rows || []) {
      const cid = r['client_id'] as string
      const ts = r[tsKey] as string | null
      if (!cid || !ts) continue
      if (!out[cid] || ts < out[cid]) out[cid] = ts
    }
    return out
  }

  const icpAt = earliestByClient(icps, 'created_at')
  const campaignAt = earliestByClient(campaigns, 'created_at')
  const leadAt = earliestByClient(leads, 'created_at')
  const replyAt = earliestByClient(replies, 'received_at')

  const now = Date.now()
  const funnel: Record<MilestoneKey, number> = { signup: 0, icp: 0, campaign: 0, lead: 0, reply: 0 }

  const clients: ClientActivation[] = (clientsRaw || []).map(c => {
    const reached: Record<MilestoneKey, string | null> = {
      signup: c.created_at,
      icp: icpAt[c.id] || null,
      campaign: campaignAt[c.id] || null,
      lead: leadAt[c.id] || null,
      reply: replyAt[c.id] || null,
    }

    // Milestones are sequential first-value steps: doneCount counts the contiguous
    // run from signup so the funnel reflects the real activation path.
    let doneCount = 0
    for (const m of MILESTONES) {
      if (reached[m]) doneCount++
      else break
    }

    const next: MilestoneKey | null = doneCount < MILESTONES.length ? MILESTONES[doneCount] : null

    // Tally funnel counts (each reached milestone in the contiguous run)
    for (let i = 0; i < doneCount; i++) funnel[MILESTONES[i]]++

    // Stalled? compare time waiting on `next` against its grace window.
    let stalled = false
    let stalledDays: number | null = null
    if (next && next !== 'signup') {
      const prev = MILESTONES[doneCount - 1]
      const since = reached[prev] // when the previous milestone was reached
      if (since) {
        const waiting = daysBetween(since, now)
        stalledDays = waiting
        if (waiting >= STALL_DAYS[next as Exclude<MilestoneKey, 'signup'>]) stalled = true
      }
    }

    return {
      id: c.id,
      name: c.company_name || '(unnamed)',
      created_at: c.created_at,
      reached,
      doneCount,
      next,
      stalled,
      stalledDays,
    }
  })

  const stalledCount = clients.filter(c => c.stalled).length
  return { clients, funnel, stalledCount }
}

function FunnelBar({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-[#7C3AED] rounded-full" style={{ width: `${w}%` }} />
    </div>
  )
}

export default async function ActivationPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const stalledOnly = searchParams.filter === 'stalled'
  const { clients, funnel, stalledCount } = await getActivation()
  const total = funnel.signup || 1
  const rows = stalledOnly ? clients.filter(c => c.stalled) : clients

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Activation Status</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            First-value path — signup → ICP → campaign → lead → reply. Read-only, computed from live data.
          </p>
        </div>
        {stalledCount > 0 && (
          <Link
            href={stalledOnly ? '/activation' : '/activation?filter=stalled'}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              stalledOnly
                ? 'bg-red-500 text-white'
                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            {stalledCount} Stalled
          </Link>
        )}
      </div>

      {/* Funnel strip */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-900">
          <Activity className="w-4 h-4 text-[#7C3AED]" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Activation Funnel</h2>
        </div>
        <div className="space-y-3">
          {MILESTONES.map(m => {
            const value = funnel[m]
            const rate = Math.round((value / total) * 100)
            return (
              <div key={m} className="grid grid-cols-[180px_1fr_80px] items-center gap-4">
                <span className="text-sm text-gray-700">{MILESTONE_LABEL[m]}</span>
                <FunnelBar value={value} max={total} />
                <span className="text-sm text-gray-500 text-right">
                  <span className="font-semibold text-gray-900">{value}</span> · {rate}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-client table */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Flag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{stalledOnly ? 'No stalled clients' : 'No clients yet'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Company</th>
                {MILESTONES.map(m => (
                  <th key={m} className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {MILESTONE_LABEL[m].split(' ')[0]}
                  </th>
                ))}
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Next</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {rows.map(c => (
                <tr key={c.id} className={`hover:bg-purple-50/30 transition-colors ${c.stalled ? 'bg-red-50/20' : ''}`}>
                  <td className="px-5 py-3">
                    <Link href={`/clients/${c.id}`} className="font-medium text-gray-900 hover:text-[#7C3AED]">
                      {c.name}
                    </Link>
                  </td>
                  {MILESTONES.map(m => (
                    <td key={m} className="px-3 py-3 text-center">
                      {c.reached[m] ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-200 mx-auto" />
                      )}
                    </td>
                  ))}
                  <td className="px-5 py-3 text-gray-600">
                    {c.next ? MILESTONE_LABEL[c.next] : (
                      <span className="text-emerald-600 font-medium">Fully activated</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {c.stalled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3" />
                        Stalled {c.stalledDays}d
                      </span>
                    ) : c.next === null ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                        ● Activated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-[#7C3AED] border border-purple-100">
                        On track
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Metric notes */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6 text-xs text-gray-400 space-y-1">
        <p><strong className="text-gray-500">Signed up</strong> — <code>clients.created_at</code></p>
        <p><strong className="text-gray-500">ICP set</strong> — an <code>icps</code> row exists for the client</p>
        <p><strong className="text-gray-500">First campaign live</strong> — a <code>figsy_campaigns</code> row with <code>status = active</code></p>
        <p><strong className="text-gray-500">First lead delivered</strong> — at least one <code>leads</code> row</p>
        <p><strong className="text-gray-500">First reply</strong> — at least one <code>figsy_replies</code> row</p>
        <p className="pt-1">
          <strong className="text-gray-500">Stalled</strong> — waiting on the next milestone longer than its grace
          window (ICP {STALL_DAYS.icp}d · campaign {STALL_DAYS.campaign}d · lead {STALL_DAYS.lead}d · reply {STALL_DAYS.reply}d).
        </p>
      </div>
    </div>
  )
}
