// 12c (R189 ⑥) — HOUSE'S REPLY DRAFTS ARE SIGNED "THE MILLA & VIDA TEAM", LIKE ITS EMAILS.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('12c — the draft is signed the way House signs', () => {
  it('House → HOUSE_SIGN_OFF; every other client → their signer or company, as before', () => {
    const src = readFileSync(join(__dirname, '../routes/figsy.ts'), 'utf8')
    const at = src.indexOf("figsyRouter.post('/replies/:id/ai-draft'")
    const route = src.slice(at, at + 4000)
    expect(route).toContain('const signer = (await isHouseClient(clientId)) ? HOUSE_SIGN_OFF')
    expect(route).toContain("`Sign off as: ${signer}.`")
    expect(readFileSync(join(__dirname, 'house-client.ts'), 'utf8')).toContain("export const HOUSE_SIGN_OFF = 'The Milla & Vida Team'")
  })
})
