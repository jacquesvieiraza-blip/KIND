import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { permittedValues } from './constraint-live'
import { refMismatch } from './db-connection'
import { replyPathVerdict } from './reply-path'

vi.mock('@kind/db', () => ({ db: { from: () => ({}) } }))

// THE THREE OWED ITEMS, CLOSED.
//
// Carried since the Prompt 5 audit. Each one is the same defect wearing different clothes:
// a screen built to tell the truth, telling something slightly untrue about itself.

// ── ① THE LEDGER CHECK TOLD THE FOUNDER TO RUN A MIGRATION HE HAD ALREADY RUN ─────────────
describe('① ask the schema, not the history', () => {
  // Postgres renders an IN list as: check (type = ANY (ARRAY['purchase'::text, …]))
  const DEF = `CHECK ((type = ANY (ARRAY['purchase'::text, 'credit_purchase'::text, 'wallet_topup'::text, 'wallet_charge'::text, 'wallet_reverse'::text])))`

  it('reads the permitted values straight out of the definition', () => {
    const r = permittedValues(DEF, ['wallet_topup', 'wallet_charge', 'wallet_reverse'])
    expect(r.missing).toEqual([])
    expect(r.allowed).toHaveLength(3)
  })

  it('names exactly what is missing when the constraint is narrow', () => {
    const narrow = `CHECK ((type = ANY (ARRAY['purchase'::text, 'wallet_topup'::text])))`
    const r = permittedValues(narrow, ['wallet_topup', 'wallet_charge', 'wallet_reverse'])
    expect(r.allowed).toEqual(['wallet_topup'])
    expect(r.missing).toEqual(['wallet_charge', 'wallet_reverse'])
  })

  it('QUOTING MATTERS — purchase is a substring of credit_purchase', () => {
    // A bare substring search would report `purchase` as permitted by a constraint that only
    // allows `credit_purchase`. The quotes are what make the match a whole value.
    const onlyCredit = `CHECK ((type = ANY (ARRAY['credit_purchase'::text])))`
    expect(permittedValues(onlyCredit, ['purchase']).missing).toEqual(['purchase'])
  })

  it('no constraint means nothing is established as missing-or-present by parsing', () => {
    expect(permittedValues(null, ['wallet_topup']).missing).toEqual(['wallet_topup'])
  })

  it('THE ROW NO LONGER TELLS THE FOUNDER TO RUN A MIGRATION IT CANNOT CHECK', () => {
    // The old text: "Run migration 20260726_wallet_tx_types before the first real payment."
    // He had run it. A false instruction that is correctly ignored teaches you to ignore the
    // screen, which is worse than saying nothing.
    const src = readFileSync(join(__dirname, './integrity.ts'), 'utf8')
      .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    expect(src).toContain('readConstraintDef')
    expect(src).not.toContain('we still CANNOT tell whether the live CHECK constraint allows them')
  })
})

// ── ② A 4xx FROM A MISSING ROUTE READ AS "ANSWERING" ─────────────────────────────────────
describe('② a route that does not exist is not a route that answered', () => {
  // Imported lazily so the @kind/db mock is in place first.
  const load = async () => (await import('./system-probes')).isMissingRoute

  it("Express's default 404 is recognised as NO SUCH ROUTE", async () => {
    const isMissingRoute = await load()
    expect(isMissingRoute(404, '<!DOCTYPE html><html><body><pre>Cannot GET /operator/blockers</pre></body></html>')).toBe(true)
  })

  it('a bare "Cannot GET" body counts too', async () => {
    const isMissingRoute = await load()
    expect(isMissingRoute(404, 'Cannot GET /operator/gone')).toBe(true)
  })

  it('OUR 404 — JSON — is a route that answered', async () => {
    // The important half. /blockers legitimately 404s when nothing is blocking, and that
    // must stay green.
    const isMissingRoute = await load()
    expect(isMissingRoute(404, '{"success":false,"error":"not found"}')).toBe(false)
  })

  it('a JSON array body is ours too', async () => {
    const isMissingRoute = await load()
    expect(isMissingRoute(404, '[]')).toBe(false)
  })

  it('only 404 is considered — a 400 or 403 is always a real answer', async () => {
    const isMissingRoute = await load()
    expect(isMissingRoute(400, 'Cannot GET /x')).toBe(false)
    expect(isMissingRoute(403, '')).toBe(false)
    expect(isMissingRoute(200, '')).toBe(false)
  })

  it('an empty 404 body is treated as missing — it is not our shape either', async () => {
    const isMissingRoute = await load()
    expect(isMissingRoute(404, '')).toBe(true)
  })

  it('the three unexplained 404 rows now carry a note', () => {
    // They read "HTTP 404 — answering." with nothing explaining why a 404 was acceptable —
    // a green the reader cannot check.
    const src = readFileSync(join(__dirname, './system-probes.ts'), 'utf8')
    for (const p of ['/blockers', '/bookings', '/nexus']) {
      const i = src.indexOf(`{ path: '${p}'`)
      expect(i, p).toBeGreaterThan(-1)
      expect(src.slice(i, i + 120), p).toContain('note:')
    }
  })
})

// ── ③ THE REPLY PATH WAS NOT ON THE SCREEN AT ALL ────────────────────────────────────────
describe('③ the reply path has a row', () => {
  const src = readFileSync(join(__dirname, './system-probes.ts'), 'utf8')

  it('there is a probe for it', () => {
    expect(src).toContain('Reply path (inbound → client desk)')
  })

  // ⚠️ REWRITTEN BY #624, NOT WEAKENED. These two asserted their intent by scanning a
  // FIXED-WIDTH WINDOW of system-probes.ts (`slice(i, i + 2200)`) — the exact anti-pattern
  // that has produced self-inflicted guard bugs here before. #624 moved the judgement into a
  // PURE function (`replyPathVerdict`), so the window stopped containing it and the tests
  // failed on correct code. Asserting the BEHAVIOUR instead is strictly stronger: a window can
  // pass on a string that is never evaluated; a verdict cannot.
  it('a missing signing secret is CHECKED-BROKEN, not a quiet omission', () => {
    // Without RESEND_WEBHOOK_SECRET every inbound reply is rejected unverified, and the
    // client cannot tell: a lost reply looks exactly like a prospect who never answered.
    const v = replyPathVerdict({
      coldReplyTo: 'replies@kindoutreach.com', replyTo: null, resolved: 'replies@kindoutreach.com',
      resendDomains: ['kindoutreach.com'], lastReplyAt: null, hasSent: false,
      secretSet: false, now: new Date('2026-08-05T12:00:00Z'),
    })
    expect(v.state).toBe('broken')
    expect(v.detail).toContain('RESEND_WEBHOOK_SECRET')
    // And the row still exists on the screen to carry it.
    expect(src).toContain('replyPathVerdict({')
  })

  it('and it does NOT overclaim — configured is not the same as proven', () => {
    // Resend lists domains verified for SENDING; receiving also needs MX pointed at Resend.
    // So even the fully-green case must say it is not proof, and still send the operator to
    // the live-fire test.
    const v = replyPathVerdict({
      coldReplyTo: 'replies@kindoutreach.com', replyTo: null, resolved: 'replies@kindoutreach.com',
      resendDomains: ['kindoutreach.com'], lastReplyAt: null, hasSent: false,
      secretSet: true, now: new Date('2026-08-05T12:00:00Z'),
    })
    expect(v.state).toBe('ok')
    expect(v.detail).toContain('NOT proof')
    expect(v.action).toContain('reply to it')
  })

  it('the raw-body parser it depends on is still mounted ahead of express.json()', () => {
    // Structural, and it cannot be checked at runtime: if express.json() parses the body
    // first, the Svix signature can never verify and every reply is rejected. So it is
    // asserted here, where a reordering of index.ts will fail the build.
    const idx = readFileSync(join(__dirname, '../index.ts'), 'utf8')
    const raw = idx.indexOf("app.use('/figsy/replies/inbound', express.raw(")
    const json = idx.indexOf('app.use(express.json())')
    expect(raw).toBeGreaterThan(-1)
    expect(json).toBeGreaterThan(-1)
    expect(raw).toBeLessThan(json)
  })
})

// ── ④ THE PLACEHOLDER THAT REACHED PRODUCTION ────────────────────────────────────────────
//
// I wrote a worked example for rewriting DATABASE_URL to the pooler form, using a made-up
// project ref. It was pasted in literally. The error that came back was
// `(ENOTFOUND) tenant/user postgres.abcdefghijk not found` — Supavisor being perfectly
// accurate and completely unhelpful: it names a tenant, not a mistake.
//
// DATABASE_URL and SUPABASE_URL sit next to each other in Railway and must describe the SAME
// project, so a disagreement is always a typo. Detecting it turns a DNS-shaped error into one
// sentence naming the variable, the wrong value, and the right one.
describe('④ a project-ref typo names itself', () => {
  const API = 'https://realref123.supabase.co'

  it('catches the exact failure that happened — a placeholder in the pooler username', () => {
    const msg = refMismatch('postgresql://postgres.abcdefghijk:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres', API)
    expect(msg).toContain('abcdefghijk')
    expect(msg).toContain('realref123')
    expect(msg).toContain('DATABASE_URL')
  })

  it('catches it in the direct-host form too', () => {
    expect(refMismatch('postgresql://postgres:pw@db.wrongref.supabase.co:5432/postgres', API)).toContain('wrongref')
  })

  it('a MATCHING ref is silent — no false alarm on a correct setup', () => {
    expect(refMismatch('postgresql://postgres.realref123:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres', API)).toBeNull()
    expect(refMismatch('postgresql://postgres:pw@db.realref123.supabase.co:5432/postgres', API)).toBeNull()
  })

  it('case differences are not a mismatch', () => {
    expect(refMismatch('postgresql://postgres.REALREF123:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres', API)).toBeNull()
  })

  it('says nothing when there is nothing to compare — never a guess', () => {
    expect(refMismatch(null, API)).toBeNull()
    expect(refMismatch('postgresql://postgres:pw@localhost:5432/postgres', API)).toBeNull()
    expect(refMismatch('postgresql://postgres.x:pw@host:5432/postgres', null)).toBeNull()
  })

  it('every path that reads the database checks it FIRST', () => {
    // Otherwise each one fails with its own version of the unhelpful DNS error.
    for (const f of ['./pending-migrations.ts', './rls-live.ts', './backup-live.ts', './constraint-live.ts']) {
      expect(readFileSync(join(__dirname, f), 'utf8'), f).toContain('refMismatch')
    }
  })
})
