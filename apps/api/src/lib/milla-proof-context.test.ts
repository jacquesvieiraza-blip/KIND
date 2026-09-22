// ═══════════════════════════════════════════════════════════════════════════════════════
// SHE WAS SITTING NEXT TO THE SET AND COULD NOT SEE IT (C06, canary 10 Sep).
//
// Twenty masked cards were on the client's Proof panel — bands, capped scores, "why this
// fits" sentences, their own "looks right" / "not a fit" reactions — and the only fact Milla
// had about any of it was a single boolean saying whether the desk was empty
// (`calibration_set_on_desk`, 3 Sep). A client asking "why is that consultancy in there?"
// was talking to someone who could not see what they were both looking at, so she answered
// from the lifecycle instead.
//
// ⚠️ AND THE FIX HAD TO NOT HAND HER A SPEND CONTROL. "Show me stronger examples" is a
// server-gated ACTION on the client's screen; there is no paid sourcing from chat, from a
// card, or as "find more like these" (founder-locked 10 Sep). Giving a model the desk and
// leaving those rules unstated is how a chat starts promising searches nothing can run.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describeProofContext, type ProofChatContext, type ProofChatCard } from './milla-proof-context'
import { buildMillaChatSystem } from './milla-chat-system'

const PORTAL = join(__dirname, '..', '..', '..', 'portal', 'src')
const IO = readFileSync(join(__dirname, 'milla-proof-context-io.ts'), 'utf8')
const LEADS = readFileSync(join(__dirname, '..', 'routes', 'leads.ts'), 'utf8')
const DESK_CHAT = readFileSync(join(__dirname, 'milla.ts'), 'utf8')
const CHAT_UI = readFileSync(join(PORTAL, 'components', 'milla', 'MillaConversation.tsx'), 'utf8')
const HOME = readFileSync(join(PORTAL, 'app', '(milla)', 'milla', 'page.tsx'), 'utf8')

const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
  .join('\n')

const CARD = (over: Partial<ProofChatCard> = {}): ProofChatCard => ({
  role: 'Managing Director', company: 'Beacon Consulting Partners',
  industry: 'Consulting', country: 'United Kingdom',
  band: 'worth_a_look', bandLabel: 'Worth a look', score: 72,
  whyFits: 'Senior decision-maker at a UK firm; no evidence of digital marketing focus.',
  reaction: 'not_a_fit', ...over,
})

const CTX = (over: Partial<ProofChatContext> = {}): ProofChatContext => ({
  onDesk: [CARD()],
  attempt: 1,
  attempts: [{ pass: 1, surfaced: 20, looksRight: 1, notAFit: 12,
    reasons: { wrong_industry: 9, too_big: 3 }, notes: ['all consultancies, I want agencies'] }],
  whatChanged: null,
  escalated: false,
  strongerAvailable: true,
  strongerHint: null,
  ...over,
})

describe('🛑 ① she is given the desk, card by card', () => {
  it('the role, the company, where they are, the BAND and the capped score', () => {
    const b = describeProofContext(CTX())
    expect(b).toContain('Managing Director at Beacon Consulting Partners')
    expect(b).toContain('(Consulting, United Kingdom)')
    expect(b).toContain('Worth a look')
    expect(b).toContain('score 72')
  })

  it('their own reaction to that card', () => {
    expect(describeProofContext(CTX())).toContain('they marked it NOT A FIT')
    expect(describeProofContext(CTX({ onDesk: [CARD({ reaction: 'looks_right' })] })))
      .toContain('they marked it LOOKS RIGHT')
    // No reaction is silence, not a guess.
    const none = describeProofContext(CTX({ onDesk: [CARD({ reaction: null })] }))
    expect(none.includes('they marked it')).toBe(false)
  })

  it('the why-it-fits sentence, which is the thing they are asking about', () => {
    expect(describeProofContext(CTX())).toContain('no evidence of digital marketing focus')
  })

  it('the reason counts, ordered by how many they gave', () => {
    expect(describeProofContext(CTX())).toContain('Reasons: Wrong industry 9, Too big 3.')
  })

  it('🛑 their free text VERBATIM — a paraphrase is our sentence in their mouth', () => {
    expect(describeProofContext(CTX()))
      .toContain('Their words, exactly: "all consultancies, I want agencies"')
  })

  it('…and "no reasons given" when they ticked nothing', () => {
    const b = describeProofContext(CTX({ attempts: [
      { pass: 1, surfaced: 20, looksRight: 0, notAFit: 3, reasons: {}, notes: [] }] }))
    expect(b).toContain('no reasons given')
  })

  // ── 🛑 ⚑ 22 Sep — THERE IS NO DENOMINATOR, AND SHE MUST NOT INVENT ONE ───────────────
  //
  // ⛓️ WAS: "Automatic attempts used: 1 of 2" / "2 of 2" / "Never offer a third".
  //
  // 🛑 FOUNDER-LOCKED 22 Sep: *"2. unlimited now."* Every clause of that instruction became
  // false at once — and "Never offer a third" was the dangerous half, because it told the
  // model to refuse something the server now grants. A client talked out of a working control
  // is worse than one who never saw it.
  //
  // ⚠️ THE ATTEMPT NUMBER SURVIVES, because knowing this is their fourth go is real context
  // for how to answer. What is gone is the part that was a RULE wearing a fact's clothes.
  it('the attempt they are on — a count, never an allowance', () => {
    const one = describeProofContext(CTX())
    expect(one).toContain('Refinement attempts so far: 1')
    expect(describeProofContext(CTX({ attempt: 4 }))).toContain('Refinement attempts so far: 4')
    expect(one, 'a limit came back').not.toMatch(/of 2\b/)
    expect(one, 'she was told to refuse a set the server would grant')
      .not.toContain('Never offer a third')
    expect(one).toContain('There is NO limit')
  })

  it('🛑 and when she cannot read them, she hands them the fields — she never guesses', () => {
    // Founder-locked 22 Sep, twice over: *"if Milla cant answer we then say to the client
    // please use drop down boxes on right mannually. we never assume"* and *"we cant guess
    // peoples way of speaking ever"*. Without this she improvises a rescue, which is exactly
    // how the invented category vocabulary happened.
    const b = describeProofContext(CTX())
    expect(b).toContain('targeting fields on their Brief')
    expect(b).toContain('Never guess at their meaning')
  })

  it('what changed for attempt 2, in the words already on their screen', () => {
    const b = describeProofContext(CTX({ attempt: 2,
      whatChanged: 'I’ve narrowed the kind of company based on what you marked, and looked again.' }))
    expect(b).toContain('narrowed the kind of company')
    expect(b).toContain('in the words already shown to them')
  })

  it('an EMPTY desk is stated plainly, and she is told not to describe examples', () => {
    const b = describeProofContext(CTX({ onDesk: [] }))
    expect(b).toContain('THEIR DESK IS EMPTY RIGHT NOW')
    expect(b).toContain('Do NOT describe any example')
  })

  it('nothing reacted to yet is its own sentence', () => {
    expect(describeProofContext(CTX({ attempts: [] })))
      .toContain('They have not reacted to any example yet.')
  })

  it('🛑 an UNREADABLE desk is not "you have no set"', () => {
    // The single most damaging sentence available on this subject.
    const b = describeProofContext(null)
    expect(b).toContain('THEIR PROOF SET COULD NOT BE READ')
    expect(b).toContain('do NOT say they have no set')
    expect(b).toContain('Do NOT describe any example')
  })
})

describe('🛑 ② what she may NOT do with it', () => {
  const b = describeProofContext(CTX())

  it('the improved set is a BUTTON on their screen, not something she runs', () => {
    expect(b).toContain('is a BUTTON on their screen')
    expect(b).toContain('You do NOT run it, promise it, or offer it')
  })

  it('🛑 there is no paid sourcing from chat, a card, or "find more like these"', () => {
    expect(b).toContain('"find more like these"')
    expect(b).toContain('Never offer one, at any price')
    expect(b).toContain('never say you are searching or will search')
  })

  it('she has no name, email or phone for these people, and is told so', () => {
    expect(b).toContain('You do not have any name, email address or phone')
    expect(b).toContain('there is no way to reveal one')
  })

  it('🛑 a band is about ONE person — never a rank or a "top pick"', () => {
    // The defect C04/C05 removed from the screen: the star meant "in the list".
    expect(b).toContain('never as a rank')
    expect(b).toContain('"our top pick"')
  })

  it('the availability of the improved set is the SERVER\'s answer, restated to her', () => {
    expect(describeProofContext(CTX({ strongerAvailable: true })))
      .toContain('The improved-set control is AVAILABLE')
    const shut = describeProofContext(CTX({
      strongerAvailable: false, strongerHint: "Mark one or two that aren't right first, so I know what to change." }))
    expect(shut).toContain('is NOT available right now')
    // ⚠️ IT NAMES THE ACTION THAT OPENS IT. "Not available" with no reason reads as broken.
    expect(shut).toContain("Mark one or two that aren't right first")
  })

  it('🛑 ESCALATED: a person has it, nothing is offered, and no time is promised', () => {
    const e = describeProofContext(CTX({ escalated: true, attempt: 2 }))
    expect(e).toContain('HANDED TO A PERSON')
    expect(e).toContain('Do NOT offer another set')
    expect(e).toContain('do NOT suggest changing the targeting to unlock anything')
    expect(e).toContain('Do NOT promise a time or a day')
    // The improved-set line must not appear at all on this path — it is a control that
    // cannot exist beside "I've paused finding people until we've spoken".
    expect(e.includes('The improved-set control is'), 'a spend control is described to an escalated client').toBe(false)
  })

  it('🛑 no SLA anywhere in the block, on any path', () => {
    for (const ctx of [CTX(), CTX({ escalated: true }), CTX({ onDesk: [] })]) {
      const t = describeProofContext(ctx).toLowerCase()
      for (const promise of ['working day', 'within 24', '24 hours', 'by tomorrow', 'shortly', 'asap']) {
        expect(t.includes(promise), `an SLA is in her context: "${promise}"`).toBe(false)
      }
    }
  })

  it('and it closes the gap it opened — anything not listed, she does not have', () => {
    expect(b).toContain('you do not have. Say so plainly; never estimate.')
  })
})

describe('🛑 ③ one prompt, both doors, and no second opinion about the desk', () => {
  it('an omitted argument adds NO Proof block; null adds the honest warning', () => {
    // ⚠️ THE TWO ARE DELIBERATELY DIFFERENT. `undefined` is "this caller has no client
    // context"; `null` is "we asked and could not read it". Collapsing them would either
    // warn clients with nothing to read or silently drop the block where it matters.
    const bare = buildMillaChatSystem(null, null)
    // ⛓️ STRENGTHENED 10 Sep — the first version of this test asserted only that the BLOCK
    // HEADING was absent, and a mutation collapsing the two (`describeProofContext(proof ??
    // null)`) came back GREEN: the warning text carries no heading, so a prompt telling
    // every caller "their Proof set could not be read" satisfied it. Both spellings of a
    // Proof block are now banned from the un-asked prompt.
    expect(bare.includes('THE PROOF CALIBRATION SET'), 'a Proof block appears unasked').toBe(false)
    expect(bare.includes('PROOF SET COULD NOT BE READ'), 'an unasked caller is warned about a set it never asked for').toBe(false)
    // ⚠️ NOT SCANNED FOR "their desk" — `LIFECYCLE_RULES` legitimately says "unless the
    // client block explicitly says their desk has people on it", which is the 3-Sep rule
    // and belongs in every prompt. The two block openings above are what this test bans.
    expect(buildMillaChatSystem(null, null, null)).toContain('THEIR PROOF SET COULD NOT BE READ')
    expect(buildMillaChatSystem(null, null, CTX())).toContain('THE PROOF CALIBRATION SET')
  })

  it('the desk chat reads it inside the ONE parallel batch (the 15s window)', () => {
    const c = code(DESK_CHAT)
    const parallel = c.indexOf('Promise.all')
    const read = c.indexOf('readProofChatContext(clientId)')
    const close = c.indexOf('const hasContext')
    expect(parallel).toBeGreaterThan(-1)
    expect(read, 'the proof read is outside the parallel batch — serial latency').toBeGreaterThan(parallel)
    expect(read).toBeLessThan(close)
  })

  it('🛑 the reader DELEGATES the band — it does not derive one', () => {
    const c = code(IO)
    // The canonical functions, imported. Two matchers is one matcher plus a bug.
    expect(c).toContain("import('./proof-fit')")
    expect(c).toContain('fit.hardFit(')
    expect(c).toContain('fit.fitBand(')
    expect(c).toContain('fit.displayScore(')
    expect(c).toContain('fit.BAND_LABEL[band]')
    // …and no local threshold, which is the only way it could disagree with the card.
    for (const own of ['>= 75', '> 74', 'START_HERE_MIN_SCORE =', 'score >=']) {
      expect(c.includes(own), `the reader re-derives the band: ${own}`).toBe(false)
    }
  })

  it('🛑 her desk and the CLIENT\'s desk are the same rows', () => {
    // ⚠️ COMPARED, NOT ASSERTED BY EYE. The desk route builds its query through a
    // conditional scope narrowing that cannot be handed out as a value, so the filters are
    // repeated in the reader — and this extracts them from BOTH files and compares the sets.
    const filters = (s: string) => [...s.matchAll(/\.(is|not|neq)\(\s*'([a-z_]+)'/g)]
      .map(m => `${m[1]}:${m[2]}`).sort()
    // ⚠️ COMMENTS STRIPPED FIRST. Both files QUOTE their own filters in prose ("its
    // `.is('delivered_at', null)` filter means…"), so a raw scan compares documentation
    // rather than queries — and reported a filter the route does not apply.
    const routeSrc = code(LEADS), readerSrc = code(IO)
    const route = routeSrc.slice(routeSrc.indexOf("let q = db.from('leads')"), routeSrc.indexOf('const { data, error } = await q'))
    const reader = readerSrc.slice(readerSrc.indexOf("db.from('leads')"), readerSrc.indexOf('if (error) throw'))
    const routeSet = new Set(filters(route))
    // The desk route applies the proof attribution as a scope narrowing a few lines later.
    routeSet.add('not:proof_pass')
    expect(filters(reader).sort()).toEqual([...routeSet].sort())
    // 🛑 AND THE ONE THAT MATTERS MOST, NAMED. A set-aside candidate failed a hard criterion
    // the client themselves gave; describing one to them as part of their set would undo the
    // whole structural gate in prose.
    expect(filters(reader)).toContain('is:set_aside_reason')
  })

  it('the why-it-fits sentence is name-scrubbed for her too', () => {
    // The scoring prompt is fed the lead's name and its reasoning often echoes it. A masked
    // card whose explanation names the person is not masked.
    expect(code(IO)).toContain("'this prospect'")
    expect(code(IO)).toContain('first_name')
  })

  it('every read fails soft to null — never a thrown chat', () => {
    const c = code(IO)
    expect(c).toContain('return null')
    expect(c).toContain('catch (e)')
    // The desk is bounded, so one client cannot produce an unbounded prompt.
    expect(c).toContain('.limit(PROOF_CHAT_CARD_CAP)')
  })
})

describe('🛑 ④ the two surfaces stop offering what does not exist', () => {
  it('🛑 "Please find more like these" is gone from the chip row', () => {
    const c = code(CHAT_UI)
    expect(c.includes('Please find more like these'), 'the paid-sourcing chip is back').toBe(false)
    expect(c.includes('find more like these'), 'a sourcing request is offered in chat').toBe(false)
    // The question chip stays — it asks her about the set she can now actually see.
    expect(c).toContain('Which of these look strongest?')
  })

  it('🛑 the card label is the BAND, and the star belongs to one band only', () => {
    const c = code(HOME)
    expect(c).toContain("l.band === 'start_here'")
    expect(c).toContain('★ {l.band_label}')
    // 🛑 THE RANK STAR, in the spelling that shipped: `recommended` was the top 20 by score,
    // and a proof pass surfaces exactly 20 — so it starred every card.
    expect(c.includes("{l.recommended && <div"), 'the rank star is back on the card').toBe(false)
    expect(c.includes("★ We&apos;d start here"), 'the label is hand-typed again, not the band').toBe(false)
  })

  it('…and NO band renders NO label, rather than falling back to the rank', () => {
    expect(code(HOME)).toContain('{l.band && l.band_label && (')
    // The emphasis on the card body follows the band too, not `recommended`.
    expect(code(HOME)).toContain("l.band === 'start_here' ? 'border-[1.5px] border-[#d9c4fb] bg-[#fcfaff]'")
  })

  it('the words come from the server, so the screen cannot strengthen a band', () => {
    const c = code(HOME)
    // Only `band_label` is rendered; no second copy of "Worth a look" to drift.
    expect(c.includes("'Worth a look'"), 'the screen hard-codes a band label').toBe(false)
  })
})
