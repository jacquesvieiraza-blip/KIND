export const PRODUCTS = {
  lead_gen: {
    name: 'AI Lead Generation',
    tiers: {
      starter:    { price_usd: 100,  price_zar: 1900,  leads_per_month: 50   },
      advanced:   { price_usd: 199,  price_zar: 3781,  leads_per_month: 200  },
      enterprise: { price_usd: 0,    price_zar: 0,     leads_per_month: 0, custom: true },
    },
  },
  lead_gen_figsy: {
    name: 'Lead Gen + FIGSY Bundle',
    tiers: {
      starter:    { price_usd: 399,  price_zar: 7581,  leads_per_month: 50   },
      advanced:   { price_usd: 699,  price_zar: 13281, leads_per_month: 200  },
      enterprise: { price_usd: 0,    price_zar: 0,     leads_per_month: 0, custom: true },
    },
  },
  virtual_assistant: {
    name: 'Virtual Assistant',
    tiers: {
      starter:    { price_usd: 200,  price_zar: 3800,  messages_per_month: 500   },
      pro:        { price_usd: 500,  price_zar: 9500,  messages_per_month: 2000  },
      enterprise: { price_usd: 0,    price_zar: 0,     messages_per_month: 0, custom: true },
    },
  },
  chatbot: {
    name: 'AI Chatbot Agent',
    tiers: {
      starter:    { price_usd: 200,  price_zar: 3800,  conversations_per_month: 500   },
      pro:        { price_usd: 400,  price_zar: 7600,  conversations_per_month: 2000  },
      enterprise: { price_usd: 0,    price_zar: 0,     conversations_per_month: 0, custom: true },
    },
  },
} as const

export const FIGSY_ADDONS = {
  starter:  { price_usd: 300, price_zar: 5700  },
  advanced: { price_usd: 500, price_zar: 9500  },
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
