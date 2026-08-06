// THE REPO-WIDE GUARDS — #642, and they exist because 2,105 tests missed ten live defects.
//
// #599's guard covered ONE table. The audit that followed compared every column the code
// names against every migration, every frontend call against every route, and every `.rpc()`
// against every function — and found the CSV importer, the website form, the chat-visitor
// path, the client's own sent-counter, the "contacted" tick, the A/B winner check, the
// adaptive send limiter, every morning brief's reply rate, suggest-campaign's ICP context,
// the low-credit cron and the admin usage chart. All broken. All silent. All green.
//
// That audit ran as a scratchpad script and would have died with the session. This is it,
// kept.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import {
  declaredColumns, declaredFunctions, stripSqlComments, stripJsComments,
  columnUses, tablesUsed, rpcCalls, routeRegistrations, callResolves, isWrapperTemplate,
} from './schema-truth'

const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

const MIGRATION_DIRS = ['supabase/migrations', 'apps/api/src/migrations', 'packages/db/src/migrations']
const SNAPSHOTS = ['packages/db/src/schema.sql', 'supabase/staging-schema.sql', 'supabase/MASTER_SCHEMA.sql']

function walk(dir: string, test: (f: string) => boolean, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) { if (!['node_modules', '.next', 'dist'].includes(entry)) walk(p, test, out) }
    else if (test(p)) out.push(p)
  }
  return out
}

const sqlSources = [
  ...MIGRATION_DIRS.flatMap(d => readdirSync(join(REPO, d)).filter(f => f.endsWith('.sql')).map(f => read(`${d}/${f}`))),
  ...SNAPSHOTS.map(read),
  read('apps/api/src/lib/pending-migrations.ts'),   // the ONLY list that executes
]
const declared = declaredColumns(sqlSources)
const functions = declaredFunctions(sqlSources)

/**
 * The two SCANNERS in this repo, excluded from the sweep — and only these two.
 *
 * A scanner's documentation necessarily contains example queries (``.rpc('name')``,
 * ``.from('table').insert({ a, b })``), so sweeping one means the instrument reports its own
 * examples as findings. Not a new discovery: `schema-drift.ts` once reported **a table called
 * `table`** out of its own doc comment, and this guard reported the same thing on its first
 * run, plus an RPC called `name` out of its own.
 *
 * ⚠️ Both stripped-comment implementations in this repo fail on that particular file, so the
 * exclusion is deliberate rather than a workaround for a bug I could have fixed — and it is
 * SAFE ONLY because neither file touches a database, which the test below asserts rather than
 * assumes. Excluding anything that DOES query would be a hole in the guard, so this list is
 * two named files and must never become a pattern.
 */
const SCANNERS = ['lib/schema-truth.ts', 'lib/schema-drift.ts']

const codeFiles = ['apps/api/src', 'apps/portal/src', 'apps/admin/src']
  .flatMap(d => walk(join(REPO, d), f => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)))
  .filter(f => !SCANNERS.some(sc => f.endsWith(sc)))

/**
 * The columns and tables the repo demonstrably does NOT declare and which are NOT being
 * fixed in this pass — every one already written up as a ❓ unknowable in
 * `docs/SCHEMA-DRIFT.md`, with a reason.
 *
 * ⚠️ THIS LIST MAY ONLY EVER SHRINK, AND ONLY BY SOMETHING BEING CREATED. Adding a name here
 * to make the build pass is how the guard becomes decoration — that is the whole failure mode
 * it was written against. Two have already left it the right way (`app_settings` #627,
 * `leads.source` #599); these are what remain.
 */
const KNOWN_UNDECLARED: Record<string, string> = {
  'whatsapp_messages':               'A table no migration creates. WhatsApp is parked (WHATSAPP_TOKEN optional, #561); nothing depends on it today.',
  'subscribers':                     'The website newsletter table. Nothing creates it — if it is absent in production, signups are being lost silently. Probe before launch.',
  'opt_out_blocklist.whatsapp_number': 'On the suppression table every send checks. Demonstrably works in production, so production has a column no migration in this repo ever created.',
  'clients.whatsapp_phone_number_id': 'Routes an inbound WhatsApp webhook to its client. Same parked feature as whatsapp_messages — no migration creates it, and nothing depends on it while WhatsApp is off.',
  'figsy_sessions':                  'NOT undeclared any more — kept as a named entry so the fix is visible: status.ts now counts figsy_chat_messages. Delete this line once nothing references it.',
}

describe('the parsers themselves work — a broken parser makes every guard below vacuous', () => {
  it('reads columns out of CREATE TABLE, ignoring table-level constraints', () => {
    const d = declaredColumns([`create table if not exists public.t (
      id uuid primary key, name text not null, score integer check (score >= 0 and score <= 100),
      constraint t_uniq unique (id, name)
    );`])
    expect([...d.get('t')!].sort()).toEqual(['id', 'name', 'score'])
  })

  it('reads columns out of ALTER TABLE … ADD COLUMN IF NOT EXISTS', () => {
    const d = declaredColumns([`alter table public.t add column if not exists a text, add column if not exists b integer;`])
    expect([...d.get('t')!].sort()).toEqual(['a', 'b'])
  })

  it('a commented-out column is NOT declared', () => {
    const d = declaredColumns([`alter table public.t add column if not exists a text; -- add column if not exists ghost text`])
    expect(d.get('t')!.has('ghost')).toBe(false)
  })

  it('splits on commas OUTSIDE parentheses only — a default with a comma must not clip', () => {
    const d = declaredColumns([`create table t (
      id uuid default replace(gen_random_uuid()::text, '-', ''), tail text
    );`])
    expect([...d.get('t')!].sort()).toEqual(['id', 'tail'])
  })

  it('reads select lists, write keys and filters — the three ways a column reaches Postgres', () => {
    const uses = columnUses(`
      db.from('t').select('a, b:c, rel(x, y)')
      db.from('t').insert({ d: 1, nested: { inner: 2 } })
      db.from('t').select('*').eq('e', 1).order('f')
    `)
    const byKind = (k: string) => uses.filter(u => u.kind.startsWith(k)).map(u => u.column).sort()
    expect(byKind('select')).toEqual(['a', 'c'])          // alias resolves to the real column; rel(...) stripped
    expect(byKind('insert')).toEqual(['d', 'nested'])     // depth-1 keys only — `inner` belongs to the JSON
    expect(byKind('filter')).toEqual(['e', 'f'])
  })

  it('prose inside a write is not a column — the two false findings this guard made first', () => {
    const uses = columnUses(`
      db.from('t').insert({ reason: 'New ICP: fintech founders, SA' })
      db.from('u').insert({ note: \`Inbound web form: "\${x}"\` })
    `)
    expect(uses.map(u => u.column).sort()).toEqual(['note', 'reason'])
  })

  it('a ternary else-branch is not a column', () => {
    // `next_send_at: isDemo ? null : new Date()` reported a column called `null`.
    const uses = columnUses(`db.from('t').insert({ next_send_at: isDemo ? null : d, step: 0 })`)
    expect(uses.map(u => u.column).sort()).toEqual(['next_send_at', 'step'])
  })

  it('a nested template literal does not blind the comment stripper', () => {
    // The exact shape that made an earlier sweep go blind mid-file, inventing one column and
    // hiding another. If this regresses, everything below silently stops checking.
    const src = stripJsComments([
      'const t = `a ${x ? `inner ${y}` : ""} b`',
      "// db.from('ghost').insert({ x: 1 })",
      "db.from('real').insert({ col_a: 1 })",
    ].join('\n'))
    expect(tablesUsed(src).has('ghost')).toBe(false)
    expect(tablesUsed(src).has('real')).toBe(true)
  })

  it('a route quoted in a comment is not a registration', () => {
    expect(routeRegistrations(`// figsyRouter.get('/activity', h)`)).toEqual([])
    expect(routeRegistrations(`figsyRouter.get('/activity', h)`)).toHaveLength(1)
  })

  it('a call with a ${…} hole resolves against a :param route', () => {
    expect(callResolves('/operator/queue/XSEGX/approve', ['/operator/queue/:id/approve'])).toBe(true)
    expect(callResolves('/operator/queue/XSEGX/XSEGX', ['/operator/queue/:id/approve'])).toBe(true)
  })

  it('#640s double prefix does NOT resolve — the shape this guard is named for', () => {
    expect(callResolves('/admin/admin/clients/XSEGX/usage', ['/admin/clients/:id/usage'])).toBe(false)
    expect(callResolves('/admin/clients/XSEGX/usage', ['/admin/clients/:id/usage'])).toBe(true)
  })

  it('a block comment keeps its newlines so reported line numbers stay true', () => {
    const out = stripJsComments('a\n/* x\ny\nz */\nb')
    expect(out.split('\n').length).toBe('a\n/* x\ny\nz */\nb'.split('\n').length)
    expect(out).not.toContain('y')
  })

  it('a wrapper template is recognised so it is skipped rather than reported', () => {
    expect(isWrapperTemplate('/admin/XSEGX')).toBe(true)       // fetch(`/api/proxy/admin/${path}`)
    expect(isWrapperTemplate('/lookalike/best-client')).toBe(false)
  })

  it('a plain `router` (default-export files) IS a registration', () => {
    // The bug this guard hit on its own first run: a pattern demanding `<x>Router` skipped
    // every default-export route file and reported eleven live routes as unserved.
    expect(routeRegistrations(`router.get('/best-client', h)`)).toHaveLength(1)
    expect(routeRegistrations(`figsyRouter.get('/x', h)`)).toHaveLength(1)
  })

  it('BOTH excluded scanners really do touch no database — the exclusion rests on this', () => {
    // If either ever gains a query, it must go back into the sweep, and this fails until it does.
    for (const sc of SCANNERS) {
      const executable = stripJsComments(read(`apps/api/src/${sc}`))
      expect(executable, `${sc} imports a db client`).not.toContain('@kind/db')
      expect(executable, `${sc} calls db.`).not.toMatch(/\bdb\s*\.\s*(from|rpc)\b/)
    }
  })

  it('the exclusion list is exactly two named scanners, never a pattern', () => {
    expect(SCANNERS).toHaveLength(2)
    for (const sc of SCANNERS) expect(sc).toMatch(/^lib\/[a-z-]+\.ts$/)
  })

  it('the real schema parse is not empty — the guards below would otherwise pass on nothing', () => {
    expect(declared.size).toBeGreaterThan(60)
    for (const known of ['clients', 'leads', 'figsy_campaigns', 'figsy_sent_emails', 'credit_transactions']) {
      expect(declared.has(known), `schema parse lost the table '${known}'`).toBe(true)
    }
    expect(declared.get('leads')!.has('source'), 'leads.source (#599)').toBe(true)
    expect(declared.get('figsy_sent_emails')!.has('client_id'), 'figsy_sent_emails.client_id (#637)').toBe(true)
    expect(codeFiles.length).toBeGreaterThan(200)
  })
})

describe('#642 — every column the code names exists in the schema', () => {
  it('no query anywhere reads or writes a column nothing creates', () => {
    const violations: string[] = []
    for (const file of codeFiles) {
      const src = stripJsComments(readFileSync(file, 'utf8'))
      const rel = file.slice(REPO.length + 1)
      for (const t of tablesUsed(src)) {
        if (!declared.has(t) && !(t in KNOWN_UNDECLARED)) violations.push(`${rel} — table '${t}' is created by nothing`)
      }
      for (const u of columnUses(src)) {
        if (!declared.has(u.table)) continue                       // reported above, once
        if (declared.get(u.table)!.has(u.column)) continue
        if (`${u.table}.${u.column}` in KNOWN_UNDECLARED) continue
        const line = src.slice(0, u.index).split('\n').length
        violations.push(`${rel}:${line} — ${u.kind} of ${u.table}.${u.column}, which no migration creates`)
      }
    }
    expect(
      [...new Set(violations)],
      'supabase-js returns { error } rather than throwing and these call sites read `.data ?? []`, ' +
      'so a REJECTED query renders exactly like an empty one. The feature does not break — it goes ' +
      'quiet, and no gate notices. Either add the column in a migration (both homes) or fix the name.',
    ).toEqual([])
  })

  it('the allowlist only holds names that are genuinely still undeclared', () => {
    // Stops the list rotting into a place where fixed things linger and real ones hide.
    for (const key of Object.keys(KNOWN_UNDECLARED)) {
      if (key === 'figsy_sessions') continue   // documented above: kept as a visible tombstone
      const [table, column] = key.split('.')
      const stillMissing = column ? !declared.get(table)?.has(column) : !declared.has(table)
      expect(stillMissing, `${key} IS declared now — remove it from KNOWN_UNDECLARED`).toBe(true)
    }
  })
})

describe('#642 — every button reaches a route that exists', () => {
  const routes: string[] = (() => {
    const idx = read('apps/api/src/index.ts')
    const varFile: Record<string, { file: string; isDefault: boolean }> = {}
    for (const m of idx.matchAll(/import\s*(?:\{([^}]+)\}|(\w+))\s*from\s*'\.\/routes\/([^']+)'/g)) {
      const file = `apps/api/src/routes/${m[3]}.ts`
      if (m[2]) varFile[m[2]] = { file, isDefault: true }
      if (m[1]) for (const n of m[1].split(',').map(x => x.trim().split(' as ').pop()!.trim())) varFile[n] = { file, isDefault: false }
    }
    const mountsByFile: Record<string, { prefix: string; v: string; isDefault: boolean }[]> = {}
    for (const m of idx.matchAll(/app\.use\('([^']+)',\s*(\w+)\)/g)) {
      const vf = varFile[m[2]]
      if (vf) (mountsByFile[vf.file] ??= []).push({ prefix: m[1], v: m[2], isDefault: vf.isDefault })
    }
    const all: string[] = []
    for (const [file, mounts] of Object.entries(mountsByFile)) {
      const src = read(file)
      const defaultVar = src.match(/export default (\w+)/)?.[1]
      const sub: Record<string, { parent: string; at: string }[]> = {}
      for (const m of src.matchAll(/(\w+)\.use\('([^']*)',\s*(\w+)\)/g)) (sub[m[3]] ??= []).push({ parent: m[1], at: m[2] })
      const prefixesFor = (v: string, seen = new Set<string>()): string[] => {
        if (seen.has(v)) return []
        seen.add(v)
        const direct = mounts.filter(mt => mt.v === v || (mt.isDefault && v === defaultVar)).map(mt => mt.prefix)
        const viaParent = (sub[v] ?? []).flatMap(sm => prefixesFor(sm.parent, seen).map(p => (p + sm.at).replace(/\/+$/, '') || p))
        return [...direct, ...viaParent]
      }
      for (const r of routeRegistrations(src)) {
        for (const pre of prefixesFor(r.router)) all.push((pre + (r.path === '/' ? '' : r.path)).replace(/\/{2,}/g, '/'))
      }
    }
    for (const m of idx.matchAll(/^app\.(get|post|put|patch|delete)\(\s*'([^']+)'/gm)) all.push(m[2])
    return all
  })()

  it('the route map is real', () => {
    expect(routes.length).toBeGreaterThan(300)
    expect(routes).toContain('/admin/clients/:id/usage')
  })

  it('every admin proxy call and portal apiFetch call reaches a registered route', () => {
    const norm = (s: string) => (s.replace(/\$\{[^}]*\}/g, 'XSEGX').replace(/\/+$/, '') || '/')
    const violations: string[] = []
    const check = (p: string, rel: string, line: number) => {
      if (p === '/' || p.startsWith('XSEGX') || isWrapperTemplate(p)) return
      if (!callResolves(p, routes)) violations.push(`${rel}:${line} calls ${p.replace(/XSEGX/g, '${…}')}, which no route serves`)
    }
    // Comments stripped FIRST — a path quoted in a comment is not a call. This guard caught
    // that on its own first run: the explanatory comment written on the #640 fix quotes
    // `/api/proxy/admin/`, and the scan reported it as a dead button.
    for (const file of walk(join(REPO, 'apps/admin/src'), f => /\.tsx?$/.test(f) && !/\.test\./.test(f))) {
      const src = stripJsComments(readFileSync(file, 'utf8')); const rel = file.slice(REPO.length + 1)
      for (const m of src.matchAll(/['"`]\/api\/proxy\/([^'"`?\s]+)/g)) check('/' + norm(m[1]), rel, src.slice(0, m.index).split('\n').length)
    }
    for (const file of walk(join(REPO, 'apps/portal/src'), f => /\.tsx?$/.test(f) && !/\.test\./.test(f))) {
      const src = stripJsComments(readFileSync(file, 'utf8')); const rel = file.slice(REPO.length + 1)
      for (const m of src.matchAll(/apiFetch(?:<[^>]*>)?\(\s*[`'"]([^`'"?]+)/g)) check(norm(m[1]), rel, src.slice(0, m.index).split('\n').length)
      for (const m of src.matchAll(/fetch\(\s*`\$\{API_URL\}([^`?]+)`/g)) check(norm(m[1]), rel, src.slice(0, m.index).split('\n').length)
    }
    expect(
      [...new Set(violations)],
      'A button that calls a route nobody serves fails as a 404 the user reads as "nothing happened" — ' +
      'the admin Usage chart did exactly that from the day it was written (#640).',
    ).toEqual([])
  })

  it('#640 — the admin usage call does NOT re-prefix what the wrapper already adds', () => {
    // The path guard above CANNOT catch this: `proxyGet` builds the URL from its argument, so
    // the only literal in the file is the wrapper's own template. Stated in schema-truth.ts
    // and pinned here instead of quietly counted as covered.
    //
    // What broke: `proxyGet('admin/clients/:id/usage')` through a helper that already prefixes
    // `/api/proxy/admin/` requested `/admin/admin/clients/:id/usage`. No router serves it, so
    // `usage` stayed null and the whole Usage-trend block — conditional on it — never rendered.
    const page = readFileSync(join(REPO, 'apps/admin/src/app/clients/[id]/page.tsx'), 'utf8')
    const wrapperPrefix = page.match(/const r = await fetch\(`\/api\/proxy\/(\w+)\//)?.[1]
    expect(wrapperPrefix, 'proxyGet no longer prefixes a fixed segment — re-check this pin').toBe('admin')
    for (const call of page.matchAll(/proxy(?:Get|Post)\(\s*`([^`]+)`/g)) {
      expect(
        call[1].startsWith(`${wrapperPrefix}/`),
        `proxyGet('${call[1]}') re-adds the '${wrapperPrefix}/' the wrapper already prefixes — that request 404s`,
      ).toBe(false)
    }
  })

  it('no route file registers a handler that is never mounted', () => {
    // An unmounted router is code that reads as live and cannot run — the same trap as the
    // shadowed duplicate route deleted in #599's PR.
    const idx = read('apps/api/src/index.ts')
    const mountedFiles = new Set(
      [...idx.matchAll(/import\s*(?:\{[^}]+\}|\w+)\s*from\s*'\.\/routes\/([^']+)'/g)]
        .filter(m => new RegExp(`app\\.use\\('[^']+',\\s*\\w+\\)`).test(idx))
        .map(m => m[1]))
    const unmounted: string[] = []
    for (const file of walk(join(REPO, 'apps/api/src/routes'), f => /\.tsx?$/.test(f) && !/\.test\./.test(f))) {
      const name = file.split('/').pop()!.replace(/\.tsx?$/, '')
      if (!mountedFiles.has(name)) continue
      const src = read(file.slice(REPO.length + 1))
      const routerVars = new Set(routeRegistrations(src).map(r => r.router))
      for (const v of routerVars) {
        const exported = new RegExp(`export (?:const |default )${v}\\b`).test(src) || new RegExp(`export default ${v}\\b`).test(src)
        const subMounted = new RegExp(`\\w+\\.use\\('[^']*',\\s*${v}\\)`).test(src)
        if (!exported && !subMounted) unmounted.push(`${name}.ts — ${v} has routes but is neither exported nor sub-mounted`)
      }
    }
    expect(unmounted, 'these handlers can never receive a request').toEqual([])
  })
})

describe('#637 — the send path writes the column the client dashboard reads', () => {
  const figsyLib = readFileSync(join(REPO, 'apps/api/src/lib/figsy.ts'), 'utf8')

  it('every figsy_sent_emails insert carries client_id', () => {
    // Five surfaces read `figsy_sent_emails.client_id` — the CLIENT'S OWN dashboard counter
    // and 7-day sparkline among them — and nothing wrote it. Today every one reads 0 and 0 is
    // TRUE, which is exactly why nobody could see it; on send-day it stays 0 while real mail
    // goes out. Bound to each insert's own object, not a line range.
    const inserts = [...figsyLib.matchAll(/\.from\('figsy_sent_emails'\)\s*\n?\s*\.insert\(\{([\s\S]*?)\n\s*\}\)/g)]
    expect(inserts.length, 'no figsy_sent_emails insert found — this guard has stopped checking').toBeGreaterThanOrEqual(2)
    for (const [i, ins] of inserts.entries()) {
      expect(ins[1], `figsy_sent_emails insert #${i + 1} does not write client_id`).toMatch(/\bclient_id\s*:/)
    }
  })

  it('the day-1 insert needs it MOST — the backfill can never reach those rows', () => {
    // The day-1 path writes campaign_id: null, so `campaign_id → figsy_campaigns.client_id`
    // finds nothing. Without an explicit client_id those sends are invisible to the client
    // permanently, and they are the FIRST email any prospect receives.
    const dayOne = figsyLib.match(/\.from\('figsy_sent_emails'\)\s*\n?\s*\.insert\(\{[\s\S]*?campaign_id:\s*null[\s\S]*?\n\s*\}\)/)
    expect(dayOne, 'the day-1 insert (campaign_id: null) is gone — re-check this guard').toBeTruthy()
    expect(dayOne![0]).toMatch(/\bclient_id\s*:/)
  })

  it('the migration that creates it ships in BOTH homes, or it changes nothing in production', () => {
    // AR6 (6 Aug): a build may end in "run the migration" only if it is committed to both
    // `supabase/migrations/` AND `pending-migrations.ts` — the runner reads only the second,
    // and a .sql file with no entry there is a file nobody can execute.
    expect(read('apps/api/src/lib/pending-migrations.ts')).toContain('20260806_audit_columns')
    const canonical = read('supabase/migrations/20260806_audit_columns.sql')
    expect(canonical).toMatch(/add column if not exists client_id/i)
    expect(canonical).toMatch(/UPDATE public\.figsy_sent_emails/i)   // the backfill
  })
})

describe('#642 — every database function the code calls is defined', () => {
  it('no .rpc() names a function nothing creates', () => {
    const violations: string[] = []
    for (const file of codeFiles) {
      const src = stripJsComments(readFileSync(file, 'utf8'))
      for (const fn of rpcCalls(src)) {
        if (!functions.has(fn)) violations.push(`${file.slice(REPO.length + 1)} calls .rpc('${fn}'), which no migration defines`)
      }
    }
    expect([...new Set(violations)], 'a missing RPC is a money path that fails at runtime').toEqual([])
  })

  it('the money RPCs specifically are defined', () => {
    for (const fn of ['try_charge_wallet', 'increment_wallet', 'record_reveal_or_refund', 'try_spend_sourcing', 'reveal_is_owned']) {
      expect(functions.has(fn), `${fn} is not defined by any migration`).toBe(true)
    }
  })
})
