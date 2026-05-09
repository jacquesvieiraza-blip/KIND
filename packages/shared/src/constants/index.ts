export const PRODUCTS = {
  lead_gen: {
    name: 'AI Lead Generation',
    tiers: {
      starter: { price_usd: 299, leads_per_month: 250 },
      pro: { price_usd: 599, leads_per_month: 750 },
      enterprise: { price_usd: 1200, leads_per_month: 2500 },
    },
  },
  virtual_assistant: {
    name: 'Virtual Assistant',
    tiers: {
      starter: { price_usd: 199, messages_per_month: 500 },
      pro: { price_usd: 399, messages_per_month: 2000 },
      enterprise: { price_usd: 799, messages_per_month: 10000 },
    },
  },
  chatbot: {
    name: 'AI Chatbot Agent',
    tiers: {
      starter: { price_usd: 199, conversations_per_month: 500 },
      pro: { price_usd: 399, conversations_per_month: 2000 },
      enterprise: { price_usd: 799, conversations_per_month: 10000 },
    },
  },
  consulting: {
    name: 'Monthly Consulting Retainer',
    tiers: {
      starter: { price_usd: 0, note: 'Not available' },
      pro: { price_usd: 1500, hours_per_month: 4 },
      enterprise: { price_usd: 3000, hours_per_month: 10 },
    },
  },
} as const

export const SUPPORTED_COUNTRIES = [
  'South Africa',
  'Nigeria',
  'Kenya',
  'Ghana',
  'Egypt',
  'Rwanda',
  'Tanzania',
  'Uganda',
  'Senegal',
  'Côte d\'Ivoire',
] as const

export const TRIAL_DAYS = 14
