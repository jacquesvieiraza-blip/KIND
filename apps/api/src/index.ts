import 'dotenv/config'
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
import { stripeRouter } from './routes/stripe'
import { startCrons } from './cron'

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet())
const ALLOWED_ORIGINS = [
  'https://app.get-kind.com',
  'https://admin.get-kind.com',
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.PORTAL_URL ? [process.env.PORTAL_URL] : []),
]
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))
app.use(morgan('dev'))
app.use('/webhooks/paystack', express.raw({ type: 'application/json' }))
app.use('/webhooks/stripe',  express.raw({ type: 'application/json' }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'kind-api' }))
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
app.use('/stripe',        stripeRouter)
app.use('/webhooks/stripe', stripeRouter)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`KIND API running on port ${PORT}`)
  startCrons()
})
