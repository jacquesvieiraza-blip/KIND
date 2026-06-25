# K.I.N.D — Website Video Content Plan

_Last updated: 11 Jun 2026. Owner: 🤝 both._

---

## What we're building

A **Video Hub** on the website (`apps/landing/videos.html`) — a clean, on-brand page where visitors can browse and watch all KIND video content without leaving the site. Videos are embedded (YouTube) or self-hosted MP4s. Also a `videos` section wired into the homepage hero and the blog sidebar.

**Why:** Video is the highest-converting content format for a product like KIND. Founders and sales leaders watch a 90-second product demo before they read a word of copy. Our markets (US/UK/EMEA + Africa) have strong YouTube penetration. This is also our content moat — the YouTube plan (`docs/content/youtube-plan.md`) drives SEO + awareness; the on-site video hub converts that traffic.

---

## The video inventory (what we have or are making)

### Already in `apps/landing/` (self-hosted MP4s)
| File | What it is | Status |
|------|-----------|--------|
| `figsy.mp4` | FIGSY agent animation / product teaser | ✅ live (used on figsy.html) |
| `Untitled video.mp4` | Unknown — review before using | 🟡 review needed |

### Already built (animated scenes, no real video yet)
| Page | What it is |
|------|-----------|
| `platform-video.html` | Full platform animated demo (multi-scene, auto-plays) |
| `figsy-video.html` | FIGSY animated demo scene |
| `demo-video.html` | Demo video embed page |
| `platform-video-standalone.html` | Standalone embed version |

### To record (founder action)
| # | Video | Length | Format | Priority |
|---|-------|--------|--------|----------|
| V1 | 90-sec product loop (the hero video) | 90s | Screen rec + voiceover | 🔴 highest — blocks homepage hero update (#24) |
| V2 | FIGSY live demo — real account walkthrough | 12–15 min | Screen rec | 🔴 needed for YouTube Video 4 |
| V3 | "Why I built KIND from Cape Town" founder story | 12–18 min | Talking head | 🟡 high — trust builder |
| V4 | Milla walkthrough — AI assistant / drafting & business Q&A | 10–12 min | Screen rec | 🟡 high |
| V5 | Vida demo — live chat qualification | 8–10 min | Screen rec | 🟡 medium |
| V6 | Cold email masterclass (Africa B2B) | 18–22 min | Slides + talking head | 🟢 SEO anchor |
| V7 | ICP masterclass | 15–18 min | Slides + talking head | 🟢 SEO anchor |

---

## What we're building on the website

### 1. `videos.html` — Video Hub page

A standalone page in `apps/landing/` with:
- Brand header (KIND purple gradient, consistent with existing pages)
- Category filter tabs: **All · Product Demos · Founder Story · Education**
- Video grid (2-col desktop, 1-col mobile) — each card has thumbnail, title, category badge, duration
- YouTube embed modal or inline player — no redirect off-site
- CTA below grid: "Ready to see it live? Start your free trial →"

**Tech:** static HTML/CSS (same pattern as all other landing pages). YouTube videos embed via iframe. Self-hosted MP4s use the `<video>` tag. No JS framework needed.

### 2. Homepage hero update

Once V1 (90-sec product loop) is recorded:
- Replace the animated demo scene on `index.html` with the real product video as an autoplay loop (muted, no controls) in the hero section
- This is roadmap item **#24** — currently ⏸ waiting on the real video

### 3. Blog sidebar / page CTA

Add a "Watch the demo →" video card component (thumbnail + play icon) to:
- All 6 blog pages (`blog-*.html`)
- The `pricing.html` page
- The `figsy.html`, `denise.html`, `milla.html` agent pages

### 4. Agent pages — embedded demo clips

Each agent page gets an embedded short clip (60–90s) showing that agent in action:
- `figsy.html` → FIGSY live demo excerpt
- `milla.html` → Milla AI assistant / drafting & business Q&A walkthrough excerpt
- `vida.html` → Vida chat qualification excerpt
- `denise.html` → Denise closing/follow-up excerpt (when available)

---

## Build order (Claude)

| Step | What | When |
|------|------|------|
| 1 | Build `videos.html` with placeholder cards (uses YouTube embeds for existing public videos, MP4 self-host for `figsy.mp4`) | Tomorrow (12 Jun) |
| 2 | Add "Watch →" video CTA block to all blog pages and agent pages | Tomorrow (12 Jun) |
| 3 | Homepage hero: add video section beneath current hero copy, ready to swap in real video | Tomorrow (12 Jun) — placeholder until V1 recorded |
| 4 | Swap homepage hero to real V1 product loop | When founder records V1 |
| 5 | Add remaining agent page clips | As videos are recorded |

---

## Founder action items

| # | Action | Urgency |
|---|--------|---------|
| F1 | Record V1 (90s product loop) on a clean demo account | 🔴 ASAP — blocks homepage |
| F2 | Upload V1 to YouTube + send Claude the YouTube URL | After recording |
| F3 | Launch the YouTube channel (roadmap #35, Week 2–4) | By Jun 29 |
| F4 | Record V2 (FIGSY live demo) for YouTube Video 4 | Week 2 |
| F5 | Record V3 (founder story) — low-production, high-authenticity | Week 2–3 |

---

## Notes

- **No fabricated view counts or testimonials** — the video hub shows only real content. Placeholder cards say "Coming soon" not fake stats.
- **Existing animated demos** (`platform-video.html`, `figsy-video.html`) stay live — they serve as the fallback until real screen recordings replace them.
- **YouTube-first strategy:** all long-form content lives on YouTube (SEO, distribution, watch-time). The website hub embeds from YouTube — no bandwidth cost, no hosting complexity.
- **9:16 social cuts:** roadmap item #30. Once V2/V3 are recorded, 60-90s cuts go to LinkedIn/Instagram/TikTok. Separate from this plan.
