// ═══════════════════════════════════════════════════════════════════════════════════════
// THE POOLED SENDER INVENTORY — what mailboxes exist for K.I.N.D to hand out.
//
// ── 🛑 WHY THIS FILE EXISTS (MVP1 · C1a, founder decision F, 16 Sep) ────────────────────
//
// `preparation-readiness.ts` blocks READY_FOR_APPROVAL on `no_sender`, and that blocker was
// documented as one preparation CANNOT clear — *"a mailbox somebody has to connect"*. So every
// paying client's programme stopped dead before Ready for Approval and waited for an operator
// to open Vida, find a mailbox, type its address into `POST /inboxes/assign` and press Verify.
//
// 🛑 AND THERE WAS NOTHING TO SELECT FROM. A read-only trace of the repo established it: no
// `inbox_pool` table, no `POOLED_INBOX*` variable, no `client_id IS NULL` rows anywhere. The
// phrase "assign a pooled sender" had no inventory behind it at all — `POST /inboxes/assign`
// required an operator to TYPE the address, and `verifyInbox` needed credentials that route
// never set. So the automatic sender step was not slow; it was absent.
//
// ── WHAT THIS IS, AND WHAT IT DELIBERATELY IS NOT ───────────────────────────────────────
//
// It is the KISS shape the founder chose: an ENVIRONMENT-BACKED list of available mailboxes,
// with `client_inboxes` as the durable assignment truth. AVAILABILITY is env; ASSIGNMENT is
// the database. Nothing here records who has what.
//
// ⚠️ IT IS NOT A SENDER-MANAGEMENT SUBSYSTEM and not a second provider abstraction. There is
// no table, no admin CRUD, no lifecycle and no warming logic. `verifyInbox`, `encryptSecret`,
// the `client_inboxes` model and sender safety are all reused untouched.
//
// ⚠️ IT IS SERVER-ONLY, AND STRUCTURALLY SO. This module is the ONLY reader of the variable
// (a test asserts nothing else touches it), nothing it returns is ever put in an API response,
// and no function here logs a credential. The secret's whole journey is: env → `encryptSecret`
// → `client_inboxes.smtp_pass_enc`.
//
// ── THE FAILURE DIRECTIONS, CHOSEN ─────────────────────────────────────────────────────
//
// ⚠️ A MALFORMED ENTRY COSTS ONLY ITSELF. It is dropped, named in `problems`, and the valid
// entries beside it still work. Throwing at module load would take the whole API down over one
// mistyped port — and the founder's boundary is explicit: *"must not crash entire application
// if avoidable"*.
//
// ⚠️ AN UNSET VARIABLE IS AN EMPTY INVENTORY, NOT A FAULT. Not-configured is a deployment
// state. It surfaces as a real preparation blocker on the one programme that needed a sender,
// which is where an operator can actually see and act on it — not as a boot failure.
//
// ⚠️ AND NO PROBLEM STRING EVER QUOTES A SECRET. The messages name the ADDRESS and the missing
// FIELD, because those are what an operator needs and a password is not.
// ═══════════════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 16 Sep (GAP 1) — K.I.N.D'S OWN SENDING IDENTITIES ARE NOT CLAIMABLE BY A CLIENT.
//
// 🛑 THE GAP THE DB FILTER COULD NOT CLOSE. `sender-claim.ts` already refuses any address that
// is LIVE in `client_inboxes` on ANY client — which is what makes a HOUSE-ASSIGNED mailbox
// unclaimable, because House's mailboxes are ordinary rows in that table. Existing DB
// assignment truth wins over the env inventory, and that half was already right.
//
// But K.I.N.D's OWN sending addresses hold no `client_inboxes` row at all:
//
//   · `FIGSY_COLD_FROM` — boot-critical, and the From every cold send in the product uses;
//   · `hello@get-kind.com` — the transactional identity every invoice, password reset and
//     welcome email leaves from, and the fallback `COLD_FROM` resolves to when unset.
//
// Neither is a client mailbox, so neither is in the table, so nothing stopped an operator
// populating `POOLED_SENDERS_JSON` from "the mailboxes we own" and handing one to an ordinary
// client — who would then send cold outreach AS K.I.N.D, on K.I.N.D's domain reputation, with
// their own story and their own suppression list. When it bounced, our transactional mail
// would burn with it.
//
// ⚠️ THESE ARE NOT HARD-CODED PRIVATE ADDRESSES, and that distinction is the founder's
// boundary. Both are read from `deliverability.ts`'s OWN constants — the same values the mailer
// sends from — so the fence moves when the configuration moves. Nothing is typed twice.
//
// ⚠️ IT IS NOT A HOUSE-IDENTITY CHECK EITHER. House-the-client is protected by the DB truth
// above, through the canonical `HOUSE_ACCOUNT_EMAIL` identity. This protects K.I.N.D-the-sender,
// which is a different thing and has no client row to protect it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { COLD_FROM, COLD_FROM_DEFAULT } from './deliverability'

/** `K.I.N.D <hello@get-kind.com>` → `hello@get-kind.com`. Bare addresses pass through. */
function bareAddress(v: string): string {
  const m = v.match(/<([^>]+)>/)
  return (m ? m[1] : v).trim().toLowerCase()
}

/**
 * Every address K.I.N.D itself sends from, and which therefore may never be handed to a client.
 *
 * ⚠️ BUILT AT CALL TIME rather than cached, so the set cannot keep protecting yesterday's
 * address after the configuration moves.
 *
 * ⚠️ AND IT IS A STATIC IMPORT. `deliverability.ts` pulls in only `crypto` and one shared
 * constant — no database, no provider — so importing it here costs nothing and keeps the two
 * values the ONE pair the mailer itself sends from.
 */
export function reservedSenderAddresses(): Set<string> {
  return new Set([bareAddress(COLD_FROM), bareAddress(COLD_FROM_DEFAULT)])
}

/** Is this address one of K.I.N.D's own? Case- and `Name <addr>`-insensitive. */
export function senderIsReserved(email: string): boolean {
  const addr = bareAddress(email)
  return addr !== '' && reservedSenderAddresses().has(addr)
}

/**
 * The variable that holds the inventory, as a JSON array.
 *
 * ⚠️ NAMED FOR THE CONVENTION ALREADY IN THIS REPO: `INBOX_SECRET_KEY`, `FIGSY_COLD_FROM`,
 * `AUTO_OUTREACH_ENABLED` — screaming snake case, the subject first, and `_JSON` because the
 * value is structured rather than a single setting.
 */
export const SENDER_POOL_ENV = 'POOLED_SENDERS_JSON'

/**
 * One available mailbox.
 *
 * ⚠️ EVERY FIELD IS ONE `verifyInbox` OR THE MAILER ACTUALLY NEEDS. `mailer.ts` refuses
 * without `smtp_host`, `smtp_user` and a password; `transportOptions` reads the port and the
 * secure flag. Nothing speculative is collected — a field the sender does not use is a field
 * nobody maintains.
 */
export type PooledSender = {
  email: string
  smtp_host: string
  /** Defaults to 587 (STARTTLS), which is what the mailer already assumes when absent. */
  smtp_port: number
  /** true = implicit SSL (465), false = STARTTLS (587). Defaults to false. */
  smtp_secure: boolean
  smtp_user: string
  /**
   * The plaintext password, straight from the environment.
   *
   * 🛑 IT LIVES IN MEMORY AND GOES STRAIGHT INTO `encryptSecret`. It is never written to a
   * log, never returned from a route, and never placed in a `problems` string.
   */
  smtp_pass: string
  from_name?: string | null
}

export type SenderPool = {
  senders: PooledSender[]
  /** Operator-readable reasons an entry was dropped. Never contains a credential. */
  problems: string[]
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/**
 * Parse an inventory from its raw JSON string.
 *
 * ⚠️ PURE, AND THAT IS WHY IT IS SEPARATE FROM THE ENV READ. Every branch below — a missing
 * field, a bad port, unparseable JSON, a duplicate address — is provable without setting a
 * process variable, and the tests inject fake inventory rather than needing real credentials.
 */
export function parseSenderPool(raw: string | undefined | null): SenderPool {
  // Not configured. A real and ordinary deployment state, reported as nothing rather than as
  // a malformation — see the header.
  if (raw === undefined || raw === null || raw.trim() === '') {
    return { senders: [], problems: [] }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      senders: [],
      problems: [`${SENDER_POOL_ENV} is not valid JSON, so no pooled sender is available. It must be a JSON array of mailboxes.`],
    }
  }
  if (!Array.isArray(parsed)) {
    return {
      senders: [],
      problems: [`${SENDER_POOL_ENV} is not a JSON array, so no pooled sender is available.`],
    }
  }

  const senders: PooledSender[] = []
  const problems: string[] = []
  const seen = new Set<string>()

  for (const [i, entry] of parsed.entries()) {
    if (typeof entry !== 'object' || entry === null) {
      problems.push(`${SENDER_POOL_ENV} entry ${i + 1} is not an object and was ignored.`)
      continue
    }
    const e = entry as Record<string, unknown>
    const email = str(e.email).toLowerCase()
    const host = str(e.smtp_host)
    const user = str(e.smtp_user) || email
    const pass = typeof e.smtp_pass === 'string' ? e.smtp_pass : ''

    // ⚠️ THE MISSING FIELD IS NAMED, THE SECRET IS NOT. An operator reading this needs to know
    // WHICH mailbox and WHAT is absent; quoting the password would put it in a log.
    const missing: string[] = []
    if (!email) missing.push('email')
    if (!host) missing.push('smtp_host')
    if (!user) missing.push('smtp_user')
    if (!pass) missing.push('smtp_pass')
    if (missing.length > 0) {
      problems.push(`${SENDER_POOL_ENV} entry ${i + 1}${email ? ` (${email})` : ''} is missing ${missing.join(', ')} and was ignored.`)
      continue
    }

    // 🛑 THE SAME ADDRESS TWICE IS ONE MAILBOX. An inventory is a set: counting it twice would
    // let two clients be handed "different" senders that are the same mailbox, and the database
    // would then refuse the second claim for a reason nobody could see here.
    if (seen.has(email)) {
      problems.push(`${SENDER_POOL_ENV} lists ${email} more than once; the duplicate was ignored.`)
      continue
    }
    seen.add(email)

    // 🛑 K.I.N.D'S OWN IDENTITY IS NEVER INVENTORY. Checked HERE, at the parse, so a reserved
    // address cannot reach the claim at all — and reported by name, because an operator who
    // listed it needs to know it was ignored rather than silently missing a mailbox.
    if (senderIsReserved(email)) {
      problems.push(`${SENDER_POOL_ENV} lists ${email}, which is one of K.I.N.D's OWN sending addresses (the cold or transactional From). It cannot be assigned to a client and was ignored.`)
      continue
    }

    const portRaw = e.smtp_port
    const port = typeof portRaw === 'number' && Number.isFinite(portRaw)
      ? Math.trunc(portRaw)
      : Number.parseInt(str(portRaw), 10)

    senders.push({
      email,
      smtp_host: host,
      // 587/STARTTLS is what `mailer.ts` already defaults to when a port is absent, so an
      // entry that omits it behaves exactly as a hand-entered mailbox does.
      smtp_port: Number.isFinite(port) && port > 0 ? port : 587,
      smtp_secure: e.smtp_secure === true,
      smtp_user: user,
      smtp_pass: pass,
      from_name: str(e.from_name) || null,
    })
  }

  return { senders, problems }
}

/**
 * The inventory, from the environment.
 *
 * ⚠️ READ AT USE, NOT AT MODULE LOAD. A cached inventory would need a redeploy to pick up a
 * newly-added mailbox, and — worse — a parse failure at import time would take the API down at
 * boot over a mistyped JSON comma.
 *
 * ⚠️ AND THIS IS THE ONLY PLACE THE VARIABLE IS READ. A second reader is a second parser, and
 * two parsers disagree; a test asserts no other module touches it.
 */
export function senderPoolFromEnv(): SenderPool {
  return parseSenderPool(process.env[SENDER_POOL_ENV])
}
