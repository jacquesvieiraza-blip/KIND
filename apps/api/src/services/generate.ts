import { randomUUID } from 'crypto'
import { db } from '@kind/db'
import { searchApollo } from './apollo'
import { scoreLead, scoreLeadsInBatches } from './scoring'
import { sendConsentEmail } from './consent-email'

const TIER_LIMITS: Record<string, number> = {
  enterprise: 100,
  pro: 40,
  starter: 20,
}

function tierLimit(tier: string | null): number {
  return TIER_LIMITS[tier ?? 'starter'] ?? 20
}

export async function runLeadGeneration(
  jobId: string,
  clientId: string,
  icpId: string
): Promise<void> {
  try {
    const [{ data: icp }, { data: client }, { data: sub }] = await Promise.all([
      db.from('icps').select('*').eq('id', icpId).eq('client_id', clientId).single(),
      db.from('clients').select('company_name').eq('id', clientId).single(),
      db
        .from('subscriptions')
        .select('tier')
        .eq('client_id', clientId)
        .eq('product', 'lead_gen')
        .in('status', ['trialing', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (!icp) throw new Error('ICP not found')

    const clientName = client?.company_name ?? 'Our Client'
    const perPage = tierLimit(sub?.tier ?? null)

    // ── 1. Apollo search ──────────────────────────────────────────────────────
    const contacts = await searchApollo(
      {
        job_titles: icp.job_titles,
        industries: icp.industries,
        locations: icp.locations,
        company_sizes: icp.company_sizes,
        keywords: icp.keywords,
      },
      perPage
    )

    const withEmail = contacts.filter((c) => c.email)
    await db.from('lead_generation_jobs').update({ total_found: withEmail.length }).eq('id', jobId)

    if (withEmail.length === 0) {
      await db.from('lead_generation_jobs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', jobId)
      return
    }

    // ── 2. Create lead records ────────────────────────────────────────────────
    const insertResults = await Promise.allSettled(
      withEmail.map(async (contact) => {
        // Skip if this email already exists for this client
        const { data: existing } = await db
          .from('leads')
          .select('id')
          .eq('client_id', clientId)
          .eq('email', contact.email!)
          .maybeSingle()

        if (existing) return null

        const { data } = await db
          .from('leads')
          .insert({
            client_id: clientId,
            icp_id: icpId,
            source_job_id: jobId,
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email,
            job_title: contact.title,
            company: contact.organization?.name ?? null,
            linkedin_url: contact.linkedin_url,
            country: contact.country,
            status: 'pending',
            consent_token: randomUUID(),
          })
          .select()
          .single()

        return data
      })
    )

    const createdLeads = insertResults
      .filter((r) => r.status === 'fulfilled' && r.value !== null)
      .map((r) => (r as PromiseFulfilledResult<unknown>).value as {
        id: string
        first_name: string
        last_name: string
        job_title: string | null
        company: string | null
        country: string | null
        email: string | null
        consent_token: string | null
      })

    // ── 3. Score leads ────────────────────────────────────────────────────────
    let scored = 0
    await scoreLeadsInBatches(createdLeads, async (lead) => {
      try {
        const result = await scoreLead(
          {
            first_name: lead.first_name,
            last_name: lead.last_name,
            job_title: lead.job_title,
            company: lead.company,
            country: lead.country,
          },
          icp
        )
        await db.from('leads').update({
          score: result.score,
          score_reasoning: result.reasoning,
          status: 'scored',
        }).eq('id', lead.id)
        scored++
      } catch (err) {
        console.error(`Scoring failed for lead ${lead.id}:`, err)
      }
    })

    await db.from('lead_generation_jobs').update({ total_scored: scored }).eq('id', jobId)

    // ── 4. Send POPIA consent emails (score >= 40 only) ───────────────────────
    const { data: scoredLeads } = await db
      .from('leads')
      .select('id, email, first_name, consent_token')
      .eq('source_job_id', jobId)
      .eq('status', 'scored')
      .gte('score', 40)
      .not('email', 'is', null)
      .not('consent_token', 'is', null)

    const apiBaseUrl =
      process.env.API_BASE_URL || 'https://kindapi-production.up.railway.app'

    let consentSent = 0
    for (const lead of scoredLeads ?? []) {
      try {
        await sendConsentEmail({
          to: lead.email!,
          leadFirstName: lead.first_name,
          clientName,
          token: lead.consent_token!,
          apiBaseUrl,
        })
        await db.from('leads').update({
          status: 'consent_sent',
          consent_sent_at: new Date().toISOString(),
        }).eq('id', lead.id)
        await db.from('consent_log').insert({
          lead_id: lead.id,
          client_id: clientId,
          event: 'sent',
          channel: 'email',
        })
        consentSent++
        // 500 ms between emails to avoid spam flags
        await new Promise((r) => setTimeout(r, 500))
      } catch (err) {
        console.error(`Consent email failed for lead ${lead.id}:`, err)
      }
    }

    await db.from('lead_generation_jobs').update({
      status: 'completed',
      total_consent_sent: consentSent,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Lead generation job failed:', err)
    await db.from('lead_generation_jobs').update({
      status: 'failed',
      error_message: msg,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)
  }
}
