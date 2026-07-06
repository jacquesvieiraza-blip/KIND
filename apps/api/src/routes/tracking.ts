import { Router } from 'express'
import crypto from 'crypto'
import { db } from '@kind/db'

const router = Router()

// Constant-time admin-key check against the SHARED admin secret (ADMIN_SECRET_KEY —
// the same var every other admin/internal/engine guard uses). Fails CLOSED when the
// secret is unset. (#307: the old guard compared against ADMIN_API_KEY — a var
// nothing else sets — so when it was unset `undefined !== undefined` was false and
// the route passed with NO key, leaking visitor PII to anyone.)
function adminKeyValid(provided: unknown): boolean {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) return false
  const a = Buffer.from(String(provided ?? ''))
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// POST /track/visit — called from website tracking snippet
router.post('/visit', async (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? (req.socket as NodeJS.Socket & { remoteAddress?: string }).remoteAddress ?? ''
    const { page_url, referrer, user_agent } = req.body as {
      page_url?: string; referrer?: string; user_agent?: string
    }

    let company_name: string | null = null
    let company_domain: string | null = null
    let company_country: string | null = null
    let company_size_range: string | null = null
    let intent_score = 0

    // Try Clearbit Reveal (no API key = skip gracefully)
    if (process.env.CLEARBIT_API_KEY && ip && ip !== '127.0.0.1' && !ip.startsWith('192.168')) {
      try {
        const resp = await fetch(`https://reveal.clearbit.com/v1/companies/find?ip=${ip}`, {
          headers: { Authorization: `Bearer ${process.env.CLEARBIT_API_KEY}` }
        })
        if (resp.ok) {
          const data = await resp.json() as { company?: { name?: string; domain?: string; geo?: { country?: string }; metrics?: { employeesRange?: string } } }
          company_name = data.company?.name ?? null
          company_domain = data.company?.domain ?? null
          company_country = data.company?.geo?.country ?? null
          company_size_range = data.company?.metrics?.employeesRange ?? null
        }
      } catch { /* non-fatal */ }
    }

    // Score intent based on page
    if (page_url?.includes('pricing')) intent_score += 40
    if (page_url?.includes('demo')) intent_score += 30
    if (page_url?.includes('vs-')) intent_score += 25
    if (page_url?.includes('use-cases')) intent_score += 20
    if (referrer?.includes('linkedin')) intent_score += 15
    if (referrer?.includes('google')) intent_score += 10

    await db.from('visitor_sessions').insert({
      ip, company_name, company_domain, company_country, company_size_range,
      page_url, referrer, user_agent, intent_score
    })

    res.json({ ok: true })
  } catch (err) {
    // Always 200 to tracking snippet
    console.error('[tracking] POST /visit', err)
    res.json({ ok: false })
  }
})

// GET /track/admin/visitors — requires admin key, returns recent visitor sessions
router.get('/admin/visitors', async (req, res) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) { res.status(401).json({ error: 'unauthorized' }); return }
    const { data, error } = await db.from('visitor_sessions')
      .select('*')
      .order('visited_at', { ascending: false })
      .limit(200)
    if (error) { res.status(500).json({ error: error.message }); return }
    res.json(data)
  } catch (err) {
    console.error('[tracking] GET /admin/visitors', err)
    res.status(500).json({ error: 'Failed to load visitors' })
  }
})

export default router
