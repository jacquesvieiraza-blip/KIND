import { Request, Response, NextFunction } from 'express'
import { db } from '@kind/db'
import { sendFounderAlert } from '../lib/alerts'

// #290 — lightweight error tracking (NO new npm dep — this is the no-Sentry option;
// real Sentry needs a DSN and is the alternative). This handler is mounted LAST in
// index.ts. For every unhandled route error it:
//   1. logs the stack (unchanged behaviour),
//   2. records a row in error_events (best-effort — never blocks the response),
//   3. alerts the founder on 500s, THROTTLED to once per unique signature per hour
//      (in-memory) so a hot failing route can't spam the inbox.
// If error_events doesn't exist yet (migration not run) the insert just errors and
// is swallowed — capture degrades, the API keeps serving.

// signature → last-alerted epoch ms. In-memory, per-process (resets on deploy) —
// deliberately simple; the goal is spam-suppression, not durable dedup.
const lastAlerted = new Map<string, number>()
const ALERT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function shouldAlert(signature: string): boolean {
  const now = Date.now()
  const last = lastAlerted.get(signature)
  if (last && now - last < ALERT_WINDOW_MS) return false
  lastAlerted.set(signature, now)
  // Bound memory: if the map grows large (many distinct signatures), drop the
  // oldest entries. 500 is plenty for spam-suppression.
  if (lastAlerted.size > 500) {
    const oldest = [...lastAlerted.entries()].sort((a, b) => a[1] - b[1])[0]
    if (oldest) lastAlerted.delete(oldest[0])
  }
  return true
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error(err.stack)

  const status  = (err as { statusCode?: number; status?: number }).statusCode
    ?? (err as { status?: number }).status ?? 500
  const route   = (req.route?.path as string | undefined) ?? req.originalUrl ?? req.path ?? 'unknown'
  const method  = req.method ?? 'UNKNOWN'
  const message = err.message ?? 'Unknown error'

  // 2. Record — best-effort, fire-and-forget. Never await into the response path.
  void (async () => {
    try {
      await db.from('error_events').insert({
        route, method, status,
        message: message.slice(0, 1000),
        stack:   (err.stack ?? '').slice(0, 5000),
      })
    } catch (e) {
      console.error('[error-tracking] failed to record error_event:', e instanceof Error ? e.message : e)
    }
  })()

  // 3. Alert the founder on real 500s only, throttled per signature.
  if (status >= 500) {
    const signature = `${method} ${route} :: ${message}`.slice(0, 200)
    if (shouldAlert(signature)) {
      void sendFounderAlert('api_down', `API 500 on ${method} ${route}`, [
        `Route:   ${method} ${route}`,
        `Message: ${message}`,
        `Time:    ${new Date().toISOString()}`,
        '',
        (err.stack ?? '').split('\n').slice(0, 5).join('\n'),
        '',
        '(Throttled to one alert per signature per hour.)',
      ])
    }
  }

  // Response contract unchanged from the original handler: always 500 for an
  // unhandled error. (We derive `status` above only for the recorded row / alert.)
  res.status(500).json({ success: false, error: 'Internal server error' })
}
