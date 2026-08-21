import { describe, it, expect } from 'vitest'
import {
  assembleBrief, hasSubstance, briefPromptContext, nextVersion, applyClientEdit,
  BRIEF_FIELDS,
} from './meeting-brief'

// P34 — the pure half. The evidence rule is the reason this file exists: it is a
// rule about what the product must NOT do, and rules like that rot silently
// unless something fails when they are broken.

describe('THE EVIDENCE RULE — nothing is invented, ever', () => {
  it('leaves every field empty when there is no evidence at all', () => {
    const b = assembleBrief({})
    expect(b.content).toEqual({})
    expect(b.provenance).toEqual({})
    expect(b.unsupported).toEqual([...BRIEF_FIELDS])
    expect(hasSubstance(b)).toBe(false)
  })

  it('fills ONLY what the evidence supports, and names what it could not', () => {
    const b = assembleBrief({ icp: { job_titles: ['Head of Ops'], industries: ['Logistics'] } })
    expect(b.content.target_personas).toBe('Head of Ops')
    expect(b.content.ideal_accounts).toBe('Logistics')
    // No knowledge row was supplied, so nothing about the offer may appear.
    expect(b.content.proposition).toBeUndefined()
    expect(b.content.proof_points).toBeUndefined()
    expect(b.unsupported).toContain('proposition')
    expect(b.unsupported).toContain('proof_points')
  })

  it('never guesses a proposition from an industry', () => {
    // The exact shape of invention this rule exists to stop: "they're in logistics,
    // so they probably sell freight software" is plausible, useful-sounding, and
    // has no evidence behind it.
    const b = assembleBrief({ icp: { industries: ['Logistics'] } })
    const text = JSON.stringify(b.content).toLowerCase()
    expect(text).not.toContain('software')
    expect(text).not.toContain('solution')
    expect(b.content.proposition).toBeUndefined()
  })

  it('treats blank and whitespace evidence as NO evidence', () => {
    const b = assembleBrief({
      icp: { job_titles: ['  ', ''], geographies: [] },
      knowledge: { pitch: '   ', product: '' },
    })
    expect(b.content.target_personas).toBeUndefined()
    expect(b.content.geography).toBeUndefined()
    expect(b.content.proposition).toBeUndefined()
  })

  it('records WHERE each field came from', () => {
    const b = assembleBrief({
      icp: { job_titles: ['COO'] },
      knowledge: { pitch: 'We cut fleet idle time' },
      antiSignals: ['too_big'],
    })
    expect(b.provenance.target_personas).toBe('icp')
    expect(b.provenance.proposition).toBe('knowledge')
    expect(b.provenance.anti_signals).toBe('feedback')
  })

  it('every populated field has provenance — no orphan values', () => {
    const b = assembleBrief({
      icp: { job_titles: ['COO'], industries: ['Logistics'], geographies: ['UK'] },
      knowledge: { pitch: 'x', differentiators: 'y' },
      antiSignals: ['wrong_industry'],
    })
    for (const [field, value] of Object.entries(b.content)) {
      if (value) expect(b.provenance[field as never], `${field} has no provenance`).toBeTruthy()
    }
  })
})

describe('the client edit is client evidence, and says so', () => {
  it('creates version 2 content without touching version 1\'s object', () => {
    const base = { target_personas: 'COO' }
    const prov = { target_personas: 'icp' as const }
    const out = applyClientEdit(base, prov, { target_personas: 'Head of Ops only' })
    expect(out.content.target_personas).toBe('Head of Ops only')
    // The inputs are untouched — the caller writes a NEW row from the result.
    expect(base.target_personas).toBe('COO')
    expect(prov.target_personas).toBe('icp')
  })

  it('RE-ATTRIBUTES an edited field to the client', () => {
    // Otherwise the brief keeps claiming the ICP said something the client wrote.
    const out = applyClientEdit({ target_personas: 'COO' }, { target_personas: 'icp' },
      { target_personas: 'CFO' })
    expect(out.provenance.target_personas).toBe('client')
  })

  it('leaves untouched fields — and their origin — exactly alone', () => {
    const out = applyClientEdit(
      { target_personas: 'COO', proposition: 'we cut idle time' },
      { target_personas: 'icp', proposition: 'knowledge' },
      { target_personas: 'CFO' })
    expect(out.content.proposition).toBe('we cut idle time')
    expect(out.provenance.proposition).toBe('knowledge')
  })

  it('a cleared field loses its provenance too', () => {
    const out = applyClientEdit({ target_personas: 'COO' }, { target_personas: 'icp' },
      { target_personas: '   ' })
    expect(out.content.target_personas).toBeUndefined()
    expect(out.provenance.target_personas).toBeUndefined()
  })

  it('ignores fields that are not part of a brief', () => {
    const out = applyClientEdit({}, {}, { status: 'approved', client_id: 'other', version: 99 })
    expect(out.content).toEqual({})
    expect(Object.keys(out.provenance)).toEqual([])
  })
})

describe('versions', () => {
  it('the first brief is version 1', () => {
    expect(nextVersion(null)).toBe(1)
    expect(nextVersion(undefined)).toBe(1)
    expect(nextVersion(0)).toBe(1)
  })

  it('an edit of v3 is v4', () => {
    expect(nextVersion(3)).toBe(4)
  })
})

describe('what reaches the two prompts', () => {
  it('renders nothing at all for an empty brief, so consumers stay byte-identical', () => {
    expect(briefPromptContext({})).toBeNull()
    expect(briefPromptContext({ objective: '   ' })).toBeNull()
  })

  it('renders only populated fields', () => {
    const s = briefPromptContext({ target_personas: 'COO', proposition: 'we cut idle time' })
    expect(s).toContain('Target personas: COO')
    expect(s).toContain('What they sell: we cut idle time')
    expect(s).not.toContain('Proof points')
  })

  it('labels geography as INTENT, never as permission', () => {
    // The launch allowlist and PECR are independent of this table. A model reading
    // "Target geography: Germany" without that qualifier could reasonably infer it
    // may write to Germany. The gates would still stop it — but the brief should
    // not be the thing arguing with them.
    const s = String(briefPromptContext({ geography: 'UK, Germany' }))
    expect(s).toContain('intent only — never a permission')
  })

  it('is identical for both consumers — one renderer, no divergence', () => {
    const content = { target_personas: 'COO', anti_signals: 'too_big' }
    expect(briefPromptContext(content)).toBe(briefPromptContext(content))
  })

  it('names anti-signals as rejections, so the model knows they are negatives', () => {
    const s = String(briefPromptContext({ anti_signals: 'too_big, wrong_industry' }))
    expect(s.toLowerCase()).toContain('rejecting')
  })
})
