import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const platformMessageRouter = Router()

platformMessageRouter.use(requireAuth)

// GET /platform-messages — list messages for the current client
platformMessageRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db
      .from('client_messages')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Mark admin messages as read
    await db
      .from('client_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('client_id', client.id)
      .eq('sender_type', 'admin')
      .is('read_at', null)

    res.json({ success: true, data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch messages' })
  }
})

// POST /platform-messages — client sends a message
platformMessageRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(req.body)

    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db
      .from('client_messages')
      .insert({ client_id: client.id, sender_type: 'client', content })
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

// GET /platform-messages/unread-count
platformMessageRouter.get('/unread-count', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.json({ success: true, data: { count: 0 } }); return }

    const { count } = await db
      .from('client_messages')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.id)
      .eq('sender_type', 'admin')
      .is('read_at', null)

    res.json({ success: true, data: { count: count ?? 0 } })
  } catch (err) {
    console.error(err)
    res.json({ success: true, data: { count: 0 } })
  }
})
