// ═══════════════════════════════════════════════════════════════════════════════════════
// R142 (23 Sep) — SENIORITY IS APOLLO'S OWN ELEVEN VALUES, AND WHAT WE SEARCH IS WHAT WE CHECK
//
// Founder, verbatim: *"this is why we use apollo drop downs and make sure we do not assume. so
// this all needs to be fixed. we dont assume again. if unsure milla needs to ask."*
//
// The defect, live on Blackburne Enterprises: the search asked Apollo for `c_suite`; Apollo
// returned a Chief Executive Officer whose row says `c_suite`; our Proof check compared that
// with the stored label "C-Suite", called them different, and captioned him "not the seniority
// you asked for". This file RUNS the search builder and the check rather than reading them.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

// ⚠️ HOISTED — `./apollo` reaches `@kind/db`, which throws at module scope without these. No
// network is touched: nothing here calls a provider or the database.
vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  APOLLO_SENIORITIES, APOLLO_SENIORITY_LABELS, apolloSenioritiesFor, seniorityMatchesApollo,
} from '@kind/shared'
import { buildSearchBody } from './apollo'
import { hardFit } from './proof-fit'
import { PROVIDER_VOCABULARIES } from './icp-provider-translation'

const icp = (seniority_levels: string[], job_titles: string[] = []) => ({
  job_titles, seniority_levels, company_sizes: [], geographies: [], industries: [],
  tech_stack: [], keywords: [], apollo_only_consented: true,
})

describe('R142 · the eleven values are Apollo\'s own', () => {
  it('exactly the eleven `person_seniorities` Apollo documents, in its order', () => {
    expect(APOLLO_SENIORITIES.map(s => s.value)).toEqual(
      ['owner', 'founder', 'c_suite', 'partner', 'vp', 'head', 'director', 'manager', 'senior', 'entry', 'intern'])
  })

  it('every label the Brief offers reaches Apollo as exactly its own value', () => {
    for (const s of APOLLO_SENIORITIES) {
      expect(buildSearchBody(icp([s.label])).person_seniorities, s.label).toEqual([s.value])
    }
  })

  it('every label the Brief offers is an accepted value — a pick never raises a review', () => {
    for (const l of APOLLO_SENIORITY_LABELS) expect(PROVIDER_VOCABULARIES.seniority_levels).toContain(l)
  })

  it('an ICP saved before 23 Sep searches exactly as it always did', () => {
    expect(buildSearchBody(icp(['VP / Director'])).person_seniorities).toEqual(['vp', 'director'])
    expect(buildSearchBody(icp(['Individual Contributor'])).person_seniorities).toEqual(['entry'])
    expect(buildSearchBody(icp(['C-Suite', 'Head of'])).person_seniorities).toEqual(['c_suite', 'head'])
  })

  it('🛑 a word that is not a seniority is never guessed into one', () => {
    expect(apolloSenioritiesFor(['Big cheese', 'Decision makers'])).toEqual([])
    expect(buildSearchBody(icp(['Big cheese'])).person_seniorities).toBeUndefined()
  })
})

describe('R142 · the Proof check reads seniority the way the search sent it', () => {
  it('🛑 BLACKBURNE: a Chief Executive Officer Apollo returned as `c_suite` is the seniority asked for', () => {
    const fit = hardFit(
      { job_title: 'Chief Executive Officer', seniority: 'c_suite' } as never,
      icp(['C-Suite'], ['CEO', 'Founder']) as never,
    )
    expect(fit.seniority).toBe('yes')
  })

  it('every Apollo value on a row matches its own label', () => {
    for (const s of APOLLO_SENIORITIES) expect(seniorityMatchesApollo([s.label], s.value), s.value).toBe(true)
  })

  it('and a genuinely different seniority is still a different seniority', () => {
    expect(seniorityMatchesApollo(['C-Suite'], 'manager')).toBe(false)
    const fit = hardFit({ job_title: 'Office Manager', seniority: 'manager' } as never, icp(['C-Suite']) as never)
    expect(fit.seniority).toBe('no')
  })
})

describe('R142 · the Brief offers only the shared list', () => {
  const brief = readFileSync(join(__dirname, '..', '..', '..', 'portal', 'src', 'app', '(milla)', 'milla', 'welcome', 'page.tsx'), 'utf8')
  it('the seniority options ARE the shared Apollo labels — no hand-typed list', () => {
    expect(brief).toContain('const SENIORITY_OPTIONS: string[] = [...APOLLO_SENIORITY_LABELS]')
    const code = brief.replace(/^\s*\/\/.*$/gm, '')
    expect(code, 'an invented label is offered again').not.toContain("'Individual Contributor'")
  })
})
