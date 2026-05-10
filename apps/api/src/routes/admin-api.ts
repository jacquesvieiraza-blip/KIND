import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { createClient } from '@supabase/supabase-js'

export const adminApiRouter = Router()

const storage = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const BUCKET = 'client-documents'
const TERMS_BUCKET = 'terms-documents'

// Simple secret header guard
function requireAdminSecret(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers['x-admin-secret']
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  next()
}

adminApiRouter.use(requireAdminSecret)

// GET /admin-api/clients — all clients with subscription + lead counts
adminApiRouter.get('/clients', async (_req, res) => {
  try {
    const { data: clients, error } = await db
      .from('clients')
      .select(`
        id, company_name, industry, country, created_at,
        subscriptions(tier, status, trial_ends_at),
        leads(id)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ success: true, data: clients })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch clients' })
  }
})

// GET /admin-api/clients/:id — single client detail
adminApiRouter.get('/clients/:id', async (req, res) => {
  try {
    const { data: client, error } = await db
      .from('clients')
      .select(`
        *,
        subscriptions(*),
        icps(*)
      `)
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const [{ count: leadCount }, { count: msgCount }] = await Promise.all([
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', req.params.id),
      db.from('client_messages').select('id', { count: 'exact', head: true }).eq('client_id', req.params.id).eq('sender_type', 'client').is('read_at', null),
    ])

    res.json({ success: true, data: { ...client, lead_count: leadCount ?? 0, unread_messages: msgCount ?? 0 } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch client' })
  }
})

// GET /admin-api/clients/:id/documents
adminApiRouter.get('/clients/:id/documents', async (req, res) => {
  try {
    const { data, error } = await db
      .from('client_documents')
      .select('*')
      .eq('client_id', req.params.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const docsWithUrls = await Promise.all(
      (data || []).map(async (doc) => {
        const { data: signed } = await storage.storage.from(BUCKET).createSignedUrl(doc.file_path, 3600)
        return { ...doc, download_url: signed?.signedUrl ?? null }
      })
    )

    res.json({ success: true, data: docsWithUrls })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch documents' })
  }
})

// POST /admin-api/clients/:id/documents/upload-url
adminApiRouter.post('/clients/:id/documents/upload-url', async (req, res) => {
  try {
    const { filename } = z.object({
      filename: z.string().min(1),
      mime_type: z.string(),
    }).parse(req.body)

    const { data: bucket } = await storage.storage.getBucket(BUCKET)
    if (!bucket) await storage.storage.createBucket(BUCKET, { public: false, fileSizeLimit: '50mb' })

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${req.params.id}/${Date.now()}-${safeName}`

    const { data, error } = await storage.storage.from(BUCKET).createSignedUploadUrl(filePath)
    if (error) throw error

    res.json({ success: true, data: { signed_url: data.signedUrl, token: data.token, path: filePath } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to generate upload URL' })
  }
})

// POST /admin-api/clients/:id/documents — register uploaded doc
adminApiRouter.post('/clients/:id/documents', async (req, res) => {
  try {
    const body = z.object({
      name: z.string().min(1),
      file_path: z.string().min(1),
      file_size: z.number().optional(),
      mime_type: z.string().optional(),
      document_type: z.enum(['offer', 'msa', 'sla', 'playbook', 'service_order', 'other']).default('other'),
    }).parse(req.body)

    const { data, error } = await db
      .from('client_documents')
      .insert({ ...body, client_id: req.params.id, uploaded_by: 'admin' })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to register document' })
  }
})

// DELETE /admin-api/documents/:docId
adminApiRouter.delete('/documents/:docId', async (req, res) => {
  try {
    const { data: doc } = await db
      .from('client_documents')
      .select('file_path')
      .eq('id', req.params.docId)
      .single()

    if (doc) await storage.storage.from(BUCKET).remove([doc.file_path])
    await db.from('client_documents').delete().eq('id', req.params.docId)

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to delete document' })
  }
})

// GET /admin-api/clients/:id/messages
adminApiRouter.get('/clients/:id/messages', async (req, res) => {
  try {
    const { data, error } = await db
      .from('client_messages')
      .select('*')
      .eq('client_id', req.params.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Mark client messages as read when admin views them
    await db
      .from('client_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('client_id', req.params.id)
      .eq('sender_type', 'client')
      .is('read_at', null)

    res.json({ success: true, data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch messages' })
  }
})

// POST /admin-api/clients/:id/messages — admin sends a message
adminApiRouter.post('/clients/:id/messages', async (req, res) => {
  try {
    const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(req.body)

    const { data, error } = await db
      .from('client_messages')
      .insert({ client_id: req.params.id, sender_type: 'admin', content })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to send message' })
  }
})

// PATCH /admin-api/icps/:id/status — approve or reject an ICP
adminApiRouter.patch('/icps/:id/status', async (req, res) => {
  try {
    const { status, review_notes } = z.object({
      status: z.enum(['approved', 'rejected']),
      review_notes: z.string().optional(),
    }).parse(req.body)

    const { data, error } = await db
      .from('icps')
      .update({ status, review_notes: review_notes ?? null, reviewed_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to update ICP status' })
  }
})

// GET /admin-api/icps/pending — ICPs awaiting review
adminApiRouter.get('/icps/pending', async (_req, res) => {
  try {
    const { data, error } = await db
      .from('icps')
      .select('*, clients(company_name)')
      .eq('status', 'pending_review')
      .order('updated_at', { ascending: true })

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch pending ICPs' })
  }
})

// ─── Terms Documents (T&C Library) ───────────────────────────────────────────

async function ensureTermsBucket() {
  const { data } = await storage.storage.getBucket(TERMS_BUCKET)
  if (!data) {
    await storage.storage.createBucket(TERMS_BUCKET, { public: false, fileSizeLimit: '50mb' })
  }
}

// GET /admin-api/terms — list all terms documents
adminApiRouter.get('/terms', async (_req, res) => {
  try {
    const { data, error } = await db
      .from('terms_documents')
      .select('*')
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

// POST /admin-api/terms/upload-url — signed URL so admin can upload a terms PDF
adminApiRouter.post('/terms/upload-url', async (req, res) => {
  try {
    const { filename } = z.object({ filename: z.string().min(1) }).parse(req.body)
    await ensureTermsBucket()

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${Date.now()}-${safeName}`

    const { data, error } = await storage.storage.from(TERMS_BUCKET).createSignedUploadUrl(filePath)
    if (error) throw error

    res.json({ success: true, data: { signed_url: data.signedUrl, token: data.token, path: filePath } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to generate upload URL' })
  }
})

// POST /admin-api/terms — register an uploaded terms document
adminApiRouter.post('/terms', async (req, res) => {
  try {
    const body = z.object({
      name: z.string().min(1),
      document_type: z.enum(['msa', 'offer', 'sla', 'service_order', 'popia', 'other']),
      file_path: z.string().min(1),
      file_size: z.number().optional(),
      version: z.string().default('1.0'),
    }).parse(req.body)

    const { data, error } = await db
      .from('terms_documents')
      .insert({ ...body, active: true })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to register terms document' })
  }
})

// DELETE /admin-api/terms/:id — remove a terms document
adminApiRouter.delete('/terms/:id', async (req, res) => {
  try {
    const { data: doc } = await db
      .from('terms_documents')
      .select('file_path')
      .eq('id', req.params.id)
      .single()

    if (doc) await storage.storage.from(TERMS_BUCKET).remove([doc.file_path])
    await db.from('terms_documents').delete().eq('id', req.params.id)

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to delete terms document' })
  }
})

// ─── Order Forms ─────────────────────────────────────────────────────────────

// GET /admin-api/clients/:id/order-form — get a client's order form
adminApiRouter.get('/clients/:id/order-form', async (req, res) => {
  try {
    const { data, error } = await db
      .from('order_forms')
      .select('*')
      .eq('client_id', req.params.id)
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

const orderFormSchema = z.object({
  products: z.array(z.string()).min(1),
  pricing_zar: z.number().positive(),
  billing_interval: z.enum(['monthly', 'annual', 'once']).default('monthly'),
  scope: z.string().optional(),
  start_date: z.string().optional(),
  notes: z.string().optional(),
})

// POST /admin-api/clients/:id/order-form — create and send an order form
adminApiRouter.post('/clients/:id/order-form', async (req, res) => {
  try {
    const body = orderFormSchema.parse(req.body)

    // Deactivate any existing draft/sent forms for this client
    await db
      .from('order_forms')
      .update({ status: 'draft' })
      .eq('client_id', req.params.id)
      .eq('status', 'sent')

    const { data, error } = await db
      .from('order_forms')
      .insert({
        client_id: req.params.id,
        ...body,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to create order form' })
  }
})

// DELETE /admin-api/order-forms/:id — delete a draft order form
adminApiRouter.delete('/order-forms/:id', async (req, res) => {
  try {
    await db.from('order_forms').delete().eq('id', req.params.id).eq('status', 'draft')
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to delete order form' })
  }
})
