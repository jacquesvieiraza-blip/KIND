// ⚑ 29 Sep (R174 · PR 4h) — VIDA'S MEETINGS PAGE READS THE MEETINGS TABLE.
//   · the list is the Programme tab's own panel (`MeetingQualifyPanel`, on `public.meetings`);
//   · the old bookings-table list, its no-show/rebook buttons and its two-rebook promise are gone;
//   · the test-booking tool stays.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const PAGE = readFileSync(join(process.cwd(), 'apps/admin/src/app/vida/bookings/page.tsx'), 'utf8')
const code = PAGE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('one list of meetings, one set of rules', () => {
  it('renders the Programme tab panel for the chosen client', () => {
    expect(code).toContain("import MeetingQualifyPanel from '@/components/vida/MeetingQualifyPanel'")
    expect(code).toContain('<MeetingQualifyPanel clientId={selected} />')
  })
  it('no longer reads the old bookings table or acts on it', () => {
    expect(code).not.toContain('/api/proxy/operator/bookings')
    expect(code).not.toContain('/no-show')
    expect(code).not.toContain('/rebook')
  })
  it('promises one free reschedule, never two rebooks', () => {
    expect(code).not.toMatch(/goodwill rebooks/)
    expect(code).toContain('One free reschedule (R141)')
  })
  it('keeps the safe test-booking tool', () => {
    expect(code).toContain('/test-booking-link')
  })
})
