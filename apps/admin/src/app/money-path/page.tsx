export const dynamic = 'force-dynamic'

import { DollarSign, Database, Coins, Sprout, AlertTriangle, Boxes, TrendingUp } from 'lucide-react'
import { Page, SectionLabel, Card, TileGrid, Tile, Table, TR, TD, Pill } from '@/components/ui'
import CapEditor from './CapEditor'
import DemoToggle from './DemoToggle'

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
  is_demo: boolean
  collected_usd: number
  records_sourced: number
  sourcing_cost_usd: number
  allowance: number
  reveals: number
  works: number
  source_reveal_ratio: number | null
  net_contribution: number
}

interface Pool {
  summary: {
    total_records: number
    earning_records: number
    total_acquisition_cost: number
    total_revenue_usd: number
    net_usd: number
    blended_roi: number
    total_reveals: number
    total_works: number
  }
  leaderboard: Array<{
    email_norm: string
    company: string | null
    title: string | null
    acquisition_cost: number
    reveals: number
    works: number
    revenue_usd: number
    roi: number
  }>
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
  const [tiles, clients, pool] = await Promise.all([
    apiGet<Tiles>('/money-path/tiles'),
    apiGet<ClientRow[]>('/money-path/clients'),
    apiGet<Pool>('/money-path/pool'),
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

  // #453 — split real vs demo. Real clients drive the sort + any totals; demo/test
  // accounts go to a secondary section so they never pollute the real economics.
  const allClients = clients ?? []
  const rows = allClients.filter((c) => !c.is_demo).slice().sort((a, b) => a.net_contribution - b.net_contribution)
  const demoRows = allClients.filter((c) => c.is_demo).slice().sort((a, b) => (a.company_name ?? '').localeCompare(b.company_name ?? ''))

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

      {/* ── Real clients table (#453 — demo excluded) ───────────────────────── */}
      <SectionLabel>Real clients · sorted by net contribution</SectionLabel>
      {rows.length === 0 ? (
        <Card><p className="text-sm text-gray-400">No real-client activity yet.</p></Card>
      ) : (
        <Table head={['Client', 'Collected', 'Records', 'Sourcing $', 'Allowance', 'Reveals', 'Works', 'Src/Reveal', 'Net contribution', '']}>
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
                <TD><DemoToggle clientId={c.id} companyName={c.company_name} isDemo={c.is_demo} /></TD>
              </TR>
            )
          })}
        </Table>
      )}

      {/* ── Demo & test accounts (#453 — excluded from real economics) ───────── */}
      {demoRows.length > 0 && (
        <>
          <SectionLabel>Demo &amp; test accounts · excluded from the roll-ups above</SectionLabel>
          <Table head={['Client', 'Collected', 'Records', 'Sourcing $', 'Allowance', 'Reveals', 'Works', 'Src/Reveal', 'Net contribution', '']}>
            {demoRows.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium text-gray-900">
                  {c.company_name || <span className="text-gray-400">—</span>}
                  <span className="ml-2"><Pill tone="gray">demo</Pill></span>
                </TD>
                <TD>{usd(c.collected_usd)}</TD>
                <TD>{c.records_sourced.toLocaleString()}</TD>
                <TD>{usd(c.sourcing_cost_usd)}</TD>
                <TD>{c.allowance.toLocaleString()}</TD>
                <TD>{c.reveals.toLocaleString()}</TD>
                <TD>{c.works.toLocaleString()}</TD>
                <TD>{c.source_reveal_ratio === null ? <span className="text-gray-400">—</span> : `${(Math.round(c.source_reveal_ratio * 10) / 10).toLocaleString()}×`}</TD>
                <TD className="text-gray-400">{usd(c.net_contribution)}</TD>
                <TD><DemoToggle clientId={c.id} companyName={c.company_name} isDemo={c.is_demo} /></TD>
              </TR>
            ))}
          </Table>
        </>
      )}

      {/* ── THE LEAD POOL — records as inventory (#449) ──────────────────────── */}
      <SectionLabel>The lead pool · records as inventory</SectionLabel>
      {!pool ? (
        <Card><p className="text-sm text-gray-400">Pool data unavailable (run the 20260712_lead_pool migration + deploy).</p></Card>
      ) : (
        <>
          <TileGrid cols={4}>
            <Tile
              label="Pooled records"
              icon={<Boxes className="w-5 h-5 inline -mt-1 mr-0.5 text-gray-400" />}
              value={pool.summary.total_records.toLocaleString()}
              note={`${pool.summary.earning_records.toLocaleString()} have earned ≥ $1`}
            />
            <Tile
              label="Data owned (cost)"
              icon={<Database className="w-5 h-5 inline -mt-1 mr-0.5 text-gray-400" />}
              value={usd(pool.summary.total_acquisition_cost)}
              note={`${pool.summary.total_records.toLocaleString()} records × acquisition cost`}
            />
            <Tile
              label="Revenue off the pool"
              icon={<Coins className="w-5 h-5 inline -mt-1 mr-0.5 text-gray-400" />}
              value={usd(pool.summary.total_revenue_usd)}
              note={`${pool.summary.total_reveals.toLocaleString()} reveals · ${pool.summary.total_works.toLocaleString()} works`}
              tone={pool.summary.net_usd >= 0 ? 'up' : undefined}
            />
            <Tile
              label="Blended pool ROI"
              icon={<TrendingUp className="w-5 h-5 inline -mt-1 mr-0.5 text-gray-400" />}
              value={`${pool.summary.blended_roi.toLocaleString()}×`}
              note={`net ${usd(pool.summary.net_usd)} vs data cost`}
              tone={pool.summary.blended_roi >= 1 ? 'up' : undefined}
            />
          </TileGrid>

          <SectionLabel>Top 50 earners — of {pool.summary.total_records.toLocaleString()} pooled records total (table capped at 50; the tile above is the real count)</SectionLabel>
          {pool.leaderboard.length === 0 || pool.summary.total_revenue_usd === 0 ? (
            <Card>
              <p className="text-sm text-gray-500">
                No record has earned yet — the pool holds <strong>{pool.summary.total_records.toLocaleString()}</strong> records
                ({usd(pool.summary.total_acquisition_cost)} of owned data) waiting to be revealed. Each earns $1 per client who
                reveals it + $3 per FIGSY work, forever.
              </p>
            </Card>
          ) : (
            <Table head={['Record', 'Company', 'Title', 'Cost', 'Reveals', 'Works', 'Revenue', 'ROI']}>
              {pool.leaderboard.map((r) => (
                <TR key={r.email_norm}>
                  <TD className="font-mono text-xs text-gray-600">{r.email_norm}</TD>
                  <TD className="text-gray-900">{r.company || <span className="text-gray-400">—</span>}</TD>
                  <TD className="text-gray-500">{r.title || <span className="text-gray-400">—</span>}</TD>
                  <TD>{usd(r.acquisition_cost)}</TD>
                  <TD>{r.reveals.toLocaleString()}</TD>
                  <TD>{r.works.toLocaleString()}</TD>
                  <TD className="font-semibold text-emerald-600">{usd(r.revenue_usd)}</TD>
                  <TD className={`font-semibold ${r.roi >= 1 ? 'text-emerald-600' : 'text-gray-500'}`}>{r.roi.toLocaleString()}×</TD>
                </TR>
              ))}
            </Table>
          )}
        </>
      )}
    </Page>
  )
}
