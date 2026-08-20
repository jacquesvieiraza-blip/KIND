import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  LAUNCH_SEND_COUNTRIES, isLaunchSendCountry, launchHoldReason,
  launchHoldMessage, launchTargetRefusal,
} from '@kind/shared'
import { isUkCountry } from './pecr'

// THE LAUNCH ALLOWLIST — AND THE DRIFT GUARD BETWEEN THE TWO UK LISTS.
//
// There are now two country lists in this repository that both know about the UK:
//
//   • `apps/api/src/lib/pecr.ts` → `UK_COUNTRIES`, answering "does UK law govern this send?"
//   • `packages/shared/src/launch-countries.ts` → answering "have we opened this country?"
//
// They are separate on purpose (see the header of the launch file), and separate lists drift.
// The failure is silent and one-directional in the dangerous way: if somebody adds a UK
// spelling to PECR's list — `'jersey'`, `'isle of man'`, `'gb-eng'` — PECR starts recognising
// a lead as UK while the launch gate does not recognise it as an allowed country, so a
// perfectly legitimate British lead is held forever and nothing anywhere says why. Nobody
// would look for the cause in a file about UK statute.
//
// This test reads PECR's array OUT OF ITS SOURCE rather than importing it, because the const is
// private and exporting it purely to be tested would widen the file's surface for a test's
// convenience. Reading the source is the same technique `schema-drift.test.ts` uses, and it has
// the property that matters here: it sees the list as WRITTEN, not as re-exported.

describe('drift guard — PECR\'s UK list and the launch allowlist cannot diverge', () => {
  const pecrSource = readFileSync(join(__dirname, 'pecr.ts'), 'utf8')

  const ukCountriesFromPecrSource = (): string[] => {
    const block = pecrSource.match(/const UK_COUNTRIES\s*=\s*\[([\s\S]*?)\]/)
    if (!block) throw new Error('Could not find UK_COUNTRIES in pecr.ts — the drift guard is blind. Fix the matcher, do not delete the test.')
    return [...block[1].matchAll(/'([^']+)'/g)].map(m => m[1])
  }

  it('finds a real, non-trivial UK list in pecr.ts (the guard is not silently reading nothing)', () => {
    // Without this, a refactor that renames the const leaves the matcher finding an empty array
    // and every assertion below passing vacuously — a green test proving nothing, which is the
    // #617 harness lesson.
    const list = ukCountriesFromPecrSource()
    expect(list.length).toBeGreaterThanOrEqual(10)
    expect(list).toContain('united kingdom')
  })

  it('every country PECR treats as UK is a country the launch gate will send to', () => {
    for (const c of ukCountriesFromPecrSource()) {
      expect(isUkCountry(c), `pecr.ts says "${c}" is UK`).toBe(true)
      expect(
        isLaunchSendCountry(c),
        `"${c}" is in pecr.ts's UK_COUNTRIES but the launch allowlist does not recognise it — ` +
        `a legitimate UK lead would be held with no explanation. Add it to LAUNCH_COUNTRY_TOKENS.`,
      ).toBe(true)
    }
  })
})

describe('isLaunchSendCountry', () => {
  it('accepts the US and the UK however enrichment happens to spell them', () => {
    // PDL writes lowercase, an Apollo CSV writes title case, a human writes anything.
    for (const c of ['US', 'us', 'U.S.', 'USA', 'United States', 'united states of america', 'America']) {
      expect(isLaunchSendCountry(c), c).toBe(true)
    }
    for (const c of ['UK', 'uk', 'GB', 'United Kingdom', 'Great Britain', 'England', 'Scotland', 'Wales', 'Northern Ireland']) {
      expect(isLaunchSendCountry(c), c).toBe(true)
    }
  })

  it('is insensitive to case and surrounding whitespace', () => {
    expect(isLaunchSendCountry('  UnItEd KiNgDoM  ')).toBe(true)
  })

  it('holds every country we have not opened', () => {
    // The African list the ICP builder suggests is the one that matters commercially — before
    // the front-door fence, each of these was a country we would happily have bought leads in.
    for (const c of ['South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt', 'Rwanda', 'Tanzania', 'Uganda', 'Senegal', "Cote d'Ivoire"]) {
      expect(isLaunchSendCountry(c), c).toBe(false)
    }
    for (const c of ['Ireland', 'Canada', 'Australia', 'Germany', 'India']) {
      expect(isLaunchSendCountry(c), c).toBe(false)
    }
  })

  it('⚠️ HOLDS A BLANK COUNTRY — the deliberate inversion of pecrVerdict', () => {
    // `pecrVerdict` ALLOWS an unknown country: refusing on a missing field would delete most of
    // the book on a legal test that may not even apply. This gate is commercial and inverts it —
    // we cannot claim a lead is in the US or the UK when nothing on the row says so.
    //
    // Founder-locked 20 Aug. If this ever flips to `true`, every lead with no country starts
    // sending, which is precisely the outcome the allowlist exists to prevent.
    for (const c of [null, undefined, '', '   ']) {
      expect(isLaunchSendCountry(c)).toBe(false)
    }
  })

  it('does not match on substrings — "United Statesville" is not the United States', () => {
    // The whole-token care `hasCorporateMarker` needed, for the same reason: a loose match here
    // hands an unopened country an allowance it does not have.
    expect(isLaunchSendCountry('United Statesville')).toBe(false)
    expect(isLaunchSendCountry('New England')).toBe(false)
    expect(isLaunchSendCountry('Republic of Ireland')).toBe(false)
  })
})

describe('the words a person actually reads', () => {
  it('names the country in the skip reason, and says "unknown" when there is none', () => {
    expect(launchHoldReason('Nigeria')).toBe('launch_hold: Nigeria')
    expect(launchHoldReason(null)).toBe('launch_hold: unknown')
    expect(launchHoldReason('   ')).toBe('launch_hold: unknown')
  })

  it('⚠️ INTERPOLATES the open countries — never a typed "the US and the UK"', () => {
    // Same rule as every price a client can read. The day a third country opens, these
    // sentences must update themselves; a hard-typed pair is a promise that goes stale
    // silently. Asserted by deriving the expectation from the constant, so hard-typing the
    // names into the source would fail this.
    for (const c of LAUNCH_SEND_COUNTRIES) {
      expect(launchHoldMessage('Nigeria')).toContain(c)
      expect(launchTargetRefusal('Nigeria')).toContain(c)
    }
  })

  it('tells the client they were not charged and that the lead is still theirs', () => {
    const msg = launchHoldMessage('Nigeria')
    expect(msg).toContain('Nigeria')
    expect(msg).toContain('not charged')
    expect(msg.toLowerCase()).toContain('left them on your list')
  })

  it('says "without a country on record" rather than printing an empty gap', () => {
    expect(launchHoldMessage(null)).toContain('without a country on record')
    expect(launchHoldMessage(null)).not.toContain('in  —')
  })

  it('names the refused country back to the client', () => {
    expect(launchTargetRefusal('Nigeria')).toContain('Nigeria')
  })
})
