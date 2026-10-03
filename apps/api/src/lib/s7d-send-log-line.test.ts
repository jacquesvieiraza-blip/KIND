// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R185 ⑥ · card #2547 · S7 part d) — ONE LOG LINE PER EMAIL SENT.
//
// R185 ⑥: *"Alerts and logs tell the truth — … one log line per email sent."* The founder looked
// in the logs for House's sends on 1 Oct and found nothing: only the run summary was logged, so
// twenty emails left with no line of their own.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const src = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
const core = src.slice(src.indexOf('async function sendSequenceEmailCore('), src.indexOf("  return 'sent'\n}"))

describe('R185 ⑥ — every email that leaves writes one line to the log', () => {
  it('🛑 the line exists on the success path, after the send is recorded and before the run moves on', () => {
    const advanced = core.indexOf('`step ${step} WAS SENT but the enrollment was not advanced')
    const line = core.indexOf('console.log(`[send] ✓ sent')
    expect(advanced, 'the enrolment-advance write moved — repoint this guard').toBeGreaterThan(-1)
    expect(line, 'no log line is written for an email that was sent').toBeGreaterThan(advanced)
  })

  it('🛑 it names who, from which mailbox, to whom, and which step — enough to find any one email', () => {
    const at = core.indexOf('console.log(`[send] ✓ sent')
    const stmt = core.slice(at, core.indexOf('\n', at))
    for (const part of ['lead.client_id', 'enrollmentId', '${step}', 'sendingInbox', 'lead.email']) {
      expect(stmt, `the send line does not carry ${part}`).toContain(part)
    }
  })
})
