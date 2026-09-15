import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE EVAL SPENDS REAL MONEY AND TOUCHES THE REAL NETWORK. THE GATE MAY NEVER RUN IT.
//
// `scripts/check.sh` is the only thing standing between a change and the live site (there
// has been no CI since 3 Jul). It must stay deterministic, free and offline — R66 goes as
// far as DELETING every provider key before a single test runs, so the suite is structurally
// incapable of reaching a provider.
//
// The live conversation eval is the deliberate exception, and the only thing keeping it out
// of the gate is a naming convention: vitest's default include is `**/*.{test,spec}.*`, and
// the eval files end `.eval.ts`. A convention nothing enforces is a convention that lasts
// until somebody renames a file — so this enforces it.
//
// ⚠️ THIS TEST IS ITSELF IN THE GATE, which is the point: the day someone adds
// `milla.eval.test.ts`, or points the root config's `include` at eval files, `check.sh` goes
// red BEFORE a deploy discovers it by spending money.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = process.cwd()
const EVAL_DIR = join(REPO, 'apps/api/src/eval')

describe('🛑 the live eval cannot be run by the gate', () => {
  it('every file in the eval directory ends .eval.ts — never .test.ts or .spec.ts', () => {
    const files = readdirSync(EVAL_DIR).filter(f => f.endsWith('.ts'))
    expect(files.length, 'the eval directory is empty').toBeGreaterThan(0)
    const runnable = files.filter(f => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f))
    expect(runnable, `these would be picked up by the gate: ${runnable.join(', ')}`).toEqual([])
    // The harness is shared code, not a case; everything else is a case.
    const cases = files.filter(f => f !== 'harness.ts')
    for (const f of cases) {
      expect(f, `${f} is in the eval directory but is not a .eval.ts file`).toMatch(/\.eval\.ts$/)
    }
  })

  it('🛑 the root vitest config does not widen `include` to reach them', () => {
    const cfg = readFileSync(join(REPO, 'vitest.config.ts'), 'utf8')
    const code = cfg.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n')
    expect(code, 'the root config now sets `include` — check it cannot reach *.eval.ts')
      .not.toMatch(/\binclude\s*:/)
    expect(code).not.toContain('eval')
  })

  it('🛑 check.sh never calls the eval, by script or by glob', () => {
    const gate = readFileSync(join(REPO, 'scripts/check.sh'), 'utf8')
    const code = gate.split('\n').filter(l => !l.trimStart().startsWith('#')).join('\n')
    expect(code, 'the gate now runs the live eval — it would spend money to deploy')
      .not.toContain('conversation-eval')
    expect(code).not.toContain('.eval.ts')
    expect(code).not.toContain('ANTHROPIC_API_KEY')
  })

  it('🛑 AND NO EVAL FILE CAN READ A KEY INTO THE OUTPUT', () => {
    // The founder's standing constraint: an API key never reaches code, the repo, or output.
    // The eval hands `process.env.ANTHROPIC_API_KEY` straight to the SDK constructor and
    // otherwise only ever asks whether it is PRESENT.
    for (const f of readdirSync(EVAL_DIR).filter(n => n.endsWith('.ts'))) {
      const src = readFileSync(join(EVAL_DIR, f), 'utf8')
      const code = src.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n')
      for (const leak of ['console.log(process.env', 'console.error(process.env', 'JSON.stringify(process.env']) {
        expect(code, `${f} could print the environment`).not.toContain(leak)
      }
      // sk-… must never be written down anywhere, even as an example.
      expect(code, `${f} contains something shaped like a key`).not.toMatch(/sk-ant-[A-Za-z0-9_-]/)
    }
  })

  it('the runner exists, refuses without a key, and says NOT RUN rather than passing', () => {
    const sh = join(REPO, 'scripts/conversation-eval.sh')
    expect(existsSync(sh), 'scripts/conversation-eval.sh is gone').toBe(true)
    const src = readFileSync(sh, 'utf8')
    expect(src).toContain('NOT RUN — ANTHROPIC_API_KEY unavailable')
    // ⚠️ IT EXITS 0 ON NO KEY, DELIBERATELY. A missing key is not a failure of the product;
    // it is the absence of evidence, and the LINE says so. Exiting non-zero would push
    // somebody to "fix" it by wiring a key into the gate, which is the thing this prevents.
    expect(src).toMatch(/NOT RUN[\s\S]{0,220}exit 0/)
  })
})
