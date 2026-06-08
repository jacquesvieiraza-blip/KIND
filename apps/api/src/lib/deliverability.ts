import crypto from 'crypto'

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERABILITY (Mon 8 Jun — D1–D4)
//
// Cold outreach is the #1 deliverability risk. This module centralises the fixes
// so every cold send site shares one correct implementation:
//   D1  List-Unsubscribe + one-click (RFC 8058) + a visible footer link
//   D2  a plain-text MIME alternative (HTML-only mail reads as spam)
//   D3  tracking pixel that NEVER embeds a bare platform host (phishing signal)
//   D4  a configurable cold-FROM on a dedicated, separately-warmed domain so cold
//       mail never poisons the transactional/corporate reputation of get-kind.com
// ─────────────────────────────────────────────────────────────────────────────

// D4 — cold outreach identity. MUST be a dedicated warmed domain in production,
// NOT the transactional domain. Falls back to the transactional identity only in
// dev (with a loud warning) so local sends still work.
const COLD_FROM_DEFAULT = 'K.I.N.D <hello@get-kind.com>'
export const COLD_FROM = process.env.FIGSY_COLD_FROM || COLD_FROM_DEFAULT
export const COLD_REPLY_TO =
  process.env.FIGSY_COLD_REPLY_TO || process.env.FIGSY_REPLY_TO || 'hello@get-kind.com'

if (process.env.NODE_ENV === 'production' && !process.env.FIGSY_COLD_FROM) {
  console.warn(
    '[deliverability] ⚠️  FIGSY_COLD_FROM not set — cold outreach is sending from the ' +
    'transactional domain (get-kind.com). This poisons transactional + corporate ' +
    'deliverability. Set FIGSY_COLD_FROM to a dedicated, separately-warmed cold domain.',
  )
}

const UNSUB_SECRET =
  process.env.UNSUBSCRIBE_SECRET ||
  process.env.ADMIN_SECRET_KEY ||
  process.env.RESEND_API_KEY ||
  'kind-unsub-dev-secret'

// Public base URL for unsubscribe links. Unlike the tracking pixel, the unsubscribe
// endpoint MUST resolve even if only the platform host is configured — a working
// one-click unsubscribe is required by Gmail/Yahoo bulk-sender rules, so a bare
// host here is acceptable (a link, not an invisible pixel).
function publicApiUrl(): string {
  return (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://kindapi-production-e64c.up.railway.app'
  ).replace(/\/$/, '')
}

// D3 — a branded tracking domain, or null. We refuse to embed a bare platform host
// (railway/onrender/vercel/heroku) in cold mail: an <img> pointing at a random
// *.up.railway.app URL is a classic phishing signal and tanks inbox placement.
// Better to lose open-tracking than to land in spam.
export function trackingBaseUrl(): string | null {
  const url = process.env.TRACKING_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || ''
  if (!url) return null
  if (/railway\.app|onrender\.com|vercel\.app|herokuapp\.com|\.run\.app/i.test(url)) return null
  return url.replace(/\/$/, '')
}

export function trackingPixelHtml(emailId: string | null): string {
  if (!emailId) return ''
  const base = trackingBaseUrl()
  if (!base) return '' // D3: no branded domain → no pixel
  return `<img src="${base}/figsy/track/open/${emailId}" width="1" height="1" style="display:none;width:1px;height:1px" alt="" />`
}

// ── Unsubscribe tokens (signed, stateless) ───────────────────────────────────
// token = base64url(email) + '.' + truncated HMAC. The endpoint verifies the
// signature without a DB lookup and the token is not enumerable/guessable.
export function unsubscribeToken(email: string): string {
  const data = Buffer.from(email.trim().toLowerCase()).toString('base64url')
  const sig = crypto.createHmac('sha256', UNSUB_SECRET).update(data).digest('base64url').slice(0, 24)
  return `${data}.${sig}`
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [data, sig] = (token || '').split('.')
  if (!data || !sig) return null
  const expected = crypto.createHmac('sha256', UNSUB_SECRET).update(data).digest('base64url').slice(0, 24)
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  try {
    return Buffer.from(data, 'base64url').toString('utf8') || null
  } catch {
    return null
  }
}

export function unsubscribeUrl(email: string): string {
  return `${publicApiUrl()}/figsy/unsubscribe/${unsubscribeToken(email)}`
}

// D1 — headers added to every cold send. List-Unsubscribe-Post enables Gmail/Yahoo
// one-click. The mailto: is included only when a monitored unsubscribe inbox is set.
export function unsubscribeHeaders(email: string): Record<string, string> {
  const url = unsubscribeUrl(email)
  const mailto = process.env.FIGSY_UNSUB_MAILTO // e.g. unsubscribe@cold-domain.com
  const listUnsub = mailto ? `<mailto:${mailto}?subject=unsubscribe>, <${url}>` : `<${url}>`
  return {
    'List-Unsubscribe': listUnsub,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

// D1 — a visible unsubscribe footer (required for compliance + reduces spam reports).
export function unsubscribeFooterHtml(email: string): string {
  const url = unsubscribeUrl(email)
  return (
    `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #eee;color:#999;font-size:0.75rem;line-height:1.5">` +
    `Don't want these emails? <a href="${url}" style="color:#999">Unsubscribe</a>.` +
    `</div>`
  )
}

// D2 — plain-text footer line appended to the text/plain alternative.
export function unsubscribeFooterText(email: string): string {
  return `\n\n—\nUnsubscribe: ${unsubscribeUrl(email)}`
}

// D2 — derive a reasonable text/plain alternative from rich HTML (for transactional
// mail whose source is HTML). Cold mail passes its raw text directly instead.
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8594;|&rarr;/g, '->')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
