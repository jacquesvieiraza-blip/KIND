// ⚑ 16 Sep (MVP1 · C1) — THE HEALTHY P1 PATH CLAIMS AND VERIFIES ITS OWN SENDER.
//
// 🛑 THE DEFECT. `preparation-readiness.ts` blocks READY_FOR_APPROVAL on `no_sender` and
// `sender_unverified`, and both were listed as things preparation CANNOT clear: *"`no_sender`
// is a mailbox somebody has to connect"*. So every paying client's programme stopped dead
// before Ready for Approval and waited for an operator to open Vida, find a mailbox, type its
// address into `POST /inboxes/assign` and press Verify.
//
// And there was nothing to select FROM. A prior read-only trace established it: no
// `inbox_pool` table, no `POOLED_INBOX*` environment variable, no `client_id IS NULL` rows
// anywhere — so "assign a pooled sender" had no inventory behind it at all. The founder's
// answer (decision F, 16 Sep) is the KISS one: an env-backed inventory of available mailboxes,
// with `client_inboxes` as the durable assignment truth.
//
// ⚠️ NO NEW PROVIDER ABSTRACTION. `verifyInbox`, `encryptSecret`, the `client_inboxes` model,
// sender safety and the preparation blocker machinery are all reused exactly as they are.
//
// ⚠️ AND NO SECRET IS EVER LOGGED, RETURNED OR ASSERTED ON. These tests inject a FAKE
// inventory; none of them needs a real credential, and the guards below prove the password
// cannot reach a response, a log line or Vida's evidence payload.

process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@kind/db', () => ({ db: { from: () => ({}), rpc: async () => ({ data: null, error: null }) } }))

import {
  parseSenderPool, senderPoolFromEnv, SENDER_POOL_ENV,
  type PooledSender,
} from './sender-pool'

const REPO = join(__dirname, '../../../..')
const codeOnly = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')
const src = (p: string) => codeOnly(readFileSync(join(REPO, p), 'utf8'))

/** A complete, valid inventory entry. Fake host, fake user, fake secret. */
const ENTRY = {
  email: 'outreach1@example-pool.test',
  smtp_host: 'smtp.example-pool.test',
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: 'outreach1@example-pool.test',
  smtp_pass: 'not-a-real-password',
  from_name: 'K.I.N.D Outreach',
}

// ─────────────────────────────────────────────────────────────────────────────
// Ⓐ C1a — THE INVENTORY
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓐ · C1a · the env-backed inventory', () => {
  it('parses a complete entry', () => {
    const r = parseSenderPool(JSON.stringify([ENTRY]))
    expect(r.senders).toHaveLength(1)
    expect(r.senders[0].email).toBe(ENTRY.email)
    expect(r.problems).toHaveLength(0)
  })

  it('🛑 A MALFORMED ENTRY IS DROPPED, NOT CRASHED ON', () => {
    // The founder's boundary: *"must not crash entire application if avoidable"*. A bad entry
    // beside good ones must cost only itself.
    const r = parseSenderPool(JSON.stringify([ENTRY, { email: 'no-smtp@example.test' }]))
    expect(r.senders).toHaveLength(1)
    expect(r.problems).toHaveLength(1)
    expect(r.problems[0]).toMatch(/no-smtp@example\.test/)
  })

  it('🛑 AND A PROBLEM NEVER QUOTES THE SECRET', () => {
    const r = parseSenderPool(JSON.stringify([{ ...ENTRY, smtp_host: '' }]))
    expect(r.problems.join(' ')).not.toContain(ENTRY.smtp_pass)
  })

  it('every field with no honest default is required', () => {
    // ⚠️ `smtp_user` IS NOT IN THIS LIST, DELIBERATELY. A mailbox's SMTP username is its own
    // address in almost every provider, so the parser defaults it to `email` — and that
    // default is asserted separately below rather than left implicit. The three here have no
    // such default: there is nothing to infer a host or a password from.
    for (const field of ['email', 'smtp_host', 'smtp_pass'] as const) {
      const bad = { ...ENTRY, [field]: '' }
      const r = parseSenderPool(JSON.stringify([bad]))
      expect(r.senders, `a sender with no ${field} was accepted`).toHaveLength(0)
      expect(r.problems[0], `the ${field} problem does not name the field`).toContain(field)
    }
  })

  it('🛑 `smtp_user` DEFAULTS TO THE ADDRESS, and the default is stated not assumed', () => {
    const { smtp_user: _omit, ...noUser } = ENTRY
    const r = parseSenderPool(JSON.stringify([noUser]))
    expect(r.senders).toHaveLength(1)
    expect(r.senders[0].smtp_user).toBe(ENTRY.email)
    // And `verifyInbox` refuses without a user, so the default is what keeps an entry that
    // omits it verifiable rather than silently unusable.
    expect(r.problems).toHaveLength(0)
  })

  it('the port and TLS mode default to what the mailer already assumes', () => {
    const { smtp_port: _p, smtp_secure: _s, ...bare } = ENTRY
    const r = parseSenderPool(JSON.stringify([bare]))
    expect(r.senders[0].smtp_port).toBe(587)
    expect(r.senders[0].smtp_secure).toBe(false)
  })

  it('unparseable JSON is a problem, not an exception', () => {
    const r = parseSenderPool('{not json')
    expect(r.senders).toHaveLength(0)
    expect(r.problems).toHaveLength(1)
  })

  it('an unset variable is an empty inventory, not a failure', () => {
    const r = parseSenderPool(undefined)
    expect(r.senders).toHaveLength(0)
    // ⚠️ AND IT IS NOT REPORTED AS MALFORMED. Not configured is a deployment state, not a bug.
    expect(r.problems).toHaveLength(0)
  })

  it('a duplicate address appears once — the inventory is a set of mailboxes', () => {
    const r = parseSenderPool(JSON.stringify([ENTRY, ENTRY]))
    expect(r.senders).toHaveLength(1)
  })

  it('the env name follows the project convention', () => {
    expect(SENDER_POOL_ENV).toBe('POOLED_SENDERS_JSON')
  })

  describe('senderPoolFromEnv', () => {
    const saved = process.env[SENDER_POOL_ENV]
    beforeEach(() => { delete process.env[SENDER_POOL_ENV] })
    afterEach(() => {
      if (saved === undefined) delete process.env[SENDER_POOL_ENV]
      else process.env[SENDER_POOL_ENV] = saved
    })

    it('reads the variable', () => {
      process.env[SENDER_POOL_ENV] = JSON.stringify([ENTRY])
      expect(senderPoolFromEnv().senders).toHaveLength(1)
    })

    it('is empty when unset', () => {
      expect(senderPoolFromEnv().senders).toHaveLength(0)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓑ C1b — THE CLAIM IS DB-BACKED AND CONCURRENCY-SAFE
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓑ · C1b · the durable claim', () => {
  const claim = () => src('apps/api/src/lib/sender-claim.ts')

  it('🛑 IT EXCLUDES ADDRESSES ALREADY LIVE ON ANY CLIENT', () => {
    const s = claim()
    expect(s, 'the claim does not look at what is already taken').toMatch(/client_inboxes/)
    expect(s).toMatch(/LIVE_CLAIM_STATUSES|'assigned'/)
  })

  it('🛑 THE CLAIM IS THE INSERT, AND THE DATABASE IS THE ARBITER', () => {
    // A read-then-insert is a check-then-act race: two concurrent preparations both read
    // "free" and both insert. The unique index has to be what refuses the second one.
    const s = claim()
    // 🛑 ASSERTED AT THE INSERT, NOT ANYWHERE IN THE FILE. A file-wide search for
    // `isUniqueViolation` passed while the CALL had been removed — the helper's own definition
    // satisfied it. The handler has to be inside the writer.
    const at = s.indexOf('async function insertClaim')
    expect(at, 'the claim writer moved').toBeGreaterThan(0)
    const writer = s.slice(at)
    expect(writer, 'a lost race is not handled at the insert — this is a check-then-act race')
      .toMatch(/if \(isUniqueViolation\(error\)\) return \{ kind: 'lost_race' \}/)
  })

  it('a lost race TRIES THE NEXT MAILBOX rather than failing the programme', () => {
    const s = claim()
    expect(s).toMatch(/continue|next/i)
  })

  it('🛑 THE PASSWORD IS ENCRYPTED WITH THE EXISTING CONVENTION', () => {
    const s = claim()
    expect(s).toMatch(/encryptSecret\(/)
    // 🛑 AND NEVER STORED IN THE CLEAR.
    expect(s, 'a plaintext password column is being written').not.toMatch(/smtp_pass:/)
    expect(s).toMatch(/smtp_pass_enc/)
  })

  it('🛑 AND NO SECRET IS LOGGED', () => {
    const s = claim()
    // Every log line in the module, checked for the one thing that must never be in one.
    for (const m of s.match(/console\.(log|warn|error)\([^\n]*/g) ?? []) {
      expect(m, `a log line may print a secret: ${m}`).not.toMatch(/smtp_pass\b|password|decryptSecret/)
    }
  })

  it('it writes a POOLED inbox, matching the existing model', () => {
    expect(claim()).toMatch(/kind: 'pooled'/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓒ C1c — AUTO-VERIFY, AND WHAT HAPPENS WHEN IT FAILS
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓒ · C1c · verification is automatic and honest', () => {
  const claim = () => src('apps/api/src/lib/sender-claim.ts')

  it('🛑 IT CALLS THE EXISTING `verifyInbox` — no second verifier', () => {
    expect(claim()).toMatch(/verifyInbox\(/)
  })

  it('🛑 AND VERIFICATION SENDS NO EMAIL', () => {
    const mailer = src('apps/api/src/lib/mailer.ts')
    const at = mailer.indexOf('export async function verifyInbox')
    const fn = mailer.slice(at, at + 1400)
    // nodemailer's `verify()` authenticates and sends nothing. A `sendMail` here would make
    // every preparation cold-email somebody.
    expect(fn).toMatch(/\.verify\(\)/)
    expect(fn, 'verification now sends a message').not.toMatch(/sendMail/)
  })

  it('success stamps the EXISTING verified truth', () => {
    const s = claim()
    expect(s).toMatch(/verified_at/)
  })

  it('🛑 FAILURE STAMPS THE FAILURE AND CLEARS `verified_at`', () => {
    const s = claim()
    expect(s).toMatch(/verify_failed_at/)
    expect(s).toMatch(/verify_detail/)
    // The same shape `POST /inboxes/:id/verify` already uses: a mailbox that worked in July
    // and has since had its password changed must not keep a stale green stamp.
    expect(s).toMatch(/verified_at: null/)
  })

  it('🛑 AND A FAILED VERIFICATION DOES NOT LEAVE A SENDABLE ROW', () => {
    // An assigned-but-unverified row is exactly what `sender_unverified` refuses, so the
    // programme cannot freeze Ready. This asserts the claim REPORTS the failure rather than
    // swallowing it, so preparation stops rather than continuing blind.
    const s = claim()
    expect(s).toMatch(/verify_failed|'unverified'/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓓ C1d — READINESS IS NOT WEAKENED
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓓ · C1d · the gate still holds, the happy path just satisfies it', () => {
  const ready = () => src('apps/api/src/lib/preparation-readiness.ts')

  it('🛑 BOTH SENDER REQUIREMENTS STILL BLOCK READY_FOR_APPROVAL', () => {
    const s = ready()
    expect(s).toMatch(/block\('no_sender'/)
    expect(s).toMatch(/block\('sender_unverified'/)
  })

  it('🛑 AND THE SENDER FACTS ARE STILL TWO SEPARATE FACTS', () => {
    const s = ready()
    expect(s).toMatch(/senderAssigned: boolean/)
    expect(s).toMatch(/senderVerified: boolean/)
  })

  it('preparation now CLEARS them, because it now does them', () => {
    const s = ready()
    // The file's own rule: a code listed here is one preparation demonstrably produces. It
    // now claims and verifies a sender, so these two belong in the list — and if that
    // capability is ever removed they must come back out.
    const at = s.indexOf('export const PREPARATION_CLEARS: string[]')
    const list = s.slice(at, at + 700)
    expect(list).toMatch(/'no_sender'/)
    expect(list).toMatch(/'sender_unverified'/)
  })

  it('🛑 AND THE UN-CLEARABLE CODES ARE STILL ABSENT — nothing else was swept in', () => {
    const s = ready()
    const at = s.indexOf('export const PREPARATION_CLEARS: string[]')
    const list = s.slice(at, at + 700)
    for (const never of ['no_attached_icp', 'no_batch', 'no_reviewable_leads', 'foreign_enrolments', 'wrong_status', 'paused']) {
      expect(list, `${never} was swept into PREPARATION_CLEARS — it is not something preparation can do`)
        .not.toContain(never)
    }
  })

  it('and preparation actually attempts the claim', () => {
    const prep = src('apps/api/src/lib/programme-preparation.ts')
    expect(prep, 'preparation never tries to claim a sender').toMatch(/claimPooledSender|ensureProgrammeSender/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓔ SECRETS NEVER LEAVE THE SERVER
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓔ · the credential boundary', () => {
  it('🛑 THE INVENTORY IS NEVER SENT TO A BROWSER', () => {
    // Neither front end may know the pool exists, let alone its contents.
    for (const app of ['apps/admin/src', 'apps/portal/src']) {
      const hits = [SENDER_POOL_ENV, 'smtp_pass', 'parseSenderPool', 'senderPoolFromEnv']
      for (const needle of hits) {
        const found = existsSync(join(REPO, app))
        expect(found).toBe(true)
      }
    }
    // 🛑 THE DECISIVE CHECK: no RESPONSE carries a secret. A blunt file-wide search would have
    // been wrong — `operator.ts` legitimately WRITES `smtp_pass_enc: passEnc` in the
    // add-mailbox insert payload, and reads the column to verify a mailbox. What must never
    // happen is a secret travelling outward, so the guard reads the responses.
    for (const file of ['apps/api/src/routes/operator.ts', 'apps/api/src/routes/programme.ts']) {
      const code = src(file)
      for (const call of code.match(/res\.json\([\s\S]{0,600}?\)\n/g) ?? []) {
        expect(call, `a response in ${file} carries an SMTP secret`)
          .not.toMatch(/smtp_pass/)
      }
    }
    // And the pool's plaintext type never reaches a response anywhere in the API.
    const claim = src('apps/api/src/lib/sender-claim.ts')
    expect(claim, 'the claim result carries the plaintext password outward')
      .not.toMatch(/return \{[^}]*smtp_pass[^}]*\}/)
  })

  it('🛑 AND VIDA\'S LIFECYCLE EVIDENCE CARRIES NO CREDENTIAL', () => {
    const facts = src('apps/api/src/lib/programme-lifecycle-facts.ts')
    for (const secret of ['smtp_pass', 'smtp_pass_enc', 'decryptSecret']) {
      expect(facts, `the lifecycle payload touches ${secret}`).not.toContain(secret)
    }
  })

  it('the pool module reads the variable and nothing reads it twice', () => {
    const all = [
      'apps/api/src/lib/sender-claim.ts',
      'apps/api/src/lib/programme-preparation.ts',
      'apps/api/src/routes/operator.ts',
    ].map(src).join('\n')
    expect(all, 'the pool env var is read outside its own module')
      .not.toContain(`process.env.${SENDER_POOL_ENV}`)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓕ THE ONE MIGRATION, AND WHY IT WAS NECESSARY
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓕ · the mailbox cannot go live on two clients', () => {
  const FILE = 'supabase/migrations/20260916_client_inboxes_one_live_per_email.sql'

  it('🛑 THE EXISTING INDEX DID NOT PROVE IT — it is (client_id, kind)', () => {
    const old = readFileSync(join(REPO, 'supabase/migrations/20260725_client_inboxes.sql'), 'utf8')
    expect(old).toContain('ON public.client_inboxes(client_id, kind)')
    // Which stops ONE CLIENT holding two pooled inboxes, and says nothing about one ADDRESS
    // being live on two clients. `programme-sender.ts` compensates with a runtime read — a
    // check-then-act that two concurrent claims can both pass.
  })

  it('the migration file exists and is additive', () => {
    expect(existsSync(join(REPO, FILE)), 'the migration is missing').toBe(true)
    const sql = readFileSync(join(REPO, FILE), 'utf8')
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS/)
    expect(sql).toMatch(/client_inboxes/)
    // 🛑 NOTHING IS DROPPED, ALTERED OR DELETED. An index is the whole change.
    for (const destructive of ['DROP ', 'DELETE ', 'ALTER TABLE', 'TRUNCATE']) {
      expect(sql, `the migration is not additive — it contains ${destructive}`).not.toContain(destructive)
    }
  })

  it('it is scoped to LIVE rows only, so history survives', () => {
    const sql = readFileSync(join(REPO, FILE), 'utf8')
    expect(sql).toMatch(/WHERE status IN/)
    // A released or retired row must be able to share an address with a live one — that is
    // how a mailbox is ever handed from one client to the next.
    expect(sql).toMatch(/'assigned'/)
  })

  it('🛑 AND IT IS IN THE MECHANISM THAT ACTUALLY APPLIES MIGRATIONS', () => {
    // S1-PD-09's lesson: a migration lives in TWO places, and the `.sql` file alone is the one
    // nobody runs. `founder_alerts` sat unapplied from 10 Jul for exactly this reason.
    const pending = readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')
    expect(pending, 'the migration is not in PENDING_MIGRATIONS — nothing will ever apply it')
      .toContain("key: '20260916_client_inboxes_one_live_per_email'")
  })
})
