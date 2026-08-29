// Option A (verified leads campaign-ready) + Railway build fix — deploy trigger.
import 'dotenv/config'
import { runStartupCheck } from './lib/startup-check'
runStartupCheck()
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { authRouter } from './routes/auth'
import { clientRouter } from './routes/clients'
import { subscriptionRouter } from './routes/subscriptions'
import { leadRouter } from './routes/leads'
import { icpRouter } from './routes/icps'
import { creditRouter } from './routes/credits'
import { errorHandler, captureProcessError } from './middleware/error'
import { adminRouter } from './routes/admin'
import { figsyRouter } from './routes/figsy'
import { internalRouter } from './routes/internal'
import { supportRouter } from './routes/support'
import { founderRouter } from './routes/founder'
import { partnersRouter } from './routes/partners'
import { voiceRouter } from './routes/voice'
import { whatsappRouter } from './routes/whatsapp'
import { calendarRouter } from './routes/calendar'
import { millaRouter } from './routes/milla'
import { vidaRouter } from './routes/vida'
import { operatorRouter } from './routes/operator'
import { programmeRouter } from './routes/programme'
import { formsRouter } from './routes/forms'
import { companyRouter } from './routes/company'
import { deniseRouter } from './routes/denise'
import { caseyRouter } from './routes/casey'
import { stripeRouter } from './routes/stripe'
import { orderFormRouter } from './routes/order-forms'
import { statsRouter } from './routes/stats'
import { internalBriefsRouter } from './routes/internal-briefs'
import demoRequestRouter from './routes/demo-request'
import subscribeRouter from './routes/subscribe'
import { statusRouter } from './routes/status'
import { shareRouter } from './routes/share'
import teamRouter from './routes/team'
import mcpRouter from './routes/mcp'
import developerRouter from './routes/developer'
import proposalsRouter from './routes/proposals'
import trackingRouter from './routes/tracking'
import signalsRouter from './routes/signals'
import figsyTasksRouter from './routes/figsy-tasks'
import lookalikeRouter from './routes/lookalike'
import { linkedinRouter } from './routes/linkedin'
import { integrationsRouter } from './routes/integrations'
import { engineRouter } from './routes/engine'
import { onboardingRouter } from './routes/onboarding'
import { moneyPathRouter } from './routes/money-path'
import { outreachRouter } from './routes/outreach'
import { startCrons } from './cron'
import { createClient } from '@supabase/supabase-js'

// Lightweight Supabase client used ONLY by the /health probe (cheap HEAD count).
// Reuses the same env config as the rest of the API — no new secrets. Created
// once at module load; null if creds are absent so /health degrades instead of
// crashing the process.
const healthDb = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null

const app = express()
const PORT = process.env.PORT || 4000

// Behind Railway/Render/Cloudflare — trust the first proxy hop so req.ip is the
// real client IP (used by the public widget rate limiter) and not spoofable via
// a forged X-Forwarded-For.
app.set('trust proxy', 1)

app.use(helmet())
const ALLOWED_ORIGINS = [
  'https://get-kind.com',
  'https://www.get-kind.com',
  'https://app.get-kind.com',
  'https://admin.get-kind.com',
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.PORTAL_URL ? [process.env.PORTAL_URL] : []),
  ...(process.env.EXTRA_ALLOWED_ORIGINS ? process.env.EXTRA_ALLOWED_ORIGINS.split(',') : []),
]
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    // Allow Vercel preview deployments for this project
    if (origin.endsWith('.vercel.app')) return callback(null, true)
    // Allow Railway deployments
    if (origin.endsWith('.railway.app') || origin.endsWith('.up.railway.app')) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))
app.use(morgan('dev'))
// #352 — the `/webhooks/paystack` raw-body mount was removed with the charge path it
// served. No route was ever registered behind it, so it parsed bodies for a handler that
// did not exist.
app.use('/webhooks/stripe',  express.raw({ type: 'application/json' }))
// Stripe webhook also lives at /stripe/webhook — must receive the raw body
// before express.json() parses it, otherwise constructEvent() always fails.
app.use('/stripe/webhook',   express.raw({ type: 'application/json' }))
// Resend inbound-reply webhook is signed (Svix) over the raw bytes — must receive
// the raw body before express.json() so the signature can be verified.
app.use('/figsy/replies/inbound', express.raw({ type: 'application/json' }))
// Operator CSV import carries a whole file in the body. express.json() defaults to 100kb —
// about 300 rows of an Apollo export — so without this a 1,000-row upload is rejected with a
// bare 413 that reads like "the server broke", not "the file is too big". Mounted BEFORE the
// global parser so it wins; body-parser skips a request another parser already read. The real
// bound is MAX_IMPORT_ROWS, enforced in the route and stated on the screen — this is only the
// transport ceiling, set well above it so the row cap is the thing that ever speaks.
app.use('/operator/import-leads', express.json({ limit: '8mb' }))
app.use(express.json())

// Health probe for external uptime monitors (UptimeRobot/BetterStack).
// Checks: (a) DB — a fast HEAD count on a small table; (b) email — only that the
// Resend API key is CONFIGURED (never sends or hits a paid endpoint).
// ALWAYS returns 200 (this is the LIVENESS endpoint Railway uses for deploy
// health-checks — it must not 503 just because the DB is momentarily slow at
// boot, or deploys fail + roll back). DB/email state is reported in the BODY
// (`status: ok|degraded`, `checks.db`) so an external monitor can alert on it.
// Everything is wrapped + bounded by a 3s timeout so /health never hangs.
// ── #673 — WHICH BUILD IS THIS? ────────────────────────────────────────────────────────────
//
// `v` below is a HAND-TYPED STRING that has read '2026-06-22-health' since June. It says which
// version of this endpoint's *shape* was written, and nothing whatsoever about which code is
// running — a response from the live API was byte-identical whether it served June's build or
// this morning's.
//
// ⚠️ THAT COST A WRONG STATUS ONCE. On 20 Aug a website merge was reported as shipped while the
// live site still served Google Analytics dated the 14th; it was caught only because a STATIC
// site can be fetched and read. The API had no equivalent, so every API item flipped to 🩷
// after a merge was flipped on trust rather than on evidence.
//
// `RAILWAY_GIT_COMMIT_SHA` is injected by the platform and already logged at boot (see the
// listen callback) and already registered in `startup-check.ts` as *"Deploy identity, used in
// health/diagnostics"* — **a description that was not yet true.** This makes it true:
//
//     curl -s https://<api>/health | jq -r .commit
//     git rev-parse --short origin/main
//
// Same value = the deploy carries that commit. Different = it does not, whatever anyone said.
//
// ⚠️ 'unknown' IS NOT 'verified'. Off-platform (local, CI) the variable is absent and this
// reports `unknown` rather than inventing a value — a build that cannot name itself must not
// read as one that matched.
app.get('/health', async (_req, res) => {
  const v = '2026-06-22-health'
  const commit = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown'
  const email = process.env.RESEND_API_KEY ? 'configured' as const : 'missing' as const
  let db: 'ok' | 'fail' = 'fail'

  try {
    if (!healthDb) throw new Error('supabase creds not configured')
    // Cheap, read-only probe: HEAD count, no rows returned. Bounded by a 3s race
    // so a slow/hung DB connection can never stall the health check.
    const probe = healthDb.from('clients').select('*', { count: 'exact', head: true })
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('db check timed out')), 3000))
    const { error } = await Promise.race([probe, timeout]) as { error: unknown }
    if (error) throw error
    db = 'ok'
  } catch (err) {
    db = 'fail'
    console.error('[health] db check failed:', err instanceof Error ? err.message : err)
  }

  // Liveness: always 200 so the Railway deploy health-check passes. Readiness
  // (is the DB up?) is in the body — monitors alert on `status:"degraded"` / `checks.db:"fail"`.
  res.status(200).json({
    status: db === 'ok' ? 'ok' : 'degraded',
    service: 'kind-api',
    v,
    // The deployed commit — the only field here that changes when the code does.
    commit,
    checks: { db, email },
    ts: new Date().toISOString(),
  })
})
app.get('/features', (_req, res) => {
  res.json({
    campaign_intent: process.env.FEATURE_CAMPAIGN_INTENT === 'true',
    icp_builder: process.env.FEATURE_ICP_BUILDER === 'true',
  })
})
app.use('/auth',          authRouter)
app.use('/clients',       clientRouter)
app.use('/subscriptions', subscriptionRouter)
app.use('/leads',         leadRouter)
app.use('/icps',          icpRouter)
app.use('/credits',       creditRouter)
app.use('/admin',         adminRouter)
app.use('/figsy',         figsyRouter)
app.use('/internal',      internalRouter)
app.use('/support',       supportRouter)
app.use('/founder',       founderRouter)
app.use('/partners',      partnersRouter)
app.use('/voice',         voiceRouter)
app.use('/whatsapp',      whatsappRouter)
app.use('/calendar',      calendarRouter)
app.use('/milla',         millaRouter)
app.use('/vida',          vidaRouter)
app.use('/operator',      operatorRouter)
// BUILD-002 — the programme money engine. Admin-key gated, same as /operator.
app.use('/programmes',    programmeRouter)
app.use('/forms',         formsRouter)
app.use('/company',       companyRouter)
app.use('/denise',        deniseRouter)
app.use('/casey',         caseyRouter)
app.use('/stripe',        stripeRouter)
app.use('/order-forms',   orderFormRouter)
app.use('/stats',         statsRouter)
app.use('/internal/briefs', internalBriefsRouter)
app.use('/api', demoRequestRouter)
app.use('/api', subscribeRouter)
app.use('/internal/status', statusRouter)
app.use('/share',         shareRouter)
app.use('/team',          teamRouter)
app.use('/mcp',           mcpRouter)
app.use('/developer',     developerRouter)
app.use('/proposals',     proposalsRouter)
app.use('/track',         trackingRouter)
app.use('/signals',       signalsRouter)
app.use('/figsy-tasks',   figsyTasksRouter)
app.use('/lookalike',     lookalikeRouter)
app.use('/api/linkedin', linkedinRouter)
app.use('/integrations', integrationsRouter)
app.use('/engine',        engineRouter)
app.use('/onboarding',    onboardingRouter)
app.use('/money-path',    moneyPathRouter)
app.use('/outreach',      outreachRouter)

// MCP discovery endpoint for Claude Desktop / Cursor
app.get('/.well-known/mcp.json', (_req, res) => {
  res.json({
    name: 'KIND AI',
    description: 'KIND AI agents — FIGSY (AI SDR) and Milla (Business AI) as MCP tools',
    tools_url: `${process.env.API_URL ?? 'https://kindapi-production-e64c.up.railway.app'}/mcp/tools`,
    call_url:  `${process.env.API_URL ?? 'https://kindapi-production-e64c.up.railway.app'}/mcp/call`,
  })
})

app.use(errorHandler)

// ── Process-level safety net ──────────────────────────────────────────────
// A single unhandled error in one route must NOT take down the whole API and
// every client's dashboard with it. Log it loudly and keep serving everyone
// else. (Railway still restarts the container on a genuine fatal crash.)
// #290 — these now RECORD + ALERT, not just log. A 500 on a route emailed the founder while
// a rejected promise taking out a cron did not: the crash-class errors were the only ones
// that stayed invisible.
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] API kept alive — investigate:', err)
  try { captureProcessError('uncaughtException', err) } catch { /* never let capture crash the process */ }
})
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] API kept alive — investigate:', reason)
  try { captureProcessError('unhandledRejection', reason) } catch { /* never let capture crash the process */ }
})

app.listen(PORT, () => {
  console.log(`KIND API running on port ${PORT}`)
  // Build marker for deploy verification — dynamic (Railway's commit SHA), so it can
  // never go stale. If this shows an old SHA in the logs, a stale build is live.
  console.log(`KIND API build: ${process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev'}`)
  startCrons()
})
