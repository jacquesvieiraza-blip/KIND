// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R166 ② · P7, board #2353) — FIND THE CLIENT'S COMPANY SIZE, SET THE BAND, LOCK IT.
//
// Founder: *"Three: 1–50, 51–200, 200+"* by the client's OWN company size, never chosen by the
// client; unknown size (free email, no website, not found) → *"A person reviews it"*.
//
// HOW:
//   ① The company is the client's WEBSITE (from the Brief). Their login email must be a business
//     address on the same company — a free mailbox, or a different company's domain, cannot
//     confirm who they are, so a person decides.
//   ② ONE Apollo organisation lookup by that domain, for its headcount. Once per client: the band
//     is then LOCKED, so the price a client was shown cannot move under them.
//   ③ Anything unknown → `size_review_reason` + a Needs-you task. A person sets the band in Vida.
//
// 🛑 DEMO ACCOUNTS NEVER CALL APOLLO (R164) — a person sets theirs. 🛑 NEVER A GUESS: no
// headcount means review, not "Founders by default" (that would under-price an enterprise).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'
import { bandForEmployees, isSizeBand, type SizeBand, type SizeReviewReason, SIZE_REVIEW_REASON_COPY } from '@kind/shared'
import { isGenericEmailDomain } from './email-hygiene'
import { apolloBase } from './provider-hosts'

/** The bare registrable-looking host of a website or email domain: lower-case, no www. Pure. */
export function domainOf(input: string | null | undefined): string | null {
  const raw = String(input ?? '').trim().toLowerCase()
  if (!raw) return null
  const host = raw.includes('@') ? raw.split('@').pop()! : raw.replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0]
  const clean = host.replace(/^www\./, '').replace(/:\d+$/, '').replace(/\.$/, '')
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(clean) ? clean : null
}

/** Same company: identical, or one is a sub-domain of the other (mail.acme.com ~ acme.com). Pure. */
function sameCompany(a: string, b: string): boolean {
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`)
}

/**
 * Which domain to look up, or why a person must decide. Pure.
 * The website is the company; the login email must agree with it.
 */
export function sizeLookupPlan(input: { website: string | null | undefined; email: string | null | undefined }):
  | { lookup: string }
  | { review: SizeReviewReason } {
  const site = domainOf(input.website)
  const mail = domainOf(input.email)
  if (!mail || isGenericEmailDomain(mail)) return { review: 'free_email' }
  if (!site) return { review: 'no_website' }
  if (!sameCompany(site, mail)) return { review: 'domain_mismatch' }
  return { lookup: site }
}

/** Apollo's headcount for a company domain. `null` = Apollo has none; throws = unreachable. */
export async function apolloOrgHeadcount(domain: string): Promise<number | null> {
  const key = process.env.APOLLO_API_KEY
  if (!key) throw new Error('APOLLO_API_KEY is not set')
  const r = await fetch(`${apolloBase()}/organizations/enrich?domain=${encodeURIComponent(domain)}`, {
    headers: { 'x-api-key': key, accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`Apollo organisation lookup answered ${r.status}`)
  const j = await r.json().catch(() => null) as { organization?: { estimated_num_employees?: number | null; num_employees?: number | null } | null } | null
  const org = j?.organization
  for (const raw of [org?.estimated_num_employees, org?.num_employees]) {
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 1) return Math.round(n)
  }
  return null
}

export type ClientSize =
  | { status: 'set'; band: SizeBand; employees: number | null; source: 'apollo' | 'person'; lockedAt: string }
  | { status: 'review'; reason: SizeReviewReason; message: string }
  | { status: 'unreadable'; message: string }

type ClientSizeRow = {
  id: string; user_id: string | null; website: string | null; is_demo?: boolean | null
  size_band: string | null; size_employees: number | null; size_source: string | null
  size_review_reason: string | null; size_locked_at: string | null
}

const COLUMNS = 'id, user_id, website, is_demo, size_band, size_employees, size_source, size_review_reason, size_locked_at'

function fromRow(row: ClientSizeRow): ClientSize | null {
  if (row.size_locked_at && isSizeBand(row.size_band)) {
    return { status: 'set', band: row.size_band, employees: row.size_employees, source: row.size_source === 'apollo' ? 'apollo' : 'person', lockedAt: row.size_locked_at }
  }
  return null
}

async function loginEmail(userId: string | null): Promise<string | null> {
  if (!userId) return null
  try {
    const { data } = await db.auth.admin.getUserById(userId)
    return data?.user?.email ?? null
  } catch { return null }
}

async function markReview(clientId: string, reason: SizeReviewReason, wasReason: string | null): Promise<ClientSize> {
  const now = new Date().toISOString()
  await db.from('clients').update({ size_review_reason: reason, size_checked_at: now })
    .eq('id', clientId).is('size_locked_at', null)
  // One Needs-you task per reason, not one per check.
  if (wasReason !== reason) {
    const { sendFounderAlert } = await import('./alerts')
    void sendFounderAlert('support_escalation', 'A client’s company size needs a person', [
      SIZE_REVIEW_REASON_COPY[reason],
      'Set their size band in Vida → the client → Client tools → Programme → "Company size" (R166 ②). Their price per meeting depends on it.',
    ], { clientId, subjectKind: 'client_size', subjectId: clientId })
  }
  return { status: 'review', reason, message: SIZE_REVIEW_REASON_COPY[reason] }
}

/**
 * The client's band — found and locked if it can be, or marked for a person. Idempotent: a
 * locked band is returned as it is, and Apollo is asked at most once per client.
 */
export async function ensureClientSize(clientId: string, opts: { email?: string | null; force?: boolean } = {}): Promise<ClientSize> {
  const { data, error } = await db.from('clients').select(COLUMNS).eq('id', clientId).maybeSingle()
  if (error || !data) return { status: 'unreadable', message: 'The client could not be read.' }
  const row = data as ClientSizeRow
  const done = fromRow(row)
  if (done) return done

  // ⚠️ ALREADY WAITING FOR A PERSON → NOT ASKED AGAIN. The calculator reads this on every
  // slider move; re-running the lookup each time would spend a credit per move. Only Vida's
  // "Check with Apollo" (`force`) asks again.
  if (row.size_review_reason && !opts.force) {
    const r = row.size_review_reason as SizeReviewReason
    return { status: 'review', reason: r, message: SIZE_REVIEW_REASON_COPY[r] ?? 'A person is confirming the size.' }
  }
  if (row.is_demo === true) return markReview(clientId, 'not_found', row.size_review_reason)

  const plan = sizeLookupPlan({ website: row.website, email: opts.email ?? await loginEmail(row.user_id) })
  if ('review' in plan) return markReview(clientId, plan.review, row.size_review_reason)

  let employees: number | null
  try {
    employees = await apolloOrgHeadcount(plan.lookup)
  } catch (err) {
    console.error('[client-size] Apollo lookup failed:', err instanceof Error ? err.message : err)
    return markReview(clientId, 'lookup_failed', row.size_review_reason)
  }
  const band = bandForEmployees(employees)
  if (!band) return markReview(clientId, 'not_found', row.size_review_reason)

  const now = new Date().toISOString()
  const { data: hit, error: upErr } = await db.from('clients').update({
    size_band: band, size_employees: employees, size_source: 'apollo', size_set_by: 'apollo',
    size_locked_at: now, size_checked_at: now, size_review_reason: null,
    size_note: `Apollo: ${employees} employees at ${plan.lookup}`,
  }).eq('id', clientId).is('size_locked_at', null).select(COLUMNS)
  if (upErr) return { status: 'unreadable', message: `The band could not be saved (${upErr.message}).` }
  const saved = ((hit ?? []) as ClientSizeRow[])[0]
  if (saved) return fromRow(saved) ?? { status: 'unreadable', message: 'The band was not saved.' }
  // Somebody locked it first — theirs stands.
  const again = await db.from('clients').select(COLUMNS).eq('id', clientId).maybeSingle()
  return (again.data && fromRow(again.data as ClientSizeRow)) || { status: 'unreadable', message: 'The band could not be read back.' }
}

export type SetSizeResult =
  | { ok: true; band: SizeBand; previous: SizeBand | null }
  | { ok: false; reason: 'invalid' | 'not_found' | 'reason_required' | 'storage_unreadable'; message: string }

/**
 * A person sets the band (R166 ②: "A person reviews it"). Setting an unset band needs no reason;
 * CHANGING a locked band does — the client may already have been shown a price on it.
 */
export async function setClientSizeByPerson(
  clientId: string,
  input: { band: unknown; employees?: unknown; note?: unknown },
  by: string,
): Promise<SetSizeResult> {
  if (!isSizeBand(input.band)) return { ok: false, reason: 'invalid', message: 'Choose Founders, Growth or Enterprise. Nothing was changed.' }
  const employees = input.employees === undefined || input.employees === null || input.employees === '' ? null : Number(input.employees)
  if (employees !== null && (!Number.isInteger(employees) || employees < 1)) {
    return { ok: false, reason: 'invalid', message: 'Employees must be a whole number of at least 1, or left empty. Nothing was changed.' }
  }
  const note = String(input.note ?? '').trim()
  const { data, error } = await db.from('clients').select(COLUMNS).eq('id', clientId).maybeSingle()
  if (error) return { ok: false, reason: 'storage_unreadable', message: `The client could not be read (${error.message}). Nothing was changed.` }
  if (!data) return { ok: false, reason: 'not_found', message: 'No such client. Nothing was changed.' }
  const row = data as ClientSizeRow
  const previous = isSizeBand(row.size_band) && row.size_locked_at ? row.size_band : null
  if (previous && previous !== input.band && note.length < 10) {
    return { ok: false, reason: 'reason_required', message: 'This client’s band is already locked. Changing it needs a written reason (at least 10 characters) — they may have been shown a price. Nothing was changed.' }
  }
  const now = new Date().toISOString()
  const { error: upErr } = await db.from('clients').update({
    size_band: input.band, size_employees: employees ?? row.size_employees ?? null, size_source: 'person', size_set_by: by,
    size_locked_at: now, size_checked_at: now, size_review_reason: null, size_note: note || null,
  }).eq('id', clientId)
  if (upErr) return { ok: false, reason: 'storage_unreadable', message: `The band could not be saved (${upErr.message}). Nothing was changed.` }
  return { ok: true, band: input.band, previous }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R166 ① · P8) — WHICH TERMS A NEW PROGRAMME IS PRICED ON.
//
//   • a locked band        → that band's flat price (R166 ①)
//   • the House account    → the R81 curve (House keeps the terms it runs on; it pays nothing)
//   • anything else        → NO PRICE YET: a person is confirming the size (R166 ②). The size
//                            check is (re)run here, so a client whose band can be found now is
//                            not held back by a background check that has not landed.
// 🛑 Never a default band: pricing an unknown company as Founders would under-price an enterprise.
// ═══════════════════════════════════════════════════════════════════════════════════════
export const PRICE_PENDING_COPY =
  'We’re confirming your company size, which sets your price per meeting. A person is on it — your price will be ready here shortly.'

export type PricingTerms =
  | { kind: 'band'; band: SizeBand }
  | { kind: 'curve' }
  | { kind: 'pending'; message: string }

export async function pricingTermsFor(clientId: string): Promise<PricingTerms> {
  try {
    const { isHouseClient } = await import('./house-client')
    if (await isHouseClient(clientId)) return { kind: 'curve' }
  } catch { /* not House as far as we can tell — fall through to the band */ }
  const size = await ensureClientSize(clientId)
  if (size.status === 'set') return { kind: 'band', band: size.band }
  return { kind: 'pending', message: PRICE_PENDING_COPY }
}
