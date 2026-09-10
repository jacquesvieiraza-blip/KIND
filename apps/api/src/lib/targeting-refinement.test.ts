// ═══════════════════════════════════════════════════════════════════════════════════════
// FOUR FAILURES WEARING ONE SENTENCE (C01, canary 10 Sep).
//
// `MillaConversation.send()` answered every failure of either transport with:
//
//     "I hit a snag reaching the engine — please try again in a moment."
//
// A 409 saying a revision is ALREADY waiting for review got that sentence, and re-sending
// produces the identical 409 forever. A 409 saying the row MOVED got it too, though the
// client's proposal was still perfectly good. A real 5xx — the one case where "try again" is
// true — was never retried. And on the save path the server's raw `error` string was printed
// into the transcript instead, which is how internal review wording and the literal text
// "Server error (502)" reach a customer's screen in Milla's voice.
//
// The composer had also already been cleared, so "try again" meant "retype it".
//
// ⚠️ THE ROUTE HALF — one press, one write, and the truthful diff — is proved behaviourally
// in `routes/revise-idempotency.route.test.ts`. This file proves the RULES and that the two
// surfaces actually use them.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  refinementFailureMessage, chatFailureMessage, isRetryableOnce, REFINEMENT_RETRIES,
  REVISE_PENDING_CODE, REVISE_STATE_CHANGED_CODE, TARGETING_UNCHANGED_SENTENCE,
  TARGETING_FIELDS, diffTargeting, targetingChangeSentence, targetingUnchanged, joinList,
} from '@kind/shared'

const PORTAL = join(__dirname, '..', '..', '..', 'portal', 'src')
const ICPS = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')
const CHAT = readFileSync(join(PORTAL, 'components', 'milla', 'MillaConversation.tsx'), 'utf8')
const TRANSPORT = readFileSync(join(PORTAL, 'lib', 'api.ts'), 'utf8')

/** Executable lines only — a comment documenting a banned sentence is not the sentence. */
const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
  .join('\n')

/** The collapse, in the spelling that shipped. */
const COLLAPSE = 'I hit a snag reaching the engine'

describe('🛑 ① the four failures are four sentences', () => {
  it('a revision is already waiting — and it is NOT a snag', () => {
    expect(refinementFailureMessage({ status: 409, code: REVISE_PENDING_CODE })).toBe(
      'I already have a targeting change waiting to be resolved, so I won’t stack another one on top. I’ll get this reviewed properly.')
  })

  it('the row moved — their request is kept, not lost', () => {
    expect(refinementFailureMessage({ status: 409, code: REVISE_STATE_CHANGED_CODE })).toBe(
      'Your targeting changed while I was working. I’ve kept your request — here is the latest version so we can apply it cleanly.')
  })

  it('a real 5xx, after the one retry has also failed', () => {
    for (const status of [500, 502, 503, 0]) {
      expect(refinementFailureMessage({ status }), String(status)).toBe(
        'I couldn’t reach the engine. Your changes are still here — try once more.')
    }
  })

  it('a refusal we cannot classify says the targeting is untouched, and promises no review', () => {
    const m = refinementFailureMessage({ status: 400 })
    expect(m).toBe('I couldn’t save that change, so your targeting is exactly as it was. Try once more, and tell me if it still won’t save.')
  })

  it('🛑 no sentence carries an HTTP status, a code, or the word "error"', () => {
    // `lib/api.ts` composes "Server error (502) — please try again" for a non-JSON failure,
    // and the save path used to print that message straight into the transcript.
    const all = [
      refinementFailureMessage({ status: 409, code: REVISE_PENDING_CODE }),
      refinementFailureMessage({ status: 409, code: REVISE_STATE_CHANGED_CODE }),
      refinementFailureMessage({ status: 502 }),
      refinementFailureMessage({ status: 404 }),
      chatFailureMessage(500), chatFailureMessage(403),
    ]
    for (const m of all) {
      expect(/\d/.test(m), `a number reaches the client: ${m}`).toBe(false)
      expect(/error|status|http|server/i.test(m), `plumbing reaches the client: ${m}`).toBe(false)
      expect(m.includes(COLLAPSE), 'the collapse is back').toBe(false)
    }
  })

  it('🛑 a decision is never re-asked, and "no answer" always is', () => {
    // Retrying a 409 argues with a refusal on the client's behalf; it can only refuse again.
    for (const decided of [400, 401, 403, 404, 409, 422]) {
      expect(isRetryableOnce(decided), `a ${decided} would be re-sent`).toBe(false)
    }
    for (const unknown of [0, 500, 502, 503, 504, null, undefined]) {
      expect(isRetryableOnce(unknown), `a ${unknown} would not be re-sent`).toBe(true)
    }
  })

  it('EXACTLY one retry — not two, not a loop', () => {
    expect(REFINEMENT_RETRIES).toBe(1)
  })

  it('the two codes are the server\'s own constants, byte for byte', () => {
    // `icps.ts` calls them "Stable — never reword it"; a rename there must fail HERE rather
    // than silently drop every client onto the unclassified sentence.
    expect(ICPS).toContain(`const EXISTING_PENDING_TARGETING = '${REVISE_PENDING_CODE}'`)
    expect(ICPS).toContain(`const TARGETING_STATE_CHANGED = '${REVISE_STATE_CHANGED_CODE}'`)
  })
})

describe('🛑 ② the diff is derived, so it cannot claim a change that did not happen', () => {
  const BEFORE = {
    industries: ['Consulting'], geographies: ['United Kingdom'], job_titles: ['Founder/CEO'],
    seniority_levels: ['C-Suite'], company_sizes: ['10–50'], tech_stack: [], keywords: [],
  }

  it('the founder\'s own sentence', () => {
    const after = { ...BEFORE, industries: ['Digital Marketing'] }
    expect(targetingChangeSentence(diffTargeting(BEFORE, after))).toBe(
      'I’ve changed the industry from Consulting to Digital Marketing and kept the United Kingdom, Founder/CEO, C-Suite and 10–50 employees filters.')
  })

  it('nothing moved → null, and the caller must SAY nothing moved', () => {
    expect(targetingChangeSentence(diffTargeting(BEFORE, { ...BEFORE }))).toBeNull()
    expect(targetingUnchanged(diffTargeting(BEFORE, { ...BEFORE }))).toBe(true)
    // ⚠️ AND THE SENTENCE FOR THAT STATE IS NOT AN UPDATE CLAIM.
    expect(TARGETING_UNCHANGED_SENTENCE).toContain('nothing changed')
    expect(TARGETING_UNCHANGED_SENTENCE.toLowerCase()).not.toContain('updated')
  })

  it('a reorder is not a change; a case change is', () => {
    const reordered = { ...BEFORE, job_titles: ['Founder/CEO'], industries: ['Consulting'] }
    expect(targetingUnchanged(diffTargeting(BEFORE, reordered))).toBe(true)
    // The closed lists are case-sensitive values; treating these as equal would hide an edit.
    expect(targetingUnchanged(diffTargeting(BEFORE, { ...BEFORE, industries: ['consulting'] }))).toBe(false)
  })

  it('an ADDED and a REMOVED filter are each named with the values involved', () => {
    const added = targetingChangeSentence(diffTargeting(BEFORE, { ...BEFORE, keywords: ['SEO'] }))
    expect(added).toContain('added a keyword filter of SEO')
    const removed = targetingChangeSentence(diffTargeting(BEFORE, { ...BEFORE, geographies: [] }))
    // Dropping a filter WIDENS who we look at — the change a client is least likely to have
    // meant, so it is stated with what it was rather than folded into "updated".
    expect(removed).toContain('removed the country filter of United Kingdom')
  })

  it('several moves in one sentence, each with its own verb', () => {
    const s = targetingChangeSentence(diffTargeting(BEFORE, {
      ...BEFORE, industries: ['Fintech'], keywords: ['SEO'], seniority_levels: [],
    }))!
    expect(s).toContain('changed the industry from Consulting to Fintech')
    expect(s).toContain('removed the seniority filter of C-Suite')
    expect(s).toContain('added a keyword filter of SEO')
  })

  it('🛑 the PARKED mood never says "I\'ve changed"', () => {
    const s = targetingChangeSentence(diffTargeting(BEFORE, { ...BEFORE, industries: ['Fintech'] }), 'requested')!
    expect(s.startsWith('You’ve asked me to change the industry')).toBe(true)
    expect(s).toContain('and keep the')
    expect(s.includes('I’ve'), 'a waiting revision is described as done').toBe(false)
  })

  it('a size band reads as a headcount, and the stored value is untouched', () => {
    const s = targetingChangeSentence(diffTargeting(BEFORE, { ...BEFORE, company_sizes: ['51–200'] }))!
    expect(s).toContain('from 10–50 employees to 51–200 employees')
  })

  it('an empty field that stayed empty is not a filter we "kept"', () => {
    const s = targetingChangeSentence(diffTargeting(BEFORE, { ...BEFORE, industries: ['Fintech'] }))!
    // `tech_stack` and `keywords` are empty in both states; claiming we kept them would be
    // inventing filters the client does not have.
    expect(s.toLowerCase()).not.toContain('technology')
    expect(s.toLowerCase()).not.toContain('keyword')
  })

  it('rubbish in a field is ignored rather than narrated', () => {
    // A non-array, a blank string and a non-string cannot become a claim about targeting.
    expect(targetingUnchanged(diffTargeting({ industries: 'Consulting' as never }, { industries: [] }))).toBe(true)
    expect(targetingUnchanged(diffTargeting({ industries: ['Consulting'] }, { industries: ['Consulting', '  '] }))).toBe(true)
  })

  it('the list reads like a person wrote it', () => {
    expect(joinList([])).toBe('')
    expect(joinList(['A'])).toBe('A')
    expect(joinList(['A', 'B'])).toBe('A and B')
    expect(joinList(['A', 'B', 'C'])).toBe('A, B and C')
  })

  it('every revisable field is covered, and the core read selects all of them', () => {
    expect([...TARGETING_FIELDS].sort()).toEqual([
      'company_sizes', 'geographies', 'industries', 'job_titles', 'keywords',
      'seniority_levels', 'tech_stack',
    ])
    // 🛑 THE DIFF CAN ONLY SEE WHAT THE SELECT READ. `coreIcpRow`'s column list is one
    // unbroken literal (supabase-js infers the row type from it), so this is the guard that
    // stops a field being added to the diff and silently arriving as `undefined`.
    const cols = ICPS.slice(ICPS.indexOf('const cols = '), ICPS.indexOf('const { data: live }'))
    for (const f of TARGETING_FIELDS) {
      expect(cols, `the core read does not select ${f}`).toContain(f)
    }
  })
})

describe('🛑 ③ the surfaces actually use the rules', () => {
  it('the transport carries the CODE, not just the prose', () => {
    const c = code(TRANSPORT)
    expect(c).toContain("if (typeof data.code === 'string' && data.code) err.code = data.code")
  })

  it('🛑 the generic collapse is gone from the conversation', () => {
    const c = code(CHAT)
    expect(c.includes(COLLAPSE), 'every failure is one sentence again').toBe(false)
    expect(c).toContain('chatFailureMessage(failureOf(e).status)')
    expect(c).toContain('refinementFailureMessage({ status: f.status, code: f.code })')
  })

  it('🛑 the server\'s prose is never printed as Milla\'s answer', () => {
    // `e instanceof Error ? e.message : …` was the line that did it, on both paths.
    const save = code(CHAT).slice(code(CHAT).indexOf('async function saveIcpDraft'))
    expect(save.includes('e.message'), 'the server sentence is spoken by Milla again').toBe(false)
    expect(code(CHAT).includes('e instanceof Error ? e.message'), 'the raw message is back').toBe(false)
  })

  it('the client\'s typed message survives a failed turn', () => {
    // `setInput('')` runs before the request; "try again" to an empty box means "retype it".
    expect(code(CHAT)).toContain('setInput(prev => (prev.trim() ? prev : msg))')
  })

  it('🛑 the proposal and the context survive a failed save', () => {
    const c = code(CHAT)
    const save = c.slice(c.indexOf('async function saveIcpDraft'), c.indexOf('const needsGoLive'))
    const catchAt = save.indexOf('} catch (e) {')
    expect(catchAt).toBeGreaterThan(-1)
    const after = save.slice(catchAt)
    // Clearing either of these would make the client rebuild the change in conversation
    // before they could try again.
    expect(after.includes('setIcpDraft(null)'), 'a failed save throws the proposal away').toBe(false)
    expect(after.includes('setContext(null)'), 'a failed save drops the ICP context').toBe(false)
  })

  it('the save is retried once; the session chat is NOT', () => {
    const c = code(CHAT)
    expect(c).toContain('withOneRetry(() => api.post<{')
    expect(c).toContain("withOneRetry(() => api.post<{ data: IcpDraft & { message?: string } }>(")
    // 🛑 `POST /milla/sessions/:id/chat` PERSISTS BOTH TURNS. An automatic re-send would
    // write the client's question twice and answer it twice.
    const sessionPost = c.slice(c.indexOf('/milla/sessions/${sid}/chat') - 120, c.indexOf('/milla/sessions/${sid}/chat'))
    expect(sessionPost.includes('withOneRetry'), 'the chat turn is auto-retried and would double-post').toBe(false)
  })

  it('the retry stops after one attempt, and only for "no answer"', () => {
    const c = code(CHAT)
    expect(c).toContain('if (attempts > REFINEMENT_RETRIES || !isRetryableOnce(failureOf(e).status)) throw e')
  })

  it('"here is the latest version" is kept by an actual re-read', () => {
    expect(code(CHAT)).toContain('if (f.code === REVISE_STATE_CHANGED_CODE) await rereadIcps()')
  })

  it('the success sentence is the SERVER\'s diff, and the parked path is not called live', () => {
    const c = code(CHAT)
    expect(c).toContain('const diff = r?.change?.sentence ?? null')
    expect(c).toContain('nothingMoved')
    expect(c).toContain('r?.pending_review')
    expect(c).toContain('Nothing has changed on your live targeting yet')
    // The one sentence that used to be said on every path, including the parked one.
    const applied = c.indexOf('That’s your live targeting now')
    expect(applied, 'the applied sentence is gone entirely').toBeGreaterThan(-1)
    const parkedBranch = c.slice(c.indexOf('r?.pending_review'), applied)
    expect(parkedBranch).toContain('Nothing has changed on your live targeting yet')
  })
})
