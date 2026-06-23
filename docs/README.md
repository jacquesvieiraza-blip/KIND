# 🗺️ K.I.N.D — HOW TO READ THESE DOCS (start here)

> A signpost, not a tracker. This file holds **no status, no tasks, no strategy** — it only tells you which doc to open. (Single-source-of-truth rule stays intact.)

**Simplest mental model:** **LAUNCH-PAD = today · INVENTORY = status · KIND-MASTER = why/where · V2 = future.**

---

## 📄 The four docs (one job each)

### 🚀 [`LAUNCH-PAD.md`](./LAUNCH-PAD.md) — your daily command sheet
- The **only doc you open day-to-day**.
- Holds: a **⚡ STATE** cockpit (read in 10 seconds) + **🔜 WHAT'S NEXT — by date** (your daily pick) + the full 2-week plan below.
- Open it for: **"What do I do now?"**

### 📋 [`PRODUCT-INVENTORY.md`](./PRODUCT-INVENTORY.md) — the status board
- The **single source of truth for status** — every feature, one coloured dot, one owner.
- Colour board at the very top: 🟢 live+verified · 🩷 live, not walked · 🟣 approved, not shipped · 🟡 built, pending review · 🔴 not built · ⏸ blocked.
- Open it for: **"What's built / live / left?"**

### 🟣 [`KIND-MASTER.md`](./KIND-MASTER.md) — the story + the brain
- Holds: **strategy · decisions · history · the session log** (one line per work session).
- Its **"▶️ RESUME HERE"** block = your **cold-start read-through** — open this one block to see where we are + the vision in one place.
- Open it for: **"Where are we, and why did we decide X?"**

### 🎯 [`V2-TRACKER.md`](./V2-TRACKER.md) — the future
- Holds: the **forward roadmap + vision** behind the 🔴 not-built items — seller engine, learning engine, GTM plan, risks, "the 15 Pieces."
- Open it for: **"What's the longer-term plan?"**

---

## 🧭 The rules that keep it clean
- **One truth per doc** — status lives *only* in PRODUCT-INVENTORY; today's work *only* in LAUNCH-PAD; strategy *only* in KIND-MASTER; future *only* in V2-TRACKER. If two docs say the same thing, that's a bug — delete the copy, keep the home.
- **No fifth core doc** — anything new must replace an old one. *(This README is a signpost/index, not a core tracker — it holds none of the four truths.)*
- **The status ladder:** 🔴 not built → 🟡 built → 🟣 approved → 🩷 live (unverified) → 🟢 live + verified. **Nothing is 🟢 until you've seen it work in production.**

## 🗂️ Supporting files (not daily reading)
- [`DOC-MAP.md`](./DOC-MAP.md) — **the freshness index: every doc in the repo, what it's for, and whether it's current/archived.** Open this to find anything that isn't one of the four.
- [`../CLAUDE.md`](../CLAUDE.md) — agent config: how the assistant operates this repo. Not a tracker.
- [`RULEBOOK.md`](./RULEBOOK.md) — detailed working rules (PRs, merge discipline, the stranded-commit gate, the script-counted board).
- [`TECH-STACK.md`](./TECH-STACK.md) — the tools/vendors register (Railway, Supabase, Resend, **Zoho Mail**, Stripe…) + the email architecture. Seeds the Notion Tools page.

---
*Which doc for what, in one line:* **LAUNCH-PAD** "now" · **PRODUCT-INVENTORY** "status" · **KIND-MASTER** "why/where" · **V2-TRACKER** "future."
