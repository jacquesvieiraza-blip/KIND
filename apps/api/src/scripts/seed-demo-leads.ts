/**
 * Seeds 25 realistic demo leads for a given user email.
 * Matches ICP: South Africa · SaaS · VP Sales / Founder / Sales Director · C-Suite & VP/Director
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node -r dotenv/config src/scripts/seed-demo-leads.ts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const TARGET_EMAIL = 'founder@get-kind.com'

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const LEADS = [
  { first_name: 'Sipho',   last_name: 'Dlamini',    job_title: 'VP of Sales',          company: 'Yoco Technologies',     industry: 'Fintech',        seniority: 'VP / Director', score: 87, email: 'sipho.dlamini@yoco.com',       linkedin_url: 'https://linkedin.com/in/sipho-dlamini',   country: 'South Africa' },
  { first_name: 'Lerato',  last_name: 'Mokoena',    job_title: 'Founder & CEO',         company: 'Stitch Money',          industry: 'Fintech',        seniority: 'C-Suite',       score: 92, email: 'lerato.mokoena@stitch.money',  linkedin_url: 'https://linkedin.com/in/lerato-mokoena',  country: 'South Africa' },
  { first_name: 'Thabo',   last_name: 'Nkosi',      job_title: 'Sales Director',        company: 'Jumo World',            industry: 'SaaS',           seniority: 'VP / Director', score: 81, email: 'thabo.nkosi@jumo.world',       linkedin_url: 'https://linkedin.com/in/thabo-nkosi',     country: 'South Africa' },
  { first_name: 'Zanele',  last_name: 'Khumalo',    job_title: 'Head of Revenue',       company: 'Luno',                  industry: 'Fintech',        seniority: 'Head of',       score: 79, email: 'zanele.khumalo@luno.com',      linkedin_url: 'https://linkedin.com/in/zanele-khumalo',  country: 'South Africa' },
  { first_name: 'Kyle',    last_name: 'van der Berg','job_title': 'Co-Founder',         company: 'Peach Payments',        industry: 'SaaS',           seniority: 'C-Suite',       score: 94, email: 'kyle@peachpayments.com',       linkedin_url: 'https://linkedin.com/in/kyle-vanderberg', country: 'South Africa' },
  { first_name: 'Nomsa',   last_name: 'Zulu',       job_title: 'VP of Business Dev',    company: 'Kandua',                industry: 'SaaS',           seniority: 'VP / Director', score: 76, email: 'nomsa.zulu@kandua.com',        linkedin_url: 'https://linkedin.com/in/nomsa-zulu',      country: 'South Africa' },
  { first_name: 'Brendan', last_name: 'Joubert',    job_title: 'Founder',               company: 'Skynamo',               industry: 'SaaS',           seniority: 'C-Suite',       score: 89, email: 'brendan@skynamo.com',          linkedin_url: 'https://linkedin.com/in/brendan-joubert', country: 'South Africa' },
  { first_name: 'Ayanda',  last_name: 'Mthembu',    job_title: 'Sales Director',        company: 'Mama Money',            industry: 'Fintech',        seniority: 'VP / Director', score: 83, email: 'ayanda.mthembu@mamamoney.com', linkedin_url: 'https://linkedin.com/in/ayanda-mthembu',  country: 'South Africa' },
  { first_name: 'Pieter',  last_name: 'du Plessis', job_title: 'Chief Revenue Officer', company: 'DataProphet',           industry: 'SaaS',           seniority: 'C-Suite',       score: 91, email: 'pieter@dataprophet.com',       linkedin_url: 'https://linkedin.com/in/pieter-duplessis',country: 'South Africa' },
  { first_name: 'Thandeka',last_name: 'Sithole',    job_title: 'VP Sales & Marketing',  company: 'Ozow',                  industry: 'Fintech',        seniority: 'VP / Director', score: 85, email: 'thandeka.sithole@ozow.com',    linkedin_url: 'https://linkedin.com/in/thandeka-sithole',country: 'South Africa' },
  { first_name: 'Ruan',    last_name: 'Botha',      job_title: 'Founder & CTO',         company: 'Lumkani',               industry: 'SaaS',           seniority: 'C-Suite',       score: 78, email: 'ruan@lumkani.com',             linkedin_url: 'https://linkedin.com/in/ruan-botha',      country: 'South Africa' },
  { first_name: 'Naledi',  last_name: 'Dube',       job_title: 'Head of Sales',         company: 'FinCraft',              industry: 'SaaS',           seniority: 'Head of',       score: 72, email: 'naledi.dube@fincraft.io',      linkedin_url: 'https://linkedin.com/in/naledi-dube',     country: 'South Africa' },
  { first_name: 'Thabo', last_name: 'Nkosi',     job_title: 'Sales Director',        company: 'Nomanini',              industry: 'SaaS',           seniority: 'VP / Director', score: 80, email: 'thabo.nkosi@nomanini.com',  linkedin_url: 'https://linkedin.com/in/thabo-nkosi',  country: 'South Africa' },
  { first_name: 'Fatima',  last_name: 'Patel',      job_title: 'Founder',               company: 'Franc',                 industry: 'Fintech',        seniority: 'C-Suite',       score: 88, email: 'fatima@franc.co.za',           linkedin_url: 'https://linkedin.com/in/fatima-patel',    country: 'South Africa' },
  { first_name: 'Lungelo', last_name: 'Ngcobo',     job_title: 'VP of Partnerships',    company: 'Sendmarc',              industry: 'SaaS',           seniority: 'VP / Director', score: 74, email: 'lungelo.ngcobo@sendmarc.com',  linkedin_url: 'https://linkedin.com/in/lungelo-ngcobo',  country: 'South Africa' },
  { first_name: 'Megan',   last_name: 'van Wyk',    job_title: 'Chief Sales Officer',   company: 'RetailTribe',           industry: 'SaaS',           seniority: 'C-Suite',       score: 86, email: 'megan@retailtribe.com',        linkedin_url: 'https://linkedin.com/in/megan-vanwyk',    country: 'South Africa' },
  { first_name: 'Sibusiso',last_name: 'Hadebe',     job_title: 'Co-Founder',            company: 'Ukheshe',               industry: 'Fintech',        seniority: 'C-Suite',       score: 90, email: 'sibusiso@ukheshe.com',         linkedin_url: 'https://linkedin.com/in/sibusiso-hadebe', country: 'South Africa' },
  { first_name: 'Carla',   last_name: 'Rossouw',    job_title: 'Head of Growth',        company: 'Nuvei Africa',          industry: 'SaaS',           seniority: 'Head of',       score: 70, email: 'carla.rossouw@nuvei.com',      linkedin_url: 'https://linkedin.com/in/carla-rossouw',   country: 'South Africa' },
  { first_name: 'Mpho',    last_name: 'Tladi',      job_title: 'Sales Director',        company: 'Cellulant',             industry: 'Fintech',        seniority: 'VP / Director', score: 77, email: 'mpho.tladi@cellulant.io',      linkedin_url: 'https://linkedin.com/in/mpho-tladi',      country: 'South Africa' },
  { first_name: 'Heinrich',last_name: 'Prins',      job_title: 'Founder & CEO',         company: 'Bitcube',               industry: 'SaaS',           seniority: 'C-Suite',       score: 82, email: 'heinrich@bitcube.co.za',       linkedin_url: 'https://linkedin.com/in/heinrich-prins',  country: 'South Africa' },
  { first_name: 'Nomvula', last_name: 'Mahlangu',   job_title: 'VP of Sales',           company: 'Nile',                  industry: 'SaaS',           seniority: 'VP / Director', score: 84, email: 'nomvula@nile.co',              linkedin_url: 'https://linkedin.com/in/nomvula-mahlangu',country: 'South Africa' },
  { first_name: 'Dillon',  last_name: 'de Koker',   job_title: 'Founder',               company: 'Lendico SA',            industry: 'Fintech',        seniority: 'C-Suite',       score: 87, email: 'dillon@lendico.co.za',         linkedin_url: 'https://linkedin.com/in/dillon-dekoker',  country: 'South Africa' },
  { first_name: 'Priya',   last_name: 'Naidoo',     job_title: 'Head of Enterprise Sales','company': 'Custos Media',      industry: 'SaaS',           seniority: 'Head of',       score: 73, email: 'priya.naidoo@custosmedia.com', linkedin_url: 'https://linkedin.com/in/priya-naidoo',    country: 'South Africa' },
  { first_name: 'Ethan',   last_name: 'Meyer',      job_title: 'Sales Director',        company: 'iKhokha',               industry: 'Fintech',        seniority: 'VP / Director', score: 79, email: 'ethan.meyer@ikhokha.com',      linkedin_url: 'https://linkedin.com/in/ethan-meyer',     country: 'South Africa' },
  { first_name: 'Kefilwe', last_name: 'Molefe',     job_title: 'Co-Founder & CRO',      company: 'Workstreams Africa',    industry: 'SaaS',           seniority: 'C-Suite',       score: 93, email: 'kefilwe@workstreams.africa',   linkedin_url: 'https://linkedin.com/in/kefilwe-molefe',  country: 'South Africa' },
]

async function run() {
  console.log(`Looking up user: ${TARGET_EMAIL}`)

  // 1. Find the Supabase user
  const { data: { users }, error: userErr } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (userErr) { console.error('Failed to list users:', userErr); process.exit(1) }

  const user = users.find(u => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase())
  if (!user) { console.error(`No user found with email: ${TARGET_EMAIL}`); process.exit(1) }
  console.log(`Found user: ${user.id}`)

  // 2. Find the client record
  const { data: client, error: clientErr } = await db
    .from('clients')
    .select('id, company_name')
    .eq('user_id', user.id)
    .single()
  if (clientErr || !client) { console.error('No client found for this user. Have they completed onboarding?'); process.exit(1) }
  console.log(`Found client: ${client.id} (${client.company_name})`)

  // 3. Find their active ICP (if any) to attach leads to it
  const { data: icp } = await db
    .from('icps')
    .select('id, name')
    .eq('client_id', client.id)
    .eq('is_active', true)
    .maybeSingle()
  console.log(icp ? `Attaching to ICP: ${icp.name}` : 'No active ICP — leads will have no icp_id')

  // 4. Wipe any existing demo leads so we don't double-seed
  const { error: delErr } = await db
    .from('leads')
    .delete()
    .eq('client_id', client.id)
    .eq('seniority', 'C-Suite')
    .is('apollo_id', null)
  if (delErr) console.warn('Cleanup warning (non-fatal):', delErr.message)

  // 5. Insert demo leads
  const now = new Date().toISOString()
  const rows = LEADS.map((l, i) => ({
    client_id:        client.id,
    icp_id:           icp?.id ?? null,
    first_name:       l.first_name,
    last_name:        l.last_name,
    email:            l.email,
    job_title:        l.job_title,
    company:          l.company,
    industry:         l.industry,
    country:          l.country,
    seniority:        l.seniority,
    linkedin_url:     l.linkedin_url,
    score:            l.score,
    score_reasoning:  `Strong match: ${l.seniority} at ${l.industry} company in South Africa`,
    company_size:     ['51–200', '201–500', '11–50'][i % 3],
    tech_stack:       [['HubSpot', 'Slack'], ['Salesforce', 'AWS'], ['Pipedrive', 'Google Workspace']][i % 3],
    apollo_consented: true,
    status:           ['pending', 'pending', 'pending', 'contacted'][i % 4],
    delivered_at:     i % 4 === 3 ? now : null,
    created_at:       new Date(Date.now() - i * 3600000).toISOString(), // stagger timestamps
  }))

  const { data: inserted, error: insertErr } = await db.from('leads').insert(rows).select('id')
  if (insertErr) {
    console.error('Insert failed:', insertErr)
    process.exit(1)
  }

  // 6. Bump credit balance so the banner disappears
  await db.from('clients').update({ credit_balance: 50 }).eq('id', client.id)

  console.log(`\n✅ Seeded ${inserted?.length ?? 0} demo leads for ${client.company_name}`)
  console.log('   Credits set to 50 so the "no credits" banner is gone.')
  console.log('   Refresh the portal and check the People / Leads page.')
}

run().catch(err => { console.error(err); process.exit(1) })
