// ⚑ 29 Sep (R174 · PR 4b) — MILLA CLEAN-UP. "My campaign" → Programme; "Usage" folded into
// Performance (founder: "yues to perdormance"); Voice calls removed (founder: "No for voice");
// the Agency & white-label block hidden while partners are frozen (R139).
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const MW = read('apps/portal/src/middleware.ts')
const SHELL = read('apps/portal/src/components/milla/MillaShell.tsx')
const SETTINGS = read('apps/portal/src/app/(milla)/milla/settings/page.tsx')

describe('old screens redirect, and their files are kept', () => {
  it('/milla/campaign → Programme, /milla/usage → Performance', () => {
    expect(MW).toContain("if (pathname === '/milla/campaign' || pathname.startsWith('/milla/campaign/')) {\n    return NextResponse.redirect(new URL('/milla/programme', base))")
    expect(MW).toContain("if (pathname === '/milla/usage' || pathname.startsWith('/milla/usage/')) {\n    return NextResponse.redirect(new URL('/milla/performance', base))")
    expect(MW).toContain("'figsy':      '/milla/programme',")
    expect(MW).toContain("'usage':      '/milla/performance',")
    expect(existsSync(join(process.cwd(), 'apps/portal/src/app/(milla)/milla/campaign'))).toBe(true)
    expect(existsSync(join(process.cwd(), 'apps/portal/src/app/(milla)/milla/usage'))).toBe(true)
  })
  it('Usage is off the menu', () => {
    expect(SHELL).not.toContain("['/milla/usage', 'Usage'")
  })
})

describe('Settings', () => {
  it('Voice calls are gone, and nothing asks /voice/status', () => {
    expect(SETTINGS).not.toContain('Voice Calls (FIGSY)')
    expect(SETTINGS).not.toContain("'/voice/status'")
  })
  it('Agency & white-label is drawn only if partners are not frozen', () => {
    const at = SETTINGS.indexOf('Agency &amp; white-label')
    expect(SETTINGS.lastIndexOf('{!PARTNERS_FROZEN && (', at)).toBeGreaterThan(-1)
    expect(read('packages/shared/src/partners-frozen.ts')).toContain('export const PARTNERS_FROZEN: boolean = true')
  })
})
