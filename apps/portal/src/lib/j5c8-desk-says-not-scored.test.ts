// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C8 (desk half) · THE CLIENT'S SCREENS SAY "NOT SCORED", AND NEVER SAY "SCORING_FAILED"
//
// The server half is enforced in `apps/api/src/lib/j5c8-scoring-is-a-recorded-fact.test.ts`,
// where the defect was: `leads.score_reasoning` is a dual-purpose column — the model's
// explanation on a scored lead, our own marker sentence on a failed one — and both client desks
// forwarded it as "why this fits".
//
// This file guards the other half of the REQ, on the two surfaces a client actually reads:
//
//   · `(milla)/milla/page.tsx`                 — the Proof / prospect desk
//   · `components/milla/ProgrammeReview.tsx`   — the programme approval cards
//
// ── WHY THIS IS A SOURCE ASSERTION AND NOT A RENDER TEST ────────────────────────────────
//
// Both properties are about what the JSX CANNOT do: it must not render a bare
// `score != null &&` with no else-branch, and it must not print the internal sentence. A render
// test proves the happy path draws; it cannot prove the absence of a branch, and the absence is
// the whole defect — the unscored card was rendering *perfectly*, it was simply silent.
//
// ⚠️ COMMENTS ARE STRIPPED, because this file's own prose (and the chained notes in both
// components) discuss `SCORING_FAILED` at length. An absence assertion that reads comments
// asserts against its own documentation.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SURFACES = {
  'the Proof desk': join(__dirname, '../app/(milla)/milla/page.tsx'),
  'the programme approval cards': join(__dirname, '../components/milla/ProgrammeReview.tsx'),
} as const

// Code only — a comment line is documentation, not something a client can read.
function codeOf(path: string): string {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(l => {
      const t = l.trim()
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*')
    })
    .join('\n')
}

describe('J5-C8 · every client desk says NOT SCORED when there is no score', () => {
  for (const [name, path] of Object.entries(SURFACES)) {
    it(`🛑 ${name} renders the words, not an empty space`, () => {
      const code = codeOf(path)
      expect(code, `${name} does not read the recorded not-scored fact`).toMatch(/not_scored/)
      expect(code, `${name} never says "Not scored" — the card is just missing its number`)
        .toMatch(/Not scored/)
    })

    it(`🛑 ${name} never shows the internal scoring-failure sentence`, () => {
      const code = codeOf(path)
      // The marker, the internal route it names, and the phrase in between. None of the three
      // belongs on a screen the product asks a client to approve.
      for (const banned of [/SCORING_FAILED/, /rescore-stranded/, /AI scoring unavailable/i]) {
        expect(code, `${name} can print internal scoring prose to a client: ${banned}`).not.toMatch(banned)
      }
    })

    it(`${name} still shows a real score when there is one — the state was added, not swapped`, () => {
      const code = codeOf(path)
      expect(code, `${name} stopped rendering the score itself`).toMatch(/\{l\.score\}|\{p\.score\}/)
    })
  }
})
