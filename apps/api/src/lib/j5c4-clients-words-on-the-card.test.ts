// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C4 · THE CLIENT'S WORDS ON THE CARD — AND SIZE JUDGED AGAINST WHAT THEY SAID
//
// REQ: *"No provider bands on client surfaces; size judged against stated range"* (LR 10,12;
// FD-2). The founder's rule, already written at the top of `icp-provider-translation.ts`:
//
//     THE CLIENT SPEAKS NATURALLY.
//     THE CLIENT NEVER HAS TO SPEAK APOLLO.
//     PROVIDER TRANSLATION IS OUR PROBLEM, NOT THEIRS.
//
// ── ① THE CONFIRMATION CARD SHOWED THEM OUR TRANSLATION AND ASKED THEM TO APPROVE IT ────
//
// "Proposed ICP · v1" is the FIRST thing a client says yes to, and its chips were built from
// `proposed.seniority_levels`, `proposed.industries` and `proposed.company_sizes` — the three
// CLOSED PROVIDER VOCABULARIES. The panel's own note says so: *"`proposed` is the plan's
// CONTENT — the provider-translated arrays"*.
//
// 🛑 SO A CLIENT WHO SAID "digital marketing agencies, ten to fifty people" WAS SHOWN
// **"Marketing · Consulting · 11–50 staff"** and asked to confirm that it was their targeting.
// Their own phrase — `target_category`, the column the founder locked as the only authority on
// client intent — appeared on no client screen anywhere in the portal.
//
// ⚠️ THE PRECEDENT IS ALREADY ON THAT LINE. `brief_geographies` was added on 14 Sep for this
// exact reason — the chips must not disagree with the durable Brief — and geography alone was
// switched to the client's own record. This finishes the row.
//
// ── ② AND SIZE WAS JUDGED AGAINST THE BAND WE SNAPPED THEM TO, NOT WHAT THEY SAID ────────
//
// The six bands are ours: 1–10 · 11–50 · 51–200 · 201–500 · 501–1,000 · 1,000+. A client who
// says **"fifty to a hundred people"** cannot be expressed in them, so they are snapped to
// `['11–50','51–200']` — and `sizeVerdict` then admits an 11-person company and a 190-person
// company as matches. Out by 4x in one direction and 2x in the other, on a criterion the
// client stated precisely.
//
// ⚠️ THE BANDS ARE NOT REMOVED AND MUST NOT BE. They are the Apollo query hint, exactly as
// `industries` is — evidence and a filter, never the requirement. `target_size` is to
// `company_sizes` what `target_category` is to `industries`, and this is the same split the
// repo already made and documented twice.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { hardFit, statedSizeRange, type FitIcp } from './proof-fit'

const code = (p: string): string =>
  readFileSync(join(__dirname, p), 'utf8')
    .split('\n')
    .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
    .join('\n')

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② SIZE IS JUDGED AGAINST THE STATED RANGE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J5-C4 · the range the client actually stated', () => {
  it('reads the ordinary ways a person answers "how big?"', () => {
    expect(statedSizeRange('10 to 50 staff')).toEqual({ min: 10, max: 50 })
    expect(statedSizeRange('50-100 people')).toEqual({ min: 50, max: 100 })
    expect(statedSizeRange('between 20 and 200 employees')).toEqual({ min: 20, max: 200 })
    expect(statedSizeRange('11–50')).toEqual({ min: 11, max: 50 })
  })

  it('reads an open-ended answer as open-ended, never as a guess', () => {
    expect(statedSizeRange('under 20 people')).toEqual({ min: 1, max: 20 })
    expect(statedSizeRange('fewer than 200')).toEqual({ min: 1, max: 200 })
    expect(statedSizeRange('over 500 staff')).toEqual({ min: 500, max: null })
    expect(statedSizeRange('1,000+')).toEqual({ min: 1000, max: null })
    expect(statedSizeRange('at least 30 employees')).toEqual({ min: 30, max: null })
  })

  it('🛑 A PHRASE WITH NO NUMBER IS NOT A RANGE — "small agencies" is not 1–10', () => {
    // Inventing a range from an adjective would put a number the client never said in front
    // of a hard refusal. Nothing is a legitimate answer: the band rule still applies.
    for (const s of ['small agencies', 'mid-sized', 'whatever size', '', null, undefined]) {
      expect(statedSizeRange(s), `"${s}" was turned into a number the client never said`).toBeNull()
    }
  })

  it('⛓️ a single number is the LADDER BAND around it — reversed 21 Sep, and it cost every client', () => {
    // ⛓️ WAS: ~~`expect(statedSizeRange('about 50 people')).toEqual({ min: 50, max: 50 })`~~
    //
    // 🛑 THAT PIN IS WHY NO CLIENT HAD EVER RECEIVED A LEAD. `target_size` stores the client's
    // words verbatim, and a stated range OUTRANKS the band (this file's own ② above). So
    // "around 20 people" became `{20,20}`, the SEARCH asked Apollo for 11–50, Apollo returned
    // genuinely in-band people, and the GATE then set aside every one of them that was not
    // precisely twenty. AAA Operations Studio: 20 sourced, 0 eligible, 20 set aside on size.
    // GREAT Studio: identical. Of ten in-band companies, exactly one survived.
    //
    // ⚠️ IT WAS ALSO UNSATISFIABLE BY CONSTRUCTION — Apollo sends `estimated_num_employees`,
    // and requiring an ESTIMATE to equal a conversational number is not strictness.
    //
    // ⚠️ J5-C4's OWN COMPLAINT IS UNTOUCHED, and the tests above still assert it. This item was
    // about a client who *"stated precisely"* — "fifty to a hundred" snapped to bands that
    // admitted an 11-person and a 190-person company. A RANGE is still honoured exactly and is
    // never rounded out to our ladder. What changed is only what a LONE number means, because
    // a lone number is a point estimate and never was a bound. Founder, 19 Sep: *"go with the
    // best widest possible outcome."*
    expect(statedSizeRange('about 50 people')).toEqual({ min: 11, max: 50 })
    // And the band is genuinely wider than the pin — nothing that qualified can stop qualifying.
    const icp: FitIcp = { company_sizes: ['11–50'], target_size: 'about 50 people' }
    expect(hardFit({ company_size: '50' }, icp).size, 'the number they said must still match').toBe('yes')
    expect(hardFit({ company_size: '20' }, icp).size, 'an in-band company was set aside').toBe('yes')
    expect(hardFit({ company_size: '400' }, icp).size, 'the band must still refuse what is outside it').toBe('no')
  })

  it('🛑 the client who said "50 to 100" no longer matches an 11-person company', () => {
    // The two bands that phrase is snapped to are 11–50 and 51–200. Both of these pass the
    // band rule today; neither is what the client asked for.
    const icp: FitIcp = { company_sizes: ['11–50', '51–200'], target_size: '50 to 100 people' }
    expect(hardFit({ company_size: '11' }, icp).size, 'an 11-person company matched "50 to 100"').toBe('no')
    expect(hardFit({ company_size: '190' }, icp).size, 'a 190-person company matched "50 to 100"').toBe('no')
    expect(hardFit({ company_size: '75' }, icp).size).toBe('yes')
    expect(hardFit({ company_size: '50' }, icp).size, 'the stated minimum was excluded').toBe('yes')
    expect(hardFit({ company_size: '100' }, icp).size, 'the stated maximum was excluded').toBe('yes')
  })

  it('🛑 and the client who said "10 to 50" gets the 10-person company the band excludes', () => {
    // `'11–50'` starts at ELEVEN. A client who said ten and was snapped to that band had the
    // exact company they asked for refused, by our vocabulary, on their own criterion.
    const icp: FitIcp = { company_sizes: ['11–50'], target_size: '10 to 50 staff' }
    expect(hardFit({ company_size: '10' }, icp).size, 'the client said 10 and 10 was refused').toBe('yes')
  })

  it('a ladder LABEL still works as a candidate value — pool rows are stored that way', () => {
    const icp: FitIcp = { company_sizes: ['11–50'], target_size: '10 to 50 staff' }
    expect(hardFit({ company_size: '11–50' }, icp).size).toBe('yes')
    expect(hardFit({ company_size: '201–500' }, icp).size).toBe('no')
  })

  it('an unreadable candidate size is `unknown`, never a silent pass or a refusal', () => {
    const icp: FitIcp = { company_sizes: ['11–50'], target_size: '10 to 50 staff' }
    expect(hardFit({ company_size: '7 people' }, icp).size).toBe('unknown')
    expect(hardFit({ company_size: null }, icp).size).toBe('unknown')
  })

  it('🛑 NOTHING CHANGES FOR A LEGACY ICP — no stated size, the band rule answers alone', () => {
    const icp: FitIcp = { company_sizes: ['11–50'] }
    expect(hardFit({ company_size: '24' }, icp).size).toBe('yes')
    expect(hardFit({ company_size: '4000' }, icp).size).toBe('no')
    expect(hardFit({ company_size: '11–50' }, icp).size).toBe('yes')
    // And a stated size we could not read is the same as none.
    expect(hardFit({ company_size: '24' }, { company_sizes: ['11–50'], target_size: 'small' }).size).toBe('yes')
  })

  it('a client who stated a size but NO bands is still judged — the range is the test', () => {
    // The un-canonicalisable case: their words are all we have, and they are enough.
    expect(hardFit({ company_size: '75' }, { target_size: '50 to 100 people' }).size).toBe('yes')
    expect(hardFit({ company_size: '900' }, { target_size: '50 to 100 people' }).size).toBe('no')
  })

  it('a client who stated NEITHER has no size test at all', () => {
    expect(hardFit({ company_size: '4000' }, {}).size).toBe('yes')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// THE STATED SIZE IS PERSISTED, AND EVERY SURFACE THAT JUDGES CAN SEE IT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J5-C4 · the stated size survives the write and reaches every judge', () => {
  it('🛑 promotion persists the client\'s own words, beside the provider column', () => {
    const src = code('./promotion.ts')
    // ⚠️ FROM THE RAW BRIEF FACT, NOT FROM `decided.values`. `f.company_sizes` is the
    // snapshot's FREE TEXT — what they actually said. Writing the canonical half here would
    // store our translation twice and the client's answer zero times.
    expect(src, 'the confirmed brief\'s stated size is dropped at the write')
      .toMatch(/target_size:\s*str\(arr\(f\.company_sizes\)/)
    expect(src, 'the stated size was written from our own translation')
      .not.toMatch(/target_size:\s*[^\n]*decided\.values/)
    // And the provider column is still canonical-only — this ADDS a fact, it replaces none.
    expect(src).toMatch(/company_sizes: decided\.values\.company_sizes/)
  })

  it('the migration exists and is sanctioned — O3 admits no other way to add a column', () => {
    const pending = code('./pending-migrations.ts')
    expect(pending).toMatch(/20260918_icp_target_size/)
    expect(pending).toMatch(/ADD COLUMN IF NOT EXISTS target_size/)
    const sql = readFileSync(
      join(__dirname, '../../../../supabase/migrations/20260918_icp_target_size.sql'), 'utf8')
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS target_size/)
  })

  it('🛑 every surface that builds a FitIcp selects it — one judge, one set of inputs', () => {
    // The J5-C12 lesson, verbatim: two surfaces cast a narrow select to `FitIcp`, so the
    // fields they omitted were silently `undefined` and their verdicts unconditionally `yes`.
    // A column that only the gate can see re-creates that on the day it is added.
    for (const [name, path] of [
      ['the review desk', '../routes/leads.ts'],
      ['Milla\'s proof context', './milla-proof-context-io.ts'],
    ] as const) {
      const src = code(path)
      const at = src.indexOf("from('icps')")
      expect(at, `the ICP read in ${name} moved — this guard must be repointed`).toBeGreaterThan(-1)
      expect(src.slice(at, at + 500), `${name} cannot see the client's stated size`)
        .toMatch(/target_size/)
    }
  })

  it('🛑 the POOL path passes it too — J5-C5 made one predicate for both paths', () => {
    const src = code('./pool-sourcing.ts')
    const at = src.indexOf('structurallyAdmissible(hardFit(')
    expect(at, 'the pool match moved — this guard must be repointed').toBeGreaterThan(-1)
    expect(src.slice(at, at + 900), 'a reused pool record is judged on the band while the provider path uses the stated range')
      .toMatch(/target_size:/)
    expect(code('./pool-candidates.ts')).toMatch(/target_size\?:\s*string \| null/)
    expect(src).toMatch(/target_size\?:\s*string \| null/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① NO PROVIDER BANDS ON THE CLIENT'S CARD
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J5-C4 · the confirmation card shows what the client said', () => {
  const ICPS = code('../routes/icps.ts')
  const WELCOME = readFileSync(
    join(__dirname, '../../../portal/src/app/(milla)/milla/welcome/page.tsx'), 'utf8',
  )
    .split('\n')
    .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
    .join('\n')

  it('🛑 the completion carries the client\'s OWN targeting words, not only our translation', () => {
    // Exactly the shape `brief_geographies` and `brief_exclusions` already use — resolved
    // from the durable Brief, so the card cannot disagree with the record.
    for (const k of ['brief_target_category', 'brief_company_sizes', 'brief_roles', 'brief_seniority']) {
      expect(ICPS, `the completion does not carry ${k}`).toMatch(new RegExp(`${k}:`))
    }
    expect(ICPS, 'the stated size is not resolved from the durable Brief')
      .toMatch(/brief_company_sizes:\s*resolved\.companySizes/)
  })

  it('🛑 the chips PREFER the client\'s words — the provider arrays are the fallback', () => {
    // Geography already worked this way. This is the same rule applied to the other four,
    // and the fallback matters: a legacy conversation with no durable Brief still renders.
    expect(WELCOME, 'the card still shows only the provider-translated arrays')
      .toMatch(/briefTargetCategory/)
    expect(WELCOME).toMatch(/briefCompanySizes/)
    expect(WELCOME, 'the size chip is still our band with the word "staff" after it')
      .not.toMatch(/chips\(proposed\.company_sizes\)\.map/)
  })

  it('🛑 the client\'s CATEGORY reaches a client screen at all — it never did before', () => {
    // `target_category` is founder-locked as the only authority on client intent, and it was
    // rendered on no client surface anywhere in the portal.
    expect(WELCOME).toMatch(/brief_target_category/)
  })

  it('the provider arrays are still SENT — this changes the display, never the filter', () => {
    // `POST /icps` persists `proposed`, and the provider columns must keep carrying canonical
    // values. A card that renamed the payload would break the search to fix the copy.
    // The whole plan object is spread into the POST, so the provider columns still carry
    // exactly what the completion produced. The chips read `brief*` for DISPLAY only.
    expect(WELCOME).toMatch(/'\/icps', \{ \.\.\.proposed,/)
    // ⚠️ `from_brief_draft` IS LEGITIMATE AND PRE-EXISTING — it says which door this came
    // through, not what the targeting is. What must not appear is the four DISPLAY fields.
    expect(WELCOME, 'a display-only brief field leaked into the persisted ICP payload')
      .not.toMatch(/'\/icps', \{[^}]*brief_(target_category|company_sizes|roles|seniority)/)
  })
})
