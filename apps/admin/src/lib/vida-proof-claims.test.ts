import { describe, it, expect } from 'vitest'
import {
  claimsView, loadStaleClaims, validateReconcile, submitReconcile, reconcilePath,
  STALE_CLAIMS_PATH, CLAIMS_READ_FAILED_COPY, RECONCILE_NOTE_REQUIRED,
  RECONCILE_DECISION_REQUIRED, RECONCILE_FAILED_COPY,
  type StaleClaimsPayload, type StaleClaim,
} from './vida-proof-claims'

// ═══════════════════════════════════════════════════════════════════════════════════════
// B4 — A STALE PROOF CLAIM CAN BE SEEN AND RECONCILED, AND ONLY BY A PERSON.
//
// 🛑 THE SHAPE OF THE DANGER. Nothing releases a Proof claim on a timer — deliberately, because
// an automatic release could hand back an attempt while the original run was still alive and
// produce a second batch for one attempt. The cost of that correctness is that a process death
// leaves an `open` claim which blocks the client for ever, and the only cure is an operator
// route Vida could not reach.
//
// ⚠️ SO THE TESTS THAT MATTER MOST ARE THE ONES PROVING THIS PANEL IS *NOT* A TIMER: loading
// settles nothing, a decision needs a written reason, and a refusal leaves the row exactly
// where it was.
// ═══════════════════════════════════════════════════════════════════════════════════════

const CLAIM: StaleClaim = {
  claimId: 'claim-1', clientId: 'c1', companyName: 'Redmayne & Co.',
  authority: 'automatic_1', icpId: 'icp-1',
  claimedAt: '2026-09-13T08:00:00.000Z', noTerminalEvidence: true, heldMs: 3_600_000,
}

const RELEASE_WARNING = 'Only choose Release once you have concluded the original run will NOT subsequently complete.'
const COMPLETE_WARNING = 'Choose Completed only when you can see the batch actually landed.'

const ok = (claims: StaleClaim[]): StaleClaimsPayload => ({
  success: true,
  data: { stale_after_ms: 900_000, claims, release_warning: RELEASE_WARNING, complete_warning: COMPLETE_WARNING },
})

describe('B4-A · stale claims are displayed', () => {
  it('a stale claim reaches the view with its evidence intact', async () => {
    const v = await loadStaleClaims(async () => ok([CLAIM]))
    expect(v.state).toBe('ok')
    expect(v.claims).toHaveLength(1)
    expect(v.claims[0].claimId).toBe('claim-1')
    expect(v.claims[0].companyName).toBe('Redmayne & Co.')
    expect(v.claims[0].authority).toBe('automatic_1')
    expect(v.claims[0].noTerminalEvidence).toBe(true)
    expect(v.staleAfterMs).toBe(900_000)
  })

  it('🛑 the server’s own warnings are carried through, not re-written', async () => {
    const v = await loadStaleClaims(async () => ok([CLAIM]))
    expect(v.releaseWarning).toBe(RELEASE_WARNING)
    expect(v.completeWarning).toBe(COMPLETE_WARNING)
  })

  it('it reads the ONE canonical path', async () => {
    const paths: string[] = []
    await loadStaleClaims(async p => { paths.push(p); return ok([]) })
    expect(paths).toEqual(['/api/proxy/operator/proof-claims/stale'])
    expect(STALE_CLAIMS_PATH).toBe('/api/proxy/operator/proof-claims/stale')
  })
})

describe('B4-B · reconciling calls the existing route with the expected payload', () => {
  it('🛑 posts decision + note to /proof-claims/:claimId/reconcile', async () => {
    const calls: Array<{ path: string; body: unknown }> = []
    const r = await submitReconcile(async (path, body) => {
      calls.push({ path, body }); return { success: true }
    }, 'claim-1', 'released', '  Checked the run outcomes: nothing after the claim, API restarted 09:12.  ')
    expect(r.ok).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0].path).toBe('/api/proxy/operator/proof-claims/claim-1/reconcile')
    expect(calls[0].body).toEqual({
      decision: 'released',
      note: 'Checked the run outcomes: nothing after the claim, API restarted 09:12.',
    })
  })

  it('the claim id is encoded, never concatenated raw', () => {
    expect(reconcilePath('a/b c')).toBe('/api/proxy/operator/proof-claims/a%2Fb%20c/reconcile')
  })

  it('completed is accepted too, and is the only other decision', async () => {
    const bodies: unknown[] = []
    await submitReconcile(async (_p, b) => { bodies.push(b); return { success: true } },
      'claim-1', 'completed', 'Leads are on their desk — the batch landed.')
    expect(bodies[0]).toEqual({ decision: 'completed', note: 'Leads are on their desk — the batch landed.' })
  })
})

describe('🛑 B4 · a decision needs a person, a choice and a written reason', () => {
  it('no decision → refused locally, nothing posted', async () => {
    const calls: string[] = []
    const r = await submitReconcile(async p => { calls.push(p); return { success: true } }, 'claim-1', null, 'a note')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe(RECONCILE_DECISION_REQUIRED)
    expect(calls, 'a request was sent with no decision').toEqual([])
  })

  it('an invented third decision is refused', () => {
    expect(validateReconcile('cancelled', 'note').ok).toBe(false)
    expect(validateReconcile('release', 'note').ok).toBe(false)   // near-miss spelling
  })

  it('🛑 a blank note → refused locally, nothing posted', async () => {
    const calls: string[] = []
    for (const note of ['', '   ', '\n\t']) {
      const r = await submitReconcile(async p => { calls.push(p); return { success: true } }, 'claim-1', 'released', note)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.message).toBe(RECONCILE_NOTE_REQUIRED)
    }
    expect(calls).toEqual([])
  })

  it('the note is clamped to the server’s own limit rather than silently truncated there', () => {
    const v = validateReconcile('released', 'x'.repeat(5000))
    expect(v.ok).toBe(true)
    if (v.ok) expect(v.body.note.length).toBe(4000)
  })
})

describe('B4-D · a refusal leaves the claim exactly where it was', () => {
  it('🛑 not_stale is reported truthfully and is NOT a success', async () => {
    const r = await submitReconcile(
      async () => ({ success: false, error: 'That claim is too recent to reconcile — the original run may still be working. Nothing was changed.' }),
      'claim-1', 'released', 'tried anyway')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toContain('too recent to reconcile')
  })

  it('an already-settled claim is reported, not swallowed', async () => {
    const r = await submitReconcile(async () => ({ success: false, error: 'That claim has already been settled. Nothing was changed.' }),
      'claim-1', 'completed', 'note')
    expect(r.ok).toBe(false)
  })

  it('a thrown request is a failure with the server’s sentence where there is one', async () => {
    const r = await submitReconcile(async () => { throw new Error('API unreachable') }, 'claim-1', 'released', 'note')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe('API unreachable')
  })

  it('an unusable body falls back to the locked failure copy', async () => {
    const r = await submitReconcile(async () => ({}), 'claim-1', 'released', 'note')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe(RECONCILE_FAILED_COPY)
  })
})

describe('B4-E · an empty or failed list never invents a problem — or hides one', () => {
  it('no stale claims is its own state', async () => {
    const v = await loadStaleClaims(async () => ok([]))
    expect(v.state).toBe('empty')
    expect(v.claims).toEqual([])
    expect(v.error).toBeNull()
  })

  it('🛑 a failed read is `failed`, never `empty`', async () => {
    const v = await loadStaleClaims(async () => { throw new Error('API unreachable') })
    expect(v.state).toBe('failed')
    expect(v.state).not.toBe('empty')
    expect(v.error).toBe(CLAIMS_READ_FAILED_COPY)
    expect(CLAIMS_READ_FAILED_COPY).toContain('NOT proof')
  })

  it('a non-success body keeps the server’s reason', () => {
    expect(claimsView({ success: false, error: 'Operator key required' }).error).toBe('Operator key required')
  })
})

describe('🛑 B4-F · loading the panel settles NOTHING — it is not a timer with a face', () => {
  it('loading issues exactly one request, and it is the read', async () => {
    const calls: string[] = []
    await loadStaleClaims(async p => { calls.push(p); return ok([CLAIM]) })
    expect(calls).toEqual([STALE_CLAIMS_PATH])
  })

  it('reloading many times still settles nothing', async () => {
    const calls: string[] = []
    const get = async (p: string) => { calls.push(p); return ok([CLAIM]) }
    for (let i = 0; i < 5; i++) await loadStaleClaims(get)
    expect(calls.every(p => p === STALE_CLAIMS_PATH)).toBe(true)
    expect(calls.filter(p => p.includes('reconcile'))).toEqual([])
  })

  it('🛑 nothing in the load path can reach the reconcile route', async () => {
    const calls: string[] = []
    await loadStaleClaims(async p => { calls.push(p); return ok([CLAIM, { ...CLAIM, claimId: 'claim-2' }]) })
    // Two stale claims loaded, zero reconciliations. An automatic release would show up here.
    expect(calls).toHaveLength(1)
    expect(calls[0]).not.toContain('reconcile')
  })

  it('🛑 the stale threshold is REPORTED, never used to decide anything locally', async () => {
    // `PROOF_CLAIM_STALE_MS` is visibility-only server-side. If this module ever compared a
    // claim's age itself and acted, it would be re-inventing the automatic release.
    const v = await loadStaleClaims(async () => ok([CLAIM]))
    expect(v.staleAfterMs).toBe(900_000)
    const mod = await import('./vida-proof-claims')
    const src = Object.keys(mod)
    expect(src.some(k => /auto|sweep|expire|timer/i.test(k)), 'an automatic settlement helper appeared').toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE WIRING. Structural for the same stated reason as B3: no component-test runtime exists
// and adding one is a dependency change this batch is not authorised to make. The decisions —
// validation, refusal handling, read-only loading — are all driven for real above.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs'
import { join } from 'path'
const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

describe('🛑 B4 wiring — the panel exists, is mounted, reads, and reconciles deliberately', () => {
  const PANEL = 'apps/admin/src/components/vida/StaleProofClaimsPanel.tsx'
  const HOST  = 'apps/admin/src/app/cockpit/page.tsx'

  // ⛓️ CORRECTED BEFORE THIS SHIPPED, same defect as B3's: matching the bare identifier is
  // satisfied by the IMPORT LINE, so deleting the reconcile call left the guard green while
  // the operator's only remedy did nothing. Both CALL SITES are pinned now, with the real
  // fetch inside them.
  it('🛑 it actually CALLS both canonical functions — not merely imports them', () => {
    const src = read(PANEL)
    expect(src).toMatch(/from '@\/lib\/vida-proof-claims'/)
    expect(src, 'the panel no longer calls loadStaleClaims').toMatch(/await loadStaleClaims\(async path => \{\s*\n\s*const r = await fetch\(path\)/)
    expect(src, 'the panel no longer calls submitReconcile').toMatch(/await submitReconcile\(async \(path, body\) => \{/)
    // The reconcile really POSTs; a stub that returns ok would leave a blocked client blocked.
    expect(src).toMatch(/method: 'POST', headers: \{ 'Content-Type': 'application\/json' \}, body: JSON\.stringify\(body\)/)
  })

  it('🛑 THE TOOTH: it is mounted in Vida', () => {
    const src = read(HOST)
    expect(src, 'StaleProofClaimsPanel is no longer imported into the cockpit')
      .toMatch(/import StaleProofClaimsPanel from '@\/components\/vida\/StaleProofClaimsPanel'/)
    expect(src, 'StaleProofClaimsPanel is no longer rendered').toMatch(/<StaleProofClaimsPanel \/>/)
  })

  it('🛑 a refusal leaves the row on screen — nothing is removed optimistically', () => {
    const src = read(PANEL)
    // The only reload is AFTER a successful reconcile; a failure sets the error and returns.
    expect(src).toMatch(/if \(!r\.ok\) \{[\s\S]{0,200}setError\(r\.message\)[\s\S]{0,40}return/)
    expect(src).toMatch(/await load\(\)/)
  })

  it('🛑 the server’s own release/complete warnings are shown before the decision', () => {
    const src = read(PANEL)
    expect(src).toMatch(/view\.releaseWarning/)
    expect(src).toMatch(/view\.completeWarning/)
  })

  it('🛑 nothing settles on mount — the effect calls the READ only', () => {
    const src = read(PANEL)
    const effectLine = src.split('\n').find(l => l.includes('useEffect(') && l.includes('load()'))
    expect(effectLine, 'the mount effect no longer loads').toBeTruthy()
    expect(effectLine!).toMatch(/useEffect\(\(\) => \{ void load\(\) \}, \[load\]\)/)
    // 🛑 THE EFFECT CALLS `load`, NEVER `reconcile`. Asserted on that ONE LINE — an earlier
    // cut of this guard read 80 characters past it, ran into the next declaration, and failed
    // on correct code. A guard that fires on the good state teaches people to delete guards.
    expect(effectLine!, 'the mount effect settles a claim — that is the automatic release')
      .not.toMatch(/reconcile/)
    expect(src.indexOf('const reconcile = useCallback'), 'the deliberate reconcile action is gone')
      .toBeGreaterThan(-1)
  })
})
