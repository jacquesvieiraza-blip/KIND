import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { SCAN_ROOTS, extractEnvNames, isScannableFile, stripCommentsForEnvScan } from './env-inventory'

// #561 — THE ENVIRONMENT DOC CANNOT GO STALE WITHOUT THE GATE GOING RED.
//
// A list of environment variables rots the moment somebody adds a `process.env` read, and it
// rots SILENTLY: nothing breaks, the doc is simply wrong the next time somebody trusts it.
// That is how #561 came to record **69** variables when the real number is **100**.
//
// So the doc is not maintained by memory. This test sweeps the three deployed apps and fails
// if a single variable is missing from `docs/ENVIRONMENT.md`, or if an API variable has no
// tier in `startup-check.ts` — the runtime half of the same fact.
//
// ⚠️ THE COMMENT TRAP, FOR THE FIFTH TIME IN THIS REPO. Comments are stripped BEFORE
// matching, in both directions. A comment explaining *"HOUSE_CLIENT_ID stays unset"* is not
// a read; counting it would demand the doc list variables no code touches, and a genuinely
// new read would hide among them. The stripper also understands **regex literals** — the
// first version did not, a `/…['"]…/` desynchronised its quote tracking, and it went blind
// to comments for the rest of the file. That bug is what made the first sweep report 96.

const REPO = join(__dirname, '../../../..')
const doc = () => readFileSync(join(REPO, 'docs/ENVIRONMENT.md'), 'utf8')
const startupCheck = () => readFileSync(join(__dirname, 'startup-check.ts'), 'utf8')

/** Walk one app's source tree, returning every env name → the apps that read it. */
function sweep(): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>()
  const walk = (dir: string, app: string) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry)
      if (statSync(p).isDirectory()) { walk(p, app); continue }
      if (!isScannableFile(p)) continue
      for (const name of extractEnvNames(readFileSync(p, 'utf8'))) {
        if (!found.has(name)) found.set(name, new Set())
        found.get(name)!.add(app)
      }
    }
  }
  for (const root of SCAN_ROOTS) walk(join(REPO, root), root.split('/')[1])
  return found
}

/** Variable names that have a real ROW in one of the doc's tables — not a prose mention. */
function tableRows(): string[] {
  return [...doc().matchAll(/^\| `([A-Z][A-Z0-9_]*)` \|/gm)].map(m => m[1])
}

const ALL = sweep()
const API_VARS = [...ALL.keys()].filter(k => ALL.get(k)!.has('api')).sort()

/** Variable names that have a tier in startup-check's own table. */
function startupCheckKeys(): Set<string> {
  const src = stripCommentsForEnvScan(startupCheck())
  const rx = /key:\s*'([A-Z][A-Z0-9_]*)',\s*level:/g
  const out = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = rx.exec(src)) !== null) out.add(m[1])
  return out
}

describe('every variable the code reads is in ENVIRONMENT.md', () => {
  it('the sweep finds the documented number, and it is not 69', () => {
    // Pinned so a silent collapse in the scanner (an exclusion that eats a whole tree, a
    // stripper regression) shows up as a failure rather than as a suspiciously clean sweep.
    // A scanner that finds NOTHING passes every "is it documented?" assertion below.
    // 100 → 101 (16 Aug, R42): ADMIN_URL, read only to build the "counter-sign this
    // partner" link in the alert email. Documented in ENVIRONMENT.md and given a tier in
    // startup-check in the same change — an undocumented variable is precisely the drift
    // this file exists to catch, and it caught this one.
    expect(ALL.size).toBe(104)   // 101 → 102 (26 Aug, R66): SAFE_TEST_MODE, the zero-spend guard
    expect(API_VARS.length).toBe(87)   // +1 26 Aug (R66): SAFE_TEST_MODE, the zero-spend guard
    expect(doc()).toContain('**104 distinct variables**')
  })

  it('NO variable is missing from the doc — checked against the TABLE, not the prose', () => {
    // THE ASSERTION THIS FILE EXISTS FOR. Add a process.env read, the gate goes red until
    // the table says what breaks without it and which service holds it.
    //
    // ⚠️ IT WAS `doc().includes(name)` AND THAT WAS TOO WEAK — found by red-proving it:
    // deleting INBOX_SECRET_KEY's whole table row did NOT fail this, because the name still
    // appeared in a sentence higher up. A variable named in prose and absent from the table
    // has no tier, no "what breaks", and no service — which is the entire content. Bound to
    // table rows only, so a mention can never stand in for an entry.
    const rows = tableRows()
    const undocumented = [...ALL.keys()].sort().filter(k => !rows.includes(k))
    expect(undocumented, `no table row in docs/ENVIRONMENT.md: ${undocumented.join(', ')}`).toEqual([])
  })

  it('every documented variable is actually read — the doc does not invent any', () => {
    // The other direction. A doc that lists variables nothing reads sends somebody to set
    // them, and teaches them the doc is approximate.
    const rows = tableRows()
    const phantom = rows.filter(k => !ALL.has(k))
    expect(phantom, `documented but read by nothing: ${phantom.join(', ')}`).toEqual([])
    expect(rows.length).toBe(ALL.size)
  })
})

describe('the runtime half agrees with the written half', () => {
  it('every API variable has a tier in startup-check', () => {
    // startup-check.ts IS the runtime view of this doc. It covered 22 of 83, so it was
    // reporting on a quarter of the environment and staying silent about the rest — which
    // reads, at boot, exactly like an environment with nothing else in it.
    const keys = startupCheckKeys()
    const missing = API_VARS.filter(k => !keys.has(k))
    expect(missing, `no tier in startup-check.ts: ${missing.join(', ')}`).toEqual([])
  })

  it('startup-check does NOT claim variables the API never reads', () => {
    const keys = [...startupCheckKeys()]
    const stale = keys.filter(k => !ALL.get(k)?.has('api'))
    expect(stale, `startup-check lists these, the API reads none of them: ${stale.join(', ')}`).toEqual([])
  })

  it('the portal/admin-only variables are NOT in startup-check, and the doc says why', () => {
    // Adding them would report all 17 missing on a healthy deploy, because they live in
    // other Railway services. The honest move is to document the gap, not to fake coverage.
    const keys = startupCheckKeys()
    const nonApi = [...ALL.keys()].filter(k => !ALL.get(k)!.has('api'))
    expect(nonApi).toHaveLength(17)
    for (const k of nonApi) expect(keys.has(k), `${k} should not be in startup-check`).toBe(false)
    expect(doc()).toContain("The API's startup check cannot see these")
  })
})

describe('the tiers this week\'s decisions turn on', () => {
  const tier = (k: string) => {
    const m = stripCommentsForEnvScan(startupCheck())
      .match(new RegExp(`key:\\s*'${k}',\\s*level:\\s*'(\\w+)'`))
    return m?.[1] ?? null
  }

  it('HOUSE_CLIENT_ID is PARKED — presence is the fault, not absence', () => {
    // #593 parked the Instantly push on 30 Jul, and unset is the mechanism. A check that
    // could only see missing values could not have caught somebody setting this.
    expect(tier('HOUSE_CLIENT_ID')).toBe('parked')
    expect(doc()).toContain('leave it UNSET')
    expect(doc()).toContain('#593')
  })

  it('the dead payment processors are parked, and the doc says delete them', () => {
    expect(tier('PAYSTACK_SECRET_KEY')).toBe('parked')
    expect(tier('FLUTTERWAVE_SECRET_KEY')).toBe('parked')
    expect(doc()).toContain('Delete them from Railway')
  })

  it('INSTANTLY_API_KEY is parked because the API is not called at all', () => {
    expect(tier('INSTANTLY_API_KEY')).toBe('parked')
    expect(doc()).toContain('warmup utility only')
  })

  it('INBOX_SECRET_KEY is in the SENDING go-live capability — it was a false green', () => {
    // Without it not one stored mailbox password can be decrypted, so every per-client send
    // is refused. The readiness block printed ✅ CLIENT SENDING anyway.
    // `[^)]*` would stop at the ")" inside "(FIGSY emails)" and read an empty var list —
    // an assertion that fails while the code is right. Bound it to the array instead.
    const caps = startupCheck().match(/capability\('✉️[\s\S]*?\]\)/)![0]
    expect(caps).toContain('INBOX_SECRET_KEY')
  })

  it('SUPABASE_ANON_KEY is REQUIRED — the API does not boot without it', () => {
    // createClient(url!, undefined!) throws at module scope in middleware/auth.ts. It was
    // effectively critical and listed nowhere.
    expect(tier('SUPABASE_ANON_KEY')).toBe('critical')
  })

  it('SMARTLEAD_WEBHOOK_SECRET says it must be set BEFORE the first campaign', () => {
    // "Unset until a client" is true and incomplete: set it after the first campaign and
    // inbound replies arrive unverified in the gap.
    expect(doc()).toContain('before the first Smartlead campaign')
  })
})

describe('the scanner sees what a grep cannot, and ignores what it should', () => {
  it('strips line and block comments', () => {
    expect(extractEnvNames('// process.env.GHOST\nconst a = 1')).toEqual(new Set())
    expect(extractEnvNames('/* process.env.GHOST */')).toEqual(new Set())
  })

  it('does NOT eat a real read that follows a URL on the same line', () => {
    // The naive `replace(/\/\/.*$/gm, '')` truncates this line at "https:" and the scanner
    // goes blind exactly where endpoints and configuration sit together.
    const src = `const u = 'https://api.example.com'; const k = process.env.REAL_ONE`
    expect(extractEnvNames(src).has('REAL_ONE')).toBe(true)
  })

  it('a regex literal containing quotes does not blind the stripper after it', () => {
    // The bug that made the first sweep report 96 instead of 100, and invent a variable
    // called FOO that lived only in a sentence.
    const src = [
      `const rx = /key:\\s*['"]([A-Z]+)['"]/g`,
      `// process.env.GHOST_AFTER_REGEX`,
      `const k = process.env.REAL_AFTER_REGEX`,
    ].join('\n')
    const found = extractEnvNames(src)
    expect(found.has('REAL_AFTER_REGEX')).toBe(true)
    expect(found.has('GHOST_AFTER_REGEX')).toBe(false)
  })

  it('finds the indirect reads a process.env grep reports as non-existent', () => {
    expect(extractEnvNames(`has('PAYSTACK_SECRET_KEY')`).has('PAYSTACK_SECRET_KEY')).toBe(true)
    expect(extractEnvNames(`priceEnvVar: 'STRIPE_PRICE_MILLA_MONTHLY'`).has('STRIPE_PRICE_MILLA_MONTHLY')).toBe(true)
    expect(extractEnvNames(`{ key: 'STRIPE_PRICE_LEADGEN_20', level: 'important' }`).has('STRIPE_PRICE_LEADGEN_20')).toBe(true)
  })

  it('test files are excluded — a fixture is not configuration', () => {
    expect(isScannableFile('apps/api/src/lib/thing.test.ts')).toBe(false)
    expect(isScannableFile('apps/api/src/lib/thing.ts')).toBe(true)
    expect(isScannableFile('apps/api/src/types/x.d.ts')).toBe(false)
  })

  it('a shared /g regex does not carry lastIndex between files', () => {
    // Reusing the exported patterns directly would make the SECOND file scanned start
    // part-way through — a scanner that finds less the more it is asked to look at.
    const src = 'process.env.ONE; process.env.TWO'
    expect(extractEnvNames(src)).toEqual(new Set(['ONE', 'TWO']))
    expect(extractEnvNames(src)).toEqual(new Set(['ONE', 'TWO']))
  })
})
