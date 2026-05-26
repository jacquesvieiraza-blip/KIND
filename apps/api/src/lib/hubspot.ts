/**
 * HubSpot CRM sync library — KIND platform integration
 *
 * All functions are no-ops if HUBSPOT_API_KEY is not set.
 * Uses HubSpot v3 API (https://api.hubapi.com)
 * Auth: Bearer token via HUBSPOT_API_KEY env var
 */

const BASE = 'https://api.hubapi.com'

function apiKey(): string | null {
  return process.env.HUBSPOT_API_KEY ?? null
}

function headers(key: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  }
}

async function hubspotFetch(
  key: string,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: headers(key),
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  let data: unknown = null
  try { data = await res.json() } catch { /* non-JSON body */ }
  return { ok: res.ok || res.status === 409, status: res.status, data }
}

// ── UPSERT CONTACT ─────────────────────────────────────────────────────────────

async function upsertContact(
  key: string,
  email: string,
  props: Record<string, string | undefined>,
): Promise<string | null> {
  // Use search to find existing contact by email, then create or update
  const searchRes = await hubspotFetch(key, '/crm/v3/objects/contacts/search', {
    method: 'POST',
    body: {
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
      properties: ['email'],
      limit: 1,
    },
  })

  const searchData = searchRes.data as { results?: { id: string }[] } | null
  const existing = searchData?.results?.[0]

  const body = { properties: { email, ...props } }

  if (existing) {
    // Update
    await hubspotFetch(key, `/crm/v3/objects/contacts/${existing.id}`, {
      method: 'PATCH',
      body,
    })
    return existing.id
  }

  // Create
  const createRes = await hubspotFetch(key, '/crm/v3/objects/contacts', {
    method: 'POST',
    body,
  })

  if (createRes.status === 409) {
    // Contact already exists — extract id from error message
    const errData = createRes.data as { message?: string } | null
    const match = errData?.message?.match(/ID: (\d+)/)
    return match?.[1] ?? null
  }

  if (!createRes.ok) return null
  return (createRes.data as { id?: string })?.id ?? null
}

// ── UPSERT COMPANY ─────────────────────────────────────────────────────────────

async function upsertCompany(
  key: string,
  name: string,
  props: Record<string, string | undefined> = {},
): Promise<string | null> {
  const searchRes = await hubspotFetch(key, '/crm/v3/objects/companies/search', {
    method: 'POST',
    body: {
      filterGroups: [{ filters: [{ propertyName: 'name', operator: 'EQ', value: name }] }],
      properties: ['name'],
      limit: 1,
    },
  })

  const searchData = searchRes.data as { results?: { id: string }[] } | null
  const existing = searchData?.results?.[0]

  const body = { properties: { name, ...props } }

  if (existing) {
    await hubspotFetch(key, `/crm/v3/objects/companies/${existing.id}`, {
      method: 'PATCH',
      body,
    })
    return existing.id
  }

  const createRes = await hubspotFetch(key, '/crm/v3/objects/companies', {
    method: 'POST',
    body,
  })

  if (!createRes.ok) return null
  return (createRes.data as { id?: string })?.id ?? null
}

// ── ASSOCIATE CONTACT TO COMPANY ───────────────────────────────────────────────

async function associateContactToCompany(
  key: string,
  contactId: string,
  companyId: string,
): Promise<void> {
  await hubspotFetch(key, `/crm/v3/objects/contacts/${contactId}/associations/companies/${companyId}/contact_to_company`, {
    method: 'PUT',
  })
}

// ── ADD NOTE ───────────────────────────────────────────────────────────────────

async function addNoteToContact(
  key: string,
  contactId: string,
  noteBody: string,
): Promise<void> {
  // Create note (engagement)
  const noteRes = await hubspotFetch(key, '/crm/v3/objects/notes', {
    method: 'POST',
    body: {
      properties: {
        hs_note_body: noteBody,
        hs_timestamp: new Date().toISOString(),
      },
    },
  })

  const noteData = noteRes.data as { id?: string } | null
  const noteId = noteData?.id
  if (!noteId) return

  // Associate note to contact
  await hubspotFetch(key, `/crm/v3/objects/notes/${noteId}/associations/contacts/${contactId}/note_to_contact`, {
    method: 'PUT',
  })
}

// ── PUBLIC FUNCTIONS ───────────────────────────────────────────────────────────

/**
 * Creates or updates a HubSpot Contact and Company for a KIND client, then
 * associates them. Returns { contactId, companyId } or null if HUBSPOT_API_KEY
 * is absent or if a fatal error occurs.
 */
export async function syncClientToHubspot(client: {
  id: string
  email: string
  company_name: string
  plan?: string
  created_at?: string
}): Promise<{ contactId: string; companyId: string } | null> {
  const key = apiKey()
  if (!key) return null

  try {
    const contactId = await upsertContact(key, client.email, {
      company:          client.company_name,
      lifecyclestage:   'customer',
      hs_lead_status:   'IN_PROGRESS',
    })
    if (!contactId) return null

    const companyId = await upsertCompany(key, client.company_name)
    if (!companyId) return null

    await associateContactToCompany(key, contactId, companyId)

    return { contactId, companyId }
  } catch (err) {
    console.error('[hubspot] syncClientToHubspot error:', err)
    return null
  }
}

/**
 * Syncs a new signup to HubSpot: creates/updates contact + company, then
 * creates a Deal in the default pipeline at the first stage. Returns dealId or null.
 */
export async function syncNewSignupToHubspot(client: {
  id: string
  email: string
  company_name: string
  plan?: string
  created_at?: string
}): Promise<string | null> {
  const key = apiKey()
  if (!key) return null

  try {
    const synced = await syncClientToHubspot(client)
    if (!synced) return null

    const closeDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

    const dealRes = await hubspotFetch(key, '/crm/v3/objects/deals', {
      method: 'POST',
      body: {
        properties: {
          dealname:  `${client.company_name} — KIND AI`,
          pipeline:  'default',
          dealstage: 'appointmentscheduled',
          amount:    '0',
          closedate: closeDate,
        },
      },
    })

    if (!dealRes.ok) return null
    const dealId = (dealRes.data as { id?: string })?.id
    if (!dealId) return null

    // Associate deal with contact
    await hubspotFetch(
      key,
      `/crm/v3/objects/deals/${dealId}/associations/contacts/${synced.contactId}/deal_to_contact`,
      { method: 'PUT' },
    )

    // Associate deal with company
    await hubspotFetch(
      key,
      `/crm/v3/objects/deals/${dealId}/associations/companies/${synced.companyId}/deal_to_company`,
      { method: 'PUT' },
    )

    return dealId
  } catch (err) {
    console.error('[hubspot] syncNewSignupToHubspot error:', err)
    return null
  }
}

/**
 * Updates the HubSpot deal for a client to 'closedwon' and adds a payment note.
 * Looks up the contact by client email (reads client record from db). No-op if
 * HUBSPOT_API_KEY is absent.
 */
export async function syncPaymentToHubspot(
  clientId: string,
  amountZar: number,
  plan: string,
): Promise<void> {
  const key = apiKey()
  if (!key) return

  try {
    // Look up client email from db
    const { db } = await import('@kind/db')
    const { data: client } = await db.from('clients')
      .select('company_name, user_id')
      .eq('id', clientId)
      .single()

    if (!client?.user_id) return

    const { data: { user } } = await db.auth.admin.getUserById(client.user_id)
    const email = user?.email
    if (!email) return

    // Find the contact in HubSpot
    const searchRes = await hubspotFetch(key, '/crm/v3/objects/contacts/search', {
      method: 'POST',
      body: {
        filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
        properties: ['email', 'associatedcompanyid'],
        limit: 1,
      },
    })

    const searchData = searchRes.data as { results?: { id: string }[] } | null
    const contact = searchData?.results?.[0]
    if (!contact) return

    // Find associated deals
    const dealsRes = await hubspotFetch(
      key,
      `/crm/v3/objects/contacts/${contact.id}/associations/deals`,
    )

    const dealsData = dealsRes.data as { results?: { id: string }[] } | null
    const deals = dealsData?.results ?? []

    // Update most recent deal to closedwon
    if (deals.length > 0) {
      const dealId = deals[0].id
      await hubspotFetch(key, `/crm/v3/objects/deals/${dealId}`, {
        method: 'PATCH',
        body: {
          properties: {
            dealstage: 'closedwon',
            amount:    String(Math.round(amountZar / 19)), // convert ZAR to USD approx
          },
        },
      })

      // Add note to deal
      const noteRes = await hubspotFetch(key, '/crm/v3/objects/notes', {
        method: 'POST',
        body: {
          properties: {
            hs_note_body: `Payment received: R${amountZar} — ${plan}`,
            hs_timestamp: new Date().toISOString(),
          },
        },
      })
      const noteId = (noteRes.data as { id?: string })?.id
      if (noteId) {
        await hubspotFetch(
          key,
          `/crm/v3/objects/notes/${noteId}/associations/deals/${dealId}/note_to_deal`,
          { method: 'PUT' },
        )
      }
    }

    // Also add note to contact
    await addNoteToContact(key, contact.id, `Payment received: R${amountZar} — ${plan}`)
  } catch (err) {
    console.error('[hubspot] syncPaymentToHubspot error:', err)
  }
}

/**
 * Finds or creates a HubSpot Contact for a FIGSY interested lead (the prospect,
 * not the KIND client), and adds a note about the interested reply.
 * Returns contactId or null.
 */
export async function syncFigsyInterestedToHubspot(enrollment: {
  lead_email: string
  lead_name: string
  company: string
  client_id: string
  reply_snippet: string
}): Promise<string | null> {
  const key = apiKey()
  if (!key) return null

  try {
    const contactId = await upsertContact(key, enrollment.lead_email, {
      firstname:      enrollment.lead_name.split(' ')[0] || undefined,
      lastname:       enrollment.lead_name.split(' ').slice(1).join(' ') || undefined,
      company:        enrollment.company || undefined,
      lifecyclestage: 'lead',
      hs_lead_status: 'IN_PROGRESS',
    })

    if (!contactId) return null

    const snippet = enrollment.reply_snippet.slice(0, 300)
    await addNoteToContact(key, contactId, `Interested reply via FIGSY: ${snippet}`)

    return contactId
  } catch (err) {
    console.error('[hubspot] syncFigsyInterestedToHubspot error:', err)
    return null
  }
}

// ── PIPELINE VIEW ─────────────────────────────────────────────────────────────

interface PipelineStage {
  name: string
  count: number
  totalValue: number
}

interface PipelineView {
  stages: PipelineStage[]
}

/**
 * Fetches all deals from HubSpot grouped by stage.
 * Returns { stages } or null if HUBSPOT_API_KEY is absent.
 */
export async function getHubspotPipelineView(): Promise<PipelineView | null> {
  const key = apiKey()
  if (!key) return null

  try {
    // Fetch up to 200 deals with stage and amount
    const res = await hubspotFetch(key, '/crm/v3/objects/deals?limit=200&properties=dealstage,amount,dealname', {
      method: 'GET',
    })

    if (!res.ok) return null

    const data = res.data as { results?: { properties: { dealstage?: string; amount?: string } }[] } | null
    const deals = data?.results ?? []

    // Group by stage
    const stageMap = new Map<string, { count: number; totalValue: number }>()

    for (const deal of deals) {
      const stage = deal.properties.dealstage ?? 'unknown'
      const amount = parseFloat(deal.properties.amount ?? '0') || 0
      const existing = stageMap.get(stage) ?? { count: 0, totalValue: 0 }
      stageMap.set(stage, {
        count:      existing.count + 1,
        totalValue: existing.totalValue + amount,
      })
    }

    const stages: PipelineStage[] = Array.from(stageMap.entries()).map(([name, vals]) => ({
      name,
      count:      vals.count,
      totalValue: vals.totalValue,
    }))

    // Sort by a common pipeline order
    const ORDER = [
      'appointmentscheduled',
      'qualifiedtobuy',
      'presentationscheduled',
      'decisionmakerboughtin',
      'contractsent',
      'closedwon',
      'closedlost',
    ]
    stages.sort((a, b) => {
      const ai = ORDER.indexOf(a.name)
      const bi = ORDER.indexOf(b.name)
      if (ai === -1 && bi === -1) return a.name.localeCompare(b.name)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })

    return { stages }
  } catch (err) {
    console.error('[hubspot] getHubspotPipelineView error:', err)
    return null
  }
}
