# 📬 Deliverability — D9 "10/10 inbox" Readiness Checklist

**Goal:** hit 10/10 on [mail-tester.com](https://www.mail-tester.com) before the 19th.
**Finding (10 Jun audit):** the in-repo deliverability code is correct and complete.
The remaining risk to a 10/10 score is **environment + DNS**, not code — those are the
items you must verify.

## ✅ Already correct in code (`apps/api/src/lib/deliverability.ts`)
- **List-Unsubscribe + one-click** (RFC 8058) on every cold send — Gmail/Yahoo bulk-sender requirement. ✓
- **Visible unsubscribe footer** (HTML) + **plain-text** footer. ✓
- **Plain-text MIME alternative** (HTML-only mail reads as spam). ✓
- **Tracking pixel refuses bare platform hosts** (railway/onrender/vercel) — anti-phishing. ✓
- **Signed, stateless unsubscribe tokens** (timing-safe verify). ✓
- **Dedicated cold-FROM** support, with a loud prod warning if it's unset. ✓

## 🧍 You must verify before the mail-tester run

### Railway env (api service)
- [ ] **`FIGSY_COLD_FROM`** is set to a **dedicated, separately-warmed cold domain**
      (NOT `get-kind.com`). If unset, cold mail sends from the transactional domain and
      poisons its reputation — the code logs a warning but still sends. **This is the
      single most important env item.**
- [ ] **`FIGSY_COLD_REPLY_TO`** points to a monitored inbox on the cold domain.
- [ ] **`TRACKING_URL`** is a branded domain (e.g. `track.get-kind.com`) — otherwise
      open-tracking is silently disabled (graceful, but you lose open rates).
- [ ] *(optional)* **`FIGSY_UNSUB_MAILTO`** = a monitored `unsubscribe@cold-domain`
      inbox — adds the `mailto:` unsubscribe option (small deliverability plus).

### DNS (on the cold sending domain — set in your DNS / Resend)
- [ ] **SPF** record present and passing.
- [ ] **DKIM** signing enabled (Resend gives you the records) and passing.
- [ ] **DMARC** record present (`p=none` is fine to start) and aligned.
- [ ] Domain is **warmed** (warmup ramp live — confirmed in the docs).

### Then
- [ ] Send a real FIGSY cold email to the mail-tester address → confirm **10/10**.
- [ ] Fix whatever it flags (almost always SPF/DKIM/DMARC alignment or the FROM domain).

> If mail-tester is < 10/10, the cause is almost certainly one of: `FIGSY_COLD_FROM`
> still on the transactional domain, or a missing/misaligned DKIM/DMARC record on the
> cold domain. The code is not the bottleneck.
