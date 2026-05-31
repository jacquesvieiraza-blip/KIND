import { Router } from 'express'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

// GET /proposals/sign/:token — public view for signing (no auth) — must be BEFORE /:id
router.get('/sign/:token', async (req, res) => {
  try {
    const { data, error } = await db.from('proposals')
      .select('id, title, content, status, recipient_name')
      .eq('sign_token', req.params.token)
      .single()
    if (error || !data) { res.status(404).json({ error: 'not found' }); return }
    // Mark as viewed
    if (data.status === 'sent') {
      await db.from('proposals').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('sign_token', req.params.token)
    }
    res.json(data)
  } catch (err) {
    console.error('[proposals] GET /sign/:token', err)
    res.status(500).json({ error: 'Failed to load proposal' })
  }
})

// POST /proposals/sign/:token — public sign endpoint (no auth)
router.post('/sign/:token', async (req, res) => {
  try {
    const { data, error } = await db.from('proposals')
      .update({ status: 'signed', signed_at: new Date().toISOString() })
      .eq('sign_token', req.params.token)
      .select('id, title, status')
      .single()
    if (error || !data) { res.status(404).json({ error: 'invalid token' }); return }
    res.json(data)
  } catch (err) {
    console.error('[proposals] POST /sign/:token', err)
    res.status(500).json({ error: 'Failed to sign proposal' })
  }
})

// GET /proposals — list client proposals
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }
    const { data, error } = await db.from('proposals')
      .select('id, title, status, recipient_email, recipient_name, sent_at, signed_at, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    if (error) { res.status(500).json({ error: error.message }); return }
    res.json(data)
  } catch (err) {
    console.error('[proposals] GET /', err)
    res.status(500).json({ error: 'Failed to list proposals' })
  }
})

// POST /proposals — create new proposal
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }
    const { title, content, recipient_email, recipient_name } = req.body as {
      title?: string; content?: object; recipient_email?: string; recipient_name?: string
    }
    if (!title) { res.status(400).json({ error: 'title required' }); return }
    const { data, error } = await db.from('proposals')
      .insert({ client_id: clientId, title, content: content ?? {}, recipient_email, recipient_name })
      .select()
      .single()
    if (error) { res.status(500).json({ error: error.message }); return }
    res.json(data)
  } catch (err) {
    console.error('[proposals] POST /', err)
    res.status(500).json({ error: 'Failed to create proposal' })
  }
})

// GET /proposals/:id — get proposal
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }
    const { data, error } = await db.from('proposals')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .single()
    if (error || !data) { res.status(404).json({ error: 'not found' }); return }
    res.json(data)
  } catch (err) {
    console.error('[proposals] GET /:id', err)
    res.status(500).json({ error: 'Failed to get proposal' })
  }
})

// PATCH /proposals/:id — update proposal
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }
    const { title, content, recipient_email, recipient_name } = req.body as {
      title?: string; content?: object; recipient_email?: string; recipient_name?: string
    }
    const { data, error } = await db.from('proposals')
      .update({ title, content, recipient_email, recipient_name })
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .select()
      .single()
    if (error || !data) { res.status(500).json({ error: error?.message ?? 'not found' }); return }
    res.json(data)
  } catch (err) {
    console.error('[proposals] PATCH /:id', err)
    res.status(500).json({ error: 'Failed to update proposal' })
  }
})

// POST /proposals/:id/send — mark as sent (send email)
router.post('/:id/send', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }
    const { data: proposal, error } = await db.from('proposals')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .single()
    if (error || !proposal) { res.status(404).json({ error: 'not found' }); return }
    if (!proposal.recipient_email) { res.status(400).json({ error: 'recipient_email required' }); return }
    const signUrl = `${process.env.PORTAL_URL ?? 'https://app.get-kind.com'}/sign/${proposal.sign_token}`
    // Send via Resend
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'K.I.N.D <noreply@get-kind.com>',
        to: proposal.recipient_email as string,
        subject: `Proposal: ${proposal.title}`,
        html: `<p>Hi ${proposal.recipient_name ?? 'there'},</p>
               <p>Please review and sign the proposal below:</p>
               <p><strong>${proposal.title}</strong></p>
               <p><a href="${signUrl}" style="background:#6d28d9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Review &amp; Sign &#8594;</a></p>
               <p style="color:#999;font-size:12px">Sent via K.I.N.D &mdash; The AI Revenue Team</p>`
      })
    } catch { /* non-fatal */ }
    const { data: updated } = await db.from('proposals')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()
    res.json(updated)
  } catch (err) {
    console.error('[proposals] POST /:id/send', err)
    res.status(500).json({ error: 'Failed to send proposal' })
  }
})

export default router
