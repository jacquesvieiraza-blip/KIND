// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R162) — MILLA'S PROGRAMME NOTICES SURVIVE A REFRESH.
//
// The founder's House walk: "this is now version 4" vanished on reload. Notices are now kept in
// the client's own Milla thread. The browser names only WHICH notice; the server composes the
// sentences, so a client screen can never put words in Milla's mouth, and the same notice is
// written once however often it is sent.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi } from 'vitest'

vi.mock('@kind/db', () => ({ db: {} }))
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { millaNoticeLines, isMillaNoticeKind, MILLA_NOTICE_KINDS } from '@kind/shared'
import { noticeRowIdFor } from './customer-turn'

const ROUTE = readFileSync(join(__dirname, '..', 'routes', 'milla.ts'), 'utf8')
const CONVO = readFileSync(join(__dirname, '..', '..', '..', 'portal', 'src', 'components', 'milla', 'MillaConversation.tsx'), 'utf8')
const NOTICE = ROUTE.slice(ROUTE.indexOf("millaRouter.post('/sessions/:sessionId/notices'"))

describe('the sentences — one set, shared by the screen and the server', () => {
  it('every kind composes, and each says nothing was sent where it matters', () => {
    for (const k of MILLA_NOTICE_KINDS) expect(millaNoticeLines(k, k === 'stage' ? 'Approval' : 4), k).not.toBeNull()
    expect(millaNoticeLines('new_version', 4)!.join(' ')).toContain('this is now version 4')
    expect(millaNoticeLines('second')!.join(' ')).toContain('nothing is sent until then')
    expect(millaNoticeLines('paused')!.join(' ')).toContain('Nothing is being sent')
  })

  it('🛑 anything outside the list composes nothing', () => {
    expect(isMillaNoticeKind('refund_issued')).toBe(false)
    expect(millaNoticeLines('stage', 'You have been charged $500')).toBeNull()
  })
})

describe('🛑 the server keeps them — its own words, the client\'s own thread, once', () => {
  it('only the owner\'s thread, checked before anything is written', () => {
    expect(NOTICE).toContain(".select('id').eq('id', req.params.sessionId).eq('client_id', clientId).single()")
    expect(NOTICE.indexOf("'Session not found'")).toBeLessThan(NOTICE.indexOf("from('milla_messages').insert"))
  })

  it('the sentences are composed on the server from the kind — the body\'s text is never stored', () => {
    expect(NOTICE).toContain('millaNoticeLines(body.kind, param)')
    expect(NOTICE).toContain('content: lines[i]')
    expect(NOTICE).toContain("'Not a notice Milla can keep. Nothing was written.'")
  })

  it('the same notice is written once: ids derive from the key, and a duplicate is success', () => {
    expect(noticeRowIdFor('s1', 'approval-version-abc', 0)).toBe(noticeRowIdFor('s1', 'approval-version-abc', 0))
    expect(noticeRowIdFor('s1', 'approval-version-abc', 0)).not.toBe(noticeRowIdFor('s1', 'approval-version-abc', 1))
    expect(noticeRowIdFor('s1', 'k', 0)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(NOTICE).toContain("id: noticeRowIdFor(req.params.sessionId, key, i)")
    expect(NOTICE).toContain("(error as { code?: string }).code !== '23505'")
  })
})

describe('🛑 Milla shows it now and keeps it for later', () => {
  it('keepNotice shows the shared sentences once and posts only the kind, the parameter and the key', () => {
    expect(CONVO).toContain('const lines = millaNoticeLines(kind, param ?? null)')
    expect(CONVO).toContain('announceOnce(key, lines)')
    expect(CONVO).toContain('await api.post(`/milla/sessions/${sid}/notices`, { kind, param: param ?? null, key }, tok)')
  })
})
