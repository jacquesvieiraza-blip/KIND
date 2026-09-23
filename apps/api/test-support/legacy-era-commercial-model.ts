// ═══════════════════════════════════════════════════════════════════════════════════════
// 🧪 TEST-ONLY — THE PRE-R137 COMMERCIAL-MODEL RESOLVER, KEPT SO THE RETIRED CODE STAYS TESTED
//
// ⚑ 23 Sep (R137). Founder, verbatim: *"the 299/4 is retired/ this must go. everything must be
// updated to new programme pricing model."* Production's `clientCommercialModel` no longer
// resolves ANY client to `legacy` / `compat_legacy`, and `mayUseLegacyCommercialPath` answers
// `false` for everyone — so the per-lead internals ($4 approve, pack boundary, paid-lead
// delivery, legacy lookalike sourcing) are unreachable from production.
//
// 🛑 THEY ARE NOT DELETED IN THE SAME CHANGE, AND THEIR TESTS ARE NOT DELETED OR SKIPPED.
// R131 (founder-locked): *"Do not weaken existing tests to make the build pass."* The code is
// removed by its own follow-up PR, together with these tests. Until then the tests keep
// proving that the code which still exists behaves as it did — by running it against THIS
// copy of the resolver as it stood on `main` at 54ee75b53, which is the only state in which
// that code was ever reachable.
//
// ⚠️ THIS FILE LIVES OUTSIDE `src/` ON PURPOSE. Nothing in production can import it (the API
// build's rootDir is `src/`), and `legacy-era-fixture-contained.test.ts` pins both that no
// application file imports it and exactly which test files do — so it cannot quietly spread.
//
// ⚠️ WHAT IS PROVEN ABOUT PRODUCTION lives in `commercial-model.test.ts`, which does NOT use
// this file: there, NULL and 'legacy' resolve to programme and every legacy door says no.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Actual = typeof import('../src/lib/commercial-model')
type Model = import('../src/lib/commercial-model').CommercialModel

/** Pre-R137 `clientCommercialModel`, copied from `main` at 54ee75b53. */
async function legacyEraResolve(clientId: string): Promise<Model> {
  const unreadable = (reason: string): Model =>
    ({ model: 'unreadable', declared: false, openProgramme: null, reason })
  if (!clientId) return unreadable('no client id')
  // ⚠️ BOTH MODULES ARE LOOKED UP PER CALL, AND IN ONE AWAIT. Several harnesses
  // `vi.resetModules()` + `vi.doMock('@kind/db')` per case, and this file is not re-evaluated
  // when they do — so a binding at the top would keep answering from the first mock. One
  // `Promise.all` keeps the number of awaits equal to the original resolver's, because
  // fire-and-forget harnesses (launch-journey) are sensitive to it.
  const [{ db }, { openProgrammeFor }] = await Promise.all([
    import('@kind/db'), import('../src/lib/programme-authority'),
  ])
  let stored: 'programme' | 'legacy' | null
  try {
    const { data, error } = await db.from('clients')
      .select('commercial_model').eq('id', clientId).maybeSingle()
    if (error) return unreadable(`client read failed: ${error.message}`)
    if (!data) return unreadable('no such client')
    const raw = (data as { commercial_model?: string | null }).commercial_model
    if (raw === undefined) {
      return unreadable('the client row carried no commercial_model field — a missing field is not a NULL')
    }
    if (raw !== null && raw !== 'programme' && raw !== 'legacy') {
      return unreadable(`unrecognised commercial model: ${String(raw)}`)
    }
    stored = raw
  } catch (err) {
    return unreadable(err instanceof Error ? err.message : String(err))
  }
  let open: any
  try {
    open = await openProgrammeFor(clientId)
  } catch (err) {
    return unreadable(`programme read failed: ${err instanceof Error ? err.message : String(err)}`)
  }
  if (stored === 'programme') return { model: 'programme', declared: true, openProgramme: open }
  if (stored === 'legacy') {
    if (open) {
      return unreadable(
        `client is declared legacy but holds an open programme (${open.id}) — the two disagree, `
        + 'so no sourcing, sending, enrolment or charge is authorised until an operator resolves it',
      )
    }
    return { model: 'legacy', declared: true, openProgramme: null }
  }
  return open
    ? { model: 'compat_programme', declared: false, openProgramme: open }
    : { model: 'compat_legacy', declared: false, openProgramme: null }
}

const legacyEraIsLegacy = (m: Model) => m.model === 'legacy' || m.model === 'compat_legacy'

/**
 * Build a `vi.mock` factory result: the real module, with the four decisions R137 closed put
 * back exactly as they were. Use as
 *
 *   vi.mock('./commercial-model', async (importOriginal) =>
 *     (await import('../../test-support/legacy-era-commercial-model'))
 *       .legacyEraCommercialModel(await importOriginal()))
 */
export function legacyEraCommercialModel(actual: Actual): Actual {
  const resolve = legacyEraResolve
  const legacyDoorVerdict: Actual['legacyDoorVerdict'] = async (clientId) => {
    try {
      const model = await resolve(clientId)
      if (model.model === 'unreadable') {
        return {
          allowed: false, status: 503,
          reason: `This account's commercial model could not be read (${model.reason}), so nothing was done. Try again shortly.`,
        }
      }
      if (legacyEraIsLegacy(model)) return { allowed: true }
      return { allowed: false, status: 403, reason: actual.LEGACY_DOOR_REFUSAL }
    } catch (err) {
      return {
        allowed: false, status: 503,
        reason: `This account's commercial model could not be read (${err instanceof Error ? err.message : String(err)}), so nothing was done.`,
      }
    }
  }
  return {
    ...actual,
    clientCommercialModel: resolve,
    isLegacyModel: legacyEraIsLegacy,
    isProgrammeModel: (m: Model) => m.model === 'programme' || m.model === 'compat_programme',
    mayUseLegacyCommercialPath: legacyEraIsLegacy,
    legacyDoorVerdict,
    commercialModelLabel: (m: Model) => {
      switch (m.model) {
        case 'programme':        return m.openProgramme ? 'Programme' : 'Programme client · no active programme'
        case 'legacy':           return 'Legacy'
        case 'compat_programme': return 'Unclassified · behaving as programme (has an open programme)'
        case 'compat_legacy':    return 'Unclassified · behaving as legacy (no programme)'
        case 'unreadable':       return 'Unresolved — needs an operator'
      }
    },
  }
}
