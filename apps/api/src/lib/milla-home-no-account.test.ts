// ⚑ 28 Sep — a signed-in person with no account yet opens Milla Home → they are sent to the Brief.
//
// The founder opened the Northwind demo at Brief and Home rendered "Client not found" under
// "Your programme" with nothing to do. Every Home read answers 404 for someone whose Brief is not
// confirmed yet (no client row), and Home had no rule for it — only for "account, no ICP".
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const HOME = join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx')
const src = readFileSync(HOME, 'utf8')
const code = src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')

describe('Milla Home · no account yet → the Brief, never "Client not found"', () => {
  const load = code.slice(code.indexOf("api.get<{ data: Summary }>('/leads/milla-summary', tok)"))

  it('a 404 on the summary sends the person to /milla/welcome', () => {
    expect(load).toMatch(/sr\.status === 'rejected' && \(sr\.reason as \{ status\?: number \} \| null\)\?\.status === 404\)\s*\{\s*router\.replace\('\/milla\/welcome'\)/)
  })

  it('it is decided BEFORE the "both legs failed" error, so no error text is shown first', () => {
    const redirect = load.indexOf("router.replace('/milla/welcome')")
    const bothFailed = load.indexOf("sr.status === 'rejected' && lr.status === 'rejected'")
    expect(redirect).toBeGreaterThan(-1)
    expect(bothFailed).toBeGreaterThan(-1)
    expect(redirect).toBeLessThan(bothFailed)
  })

  it('only a 404 — a server error or a network failure is still shown as a failure', () => {
    expect(load).not.toMatch(/status === 5\d\d\)\s*\{\s*router\.replace\('\/milla\/welcome'\)/)
    expect(load).not.toMatch(/status === 0\)\s*\{\s*router\.replace/)
  })
})
