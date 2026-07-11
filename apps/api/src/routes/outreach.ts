// FOUNDER OUTREACH SCOREBOARD (cashflow §7B) — admin-only surface over the founder's
// weekly hustle: how many touches per channel, how many demos each produced, how many
// closes. After a month it answers "what's working?" from real numbers, not feelings.
//
// Auth mirrors the money-path / admin gate: the `x-admin-key` HEADER vs ADMIN_SECRET_KEY,
// constant-time, header-only (never a query param — morgan logs the URL).

import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { db } from '@kind/db'

export const outreachRouter = Router()

function adminKeyValid(provided: unknown): boolean {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) return false
  const a = Buffer.from(String(provided ?? ''))
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

outreachRouter.use((req: Request, res: Response, next: () => void) => {
  if (!adminKeyValid(req.headers['x-admin-key'])) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  next()
})

// The channels + the numeric fields, kept in one place so the schema, the SELECT and
// the totals never drift.
const CHANNELS = ['warm', 'dm', 'email', 'call'] as const
const NUM_FIELDS = [
  ...CHANNELS.flatMap((c) => [`${c}_sent`, `${c}_demos`] as const),
  'closes',
] as const

const intField = z.number().int().min(0).max(1_000_000).optional()
// Every field optional so a PUT can patch just the cells that changed.
const bodySchema = z.object({
  warm_sent: intField, warm_demos: intField,
  dm_sent: intField, dm_demos: intField,
  email_sent: intField, email_demos: intField,
  call_sent: intField, call_demos: intField,
  closes: intField,
}).strict()

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/

// GET /outreach — the last 12 weeks (newest first) + summed totals across that window.
outreachRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await db
      .from('outreach_log')
      .select('*')
      .order('week_start', { ascending: false })
      .limit(12)
    if (error) {
      console.error('[outreach GET]', error)
      res.status(500).json({ success: false, error: 'Failed to load scoreboard' })
      return
    }
    const rows = (data ?? []) as Array<Record<string, unknown>>
    const totals: Record<string, number> = {}
    for (const f of NUM_FIELDS) {
      totals[f] = rows.reduce((a, r) => a + (Number(r[f]) || 0), 0)
    }
    res.json({ success: true, data: { rows, totals } })
  } catch (err) {
    console.error('[outreach GET]', err)
    res.status(500).json({ success: false, error: 'Failed to load scoreboard' })
  }
})

// PUT /outreach/:week — upsert one week's numbers (week = the Monday, YYYY-MM-DD).
outreachRouter.put('/:week', async (req: Request, res: Response) => {
  try {
    const week = String(req.params.week)
    if (!WEEK_RE.test(week)) {
      res.status(400).json({ success: false, error: 'week must be YYYY-MM-DD' })
      return
    }
    const parsed = bodySchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'All fields must be whole numbers ≥ 0' })
      return
    }
    const row = { week_start: week, ...parsed.data, updated_at: new Date().toISOString() }
    const { error } = await db.from('outreach_log').upsert(row, { onConflict: 'week_start' })
    if (error) {
      console.error('[outreach PUT]', error)
      res.status(500).json({ success: false, error: 'Failed to save' })
      return
    }
    res.json({ success: true, data: { saved: true } })
  } catch (err) {
    console.error('[outreach PUT]', err)
    res.status(500).json({ success: false, error: 'Failed to save' })
  }
})
