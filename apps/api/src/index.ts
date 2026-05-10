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
import { roadmapRouter } from './routes/roadmap'
import { icpRouter } from './routes/icps'
import { consentRouter } from './routes/consent'
import { documentRouter } from './routes/documents'
import { platformMessageRouter } from './routes/platform-messages'
import { adminApiRouter } from './routes/admin-api'
import { errorHandler } from './middleware/error'

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet())
const allowedOrigins = (process.env.PORTAL_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server (no origin) and all configured origins
    if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) return cb(null, true)
    cb(new Error('CORS: origin not allowed'))
  },
  credentials: true,
}))
app.use(morgan('dev'))

// Raw body needed for Paystack webhook signature verification
app.use('/webhooks/paystack', express.raw({ type: 'application/json' }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'kind-api' }))

app.use('/auth', authRouter)
app.use('/clients', clientRouter)
app.use('/subscriptions', subscriptionRouter)
app.use('/webhooks/paystack', paystackRouter)
app.use('/leads', leadRouter)
app.use('/roadmap', roadmapRouter)
app.use('/icps', icpRouter)
app.use('/consent', consentRouter)
app.use('/documents', documentRouter)
app.use('/platform-messages', platformMessageRouter)
app.use('/admin-api', adminApiRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`KIND API running on port ${PORT}`)
})
