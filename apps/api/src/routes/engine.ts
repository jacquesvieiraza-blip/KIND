// THE ENGINE (item 211) — admin-only diagnostic surface. PHASE 1: read-only.
//
// Mirrors the admin-key gate used by adminRouter (x-admin-key vs ADMIN_SECRET_KEY,
// constant-time). The only route today is a Smartlead connectivity check that performs
// NO sends and returns NO secrets — just derived booleans + counts. This is internal
// tooling (not a client-facing surface), so it ships behind the admin key rather than
// the §11 preview flow; the client-facing engine work (Phases 2-6) is previewed.

import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { verifySmartlead, smartleadConfigured } from '../lib/smartlead'

export const engineRouter = Router()

function adminKeyValid(provided: unknown): boolean {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) return false
  const a = Buffer.from(String(provided ?? ''))
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

engineRouter.use((req: Request, res: Response, next: () => void) => {
  if (!adminKeyValid(req.headers['x-admin-key'])) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  next()
})

// GET /engine/smartlead/verify — Phase-1 proof: key authenticates + API reachable.
engineRouter.get('/smartlead/verify', async (_req: Request, res: Response) => {
  try {
    const result = await verifySmartlead()
    res.status(result.ok ? 200 : 502).json({ success: result.ok, ...result })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'verify failed'
    res.status(500).json({ success: false, configured: smartleadConfigured(), error: msg })
  }
})
