// ═══════════════════════════════════════════════════════════════════════════════════════
// A REPLY SENT FROM MILLA STAYS IN THE PROSPECT'S EMAIL THREAD.
//
// ⛓️ R187 ④ (2 Oct, card #2550): *"It goes from the same mailbox, in the same email thread, so
// the prospect sees a normal conversation."* The mailbox was already right; the thread was not:
// the answer carried only "Re: <subject>", and mail apps thread on headers, not subjects, so it
// could land as a new conversation.
//
// ⚠️ NO NEW COLUMN. The prospect's message id is already kept: every stored reply holds the
// provider's webhook payload in `figsy_replies.raw_payload`, and that payload carries the RFC
// Message-ID (Resend: `message_id`). This reads it from there. A reply with no id on file is
// answered exactly as before — never refused for it.
// ═══════════════════════════════════════════════════════════════════════════════════════

const bracket = (id: string) => {
  const t = id.trim()
  if (!t) return ''
  return t.startsWith('<') ? t : `<${t}>`
}

function headerValue(headers: unknown, name: string): string | null {
  if (!headers) return null
  const want = name.toLowerCase()
  if (Array.isArray(headers)) {
    for (const h of headers as { name?: unknown; key?: unknown; value?: unknown }[]) {
      const n = String(h?.name ?? h?.key ?? '').toLowerCase()
      if (n === want && typeof h?.value === 'string') return h.value
    }
    return null
  }
  if (typeof headers === 'object') {
    for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
      if (k.toLowerCase() === want && typeof v === 'string') return v
    }
  }
  return null
}

/** The headers that put an answer in the same thread, from a stored reply's raw payload. */
export function threadHeaders(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = [r.message_id, r.messageId, r['Message-ID'], r['message-id'], headerValue(r.headers, 'message-id')]
    .find((v): v is string => typeof v === 'string' && v.trim().length > 0)
  if (!id) return null
  const msgId = bracket(id)
  const prior = (headerValue(r.headers, 'references') ?? (typeof r.references === 'string' ? r.references : '') ?? '')
    .split(/\s+/).map(bracket).filter(Boolean)
  const references = [...prior.filter(x => x !== msgId), msgId].join(' ')
  return { 'In-Reply-To': msgId, References: references }
}
