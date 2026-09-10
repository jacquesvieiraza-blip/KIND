// SCHEMA TRUTH — the parsers behind the guards that kill the #599 class.
//
// WHAT THE CLASS IS. Code names a database column that no migration creates. supabase-js
// returns `{ error }` rather than throwing (#349), call sites read `.data ?? []`, and a
// REJECTED query renders identically to an empty one — so the feature does not break, it
// goes quiet. Nobody can tell.
//
// It has now cost, in one week: the CSV importer (never worked once, #599) · every inbound
// website-chat visitor and every website form-fill (lost, silently) · the client's own
// dashboard sent-counter (would have read 0 forever after send-day) · the approved-leads
// "contacted" tick · the A/B winner check · the adaptive send limiter · every morning brief's
// reply rate · suggest-campaign's ICP context · the low-credit warning cron · the admin usage
// chart. **Every automated gate stayed green through all of it**, because nothing compared a
// query's column names to the schema.
//
// These parsers do. They are here, not in a test file, so they can be unit-tested for real
// rather than only exercised through the sweep they power — a broken parser that silently
// matches nothing would make every guard pass while checking nothing, which is the exact
// failure shape (#565) the guards exist to catch.

// ── SQL SIDE ────────────────────────────────────────────────────────────────────────────

/** Strip `--` line comments and `/* *​/` blocks so commented-out DDL never counts as declared. */
export function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * Every table → column set that a body of SQL declares.
 *
 * Reads `CREATE TABLE` bodies and `ALTER TABLE … ADD [COLUMN] [IF NOT EXISTS] x`, because the
 * schema of this project is spread across 130 migration files and three snapshots and no
 * single one of them is complete. Table-level constraint lines (`primary key (…)`,
 * `constraint … check (…)`) start with a keyword rather than a column name and are skipped —
 * counting them would declare phantom columns and make the guard pass on a typo.
 */
export function declaredColumns(sqlSources: string[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  const add = (table: string, column: string) => {
    const t = table.toLowerCase()
    if (!out.has(t)) out.set(t, new Set())
    out.get(t)!.add(column.toLowerCase())
  }
  const NOT_A_COLUMN = /^(check|constraint|primary|unique|foreign|references|like|exclude)$/i

  for (const raw of sqlSources) {
    const sql = stripSqlComments(raw)

    for (const m of sql.matchAll(/create table (?:if not exists )?(?:public\.)?"?(\w+)"?\s*\(([\s\S]*?)\n\s*\)\s*;/gi)) {
      // Split on commas that are NOT inside parentheses — a `check (x in ('a','b'))` or a
      // default like `replace(gen_random_uuid()::text, …)` carries commas of its own.
      for (const part of m[2].split(/,(?![^()]*\))/)) {
        const c = part.trim().match(/^"?([a-z_][a-z0-9_]*)"?\s+/i)
        if (c && !NOT_A_COLUMN.test(c[1])) add(m[1], c[1])
      }
    }

    for (const m of sql.matchAll(/alter table (?:only )?(?:if exists )?(?:public\.)?"?(\w+)"?([\s\S]*?);/gi)) {
      for (const c of m[2].matchAll(/add (?:column )?(?:if not exists )?"?([a-z_][a-z0-9_]*)"?[\s(]/gi)) {
        if (!NOT_A_COLUMN.test(c[1])) add(m[1], c[1])
      }
    }
  }
  return out
}

/** Every `CREATE [OR REPLACE] FUNCTION name` a body of SQL defines, unqualified and lowercased. */
export function declaredFunctions(sqlSources: string[]): Set<string> {
  const out = new Set<string>()
  for (const raw of sqlSources) {
    for (const m of stripSqlComments(raw).matchAll(/create (?:or replace )?function\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi)) {
      out.add(m[1].toLowerCase())
    }
  }
  return out
}

// ── CODE SIDE ───────────────────────────────────────────────────────────────────────────

/**
 * Strip JS/TS comments so a query written inside a comment is never read as a real one.
 *
 * ⚠️ Template literals are tracked deliberately. `schema-drift.ts` learned this the hard way:
 * a backtick inside a `${…}` inside a backtick ended the outer template early, stripping
 * stopped for the remaining 2,700 lines of the file, and the sweep both invented a column
 * (from the words "Back-compat" in a comment) and HID a real one. The dangerous half is why
 * this is not a one-line regex.
 */
export function stripJsComments(src: string): string {
  let out = ''
  let i = 0
  const n = src.length
  // Stack of open template literals, so `${ … ` … ` … }` nests correctly.
  let templateDepth = 0
  let braceDepthInTemplate: number[] = []

  while (i < n) {
    const two = src.slice(i, i + 2)
    if (templateDepth === 0 && two === '//') {
      while (i < n && src[i] !== '\n') i++
      continue
    }
    if (templateDepth === 0 && two === '/*') {
      // Newlines are KEPT. Every caller reports a file:line, and swallowing the newlines of a
      // block comment shifts every line number after it — sending somebody to the wrong line
      // is its own small lie.
      i += 2
      while (i < n && src.slice(i, i + 2) !== '*/') { if (src[i] === '\n') out += '\n'; i++ }
      i += 2
      continue
    }
    const ch = src[i]
    if (ch === '\\' && i + 1 < n) { out += src[i] + src[i + 1]; i += 2; continue }
    // 🛑 ⛓️ 10 Sep — A QUOTE INSIDE TEMPLATE **TEXT** IS AN APOSTROPHE, NOT A STRING.
    //
    // This branch was unguarded, so `` `This month's spend is ${x}` `` opened a "string" at
    // the apostrophe that ran to the next `'` anywhere in the file — swallowing the closing
    // backtick and leaving `templateDepth` stuck above zero. From that line on the stripper
    // removed NO comments at all, and `columnUses`' balanced-brace walk then read a later
    // object's keys as belonging to an earlier `.insert({`.
    //
    // ⚠️ THE GUARD HAD BEEN QUIET, NOT PASSING. `routes/icps.ts` carries such a template at
    // line 311 of 4,700, so #642 had effectively stopped checking that file — the largest in
    // the repo — and reported clean. It surfaced only because C02 shifted the offsets enough
    // to make the mis-parse land on a real object. A checker that cannot fail proves nothing.
    //
    // A quote delimits a string only OUTSIDE template text: either not in a template at all,
    // or inside a `${ … }` interpolation, where ordinary expression rules apply again.
    const inTemplateText = templateDepth > 0 && (braceDepthInTemplate[templateDepth - 1] ?? 0) === 0
    if (!inTemplateText && (ch === "'" || ch === '"')) {
      const quote = ch
      out += ch; i++
      while (i < n && src[i] !== quote) {
        if (src[i] === '\\') { out += src[i]; i++ }
        if (i < n) { out += src[i]; i++ }
      }
      out += src[i] ?? ''; i++
      continue
    }
    if (ch === '`') {
      if (templateDepth > 0 && braceDepthInTemplate[templateDepth - 1] === 0) templateDepth--
      else { templateDepth++; braceDepthInTemplate[templateDepth - 1] = 0 }
      out += ch; i++
      continue
    }
    if (templateDepth > 0 && two === '${') { braceDepthInTemplate[templateDepth - 1]++; out += two; i += 2; continue }
    if (templateDepth > 0 && ch === '}' && braceDepthInTemplate[templateDepth - 1] > 0) {
      braceDepthInTemplate[templateDepth - 1]--; out += ch; i++; continue
    }
    out += ch; i++
  }
  return out
}

export type ColumnUse = { table: string; column: string; kind: string; index: number }

/**
 * Every table.column a file's supabase-js queries name.
 *
 * Covers the three ways a column reaches Postgres: a `.select('a, b')` list, the keys of an
 * `.insert/.update/.upsert` object literal, and a filter argument (`.eq('col', …)`).
 *
 * `select('*')` names nothing. Embedded relations (`clients(company_name)`) are columns of the
 * OTHER table and are stripped — leaving them in would report them as missing on this one and
 * bury the real findings under noise.
 */
export function columnUses(src: string): ColumnUse[] {
  const uses: ColumnUse[] = []

  for (const m of src.matchAll(/\.from\(\s*'(\w+)'\s*\)\s*\n?\s*\.select\(\s*'([^']*)'/g)) {
    if (m[2].includes('*')) continue
    const flat = m[2].replace(/[a-z_]+(?:!\w+)?\s*\([^)]*\)/gi, '')
    for (let col of flat.split(',')) {
      col = col.trim()
      if (!col) continue
      if (col.includes(':')) col = col.split(':').pop()!.trim()   // `alias:column`
      if (!/^[a-z_][a-z0-9_]*$/.test(col)) continue
      uses.push({ table: m[1].toLowerCase(), column: col.toLowerCase(), kind: 'select', index: m.index ?? 0 })
    }
  }

  for (const m of src.matchAll(/\.from\(\s*'(\w+)'\s*\)\s*\n?\s*\.(insert|update|upsert)\(\s*(?:\[\s*)?\{/g)) {
    const open = src.indexOf('{', (m.index ?? 0) + m[0].length - 1)
    let depth = 0
    for (let j = open; j < src.length && j - open < 6000; j++) {
      const ch = src[j]

      // STRINGS AND TEMPLATES ARE SKIPPED WHOLE. Both of these are real rows this guard
      // reported on its first run, and both are text, not columns:
      //   reason: 'New ICP: fintech founders, SA'   → a column called `icp`
      //   `Inbound web form: "${…}"`                 → a column called `form`
      // A guard that invents findings gets switched off, so the parser reads structure, never
      // prose. Nested `${…}` inside a template is skipped with it — a key cannot live there.
      if (ch === "'" || ch === '"' || ch === '`') {
        const quote = ch
        j++
        while (j < src.length && src[j] !== quote) { if (src[j] === '\\') j++; j++ }
        continue
      }

      if (ch === '{') { depth++; continue }
      if (ch === '}') { depth--; if (depth === 0) break; continue }
      if (depth !== 1) continue

      const km = src.slice(j).match(/^([a-z_][a-z0-9_]*)\s*:/i)
      if (!km) continue

      // A KEY SITS AT A PROPERTY POSITION — right after `{` or `,`, whitespace aside. Without
      // this, the else-branch of a ternary reads as a key: `next_send_at: isDemo ? null : x`
      // reported a column called `null`. Checking only the single previous character allowed
      // any whitespace to qualify, which is exactly what a ternary provides.
      let back = j - 1
      while (back >= 0 && /\s/.test(src[back])) back--
      if (src[back] !== '{' && src[back] !== ',') continue

      uses.push({ table: m[1].toLowerCase(), column: km[1].toLowerCase(), kind: m[2], index: m.index ?? 0 })
      j += km[0].length - 1
    }
  }

  for (const m of src.matchAll(/\.from\(\s*'(\w+)'\s*\)((?:\s*\.\w+\([^)]*\))*)/g)) {
    for (const f of m[2].matchAll(/\.(eq|neq|gt|gte|lt|lte|is|in|ilike|like|order)\(\s*'([a-z_][a-z0-9_]*)'/g)) {
      uses.push({ table: m[1].toLowerCase(), column: f[2].toLowerCase(), kind: `filter.${f[1]}`, index: m.index ?? 0 })
    }
  }

  return uses
}

/** Every table a file's queries touch at all — catches a table nothing creates. */
export function tablesUsed(src: string): Set<string> {
  const out = new Set<string>()
  for (const m of src.matchAll(/\.from\(\s*'(\w+)'\s*\)/g)) out.add(m[1].toLowerCase())
  return out
}

/** Every `.rpc('name'` a file calls. */
export function rpcCalls(src: string): string[] {
  return [...src.matchAll(/\.rpc\(\s*'([a-z_][a-z0-9_]*)'/g)].map(m => m[1].toLowerCase())
}

// ── ROUTES ──────────────────────────────────────────────────────────────────────────────

export type Registration = { router: string; method: string; path: string }

/**
 * Express route registrations at the start of a line — a path quoted in a comment is not one.
 *
 * The optional prefix matters: files with a default export declare theirs as plain `router`,
 * and a pattern demanding `<something>Router` silently skips every one of them. That mistake
 * made this guard report eleven live routes as unserved on its first run — a guard that cries
 * wolf is a guard somebody deletes.
 */
export function routeRegistrations(src: string): Registration[] {
  return [...src.matchAll(/^((?:[A-Za-z_$][\w$]*)?[Rr]outer)\.(get|post|put|patch|delete|all)\(\s*'([^']+)'/gm)]
    .map(m => ({ router: m[1], method: m[2], path: m[3] }))
}

/**
 * Does a called path match any registered route?
 *
 * A `${…}` hole stands for an unknown run of the path, so it matches `.*`. Erring toward
 * MATCH is deliberate: this guard exists to catch a button wired to a path nobody serves —
 * a literal typo or a deleted endpoint — and a false alarm on every dynamic URL is how a
 * guard gets deleted rather than fixed.
 */
export function callResolves(callPath: string, routes: string[]): boolean {
  const pattern = callPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/XSEGX/g, '.*')
  const re = new RegExp('^' + pattern + '$')
  return routes.some(r => re.test(r.replace(/:(\w+)/g, 'PARAM')))
}

/**
 * Is this literal a WRAPPER's own template rather than a call to a specific endpoint?
 *
 * `proxyGet(path)` is defined as ``fetch(`/api/proxy/admin/${path}`)`` — the endpoint IS the
 * argument, so the literal names nothing checkable and its real call sites are the arguments
 * passed in, which a static scan cannot follow.
 *
 * ⚠️ AND THAT IS A REAL LIMIT, stated rather than papered over: this guard catches a call to
 * a path that does not exist. It does NOT catch #640, whose double prefix only exists once
 * the wrapper is applied to its argument. That one is pinned by its own regression assertion.
 * Skipping these quietly while claiming full coverage would be the exact overclaim the guard
 * was written to prevent.
 */
export function isWrapperTemplate(callPath: string): boolean {
  return callPath.replace(/^\//, '').split('/').pop() === 'XSEGX'
}
