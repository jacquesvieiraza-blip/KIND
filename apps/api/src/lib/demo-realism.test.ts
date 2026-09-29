// ⚑ 29 Sep (R174 ⑧ · PR 8d) — DEMO REALISM LEFTOVERS.
//   · the demo's meetings are qualified by an operator, never "by demo";
//   · its sourcing limit is the one a real banded programme gets (the same function);
//   · the Demo tag shows on phones too;
//   · Rewrite messages and Run once are not drawn on the demo.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { sourcingCeiling } from '@kind/shared'
import {
  NORTHWIND_BAND, NORTHWIND_CAST, NORTHWIND_REPLIES, NORTHWIND_QUALIFIED_BY, northwindRows, type NorthwindIds,
} from './demo-northwind-data'

const ids: NorthwindIds = {
  userId: 'u', clientId: 'nw', icpId: 'i', programmeId: 'p', campaignId: 'k', sequenceId: 's', sessionId: 'm',
  leadIds: NORTHWIND_CAST.map((_, n) => `l${n}`), replyIds: NORTHWIND_REPLIES.map((_, n) => `r${n}`),
}
const now = new Date('2026-09-28T09:00:00Z')
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('the demo data reads like a real account', () => {
  it('meetings are qualified by an operator, not "demo"', () => {
    const r = northwindRows('Results', ids, now)
    expect(r.meetings.length).toBeGreaterThan(0)
    for (const m of r.meetings) expect(m.qualified_by).toBe(NORTHWIND_QUALIFIED_BY)
    expect(NORTHWIND_QUALIFIED_BY.toLowerCase()).not.toContain('demo')
  })
  it('the sourcing limit is the real banded programme limit', () => {
    for (const stage of ['Approval', 'Results', 'Complete'] as const) {
      const p = northwindRows(stage, ids, now).programme!
      expect(p.sourcing_ceiling, stage).toBe(sourcingCeiling(Number(p.meeting_target), NORTHWIND_BAND))
      expect(p.sourcing_ceiling, stage).not.toBe(p.recommended_volume)
    }
  })
})

describe('the screens', () => {
  it('the Demo tag is outside the desktop-only corner, so phones show it', () => {
    const shell = read('apps/portal/src/components/milla/MillaShell.tsx')
    const tag = shell.indexOf('data-testid="demo-tag"')
    const corner = shell.indexOf('<div className="hidden md:flex items-center">')
    expect(tag).toBeGreaterThan(0)
    expect(tag).toBeLessThan(corner)
    expect(shell.slice(corner, corner + 400)).not.toContain('>Demo</span>')
  })
  it('Rewrite messages and Run once are not drawn on the demo', () => {
    const vida = read('apps/admin/src/app/vida/page.tsx')
    expect(vida).toContain("const selectedIsDemo = (): boolean => (clients ?? []).find(c => c.id === selected)?.is_demo === true")
    expect(vida).toContain('return !!p && !selectedIsDemo() &&')
    expect(vida).toContain('prog.send_controls.operator_run_enabled && prog.send_controls.auto_outreach_enabled && !selectedIsDemo() && (')
  })
})
