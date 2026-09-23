// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 23 Sep — PARTNERS ARE FROZEN, AT EVERY DOOR, BY ONE SWITCH
//
// Founder, verbatim: *"we have no partners at the moment. so remove all partner related
// information. or freeze tis."* — asked which: *"Freeze."*
//
// Frozen, not removed: each door refuses while `PARTNERS_FROZEN` is true, and nothing behind it
// is deleted. This file proves the four doors are closed, that they all read the ONE switch, and
// that the code behind them is still there to switch back on.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PARTNERS_FROZEN, PARTNERS_FROZEN_COPY } from '@kind/shared'
import { partnersFrozenGate } from '../middleware/partners-frozen'

const REPO = join(__dirname, '../../../..')
const code = (p: string) => readFileSync(join(REPO, p), 'utf8').split('\n')
  .filter(l => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('{/*')) })
  .join('\n')

describe('partners are frozen (23 Sep)', () => {
  it('🛑 the switch is ON, and the copy names no partner figure', () => {
    expect(PARTNERS_FROZEN).toBe(true)
    expect(PARTNERS_FROZEN_COPY).not.toMatch(/\d|%|\$/)
  })

  it('🛑 ① the API gate answers 410 and never reaches the router', () => {
    let status = 0; let body: any = null; let passed = false
    const res: any = { status: (s: number) => { status = s; return res }, json: (b: unknown) => { body = b } }
    partnersFrozenGate({} as never, res, () => { passed = true })
    expect(passed, 'a frozen request reached a partner handler').toBe(false)
    expect(status).toBe(410)
    expect(body.error).toBe('partners_frozen')
  })

  it('🛑 ② the gate is mounted IN FRONT of every partner route, and of partner-seat creation', () => {
    // The gate is the router's FIRST layer — before every route declared in the file.
    const pr = code('apps/api/src/routes/partners.ts')
    const gateAt = pr.indexOf('partnersRouter.use(partnersFrozenGate)')
    expect(gateAt, 'the partner router is not gated').toBeGreaterThan(-1)
    const firstRoute = pr.search(/partnersRouter\.(get|post|patch|put|delete)\(/)
    expect(gateAt, 'a partner route is declared before the gate').toBeLessThan(firstRoute)
    // And the router is mounted once — a second mount of a different router would be a door
    // around it, so the partner router is the only thing at /partners.
    const index = code('apps/api/src/index.ts')
    expect((index.match(/app\.use\('\/partners'/g) ?? []).length).toBe(1)
    const op = code('apps/api/src/routes/operator.ts')
    expect(op).toContain("operatorRouter.post('/seats/client-partner', partnersFrozenGate, async")
  })

  it('🛑 ③ the portal sends every partner page to the start page, before any session work', () => {
    const mw = code('apps/portal/src/middleware.ts')
    for (const p of ['/partner-onboarding', '/partner-preview', '/dashboard/partner', '/dashboard/client-partner']) {
      expect(mw, `${p} is not frozen`).toContain(`'${p}'`)
    }
    const fn = mw.slice(mw.indexOf('export async function middleware'))
    expect(fn.indexOf('isFrozenPartnerPath(')).toBeGreaterThan(-1)
    expect(fn.indexOf('isFrozenPartnerPath('), 'the freeze must precede the session lookup')
      .toBeLessThan(fn.indexOf('supabase.auth.getUser()'))
  })

  it('🛑 ④ Vida\'s three partner pages say they are paused instead of loading', () => {
    for (const p of ['apps/admin/src/app/partners/page.tsx', 'apps/admin/src/app/partners/[id]/page.tsx', 'apps/admin/src/app/vida/partners/page.tsx']) {
      const src = code(p)
      expect(src, `${p} does not read the switch`).toMatch(/if \(PARTNERS_FROZEN\) \{/)
      expect(src).toContain('{PARTNERS_FROZEN_COPY}')
    }
  })

  it('⚠️ FROZEN, NOT REMOVED — the partner code is all still there to switch back on', () => {
    for (const p of [
      'apps/api/src/routes/partners.ts', 'apps/api/src/lib/partner-documents.ts', 'apps/api/src/lib/seller-playbook.ts',
      'apps/portal/src/app/(seat)/dashboard/client-partner/page.tsx', 'apps/portal/src/app/partner-onboarding',
    ]) expect(existsSync(join(REPO, p)), `${p} was deleted — the ruling was freeze`).toBe(true)
  })
})
