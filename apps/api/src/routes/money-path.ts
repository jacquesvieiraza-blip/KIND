// THE MONEY PATH (#448 / #449 p1-2) — admin-only surface over the sourcing economy.
//
// Answers "is every PDL dollar earning back?" per client and platform-wide. All routes
// are READ-ONLY except PATCH /cap (the founder-editable global monthly PDL budget).
//
// Auth mirrors the admin-key gate used by adminRouter / engineRouter: the `x-admin-key`
// HEADER vs ADMIN_SECRET_KEY, constant-time. Header-only (never a query param — morgan
// logs the URL and would leak the secret; see engine.ts #309).

import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { db } from '@kind/db'
import {
  creditTxUsd,
  netContribution,
  sourceRevealRatio,
  effectiveCostPerRecord,
  round2,
  PDL_RATE_USD,
} from '../lib/money-path-math'

export const moneyPathRouter = Router()

// Constant-time admin-key check — avoids the char-by-char timing side-channel of `!==`.
function adminKeyValid(provided: unknown): boolean {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) return false
  const a = Buffer.from(String(provided ?? ''))
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

moneyPathRouter.use((req: Request, res: Response, next: () => void) => {
  if (!adminKeyValid(req.headers['x-admin-key'])) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  next()
})

// Pull every row of a table in 1000-row pages (Supabase's PostgREST default cap). The
// Money Path sums MUST see all rows, so we can't rely on a single default-capped select.
async function fetchAll<T = Record<string, unknown>>(
  table: string,
  columns: string,
  gteCol?: string,
  gteVal?: string,
): Promise<T[]> {
  const page = 1000
  let from = 0
  const out: T[] = []
  for (;;) {
    let q = db.from(table).select(columns).range(from, from + page - 1)
    if (gteCol && gteVal) q = q.gte(gteCol, gteVal)
    const { data, error } = await q
    if (error) throw error
    const rows = (data ?? []) as T[]
    out.push(...rows)
    if (rows.length < page) break
    from += page
  }
  return out
}

function monthStartISO(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

// GET /money-path/clients — per-client economics. A few grouped pulls, joined in JS
// (no per-client N+1). collected = purchase credits valued at $1 lead-gen / $3 figsy;
// records/cost from the sourcing ledger; reveals from client_reveals; works from
// figsy_enrollments (it carries client_id directly).
moneyPathRouter.get('/clients', async (_req: Request, res: Response) => {
  try {
    const [clients, purchases, ledger, reveals, works] = await Promise.all([
      fetchAll<{ id: string; company_name: string | null; sourcing_allowance: number | null }>(
        'clients', 'id, company_name, sourcing_allowance',
      ),
      fetchAll<{ client_id: string; plan: string | null; amount: number; type: string }>(
        'credit_transactions', 'client_id, plan, amount, type',
      ),
      fetchAll<{ client_id: string; records: number; cost_usd: number }>(
        'sourcing_ledger', 'client_id, records, cost_usd',
      ),
      fetchAll<{ client_id: string }>('client_reveals', 'client_id'),
      fetchAll<{ client_id: string }>('figsy_enrollments', 'client_id'),
    ])

    // Collected = ONLY 'purchase' rows (referral / manual_grant / refund are not money
    // collected). credit_transactions has other positive types, so gate on type.
    const collected: Record<string, number> = {}
    for (const p of purchases) {
      if (p.type !== 'purchase') continue
      collected[p.client_id] = (collected[p.client_id] ?? 0) + creditTxUsd(p.plan, p.amount)
    }
    const recordsSourced: Record<string, number> = {}
    const sourcingCost: Record<string, number> = {}
    for (const l of ledger) {
      if (l.records > 0) recordsSourced[l.client_id] = (recordsSourced[l.client_id] ?? 0) + l.records
      if (l.cost_usd > 0) sourcingCost[l.client_id] = (sourcingCost[l.client_id] ?? 0) + Number(l.cost_usd)
    }
    const revealCount: Record<string, number> = {}
    for (const r of reveals) revealCount[r.client_id] = (revealCount[r.client_id] ?? 0) + 1
    const workCount: Record<string, number> = {}
    for (const w of works) workCount[w.client_id] = (workCount[w.client_id] ?? 0) + 1

    const rows = clients.map((c) => {
      const collected_usd = round2(collected[c.id] ?? 0)
      const records_sourced = recordsSourced[c.id] ?? 0
      const sourcing_cost_usd = round2(sourcingCost[c.id] ?? 0)
      const rev = revealCount[c.id] ?? 0
      const wrk = workCount[c.id] ?? 0
      return {
        id: c.id,
        company_name: c.company_name,
        collected_usd,
        records_sourced,
        sourcing_cost_usd,
        allowance: c.sourcing_allowance ?? 0,
        reveals: rev,
        works: wrk,
        source_reveal_ratio: sourceRevealRatio(records_sourced, rev),
        net_contribution: round2(
          netContribution({ collectedUsd: collected[c.id] ?? 0, recordsSourced: records_sourced, reveals: rev, works: wrk }),
        ),
      }
    })

    res.json({ success: true, data: rows })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ success: false, error: msg })
  }
})

// GET /money-path/tiles — platform-wide roll-ups for the 4 top tiles.
moneyPathRouter.get('/tiles', async (_req: Request, res: Response) => {
  try {
    const monthStart = monthStartISO()
    const [ledgerMonth, ledgerAll, purchasesMonth, settingsRes, clients, purchasesAll, ledgerByClient] =
      await Promise.all([
        fetchAll<{ cost_usd: number; records: number }>('sourcing_ledger', 'cost_usd, records', 'created_at', monthStart),
        fetchAll<{ cost_usd: number; records: number }>('sourcing_ledger', 'cost_usd, records'),
        fetchAll<{ plan: string | null; amount: number; type: string }>(
          'credit_transactions', 'plan, amount, type', 'created_at', monthStart,
        ),
        db.from('money_settings').select('pdl_monthly_cap_usd').eq('id', 1).maybeSingle(),
        fetchAll<{ id: string; trial_sourcing_granted: number | null }>('clients', 'id, trial_sourcing_granted'),
        fetchAll<{ client_id: string; type: string }>('credit_transactions', 'client_id, type'),
        fetchAll<{ client_id: string; cost_usd: number }>('sourcing_ledger', 'client_id, cost_usd'),
      ])

    const pdl_month_spent_usd = round2(ledgerMonth.reduce((s, r) => s + Number(r.cost_usd || 0), 0))
    const pdl_month_cap_usd = Number(settingsRes.data?.pdl_monthly_cap_usd ?? 300)
    const collected_month_usd = round2(
      purchasesMonth
        .filter((p) => p.type === 'purchase')
        .reduce((s, p) => s + creditTxUsd(p.plan, p.amount), 0),
    )
    // Data COGS this month = what PDL billed us this month (the sourcing spend).
    const data_cogs_month_usd = pdl_month_spent_usd

    const totalRecords = ledgerAll.reduce((s, r) => s + Number(r.records || 0), 0)
    const totalSourcingCost = ledgerAll.reduce((s, r) => s + Number(r.cost_usd || 0), 0)
    const effective_cost_per_record = round2(effectiveCostPerRecord(totalSourcingCost, totalRecords))

    // Trial cohort: clients seeded on the trial pool (trial_sourcing_granted > 0).
    // "converted" = they later bought (a purchase row exists). count/burn cover the
    // ones still on trial (never purchased).
    const paidClientIds = new Set(
      purchasesAll.filter((p) => p.type === 'purchase').map((p) => p.client_id),
    )
    const trialClients = clients.filter((c) => Number(c.trial_sourcing_granted ?? 0) > 0)
    const stillTrial = trialClients.filter((c) => !paidClientIds.has(c.id))
    const converted = trialClients.filter((c) => paidClientIds.has(c.id)).length
    const stillTrialIds = new Set(stillTrial.map((c) => c.id))
    const burn_usd = round2(
      ledgerByClient
        .filter((l) => stillTrialIds.has(l.client_id))
        .reduce((s, l) => s + Number(l.cost_usd || 0), 0),
    )

    res.json({
      success: true,
      data: {
        pdl_month_spent_usd,
        pdl_month_cap_usd,
        collected_month_usd,
        data_cogs_month_usd,
        effective_cost_per_record,
        pdl_rate_usd: PDL_RATE_USD,
        trial_cohort: { count: stillTrial.length, burn_usd, converted },
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ success: false, error: msg })
  }
})

// PATCH /money-path/cap — founder action: set the global monthly PDL budget.
const capSchema = z.object({
  pdl_monthly_cap_usd: z.number().positive().finite(),
})

moneyPathRouter.patch('/cap', async (req: Request, res: Response) => {
  try {
    const parsed = capSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid cap' })
      return
    }
    const { error, data } = await db
      .from('money_settings')
      .update({ pdl_monthly_cap_usd: parsed.data.pdl_monthly_cap_usd, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('pdl_monthly_cap_usd, updated_at')
      .maybeSingle()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ success: false, error: msg })
  }
})
