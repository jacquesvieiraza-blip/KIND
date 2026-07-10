export const dynamic = 'force-dynamic'

import { DollarSign, Database, Coins, Sprout, AlertTriangle } from 'lucide-react'
import { Page, SectionLabel, Card, TileGrid, Tile, Table, TR, TD, Pill } from '@/components/ui'
import CapEditor from './CapEditor'

// THE MONEY PATH (#448 / #449 p1-2) — admin view over the sourcing economy. Reads the
// API (/money-path/*) server-side with the admin key (same pattern as revenue/clients
// pages: ADMIN_SECRET_KEY is a server env, never shipped to the browser). The cap edit
// writes back through the /api/proxy admin gate.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'

interface Tiles {
  pdl_month_spent_usd: number
  pdl_month_cap_usd: number
  collected_month_usd: number
  data_cogs_month_usd: number
  effective_cost_per_record: number
  pdl_rate_usd: number
  trial_cohort: { count: number; burn_usd: number; converted: number }
}

interface ClientRow {
  id: string
  company_name: string | null
  collected_usd: number
  records_sourced: number
  sourcing_cost_usd: number
  allowance: number
  reveals: number
  works: number
  source_reveal_ratio: number | null
  net_contribution: number
}

async function apiGet<T>(path: string): Promise<T | null> {
  const key = process.env.ADMIN_SECRET_KEY
  if (!key) return null
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: { 'x-admin-key': key }, cache: 'no-store' })
    if (!res.ok) return null
    const json = (await res.json()) as { success: boolean; data?: T }
    return json.success ? json.data ?? null : null
  } catch {
    return null
  }
}

const usd = (n: number) => `$${(Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

export default async function MoneyPathPage() {
  const [tiles, clients] = await Promise.all([
    apiGet<Tiles>('/money-path/tiles'),
    apiGet<ClientRow[]>('/money-path/clients'),
  ])

  if (!tiles) {
    return (
      <Page title="Money Path" subtitle="Sourcing economy — is every PDL dollar earning back?">
        <Card tone="danger">
          <p className="text-sm text-red-600 font-medium">Could not reach the Money Path API.</p>
          <p className="text-xs text-gray-500 mt-1">Check ADMIN_SECRET_KEY and that the API is reachable.</p>
        </Card>
      </Page>
    )
  }

  const cap = tiles.pdl_month_cap_usd || 0
  const spent = tiles.pdl_month_spent_usd || 0
  const pctOfCap = cap > 0 ? Math.min(100, Math.round((spent / cap) * 100)) : 0
  const overCap = spent > cap
  const near = pctOfCap >= 80

  const rows = (clients ?? []).slice().sort((a, b) => a.net_contribution - b.net_contribution)

  return (
    <Page
      title="Money Path"
      subtitle="Sourcing economy — is every PDL dollar earning back?"
      right={<CapEditor current={cap} />}
    >
      {/* ── 4 tiles ─────────────────────────────────────────────────────────── */}
      <TileGrid cols={4}>
        <Tile
          label="PDL budget (month)"
          icon={<DollarSign className="w-5 h-5 inline -mt-1 mr-0.5 text-gray-400" />}
          value={`${usd(spent)}`}
          note={`of ${usd(cap)} cap · ${pctOfCap}%`}
          tone={overCap ? 'down' : undefined}
          right={overCap ? <Pill tone="red">over</Pill> : near ? <Pill tone="amber">80%+</Pill> : undefined}
        />
        <Tile
          label="Collected vs data COGS"
          icon={<Coins className="w-5 h-5 inline -mt-1 mr-0.5 text-gray-400" />}
          value={usd(tiles.collected_month_usd)}
          note={`data COGS ${usd(tiles.data_cogs_month_usd)} this month`}
          tone={tiles.collected_month_usd >= tiles.data_cogs_month_usd ? 'up' : 'down'}
        />
        <Tile
          label="Effective $/record"
          icon={<Database className="w-5 h-5 inline -mt-1 mr-0.5 text-gray-400" />}
          value={usd(tiles.effective_cost_per_record)}
          note={`PDL list rate ${usd(tiles.pdl_rate_usd)}`}
        />
        <Tile
          label="Trial cohort"
          icon={<Sprout className="w-5 h-5 inline -mt-1 mr-0.5 text-gray-400" />}
          value={tiles.trial_cohort.count}
          note={`burn ${usd(tiles.trial_cohort.burn_usd)} · ${tiles.trial_cohort.converted} converted`}
        />
      </TileGrid>

      {/* ── PDL budget bar with 80% marker ──────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Monthly PDL budget</p>
          <p className="text-xs text-gray-500">
            {usd(spent)} / {usd(cap)} · <span className={overCap ? 'text-red-600 font-semibold' : near ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>{pctOfCap}%</span>
          </p>
        </div>
        <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${overCap ? 'bg-red-500' : near ? 'bg-amber-500' : 'bg-[#7C3AED]'}`}
            style={{ width: `${pctOfCap}%` }}
          />
          {/* 80% guardrail marker */}
          <div className="absolute top-0 h-full border-l-2 border-gray-400/70" style={{ left: '80%' }} title="80% of cap" />
        </div>
        <p className="text-[11px] text-gray-400 mt-1">The dashed line marks 80% of the cap — the guardrail before sourcing pauses platform-wide.</p>
      </Card>

      {/* ── Per-client table ────────────────────────────────────────────────── */}
      <SectionLabel>Per-client economics · sorted by net contribution</SectionLabel>
      {rows.length === 0 ? (
        <Card><p className="text-sm text-gray-400">No client activity yet.</p></Card>
      ) : (
        <Table head={['Client', 'Collected', 'Records', 'Sourcing $', 'Allowance', 'Reveals', 'Works', 'Src/Reveal', 'Net contribution']}>
          {rows.map((c) => {
            const green = c.net_contribution >= 0
            return (
              <TR key={c.id}>
                <TD className="font-medium text-gray-900">{c.company_name || <span className="text-gray-400">—</span>}</TD>
                <TD>{usd(c.collected_usd)}</TD>
                <TD>{c.records_sourced.toLocaleString()}</TD>
                <TD>{usd(c.sourcing_cost_usd)}</TD>
                <TD>{c.allowance.toLocaleString()}</TD>
                <TD>{c.reveals.toLocaleString()}</TD>
                <TD>{c.works.toLocaleString()}</TD>
                <TD>{c.source_reveal_ratio === null ? <span className="text-gray-400">—</span> : `${(Math.round(c.source_reveal_ratio * 10) / 10).toLocaleString()}×`}</TD>
                <TD className={`font-semibold ${green ? 'text-emerald-600' : 'text-red-600'}`}>
                  {!green && <AlertTriangle className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />}
                  {usd(c.net_contribution)}
                </TD>
              </TR>
            )
          })}
        </Table>
      )}
    </Page>
  )
}
