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
