import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const orderFormRouter = Router()
orderFormRouter.use(requireAuth)

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).single()
  return data?.id ?? null
}

// GET /order-forms/me — get my order form + agreement templates
orderFormRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const [{ data: orderForm }, { data: templates }] = await Promise.all([
      db.from('order_forms').select('*').eq('client_id', clientId).maybeSingle(),
      db.from('agreement_templates').select('*').eq('is_active', true).order('sort_order'),
    ])

    res.json({ success: true, data: { order_form: orderForm, templates: templates || [] } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch order form' })
  }
})

// POST /order-forms/:id/sign — client signs their order form
orderFormRouter.post('/:id/sign', async (req: AuthRequest, res) => {
  try {
    const { signed_by } = z.object({
      signed_by: z.string().min(2, 'Full name required'),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: existing } = await db.from('order_forms')
      .select('id, status, client_id').eq('id', req.params.id).single()

    if (!existing) { res.status(404).json({ success: false, error: 'Order form not found' }); return }
    if (existing.client_id !== clientId) { res.status(403).json({ success: false, error: 'Forbidden' }); return }
    if (existing.status === 'signed') { res.status(409).json({ success: false, error: 'Already signed' }); return }
    if (existing.status !== 'sent') { res.status(400).json({ success: false, error: 'Order form is not ready to sign' }); return }

    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || ''

    const { data, error } = await db.from('order_forms')
      .update({
        status:    'signed',
        signed_at: new Date().toISOString(),
        signed_by,
        signed_ip: ip,
      })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors[0].message }); return }
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to sign order form' })
  }
})
