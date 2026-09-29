// ⚑ 29 Sep (R174 ② · PR 1a) — THE FORGOTTEN /seed PAGE IS GONE, AND STAYS GONE.
//
// 🛑 WHAT IT DID: one text box and one button in the admin app. Type any client's login email
// and `app/api/seed-leads` (a Next route with the SERVICE-ROLE key) deleted every lead of theirs
// with no `apollo_id` — which is exactly how operator-IMPORTED prospects are stored — then
// inserted 25 fake leads on REAL company domains and set retired credits to 50. No demo check.
// Northwind is the demo now (R164); nothing needs this page.
//
// ⚠️ The API's own `/admin/seed-leads` is a different door: it already refuses anything that is
// not a demo client, and no screen calls it. It is left alone here (reported, not widened).
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const ADMIN = join(__dirname, '../../../admin/src')

describe('R174 ② — /seed cannot wipe a real client\'s leads', () => {
  it('the page and its service-role route no longer exist', () => {
    expect(existsSync(join(ADMIN, 'app/seed/page.tsx')), 'app/seed/page.tsx is back').toBe(false)
    expect(existsSync(join(ADMIN, 'app/api/seed-leads/route.ts')), 'app/api/seed-leads/route.ts is back').toBe(false)
  })

  it('nothing in the admin app links to it', () => {
    const sidebar = readFileSync(join(ADMIN, 'components/AdminSidebar.tsx'), 'utf8')
    expect(sidebar).not.toMatch(/href: '\/seed'/)
  })
})
