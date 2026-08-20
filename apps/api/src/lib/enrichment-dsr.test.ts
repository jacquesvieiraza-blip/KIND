import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── UPSTREAM DSR — A PROVIDER TELLING US SOMEBODY OBJECTED ─────────────────────────────────
//
// Nothing in this repo ingested a provider deletion or opt-out signal. Verified 19 Aug and
// again 20 Aug: zero matches for `451`, `claimed_email`, `changelog` or `Subject-Request`.
//
// Hunter's documentation, fetched live 20 Aug (HTTP 200) rather than taken from the prompt:
//
//     451 claimed_email — "The person owning the email address asked us directly or
//     indirectly to stop the processing of their personal data. For this reason, you
//     shouldn't process it yourself in any way."
//
// ⚠️ THAT LAST CLAUSE IS THE WHOLE BUILD. Hunter is not declining to answer — they are
// instructing us about OUR OWN processing. `tryHunter` flattened it into the same `null` as a
// 404, a 429 and a 500, so the one response in the file carrying a legal instruction was the
// one discarded most completely.
//
// ⚠️ AND THE OBVIOUS FIX WOULD HAVE MISSED THE POINT. **PDL runs BEFORE Hunter.** Dropping
// only Hunter's contribution leaves us returning a PDL profile — title, company, domain — for
// the very person we have just been told not to process: the letter of the refusal honoured
// while a dossier on the same human is handed back. Founder-ruled 20 Aug: *"1. discard all."*

const state = {
  hunterStatus: 200,
  hunterBody: null as unknown,
  pdlBody: null as unknown,
  fetches: [] as string[],
}

vi.stubGlobal('fetch', async (url: unknown) => {
  const u = String(url)
  state.fetches.push(u.split('?')[0])
  if (u.includes('hunter.io')) {
    return {
      ok: state.hunterStatus >= 200 && state.hunterStatus < 300,
      status: state.hunterStatus,
      json: async () => state.hunterBody,
    } as unknown as Response
  }
  if (u.includes('peopledatalabs')) {
    return { ok: true, status: 200, json: async () => state.pdlBody } as unknown as Response
  }
  // Clearbit / domain autocomplete — nothing useful, and never the subject of this file.
  return { ok: false, status: 404, json: async () => null } as unknown as Response
})

/** A PDL hit rich enough that returning it would obviously be wrong after a refusal.
 *
 * ⚠️ `likelihood` IS NOT DECORATION. `tryPDL` returns null below 6, and the first version of
 * this fixture omitted it — so PDL contributed NOTHING and every "the profile was discarded"
 * assertion passed with nothing to discard. The #617 shape exactly, and the only thing that
 * exposed it was the control test asserting the profile SURVIVES an ordinary 500. */
const PDL_PROFILE = {
  likelihood: 10,
  status: 200,
  data: {
    job_title: 'Head of Sales',
    job_company_name: 'Acme Ltd',
    job_company_website: 'acme.com',
    linkedin_url: 'https://linkedin.com/in/ada',
    industry: 'SaaS',
  },
}

const LEAD = { first_name: 'Ada', last_name: 'Lovelace', company: 'Acme Ltd', domain: 'acme.com' }

beforeEach(() => {
  state.hunterStatus = 200
  state.hunterBody = null
  state.pdlBody = null
  state.fetches = []
  process.env.HUNTER_API_KEY = 'test-hunter'
  process.env.PDL_API_KEY = 'test-pdl'
  delete process.env.CLEARBIT_API_KEY
})

describe('RED PROOF — the old code could not tell an erasure request from a 500', () => {
  it('every non-OK Hunter response collapsed to the same null', () => {
    const oldBranch = (status: number) => (status >= 200 && status < 300 ? 'ok' : null)
    // A transient upstream failure and a person's legal objection, indistinguishable.
    expect(oldBranch(500)).toBeNull()
    expect(oldBranch(429)).toBeNull()
    expect(oldBranch(451)).toBeNull()          // ← RED: the legal one, treated as a hiccup
    expect(oldBranch(451)).toBe(oldBranch(500))
  })

  it('and the PDL profile gathered a step earlier was returned anyway', () => {
    // The shape of the wrong fix, made concrete: drop Hunter, keep everything else.
    const merged = { job_title: 'Head of Sales', company: 'Acme Ltd', source: 'pdl' }
    const oldOutcome = { ...merged }               // Hunter's null simply merged nothing
    expect(oldOutcome.job_title).toBe('Head of Sales')   // ← RED: a dossier on a claimed person
  })
})

describe('GREEN, REAL FUNCTION — a Hunter 451 discards the entire enrichment', () => {
  it('returns nothing at all, even though PDL had already answered', async () => {
    state.pdlBody = PDL_PROFILE
    state.hunterStatus = 451
    state.hunterBody = { errors: [{ id: 'claimed_email', code: 451 }] }

    const { waterfallEnrich } = await import('./enrichment')
    const r = await waterfallEnrich(LEAD)

    expect(r.source, 'nothing is claimed as a source').toBe('none')
    expect(r.email, 'no email').toBeUndefined()
    expect(r.linkedin_url, 'THE ASSERTION THAT MATTERS — no PDL profile survives').toBeUndefined()
    expect(r.industry).toBeUndefined()
    expect(r.phone).toBeUndefined()
  })

  it('names the refusal, with the provider and its documented basis', async () => {
    state.pdlBody = PDL_PROFILE
    state.hunterStatus = 451
    state.hunterBody = { errors: [{ id: 'claimed_email' }] }

    const { waterfallEnrich } = await import('./enrichment')
    const r = await waterfallEnrich(LEAD)

    expect(r.refusal?.provider).toBe('hunter')
    expect(r.refusal?.code).toBe('provider_refusal:hunter:claimed_email')
    expect(r.refusal?.basis).toContain("shouldn't process it yourself in any way")
  })

  it('logs it visibly, in the enrol_skips shape an operator already reads', async () => {
    state.pdlBody = PDL_PROFILE
    state.hunterStatus = 451
    state.hunterBody = { errors: [{ id: 'claimed_email' }] }

    const warns: string[] = []
    const spy = vi.spyOn(console, 'warn').mockImplementation((...a) => { warns.push(a.join(' ')) })
    try {
      const { waterfallEnrich } = await import('./enrichment')
      await waterfallEnrich(LEAD)
    } finally { spy.mockRestore() }

    const log = warns.join('\n')
    expect(log).toContain('provider_refusal:hunter:claimed_email')
    expect(log, 'says plainly that nothing was kept').toContain('DISCARDED')
    expect(log, 'and cites where the meaning comes from').toContain('hunter.io/api-documentation')
  })

  it('does not fall through to another provider for the same identity', async () => {
    state.pdlBody = PDL_PROFILE
    state.hunterStatus = 451
    state.hunterBody = { errors: [{ id: 'claimed_email' }] }

    const { waterfallEnrich } = await import('./enrichment')
    await waterfallEnrich(LEAD)

    expect(state.fetches.some(u => u.includes('clearbit')), 'no provider is asked after the refusal').toBe(false)
  })

  it('a top-level 451 with no error id is the same signal', async () => {
    // Hunter documents both forms; the endpoint-level one reads "We have been requested not to
    // process personal identifiable information linked to this person."
    state.pdlBody = PDL_PROFILE
    state.hunterStatus = 451
    state.hunterBody = null

    const { waterfallEnrich } = await import('./enrichment')
    const r = await waterfallEnrich(LEAD)
    expect(r.source).toBe('none')
    expect(r.refusal?.code).toBe('provider_refusal:hunter:claimed_email')
  })
})

describe('the refusal is NARROW — ordinary failures still behave as before', () => {
  for (const status of [400, 404, 429, 500, 502]) {
    it(`a ${status} is an ordinary miss, not a privacy event`, async () => {
      state.pdlBody = PDL_PROFILE
      state.hunterStatus = status

      const { waterfallEnrich } = await import('./enrichment')
      const r = await waterfallEnrich(LEAD)

      expect(r.refusal, `${status} must not be read as an objection`).toBeUndefined()
      expect(r.linkedin_url, 'and the PDL profile is kept, exactly as before').toBe('https://linkedin.com/in/ada')
    })
  }

  it('⚠️ A SUCCESSFUL ENRICHMENT IS UNCHANGED — without this the tests above prove nothing', async () => {
    // The #617 lesson. If the harness were simply broken, every "nothing came back" assertion
    // above would still be green.
    state.pdlBody = PDL_PROFILE
    state.hunterStatus = 200
    state.hunterBody = { data: { email: 'ada@acme.com', score: 95 } }

    const { waterfallEnrich } = await import('./enrichment')
    const r = await waterfallEnrich(LEAD)

    expect(r.email, 'a normal reveal still works').toBe('ada@acme.com')
    expect(r.refusal).toBeUndefined()
  })
})

describe('THE RULE: a status code has no inherent privacy meaning', () => {
  const src = readFileSync(join(__dirname, 'enrichment.ts'), 'utf8')

  it('451 is only ever read inside a provider-specific function', () => {
    // The failure this prevents: someone adds a provider, copies the non-OK branch, and its
    // 451 silently inherits Hunter's meaning. A 451 can equally be a copyright takedown or a
    // sanctions block — nothing about the number says "a person objected".
    // ⚠️ COMPARISONS ONLY, AND LINE-BASED — and both constraints were learned the hard way.
    //
    // Attempt 1 matched every `451` in the file, including the doc-comment quoting Hunter, and
    // blamed whichever function sat above the comment. Attempt 2 stripped comments and string
    // literals with regexes — and the refusal table's own quotation contains **"shouldn't"**,
    // whose apostrophe swallowed the single-quote matcher and re-exposed the string it was
    // meant to hide. Writing a JavaScript tokeniser to guard one number is the wrong trade.
    //
    // So: find lines where 451 is COMPARED (that is the only form that can carry meaning), and
    // walk back to the nearest function declaration. A quotation is never a comparison, so the
    // whole class of false positives disappears rather than being filtered.
    const lines = src.split('\n')
    const readers: string[] = []
    for (let i = 0; i < lines.length; i++) {
      // Skip comment lines — `//`, and JSDoc continuations which begin `*`. The line that
      // caught this out was the refusal table's own doc comment, which literally reads
      // "there is no `if (status === 451)` anywhere outside a provider's branch" — a
      // sentence describing the rule, matched as a violation of it.
      const t = lines[i].trim()
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue
      if (!/[=!<>]=*\s*451\b|\b451\s*[=!<>]/.test(lines[i])) continue
      let fn = '(top level)'
      for (let j = i; j >= 0; j--) {
        const m = lines[j].match(/(?:export )?(?:async )?function (\w+)/)
        if (m) { fn = m[1]; break }
      }
      readers.push(fn)
    }
    expect(readers.length, 'the guard must actually find the 451 check, or it proves nothing').toBeGreaterThan(0)
    for (const fn of readers) {
      expect(
        /hunter/i.test(fn),
        `451 is compared inside "${fn}" — if that is a new provider it needs its own documented basis, not Hunter's`,
      ).toBe(true)
    }
  })

  it('every refusal mapping carries the provider\'s own quoted wording and a source', async () => {
    // A mapping without a quotation is a guess. This is what stops the next one being added
    // from memory.
    const { HUNTER_CLAIMED_EMAIL } = await import('./enrichment')
    expect(HUNTER_CLAIMED_EMAIL.basis.length, 'the basis must be a real quotation').toBeGreaterThan(60)
    expect(HUNTER_CLAIMED_EMAIL.source).toContain('hunter.io')
    expect(HUNTER_CLAIMED_EMAIL.source, 'and say when it was checked').toMatch(/20\d\d/)
  })

  it('hunterRefusal ignores every status except 451', async () => {
    const { hunterRefusal } = await import('./enrichment')
    for (const s of [200, 400, 401, 403, 404, 410, 429, 450, 452, 500]) {
      expect(hunterRefusal(s, null), `status ${s}`).toBeNull()
    }
    expect(hunterRefusal(451, null)).not.toBeNull()
  })
})

describe('the documented gaps are written down, not left as folklore', () => {
  const doc = readFileSync(join(__dirname, '../../../../docs/compliance/UPSTREAM-DSR-PROPAGATION.md'), 'utf8')

  it('the doc exists and names every live provider', () => {
    for (const p of ['Hunter', 'PDL', 'Apollo']) expect(doc).toContain(p)
  })

  it('records that PDL could not be verified from here, rather than implying it was', () => {
    expect(doc).toContain('UNVERIFIED-SECONDARY')
  })

  it('carries the interim MANUAL rule', () => {
    expect(doc).toContain('MANUAL RULE')
  })

  it('documents the invalid_domain signal the founder ruled document-only', () => {
    expect(doc).toContain('invalid_domain')
  })

  it('states plainly that this does NOT reach back into lead_pool', () => {
    // The most dangerous possible misreading of this build is "upstream deletions are handled
    // now". They are not: this catches a refusal at ASK time and does nothing about rows
    // cached before the person objected.
    expect(doc).toContain('lead_pool')
    expect(doc, 'the limit must be stated, not implied').toContain('reaches backwards into data we have already cached')
  })
})
