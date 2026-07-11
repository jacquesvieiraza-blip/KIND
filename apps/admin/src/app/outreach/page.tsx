export const dynamic = 'force-dynamic'

import { Target } from 'lucide-react'
import { Page, Card } from '@/components/ui'
import OutreachBoard, { type WeekRow } from './OutreachBoard'

// FOUNDER OUTREACH SCOREBOARD (cashflow §7B) — type your real weekly numbers, and after
// a month it tells you which channel actually produces demos. Reads the admin-gated
// /outreach API server-side (ADMIN_SECRET_KEY, same pattern as Money Path); the editable
// grid writes back through the /api/proxy admin gate.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'

type ApiRow = Partial<WeekRow> & { week_start: string }

async function apiGet(): Promise<{ rows: ApiRow[] } | null> {
  const key = process.env.ADMIN_SECRET_KEY
  if (!key) return null
  try {
    const res = await fetch(`${API_BASE}/outreach`, { headers: { 'x-admin-key': key }, cache: 'no-store' })
    if (!res.ok) return null
    const json = (await res.json()) as { success: boolean; data?: { rows: ApiRow[] } }
    return json.success ? json.data ?? null : null
  } catch {
    return null
  }
}

// Monday of the week that contains `d`, as YYYY-MM-DD.
function mondayOf(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = x.getUTCDay() // 0 Sun … 6 Sat
  const back = (dow + 6) % 7 // days since Monday
  x.setUTCDate(x.getUTCDate() - back)
  return x.toISOString().slice(0, 10)
}

const ZERO = {
  warm_sent: 0, warm_demos: 0, dm_sent: 0, dm_demos: 0,
  email_sent: 0, email_demos: 0, call_sent: 0, call_demos: 0, closes: 0,
}

export default async function OutreachPage() {
  const data = await apiGet()

  if (!data) {
    return (
      <Page title="Outreach Scoreboard" subtitle="Your weekly hustle — what's actually producing demos">
        <Card tone="danger">
          <p className="text-sm text-red-600 font-medium">Could not reach the Outreach API.</p>
          <p className="text-xs text-gray-500 mt-1">Check ADMIN_SECRET_KEY, and that the migration <code>20260715_outreach_log.sql</code> has run.</p>
        </Card>
      </Page>
    )
  }

  // Build the last 8 weeks (newest first), merging any saved rows over the blanks.
  const byWeek = new Map(data.rows.map((r) => [r.week_start, r]))
  const now = new Date()
  const weeks: WeekRow[] = []
  for (let i = 0; i < 8; i++) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i * 7)
    const wk = mondayOf(d)
    const saved = byWeek.get(wk)
    weeks.push({ week_start: wk, ...ZERO, ...saved } as WeekRow)
  }

  return (
    <Page
      title="Outreach Scoreboard"
      subtitle="Type your real numbers each week — the verdict below shows what's working (cashflow §7B)"
    >
      <OutreachBoard initialWeeks={weeks} />
    </Page>
  )
}
