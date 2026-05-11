// Usage-based pricing model
// Leads Only:        0-100 leads = $1.00/lead (min $100/mo), 101-500 = $1.00/lead, 500+ = $0.80/lead
// Leads + FIGSY:     0-100 leads = $3.00/lead (min $300/mo), 101-500 = $2.00/lead, 500+ = $1.20/lead
// FIGSY add-on:      +$150/mo flat (for existing Leads Only clients upgrading)

export const PRICING = {
  lead_gen: {
    name: 'AI Lead Generation',
    description: 'Verified B2B leads sourced and scored against your ICP.',
    monthly_minimum_usd: 100,
    monthly_minimum_zar: 1900,
    includes_leads: 100,
    tiers: [
      { label: '0–100 leads',  rate_usd: 1.00, rate_zar: 19 },
      { label: '101–500 leads', rate_usd: 1.00, rate_zar: 19 },
      { label: '500+ leads',   rate_usd: 0.80, rate_zar: 15.20 },
    ],
    enterprise: true,
  },
  lead_gen_figsy: {
    name: 'Lead Gen + FIGSY',
    description: 'Leads sourced, scored, and FIGSY AI handles outreach and follow-up.',
    monthly_minimum_usd: 300,
    monthly_minimum_zar: 5700,
    includes_leads: 100,
    tiers: [
      { label: '0–100 leads',  rate_usd: 3.00, rate_zar: 57 },
      { label: '101–500 leads', rate_usd: 2.00, rate_zar: 38 },
      { label: '500+ leads',   rate_usd: 1.20, rate_zar: 22.80 },
    ],
    enterprise: true,
  },
} as const

export const FIGSY_ADDON = {
  name: 'FIGSY Add-on',
  description: 'Add FIGSY AI outreach to your existing Leads Only plan.',
  price_usd: 150,
  price_zar: 2850,
} as const

export const PRODUCTS = {
  virtual_assistant: {
    name: 'Virtual Assistant',
    tiers: {
      starter:    { price_usd: 200, price_zar: 3800,  messages_per_month: 500   },
      pro:        { price_usd: 500, price_zar: 9500,  messages_per_month: 2000  },
      enterprise: { price_usd: 0,   price_zar: 0,     messages_per_month: 0, custom: true },
    },
  },
  chatbot: {
    name: 'AI Chatbot Agent',
    tiers: {
      starter:    { price_usd: 200, price_zar: 3800,  conversations_per_month: 500   },
      pro:        { price_usd: 400, price_zar: 7600,  conversations_per_month: 2000  },
      enterprise: { price_usd: 0,   price_zar: 0,     conversations_per_month: 0, custom: true },
    },
  },
} as const

export const SUPPORTED_COUNTRIES = [
  'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt',
  'Rwanda', 'Tanzania', 'Uganda', 'Senegal', "Cote d'Ivoire",
] as const

export const TRIAL_DAYS = 14

export const SCORE_THRESHOLDS = {
  high:   80,
  medium: 50,
} as const
