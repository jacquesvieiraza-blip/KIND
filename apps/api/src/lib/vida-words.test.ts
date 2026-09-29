// ⚑ 29 Sep (R174 ⑥ · PR 6b) — VIDA'S WORDS.
//   · a client row and a stage tile name one of the six (R127); the finer step sits under it;
//   · the kill-switch chip says the state first (R116) — never a bare "OFF" next to sending;
//   · the meetings panel says Booked / Held / No-show, not the table's codes;
//   · old instructions are gone from Exceptions, the Lead queue and the Audit log.
// The operator-screen scan below is proven both ways: it catches a bad sentence, and the tree is clean.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { MVP1_VIDA_STAGES } from '@kind/shared'
import { clientRowStage, meetingStateWord } from '../../../admin/src/lib/vida-words'
import { lifecycleCopy, type LifecycleCopyInput, type LifecycleState } from '../../../admin/src/lib/vida-lifecycle-copy'
import { codeOf } from './retired-words-guard.test'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('the six stages on Vida', () => {
  it('a client row names one of the six, with the finer step only where two stages share a word', () => {
    expect(clientRowStage({ stage: 'signup', stage_label: 'Signup' })).toBe('Brief')
    expect(clientRowStage({ stage: 'recommendation', stage_label: 'Recommendation' })).toBe('Prepare · Recommendation')
    expect(clientRowStage({ stage: 'sourcing', stage_label: 'Sourcing' })).toBe('Prepare · Sourcing')
    expect(clientRowStage({ stage: 'approval', stage_label: 'Approval' })).toBe('Ready')
    expect(clientRowStage({ stage: 'review', stage_label: 'Review' })).toBe('Run · Review')
    expect(clientRowStage({ stage: 'completion', stage_label: 'Completion' })).toBe('Complete')
    expect(clientRowStage({ stage_label: 'Proof' })).toBe('Proof')
  })
  it('every stage tile the copy can draw prints one of the six', () => {
    const src = codeOf(read('apps/admin/src/lib/vida-lifecycle-copy.ts'))
    expect(src).not.toMatch(/label: 'Stage', value: '/)
    expect((src.match(/label: 'Stage', value: mvp1VidaStage\('[a-z]+'\)/g) ?? []).length).toBe(18)
    const BASE: LifecycleCopyInput = {
      clientName: 'Acme', state: 'signup', mode: 'No action needed',
      counts: { sourced: 3, qualified: 0, rejected: 0, stillToCheck: 0, enrolled: 20, sends: 0, replies: 0, positive: 0, meetings: 0, repliesAwaitingDecision: 0 },
      programme: { meetingTarget: 8, entitlementUsed: 0, entitlementTotal: 2000, entitlementRemaining: 2000 },
      replyAwaiting: null, stoppedDetail: null, humanBlockers: [],
      killSwitchOff: true, operatorRunEnabled: true, senderSendable: true,
    }
    const tiles: Record<string, string> = {}
    for (const state of ['signup', 'proof', 'recommendation', 'sourcing', 'approval', 'live_ready_to_run', 'review', 'completion'] as LifecycleState[]) {
      const m = JSON.stringify(lifecycleCopy({ ...BASE, state })).match(/"label":"Stage","value":"([^"]+)"/)
      tiles[state] = m?.[1] ?? '(none)'
    }
    expect(tiles).toEqual({ signup: 'Brief', proof: 'Proof', recommendation: 'Prepare', sourcing: 'Prepare',
      approval: 'Ready', live_ready_to_run: 'Run', review: 'Run', completion: 'Complete' })
    for (const w of Object.values(tiles)) expect(MVP1_VIDA_STAGES as readonly string[]).toContain(w)
  })
})

describe('kill-switch and meetings', () => {
  it('the chat chip says blocked first', () => {
    const s = read('apps/admin/src/components/vida/VidaConversation.tsx')
    expect(s).toContain('>Sending blocked · {killSwitchChipLabel(surface.outreachEnabled)}</span>')
    expect(s).not.toContain('Sending OFF')
  })
  it('meeting states are words', () => {
    expect(meetingStateWord('BOOKED')).toBe('Booked')
    expect(meetingStateWord('BOOKED_UNVERIFIED')).toBe('Booked — not yet confirmed')
    expect(meetingStateWord('HELD')).toBe('Held')
    expect(meetingStateWord('NO_SHOW')).toBe('No-show')
    expect(meetingStateWord('SOMETHING_NEW')).toBe('Something new')
    const p = read('apps/admin/src/components/vida/MeetingQualifyPanel.tsx')
    expect(p).toContain('{meetingStateWord(m.state)} · {when(m.scheduled_at)}')
    expect(p).not.toContain('{m.state} · ')
  })
})

export const RETIRED_OPERATOR_WORDS: Array<[string, RegExp]> = [
  ['a bare OFF next to sending (R116)', /Sending OFF|>OFF</],
  ['re-run sourcing from the People tab (view-only since 4i)', /from the People tab/],
  ['approve-on-behalf (removed in 4i)', /approve-on-behalf/i],
  ['the old "snag" wording', /\bsnag\b/i],
  ['a cost preview instruction', /cost preview/i],
  ['an engine word printed on a stage tile', /label: 'Stage', value: '/],
  ['a raw meeting code', /\{m\.state\} · /],
]
const operatorWordsIn = (src: string) => RETIRED_OPERATOR_WORDS.filter(([, re]) => re.test(codeOf(src))).map(([n]) => n)

function filesUnder(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...filesUnder(p))
    else if (/\.tsx?$/.test(p) && !p.includes('.test.')) out.push(p)
  }
  return out
}

describe('operator screens are clean', () => {
  it('the scanner has teeth, and ignores comments', () => {
    expect(operatorWordsIn(`<span>Sending OFF (kill-switch)</span>`)).toEqual(['a bare OFF next to sending (R116)'])
    expect(operatorWordsIn(`'Re-run sourcing from the People tab (it previews the cost first).'`)).toEqual(['re-run sourcing from the People tab (view-only since 4i)'])
    expect(operatorWordsIn(`{ kind: 'fact', label: 'Stage', value: 'Sourcing' }`)).toEqual(['an engine word printed on a stage tile'])
    expect(operatorWordsIn(`// Sending OFF used to be here\nconst ok = 1`)).toEqual([])
  })
  it('no retired operator word on any Vida screen', () => {
    const roots = ['apps/admin/src/app/vida', 'apps/admin/src/components/vida', 'apps/admin/src/lib'].map(r => join(process.cwd(), r))
    const files = roots.flatMap(filesUnder)
    expect(files.length).toBeGreaterThan(40)
    const hits = files.flatMap(f => operatorWordsIn(readFileSync(f, 'utf8')).map(w => `${f.replace(process.cwd() + '/', '')}: ${w}`))
    expect(hits).toEqual([])
  })
  it('the Exceptions, Lead queue and Audit log words', () => {
    expect(read('apps/admin/src/app/vida/page.tsx')).toContain("Open the client — their page says what happens next.")
    expect(read('apps/admin/src/app/vida/queue/page.tsx')).toContain('Every email waiting on your yes, across all clients')
    expect(read('apps/admin/src/app/vida/audit/page.tsx')).toContain('Every action taken for a client, with the operator who took it')
  })
})
