// 25 Sep (R160) — the client is told, and shown, a new version without refreshing.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PACKAGE_CHECK_MS, packageChanged, newVersionLines } from './package-version'

const APPROVAL = readFileSync(join(__dirname, '../components/milla/ProgrammeApproval.tsx'), 'utf8')

describe('a new version is noticed', () => {
  it('🛑 a different frozen version is a change; the same one, or an unknown one, is not', () => {
    expect(packageChanged('v3hash', 'v4hash')).toBe(true)
    expect(packageChanged('v3hash', 'v3hash')).toBe(false)
    expect(packageChanged(null, 'v4hash')).toBe(false)
    expect(packageChanged('v3hash', null)).toBe(false)
  })

  it('🛑 Milla names the version and says nothing was sent', () => {
    const lines = newVersionLines(4).join(' ')
    expect(lines).toContain('this is now version 4')
    expect(lines).toContain('your screen has updated')
    expect(lines).toContain('Nothing has been sent.')
    expect(newVersionLines(null).join(' ')).toContain('a new version')
  })

  it('checks often enough to matter and never hammers the server', () => {
    expect(PACKAGE_CHECK_MS).toBeGreaterThanOrEqual(15_000)
    expect(PACKAGE_CHECK_MS).toBeLessThanOrEqual(60_000)
  })
})

describe('🛑 the Approval screen updates itself', () => {
  it('holds its own copy of the package, replaced by a newer one', () => {
    expect(APPROVAL).toContain('const [data, setData] = useState(given)')
    expect(APPROVAL).toContain('useEffect(() => { setData(given) }, [given])')
  })

  it('re-reads the package on a timer and when the client comes back to the tab — only while awaiting approval', () => {
    expect(APPROVAL).toContain('const watching = data.canApprove && !data.programme?.approved_at')
    expect(APPROVAL).toContain("api.get<{ data: ApprovalPayload }>('/my/programme/review'")
    expect(APPROVAL).toContain('setInterval(() => { void check() }, PACKAGE_CHECK_MS)')
    expect(APPROVAL).toContain("document.addEventListener('visibilitychange', onReturn)")
  })

  it('shows the new version and has Milla say so, once per version', () => {
    expect(APPROVAL).toContain('if (stopped || !next || !packageChanged(shownVersion, next.frozen?.version ?? null)) return')
    expect(APPROVAL).toContain('setData(next)')
    expect(APPROVAL).toContain('announceOnce(`approval-version-${next.frozen?.version}`, newVersionLines(next.frozen?.version_number))')
  })

  it('the approval still sends the version on screen — the server refuses a stale one', () => {
    expect(APPROVAL).toContain("'/my/programme/approve', { version: data.frozen?.version ?? null }")
  })
})
