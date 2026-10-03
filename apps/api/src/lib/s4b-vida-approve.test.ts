// 4b (#2542 · R186 ③) — VIDA SHOWS THE EMAILS AS THEY LAND, AND THE FOUNDER APPROVES THEM, AT ANY STAGE.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ADMIN = join(__dirname, '../../../admin/src')
const panel = readFileSync(join(ADMIN, 'components/vida/FounderWordingApproval.tsx'), 'utf8')
const page = readFileSync(join(ADMIN, 'app/vida/page.tsx'), 'utf8')

describe('4b — the panel', () => {
  it('reads the version and approves exactly that one', () => {
    expect(panel).toContain('/wording`')
    expect(panel).toContain('/wording/approve`')
    expect(panel).toContain('body: JSON.stringify({ version: w.version })')
  })
  it('shows every email laid out: subject, paragraphs, and the wait before it', () => {
    expect(panel).toContain('Email {e.step} of {w.emails.length}')
    expect(panel).toContain('Subject: {e.subject}')
    expect(panel).toContain('paragraphs(e.body).map(')
  })
  it('is on the Programme tab with no stage condition, so any change on a live programme comes back', () => {
    // ⛓️ 3 Oct (#2650): was '<FounderWordingApproval programmeId={prog.programme.id} />' — the id now
    // comes from Vida's one programme gate (vida-programme-isolation). Still no stage condition.
    const at = page.indexOf('<FounderWordingApproval key={id} programmeId={id} />')
    expect(at).toBeGreaterThan(-1)
    const line = page.slice(page.lastIndexOf('\n', at), at)
    expect(line).not.toMatch(/&&/)
  })
})
