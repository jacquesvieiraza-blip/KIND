import { describe, it, expect } from 'vitest'
import { classifyProbeError, MISSING_FUNCTION_CODES } from './schema-probe'
import { readFileSync } from 'fs'
import { join } from 'path'

// #383 — A MISSING FUNCTION MUST BE AS VISIBLE AS A MISSING COLUMN.
//
// The System page could ask "does this table exist" and "does this column exist" and had no
// way to ask "does this FUNCTION exist". `increment_figsy_emails_sent` was written on 10 Jul,
// never added to the runner, never created in production — and nothing on the one page built
// to answer schema questions could see it. A month of silent undercounting.
//
// These tests pin BOTH directions, because the dangerous failure is not "misses a missing
// function" — it is the #630 failure: calling an outage "missing" and sending the founder to
// run a migration that was never the problem.

describe('#383 — classifyProbeError(…, "function")', () => {
  it('says MISSING on the Postgres undefined_function code', () => {
    const r = classifyProbeError({ code: '42883', message: 'function public.foo(uuid) does not exist' }, 'function')
    expect(r.verdict).toBe('missing')
  })

  it('says MISSING on the PostgREST schema-cache code', () => {
    const r = classifyProbeError({ code: 'PGRST202', message: 'Could not find the function public.foo' }, 'function')
    expect(r.verdict).toBe('missing')
  })

  it('says MISSING from the WORDING when no code arrives', () => {
    // PostgREST does not always populate `code` — the founder's own app_settings failure was
    // message-only. Codes first, wording second.
    const r = classifyProbeError({ code: null, message: "Could not find the function public.increment_figsy_emails_sent" }, 'function')
    expect(r.verdict).toBe('missing')
  })

  it('exposes the codes it classifies on, so a future reader can argue with them', () => {
    expect([...MISSING_FUNCTION_CODES]).toEqual(['42883', 'PGRST202'])
  })
})

describe('#383 — and it must NEVER call an outage "missing" (the #630 law)', () => {
  const notMissing: [string, { code?: string | null; message?: string | null }][] = [
    ['an RLS refusal',        { code: '42501', message: 'permission denied for function foo' }],
    ['a network drop',        { code: null,    message: 'fetch failed' }],
    ['a paused project',      { code: null,    message: 'Project is paused' }],
    ['a timeout',             { code: '57014', message: 'canceling statement due to statement timeout' }],
    ['an empty message',      { code: null,    message: '' }],
    ['a bad API key',         { code: '401',   message: 'Invalid API key' }],
    ['a missing TABLE inside the function', { code: '42P01', message: 'relation "public.bar" does not exist' }],
  ]

  for (const [what, err] of notMissing) {
    it(`returns UNKNOWABLE for ${what} — not "run the migration"`, () => {
      const r = classifyProbeError(err, 'function')
      expect(r.verdict, `${what} must not be reported as a missing function`).toBe('unknowable')
    })
  }

  it('the last case is the subtle one: a table error inside the RPC is NOT the function missing', () => {
    // A function whose body references a dropped table fails with a TABLE error. Reporting
    // that as "the function is missing" sends someone to re-create a function that is already
    // there, while the real fault — the table — goes unmentioned.
    const r = classifyProbeError({ code: '42P01', message: 'relation "public.figsy_campaigns" does not exist' }, 'function')
    expect(r.verdict).toBe('unknowable')
    expect(r.detail).toContain('figsy_campaigns')
  })

  it('no error at all means it exists', () => {
    expect(classifyProbeError(null, 'function').verdict).toBe('exists')
  })
})

describe('#383 — the probe is actually wired into the System page', () => {
  const src = readFileSync(join(__dirname, 'system-probes.ts'), 'utf8')

  it('increment_figsy_emails_sent is in REQUIRED_FUNCTIONS', () => {
    expect(src).toContain('increment_figsy_emails_sent')
    expect(src).toContain('REQUIRED_FUNCTIONS')
  })

  it('and it is probed with a uuid that can match no row, so the check mutates nothing', () => {
    expect(src).toContain('NO_SUCH_ROW_UUID')
    expect(src).toContain('00000000-0000-0000-0000-000000000000')
  })

  it('and it names the migration to run, so a red row is actionable', () => {
    expect(src).toContain('20260710_increment_emails_sent')
  })
})
