// WHOSE MAILBOX DOES THIS EMAIL LEAVE FROM? — the answer #547 exists to give.
//
// Before this file, `figsy.ts:26` was `const FROM = COLD_FROM` — a module-level constant
// feeding both `resend.emails.send` calls, so **every client on the platform emailed from
// one shared address**. `client_inboxes` already existed and Vida already wrote a row into
// it, but no send path ever read that table: the sending identity was recorded and then
// ignored. RULEBOOK 12.2 in one line — *you cannot share a sender across clients; one
// client's spam complaints poison the rest.*
//
// The rule, and it is deliberately harsh: **no inbox = no send.** Not "send from ours
// instead". A silent fallback to the shared address is the exact failure this replaces —
// it looks like it worked, and the damage lands on every other client's deliverability
// weeks later, where nobody connects it back.
//
// Which inbox, when a client holds two: the SOP (docs/client-flow-sop.md) has them on a
// pooled pre-warmed mailbox from day 1 while their own branded one warms for ~14 days, so
// the switch at ~day 29 is gapless. During that overlap both rows are live, and the
// question "which one sends" has one right answer: the branded mailbox once it is `active`,
// the pooled one until then. A `warming` branded inbox must NEVER send — sending on it is
// precisely what un-warms it.

// `@kind/db` is imported lazily inside `resolveSendingInbox`, not at module scope. That is
// deliberate: the db client throws on import without SUPABASE_URL / SERVICE_ROLE_KEY, and
// the whole point of splitting the decision out as a pure function is that the ordering
// rules — which mailbox wins, and when nothing may send — can be tested without a database
// or a live environment.

/** A mailbox row as this module needs it. Mirrors `client_inboxes` + the #547 SMTP columns. */
export type InboxRow = {
  id: string
  email: string
  kind: 'pooled' | 'branded' | string
  status: 'assigned' | 'warming' | 'active' | 'released' | 'retired' | string
  provider?: string | null
  daily_cap?: number | null
  smtp_host?: string | null
  smtp_port?: number | null
  smtp_secure?: boolean | null
  smtp_user?: string | null
  smtp_pass_enc?: string | null
  from_name?: string | null
}

/** Why a client cannot send. Every one of these is a state an operator can act on. */
export type RefusalReason =
  | 'no_inbox'          // nothing assigned at all — #550 has not run for this client
  | 'lookup_failed'     // the mailbox table could not be READ — a different problem entirely
  | 'warming_only'      // a branded mailbox is warming; sending on it would un-warm it
  | 'no_credentials'    // the row exists but has no SMTP details to send with
  | 'no_secret_key'     // INBOX_SECRET_KEY unset — the password cannot be read

export type Resolution =
  | { ok: true; inbox: InboxRow; from: string }
  | { ok: false; reason: RefusalReason; detail: string }

/** Statuses that mean "this mailbox is in play right now". Mirrors the table's unique index. */
const LIVE_STATUSES = new Set(['assigned', 'warming', 'active'])

/** Sending is permitted only from these. `warming` is deliberately absent. */
const SENDABLE_STATUSES = new Set(['assigned', 'active'])

function hasCredentials(r: InboxRow): boolean {
  return Boolean(r.smtp_host && r.smtp_user && r.smtp_pass_enc)
}

/**
 * The decision, as a pure function over the client's mailbox rows — so the ordering rules
 * can be tested without a database, and so the reason a send was refused is a value rather
 * than a log line.
 *
 * `secretOk` is passed in rather than read from the environment here, because a resolver
 * that consults `process.env` cannot be tested for the missing-key path.
 */
export function pickSendingInbox(rows: InboxRow[], secretOk: boolean): Resolution {
  const live = (rows ?? []).filter(r => r && LIVE_STATUSES.has(String(r.status)))
  if (live.length === 0) {
    return {
      ok: false,
      reason: 'no_inbox',
      detail: 'This client has no sending mailbox assigned. Assign one in Vida before any outreach can leave.',
    }
  }

  const sendable = live.filter(r => SENDABLE_STATUSES.has(String(r.status)))
  if (sendable.length === 0) {
    return {
      ok: false,
      reason: 'warming_only',
      detail: 'The only mailbox for this client is still warming. Sending on a warming mailbox is what un-warms it — wait for it to go active, or assign a pooled mailbox to send from meanwhile.',
    }
  }

  // Branded-and-active beats pooled: it is the client's own domain, and once it is active
  // the pooled row is only still there to be released. Within a kind, prefer `active`.
  const rank = (r: InboxRow) =>
    (String(r.status) === 'active' ? 0 : 1) * 10 + (String(r.kind) === 'branded' ? 0 : 1)
  const ordered = [...sendable].sort((a, b) => rank(a) - rank(b))

  const usable = ordered.find(hasCredentials)
  if (!usable) {
    return {
      ok: false,
      reason: 'no_credentials',
      detail: `Mailbox ${ordered[0].email} is assigned but has no SMTP details saved, so nothing can connect to it. Add the host, username and password in Vida → the client's inbox.`,
    }
  }

  if (!secretOk) {
    return {
      ok: false,
      reason: 'no_secret_key',
      detail: 'INBOX_SECRET_KEY is not set on the API, so the saved mailbox password cannot be read. Set it in Railway → @kind/api → Variables (64 hex characters).',
    }
  }

  return { ok: true, inbox: usable, from: fromHeader(usable) }
}

/**
 * The `From:` header. A display name matters on cold mail — a bare address reads as
 * machine-sent — but the ADDRESS must be the mailbox we are actually authenticated as, or
 * the receiving server sees a mismatch and treats it as spoofing.
 */
export function fromHeader(inbox: InboxRow): string {
  const name = (inbox.from_name ?? '').trim()
  return name ? `${name} <${inbox.email}>` : inbox.email
}

/**
 * Settle the port and the encryption mode together, because they are not independent:
 * **465 is implicit TLS, 587 is STARTTLS**, and mismatching them is the single most common
 * way an SMTP connection HANGS rather than failing — which reads as a dead product rather
 * than a wrong setting.
 *
 * Also the NaN guard. An empty port box gives `Number('')` → 0 and `Number(undefined)` →
 * NaN, and either one reaching the transport is a connection attempt to nowhere.
 */
export function normalisePort(port: unknown, secure?: unknown): { port: number; secure: boolean } {
  const n = Number(port)
  const p = Number.isFinite(n) && n > 0 && n <= 65535 ? Math.floor(n) : 587
  return { port: p, secure: typeof secure === 'boolean' ? secure : p === 465 }
}

/** Human wording for a refusal — one sentence an operator can act on, no jargon. */
export function refusalLabel(reason: RefusalReason): string {
  switch (reason) {
    case 'no_inbox':        return 'No sending mailbox assigned'
    case 'warming_only':    return 'Mailbox still warming — cannot send yet'
    case 'no_credentials':  return 'Mailbox has no SMTP details saved'
    case 'no_secret_key':   return 'API cannot read mailbox passwords (INBOX_SECRET_KEY unset)'
    // Its own reason, because "No sending mailbox assigned" sent the operator to configure a
    // mailbox that is already there, while the database was the thing that was down.
    // (Audit 27 Jul — the detail was honest, the LABEL was not.)
    case 'lookup_failed':   return 'Could not read this client\'s mailboxes — database problem, NOT a missing mailbox'
  }
}

/**
 * Read the client's mailboxes and decide. The DB half, kept thin on purpose — all the
 * judgement is in `pickSendingInbox`.
 */
export async function resolveSendingInbox(clientId: string): Promise<Resolution> {
  const { secretState } = await import('./inbox-secret')
  const { db } = await import('@kind/db')
  const { data, error } = await db
    .from('client_inboxes')
    .select('id, email, kind, status, provider, daily_cap, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, from_name')
    .eq('client_id', clientId)

  if (error) {
    // A read failure is NOT permission to send from the shared address. Refuse, and say
    // which kind of problem it is so it isn't mistaken for "this client has no mailbox".
    return {
      ok: false,
      reason: 'lookup_failed',
      detail: `Could not read this client's mailboxes (${error.message ?? 'database error'}) — refusing to send rather than falling back to a shared sender. This is a DATABASE failure, not a missing mailbox: do not go and assign one.`,
    }
  }

  return pickSendingInbox((data ?? []) as InboxRow[], secretState().ok)
}
