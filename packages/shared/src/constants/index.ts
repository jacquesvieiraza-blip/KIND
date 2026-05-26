// ─────────────────────────────────────────────────────────────────────────────
// K.I.N.D Pricing — LOCKED. Never change without authorisation.
// Lead Gen:   $1/credit flat (no volume discounts — annual plans only)
// FIGSY:      $3/outreach-credit flat (no volume discounts — annual plans only)
// Milla VA:   $49/month flat
// Vida Chat:  $29/month flat
// Bundle:     $69/month (Milla + Vida)
// ─────────────────────────────────────────────────────────────────────────────

export const PRICING = {
  lead_gen: {
    name: 'K.I.N.D AI — Lead Generation',
    description: 'AI-sourced, AI-scored B2B leads matched to your ICP. 1 credit = 1 qualified lead found.',
    credit_rate_usd: 1.00,
    bundles: [
      { credits: 20,  price_usd: 20  },
      { credits: 40,  price_usd: 40  },
      { credits: 100, price_usd: 100 },
    ],
    trial_credits: 20,
    trial_days: 14,
  },
  figsy: {
    name: 'FIGSY — AI Outreach SDR',
    description: 'FIGSY handles replies, objections, follow-ups and meeting booking. 1 outreach credit = 1 lead enrolled.',
    credit_rate_usd: 3.00,
    bundles: [
      { credits: 20,  price_usd: 60  },
      { credits: 40,  price_usd: 120 },
      { credits: 100, price_usd: 300 },
    ],
  },
} as const

export const PRODUCTS = {
  virtual_assistant: {
    name: 'Milla — AI Virtual Assistant',
    description: 'Internal AI assistant trained on your documents and tone. Handles Q&A, drafts, briefings.',
    price_usd: 49,
    billing: 'monthly' as const,
  },
  chatbot: {
    name: 'Vida — AI Chatbot Agent',
    description: 'Website chatbot that qualifies leads 24/7 and alerts you when someone is hot.',
    price_usd: 29,
    billing: 'monthly' as const,
  },
  bundle: {
    name: 'Milla + Vida Bundle',
    description: 'Both AI team members at a discount.',
    price_usd: 69,
    billing: 'monthly' as const,
    saves_usd: 9,
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
