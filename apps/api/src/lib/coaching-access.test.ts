// ⚑ 1 Oct (R180) — the Coaching ladder, in one place.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@kind/db', () => ({ db: { from: () => ({}) } }))
import { accessFrom } from './coaching-access'

describe('Coaching access — R180\'s ladder', () => {
  it('Founders: prep only', () => expect(accessFrom('founders', false)).toMatchObject({ growthExtras: false, full: false }))
  it('Growth: its own extras, not the whole product', () => expect(accessFrom('growth', false)).toMatchObject({ growthExtras: true, full: false }))
  it('Enterprise: the whole product, without buying it', () => expect(accessFrom('enterprise', false)).toMatchObject({ growthExtras: true, full: true }))
  it('Founders or Growth with Full Coaching turned on: the whole product', () => {
    expect(accessFrom('founders', true)).toMatchObject({ full: true, growthExtras: true })
    expect(accessFrom('growth', true)).toMatchObject({ full: true })
  })
  it('no plan: nothing unlocked', () => expect(accessFrom(null, false)).toMatchObject({ full: false, growthExtras: false }))
})
