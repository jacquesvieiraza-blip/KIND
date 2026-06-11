// Mount in index.ts: app.use('/integrations', integrationsRouter)
// GET /integrations/status — Auth required.
// Returns connected status for each integration tile shown in the Integrations Hub (#84).

import { Router } from 'express'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const integrationsRouter = Router()

type IntegrationId =
  | 'hubspot'
  | 'pipedrive'
  | 'google_calendar'
  | 'outlook_zoho'
  | 'whatsapp'
  | 'linkedin'
  | 'apollo'
  | 'stripe'

interface Integration {
  id: IntegrationId
  name: string
  category: 'CRM' | 'Calendar' | 'Channel' | 'Data' | 'Billing'
  description: string
  connected: boolean
}

// GET /integrations/status
integrationsRouter.get('/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Fetch the client row — we need CRM type/key, calendar status, and
    // any stripe subscription to determine connected states.
    const { data: client, error: clientErr } = await db
      .from('clients')
      .select('id, crm_type, crm_sync_enabled, calendar_booking_enabled')
      .eq('user_id', req.userId!)
      .single()

    if (clientErr || !client) {
      res.status(404).json({ success: false, error: 'Client not found' })
      return
    }

    // Check for an active Stripe subscription
    const { data: stripeSub } = await db
      .from('subscriptions')
      .select('id, stripe_subscription_id, status')
      .eq('client_id', client.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    // Apollo: connected if the platform has an APOLLO_API_KEY env set (system-wide)
    const apolloConnected = !!process.env.APOLLO_API_KEY

    // HubSpot: connected if the client's CRM type is hubspot and sync is enabled
    const hubspotConnected =
      client.crm_type === 'hubspot' && !!client.crm_sync_enabled

    // Google Calendar: connected if calendar_booking_enabled is true
    const googleCalendarConnected = !!client.calendar_booking_enabled

    // Stripe: connected if there's an active/trialing subscription
    const stripeConnected =
      !!stripeSub && !!stripeSub.stripe_subscription_id

    const integrations: Integration[] = [
      {
        id: 'hubspot',
        name: 'HubSpot',
        category: 'CRM',
        description: 'Sync leads and deals bidirectionally with HubSpot CRM.',
        connected: hubspotConnected,
      },
      {
        id: 'pipedrive',
        name: 'Pipedrive',
        category: 'CRM',
        description: 'Push qualified leads and pipeline updates to Pipedrive.',
        connected: client.crm_type === 'pipedrive' && !!client.crm_sync_enabled,
      },
      {
        id: 'google_calendar',
        name: 'Google Calendar',
        category: 'Calendar',
        description: 'Book meetings directly from FIGSY replies into your calendar.',
        connected: googleCalendarConnected,
      },
      {
        id: 'outlook_zoho',
        name: 'Outlook / Zoho',
        category: 'Calendar',
        description: 'Connect Outlook or Zoho Calendar for rep-level scheduling.',
        connected: false,
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp',
        category: 'Channel',
        description: 'Reach prospects on WhatsApp via FIGSY outreach sequences.',
        connected: false,
      },
      {
        id: 'linkedin',
        name: 'LinkedIn',
        category: 'Channel',
        description: 'Import leads and run LinkedIn outreach campaigns.',
        connected: false,
      },
      {
        id: 'apollo',
        name: 'Apollo',
        category: 'Data',
        description: 'Enrich leads and find new prospects from Apollo\'s 275M+ contact database.',
        connected: apolloConnected,
      },
      {
        id: 'stripe',
        name: 'Stripe',
        category: 'Billing',
        description: 'Manage your KIND subscription and billing via Stripe.',
        connected: stripeConnected,
      },
    ]

    res.json({ success: true, integrations })
  } catch (err) {
    console.error('[integrations/status]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch integrations status' })
  }
})
