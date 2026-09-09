// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE TOP-BAR CHIP SAID THE OPPOSITE OF THE TRUTH, IN BOTH DIRECTIONS, FOR SEVEN WEEKS.
//
// ── THE DEFECT ──────────────────────────────────────────────────────────────────────────
//
// `apps/admin/src/app/vida/layout.tsx` read the server's `outreach_enabled` — which means
// *delivery is permitted*, i.e. the kill-switch is **OFF** — and printed it as the switch's
// own state without inverting it:
//
//     const on = status?.outreach_enabled === true
//     Kill-switch {on ? 'ON' : 'OFF'}
//
// So with `AUTO_OUTREACH_ENABLED` absent (delivery BLOCKED, the safe production state) the
// bar read **"Kill-switch OFF"**, and on the day sending is permitted it would read
// **"Kill-switch ON"**. The founder read the live bar on 9 Sep and correctly refused to
// believe it. It dates from `c9d86e01`, 23 Jul, and no test looked at it.
//
// ── WHY THE FIX IS A SHARED FUNCTION AND NOT A CORRECTED TERNARY ────────────────────────
//
// The programme SENDING card, two hundred pixels below the chip, had the SAME boolean and
// got it RIGHT. Two surfaces each doing their own inversion is two chances to get it
// backwards, and one of them took it. The wording now comes from one module — the one that
// already owns "ON means blocked" — and ③ below asserts the pair agree, so they cannot
// drift apart again.
//
// ⚠️ THIS FILE PROVES DISPLAY ONLY. The behavioural guarantee — that a blocked switch
// actually refuses at every provider seam — is `kill-switch-absolute.test.ts` and is
// untouched by this change. A correct label over a broken gate would be worse than both.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { killSwitchChipLabel, sendingCard } from '../../../admin/src/lib/vida-lifecycle-copy'

const LAYOUT = readFileSync(
  join(__dirname, '..', '..', '..', 'admin', 'src', 'app', 'vida', 'layout.tsx'), 'utf8')

/** Executable lines only — a rule about what the chip RENDERS must not match a comment. */
const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
  .join('\n')

const LAYOUT_CODE = code(LAYOUT)

describe('🛑 ① the chip says what is true, in both directions', () => {
  // ⚠️ THE ARGUMENT IS THE SERVER'S `outreach_enabled`, UNINVERTED — `true` = delivery
  // permitted. The whole defect was one surface inverting it for itself, so the input to
  // this function is deliberately the raw field and nothing derived from it.
  it('delivery PERMITTED (AUTO_OUTREACH_ENABLED === "true") reads "Kill-switch OFF"', () => {
    expect(killSwitchChipLabel(true)).toBe('Kill-switch OFF')
  })

  it('delivery BLOCKED (the variable absent — production on 9 Sep) reads "Kill-switch ON"', () => {
    expect(killSwitchChipLabel(false)).toBe('Kill-switch ON')
  })

  it('🛑 not yet known asserts NOTHING — no state is guessed while the request is in flight', () => {
    // A safety indicator that claims a state it has not been told is how it earns trust it
    // should not have. The existing neutral "…" is preserved exactly.
    expect(killSwitchChipLabel(null)).toBe('Kill-switch …')
    expect(killSwitchChipLabel(undefined)).toBe('Kill-switch …')
  })

  it('the four inputs produce exactly three outcomes, and never the wrong one', () => {
    const seen = [true, false, null, undefined].map(killSwitchChipLabel)
    expect(seen).toEqual(['Kill-switch OFF', 'Kill-switch ON', 'Kill-switch …', 'Kill-switch …'])
  })
})

describe('🛑 ② the layout renders the shared label and inverts nothing of its own', () => {
  it('it calls the shared function rather than spelling the ternary again', () => {
    expect(LAYOUT_CODE).toContain('killSwitchChipLabel(outreachPermitted)')
    expect(LAYOUT_CODE).toContain("import { killSwitchChipLabel } from '@/lib/vida-lifecycle-copy'")
  })

  it('🛑 the inverted mapping is GONE, in the spelling that shipped and in the obvious retypes', () => {
    for (const inverted of [
      "Kill-switch {status ? (on ? 'ON' : 'OFF') : '…'}",
      "on ? 'ON' : 'OFF'",
      "outreachPermitted ? 'ON' : 'OFF'",
      "outreach_enabled === true ? 'ON'",
    ]) {
      expect(LAYOUT_CODE.includes(inverted), `the inverted chip is back: ${inverted}`).toBe(false)
    }
  })

  it('the flag is no longer NAMED as if it were the switch — half of how this happened', () => {
    // `const on` sat beside the word "Kill-switch" and read as the switch's state.
    expect(LAYOUT_CODE.includes('const on = '), 'the misleading `on` binding is back').toBe(false)
    expect(LAYOUT_CODE).toContain('const outreachPermitted = status ? status.outreach_enabled === true : null')
  })

  it('⚠️ and the chip still names the variable an operator must actually set', () => {
    // The title attribute is the only place the console may name the env var — it is help,
    // not a rule the browser evaluates. `make-live-and-run.test.ts` owns that distinction.
    expect(LAYOUT).toContain('title="Global outreach kill-switch (AUTO_OUTREACH_ENABLED)"')
  })
})

describe('🛑 ③ the two surfaces can never disagree again', () => {
  it('the chip and the programme SENDING card describe the same boolean the same way', () => {
    // THE ACTUAL DEFECT CLASS. Both read one server field; one inverted it and one did not,
    // and they sat on the same screen saying opposite things.
    for (const permitted of [true, false]) {
      const chip = killSwitchChipLabel(permitted)          // "Kill-switch ON" | "…OFF"
      const card = sendingCard(permitted).caption ?? ''     // "Kill-switch ON — …" | "OFF — …"
      expect(card.startsWith(chip),
        `chip says "${chip}" and the SENDING card says "${card}"`).toBe(true)
    }
  })

  it('🛑 and neither ever says a bare ON/OFF with no subject in front of it', () => {
    // "OFF" alone under a heading reads as the opposite of what it means — the reason the
    // SENDING card was locked to two lines in the first place.
    for (const v of [true, false, null]) {
      expect(killSwitchChipLabel(v).startsWith('Kill-switch '), 'the chip lost its subject').toBe(true)
    }
  })
})
