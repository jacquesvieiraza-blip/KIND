import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { db } from '@kind/db'
import { runIcpJob } from './icps'
import { computeChurnRisk } from './internal'

export const adminRouter = Router()

// Constant-time admin-key check — avoids the char-by-char timing side-channel of `!==`.
export function adminKeyValid(provided: unknown): boolean {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) return false
  const a = Buffer.from(String(provided ?? ''))
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function requireAdminKey(req: Request, res: Response, next: () => void) {
  if (!adminKeyValid(req.headers['x-admin-key'])) {
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
    const parsed = z.object({
      prospect_name: z.string().min(1).max(200),
      company_name:  z.string().min(1).max(200),
      industry:      z.string().max(100).optional(),
      country:       z.string().max(100).optional(),
      website_url:   z.string().max(300).optional(),
      expires_at:    z.string().refine(
        s => !Number.isNaN(Date.parse(s)) && new Date(s) > new Date(),
        'expires_at must be a valid future date',
      ),
      created_by:    z.string().min(1).max(200),
    }).safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }
    const { prospect_name, company_name, industry, country, website_url, expires_at, created_by } = parsed.data

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
    if (!z.string().uuid().safeParse(req.params.id).success) {
      res.status(400).json({ success: false, error: 'Invalid demo id' }); return
    }
    const parsed = z.object({
      expires_at: z.string().refine(
        s => !Number.isNaN(Date.parse(s)) && new Date(s) > new Date(),
        'expires_at must be a valid future date',
      ),
    }).safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid expires_at' }); return
    }
    const { expires_at } = parsed.data

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

// GET /admin/clients/:id — single client details
adminRouter.get('/clients/:id', async (req: Request, res: Response) => {
  try {
    const { data: client, error } = await db
      .from('clients')
      .select('*, subscriptions(*)')
      .eq('id', req.params.id)
      .single()
    if (error || !client) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    res.json({ success: true, data: client })
  } catch (err) {
    console.error('[admin/clients/:id]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch client' })
  }
})

// ── CLIENT CREDIT MANAGEMENT ──────────────────────────────────────────────────

// GET /admin/clients/:id/credits — credit balance + last 50 transactions
adminRouter.get('/clients/:id/credits', async (req: Request, res: Response) => {
  try {
    const [clientRes, txRes] = await Promise.all([
      db.from('clients').select('id, company_name, credit_balance').eq('id', req.params.id).single(),
      db.from('credit_transactions').select('*').eq('client_id', req.params.id)
        .order('created_at', { ascending: false }).limit(50),
    ])
    if (clientRes.error || !clientRes.data) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    res.json({ success: true, data: { balance: clientRes.data.credit_balance ?? 0, transactions: txRes.data ?? [] } })
  } catch (err) {
    console.error('[admin/clients/credits]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch credit data' })
  }
})

// POST /admin/clients/:id/credits — grant or deduct credits
adminRouter.post('/clients/:id/credits', async (req: Request, res: Response) => {
  try {
    if (!z.string().uuid().safeParse(req.params.id).success) {
      res.status(400).json({ success: false, error: 'Invalid client id' }); return
    }
    const parsed = z.object({
      amount: z.number().int().refine(n => n !== 0, 'amount must be a non-zero integer'),
      type:   z.enum(['manual_grant', 'refund']),
      note:   z.string().max(500).optional(),
    }).safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' }); return
    }
    const { amount, type, note } = parsed.data
    // Cap magnitude BOTH ways — a large negative could silently drain a balance.
    if (Math.abs(amount) > 500) {
      res.status(400).json({ success: false, error: 'Manual adjustments are capped at ±500 credits. Use multiple if needed.' }); return
    }

    const { data: client, error: clientErr } = await db
      .from('clients').select('id, credit_balance').eq('id', req.params.id).single()
    if (clientErr || !client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const newBalance = (client.credit_balance ?? 0) + amount
    // Audit trail — no per-admin identity behind the shared key, so stamp the
    // action, time and source IP into the transaction note for traceability.
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.ip || 'unknown'
    const auditNote = `${note ? note + ' · ' : ''}[admin ${type} ${amount > 0 ? '+' : ''}${amount} @ ${new Date().toISOString()} from ${ip}]`

    const [, txRes] = await Promise.all([
      db.from('clients').update({ credit_balance: newBalance }).eq('id', req.params.id),
      db.from('credit_transactions').insert({
        client_id: req.params.id, type, amount, note: auditNote,
      }).select('id').single(),
    ])
    if (txRes.error) throw txRes.error

    res.json({ success: true, data: { new_balance: newBalance } })
  } catch (err) {
    console.error('[admin/clients/credits/grant]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// POST /admin/setup-demo — legacy single demo account (kept for backwards compat)
adminRouter.post('/setup-demo', async (req: Request, res: Response) => {
  try {
    // No hardcoded fallback creds — a known default account is a backdoor.
    const email    = (req.body as { email?: string }).email
    const password = (req.body as { password?: string }).password
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'email and password are required' })
      return
    }

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
        billing_interval: 'monthly', amount_zar: 0,
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

// ── SEED DEMO LEADS — insert realistic fake leads for a client by email ────────
adminRouter.post('/seed-leads', async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string }
    if (!email) { res.status(400).json({ success: false, error: 'email required' }); return }

    const { data: { users }, error: userErr } = await db.auth.admin.listUsers({ perPage: 1000 })
    if (userErr) throw userErr

    const user = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
    if (!user) { res.status(404).json({ success: false, error: `No user found: ${email}` }); return }

    const { data: client, error: clientErr } = await db
      .from('clients').select('id, company_name').eq('user_id', user.id).single()
    if (clientErr || !client) { res.status(404).json({ success: false, error: 'No client for this user' }); return }

    const { data: icp } = await db.from('icps').select('id, name')
      .eq('client_id', client.id).order('created_at', { ascending: false }).limit(1).maybeSingle()

    const DEMO_LEADS = [
      { first_name: 'Sipho',    last_name: 'Dlamini',    job_title: 'VP of Sales',           company: 'Yoco Technologies',  industry: 'Fintech', seniority: 'VP / Director', score: 87, email: 'sipho.dlamini@yoco.com',        linkedin_url: 'https://linkedin.com/in/sipho-dlamini',    company_size: '201–500' },
      { first_name: 'Lerato',   last_name: 'Mokoena',    job_title: 'Founder & CEO',          company: 'Stitch Money',       industry: 'Fintech', seniority: 'C-Suite',       score: 92, email: 'lerato.mokoena@stitch.money',   linkedin_url: 'https://linkedin.com/in/lerato-mokoena',   company_size: '51–200'  },
      { first_name: 'Thabo',    last_name: 'Nkosi',      job_title: 'Sales Director',         company: 'Jumo World',         industry: 'SaaS',    seniority: 'VP / Director', score: 81, email: 'thabo.nkosi@jumo.world',        linkedin_url: 'https://linkedin.com/in/thabo-nkosi',      company_size: '201–500' },
      { first_name: 'Zanele',   last_name: 'Khumalo',    job_title: 'Head of Revenue',        company: 'Luno',               industry: 'Fintech', seniority: 'Head of',       score: 79, email: 'zanele.khumalo@luno.com',       linkedin_url: 'https://linkedin.com/in/zanele-khumalo',   company_size: '201–500' },
      { first_name: 'Kyle',     last_name: 'van der Berg',job_title: 'Co-Founder',            company: 'Peach Payments',     industry: 'SaaS',    seniority: 'C-Suite',       score: 94, email: 'kyle@peachpayments.com',        linkedin_url: 'https://linkedin.com/in/kyle-vanderberg',  company_size: '51–200'  },
      { first_name: 'Nomsa',    last_name: 'Zulu',       job_title: 'VP of Business Dev',     company: 'Kandua',             industry: 'SaaS',    seniority: 'VP / Director', score: 76, email: 'nomsa.zulu@kandua.com',         linkedin_url: 'https://linkedin.com/in/nomsa-zulu',       company_size: '11–50'   },
      { first_name: 'Brendan',  last_name: 'Joubert',    job_title: 'Founder',                company: 'Skynamo',            industry: 'SaaS',    seniority: 'C-Suite',       score: 89, email: 'brendan@skynamo.com',           linkedin_url: 'https://linkedin.com/in/brendan-joubert',  company_size: '51–200'  },
      { first_name: 'Ayanda',   last_name: 'Mthembu',    job_title: 'Sales Director',         company: 'Mama Money',         industry: 'Fintech', seniority: 'VP / Director', score: 83, email: 'ayanda.mthembu@mamamoney.com',  linkedin_url: 'https://linkedin.com/in/ayanda-mthembu',   company_size: '51–200'  },
      { first_name: 'Pieter',   last_name: 'du Plessis', job_title: 'Chief Revenue Officer',  company: 'DataProphet',        industry: 'SaaS',    seniority: 'C-Suite',       score: 91, email: 'pieter@dataprophet.com',        linkedin_url: 'https://linkedin.com/in/pieter-duplessis', company_size: '51–200'  },
      { first_name: 'Thandeka', last_name: 'Sithole',    job_title: 'VP Sales & Marketing',   company: 'Ozow',               industry: 'Fintech', seniority: 'VP / Director', score: 85, email: 'thandeka.sithole@ozow.com',     linkedin_url: 'https://linkedin.com/in/thandeka-sithole', company_size: '201–500' },
      { first_name: 'Ruan',     last_name: 'Botha',      job_title: 'Founder & CTO',          company: 'Lumkani',            industry: 'SaaS',    seniority: 'C-Suite',       score: 78, email: 'ruan@lumkani.com',              linkedin_url: 'https://linkedin.com/in/ruan-botha',       company_size: '11–50'   },
      { first_name: 'Naledi',   last_name: 'Dube',       job_title: 'Head of Sales',          company: 'FinCraft',           industry: 'SaaS',    seniority: 'Head of',       score: 72, email: 'naledi.dube@fincraft.io',       linkedin_url: 'https://linkedin.com/in/naledi-dube',      company_size: '11–50'   },
      { first_name: 'Fatima',   last_name: 'Patel',      job_title: 'Founder',                company: 'Franc',              industry: 'Fintech', seniority: 'C-Suite',       score: 88, email: 'fatima@franc.co.za',            linkedin_url: 'https://linkedin.com/in/fatima-patel',     company_size: '11–50'   },
      { first_name: 'Lungelo',  last_name: 'Ngcobo',     job_title: 'VP of Partnerships',     company: 'Sendmarc',           industry: 'SaaS',    seniority: 'VP / Director', score: 74, email: 'lungelo.ngcobo@sendmarc.com',   linkedin_url: 'https://linkedin.com/in/lungelo-ngcobo',   company_size: '51–200'  },
      { first_name: 'Megan',    last_name: 'van Wyk',    job_title: 'Chief Sales Officer',    company: 'RetailTribe',        industry: 'SaaS',    seniority: 'C-Suite',       score: 86, email: 'megan@retailtribe.com',         linkedin_url: 'https://linkedin.com/in/megan-vanwyk',     company_size: '51–200'  },
      { first_name: 'Sibusiso', last_name: 'Hadebe',     job_title: 'Co-Founder',             company: 'Ukheshe',            industry: 'Fintech', seniority: 'C-Suite',       score: 90, email: 'sibusiso@ukheshe.com',          linkedin_url: 'https://linkedin.com/in/sibusiso-hadebe',  company_size: '51–200'  },
      { first_name: 'Mpho',     last_name: 'Tladi',      job_title: 'Sales Director',         company: 'Cellulant',          industry: 'Fintech', seniority: 'VP / Director', score: 77, email: 'mpho.tladi@cellulant.io',       linkedin_url: 'https://linkedin.com/in/mpho-tladi',       company_size: '201–500' },
      { first_name: 'Heinrich', last_name: 'Prins',      job_title: 'Founder & CEO',          company: 'Bitcube',            industry: 'SaaS',    seniority: 'C-Suite',       score: 82, email: 'heinrich@bitcube.co.za',        linkedin_url: 'https://linkedin.com/in/heinrich-prins',   company_size: '11–50'   },
      { first_name: 'Nomvula',  last_name: 'Mahlangu',   job_title: 'VP of Sales',            company: 'Nile',               industry: 'SaaS',    seniority: 'VP / Director', score: 84, email: 'nomvula@nile.co',               linkedin_url: 'https://linkedin.com/in/nomvula-mahlangu', company_size: '11–50'   },
      { first_name: 'Kefilwe',  last_name: 'Molefe',     job_title: 'Co-Founder & CRO',       company: 'Workstreams Africa', industry: 'SaaS',    seniority: 'C-Suite',       score: 93, email: 'kefilwe@workstreams.africa',    linkedin_url: 'https://linkedin.com/in/kefilwe-molefe',   company_size: '11–50'   },
      { first_name: 'Priya',    last_name: 'Naidoo',     job_title: 'Head of Enterprise Sales',company: 'Custos Media',      industry: 'SaaS',    seniority: 'Head of',       score: 73, email: 'priya.naidoo@custosmedia.com',  linkedin_url: 'https://linkedin.com/in/priya-naidoo',     company_size: '11–50'   },
      { first_name: 'Ethan',    last_name: 'Meyer',      job_title: 'Sales Director',         company: 'iKhokha',            industry: 'Fintech', seniority: 'VP / Director', score: 79, email: 'ethan.meyer@ikhokha.com',       linkedin_url: 'https://linkedin.com/in/ethan-meyer',      company_size: '201–500' },
      { first_name: 'Carla',    last_name: 'Rossouw',    job_title: 'Head of Growth',         company: 'Nuvei Africa',       industry: 'SaaS',    seniority: 'Head of',       score: 70, email: 'carla.rossouw@nuvei.com',       linkedin_url: 'https://linkedin.com/in/carla-rossouw',    company_size: '201–500' },
      { first_name: 'Dillon',   last_name: 'de Koker',   job_title: 'Founder',                company: 'Lendico SA',         industry: 'Fintech', seniority: 'C-Suite',       score: 87, email: 'dillon@lendico.co.za',          linkedin_url: 'https://linkedin.com/in/dillon-dekoker',   company_size: '51–200'  },
      { first_name: 'Thabo',  last_name: 'Nkosi',     job_title: 'Sales Director',         company: 'Nomanini',           industry: 'SaaS',    seniority: 'VP / Director', score: 80, email: 'thabo.nkosi@nomanini.com',   linkedin_url: 'https://linkedin.com/in/thabo-nkosi',   company_size: '51–200'  },
    ]

    const now = new Date().toISOString()
    const rows = DEMO_LEADS.map((l: any, i: number) => ({
      client_id:        client.id,
      icp_id:           icp?.id ?? null,
      first_name:       l.first_name,
      last_name:        l.last_name,
      email:            l.email,
      job_title:        l.job_title,
      company:          l.company,
      industry:         l.industry,
      country:          'South Africa',
      seniority:        l.seniority,
      linkedin_url:     l.linkedin_url,
      score:            l.score,
      score_reasoning:  `Strong ICP match: ${l.seniority} at a ${l.industry} company in South Africa`,
      company_size:     l.company_size,
      tech_stack:       [['HubSpot', 'Slack'], ['Salesforce', 'AWS'], ['Pipedrive', 'Google Workspace']][i % 3],
      apollo_consented: true,
      status:           ['pending', 'pending', 'pending', 'contacted'][i % 4] as string,
      delivered_at:     i % 4 === 3 ? now : null,
      created_at:       new Date(Date.now() - i * 3600000).toISOString(),
    }))

    const { data: inserted, error: insertErr } = await db.from('leads').insert(rows).select('id')
    if (insertErr) throw insertErr

    // Top up credits so outreach-paused banner disappears
    await db.from('clients').update({ credit_balance: 50 }).eq('id', client.id)

    res.json({
      success: true,
      message: `Seeded ${inserted?.length ?? 0} demo leads for ${client.company_name}. Credits set to 50.`,
      client_id: client.id,
      icp_id: icp?.id ?? null,
      leads_inserted: inserted?.length ?? 0,
    })
  } catch (err) {
    console.error('[admin/seed-leads]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// ── P3-3: ADMIN MESSAGING ─────────────────────────────────────────────────────
adminRouter.get('/messages', async (_req, res) => {
  try {
    const { data } = await db.from('client_messages')
      .select('id, client_id, content, sender_type, created_at, read_at, clients(company_name)')
      .order('created_at', { ascending: false })
      .limit(200)
    res.json({ success: true, data: data ?? [] })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch messages' }) }
})

adminRouter.post('/messages/:clientId/reply', async (req, res) => {
  try {
    const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(req.body)
    const { data, error } = await db.from('client_messages').insert({
      client_id: req.params.clientId,
      content,
      sender_type: 'admin',
    }).select('id, content, sender_type, created_at').single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to send reply' }) }
})

// ── P3-6: CHURN RISK — admin endpoint ────────────────────────────────────────
// GET /admin/churn-risk — returns churn risk scores for all clients with active subs.
// Authenticated via admin key (same as all other /admin routes).
adminRouter.get('/churn-risk', async (_req: Request, res: Response) => {
  try {
    const at_risk = await computeChurnRisk()
    res.json({ success: true, data: { at_risk } })
  } catch (err) {
    console.error('[admin/churn-risk]', err)
    res.status(500).json({ success: false, error: 'Churn risk computation failed' })
  }
})

