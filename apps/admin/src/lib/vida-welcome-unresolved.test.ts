import { describe, it, expect } from 'vitest'
import {
  welcomeView, loadUnresolvedWelcomes, welcomeOutcomeLabel, needsAPerson,
  WELCOME_UNRESOLVED_PATH, WELCOME_READ_FAILED_COPY, WELCOME_NEEDS_A_PERSON,
  type WelcomeUnresolvedPayload, type UnresolvedWelcome,
} from './vida-welcome-unresolved'

// ═══════════════════════════════════════════════════════════════════════════════════════
// B3 — THE FAIL-CLOSED WELCOME-EMAIL STATES ARE VISIBLE TO A PERSON.
//
// 🛑 R120 deliberately does not resend past the 24-hour provider window: it keeps the claim,
// records `unresolved_expired`, and surfaces it. `payload_conflict` is the same. The entire
// value of both states is that somebody LOOKS — and Vida had no surface that called
// `GET /operator/welcome-emails/unresolved`.
//
// ⚠️ THE MOST IMPORTANT TEST IN THIS FILE IS B3-E. A failed read rendered as "all clear" is
// worse than no panel: it actively tells the operator that the thing they must check is fine.
// ═══════════════════════════════════════════════════════════════════════════════════════

const EXPIRED: UnresolvedWelcome = {
  client_id: 'c1', company_name: 'Redmayne & Co.',
  claimed_at: '2026-09-11T08:00:00.000Z',
  outcome: 'unresolved_expired', provider_message_id: null,
  action: 'The 24-hour provider protection has expired and we cannot prove whether this email was delivered.',
}
const CONFLICT: UnresolvedWelcome = {
  client_id: 'c2', company_name: 'Harlow Clinics',
  claimed_at: '2026-09-12T09:30:00.000Z',
  outcome: 'payload_conflict', provider_message_id: null,
  action: 'The welcome email was re-rendered differently from the first attempt.',
}
const IN_FLIGHT: UnresolvedWelcome = {
  client_id: 'c3', company_name: null,
  claimed_at: '2026-09-13T09:00:00.000Z',
  outcome: 'in_progress', provider_message_id: null,
  action: 'No action needed yet: the next onboarding retry will resolve it safely.',
}

const ok = (clients: UnresolvedWelcome[]): WelcomeUnresolvedPayload =>
  ({ success: true, data: { window_ms: 86_400_000, clients } })

describe('B3-A · the API result is rendered', () => {
  it('unresolved clients reach the view', async () => {
    const v = await loadUnresolvedWelcomes(async () => ok([EXPIRED, CONFLICT, IN_FLIGHT]))
    expect(v.state).toBe('ok')
    expect(v.rows).toHaveLength(3)
    expect(v.rows.map(r => r.client_id)).toEqual(['c1', 'c2', 'c3'])
    expect(v.windowMs).toBe(86_400_000)
  })

  it('🛑 it reads the ONE canonical operator path', async () => {
    const paths: string[] = []
    await loadUnresolvedWelcomes(async p => { paths.push(p); return ok([]) })
    expect(paths).toEqual(['/api/proxy/operator/welcome-emails/unresolved'])
    expect(WELCOME_UNRESOLVED_PATH).toBe('/api/proxy/operator/welcome-emails/unresolved')
  })

  it('every field the operator needs survives — including a NULL provider id', () => {
    const v = welcomeView(ok([EXPIRED]))
    const r = v.rows[0]
    expect(r.client_id).toBe('c1')
    expect(r.company_name).toBe('Redmayne & Co.')
    expect(r.claimed_at).toBe('2026-09-11T08:00:00.000Z')
    expect(r.outcome).toBe('unresolved_expired')
    // "No provider id" is the fact that makes the row unresolved. It must be present as null,
    // not quietly absent.
    expect(r).toHaveProperty('provider_message_id')
    expect(r.provider_message_id).toBeNull()
    // The server's own instruction is carried through unchanged.
    expect(r.action).toContain('24-hour provider protection has expired')
  })
})

describe('B3-B/B3-C · both terminal-for-automation states are visible', () => {
  it('unresolved_expired is visible and flagged as needing a person', () => {
    expect(needsAPerson(EXPIRED)).toBe(true)
    expect(welcomeOutcomeLabel('unresolved_expired')).toBe('Past the 24-hour window — unresolved')
  })

  it('payload_conflict is visible and flagged as needing a person', () => {
    expect(needsAPerson(CONFLICT)).toBe(true)
    expect(welcomeOutcomeLabel('payload_conflict')).toBe('Re-rendered differently — key spent')
  })

  it('🛑 the two states that resolve themselves are NOT presented as a standing job', () => {
    // `in_progress` and `ambiguous` inside the window are resolved by the next retry; the
    // server's own action sentence says so. Flagging them would teach the operator to ignore
    // the list.
    expect(needsAPerson(IN_FLIGHT)).toBe(false)
    expect([...WELCOME_NEEDS_A_PERSON]).toEqual(['unresolved_expired', 'payload_conflict'])
  })
})

describe('B3-D · an empty result is a truthful positive statement', () => {
  it('empty is its own state, distinct from failed', async () => {
    const v = await loadUnresolvedWelcomes(async () => ok([]))
    expect(v.state).toBe('empty')
    expect(v.rows).toEqual([])
    expect(v.error).toBeNull()
  })
})

describe('🛑 B3-E · a FAILED read must never read as "all clear"', () => {
  it('a thrown request is `failed`, not `empty`', async () => {
    const v = await loadUnresolvedWelcomes(async () => { throw new Error('API unreachable') })
    expect(v.state).toBe('failed')
    expect(v.state).not.toBe('empty')
    expect(v.error).toBe(WELCOME_READ_FAILED_COPY)
    expect(v.rows).toEqual([])
  })

  it('a non-success body is `failed`, and the server’s sentence is kept', async () => {
    const v = await loadUnresolvedWelcomes(async () => ({ success: false, error: 'Operator key required' }))
    expect(v.state).toBe('failed')
    expect(v.error).toBe('Operator key required')
  })

  it('a malformed/empty body is `failed`', () => {
    expect(welcomeView(null).state).toBe('failed')
    expect(welcomeView({} as WelcomeUnresolvedPayload).state).toBe('failed')
  })

  it('and the failure copy says the emptiness is NOT proof', () => {
    expect(WELCOME_READ_FAILED_COPY).toContain('NOT proof')
  })
})

describe('🛑 B3-F · rendering sends nothing and releases nothing', () => {
  it('loading issues exactly ONE request and it is the read path', async () => {
    const calls: string[] = []
    await loadUnresolvedWelcomes(async p => { calls.push(p); return ok([EXPIRED]) })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toBe(WELCOME_UNRESOLVED_PATH)
  })

  it('reloading repeatedly still only ever reads', async () => {
    const calls: string[] = []
    const get = async (p: string) => { calls.push(p); return ok([EXPIRED]) }
    await loadUnresolvedWelcomes(get)
    await loadUnresolvedWelcomes(get)
    await loadUnresolvedWelcomes(get)
    expect(calls).toEqual([WELCOME_UNRESOLVED_PATH, WELCOME_UNRESOLVED_PATH, WELCOME_UNRESOLVED_PATH])
  })

  it('🛑 this module exposes NO mutation at all — no resend, no release, no outcome write', async () => {
    const mod = await import('./vida-welcome-unresolved')
    const exported = Object.keys(mod)
    for (const banned of ['resend', 'release', 'send', 'retry', 'clearClaim', 'submit', 'post']) {
      expect(
        exported.some(k => k.toLowerCase().includes(banned.toLowerCase())),
        `vida-welcome-unresolved exports "${banned}" — this panel is visibility only`,
      ).toBe(false)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE WIRING. Structural, and stated as such: this repo has no component-test runtime
// (`@testing-library/react`/`jsdom` are not installed and adding them is a dependency change
// this batch is not authorised to make). Everything the panel DECIDES is driven for real
// above; what is asserted here is that the panel exists, is mounted in Vida, and calls the
// canonical read — the founder's tooth: "remove the API caller / render path → MUST FAIL".
// ═══════════════════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs'
import { join } from 'path'
const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

describe('🛑 B3 wiring — the panel exists, is mounted, and only reads', () => {
  const PANEL = 'apps/admin/src/components/vida/WelcomeEmailsPanel.tsx'
  const HOST  = 'apps/admin/src/app/cockpit/page.tsx'

  // ⛓️ CORRECTED BEFORE THIS SHIPPED. The first cut asserted `toMatch(/loadUnresolvedWelcomes/)`
  // — which the IMPORT LINE satisfies. Deleting the actual call left the panel rendering a
  // hard-coded empty list and the guard stayed green: a guard with no teeth, caught by running
  // the mutation rather than by reading it. It now pins the CALL SITE and the fetch inside it.
  it('🛑 the panel actually CALLS the canonical read — not merely imports it', () => {
    const src = read(PANEL)
    expect(src).toMatch(/from '@\/lib\/vida-welcome-unresolved'/)
    expect(src, 'the panel no longer calls loadUnresolvedWelcomes')
      .toMatch(/await loadUnresolvedWelcomes\(/)
    // …and the call really goes to the network, rather than a stub that resolves empty.
    expect(src).toMatch(/await loadUnresolvedWelcomes\(async path => \{\s*\n\s*const r = await fetch\(path\)/)
  })

  it('🛑 THE TOOTH: it is mounted in Vida', () => {
    const src = read(HOST)
    expect(src, 'WelcomeEmailsPanel is no longer imported into the cockpit')
      .toMatch(/import WelcomeEmailsPanel from '@\/components\/vida\/WelcomeEmailsPanel'/)
    expect(src, 'WelcomeEmailsPanel is no longer rendered').toMatch(/<WelcomeEmailsPanel \/>/)
  })

  // ⚠️ COMMENTS AND VISIBLE COPY ARE STRIPPED FIRST, and that is not a loophole — it is the
  // mistake this repo has now made nine times. The panel's own prose says "we never resend
  // automatically" and explains what releasing a claim would mean; a raw `not.toMatch(/resend/)`
  // matches the sentence that PROMISES the thing it is checking for.
  const codeOnly = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .split('\n').map(l => { const i = l.search(/(?<!:)\/\//); return i < 0 ? l : l.slice(0, i) }).join('\n')

  it('🛑 the panel issues NO mutation of any kind', () => {
    const src = codeOnly(read(PANEL))
    expect(src, 'the visibility-only panel gained a POST').not.toMatch(/method:\s*'POST'/)
    expect(src, 'the visibility-only panel gained a mutating fetch').not.toMatch(/method:\s*'(PUT|PATCH|DELETE)'/)
    // No call to anything that could send or release. `loadUnresolvedWelcomes` is the only
    // module function this panel is allowed to reach.
    expect(src).not.toMatch(/\b(resend|release|sendWelcome|retrySend)\s*\(/i)
  })

  it('a failed read is rendered as a failure, never as an empty list', () => {
    const src = read(PANEL)
    expect(src).toMatch(/view\.state === 'failed'/)
    expect(src).toMatch(/view\.state === 'empty'/)
  })
})
