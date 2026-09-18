// ══════════════════════════════════════════════════════════════════════════════════════════
// D-61 · THE ADMIN PROXY'S UPSTREAM IS CONFIGURATION, AND A TIMEOUT IS NOT AN OUTAGE (RC-4)
//
// REQ: *"Not hardcoded; timeout ≠ network."*
// GREEN: *"ADMIN_API_UPSTREAM configurable (already present) and asserted; timeout ≠ network
// distinguished (asserted by the baseline's check 3)."*
//
// ── THIS ITEM IS MOSTLY A VERIFY, AND SAYING SO IS THE POINT ────────────────────────────
//
// Both behaviours were built by XC-3 on 17 Sep and are already asserted by
// `xc3-schema-truth.test.ts`. Re-implementing either would be the duplication this repo spends
// its time removing. What this file adds is the ONE thing neither of them checks:
//
// 🛑 THAT THE CONFIGURED UPSTREAM IS ACTUALLY USED. The existing guard proves
// `ADMIN_API_UPSTREAM` is READ and that one documented default remains. A change that read the
// variable and then built the request URL from something else would satisfy every assertion
// there and point the whole admin console at the wrong deployment — which on this repo is the
// database real clients are in.
//
// ⚠️ AND THE SECOND HALF OF "NOT HARDCODED" IS THE REST OF THE APP. One proxy reading a
// variable is worth nothing if a second path holds its own literal, so the admin source is
// walked rather than the one file being read.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ADMIN = join(__dirname, '../../../admin/src')
const PROXY = join(ADMIN, 'app/api/proxy/[...path]/route.ts')

/**
 * The source with its comments removed — because a guard that scans raw text matches its own
 * struck quotations and its own explanations.
 *
 * ⚠️ `(?<![:\\])`, NOT `(?<!:)` — AND THIS FILE IS WHY. The first cut excluded only `://`, so
 * it read the END of a regex literal as the start of a comment: in
 * `API.replace(/^https?:\/\//, '')` the escaped slash `\/` is immediately followed by the
 * literal's own closing `/`, giving two adjacent slashes. The stripper truncated the line there
 * — and the truncated half was the network branch's sentence, so a guard about that sentence
 * failed against source that said exactly what it asked for. A guard failing for a reason that
 * has nothing to do with the thing it guards is the same defect class as one passing for the
 * wrong reason.
 */
const codeOnly = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n')
  .map(l => { const i = l.search(/(?<![:\\])\/\//); return i === -1 ? l : l.slice(0, i) })
  .join('\n')

const proxy = codeOnly(readFileSync(PROXY, 'utf8'))

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) sources(p, out)
    else if ((p.endsWith('.ts') || p.endsWith('.tsx')) && !p.includes('.test.')) out.push(p)
  }
  return out
}

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① CONFIGURABLE — AND USED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('D-61 · the upstream is configuration, not a literal', () => {
  it('🛑 IT IS READ FROM THE ENVIRONMENT, with the documented default as the fallback', () => {
    // The fallback stays deliberately: refusing to boot without the variable would take the
    // console down the moment it deploys, before anybody could set it.
    expect(proxy).toContain('process.env.ADMIN_API_UPSTREAM')
    expect(proxy).toContain('const DEFAULT_API =')
  })

  it('🛑 AND THE REQUEST IS BUILT FROM IT — reading a variable and ignoring it proves nothing', () => {
    // THE GAP THIS FILE EXISTS FOR. A change that read `ADMIN_API_UPSTREAM` and then fetched a
    // literal would pass every existing assertion and silently point the console at the live
    // deployment.
    expect(proxy).toMatch(/const url = `\$\{API\}\/\$\{path\.join\('\/'\)\}\$\{req\.nextUrl\.search\}`/)
    expect(proxy).toContain('res = await fetch(url, {')
    expect(proxy, 'the fetch target is a literal again').not.toMatch(/fetch\(\s*['"`]https?:/)
  })

  it('🛑 NO BARE LITERAL ANYWHERE IN THE ADMIN APP — every upstream has an env in front of it', () => {
    // 🛑 ONE PROXY READING A VARIABLE IS WORTH NOTHING IF A SECOND PATH HOLDS ITS OWN LITERAL.
    //
    // ⛓️ THE FIRST CUT OF THIS GUARD ASKED THE QUESTION PER FILE, AND WAS BLIND FOR IT. It
    // cleared a whole file the moment ANY line in it read the variable — so
    // `visitors/page.tsx`, whose line 19 is `process.env.NEXT_PUBLIC_API_URL || '<live>'` and
    // whose line 24 is a bare `fetch('https://…/track/visit')`, passed on the strength of the
    // line that was not the problem. The question is per OCCURRENCE, and it is asked that way
    // here.
    const LIVE = /https:\/\/kindapi-production/

    /**
     * The occurrences that are CONTENT, not a request this app makes — each named, counted, and
     * therefore closed. A literal appearing anywhere else, or one more appearing in these files,
     * fails this guard.
     */
    const CONTENT: Record<string, { count: number; why: string }> = {
      'src/app/launch/page.tsx': { count: 6,
        why: 'launch-checklist rows quoting the URL a human pastes into Google Console, Resend and Vercel — text the operator reads, not a target this app calls' },
      'src/app/smoketest/page.tsx': { count: 1,
        why: 'the health-check link on the API row: a production smoke test is meant to name production' },
      'src/app/visitors/page.tsx': { count: 1,
        why: "the tracking snippet the operator copies into a CLIENT's website, where this app's environment does not exist" },
    }

    // ⛓️ OCCURRENCES, NOT LINES — AND THE RED PROOF IS WHAT SAID SO. The first cut counted each
    // LINE that named the API once, so adding a SECOND literal to a line that already had one
    // moved no count and the allow-list's pin stayed green against a real new hardcoding. A
    // per-line count is a per-line guard wearing a per-occurrence label.
    const hitsIn = (line: string) => (line.match(/https:\/\/kindapi-production/g) ?? []).length

    const offenders: string[] = []
    const contentSeen: Record<string, number> = {}
    for (const p of sources(ADMIN)) {
      const rel = p.slice(p.indexOf('src/'))
      for (const line of codeOnly(readFileSync(p, 'utf8')).split('\n')) {
        let hits = hitsIn(line)
        if (hits === 0) continue
        // Configuration: the variable and the fallback on the same line — the proxy's own shape.
        // ONE occurrence is forgiven, because one is what a fallback is; a second on the same
        // line is a hardcoding hiding behind it.
        if (/process\.env\.(ADMIN_API_UPSTREAM|NEXT_PUBLIC_API_URL)[^\n]*\|\|/.test(line)) hits -= 1
        // The proxy's documented default, declared on its own line and read on the next.
        else if (rel.includes('api/proxy') && /const DEFAULT_API =/.test(line)) hits -= 1
        if (hits === 0) continue
        if (CONTENT[rel]) { contentSeen[rel] = (contentSeen[rel] ?? 0) + hits; continue }
        offenders.push(`${rel}: ${line.trim()}`)
      }
    }
    expect(offenders, 'an admin file reaches the live API with no environment variable in front of it')
      .toEqual([])
    for (const [rel, { count, why }] of Object.entries(CONTENT)) {
      expect(contentSeen[rel] ?? 0, `${rel} now names the live API ${contentSeen[rel] ?? 0} time(s); ${count} are allowed as content (${why})`)
        .toBe(count)
    }

    // ⚠️ REPORTED, NOT SILENTLY WIDENED (out-of-scope discovery): the twelve client pages honour
    // `NEXT_PUBLIC_API_URL` and NOT `ADMIN_API_UPSTREAM`, so pointing the console at another
    // deployment with the variable this item is about moves the PROXY and leaves those pages on
    // whatever `NEXT_PUBLIC_API_URL` says. That is a real inconsistency and it is in the evidence
    // package; this item's named surface is the admin proxy, so it is not changed here.
    expect((proxy.match(/https:\/\/kindapi-production/g) ?? []).length,
      'the proxy holds more than the one documented default').toBe(1)
  })

  it('and the variable is documented, so pointing the console elsewhere is a setting', () => {
    const env = readFileSync(join(__dirname, '../../../../docs/ENVIRONMENT.md'), 'utf8')
    expect(env, 'ADMIN_API_UPSTREAM is undocumented, so nobody can know it exists')
      .toContain('ADMIN_API_UPSTREAM')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② TIMEOUT ≠ NETWORK
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('D-61 · we stopped waiting is not the API is down', () => {
  it('🛑 TWO OUTCOMES, TWO STATUS CODES, TWO SENTENCES', () => {
    // A network failure means the request never landed: nothing happened, retrying is free.
    // A timeout means WE stopped waiting: the work may still be running, and a retry on
    // `migrations/run` starts a second replay of 74 migrations against the same database.
    const at = proxy.indexOf('if (timedOut)')
    expect(at, 'the timeout branch is gone').toBeGreaterThan(-1)
    // ⚠️ BOUNDED BY THE BRANCH THAT FOLLOWS, not by a character count: the timeout branch ends
    // where its 504 is returned, and the network branch is everything from there to its 503.
    const t504 = proxy.indexOf('status: 504', at)
    const t503 = proxy.indexOf('status: 503', t504)
    expect(t504, 'the timeout answer moved').toBeGreaterThan(at)
    expect(t503, 'the network answer moved').toBeGreaterThan(t504)
    const timeoutBranch = proxy.slice(at, t504 + 20)
    const networkBranch = proxy.slice(t504 + 20, t503 + 20)

    expect(timeoutBranch).toContain('timeout: true')
    expect(timeoutBranch, 'a timeout is reported as an unreachable API again')
      .not.toContain('API unreachable')
    expect(timeoutBranch).toMatch(/may still be running/i)
    expect(timeoutBranch).toMatch(/Do NOT/i)

    expect(networkBranch).toContain('timeout: false')
    expect(networkBranch).toContain('API unreachable')
    expect(networkBranch, 'a network failure no longer says a retry is safe')
      .toMatch(/retrying is safe/i)
  })

  it('🛑 THE DISTINCTION IS STRUCTURED, never matched on an error message', () => {
    expect(proxy).toContain("name === 'TimeoutError'")
    expect(proxy).toContain('bound.aborted')
    expect(proxy, 'the timeout is detected by reading the error text')
      .not.toMatch(/message.*\.includes\(['"]timeout/i)
  })

  it('🛑 AND THE BOUND IS ONE NAMED CONSTANT — the operator-facing sentence quotes it', () => {
    expect(proxy).toContain('const UPSTREAM_BOUND_MS')
    expect(proxy).toMatch(/AbortSignal\.timeout\(UPSTREAM_BOUND_MS\)/)
    expect(proxy, 'a second literal bound is a second truth')
      .not.toMatch(/AbortSignal\.timeout\(\s*\d/)
    expect(proxy).toMatch(/Math\.round\(UPSTREAM_BOUND_MS \/ 1000\)/)
  })
})
