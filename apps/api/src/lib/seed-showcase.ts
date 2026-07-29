import { db } from '@kind/db'

/**
 * Seeds a DEMO/SHOWCASE client with impressive, internally-consistent fake data
 * so a thriving account can be demoed. Because the portal reconciles every metric
 * from these source tables, seeding real rows makes the numbers line up on every
 * screen (Dashboard, Leads, Campaigns, Inbox, Usage, KPIs).
 *
 * Targets: ~240 delivered+scored leads · ~$420k pipeline · 1 active campaign ·
 * ~620 sent emails · ~78 replies (12.5%) · ~18 meetings booked · a few 🔥 hot
 * replies waiting in the inbox.
 *
 * Only ever called for clients flagged is_demo=true.
 */

const FIRST = ['Sipho','Lerato','Thabo','Zanele','Kyle','Nomsa','Brendan','Ayanda','Pieter','Thandeka','Ruan','Naledi','Fatima','Lungelo','Megan','Sibusiso','Carla','Mpho','Heinrich','Nomvula','Dillon','Priya','Ethan','Kefilwe','Tunde','Amara','Chidi','Ngozi','Emeka','Yusuf','Wanjiru','Otieno','Kwame','Ama','Kofi','Zola','Bongani','Refilwe','Sade','Ibrahim']
const LAST  = ['Dlamini','Mokoena','Nkosi','Khumalo','van der Berg','Zulu','Joubert','Mthembu','du Plessis','Sithole','Botha','Dube','Patel','Ngcobo','van Wyk','Hadebe','Rossouw','Tladi','Prins','Mahlangu','Okafor','Adeyemi','Eze','Mwangi','Otieno','Mensah','Asante','Naidoo','Abiodun','Mutua','Owusu','Cele']
const COMPANIES = ['Yoco','Stitch Money','Jumo','Luno','Peach Payments','Kandua','Skynamo','Mama Money','DataProphet','Ozow','Paystack','Flutterwave','Chipper Cash','Cellulant','Ukheshe','iKhokha','TymeBank','Kuda','Carbon','OnePipe','Wave','Twiga Foods','Sendy','mPharma','Andela','Sun King','M-Kopa','Sokowatch','Bizao','Pula','Float','Nomanini']
const TITLES = ['Head of Sales','Sales Director','VP of Sales','Founder & CEO','Co-Founder','Head of Revenue','Chief Revenue Officer','VP Business Development','Head of Growth','Founder','Head of Marketing','Growth Lead','Chief Sales Officer']
const SENIORITY = ['C-Suite','VP / Director','Head of']
const INDUSTRIES = ['Fintech','SaaS','E-commerce','Logistics','Insurtech']
const COUNTRIES = ['South Africa','South Africa','South Africa','Nigeria','Nigeria','Kenya','Ghana','Egypt']
const SIZES = ['11–50','51–200','201–500']
const STACKS = [['HubSpot','Slack'],['Salesforce','AWS'],['Pipedrive','Google Workspace'],['Zoho','Azure']]

const SUBJECTS = ['quick idea for {co}','{co} + new pipeline','noticed {co} is hiring','15 min this week?','re: your sales targets','African outbound that works']
const BODIES = ['Saw what {co} is doing in {ind} and had a specific idea on opening more conversations. Worth a quick call?','We help {ind} teams in {country} book more meetings without adding headcount. Open to a 15-min look?','Following up — happy to share a short breakdown of how this would work for {co}.']
const POS_REPLIES = ['Yes, this is interesting — can we set up a call this week?','Good timing, we are looking at exactly this. Send me a slot.','Happy to chat. What does Thursday look like?','This is relevant to us right now. Let me loop in my team.']
const WARM_REPLIES = ['Not right now but check back next quarter.','Interesting — send me more info and I will review.']
const COLD_REPLIES = ['Not a fit for us at the moment.','We already have a solution in place.']

const rand = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const ri = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString()
const fill = (t: string, m: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => m[k] ?? '')

async function insertBatched(table: string, rows: Record<string, unknown>[], chunk = 200): Promise<{ id: string }[]> {
  const out: { id: string }[] = []
  for (let i = 0; i < rows.length; i += chunk) {
    // db is the loosely-typed service client; cast to bypass the generated insert types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await db.from(table).insert(rows.slice(i, i + chunk) as any).select('id')
    if (error) { console.error(`[showcase] ${table} insert failed:`, error.message); throw error }
    out.push(...((data ?? []) as { id: string }[]))
  }
  return out
}

export async function seedShowcaseData(clientId: string, icpId: string | null): Promise<{ leads: number; sent: number; replies: number; meetings: number; pipeline: number }> {
  const N_LEADS = 600

  // 1) Leads — all delivered + scored, pipeline ≈ $420k
  let pipeline = 0
  const leadRows = Array.from({ length: N_LEADS }, (_, i) => {
    const first = rand(FIRST), last = rand(LAST), co = rand(COMPANIES)
    const ind = rand(INDUSTRIES), country = rand(COUNTRIES)
    const deal = ri(1200, 4800); pipeline += deal
    const status = i % 5 < 3 ? 'consent_given' : i % 5 === 3 ? 'scored' : 'exported'
    return {
      client_id: clientId, icp_id: icpId,
      first_name: first, last_name: last,
      email: `${slug(first)}.${slug(last)}@${slug(co)}.com`,
      job_title: rand(TITLES), company: co, industry: ind, country,
      seniority: rand(SENIORITY), linkedin_url: `https://linkedin.com/in/${slug(first)}-${slug(last)}`,
      score: ri(62, 97), score_reasoning: `Strong match: ${ind} decision-maker in ${country}`,
      company_size: rand(SIZES), tech_stack: rand(STACKS), apollo_consented: true,
      status, delivered_at: daysAgo(ri(1, 35)),
      estimated_deal_value_usd: deal,
      created_at: daysAgo(ri(1, 40)),
    }
  })
  const leads = (await insertBatched('leads', leadRows)) as { id: string }[]

  // 2) Campaign
  const { data: camp, error: campErr } = await db.from('figsy_campaigns')
    .insert({ client_id: clientId, name: 'Q3 African Fintech Outreach', status: 'active', icp_id: icpId, steps_count: 3, created_at: daysAgo(38) })
    .select('id').single()
  if (campErr || !camp) throw new Error(`[showcase] campaign insert failed: ${campErr?.message}`)
  const campaignId = camp.id

  // 3) Enrollments — one per lead
  const enrollRows = leads.map((l, i) => ({
    campaign_id: campaignId, lead_id: l.id, client_id: clientId,
    status: i % 6 === 0 ? 'replied' : i % 6 === 5 ? 'completed' : 'in_progress',
    current_step: ri(1, 3), enrolled_at: daysAgo(ri(2, 37)),
  }))
  const enrollments = (await insertBatched('figsy_enrollments', enrollRows)) as { id: string }[]

  // 4) Sent emails — 1–3 steps per lead (~620 total)
  const sentRows: Record<string, unknown>[] = []
  enrollments.forEach((e, i) => {
    const lead = leadRows[i]
    const steps = i % 4 === 0 ? 1 : i % 4 === 1 ? 2 : 3
    const m = { co: lead.company, ind: lead.industry, country: lead.country }
    for (let s = 1; s <= steps; s++) {
      sentRows.push({
        enrollment_id: e.id, campaign_id: campaignId, lead_id: leads[i].id,
        step: s, subject: fill(rand(SUBJECTS), m), body: fill(rand(BODIES), m),
        sent_at: daysAgo(ri(1, 30)),
      })
    }
  })
  await insertBatched('figsy_sent_emails', sentRows)

  // 5) Replies — ~12.5% of sends; ~18 booked meetings, several 🔥 hot waiting
  const N_REPLIES = Math.round(sentRows.length * 0.125)
  const N_MEETINGS = 45
  const replyRows: Record<string, unknown>[] = []
  for (let i = 0; i < N_REPLIES; i++) {
    const lead = leadRows[i]; const e = enrollments[i]
    // distribution: ~45% hot, ~25% warm, ~30% cold/other
    const roll = Math.random()
    const cls = roll < 0.45 ? 'hot' : roll < 0.70 ? 'warm' : roll < 0.85 ? 'cold' : 'other'
    const body = cls === 'hot' ? rand(POS_REPLIES) : cls === 'warm' ? rand(WARM_REPLIES) : rand(COLD_REPLIES)
    replyRows.push({
      enrollment_id: e.id, campaign_id: campaignId, lead_id: leads[i].id, client_id: clientId,
      from_email: `${slug(lead.first_name)}.${slug(lead.last_name)}@${slug(lead.company)}.com`,
      from_name: `${lead.first_name} ${lead.last_name}`,
      subject: 're: quick idea', body, body_text: body,
      classification: cls, classification_reasoning: 'Demo seed',
      meeting_booked_at: (cls === 'hot' && i < N_MEETINGS) ? daysAgo(ri(1, 14)) : null,
      received_at: daysAgo(ri(1, 20)),
      processed_at: daysAgo(ri(1, 20)),
    })
  }
  await insertBatched('figsy_replies', replyRows)

  // 6) Credit ledger — one usage row per delivered lead (600 used)…
  const txRows = leads.map(() => ({
    client_id: clientId, type: 'usage', amount: -1, plan: 'lead_gen',
    note: 'Lead delivered (demo)', created_at: daysAgo(ri(1, 35)),
  }))
  await insertBatched('credit_transactions', txRows, 500)

  // …plus purchase rows so the usage page reconciles: purchased 9,200 − used 600
  // = balance 8,600 (set below). Without these "Credits purchased" reads 0 next to
  // a healthy balance, and the numbers don't tie out on a demo (#55d).
  await insertBatched('credit_transactions', [
    { client_id: clientId, type: 'purchase', amount: 5000, plan: 'lead_gen', note: 'Credit top-up (demo)', created_at: daysAgo(40) },
    { client_id: clientId, type: 'purchase', amount: 4200, plan: 'lead_gen', note: 'Credit top-up (demo)', created_at: daysAgo(12) },
  ], 500)

  // 6b) Set the campaign's denormalised counters to match the seeded rows, so any
  //     counter-reading surface shows the right numbers too (the reconcile already
  //     handles /campaigns, but this keeps everything consistent).
  const interestedN = replyRows.filter(r => r.classification === 'hot' || r.classification === 'interested').length
  const optedOutN   = replyRows.filter(r => r.classification === 'opt_out' || r.classification === 'unsubscribe').length
  await db.from('figsy_campaigns').update({
    emails_sent: sentRows.length,
    replies_total: replyRows.length,
    replies_interested: interestedN,
    opted_out: optedOutN,
    meetings_booked: N_MEETINGS,
    leads_enrolled: enrollments.length,
  }).eq('id', campaignId)

  // 7) Healthy balance — reconciles with the ledger: 9,200 purchased − 600 used = 8,600.
  await db.from('clients').update({ credit_balance: 8600 }).eq('id', clientId)

  // 7b) Back-date the billing period so the seeded deliveries (1–35 days ago) count
  //     as "this period". Otherwise period_start = account creation (now) and the
  //     usage page shows "0 leads this period" beside 600 delivered leads (#55d).
  // #349 — swallowed, the very bug this back-date exists to prevent comes straight back:
  // the usage page reads "0 leads this period" beside 600 delivered leads, in a demo.
  const { error: periodErr } = await db.from('subscriptions')
    .update({ current_period_start: daysAgo(40) })
    .eq('client_id', clientId)
  if (periodErr) throw new Error(`[showcase] billing period back-date failed: ${periodErr.message}`)

  // 8) DENISE — unlock + seed so The Closer is demoable (item 188). The page and
  //    API both gate on an active 'denise' subscription; without it Denise shows
  //    the locked/upgrade state and can't be shown in a demo or Drop. Seed an
  //    active sub + one warm follow-up + one proposal draft so the page is alive.
  await seedDenise(clientId)

  return { leads: leads.length, sent: sentRows.length, replies: replyRows.length, meetings: N_MEETINGS, pipeline }
}

/**
 * Grants a demo client an active Denise subscription and seeds two realistic
 * drafts (a warm follow-up + a proposal) so the Denise page demos live. Idempotent
 * on the subscription (unique client_id,product); drafts are inserted fresh.
 * Safe to call for any is_demo client — only ever invoked from demo seeding.
 */
export async function seedDenise(clientId: string): Promise<void> {
  // Active Denise subscription — unlocks the page + the /denise endpoints.
  // #349 — this row IS the unlock. Swallowed, seeding "succeeds" and Denise still shows
  // the locked/upgrade state in the demo — the exact failure this function exists to fix.
  const { error: subErr } = await db.from('subscriptions').upsert({
    client_id: clientId, product: 'denise', tier: 'starter', status: 'active',
    billing_interval: 'monthly',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
  }, { onConflict: 'client_id,product' })
  if (subErr) throw new Error(`[showcase] denise subscription failed: ${subErr.message} — Denise will show as locked`)

  // Don't double-seed drafts if this demo was already seeded.
  const { data: existing } = await db.from('denise_drafts')
    .select('id').eq('client_id', clientId).limit(1)
  if ((existing ?? []).length > 0) return

  const followUp = {
    client_id: clientId, kind: 'follow_up',
    input: {
      first_name: 'Lerato', company: 'Yoco', job_title: 'Head of Sales',
      interest_signal: 'opening more qualified conversations without adding headcount',
      conversation_summary: 'Interested after FIGSY booked a call; went quiet for a week.',
    },
    output: [
      'Hi Lerato,',
      '',
      'It was good to connect earlier — you mentioned Yoco is pushing hard into new merchant segments this quarter, and that the real bottleneck was opening enough qualified conversations without adding headcount.',
      '',
      'No rush on my side at all, but I put together a quick view of how we’d open those conversations for your team. Happy to walk you through it whenever suits — even 15 minutes next week would do it.',
      '',
      'Want me to send a couple of times that work for you?',
      '',
      'Warmly,',
      'Denise',
    ].join('\n'),
    created_at: daysAgo(2),
  }

  const proposal = {
    client_id: clientId, kind: 'proposal',
    input: {
      company: 'Stitch Money',
      call_summary: 'Strong close rate but a thin top of funnel; reps sourcing instead of selling; African outbound hit-or-miss on deliverability.',
      pains: ['Reps spend hours sourcing leads', 'Inconsistent inbox placement on outbound', 'No predictable meeting flow'],
    },
    output: [
      '**Proposal — Stitch Money**',
      '',
      '**Where you are**',
      'On our call you said the team closes well, but the top of the funnel is thin — reps are spending hours sourcing instead of selling, and African outbound has been hit-or-miss on deliverability.',
      '',
      '**What we’d do**',
      '• FIGSY sources and qualifies your ICP (fintech & SaaS decision-makers across SA, Nigeria, Kenya) and runs warm, personalised sequences.',
      '• Denise closes the seam — confirming booked meetings, prepping your reps, and chasing warm leads so none go cold.',
      '• Everything runs on consented, deliverability-protected sending so you actually land in the inbox.',
      '',
      '**Expected outcome**',
      'A predictable flow of qualified conversations — without adding SDR headcount.',
      '',
      '**Simple next step**',
      'A 30-minute working session to set your ICP live and book your first sequence. Whenever suits you.',
      '',
      '— Denise',
    ].join('\n'),
    created_at: daysAgo(1),
  }

  const { error } = await db.from('denise_drafts').insert([followUp, proposal] as any)
  if (error) console.error('[showcase] denise_drafts insert failed:', error.message)
}
