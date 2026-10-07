// ⚑ 29 Sep (R174 · PR 5b) — VIDA SHOWS ONE SET OF CLIENT NUMBERS.
//   · the pipeline chips, the tab badges and the Blockers strip read the programme's own counts —
//     the object the stage panel already reads — so none of them can disagree;
//   · an unreadable count prints "?", a client with no programme prints "—", never a made-up 0;
//   · the Blockers strip shows what is really stuck, not the retired per-lead gates;
//   · the Needs-you badge counts exactly the clients the Needs-you list shows.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { batchChipLabels, batchSeqOf } from '../../../admin/src/lib/pipeline-batch-chips'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const PAGE = read('apps/admin/src/app/vida/page.tsx')

// The page's own helpers, lifted out and run — so the test proves what they compute, not only
// that they are there.
function helpers() {
  const start = PAGE.indexOf('function programmeCount(')
  const end = PAGE.indexOf('type StripBlockers')
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  const src = PAGE.slice(start, end)
    .replace(/: ProgrammeCounts/g, '').replace(/: StripBlockers/g, '').replace(/: Blockers/g, '')
    .replace(/\): number \| null \| undefined \{/, ') {')
    .replace(/\): \[string, number \| null \| undefined, CockpitTab \| null\]\[\] \{/, ') {')
    .replace(/lc: \(\{[^)]*\}\) \| null/, 'lc')
    .replace(/, key: string\)/, ', key)')
    .replace(/\(v\)|as Record<string, unknown>/g, '')
    .replace(/\(h => h\.detail\)/, '(h => h.detail)')
  // eslint-disable-next-line no-new-func
  // ⛓️ 6 Oct (N5): the chips' labels come from `pipeline-batch-chips`, handed in here.
  return new Function('batchChipLabels', 'batchSeqOf', `${src}; return { programmeCount, pipelineChips, blockerStrip }`)(batchChipLabels, batchSeqOf) as {
    programmeCount: (lc: unknown, k: string) => number | null | undefined
    pipelineChips: (lc: unknown) => [string, number | null | undefined, string | null][]
    blockerStrip: (b: unknown, lc: unknown) => { drafts: number; repliesToDecide: number | null; stuck: string[] }
  }
}

const LC = {
  programme: { id: 'p1' },
  counts: { sourced: 40, qualified: 22, rejected: 10, stillToCheck: 8, enrolled: 20, sends: 35, replies: 6,
    positive: 2, meetings: 3, repliesAwaitingDecision: 2, unreadable: ['sends'] },
  humanBlockers: [{ code: 'mailbox', detail: 'The sending mailbox is not connected.' }],
  senderSendable: true,
}

describe('the numbers come from the programme', () => {
  const h = { pipelineChips: (lc: unknown) => helpers().pipelineChips(lc), blockerStrip: (b: unknown, lc: unknown) => helpers().blockerStrip(b, lc) }
  it('every chip is the programme count, in the programme order; unreadable is null, no programme is undefined', () => {
    expect(h.pipelineChips(LC).map(([l, n]) => [l, n])).toEqual([
      ['Sourced', 40], ['Qualified', 22], ['In the sequence', 20], ['Emails sent', null], ['Replied', 6], ['Meetings', 3],
    ])
    // ⚑ 6 Oct (N5) — with the batch number the first two say what they count.
    expect(h.pipelineChips({ ...LC, counts: { ...LC.counts, batchSeq: 2 } }).slice(0, 2).map(([l]) => l)).toEqual(['found', 'qualified'])
    expect(h.pipelineChips({ ...LC, programme: null }).every(([, n]) => n === undefined)).toBe(true)
    expect(h.pipelineChips(null).every(([, n]) => n === undefined)).toBe(true)
  })
  it('the Blockers strip: emails to approve, replies to decide (the Inbox badge’s number), and what a person must clear', () => {
    const strip = h.blockerStrip({ send_gate: 4, money_gate: 9, unsent_sourced: 9, replies_to_triage: 9 }, LC)
    expect(strip).toEqual({ drafts: 4, repliesToDecide: 2, stuck: ['The sending mailbox is not connected.'] })
    expect(h.blockerStrip({ send_gate: 1 }, { ...LC, senderSendable: false, senderDetail: 'Reconnect Google.', humanBlockers: [] }).stuck)
      .toEqual(['Reconnect Google.'])
    expect(h.blockerStrip({ send_gate: 0 }, null)).toEqual({ drafts: 0, repliesToDecide: null, stuck: [] })
  })
  it('the chips, the badges and the strip all use the same helper', () => {
    // ⛓️ 6 Oct (N5): ~~([label, n, goTo])~~ — the index places the divider after the batch chips.
    expect(PAGE).toContain('{pipelineChips(lc).map(([label, n, goTo], i) => (')
    expect(PAGE).toContain("const n = t === 'Inbox' ? (programmeCount(lc, 'repliesAwaitingDecision') ?? 0)")
    expect(PAGE).toContain(": t === 'People' ? (programmeCount(lc, 'sourced') ?? 0)")
    expect(PAGE).toContain(": t === 'Bookings' ? (programmeCount(lc, 'meetings') ?? 0)")
    // ~~expect(PAGE).toContain('blockers: blockers ? blockerStrip(blockers, lc) : null,')~~
    // ⛓️ 29 Sep (R174 · fix): the same helper, told whether this is the demo (vida-four-fixes.test.ts).
    expect(PAGE).toContain('blockers: blockers ? blockerStrip(blockers, lc, selectedIsDemo()) : null,')
    expect(PAGE).not.toContain("['Qualified', cols?.qualified.count ?? 0, null]")
    expect(PAGE).not.toContain("['Sending', cols?.sending.count ?? 0, 'Campaign']")
  })
  it('an unreadable meeting count is named, so it prints "?" and not 0', () => {
    expect(read('apps/api/src/lib/programme-lifecycle-facts.ts')).toContain("out.unreadable.push('meetings')")
  })
})

describe('the strip and the badge', () => {
  it('the strip no longer shows the retired per-lead gates', () => {
    const conv = read('apps/admin/src/components/vida/VidaConversation.tsx')
    expect(conv).not.toContain("['Money gate'")
    expect(conv).not.toContain("['Unsent sourced'")
    expect(conv).toContain("['Emails to approve', surface.blockers.drafts], ['Replies to decide', surface.blockers.repliesToDecide]")
  })
  it('the Needs-you badge is the list’s own count', () => {
    const list = read('apps/admin/src/components/vida/VidaClients.tsx')
    expect(list).toContain('useEffect(() => { onNeedsYouCount?.(needsYouTotal) }, [needsYouTotal, onNeedsYouCount])')
    const layout = read('apps/admin/src/app/vida/layout.tsx')
    expect(layout).toContain('onNeedsYouCount={setNeedsYouCount}')
    expect(layout).not.toContain("setNeedsYouCount(Number(j.meta?.needs_you ?? 0))")
  })
})
