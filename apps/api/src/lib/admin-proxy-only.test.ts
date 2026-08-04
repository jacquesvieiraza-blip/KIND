// EVERY ADMIN COMPONENT REACHES THE OPERATOR API THROUGH THE PROXY. NO EXCEPTIONS.
//
// Written 4 Aug after `HouseAudit.tsx` shipped calling
// `${NEXT_PUBLIC_API_URL}/operator/house-audit` directly. It was the only component in the
// admin app doing so, and it would have failed on EVERY load — because:
//
//   • `operatorRouter.use(...)` rejects any request without a valid `x-admin-key` (401), and
//   • the ONLY thing that injects that key is `app/api/proxy/[...path]/route.ts`, which also
//     stamps `x-operator-email` from the *verified session* so operator actions are attributable.
//
// So a direct call is two faults at once: a guaranteed 401, and — if it ever did authenticate —
// a hole in the operator audit trail, because nothing else sets that email header.
//
// ⚠️ WHY A TEST AND NOT A CODE REVIEW. The failure is invisible in the source: the component
// compiles, the page builds, the gate passes, and the panel only breaks in a browser nobody had
// opened yet. The build being green is exactly what made it survive to a PR.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

const COMPONENTS = join(__dirname, '../../../../apps/admin/src/components')

/**
 * Every `fetch(...)` target in a file that mentions an operator route, with a verdict.
 *
 * Comments are stripped first — this very repo has burned four times on guards tripping over
 * their own explanatory comments, and `HouseAudit.tsx` now *documents* the bad URL in a comment
 * precisely so the next reader understands the trap.
 */
export function badOperatorFetches(source: string): string[] {
  const src = stripCommentsForEnvScan(source)
  // Reported as the OPERATOR ROUTE, not the URL form, and de-duplicated — the same call can
  // match more than one shape (an interpolated template literal is both "a quoted string
  // containing /operator/" and "a template with a prefix"), and a checker that reports one
  // fault twice makes the reader doubt the count rather than fix the call.
  const bad = new Set<string>()
  const re = /fetch\(\s*([`'"])([^`'"]*\/operator\/[^`'"]*)\1/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    const url = m[2]
    if (url.startsWith('/api/proxy/')) continue
    bad.add(url.slice(url.indexOf('/operator/')))
  }
  return [...bad]
}

describe('the checker catches the exact shape that shipped', () => {
  it('flags the interpolated direct call HouseAudit.tsx was written with', () => {
    // Verbatim pre-fix line. This is the red proof: without the fix, this is what the file had.
    const preFix = "const r = await fetch(`${base}/operator/house-audit`, { credentials: 'include' })"
    expect(badOperatorFetches(preFix)).toEqual(['/operator/house-audit'])
  })

  it('flags a plain-string direct call too', () => {
    expect(badOperatorFetches(`fetch('/operator/house-audit')`)).toEqual(['/operator/house-audit'])
  })

  it('passes the proxied form', () => {
    expect(badOperatorFetches(`fetch('/api/proxy/operator/house-audit')`)).toEqual([])
  })

  it('is not fooled by a commented-out bad URL', () => {
    // HouseAudit.tsx's own comment now quotes the broken URL to explain the trap. A guard that
    // fails on its own documentation teaches people to delete the documentation.
    const commented = "// was: fetch(`${base}/operator/house-audit`)\nfetch('/api/proxy/operator/house-audit')"
    expect(badOperatorFetches(commented)).toEqual([])
  })
})

describe('no admin component bypasses the proxy', () => {
  const files = readdirSync(COMPONENTS).filter(f => f.endsWith('.tsx'))

  it('finds components to check (a passing sweep over zero files proves nothing)', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const f of files) {
    it(`${f} reaches /operator/ only via /api/proxy/`, () => {
      const bad = badOperatorFetches(readFileSync(join(COMPONENTS, f), 'utf8'))
      expect(bad, `${f} calls the operator API directly: ${bad.join(', ')} — the proxy is where x-admin-key and x-operator-email come from, so this is a 401 and an audit-trail hole`).toEqual([])
    })
  }
})
