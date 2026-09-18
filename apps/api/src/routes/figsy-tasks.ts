import { Router } from 'express'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { rateLimit } from '../lib/rate-limit'
import Anthropic from '@anthropic-ai/sdk'
import { BACKGROUND_MODEL } from '../lib/models'

const router = Router()
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// #321 — per-user cap on the Claude-backed task extractor (keyed by userId; sits
// after requireAuth in the route chain).
const figsyTasksAiLimit = rateLimit({ limit: 20, windowMs: 60_000, key: 'figsy-tasks-ai', byUser: true })

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

// GET /figsy-tasks — list tasks for the authenticated client
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }

    const { data, error } = await db
      .from('figsy_tasks')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err: any) {
    console.error('[figsy-tasks] GET /', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /figsy-tasks — assign a new task to FIGSY
router.post('/', requireAuth, figsyTasksAiLimit, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }

    const { title, description } = req.body as { title?: string; description?: string }
    if (!title) { res.status(400).json({ error: 'title required' }); return }

    const { data, error } = await db
      .from('figsy_tasks')
      .insert({ client_id: clientId, title, description: description ?? null, status: 'pending' })
      .select()
      .single()
    if (error) throw error

    // Async: have FIGSY process the task (non-blocking)
    processTask(data.id, clientId, title, description ?? '').catch(() => {})

    res.json(data)
  } catch (err: any) {
    console.error('[figsy-tasks] POST /', err)
    res.status(500).json({ error: err.message })
  }
})

async function processTask(taskId: string, clientId: string, title: string, description: string) {
  // Mark in_progress
  await db.from('figsy_tasks').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', taskId)

  try {
    // Get client campaign context
    const { data: campaigns } = await db
      .from('figsy_campaigns')
      .select('name, emails_sent, replies_total, meetings_booked')
      .eq('client_id', clientId)
      .limit(5)

    const context = campaigns?.map(c =>
      `Campaign "${c.name}": ${c.emails_sent ?? 0} sent, ${c.replies_total ?? 0} replied, ${c.meetings_booked ?? 0} meetings`
    ).join('\n') || 'No campaigns yet.'

    const response = await claude.messages.create({
      model: BACKGROUND_MODEL,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are FIGSY, an AI SDR working for a client. They have assigned you this task:\n\nTitle: ${title}\nDescription: ${description}\n\nCurrent campaign context:\n${context}\n\nRespond with a concise action plan or result. Be specific and practical. Max 3 bullet points.`,
      }],
    })

    const result = response.content[0].type === 'text' ? response.content[0].text : 'Task processed.'
    await db.from('figsy_tasks')
      .update({ status: 'done', result, updated_at: new Date().toISOString() })
      .eq('id', taskId)
  } catch {
    await db.from('figsy_tasks')
      .update({
        status: 'escalated',
        result: 'FIGSY could not complete this task automatically. A team member will follow up.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
  }
}

export default router
