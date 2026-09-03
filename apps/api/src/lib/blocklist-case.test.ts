import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { normalizeRevealEmail, normalizeRevealEmails } from './billing-rules'

// ── HC-1 — A MIXED-CASE OPT-OUT WAS UNMATCHABLE ───────────────────────────────────────────
//
// THE DEFECT, in one sentence: the table that decides whether a person who said STOP gets
// emailed again stored two different shapes of the same address, and every send-path probe
// compared them exactly.
//
// Writers disagreed. The unsubscribe route and the bounce handler lowercased; the
// consent-decline writer, the manual-block writer and the reply-STOP writer stored the address
// exactly as it arrived. Readers all did `.eq('email', lead.email)` against `leads.email`,
// which the code's own comment calls "stored raw". So the match was a coin toss on letter case.
//
// WHY IT SURVIVED THIS LONG — and the reason this file exists rather than a one-line fix:
// FIVE of the probes ALREADY lowercased, so the code READ as if it were handled. They
// lowercased the rows the database RETURNED. That does nothing at all. A row that fails to
// match is never returned, so there is nothing to lowercase. The normalisation has to happen
// on the value being SENT, and the stored column has to already be normalised.
//
// The first two tests are the RED PROOF: they model the old and new behaviour against a store
// that matches the way PostgREST matches — exactly. They fail against the old shape and pass
// against the new one, in BOTH directions.

/**
 * A stand-in for `opt_out_blocklist` that matches the way the real one does: byte-exact
 * equality on the email column. This is the whole point — a mock that lowercases internally
 * would hide the defect, which is precisely how the existing suppression tests missed it
 * (`manual-reply.test.ts` mocks `blocked` as a plain boolean, so no case behaviour is exercised).
 */
class ExactMatchBlocklist {
  private rows: { email: string }[] = []
  /** How a WRITER puts someone on the list. */
  write(email: string) { this.rows.push({ email }) }
  /** How a READER asks "is this person suppressed?" — exact compare, no coercion. */
  probe(email: string): boolean { return this.rows.some(r => r.email === email) }
  /** The batch form, `.in('email', [...])`. */
  probeMany(emails: string[]): Set<string> {
    return new Set(this.rows.filter(r => emails.includes(r.email)).map(r => r.email))
  }
}

describe('HC-1 RED PROOF ① — someone opts out via a lowercasing route, then we try to send', () => {
  // The scenario from the field: the lead was sourced as `John@Acme.com` (providers return the
  // address with whatever case the person's employer configured). They click the one-click
  // unsubscribe, which lowercases before writing. The next sequence step probes with the RAW
  // lead address.
  const LEAD_EMAIL = 'John@Acme.com'

  it('OLD behaviour SENDS to someone who unsubscribed — this is the bug', () => {
    const store = new ExactMatchBlocklist()
    store.write(LEAD_EMAIL.trim().toLowerCase())   // the unsubscribe route, as it always was
    const blockedUnderOldCode = store.probe(LEAD_EMAIL) // the old probe: raw lead email

    expect(blockedUnderOldCode).toBe(false)        // ← RED: not suppressed, the step would send
  })

  it('NEW behaviour SUPPRESSES — the probe is normalised', () => {
    const store = new ExactMatchBlocklist()
    store.write(normalizeRevealEmail(LEAD_EMAIL)!)
    const blockedUnderNewCode = store.probe(normalizeRevealEmail(LEAD_EMAIL)!)

    expect(blockedUnderNewCode).toBe(true)         // ← GREEN: suppressed
  })
})

describe('HC-1 RED PROOF ② — the reverse: a raw-case blocklist row must block a lowercase lead', () => {
  // The other direction, and the one the migration exists for. The consent-decline writer
  // stored `John@Acme.com` raw. A later lead for the same person arrives already lowercased
  // (a CSV import, or a different provider).
  const RAW_BLOCK = 'John@Acme.com'
  const LOWER_LEAD = 'john@acme.com'

  it('OLD behaviour SENDS — the raw stored row does not match the lowercase lead', () => {
    const store = new ExactMatchBlocklist()
    store.write(RAW_BLOCK)                          // consent-decline writer, as it always was
    expect(store.probe(LOWER_LEAD)).toBe(false)     // ← RED
  })

  it('NEW behaviour SUPPRESSES — the writer normalises, so the row is matchable', () => {
    const store = new ExactMatchBlocklist()
    store.write(normalizeRevealEmail(RAW_BLOCK)!)   // writer now normalises
    expect(store.probe(normalizeRevealEmail(LOWER_LEAD)!)).toBe(true)  // ← GREEN
  })

  it('the BATCH probe has the same hole, and the same fix', () => {
    const store = new ExactMatchBlocklist()
    store.write(normalizeRevealEmail(RAW_BLOCK)!)

    // Old: raw candidate list against a normalised store.
    expect(store.probeMany([RAW_BLOCK]).size).toBe(0)                    // ← RED
    // New: normalised candidate list.
    expect(store.probeMany(normalizeRevealEmails([RAW_BLOCK])).size).toBe(1) // ← GREEN
  })
})

// ── THE GUARD — what stops this coming back ───────────────────────────────────────────────
// The fix above is 16 edits across 8 files. Nothing prevents the 17th call site from being
// added raw, and that one site would silently re-open the hole for everyone it touches. So the
// guard reads the source and asserts the property directly.

const API_SRC = join(__dirname, '..')

/**
 * The source window belonging to ONE `db.from('opt_out_blocklist')` chain.
 *
 * Cut at the next `db.from(` rather than at a fixed character count. The first version of this
 * guard used a flat 400/500-char slice and reported two offenders that were not offenders at
 * all — a `leads` lookup sitting a few lines below the blocklist call, pulled in by the window.
 * A guard that cries wolf gets weakened by the next person who hits it, so it has to be exact
 * about which statement it is judging.
 */
function statementWindow(text: string, idx: number, cap: number): string {
  const rest = text.slice(idx + 1, idx + cap)
  const next = rest.indexOf('db.from(')
  return text.slice(idx, next === -1 ? idx + cap : idx + 1 + next)
}

function sourceFiles(): { path: string; text: string }[] {
  const { readdirSync, statSync } = require('fs') as typeof import('fs')
  const out: { path: string; text: string }[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) { walk(p); continue }
      if (!name.endsWith('.ts') || name.endsWith('.test.ts')) continue
      out.push({ path: p, text: readFileSync(p, 'utf8') })
    }
  }
  walk(API_SRC)
  return out
}

describe('HC-1 GUARD — every opt_out_blocklist email comparison goes through the normaliser', () => {
  // Matches `.eq('email', X)` and `.in('email', X)` and captures X, anywhere in the API source.
  const PROBE = /\.(eq|in)\(\s*'email'\s*,\s*([^)]+?)\s*\)/g

  it('no probe against the blocklist passes a raw value', () => {
    const offenders: string[] = []

    for (const { path, text } of sourceFiles()) {
      // Only look at statements that actually touch opt_out_blocklist. A probe is written as a
      // chain, so take a window from each `from('opt_out_blocklist')` to the end of its
      // statement and inspect only that.
      let idx = text.indexOf("from('opt_out_blocklist')")
      while (idx !== -1) {
        const window = statementWindow(text, idx, 400)
        for (const m of window.matchAll(PROBE)) {
          const arg = m[2].trim()
          const normalised =
            arg.startsWith('normalizeRevealEmail(') ||
            arg.startsWith('normalizeRevealEmails(') ||
            // A variable is acceptable ONLY if it was itself built by the normaliser; the
            // assertion below proves that for each one by name.
            NORMALISED_VARS.has(arg)
          if (!normalised) {
            const line = text.slice(0, idx + m.index!).split('\n').length
            offenders.push(`${path.replace(API_SRC, 'apps/api/src')}:${line} → ${arg}`)
          }
        }
        idx = text.indexOf("from('opt_out_blocklist')", idx + 1)
      }
    }

    expect(offenders).toEqual([])
  })

  // The three probes that pass a variable rather than a call. Each is proven normalised at its
  // definition by the test below — listing them here rather than pattern-matching keeps the
  // guard honest: a NEW variable name is an offender until someone adds it deliberately.
  const NORMALISED_VARS = new Set(['batchEmails', 'candEmails', 'emailKey', 'consentKey', 'programmeEmails', 'reviewEmails'])

  it('every variable on that allowlist is built by the normaliser at its definition', () => {
    // `singular` distinguishes the one-address probe from the batch ones. Both forms are
    // normalisers; asserting the BATCH name against a single-address variable would pass
    // vacuously on a file that used neither, which is the failure this whole block guards.
    const defs: { file: string; name: string; singular?: boolean }[] = [
      { file: 'routes/figsy.ts',     name: 'batchEmails' },
      { file: 'routes/icps.ts',      name: 'candEmails'  },
      // HC-3 — the Smartlead push probes the blocklist before handing a lead to an engine we do
      // not control. One address, so the singular normaliser.
      { file: 'lib/smartlead-send.ts', name: 'emailKey', singular: true },
      // HC-4 — the consent email probes the blocklist before asking a stranger for permission.
      // S6: opt-outs are global, so a person sourced afresh for another client must not be
      // asked for consent they already refused. One address, so the singular normaliser.
      { file: 'lib/email.ts',          name: 'consentKey', singular: true },
      // ⚑ PR A2 — programme outreach preparation probes the blocklist before creating an
      // enrolment, so a person who opted out through ANY client is never enrolled into a
      // programme sequence. A page of addresses, so the batch normaliser.
      { file: 'lib/programme-preparation.ts', name: 'programmeEmails' },
      // ⚑ PR B — the CUSTOMER'S REVIEW DESK probes the blocklist before showing somebody as a
      // reviewable prospect, so a person who hard-bounced or opted out through ANY client can
      // never be part of the population a programme approval rests on. A page of addresses, so
      // the batch normaliser. This guard CAUGHT the probe on its first run — it was written
      // normalised but named `emails`, which is too generic to sit on a security allowlist.
      { file: 'lib/programme-review.ts', name: 'reviewEmails' },
    ]
    for (const { file, name, singular } of defs) {
      const text = readFileSync(join(API_SRC, file), 'utf8')
      const decls = [...text.matchAll(new RegExp(`const ${name}\\s*=\\s*([\\s\\S]{0,120})`, 'g'))]
      expect(decls.length, `${file}: no declaration of ${name} found`).toBeGreaterThan(0)
      for (const d of decls) {
        expect(d[1], `${file}: ${name} is not built by the normaliser`)
          .toContain(singular ? 'normalizeRevealEmail(' : 'normalizeRevealEmails(')
      }
    }
  })

  it('every WRITE to the blocklist normalises the email it stores', () => {
    const offenders: string[] = []
    for (const { path, text } of sourceFiles()) {
      let idx = text.indexOf("from('opt_out_blocklist')")
      while (idx !== -1) {
        const window = statementWindow(text, idx, 500)
        if (/\.(upsert|insert)\(/.test(window)) {
          // Find `email:` inside the written object, if the write sets one at all (the WhatsApp
          // path writes `whatsapp_number` and no email — legitimately exempt).
          const m = window.match(/\bemail:\s*([^,\n]+)/)
          if (m) {
            const val = m[1].trim()
            const ok = val.startsWith('normalizeRevealEmail(') || val === 'blockKey' || val === 'addr' || val === 'bounceEmail'
            if (!ok) {
              const line = text.slice(0, idx).split('\n').length
              offenders.push(`${path.replace(API_SRC, 'apps/api/src')}:${line} → email: ${val}`)
            }
          }
        }
        idx = text.indexOf("from('opt_out_blocklist')", idx + 1)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('HC-1 — the migration is in BOTH homes (AR6) and repairs the stored rows', () => {
  const KEY = '20260819_blocklist_email_normalize'
  const sqlPath = join(API_SRC, '../../../supabase/migrations', `${KEY}.sql`)
  const runner = readFileSync(join(API_SRC, 'lib/pending-migrations.ts'), 'utf8')
  const sql = readFileSync(sqlPath, 'utf8')

  it('the .sql file and the runner entry both exist', () => {
    expect(runner).toContain(`key: '${KEY}'`)
    expect(sql.length).toBeGreaterThan(0)
  })

  it('the runner carries the SAME statements as the .sql file — a drifted copy is worse than none', () => {
    // Only the runner executes. If the file and the string disagree, the file is a lie about
    // what production ran.
    const statements = (s: string) => s
      .split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
      .replace(/\s+/g, ' ').trim()
    expect(statements(runner.slice(runner.indexOf(`key: '${KEY}'`)))).toContain(statements(sql))
  })

  it('every statement is guarded on email IS NOT NULL — the WhatsApp rows must not be touched', () => {
    const bodies = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
    const stmts = bodies.split(';').map(s => s.trim()).filter(Boolean)
    expect(stmts.length).toBe(3)
    for (const s of stmts) expect(s).toContain('email IS NOT NULL')
  })

  it('FAILS CLOSED — a still-blocked case-variant clears opted_back_in_at on the survivor', () => {
    // The founder ruled this on 19 Aug. "Keep the earliest created_at" alone can take a
    // suppressed person OFF the list, which is the one direction this table must never move.
    expect(sql).toMatch(/SET opted_back_in_at = NULL/)
    expect(sql).toMatch(/o\.opted_back_in_at IS NULL/)
    // And the fail-closed UPDATE must come BEFORE the delete, or the row it needed is gone.
    expect(sql.indexOf('SET opted_back_in_at = NULL')).toBeLessThan(sql.indexOf('DELETE FROM'))
  })

  it('deletes duplicates BEFORE lowercasing — the other order collides on the unique index', () => {
    expect(sql.indexOf('DELETE FROM')).toBeLessThan(sql.indexOf('SET email = lower(btrim(email))'))
  })

  it('is idempotent — the normalising update only touches rows that differ from their own form', () => {
    expect(sql).toContain('email <> lower(btrim(email))')
  })
})
