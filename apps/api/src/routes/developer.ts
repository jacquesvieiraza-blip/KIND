import { Router } from 'express'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import crypto from 'crypto'

const router = Router()

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

// GET /developer/keys — list client's API keys
router.get('/keys', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }
    const { data, error } = await db.from('developer_keys')
      .select('id, key_prefix, name, created_at, last_used_at, total_requests, revoked_at')
      .eq('client_id', clientId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
    if (error) { res.status(500).json({ error: error.message }); return }
    res.json(data)
  } catch (err) {
    console.error('[developer] GET /keys', err)
    res.status(500).json({ error: 'Failed to list keys' })
  }
})

// POST /developer/keys — create new API key
router.post('/keys', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }
    const { name } = req.body as { name?: string }
    const rawKey = `kind_${crypto.randomBytes(24).toString('hex')}`
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.substring(0, 12)
    const { data, error } = await db.from('developer_keys')
      .insert({ client_id: clientId, key_prefix: keyPrefix, key_hash: keyHash, name: name ?? 'My API Key' })
      .select('id, key_prefix, name, created_at')
      .single()
    if (error) { res.status(500).json({ error: error.message }); return }
    // Return full key ONCE only
    res.json({ ...data, key: rawKey })
  } catch (err) {
    console.error('[developer] POST /keys', err)
    res.status(500).json({ error: 'Failed to create key' })
  }
})

// DELETE /developer/keys/:id — revoke key
router.delete('/keys/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }
    const { error } = await db.from('developer_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('client_id', clientId)
    if (error) { res.status(500).json({ error: error.message }); return }
    res.json({ ok: true })
  } catch (err) {
    console.error('[developer] DELETE /keys/:id', err)
    res.status(500).json({ error: 'Failed to revoke key' })
  }
})

export default router
