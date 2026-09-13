import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  controlsFor, validatePasses, validateRestart,
  submitPassClassification, submitRestartClassification, loadClassificationEvidence,
  CLASSIFY_PASSES_PATH, CLASSIFY_RESTART_PATH, EVIDENCE_PATH,
  PASS_CHOICE_REQUIRED, RESTART_CHOICE_REQUIRED, CLASSIFY_NOTE_REQUIRED,
  CLASSIFY_FAILED_COPY, EVIDENCE_READ_FAILED_COPY, PASS_CHOICES, RESTART_CHOICES,
  type ClassificationEvidence,
} from './vida-proof-classification'

// ═══════════════════════════════════════════════════════════════════════════════════════
// B2 — VIDA'S CLASSIFICATION CONTROLS: WHO SEES THEM, AND WHAT PRESSING THEM SENDS.
//
// 🛑 THE RULE THESE TESTS HOLD. The browser never re-derives "is classification required" —
// it reads the two server booleans. Everything else about this feature is downstream of that
// one decision, so it is driven first and hardest.
//
// ⚠️ AND THE FOUR COMBINATIONS ARE THE POINT (§6). Passes and restart are separate histories.
// A client may need one, the other, both or neither, and settling one must never clear the
// other — which is why this module holds no "done" state at all.
// ═══════════════════════════════════════════════════════════════════════════════════════

const ev = (o: Partial<ClassificationEvidence>): ClassificationEvidence => ({ ...o })

describe('🛑 §8 B2-1..6 · which controls render — the four combinations', () => {
  const CASES: Array<[string, ClassificationEvidence, boolean, boolean]> = [
    ['true / true',   ev({ legacy_passes_classification_required: true,  legacy_restart_classification_required: true  }), true,  true],
    ['true / false',  ev({ legacy_passes_classification_required: true,  legacy_restart_classification_required: false }), true,  false],
    ['false / true',  ev({ legacy_passes_classification_required: false, legacy_restart_classification_required: true  }), false, true],
    ['false / false', ev({ legacy_passes_classification_required: false, legacy_restart_classification_required: false }), false, false],
  ]

  for (const [label, e, passes, restart] of CASES) {
    it(`${label} → passes control ${passes ? 'VISIBLE' : 'absent'}, restart control ${restart ? 'VISIBLE' : 'absent'}`, () => {
      expect(controlsFor(e)).toEqual({ passes, restart })
    })
  }

  it('B2-6 · neither required → nothing renders', () => {
    expect(controlsFor(ev({ legacy_passes_classification_required: false, legacy_restart_classification_required: false })))
      .toEqual({ passes: false, restart: false })
  })

  it('🛑 an unreadable / absent evidence shows NOTHING — unknown authority is never a control', () => {
    expect(controlsFor(null)).toEqual({ passes: false, restart: false })
    expect(controlsFor(undefined)).toEqual({ passes: false, restart: false })
    expect(controlsFor(ev({}))).toEqual({ passes: false, restart: false })
  })

  it('🛑 only EXACTLY true renders — a truthy string or 1 does not', () => {
    const sneaky = { legacy_passes_classification_required: 'yes', legacy_restart_classification_required: 1 } as unknown as ClassificationEvidence
    expect(controlsFor(sneaky)).toEqual({ passes: false, restart: false })
  })

  it('🛑 THE BROWSER DOES NOT RE-DERIVE THE RULE — the ingredients are ignored', () => {
    // A payload that WOULD satisfy the server's predicates, with the server's own answer set
    // to false. The browser must believe the server, not recompute it: a second definition of
    // "is this client blocked" is how the gate and the control come to disagree.
    const contradictory = {
      legacy_passes_classification_required: false,
      legacy_restart_classification_required: false,
      legacy_passes_classified_as: null,
      passes_done: 2,
      restart_used_at: '2026-09-01T10:00:00.000Z',
    } as unknown as ClassificationEvidence
    expect(controlsFor(contradictory)).toEqual({ passes: false, restart: false })
  })

  it('🛑 the module never reads the ingredients at all', () => {
    const src = readFileSync(join(__dirname, 'vida-proof-classification.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n').map(l => { const i = l.search(/(?<!:)\/\//); return i < 0 ? l : l.slice(0, i) }).join('\n')
    for (const ingredient of ['passes_done', 'restart_used_at', 'proof_pass_claims', 'proof_passes_done']) {
      expect(src, `the browser reads "${ingredient}" — that is re-deriving the authority rule`)
        .not.toContain(ingredient)
    }
  })
})

describe('🛑 §4/§5 · nothing is defaulted — historical truth is a human decision', () => {
  it('no pass choice → refused locally, nothing posted', async () => {
    const calls: string[] = []
    const r = await submitPassClassification(async p => { calls.push(p); return { success: true } }, 'c1', null, 'a note')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe(PASS_CHOICE_REQUIRED)
    expect(calls, 'a classification was posted with no choice').toEqual([])
  })

  it('an out-of-range or invented pass count is refused', () => {
    for (const bad of [-1, 3, 1.5, NaN]) expect(validatePasses(bad, 'note').ok).toBe(false)
    expect([...PASS_CHOICES]).toEqual([0, 1, 2])
  })

  it('no restart choice → refused locally, nothing posted', async () => {
    const calls: string[] = []
    const r = await submitRestartClassification(async p => { calls.push(p); return { success: true } }, 'c1', null, 'a note')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe(RESTART_CHOICE_REQUIRED)
    expect(calls).toEqual([])
  })

  it('an invented restart status is refused', () => {
    for (const bad of ['burned', 'complete', 'release', 'unknown']) expect(validateRestart(bad, 'note').ok).toBe(false)
    expect([...RESTART_CHOICES]).toEqual(['completed', 'released'])
  })

  it('🛑 a blank note is refused for BOTH classifications, and nothing is posted', async () => {
    const calls: string[] = []
    const post = async (p: string) => { calls.push(p); return { success: true } }
    for (const note of ['', '   ', '\n\t']) {
      const a = await submitPassClassification(post, 'c1', 1, note)
      const b = await submitRestartClassification(post, 'c1', 'completed', note)
      expect(a.ok).toBe(false); if (!a.ok) expect(a.message).toBe(CLASSIFY_NOTE_REQUIRED)
      expect(b.ok).toBe(false); if (!b.ok) expect(b.message).toBe(CLASSIFY_NOTE_REQUIRED)
    }
    expect(calls).toEqual([])
  })

  it('the note is clamped to the route’s own limit', () => {
    const v = validatePasses(2, 'x'.repeat(5000))
    expect(v.ok).toBe(true)
    if (v.ok) expect(v.body.note.length).toBe(4000)
  })
})

describe('§8 B2-7/B2-8 · submissions reach the EXISTING routes with the exact payload', () => {
  it('🛑 B2-7 · pass classification → classify-passes, with the exact chosen count', async () => {
    for (const passes of [0, 1, 2] as const) {
      const calls: Array<{ path: string; body: unknown }> = []
      const r = await submitPassClassification(async (path, body) => {
        calls.push({ path, body }); return { success: true }
      }, 'client-1', passes, '  Read icp_run_outcomes and lead_feedback for both attempts.  ')
      expect(r.ok).toBe(true)
      expect(calls[0].path).toBe('/api/proxy/operator/proof-review/client-1/classify-passes')
      expect(calls[0].body).toEqual({ passes, note: 'Read icp_run_outcomes and lead_feedback for both attempts.' })
    }
  })

  it('🛑 B2-8 · restart classification → classify-restart, with the exact chosen status', async () => {
    for (const status of ['completed', 'released'] as const) {
      const calls: Array<{ path: string; body: unknown }> = []
      const r = await submitRestartClassification(async (path, body) => {
        calls.push({ path, body }); return { success: true }
      }, 'client-1', status, 'Checked the restart batch and the surfacing outcome.')
      expect(r.ok).toBe(true)
      expect(calls[0].path).toBe('/api/proxy/operator/proof-review/client-1/classify-restart')
      expect(calls[0].body).toEqual({ status, note: 'Checked the restart batch and the surfacing outcome.' })
    }
  })

  it('🛑 no `force` is ever sent — overwriting a classification is a different decision', async () => {
    const bodies: unknown[] = []
    await submitPassClassification(async (_p, b) => { bodies.push(b); return { success: true } }, 'c1', 2, 'note')
    expect(JSON.stringify(bodies[0])).not.toContain('force')
  })

  it('client ids are encoded, never concatenated raw', () => {
    expect(CLASSIFY_PASSES_PATH('a/b c')).toBe('/api/proxy/operator/proof-review/a%2Fb%20c/classify-passes')
    expect(CLASSIFY_RESTART_PATH('a/b c')).toBe('/api/proxy/operator/proof-review/a%2Fb%20c/classify-restart')
    expect(EVIDENCE_PATH('a/b c')).toBe('/api/proxy/operator/proof-review/a%2Fb%20c/evidence')
  })
})

describe('🛑 §8 B2-9 · a refusal is never a fake success', () => {
  it('already_classified (409) is reported, not swallowed', async () => {
    const r = await submitPassClassification(
      async () => ({ success: false, error: 'This client is already classified as 1 legitimately consumed pass(es). Send force: true to change it deliberately.' }),
      'c1', 2, 'note')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toContain('already classified')
  })

  it('a thrown request is a failure with the server’s sentence where there is one', async () => {
    const r = await submitRestartClassification(async () => { throw new Error('API unreachable') }, 'c1', 'released', 'note')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe('API unreachable')
  })

  it('an unusable body falls back to the locked failure copy', async () => {
    const r = await submitPassClassification(async () => ({}), 'c1', 1, 'note')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe(CLASSIFY_FAILED_COPY)
  })

  it('🛑 and a failure leaves the requirement exactly where it was', () => {
    // The panel re-reads the server after any attempt; a refusal changed nothing, so the
    // booleans come back the same and the control is still there.
    const before = ev({ legacy_passes_classification_required: true, legacy_restart_classification_required: false })
    expect(controlsFor(before)).toEqual({ passes: true, restart: false })
  })
})

describe('🛑 §8 B2-10/B2-11 · settling one classification never clears the other', () => {
  it('B2-10 · passes settled, restart still required → the restart control REMAINS', () => {
    const after = ev({ legacy_passes_classification_required: false, legacy_restart_classification_required: true })
    expect(controlsFor(after)).toEqual({ passes: false, restart: true })
  })

  it('B2-11 · restart settled, passes still required → the passes control REMAINS', () => {
    const after = ev({ legacy_passes_classification_required: true, legacy_restart_classification_required: false })
    expect(controlsFor(after)).toEqual({ passes: true, restart: false })
  })

  it('🛑 the module holds NO local "done" state — only refreshed server truth decides', async () => {
    const src = readFileSync(join(__dirname, 'vida-proof-classification.ts'), 'utf8')
    for (const banned of ['passesDone =', 'restartDone =', 'classified = true', 'setDone']) {
      expect(src, `a local completion flag appeared (${banned})`).not.toContain(banned)
    }
    // And `controlsFor` is a pure function of its argument: the same input always answers the
    // same thing, so nothing can accumulate between presses.
    const e = ev({ legacy_passes_classification_required: true, legacy_restart_classification_required: true })
    expect(controlsFor(e)).toEqual(controlsFor(e))
  })
})

describe('§K · the canonical re-read', () => {
  it('reads the ONE evidence path for this client', async () => {
    const paths: string[] = []
    await loadClassificationEvidence(async p => {
      paths.push(p)
      return { success: true, data: { legacy_passes_classification_required: true } }
    }, 'client-1')
    expect(paths).toEqual(['/api/proxy/operator/proof-review/client-1/evidence'])
  })

  it('a successful read carries the server booleans through unchanged', async () => {
    const v = await loadClassificationEvidence(async () => ({
      success: true,
      data: { legacy_passes_classification_required: true, legacy_restart_classification_required: false, legacy_passes_classified_as: null },
    }), 'c1')
    expect(v.state).toBe('ok')
    expect(controlsFor(v.evidence)).toEqual({ passes: true, restart: false })
    expect(v.evidence?.legacy_passes_classified_as).toBeNull()
  })

  it('🛑 a FAILED read shows no control and says the emptiness is not proof', async () => {
    const v = await loadClassificationEvidence(async () => { throw new Error('API unreachable') }, 'c1')
    expect(v.state).toBe('failed')
    expect(controlsFor(v.evidence)).toEqual({ passes: false, restart: false })
    expect(v.error).toBe(EVIDENCE_READ_FAILED_COPY)
    expect(EVIDENCE_READ_FAILED_COPY).toContain('NOT proof')
  })

  it('a non-success body is a failure, and the server’s reason is kept', async () => {
    const v = await loadClassificationEvidence(async () => ({ success: false, error: 'Operator key required' }), 'c1')
    expect(v.state).toBe('failed')
    expect(v.error).toBe('Operator key required')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE WIRING. Structural, and stated as such: no component-test runtime exists in this repo
// (`@testing-library/react` / `jsdom` are not installed and adding them is a dependency change
// this batch is not authorised to make). Every DECISION above is driven for real. What is
// pinned here is that the panel exists, calls both classification routes, re-reads the
// canonical evidence after each success, and is mounted on the Vida Proof Review surface —
// the founder's teeth T5–T9.
// ═══════════════════════════════════════════════════════════════════════════════════════
const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

describe('🛑 B2 wiring — the controls exist, are mounted, and only render on the server booleans', () => {
  const PANEL = 'apps/admin/src/components/vida/ProofClassificationPanel.tsx'
  const HOST  = 'apps/admin/src/app/vida/page.tsx'

  it('T5/T6 · visibility comes from `controlsFor`, never from a hand-rolled condition', () => {
    const src = read(PANEL)
    expect(src).toMatch(/controlsFor\(/)
    expect(src, 'the panel re-derives the requirement itself').not.toMatch(/passes_done|restart_used_at/)
    // Each control is gated on its own boolean, independently.
    expect(src).toMatch(/controls\.passes &&/)
    expect(src).toMatch(/controls\.restart &&/)
  })

  it('T7 · it actually CALLS classify-passes — not merely imports it', () => {
    expect(read(PANEL)).toMatch(/await submitPassClassification\(async \(path, body\) => \{/)
  })

  it('T8 · it actually CALLS classify-restart — not merely imports it', () => {
    expect(read(PANEL)).toMatch(/await submitRestartClassification\(async \(path, body\) => \{/)
  })

  it('🛑 T9 · after a success it RE-READS the canonical evidence — nothing is cleared locally', () => {
    const src = read(PANEL)
    expect(src).toMatch(/await loadClassificationEvidence\(async path => \{/)
    // Both handlers end in the same re-read; neither flips a local flag.
    const reloads = src.match(/await load\(\)/g) ?? []
    expect(reloads.length, 'a classification handler does not re-read the server').toBeGreaterThanOrEqual(2)
    expect(src).not.toMatch(/setControls\(|setPassesRequired\(|setRestartRequired\(/)
  })

  it('a refusal leaves the control on screen', () => {
    const src = read(PANEL)
    expect(src).toMatch(/if \(!r\.ok\) \{[\s\S]{0,160}return/)
  })

  it('🛑 it is mounted on the existing Vida Proof Review surface', () => {
    const src = read(HOST)
    expect(src, 'ProofClassificationPanel is no longer imported into the Vida clients workspace')
      .toMatch(/import ProofClassificationPanel from '@\/components\/vida\/ProofClassificationPanel'/)
    expect(src, 'ProofClassificationPanel is no longer rendered').toMatch(/<ProofClassificationPanel/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 CLIENT-SWITCH ISOLATION — A's classification state must NEVER reach B.
//
// ── THE DEFECT THIS CLOSES ─────────────────────────────────────────────────────────────
//
// The panel was mounted UNKEYED: `<ProofClassificationPanel clientId={selected ?? null} />`.
// Every piece of its state is local `useState` — the loaded evidence, the pass choice, the
// pass note, the restart choice, the restart note, busy and error — so switching client A → B
// kept ONE instance alive and only changed the prop. Three unsafe states followed:
//
//   ① until B's evidence landed, A's controls were still rendered while the submit closures
//      already pointed at B — a control that could classify B using A's evidence;
//   ② A's typed pass count, restart status and notes survived the switch;
//   ③ an A read that finished LATE overwrote the instance now showing B.
//
// ── THE FIX, AND WHY A KEY IS ENOUGH ──────────────────────────────────────────────────
//
// `key={selected}` makes A → B a real UNMOUNT and a fresh mount. All seven states are
// destroyed and re-created; B starts at `{ state: 'loading', evidence: null }`, which renders
// NOTHING; and a late A response resolves against A's discarded instance, where React drops
// the update. No request-generation counter is needed because there is no longer one instance
// serving two clients — which is the only way a generation could be stale.
//
// ⚠️ WHAT THESE GUARDS CAN AND CANNOT DO. There is no React component-test runtime here and
// adding one is a dependency change this batch forbids. So the REMOUNT BOUNDARY is pinned on
// source — that is the founder's tooth — while the CONSEQUENCE of a fresh mount (that the
// initial state renders no control and enables no action) is driven for real, because those
// are pure decisions over the exact values a fresh instance starts with.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The exact values a freshly-mounted instance starts with, read from the component source. */
const FRESH = {
  view: { state: 'loading' as const, evidence: null, error: null },
  passes: null as number | null,
  passNote: '',
  restart: null as string | null,
  restartNote: '',
  busy: null as string | null,
  error: null as string | null,
}

describe('🛑 B2 isolation — a fresh mount can do nothing for the new client until B answers', () => {
  it('1 · a fresh instance renders NO control — A’s requirement cannot be actionable for B', () => {
    // B's instance begins with no evidence at all, and no evidence means no control.
    expect(controlsFor(FRESH.view.evidence)).toEqual({ passes: false, restart: false })
  })

  it('1b · and the panel returns null while loading, so nothing at all is on screen', () => {
    const src = read('apps/admin/src/components/vida/ProofClassificationPanel.tsx')
    expect(src).toMatch(/if \(view\.state === 'loading'\) return null/)
    expect(src).toMatch(/useState<ClassificationView>\(\{ state: 'loading', evidence: null, error: null \}\)/)
  })

  it('🛑 2/3 · a fresh instance carries NO pass or restart choice and NO note', () => {
    // Submitting with these values is refused locally and posts nothing — so even if a press
    // somehow landed in the instant after a switch, it could not classify anyone.
    expect(validatePasses(FRESH.passes, FRESH.passNote).ok).toBe(false)
    expect(validateRestart(FRESH.restart, FRESH.restartNote).ok).toBe(false)
  })

  it('2b/3b · the component’s initial state literals are the empty ones', () => {
    const src = read('apps/admin/src/components/vida/ProofClassificationPanel.tsx')
    for (const init of [
      'useState<PassChoice | null>(null)',
      "useState('')",
      'useState<RestartChoice | null>(null)',
      "useState<'passes' | 'restart' | null>(null)",
      'useState<string | null>(null)',
    ]) {
      expect(src, `a state no longer starts empty: ${init}`).toContain(init)
    }
  })

  it('🛑 7 · nothing can be submitted for B using A’s values, because there are none', async () => {
    const calls: string[] = []
    const post = async (p: string) => { calls.push(p); return { success: true } }
    await submitPassClassification(post, 'client-B', FRESH.passes, FRESH.passNote)
    await submitRestartClassification(post, 'client-B', FRESH.restart, FRESH.restartNote)
    expect(calls, 'a classification was posted from a fresh instance').toEqual([])
  })

  it('5 · once B’s truth is known and needs nothing, no control appears', () => {
    const bTruth = ev({ legacy_passes_classification_required: false, legacy_restart_classification_required: false })
    expect(controlsFor(bTruth)).toEqual({ passes: false, restart: false })
  })

  it('6 · and when B needs only the restart, only B’s restart control appears', () => {
    const bTruth = ev({ legacy_passes_classification_required: false, legacy_restart_classification_required: true })
    expect(controlsFor(bTruth)).toEqual({ passes: false, restart: true })
  })

  it('🛑 4 · every read is addressed to ONE client — A’s response is A’s, never B’s', async () => {
    // The path carries the client id, so an in-flight A read is a read OF A. With the keyed
    // remount its `setView` lands on A's discarded instance; nothing addressed to A can become
    // B's evidence, because B's instance never issued it and never receives it.
    const paths: string[] = []
    const get = async (p: string) => {
      paths.push(p)
      return { success: true, data: { legacy_passes_classification_required: true } }
    }
    await loadClassificationEvidence(get, 'client-A')
    await loadClassificationEvidence(get, 'client-B')
    expect(paths).toEqual([
      '/api/proxy/operator/proof-review/client-A/evidence',
      '/api/proxy/operator/proof-review/client-B/evidence',
    ])
    expect(paths[0]).not.toBe(paths[1])
  })
})

describe('🛑 B2 isolation — THE TOOTH: the mount is keyed by the selected client', () => {
  const HOST  = 'apps/admin/src/app/vida/page.tsx'
  const PANEL = 'apps/admin/src/components/vida/ProofClassificationPanel.tsx'

  it('🛑 the panel is keyed by the selected client id', () => {
    const src = read(HOST)
    // ⛓️ WHAT STOOD HERE AND WAS UNSAFE:
    // ~~`<ProofClassificationPanel clientId={selected ?? null} />`~~
    expect(src, 'the classification panel is mounted UNKEYED — A\'s state survives a client switch')
      .toMatch(/<ProofClassificationPanel\s+key=\{selected \?\? 'no-client'\}\s+clientId=\{selected \?\? null\}\s*\/>/)
  })

  it('🛑 the key and the clientId derive from the SAME `selected`', () => {
    // If they ever diverge, one instance would serve two clients again and the isolation is
    // gone without the mount looking any different.
    const src = read(HOST)
    const m = /<ProofClassificationPanel\s+key=\{([^}]+)\}\s+clientId=\{([^}]+)\}/.exec(src)
    expect(m, 'the classification mount could not be read').toBeTruthy()
    const [, keyExpr, idExpr] = m!
    expect(keyExpr).toContain('selected')
    expect(idExpr).toContain('selected')
    expect(keyExpr.replace(/\s+/g, '')).toBe("selected??'no-client'")
    expect(idExpr.replace(/\s+/g, '')).toBe('selected??null')
  })

  it('🛑 there is NO classification state outside the keyed component', () => {
    // A cache in the page (or at module scope in the panel) would survive the remount and
    // re-introduce exactly the defect the key removes.
    const host = read(HOST)
    for (const hoisted of [
      'setClassification', 'classificationEvidence', 'setPassesRequired',
      'setRestartRequired', 'classifyPasses', 'classifyRestart',
    ]) {
      expect(host, `the Vida page holds classification state (${hoisted}) outside the keyed panel`)
        .not.toContain(hoisted)
    }
    // …and the panel keeps everything in `useState`, never at module scope.
    const panel = read(PANEL)
    const beforeComponent = panel.slice(0, panel.indexOf('export default function'))
    expect(beforeComponent, 'the panel declares module-scope mutable state')
      .not.toMatch(/^(let|var)\s/m)
    for (const s of ['view', 'passes', 'passNote', 'restart', 'restartNote', 'busy', 'error']) {
      expect(panel, `\`${s}\` is no longer component-local state`)
        .toMatch(new RegExp(`const \\[${s},\\s*set`))
    }
  })

  it('the panel still takes the client from its prop, so a remount really re-targets', () => {
    const panel = read(PANEL)
    expect(panel).toMatch(/\{ clientId \}: \{ clientId: string \| null \}/)
    expect(panel).toMatch(/\}, \[clientId\]\)/)
  })
})
