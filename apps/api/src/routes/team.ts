import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

const router = Router()

function db() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /team/invite — send invite email
// Body: { client_id, email, role }
// Auth: Bearer token (must be owner or admin)
router.post('/invite', async (req, res): Promise<void> => {
  const { client_id, email, role = 'member' } = req.body
  if (!client_id || !email) { res.status(400).json({ error: 'client_id and email required' }); return }

  const token = crypto.randomBytes(32).toString('hex')
  const supabase = db()

  // Upsert invite row
  const { error } = await supabase
    .from('client_members')
    .upsert({
      client_id,
      email: email.toLowerCase(),
      role,
      invite_token: token,
      invited_at: new Date().toISOString(),
    }, { onConflict: 'client_id,email' })

  if (error) { res.status(500).json({ error: error.message }); return }

  // Send invite email if Resend available
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.get-kind.com'
    await resend.emails.send({
      from: 'K.I.N.D <hello@get-kind.com>',
      to: email,
      subject: "You've been invited to KIND",
      html: `<p>You've been invited to join a KIND workspace.</p>
             <p><a href="${portalUrl}/invite/accept?token=${token}">Accept invitation</a></p>
             <p>This link expires in 7 days.</p>`,
    }).catch(() => {}) // Don't fail if email fails
  }

  res.json({ ok: true, token })
})

// GET /team/accept?token=xxx — accept invite (called from portal after user logs in)
router.get('/accept', async (req, res): Promise<void> => {
  const { token, user_id } = req.query as { token: string; user_id: string }
  if (!token || !user_id) { res.status(400).json({ error: 'token and user_id required' }); return }

  const supabase = db()
  const { data, error } = await supabase
    .from('client_members')
    .update({ user_id, accepted_at: new Date().toISOString(), invite_token: null })
    .eq('invite_token', token)
    .is('accepted_at', null)
    .select()
    .single()

  if (error || !data) { res.status(400).json({ error: 'Invalid or expired invite token' }); return }
  res.json({ ok: true, client_id: data.client_id, role: data.role })
})

// GET /team/members?client_id=xxx — list team members
router.get('/members', async (req, res): Promise<void> => {
  const { client_id } = req.query as { client_id: string }
  if (!client_id) { res.status(400).json({ error: 'client_id required' }); return }

  const supabase = db()
  const { data, error } = await supabase
    .from('client_members')
    .select('id, email, role, invited_at, accepted_at')
    .eq('client_id', client_id)
    .order('invited_at', { ascending: true })

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

// DELETE /team/member/:id — remove member
router.delete('/member/:id', async (req, res): Promise<void> => {
  const supabase = db()
  const { error } = await supabase
    .from('client_members')
    .delete()
    .eq('id', req.params.id)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ ok: true })
})

export default router
