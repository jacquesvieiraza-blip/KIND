import { db } from '@kind/db'

// #511 NEXUS · Phase 0/1 — the per-client learning brain (compute + read).
//
// Learns on ONE client's own results only and NEVER reads another client's data — every query
// below is filtered by that client_id (the fence IS the product). Deterministic + bounded:
// no LLM, no per-lead calls — a nightly batch aggregate over the client's outcomes so the
// per-client compute cost stays far under the $4/lead margin. Honest about thin data: the
// `confidence` field says "learning" until there's enough signal to trust a pattern.

export interface NexusProfile {
  client_id: string
  reply_rate: number
  meeting_rate: number
  best_subjects: string[]
  winning_angle: string | null
  top_persona: { seniority?: string | null; industry?: string | null; job_title?: string | null }
  objections: { class: string; count: number }[]
  sample_worked: number
  sample_replies: number
  sample_meetings: number
  confidence: 'learning' | 'emerging' | 'confident'
  computed_at: string
}

const POSITIVE = new Set(['hot', 'interested', 'warm'])
function topOf(counts: Map<string, number>): string | null {
  let best: string | null = null, n = -1
  for (const [k, v] of counts) if (v > n) { best = k; n = v }
  return best
}

// Recompute one client's Nexus profile from its own outcomes and upsert it. Fenced by client_id.
export async function computeNexusProfile(clientId: string): Promise<NexusProfile> {
  // Worked = enrollments (the $3-held leads we actually ran). client_id-scoped.
  const [worked, replies, bookings, memory] = await Promise.all([
    db.from('figsy_enrollments').select('lead_id', { count: 'exact' }).eq('client_id', clientId).limit(5000),
    db.from('figsy_replies').select('lead_id, classification, subject').eq('client_id', clientId).limit(5000),
    db.from('calendar_bookings').select('lead_id').eq('client_id', clientId).eq('status', 'confirmed').limit(2000),
    db.from('figsy_memory').select('last_winning_angle, best_subject_lines').eq('client_id', clientId).maybeSingle(),
  ])

  const workedLeadIds = new Set(((worked.data ?? []) as { lead_id: string }[]).map(r => r.lead_id).filter(Boolean))
  const sampleWorked = worked.count ?? workedLeadIds.size
  const replyRows = (replies.data ?? []) as { lead_id: string | null; classification: string | null; subject: string | null }[]
  const repliedLeadIds = new Set(replyRows.map(r => r.lead_id).filter(Boolean) as string[])
  const bookedLeadIds = Array.from(new Set(((bookings.data ?? []) as { lead_id: string | null }[]).map(r => r.lead_id).filter(Boolean) as string[]))

  // Clamp to [0,1] — sampleWorked is the exact enrollment count while replied/booked come from
  // bounded fetches, and replies can exist for leads without an enrollment row, so the raw ratio
  // can slightly exceed 1; a rate >100% would read as a bug to the operator.
  const replyRate = sampleWorked > 0 ? Math.min(1, repliedLeadIds.size / sampleWorked) : 0
  const meetingRate = sampleWorked > 0 ? Math.min(1, bookedLeadIds.length / sampleWorked) : 0

  // Objections = non-positive reply classifications, counted. What this market pushes back with.
  const objMap = new Map<string, number>()
  for (const r of replyRows) {
    const c = r.classification ?? 'other'
    if (POSITIVE.has(c)) continue
    objMap.set(c, (objMap.get(c) ?? 0) + 1)
  }
  const objections = Array.from(objMap, ([cls, count]) => ({ class: cls, count })).sort((a, b) => b.count - a.count).slice(0, 6)

  // Top-converting persona: among leads that BOOKED (not just replied — booking is the money
  // outcome), the most common seniority / industry / title. Falls back to null on thin data.
  let topPersona: NexusProfile['top_persona'] = {}
  if (bookedLeadIds.length > 0) {
    // THE FENCE, explicit — scope to THIS client's leads (belt-and-braces on top of the
    // client-scoped bookedLeadIds), so a mis-attributed booking can never pull another
    // client's persona into this brain. The fence is a filter, not an assumption.
    const { data: bookedLeads } = await db.from('leads')
      .select('seniority, industry, job_title').eq('client_id', clientId).in('id', bookedLeadIds).limit(2000)
    const sen = new Map<string, number>(), ind = new Map<string, number>(), tit = new Map<string, number>()
    for (const l of (bookedLeads ?? []) as { seniority: string | null; industry: string | null; job_title: string | null }[]) {
      if (l.seniority) sen.set(l.seniority, (sen.get(l.seniority) ?? 0) + 1)
      if (l.industry) ind.set(l.industry, (ind.get(l.industry) ?? 0) + 1)
      if (l.job_title) tit.set(l.job_title, (tit.get(l.job_title) ?? 0) + 1)
    }
    topPersona = { seniority: topOf(sen), industry: topOf(ind), job_title: topOf(tit) }
  }

  // Best subjects = the SEND subjects that earned replies (sent_emails has no client_id, so we
  // scope by this client's replied lead ids — never another client's). Top by frequency.
  let bestSubjects: string[] = []
  if (repliedLeadIds.size > 0) {
    const { data: sent } = await db.from('figsy_sent_emails')
      .select('subject').in('lead_id', Array.from(repliedLeadIds).slice(0, 2000)).limit(5000)
    const subj = new Map<string, number>()
    for (const s of (sent ?? []) as { subject: string | null }[]) {
      if (s.subject) subj.set(s.subject, (subj.get(s.subject) ?? 0) + 1)
    }
    bestSubjects = Array.from(subj).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s)
  }
  if (bestSubjects.length === 0) bestSubjects = ((memory.data?.best_subject_lines as string[] | null) ?? []).slice(0, 3)

  const confidence: NexusProfile['confidence'] = sampleWorked >= 200 ? 'confident' : sampleWorked >= 40 ? 'emerging' : 'learning'

  const profile: NexusProfile = {
    client_id: clientId,
    reply_rate: Math.round(replyRate * 1000) / 1000,
    meeting_rate: Math.round(meetingRate * 1000) / 1000,
    best_subjects: bestSubjects,
    winning_angle: (memory.data?.last_winning_angle as string | null) ?? null,
    top_persona: topPersona,
    objections,
    sample_worked: sampleWorked,
    sample_replies: repliedLeadIds.size,
    sample_meetings: bookedLeadIds.length,
    confidence,
    computed_at: new Date().toISOString(),
  }

  await db.from('nexus_profiles').upsert({
    client_id: profile.client_id,
    reply_rate: profile.reply_rate, meeting_rate: profile.meeting_rate,
    best_subjects: profile.best_subjects, winning_angle: profile.winning_angle,
    top_persona: profile.top_persona, objections: profile.objections,
    sample_worked: profile.sample_worked, sample_replies: profile.sample_replies,
    sample_meetings: profile.sample_meetings, confidence: profile.confidence,
    computed_at: profile.computed_at,
  }, { onConflict: 'client_id' })

  return profile
}

// Read a client's stored profile; recompute if missing or older than maxAgeH hours.
export async function getNexusProfile(clientId: string, maxAgeH = 24): Promise<NexusProfile> {
  const { data } = await db.from('nexus_profiles').select('*').eq('client_id', clientId).maybeSingle()
  if (data) {
    const ageMs = Date.now() - new Date(data.computed_at as string).getTime()
    if (ageMs < maxAgeH * 3600000) return data as NexusProfile
  }
  return computeNexusProfile(clientId)
}
