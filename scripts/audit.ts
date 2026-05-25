#!/usr/bin/env tsx
/**
 * KIND Daily System Audit
 * Runs at 04:00 AM every day via GitHub Actions.
 * Scans the codebase for known failure patterns, schema drift risks,
 * missing error handling, and security issues.
 *
 * Exit code 0 = clean
 * Exit code 1 = issues found (blocks deploy on CI)
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

// ── Colour helpers ────────────────────────────────────────────────────────────
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const GREEN  = '\x1b[32m'
const CYAN   = '\x1b[36m'
const BOLD   = '\x1b[1m'
const RESET  = '\x1b[0m'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Finding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  file:     string
  line:     number
  rule:     string
  message:  string
  snippet:  string
}

const findings: Finding[] = []

// ── Rules ─────────────────────────────────────────────────────────────────────
type Rule = {
  id:       string
  severity: Finding['severity']
  message:  string
  pattern:  RegExp
  // files that match these globs are checked (undefined = all .ts/.tsx)
  fileGlob?: RegExp
  // return true to suppress (e.g. if the fix is already present on same line)
  suppress?: (line: string) => boolean
}

const RULES: Rule[] = [
  // ── Schema: banned column references ────────────────────────────────────
  {
    id:       'SCHEMA-001',
    severity: 'CRITICAL',
    message:  '`amount_usd` column does not exist in the live DB — use `amount_zar` instead',
    pattern:  /amount_usd/,
    fileGlob: /apps\/api\/src\/routes\//,
  },
  // ── Empty catch blocks ───────────────────────────────────────────────────
  {
    id:       'ERR-001',
    severity: 'HIGH',
    message:  'Empty catch block swallows errors silently',
    pattern:  /\}\s*catch\s*\(\s*\)\s*\{?\s*\}|catch\s*\{\s*\}/,
    fileGlob: /apps\/api\/src\//,
  },
  // ── Unguarded .single() ──────────────────────────────────────────────────
  {
    id:       'ERR-002',
    severity: 'MEDIUM',
    message:  '.single() will throw if row missing — prefer .maybeSingle()',
    pattern:  /\.single\(\)/,
    fileGlob: /apps\/api\/src\/routes\//,
    suppress: (line) => line.includes('// single-ok') || line.includes('maybeSingle'),
  },
  // ── console.error only in catch (no re-throw or response) ────────────────
  {
    id:       'ERR-003',
    severity: 'MEDIUM',
    message:  'Fire-and-forget .catch(console.error) — failure is silent to caller',
    pattern:  /\.catch\(console\.error\)/,
    fileGlob: /apps\/api\/src\//,
  },
  // ── Hardcoded secrets ────────────────────────────────────────────────────
  {
    id:       'SEC-001',
    severity: 'CRITICAL',
    message:  'Possible hardcoded secret or token',
    pattern:  /(secret|password|api_key|apikey|token)\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}/i,
    suppress: (line) => line.includes('process.env') || line.includes('//') || line.includes('placeholder'),
  },
  // ── TODO / FIXME left in production code ────────────────────────────────
  {
    id:       'MAINT-001',
    severity: 'LOW',
    message:  'Unresolved TODO/FIXME/HACK comment',
    pattern:  /\/\/\s*(TODO|FIXME|HACK|XXX):/i,
    fileGlob: /apps\/api\/src\//,
  },
  // ── process.exit() outside scripts ──────────────────────────────────────
  {
    id:       'MAINT-002',
    severity: 'HIGH',
    message:  'process.exit() in server code will kill the entire API process',
    pattern:  /process\.exit\(/,
    fileGlob: /apps\/api\/src\/routes\//,
  },
  // ── Unvalidated req.body access ─────────────────────────────────────────
  {
    id:       'SEC-002',
    severity: 'MEDIUM',
    message:  'Direct req.body access without Zod parse — validate inputs',
    pattern:  /req\.body\.[a-zA-Z]/,
    fileGlob: /apps\/api\/src\/routes\//,
    suppress: (line) => line.includes('.parse(') || line.includes('// validated'),
  },
  // ── Supabase service-role key leaking to client ──────────────────────────
  {
    id:       'SEC-003',
    severity: 'CRITICAL',
    message:  'SUPABASE_SERVICE_ROLE_KEY referenced in portal/website (client-side) — must only be in API',
    pattern:  /SUPABASE_SERVICE_ROLE_KEY/,
    fileGlob: /apps\/(portal|website)\//,
  },
  // ── Missing await on async Supabase calls ────────────────────────────────
  {
    id:       'ERR-004',
    severity: 'HIGH',
    message:  'Supabase call without await — result will always be a Promise, errors ignored',
    pattern:  /(?<!await\s)db\.from\(['"]/,
    fileGlob: /apps\/api\/src\/routes\//,
    suppress: (line) => line.trimStart().startsWith('//') || line.includes('await'),
  },
]

// ── File walker ───────────────────────────────────────────────────────────────
function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', 'dist', '.turbo', 'build'].includes(entry.name)) {
        results.push(...walkDir(full, exts))
      }
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      results.push(full)
    }
  }
  return results
}

// ── Scan one file ─────────────────────────────────────────────────────────────
async function scanFile(filePath: string): Promise<void> {
  const relative = filePath.replace(process.cwd() + '/', '')
  const lines    = fs.readFileSync(filePath, 'utf-8').split('\n')

  for (const rule of RULES) {
    if (rule.fileGlob && !rule.fileGlob.test(relative)) continue

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!rule.pattern.test(line)) continue
      if (rule.suppress && rule.suppress(line)) continue

      findings.push({
        severity: rule.severity,
        file:     relative,
        line:     i + 1,
        rule:     rule.id,
        message:  rule.message,
        snippet:  line.trim().slice(0, 120),
      })
    }
  }
}

// ── Env var checker ───────────────────────────────────────────────────────────
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_SECRET_KEY',
  'ANTHROPIC_API_KEY',
  'RESEND_API_KEY',
  'FOUNDER_EMAIL',
]

function checkEnvFile() {
  const envPath = path.join(process.cwd(), 'apps/api/.env')
  if (!fs.existsSync(envPath)) {
    console.log(`${YELLOW}⚠  No apps/api/.env found — skipping env var check (CI is fine)${RESET}`)
    return
  }
  const content = fs.readFileSync(envPath, 'utf-8')
  for (const key of REQUIRED_ENV_VARS) {
    if (!content.includes(`${key}=`)) {
      findings.push({
        severity: 'HIGH',
        file:     'apps/api/.env',
        line:     0,
        rule:     'ENV-001',
        message:  `Required env var ${key} is missing`,
        snippet:  `${key} not found in .env`,
      })
    }
  }
}

// ── Schema drift check ────────────────────────────────────────────────────────
function checkSchemaDrift() {
  // Known banned column references (columns removed from live DB)
  const bannedColumns = ['amount_usd']
  const routeDir = path.join(process.cwd(), 'apps/api/src/routes')
  if (!fs.existsSync(routeDir)) return

  // Already caught by RULES above — this is a belt-and-suspenders check
  // that specifically counts occurrences and surfaces a summary
  let total = 0
  for (const file of walkDir(routeDir, ['.ts'])) {
    const content = fs.readFileSync(file, 'utf-8')
    for (const col of bannedColumns) {
      const count = (content.match(new RegExp(col, 'g')) ?? []).length
      total += count
    }
  }
  if (total > 0) {
    findings.push({
      severity: 'CRITICAL',
      file:     'apps/api/src/routes (multiple)',
      line:     0,
      rule:     'SCHEMA-DRIFT',
      message:  `Schema drift: ${total} reference(s) to banned columns found across routes`,
      snippet:  `Run 'grep -rn "amount_usd" apps/api/src/routes/' to locate all`,
    })
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const root  = process.cwd()
  const start = Date.now()

  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗${RESET}`)
  console.log(`${BOLD}${CYAN}║         K.I.N.D  Daily System Audit  —  ${new Date().toISOString().slice(0,10)}        ║${RESET}`)
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════════╝${RESET}\n`)

  // Collect files
  const apiFiles    = walkDir(path.join(root, 'apps/api/src'),    ['.ts'])
  const portalFiles = walkDir(path.join(root, 'apps/portal/src'), ['.ts', '.tsx'])
  const adminFiles  = walkDir(path.join(root, 'apps/admin/src'),  ['.ts', '.tsx'])
  const allFiles    = [...apiFiles, ...portalFiles, ...adminFiles]

  console.log(`Scanning ${allFiles.length} files…`)

  // Run file scans
  for (const f of allFiles) await scanFile(f)

  // Specialised checks
  checkEnvFile()
  checkSchemaDrift()

  // ── Report ─────────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)

  const criticals = findings.filter(f => f.severity === 'CRITICAL')
  const highs     = findings.filter(f => f.severity === 'HIGH')
  const mediums   = findings.filter(f => f.severity === 'MEDIUM')
  const lows      = findings.filter(f => f.severity === 'LOW')

  const SEV_COLOR: Record<string, string> = {
    CRITICAL: RED,
    HIGH:     YELLOW,
    MEDIUM:   CYAN,
    LOW:      RESET,
  }

  if (findings.length === 0) {
    console.log(`\n${GREEN}${BOLD}✓ CLEAN — no issues found${RESET}  (${elapsed}s)\n`)
    process.exit(0)
  }

  console.log(`\nFound ${findings.length} issue(s) in ${elapsed}s:\n`)

  // Group by severity
  for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const) {
    const group = findings.filter(f => f.severity === sev)
    if (!group.length) continue
    console.log(`${SEV_COLOR[sev]}${BOLD}── ${sev} (${group.length}) ──────────────────────────────────────────${RESET}`)
    for (const f of group) {
      const loc = f.line > 0 ? `${f.file}:${f.line}` : f.file
      console.log(`  ${SEV_COLOR[sev]}[${f.rule}]${RESET} ${loc}`)
      console.log(`         ${f.message}`)
      if (f.snippet) console.log(`         ${BOLD}>${RESET} ${f.snippet}`)
      console.log()
    }
  }

  // Summary
  console.log(`${BOLD}Summary:${RESET}  🔴 ${criticals.length} critical  🟡 ${highs.length} high  🔵 ${mediums.length} medium  ⚪ ${lows.length} low`)
  console.log()

  // Fail CI on any CRITICAL or HIGH
  if (criticals.length > 0 || highs.length > 0) {
    console.log(`${RED}${BOLD}✗ AUDIT FAILED — fix CRITICAL/HIGH issues before merging${RESET}\n`)
    process.exit(1)
  } else {
    console.log(`${YELLOW}${BOLD}⚠ AUDIT WARNED — MEDIUM/LOW issues found, review recommended${RESET}\n`)
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Audit script crashed:', err)
  process.exit(1)
})
