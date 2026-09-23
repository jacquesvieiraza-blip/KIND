import type { Request, Response, NextFunction } from 'express'
import { PARTNERS_FROZEN, PARTNERS_FROZEN_COPY } from '@kind/shared'

/**
 * ⚑ 23 Sep — the partner door, closed while partners are frozen.
 *
 * Founder: *"we have no partners at the moment … freeze"*. Mounted IN FRONT of every partner
 * route, so a request is refused before any partner handler, read or write runs. A 410, not a
 * 403: nobody is being denied something they could otherwise have — the thing is switched off.
 * The handlers behind it are untouched and keep their own tests, so flipping
 * `PARTNERS_FROZEN` back is the whole of un-freezing.
 */
export function partnersFrozenGate(_req: Request, res: Response, next: NextFunction): void {
  if (!PARTNERS_FROZEN) { next(); return }
  res.status(410).json({ success: false, error: 'partners_frozen', message: PARTNERS_FROZEN_COPY })
}
