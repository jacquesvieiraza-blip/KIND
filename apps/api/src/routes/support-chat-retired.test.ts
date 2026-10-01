// ⚑ 1 Oct (R182 · W-7) — THE OLD SUPPORT CHAT IS RETIRED. The founder, "all yes" to: "Retire it (switch the
// route off). If you want a website chat later, it gets rebuilt on today's model." Its prompt described the
// retired model (credits, Paystack, ZAR, FIGSY subscription). These guards hold that it stays off, that no
// retired-model text survives in the file, and that "Talk to a human" (/escalate) is untouched.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const src = readFileSync(join(__dirname, 'support.ts'), 'utf8')
const live = src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')

describe('W-7 — the support chat is retired', () => {
  it('/support/chat answers 410 and calls no model', () => {
    const at = live.indexOf("supportRouter.post('/chat'")
    expect(at).toBeGreaterThan(-1)
    const body = live.slice(at, live.indexOf('})', at) + 2)
    expect(body).toContain('status(410)')
    expect(live).not.toMatch(/messages\.create\(|new Anthropic\(|SYSTEM_PROMPT/)
  })

  it('no retired-model wording survives in the file', () => {
    for (const w of ['credit', 'Paystack', 'ZAR', 'FIGSY subscription', 'South African businesses']) {
      expect(live, w).not.toContain(w)
    }
  })

  it('"Talk to a human" is untouched', () => {
    expect(live).toContain("'/escalate'")
    expect(live).toContain('sendFounderAlert')
  })
})
