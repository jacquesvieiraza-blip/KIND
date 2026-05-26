import cron from 'node-cron'

const PORT       = process.env.PORT || 4000
const API_BASE   = `http://localhost:${PORT}`
const ADMIN_KEY  = process.env.ADMIN_SECRET_KEY

async function callInternal(path: string, method: 'GET' | 'POST' = 'POST'): Promise<void> {
  if (!ADMIN_KEY) {
    console.warn(`[cron] ADMIN_SECRET_KEY not set — skipping ${path}`)
    return
  }
  try {
    const res  = await fetch(`${API_BASE}/internal${path}`, {
      method,
      headers: { 'x-admin-key': ADMIN_KEY, 'content-type': 'application/json' },
    })
    const data = await res.json() as Record<string, unknown>
    console.log(`[cron] ${path} →`, JSON.stringify(data))
  } catch (err) {
    console.error(`[cron] ${path} failed:`, err)
  }
}

export function startCrons(): void {
  // Daily 06:00 UTC — trial nurture (days 1/3/5/7/10)
  cron.schedule('0 6 * * *', () => callInternal('/ae/nurture'), { timezone: 'UTC' })

  // Daily 06:15 UTC — at-risk client alert
  cron.schedule('15 6 * * *', () => callInternal('/ae/at-risk'), { timezone: 'UTC' })

  // Daily 07:00 UTC — trial expiry sequence (day 10/12/14)
  cron.schedule('0 7 * * *', () => callInternal('/ae/trial-expiry'), { timezone: 'UTC' })

  // Daily 07:15 UTC — zero credits warning
  cron.schedule('15 7 * * *', () => callInternal('/ae/zero-credits'), { timezone: 'UTC' })

  // Every 2 hours — FIGSY send due emails across all clients
  cron.schedule('0 */2 * * *', () => callInternal('/figsy/send-due-all'), { timezone: 'UTC' })

  // Monday 07:00 UTC — weekly client leads digest
  cron.schedule('0 7 * * 1', () => callInternal('/digest/weekly'), { timezone: 'UTC' })

  // Friday 16:00 UTC — weekly founder digest
  cron.schedule('0 16 * * 5', () => callInternal('/cro/weekly-digest'), { timezone: 'UTC' })

  // Daily 08:00 UTC — check FIGSY campaign performance
  cron.schedule('0 8 * * *', () => callInternal('/figsy/check-performance'), { timezone: 'UTC' })

  // Daily 05:00 UTC — FIGSY auto-replenish: alert on campaigns running low
  cron.schedule('0 5 * * *', () => callInternal('/figsy/auto-replenish'), { timezone: 'UTC' })

  // Daily 07:30 UTC — Milla morning brief to all active clients
  cron.schedule('30 7 * * *', () => callInternal('/milla/morning-brief-all'), { timezone: 'UTC' })

  // Daily 08:30 UTC — Milla proactive anomaly detection
  cron.schedule('30 8 * * *', () => callInternal('/milla/check-anomalies'), { timezone: 'UTC' })

  // Monday 06:00 UTC — K.I.N.D self-outreach (FIGSY finds new K.I.N.D prospects)
  cron.schedule('0 6 * * 1', () => callInternal('/cmo/self-outreach'), { timezone: 'UTC' })

  // Daily 08:10 UTC — deliver drip leads (staggered from /figsy/check-performance at 08:00)
  cron.schedule('10 8 * * *', () => callInternal('/leads/drip'), { timezone: 'UTC' })

  // Daily 07:40 UTC — low credit warning (staggered from /milla/morning-brief-all at 07:30)
  cron.schedule('40 7 * * *', () => callInternal('/ae/low-credits'), { timezone: 'UTC' })

  // Daily 09:00 UTC — mark lapsed subscriptions (active but period ended)
  cron.schedule('0 9 * * *', () => callInternal('/subscriptions/check-lapsed'), { timezone: 'UTC' })

  // Daily 05:05 UTC — founder morning brief (07:05 SAST)
  cron.schedule('5 5 * * *', () => callInternal('/founder-brief'), { timezone: 'UTC' })

  console.log('[cron] 16 jobs scheduled')
}
