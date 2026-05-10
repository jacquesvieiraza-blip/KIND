import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { createClient } from '@supabase/supabase-js'

export const orderFormRouter = Router()

const storage = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const TERMS_BUCKET = 'terms-documents'

orderFormRouter.use(requireAuth)

// GET /order-forms/my — get this client's most recent order form
orderFormRouter.get('/my', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db
      .from('clients')
      .select('id')
      .eq('user_id', req.userId!)
      .single()

    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db
      .from('order_forms')
      .select('*')
      .eq('client_id', client.id)
      .in('status', ['sent', 'signed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch order form' })
  }
})

// GET /order-forms/terms — get all active terms documents with signed download URLs
orderFormRouter.get('/terms', async (_req: AuthRequest, res) => {
  try {
    const { data, error } = await db
      .from('terms_documents')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true })

    if (error) throw error

    const docsWithUrls = await Promise.all(
      (data || []).map(async (doc) => {
        const { data: signed } = await storage.storage
          .from(TERMS_BUCKET)
          .createSignedUrl(doc.file_path, 3600)
        return { ...doc, download_url: signed?.signedUrl ?? null }
      })
    )

    res.json({ success: true, data: docsWithUrls })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch terms documents' })
  }
})

// POST /order-forms/:id/sign — client signs the order form
orderFormRouter.post('/:id/sign', async (req: AuthRequest, res) => {
  try {
    const { signed_by_name } = z.object({
      signed_by_name: z.string().min(2).max(100),
    }).parse(req.body)

    const { data: client } = await db
      .from('clients')
      .select('id')
      .eq('user_id', req.userId!)
      .single()

    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Verify this order form belongs to this client and is in 'sent' status
    const { data: form } = await db
      .from('order_forms')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', client.id)
      .eq('status', 'sent')
      .single()

    if (!form) { res.status(404).json({ success: false, error: 'Order form not found or already signed' }); return }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown'

    const { data, error } = await db
      .from('order_forms')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
        signed_by_name,
        signed_ip: ip,
      })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to sign order form' })
  }
})
