import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

// ⛓️ J4-C1 (17 Sep) — `authEmail` ADDED. Server-owned promotion writes `clients.contact_email`
// from the address the client authenticated with, exactly as `/auth/onboard` does (C27: two
// money routes fail closed without it, so Payment 1 is unreachable for a client who has none).
// This middleware already holds the auth user, so carrying the address costs one line and
// saves promotion a second Auth round-trip. Read-only, never written back.
export interface AuthRequest extends Request { userId?: string; authEmail?: string }

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) { res.status(401).json({ success: false, error: 'Missing auth token' }); return }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) { res.status(401).json({ success: false, error: 'Invalid or expired token' }); return }
  req.userId = data.user.id
  req.authEmail = (data.user.email ?? '').trim().slice(0, 320) || undefined
  next()
}
