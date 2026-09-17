// #627 + #628 — THE REPAIR BATCH: five things that were saying something untrue.
//
// #627 — `app_settings` DID NOT EXIST. The System check read it for months and reported "no
// usable pdl_monthly_cap_usd setting exists — set it", pointing the operator at a table that
// was not there. The founder pressed Save on the #626 card and got the real error back. Two
// different problems (no table / no row) had been sharing one sentence, so the screen could not
// tell the operator which one they had — and the fix for one is "run a migration" while the fix
// for the other is "type a number".
//
// #628 — the client-facing Settings page was BOTH overselling and underselling, in the same
// scroll. It advertised a white-label product that does not exist with a commercial number
// ("30% recurring") that contradicts the partner ledger (25%); it told clients "there is no
// approval hold yet" when figsy.ts holds every send when review_required is set; it described
// a full calendar-booking build as "can generate a booking link"; and it called the Settings
// page "My profile" in both places that link to it, which is why the founder could not find
// Settings on his own product.
//
// PART 6 — and no System row covered calendar booking at all, which is the #624 gap one step
// further down the same funnel.
//
// ⚠️ ASSERTION SCOPING. Every source assertion below is bounded to the FUNCTION BODY or the
// specific call it is about, never a fixed character window and never an anchor that only
// exists in a comment. Both of those have produced tests here that passed with the code
// deleted — the `// #108` anchor in a comment-stripped file, and the 700-char window that
// overran into the next component.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { isMissingTable, MISSING_TABLE_CODES } from './schema-probe'
import { calendarBookingVerdict, missingCalendarVars } from './calendar-probe'
import { stripCommentsForEnvScan } from './env-inventory'

const src = (p: string) => stripCommentsForEnvScan(readFileSync(join(__dirname, p), 'utf8'))

/** The body of a probe row, bounded by the NEXT `rows.push(` — never a char count. */
function probeBody(file: string, label: string): string {
  const at = file.indexOf(`rows.push(await probe('${label}'`)
  expect(at, `probe row "${label}" not found`).toBeGreaterThan(-1)
  const end = file.indexOf('rows.push(await probe(', at + 10)
  return file.slice(at, end > at ? end : undefined)
}

// ── PART 1 ─────────────────────────────────────────────────────────────────────────────────

describe('#627 isMissingTable — one definition of "the table is not there"', () => {
  it('matches on the CODES, which are authoritative', () => {
    for (const code of MISSING_TABLE_CODES) {
      expect(isMissingTable({ code, message: 'anything at all' }), code).toBe(true)
    }
  })

  it('matches the founder\'s ACTUAL error, which arrived with no usable code', () => {
    // Verbatim from the screen on 6 Aug. PostgREST does not always populate `code` on a
    // schema-cache miss, so a code-only implementation would have called this "unknown" and
    // the row would have kept saying "set the value" — the exact bug being fixed.
    expect(isMissingTable({
      code: null,
      message: "Could not find the table 'public.app_settings' in the schema cache",
    })).toBe(true)
  })

  it('matches the raw Postgres wording too', () => {
    expect(isMissingTable({ code: null, message: 'relation "app_settings" does not exist' })).toBe(true)
  })

  it('says NO to an ordinary error — a timeout is not a missing table', () => {
    // The dangerous direction: reading any error as "missing" turns an outage into a
    // confident, wrong verdict that tells the operator to run a migration they do not need.
    expect(isMissingTable({ code: '57014', message: 'canceling statement due to statement timeout' })).toBe(false)
    expect(isMissingTable({ code: '42501', message: 'permission denied for table app_settings' })).toBe(false)
    expect(isMissingTable({ code: '42703', message: 'column "x" does not exist' })).toBe(false)
  })

  it('says NO to no error at all', () => {
    expect(isMissingTable(null)).toBe(false)
    expect(isMissingTable({})).toBe(false)
  })
})

describe('#627 the PDL-cap probe tells the two problems apart', () => {
  const file = src('system-probes.ts')
  // ⛓️ 17 Sep (XC-13 · FD-6) — THE LABEL MOVED, THE PROBE DID NOT. It read
  // `'PDL spend against the monthly cap'`, present tense, which under FD-6 describes spending
  // that is not happening. It is now `'Historic PDL spend against its old monthly cap'`, and
  // the row is KEPT rather than deleted because dollars genuinely committed before FD-6 are
  // still real, and this test's actual subject — a missing TABLE being told apart from an
  // unset VALUE — is unchanged and is the thing #627 was written for.
  const body = probeBody(file, 'Historic PDL spend against its old monthly cap')

  it('checks the ERROR before it looks at the value', () => {
    // Reading `capRow.data` first is what produced the false sentence: a table-missing error
    // leaves data null, which looked identical to "nobody has set one yet".
    const errAt = body.indexOf('isMissingTable(')
    const valAt = body.indexOf('const capRaw')
    expect(errAt, 'the missing-table check must exist').toBeGreaterThan(-1)
    expect(valAt).toBeGreaterThan(-1)
    expect(errAt, 'the error must be classified BEFORE the value is read').toBeLessThan(valAt)
  })

  it('a missing TABLE is BROKEN and names the migration to run', () => {
    const at = body.indexOf('isMissingTable(')
    const branch = body.slice(at, body.indexOf('const capRaw'))
    expect(branch).toContain('broken(')
    expect(branch).toContain('20260806_app_settings')
    expect(branch, 'must say A15 comes first, or the operator runs it and it fails').toContain('A15')
  })

  it('a missing ROW is UNMEASURED and points at the card that can now set it', () => {
    const at = body.indexOf('const capRaw')
    const branch = body.slice(at)
    expect(branch).toContain('unmeasured(')
    // The old action was "Set pdl_monthly_cap_usd before sourcing at volume" — a fix with no
    // path to performing it. It must now name the screen.
    expect(branch).toContain('Vida → Engine')
  })

  it('the two branches do NOT share a sentence', () => {
    // The whole defect was one sentence covering two problems. If the missing-table branch
    // ever reuses the "no usable setting exists" wording, the fix has been undone.
    const at = body.indexOf('isMissingTable(')
    const tableBranch = body.slice(at, body.indexOf('const capRaw'))
    expect(tableBranch).not.toContain('no usable pdl_monthly_cap_usd setting exists')
  })

  it('an unreadable table is NOT-MEASURED, never a pass and never "run the migration"', () => {
    // A database that is unwell must not send the operator to run a migration.
    const at = body.indexOf('if (capRow.error)')
    expect(at, 'the residual-error branch must exist').toBeGreaterThan(-1)
    const branch = body.slice(at, body.indexOf('const capRaw'))
    expect(branch).toContain('unmeasured(')
    expect(branch).not.toContain('20260806_app_settings')
  })
})

describe('#627 the GET route makes the same distinction the probe does', () => {
  const route = src('../routes/operator.ts')
  const at = route.indexOf("get('/settings/pdl-cap'")
  const body = route.slice(at, route.indexOf('operatorRouter.', at + 10))

  it('is found at all', () => {
    expect(at).toBeGreaterThan(-1)
    expect(body.length).toBeGreaterThan(50)
  })

  it('table-missing names the migration; anything else reports the raw error', () => {
    expect(body).toContain('isMissingTable(')
    expect(body).toContain('20260806_app_settings')
    // The non-missing branch must still surface what actually went wrong, verbatim (#349) —
    // a swallowed message is how a database problem reads as "no cap set".
    expect(body).toContain('error.message')
  })
})

describe('#627 the migration exists in BOTH homes and is safe to run twice', () => {
  const REPO = join(__dirname, '../../../..')
  const file = readFileSync(join(REPO, 'supabase/migrations/20260806_app_settings.sql'), 'utf8')
  const runner = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')

  it('the runner — the ONLY list that executes — carries the key', () => {
    // A .sql file with no runner entry is a file nobody runs. The reverse gap (a runner
    // string with no file) is what `migration-home.test.ts` was built for.
    expect(runner).toContain("20260806_app_settings")
  })

  it('is idempotent — the founder may click Run migrations more than once', () => {
    expect(file).toMatch(/create\s+table\s+if\s+not\s+exists/i)
    expect(runner.slice(runner.indexOf('20260806_app_settings'))).toMatch(/create\s+table\s+if\s+not\s+exists/i)
  })

  it('destroys nothing — a migration against a live database must not drop', () => {
    expect(file).not.toMatch(/drop\s+(table|column)/i)
  })

  it('declares exactly what the code uses, plus the timestamp — no speculative columns', () => {
    for (const col of ['key', 'value', 'updated_at']) expect(file).toContain(col)
    expect(file).toMatch(/comment\s+on\s+table/i)
  })
})

// ── PART 6 ─────────────────────────────────────────────────────────────────────────────────

describe('#628 calendarBookingVerdict — can a prospect actually book?', () => {
  const full = { clientId: 'id', clientSecret: 'secret', redirectUri: 'https://x/cb', portalUrl: null }

  it('all three vars set, connections on file → OK, and it says what it did NOT check', () => {
    const v = calendarBookingVerdict({ env: full, connections: 3 })
    expect(v.state).toBe('ok')
    expect(v.detail).toContain('3 client calendar connection')
    // A stored refresh token is not proof Google still honours it. An env check that implied
    // "a booking would succeed today" would be a false green of the #565 kind.
    expect(v.detail).toContain('REVOKED')
  })

  it('names WHICH variable is missing and what it costs — not just that one is', () => {
    const v = calendarBookingVerdict({ env: { ...full, clientId: null }, connections: 0 })
    expect(v.state).toBe('broken')
    expect(v.detail).toContain('GOOGLE_CLIENT_ID')
    expect(v.detail).not.toContain('GOOGLE_CLIENT_SECRET')
    // "GOOGLE_CLIENT_ID is not set" reads as trivia. The consequence is the point.
    expect(v.detail).toContain('No client can connect a calendar')
  })

  it('names BOTH when both are gone', () => {
    const v = calendarBookingVerdict({ env: { clientId: null, clientSecret: null, redirectUri: 'r' }, connections: 0 })
    expect(v.detail).toContain('GOOGLE_CLIENT_ID')
    expect(v.detail).toContain('GOOGLE_CLIENT_SECRET')
  })

  it('a blank string is NOT set — an empty var is not a value', () => {
    expect(missingCalendarVars({ ...full, clientSecret: '   ' })).toContain('GOOGLE_CLIENT_SECRET')
  })

  it('does NOT shout about GOOGLE_REDIRECT_URI when PORTAL_URL can derive it', () => {
    // gcal.ts falls back to `${PORTAL_URL}/calendar/callback`. Reporting a missing variable
    // the code correctly fills in would be a false alarm, and false alarms are how an
    // operator learns to skip a row.
    const v = calendarBookingVerdict({
      env: { clientId: 'id', clientSecret: 's', redirectUri: null, portalUrl: 'https://app.example' },
      connections: 1,
    })
    expect(v.state).toBe('ok')
  })

  it('but DOES flag it when there is nothing to derive it from', () => {
    const missing = missingCalendarVars({ clientId: 'id', clientSecret: 's', redirectUri: null, portalUrl: null })
    expect(missing.join(' ')).toContain('GOOGLE_REDIRECT_URI')
  })

  it('zero connections with the env set is OK — and says why zero is expected', () => {
    // Pre-launch, nobody has onboarded. An alarming number on a screen read for alarm is how
    // real alarms stop being read.
    const v = calendarBookingVerdict({ env: full, connections: 0 })
    expect(v.state).toBe('ok')
    expect(v.detail).toContain('expected before the first client onboards')
  })

  it('an unreadable count is NOT-MEASURED — never a rendered zero', () => {
    // #565: a broken check must not render as a clean answer. Zero is calm and would hide it.
    const v = calendarBookingVerdict({ env: full, connections: null, countError: 'timeout' })
    expect(v.state).toBe('unmeasured')
    expect(v.detail).toContain('timeout')
    expect(v.detail).toContain('not a pass')
  })

  it('a missing env var beats an unreadable count — the definitive answer wins', () => {
    const v = calendarBookingVerdict({ env: { ...full, clientId: null }, connections: null })
    expect(v.state).toBe('broken')
  })
})

describe('#628 the calendar probe row is wired, and spends nothing', () => {
  const file = src('system-probes.ts')
  const body = probeBody(file, 'Calendar booking (Google OAuth)')

  it('exists in the Vida section', () => {
    expect(body).toContain('calendarBookingVerdict')
  })

  it('counts the REFRESH TOKEN — the artefact of a completed OAuth flow', () => {
    // The column every booking route already gates on. Counting `calendar_booking_enabled`
    // instead would count clients who ticked a box and never finished connecting.
    expect(body).toContain('google_calendar_refresh_token')
  })

  it('makes NO Google call — the standing rule is never a paid call, never a send', () => {
    expect(body).not.toContain('googleapis.com')
    expect(body).not.toContain('fetchWithTimeout')
  })

  it('an unreadable count becomes null, not zero', () => {
    // `c.count ?? 0` on an errored query would render "0 connections" for an outage.
    expect(body).toContain('c.error ? null :')
  })

  it('renders all three states — a verdict with no broken branch cannot warn', () => {
    expect(body).toContain('broken(')
    expect(body).toContain('unmeasured(')
    expect(body).toContain('ok(')
  })
})

// ── PARTS 3, 4, 5 — THE CLIENT-FACING PAGE ─────────────────────────────────────────────────

describe('#628/PART 3 white-label: the commercial claims are off the live page', () => {
  const page = src('../../../portal/src/app/(dashboard)/dashboard/settings/page.tsx')
  const at = page.indexOf('Agency &amp; white-label')
  const section = page.slice(at, page.indexOf('</div>', page.indexOf('hello@get-kind.com', at)))

  it('the section is found by its new heading', () => {
    expect(at, 'the rewritten agency section must exist').toBeGreaterThan(-1)
  })

  it('the 30% is GONE from the whole page — a prospect could quote it back at us', () => {
    // The partner system that DOES exist (routes/partners.ts) pays 25%. A live client page
    // offering 30% recurring is a number we cannot honour, on a surface clients read.
    expect(page).not.toContain('30% recurring')
    expect(page).not.toContain('Revenue share')
  })

  it('"Scale plan" is gone — it names a tier that exists in no pricing constant', () => {
    expect(page).not.toContain('Scale plan')
  })

  it('the four invented features are gone', () => {
    for (const claim of ['Custom branding', 'Sub-client management', 'White-label kit']) {
      expect(page, `${claim} must not be advertised`).not.toContain(claim)
    }
  })

  it('what remains says it is not available, and keeps the way to register interest', () => {
    expect(section).toContain('not available yet')
    expect(section).toContain('hello@get-kind.com')
  })

  it('and makes no new promise — no percentage, no date, no feature list', () => {
    expect(section).not.toMatch(/\d+%/)
    expect(section).not.toMatch(/\bQ[1-4]\b|next month|by (January|February|March|April|May|June|July|August|September|October|November|December)/i)
  })
})

describe('#628/PART 4 the approval hold: the page stops denying its own safety control', () => {
  const page = src('../../../portal/src/app/(dashboard)/dashboard/settings/page.tsx')
  const figsy = src('figsy.ts')

  it('THE PREMISE: the hold is real in the send path', () => {
    // If this ever stops being true, the copy below becomes the lie instead — so the copy
    // assertion is anchored to the behaviour it describes, not asserted on its own.
    expect(figsy).toContain('figsy_approval_queue')
    expect(figsy).toContain('review_required')
  })

  it('the false sentence is GONE', () => {
    expect(page).not.toContain('there is no approval hold yet')
    expect(page).not.toContain('FIGSY runs on Auto-Pilot')
  })

  it('the "Soon" badge is gone — it is not soon, it is built', () => {
    const at = page.indexOf('Approve emails before sending')
    const row = page.slice(at, page.indexOf('</p>', page.indexOf('</p>', at) + 4))
    expect(row).toContain('Available')
    expect(row).not.toContain('>Soon<')
  })

  it('says it is PER CAMPAIGN and how to get it — the honest limit of branch (b)', () => {
    // Branch (b) of Prompt 47: the hold is per-campaign and this toggle is global, so the
    // toggle is deliberately NOT wired. The copy must therefore not imply self-service.
    const at = page.indexOf('Approve emails before sending')
    const row = page.slice(at, page.indexOf('</div>', at))
    expect(row).toContain('per campaign')
    expect(row).toMatch(/ask us|ask your operator/i)
  })
})

describe('#628/PART 5 the two small truths', () => {
  const page = src('../../../portal/src/app/(dashboard)/dashboard/settings/page.tsx')

  it('the calendar copy describes what is actually built', () => {
    // gcal.ts: real free/busy, events.insert into their primary calendar, a Meet link, and
    // sendUpdates:'all'. "Can generate a booking link" undersold every one of those.
    expect(page).not.toContain('can generate a calendar booking link')
    expect(page).toContain('book straight into it')
    expect(page).toContain('Google Meet link')
  })

  it('BOTH menus call the page Settings — the founder could not find it', () => {
    const rail = src('../../../portal/src/components/milla/MillaShell.tsx')
    const menu = src('../../../portal/src/components/layout/ProfileMenu.tsx')
    expect(rail).toContain("'/milla/settings', 'Settings'")
    expect(rail).not.toContain('My profile')
    expect(menu).toContain("href: '/dashboard/settings'")
    expect(menu).not.toContain('My profile')
  })

  it('the rail did not lose a row while being relabelled', () => {
    // It did, on the first attempt: a trailing `//` comment on the array line swallowed the
    // Billing entry, and the build caught it. Asserted here so a comment cannot eat a link.
    const rail = src('../../../portal/src/components/milla/MillaShell.tsx')
    const at = rail.indexOf('const ACCOUNT')
    const arr = rail.slice(at, rail.indexOf(']', rail.indexOf('Referral', at)))
    for (const href of ['/milla/settings', '/milla/billing', '/milla/usage', '/milla/referral']) {
      expect(arr, `${href} must still be in the account rail`).toContain(href)
    }
  })
})
