/**
 * HubSpot CRM sync library — KIND platform integration
 *
 * All functions are no-ops if HUBSPOT_API_KEY is not set.
 * Uses HubSpot v3 API (https://api.hubapi.com)
 * Auth: Bearer token via HUBSPOT_API_KEY env var
 *
 * ── #397 — WHAT THIS FILE IS, AND WHAT WAS REMOVED FROM IT (1 Aug) ───────────────────────
 *
 * THE ITEM THAT SENT ME HERE WAS WRONG, AND WRONG IN THE EXPENSIVE DIRECTION. #397 read
 * "HubSpot dead code — platform signup/payment sync functions written but never called
 * (lib/hubspot.ts). Wire or delete." Two of the five exports are LIVE, and the cheap branch
 * of that instruction would have deleted code that runs when a prospect replies:
 *
 *   syncFigsyInterestedToHubspot  ← lib/reply-pipeline.ts:34, CALLED at :278. The reply spine.
 *   getHubspotPipelineView        ← routes/internal.ts:25, CALLED at :2581 (GET /hubspot/pipeline).
 *
 * The premise was corrected on the inventory row 1 Aug (#606) before any code was touched.
 *
 * THE THREE THAT REALLY WERE DEAD are gone, proved by reading every mention of each name
 * across every app and package source tree — each appeared only in its own definition and its
 * own error log, with no importer, no dynamic import and no call site anywhere:
 *
 *   syncNewSignupToHubspot   the platform SIGNUP sync — contact + company + a Deal at
 *                            'appointmentscheduled'. Never called from routes/auth.ts or
 *                            anywhere else; a signup has never reached HubSpot.
 *   syncPaymentToHubspot     the platform PAYMENT sync — moved a deal to 'closedwon' and
 *                            noted the amount. Never called from routes/stripe.ts. It also
 *                            carried a hardcoded `amountZar / 19` ZAR→USD conversion, which
 *                            is the same fossil #352 removed from the Paystack charge path.
 *   syncClientToHubspot      the contact+company upsert the other two shared. Its ONLY caller
 *                            was syncNewSignupToHubspot, so it died with it. Removing the
 *                            caller and leaving this would have created NEW dead code —
 *                            exactly the state #397 was filed about.
 *
 * Two private helpers went with them because nothing else used them: `upsertCompany` and
 * `associateContactToCompany`. `upsertContact` and `addNoteToContact` STAY — they are shared
 * with syncFigsyInterestedToHubspot, which is live.
 *
 * ⚠️ DO NOT CONFUSE THIS FILE WITH lib/crm.ts. This one is OUR platform HubSpot, authed with
 * our own HUBSPOT_API_KEY env var. `lib/crm.ts` pushes into A CLIENT'S OWN CRM using
 * `clients.crm_api_key` (HubSpot or Pipedrive, item #43) and is called from the same reply
 * pipeline a few lines earlier. They share a vendor name and nothing else.
 *
 * hubspot-live-exports.test.ts pins the two live exports to their importers, so the next
 * person reading "HubSpot dead code" cannot delete a reply-path dependency on a stale note.
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
