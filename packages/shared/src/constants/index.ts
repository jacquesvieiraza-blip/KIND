export const PRODUCTS = {
  lead_gen: {
    name: 'AI Lead Generation',
    tiers: {
      starter:    { price_usd: 500,  leads_per_month: 100  },
      advanced:   { price_usd: 1200, leads_per_month: 500  },
      enterprise: { price_usd: 0,    leads_per_month: 0, custom: true },
    },
  },
  lead_gen_figsy: {
    name: 'Lead Gen + FIGSY Bundle',
    tiers: {
      starter:    { price_usd: 700,  leads_per_month: 100  },
      advanced:   { price_usd: 1500, leads_per_month: 500  },
      enterprise: { price_usd: 0,    leads_per_month: 0, custom: true },
    },
  },
  virtual_assistant: {
    name: 'Virtual Assistant',
    tiers: {
      starter:    { price_usd: 199, messages_per_month: 500   },
      pro:        { price_usd: 399, messages_per_month: 2000  },
      enterprise: { price_usd: 799, messages_per_month: 10000 },
    },
  },
  chatbot: {
    name: 'AI Chatbot Agent',
    tiers: {
      starter:    { price_usd: 199, conversations_per_month: 500   },
      pro:        { price_usd: 399, conversations_per_month: 2000  },
      enterprise: { price_usd: 799, conversations_per_month: 10000 },
    },
  },
} as const

export const FIGSY_ADDONS = {
  starter:    { price_usd: 300 },
  enterprise: { price_usd: 800 },
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
