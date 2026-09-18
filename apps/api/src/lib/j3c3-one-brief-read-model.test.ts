// ══════════════════════════════════════════════════════════════════════════════════════════
// J3-C3 · THE PUT CARRIES THE SAME TRUTH AS THE GET
//
// ── THE DEFECT ──────────────────────────────────────────────────────────────────────────
//
// `GET /milla/brief-draft` answers with eight things: the draft, the progress, the next fact
// to ask for, the onboarding state, the unresolved labels, two render blocks and the
// conversation. `PUT /milla/brief-draft` answered with `{ progress }`.
//
// 🛑 SO EVERY CALLER HELD A STALE ANSWER THE MOMENT IT SAVED. A PUT that completes the tenth
// fact returns a progress object while `onboarding_state`, `next` and the render cards in the
// browser still describe the state BEFORE the save. That is exactly the shape S1-ONB-001
// already fixed once — *"a client who had already said where they are based and then
// refreshed was shown 'Based in — still needed' about a country THIS VERY ROW was holding"* —
// arriving through the other verb. The caller's only remedies were a second round trip (with a
// window in which the two disagree) or rendering something the server does not believe.
//
// ⚠️ THE FIX IS ONE FUNCTION, NOT "THE SAME FIELDS". Two field lists that happen to match
// today are the drift LR 6 is about; a field added to one builder is added to both by
// construction, and this file asserts the builder is shared rather than the lists equal.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = readFileSync(join(__dirname, '../routes/milla.ts'), 'utf8')
const CODE = SRC.split('\n')
  .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

/** One route handler's body, to the start of the next route registration. */
function routeBody(marker: string): string {
  const at = CODE.indexOf(marker)
  expect(at, `${marker} must exist — this guard must be repointed`).toBeGreaterThan(-1)
  const next = CODE.indexOf('millaRouter.', at + marker.length)
  return CODE.slice(at, next > at ? next : CODE.length)
}

describe('J3-C3 · one builder, both verbs', () => {
  it('🛑 the GET answers from the shared read model', () => {
    expect(routeBody("millaRouter.get('/brief-draft'"), 'the GET builds its own payload again')
      .toMatch(/briefReadModel/)
  })

  it('🛑 the PUT answers from the SAME read model — not a smaller one of its own', () => {
    const put = routeBody("millaRouter.put('/brief-draft'")
    expect(
      put,
      'the PUT still answers with a partial payload, so a caller that just saved holds a stale '
      + 'onboarding state, a stale next fact and stale render cards',
    ).toMatch(/briefReadModelFrom/)
  })

  it('🛑 the PUT no longer answers with progress ALONE', () => {
    const put = routeBody("millaRouter.put('/brief-draft'")
    expect(put, 'the one-field payload came back').not.toMatch(/data:\s*\{\s*progress:\s*draftProgress/)
  })

  it('🛑 every field the GET carries is carried by the builder, not by the route', () => {
    // If a field is assembled inside either handler it is, by definition, not shared — which
    // is the state this item exists to end.
    const get = routeBody("millaRouter.get('/brief-draft'")
    for (const field of [
      'onboarding_state', 'onboarding_unresolved', 'onboarding_profile',
      'onboarding_business', 'conversation', 'next',
    ]) {
      expect(get, `the GET still assembles ${field} itself`).not.toMatch(new RegExp(`${field}:`))
      expect(CODE, `${field} is not in the shared builder at all — it was lost, not moved`)
        .toMatch(new RegExp(`${field}:`))
    }
  })

  it('the PUT builds from the row the WRITE returned, never from a re-read', () => {
    // ⚠️ A SECOND READ IS A SECOND CHANCE TO DISAGREE with the write that produced it, and it
    // is a query for something already in hand. `saveBriefDraft` hands back the merged draft.
    const put = routeBody("millaRouter.put('/brief-draft'")
    expect(put).toMatch(/briefReadModelFrom\(\s*\n?\s*r\.draft/)
    expect(put, 'the PUT re-reads the draft it has just written').not.toMatch(/briefDraftFor\(/)
  })
})

describe('J3-C3 · the builder itself is one function over one draft', () => {
  it('🛑 the read-model builder does not read the draft twice', () => {
    const at = CODE.indexOf('function briefReadModelFrom')
    expect(at, 'the builder moved — this guard must be repointed').toBeGreaterThan(-1)
    const fn = CODE.slice(at, CODE.indexOf('\n}\n', at))
    expect(fn, 'the builder reaches for the database — it is a projection, not a reader')
      .not.toMatch(/db\.from\(|briefDraftFor\(/)
  })

  it('the next fact is named by the server, still — the portal never re-derives the eleven', () => {
    // S1-ONB-001's rule, unchanged: deriving "what is still needed" in the browser would mean
    // a second eleven-fact list in a second app, which is how Vida came to disagree with Milla
    // about the count.
    const at = CODE.indexOf('function briefReadModelFrom')
    const fn = CODE.slice(at, CODE.indexOf('\n}\n', at))
    expect(fn).toMatch(/progress\.missing\[0\]/)
    expect(fn).toMatch(/labels\[nextId\]/)
  })
})
