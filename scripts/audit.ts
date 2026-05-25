#!/usr/bin/env tsx
/**
 * KIND System Audit
 * Runs at 04:00 and 16:00 SAST every day via GitHub Actions.
 * Scans the codebase for bugs, schema drift, security issues,
 * missing error handling, and broken patterns.
 *
 * Exit 0 = clean | Exit 1 = CRITICAL/HIGH found
 */

import * as fs   from 'fs'
import * as path from 'path'

const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const GREEN  = '\x1b[32m'
const CYAN   = '\x1b[36m'
const BOLD   = '\x1b[1m'
const RESET  = '\x1b[0m'

interface Finding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  file:     string
  line:     number
  rule:     string
  message:  string
  snippet:  string
}

const findings: Finding[] = []

function flag(f: Finding) { findings.push(f) }

// ── Rules ─────────────────────────────────────────────────────────────────────
type Rule = {
  id:       string
  severity: Finding['severity']
  message:  string
  pattern:  RegExp
  fileGlob?: RegExp
  suppress?: (line: string) => boolean
}

const RULES: Rule[] = [
  // Schema drift — banned DB columns
  {
    id: 'SCHEMA-001', severity: 'CRITICAL',
    message: '`amount_usd` does not exist in live DB — use `amount_zar`',
    pattern: /amount_usd/,
    fileGlob: /apps\/api\/src\/routes\//,
    suppress: (l) => l.includes('metadata') || l.includes('//') || l.includes('paystack'),
  },
  // Empty catch blocks
  {
    id: 'ERR-001', severity: 'HIGH',
    message: 'Empty catch block — errors swallowed silently',
    pattern: /catch\s*(\([^)]*\))?\s*\{\s*\}/,
    fileGlob: /apps\/api\/src\//,
  },
  // String(err) produces [object Object] for non-Error throws
  {
    id: 'ERR-005', severity: 'HIGH',
    message: '`String(err)` on a non-Error throw produces "[object Object]" — use err?.message',
    pattern: /String\(err\)/,
    fileGlob: /apps\/api\/src\//,
  },
  // Dynamic await import inside handler
  {
    id: 'ERR-006', severity: 'HIGH',
    message: 'Dynamic `await import()` inside route handler — use top-level import instead',
    pattern: /await import\(/,
    fileGlob: /apps\/api\/src\/routes\//,
  },
  // process.exit in server code
  {
    id: 'MAINT-002', severity: 'HIGH',
    message: 'process.exit() in server code will kill the entire API process',
    pattern: /process\.exit\(/,
    fileGlob: /apps\/api\/src\/routes\//,
  },
  // Missing await on Supabase calls
  {
    id: 'ERR-004', severity: 'HIGH',
    message: 'Supabase call without await — result is always a Promise, errors ignored',
    pattern: /(?<!await\s)db\.from\(['"]/,
    fileGlob: /apps\/api\/src\/routes\//,
    suppress: (l) => l.trimStart().startsWith('//') || l.includes('await'),
  },
  // Hardcoded secrets
  {
    id: 'SEC-001', severity: 'CRITICAL',
    message: 'Possible hardcoded secret or API key',
    pattern: /(secret|password|api_key|apikey|token)\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}/i,
    suppress: (l) => l.includes('process.env') || l.trimStart().startsWith('//') || l.includes('placeholder') || l.includes('example'),
  },
  // Service role key in client-side code
  {
    id: 'SEC-003', severity: 'CRITICAL',
    message: 'SUPABASE_SERVICE_ROLE_KEY in portal/website — must only be in API',
    pattern: /SUPABASE_SERVICE_ROLE_KEY/,
    fileGlob: /apps\/(portal|website)\//,
  },
  // Unvalidated req.body
  {
    id: 'SEC-002', severity: 'MEDIUM',
    message: 'Direct req.body access without Zod parse — validate inputs',
    pattern: /req\.body\.[a-zA-Z]/,
    fileGlob: /apps\/api\/src\/routes\//,
    suppress: (l) => l.includes('.parse(') || l.includes('// validated') || l.trimStart().startsWith('//'),
  },
  // .single() instead of .maybeSingle()
  {
    id: 'ERR-002', severity: 'MEDIUM',
    message: '.single() throws if row is missing — prefer .maybeSingle() unless row must exist',
    pattern: /\.single\(\)/,
    fileGlob: /apps\/api\/src\/routes\//,
    suppress: (l) => l.includes('// single-ok') || l.includes('maybeSingle'),
  },
  // Fire-and-forget catch
  {
    id: 'ERR-003', severity: 'MEDIUM',
    message: '.catch(console.error) — caller never knows this failed',
    pattern: /\.catch\(console\.error\)/,
    fileGlob: /apps\/api\/src\//,
  },
  // TODO/FIXME
  {
    id: 'MAINT-001', severity: 'LOW',
    message: 'Unresolved TODO/FIXME/HACK comment',
    pattern: /\/\/\s*(TODO|FIXME|HACK|XXX):/i,
    fileGlob: /apps\/api\/src\//,
  },
  // Unsafe JSON.stringify on err
  {
    id: 'ERR-007', severity: 'LOW',
    message: 'JSON.stringify(err) — Error objects stringify as {} — use err.message',
    pattern: /JSON\.stringify\(err\)/,
    fileGlob: /apps\/api\/src\//,
  },
  // Missing error check after Supabase insert/update without .single
  {
    id: 'ERR-008', severity: 'MEDIUM',
    message: 'Supabase insert/update result destructured without checking `error`',
    pattern: /const\s*\{\s*data\s*\}\s*=\s*await\s+db\.from/,
    fileGlob: /apps\/api\/src\/routes\//,
    suppress: (l) => l.includes('error') || l.includes('// no-error-check'),
  },
  // API response missing success field
  {
    id: 'API-001', severity: 'LOW',
    message: 'res.json() without success field — all API responses should include { success }',
    pattern: /res\.json\(\{(?!.*success)/,
    fileGlob: /apps\/api\/src\/routes\//,
    suppress: (l) => l.includes('success') || l.trimStart().startsWith('//'),
  },
]

// ── File walker ───────────────────────────────────────────────────────────────
function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', 'dist', '.turbo', 'build', '.git'].includes(entry.name)) {
        results.push(...walkDir(full, exts))
      }
    } else if (exts.some(e => entry.name.endsWith(e))) {
      results.push(full)
    }
  }
  return results
}

// ── Scan file ─────────────────────────────────────────────────────────────────
function scanFile(filePath: string) {
  const relative = filePath.replace(process.cwd() + '/', '')
  const lines    = fs.readFileSync(filePath, 'utf-8').split('\n')

  for (const rule of RULES) {
    if (rule.fileGlob && !rule.fileGlob.test(relative)) continue
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!rule.pattern.test(line)) continue
      if (rule.suppress?.(line)) continue
      flag({ severity: rule.severity, file: relative, line: i + 1, rule: rule.id, message: rule.message, snippet: line.trim().slice(0, 120) })
    }
  }
}

// ── Schema drift check ────────────────────────────────────────────────────────
function checkSchemaDrift() {
  // Columns known to not exist in live DB — any reference is a crash
  const banned = [
    { col: 'amount_usd',   table: 'subscriptions', note: 'removed — use amount_zar' },
  ]
  const dirs = [
    path.join(process.cwd(), 'apps/api/src/routes'),
    path.join(process.cwd(), 'apps/api/src/lib'),
  ]
  for (const { col, table, note } of banned) {
    for (const dir of dirs) {
      for (const file of walkDir(dir, ['.ts'])) {
        const content  = fs.readFileSync(file, 'utf-8')
        const relative = file.replace(process.cwd() + '/', '')
        const lines    = content.split('\n')
        lines.forEach((line, i) => {
          if (new RegExp(col).test(line) && !line.includes('metadata') && !line.includes('//') && !line.includes('paystack')) {
            flag({ severity: 'CRITICAL', file: relative, line: i + 1, rule: 'SCHEMA-DRIFT',
              message: `Banned column \`${col}\` on \`${table}\` table — ${note}`, snippet: line.trim().slice(0, 120) })
          }
        })
      }
    }
  }
}

// ── Route ordering check ──────────────────────────────────────────────────────
function checkRouteOrdering() {
  // Specific path routes must come before wildcard /:id routes
  const routeFiles = walkDir(path.join(process.cwd(), 'apps/api/src/routes'), ['.ts'])
  for (const file of routeFiles) {
    const lines   = fs.readFileSync(file, 'utf-8').split('\n')
    const relative = file.replace(process.cwd() + '/', '')
    let wildcardLine = -1
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (/Router\.\w+\(['"]\/:[a-z]/.test(line) && wildcardLine === -1) wildcardLine = i
      if (wildcardLine > -1 && /Router\.\w+\(['"]\/[a-z]/.test(line) && !/Router\.\w+\(['"]\/:[a-z]/.test(line)) {
        flag({ severity: 'HIGH', file: relative, line: i + 1, rule: 'ROUTE-001',
          message: `Specific route defined AFTER wildcard /:id route (line ${wildcardLine + 1}) — Express will never reach this`,
          snippet: lines[i].trim().slice(0, 120) })
      }
    }
  }
}

// ── Type safety check ─────────────────────────────────────────────────────────
function checkTypeSafety() {
  // any cast in route handlers is risky
  const files = walkDir(path.join(process.cwd(), 'apps/api/src/routes'), ['.ts'])
  for (const file of files) {
    const lines    = fs.readFileSync(file, 'utf-8').split('\n')
    const relative = file.replace(process.cwd() + '/', '')
    lines.forEach((line, i) => {
      if (/as any\b/.test(line) && !line.trimStart().startsWith('//')) {
        flag({ severity: 'LOW', file: relative, line: i + 1, rule: 'TYPE-001',
          message: '`as any` cast bypasses type safety', snippet: line.trim().slice(0, 120) })
      }
    })
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const now  = new Date()
  const sast = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const dateStr = sast.toISOString().slice(0, 10)
  const timeStr = sast.toISOString().slice(11, 16) + ' SAST'
  const start = Date.now()

  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${RESET}`)
  console.log(`${BOLD}${CYAN}║   K.I.N.D  System Audit  —  ${dateStr}  ${timeStr}   ║${RESET}`)
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${RESET}\n`)

  const root = process.cwd()
  const files = [
    ...walkDir(path.join(root, 'apps/api/src'),    ['.ts']),
    ...walkDir(path.join(root, 'apps/portal/src'), ['.ts', '.tsx']),
    ...walkDir(path.join(root, 'apps/admin/src'),  ['.ts', '.tsx']),
  ]

  console.log(`Scanning ${files.length} files…\n`)
  for (const f of files) scanFile(f)

  checkSchemaDrift()
  checkRouteOrdering()
  checkTypeSafety()

  const elapsed   = ((Date.now() - start) / 1000).toFixed(1)
  const criticals = findings.filter(f => f.severity === 'CRITICAL')
  const highs     = findings.filter(f => f.severity === 'HIGH')
  const mediums   = findings.filter(f => f.severity === 'MEDIUM')
  const lows      = findings.filter(f => f.severity === 'LOW')

  const SEV: Record<string, string> = { CRITICAL: RED, HIGH: YELLOW, MEDIUM: CYAN, LOW: RESET }

  if (findings.length === 0) {
    console.log(`${GREEN}${BOLD}✅ CLEAN — no issues found${RESET}  (${elapsed}s)\n`)
    process.exit(0)
  }

  for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const) {
    const group = findings.filter(f => f.severity === sev)
    if (!group.length) continue
    console.log(`${SEV[sev]}${BOLD}── ${sev} (${group.length}) ──────────────────────────────────────────────${RESET}`)
    for (const f of group) {
      const loc = f.line > 0 ? `${f.file}:${f.line}` : f.file
      console.log(`  ${SEV[sev]}[${f.rule}]${RESET} ${loc}`)
      console.log(`         ${f.message}`)
      if (f.snippet) console.log(`         ${BOLD}>${RESET} ${f.snippet}`)
      console.log()
    }
  }

  console.log(`${BOLD}Summary:${RESET}  🔴 ${criticals.length} critical  🟡 ${highs.length} high  🔵 ${mediums.length} medium  ⚪ ${lows.length} low  (${elapsed}s)`)
  console.log()

  if (criticals.length > 0 || highs.length > 0) {
    console.log(`${RED}${BOLD}✗ AUDIT FAILED — CRITICAL/HIGH issues must be fixed${RESET}\n`)
    process.exit(1)
  }

  console.log(`${YELLOW}${BOLD}⚠  AUDIT WARNED — MEDIUM/LOW issues found${RESET}\n`)
  process.exit(0)
}

main().catch(err => {
  console.error('Audit script crashed:', err)
  process.exit(1)
})
