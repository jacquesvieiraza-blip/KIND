import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { readStatedOutcome, outcomeForOperator, shouldAskForOutcome } from './client-outcome'
import { briefFactsFromDraft, briefFacts, BRIEF_FACTS } from '@kind/shared'

// ═══════════════════════════════════════════════════════════════════════════════════════
// BUILD 4 — THE LAST WORD LIST ON THE TRUTH PATH.
//
// 🛑 THE DEFECT. `MEETING_WORDS` — ten words — was matched against the client's own sentence,
// and whichever way it fell decided whether a MEETING TARGET could later be agreed against
// their programme. It is the same mechanism as the country parser, one field over, and it was
// wrong in both directions on real sentences:
//
//   "book qualified sales conversations"    → other      ✗  (the founder's OWN fixture)
//   "we want to stop cold-calling"          → meetings   ✗  (the opposite of asking)
//   "demo our platform at the trade show"   → meetings   ✗  (an event, not our outcome)
//
// 🛑 THE FIX IS THE WHOLE CORRECTION IN ONE FIELD. The MODEL read the conversation, so the
// MODEL says what they meant: `desired_outcome_kind` travels on the Brief beside the sentence
// it describes. Deterministic code still decides what is SAFE — anything that is not an
// explicit `meetings` is `other`, and `other` reaches a person.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = process.cwd()
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')
// ⚠️ COMMENTS ARE STRIPPED BEFORE ANY `not` ASSERTION. This repo QUOTES struck code inside
// `⛓️` notes on purpose, so a raw search finds the deleted list in the very comment that
// records its deletion — and a guard that fails on its own epitaph teaches the next person to
// delete the history instead of the code.
const live = (src: string) =>
  src.split('\n').filter(l => {
    const t = l.trimStart()
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
  }).join('\n')

const OUTCOME = live(read('apps/api/src/lib/client-outcome.ts'))
const AUTH = live(read('apps/api/src/routes/auth.ts'))
const ICPS = live(read('apps/api/src/routes/icps.ts'))

describe('🛑 BUILD 4 · the ten-word list is gone', () => {
  it('🛑 NO WORD LIST DECIDES THE KIND ANY MORE', () => {
    expect(OUTCOME, 'MEETING_WORDS is back').not.toContain('MEETING_WORDS')
    // The mechanism, not just the name: nothing here reads the client's sentence for meaning.
    for (const banned of ['appointment', 'consultation', '.includes(', '.some(', 'test(']) {
      expect(OUTCOME, `the sentence is being read for meaning again (${banned})`)
        .not.toContain(banned)
    }
  })

  it('🛑 AND THE FOUNDER’S OWN FIXTURE NOW CLASSIFIES CORRECTLY', () => {
    // This sentence is his, from the 10 Sep canary. The word list called it `other`, so a
    // meeting target could not be agreed against the outcome he had just asked for.
    const o = readStatedOutcome('book qualified sales conversations', 'meetings')
    expect(o?.kind).toBe('meetings')
    expect(o?.stated, 'his words were tidied').toBe('book qualified sales conversations')
  })

  it('🛑 A SENTENCE FULL OF MEETING WORDS IS NOT A MEETINGS OUTCOME', () => {
    // The model read the conversation and said `other`. Deterministic code does not get to
    // disagree with it on the strength of the vocabulary in the sentence.
    for (const said of [
      'we want to stop cold-calling and endless demos',
      'demo our platform at the trade show',
      'fewer meetings, more inbound consultations handled by the website',
    ]) {
      expect(readStatedOutcome(said, 'other')?.kind, said).toBe('other')
    }
  })
})

describe('🛑 BUILD 4 · unknown stays unknown, and unknown is the safe direction', () => {
  it('🛑 NO KIND AT ALL IS `other` — never a guess, and never an error', () => {
    for (const kind of [undefined, null, '', '   ', 'Meetings ', 'MEETINGS', 'meeting', 42, {}]) {
      const o = readStatedOutcome('book qualified sales conversations', kind)
      expect(o?.kind, `kind=${JSON.stringify(kind)}`).toBe('other')
    }
    // ⚠️ ONLY THE EXACT TOKEN PASSES, and that is deliberate. It is not a spelling test for a
    // human — it is a fixed value the model is given as an enum. Being strict here costs a
    // client nothing (an operator agrees the target with them) and being loose costs the
    // one thing MEETING_BOOKED exists to protect.
    expect(readStatedOutcome('book qualified sales conversations', 'meetings')?.kind).toBe('meetings')
  })

  it('🛑 AND AN UNKNOWN KIND NEVER RE-ASKS THE CLIENT A QUESTION THEY ANSWERED', () => {
    const o = readStatedOutcome('book qualified sales conversations')
    expect(shouldAskForOutcome(o), 'the screen is asking again for what they already said')
      .toBe(false)
    // It reaches a PERSON instead — the operator sees their words and agrees it with them.
    expect(outcomeForOperator(o)).toContain('agree this with them')
  })

  it('a blank answer is still not an outcome, kind or no kind', () => {
    expect(readStatedOutcome('', 'meetings')).toBeNull()
    expect(readStatedOutcome('  ', 'meetings')).toBeNull()
    expect(readStatedOutcome('ok', 'meetings'), 'two characters is not an answer').toBeNull()
  })
})

describe('🛑 BUILD 4 · the kind is an ATTRIBUTE of fact #11, not a twelfth fact', () => {
  it('🛑 THE BRIEF IS STILL ELEVEN FACTS', () => {
    expect(BRIEF_FACTS).toHaveLength(11)
  })

  it('🛑 AND THE COUNTER DOES NOT SEE THE KIND AT ALL', () => {
    // A draft that is complete stays complete; a draft that holds ONLY a kind has told us
    // nothing. If the kind leaked into the counter the client would be asked, forever, for a
    // twelfth thing they have already told us inside the eleventh.
    const full = {
      contact_name: 'Jacques', company_name: 'Northstar Revenue', website: 'https://northstar.com',
      what_they_do: 'B2B sales consultancy', target_category: 'founder-led service businesses',
      geographies: ['United Kingdom'], target_company_type: 'agencies',
      company_sizes: ['11-50'], job_titles: ['Founder'], seniority_levels: ['Owner'],
      exclusions: 'no recruiters', desired_outcome: 'book qualified sales conversations',
    }
    const withKind = { ...full, desired_outcome_kind: 'meetings' }
    expect(briefFacts(briefFactsFromDraft(withKind)).count)
      .toBe(briefFacts(briefFactsFromDraft(full)).count)
    expect(briefFacts(briefFactsFromDraft({ desired_outcome_kind: 'meetings' })).count).toBe(0)
  })

  it('🛑 SO MILLA IS NEVER TOLD TO ASK FOR IT — she is told to infer it', () => {
    expect(ICPS).toContain("enum: ['meetings', 'other']")
    const from = ICPS.indexOf("desired_outcome_kind: { type: 'string', enum:")
    const field = ICPS.slice(from, from + 420)
    expect(field, 'the kind is being asked for as a question').not.toMatch(/ask|question/i)
  })
})

describe('🛑 BUILD 4 · the browser cannot declare a meetings outcome', () => {
  it('🛑 `outcome_kind` IS NOT ON THE SIGNUP BODY, AND NEVER WAS (C03, unchanged)', () => {
    const schema = AUTH.slice(AUTH.indexOf('const onboardSchema'), AUTH.indexOf('const UUID_RE'))
    expect(schema).not.toMatch(/outcome_kind/)
  })

  it('🛑 THE KIND IS READ FROM THE SERVER-OWNED DRAFT', () => {
    expect(AUTH).toMatch(/readStatedOutcome\(\s*outcomeStatedOwned\s*,\s*draftFacts\?\.desired_outcome_kind/)
  })
})

describe('🛑 BUILD 4 · one screen, one meaning of "onboarding"', () => {
  const OP = live(read('apps/api/src/routes/operator.ts'))

  it('🛑 THE HEADER COUNTS THE BRIEF, not our eight checks', () => {
    // The defect, verbatim from the console: "11 of 11 collected" beside "Onboarding 88%".
    // Both were true about different things and neither said which, so an operator could not
    // tell whether the CLIENT still owed us something or WE did.
    expect(OP).toContain('percent: Math.round((brief.count / brief.total) * 100)')
    expect(OP).toContain('draftProgress')
    expect(OP).toContain('BRIEF_FACT_LABEL')
  })

  it('🛑 THE EIGHT CHECKS ARE RENAMED, NOT DELETED — they answer a real question', () => {
    expect(OP).toContain('go_live: goLive')
    expect(OP).toContain('checks')
  })

  it('🛑 AND AN UNREADABLE BRIEF FALLS BACK, never to a confident 0%', () => {
    // "We could not read it" must never render to an operator as "they have told us nothing"
    // — that sentence would send them to chase a client who owes us nothing.
    expect(OP).toContain('{ ...goLive, brief: null, go_live: goLive }')
    const from = OP.indexOf('const brief = await (async () => {')
    expect(OP.slice(from, from + 700)).toContain('catch { return null }')
  })
})
