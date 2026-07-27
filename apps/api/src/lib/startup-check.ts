/**
 * Startup environment variable check.
 * Called before the server starts listening.
 * Logs a clear summary of what's set, what's missing, and what's critical.
 *
 * CRITICAL vars → app refuses to start if missing
 * IMPORTANT vars → app starts but logs a warning (feature degraded)
 * OPTIONAL vars  → logged as info only
 */

interface VarSpec {
  key: string
  level: 'critical' | 'important' | 'optional'
  description: string
}

const REQUIRED_VARS: VarSpec[] = [
  // Core infrastructure
  { key: 'SUPABASE_URL',              level: 'critical',  description: 'Supabase project URL' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', level: 'critical',  description: 'Supabase service role key' },
  { key: 'ANTHROPIC_API_KEY',         level: 'critical',  description: 'Claude AI — FIGSY sequences, reply classification' },

  // Payments — Stripe is the only processor (#352 removed the last dead Paystack path).
  // NOTE: these fail SILENTLY at runtime (graceful no-op / disabled Buy button) — so they MUST be loud here.
  { key: 'STRIPE_SECRET_KEY',         level: 'important', description: 'Stripe — unset = no checkout, customers cannot pay' },
  { key: 'STRIPE_WEBHOOK_SECRET',     level: 'important', description: 'Stripe webhook — unset = customer charged but NEVER credited' },
  { key: 'STRIPE_PRICE_LEADGEN_20',   level: 'important', description: 'Stripe price ID — Lead Gen 20 bundle (checkout fails without it)' },
  { key: 'STRIPE_PRICE_LEADGEN_40',   level: 'important', description: 'Stripe price ID — Lead Gen 40 bundle' },
  { key: 'STRIPE_PRICE_LEADGEN_100',  level: 'important', description: 'Stripe price ID — Lead Gen 100 bundle' },
  { key: 'STRIPE_PRICE_FIGSY_20',     level: 'important', description: 'Stripe price ID — FIGSY 20 bundle' },
  { key: 'STRIPE_PRICE_FIGSY_40',     level: 'important', description: 'Stripe price ID — FIGSY 40 bundle' },
  { key: 'STRIPE_PRICE_FIGSY_100',    level: 'important', description: 'Stripe price ID — FIGSY 100 bundle' },

  // Email — Resend is THE send transport (sequences, FIGSY cold, digests, alerts)
  { key: 'RESEND_API_KEY',            level: 'critical',  description: 'Resend — all outbound email; unset = FIGSY records "sent" but sends NOTHING' },
  { key: 'RESEND_WEBHOOK_SECRET',     level: 'important', description: 'Resend inbound webhook — unset = client replies rejected (no reply capture)' },
  { key: 'FIGSY_COLD_FROM',           level: 'important', description: 'FIGSY cold From — unset = cold mail sends from hello@get-kind.com and POISONS the domain' },

  // Lead engine — we run PDL + Hunter. Apollo is optional/BYO, NOT used day-to-day.
  { key: 'PDL_API_KEY',               level: 'important', description: 'People Data Labs — PRIMARY lead sourcing; unset (with no Apollo) = zero leads' },
  { key: 'HUNTER_API_KEY',            level: 'important', description: 'Hunter.io — email reveal in the enrichment waterfall' },
  { key: 'APOLLO_API_KEY',            level: 'optional',  description: 'Apollo — optional / BYO-key; not used in the day-to-day PDL+Hunter stack' },

  // App URLs
  { key: 'PORTAL_URL',                level: 'important', description: 'Portal URL — used in email links and CORS' },

  // WhatsApp (optional until approved)
  { key: 'WHATSAPP_TOKEN',            level: 'optional',  description: 'WhatsApp Cloud API — Vida chatbot (apply at developers.facebook.com)' },
  { key: 'WHATSAPP_PHONE_NUMBER_ID',  level: 'optional',  description: 'WhatsApp Phone Number ID' },
  { key: 'WHATSAPP_VERIFY_TOKEN',     level: 'optional',  description: 'WhatsApp webhook verify token' },

  // Internal
  { key: 'ADMIN_SECRET_KEY',          level: 'important', description: 'Admin API auth secret' },
]

// In a staging/preview deployment we want the API to boot with ONLY the staging
// database creds — no production secrets (Anthropic, Resend, Stripe, …) should
// ever live in the isolated staging environment. When IS_STAGING=true, only the
// Supabase vars stay critical; everything else degrades to a warning so AI/email/
// payment features no-op gracefully instead of aborting startup.
const STAGING = process.env.IS_STAGING === 'true' || process.env.NEXT_PUBLIC_IS_STAGING === 'true'
const STAGING_CRITICAL = new Set(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])

export function runStartupCheck(): void {
  const missing: VarSpec[]  = []
  const warnings: VarSpec[] = []
  const optional: VarSpec[] = []

  for (const spec of REQUIRED_VARS) {
    const val = process.env[spec.key]
    if (!val || val.trim() === '') {
      // Staging: keep only the DB vars hard-critical; downgrade the rest to warnings.
      const level = STAGING && spec.level === 'critical' && !STAGING_CRITICAL.has(spec.key)
        ? 'important'
        : spec.level
      if (level === 'critical')  missing.push(spec)
      if (level === 'important') warnings.push(spec)
      if (level === 'optional')  optional.push(spec)
    }
  }

  const lines: string[] = ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━']
  lines.push('  K.I.N.D API — STARTUP CHECK' + (STAGING ? '  ·  🧪 STAGING MODE (secrets optional)' : ''))
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const total    = REQUIRED_VARS.length
  const setCount = total - missing.length - warnings.length - optional.length
  lines.push(`  ✅ ${setCount}/${total - optional.length} required vars set`)

  if (missing.length > 0) {
    lines.push(`\n  ❌ CRITICAL — app cannot start:`)
    for (const v of missing) {
      lines.push(`     ${v.key.padEnd(30)} → ${v.description}`)
    }
  }

  if (warnings.length > 0) {
    lines.push(`\n  ⚠️  IMPORTANT — feature degraded:`)
    for (const v of warnings) {
      lines.push(`     ${v.key.padEnd(30)} → ${v.description}`)
    }
  }

  if (optional.length > 0) {
    lines.push(`\n  ℹ️  OPTIONAL — not yet configured:`)
    for (const v of optional) {
      lines.push(`     ${v.key.padEnd(30)} → ${v.description}`)
    }
  }

  // ── 🚦 GO-LIVE READINESS — capability-level, impossible to miss ──────────────
  // Each go-live capability fails SILENTLY at runtime if its config is missing, so
  // we surface ON/OFF here loudly. (Skipped in staging — secrets intentionally absent.)
  if (!STAGING) {
    const isSet = (k: string) => !!process.env[k] && process.env[k]!.trim() !== ''
    const capability = (label: string, vars: string[]) => {
      const miss = vars.filter(k => !isSet(k))
      return { label, ok: miss.length === 0, miss }
    }
    const caps = [
      capability('💳 PAYMENTS   (customers can pay)',     ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_LEADGEN_20', 'STRIPE_PRICE_LEADGEN_40', 'STRIPE_PRICE_LEADGEN_100', 'STRIPE_PRICE_FIGSY_20', 'STRIPE_PRICE_FIGSY_40', 'STRIPE_PRICE_FIGSY_100']),
      capability('🎯 LEAD ENGINE (deliver leads)',        ['PDL_API_KEY', 'HUNTER_API_KEY', 'ANTHROPIC_API_KEY']),
      capability('✉️  CLIENT SENDING (FIGSY emails)',      ['RESEND_API_KEY', 'ANTHROPIC_API_KEY', 'ADMIN_SECRET_KEY', 'FIGSY_COLD_FROM']),
    ]
    lines.push('  🚦 GO-LIVE READINESS')
    for (const c of caps) {
      lines.push(c.ok
        ? `     ✅ ${c.label}`
        : `     ❌ ${c.label}  — MISSING: ${c.miss.join(', ')}`)
    }
    const offCount = caps.filter(c => !c.ok).length
    if (offCount > 0) {
      lines.push('')
      lines.push(`  🚨🚨  ${offCount} GO-LIVE CAPABILITY${offCount === 1 ? '' : 'IES'} OFF — these fail SILENTLY in prod. Set the vars above before claiming "ready". 🚨🚨`)
    }
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log(lines.join('\n'))

  if (missing.length > 0) {
    throw new Error(
      `Startup aborted — ${missing.length} critical env var(s) missing: ${missing.map(v => v.key).join(', ')}`
    )
  }
}
