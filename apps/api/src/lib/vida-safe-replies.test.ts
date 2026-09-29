// ⚑ 29 Sep (R174 ② · PR 1b) — EVERY EMAIL VIDA SENDS GOES THROUGH THE SAFE SEND.
//
// 🛑 WHAT WAS OPEN:
//  ① Unibox's reply box posted to an admin-local Next route (`app/api/reply`) that emailed the
//     prospect straight through Resend from hello@get-kind.com — no kill-switch, no opt-out
//     list, no demo block, no audit row. The safe door already existed:
//     `POST /operator/replies/:id/send` → `sendManualReply` (the Inbox tab uses it).
//  ② The Founder page had two one-click forms that emailed a model-written message to a real
//     client, or to ANY address typed in, with no preview. Founder ruling (R174): remove them —
//     the Asks tab covers following up a client; inviting a prospect is the founder's own mail.
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '../../../..')
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

describe('① the Unibox reply uses the safe send', () => {
  const form = read('apps/admin/src/components/ReplyForm.tsx')

  it('posts to the operator send route with the client, never the old direct route', () => {
    expect(form).toContain('/api/proxy/operator/replies/${encodeURIComponent(replyId)}/send')
    expect(form).toContain('client_id: clientId')
    expect(form).not.toMatch(/fetch\('\/api\/reply'/)
  })

  it('the direct Resend route is gone', () => {
    expect(existsSync(join(ROOT, 'apps/admin/src/app/api/reply/route.ts'))).toBe(false)
  })

  it('Unibox hands the reply box its client', () => {
    expect(read('apps/admin/src/app/unibox/page.tsx')).toContain('clientId={reply.client_id}')
  })

  it('a demo reply says nothing was sent, instead of "Reply sent"', () => {
    expect(form).toContain('data.data?.demo')
  })
})

describe('② the Founder page cannot email anyone', () => {
  it('the two send forms are gone from the page', () => {
    const page = read('apps/admin/src/app/founder/page.tsx')
    expect(page).not.toContain('/founder/cs/followup')
    expect(page).not.toContain('/founder/ae/demo-request')
  })

  it('and their routes are gone from the API', () => {
    const routes = read('apps/api/src/routes/founder.ts')
    expect(routes).not.toMatch(/founderRouter\.post\('\/cs\/followup'/)
    expect(routes).not.toMatch(/founderRouter\.post\('\/ae\/demo-request'/)
  })
})
