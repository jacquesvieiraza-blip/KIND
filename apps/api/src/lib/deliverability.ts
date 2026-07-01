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
// The platform-host filter applies to TRACKING_URL too — an inbox spam filter does
// not care who set the URL; only a branded domain (e.g. track.gettingkind.com) is
// safe to embed. A bare platform host is refused no matter which env var supplied it.
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

// COLD-EMAIL HTML (17 Jun) — deliberately near-plain so it reads as a personal 1:1
// email and lands in Primary, not Promotions/Updates. A genuine personal email has
// NONE of these, and each is a "this is bulk/marketing" signal Gmail tabs on:
//   • a tracking pixel (1×1 <img>)        • an image/banner
//   • a visible "Unsubscribe" footer       • a templated max-width, centered shell
// So cold mail is now a bare <div> with default styling and <br> line breaks — exactly
// what Gmail's own compose produces. Compliance is still met by the one-click
// List-Unsubscribe header (unsubscribeHeaders) + the "Reply STOP to opt out." line the
// FIGSY prompt always puts in the body.
// Open tracking re-enabled 29 Jun (founder decision). Pixel is included when emailId
// is passed and TRACKING_URL is set. Near-plain HTML is preserved for deliverability.
export function coldEmailHtml(body: string, emailId: string | null = null): string {
  const lines = (body || '').split('\n').map(line => (line.length ? line : '')).join('<br>')
  const pixel = emailId ? trackingPixelHtml(emailId) : ''
  return `<div dir="ltr" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.5">${lines}${pixel}</div>`
}

// Warmup ramp schedule — given a YYYY-MM-DD start date, returns the cold-send cap
// for "today" (day 1 = the start date): ≤10 days 1–3 · 20 day 4 · 30 days 5–6 ·
// 40 days 7–8 · 50 day 9+. Pure, with an injectable clock so it's testable.
export function warmupRampCap(startStr: string, now: number = Date.now()): number | null {
  const start = Date.parse(`${startStr}T00:00:00Z`)
  if (!Number.isFinite(start)) return null
  const day = Math.floor((now - start) / 86_400_000) + 1 // day 1 = start date
  if (day <= 3) return 10   // includes pre-start days
  if (day === 4) return 20
  if (day <= 6) return 30
  if (day <= 8) return 40
  return 50                  // warmup complete → steady 50/day ceiling
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

// R17 (#43/#44, Instantly) — pre-send spam scoring. A fast, dependency-free
// heuristic that flags the things that tank cold-email deliverability, so a
// client can fix a draft BEFORE it sends. Returns a 0–100 score (100 = clean)
// plus a grade and the specific issues found. Not a spam-filter oracle — a
// practical checklist mirroring what real filters and humans react to.
export interface SpamCheckResult {
  score: number
  grade: 'great' | 'good' | 'risky'
  issues: { severity: 'high' | 'medium' | 'low'; message: string }[]
}

const SPAM_PHRASES = [
  'free', 'act now', 'limited time', 'click here', 'buy now', 'order now',
  'guarantee', 'guaranteed', 'no obligation', 'risk free', 'risk-free',
  '100%', 'cash', 'cheap', 'discount', 'offer expires', 'urgent',
  'congratulations', 'winner', 'you have been selected', 'special promotion',
  'amazing', 'incredible deal', 'best price', 'lowest price', 'earn money',
  'make money', 'extra income', 'double your', 'this is not spam', 'dear friend',
]

export function spamScore(subject: string, body: string): SpamCheckResult {
  const issues: SpamCheckResult['issues'] = []
  let score = 100
  const subj = (subject || '').trim()
  const text = (body || '')
  const lower = `${subj}\n${text}`.toLowerCase()

  // Spam trigger phrases.
  const hits = SPAM_PHRASES.filter(p => lower.includes(p))
  if (hits.length) {
    score -= Math.min(30, hits.length * 8)
    issues.push({ severity: hits.length > 2 ? 'high' : 'medium',
      message: `Spam-trigger ${hits.length === 1 ? 'word' : 'words'}: ${hits.slice(0, 5).join(', ')}` })
  }

  // ALL-CAPS words (3+ letters).
  const caps = (text.match(/\b[A-Z]{3,}\b/g) || []).filter(w => w !== 'STOP')
  if (caps.length >= 2) { score -= 10; issues.push({ severity: 'medium', message: `Shouty ALL-CAPS words (${caps.slice(0, 3).join(', ')})` }) }

  // Excessive exclamation marks.
  const bangs = (text.match(/!/g) || []).length
  if (bangs >= 3) { score -= 10; issues.push({ severity: 'medium', message: `Too many exclamation marks (${bangs})` }) }

  // Subject line checks.
  if (subj.length > 60) { score -= 8; issues.push({ severity: 'low', message: 'Subject is long — under 50 chars lands better' }) }
  if (/[A-Z]{4,}/.test(subj)) { score -= 8; issues.push({ severity: 'medium', message: 'Subject contains ALL-CAPS' }) }
  if (subj.includes('!')) { score -= 6; issues.push({ severity: 'low', message: 'Exclamation mark in the subject reads as marketing' }) }
  if (!subj) { score -= 15; issues.push({ severity: 'high', message: 'No subject line' }) }

  // Link density.
  const links = (text.match(/https?:\/\//g) || []).length
  if (links >= 3) { score -= 12; issues.push({ severity: 'high', message: `Too many links (${links}) — cold email should have 0–1` }) }

  // Dollar/money symbols.
  if ((text.match(/\$|€|£/g) || []).length >= 2) { score -= 8; issues.push({ severity: 'medium', message: 'Multiple currency symbols read as salesy' }) }

  // Length — extremely long cold emails underperform and look like newsletters.
  const words = text.split(/\s+/).filter(Boolean).length
  if (words > 200) { score -= 8; issues.push({ severity: 'low', message: `Long body (${words} words) — cold email works best under ~120` }) }

  score = Math.max(0, Math.min(100, score))
  const grade: SpamCheckResult['grade'] = score >= 85 ? 'great' : score >= 65 ? 'good' : 'risky'
  return { score, grade, issues }
}
