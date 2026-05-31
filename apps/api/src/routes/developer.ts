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
    if (!clientId) return res.status(404).json({ error: 'Client not found' })
    const { data, error } = await db.from('developer_keys')
      .select('id, key_prefix, name, created_at, last_used_at, total_requests, revoked_at')
      .eq('client_id', clientId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
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
    if (!clientId) return res.status(404).json({ error: 'Client not found' })
    const { name } = req.body
    const rawKey = `kind_${crypto.randomBytes(24).toString('hex')}`
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.substring(0, 12)
    const { data, error } = await db.from('developer_keys')
      .insert({ client_id: clientId, key_prefix: keyPrefix, key_hash: keyHash, name: name ?? 'My API Key' })
      .select('id, key_prefix, name, created_at')
      .single()
    if (error) return res.status(500).json({ error: error.message })
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
    if (!clientId) return res.status(404).json({ error: 'Client not found' })
    const { error } = await db.from('developer_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('client_id', clientId)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (err) {
    console.error('[developer] DELETE /keys/:id', err)
    res.status(500).json({ error: 'Failed to revoke key' })
  }
})

export default router
