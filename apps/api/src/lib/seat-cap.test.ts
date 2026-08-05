// #616 — THE SEAT LIMIT GETS A CONTROL.
//
// `companies.seat_cap` was enforced at `company.ts` (a `>=` before every rep invite), defaulted
// to 25 by the database, and had **no write path anywhere in the product** — not a route, not a
// Vida screen, not an admin tool. It was also never displayed. So every company sat at exactly
// 25 forever, and the 409 at rep 26 said *"raise the cap to add more reps"*, naming a control
// that did not exist.
//
// Enforced + invisible + unchangeable is the worst of the three states: the rule is real, the
// reason is hidden, and the instruction is impossible.
//
// The founder's model is that a **sysadmin / billing contact** owns this number — one company
// with ten salespeople is ten Milla consoles, and who pays for how many is the owner's call,
// not a manager's.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

// ⚠️ READ FROM SOURCE, NOT IMPORTED. `routes/company.ts` imports `@kind/db`, whose client
// throws at module load without SUPABASE_URL — importing it here fails the whole suite before a
// single assertion runs. The constants are parsed out instead, which also proves they are
// exported rather than inlined twice.
const SRC = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/company.ts'), 'utf8'))
const constFrom = (name: string): number => {
  const m = SRC.match(new RegExp(`export const ${name} = (\\d+)`))
  if (!m) throw new Error(`${name} is not exported from routes/company.ts`)
  return Number(m[1])
}
const DEFAULT_SEAT_CAP = constFrom('DEFAULT_SEAT_CAP')
const MAX_SEAT_CAP = constFrom('MAX_SEAT_CAP')

/** The PATCH handler's body, bounded by the next route registration. */
function seatCapRoute(): string {
  const i = SRC.indexOf("companyRouter.patch('/seat-cap'")
  expect(i, 'the seat-cap route must exist').toBeGreaterThan(-1)
  const next = SRC.indexOf('companyRouter.', i + 20)
  return SRC.slice(i, next > i ? next : undefined)
}

describe('the control exists at all', () => {
  it('there is a PATCH route for the seat limit', () => {
    expect(SRC).toContain("companyRouter.patch('/seat-cap'")
  })

  it('the constants are exported rather than being magic numbers in two places', () => {
    expect(DEFAULT_SEAT_CAP).toBe(25)
    expect(MAX_SEAT_CAP).toBe(100)
  })

  it('the enforcement site reads the constant, not a second literal 25', () => {
    // Two copies of a default is how the invite guard and the display start disagreeing about
    // what the limit is.
    //
    // ⚠️ Anchored on CODE, not on a comment. The first version searched for the string
    // "Seat-cap guard" — which lives in a comment, and `SRC` is comment-stripped, so the
    // anchor was never there and the slice was empty. An empty haystack fails honestly here,
    // but the same mistake in a `.not.toContain` assertion would have passed while proving
    // nothing. This repo has burned on comment-anchored assertions five times.
    expect(SRC).toContain('const cap = Number((company as any)?.seat_cap ?? DEFAULT_SEAT_CAP)')
  })
})

// ── RED PROOF ① — OWNER ONLY, stricter than canManage ────────────────────────────────────
describe('only the owner may change what the company pays for', () => {
  const route = seatCapRoute()

  it('gates on isOwner, NOT on canManage', () => {
    expect(route).toContain('ctx.isOwner')
    // canManage admits managers. A manager runs the reps day to day; committing the company to
    // more seats is a different decision and a different person.
    expect(route).not.toContain('canManage(')
  })

  it('the refusal explains WHY it is the owner, not just that it is', () => {
    expect(route).toMatch(/manager runs the reps/i)
    expect(route).toContain('403')
  })
})

// ── RED PROOF ② — a cap below the seats in use is refused, with the count named ─────────
describe('lowering the limit below the seats in use is refused', () => {
  const route = seatCapRoute()

  it('compares against the live rep count', () => {
    expect(route).toContain("eq('seat_role', 'rep')")
    expect(route).toContain('seat_cap < inUse')
  })

  it('the refusal NAMES the count and says what to do instead', () => {
    // A bare "cannot do that" would leave the owner guessing which number was wrong.
    expect(route).toMatch(/\$\{inUse\}/)
    expect(route).toMatch(/Deactivate the seats/i)
    expect(route).toContain('409')
  })

  it('it refuses rather than silently accepting — no seat is ever removed by typing a number', () => {
    // The enforcement is a >= at invite time, so accepting a smaller cap would not remove
    // anybody; it would just make the next invite fail for a reason nothing on screen explains.
    // Bounded by the WRITE, not by a character count: the property is that the refusal's
    // `return` happens BEFORE the update is reached. A fixed-width window overran the if-block
    // and swept the legitimate update in with it (the same overrun that made #613's ordering
    // proof pass when it should have failed).
    const guardAt = route.indexOf('seat_cap < inUse')
    const writeAt = route.indexOf('update({ seat_cap })')
    expect(guardAt, 'the guard exists').toBeGreaterThan(-1)
    expect(writeAt, 'the write exists').toBeGreaterThan(-1)
    expect(guardAt, 'the guard must come BEFORE the write').toBeLessThan(writeAt)
    const between = route.slice(guardAt, writeAt)
    expect(between, 'the refusal must return before reaching the write').toContain('return')
  })
})

// ── RED PROOF ③ — the bounds ─────────────────────────────────────────────────────────────
describe('the limit is bounded', () => {
  const route = seatCapRoute()

  it('validates 1..MAX_SEAT_CAP through zod', () => {
    expect(route).toContain('z.number().int().min(1).max(MAX_SEAT_CAP)')
  })

  it('a bad value returns 400 with a readable message, not a zod dump', () => {
    expect(route).toContain('ZodError')
    expect(route).toMatch(/whole number between 1 and/i)
  })

  it('the write is CHECKED — supabase-js returns { error } rather than throwing', () => {
    expect(route).toContain('if (error)')
    expect(route).toMatch(/seat limit was NOT changed/)
  })
})

// ── RED PROOF ④ — the 409 at the cap names the real number ───────────────────────────────
describe('the invite refusal stopped promising a control that did not exist', () => {
  it('names the actual cap and the seats in use', () => {
    const i = SRC.indexOf('Seat cap reached')
    expect(i).toBeGreaterThan(-1)
    const msg = SRC.slice(i - 200, i + 500)
    expect(msg).toMatch(/\$\{cap\}/)
    expect(msg).toMatch(/\$\{count \?\? 0\}/)
    expect(msg).toMatch(/Command Centre/)
  })

  it('the old dead wording is gone', () => {
    // "raise the cap to add more reps" pointed at nothing for as long as the guard existed.
    expect(SRC).not.toContain('raise the cap to add more reps')
  })

  it('the response carries the numbers so a UI can warn before the wall', () => {
    const i = SRC.indexOf('Seat cap reached')
    const msg = SRC.slice(i, i + 400)
    expect(msg).toContain('seat_cap: cap')
    expect(msg).toContain('seats_used')
  })
})

describe('the overview hands the UI what it needs to warn', () => {
  it('totals carry seat_cap AND seats_used', () => {
    const t = SRC.slice(SRC.indexOf('const totals = {'), SRC.indexOf('const totals = {') + 900)
    expect(t).toContain('seat_cap:')
    expect(t).toContain('seats_used:')
  })

  it('the portal type declares them — undeclared means unrenderable', () => {
    const portal = readFileSync(join(__dirname, '../../../../apps/portal/src/app/(dashboard)/dashboard/company/page.tsx'), 'utf8')
    expect(portal).toContain('seat_cap?: number')
    expect(portal).toContain('seats_used?: number')
  })
})

describe('the dead "Add member" button points somewhere real', () => {
  const team = stripCommentsForEnvScan(readFileSync(join(__dirname, '../../../../apps/portal/src/app/(dashboard)/dashboard/team/page.tsx'), 'utf8'))

  it('no longer navigates to a settings anchor nothing handles', () => {
    expect(team).not.toContain('/milla/settings#team')
  })

  it('goes to the Command Centre, where the real invite flow lives', () => {
    expect(team).toContain('/milla/command-centre')
  })
})
