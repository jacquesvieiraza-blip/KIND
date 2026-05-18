import { Router, Request, Response } from 'express'
import { db } from '@kind/db'

export const adminRouter = Router()

function requireAdminKey(req: Request, res: Response, next: () => void) {
  if (!process.env.ADMIN_SECRET_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_SECRET_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  next()
}

adminRouter.use(requireAdminKey)

adminRouter.get('/clients', async (_req: Request, res: Response) => {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data: clients, error } = await db
      .from('clients')
      .select('id, company_name, industry, country, created_at, onboarded_at, user_id')
      .order('created_at', { ascending: false })

    if (error) throw error

    const results = await Promise.all(
      (clients ?? []).map(async (client: any) => {
        const [totalRes, monthRes, firstLeadRes, userRes] = await Promise.all([
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
          db.from('leads').select('id', { count: 'exact', head: true })
            .eq('client_id', client.id)
            .gte('created_at', monthStart),
          db.from('leads').select('created_at').eq('client_id', client.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle(),
          client.user_id ? db.auth.admin.getUserById(client.user_id) : Promise.resolve({ data: { user: null } }),
        ])

        let ttfl_hours: number | null = null
        if (firstLeadRes.data?.created_at) {
          const clientCreated = new Date(client.created_at)
          const firstLead     = new Date(firstLeadRes.data.created_at)
          ttfl_hours = Math.round((firstLead.getTime() - clientCreated.getTime()) / 1000 / 60 / 60)
        }

        return {
          id:               client.id,
          company_name:     client.company_name,
          industry:         client.industry,
          country:          client.country,
          created_at:       client.created_at,
          onboarded_at:     (client as any).onboarded_at ?? null,
          ttfl_hours,
          leads_total:      totalRes.count ?? 0,
          leads_this_month: monthRes.count ?? 0,
          user_email:       (userRes as any).data?.user?.email ?? null,
        }
      }),
    )

    res.json({ success: true, data: results })
  } catch (err) {
    console.error('[admin/clients]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch clients' })
  }
})

// POST /admin/setup-demo — creates or resets a demo account with all products active
adminRouter.post('/setup-demo', async (req: Request, res: Response) => {
  try {
    const email    = (req.body as { email?: string }).email    || 'demo@get-kind.com'
    const password = (req.body as { password?: string }).password || 'KindDemo2025!'

    // Create auth user (idempotent — ignore "already registered")
    const { data: createData, error: createErr } = await db.auth.admin.createUser({
      email, password, email_confirm: true,
    })

    let userId: string
    if (createErr) {
      if (!createErr.message.toLowerCase().includes('already')) {
        throw new Error(`Auth user creation failed: ${createErr.message}`)
      }
      // User exists — find their ID
      const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 })
      const existing = users.find((u: { email?: string; id: string }) => u.email === email)
      if (!existing) throw new Error('User exists but could not be found')
      userId = existing.id
    } else {
      userId = createData.user!.id
    }

    // Upsert client row
    const { data: existingClient } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
    let clientId: string
    if (existingClient) {
      clientId = existingClient.id
    } else {
      const { data: newClient, error: clientErr } = await db.from('clients').insert({
        user_id: userId, company_name: 'K.I.N.D Demo', industry: 'Technology',
        country: 'South Africa', credit_balance: 1000, onboarded_at: new Date().toISOString(),
      }).select('id').single()
      if (clientErr) throw new Error(`Client insert failed: ${clientErr.message}`)
      clientId = newClient.id
    }

    // Activate all 4 products
    const periodEnd = new Date(Date.now() + 365 * 86400000).toISOString()
    for (const product of ['lead_gen', 'lead_gen_figsy', 'virtual_assistant', 'chatbot']) {
      const { error: subErr } = await db.from('subscriptions').upsert({
        client_id: clientId, product, tier: 'starter', status: 'active',
        billing_interval: 'monthly', amount_usd: 0, amount_zar: 0,
        current_period_start: new Date().toISOString(), current_period_end: periodEnd,
      }, { onConflict: 'client_id,product' })
      if (subErr) throw new Error(`Subscription upsert failed for ${product}: ${subErr.message}`)
    }

    // Generate a magic link so the caller can share it
    const { data: linkData } = await db.auth.admin.generateLink({
      type: 'magiclink', email,
      options: { redirectTo: `${process.env.PORTAL_URL || 'https://app.get-kind.com'}/dashboard` },
    })

    res.json({
      success: true,
      message: 'Demo account ready — all 4 products active for 1 year',
      credentials: { email, password },
      client_id: clientId,
      magic_link: linkData?.properties?.action_link ?? null,
    })
  } catch (err) {
    console.error('[admin/setup-demo]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})
