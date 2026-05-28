export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const DEMO_LEADS = [
  { first_name: 'Sipho',    last_name: 'Dlamini',      job_title: 'VP of Sales',             company: 'Yoco Technologies',  industry: 'Fintech', seniority: 'VP / Director', score: 87, lead_email: 'sipho.dlamini@yoco.com',        linkedin_url: 'https://linkedin.com/in/sipho-dlamini',    company_size: '201–500' },
  { first_name: 'Lerato',   last_name: 'Mokoena',      job_title: 'Founder & CEO',            company: 'Stitch Money',       industry: 'Fintech', seniority: 'C-Suite',       score: 92, lead_email: 'lerato.mokoena@stitch.money',   linkedin_url: 'https://linkedin.com/in/lerato-mokoena',   company_size: '51–200'  },
  { first_name: 'Thabo',    last_name: 'Nkosi',        job_title: 'Sales Director',           company: 'Jumo World',         industry: 'SaaS',    seniority: 'VP / Director', score: 81, lead_email: 'thabo.nkosi@jumo.world',        linkedin_url: 'https://linkedin.com/in/thabo-nkosi',      company_size: '201–500' },
  { first_name: 'Zanele',   last_name: 'Khumalo',      job_title: 'Head of Revenue',          company: 'Luno',               industry: 'Fintech', seniority: 'Head of',       score: 79, lead_email: 'zanele.khumalo@luno.com',       linkedin_url: 'https://linkedin.com/in/zanele-khumalo',   company_size: '201–500' },
  { first_name: 'Kyle',     last_name: 'van der Berg',  job_title: 'Co-Founder',              company: 'Peach Payments',     industry: 'SaaS',    seniority: 'C-Suite',       score: 94, lead_email: 'kyle@peachpayments.com',        linkedin_url: 'https://linkedin.com/in/kyle-vanderberg',  company_size: '51–200'  },
  { first_name: 'Nomsa',    last_name: 'Zulu',         job_title: 'VP of Business Dev',       company: 'Kandua',             industry: 'SaaS',    seniority: 'VP / Director', score: 76, lead_email: 'nomsa.zulu@kandua.com',         linkedin_url: 'https://linkedin.com/in/nomsa-zulu',       company_size: '11–50'   },
  { first_name: 'Brendan',  last_name: 'Joubert',      job_title: 'Founder',                  company: 'Skynamo',            industry: 'SaaS',    seniority: 'C-Suite',       score: 89, lead_email: 'brendan@skynamo.com',           linkedin_url: 'https://linkedin.com/in/brendan-joubert',  company_size: '51–200'  },
  { first_name: 'Ayanda',   last_name: 'Mthembu',      job_title: 'Sales Director',           company: 'Mama Money',         industry: 'Fintech', seniority: 'VP / Director', score: 83, lead_email: 'ayanda.mthembu@mamamoney.com',  linkedin_url: 'https://linkedin.com/in/ayanda-mthembu',   company_size: '51–200'  },
  { first_name: 'Pieter',   last_name: 'du Plessis',   job_title: 'Chief Revenue Officer',    company: 'DataProphet',        industry: 'SaaS',    seniority: 'C-Suite',       score: 91, lead_email: 'pieter@dataprophet.com',        linkedin_url: 'https://linkedin.com/in/pieter-duplessis', company_size: '51–200'  },
  { first_name: 'Thandeka', last_name: 'Sithole',      job_title: 'VP Sales & Marketing',     company: 'Ozow',               industry: 'Fintech', seniority: 'VP / Director', score: 85, lead_email: 'thandeka.sithole@ozow.com',     linkedin_url: 'https://linkedin.com/in/thandeka-sithole', company_size: '201–500' },
  { first_name: 'Ruan',     last_name: 'Botha',        job_title: 'Founder & CTO',            company: 'Lumkani',            industry: 'SaaS',    seniority: 'C-Suite',       score: 78, lead_email: 'ruan@lumkani.com',              linkedin_url: 'https://linkedin.com/in/ruan-botha',       company_size: '11–50'   },
  { first_name: 'Naledi',   last_name: 'Dube',         job_title: 'Head of Sales',            company: 'FinCraft',           industry: 'SaaS',    seniority: 'Head of',       score: 72, lead_email: 'naledi.dube@fincraft.io',       linkedin_url: 'https://linkedin.com/in/naledi-dube',      company_size: '11–50'   },
  { first_name: 'Fatima',   last_name: 'Patel',        job_title: 'Founder',                  company: 'Franc',              industry: 'Fintech', seniority: 'C-Suite',       score: 88, lead_email: 'fatima@franc.co.za',            linkedin_url: 'https://linkedin.com/in/fatima-patel',     company_size: '11–50'   },
  { first_name: 'Lungelo',  last_name: 'Ngcobo',       job_title: 'VP of Partnerships',       company: 'Sendmarc',           industry: 'SaaS',    seniority: 'VP / Director', score: 74, lead_email: 'lungelo.ngcobo@sendmarc.com',   linkedin_url: 'https://linkedin.com/in/lungelo-ngcobo',   company_size: '51–200'  },
  { first_name: 'Megan',    last_name: 'van Wyk',      job_title: 'Chief Sales Officer',      company: 'RetailTribe',        industry: 'SaaS',    seniority: 'C-Suite',       score: 86, lead_email: 'megan@retailtribe.com',         linkedin_url: 'https://linkedin.com/in/megan-vanwyk',     company_size: '51–200'  },
  { first_name: 'Sibusiso', last_name: 'Hadebe',       job_title: 'Co-Founder',               company: 'Ukheshe',            industry: 'Fintech', seniority: 'C-Suite',       score: 90, lead_email: 'sibusiso@ukheshe.com',          linkedin_url: 'https://linkedin.com/in/sibusiso-hadebe',  company_size: '51–200'  },
  { first_name: 'Mpho',     last_name: 'Tladi',        job_title: 'Sales Director',           company: 'Cellulant',          industry: 'Fintech', seniority: 'VP / Director', score: 77, lead_email: 'mpho.tladi@cellulant.io',       linkedin_url: 'https://linkedin.com/in/mpho-tladi',       company_size: '201–500' },
  { first_name: 'Heinrich', last_name: 'Prins',        job_title: 'Founder & CEO',            company: 'Bitcube',            industry: 'SaaS',    seniority: 'C-Suite',       score: 82, lead_email: 'heinrich@bitcube.co.za',        linkedin_url: 'https://linkedin.com/in/heinrich-prins',   company_size: '11–50'   },
  { first_name: 'Nomvula',  last_name: 'Mahlangu',     job_title: 'VP of Sales',              company: 'Nile',               industry: 'SaaS',    seniority: 'VP / Director', score: 84, lead_email: 'nomvula@nile.co',               linkedin_url: 'https://linkedin.com/in/nomvula-mahlangu', company_size: '11–50'   },
  { first_name: 'Kefilwe',  last_name: 'Molefe',       job_title: 'Co-Founder & CRO',         company: 'Workstreams Africa', industry: 'SaaS',    seniority: 'C-Suite',       score: 93, lead_email: 'kefilwe@workstreams.africa',    linkedin_url: 'https://linkedin.com/in/kefilwe-molefe',   company_size: '11–50'   },
  { first_name: 'Priya',    last_name: 'Naidoo',       job_title: 'Head of Enterprise Sales', company: 'Custos Media',       industry: 'SaaS',    seniority: 'Head of',       score: 73, lead_email: 'priya.naidoo@custosmedia.com',  linkedin_url: 'https://linkedin.com/in/priya-naidoo',     company_size: '11–50'   },
  { first_name: 'Ethan',    last_name: 'Meyer',        job_title: 'Sales Director',           company: 'iKhokha',            industry: 'Fintech', seniority: 'VP / Director', score: 79, lead_email: 'ethan.meyer@ikhokha.com',       linkedin_url: 'https://linkedin.com/in/ethan-meyer',      company_size: '201–500' },
  { first_name: 'Carla',    last_name: 'Rossouw',      job_title: 'Head of Growth',           company: 'Nuvei Africa',       industry: 'SaaS',    seniority: 'Head of',       score: 70, lead_email: 'carla.rossouw@nuvei.com',       linkedin_url: 'https://linkedin.com/in/carla-rossouw',    company_size: '201–500' },
  { first_name: 'Dillon',   last_name: 'de Koker',     job_title: 'Founder',                  company: 'Lendico SA',         industry: 'Fintech', seniority: 'C-Suite',       score: 87, lead_email: 'dillon@lendico.co.za',          linkedin_url: 'https://linkedin.com/in/dillon-dekoker',   company_size: '51–200'  },
  { first_name: 'Jacques',  last_name: 'Marais',       job_title: 'Sales Director',           company: 'Nomanini',           industry: 'SaaS',    seniority: 'VP / Director', score: 80, lead_email: 'jacques.marais@nomanini.com',   linkedin_url: 'https://linkedin.com/in/jacques-marais',   company_size: '51–200'  },
]

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json({ success: false, message: `Missing env vars: URL=${!!url} KEY=${!!key}` }, { status: 500 })
  }

  let email = ''
  try {
    const body = await req.json()
    email = body.email ?? ''
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
  }

  if (!email) {
    return NextResponse.json({ success: false, message: 'email is required' }, { status: 400 })
  }

  const db = adminDb()

  try {
    // Find user by email via admin API
    const { data: listData, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 })
    if (listErr) {
      return NextResponse.json({ success: false, message: `listUsers failed: ${listErr.message}` }, { status: 500 })
    }

    const user = listData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
    if (!user) {
      return NextResponse.json({ success: false, message: `No Supabase user found with email: ${email}` }, { status: 404 })
    }

    // Find client record
    const { data: client, error: clientErr } = await db
      .from('clients').select('id, company_name').eq('user_id', user.id).maybeSingle()

    if (clientErr) {
      return NextResponse.json({ success: false, message: `Client lookup failed: ${clientErr.message}` }, { status: 500 })
    }
    if (!client) {
      return NextResponse.json({ success: false, message: `No client profile for user ${user.id}. Have they completed onboarding at /onboard?` }, { status: 404 })
    }

    // Get most recent ICP to attach leads to
    const { data: icp } = await db.from('icps').select('id, name')
      .eq('client_id', client.id).order('created_at', { ascending: false }).limit(1).maybeSingle()

    // Wipe previous demo leads (no apollo_id = demo/manual)
    await db.from('leads').delete().eq('client_id', client.id).is('apollo_id', null)

    const now = new Date().toISOString()
    const rows = DEMO_LEADS.map((l, i) => ({
      client_id:        client.id,
      icp_id:           icp?.id ?? null,
      first_name:       l.first_name,
      last_name:        l.last_name,
      email:            l.lead_email,
      job_title:        l.job_title,
      company:          l.company,
      industry:         l.industry,
      country:          'South Africa',
      seniority:        l.seniority,
      linkedin_url:     l.linkedin_url,
      score:            l.score,
      score_reasoning:  `Strong ICP match: ${l.seniority} at a ${l.industry} company in South Africa`,
      tech_stack:       [['HubSpot', 'Slack'], ['Salesforce', 'AWS'], ['Pipedrive', 'Google Workspace']][i % 3],
      status:           'pending',
      delivered_at:     now,
      created_at:       new Date(Date.now() - i * 3600000).toISOString(),
    }))

    const { data: inserted, error: insertErr } = await db.from('leads').insert(rows).select('id')
    if (insertErr) {
      return NextResponse.json({ success: false, message: `Insert failed: ${insertErr.message} (code: ${insertErr.code})` }, { status: 500 })
    }

    // Set both credit types to 50
    await db.from('clients').update({ credit_balance: 50, figsy_credits_remaining: 50 }).eq('id', client.id)

    return NextResponse.json({
      success: true,
      message: `Done! Seeded ${inserted?.length ?? 0} demo leads for ${client.company_name}. Credits set to 50 lead gen + 50 FIGSY. Refresh the portal.`,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null
        ? JSON.stringify(err, Object.getOwnPropertyNames(err))
        : String(err)
    return NextResponse.json({ success: false, message: `Unexpected error: ${msg}` }, { status: 500 })
  }
}
