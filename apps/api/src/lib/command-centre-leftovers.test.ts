// ⚑ 29 Sep (R174 · PR 4c) — COMMAND CENTRE STAYS (R97/R98/R101), WITHOUT THE RETIRED MODEL'S WORDS.
// No credit-pool pitch, no monthly add-on prices for a programme company, no "two halves".
// (A demo cannot create seats or send invites — that is 1f, server-side.)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const C = readFileSync(join(process.cwd(), 'apps/portal/src/app/(dashboard)/dashboard/company/page.tsx'), 'utf8')
const live = C.split('\n').filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('{/*') && !t.startsWith('*') && !t.startsWith('~~') }).join('\n')

describe('Command Centre speaks the programme', () => {
  it('no credit-pool pitch on the set-up screen', () => {
    expect(live).not.toContain('fund one budget pool, and approve their credit requests')
    expect(live).not.toContain('you only pay for the usage each rep consumes')
  })
  it('the add-on prices show only where the retired economics are still visible', () => {
    expect(C).toContain('{econ && <span className="opacity-70"> ${AGENT_PRICE[k]}</span>}')
    expect(C).toContain('return econ && extra > 0 ?')
  })
  it('no "two halves"', () => {
    expect(live).not.toContain('one price in two halves')
    expect(C).toContain("'Your programme is billed on its own terms — see Programme. There is no credit pool or per-seat budget to manage.'")
  })
  it('the screen itself is kept, and Milla still renders it', () => {
    expect(readFileSync(join(process.cwd(), 'apps/portal/src/app/(milla)/milla/command-centre/page.tsx'), 'utf8'))
      .toContain("import SourcePage from '@/app/(dashboard)/dashboard/company/page'")
  })
})
