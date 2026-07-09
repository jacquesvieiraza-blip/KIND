// ─────────────────────────────────────────────────────────────────────────────
// K.I.N.D Pricing — LOCKED. Never change without authorisation.
// Lead Gen:   $1/credit flat (no volume discounts — annual plans only)
// FIGSY:      $3/outreach-credit flat (no volume discounts — annual plans only)
// Milla VA:   $49/month flat
// Vida Chat:  $29/month flat
// Bundle:     $69/month (Milla + Vida)
// ─────────────────────────────────────────────────────────────────────────────

export const PRICING = {
  // ✅ UN-RETIRED (#420/#394, 9 Jul) — the $1 tier is BACK as the REVEAL tier of the
  // per-qualified-lead model: leads arrive masked; $1 (credit_balance) unmasks the
  // email (try_charge_reveal_credit); +$3 FIGSY work = $4 fully-worked. Bundles are
  // prepaid reveal packs. (Was retired by #284 when the site sold FIGSY-only.)
  // trial_credits/trial_days below are LEGACY (#425/#431 — signup now grants a
  // 20-reveal + 5-work welcome mix with no expiry; no trials in the model).
  lead_gen: {
    name: 'K.I.N.D AI — Lead-Gen (the database)',
    description: 'Net-new, ICP-matched, verified B2B contacts. $1 reveals a lead — suppression-checked, CRM-deduped, scored 0-100.',
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
  // Denise — The Closer. Price LOCKED at $39/mo (founder, 3 Jul — resolving the
  // $39-portal vs $99-website conflict, #301). This is now the single source of
  // truth; the portal imports it. (The static website HTML must be synced by hand.)
  denise: {
    name: 'Denise — The Closer',
    description: 'Warm follow-up on quiet prospects, confirms meetings, drafts proposals.',
    price_usd: 39,
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
