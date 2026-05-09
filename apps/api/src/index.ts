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
import { errorHandler } from './middleware/error'

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet())
app.use(cors({ origin: process.env.PORTAL_URL || 'http://localhost:3000', credentials: true }))
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

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`KIND API running on port ${PORT}`)
})
