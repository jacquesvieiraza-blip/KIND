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
const code = VIDA.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n')

describe('FIX 2 — an unresolved proof review keeps its client on the list', () => {
  it('the Only-needs-you filter admits a proof_review client', () => {
    const at = code.indexOf('const visibleClients')
    expect(at, 'the client-list filter was not found').toBeGreaterThan(-1)
    const filter = code.slice(at, at + 500)

    expect(filter, 'the worklist rule must still be the primary one').toContain("next.actor === 'you'")
    expect(filter, 'a proof-review client must survive the filter').toContain('proofReviewClients.has(c.id)')
    expect(filter, 'the selected client must still be kept').toContain('c.id === selected')
  })

  it('the proof-review set is built from UNRESOLVED alerts only', () => {
    // The API never emits a `proof_review` alert for a resolved review, so reading the alert
    // feed IS reading the unresolved set. Bound here so a future change that starts emitting
    // resolved ones has to come back and think about this line.
    const at = code.indexOf('const proofReviewClients')
    expect(at).toBeGreaterThan(-1)
    const block = code.slice(at, at + 260)
    expect(block).toContain("a.kind === 'proof_review'")
    expect(block).toContain('a.client_id')
  })

  it('an ordinary actor=them client is NOT admitted — the filter still filters', () => {
    // The failure this pairs against: "make everything visible" would satisfy the test above
    // and destroy the filter. The only added disjunct is the proof-review one, and there is
    // no unconditional escape hatch beside it.
    const at = code.indexOf('const visibleClients')
    const filter = code.slice(at, at + 500)
    expect(filter).not.toContain("next.actor === 'them'")
    expect(filter).not.toMatch(/\|\|\s*true/)
    expect(filter, 'the filter must still be gated on onlyNeedsYou').toContain('onlyNeedsYou')
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
