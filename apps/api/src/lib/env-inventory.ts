// THE ENVIRONMENT SWEEP — how `docs/ENVIRONMENT.md` is kept honest (#561).
//
// A doc listing environment variables rots the moment somebody adds a `process.env` read, and
// it rots SILENTLY: nothing breaks, the doc is simply wrong the next time it is trusted. So
// the doc is not maintained by memory — this module extracts the real set from the source,
// and a test fails when the two disagree.
//
// ── WHY A SCANNER AND NOT A GREP ─────────────────────────────────────────────────────────
//
// Two reasons, both learned here:
//
// ① **COMMENTS MUST BE STRIPPED FIRST**, and this repo has been caught by that four times.
//    A comment explaining *"HOUSE_CLIENT_ID stays unset"* is not a read, and counting it as
//    one would demand the doc list variables that no code touches — while a genuinely new
//    read hides in the noise. Stripping is state-aware (it tracks quotes) so `'http://…'`
//    inside a string is not mistaken for a comment.
//
// ② **NOT EVERY READ LOOKS LIKE `process.env.X`.** Twelve variables in this repo are reached
//    only through indirection, and a naive grep reports every one of them as non-existent:
//      • `process.env[bundle.priceEnvVar]`     — `stripe.ts` builds the name from `PRICING`
//      • `has('PAYSTACK_SECRET_KEY')`          — `routes/engine.ts`'s env probe
//      • `{ key: 'STRIPE_PRICE_FIGSY_20' }`    — `startup-check.ts`'s own table
//    That is exactly how the 26-Jul sweep landed on **69** when the real number is **96**:
//    it counted the shape it expected rather than the reads that exist.

/** Source trees the sweep walks. The three deployed apps; nothing else ships. */
export const SCAN_ROOTS = ['apps/api/src', 'apps/portal/src', 'apps/admin/src'] as const

/**
 * Remove comments, leaving string contents intact.
 *
 * Quote-aware on purpose. A naive `s.replace(/\/\/.*$/gm, '')` eats the rest of any line
 * containing a URL — including the `process.env` read that follows it — so the scanner would
 * go BLIND exactly where configuration and endpoints live together.
 *
 * ⚠️ AND REGEX-AWARE, WHICH IS NOT OPTIONAL — the first version of this function was not,
 * and it broke on THIS FILE. A regex literal like `/key:\s*['"]([A-Z]+)['"]/g` contains
 * quote characters; a stripper that only tracks quotes treats the `'` inside it as opening a
 * string, and every `//` after that point looks like it is inside a string and survives.
 * The result is a scanner that quietly stops stripping comments part-way through a file —
 * so it reports variables that only appear in prose while a genuinely new read hides among
 * them. It was caught because the sweep returned a variable named `FOO` that exists only in
 * a sentence in the comment below.
 *
 * The regex-start heuristic is the usual one: a `/` begins a regex when the previous
 * non-space character is one that cannot end an expression.
 */
const REGEX_MAY_START_AFTER = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '\n', ''])

/**
 * A stack, not a flag, because template literals NEST.
 *
 * ⚠️ THE SECOND BUG IN THIS FUNCTION, found while writing #558's schema sweep and worth
 * recording because it is the more subtle of the two. `figsy.ts:232` contains
 *
 *     `${bestSignal ? `- Best signal: ${bestSignal}` : ''}`
 *
 * — a template literal inside a `${…}` inside a template literal. Treating a backtick as an
 * ordinary quote ends the OUTER template at the INNER opening backtick, and everything after
 * it parses in the wrong state: the `'unknown'` a few lines up opens a string that never
 * closes, and the stripper stops stripping for **the rest of the file**. In `figsy.ts` that
 * is 2,700 lines, and it is why #558's first sweep reported a column called `compat` that
 * exists only in the words "Back-compat" in a comment.
 *
 * Same failure shape as the regex bug below it, and the same reason it matters: the
 * harmless half invents a finding, the dangerous half hides a real one.
 */
type Mode = { kind: 'template'; depth: number } | { kind: 'quote'; ch: string } | { kind: 'expr' }

export function stripCommentsForEnvScan(src: string): string {
  let out = ''
  const stack: Mode[] = []
  let prevMeaningful = ''
  const top = () => stack[stack.length - 1]

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    const t = top()

    // Inside a plain '…' or "…" string: only the matching quote (unescaped) ends it.
    if (t?.kind === 'quote') {
      out += c
      if (c === '\\') { out += src[++i] ?? ''; continue }
      if (c === t.ch) stack.pop()
      continue
    }

    // Inside a `…` template: `${` opens an EXPRESSION, where code rules apply again.
    if (t?.kind === 'template') {
      out += c
      if (c === '\\') { out += src[++i] ?? ''; continue }
      if (c === '$' && src[i + 1] === '{') { out += '{'; i++; stack.push({ kind: 'expr' }); continue }
      if (c === '`') stack.pop()
      continue
    }

    // Code context — inside a `${…}` expression or at the top level. Identical rules, so
    // a nested template, string or comment behaves exactly as it would anywhere else.
    if (c === '"' || c === "'") { stack.push({ kind: 'quote', ch: c }); out += c; prevMeaningful = c; continue }
    if (c === '`') { stack.push({ kind: 'template', depth: 0 }); out += c; prevMeaningful = c; continue }
    if (t?.kind === 'expr') {
      if (c === '{') { t.kind === 'expr' && stack.push({ kind: 'expr' }); out += c; prevMeaningful = c; continue }
      if (c === '}') { stack.pop(); out += c; prevMeaningful = c; continue }
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++
      out += '\n'
      prevMeaningful = '\n'
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++
      i++
      continue
    }
    // A regex literal — copied through verbatim, but consumed as ONE token so the quotes
    // inside it can never be mistaken for the start of a string.
    if (c === '/' && REGEX_MAY_START_AFTER.has(prevMeaningful)) {
      out += c
      i++
      let inClass = false
      for (; i < src.length; i++) {
        const r = src[i]
        out += r
        if (r === '\\') { out += src[++i] ?? ''; continue }
        if (r === '[') inClass = true
        else if (r === ']') inClass = false
        else if (r === '/' && !inClass) break
        else if (r === '\n') break     // unterminated: it was division after all, bail out
      }
      prevMeaningful = '/'
      continue
    }
    out += c
    if (!/\s/.test(c)) prevMeaningful = c
    else if (c === '\n') prevMeaningful = '\n'
  }
  return out
}

/**
 * Every way this repo names an environment variable, and the file that proves each one is
 * real rather than a pattern invented to be thorough.
 */
export const ENV_READ_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'process.env.<VAR>',       re: /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g },
  { label: "process.env['<VAR>']",    re: /process\.env\[\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\]/g },
  // routes/engine.ts — GET /engine/env probes by name: `has('PAYSTACK_SECRET_KEY')`.
  { label: "has('<VAR>')",            re: /\bhas\(\s*['"]([A-Z][A-Z0-9_]*)['"]\s*\)/g },
  // lib/stripe.ts — the price-ID variable name is DATA, resolved via process.env[…].
  { label: 'priceEnvVar',             re: /priceEnvVar:\s*['"]([A-Z][A-Z0-9_]*)['"]/g },
  // lib/startup-check.ts — its own table is the only place six STRIPE_PRICE_* names appear.
  { label: 'startup-check key:',      re: /key:\s*['"]([A-Z][A-Z0-9_]{2,})['"]/g },
]

/** Pull every environment-variable name out of one file's source. Comments already gone. */
export function extractEnvNames(src: string): Set<string> {
  const stripped = stripCommentsForEnvScan(src)
  const found = new Set<string>()
  for (const { re } of ENV_READ_PATTERNS) {
    // Fresh lastIndex each time — a shared /g regex carries state between calls, and the
    // second file scanned would silently start mid-way through.
    const rx = new RegExp(re.source, re.flags)
    let m: RegExpExecArray | null
    while ((m = rx.exec(stripped)) !== null) found.add(m[1])
  }
  return found
}

/**
 * Files the sweep skips, and why each exclusion is safe:
 *   • `*.test.ts` / `*.test.tsx` — a test that sets a variable is a fixture, not
 *     configuration. Counting them would demand the doc list variables no deploy has.
 *   • `*.d.ts` — declarations, no runtime reads.
 */
export function isScannableFile(path: string): boolean {
  if (!/\.(ts|tsx)$/.test(path)) return false
  if (/\.test\.(ts|tsx)$/.test(path)) return false
  if (/\.d\.ts$/.test(path)) return false
  return true
}
