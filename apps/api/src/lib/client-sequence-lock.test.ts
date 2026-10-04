// ⚑ 4 Oct (founder: "D. FIX") — a client route could rewrite or delete a FROZEN programme's
// sequence (READY_FOR_APPROVAL · APPROVED · LIVE), skipping the founder-first approval (R191 ·
// R195 ③). The operator route has refused this since 29 Sep (R174 · 1d); the client door now does too.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const FIGSY = readFileSync(join(__dirname, '../routes/figsy.ts'), 'utf8')
const handler = (start: string) => {
  const at = FIGSY.indexOf(start)
  return FIGSY.slice(at, FIGSY.indexOf('\n})\n', at))
}

describe('🛑 the client cannot change a frozen programme\'s emails outside the approval flow', () => {
  it('PUT /sequences/:id asks the lock BEFORE it writes', () => {
    const h = handler("figsyRouter.put('/sequences/:id'")
    const lock = h.indexOf('sequenceEditVerdict(clientId, req.params.id)')
    expect(lock).toBeGreaterThan(-1)
    expect(lock).toBeLessThan(h.indexOf(".from('figsy_sequences')"))
  })
  it('DELETE /sequences/:id asks the lock BEFORE it deletes', () => {
    const h = handler("figsyRouter.delete('/sequences/:id'")
    const lock = h.indexOf('sequenceEditVerdict(clientId, req.params.id)')
    expect(lock).toBeGreaterThan(-1)
    expect(lock).toBeLessThan(h.indexOf(".from('figsy_sequences')"))
  })
  it('the refusal points the client to Milla, in their words', () => {
    expect(readFileSync(join(__dirname, 'programme-edit-lock.ts'), 'utf8')).toContain('export const CLIENT_EDIT_LOCK_MESSAGE')
    expect(FIGSY).toContain('CLIENT_EDIT_LOCK_MESSAGE')
  })
})
