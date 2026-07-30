// CLIENT ZERO — the house account, and the mailboxes it sends from (#547/#552/#553).
//
// Tomorrow the founder buys four Google mailboxes and has to get from "I own four inboxes"
// to "the product can send from them" **without a SQL editor** — the Supabase dashboard is
// unreachable on this account, so anything that needs a hand-written INSERT is not a plan.
//
// ── WHAT ALREADY EXISTED, VERIFIED BY READING IT ─────────────────────────────────────────
//
// Most of this is built. `client_inboxes` carries the SMTP columns, `inbox-secret.ts`
// encrypts the password (AES-256-GCM, key in `INBOX_SECRET_KEY`), `pickSendingInbox` decides
// which mailbox sends, and `sendReadiness` already answers "can this client send?" using the
// **same call the send path makes**. None of that is re-implemented here.
//
// ── THE THREE GAPS, AND WHY EACH ONE BLOCKS TOMORROW ─────────────────────────────────────
//
// ① **THERE IS NO WAY TO ADD A SECOND MAILBOX.** The only control that creates an inbox row
//    is the "Assign pooled inbox" button, and it renders **inside the `needs_inbox` card** —
//    a list built by filtering for clients that CANNOT send. So the moment mailbox #1 is
//    saved with working credentials, the client leaves that list and the button disappears
//    **with mailboxes 2, 3 and 4 still to add.** The control removes itself the instant it
//    half-succeeds: the same shape as the migration card that hid once the first migration
//    ran. It also never set `provider`, `daily_cap`, or a status of the operator's choosing.
//
// ② **NOTHING CREATES THE HOUSE CLIENT.** `clients.user_id` is NOT NULL and unique, so a
//    client row cannot be conjured — it needs an auth user. The founder already has one
//    (`HOUSE_ACCOUNT_EMAIL`), and it may or may not already own a client row.
//
// ③ **READINESS IS ONLY SHOWN FOR FAILURE.** `needs_inbox` lists clients that cannot send.
//    A client that CAN send appears nowhere at all, so "everything is fine" and "this client
//    is not on the page for some other reason" render identically — the #565 shape.
//
// The judgement for all three lives here, pure, so it is provable without a database.

import { HOUSE_ACCOUNT_EMAIL } from './real-clients-logic'
export { HOUSE_ACCOUNT_EMAIL }

/**
 * The house client's display name. A LABEL ONLY — nothing matches on it.
 *
 * #584/#582 were both caused by matching an account on its company name (`MBF Holdings` vs
 * the live `MBF Demo`), and #593 settled the rule: **identity is the auth user, never the
 * name.** So this string is what an operator reads, and the `user_id` is what the code uses.
 */
export const HOUSE_CLIENT_NAME = 'K.I.N.D (house — Client Zero)'

/**
 * ⚠️ THE ONE INSTRUCTION THAT MUST TRAVEL WITH THE CLIENT ID.
 *
 * `HOUSE_CLIENT_ID` looks exactly like the variable you set once you have a house client id
 * in your hand, and setting it would be wrong. It gates **one thing**: the step-9 push into
 * Instantly (`approve-lead.ts` → `instantly-push.ts`), which #593 PARKED on 30 Jul when the
 * founder amended #577 — our own engine sends our outreach now. Unset means nothing is ever
 * pushed, and that fail-closed property IS the park.
 *
 * Our own sending does not read it and never has. Exported as one string so the screen, the
 * API response and the tests all say the same thing — a warning that exists in three
 * slightly different wordings is a warning somebody talks themselves out of.
 */
export const HOUSE_CLIENT_ID_NOTICE =
  'Do NOT set HOUSE_CLIENT_ID in Railway. It does not configure our sending — it is the ' +
  'switch for the PARKED Instantly push (#593), and leaving it unset is what keeps that path ' +
  'dormant. Our own engine sends from the mailboxes below without it.'

// ── ② THE HOUSE CLIENT: ADOPT, CREATE, OR REFUSE ─────────────────────────────────────────

export type HouseCandidate = { id: string; user_id: string | null; company_name: string | null; is_demo: boolean | null }

export type HouseDecision =
  | { action: 'adopt';  clientId: string; why: string; needsUnDemo: boolean; needsRename: boolean }
  | { action: 'create'; userId: string; why: string }
  | { action: 'refuse'; why: string; candidates?: { id: string; name: string | null }[] }

/**
 * What should happen when the operator presses "Set up the house client"?
 *
 * **ADOPT BEATS CREATE, and that is the whole point of this function.** The founder's login
 * probably already owns a client row — signing into the portal creates one. Minting a second
 * would leave two accounts for one person, and the one the product picks would be decided by
 * whichever query happened to run first. That is exactly #584: an account no control could
 * touch, sitting beside a duplicate.
 *
 * **TWO house rows is a REFUSAL, not a coin toss.** If the founder's auth user somehow owns
 * two client rows, a human has to say which one is Client Zero. Guessing here means the
 * outreach runs from an account with the wrong history attached.
 *
 * **No auth user is also a refusal** — deliberately. We could call `auth.admin.createUser`
 * (the demo seeder does), but that mints a login with a generated password for the founder's
 * own identity. Telling him to sign in once is a smaller, more honest ask.
 */
export function decideHouseClient(a: {
  houseUserIds: string[]
  clients: HouseCandidate[]
}): HouseDecision {
  const userIds = a.houseUserIds.filter(Boolean)
  if (userIds.length === 0) {
    return {
      action: 'refuse',
      why: `No auth user with the address ${HOUSE_ACCOUNT_EMAIL} exists yet. Sign in to the portal once with that address, then press this again — we deliberately do not create a login for you, because that would mean minting a password for your own account.`,
    }
  }

  const owned = a.clients.filter(c => c.user_id && userIds.includes(c.user_id))

  if (owned.length > 1) {
    return {
      action: 'refuse',
      why: `The house login owns ${owned.length} client accounts, so which one is Client Zero is not ours to guess — running outreach from the wrong one attaches it to the wrong history. Pick one in Vida and retire the others, then press this again.`,
      candidates: owned.map(c => ({ id: c.id, name: c.company_name })),
    }
  }

  if (owned.length === 1) {
    const c = owned[0]
    return {
      action: 'adopt',
      clientId: c.id,
      why: `The house login already owns this account, so it is adopted rather than duplicated — a second row for one person is how #584 happened.`,
      // `is_demo` true would exclude it from every revenue figure AND make the CSV import
      // refuse it (#599). Client Zero is a real account that simply never pays us.
      needsUnDemo: c.is_demo === true,
      needsRename: (c.company_name ?? '').trim() !== HOUSE_CLIENT_NAME,
    }
  }

  return {
    action: 'create',
    userId: userIds[0],
    why: 'The house login exists but owns no client account yet, so one is created for it.',
  }
}

// ── ① THE MAILBOX FORM: WHAT A ROW MUST CARRY BEFORE IT IS WORTH SAVING ───────────────────

/** Statuses an operator may set when recording a mailbox. */
export const ADDABLE_STATUSES = ['warming', 'active'] as const
export const ADDABLE_KINDS = ['branded', 'pooled'] as const

/**
 * How many days a Google-direct mailbox warms before it is worth trusting.
 *
 * **21, not the 14 used by `/inboxes/brand`, and the difference is deliberate.** That route
 * records a mailbox a VENDOR pre-warmed as part of the client SOP; these are boxes we bought
 * this morning with no reputation at all, and the founder's own plan says 3–4 weeks. Quoting
 * 14 would put a "ready" date on the screen a week before it is true.
 *
 * It is still only a REMINDER. **#553's ladder decides when a mailbox sends** — a test send
 * that lands in a real inbox, mail-tester ≥9/10, cap on — not a date arithmetic produced.
 */
export const DEFAULT_WARMUP_DAYS = 21

export type MailboxInput = {
  email?: unknown
  kind?: unknown
  provider?: unknown
  status?: unknown
  daily_cap?: unknown
  warmup_days?: unknown
  smtp_host?: unknown
  smtp_user?: unknown
  smtp_pass?: unknown
  from_name?: unknown
}

export type MailboxParsed = {
  email: string
  kind: string
  provider: string
  status: string
  daily_cap: number | null
  warmupDays: number
  smtp_host: string | null
  smtp_user: string | null
  from_name: string | null
  /** True when the caller supplied a password to encrypt. Never the password itself. */
  hasPassword: boolean
}

/**
 * Validate and normalise the add-mailbox form. Returns the row's non-secret fields, or every
 * problem at once — a form that reveals its objections one at a time is a form you fill in
 * four times.
 *
 * The password is deliberately NOT part of the return value. It is read once by the route,
 * handed straight to `encryptSecret`, and never travels through another function — the
 * smallest possible path from the request body to the ciphertext.
 */
export function parseMailboxInput(a: MailboxInput): { ok: true; value: MailboxParsed } | { ok: false; errors: string[] } {
  const errors: string[] = []

  const email = String(a.email ?? '').trim().toLowerCase()
  if (!email || !email.includes('@') || !email.includes('.')) {
    errors.push('A mailbox address is required (the full address you log into, e.g. jacques@get-kind.com).')
  }

  const kind = String(a.kind ?? 'branded').trim()
  if (!(ADDABLE_KINDS as readonly string[]).includes(kind)) {
    errors.push(`Kind must be one of: ${ADDABLE_KINDS.join(', ')}.`)
  }

  const status = String(a.status ?? 'warming').trim()
  if (!(ADDABLE_STATUSES as readonly string[]).includes(status)) {
    errors.push(`Status must be one of: ${ADDABLE_STATUSES.join(', ')} — a mailbox is either warming or live.`)
  }

  // `provider` is a LABEL, not a switch. Nothing branches on it; it is how an operator
  // reading the board six weeks from now knows a box is a Google one we own rather than a
  // vendor's. Free text so a new provider needs no code change.
  const provider = String(a.provider ?? 'google-smtp').trim() || 'google-smtp'

  let daily_cap: number | null = null
  if (a.daily_cap !== undefined && a.daily_cap !== null && String(a.daily_cap).trim() !== '') {
    const n = Number(a.daily_cap)
    if (!Number.isFinite(n) || n <= 0 || n > 2000) {
      errors.push('Daily cap must be a number between 1 and 2000, or left blank for no cap.')
    } else daily_cap = Math.floor(n)
  }

  let warmupDays = DEFAULT_WARMUP_DAYS
  if (a.warmup_days !== undefined && a.warmup_days !== null && String(a.warmup_days).trim() !== '') {
    const n = Number(a.warmup_days)
    if (!Number.isFinite(n) || n < 0 || n > 90) {
      errors.push('Warm-up days must be between 0 and 90.')
    } else warmupDays = Math.floor(n)
  }

  const smtp_host = String(a.smtp_host ?? '').trim() || null
  const smtp_user = String(a.smtp_user ?? '').trim() || null
  const hasPassword = typeof a.smtp_pass === 'string' && a.smtp_pass.length > 0

  // THE PARTIAL-CREDENTIALS TRAP. `pickSendingInbox` needs host AND user AND password; a row
  // with two of the three is indistinguishable on the board from a row with none, and reads
  // as "saved". Either give all three or give none and come back — a half-filled mailbox is
  // the state that made "Assign pooled inbox" look like it worked (#552).
  const given = [smtp_host, smtp_user, hasPassword ? 'pw' : null].filter(Boolean).length
  if (given > 0 && given < 3) {
    errors.push('SMTP details must be complete: host, username AND password. A mailbox with only some of them looks saved on the board and still cannot send.')
  }

  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      email, kind, provider, status, daily_cap, warmupDays,
      smtp_host, smtp_user,
      from_name: String(a.from_name ?? '').trim() || null,
      hasPassword,
    },
  }
}

// ── ③ READINESS, RENDERED HONESTLY ───────────────────────────────────────────────────────

export type ReadinessTone = 'ok' | 'amber' | 'red'

/**
 * How a readiness verdict should READ on the board.
 *
 * The split is not cosmetic — it is the difference between *"go and do something"* and
 * *"something is broken beyond this client"*:
 *
 *   • **amber** = a task with an owner. No mailbox, no credentials, still warming. Expected
 *     states on the way to sending, and each one is a thing the founder can go and do.
 *   • **red** = not this client's problem. `no_secret_key` means the API cannot read ANY
 *     mailbox password, so **every** client is dead, not this one. And `lookup_failed` /
 *     `check_failed` mean we do not KNOW — which must never wear the same colour as a known,
 *     ordinary "not set up yet" (#565). An unknown state rendered calm is the failure this
 *     whole board exists to remove.
 */
export function readinessTone(canSend: boolean, reason?: string | null): ReadinessTone {
  if (canSend) return 'ok'
  if (reason === 'no_secret_key' || reason === 'lookup_failed' || reason === 'check_failed') return 'red'
  return 'amber'
}

/** What still stands between this client and a first send, in the order it must be done. */
export function nextStepFor(reason: string | null | undefined): string {
  switch (reason) {
    case 'no_inbox':       return 'Add a mailbox for this client — address, SMTP host, username and password.'
    case 'no_credentials': return 'The mailbox row exists but has no SMTP details. Open it below and add host, username and password.'
    case 'warming_only':   return 'The only mailbox is warming. Sending on it is what un-warms it — wait, or add a second mailbox that is already live.'
    case 'no_secret_key':  return 'Set INBOX_SECRET_KEY in Railway → @kind/api → Variables (openssl rand -hex 32). Nothing sends for ANY client until this exists.'
    case 'lookup_failed':  return 'The mailbox table could not be read. This is a DATABASE problem — do not go and add a mailbox.'
    case 'check_failed':   return 'The readiness check itself failed, so this is not evidence of a missing mailbox — it is evidence we cannot tell.'
    default:               return 'Nothing outstanding.'
  }
}
