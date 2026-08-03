import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import * as hubspot from './hubspot'
import { stripCommentsForEnvScan } from './env-inventory'

// #397 — THIS FILE EXISTS BECAUSE THE ITEM WAS WRONG IN THE EXPENSIVE DIRECTION.
//
// #397 read: "HubSpot dead code — platform signup/payment sync functions written but never
// called (lib/hubspot.ts). Wire or delete." Two of its five exports are LIVE, and the cheap
// branch of "wire or delete" removes code that runs when a prospect replies:
//
//   syncFigsyInterestedToHubspot  ← reply-pipeline.ts, the spine every reply flows through
//   getHubspotPipelineView        ← internal.ts, GET /hubspot/pipeline
//
// The three that really were dead are gone (see the header of lib/hubspot.ts). What remains is
// the risk that this happens AGAIN: a future audit, or a future stale note, reads "HubSpot dead
// code" and finishes the job. Nothing would fail loudly — HubSpot sync is best-effort and
// `.catch(console.error)`'d at both call sites, so deleting it produces a silent gap in CRM
// data rather than an error anyone sees.
//
// So these tests do not assert that the functions exist. They assert the functions are
// IMPORTED AND CALLED by the specific files that depend on them, which is the fact that makes
// them live — and the fact a "dead code" note would contradict.

const SRC = join(__dirname, '..')

/** Read a source file with comments stripped, so a mention in prose never counts as a call. */
function code(rel: string): string {
  return stripCommentsForEnvScan(readFileSync(join(SRC, rel), 'utf8'))
}

describe('the two live exports are live — imported AND called', () => {
  it('syncFigsyInterestedToHubspot is imported and called by the reply pipeline', () => {
    const src = code('lib/reply-pipeline.ts')
    expect(src, 'reply-pipeline no longer imports it').toMatch(
      /import\s*\{[^}]*syncFigsyInterestedToHubspot[^}]*\}\s*from\s*'\.\/hubspot'/)
    // Imported-but-unused is exactly the state #397 claimed. Assert the call too.
    expect(src, 'reply-pipeline imports it but never calls it').toContain('syncFigsyInterestedToHubspot({')
  })

  it('getHubspotPipelineView is imported and called by the internal routes', () => {
    const src = code('routes/internal.ts')
    expect(src, 'internal.ts no longer imports it').toMatch(
      /import\s*\{[^}]*getHubspotPipelineView[^}]*\}\s*from\s*'\.\.\/lib\/hubspot'/)
    expect(src, 'internal.ts imports it but never calls it').toContain('await getHubspotPipelineView()')
  })

  it('both are still exported by the module itself', () => {
    expect(typeof hubspot.syncFigsyInterestedToHubspot).toBe('function')
    expect(typeof hubspot.getHubspotPipelineView).toBe('function')
  })
})

describe('the dead platform sync functions are gone and stay gone', () => {
  const REMOVED = ['syncNewSignupToHubspot', 'syncPaymentToHubspot', 'syncClientToHubspot']

  for (const name of REMOVED) {
    it(`${name} is no longer exported`, () => {
      expect((hubspot as Record<string, unknown>)[name]).toBeUndefined()
    })
  }

  it('and nothing anywhere in the source tree still refers to them', () => {
    // Walks the real trees rather than trusting a remembered grep. If someone re-adds a caller
    // without re-adding the function, this catches the broken import at test time instead of
    // at runtime, where a HubSpot failure is swallowed by .catch(console.error).
    const roots = [join(SRC, '..', '..', '..', 'apps'), join(SRC, '..', '..', '..', 'packages')]
    const offenders: string[] = []

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry === 'dist' || entry === '.next' || entry.startsWith('.')) continue
        const p = join(dir, entry)
        if (statSync(p).isDirectory()) { walk(p); continue }
        if (!/\.(ts|tsx)$/.test(p)) continue
        if (p.endsWith('hubspot.ts') || p.endsWith('hubspot-live-exports.test.ts')) continue  // the record of the removal
        const body = stripCommentsForEnvScan(readFileSync(p, 'utf8'))
        for (const name of REMOVED) if (body.includes(name)) offenders.push(`${p} → ${name}`)
      }
    }
    for (const r of roots) walk(r)
    expect(offenders, `removed functions still referenced:\n${offenders.join('\n')}`).toEqual([])
  })
})

describe('the shared helpers the live path needs were NOT removed with them', () => {
  // upsertContact and addNoteToContact were used by BOTH the dead syncs and the live one.
  // Removing the callers without checking the shared helpers is how a cleanup breaks a
  // reply path: the export survives, its body no longer compiles or silently no-ops.
  const src = code('lib/hubspot.ts')

  it('upsertContact and addNoteToContact still exist and are used by the live export', () => {
    expect(src).toContain('async function upsertContact(')
    expect(src).toContain('async function addNoteToContact(')
    const at = src.indexOf('export async function syncFigsyInterestedToHubspot')
    const body = src.slice(at)
    expect(body).toContain('await upsertContact(')
    expect(body).toContain('await addNoteToContact(')
  })

  it('the orphaned helpers went with the code that used them', () => {
    // upsertCompany / associateContactToCompany had exactly one caller — syncClientToHubspot.
    // Leaving them behind would have replaced three dead functions with two.
    expect(src).not.toContain('upsertCompany')
    expect(src).not.toContain('associateContactToCompany')
  })
})
