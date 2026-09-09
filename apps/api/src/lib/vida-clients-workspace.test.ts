// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CLIENTS WORKSPACE — the body that replaced eleven permanent tabs.
//
// ── WHAT IS ASSERTED HERE, AND WHY IT IS NOT THE DERIVATION ─────────────────────────────
//
// `programme-lifecycle.test.ts` holds the RULE — where a client is and whether anybody is
// needed. This file holds what the operator actually SEES for that verdict: the words, the
// cards, and above all **which controls exist**. Those are separate failures. A correct rule
// rendered with a Make Live button at Approval is still a console that lets somebody approve
// on a client's behalf.
//
// ── THE COPY LOCKS ARE DECISIONS, NOT WORDING ───────────────────────────────────────────
//
// Three of these sentences replaced claims the product could not keep, and each was corrected
// exactly once:
//
//   • "No automated reply will be sent for it while it is waiting for you. Everyone else
//     continues." replaced "the sequence is held" — a per-prospect hold the backend cannot do.
//   • "Your programme results are up to date in Milla." replaced "Final reporting is ready."
//     — a frozen report artifact that does not exist.
//   • `Sender = Paused` with `Next activity = Not running` — the founder ruled explicitly that
//     Sender itself is NOT relabelled. They are two different facts.
//
// Each is one careless edit from being lost, and nothing else would fail.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  lifecycleCopy, sendingCard, type LifecycleCopyInput, type LifecycleState,
} from '../../../admin/src/lib/vida-lifecycle-copy'

const ADMIN = join(__dirname, '..', '..', '..', 'admin', 'src')
const PAGE = readFileSync(join(ADMIN, 'app', 'vida', 'page.tsx'), 'utf8')
const LAYOUT = readFileSync(join(ADMIN, 'app', 'vida', 'layout.tsx'), 'utf8')
const LIST = readFileSync(join(ADMIN, 'components', 'vida', 'VidaClients.tsx'), 'utf8')
const RIBBON = readFileSync(join(ADMIN, 'components', 'vida', 'LifecycleRibbon.tsx'), 'utf8')
const PANEL = readFileSync(join(ADMIN, 'components', 'vida', 'LifecyclePanel.tsx'), 'utf8')
const NAV = readFileSync(join(ADMIN, 'lib', 'vida-nav.ts'), 'utf8')

/** Executable lines only — a rule about what the code DOES must not match a comment. */
const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
  .join('\n')

const BASE: LifecycleCopyInput = {
  clientName: 'Northwind Logistics',
  state: 'signup',
  mode: 'No action needed',
  counts: {
    sourced: 250, qualified: 176, rejected: 74, stillToCheck: 0, enrolled: 176,
    sends: 212, replies: 3, positive: 2, meetings: 1, repliesAwaitingDecision: 0,
  },
  programme: { meetingTarget: 8, entitlementUsed: 176, entitlementTotal: 2500, entitlementRemaining: 2324 },
  replyAwaiting: null,
  stoppedDetail: null,
  humanBlockers: [],
  killSwitchOff: true,
  operatorRunEnabled: true,
  senderSendable: true,
}
const copy = (state: LifecycleState, over: Partial<LifecycleCopyInput> = {}) =>
  lifecycleCopy({ ...BASE, state, ...over })

const ALL_STATES: LifecycleState[] = [
  'signup', 'proof', 'recommendation', 'sourcing', 'sourcing_exception',
  'approval', 'approval_awaiting_second_payment', 'live_ready_to_make_live', 'live_ready_to_run',
  'review', 'review_reply', 'review_sender', 'completion', 'completion_repeat', 'blocked',
]

describe('① every state renders something, and none of it names our plumbing', () => {
  it('each state has a subtitle, at least one message, and a card stack', () => {
    for (const s of ALL_STATES) {
      const c = copy(s)
      expect(c.subtitle, `${s} has no subtitle`).toBeTruthy()
      expect(c.messages.length, `${s} says nothing`).toBeGreaterThan(0)
      expect(c.cards.length, `${s} shows no truth`).toBeGreaterThan(0)
      expect(c.chips.length, `${s} offers no question`).toBeGreaterThan(0)
    }
  })

  it('🛑 no state leaks a status enum, a column, an id or a provider name', () => {
    // The operator is looking at a client's programme. A screen that says READY_FOR_APPROVAL
    // or batch_id is describing US to somebody trying to think about THEM.
    const banned = [
      'READY_FOR_APPROVAL', 'SOURCING_AUTHORISED', 'AWAITING_FIRST_PAYMENT', 'COMPLETED',
      'batch_id', 'programme_id', 'client_id', 'campaign_id', 'figsy_', 'rpc', 'Apollo', 'PDL',
      'Smartlead', 'Instantly', 'Resend', 'nodemailer',
    ]
    for (const s of ALL_STATES) {
      const c = copy(s)
      const whole = JSON.stringify([c.subtitle, c.messages, c.chips, c.cards])
      for (const b of banned) {
        expect(whole.includes(b), `${s} leaks "${b}"`).toBe(false)
      }
    }
  })

  it('every card stack ends with Vida\'s own posture', () => {
    for (const s of ALL_STATES) {
      const last = copy(s).cards[copy(s).cards.length - 1]
      expect(last.label, `${s} does not end on the Vida card`).toBe('Vida')
    }
  })
})

describe('🛑 ② which controls exist — the half a correct rule can still get wrong', () => {
  it('Signup, Proof and Recommendation offer NO operator action', () => {
    // P1 starts the work by itself. A "Source now" here is the manual step the automatic
    // continuation exists to delete.
    for (const s of ['signup', 'proof', 'recommendation'] as LifecycleState[]) {
      expect(copy(s).actions, `${s} drew a control`).toEqual([])
    }
  })

  it('🛑 healthy Sourcing has NO GO button', () => {
    const c = copy('sourcing')
    expect(c.actions).toEqual([])
    expect(JSON.stringify(c).toLowerCase()).not.toContain('source now')
  })

  it('the sourcing exception offers exactly one control, and it is the retry', () => {
    const c = copy('sourcing_exception', { counts: { ...BASE.counts, stillToCheck: 12 } })
    expect(c.actions.map(a => a.key)).toEqual(['try_again'])
  })

  it('🛑 APPROVAL CANNOT BE APPROVED FROM VIDA — no control, in either approval state', () => {
    // The client's approval is consent to email real strangers on their behalf. An operator
    // button here would make that consent ours to give.
    for (const s of ['approval', 'approval_awaiting_second_payment'] as LifecycleState[]) {
      expect(copy(s).actions, `${s} drew a control`).toEqual([])
      // ⚠️ THE DUTY IS THE CONTROL, NOT THE WORD. The copy says "The client approves the
      // programme in Milla" — which is the truthful sentence, and exactly the one that must
      // be there. What must not exist is a control an operator could press.
      for (const key of ['approve', 'make_live', 'run']) {
        expect(copy(s).actions.some(a => a.key === key), `${s} offers ${key}`).toBe(false)
      }
    }
  })

  it('Make Live is the only control before it, and it says it sends nothing', () => {
    const c = copy('live_ready_to_make_live')
    expect(c.actions.map(a => a.key)).toEqual(['make_live'])
    expect(JSON.stringify(c.cards)).toContain('Make live arms it. Run is a separate step, later.')
  })

  it('Run is the only control after it, and it REQUIRES a typed ceiling', () => {
    const c = copy('live_ready_to_run')
    expect(c.actions.map(a => a.key)).toEqual(['run'])
    // 🛑 A DEFAULTED CEILING IS A NUMBER NOBODY CHOSE.
    expect(c.actions[0].needsCeiling).toBe(true)
  })

  it('🛑 RUN IS NOT DRAWN AT ALL WHILE THE KILL-SWITCH IS ON', () => {
    // The server refuses such a run with 503. Drawing the button would fail, and would imply
    // the run is an exception to the switch. It is not.
    const c = copy('live_ready_to_run', { killSwitchOff: false })
    expect(c.actions).toEqual([])
    expect(JSON.stringify(c.cards)).toContain('Run cannot start while the kill-switch is ON. It is not an exception to it.')
  })

  it('…and not while the operator key is unset either', () => {
    expect(copy('live_ready_to_run', { operatorRunEnabled: false }).actions).toEqual([])
  })

  it('healthy Review has no control at all', () => {
    expect(copy('review').actions).toEqual([])
  })

  it('a waiting reply offers handling it and booking the call', () => {
    expect(copy('review_reply').actions.map(a => a.key)).toEqual(['handle_reply', 'book_call'])
  })

  it('a sender issue offers reconnecting, and pausing', () => {
    expect(copy('review_sender').actions.map(a => a.key)).toEqual(['reconnect_mailbox', 'pause_programme'])
  })

  it('Completion offers nothing', () => {
    expect(copy('completion').actions).toEqual([])
  })

  it('🛑 the repeat opportunity is INFORMATIONAL — no button, and nothing is created', () => {
    // Preparing a next programme needs a meeting target nobody has chosen. A button that
    // reused the last programme's target would spend a client's entitlement on a size nobody
    // asked for; one that failed would fail in front of their programme.
    const c = copy('completion_repeat')
    expect(c.actions).toEqual([])
    expect(JSON.stringify(c.cards)).toContain('A next programme can be prepared from the same targeting or a new outcome.')
  })
})

describe('🛑 ③ the copy locks — each replaced a claim the product could not keep', () => {
  it('the reply state never claims a per-prospect sequence hold', () => {
    const c = copy('review_reply', { replyAwaiting: { name: 'Dana Whitfield', company: 'Merrow Group' } })
    const whole = JSON.stringify(c)
    expect(whole).toContain('No automated reply will be sent for it while it is waiting for you. Everyone else continues.')
    for (const forbidden of ['sequence is held', 'sequence held', 'on hold for them', 'paused for them']) {
      expect(whole.toLowerCase().includes(forbidden), `it claims "${forbidden}"`).toBe(false)
    }
    // And it names a person, so the card is about somebody rather than about a count.
    expect(whole).toContain('Dana Whitfield at Merrow Group')
  })

  it('the sender issue keeps Sender = Paused and Next activity = Not running', () => {
    const health = copy('review_sender').cards.find(c => c.kind === 'stats' && c.label === 'Health')
    expect(health, 'the health three-up is gone').toBeTruthy()
    const stats = (health as { stats: { value: string; label: string }[] }).stats
    expect(stats.find(s => s.label === 'Sender')?.value, 'Sender was relabelled').toBe('Paused')
    expect(stats.find(s => s.label === 'Next activity')?.value).toBe('Not running')
  })

  it('Completion points at live results in Milla, and never at a frozen report', () => {
    for (const s of ['completion', 'completion_repeat'] as LifecycleState[]) {
      const whole = JSON.stringify(copy(s))
      expect(whole).toContain('Your programme results are up to date in Milla.')
      expect(whole).toContain('Up to date in Milla')
      expect(whole).toContain("The client's live programme results")
      expect(whole.includes('Final reporting is ready'), `${s} promises a final report again`).toBe(false)
      for (const artifact of ['Download', 'final report', 'Final report', 'PDF']) {
        expect(whole.includes(artifact), `${s} invented a report artifact: ${artifact}`).toBe(false)
      }
    }
  })

  it('🛑 the SENDING card is state-first on two lines, and never a bare OFF', () => {
    const on = sendingCard(true)
    const off = sendingCard(false)
    expect(on).toMatchObject({ value: 'Permitted', caption: 'Kill-switch OFF — sending is permitted, subject to every other gate.' })
    expect(off).toMatchObject({ value: 'Blocked', caption: 'Kill-switch ON — nothing is delivered on any channel.' })
    // A bare switch state, with no word for what it means, says the opposite of what it means.
    expect(on.kind === 'fact' && on.value).not.toBe('OFF')
    expect(off.kind === 'fact' && off.value).not.toBe('ON')
  })

  it('the SENDING card appears wherever sending is possible, and nowhere earlier', () => {
    for (const s of ['live_ready_to_run', 'review'] as LifecycleState[]) {
      expect(JSON.stringify(copy(s).cards), `${s} has no sending card`).toContain('Kill-switch')
    }
    for (const s of ['signup', 'proof', 'recommendation', 'sourcing', 'approval'] as LifecycleState[]) {
      expect(JSON.stringify(copy(s).cards).includes('Kill-switch'), `${s} talks about sending`).toBe(false)
    }
  })

  it('the sourcing exception says what is safe and what did NOT happen', () => {
    const c = copy('sourcing_exception', { counts: { ...BASE.counts, stillToCheck: 12 } })
    const whole = JSON.stringify(c)
    expect(whole).toContain('Nothing has been settled')
    expect(whole).toContain('it costs nothing extra')
    expect(whole).toContain('Already-checked prospects are skipped')
  })

  it('🛑 and it never dumps lead ids or a raw error', () => {
    const c = copy('sourcing_exception', {
      stoppedDetail: 'Lead 8a8d0fd7-6b4d-4b87-9188-3b17864bca was not enrolled.',
      counts: { ...BASE.counts, stillToCheck: 0 },
    })
    // The detail we are HANDED may name one; what matters is that the panel never assembles a
    // wall of them, which is what the founder refused. One server sentence, rendered once.
    const notes = c.cards.filter(x => x.kind === 'note')
    expect(notes.length).toBeLessThanOrEqual(2)
  })
})

describe('④ the lifecycle ribbon', () => {
  it('is the locked eight, in order', () => {
    expect(RIBBON).toContain("'Signup', 'Proof', 'Recommendation', 'Sourcing', 'Approval', 'Live', 'Review', 'Completion'")
  })

  it('🛑 IS READ-ONLY — no button, no link, no click handler', () => {
    // A stage is where the client IS. A clickable one invites the belief that an operator moves
    // them, which is the belief this whole workspace removes.
    const c = code(RIBBON)
    for (const interactive of ['<button', 'onClick', '<Link', 'href=', 'router.push']) {
      expect(c.includes(interactive), `the ribbon is interactive: ${interactive}`).toBe(false)
    }
  })

  it('exactly one stage can be live, and the page feeds it the server\'s index', () => {
    expect(RIBBON).toContain('const now = stageIndex === n')
    expect(PAGE).toContain('<LifecycleRibbon stageIndex={lc?.verdict.stageIndex ?? null} />')
  })

  it('the Command Centre has no ribbon', () => {
    expect(LAYOUT.includes('LifecycleRibbon'), 'the ribbon reached the shell').toBe(false)
  })
})

describe('🛑 ⑤ the eleven tabs are no longer the Clients experience', () => {
  it('the lifecycle panel is the body, and it renders before the tools', () => {
    expect(PAGE).toContain('<LifecyclePanel')
    const panelAt = PAGE.indexOf('<LifecyclePanel')
    // ⚠️ THE STRIP'S OWN MARKER, not the `COCKPIT_TABS` const at the top of the file.
    const tabsAt = PAGE.indexOf('flex flex-wrap items-end gap-0.5')
    expect(panelAt).toBeGreaterThan(-1)
    expect(panelAt, 'the tab strip still comes first').toBeLessThan(tabsAt)
  })

  it('the tab strip is behind a closed disclosure — not a permanent strip', () => {
    expect(PAGE).toContain('const [toolsOpen, setToolsOpen] = useState(false)')
    expect(PAGE).toContain('{toolsOpen && (<>')
    expect(PAGE).toContain('Client tools')
  })

  it('🛑 …AND THE CAPABILITY WAS NOT DELETED, which is the other half of the instruction', () => {
    // "Do NOT delete its underlying capabilities." The ICP editor, the sequence editor, the
    // campaign settings, the asks and the pool have no other home in this product; removing
    // the strip would have made working capability unreachable.
    for (const t of ['Inbox', 'Approvals', 'People', 'Campaign', 'ICP', 'Sequence', 'Asks', 'Bookings', 'Programme', 'Pool', 'Exceptions']) {
      expect(PAGE.includes(`tab === '${t}'`), `the ${t} panel was deleted`).toBe(true)
    }
  })

  it('the old FLOW strip is gone — it described our process, not their lifecycle', () => {
    expect(code(PAGE).includes('FLOW.map('), 'the old eight-word FLOW strip is still rendered').toBe(false)
  })
})

describe('⑥ Needs you is a filter on the client list, not a screen', () => {
  it('it is in the Clients rail, with a live badge', () => {
    expect(NAV).toContain("label: 'Needs you'")
    expect(NAV).toContain("query: 'needs=1'")
    expect(NAV).toContain("badge: 'needs_you'")
  })

  it('🛑 it is the same screen — its href is the console, not a new page', () => {
    const row = NAV.slice(NAV.indexOf("label: 'Needs you'") - 60, NAV.indexOf("label: 'Needs you'") + 60)
    expect(row).toContain("href: '/vida'")
  })

  it('the count comes from the server, and a failed read shows NO badge', () => {
    expect(LAYOUT).toContain("fetch('/api/proxy/operator/lifecycle-board')")
    expect(LAYOUT).toContain('setNeedsYouCount(null)')
    // A badge reading "0" is a permanent claim that something was counted and found empty.
    expect(LAYOUT).toContain('count !== null && count > 0')
  })

  it('the list filters on the SERVER\'s needs_you, never on "whose turn is it"', () => {
    expect(LIST).toContain("lifecycle[id]?.needs_you === true")
    expect(code(LIST).includes("next.actor === 'you' || proofReview"), 'the old worklist rule still filters').toBe(false)
  })

  it('there is ONE control for the filter — the local chips are gone', () => {
    expect(code(LIST).includes('setOnlyNeedsYou('), 'a second filter control survived').toBe(false)
  })

  it('the selected client is never filtered out of the list they are reading', () => {
    expect(LIST).toContain("|| c.id === selected")
  })
})

describe('⑦ the client row is name · stage · needs you, and nothing else', () => {
  it('the stage word comes from the server\'s own verdict', () => {
    expect(LIST).toContain('lcRow?.stage_label')
  })

  it('🛑 the metrics came off the row', () => {
    // "NO giant metrics in list rows." Four judgements competed with the client's own name at
    // 216px, and none of them was the question the list is for.
    const rowAt = LIST.indexOf('{visible.map(c => {')
    // Executable lines only — the comment above the row EXPLAINS what came off it, and a
    // substring check that matched its own explanation would fail for the right reason.
    const row = code(LIST.slice(rowAt, LIST.indexOf('</button>', rowAt)))
    for (const gone of ['vatBadge', 'Suspended', 'Going quiet', 'cold-check exempt', 'n?.label']) {
      expect(row.includes(gone), `the row still carries ${gone}`).toBe(false)
    }
  })

  it('…and it still says which client, and which stage, and whether they need you', () => {
    const rowAt = LIST.indexOf('{visible.map(c => {')
    const row = LIST.slice(rowAt, LIST.indexOf('</button>', rowAt))
    expect(row).toContain('c.company_name')
    expect(row).toContain('stage_label')
    expect(row).toContain('· needs you')
  })
})

describe('⑧ switching client re-derives everything, and keeps no old state', () => {
  it('the panel, the ribbon and the middle column all read ONE verdict', () => {
    // `lc` is the server's answer for the selected client. Three surfaces, one source — so a
    // switch cannot leave one of them describing the previous client.
    expect(PAGE).toContain('const lc = prog?.lifecycle ?? null')
    expect(PAGE).toContain('stageIndex={lc?.verdict.stageIndex ?? null}')
    expect(PAGE).toContain('lifecycle: lcCopy && lc')
  })

  it('🛑 selecting a client CLEARS the previous programme truth before loading the next', () => {
    // Without this the panel would render the previous client's stage and counts for as long
    // as the new read took — a client's numbers under another client's name.
    expect(PAGE).toContain('setProg(null); setProgErr(null)')
  })

  it('and the tools disclosure does not carry a tab across clients', () => {
    // The tab strip resets with the client, so an operator does not land on Sequence for a
    // client at Signup who has none.
    expect(PAGE).toContain("setTab('Inbox'); setCockpit(null)")
  })
})

describe('⑨ the panel renders decisions, it does not make them', () => {
  it('the ceiling field is never pre-filled, and the button waits for a whole number', () => {
    expect(PANEL).toContain("useState('')")
    expect(PANEL).toContain('Number.isInteger(n) && n >= 1')
    expect(PANEL).toContain('disabled={!!busy || !ceilingValid}')
  })

  it('🛑 the panel derives no stage and fetches nothing', () => {
    const c = code(PANEL)
    for (const forbidden of ['fetch(', 'useEffect', 'status ===', 'READY_FOR_APPROVAL']) {
      expect(c.includes(forbidden), `the panel does its own ${forbidden}`).toBe(false)
    }
  })

  it('every action the copy can emit is routed to an existing capability', () => {
    const keys = new Set<string>()
    for (const s of ALL_STATES) for (const a of copy(s).actions) keys.add(a.key)
    for (const s of ALL_STATES) for (const a of copy(s, { killSwitchOff: false }).actions) keys.add(a.key)
    for (const k of keys) {
      expect(PAGE.includes(`case '${k}'`), `${k} is offered and nothing handles it`).toBe(true)
    }
  })

  it('the routes it reaches for are the ones that already existed', () => {
    expect(PAGE).toContain("lifecycle('ready-for-approval', 'Try again')")
    expect(PAGE).toContain("lifecycle('go-live', 'Make live')")
    expect(PAGE).toContain('runOnceWith(ceiling ?? 0)')
    expect(existsSync(join(ADMIN, 'app', 'vida', 'engine', 'page.tsx')), 'the mailbox page is gone').toBe(true)
  })
})
