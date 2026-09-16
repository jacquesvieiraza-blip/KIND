import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  decideProgrammeResponse, programmeActionable,
  PROGRAMME_READ_FAILED_COPY, PROGRAMME_MISMATCH_COPY,
  type ProgrammeOwner,
} from './vida-programme-isolation'

// ═══════════════════════════════════════════════════════════════════════════════════════
// BL-1 — A PROGRAMME BELONGS TO ONE CLIENT, AND VIDA MAY ONLY ACT ON THE SELECTED ONE.
//
// ── WHAT IS BEHAVIOURAL HERE AND WHAT IS NOT — STATED, NOT BLURRED ────────────────────
//
// There is no React component-test runtime in this repo (`@testing-library/react` and `jsdom`
// are not installed) and this build does NOT add one. So:
//
//   · §A–§D are BEHAVIOURAL. They drive the real exported decisions — `decideProgrammeResponse`
//     and `programmeActionable` — through a workspace that mirrors the page's loader and press
//     exactly: generation bumped on switch, the same three questions in the same order, and a
//     press that counts the network requests it would make. Every P-case is a real run.
//
//   · §E is SOURCE-PINNED WIRING. It proves only that `app/vida/page.tsx` actually APPLIES
//     those decisions — at the loader, at the switch, and at all six programme-id actions. A
//     source scan cannot fail for a behavioural reason and is never described as one here.
//
// ⚠️ AND EVERY `not.toContain` STRIPS COMMENTS FIRST. This repo's convention is to QUOTE the
// struck code in the comment that explains why it was struck, so a naive scan matches the
// explanation and passes for the wrong reason. `codeOnly()` is not a nicety.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = join(__dirname, '../../../..')
const PAGE = 'apps/admin/src/app/vida/page.tsx'

/** Source with comments removed — see the note above. */
function codeOnly(relPath: string): string {
  return readFileSync(join(REPO, relPath), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => {
      const i = l.search(/(?<!:)\/\//)
      return i === -1 ? l : l.slice(0, i)
    })
    .join('\n')
}

/** One callback's body, from its declaration to its dependency array. */
function fnBody(src: string, declaration: string): string {
  const a = src.indexOf(declaration)
  expect(a, `not found in the page: ${declaration}`).toBeGreaterThan(-1)
  const b = src.indexOf('\n  }, [', a)
  expect(b, `no dependency array after: ${declaration}`).toBeGreaterThan(a)
  return src.slice(a, b)
}

const A = 'client-aaaa'
const B = 'client-bbbb'

const programmeOf = (clientId: string | null | undefined, id = 'prog-1'): ProgrammeOwner =>
  ({ id, ...(clientId === undefined ? {} : { client_id: clientId }) })

type Api = { success: boolean; error?: string | null; programme?: ProgrammeOwner | null }

/**
 * The page's programme surface, mirrored.
 *
 * ⚠️ IT MIRRORS THE LOADER RATHER THAN RE-STATING THE RULES. `select` bumps the generation
 * BEFORE it clears, `issue` captures the generation the way the real request does, and `land`
 * runs the SAME exported decision the page runs, then does the same three things with it. If
 * the page and this driver ever disagree, §E is what catches it.
 */
class Workspace {
  selected: string | null = null
  gen = 0
  programme: ProgrammeOwner | null = null
  /** True once a payload has been accepted — including a legitimate no-programme payload. */
  loaded = false
  err: string | null = null
  /** Every programme id a press actually sent a request for. Must never hold a foreign one. */
  sent: string[] = []
  /** Busy surfaces the client switch clears, exactly as the switch effect clears them. */
  readonly surfaces: { clear(): void }[] = []

  select(clientId: string | null): void {
    // PROTECTION 1 — invalidation happens first, exactly as the switch effect does it.
    this.gen += 1
    this.programme = null
    this.loaded = false
    this.err = null
    for (const s of this.surfaces) s.clear()
    this.selected = clientId
  }

  /** Start a read for `clientId`; returns the lander for when that response arrives. */
  issue(clientId: string): (api: Api) => string {
    const generation = this.gen
    // The loader clears the error only for the client currently on screen.
    if (this.selected === clientId) this.err = null
    return (api: Api) => {
      const outcome = decideProgrammeResponse({
        requestedClientId: clientId,
        selectedClientId:  this.selected,
        requestGeneration: generation,
        currentGeneration: this.gen,
        apiSuccess:        api.success,
        apiError:          api.error ?? null,
        programme:         api.programme ?? null,
      })
      if (outcome.action === 'discard') return outcome.reason
      if (outcome.action === 'fail') {
        this.programme = null
        this.loaded = false
        this.err = outcome.message ?? PROGRAMME_READ_FAILED_COPY
        return outcome.reason
      }
      this.programme = api.programme ?? null
      this.loaded = true
      return outcome.reason
    }
  }

  /** One press of a programme-id action. Returns how many network requests it made. */
  press(): number {
    if (!programmeActionable(this.programme, this.selected)) return 0
    this.sent.push(this.programme!.id as string)
    return 1
  }
}

/**
 * A busy flag, settled the way the page settles it. (BL-1 residual.)
 *
 * `begin` is the press: it captures the generation — `forThisProgramme(setQualBusy)` /
 * `forThisProgramme(setLcBusy)` — goes busy, and hands back the finalizer that runs in
 * `finally`. The finalizer settles ONLY while that generation is still current, which is the
 * whole correction: a stale completion may not settle a flag that now belongs to somebody else.
 */
class BusySurface<T> {
  value: T
  constructor(private readonly w: Workspace, private readonly idle: T) {
    this.value = idle
    w.surfaces.push(this)
  }
  begin(busy: T): () => void {
    const gen = this.w.gen
    this.value = busy
    return () => { if (this.w.gen === gen) this.value = this.idle }
  }
  /** What the client-switch effect does to it. */
  clear(): void { this.value = this.idle }
}

let w: Workspace
beforeEach(() => { w = new Workspace() })

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('§A · BEHAVIOURAL — the programme response-isolation matrix (P-1 … P-8)', () => {
  it('P-1 · A is issued, B is selected and issued, and A lands FIRST → A is discarded', () => {
    w.select(A)
    const landA = w.issue(A)
    w.select(B)
    const landB = w.issue(B)

    expect(landA({ success: true, programme: programmeOf(A) })).toBe('stale_generation')
    expect(w.programme, 'client A’s programme was written under B').toBeNull()
    expect(w.press(), 'a press acted on a discarded programme').toBe(0)

    // …and B's own response still lands normally afterwards.
    expect(landB({ success: true, programme: programmeOf(B) })).toBe('accept')
    expect(w.programme?.client_id).toBe(B)
  })

  it('P-2 · B lands first and A lands LATE → B remains, A cannot overwrite it', () => {
    w.select(A)
    const landA = w.issue(A)
    w.select(B)
    const landB = w.issue(B)

    expect(landB({ success: true, programme: programmeOf(B, 'prog-B') })).toBe('accept')
    expect(landA({ success: true, programme: programmeOf(A, 'prog-A') })).toBe('stale_generation')

    expect(w.programme?.id, 'the late A response overwrote B').toBe('prog-B')
    expect(w.press()).toBe(1)
    expect(w.sent, 'a press sent A’s programme id').toEqual(['prog-B'])
  })

  it('P-3 · A → B → A: the FIRST A response is discarded, only the current A is accepted', () => {
    w.select(A)
    const landFirstA = w.issue(A)
    w.select(B)
    w.issue(B)
    w.select(A)
    const landSecondA = w.issue(A)

    // ⚠️ IDENTITY ALONE WOULD ACCEPT THIS ONE — it really is client A's programme, and client A
    // really is selected. Only the generation can tell the two A requests apart.
    expect(landFirstA({ success: true, programme: programmeOf(A, 'stale-A') })).toBe('stale_generation')
    expect(w.programme).toBeNull()

    expect(landSecondA({ success: true, programme: programmeOf(A, 'current-A') })).toBe('accept')
    expect(w.programme?.id).toBe('current-A')
    w.press()
    expect(w.sent).toEqual(['current-A'])
  })

  it('P-4 · the CURRENT request for B succeeds carrying client A’s programme → fail closed', () => {
    w.select(B)
    const land = w.issue(B)
    expect(land({ success: true, programme: programmeOf(A) })).toBe('identity_mismatch')
    expect(w.programme, 'a foreign programme was kept').toBeNull()
    expect(w.err).toBe(PROGRAMME_MISMATCH_COPY)
    expect(w.press(), 'a foreign programme was actionable').toBe(0)
  })

  it('P-4b · …and a successful programme with NO client_id is refused the same way', () => {
    w.select(B)
    const land = w.issue(B)
    // ⚠️ AN ABSENT OWNER IS NOT "IT MUST BE OURS". Inferring that is the defect.
    expect(land({ success: true, programme: programmeOf(undefined) })).toBe('unowned')
    expect(w.programme).toBeNull()
    expect(w.err).toBe(PROGRAMME_MISMATCH_COPY)
    expect(w.press()).toBe(0)
  })

  it('P-5 · the current request for B succeeds carrying B’s programme → accepted, actionable', () => {
    w.select(B)
    const land = w.issue(B)
    expect(land({ success: true, programme: programmeOf(B, 'prog-B') })).toBe('accept')
    expect(w.programme?.client_id).toBe(B)
    expect(w.err).toBeNull()
    expect(w.press()).toBe(1)
    expect(w.sent).toEqual(['prog-B'])
  })

  it('🛑 P-6 · a successful NO-PROGRAMME response is a legitimate state, not an ownership error', () => {
    w.select(B)
    const land = w.issue(B)
    // A client who has finished Proof and not yet chosen a size genuinely has none.
    expect(land({ success: true, programme: null })).toBe('accept_no_programme')
    expect(w.loaded, 'a healthy no-programme client was treated as a failed read').toBe(true)
    expect(w.err, 'a false identity error was shown to a healthy client').toBeNull()
    expect(w.programme).toBeNull()
    // …and there is still nothing to act on, so no control may fire.
    expect(w.press()).toBe(0)
  })

  it('P-7 · the CURRENT request for B fails → B’s own error is visible and nothing is actionable', () => {
    w.select(B)
    const land = w.issue(B)
    expect(land({ success: false, error: 'the programme row could not be read' })).toBe('api_error')
    expect(w.err, 'the server’s own sentence was replaced').toBe('the programme row could not be read')
    expect(w.programme).toBeNull()
    expect(w.press()).toBe(0)
  })

  it('P-7b · a failure with no sentence still says something truthful', () => {
    w.select(B)
    expect(w.issue(B)({ success: false })).toBe('api_error')
    expect(w.err).toBe(PROGRAMME_READ_FAILED_COPY)
  })

  it('🛑 P-8 · a STALE A failure after B is selected is discarded SILENTLY', () => {
    w.select(A)
    const landA = w.issue(A)
    w.select(B)
    w.issue(B)({ success: true, programme: programmeOf(B, 'prog-B') })

    expect(landA({ success: false, error: 'A’s database read failed' })).toBe('stale_generation')
    expect(w.err, 'client A’s error was printed under client B').toBeNull()
    expect(w.programme?.id, 'a stale failure blanked B’s programme').toBe('prog-B')
  })

  it('P-8b · a stale failure is silent under the OTHER ordering too (not_selected)', () => {
    // Same request, no intervening generation bump — only the selection moved. Both orderings
    // must stay silent, because only one of them is reachable in any given race.
    w.select(A)
    const landA = w.issue(A)
    w.selected = B                          // selection moved without a fresh load
    expect(landA({ success: false, error: 'A’s read failed' })).toBe('not_selected')
    expect(w.err).toBeNull()
  })

  it('P-8c · with NOTHING selected, no response may be written', () => {
    w.select(A)
    const landA = w.issue(A)
    w.selected = null
    expect(landA({ success: true, programme: programmeOf(A) })).toBe('no_selection')
    expect(w.programme).toBeNull()
    expect(w.press()).toBe(0)
  })

  it('🛑 the ORDER of the three questions is the contract', () => {
    // ① currency is decided WITHOUT a successful payload — a stale failure is silent…
    expect(decideProgrammeResponse({
      requestedClientId: A, selectedClientId: B, requestGeneration: 1, currentGeneration: 2,
      apiSuccess: false, apiError: 'boom', programme: null,
    })).toEqual({ action: 'discard', reason: 'stale_generation' })

    // …② and success is decided BEFORE ownership, so a current failure is never read as
    // "unowned" and returned silently. (That exact inversion is the R1 defect.)
    expect(decideProgrammeResponse({
      requestedClientId: B, selectedClientId: B, requestGeneration: 1, currentGeneration: 1,
      apiSuccess: false, apiError: 'boom', programme: null,
    })).toEqual({ action: 'fail', reason: 'api_error', message: 'boom' })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('§B · BEHAVIOURAL — the press (P-9, P-10)', () => {
  it('🛑 P-9 · a stale A programme on screen while B is selected → EVERY action refuses, ZERO requests', () => {
    // The state the defect produced: A's programme is what the view holds, B is who is selected.
    w.selected = B
    w.programme = programmeOf(A, 'prog-A')

    // One press per guarded action — six of them, all through the one canonical gate.
    const presses = ['qualify-batch', 'pause', 'refreeze', 'lifecycle', 'attach-icp', 'open-confirm']
      .map(() => w.press())

    expect(presses, 'a programme-id action fired against the wrong client').toEqual([0, 0, 0, 0, 0, 0])
    expect(w.sent, 'a request was sent for another client’s programme').toEqual([])
  })

  it('P-9b · …and the same is true with no owner at all, and with nothing selected', () => {
    w.selected = B
    w.programme = programmeOf(undefined, 'prog-x')
    expect(w.press()).toBe(0)

    w.selected = null
    w.programme = programmeOf(B, 'prog-B')
    expect(w.press()).toBe(0)

    w.selected = B
    w.programme = null
    expect(w.press()).toBe(0)
  })

  it('P-9c · a programme with an owner but NO id cannot be acted on either', () => {
    expect(programmeActionable({ client_id: B }, B)).toBe(false)
  })

  it('P-10 · the correct programme with its own client selected → the action proceeds normally', () => {
    w.selected = B
    w.programme = programmeOf(B, 'prog-B')
    expect(w.press()).toBe(1)
    expect(w.sent).toEqual(['prog-B'])
    expect(programmeActionable(w.programme, w.selected)).toBe(true)
  })

  it('🛑 the press is re-asked at the CLICK, not trusted from the render', () => {
    // Rendered while B was selected and B's programme was loaded…
    w.selected = B
    w.programme = programmeOf(B, 'prog-B')
    expect(programmeActionable(w.programme, w.selected)).toBe(true)

    // …the operator moves to A between the render and the click, and the view has not caught
    // up yet. The press must read the CURRENT selection, not the one the control was drawn on.
    w.selected = A
    expect(w.press(), 'the press trusted the render’s selection').toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('§C · BEHAVIOURAL — async action completion (P-11)', () => {
  it('🛑 P-11 · an action valid for A finishes after a switch to B: nothing of A becomes B’s', () => {
    // ① The operator selects A, A's programme loads, and they press. The press is legitimate.
    w.select(A)
    w.issue(A)({ success: true, programme: programmeOf(A, 'prog-A') })
    expect(w.press()).toBe(1)
    expect(w.sent).toEqual(['prog-A'])

    // ② The action's own follow-up refresh is issued for A — with A still selected.
    const refreshA = w.issue(A)
    // ③ …and the operator moves to B before it returns. B loads.
    w.select(B)
    w.issue(B)({ success: true, programme: programmeOf(B, 'prog-B') })

    // ④ A's follow-up lands. It may not become B's programme truth.
    expect(refreshA({ success: true, programme: programmeOf(A, 'prog-A') })).toBe('stale_generation')
    expect(w.programme?.id, 'A’s follow-up overwrote B’s programme').toBe('prog-B')

    // ⑤ And if A's follow-up had FAILED instead, B must not wear A's error.
    const refreshA2 = w.issue(A)
    w.select(B)
    w.issue(B)({ success: true, programme: programmeOf(B, 'prog-B') })
    expect(refreshA2({ success: false, error: 'A’s refresh failed' })).toBe('stale_generation')
    expect(w.err, 'A’s error appeared as B’s').toBeNull()

    // ⑥ B remains fully actionable throughout — the guard protects, it does not freeze.
    expect(w.press()).toBe(1)
    expect(w.sent).toEqual(['prog-A', 'prog-B'])
  })

  it('P-11b · the outcome MESSAGE of A’s action is likewise not written under B', () => {
    // The page captures the generation at the press and writes its message only while it is
    // still current (`forThisProgramme`). This is that rule, run.
    w.select(A)
    const genAtPress = w.gen
    let shown: string | null = null
    const say = (m: string) => { if (w.gen === genAtPress) shown = m }

    say('12 qualified · prepared and now with the client to approve')
    expect(shown).not.toBeNull()

    shown = null
    w.select(B)
    say('12 qualified · prepared and now with the client to approve')
    expect(shown, 'client A’s outcome was reported on client B’s screen').toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('§C2 · BEHAVIOURAL — a stale finalizer cannot settle another client’s busy state', () => {
  // ── THE RESIDUAL THE GENERATION READ-GUARD DOES NOT COVER ────────────────────────────
  //
  // The guards in §A stop a stale response being READ. They say nothing about a stale
  // finalizer WRITING, and `finally` runs whatever happened in between:
  //
  //   A's action starts and goes busy → the operator switches to B (the switch clears busy)
  //   → B starts its own action and IS busy → A's old `finally` runs → B's busy is cleared.

  it('🛑 A · QUALIFY BUSY — stale A cannot clear B’s busy, and cannot re-open the single-flight guard', () => {
    const qual = new BusySurface<boolean>(w, false)
    const requests: string[] = []
    /** `qualifySourcedLeads` exactly: `if (qualBusy) return`, then go busy, then the finalizer. */
    const attempt = (label: string): (() => void) | null => {
      if (qual.value) return null                       // ← the real single-flight guard
      requests.push(label)
      return qual.begin(true)
    }

    // ① A's qualification starts.
    w.select(A)
    const finishA = attempt('A#1')
    expect(finishA, 'A’s own qualification was refused').not.toBeNull()
    expect(qual.value).toBe(true)

    // ② The operator switches to B. The switch clears the busy state (protection 1).
    w.select(B)
    expect(qual.value, 'the client switch left the previous client’s busy flag set').toBe(false)

    // ③ B starts its own qualification and becomes busy.
    const finishB = attempt('B#1')
    expect(finishB).not.toBeNull()
    expect(qual.value).toBe(true)

    // ④ A's old action finishes. Its finalizer must settle NOTHING.
    finishA!()
    expect(qual.value, 'a stale A completion cleared client B’s qualBusy').toBe(true)

    // 🛑 ⑤ AND THE CONSEQUENCE THAT MAKES THIS AN AUTHORITY ISSUE: B must not be able to
    // issue a SECOND qualification merely because a stale A finished. B's first request is
    // still in flight.
    expect(attempt('B#2'), 'a second B qualification was admitted because stale A finished').toBeNull()
    expect(requests, 'more requests were issued than presses that were allowed').toEqual(['A#1', 'B#1'])

    // ⑥ B's own finalizer still settles normally — the guard protects, it does not freeze.
    finishB!()
    expect(qual.value, 'the owning action could not clear its own busy state').toBe(false)
    expect(attempt('B#3'), 'normal service did not resume').not.toBeNull()
    expect(requests).toEqual(['A#1', 'B#1', 'B#3'])
  })

  it('🛑 B · LIFECYCLE BUSY — stale A cannot clear B’s lcBusy', () => {
    const lc = new BusySurface<string | null>(w, null)

    w.select(A)
    const finishA = lc.begin('pause')
    expect(lc.value).toBe('pause')

    w.select(B)
    expect(lc.value, 'the switch left the previous client’s lcBusy set').toBeNull()

    const finishB = lc.begin('refreeze')
    expect(lc.value).toBe('refreeze')

    finishA()
    expect(lc.value, 'a stale A completion cleared client B’s lcBusy').toBe('refreeze')

    finishB()
    expect(lc.value, 'the owning action could not clear its own lcBusy').toBeNull()
  })

  it('🛑 the SHARED lcBusy surface holds for every pairing of the four programme-id actions', () => {
    // `lcBusy` is one flag for pause · refreeze · the whole ladder · attach-ICP, so the race is
    // cross-action as well as cross-client: A's pause finishing must not clear B's re-freeze.
    const ACTIONS = ['pause', 'refreeze', 'ready-for-approval', 'icp:icp-1']
    for (const aAction of ACTIONS) {
      for (const bAction of ACTIONS) {
        const ws = new Workspace()
        const lc = new BusySurface<string | null>(ws, null)
        ws.select(A)
        const finishA = lc.begin(aAction)
        ws.select(B)
        const finishB = lc.begin(bAction)
        finishA()
        expect(lc.value, `stale A "${aAction}" cleared B’s "${bAction}"`).toBe(bAction)
        finishB()
        expect(lc.value).toBeNull()
      }
    }
  })

  it('an action that completes with NO switch in between settles its own busy normally', () => {
    // ⚠️ THE OTHER DIRECTION, AND IT MATTERS AS MUCH. A guard that also blocked the owning
    // action would leave every control stuck busy for ever after one press.
    const qual = new BusySurface<boolean>(w, false)
    const lc = new BusySurface<string | null>(w, null)
    w.select(B)
    const q = qual.begin(true)
    const l = lc.begin('pause')
    q(); l()
    expect(qual.value).toBe(false)
    expect(lc.value).toBeNull()
  })

  it('A → B → A: a finalizer from the FIRST A visit cannot settle the SECOND A visit’s busy', () => {
    // Identity alone would accept this: it really is client A both times. Only the generation
    // tells the two visits apart — the same argument as P-3, on the busy surface.
    const qual = new BusySurface<boolean>(w, false)
    w.select(A)
    const finishFirstA = qual.begin(true)
    w.select(B)
    w.select(A)
    const finishSecondA = qual.begin(true)
    finishFirstA()
    expect(qual.value, 'a finalizer from the earlier A visit cleared the current one').toBe(true)
    finishSecondA()
    expect(qual.value).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('§D · BEHAVIOURAL — the programme ACTION matrix', () => {
  /**
   * Every Vida action whose target derives from `prog.programme.id`. All six reach the network
   * through the SAME gate, so the matrix is driven once per row rather than six near-copies.
   */
  const ACTIONS = [
    { action: 'Qualify sourced leads', state: 'SOURCING',            endpoint: 'POST /operator/programme/:id/qualify-batch' },
    { action: 'Pause programme',       state: 'any live state',      endpoint: 'POST /programmes/:id/pause' },
    { action: 'Re-freeze package',     state: 'READY_FOR_APPROVAL',  endpoint: 'POST /programmes/:id/refreeze' },
    { action: 'Lifecycle ladder',      state: 'DRAFT → LIVE',        endpoint: 'POST /programmes/:id/:action' },
    { action: 'Attach ICP',            state: 'pre-review',          endpoint: 'POST /programmes/:id/attach-icp' },
    { action: 'Open qualify confirm',  state: 'SOURCING',            endpoint: '(no request — opens the dialog)' },
  ]

  for (const row of ACTIONS) {
    it(`${row.action} — wrong owner ⇒ 0 requests · correct owner ⇒ allowed`, () => {
      const mismatched = new Workspace()
      mismatched.selected = B
      mismatched.programme = programmeOf(A, 'prog-A')
      expect(mismatched.press(), `${row.action} fired on the wrong client`).toBe(0)
      expect(mismatched.sent).toEqual([])

      const correct = new Workspace()
      correct.selected = B
      correct.programme = programmeOf(B, 'prog-B')
      expect(correct.press(), `${row.action} was blocked for its own client`).toBe(1)
      expect(correct.sent).toEqual(['prog-B'])
    })
  }

  it('🛑 the ladder’s own moves — including go-live — all travel through the one gate', () => {
    // `lifecycle(action)` carries every one of these, so one gate covers them all. Sprint 4's
    // `go-live` is listed deliberately: an unguarded programme-id mutation beside the guarded
    // ones would mean the defect class is not closed.
    const LADDER = ['recommend', 'await-first-payment', 'authorise/first',
                    'ready-for-approval', 'authorise/second', 'go-live']
    const stale = new Workspace()
    stale.selected = B
    stale.programme = programmeOf(A, 'prog-A')
    for (const move of LADDER) {
      expect(stale.press(), `${move} reached the network on the wrong client`).toBe(0)
    }
    expect(stale.sent).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('§E · SOURCE-PINNED WIRING — the page actually applies those decisions', () => {
  // ⚠️ THESE ARE NOT BEHAVIOURAL TESTS. They prove wiring only: that `page.tsx` calls the
  // decisions above at the loader, at the switch, and at every programme-id action. The
  // decisions themselves are driven for real in §A–§D.

  it('the page imports the canonical decisions rather than re-implementing them', () => {
    const code = codeOnly(PAGE)
    expect(code).toContain("from '@/lib/vida-programme-isolation'")
    expect(code).toContain('decideProgrammeResponse')
    expect(code).toContain('programmeActionable')
  })

  it('🛑 the loader runs the decision, and DISCARD / FAIL are handled before anything is shown', () => {
    const body = fnBody(codeOnly(PAGE), 'const loadProgramme = useCallback(async (clientId: string) => {')
    expect(body).toContain('decideProgrammeResponse')
    expect(body).toContain('currentGeneration: progGen.current')
    expect(body).toContain('selectedClientId:  selectedRef.current')
    expect(body).toContain("outcome.action === 'discard'")
    expect(body).toContain("outcome.action === 'fail'")
    // The accept-write must come AFTER both guards, never before them.
    expect(body.indexOf("outcome.action === 'discard'")).toBeLessThan(body.indexOf('setProg(payload)'))
    expect(body.indexOf("outcome.action === 'fail'")).toBeLessThan(body.indexOf('setProg(payload)'))
    // The thrown path runs the SAME decision — not a second copy of the rule.
    expect(body).toContain('decide(false,')
  })

  it('🛑 the struck unguarded write is GONE from the code (comments may still quote it)', () => {
    const code = codeOnly(PAGE)
    expect(code).not.toContain('setProg(j.data as ProgrammeTruth)')
    // ⚠️ and the comment that explains it IS still there, which is why the strip matters.
    expect(readFileSync(join(REPO, PAGE), 'utf8')).toContain('setProg(j.data as ProgrammeTruth)')
  })

  it('🛑 the client switch invalidates the generation BEFORE it loads the new client', () => {
    const code = codeOnly(PAGE)
    const effect = code.slice(code.indexOf("if (!selected) { setCockpit(null); return }"))
    const bump = effect.indexOf('progGen.current += 1')
    const load = effect.indexOf('loadProgramme(selected)')
    expect(bump, 'the switch effect does not bump the programme generation').toBeGreaterThan(-1)
    expect(bump, 'the generation is bumped after the load is started').toBeLessThan(load)
  })

  it('the switch also clears the programme/lifecycle ACTION state', () => {
    const code = codeOnly(PAGE)
    const effect = code.slice(code.indexOf("if (!selected) { setCockpit(null); return }"),
                              code.indexOf('loadCockpit(selected)'))
    for (const cleared of ['setProg(null)', 'setProgErr(null)', 'setQualBusy(false)',
                           'setQualMsg(null)', 'setQualConfirm(false)', 'setLcBusy(null)',
                           'setLcMsg(null)', 'setRunMsg(null)']) {
      expect(effect, `the client switch does not clear ${cleared}`).toContain(cleared)
    }
  })

  it('🛑 NO programme-id action resolves its target from `prog` any more', () => {
    const code = codeOnly(PAGE)
    // The one canonical resolver is the gate; every other read of the id is gone from the code.
    expect(code).not.toContain('prog?.programme?.id')
    expect(code).not.toContain('prog.programme.id')
    expect(code).toContain('const programmeActionId = useCallback')
    expect(code).toContain('programmeActionable(p, selected ?? null)')
  })

  it('🛑 every one of the eight programme-id actions calls the gate', () => {
    const code = codeOnly(PAGE)
    for (const fn of [
      'const openQualifyConfirm = useCallback(() => {',
      'const qualifySourcedLeads = useCallback(async () => {',
      'const pauseProgramme = useCallback(async () => {',
      'const refreezePackage = useCallback(async () => {',
      'const lifecycle = useCallback(async (action: string, label: string) => {',
      'const attachIcp = useCallback(async (icpId: string, icpName: string | null) => {',
      // ⛓️ 16 Sep (MVP1 · D1 + E1) — TWO NEW PROGRAMME-ID ACTIONS, REGISTERED RATHER THAN
      // ARRIVING QUIETLY, which is precisely what this inventory exists for.
      //
      // `runProgramme` grants external-delivery authority (`POST /programmes/:id/run`). The
      // lifecycle Run action used to call the SEND-ONCE tool instead, so `run_at` was never
      // written by the button named after it.
      //
      // `completeProgramme` closes the programme (`POST /programmes/:id/complete`). The route,
      // the writer and the `mayComplete` gate all existed and nothing in the product could
      // reach them — the sixth stage of a six-stage product had no button.
      //
      // Both are programme-id actions and both therefore pass the ownership gate: each targets
      // `prog.programme.id` while its confirmation names the SELECTED client, which is the
      // exact mismatch this gate exists to refuse.
      'const runProgramme = useCallback(async () => {',
      'const completeProgramme = useCallback(async () => {',
    ]) {
      expect(fnBody(code, fn), `no ownership gate in: ${fn}`).toContain('programmeActionId()')
    }
    // Eight call sites, and no ninth action left outside them.
    expect(code.split('programmeActionId()').length - 1).toBe(8)
  })

  it('🛑 the gate runs BEFORE the confirmation dialog, so no dialog can name the wrong client', () => {
    const code = codeOnly(PAGE)
    for (const fn of [
      'const pauseProgramme = useCallback(async () => {',
      'const refreezePackage = useCallback(async () => {',
      'const lifecycle = useCallback(async (action: string, label: string) => {',
      'const attachIcp = useCallback(async (icpId: string, icpName: string | null) => {',
    ]) {
      const body = fnBody(code, fn)
      const gate = body.indexOf('programmeActionId()')
      const ask = body.indexOf('confirm(')
      expect(ask, `no confirmation found in: ${fn}`).toBeGreaterThan(-1)
      expect(gate, `the confirmation is asked before the ownership gate in: ${fn}`).toBeLessThan(ask)
    }
  })

  it('🛑 every programme-id async finalizer settles through the generation-scoped writer', () => {
    const code = codeOnly(PAGE)
    const FINALIZERS: [string, string][] = [
      ['const qualifySourcedLeads = useCallback(async () => {',                        'settleBusy(false)'],
      ['const pauseProgramme = useCallback(async () => {',                             'settleBusy(null)'],
      ['const refreezePackage = useCallback(async () => {',                            'settleBusy(null)'],
      ['const lifecycle = useCallback(async (action: string, label: string) => {',     'settleBusy(null)'],
      ['const attachIcp = useCallback(async (icpId: string, icpName: string | null) => {', 'settleBusy(null)'],
    ]
    for (const [fn, settle] of FINALIZERS) {
      const body = fnBody(code, fn)
      expect(body, `no generation-scoped busy writer in: ${fn}`).toContain('const settleBusy = forThisProgramme(')
      expect(body, `the finalizer is not generation-scoped in: ${fn}`).toContain(`finally { ${settle} }`)
      // 🛑 AND THE UNCONDITIONAL SHAPES ARE FORBIDDEN OUTRIGHT, in either surface.
      expect(body, `an unconditional busy settlement survives in: ${fn}`).not.toContain('finally { setQualBusy(false) }')
      expect(body, `an unconditional busy settlement survives in: ${fn}`).not.toContain('finally { setLcBusy(null) }')
    }
    // The busy flag is still SET before the request, not after it.
    const qual = fnBody(code, 'const qualifySourcedLeads = useCallback(async () => {')
    expect(qual.indexOf('setQualBusy(true)')).toBeLessThan(qual.indexOf('await fetch('))
    // …and the generation is captured BEFORE the flag is raised, never after.
    expect(qual.indexOf('const settleBusy = forThisProgramme(')).toBeLessThan(qual.indexOf('setQualBusy(true)'))
  })

  it('🛑 the writer ITSELF compares the generation — the one line every scoped write depends on', () => {
    // ⚠️ WRITTEN BECAUSE A TOOTH FOUND THIS UNPROVEN. Gutting `forThisProgramme` so it writes
    // unconditionally left every behavioural case in §C2 GREEN — they model the writer (it is
    // component-local and cannot be imported without a component runtime this repo does not
    // have), so they prove the RULE and not this implementation of it. This pin is the only
    // thing standing between the two, and it is source-pinned wiring, not behaviour.
    const body = fnBody(codeOnly(PAGE), 'const forThisProgramme = useCallback(<T,>(write: (v: T) => void): ((v: T) => void) => {')
    expect(body, 'the writer no longer captures the generation').toContain('const gen = progGen.current')
    expect(body, 'the writer no longer COMPARES the captured generation before writing')
      .toContain('if (progGen.current === gen) write(v)')
  })

  it('🛑 the COMPLETE busy-finalizer inventory — nothing unguarded can be added silently', () => {
    const code = codeOnly(PAGE)
    const settlers = [...code.matchAll(/finally \{ (set(?:Qual|Lc|Run|Cm)Busy|settleBusy)\(/g)].map(m => m[1])
    // ⛓️ 16 Sep (MVP1 · D1 + E1) — SEVEN, not five: `runProgramme` and `completeProgramme` are
    // new programme-id actions and each carries the generation-scoped finalizer for the same
    // reason the other five do — an unconditional `finally` lets a stale response for client A
    // clear client B's busy flag mid-flight.
    expect(settlers.filter(x => x === 'settleBusy'),
      'a programme-id action lost its generation-scoped finalizer').toHaveLength(7)
    // ⚠️ AND EXACTLY THREE THAT ARE NOT, EACH NAMED. `run` and the commercial model own their
    // own busy surfaces and are not programme-id actions. `createProgrammeNow` SHARES `lcBusy`
    // with the guarded four but is likewise not a programme-id action — it posts
    // `{ clientId: selected }` — so it sits outside this correction's frozen scope and is
    // REPORTED rather than changed. Pinned here so the set cannot grow unnoticed.
    // ⛓️ 16 Sep (MVP1 · A1b) — a FOURTH unguarded finalizer, named: `retryProof`. It is a
    // CLIENT-id action (it posts to `/operator/proof-retry/:clientId`), not a programme-id one
    // — a zero-eligible Proof exception exists precisely because there is no programme yet — so
    // it is outside this correction's frozen scope and is REPORTED here rather than changed.
    expect(settlers.filter(x => x !== 'settleBusy').sort())
      .toEqual(['setCmBusy', 'setLcBusy', 'setLcBusy', 'setRunBusy'])
    expect(fnBody(code, 'const createProgrammeNow = useCallback(async () => {'),
      'the reported create finalizer moved — re-classify it before changing this pin')
      .toContain('finally { setLcBusy(null) }')
  })

  it('the background preparation poll stops when the operator leaves that client', () => {
    const body = fnBody(codeOnly(PAGE), 'const lifecycle = useCallback(async (action: string, label: string) => {')
    expect(body).toContain('if (progGen.current !== gen) break')
  })

  it('the two client-scoped actions that do NOT use a programme id are unchanged', () => {
    const code = codeOnly(PAGE)
    // `run` and `create` carry `client_id`/`clientId` themselves and the server scopes by it,
    // so they were already safe and are deliberately untouched (reported in the matrix).
    expect(code).toContain('body: JSON.stringify({ client_id: selected, max_sends: n })')
    expect(code).toContain('body: JSON.stringify({ clientId: selected, meetings })')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('§F · the server’s own field is what is compared', () => {
  it('`client_id` is in the operator programme read’s column list', () => {
    const cols = readFileSync(join(REPO, 'apps/api/src/lib/operator-programme.ts'), 'utf8')
    expect(cols).toContain("'id, client_id, status,")
  })

  it('and Vida’s programme type now declares it', () => {
    expect(codeOnly(PAGE)).toContain('client_id?: string | null')
  })
})
