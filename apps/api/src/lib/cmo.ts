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
    'Speed — first scored leads in 2 hours from signup, not 2 weeks',
    'AI-native — not a spreadsheet with an AI button bolted on',
    'African-first — POPIA/NDPR compliant, ZAR billing, built for how African businesses sell',
    'Full revenue cycle — Lead Gen → FIGSY outreach → VA → Chatbot',
    'You close the deal. We find the people and start the conversation.',
  ],

  tone: {
    voice:   'Direct, confident, no fluff. Like a senior colleague who gives you the number first.',
    avoid:   ['Corporate jargon', 'Excessive exclamation marks', '"Revolutionary" or "game-changing"', 'Vague promises'],
    use:     ['Specific numbers', 'Concrete outcomes', 'Short sentences', 'Active voice'],
    example_hooks: [
      'K.I.N.D finds the right people. FIGSY does the talking. You close the deal.',
      'First leads in 2 hours. Not 2 weeks.',
      'Built for how African businesses actually sell.',
      'Your ICP. Your leads. Your pipeline. Automated.',
      'Stop prospecting. Start closing.',
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
