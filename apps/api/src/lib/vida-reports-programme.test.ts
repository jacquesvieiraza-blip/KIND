// ⚑ 29 Sep (R174 · PR 4g) — VIDA REPORTS: PER CLIENT, BOUGHT · DELIVERED · PAID · CREDIT.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const PAGE = readFileSync(join(process.cwd(), 'apps/admin/src/app/vida/reports/page.tsx'), 'utf8')
const live = PAGE.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')

describe('Vida Reports is the programme report', () => {
  it('reads the one programme-money source, not the retired wallet/per-lead report', () => {
    expect(live).toContain("fetch('/api/proxy/operator/programme-money')")
    expect(live).not.toContain("fetch('/api/proxy/operator/reports')")
  })
  it('shows bought, delivered, paid and credit — and no wallet or $4', () => {
    for (const k of ['Meetings bought', 'Meetings delivered', "'Paid'", 'Shortfall credit']) expect(live).toContain(k)
    expect(live).not.toMatch(/\$4\b/)
    expect(live).not.toContain('wallet_balance_usd')
    expect(live).not.toContain('Worked leads')
  })
  it('the demo and House are named for what they are and never counted', () => {
    expect(live).toContain("const real = (rows ?? []).filter(r => r.excluded === null)")
    expect(live).toContain('{c.excluded} — not money')
    expect(live).not.toContain('house_or_demo')
  })
})
