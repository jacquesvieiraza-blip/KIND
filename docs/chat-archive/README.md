# Chat archive — redacted session logs

Human-readable text logs of Claude Code working sessions on K.I.N.D, one
markdown file per session (`<session-id>.md`). Generated 2026-06-04.

## What this is

- **Text only.** User and assistant messages, with timestamps. Tool calls,
  tool results, and internal noise are stripped out.
- **Secrets redacted.** Known credential shapes are replaced with
  `[REDACTED_*]` placeholders (Stripe `sk_live`/`whsec`, Supabase/JWT tokens,
  database URLs + passwords, Anthropic/Resend keys, Stripe price IDs, and any
  high-entropy 40+ char token). Verified clean — no live secret values remain.

## What this is NOT

- Not the verbatim raw transcript. The full raw `.jsonl` transcripts (which
  **do** contain the secrets that were pasted during the 4 Jun incident) are
  **not** in this repo and must never be committed. They live in a private
  local archive only: `kind-chat-archive-2026-06-04.tar.gz`, stored outside
  the repository.

## Why redacted

On 4 Jun, live credentials were pasted into chat while debugging a Railway
build. Those keys are scheduled for rotation (see MASTER.md, TIER 0). Until
rotated, the raw transcripts are a liability and stay off git entirely. These
redacted logs are safe to keep in version control as a durable, searchable
record of decisions and work.
