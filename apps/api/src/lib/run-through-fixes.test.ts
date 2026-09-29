// ⚑ 29 Sep (R174 · fix) — THE EIGHT FROM THE FOUNDER'S RUN-THROUGH OF MILLA AND VIDA.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { clientCountryOptions } from '@kind/shared'
import { lifecycleCopy, type LifecycleCopyInput } from '../../../admin/src/lib/vida-lifecycle-copy'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const SETTINGS = read('apps/portal/src/app/(milla)/milla/settings/page.tsx')

describe('1 · a client\'s own country is theirs, never a guessed "South Africa"', () => {
  it('their saved country comes first, the launch countries are offered, nothing is invented', () => {
    expect(clientCountryOptions('United Kingdom')[0]).toBe('United Kingdom')
    expect(clientCountryOptions('Portugal')[0]).toBe('Portugal')
    expect(clientCountryOptions(null)).toEqual(expect.arrayContaining(['United States', 'United Kingdom', 'South Africa']))
    expect(new Set(clientCountryOptions('United Kingdom')).size).toBe(clientCountryOptions('United Kingdom').length)
  })
  it('Settings no longer offers the African ICP list, never defaults, and never saves an empty country', () => {
    expect(SETTINGS).not.toContain('SUPPORTED_COUNTRIES')
    expect(SETTINGS).not.toContain("country: 'South Africa'")
    expect(SETTINGS).not.toContain("c.country || 'South Africa'")
    expect(SETTINGS).toContain('{clientCountryOptions(form.country).map((c) =>')
    expect(SETTINGS).toContain("await api.patch('/clients/me', country ? form : rest, session.access_token)")
  })
})

describe('2 + 3 · Milla says it in words', () => {
  it('Coaching shows the signal in words, not "hot"', () => {
    expect(read('apps/portal/src/app/(milla)/milla/coaching/page.tsx')).toContain("Their own words{m.signal ? ` · ${replyWord(m.signal)}` : ''}")
  })
  it('a warm reply reads "Interested", not "Warm · needs a reply" in red', () => {
    const o = read('apps/portal/src/components/milla/ProgrammeOutcome.tsx')
    expect(o).toContain(`case 'warm':                               return { label: "Interested · we're replying", tone: 'warn' }`)
    expect(o).not.toMatch(/^\s*case 'warm':.*Warm · needs a reply/m)
  })
})

describe('4 + 5 + 6 · Vida', () => {
  it('the Cockpit history is not an alarm: grey figures, the minus sign in the right place, no "burning"', () => {
    const c = read('apps/admin/src/app/cockpit/page.tsx')
    expect(c).toContain("const usdSigned = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString()}`")
    expect(c).not.toContain("'· burning'")
  })
  it('an unchosen lead record says so in words', () => {
    const r = read('apps/admin/src/app/vida/record/page.tsx')
    expect(r).toContain('No prospect chosen — open a client, then a prospect, to see their record.')
    expect(r).not.toContain("'No lead_id")
  })
  it('the repeat opportunity at Complete is a plain note, not a red exception, and never says "entitlement"', () => {
    const BASE = {
      clientName: 'Acme', state: 'completion_repeat', mode: 'No action needed',
      counts: { sourced: 0, qualified: 20, rejected: 0, stillToCheck: 0, enrolled: 20, sends: 38, replies: 11, positive: 4, meetings: 8, repliesAwaitingDecision: 0 },
      programme: { meetingTarget: 8, entitlementUsed: 24, entitlementTotal: 2400, entitlementRemaining: 2376 },
      replyAwaiting: null, stoppedDetail: null, humanBlockers: [],
      killSwitchOff: true, operatorRunEnabled: true, senderSendable: true,
    } as unknown as LifecycleCopyInput
    const note = JSON.stringify(lifecycleCopy(BASE)).match(/\{[^{}]*"label":"Repeat opportunity"[^{}]*\}/)?.[0] ?? ''
    expect(note).toContain('2,376 qualified prospects are still available for this client.')
    expect(note).not.toContain('entitlement')
    expect(note).not.toContain('"tone":"exception"')
  })
})

describe('7 + 8 · the sweep', () => {
  const sweep = read('scripts/fullstack/demo-shots.mjs')
  it('red means red (orange labels are not errors), and Documents\' move is expected', () => {
    expect(sweep).toContain('if (r >= 180 && g < 70 && b < 70) out.push(own.slice(0, 80))')
    expect(sweep).toContain("'/dashboard/documents': '/milla/documents'")
    expect(sweep).toContain("b.querySelectorAll('pre, code, script, style, textarea').forEach(n => n.remove())")
  })
})
