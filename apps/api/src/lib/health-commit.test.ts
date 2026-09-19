import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { resolveDeployedCommit } from './deployed-commit'

// ── #673 — /health NAMES THE BUILD IT IS RUNNING ───────────────────────────────────────────
//
// `/health` reported a hand-typed `v: '2026-06-22-health'` and nothing else that moves. A
// response from the live API was byte-identical whether it served June's build or this
// morning's, so **"merged and deployed" could never be checked** — only believed.
//
// ⚠️ THAT IS NOT HYPOTHETICAL. On 20 Aug a website merge was reported as shipped while the live
// site still served Google Analytics dated the 14th. It was caught only because a STATIC site
// can be fetched and read; the API had no equivalent, and three items were flipped 🩷 that day
// on the founder's word rather than on evidence — which is what 🩷 means, but it is a weaker
// position than the product needed five days before first send.
//
// The value now comes from `RAILWAY_GIT_COMMIT_SHA`, which the platform injects, which is
// already logged at boot, and which `startup-check.ts` already described as *"Deploy identity,
// used in health/diagnostics"* — a description that was not true until this change.

const INDEX = join(__dirname, '../index.ts')
/** The shared RULE (lookup order, sha shape) and the api-side ADAPTER (where the stamp is). */
const RULE = readFileSync(join(__dirname, '../../../../packages/shared/src/deployed-commit.ts'), 'utf8')
const ADAPTER = readFileSync(join(__dirname, 'deployed-commit.ts'), 'utf8')
const src = readFileSync(INDEX, 'utf8')

/** The `/health` handler as written, so assertions cannot drift onto some other route. */
const handler = (() => {
  const start = src.indexOf("app.get('/health'")
  const end = src.indexOf("app.get('/features'")
  return src.slice(start, end)
})()

describe('the guard is looking at the real handler', () => {
  it('finds a non-trivial /health block', () => {
    // Without this, a rename leaves every assertion below reading an empty string and passing.
    expect(handler.length, 'if this is tiny the slice is wrong — fix the anchors').toBeGreaterThan(400)
    expect(handler).toContain("status: db === 'ok' ? 'ok' : 'degraded'")
  })
})

describe('#673 — the response carries the deployed commit', () => {
  // ⛓️ AMENDED BY XC-4 (Batch 1). The PROPERTY these cases guard is unchanged and nothing
  // here is weakened — what changed is where the value comes from.
  //
  // #673 made `/health` read `RAILWAY_GIT_COMMIT_SHA` directly, and the two cases below
  // used to assert that string and `.slice(0, 7)` inline in the handler. Both assertions
  // passed for six weeks while production answered `commit: "unknown"` on every single
  // deploy — because `ship.sh` uses `railway up`, a directory upload, and **Railway does
  // not inject that variable for one**. A source-text assertion proved the line existed;
  // it could not prove the line ever produced a value.
  //
  // So the guard now points at `deployedCommit()`, whose own unit tests
  // (`deployed-commit.test.ts`) exercise every branch — platform variable, explicit
  // override, `.deploy-stamp`, junk refused, nothing at all — instead of asserting one
  // environment read that was necessary and insufficient.
  it('resolves the commit through deployedCommit(), not a lone env read', () => {
    expect(handler).toContain('deployedCommit()')
    // The RULE lives in @kind/shared so all four services answer identically; the api
    // file is only the node-side `.deploy-stamp` lookup.
    expect(RULE, 'the platform variable is still the FIRST source').toContain('RAILWAY_GIT_COMMIT_SHA')
    expect(ADAPTER, 'and the stamp ship.sh writes is finally READ').toContain('.deploy-stamp')
    expect(RULE, 'short form, so it can be eyeballed against git rev-parse --short')
      .toContain('SHORT_SHA_LENGTH = 7')
  })

  it('and actually RETURNS it — computing it and not shipping it would be the whole bug again', () => {
    // The `inviteUrl` lesson from the partner flow: asserting a value is COMPUTED is a placebo
    // if nothing carries it to the caller.
    const body = handler.slice(handler.indexOf('res.status(200).json('))
    expect(body, 'the field must be in the response body').toMatch(/^\s*commit,\s*$/m)
    expect(body, 'and its provenance, so the value can be checked').toMatch(/^\s*commitSource,\s*$/m)
  })

  it("⚠️ 'unknown' WHEN ABSENT — a build that cannot name itself must not read as one that matched", () => {
    // Off-platform (local, CI) nothing is set and no stamp exists. Inventing a value there
    // would make the verification worthless in exactly the case where it is most tempting
    // to skip it. Proven behaviourally in deployed-commit.test.ts; asserted here so the
    // constant cannot quietly become a fabricated default.
    expect(RULE).toContain("UNKNOWN_COMMIT = 'unknown'")
    expect(resolveDeployedCommit({ env: {}, readStamp: () => null }).commit).toBe('unknown')
  })

  it('the hand-typed `v` is KEPT — monitors may key on it, and it answers a different question', () => {
    // `v` says which version of this endpoint's shape was written. It was never wrong, only
    // insufficient. Removing it would break any external monitor matching on it for no gain.
    expect(handler).toContain("const v = '2026-06-22-health'")
    expect(handler).toMatch(/^\s*v,\s*$/m)
  })

  it('still ALWAYS answers 200 — this is the endpoint Railway deploys against', () => {
    // A /health that 503s on a slow DB fails the deploy health-check and rolls the deploy back.
    // Adding a field must not disturb that; the DB state is reported in the body instead.
    expect(handler).toContain('res.status(200)')
    expect(handler, 'liveness must not start failing on db state').not.toContain('res.status(503)')
  })
})

describe('the environment register stops describing something that was not happening', () => {
  it('startup-check still registers the variable, at platform level', () => {
    // Platform, not critical: Railway injects it. Grading it critical would refuse to boot
    // locally, which would be a self-inflicted outage in service of a diagnostic.
    const startup = readFileSync(join(__dirname, 'startup-check.ts'), 'utf8')
    const line = startup.split('\n').find(l => l.includes("key: 'RAILWAY_GIT_COMMIT_SHA'"))
    expect(line, 'the variable must stay registered').toBeTruthy()
    expect(line!).toContain("level: 'platform'")
  })

  it('and its description — "used in health/diagnostics" — is now TRUE', () => {
    // It said this before the change and it was not so: the value was logged at boot and
    // nowhere else. A register that describes intentions as though they were mechanisms is the
    // same defect `pecr.ts` carried for two months.
    const startup = readFileSync(join(__dirname, 'startup-check.ts'), 'utf8')
    const line = startup.split('\n').find(l => l.includes("key: 'RAILWAY_GIT_COMMIT_SHA'"))!
    expect(line).toMatch(/health/i)
    expect(RULE, 'and health genuinely uses it now').toContain('RAILWAY_GIT_COMMIT_SHA')
  })
})
