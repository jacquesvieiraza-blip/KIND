// ⚑ 29 Sep (R174 · PR 5a) — VIDA'S CHAT KNOWS THE CLIENT, AND HER PROPOSALS REACH A BUTTON.
//   · she is given the stage, the programme, this programme's numbers and what is stuck — the
//     same lifecycle detail the console's stage panel renders — so "What's blocking?" has an answer;
//   · an unreadable count is said to be unreadable, never passed as 0;
//   · every proposal lands as a card with the operator's button — targeting opens in the editor
//     they save, a message sends only after they confirm, a tab opens in place. Nothing runs itself.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { buildVidaSystem, vidaFactsFromLifecycle, type VidaLifecycleInput } from './vida-brain'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

const LC: VidaLifecycleInput = {
  verdict: { stageLabel: 'Results', mode: 'Needs you' },
  counts: { sourced: 40, qualified: 22, enrolled: 20, sends: 35, replies: 6, positive: 2, meetings: 3,
    repliesAwaitingDecision: 2, unreadable: ['sends'] },
  programme: { status: 'LIVE', meetingTarget: 10 },
  humanBlockers: [{ detail: 'The sending mailbox is not connected.' }],
  stoppedDetail: null,
  senderSendable: false, senderDetail: 'Reconnect Google for sales@acme.co.',
  killSwitchOff: true,
}

describe('what Vida is told', () => {
  it('the stage, the programme, this programme’s numbers and what is stuck', () => {
    const f = vidaFactsFromLifecycle(LC)
    expect(f.lifecycle).toEqual({ label: 'Results', mode: 'Needs you' })
    expect(f.programme).toBe('live · 10 meetings bought · 3 booked so far')
    expect(f.pipeline).toMatchObject({ 'qualified (this batch)': 22, 'emails sent': 'could not be read', 'meetings booked': 3 })
    expect(f.blockers).toEqual({ 'replies waiting on a decision': 2 })
    expect(f.stuck).toEqual(['The sending mailbox is not connected.', 'Reconnect Google for sales@acme.co.'])
    expect(f.outreachEnabled).toBe(true)
  })
  it('…and it reaches her prompt', () => {
    const sys = buildVidaSystem({ clientName: 'Acme', clientId: 'c1', operator: 'op@kind', ...vidaFactsFromLifecycle(LC) })
    expect(sys).toContain('  · Stage: Results (Needs you)')
    expect(sys).toContain('  · Programme: live · 10 meetings bought · 3 booked so far')
    expect(sys).toContain('  · emails sent: could not be read')
    expect(sys).toContain('  · STUCK: The sending mailbox is not connected.')
    expect(sys).toContain('  · replies waiting on a decision: 2')
  })
  it('no programme: she is told there is none, and is given no numbers to quote', () => {
    const f = vidaFactsFromLifecycle({ ...LC, programme: null })
    expect(f.programme).toBe('none yet — they have not bought one')
    expect(f.pipeline).toBeNull()
    expect(f.stuck).toEqual(['The sending mailbox is not connected.'])   // a sender only matters with a programme
  })
  it('the route gives her the lifecycle — and falls back to the old counts only when it cannot be read', () => {
    const op = read('apps/api/src/routes/operator.ts')
    const route = op.slice(op.indexOf("operatorRouter.post('/command'"), op.indexOf("operatorRouter.post('/command'") + 12000)
    expect(route).toContain('return await lifecycleDetailFor(cid)')
    expect(route).toContain('const facts = vidaFactsFromLifecycle(lifecycle)')
    expect(route).toContain('...facts,')
    expect(route).toContain('pipeline: lifecycle ? facts.pipeline : counts,')
  })
})

describe('her proposals reach a button', () => {
  const conv = read('apps/admin/src/components/vida/VidaConversation.tsx')
  it('each of the three that were thrown away becomes a card', () => {
    expect(conv).toContain("if (proposal?.kind === 'propose_icp_change' && proposal.input) {")
    expect(conv).toContain("if (proposal?.kind === 'draft_client_ask' && typeof proposal.input?.message === 'string'")
    expect(conv).toContain("if (proposal?.kind === 'open_workspace' && typeof proposal.input?.tab === 'string') {")
    expect(conv).toContain('<ProposalCard key={i} card={m.card}')
  })
  it('a message sends only after the operator confirms, through the Asks door', () => {
    const fn = conv.slice(conv.indexOf('async function sendDraftedAsk('), conv.indexOf('const run = useCallback('))
    expect(fn.indexOf('window.confirm(')).toBeGreaterThan(-1)
    expect(fn.indexOf('window.confirm(')).toBeLessThan(fn.indexOf("fetch('/api/proxy/operator/ask'"))
    expect(fn).toContain('body: JSON.stringify({ client_id: selected, question: message })')
  })
  it('targeting opens in the editor the operator saves; a tab opens only if it is a real one', () => {
    const page = read('apps/admin/src/app/vida/page.tsx')
    const apply = page.slice(page.indexOf('      applyIcp: (fields'), page.indexOf('      openTab: (t: string)'))
    expect(apply).toContain('setIcpEdit({')
    expect(apply).not.toMatch(/fetch\(|saveIcp\(/)          // it fills the form; the operator saves
    expect(page).toContain('if (!(COCKPIT_TABS as readonly string[]).includes(t)) return false')
  })
})
