import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

export interface AuthRequest extends Request {
  userId?: string
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    res.status(401).json({ success: false, error: 'Missing auth token' })
    return
  }

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
    return
  }

  req.userId = data.user.id
  next()
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim())
    const { data } = await supabase.auth.getUser(req.headers.authorization?.replace('Bearer ', '') || '')

    if (!data.user || !adminEmails.includes(data.user.email || '')) {
      res.status(403).json({ success: false, error: 'Admin access required' })
      return
    }

    next()
  })
}
