interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string | null
  job_title: string | null
  company: string | null
  linkedin_url: string | null
  country: string | null
  phone: string | null
  score: number | null
}

export async function pushToHubSpot(apiKey: string, lead: Lead): Promise<{ success: boolean; contact_id?: string; error?: string }> {
  try {
    const body = {
      properties: {
        firstname:    lead.first_name,
        lastname:     lead.last_name,
        email:        lead.email ?? undefined,
        jobtitle:     lead.job_title ?? undefined,
        company:      lead.company ?? undefined,
        linkedinbio:  lead.linkedin_url ?? undefined,
        country:      lead.country ?? undefined,
        phone:        lead.phone ?? undefined,
        kind_score:   lead.score ?? undefined,
      },
    }

    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (res.status === 409) {
      const existing = await res.json() as any
      return { success: true, contact_id: existing?.message?.match(/ID: (\d+)/)?.[1] }
    }

    if (!res.ok) {
      const err = await res.json() as any
      return { success: false, error: err?.message ?? `HubSpot error ${res.status}` }
    }

    const data = await res.json() as any
    return { success: true, contact_id: data.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'HubSpot push failed' }
  }
}

export async function pushToPipedrive(apiKey: string, lead: Lead): Promise<{ success: boolean; contact_id?: string; error?: string }> {
  try {
    // First create or find a person
    const personBody = {
      name:   `${lead.first_name} ${lead.last_name}`.trim(),
      email:  lead.email ? [{ value: lead.email, primary: true }] : undefined,
      phone:  lead.phone ? [{ value: lead.phone, primary: true }] : undefined,
      org_name: lead.company ?? undefined,
      job_title: lead.job_title ?? undefined,
    }

    const res = await fetch(`https://api.pipedrive.com/v1/persons?api_token=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(personBody),
    })

    if (!res.ok) {
      const err = await res.json() as any
      return { success: false, error: err?.error ?? `Pipedrive error ${res.status}` }
    }

    const data = await res.json() as any
    return { success: true, contact_id: String(data.data?.id) }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Pipedrive push failed' }
  }
}

export async function pushToCrm(
  crmType: string,
  apiKey: string,
  lead: Lead,
): Promise<{ success: boolean; contact_id?: string; error?: string }> {
  if (crmType === 'hubspot')   return pushToHubSpot(apiKey, lead)
  if (crmType === 'pipedrive') return pushToPipedrive(apiKey, lead)
  return { success: false, error: `Unknown CRM type: ${crmType}` }
}

interface DealData {
  lead_name:     string
  company:       string | null
  reply_snippet: string
}

export async function pushDealToHubSpot(
  apiKey:    string,
  contactId: string | undefined,
  deal:      DealData,
): Promise<{ success: boolean; deal_id?: string; error?: string }> {
  try {
    const closeDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

    const body = {
      properties: {
        dealname:    `FIGSY Interest — ${deal.lead_name}${deal.company ? ` @ ${deal.company}` : ''}`,
        dealstage:   'appointmentscheduled',
        pipeline:    'default',
        closedate:   closeDate,
        description: deal.reply_snippet.slice(0, 500),
      },
    }

    const res = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body:    JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json() as any
      return { success: false, error: err?.message ?? `HubSpot deal error ${res.status}` }
    }

    const data = await res.json() as any
    const dealId = data.id as string

    // Associate deal with contact if we have a contact ID
    if (contactId) {
      await fetch(
        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/3`,
        { method: 'PUT', headers: { Authorization: `Bearer ${apiKey}` } },
      ).catch(() => {})
    }

    return { success: true, deal_id: dealId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'HubSpot deal push failed' }
  }
}

export async function pushDealToPipedrive(
  apiKey:   string,
  personId: string | undefined,
  deal:     DealData,
): Promise<{ success: boolean; deal_id?: string; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      title: `FIGSY Interest — ${deal.lead_name}${deal.company ? ` @ ${deal.company}` : ''}`,
    }
    if (personId) body.person_id = Number(personId)

    const res = await fetch(`https://api.pipedrive.com/v1/deals?api_token=${apiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json() as any
      return { success: false, error: err?.error ?? `Pipedrive deal error ${res.status}` }
    }

    const data = await res.json() as any
    return { success: true, deal_id: String(data.data?.id) }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Pipedrive deal push failed' }
  }
}

export async function pushDealToCrm(
  crmType: string,
  apiKey:  string,
  lead:    Lead,
  deal:    DealData,
): Promise<{ success: boolean; deal_id?: string; contact_id?: string; error?: string }> {
  const contactResult = await pushToCrm(crmType, apiKey, lead)
  const contactId = contactResult.contact_id

  if (crmType === 'hubspot') {
    const dealResult = await pushDealToHubSpot(apiKey, contactId, deal)
    return { ...dealResult, contact_id: contactId }
  }
  if (crmType === 'pipedrive') {
    const dealResult = await pushDealToPipedrive(apiKey, contactId, deal)
    return { ...dealResult, contact_id: contactId }
  }
  return { success: false, error: `Unknown CRM type: ${crmType}` }
}

export async function testCrmConnection(crmType: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (crmType === 'hubspot') {
      const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!res.ok) return { success: false, error: 'Invalid HubSpot API key or missing CRM scope' }
      return { success: true }
    }

    if (crmType === 'pipedrive') {
      const res = await fetch(`https://api.pipedrive.com/v1/persons?limit=1&api_token=${apiKey}`)
      if (!res.ok) return { success: false, error: 'Invalid Pipedrive API key' }
      return { success: true }
    }

    return { success: false, error: 'Unknown CRM type' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Connection test failed' }
  }
}
