import crypto from 'crypto'
import { POSTAL_FOOTER_LINE } from '@kind/shared'

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

// ── HC-2 — THE UNSUBSCRIBE SIGNING KEY ────────────────────────────────────────
//
// This secret signs the token in every unsubscribe link we send. Forge it and you can
// suppress anybody in the book; lose it and every link already in somebody's inbox stops
// verifying. It used to fall through to a string published in this repository.
//
// ⚠️ WHAT THE ORIGINAL HARD-CHECK WRITE-UP GOT WRONG, corrected 19 Aug rather than repeated:
// HC-2 was logged as "tokens may be signed with a string anyone can read". Reading the whole
// chain, that end of the fallback is effectively UNREACHABLE in production — it needs
// UNSUBSCRIBE_SECRET, ADMIN_SECRET_KEY *and* RESEND_API_KEY all unset, and RESEND_API_KEY is
// boot-critical, so the API would not be running at all. The REAL defect is the middle of the
// chain: with UNSUBSCRIBE_SECRET unset, the ADMIN key silently becomes the signing key — one
// secret doing two jobs, so rotating the admin key invalidates every unsubscribe link ever
// sent, and anybody holding the admin key can mint them. That is what this closes.
const DEV_UNSUB_SECRET = 'kind-unsub-dev-secret'

/**
 * Is this a real production API, as opposed to local, test or staging?
 *
 * Staging is deliberately excluded: `startup-check.ts` already downgrades every critical var
 * except the two Supabase ones when `IS_STAGING` is set, and a preview deploy that refuses to
 * send is a preview deploy nobody can walk (RULEBOOK §11 — client-facing work is previewed
 * FIRST, so the preview has to work).
 */
function isProductionApi(): boolean {
  return process.env.NODE_ENV === 'production' && process.env.IS_STAGING !== 'true'
}

/**
 * Resolve the signing secret, and say which rung of the ladder it came from.
 *
 * Read per call rather than frozen in a module constant. The constant form could not be tested
 * — the value was baked at import, so no test could show the production refusal actually
 * firing, and an untested refusal is a comment, not a guard.
 */
export function resolveUnsubSecret(): { secret: string; source: 'dedicated' | 'admin_key' | 'resend_key' | 'dev_fallback' } {
  if (process.env.UNSUBSCRIBE_SECRET) return { secret: process.env.UNSUBSCRIBE_SECRET, source: 'dedicated' }
  if (process.env.ADMIN_SECRET_KEY)   return { secret: process.env.ADMIN_SECRET_KEY,   source: 'admin_key' }
  if (process.env.RESEND_API_KEY)     return { secret: process.env.RESEND_API_KEY,     source: 'resend_key' }
  return { secret: DEV_UNSUB_SECRET, source: 'dev_fallback' }
}

/**
 * The secret to SIGN with — and in production it refuses rather than signs.
 *
 * FAILS CLOSED, founder-ruled 19 Aug. `unsubscribeHeaders()` is called inside the send path
 * (figsy.ts:830 and :1390), so throwing here stops the send. That is deliberate: cold mail
 * without a working one-click unsubscribe breaks Gmail/Yahoo bulk-sender rules on its own, so
 * "send anyway with a link nobody can verify" is not the safer half — it is the same
 * violation with the evidence hidden.
 */
function signingSecret(): string {
  const { secret, source } = resolveUnsubSecret()
  if (source === 'dev_fallback' && isProductionApi()) {
    throw new Error(
      'UNSUBSCRIBE_SECRET is not set on this production API, and the only remaining fallback is ' +
      'the development constant published in this repository. Refusing to sign an unsubscribe ' +
      'link nobody could trust — set UNSUBSCRIBE_SECRET in Railway → @kind/api.',
    )
  }
  return secret
}

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

// ── HC-6 — OPEN TRACKING IS OFF. FOUNDER-RULED 20 Aug. ────────────────────────────────────
//
// ⛓️ **THIS CHAINS HIS OWN 29-JUN RULING, IT DOES NOT CORRECT A BUG.** On 29 Jun he
// re-enabled this pixel (PR #814) as part of rebuilding the deliverability stack after 310
// cold emails from the wrong domain went to spam. That was the right call then: nothing was
// landing, and opens were the only signal available to prove mail was arriving at all.
//
// WHAT CHANGED. Three things, and none of them is "the old ruling was wrong":
//
//   ① **It tracks a NAMED person and we never told them.** `emailId` resolves through
//      `figsy_sent_emails` to `lead_id` to a real prospect at a real company. That is
//      individual-level behavioural data on someone who never heard of us — and the privacy
//      policy does not mention open tracking anywhere. Under UK GDPR that processing needs a
//      lawful basis and Art. 13/14 transparency regardless of how PECR reg. 6 reads on the
//      mechanism. (On the mechanism: this was a plain remote image — no cookie, no device
//      storage, no device read — so reg. 6 was arguable rather than automatic. The point is
//      that we would have been arguing it, five days before launch, over a metric we do not
//      sell on.)
//
//   ② **MEETINGS ARE THE NORTH STAR, AND THIS FED THE PICKER THAT IGNORED THAT.** The A/B
//      winner-picker (`routes/internal.ts`) chooses the winning subject line **by open rate**
//      and marks the test resolved IRREVERSIBLY. So the product was tuning its own copy
//      toward opens while `MEETING_BOOKED` is the ruled outcome. Logged as F14; Prompt 27 is
//      the real fix. With no opens the picker's `MIN_OPENS_TO_RESOLVE` guard (#392) simply
//      never trips, so it goes INERT rather than wrong — the safer of the two states, and the
//      reason turning the pixel off does not have to wait for Prompt 27.
//
//   ③ It bought us nothing we act on. Nothing downstream changes a decision on an open
//      except that picker; the rest is dashboard numbers.
//
// WHAT THIS DOES NOT DO. `trackingBaseUrl()` and the `/figsy/track/open/:emailId` endpoint
// both STAY. The endpoint must keep answering, because pixels already sitting in prospects'
// inboxes from earlier sends will keep requesting it — removing it would turn those into
// broken-image requests and 404s in the logs. It simply stops being fed new work.
//
// TO TURN IT BACK ON: delete the early return below. That is deliberately a one-line change
// on the founder's word, exactly as re-enabling it was in June.
export function trackingPixelHtml(_emailId: string | null): string {
  return ''
}

/**
 * The pixel as it was built, kept so the shape is readable rather than reconstructed from a
 * commit if he ever rules it back on. Called by nothing (CORE-MAP rule 3 — nothing is deleted).
 */
export function trackingPixelHtmlDisabled(emailId: string | null): string {
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
  const sig = crypto.createHmac('sha256', signingSecret()).update(data).digest('base64url').slice(0, 24)
  return `${data}.${sig}`
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [data, sig] = (token || '').split('.')
  if (!data || !sig) return null
  // VERIFY does NOT go through signingSecret(). Signing refuses in production; verifying must
  // not, or a link already sitting in somebody's inbox would stop working the moment the env
  // changed — and the person on the other end of that link is trying to OPT OUT. Refusing to
  // honour an opt-out is the one failure this whole file exists to prevent.
  const expected = crypto.createHmac('sha256', resolveUnsubSecret().secret).update(data).digest('base64url').slice(0, 24)
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
// ⛓️ CORRECTED 20 Aug — the line here read "Open tracking re-enabled 29 Jun (founder
// decision). Pixel is included when emailId is passed and TRACKING_URL is set." That became
// FALSE the same morning, when HC-6 turned the pixel off, and I left it standing: a comment
// describing the opposite of the code beneath it, written by the person who changed the code.
// Caught by the CAN-SPAM audit reading this file end to end hours later. Near-plain HTML is
// preserved for deliverability; the footer below is the one deliberate addition (CAN-SPAM).
// ── THE CAN-SPAM POSTAL FOOTER ────────────────────────────────────────────────────────────
//
// **§7704(a)(5)(A)(iii): a valid physical postal address of the sender, in every commercial
// message.** The 20 Aug audit found it in NO cold email — not the body, not a footer, not a
// header. It is the least arguable requirement in the statute: nothing to interpret, no
// exemption to weigh, the address is either there or it is not.
//
// ⚠️ ONE CONSTANT, TWO BODIES. `text` and `html` are separate arguments to `sendAs`, and the
// text part is what a plain-text client actually renders — so a footer added to only the HTML
// would be missing for exactly the readers most likely to be running a strict client. Both are
// built here from `POSTAL_FOOTER_LINE` so they cannot drift apart, and both are asserted.
//
// ⚠️ DELIBERATELY PLAIN, AND THAT IS NOT LAZINESS. `coldEmailHtml`'s header records that the
// pixel, the banner, the visible unsubscribe footer and the templated shell were all stripped
// so cold mail lands in Primary rather than Promotions. A styled compliance block would undo
// that work. This is one small grey line — the minimum the law asks for and the least
// promotional shape it can take.
//
// The separator is a blank line then the entity and address. Nothing else: no "unsubscribe"
// link (the one-click header carries that, deliberately — see the note above), no logo.

/** The plain-text body a cold message actually sends, footer included. */
export function coldEmailText(body: string): string {
  return `${(body || '').trimEnd()}\n\n${POSTAL_FOOTER_LINE}`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function coldEmailHtml(body: string, emailId: string | null = null): string {
  const lines = (body || '').split('\n').map(line => (line.length ? line : '')).join('<br>')
  const pixel = emailId ? trackingPixelHtml(emailId) : ''
  // Escaped: the address is a founder-supplied string that ends up inside markup, and an
  // ampersand in a future address would otherwise produce broken HTML in a real inbox.
  const footer =
    `<div style="margin-top:16px;color:#888;font-size:12px">${escapeHtml(POSTAL_FOOTER_LINE)}</div>`
  return `<div dir="ltr" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.5">${lines}${pixel}${footer}</div>`
}

// ── #622 THE CAP LADDER, AS NAMED STEPS ───────────────────────────────────────────────────
//
// A6's standing recommendation is "30 → 50/day", and until now those numbers existed only as
// bare literals inside the function below — so the ladder the founder rules on and the ladder
// the engine enforces were the same thing by coincidence, not by construction. Named here so
// the runbook, the Vida chip and the send loop all quote ONE source.
//
// ⚠️ THIS IS A CEILING, NOT A TARGET. The engine sends what there is to send; the cap only ever
// refuses. Raising the top step does not increase volume by itself.
export const WARMUP_LADDER: ReadonlyArray<{ throughDay: number | null; cap: number }> = [
  { throughDay: 3,    cap: 10 },   // days 1–3, and every day before the start date
  { throughDay: 4,    cap: 20 },   // day 4
  { throughDay: 6,    cap: 30 },   // days 5–6   ← A6's "30"
  { throughDay: 8,    cap: 40 },   // days 7–8
  { throughDay: null, cap: 50 },   // day 9+     ← A6's "50", the steady-state ceiling
]

/** The ladder's steady-state ceiling — what the cap becomes once warmup is complete. */
export const WARMUP_STEADY_CAP = WARMUP_LADDER[WARMUP_LADDER.length - 1].cap

// Warmup ramp schedule — given a YYYY-MM-DD start date, returns the cold-send cap for "today"
// (day 1 = the start date), read off WARMUP_LADDER above. Pure, with an injectable clock so it
// is testable without waiting nine days.
export function warmupRampCap(startStr: string, now: number = Date.now()): number | null {
  const start = Date.parse(`${startStr}T00:00:00Z`)
  if (!Number.isFinite(start)) return null
  const day = Math.floor((now - start) / 86_400_000) + 1 // day 1 = start date
  for (const step of WARMUP_LADDER) {
    if (step.throughDay === null || day <= step.throughDay) return step.cap
  }
  return WARMUP_STEADY_CAP
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
