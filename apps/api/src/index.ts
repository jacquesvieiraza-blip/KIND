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
import { paystackRouter } from './routes/paystack'
import { leadRouter } from './routes/leads'
import { icpRouter } from './routes/icps'
import { creditRouter } from './routes/credits'
import { errorHandler } from './middleware/error'
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
import { formsRouter } from './routes/forms'
import { deniseRouter } from './routes/denise'
import { stripeRouter } from './routes/stripe'
import { flutterwaveRouter } from './routes/flutterwave'
import { orderFormRouter } from './routes/order-forms'
import { statsRouter } from './routes/stats'
import { internalBriefsRouter } from './routes/internal-briefs'
import founderBriefRouter from './routes/founder-brief'
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
import { startCrons } from './cron'

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
app.use('/webhooks/paystack', express.raw({ type: 'application/json' }))
app.use('/webhooks/stripe',  express.raw({ type: 'application/json' }))
// Stripe webhook also lives at /stripe/webhook — must receive the raw body
// before express.json() parses it, otherwise constructEvent() always fails.
app.use('/stripe/webhook',   express.raw({ type: 'application/json' }))
// Resend inbound-reply webhook is signed (Svix) over the raw bytes — must receive
// the raw body before express.json() so the signature can be verified.
app.use('/figsy/replies/inbound', express.raw({ type: 'application/json' }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'kind-api', v: '2026-05-18-b' }))
app.get('/features', (_req, res) => {
  res.json({
    campaign_intent: process.env.FEATURE_CAMPAIGN_INTENT === 'true',
    icp_builder: process.env.FEATURE_ICP_BUILDER === 'true',
  })
})
app.use('/auth',          authRouter)
app.use('/clients',       clientRouter)
app.use('/subscriptions', subscriptionRouter)
app.use('/webhooks/paystack', paystackRouter)
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
app.use('/forms',         formsRouter)
app.use('/denise',        deniseRouter)
app.use('/stripe',        stripeRouter)
app.use('/flutterwave',   flutterwaveRouter)
app.use('/order-forms',   orderFormRouter)
app.use('/stats',         statsRouter)
app.use('/internal/briefs', internalBriefsRouter)
app.use('/internal', founderBriefRouter)
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
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] API kept alive — investigate:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] API kept alive — investigate:', reason)
})

app.listen(PORT, () => {
  console.log(`KIND API running on port ${PORT}`)
  // Build marker for deploy verification — dynamic (Railway's commit SHA), so it can
  // never go stale. If this shows an old SHA in the logs, a stale build is live.
  console.log(`KIND API build: ${process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev'}`)
  startCrons()
})
