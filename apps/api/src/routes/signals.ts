import { Router } from 'express'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// ── HELPER: fire-and-forget signal emission for any agent ─────────────────────
// Import and call this from FIGSY, Milla, Vida handlers.
// Non-blocking — never throws, never breaks the caller's main flow.
export async function emitSignal(
  client_id: string,
  agent: 'figsy' | 'milla' | 'vida',
  signal_type: string,
  payload: Record<string, any> = {},
): Promise<void> {
  try {
    await db.from('agent_signals').insert({ client_id, agent, signal_type, payload })
  } catch {
    // intentionally swallowed — signal emission is never load-bearing
  }
}

// POST /signals — any agent writes a signal
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { client_id, agent, signal_type, payload } = req.body
    if (!client_id || !agent || !signal_type) {
      res.status(400).json({ error: 'client_id, agent, signal_type required' }); return
    }
    const { data, error } = await db
      .from('agent_signals')
      .insert({ client_id, agent, signal_type, payload: payload || {} })
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /signals/:client_id/summary — cross-agent summary for Milla/dashboard
// NOTE: must be registered BEFORE /:client_id to avoid param shadowing
router.get('/:client_id/summary', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await db
      .from('agent_signals')
      .select('agent, signal_type, created_at, payload')
      .eq('client_id', req.params.client_id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error

    // Group by agent
    const summary: Record<string, any[]> = { figsy: [], milla: [], vida: [] }
    for (const row of data || []) {
      if (summary[row.agent]) summary[row.agent].push(row)
    }

    res.json({
      period: '7d',
      total: data?.length || 0,
      by_agent: {
        figsy: summary.figsy.length,
        milla: summary.milla.length,
        vida: summary.vida.length,
      },
      recent: data?.slice(0, 20),
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /signals/:client_id — read all signals for a client (last 100)
router.get('/:client_id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { agent, signal_type, limit } = req.query
    let query = db
      .from('agent_signals')
      .select('*')
      .eq('client_id', req.params.client_id)
      .order('created_at', { ascending: false })
      .limit(Number(limit) || 100)

    if (agent) query = query.eq('agent', agent as string)
    if (signal_type) query = query.eq('signal_type', signal_type as string)

    const { data, error } = await query
    if (error) throw error
    res.json(data)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
