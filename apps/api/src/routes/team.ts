import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// #266 SECURITY: every /team route requires auth, and the caller's workspace is
// DERIVED from the authed user — never trusted from a query/body param. Before this,
// the whole router was unauthenticated and trusted a caller-supplied client_id, so
// anyone could read any team, invite themselves as admin into any workspace, or
// delete any member. Deriving the client from req.userId closes all three.
router.use(requireAuth)

function db() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// The workspace (client) OWNED by the authed user. Null if they don't own one.
async function ownerClientId(userId: string): Promise<string | null> {
  const { data } = await db().from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

// ⚑ 29 Sep (R174 ① · 4d) — POST /team/invite IS RETIRED: IT GAVE NOBODY ACCESS.
//
// ⛓️ WAS: an invite that wrote a `client_members` row and emailed a link. Nothing in the product
// reads `client_members` except this file, so the colleague accepted and could see nothing —
// an invite that looked sent and gave no access. "My team" lives in Command Centre now (founder:
// "yes my team to command cente"), whose seat invite gives the colleague their own seat. This
// route writes nothing and sends nothing, for anyone, and says where to go instead.
export const TEAM_INVITE_MOVED = 'Team invites are made in Command Centre → Seats now — that invite gives your colleague their own seat.'

router.post('/invite', async (_req: AuthRequest, res): Promise<void> => {
  res.status(410).json({ error: TEAM_INVITE_MOVED })
})

// GET /team/accept?token=xxx — accept an invite. The accepting user is taken from
// the auth token (req.userId), NOT a caller-supplied user_id (which was spoofable).
router.get('/accept', async (req: AuthRequest, res): Promise<void> => {
  const { token } = req.query as { token: string }
  if (!token) { res.status(400).json({ error: 'token required' }); return }

  const supabase = db()
  const { data, error } = await supabase
    .from('client_members')
    .update({ user_id: req.userId!, accepted_at: new Date().toISOString(), invite_token: null })
    .eq('invite_token', token)
    .is('accepted_at', null)
    .select()
    .single()

  if (error || !data) { res.status(400).json({ error: 'Invalid or expired invite token' }); return }
  res.json({ ok: true, client_id: data.client_id, role: data.role })
})

// GET /team/members — list members of the CALLER'S OWN workspace (derived from auth).
router.get('/members', async (req: AuthRequest, res): Promise<void> => {
  const clientId = await ownerClientId(req.userId!)
  if (!clientId) { res.status(404).json({ error: 'No workspace for this user' }); return }

  const supabase = db()
  const { data, error } = await supabase
    .from('client_members')
    .select('id, email, role, invited_at, accepted_at')
    .eq('client_id', clientId)
    .order('invited_at', { ascending: true })

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

// DELETE /team/member/:id — remove a member, but ONLY if they belong to the caller's
// own workspace (ownership check before delete).
router.delete('/member/:id', async (req: AuthRequest, res): Promise<void> => {
  const clientId = await ownerClientId(req.userId!)
  if (!clientId) { res.status(404).json({ error: 'No workspace for this user' }); return }

  const supabase = db()
  const { data: member } = await supabase
    .from('client_members')
    .select('id, client_id')
    .eq('id', req.params.id)
    .maybeSingle()
  if (!member || member.client_id !== clientId) {
    res.status(404).json({ error: 'Member not found' }); return
  }

  const { error } = await supabase
    .from('client_members')
    .delete()
    .eq('id', req.params.id)
    .eq('client_id', clientId)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ ok: true })
})

export default router
