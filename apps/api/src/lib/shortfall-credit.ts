// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R166 ⑤ · P11, board #2357) — THE SHORTFALL CREDIT: ONCE PER CLIENT, 90 DAYS.
//
// Founder, from the options put to him: *"Once only, 90 days, new programmes"* — once per
// client, expires after 90 days; credit already promised as "never expires" is honoured. Still
// credit, never cash (R136 ④).
//
//   • ONCE PER CLIENT: a programme on the new terms (a size-band programme) earns a shortfall
//     credit only if the client has never had one from a new-terms programme. The settlement
//     still happens and records what was delivered — only the credit is 0, and it says why.
//   • 90 DAYS: the credit granted is stamped with an expiry. After it, that part of the wallet is
//     not available to spend. The expiring part is spent FIRST, which is in the client's favour.
//   • HONOURED: credit from programmes already running carries no expiry and is untouched.
//
// ⚠️ FAILS TOWARD THE CLIENT ON AN UNREADABLE EXPIRY. The expiry columns are read on their own;
// if they cannot be read, the whole balance is treated as available — the error that costs us a
// discount, never the one that takes away credit a client was promised.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

export const SHORTFALL_CREDIT_EXPIRY_DAYS = 90

export type CreditExpiry = { grantedAt: string | null; expiresAt: string | null; expiringCents: number }

/** The part of a wallet balance that may be spent now, in cents. Pure. */
export function availableCreditCents(balanceCents: number, expiry: CreditExpiry | null, now: Date = new Date()): number {
  const bal = Number.isFinite(balanceCents) ? Math.max(0, Math.floor(balanceCents)) : 0
  if (!expiry?.expiresAt) return bal
  if (now.getTime() <= new Date(expiry.expiresAt).getTime()) return bal
  // Expired: the expiring part (never more than the balance) is not spendable.
  return bal - Math.min(bal, Math.max(0, Math.floor(expiry.expiringCents)))
}

/** After spending `applied` cents: how much of the expiring credit is left. Expiring is spent first. Pure. */
export function expiringAfterSpend(expiry: CreditExpiry, applied: number, now: Date = new Date()): number {
  if (!expiry.expiresAt || now.getTime() > new Date(expiry.expiresAt).getTime()) return expiry.expiringCents
  return Math.max(0, expiry.expiringCents - Math.max(0, Math.floor(applied)))
}

/** The client's credit expiry, or null when unreadable (→ treated as no expiry). */
export async function readCreditExpiry(clientId: string): Promise<CreditExpiry | null> {
  try {
    const { data, error } = await db.from('clients')
      .select('shortfall_credit_granted_at, shortfall_credit_expires_at, shortfall_credit_expiring_cents')
      .eq('id', clientId).maybeSingle()
    if (error || !data) return null
    const r = data as { shortfall_credit_granted_at: string | null; shortfall_credit_expires_at: string | null; shortfall_credit_expiring_cents: number | null }
    return { grantedAt: r.shortfall_credit_granted_at, expiresAt: r.shortfall_credit_expires_at, expiringCents: Number(r.shortfall_credit_expiring_cents ?? 0) }
  } catch { return null }
}

/**
 * May a new-terms programme earn a shortfall credit for this client? Once per client.
 * ⚠️ An UNREADABLE record refuses (returns `unreadable`) — the settlement is then not made, so
 * the credit is neither given twice nor silently withheld; the operator retries.
 */
export async function bandCreditAllowed(clientId: string): Promise<'allowed' | 'already_used' | 'unreadable'> {
  try {
    const { data, error } = await db.from('clients').select('shortfall_credit_granted_at').eq('id', clientId).maybeSingle()
    if (error || !data) return 'unreadable'
    return (data as { shortfall_credit_granted_at: string | null }).shortfall_credit_granted_at ? 'already_used' : 'allowed'
  } catch { return 'unreadable' }
}

/** Stamp the once-only credit and its 90-day expiry. Compare-and-set: the first grant stands. */
export async function markBandCreditGranted(clientId: string, cents: number, now: Date = new Date()): Promise<boolean> {
  const expires = new Date(now.getTime() + SHORTFALL_CREDIT_EXPIRY_DAYS * 86_400_000)
  const { data, error } = await db.from('clients').update({
    shortfall_credit_granted_at: now.toISOString(),
    shortfall_credit_expires_at: expires.toISOString(),
    shortfall_credit_expiring_cents: Math.max(0, Math.floor(cents)),
  }).eq('id', clientId).is('shortfall_credit_granted_at', null).select('id')
  return !error && Array.isArray(data) && data.length > 0
}

/** After credit is spent at P1: reduce the expiring part (spent first). Never throws. */
export async function recordCreditSpent(clientId: string, applied: number): Promise<void> {
  if (!(applied > 0)) return
  const expiry = await readCreditExpiry(clientId)
  if (!expiry?.expiresAt || expiry.expiringCents <= 0) return
  const left = expiringAfterSpend(expiry, applied)
  if (left === expiry.expiringCents) return
  try {
    await db.from('clients').update({ shortfall_credit_expiring_cents: left }).eq('id', clientId)
  } catch (err) { console.error('[shortfall-credit] expiring balance not updated (the spend happened):', err) }
}
