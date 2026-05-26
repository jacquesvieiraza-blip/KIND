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

  // Payments — Stripe is primary. Paystack removed (requires SA entity).
  { key: 'STRIPE_SECRET_KEY',         level: 'important', description: 'Stripe — subscription billing' },
  { key: 'PAYSTACK_SECRET_KEY',       level: 'optional',  description: 'Paystack — legacy only, not in use (removed from billing UI)' },
  { key: 'STRIPE_WEBHOOK_SECRET',     level: 'important', description: 'Stripe webhook validation — payments not activated without this' },

  // Email
  { key: 'RESEND_API_KEY',            level: 'critical',  description: 'Resend — all outbound email (sequences, digests, alerts)' },

  // Lead enrichment
  { key: 'APOLLO_API_KEY',            level: 'important', description: 'Apollo — lead sourcing and enrichment' },

  // App URLs
  { key: 'PORTAL_URL',                level: 'important', description: 'Portal URL — used in email links and CORS' },

  // WhatsApp (optional until approved)
  { key: 'WHATSAPP_TOKEN',            level: 'optional',  description: 'WhatsApp Cloud API — Vida chatbot (apply at developers.facebook.com)' },
  { key: 'WHATSAPP_PHONE_NUMBER_ID',  level: 'optional',  description: 'WhatsApp Phone Number ID' },
  { key: 'WHATSAPP_VERIFY_TOKEN',     level: 'optional',  description: 'WhatsApp webhook verify token' },

  // Internal
  { key: 'ADMIN_SECRET_KEY',          level: 'important', description: 'Admin API auth secret' },
]

export function runStartupCheck(): void {
  const missing: VarSpec[]  = []
  const warnings: VarSpec[] = []
  const optional: VarSpec[] = []

  for (const spec of REQUIRED_VARS) {
    const val = process.env[spec.key]
    if (!val || val.trim() === '') {
      if (spec.level === 'critical')  missing.push(spec)
      if (spec.level === 'important') warnings.push(spec)
      if (spec.level === 'optional')  optional.push(spec)
    }
  }

  const lines: string[] = ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━']
  lines.push('  K.I.N.D API — STARTUP CHECK')
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

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log(lines.join('\n'))

  if (missing.length > 0) {
    throw new Error(
      `Startup aborted — ${missing.length} critical env var(s) missing: ${missing.map(v => v.key).join(', ')}`
    )
  }
}
