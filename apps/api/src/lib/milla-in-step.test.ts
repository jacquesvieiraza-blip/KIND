// ⚑ 29 Sep (R174 · PR 7a) — MILLA STAYS IN STEP WITHOUT A RELOAD.
// One shared refresh (every 20s, on return to the tab, and AT ONCE after the client's presses)
// now drives the top bar, the stage bar, the latest-inbox list, the badges, the chat chips, the
// status pill and Home. The badges are this programme's totals. The fixed "Germany" chip is gone.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const HOOK = read('apps/portal/src/lib/use-live-refresh.ts')
const SHELL = read('apps/portal/src/components/milla/MillaShell.tsx')
const CHAT = read('apps/portal/src/components/milla/MillaConversation.tsx')
const HOME = read('apps/portal/src/app/(milla)/milla/page.tsx')
const SUMMARY = read('apps/api/src/lib/milla-summary.ts')

describe('one shared refresh, and it hears the client\'s presses', () => {
  it('the hook re-reads on the programme-changed event, and cleans it up', () => {
    expect(HOOK).toContain("export const PROGRAMME_CHANGED_EVENT = 'kind:programme-changed'")
    expect(HOOK).toContain('window.addEventListener(PROGRAMME_CHANGED_EVENT, onChanged)')
    expect(HOOK).toContain('window.removeEventListener(PROGRAMME_CHANGED_EVENT, onChanged)')
  })
  it('the shell, the chat and Home are all on it', () => {
    expect(SHELL).toContain('useLiveRefresh(loadRail)')
    expect(CHAT).toContain('useLiveRefresh(refreshStage)')
    expect(HOME).toContain('useLiveRefresh(load)')
  })
  it('the presses that move the programme announce it', () => {
    expect(read('apps/portal/src/lib/pause-programme.ts')).toContain('announceProgrammeChanged()')
    expect(read('apps/portal/src/components/milla/ProgrammeApproval.tsx')).toContain('announceProgrammeChanged()')
    expect(read('apps/portal/src/components/milla/ProgrammeCalculator.tsx')).toContain('announceProgrammeChanged()')
    const accept = HOME.slice(HOME.indexOf("await api.post('/leads/proof/complete'"))
    expect(accept.slice(0, accept.indexOf('await load()') + 60)).toContain('announceProgrammeChanged()')
  })
})

describe('the badges are this programme\'s totals', () => {
  it('the rail reads the badge counts, not this month or the latest four', () => {
    expect(SHELL).toContain("'Meetings', '◫', s?.badge_meetings || undefined]")
    expect(SHELL).toContain("'Inbox', '✉', s?.badge_replies || undefined]")
    expect(SHELL).not.toContain('s?.recent_replies?.length || undefined')
  })
  it('the server counts them from the same scope: programme, proof (none), legacy (all-time)', () => {
    const at = SUMMARY.indexOf('async function badgeCounts(')
    const fn = SUMMARY.slice(at, SUMMARY.indexOf('export async function buildMillaSummaryData(', at))
    expect(fn).toContain("if (scope.kind === 'proof') return { badge_meetings: 0, badge_replies: 0 }")
    expect(fn).toContain('meetingCounts({ clientId, programmeId: scope.programmeId })')
    expect(fn).toContain(".eq('programme_id', scope.programmeId)")
    expect(fn).not.toMatch(/since:/)
  })
})

describe('the fixed "Germany" chip is gone', () => {
  it('no chip names a country nobody chose', () => {
    expect(CHAT).not.toContain("'What if I add Germany?'")
    expect(CHAT).not.toMatch(/\[CHIP_WIDEN\]/)
  })
})
