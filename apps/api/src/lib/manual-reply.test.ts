import { describe, it, expect, vi, beforeEach } from 'vitest'

// #547 — THE LAST SHARED SENDER TO A REAL PROSPECT.
//
// #547 moved the automated sequence steps onto each client's own mailbox and left this file
// sending from `COLD_FROM`. So after it shipped, the machine-written steps went out from the
// client's mailbox and the HUMAN reply in the same conversation went out from the shared
// address — the thread changed sender mid-conversation, and every client's manual replies
// pooled their spam complaints onto one domain. RULEBOOK 12.2 in one line: you cannot share
// a sender across clients; one client's complaints poison the rest.
//
// The rule these tests pin is the harsh half of #547: NO INBOX = NO SEND. Not "send from
// ours instead" — a silent fallback looks like success and lands the damage on every other
// client weeks later, where nobody connects it back.

const state = {
  reply: { id: 'r1', from_email: 'prospect@acme.com', subject: 'Re: your note', lead_id: 'l1', client_id: 'c1' } as Record<string, unknown> | null,
  isDemo: false,
  blocked: false,
  killSwitch: 'true' as string | undefined,
  /** what resolveSendingInbox returns */
  resolution: null as Record<string, unknown> | null,
  /** what sendAs returns */
  sendResult: { ok: true, id: 'smtp-1', error: null } as Record<string, unknown>,
  sendAsCalls: [] as { inbox: Record<string, unknown>; mail: Record<string, unknown> }[],
  inserted: [] as Record<string, unknown>[],
}

const INBOX = {
  id: 'i1', email: 'ada@acme-client.com', kind: 'branded', status: 'active',
  smtp_host: 'smtp.acme.com', smtp_user: 'ada@acme-client.com', smtp_pass_enc: 'v1:x:y:z',
}

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select() { return q },
        eq() { return q },
        // `not()` / `limit()` added 29 Aug (BUILD-003 PR2): the programme-authority read uses
        // `.not('status','in',...).limit(1)` to skip terminal programmes. Without them the
        // chain throws, the reply gate fails CLOSED — correctly — and every reply 409s for the
        // wrong reason. `programmes` returns null below: this client is LEGACY, which is what
        // this file has always been about.
        not() { return q },
        limit() { return q },
        insert(row: Record<string, unknown>) {
          state.inserted.push({ ...row, __table: table })
          return Promise.resolve({ data: null, error: null })
        },
        async maybeSingle() {
          if (table === 'figsy_replies') return { data: state.reply, error: null }
          if (table === 'opt_out_blocklist') return { data: state.blocked ? { email: 'x' } : null, error: null }
          return { data: null, error: null }
        },
      }
      return q
    },
  },
}))

vi.mock('./demo', () => ({ isDemoClient: async () => state.isDemo }))
vi.mock('./figsy', () => ({ outreachEnabled: () => state.killSwitch === 'true' }))
vi.mock('./sending-inbox', () => ({
  resolveSendingInbox: async () => state.resolution,
  refusalLabel: (r: string) => `LABEL:${r}`,
}))
vi.mock('./mailer', () => ({
  sendAs: async (inbox: Record<string, unknown>, mail: Record<string, unknown>) => {
    state.sendAsCalls.push({ inbox, mail })
    return state.sendResult
  },
}))

import { sendManualReply } from './manual-reply'

beforeEach(() => {
  state.reply = { id: 'r1', from_email: 'prospect@acme.com', subject: 'Re: your note', lead_id: 'l1', client_id: 'c1' }
  state.isDemo = false
  state.blocked = false
  state.killSwitch = 'true'
  state.resolution = { ok: true, inbox: INBOX, from: `Ada <${INBOX.email}>` }
  state.sendResult = { ok: true, id: 'smtp-1', error: null }
  state.sendAsCalls = []
  state.inserted = []
})

describe('the send goes out on the CLIENT\'S OWN mailbox', () => {
  it('sends through the resolved inbox, not a shared address', async () => {
    const r = await sendManualReply('r1', 'c1', 'Thanks — how does Tuesday look?')
    expect(r).toMatchObject({ ok: true, sent: true })
    expect(state.sendAsCalls).toHaveLength(1)
    expect(state.sendAsCalls[0].inbox).toMatchObject({ email: 'ada@acme-client.com' })
  })

  it('carries the prospect, the Re: subject and the operator\'s words', async () => {
    await sendManualReply('r1', 'c1', 'Thanks — how does Tuesday look?')
    expect(state.sendAsCalls[0].mail).toMatchObject({
      to: 'prospect@acme.com',
      subject: 'Re: your note',
      text: 'Thanks — how does Tuesday look?',
    })
  })

  it('sets NO Reply-To — replies must come back to the mailbox holding the thread', async () => {
    // Pointing Reply-To at our shared address would send the prospect's next message to us
    // instead of the mailbox the conversation lives in, and would break the inbox→client
    // routing #551 built. A From/Reply-To split across two domains is also a spam signal.
    expect(await sendManualReply('r1', 'c1', 'hi')).toMatchObject({ ok: true })
    expect(state.sendAsCalls[0].mail.replyTo).toBeUndefined()
  })

  it('adds "Re:" only when it is not already there', async () => {
    state.reply = { ...state.reply, subject: 'your note' }
    await sendManualReply('r1', 'c1', 'hi')
    expect(state.sendAsCalls[0].mail.subject).toBe('Re: your note')
  })

  it('records the row against the mailbox it actually left from', async () => {
    await sendManualReply('r1', 'c1', 'hi')
    const row = state.inserted.find(r => r.__table === 'figsy_replies')!
    expect(row.from_email).toBe('ada@acme-client.com')
    expect(row.classification).toBe('sent_reply')
  })
})

describe('NO INBOX = NO SEND — the rule #547 exists for', () => {
  for (const reason of ['no_inbox', 'warming_only', 'no_credentials', 'no_secret_key', 'lookup_failed']) {
    it(`refuses on ${reason} and sends NOTHING`, async () => {
      state.resolution = { ok: false, reason, detail: 'Fix it in Vida.' }
      const r = await sendManualReply('r1', 'c1', 'hi')
      expect(r.ok).toBe(false)
      expect(state.sendAsCalls).toHaveLength(0)
    })
  }

  it('NEVER falls back to the shared address — the whole point', async () => {
    // If this ever regresses, one client's manual replies start poisoning every other
    // client's deliverability, and it looks like success while it happens.
    state.resolution = { ok: false, reason: 'no_inbox', detail: 'Assign one.' }
    await sendManualReply('r1', 'c1', 'hi')
    expect(state.sendAsCalls).toHaveLength(0)
    expect(state.inserted.filter(r => r.__table === 'figsy_replies')).toHaveLength(0)
  })

  it('the refusal is 409 and readable — a human clicked Send and is owed the reason', async () => {
    state.resolution = { ok: false, reason: 'no_inbox', detail: 'Assign one in Vida.' }
    const r = await sendManualReply('r1', 'c1', 'hi')
    expect(r.ok === false && r.status).toBe(409)
    const msg = r.ok === false ? r.error : ''
    expect(msg).toContain('LABEL:no_inbox')
    expect(msg).toContain('Assign one in Vida.')
    expect(msg).toContain('nothing fell back to a shared address')
  })

  it('a DATABASE failure refuses too — it is not permission to use the shared sender', async () => {
    state.resolution = { ok: false, reason: 'lookup_failed', detail: 'DB down.' }
    const r = await sendManualReply('r1', 'c1', 'hi')
    expect(r.ok).toBe(false)
    expect(state.sendAsCalls).toHaveLength(0)
  })
})

describe('a mail server that refuses is reported, never thrown', () => {
  it('returns 502 rather than throwing — the operator pressed a button', async () => {
    // The old code did `if (sendError) throw sendError`, which surfaced as a bare 500 with
    // no indication of whether the mail had left.
    state.sendResult = { ok: false, id: null, error: new Error('535 auth failed') }
    const r = await sendManualReply('r1', 'c1', 'hi')
    expect(r.ok === false && r.status).toBe(502)
    expect(r.ok === false && r.error).toContain('535 auth failed')
  })

  it('writes NO sent-reply row when the send failed', async () => {
    // A row here is a phantom: the unibox would show a reply that never left.
    state.sendResult = { ok: false, id: null, error: new Error('nope') }
    await sendManualReply('r1', 'c1', 'hi')
    expect(state.inserted.filter(r => r.__table === 'figsy_replies')).toHaveLength(0)
  })
})

describe('the gates that were already here still hold', () => {
  it('a demo client sends nothing and is NOT an error', async () => {
    state.isDemo = true
    const r = await sendManualReply('r1', 'c1', 'hi')
    expect(r).toMatchObject({ ok: true, sent: false, demo: true })
    expect(state.sendAsCalls).toHaveLength(0)
  })

  it('an opted-out prospect is refused', async () => {
    state.blocked = true
    const r = await sendManualReply('r1', 'c1', 'hi')
    expect(r.ok === false && r.status).toBe(409)
    expect(state.sendAsCalls).toHaveLength(0)
  })

  it('the kill-switch OFF stops a human click too', async () => {
    state.killSwitch = 'false'
    const r = await sendManualReply('r1', 'c1', 'hi')
    expect(r.ok).toBe(false)
    expect(state.sendAsCalls).toHaveLength(0)
  })

  it('an unknown reply is 404 before anything else happens', async () => {
    state.reply = null
    const r = await sendManualReply('nope', 'c1', 'hi')
    expect(r.ok === false && r.status).toBe(404)
    expect(state.sendAsCalls).toHaveLength(0)
  })

  it('the gates run BEFORE the inbox is resolved — a demo never touches the mailbox', async () => {
    state.isDemo = true
    state.resolution = { ok: false, reason: 'no_inbox', detail: 'x' }
    // Demo wins: it returns the demo result, not the refusal.
    expect(await sendManualReply('r1', 'c1', 'hi')).toMatchObject({ sent: false, demo: true })
  })
})
