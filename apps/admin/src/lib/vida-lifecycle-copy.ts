// ═══════════════════════════════════════════════════════════════════════════════════════
// WHAT VIDA SAYS AT EACH STAGE — the founder's locked words, as data rather than as JSX.
//
// ── WHY THE COPY IS A MODULE ────────────────────────────────────────────────────────────
//
// Several of these sentences are decisions, not wording. "No automated reply will be sent for
// it while it is waiting for you. Everyone else continues." replaced a claim the backend could
// not keep. "Your programme results are up to date in Milla." replaced a frozen report that
// does not exist. `Sender = Paused` with `Next activity = Not running` was corrected once and
// must not drift back. Buried in a component, each is one careless edit from being lost and
// nothing would fail; here every one of them is a string a test can hold.
//
// ── AND IT IS PURE ──────────────────────────────────────────────────────────────────────
//
// This file decides nothing about WHERE a client is — that verdict arrives from the server
// (`deriveLifecycle`). It only turns the verdict plus this programme's own numbers into the
// three columns. No fetching, no state, no re-derivation: given the same verdict it always
// says the same thing, which is what makes the wording assertable.
//
// ── NOTHING HERE MAY NAME OUR PLUMBING ──────────────────────────────────────────────────
//
// 🛑 No batch id, no RPC, no status enum, no column name, no provider. The operator is looking
// at a client's programme, and a screen that says `READY_FOR_APPROVAL` or `batch_id` is
// describing us to somebody who is trying to think about them.
// ═══════════════════════════════════════════════════════════════════════════════════════

export type LifecycleState =
  | 'signup' | 'proof' | 'recommendation'
  | 'sourcing' | 'sourcing_exception'
  | 'approval' | 'approval_awaiting_second_payment'
  | 'live_ready_to_make_live' | 'live_ready_to_run'
  | 'review' | 'review_reply' | 'review_sender'
  | 'completion' | 'completion_repeat'
  | 'blocked'

export type VidaMode = 'No action needed' | 'Working' | 'Watching' | 'Needs you'

export type PanelCard =
  | { kind: 'fact'; label: string; value: string; caption?: string; tone?: 'exception' }
  | { kind: 'stats'; label: string; stats: { value: string; label: string }[] }
  | { kind: 'ticks'; label: string; ticks: { label: string; done: boolean }[] }
  | { kind: 'note'; label: string; body: string; tone?: 'exception' }

/**
 * A control the operator may press.
 *
 * ⚠️ `needsCeiling` IS RUN AND ONLY RUN. A run must name an explicit maximum the operator
 * typed — never a default, because a pre-filled ceiling is a number nobody chose.
 */
export type PanelAction = {
  key: 'try_again' | 'make_live' | 'run' | 'handle_reply' | 'book_call' | 'reconnect_mailbox' | 'pause_programme' | 'prepare_next' | 'not_yet'
  label: string
  kind: 'primary' | 'secondary'
  needsCeiling?: boolean
}

export type LifecycleCopyInput = {
  clientName: string
  state: LifecycleState
  mode: VidaMode
  counts: {
    sourced: number; qualified: number; rejected: number; stillToCheck: number
    enrolled: number; sends: number; replies: number; positive: number; meetings: number
    repliesAwaitingDecision: number
  }
  programme: null | {
    meetingTarget: number | null
    entitlementUsed: number; entitlementTotal: number; entitlementRemaining: number
  }
  replyAwaiting: { name: string | null; company: string | null } | null
  stoppedDetail: string | null
  humanBlockers: { code: string; detail: string }[]
  killSwitchOff: boolean
  operatorRunEnabled: boolean
  senderSendable: boolean
}

export type LifecycleCopy = {
  subtitle: string
  messages: string[]
  chips: string[]
  cards: PanelCard[]
  actions: PanelAction[]
}

const n = (v: number) => v.toLocaleString()
const plural = (v: number, one: string, many: string) => `${n(v)} ${v === 1 ? one : many}`

/**
 * 🛑 THE SENDING CARD, AND IT IS THE SAME TWO LINES EVERYWHERE IT APPEARS.
 *
 * State first, switch beneath it. **A bare "OFF" under "SENDING" must never appear** — read
 * alone it says the opposite of what it means. And "permitted" is not "authorised": with the
 * switch off, programme authority, approval, P2, LIVE, the sender, the schedule and the caps
 * all still have to say yes.
 */
export function sendingCard(killSwitchOff: boolean): PanelCard {
  return killSwitchOff
    ? { kind: 'fact', label: 'Sending', value: 'Permitted',
        caption: 'Kill-switch OFF — sending is permitted, subject to every other gate.' }
    : { kind: 'fact', label: 'Sending', value: 'Blocked',
        caption: 'Kill-switch ON — nothing is delivered on any channel.' }
}

/** The last card in every stack: Vida's own posture, in one word. */
function vidaCard(value: string, caption?: string): PanelCard {
  return { kind: 'fact', label: 'Vida', value, caption }
}

/**
 * The three columns for one client, at one moment.
 *
 * ⚠️ EVERY BRANCH RETURNS, and the fallthrough is `blocked` — a state that says plainly that
 * something is in the way rather than rendering an empty panel. There is no "unknown" screen:
 * an operator who is shown nothing assumes nothing is wrong.
 */
export function lifecycleCopy(i: LifecycleCopyInput): LifecycleCopy {
  const c = i.counts
  const target = i.programme?.meetingTarget ?? null

  switch (i.state) {
    // ── ① SIGNUP — Vida watches. Milla is doing the talking. ──────────────────────────
    case 'signup':
      return {
        subtitle: 'Signed up · preview of their first stage',
        messages: [
          `${i.clientName} have signed up. Milla is starting the Proof process and gathering what they want to achieve.`,
          `I'll keep the operational side ready and tell you if I need anything.`,
        ],
        chips: ['What do we know about them?', 'Anything blocking?'],
        cards: [
          { kind: 'fact', label: 'Stage', value: 'Signup', caption: 'Just arrived' },
          { kind: 'fact', label: 'Outcome', value: 'Not stated yet', caption: 'Milla will ask' },
          { kind: 'fact', label: 'Programme', value: 'None yet', caption: 'Nothing is payable at this stage' },
          { kind: 'fact', label: 'Next', value: 'Proof', caption: "Milla is gathering the client's outcome" },
          vidaCard('Waiting', 'Nothing needs you'),
        ],
        actions: [],
      }

    // ── ② PROOF — calibration is the client's and Milla's. No operator GO exists. ──────
    case 'proof':
      return {
        subtitle: 'Proof in progress',
        messages: [
          `Milla is calibrating ${i.clientName}'s targeting. No outreach can start.`,
          `I'm holding until Proof is complete.`,
        ],
        chips: ['What are they calibrating?', 'Anything blocking?'],
        cards: [
          { kind: 'fact', label: 'Stage', value: 'Proof', caption: 'Targeting is being calibrated' },
          { kind: 'fact', label: 'Desired outcome', value: target ? `${target} booked meetings` : 'Being agreed', caption: 'Milla is shaping it with the client' },
          { kind: 'fact', label: 'Targeting', value: 'Calibrating' },
          { kind: 'fact', label: 'Client', value: 'Reviewing' },
          { kind: 'fact', label: 'Next', value: 'Milla refines the recommendation.' },
          vidaCard('No action needed'),
        ],
        actions: [],
      }

    // ── ③ RECOMMENDATION — commercial truth, and the client's decision. ───────────────
    case 'recommendation':
      return {
        subtitle: 'Recommendation with the client',
        messages: [
          `Milla has shaped the recommended programme for ${i.clientName}. The client is reviewing it.`,
          `I'll stay ready and flag anything that needs operator attention.`,
        ],
        chips: ['Why this programme size?', 'What happens when they accept?'],
        cards: [
          { kind: 'fact', label: 'Stage', value: 'Recommendation', caption: 'The client is reviewing it' },
          { kind: 'fact', label: 'Outcome target', value: target ? `${target} booked meetings` : 'Not stated yet' },
          {
            kind: 'stats', label: 'Recommended programme',
            stats: [
              { value: String(target ?? '—'), label: 'Meeting target' },
              { value: n(i.programme?.entitlementTotal ?? 0), label: 'Qualified-prospect entitlement' },
            ],
          },
          { kind: 'fact', label: 'Payment', value: 'Awaiting first payment', caption: 'Nothing is charged until they accept' },
          { kind: 'fact', label: 'Client', value: 'Reviewing' },
          { kind: 'fact', label: 'Next', value: 'The client accepts the recommendation and authorises the first payment.' },
          vidaCard('Ready', 'No action needed'),
        ],
        // 🛑 NO OPERATOR ACTION. P1 starts the work by itself; a "Source now" button here is
        // the manual step the automatic continuation exists to delete.
        actions: [],
      }

    // ── ④ SOURCING, HEALTHY — Vida is working. There is nothing to press. ─────────────
    case 'sourcing': {
      const messages = [`The first payment is authorised. I'm sourcing and qualifying prospects against ${i.clientName}'s locked targeting.`]
      if (c.sourced > 0) messages.push(`${n(c.sourced)} candidates sourced. Qualification is in progress.`)
      if (c.qualified > 0 || c.rejected > 0) {
        messages.push(`${n(c.qualified)} qualified. ${n(c.rejected)} rejected. The programme is moving into preparation.`)
      }
      const stateWord = c.sourced === 0 ? 'Sourcing'
        : c.stillToCheck > 0 ? 'Qualifying' : 'Preparing'
      return {
        subtitle: 'Sourcing and qualifying',
        messages,
        chips: [c.rejected > 0 ? `Why were ${n(c.rejected)} rejected?` : 'How is it going?', 'When will it be ready?'],
        cards: [
          { kind: 'fact', label: 'Stage', value: 'Sourcing', caption: 'Qualified prospects are being prepared' },
          { kind: 'fact', label: 'Outcome target', value: target ? `${target} booked meetings` : 'Not stated yet' },
          { kind: 'stats', label: 'Current batch', stats: [
            { value: n(c.sourced), label: 'Sourced' },
            { value: n(c.qualified), label: 'Qualified' },
            { value: n(c.rejected), label: 'Rejected' },
          ] },
          { kind: 'stats', label: 'Programme entitlement', stats: [
            { value: n(i.programme?.entitlementUsed ?? 0), label: 'Used' },
            { value: n(i.programme?.entitlementRemaining ?? 0), label: 'Remaining' },
            { value: n(i.programme?.entitlementTotal ?? 0), label: 'Total' },
          ] },
          { kind: 'fact', label: 'State', value: stateWord, caption: 'Building the campaign and outreach' },
          { kind: 'fact', label: 'Next', value: 'The programme becomes ready for the client to approve.' },
          vidaCard('Working', 'Nothing needs you'),
        ],
        actions: [],
      }
    }

    // ── ⑤ SOURCING EXCEPTION — what stopped, what is safe, what did NOT happen. ───────
    case 'sourcing_exception': {
      const stopped = i.stoppedDetail
        ?? i.humanBlockers[0]?.detail
        ?? 'Preparation did not finish. Nothing was settled and no entitlement was used.'
      const messages: string[] = []
      if (c.sourced > 0) messages.push(`${n(c.sourced)} candidates sourced. Qualification is in progress.`)
      messages.push(
        c.stillToCheck > 0
          ? `Qualification paused. ${plural(c.stillToCheck, 'prospect', 'prospects')} still need checking. Nothing has been settled.`
          : `This stopped before it finished. ${stopped}`,
      )
      // 🛑 THE SENTENCE THAT MAKES THE RETRY PRESSABLE. An operator who does not know a retry
      // is free will not press it, and the work stays stopped.
      if (c.qualified > 0 || c.rejected > 0) {
        messages.push(`${n(c.qualified)} qualified and ${n(c.rejected)} rejected so far keep their result. Picking this up again skips them — it costs nothing extra.`)
      }
      return {
        subtitle: 'Qualification paused',
        messages,
        chips: ['Try again now', 'What is holding it up?'],
        cards: [
          { kind: 'fact', label: 'Stage', value: 'Sourcing', caption: 'Qualification did not finish' },
          { kind: 'note', label: c.stillToCheck > 0 ? 'Qualification paused' : 'Preparation stopped', body: stopped, tone: 'exception' },
          { kind: 'stats', label: 'Current batch', stats: [
            { value: n(c.qualified), label: 'Qualified' },
            { value: n(c.rejected), label: 'Rejected' },
            { value: n(c.stillToCheck), label: 'Still to check' },
          ] },
          { kind: 'stats', label: 'Programme entitlement', stats: [
            { value: n(i.programme?.entitlementUsed ?? 0), label: 'Used' },
            { value: n(i.programme?.entitlementRemaining ?? 0), label: 'Remaining' },
            { value: n(i.programme?.entitlementTotal ?? 0), label: 'Total' },
          ] },
          { kind: 'fact', label: 'Retry', value: 'Safe', caption: 'Already-checked prospects are skipped' },
          vidaCard('Needs you'),
        ],
        actions: [{ key: 'try_again', label: 'Try again', kind: 'primary' }],
      }
    }

    // ── ⑥ APPROVAL — frozen, with the client, and Vida cannot approve for them. ───────
    case 'approval':
    case 'approval_awaiting_second_payment': {
      const approved = i.state === 'approval_awaiting_second_payment'
      return {
        subtitle: approved ? 'Approved · awaiting the second payment' : 'Awaiting client approval',
        messages: approved
          ? [
              `${i.clientName} have approved the programme. The second payment is the next step, and it is theirs.`,
              `Nothing sends until that is settled and you make the programme live.`,
            ]
          : [
              `The programme is ready for client review. Milla is showing ${i.clientName} the qualified prospects and outreach.`,
              `Nothing can change or send while approval is pending.`,
            ],
        chips: ['What is the client seeing?', 'What happens after approval?'],
        cards: [
          { kind: 'fact', label: 'Stage', value: 'Approval', caption: 'With the client in Milla' },
          { kind: 'stats', label: 'Ready for review', stats: [
            { value: n(c.qualified || c.enrolled), label: 'Qualified prospects' },
            { value: String(target ?? '—'), label: 'Meeting target' },
          ] },
          { kind: 'ticks', label: 'Prepared', ticks: [
            { label: 'Campaign ready', done: true }, { label: 'Sequence ready', done: true },
            { label: 'Sender ready', done: i.senderSendable }, { label: 'Schedule ready', done: true },
            { label: 'Review snapshot frozen', done: true },
          ] },
          { kind: 'fact', label: 'Client', value: approved ? 'Approved' : 'Waiting' },
          { kind: 'fact', label: 'Second payment',
            value: approved ? 'Awaiting the client' : 'Not yet authorised',
            caption: approved ? 'Outreach cannot start until it is settled' : 'The gate after approval' },
          { kind: 'fact', label: 'Next', value: approved ? 'The client authorises the second payment.' : 'The client approves the programme in Milla.' },
          vidaCard('Holding'),
        ],
        // 🛑 VIDA CANNOT APPROVE. The client's approval is consent to email real strangers on
        // their behalf; an operator button here would make that consent ours to give.
        actions: [],
      }
    }

    // ── ⑦A LIVE, BEFORE MAKE LIVE — arming is the action, and it sends nothing. ───────
    case 'live_ready_to_make_live':
      return {
        subtitle: 'Ready to make live · preview only',
        messages: [
          `${i.clientName} approved the programme and the second payment is authorised.`,
          `Everything is ready to go live. Nothing sends until you make it live, and outreach only starts when you run it.`,
        ],
        chips: ['What runs first?', 'Show me the schedule'],
        cards: [
          { kind: 'fact', label: 'Stage', value: 'Live', caption: 'Ready to make live' },
          { kind: 'ticks', label: 'Complete', ticks: [
            { label: 'Client approval', done: true }, { label: 'Second payment', done: true },
            { label: `Prospects ready — ${n(c.enrolled)}`, done: c.enrolled > 0 },
            { label: 'Campaign ready', done: true }, { label: 'Sequence ready', done: true },
            { label: 'Sender ready', done: i.senderSendable }, { label: 'Schedule ready', done: true },
          ] },
          { kind: 'fact', label: 'State', value: 'Ready to make live', caption: 'Nothing has sent' },
          vidaCard('Waiting on you', 'Make live arms it. Run is a separate step, later.'),
        ],
        actions: [{ key: 'make_live', label: 'Make live', kind: 'primary' }],
      }

    // ── ⑦B LIVE, AFTER MAKE LIVE — armed, nothing sent, Run is the only launch action. ─
    case 'live_ready_to_run': {
      const runnable = i.killSwitchOff && i.operatorRunEnabled
      return {
        subtitle: 'Live · outreach not started',
        messages: [
          `Programme is live. Outreach is ready to run.`,
          `Nothing has been sent yet. Run starts the first send window.`,
        ],
        chips: ['Who goes first?', 'Show me the schedule'],
        cards: [
          { kind: 'fact', label: 'Stage', value: 'Live', caption: 'Live — ready to run' },
          { kind: 'stats', label: 'Ready to run', stats: [
            { value: n(c.enrolled), label: 'Prospects enrolled' },
            { value: i.senderSendable ? 'Healthy' : 'Not ready', label: 'Sender' },
          ] },
          { kind: 'ticks', label: 'Complete', ticks: [
            { label: 'Client approval', done: true }, { label: 'Second payment', done: true },
            { label: 'Made live', done: true }, { label: 'Outreach started', done: false },
          ] },
          sendingCard(i.killSwitchOff),
          vidaCard(
            runnable ? 'Waiting on you' : 'Holding',
            // ⛓️ THE KILL-SWITCH IS NOT A TASK. With it ON a run cannot start, and the operator
            // cannot fix that from this screen — so the panel says why rather than drawing a
            // button that would be refused, and the client stays out of Needs you.
            runnable ? 'Run is the only launch action'
              : !i.killSwitchOff ? 'Run cannot start while the kill-switch is ON. It is not an exception to it.'
              : 'Run is unavailable — FIGSY_OPERATOR_SEND_ENABLED is not set on the API, so no run can start.',
          ),
        ],
        actions: runnable ? [{ key: 'run', label: 'Run', kind: 'primary', needsCeiling: true }] : [],
      }
    }

    // ── ⑧ REVIEW, HEALTHY — watching. Do not bother the operator. ────────────────────
    case 'review':
      return {
        subtitle: 'Outreach running',
        messages: [
          `Outreach is running. ${plural(c.enrolled, 'prospect is', 'prospects are')} in the sequence. ${n(c.replies)} replied. ${plural(c.meetings, 'meeting is', 'meetings are')} booked.`,
          `Everything is healthy. I'll tell you the moment something needs a decision.`,
        ],
        chips: ['Show me the replies', 'How are we tracking?'],
        cards: [
          { kind: 'fact', label: 'Stage', value: 'Review', caption: 'Outreach is running' },
          { kind: 'stats', label: 'Progress', stats: [
            { value: n(c.enrolled), label: 'In campaign' }, { value: n(c.sends), label: 'Emails sent' },
            { value: n(c.replies), label: 'Replies' }, { value: n(c.positive), label: 'Positive' },
            { value: n(c.meetings), label: 'Meetings booked' }, { value: String(target ?? '—'), label: 'Target' },
          ] },
          { kind: 'stats', label: 'Health', stats: [
            { value: 'Healthy', label: 'Campaign' },
            { value: i.senderSendable ? 'Healthy' : 'Paused', label: 'Sender' },
          ] },
          sendingCard(i.killSwitchOff),
          vidaCard('Watching', 'Nothing needs you'),
        ],
        actions: [],
      }

    // ── ⑨ REVIEW, A REPLY NEEDS A HUMAN ──────────────────────────────────────────────
    case 'review_reply': {
      const who = i.replyAwaiting?.name?.trim() || 'One prospect'
      const where = i.replyAwaiting?.company?.trim() || null
      const named = where ? `${who} at ${where}` : who
      return {
        subtitle: 'One reply needs you',
        messages: [
          `Outreach is running. ${plural(c.enrolled, 'prospect is', 'prospects are')} in the sequence. ${n(c.replies)} replied. ${plural(c.meetings, 'meeting is', 'meetings are')} booked.`,
          `One reply needs a human decision. ${named} is waiting on an answer.`,
          // 🛑 THE APPROVED SENTENCE, AND IT IS EXACT. It replaced a claim that the prospect's
          // sequence was HELD — which the backend cannot do per prospect. Saying so would have
          // been a promise nothing keeps, and the operator would only find out from a prospect.
          `No automated reply will be sent for it while it is waiting for you. Everyone else continues.`,
        ],
        chips: ['Show me the reply', 'Draft a response', 'Book the call'],
        cards: [
          { kind: 'fact', label: 'Stage', value: 'Review', caption: 'Outreach is running' },
          { kind: 'note', label: 'Needs a decision',
            body: `${named} — waiting on an answer. No automated reply goes out for them while this waits for you. Everyone else continues.`,
            tone: 'exception' },
          { kind: 'stats', label: 'Progress', stats: [
            { value: n(c.enrolled), label: 'In campaign' }, { value: n(c.sends), label: 'Emails sent' },
            { value: n(c.replies), label: 'Replies' }, { value: n(c.positive), label: 'Positive' },
            { value: n(c.meetings), label: 'Meetings booked' }, { value: String(target ?? '—'), label: 'Target' },
          ] },
          { kind: 'stats', label: 'Health', stats: [
            { value: 'Healthy', label: 'Campaign' },
            { value: i.senderSendable ? 'Healthy' : 'Paused', label: 'Sender' },
          ] },
          vidaCard('Needs you', 'One decision, then I carry on'),
        ],
        actions: [
          { key: 'handle_reply', label: 'Handle reply', kind: 'primary' },
          { key: 'book_call', label: 'Book the call', kind: 'secondary' },
        ],
      }
    }

    // ── ⑩ REVIEW, SENDER ISSUE — the mailbox, not the copy. ──────────────────────────
    case 'review_sender':
      return {
        subtitle: 'Sending paused',
        messages: [
          `The sender paused because of an inbox issue. Nothing else is sending until it is resolved.`,
          `${plural(c.enrolled, 'prospect is', 'prospects are')} still enrolled and nobody lost their place.`,
          `Reconnecting the mailbox is the fix. I'll resume from where it stopped.`,
        ],
        chips: ['Reconnect the mailbox', "What happens to today's sends?"],
        cards: [
          { kind: 'fact', label: 'Stage', value: 'Review', caption: 'Sending is paused' },
          { kind: 'note', label: 'Sending paused',
            body: 'The sending mailbox is not able to send. Nothing sends for this client until it is reconnected. Nobody lost their place in the sequence.',
            tone: 'exception' },
          { kind: 'stats', label: 'Progress', stats: [
            { value: n(c.enrolled), label: 'In campaign' }, { value: n(c.sends), label: 'Emails sent' },
            { value: n(c.replies), label: 'Replies' }, { value: n(c.meetings), label: 'Meetings booked' },
          ] },
          // 🛑 THE CORRECTED THREE-UP, AND IT IS DELIBERATE. `Sender` reads **Paused**;
          // `Next activity` reads **Not running**. The founder ruled explicitly that Sender
          // itself is NOT relabelled to "Not running" — they are two different facts.
          { kind: 'stats', label: 'Health', stats: [
            { value: 'Healthy', label: 'Campaign' },
            { value: 'Paused', label: 'Sender' },
            { value: 'Not running', label: 'Next activity' },
          ] },
          vidaCard('Needs you', 'Reconnect and I resume'),
        ],
        actions: [
          { key: 'reconnect_mailbox', label: 'Reconnect mailbox', kind: 'primary' },
          { key: 'pause_programme', label: 'Pause programme', kind: 'secondary' },
        ],
      }

    // ── ⑪ COMPLETION ─────────────────────────────────────────────────────────────────
    case 'completion':
    case 'completion_repeat': {
      const repeat = i.state === 'completion_repeat'
      const messages = [
        `This programme is complete. ${plural(c.meetings, 'meeting was', 'meetings were')} booked from ${n(c.qualified || c.enrolled)} qualified prospects.`,
        // 🛑 THE LOCKED SENTENCE. It replaced "Final reporting is ready." — which promised a
        // frozen artifact that does not exist and never will. Reporting is the client's LIVE
        // results in Milla, and the words have to say so.
        `Your programme results are up to date in Milla.`,
      ]
      if (repeat) {
        messages.push(`${i.clientName} still have ${n(i.programme?.entitlementRemaining ?? 0)} qualified-prospect entitlement remaining.`)
        // ⛓️ 9 Sep — IT STATES THE OPPORTUNITY, IT DOES NOT ASK A QUESTION. The approved screen
        // reads "Would you like me to prepare the next programme?" beside a button; there is no
        // safe button (a next programme needs a meeting target nobody has chosen), and asking a
        // question the operator cannot answer here is worse than not asking. So it says what is
        // true and where the answer lives.
        messages.push(`I won't start anything on my own. A next programme is started deliberately, with a meeting target you choose.`)
      } else {
        messages.push(`I've stopped all future sends for this programme and kept the results and open replies intact.`)
      }
      const cards: PanelCard[] = [
        { kind: 'fact', label: 'Stage', value: 'Completion', caption: 'Closed cleanly' },
        { kind: 'stats', label: 'Final outcome', stats: [
          { value: n(c.meetings), label: 'Meetings booked' },
          { value: String(target ?? '—'), label: 'Target' },
          { value: target !== null && c.meetings >= target ? 'Target met' : 'Result', label: 'Result' },
        ] },
      ]
      if (repeat) {
        cards.push({
          kind: 'note', label: 'Repeat opportunity',
          body: `${n(i.programme?.entitlementRemaining ?? 0)} qualified prospects of entitlement remain. A next programme can be prepared from the same targeting or a new outcome.`,
          tone: 'exception',
        })
      }
      cards.push(
        { kind: 'stats', label: 'The work', stats: [
          { value: n(c.qualified || c.enrolled), label: 'Qualified prospects used' },
          { value: n(c.sends), label: 'Emails sent' },
          { value: n(c.replies), label: 'Replies' }, { value: n(c.positive), label: 'Positive' },
        ] },
        { kind: 'fact', label: 'Remaining entitlement',
          value: `${n(i.programme?.entitlementRemaining ?? 0)} qualified prospects`,
          caption: 'Unused value never expires' },
        // 🛑 REPORTING POINTS AT LIVE RESULTS. No download, no frozen file, nothing to produce.
        { kind: 'fact', label: 'Reporting', value: 'Up to date in Milla',
          caption: "The client's live programme results" },
        repeat ? vidaCard('Asking', 'Nothing starts without you') : vidaCard('Complete', 'Nothing needs you'),
      )
      return {
        subtitle: 'Programme complete',
        messages,
        chips: repeat
          ? ['What would the next programme look like?', 'Point them to their results']
          : ['Show me the results', 'What did best?'],
        cards,
        // ⛓️ 9 Sep — NO BUTTON, AND THE REASON IS NOT SHYNESS. The approved screen shows
        // "Prepare next programme"; preparing one requires a MEETING TARGET and an outcome,
        // which is a commercial decision with no route behind it today. Drawing the button
        // would either fail or silently reuse the last programme's target — spending a
        // client's entitlement on a size nobody chose. The opportunity is stated in full and
        // the operator starts the next programme where programmes are started.
        actions: [],
      }
    }

    // ── BLOCKED — paused, cancelled, or a blocker only a person can clear. ────────────
    case 'blocked':
    default: {
      const why = i.humanBlockers[0]?.detail
        ?? i.stoppedDetail
        ?? 'This programme is on hold. Nothing is sending, and nothing has been lost.'
      return {
        subtitle: 'On hold',
        messages: [
          `This programme is not moving. ${why}`,
          `Nothing is sending and nothing has been lost. I'll pick it up the moment it is cleared.`,
        ],
        chips: ['What is holding it up?', 'What is safe right now?'],
        cards: [
          { kind: 'note', label: 'On hold', body: why, tone: 'exception' },
          ...(i.humanBlockers.length > 1
            ? [{ kind: 'note' as const, label: 'Also outstanding', body: i.humanBlockers.slice(1).map(b => b.detail).join(' ') }]
            : []),
          vidaCard(i.humanBlockers.length > 0 ? 'Needs you' : 'Holding',
            i.humanBlockers.length > 0 ? 'One thing to clear' : 'Nothing starts on its own'),
        ],
        actions: [],
      }
    }
  }
}
