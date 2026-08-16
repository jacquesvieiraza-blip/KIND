// ── THE SELLER RAMP (#654) — ONE HOME for the gates ─────────────────────────────────────
//
// Founder, 16 Aug: "getting someone to sign up to sell is easy. keeping them enagged and
// selling is another thing."
//
// Why gates and not a drip. A timed sequence ("day 3: here's a tip!") fires whether or not
// anybody did anything, which means it fires hardest at exactly the person who has gone
// quiet — and gets ignored. A gate opens only when real work is done, so the ramp is a
// record of what happened rather than a calendar talking to itself.
//
// Why the state is DERIVED and never stored. A stored `current_gate` column is a second
// source of truth that drifts the first time a row is deleted or a job half-runs. The gates
// are computed from the seller's own rows every time they are asked for, so they cannot be
// wrong — they can only be recomputed.
//
// SELLER-TYPE AGNOSTIC BY DESIGN. The founder was explicit: "being a partner, an employed AE
// os customer success, makes no difference who." Nothing in this file reads seat_type, and
// nothing may be added that does — the ramp keys on a seat, not on a kind of person.

/** Name your network. Twenty is a floor, not a ceiling — see the WHY on gate 1. */
export const NAME_YOUR_NETWORK = 20

/** How many asks before the ramp counts the habit as started. */
export const FIRST_ASKS = 5

export type RampCounts = {
  contacts: number
  asksSent: number
  conversations: number
  demosBooked: number
  clientsLive: number
}

export type RampGate = {
  id: 'name-your-20' | 'send-five-asks' | 'first-demo' | 'first-client'
  title: string
  /** Founder-plain: what this asks for, and why it is the thing that matters. */
  why: string
  /** Progress toward this gate, for a bar. */
  progress: { done: number; target: number }
  complete: boolean
  /** The one gate they are on now — everything before is done, everything after is locked. */
  current: boolean
}

export const RAMP: { id: RampGate['id']; title: string; why: string }[] = [
  {
    id: 'name-your-20',
    title: `Name ${NAME_YOUR_NETWORK} people you already know`,
    why: 'Write them down before you contact anybody. Almost nobody does this, and it is the difference between selling and hoping to remember. Business owners, people who run a team, anyone who sells to other businesses. Twenty is the floor — put down every name you have.',
  },
  {
    id: 'send-five-asks',
    title: `Ask ${FIRST_ASKS} of them for a conversation`,
    why: 'Not a pitch — a conversation. The words are on this page. Asking for fifteen minutes gets answered; asking someone to buy something they have never seen does not.',
  },
  {
    id: 'first-demo',
    title: 'Book your first demo',
    why: 'You bring the person, we run the demo. Pick the warmest name on your list rather than the biggest one: the point of the first demo is to complete the loop once, not to win the largest client you know.',
  },
  {
    id: 'first-client',
    title: 'Your first client starts',
    why: 'This is when the money page starts to mean something — and when the compounding begins, because you keep earning every month that client stays.',
  },
]

/**
 * The gates, computed from what the seller has actually done. Pure — no I/O, no clock, no
 * seat type — so it is trivially testable and cannot disagree with itself.
 */
export function rampFor(counts: RampCounts): { gates: RampGate[]; complete: boolean; currentIndex: number } {
  const progressFor = (id: RampGate['id']): { done: number; target: number } => {
    switch (id) {
      case 'name-your-20':   return { done: Math.min(counts.contacts, NAME_YOUR_NETWORK), target: NAME_YOUR_NETWORK }
      case 'send-five-asks': return { done: Math.min(counts.asksSent, FIRST_ASKS), target: FIRST_ASKS }
      case 'first-demo':     return { done: Math.min(counts.demosBooked, 1), target: 1 }
      case 'first-client':   return { done: Math.min(counts.clientsLive, 1), target: 1 }
    }
  }

  const raw = RAMP.map(g => {
    const progress = progressFor(g.id)
    return { ...g, progress, complete: progress.done >= progress.target, current: false }
  })

  // The current gate is the first incomplete one. A later gate completing early (a demo
  // booked before five asks were logged) does NOT skip the ramp — the seller still sees
  // what is unfinished, which is the honest picture and the coachable one.
  const currentIndex = raw.findIndex(g => !g.complete)
  if (currentIndex >= 0) raw[currentIndex].current = true

  return { gates: raw, complete: currentIndex === -1, currentIndex }
}

/** A one-line summary for the operator's console — counts only, never a name. */
export function rampSummary(counts: RampCounts): string {
  const { gates, complete, currentIndex } = rampFor(counts)
  if (complete) return 'Ramp complete'
  return `Gate ${currentIndex + 1} of ${gates.length} — ${counts.contacts} named, ${counts.asksSent} asked`
}
