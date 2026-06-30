import { db } from '@kind/db'

/**
 * Seeds a DEMO COMPANY (Company Engine #88) onto an existing demo client so the
 * owner's Command Centre is impressive on demo day: a funded pool, several reps —
 * each their own workspace with real leads/campaigns/replies so per-rep stats are
 * REAL reads — varied performance for a believable leaderboard, a couple of
 * pending credit requests, a mix of unlocked agents, and a winning-play library.
 *
 * Only ever called for an is_demo owner client. Reps are is_demo clients; each
 * gets its own throwaway auth user because clients.user_id is NOT NULL + unique
 * (reps don't log in — the owner just views their rolled-up stats).
 */

const FIRST = ['Amara', 'Tunde', 'Zola', 'Sipho', 'Naledi', 'Kwame', 'Fatima', 'Emeka', 'Thandeka', 'Yusuf']
const LAST  = ['Nwosu', 'Adeyemi', 'Mthembu', 'Dlamini', 'Mensah', 'Okafor', 'Mwangi', 'Eze', 'Khumalo', 'Owusu']
const PROSPECT_CO = ['Yoco', 'Stitch Money', 'Jumo', 'Luno', 'Peach Payments', 'TymeBank', 'iKhokha', 'Ozow', 'Paystack', 'Flutterwave', 'Chipper Cash', 'Mama Money', 'Kuda', 'M-Kopa', 'Sun King', 'Twiga Foods']
const TITLES = ['Head of Sales', 'VP Sales', 'Sales Director', 'Chief Revenue Officer', 'Head of Revenue', 'Commercial Director']

// Per-rep profile — varied so the leaderboard tells a story (top / mid / needs-attention).
const REP_PROFILES = [
  { leads: 18, sent: 34, replies: 5, booked: 3, budget: 5000, autonomy: 'auto',    agents: ['figsy', 'milla', 'denise'] },
  { leads: 14, sent: 26, replies: 3, booked: 2, budget: 5000, autonomy: 'auto',    agents: ['figsy', 'vida'] },
  { leads: 9,  sent: 15, replies: 2, booked: 1, budget: 5000, autonomy: 'copilot', agents: ['figsy'] },
  { leads: 21, sent: 40, replies: 6, booked: 4, budget: 6000, autonomy: 'auto',    agents: ['figsy', 'milla'] },
  { leads: 11, sent: 19, replies: 2, booked: 1, budget: 4000, autonomy: 'auto',    agents: ['figsy', 'denise'] },
]

const rand = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString()

export async function seedDemoCompany(
  ownerClientId: string,
  ownerUserId: string,
  companyName: string,
  opts: { reps?: number } = {},
): Promise<{ company_id: string; reps: number; pool: number; requests: number; plays: number }> {
  const repCount = Math.min(Math.max(opts.reps ?? 3, 1), 5)
  const POOL = 40000

  // 1. Company + make the demo owner its owner seat.
  const { data: company, error: cErr } = await db.from('companies')
    .insert({ owner_user_id: ownerUserId, name: companyName, credit_pool: POOL, seat_cap: 25 })
    .select('id').single()
  if (cErr) throw new Error(`company insert failed: ${cErr.message}`)
  const companyId = company.id

  await db.from('clients').update({
    company_id: companyId, seat_role: 'owner', seat_active: true, seat_accepted_at: daysAgo(20),
  }).eq('id', ownerClientId)

  // 2. Reps — each a real workspace with its own leads/campaign/replies.
  const repClientIds: string[] = []
  let allocated = 0  // sum of rep budgets handed out — debited from the pool below
  for (let r = 0; r < repCount; r++) {
    const p = REP_PROFILES[r % REP_PROFILES.length]
    const name = `${FIRST[r % FIRST.length]} ${LAST[r % LAST.length]}`
    const email = `${FIRST[r % FIRST.length].toLowerCase()}@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.demo`

    // clients.user_id is NOT NULL + unique, so every rep needs its own auth user
    // (demo reps never log in, but the row still requires a real auth.users id).
    // Without this the insert silently failed and the company seeded with 0 reps.
    const suffix = Math.random().toString(36).slice(2, 10)
    const { data: repUser, error: uErr } = await db.auth.admin.createUser({
      email: `rep-${suffix}@kind-demo.internal`, password: `Demo${suffix}!`, email_confirm: true,
    })
    if (uErr) { console.error('[seedDemoCompany] rep auth user failed:', uErr.message); continue }

    const { data: rep, error: rErr } = await db.from('clients').insert({
      user_id: repUser.user!.id,
      company_id: companyId,
      company_name: name,
      invited_email: email,
      seat_role: 'rep',
      seat_active: true,
      seat_budget: p.budget,
      credit_balance: Math.max(0, p.budget - p.sent * 30),
      autonomy: p.autonomy,
      enabled_agents: p.agents,
      seat_accepted_at: daysAgo(18 - r),
      is_demo: true,
      country: 'South Africa',
      industry: 'Technology',
    }).select('id').single()
    if (rErr) { console.error('[seedDemoCompany] rep insert failed:', rErr.message); continue }
    const repId = rep.id
    repClientIds.push(repId)
    allocated += p.budget

    // Rep's campaign
    const { data: camp } = await db.from('figsy_campaigns').insert({
      client_id: repId, name: `${FIRST[r % FIRST.length]}'s Outreach`, status: 'active',
      leads_enrolled: p.leads, emails_sent: p.sent, replies_total: p.replies, meetings_booked: p.booked,
      steps_count: 3, settings: {},
    }).select('id').single()
    const campId = camp?.id

    // Rep's leads (+ sent emails + replies) so per-rep stats are real reads
    const leadRows = Array.from({ length: p.leads }, (_, j) => ({
      client_id: repId,
      first_name: FIRST[(r + j) % FIRST.length],
      last_name: rand(LAST),
      email: `lead${j}.${FIRST[r % FIRST.length].toLowerCase()}@prospect.demo`,
      job_title: rand(TITLES),
      company: rand(PROSPECT_CO),
      country: 'South Africa',
      status: j < p.booked ? 'consent_given' : j < p.sent ? 'contacted' : 'scored',
      score: 55 + Math.floor(Math.random() * 40),
      delivered_at: daysAgo(Math.floor(Math.random() * 14)),
    }))
    const { data: leads } = await db.from('leads').insert(leadRows).select('id')
    const leadIds = (leads ?? []).map((l: { id: string }) => l.id)

    if (campId && leadIds.length) {
      const sentN = Math.min(p.sent, leadIds.length)
      const sentRows = Array.from({ length: sentN }, (_, j) => ({
        campaign_id: campId, lead_id: leadIds[j], step: 1,
        subject: 'Quick question re: sales growth', body: 'Hi — worth a quick chat this week?',
        status: 'sent', sent_at: daysAgo(Math.floor(Math.random() * 7)),
      }))
      if (sentRows.length) await db.from('figsy_sent_emails').insert(sentRows)

      const replyRows = Array.from({ length: Math.min(p.replies, leadIds.length) }, (_, j) => ({
        campaign_id: campId, lead_id: leadIds[j], client_id: repId,
        from_email: `lead${j}@prospect.demo`, from_name: `${FIRST[(r + j) % FIRST.length]} ${rand(LAST)}`,
        subject: 'Re: Quick question', body: j < p.booked ? "Yes, let's meet." : 'Interested — tell me more.',
        classification: j < p.booked ? 'hot' : 'interested',
        meeting_booked_at: j < p.booked ? daysAgo(Math.floor(Math.random() * 3)) : null,
        received_at: daysAgo(Math.floor(Math.random() * 3)),
      }))
      if (replyRows.length) await db.from('figsy_replies').insert(replyRows)
    }
  }

  // 2b. Debit the pool for what we handed to reps, so the Command Centre's
  //     Pool + Allocated reconcile to the funded total (POOL). Without this the
  //     pool reads a flat 40,000 next to ~15,000 allocated and never ties out (#55d).
  await db.from('companies')
    .update({ credit_pool: Math.max(0, POOL - allocated) })
    .eq('id', companyId)

  // 3. A couple of pending credit requests (the approve/deny demo moment)
  let requests = 0
  if (repClientIds[0]) {
    await db.from('seat_credit_requests').insert({
      company_id: companyId, rep_client_id: repClientIds[0], amount: 2000,
      reason: 'Q3 telco push — running low mid-campaign',
    }); requests++
  }
  if (repClientIds[1]) {
    await db.from('seat_credit_requests').insert({
      company_id: companyId, rep_client_id: repClientIds[1], amount: 1500,
      reason: 'New ICP: fintech founders, SA',
    }); requests++
  }

  // 4. Winning plays library
  await db.from('winning_plays').insert([
    { company_id: companyId, name: 'Fintech founder opener', note: 'Name a peer + a metric in line 1. 2x reply rate.', reply_rate: 14.5, pushed_to_all: true, created_by: ownerUserId },
    { company_id: companyId, name: 'Telco enterprise angle', note: 'Lead with a compliance hook for SA telcos.', reply_rate: 11.2, pushed_to_all: false, created_by: ownerUserId },
  ])

  return { company_id: companyId, reps: repClientIds.length, pool: POOL, requests, plays: 2 }
}
