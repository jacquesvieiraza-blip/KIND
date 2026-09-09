// ═══════════════════════════════════════════════════════════════════════════
// PR2 — THE VIDA HALF OF THE HANDOFF: VISIBLE BY DEFAULT, AND CLOSEABLE.
//
// The API can be perfect and the handoff still fail, in two ways an API test cannot see:
//
//   ① THE CLIENT IS FILTERED OUT. "Only needs you" is ON by default and filters on the
//      WORKLIST (`next.actor === 'you'`). A proof-exhausted prospect is by definition NEVER
//      FUNDED, so `client-step.ts` puts them at "Waiting on their $299" with `actor: 'them'`.
//      The alert rendered correctly and the operator was never shown the client it belonged
//      to — reachable only by switching the filter off and picking them by hand.
//
//   ② THERE IS NO WAY TO SAY IT IS DONE. `POST /operator/proof-review/:clientId/resolve`
//      shipped with no control anywhere in the admin app, so the review could be raised and
//      never closed, and the alert would sit there for ever.
//
// Source-level guards, following `vida-board-honesty.test.ts` — the admin app has no test
// runner of its own, and these are structural facts about the file rather than behaviour that
// needs a DOM. Comments are stripped so the prose explaining a rule can never satisfy it.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const VIDA = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
// ⚑ 4 Sep (UI-009) — FIX 2's filter travelled with the list it filters. Same rule, same file
// to read it in: the clients group in the operator nav.
const VIDA_CLIENTS = readFileSync(join(__dirname, '../../../admin/src/components/vida/VidaClients.tsx'), 'utf8')
const code = VIDA.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n')

describe('FIX 2 — an unresolved proof review keeps its client on the list', () => {
  // ⚑ 4 Sep (UI-009) — the list, and therefore its filter, is now the operator nav's clients
  // group. Same three rules, asserted on the file that runs them.
  const clientsCode = VIDA_CLIENTS.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n')

  // ⛓️ RETARGETED 9 Sep — THE FILTER'S PRIMARY RULE CHANGED; THIS CASE'S DUTY DID NOT.
  //
  // The primary rule was the worklist's `next.actor === 'you'` — "whose turn is it". The
  // Clients workspace replaced it with the server's own lifecycle verdict, which is a much
  // narrower question: a real retry, Make Live, a usable Run, a reply waiting on a person, a
  // stopped sender, or a blocker only a human can clear.
  //
  // 🛑 THIS CASE IS ABOUT THE ADMISSION, NOT THE RULE. FIX 2 exists because a proof-exhausted
  // prospect is BY DEFINITION never funded, so the worklist parks them on "waiting on their
  // $299" with `actor: 'them'` — filtered out of Needs you, and that client is exactly who the
  // review is about. That hazard is unchanged under the new rule (a client at Proof is never
  // `needs_you` either), so the explicit admission has to survive, and it does.
  it('the Needs-you filter admits a proof_review client', () => {
    const at = clientsCode.indexOf('const visible ')
    expect(at, 'the client-list filter was not found').toBeGreaterThan(-1)
    const filter = clientsCode.slice(at, at + 500)

    expect(filter, 'the primary rule must be the server\'s lifecycle verdict').toContain('needsYou(c.id)')
    expect(filter, 'a proof-review client must survive the filter').toContain('proofReview.has(c.id)')
    expect(filter, 'the selected client must still be kept').toContain('c.id === selected')
  })

  it('the proof-review set is built from UNRESOLVED alerts only', () => {
    // The API never emits a `proof_review` alert for a resolved review, so reading the alert
    // feed IS reading the unresolved set. Bound here so a future change that starts emitting
    // resolved ones has to come back and think about this line.
    const at = clientsCode.indexOf("a.kind === 'proof_review'")
    expect(at).toBeGreaterThan(-1)
    const block = clientsCode.slice(at - 200, at + 260)
    expect(block).toContain("a.kind === 'proof_review'")
    expect(block).toContain('a.client_id')
  })

  it('an ordinary client with nothing to do is NOT admitted — the filter still filters', () => {
    // ⛓️ 9 Sep — the gate was `onlyNeedsYou`; it is now the URL the Clients rail sets, so the
    // filter has ONE control and one place its state lives. The duty is that the admission is
    // an EXCEPTION for proof review and the selected client, never a hole that lets everybody
    // through — a filter that admits every client is a filter nobody reads.
    const at = clientsCode.indexOf('const visible ')
    const filter = clientsCode.slice(at, at + 500)
    expect(filter, 'the filter must still be gated on the URL the rail sets').toContain('needsFilter')
    expect(filter, 'the filter admits everybody').not.toContain('|| true')
    // Only three ways in: the server said so, an unresolved proof review, or you are reading it.
    const admissions = (filter.match(/\|\|/g) ?? []).length
    expect(admissions, 'a fourth admission was added without a reason').toBeLessThanOrEqual(2)
  })
})

describe('FIX 3 — the operator can close it from the alert itself', () => {
  it('a Mark reviewed control exists, and only for a proof_review alert', () => {
    expect(code).toContain('Mark reviewed')
    const at = code.indexOf('Mark reviewed')
    const around = code.slice(Math.max(0, at - 700), at + 200)
    expect(around, 'the control must be gated on the alert kind').toContain("a.kind === 'proof_review'")
  })

  it('it calls the real resolve route, by POST, with the client id', () => {
    const at = code.indexOf('async function resolveProofReview')
    expect(at, 'the resolve handler was not found').toBeGreaterThan(-1)
    const fn = code.slice(at, at + 1200)
    expect(fn).toContain('/api/proxy/operator/proof-review/')
    expect(fn).toContain('/resolve')
    expect(fn).toContain("method: 'POST'")
    expect(fn).toContain('encodeURIComponent(clientId)')
  })

  it('success re-reads the alert feed from the server rather than splicing locally', () => {
    // Dropping the row locally would show "handled" for a write that failed — the same lie
    // the route's own `already_resolved` bug told. The list must come back from the API.
    const at = code.indexOf('async function resolveProofReview')
    const fn = code.slice(at, at + 1200)
    expect(fn).toContain("fetch('/api/proxy/operator/alerts')")
    expect(fn).toContain('setAlerts(')
    expect(fn, 'no local removal of the alert').not.toMatch(/setAlerts\(\s*alerts\.filter/)
  })

  it('an API error is shown and never reported as success', () => {
    const at = code.indexOf('async function resolveProofReview')
    const fn = code.slice(at, at + 1200)
    expect(fn).toContain('j?.success')
    expect(fn).toContain('j?.error')
    // The failure message must say the thing that is still true: it is still open.
    expect(fn.toLowerCase()).toContain('still open')
    // A catch that swallows silently would leave the operator believing it worked.
    expect(fn).toMatch(/catch\s*\{[\s\S]{0,200}setProofMsg/)
  })

  it('the control is disabled while in flight, so a double-click cannot double-post', () => {
    const at = code.indexOf('Mark reviewed')
    const around = code.slice(Math.max(0, at - 700), at + 200)
    expect(around).toContain('disabled={proofBusy')
  })
})

describe('the Vida shell is untouched — this is one filter clause and one button', () => {
  it('the alert row is still the existing pink chip strip under "Needs you:"', () => {
    expect(code).toContain('Needs you:')
    expect(code).toContain('myAlerts.map')
  })

  it('no modal, dashboard or route was added for this', () => {
    const at = code.indexOf('async function resolveProofReview')
    const fn = code.slice(at, at + 1200)
    for (const banned of ['createPortal', 'Dialog', 'router.push', 'useRouter']) {
      expect(fn, `resolve must not introduce ${banned}`).not.toContain(banned)
    }
  })

  it('the existing kind-based tab routing still works for the older alert kinds', () => {
    expect(code).toContain("a.kind === 'replies' ? 'Inbox'")
    expect(code).toContain("a.kind === 'no_campaign' ? 'Campaign'")
  })
})
