import type { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

/**
 * In-memory IP rate limiter factory — no external dependency. For the public,
 * unauthenticated endpoints (signup, demo-request, subscribe, unsubscribe) that
 * otherwise have no abuse protection. Each call returns an isolated limiter.
 *
 *   router.post('/signup', rateLimit({ limit: 10, windowMs: 60_000, key: 'signup' }), handler)
 *
 * byUser   — key the cap by the authenticated userId (requireAuth must run first).
 * byApiKey — key the cap by the caller's developer API key (#269) so a single key
 *   holder can't run up unlimited requests/cost on the API-key routes. Must run
 *   AFTER the API-key auth middleware. The raw key is hashed, never stored.
 */
export function rateLimit(opts: { limit: number; windowMs: number; key?: string; byUser?: boolean; byApiKey?: boolean }) {
  const map = new Map<string, { count: number; resetAt: number }>()
  // Prune stale entries every 5 min so the map can't grow unbounded.
  const t = setInterval(() => {
    const now = Date.now()
    for (const [k, v] of map) if (now > v.resetAt) map.delete(k)
  }, 5 * 60_000)
  if (typeof t.unref === 'function') t.unref()

  return function (req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip
      ?? (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? 'unknown'
    // For authed endpoints, key by the authenticated user (set by requireAuth,
    // which runs before this middleware) so the cap is per-account, not per-IP.
    // For API-key endpoints, key by a hash of the presented key so the cap is
    // per-key (#269) — falls back to IP if no key is present on the request.
    let who = ip
    if (opts.byApiKey) {
      const raw = (req.headers['x-api-key'] as string | undefined)
        ?? req.headers.authorization?.replace(/^Bearer\s+/i, '')
      who = raw ? `k_${crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24)}` : ip
    } else if (opts.byUser) {
      who = (req as { userId?: string }).userId ?? ip
    }
    const id = `${opts.key ?? 'rl'}:${who}`
    const now = Date.now()
    const entry = map.get(id)
    if (!entry || now > entry.resetAt) {
      map.set(id, { count: 1, resetAt: now + opts.windowMs })
      next(); return
    }
    entry.count++
    if (entry.count > opts.limit) {
      res.setHeader('Retry-After', String(Math.ceil(opts.windowMs / 1000)))
      res.status(429).json({ success: false, error: 'Too many requests — please slow down and try again shortly.' })
      return
    }
    next()
  }
}
