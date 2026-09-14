import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { applyListOps, LIST_FACTS } from './brief-list-ops'

// ═══════════════════════════════════════════════════════════════════════════════════════
// R121 — "ACTUALLY INCLUDE THE US AS WELL" MUST NOT COST THEM THE UK.
//
// 🛑 THE DEFECT, EXACTLY. The durable Brief merges shallowly, so a list fact is REPLACED by
// whatever the turn carried. A client adding a second market got the second market and lost
// the first — and whether it happened at all depended on whether the model restated the whole
// list that turn. No test in this repo exercised a correction before this file.
//
// ⚠️ THESE ARE STATE TESTS, NOT LANGUAGE TESTS. Not one of them contains a sentence. The
// model decides what "as well" means and says so structurally; this proves the server applies
// that decision to the cumulative record without losing anything. A test here that fed in
// prose would be re-introducing the parser at the test layer.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('🛑 R121 · a list correction adds to the record rather than replacing it', () => {
  it('ADD keeps what is already held', () => {
    const out = applyListOps(
      { geographies: ['United Kingdom'] }, {},
      { geographies: { add: ['United States'] } },
    )
    expect(out.geographies).toEqual(['United Kingdom', 'United States'])
  })

  it('REMOVE takes one out and leaves the rest', () => {
    const out = applyListOps(
      { company_sizes: ['1–10', '11–50', '51–200'] }, {},
      { company_sizes: { remove: ['1–10'] } },
    )
    expect(out.company_sizes).toEqual(['11–50', '51–200'])
  })

  it('ADD and REMOVE in one turn both apply', () => {
    const out = applyListOps(
      { job_titles: ['Founder', 'CEO'] }, {},
      { job_titles: { add: ['CRO'], remove: ['CEO'] } },
    )
    expect(out.job_titles).toEqual(['Founder', 'CRO'])
  })

  it('🛑 a value already held is not duplicated', () => {
    const out = applyListOps(
      { geographies: ['United Kingdom'] }, {},
      { geographies: { add: ['United Kingdom', 'United States'] } },
    )
    expect(out.geographies).toEqual(['United Kingdom', 'United States'])
  })

  it('🛑 REMOVE is case- and spacing-insensitive — the client is not spelling for a database', () => {
    const out = applyListOps(
      { geographies: ['United Kingdom', 'United States'] }, {},
      { geographies: { remove: ['united   states'] } },
    )
    expect(out.geographies).toEqual(['United Kingdom'])
  })

  it('🛑 a REMOVE that empties the list is honoured — the fact becomes MISSING again', () => {
    // Quietly keeping the old value would be the opposite of what they said. Empty means
    // Milla asks about it again, which is correct.
    const out = applyListOps({ geographies: ['United States'] }, {}, { geographies: { remove: ['United States'] } })
    expect(out.geographies).toEqual([])
  })

  it('🛑 a full restatement WINS over ops for the same fact', () => {
    // Both in one turn is the model saying the same thing twice; the restatement is the less
    // ambiguous, and honouring the ops on top could add back a value it deliberately dropped.
    const out = applyListOps(
      { geographies: ['United Kingdom'] },
      { geographies: ['South Africa'] },
      { geographies: { add: ['United States'] } },
    )
    expect(out.geographies, 'the ops overrode an explicit restatement').toBeUndefined()
  })

  it('🛑 A FACT NOBODY TOUCHED IS ABSENT FROM THE RESULT — never returned empty', () => {
    // The caller SPREADS this over the snapshot, so a key present-but-empty would erase a
    // stored list. "Said nothing about it" and "emptied it" are different facts.
    const out = applyListOps({ geographies: ['United Kingdom'], job_titles: ['Founder'] }, {},
      { geographies: { add: ['United States'] } })
    expect(Object.keys(out)).toEqual(['geographies'])
    expect(out).not.toHaveProperty('job_titles')
  })

  it('empty, malformed and absent ops all change nothing', () => {
    expect(applyListOps({ geographies: ['UK'] }, {}, undefined)).toEqual({})
    expect(applyListOps({ geographies: ['UK'] }, {}, {})).toEqual({})
    expect(applyListOps({ geographies: ['UK'] }, {}, { geographies: {} })).toEqual({})
    expect(applyListOps({ geographies: ['UK'] }, {}, { geographies: { add: [], remove: [] } })).toEqual({})
    // Junk shapes are ignored rather than throwing — a malformed op must not cost the turn.
    expect(applyListOps({ geographies: ['UK'] }, {},
      { geographies: { add: 'United States' } } as never)).toEqual({})
  })

  it('blank and whitespace values are dropped, never stored as a market', () => {
    const out = applyListOps({ geographies: ['United Kingdom'] }, {},
      { geographies: { add: ['  ', '', 'United States'] } })
    expect(out.geographies).toEqual(['United Kingdom', 'United States'])
  })

  it('🛑 IT READS NO LANGUAGE — the module contains no matcher at all', () => {
    // ⚠️ THE POINT OF THE WHOLE BUILD, ASSERTED ON THE FILE ITSELF. A regex here would be
    // R121's own defect one layer down, and it would be easy to add "just for `remove`".
    const src = readFileSync(join(process.cwd(), 'apps/api/src/lib/brief-list-ops.ts'), 'utf8')
    const live = src.split('\n').filter(l => {
      const t = l.trimStart()
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
    }).join('\n')
    // The only regex permitted is whitespace normalisation for identity comparison.
    const regexes = live.match(/\/(?![/*])(?:\\.|\[[^\]]*\]|[^/\n])+\/[gimsuy]*/g) ?? []
    expect(regexes, `unexpected pattern matching: ${regexes.join(' ')}`).toEqual(['/\\s+/g'])
    for (const word of ['based', 'headquart', 'demonym', 'pronoun', 'irish', 'british']) {
      expect(live.toLowerCase(), `${word} — this module is interpreting English`).not.toContain(word)
    }
  })

  it('the four list facts are the four the Brief actually stores as lists', () => {
    expect([...LIST_FACTS]).toEqual(['geographies', 'company_sizes', 'job_titles', 'seniority_levels'])
  })
})
