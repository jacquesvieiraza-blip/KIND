// ⚑ 2 Oct (#2551 · 13b · R187 ②) — MILLA SHOWS THE REAL EMAILS.
//
// Asked "Show me the full sequence", Milla described the six stages ("once you approve…")
// instead of showing the emails. She now shows the programme's own emails — the exact frozen
// copy the client approves and that goes out — one after another, with the wait between them.
//
// Plain TS with no imports, so the rule is RUN by the test.

export type FrozenEmail = { step: number; subject: string; body: string; wait_days: number }

/** Did the client ask to see the emails? ("show me my emails", "can I see the sequence") */
export const SHOW_EMAILS_RE = /\b(show|see|view|read)\b[^.?!]*\b(e-?mails?|sequence|messages?)\b/i

export function asksForEmails(text: string): boolean {
  return SHOW_EMAILS_RE.test(text)
}

/** The emails as one Milla message, laid out as they land. */
export function emailsMessage(emails: FrozenEmail[]): string {
  if (emails.length === 0) {
    return 'Your emails are not written yet. They appear here as soon as your programme is prepared, and nothing is sent before you approve them.'
  }
  const sorted = [...emails].sort((a, b) => a.step - b.step)
  const parts = sorted.map((e, i) => {
    const head = `Email ${e.step} of ${sorted.length}${i === 0 ? '' : ` — ${sorted[i - 1].wait_days === 1 ? '1 day' : `${sorted[i - 1].wait_days} days`} after email ${sorted[i - 1].step}`}`
    const body = e.body.replace(/\r\n?/g, '\n').split('\n').map(l => l.trim()).filter(Boolean).join('\n\n')
    return `${head}\nSubject: ${e.subject.trim()}\n\n${body}`
  })
  return `Here are your emails, exactly as they go out:\n\n${parts.join('\n\n────────\n\n')}`
}
