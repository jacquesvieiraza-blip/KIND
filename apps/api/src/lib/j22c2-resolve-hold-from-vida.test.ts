// ══════════════════════════════════════════════════════════════════════════════════════════
// J22-C2 · A HELD REPLY CAN BE RESOLVED FROM VIDA (PV 11 C)
//
// REQ: *"Control exists; Milla copy says what happens."*
// RED: *"A held reply cannot be resolved from Vida."*
//
// ── THE HOLD THAT NO CONTROL COULD REACH ────────────────────────────────────────────────
//
// The operator feed rendered a retained reply ONCE PER CANDIDATE CLIENT. So a retention with no
// candidates produced no row at all, and a held reply nothing displays cannot be resolved by
// anybody — it was reachable only by reading the table by hand. Two real cases produce one: a
// lead lookup that failed while the reply arrived (J22-C3), and a collision whose every
// candidate is a demo or House account this feed filters out. Both are a person waiting.
//
// ── AND THE OBVIOUS FIX WOULD HAVE BEEN THE WRONG ONE ───────────────────────────────────
//
// 🛑 ATTRIBUTION IS REFUSED OUTSIDE THE STORED CANDIDATES, and that guard says of itself that
// it *"CANNOT BE REMOVED"*: attributing outside the set would hand one client an external reply
// on the strength of nothing at all — the exact harm the fail-closed routing exists to prevent,
// arriving through the recovery door. An empty set is not a licence to name anybody.
//
// So the control for a no-candidate hold is a RE-CHECK: the candidates are empty because a
// database read failed, which is a transient condition and not a fact about the world, and the
// honest move is to ask the question again. It writes evidence, never an opinion, and a
// re-check that still finds nobody says so and changes nothing.
//
// ── THE CLIENT'S HALF ───────────────────────────────────────────────────────────────────
//
// A held reply may belong to another client — that is why it is held — so Milla can never name
// one. What it CAN do is say what happens, which is what somebody who knows a prospect answered
// them and cannot see it here actually needs.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const strip = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n')
  .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
  .join('\n')

const ROUTE = strip(readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8'))
const VIDA = strip(readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8'))
// ⚠️ COMMENT-STRIPPED, like everything else this repo scans. The note's own header QUOTES the
// phrasing it refuses ("it will appear shortly"), and a guard reading the raw file would fail
// against the sentence explaining why that phrasing is absent.
const MILLA = strip(readFileSync(
  join(__dirname, '../../../portal/src/app/(milla)/milla/replies/page.tsx'), 'utf8'))

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE HOLD IS VISIBLE AT ALL
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J22-C2 · a hold with no candidate still reaches the operator', () => {
  it('🛑 THE FEED EMITS A ROW WHEN NO CANDIDATE COULD BE SHOWN', () => {
    expect(ROUTE, 'a retained reply with no candidates renders nowhere again')
      .toContain("kind: 'reply_unattributed_unknown'")
    expect(ROUTE).toContain('if (shown === 0) {')
    // The count is of rows actually PUSHED, so a candidate filtered out as demo/House also
    // counts as nothing shown — which is the second way this went invisible.
    expect(ROUTE).toMatch(/if \(excluded\.has\(cid\)\) continue\s*\n\s*shown\+\+/)
  })

  it('🛑 AND IT NAMES NO CLIENT, because there is none to name', () => {
    const at = ROUTE.indexOf("kind: 'reply_unattributed_unknown'")
    const block = ROUTE.slice(at - 200, at + 200)
    expect(block).toContain("client_id: ''")
    expect(block).toContain('unattributed_reply_id: r.id')
  })

  it('🛑 VIDA SHOWS IT WHEREVER THE OPERATOR IS — the feed is grouped by client', () => {
    // A row with an empty client id lands in a bucket no selection ever opens.
    expect(VIDA).toContain("const unassignedHolds = alertsByClient[''] ?? []")
    expect(VIDA, 'the unassigned holds are dropped when no client is selected')
      .toMatch(/const myAlerts = selected\s*\?\s*\[\.\.\.\(alertsByClient\[selected\] \?\? \[\]\), \.\.\.unassignedHolds\]\s*:\s*unassignedHolds/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② AND IT CAN ACTUALLY BE RESOLVED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J22-C2 · the controls that decide it', () => {
  const recheck = (() => {
    const at = ROUTE.indexOf("operatorRouter.post('/unattributed-replies/:id/recheck'")
    expect(at, 'the re-check control does not exist — a no-candidate hold can only be discarded')
      .toBeGreaterThan(-1)
    return ROUTE.slice(at, ROUTE.indexOf('operatorRouter.post', at + 20))
  })()

  it('🛑 RE-CHECK RE-RUNS THE LOOKUP THAT FAILED, and writes back only what it finds', () => {
    expect(recheck).toContain('findLeadMatches(found.row.from_email)')
    expect(recheck).toContain("update({ candidate_client_ids: clientIds, candidate_lead_ids: leadIds })")
  })

  it('🛑 IT GUESSES NOTHING — a re-check that finds nobody changes nothing', () => {
    expect(recheck).toContain("rechecked: 'still_unknown'")
    // ⚠️ BOUNDED BY THE WRITE THAT FOLLOWS IT. A fixed window ran past the early return into
    // the update below and judged code this branch never reaches.
    const at = recheck.indexOf('if (clientIds.length === 0)')
    const writeAt = recheck.indexOf('const { error: updErr }')
    expect(at).toBeGreaterThan(-1)
    expect(writeAt, 'the write-back moved — this guard must be repointed').toBeGreaterThan(at)
    expect(recheck.slice(at, writeAt), 'an empty re-check writes a candidate set')
      .not.toContain('update(')
  })

  it('🛑 A LOOKUP THAT FAILS AGAIN IS SAID, not recorded as an answer', () => {
    expect(recheck).toContain('res.status(503)')
    expect(recheck).toContain('still unknown')
  })

  it('🛑 AND IT ONLY TOUCHES AN UNRESOLVED HOLD', () => {
    expect(recheck).toContain("rechecked: 'already_resolved'")
    expect(recheck).toContain(".is('resolved_at', null)")
  })

  it('🛑 THE CANDIDATE CHECK ON ATTRIBUTION IS UNTOUCHED — this fills the set, never bypasses it', () => {
    // The guard that says of itself that it cannot be removed.
    expect(ROUTE).toContain('if (!candidates.includes(clientId)) {')
    expect(recheck, 'the re-check attributes the reply itself, skipping the check')
      .not.toContain('settleUnattributedReply')
    expect(recheck).not.toContain('processInboundReply')
  })

  it('🛑 THE MOVE IS AUDITED, with the set before and after', () => {
    // An operator who widened the candidate set is the one case where the attribution guard
    // could be argued into, so the widening has to survive the decision.
    expect(recheck).toContain("action: 'unattributed_reply_rechecked'")
    expect(recheck).toContain('candidates_before')
    expect(recheck).toContain('candidates_after')
    expect(strip(readFileSync(join(__dirname, 'operator-audit.ts'), 'utf8')))
      .toContain("| 'unattributed_reply_rechecked'")
  })

  it('🛑 VIDA OFFERS RE-CHECK, ATTRIBUTE AND DISCARD for that row', () => {
    const at = VIDA.indexOf("a.kind === 'reply_unattributed_unknown'")
    expect(at, 'the no-candidate hold has no controls').toBeGreaterThan(-1)
    const block = VIDA.slice(at, at + 2200)
    expect(block).toContain('recheckUnattributedReply(a)')
    expect(block).toContain("actOnUnattributedReply(a, 'resolve')")
    expect(block).toContain("actOnUnattributedReply(a, 'discard')")
  })

  it('🛑 AND ATTRIBUTING WITH NO CLIENT CHOSEN IS REFUSED, not silently sent', () => {
    expect(VIDA).toContain('const owner = a.client_id || selected')
    expect(VIDA).toMatch(/if \(action === 'resolve' && !owner\)/)
    expect(VIDA).toContain('disabled={proofBusy === a.unattributed_reply_id || !selected}')
  })

  it('the existing candidate-bearing hold keeps its two controls, unchanged', () => {
    expect(VIDA).toContain("a.kind === 'reply_unattributed' && (")
    expect(VIDA).toContain('Attribute to this client')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ MILLA SAYS WHAT HAPPENS
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J22-C2 · the client is told what happens to a reply we cannot place', () => {
  it('🛑 THE SENTENCE IS ON THE REPLIES SCREEN', () => {
    expect(MILLA).toContain('data-testid="held-reply-note"')
    expect(MILLA).toMatch(/cannot match to your programme automatically/)
  })

  it('🛑 IT SAYS NOTHING IS LOST, AND THAT A PERSON DECIDES', () => {
    expect(MILLA).toMatch(/not lost and it is not deleted/)
    expect(MILLA).toMatch(/a person at K\.I\.N\.D reads it/)
  })

  it('🛑 AND IT NAMES NO REPLY AND NO SENDER — a held reply may be another client\'s', () => {
    // The whole reason it is held is that we cannot say whose it is. Telling a client that
    // "somebody replied" would hand them the one fact we are refusing to guess at.
    for (const leak of ['from_email', 'fromEmail', 'sender', 'prospect@', 'pending replies', 'you have a held']) {
      expect(MILLA, `the note leaks ${leak}`).not.toContain(leak)
    }
  })

  it('it promises a human decision, not an automatic arrival', () => {
    expect(MILLA, 'the copy promises an outcome nobody has decided yet')
      .not.toMatch(/will appear shortly|will be added automatically|within \d+ hours/)
  })
})
