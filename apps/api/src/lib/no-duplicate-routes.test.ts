// NO SHADOWED ROUTES — a path registered twice on the same router and method is dead code
// that reads as live.
//
// WHY. `figsy.ts` carried TWO `figsyRouter.get('/activity')` handlers, ~2,000 lines apart.
// Express matches the first route that matches and hands it the request; the first handler
// always responded, so the second had never executed once. It was found only because it
// contained a query selecting `leads.source` — a column that has never existed — while
// hunting the bug that broke the CSV importer.
//
// That is the specific danger, and it is worse than ordinary dead code: a shadowed route
// looks completely alive. It can be read, reasoned about, edited and even unit-tested, and
// none of it reaches production. I edited it myself before noticing, and every check stayed
// green — because nothing compared route registrations to each other.
//
// So: fail the build. A duplicate is either a mistake or a rename someone half-finished, and
// both want a human, not a silent winner.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const ROUTES_DIR = join(__dirname, '../routes')

export type Registration = { router: string; method: string; path: string; line: number }

/**
 * Every Express route registration in a file.
 *
 * Matches `someRouter.get('/path'` at the start of a line — a leading-anchor on purpose, so
 * the same text quoted inside a comment or a string (this file's own header, for one) is not
 * counted as a registration and does not invent a duplicate that isn't there.
 */
export function routeRegistrations(src: string): Registration[] {
  const out: Registration[] = []
  const re = /^([A-Za-z_$][\w$]*Router)\.(get|post|put|patch|delete|all)\(\s*'([^']+)'/gm
  for (const m of src.matchAll(re)) {
    out.push({
      router: m[1],
      method: m[2],
      path: m[3],
      line: src.slice(0, m.index ?? 0).split('\n').length,
    })
  }
  return out
}

/** Registrations sharing a router + method + path, keyed by that triple. */
export function duplicateRegistrations(regs: Registration[]): Record<string, Registration[]> {
  const byKey: Record<string, Registration[]> = {}
  for (const r of regs) {
    const key = `${r.router}.${r.method}('${r.path}')`
    ;(byKey[key] ??= []).push(r)
  }
  return Object.fromEntries(Object.entries(byKey).filter(([, v]) => v.length > 1))
}

describe('no route is registered twice on the same router and method', () => {
  const files = readdirSync(ROUTES_DIR)
    .filter(f => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map(f => join(ROUTES_DIR, f))

  it('the scan finds registrations at all — an empty scan would pass while checking nothing', () => {
    const total = files.reduce((n, f) => n + routeRegistrations(readFileSync(f, 'utf8')).length, 0)
    expect(total).toBeGreaterThan(100)
  })

  it('a duplicate is detected when one exists', () => {
    // The detector itself is under test, so a future refactor of the regex cannot quietly
    // turn this whole file into a no-op.
    const dupes = duplicateRegistrations(routeRegistrations([
      `figsyRouter.get('/activity', async (req, res) => {})`,
      `figsyRouter.get('/kpis', async (req, res) => {})`,
      `figsyRouter.get('/activity', async (req, res) => {})`,
    ].join('\n')))
    expect(Object.keys(dupes)).toEqual([`figsyRouter.get('/activity')`])
    expect(dupes[`figsyRouter.get('/activity')`].map(r => r.line)).toEqual([1, 3])
  })

  it('different methods on the same path are NOT duplicates', () => {
    const dupes = duplicateRegistrations(routeRegistrations([
      `leadRouter.get('/x', h)`,
      `leadRouter.post('/x', h)`,
    ].join('\n')))
    expect(dupes).toEqual({})
  })

  it('a path quoted inside a comment is not a registration', () => {
    const dupes = duplicateRegistrations(routeRegistrations([
      `figsyRouter.get('/activity', h)`,
      `// a second figsyRouter.get('/activity') used to live here`,
    ].join('\n')))
    expect(dupes).toEqual({})
  })

  it('no router in apps/api/src/routes registers the same path twice', () => {
    const violations: string[] = []
    for (const file of files) {
      const dupes = duplicateRegistrations(routeRegistrations(readFileSync(file, 'utf8')))
      for (const [key, regs] of Object.entries(dupes)) {
        violations.push(`${file.split('/').pop()}: ${key} at lines ${regs.map(r => r.line).join(', ')}`)
      }
    }
    expect(
      violations,
      'Express serves the FIRST matching route, so every later registration of the same ' +
      'router+method+path is unreachable. It still reads as live code and can be edited and ' +
      'tested — which is exactly how a broken query sat in one for weeks without ever running.',
    ).toEqual([])
  })
})
