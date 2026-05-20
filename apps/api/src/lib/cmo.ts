import { buildSearchBody, searchPeople, ApolloContact } from './apollo'

// K.I.N.D brand voice + messaging config — update this file to change how the CMO agent writes
export const KIND_BRAND = {
  company:  'K.I.N.D',
  tagline:  'The B2B AI revenue platform for African businesses',
  website:  'https://get-kind.com',

  target_icp: {
    job_titles:    ['Founder', 'CEO', 'Managing Director', 'Sales Director', 'Head of Growth', 'Head of Sales'],
    company_size:  '5–50 employees',
    industries:    ['Professional services', 'Fintech', 'Logistics', 'Tech', 'Consulting', 'SaaS', 'Marketing agencies'],
    geographies:   ['South Africa', 'Nigeria', 'Kenya', 'Ghana', 'East Africa', 'West Africa'],
    pain_points: [
      'Founder is the entire sales team — no time to prospect',
      'Manual prospecting takes hours for a list that goes cold',
      'CRMs like Salesforce are too expensive and complex for their stage',
      'Follow-ups fall through the cracks — deals die in silence',
      'No visibility into who the best leads actually are',
    ],
  },

  messaging_pillars: [
    'Break the Human Ceiling — FIGSY removes the bottleneck of founder-led prospecting',
    'The AI Revenue Team — FIGSY (SDR), Milla (Intelligence), Vida (Website) — not tools, teammates',
    'Unlimited pipeline — when your AI team is running, pipeline growth has no ceiling',
    'African-first — POPIA/NDPR compliant by default, ZAR billing, built for how African businesses sell',
    'You close the deal. FIGSY finds the people, starts the conversation, and books the meeting.',
  ],

  tone: {
    voice:   'Direct, confident, no fluff. Like a senior colleague who gives you the number first. We found you with FIGSY — and that is exactly the point.',
    avoid:   ['Corporate jargon', 'Excessive exclamation marks', '"Revolutionary" or "game-changing"', 'Vague promises', 'Calling it "AI-powered" — just show the outcome'],
    use:     ['Specific numbers', 'Concrete outcomes', 'Short sentences', 'Active voice', 'Honest honesty about what the product does'],
    example_hooks: [
      'You are not buying software. You are hiring a team.',
      'FIGSY found your details. I thought it was only fair to tell you.',
      'Break the human ceiling — your pipeline should not be limited by how many hours you have.',
      'First leads in under 10 minutes. Or your money back.',
      'This email was written by FIGSY. The next one can be about your pipeline.',
    ],
  },

  products: {
    lead_gen: {
      name:        'Lead Gen',
      price:       '$1/lead, min $100/mo',
      value_prop:  'Scored, POPIA-compliant leads matched to your ICP — delivered in hours',
    },
    figsy: {
      name:        'FIGSY',
      price:       '$3/lead bundled, or $150/mo add-on',
      value_prop:  'AI SDR — writes personalised emails, follows up, classifies replies. You just book the meeting.',
    },
    va: {
      name:        'Virtual Assistant',
      price:       '$200–$500/mo',
      value_prop:  'Knows your business — answers questions, drafts proposals, handles client comms',
    },
    chatbot: {
      name:        'AI Chatbot',
      price:       '$200–$400/mo',
      value_prop:  'Handles inbound on your website and WhatsApp. Qualifies leads, captures contact info 24/7.',
    },
  },
}

// Apollo search with K.I.N.D's own ICP (for INT-10 outbound)
export async function findKindProspects(): Promise<ApolloContact[]> {
  const icpBody = buildSearchBody({
    industries:       KIND_BRAND.target_icp.industries,
    job_titles:       KIND_BRAND.target_icp.job_titles,
    seniority_levels: ['c_suite', 'owner', 'founder', 'director'],
    company_sizes:    ['1,10', '11,50'],
    geographies:      ['South Africa', 'Nigeria', 'Kenya'],
    tech_stack:       [],
    keywords:         [],
    apollo_only_consented: false,
  })
  return searchPeople(icpBody)
}
