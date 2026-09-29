// ⚑ 29 Sep (R174 ⑤ · PR 6a) — MILLA'S WORDS.
//   · stage rails and stage words are the six (R127); "Review" is off client screens;
//   · the target is "qualified meetings" (R141);
//   · internal reply labels become plain words;
//   · the "ask Milla" buttons on Reports and ROI ask Milla (they linked to a parameter nothing read).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { replyWord } from '@kind/shared'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const M = 'apps/portal/src/app/(milla)/milla/'

describe('the six stages', () => {
  it('Performance, Analytics and ROI draw the six, not the old seven', () => {
    for (const p of ['performance', 'analytics', 'roi']) {
      const s = read(`${M}${p}/page.tsx`)
      expect(s, p).toContain('<StageRail stages={MVP1_MILLA_STAGES} current={mvp1MillaStageFromLegacy(p.stage)} />')
      expect(s, p).not.toContain('stages={MILLA_STAGES}')
    }
  })
  it('stage words printed on client screens are the six', () => {
    expect(read(`${M}reports/page.tsx`)).toContain('{mvp1MillaStageFromLegacy(p.stage)}{p.paused')
    expect(read(`${M}billing/page.tsx`)).toContain('· ${mvp1MillaStageFromLegacy(p.stage)}`')
    expect(read('apps/portal/src/components/milla/MillaConversation.tsx')).toContain('{mvp1MillaStageFromLegacy(prog.stage)}</span>}')
  })
})

describe('qualified meetings, plain reply words, working buttons', () => {
  it('the target is named as qualified meetings', () => {
    expect(read('apps/portal/src/components/milla/ProgrammeWorkspace.tsx')).toContain('{p.outcome.target} qualified meetings</div>')
    expect(read(`${M}reports/page.tsx`)).toContain('`${p.outcome.target} qualified meetings`')
    expect(read('apps/portal/src/components/milla/ProgrammePayment.tsx')).toContain('` for ${meetingTarget} qualified meetings`')
  })
  it('reply labels are words', () => {
    expect(replyWord('hot')).toBe('interested')
    expect(replyWord('out_of_office')).toBe('out of office')
    expect(replyWord('not_interested')).toBe('not interested')
    expect(replyWord('something_new')).toBe('reply')
    expect(read(`${M}pipeline/page.tsx`)).toContain('{replyWord(c.classification)}</span>')
  })
  it('Reports and ROI ask Milla in the one chat', () => {
    for (const p of ['reports', 'roi']) {
      const s = read(`${M}${p}/page.tsx`)
      expect(s, p).toContain('const ask = useMillaConversation().ask')
      expect(s, p).not.toContain('href={`/milla?ask=')
    }
  })
})
