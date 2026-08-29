import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
// BUILD-003 item 6 — the one suppression gate every send path asks: DNC floor AND the
// global opt-out blocklist, which this path never read.
import { checkSendAllowed } from './send-gate'

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

  // ── SUPPRESSION: the final hard gate before any LinkedIn touch ────────────────────────
  //
  // ⛓️ THIS CHECKED ONLY HALF THE QUESTION (corrected 29 Aug, BUILD-003 item 6). It called
  // `isSuppressed` — the do-not-contact FLOOR, the founder's employer and its sister brands
  // — and never read `opt_out_blocklist`. Those answer different questions: the floor is
  // "we never contact these companies"; the blocklist is "this PERSON told us to stop".
  //
  // So someone who replied STOP to an email could still be sent a LinkedIn connection
  // request, on a channel where the approach is more personal, not less. The shared gate
  // asks both, and it is global: it does not matter which client is asking.
  const { data: liLead } = await db.from('leads')
    .select('email, company, linkedin_url, client_id').eq('id', step.lead_id).maybeSingle()

  // ══ THE PROGRAMME OUTREACH GATE (BUILD-003 PR2) ═══════════════════════════════════════
  //
  // ⚠️ LINKEDIN IS PROGRAMME DELIVERY, not a side channel. A connection request to a prospect
  // is a touch on the client's behalf, and a paused programme that keeps sending them is
  // exactly the "forgotten path" leak the pause is supposed to prevent — more visible, not
  // less, because the approach is personal.
  //
  // Read from the LEAD's client rather than a queue column, because `figsy_linkedin_queue`
  // does not carry one; the lead is the only place the tenant is recorded on this path.
  const liClientId = (liLead as { client_id?: string | null } | null)?.client_id ?? null
  if (liClientId) {
    const { checkProgrammeAuthority } = await import('./programme-authority')
    const prog = await checkProgrammeAuthority(liClientId, 'OUTREACH')
    if (!prog.allowed) {
      console.warn(`[linkedin] dispatch REFUSED — programme authority (${prog.reason}) for lead ${step.lead_id}`)
      // Left PENDING, not failed: a pause is temporary and a resumed programme must be able to
      // pick this step up. Marking it `failed` — as the suppression branch below correctly
      // does, because suppression is permanent — would discard the step for good.
      return { sent: false, method: 'manual' }
    }
  }

  const verdict = await checkSendAllowed({
    email:    liLead?.email ?? null,
    company:  liLead?.company ?? null,
    linkedin: liLead?.linkedin_url || step.linkedin_url,
  })
  if (!verdict.allowed) {
    console.warn(`[linkedin] dispatch blocked (${verdict.reason}) — lead ${step.lead_id}: ${verdict.message}`)
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
