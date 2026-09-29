// ⚑ 29 Sep (R174 ⑤ · PR 6a) — THE RETIRED WORDS CANNOT RETURN TO A CLIENT SCREEN.
//
// R174 ⑤: the six stages (R127), "qualified meetings" (R141), FIGSY never on a client screen,
// this programme's numbers only. This scans every Milla screen and component — code, not the
// comments that explain why a word went — for the words the audit removed. A new screen that
// uses one fails the full check.
//
// ⚠️ PROVEN BOTH WAYS: the scanner is exercised on a bad sentence below (it must catch it), the
// real tree must be clean, and the red proof of this PR ran it against the old screens.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

export const RETIRED_CLIENT_WORDS: Array<[string, RegExp]> = [
  ['FIGSY (an internal engine name)', /\bFIGSY\b/],
  ['a $4 per-lead price', /\$4\b/],
  ['credits', /\bcredits\b/i],
  ['approved leads', /approved leads/i],
  ['request leads', /request leads/i],
  ['masked leads', /masked leads/i],
  ['the internal "Review" stage', /'Review — |a review decision/],
]

/** Code only — block comments, JSX comments and whole-line `//` comments are notes, not screens. */
export function codeOf(src: string): string {
  return src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => (l.trim().startsWith('//') ? '' : l)).join('\n')
}

export function retiredWordsIn(src: string): string[] {
  const code = codeOf(src)
  return RETIRED_CLIENT_WORDS.filter(([, re]) => re.test(code)).map(([name]) => name)
}

function tsxUnder(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...tsxUnder(p))
    else if (p.endsWith('.tsx') && !p.includes('.test.')) out.push(p)
  }
  return out
}

const ROOTS = ['apps/portal/src/app/(milla)', 'apps/portal/src/components/milla'].map(r => join(process.cwd(), r))

describe('the scanner has teeth', () => {
  it('catches each retired word in a screen, and ignores it in a comment', () => {
    expect(retiredWordsIn(`<p>FIGSY booked from your approved leads</p>`)).toEqual(['FIGSY (an internal engine name)', 'approved leads'])
    expect(retiredWordsIn(`const t = 'Charged $4 per lead'`)).toEqual(['a $4 per-lead price'])
    expect(retiredWordsIn(`return 'Review — waiting on a decision'`)).toEqual(['the internal "Review" stage'])
    expect(retiredWordsIn(`// FIGSY used to say this\n{/* approved leads */}\nconst ok = 1`)).toEqual([])
  })
})

describe('every Milla screen is clean', () => {
  const files = ROOTS.flatMap(tsxUnder)
  it('finds the screens it is meant to read', () => {
    expect(files.length).toBeGreaterThan(30)
  })
  it('no retired word on any client screen', () => {
    const hits = files.flatMap(f => retiredWordsIn(readFileSync(f, 'utf8')).map(w => `${f.replace(process.cwd() + '/', '')}: ${w}`))
    expect(hits).toEqual([])
  })
})
