import { Router, Request, Response } from 'express'
import { db } from '@kind/db'
import { runIcpJob } from './icps'

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
          ttfl_hours = Math.round(
            (new Date(firstLeadRes.data.created_at).getTime() - new Date(client.created_at).getTime()) / 3600000
          )
        }

        return {
          id:               client.id,
          company_name:     client.company_name,
          industry:         client.industry,
          country:          client.country,
          created_at:       client.created_at,
          onboarded_at:     client.onboarded_at ?? null,
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

// ── DEMO ENVIRONMENTS ─────────────────────────────────────────────────────────

// GET /admin/demos — list all demo environments
adminRouter.get('/demos', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await db
      .from('clients')
      .select('id, company_name, industry, country, created_at, demo_prospect_name, demo_created_by, demo_expires_at, user_id')
      .eq('is_demo', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    const results = await Promise.all((data ?? []).map(async (client: any) => {
      const [leadsRes] = await Promise.all([
        db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
      ])
      return {
        id:               client.id,
        company_name:     client.company_name,
        industry:         client.industry,
        country:          client.country,
        created_at:       client.created_at,
        prospect_name:    client.demo_prospect_name,
        created_by:       client.demo_created_by,
        expires_at:       client.demo_expires_at,
        leads_count:      leadsRes.count ?? 0,
        expired:          client.demo_expires_at ? new Date(client.demo_expires_at) < new Date() : false,
      }
    }))

    res.json({ success: true, data: results })
  } catch (err) {
    console.error('[admin/demos]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch demos' })
  }
})

// POST /admin/demos — create a new demo environment
adminRouter.post('/demos', async (req: Request, res: Response) => {
  try {
    const { prospect_name, company_name, industry, country, website_url, expires_at, created_by } = req.body as {
      prospect_name: string; company_name: string; industry: string; country: string
      website_url?: string; expires_at: string; created_by: string
    }

    if (!prospect_name || !company_name || !expires_at || !created_by) {
      res.status(400).json({ success: false, error: 'prospect_name, company_name, expires_at, and created_by are required' })
      return
    }

    // 1. Create auth user with random credentials (internal only — never shared with prospect)
    const randomSuffix = Math.random().toString(36).slice(2, 10)
    const email    = `demo-${randomSuffix}@kind-demo.internal`
    const password = `Demo${randomSuffix}!`

    const { data: userData, error: userErr } = await db.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (userErr) throw new Error(`Auth user creation failed: ${userErr.message}`)
    const userId = userData.user!.id

    // 2. Create client row
    const { data: client, error: clientErr } = await db.from('clients').insert({
      user_id:              userId,
      company_name,
      industry,
      country,
      website:              website_url || null,
      credit_balance:       500,
      onboarded_at:         new Date().toISOString(),
      is_demo:              true,
      demo_prospect_name:   prospect_name,
      demo_created_by:      created_by,
      demo_expires_at:      expires_at,
    }).select('id').single()
    if (clientErr) throw new Error(`Client insert failed: ${clientErr.message}`)
    const clientId = client.id

    // 3. Activate all 4 products
    for (const product of ['lead_gen', 'lead_gen_figsy', 'virtual_assistant', 'chatbot']) {
      const { error: subErr } = await db.from('subscriptions').insert({
        client_id:             clientId,
        product,
        tier:                  'starter',
        status:                'active',
        billing_interval:      'monthly',
        current_period_start:  new Date().toISOString(),
        current_period_end:    expires_at,
      })
      if (subErr) console.error(`[demo] sub insert failed for ${product}:`, subErr.message)
    }

    // 4. Create a default ICP based on industry + country
    const { data: icp, error: icpErr } = await db.from('icps').insert({
      client_id:             clientId,
      name:                  `${company_name} — Demo ICP`,
      industries:            industry ? [industry] : [],
      geographies:           country  ? [country]  : [],
      seniority_levels:      ['C-Suite', 'VP / Director', 'Head of'],
      company_sizes:         ['11–50', '51–200', '201–500'],
      job_titles:            [],
      tech_stack:            [],
      keywords:              [],
      apollo_only_consented: true,
    }).select('id').single()

    if (icpErr) throw new Error(`ICP insert failed: ${icpErr.message}`)

    // 5. Run ICP job in background — real Apollo leads, real scores
    runIcpJob(icp.id, clientId, userId).catch(err =>
      console.error('[demo] ICP job failed:', err)
    )

    res.status(201).json({
      success: true,
      data: { client_id: clientId, user_id: userId, company_name, message: 'Demo environment created — ICP is running in the background' },
    })
  } catch (err) {
    console.error('[admin/demos/create]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// POST /admin/demos/:id/login — generate a magic link to open the demo portal
adminRouter.post('/demos/:id/login', async (req: Request, res: Response) => {
  try {
    const { data: client, error } = await db
      .from('clients')
      .select('user_id, is_demo')
      .eq('id', req.params.id)
      .single()

    if (error || !client) { res.status(404).json({ success: false, error: 'Demo not found' }); return }
    if (!client.is_demo)   { res.status(403).json({ success: false, error: 'Not a demo account' }); return }

    const { data: { user } } = await db.auth.admin.getUserById(client.user_id)
    if (!user?.email) { res.status(404).json({ success: false, error: 'Demo user not found' }); return }

    const { data: linkData } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: { redirectTo: `${process.env.PORTAL_URL || 'https://app.get-kind.com'}/dashboard` },
    })

    res.json({ success: true, data: { magic_link: linkData?.properties?.action_link ?? null } })
  } catch (err) {
    console.error('[admin/demos/login]', err)
    res.status(500).json({ success: false, error: 'Failed to generate login link' })
  }
})

// PATCH /admin/demos/:id/extend — update expiry date
adminRouter.patch('/demos/:id/extend', async (req: Request, res: Response) => {
  try {
    const { expires_at } = req.body as { expires_at: string }
    if (!expires_at) { res.status(400).json({ success: false, error: 'expires_at required' }); return }

    await db.from('clients').update({ demo_expires_at: expires_at }).eq('id', req.params.id).eq('is_demo', true)
    await db.from('subscriptions').update({ current_period_end: expires_at, status: 'active' }).eq('client_id', req.params.id)

    res.json({ success: true })
  } catch (err) {
    console.error('[admin/demos/extend]', err)
    res.status(500).json({ success: false, error: 'Failed to extend demo' })
  }
})

// DELETE /admin/demos/:id — expire/deactivate demo immediately
adminRouter.delete('/demos/:id', async (req: Request, res: Response) => {
  try {
    await db.from('subscriptions').update({ status: 'cancelled' }).eq('client_id', req.params.id)
    await db.from('clients').update({ demo_expires_at: new Date().toISOString() }).eq('id', req.params.id).eq('is_demo', true)
    res.json({ success: true })
  } catch (err) {
    console.error('[admin/demos/expire]', err)
    res.status(500).json({ success: false, error: 'Failed to expire demo' })
  }
})

// POST /admin/setup-demo — legacy single demo account (kept for backwards compat)
adminRouter.post('/setup-demo', async (req: Request, res: Response) => {
  try {
    const email    = (req.body as { email?: string }).email    || 'demo@get-kind.com'
    const password = (req.body as { password?: string }).password || 'KindDemo2025!'

    const { data: createData, error: createErr } = await db.auth.admin.createUser({
      email, password, email_confirm: true,
    })

    let userId: string
    if (createErr) {
      if (!createErr.message.toLowerCase().includes('already')) {
        throw new Error(`Auth user creation failed: ${createErr.message}`)
      }
      const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 })
      const existing = users.find((u: { email?: string; id: string }) => u.email === email)
      if (!existing) throw new Error('User exists but could not be found')
      userId = existing.id
    } else {
      userId = createData.user!.id
    }

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

    const periodEnd = new Date(Date.now() + 365 * 86400000).toISOString()
    for (const product of ['lead_gen', 'lead_gen_figsy', 'virtual_assistant', 'chatbot']) {
      await db.from('subscriptions').upsert({
        client_id: clientId, product, tier: 'starter', status: 'active',
        billing_interval: 'monthly', amount_usd: 0, amount_zar: 0,
        current_period_start: new Date().toISOString(), current_period_end: periodEnd,
      }, { onConflict: 'client_id,product' })
    }

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
