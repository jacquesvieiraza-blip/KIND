import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { createClient } from '@supabase/supabase-js'

export const documentRouter = Router()

const storage = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const BUCKET = 'client-documents'

async function ensureBucket() {
  const { data } = await storage.storage.getBucket(BUCKET)
  if (!data) {
    await storage.storage.createBucket(BUCKET, { public: false, fileSizeLimit: '50mb' })
  }
}

documentRouter.use(requireAuth)

// GET /documents — list client's documents with signed download URLs
documentRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db
      .from('client_documents')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const docsWithUrls = await Promise.all(
      (data || []).map(async (doc) => {
        const { data: signed } = await storage.storage
          .from(BUCKET)
          .createSignedUrl(doc.file_path, 3600)
        return { ...doc, download_url: signed?.signedUrl ?? null }
      })
    )

    res.json({ success: true, data: docsWithUrls })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch documents' })
  }
})

// POST /documents/upload-url — get a signed URL so the browser can upload directly
documentRouter.post('/upload-url', async (req: AuthRequest, res) => {
  try {
    const { filename } = z.object({
      filename: z.string().min(1),
      mime_type: z.string(),
    }).parse(req.body)

    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    await ensureBucket()

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${client.id}/${Date.now()}-${safeName}`

    const { data, error } = await storage.storage.from(BUCKET).createSignedUploadUrl(filePath)
    if (error) throw error

    res.json({ success: true, data: { signed_url: data.signedUrl, token: data.token, path: filePath } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to generate upload URL' })
  }
})

// POST /documents — register a document after upload
documentRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      name: z.string().min(1),
      file_path: z.string().min(1),
      file_size: z.number().optional(),
      mime_type: z.string().optional(),
      document_type: z.enum(['offer', 'msa', 'sla', 'playbook', 'service_order', 'other']).default('other'),
    }).parse(req.body)

    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db
      .from('client_documents')
      .insert({ ...body, client_id: client.id, uploaded_by: 'client' })
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

// DELETE /documents/:id
documentRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: doc } = await db
      .from('client_documents')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', client.id)
      .single()

    if (!doc) { res.status(404).json({ success: false, error: 'Document not found' }); return }

    await storage.storage.from(BUCKET).remove([doc.file_path])
    await db.from('client_documents').delete().eq('id', req.params.id)

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to delete document' })
  }
})
