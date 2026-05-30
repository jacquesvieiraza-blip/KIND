import { randomBytes } from 'crypto'
import { db } from '@kind/db'

/**
 * Generate a cryptographically-secure consent token.
 * 32 random bytes → 64 hex chars. Replaces the old practice of using the lead's
 * UUID as the token, which was guessable/enumerable.
 */
export function generateConsentToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Return the lead's existing consent token, or mint + persist a new one.
 * Every consent-email send-site calls this so the public /consent link carries
 * an unguessable token instead of the lead's id.
 */
export async function getOrCreateConsentToken(
  lead: { id: string; consent_token?: string | null },
): Promise<string> {
  if (lead.consent_token) return lead.consent_token
  const token = generateConsentToken()
  await db.from('leads').update({ consent_token: token }).eq('id', lead.id)
  return token
}

/** Build the public POPIA consent URL for a lead given its secure token. */
export function buildConsentUrl(leadId: string, token: string): string {
  const portalUrl = process.env.PORTAL_URL || 'https://app.get-kind.com'
  return `${portalUrl}/consent?lead=${leadId}&token=${token}`
}
