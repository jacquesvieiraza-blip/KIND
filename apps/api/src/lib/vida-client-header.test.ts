// ⚑ 29 Sep (R174 · PR 5c) — VIDA'S CLIENT HEADER TELLS THE PROGRAMME STORY.
//   · the wallet chip shows the client's SHORTFALL CREDIT and the day it runs out (R136 ④, once
//     only, R166 ⑤ window from `SHORTFALL_CREDIT_EXPIRY_DAYS`) — or nothing;
//   · "Go-live %" (the old launch checklist) is replaced by the programme's readiness verdict;
//   · the fallback card that showed retired money when the lifecycle could not be read is gone,
//     and the "could not be read" line stays;
//   · sourcing is the programme's only — the old client-scoped branch is unreachable.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { SHORTFALL_CREDIT_EXPIRY_DAYS } from '@kind/shared'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const PAGE = read('apps/admin/src/app/vida/page.tsx')
const CONV = read('apps/admin/src/components/vida/VidaConversation.tsx')

// The page's two header helpers, lifted out and run.
function helpers() {
  const start = PAGE.indexOf('function readinessChip(')
  const end = PAGE.indexOf('/** ⚑ 29 Sep (R174 · 5b) — one programme count:')
  expect(start).toBeGreaterThan(-1)
  const src = PAGE.slice(start, end)
    .replace(/\(r: \{[^)]*\} \| null\): \{[^}]*\} \{/, '(r) {')
    .replace(/\(settlement: \{[^)]*\} \| null, now: Date\):\s*\{[^}]*\} \| null \{/, '(settlement, now) {')
    .replace(/\(b => b\.detail\)/, '(b => b.detail)')
  // eslint-disable-next-line no-new-func
  return new Function('SHORTFALL_CREDIT_EXPIRY_DAYS', `${src}; return { readinessChip, shortfallCreditChip }`)(SHORTFALL_CREDIT_EXPIRY_DAYS) as {
    readinessChip: (r: unknown) => { ready: boolean; label: string; title: string }
    shortfallCreditChip: (s: unknown, now: Date) => { label: string; title: string } | null
  }
}

describe('the shortfall credit chip', () => {
  it('shows the amount and the day it runs out — the window from the shared constant', () => {
    const { shortfallCreditChip } = helpers()
    const settled = '2026-09-01T00:00:00Z'
    const chip = shortfallCreditChip({ settled_at: settled, credit_cents: 59700 }, new Date('2026-09-29T00:00:00Z'))
    const until = new Date(Date.parse(settled) + SHORTFALL_CREDIT_EXPIRY_DAYS * 86_400_000)
      .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    expect(chip?.label).toBe(`$597 shortfall credit · until ${until}`)
  })
  it('nothing when there is no credit, or once it has run out', () => {
    const { shortfallCreditChip } = helpers()
    expect(shortfallCreditChip(null, new Date())).toBeNull()
    expect(shortfallCreditChip({ settled_at: '2026-09-01T00:00:00Z', credit_cents: 0 }, new Date('2026-09-02'))).toBeNull()
    expect(shortfallCreditChip({ settled_at: '2026-01-01T00:00:00Z', credit_cents: 500 }, new Date('2026-09-29'))).toBeNull()
  })
  it('the wallet balance is off the header', () => {
    expect(PAGE).not.toContain('historical wallet · inactive')
    expect(PAGE).not.toMatch(/wallet_balance_usd \?\? 0\)\.toLocaleString\(\)/)
  })
})

describe('readiness replaces Go-live %', () => {
  it('ready, not ready with what to clear, or unreadable', () => {
    const { readinessChip } = helpers()
    expect(readinessChip({ ready: true }).label).toBe('Ready')
    const n = readinessChip({ ready: false, blockers: [{ detail: 'Connect a mailbox.' }, { detail: 'Approve the sequence.' }] })
    expect(n.label).toBe('Not ready · 2 to clear')
    expect(n.title).toBe('Connect a mailbox.\nApprove the sequence.')
    expect(readinessChip(null).label).toBe('Readiness —')
  })
  it('the old checklist percentage is gone from the header', () => {
    expect(PAGE).not.toContain('Go-live {cockpit.onboarding.go_live.percent}%')
    expect(PAGE).toContain('const r = readinessChip(prog.readiness ?? null)')
  })
})

describe('the fallback card and the old sourcing branch', () => {
  it('the card is gone; the "could not be read" line stays', () => {
    expect(PAGE).not.toContain('{selectedWork && !lcCopy && (')
    expect(PAGE).toContain("? `This client's state could not be read (${progErr}). Nothing has changed, and nothing is sending.`")
  })
  it('sourcing is the programme’s only', () => {
    expect(CONV).toContain('{surface?.programmeSourcing && (')
    expect(CONV).not.toContain("else void runCommand('Source 20 leads')")
    expect(CONV).not.toContain('else void previewSource(')
    expect(CONV).toContain("else setCmdLog(l => [...l, { role: 'notice', text: NO_PROGRAMME_TO_SOURCE }])")
  })
})
