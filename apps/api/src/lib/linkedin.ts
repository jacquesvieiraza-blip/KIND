import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { isSuppressed } from './suppression'

const anthropic = new Anthropic()

export async function generateLinkedInNote(lead: {
  first_name: string
  last_name: string
  job_title: string
  company: string
  industry?: string | null
}, icpContext: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Write a LinkedIn connection request note (max 280 chars) from an AI sales platform called KIND to ${lead.first_name} ${lead.last_name}, ${lead.job_title} at ${lead.company}. Context: ${icpContext}. Be specific, human, no buzzwords, no "I came across your profile". End with a soft hook. Return only the note text.`
    }]
  })
  return (msg.content[0] as { type: string; text: string }).text.trim().slice(0, 280)
}

export async function enqueueLinkedInStep(params: {
  clientId: string
  campaignId: string | null
  leadId: string
  linkedinUrl: string
  connectionNote: string
}): Promise<string> {
  const { data, error } = await db
    .from('figsy_linkedin_queue')
    .insert({
      client_id: params.clientId,
      campaign_id: params.campaignId,
      lead_id: params.leadId,
      linkedin_url: params.linkedinUrl,
      connection_note: params.connectionNote,
      status: 'pending'
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function dispatchLinkedInStep(queueId: string): Promise<{ sent: boolean; method: 'phantombuster' | 'manual' }> {
  const pbKey = process.env.PHANTOMBUSTER_API_KEY
  if (!pbKey) {
    return { sent: false, method: 'manual' }
  }

  const { data: step } = await db
    .from('figsy_linkedin_queue')
    .select('linkedin_url, connection_note, lead_id')
    .eq('id', queueId)
    .single()

  if (!step) return { sent: false, method: 'manual' }

  // DO-NOT-CONTACT: final hard gate before any LinkedIn touch — never message
  // anyone connected to the founder's employer.
  const { data: liLead } = await db.from('leads')
    .select('email, company, linkedin_url').eq('id', step.lead_id).maybeSingle()
  if (liLead && isSuppressed({ email: liLead.email, company: liLead.company, linkedin: liLead.linkedin_url || step.linkedin_url })) {
    console.warn(`[linkedin] dispatch blocked — lead ${step.lead_id} is on the do-not-contact list`)
    await db.from('figsy_linkedin_queue').update({ status: 'failed' }).eq('id', queueId)
    return { sent: false, method: 'manual' }
  }

  // PhantomBuster: trigger LinkedIn Connection Request phantom
  const pbRes = await fetch('https://api.phantombuster.com/api/v2/agents/launch', {
    method: 'POST',
    headers: { 'X-Phantombuster-Key': pbKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: process.env.PHANTOMBUSTER_LINKEDIN_AGENT_ID,
      argument: JSON.stringify({
        profileUrls: [step.linkedin_url],
        message: step.connection_note,
        numberOfProfilesToProcess: 1
      })
    })
  })

  if (!pbRes.ok) return { sent: false, method: 'phantombuster' }

  const pbData = await pbRes.json() as { containerId?: string }
  await db.from('figsy_linkedin_queue').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    phantombuster_launch_id: pbData.containerId ?? null
  }).eq('id', queueId)

  return { sent: true, method: 'phantombuster' }
}
