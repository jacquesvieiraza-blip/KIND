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
