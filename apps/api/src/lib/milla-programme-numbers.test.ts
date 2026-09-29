// ⚑ 29 Sep (R174 · PR 6c) — MILLA'S NUMBERS ARE THIS PROGRAMME'S.
//   · replies and meetings on Reports, Performance, Analytics, ROI and the Results card are this
//     programme's (its own leads' replies, its own meetings), the same way 5b counts them for Vida;
//   · our own sent replies are never counted as a prospect's reply — in Milla or in Vida;
//   · each page says what the figure covers ("this programme" / "all time" / "none yet").
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { isOurOwnReply, OUR_SENT_REPLY, replyInboxState } from '@kind/shared'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('our own reply is not a reply', () => {
  it('is recognised by one shared rule, and the Inbox calls it ours', () => {
    expect(OUR_SENT_REPLY).toBe('sent_reply')
    expect(isOurOwnReply('sent_reply')).toBe(true)
    expect(isOurOwnReply('warm')).toBe(false)
    expect(replyInboxState({ classification: 'sent_reply', qualified_at: null, meeting_booked_at: null }))
      .toEqual({ label: 'our reply', tone: 'quiet' })
  })
  it('the lifecycle counts (Vida) leave it out', () => {
    expect(read('apps/api/src/lib/programme-lifecycle-facts.ts')).toContain('.filter(r => !isOurOwnReply(r.classification))')
  })
})

describe('the Milla totals', () => {
  const summary = read('apps/api/src/lib/milla-summary.ts')
  const fn = summary.slice(summary.indexOf('function programmeTotals('), summary.indexOf('export async function buildMillaSummaryData('))
  it('are this programme’s: its own leads’ replies less ours, and its own meetings', () => {
    expect(fn).toContain('meetingCounts({ clientId, programmeId: scope.programmeId })')
    expect(fn).toContain(".eq('programme_id', scope.programmeId)")
    expect(fn).toContain("all().eq('classification', OUR_SENT_REPLY)")
    expect(fn).toContain("if (scope.kind === 'proof') return { replies: 0, meetings: 0 }")
    expect(summary).toContain('programmeTotals(clientId, summaryScope).then(t => ({ count: t.replies')
    expect(summary).not.toContain("db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId),\n    // Same move, all-time.")
  })
  it('and each page says what they cover', () => {
    for (const p of ['performance', 'roi', 'reports']) {
      const page = read(`apps/portal/src/app/(milla)/milla/${p}/page.tsx`)
      expect(page, p).not.toContain('"Replies, all time"')
      expect(page, p).toContain("totalsLabel('Replies', o?.totals_scope)")
    }
    const label = read('apps/portal/src/lib/totals-label.ts')
    expect(label).toContain("if (scope === 'programme') return `${what} · this programme`")
  })
})
