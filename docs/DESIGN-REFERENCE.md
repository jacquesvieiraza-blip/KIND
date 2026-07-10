# 🎨 DESIGN REFERENCE — how K.I.N.D looks (locked 9 Jul, before the FIGSY-only cut)

> **Why this exists:** on 9 Jul the founder locked the reset — website + portal cut to FIGSY-only; the
> agent family (Milla · Vida · Denise · Tony) comes down and returns after 3 months of paid, verified
> clients. **When anything returns, it must render with THIS look.** This doc + the screenshots beside
> it + the museum commit are the source of truth for that look. The UI look & feel never changes in
> the cut — we remove surfaces and fix words only.

## 🏛 The museum commit — every deleted page is one command away
Everything (all 62 website pages, every portal screen, all components) exists intact at:

```
MUSEUM SHA: 8eb5ddc3bb7855d87bfbb67458061f263b6f8ccf   (origin/main, 9 Jul 2026, pre-cut)
```

Restore any file pixel-perfect:
```bash
git checkout 8eb5ddc3bb7855d87bfbb67458061f263b6f8ccf -- apps/website/virtual-assistant.html
git checkout 8eb5ddc3bb7855d87bfbb67458061f263b6f8ccf -- "apps/portal/src/app/(dashboard)/dashboard/assistant/"
```

## 🏛 Portal pre-cut restore point (pinned 10 Jul, before the FIGSY-only portal cut)
The website museum SHA above predates the homepage redesign. **For the PORTAL, use this newer
pin** — it is the last `main` before the portal FIGSY-only cut (SPRINT line 2), taken AFTER the
website render work (#1030/#1031), with the full 4-agent portal intact: agent switcher + cards
(`Sidebar.tsx` / `SidebarSlim.tsx`), assistant (Milla), chatbot (Vida), denise, marketplace,
whats-new, templates, notetaker — all 39 dashboard surfaces verified present at this commit.

```
PORTAL PRE-CUT SHA: ffa5f59582fdc728bdb26342a3e59bcd7cf002a6   (origin/main, 10 Jul 2026)
```

Default any portal surface back exactly as it was:
```bash
# one page
git checkout ffa5f59582fdc728bdb26342a3e59bcd7cf002a6 -- "apps/portal/src/app/(dashboard)/dashboard/assistant/"
# the whole pre-cut sidebar (agent switcher + cards)
git checkout ffa5f59582fdc728bdb26342a3e59bcd7cf002a6 -- apps/portal/src/components/layout/Sidebar.tsx apps/portal/src/components/layout/SidebarSlim.tsx
# the entire pre-cut portal
git checkout ffa5f59582fdc728bdb26342a3e59bcd7cf002a6 -- apps/portal/
```

## 📸 Screenshots (in `docs/design-reference/`, 1280px, captured 9 Jul pre-cut)
`website-index` · `website-pricing` · `website-figsy` · `website-virtual-assistant` (Milla) ·
`website-chatbot-agent` (Vida) · `website-denise` · `website-story` · `website-solutions` ·
`website-use-cases` · `website-partners` · `website-vs-hiring-an-sdr` · `website-the-drop`.
*(Portal screenshots not needed — the portal skin is NOT deleted in the cut; its components stay live
in the surviving pages. The museum SHA holds every removed portal page's code.)*

---

## 🌐 WEBSITE design system (`apps/website/*.html` — self-contained static pages)

**Tokens (`:root` in every page):**
```css
--blue:   #7C3AED;            /* primary violet — buttons, links, accents (named "blue", is violet) */
--dark:   #0a0a0a;            /* body text */
--mid:    #444;               /* secondary text */
--light:  #f5f5f7;            /* light section background */
--border: rgba(0,0,0,0.08);   /* hairline borders */
body { background:#fff; line-height:1.6; }
```

**Type:**
- Body: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`
- Display/headlines: **'Outfit', sans-serif — weight 900, letter-spacing −.04…−.045em, line-height ~1.0**, sized with `clamp()` (e.g. `clamp(2.4rem, 5.2vw, 4.4rem)`)
- Technical/labels: **'JetBrains Mono', monospace** — small caps-style: `.58–.74rem`, `letter-spacing:.14em`, `text-transform:uppercase`
- Occasional serif accent: Georgia (pull-quotes)

**Patterns:** white pages, generous whitespace; violet #7C3AED as the single accent; pill CTAs;
agent pages used a soft pastel hero per agent (see agent screenshots) with a circular agent
portrait, eyebrow label in JetBrains Mono, then "This is ___." Outfit-900 headline.

---

## 🖥 PORTAL design system (`apps/portal` — Next.js + Tailwind)

**Brand palette (`tailwind.config.ts` → `colors.brand`) — warm peach → lavender:**
```
50 #FFF5EE · 100 #F5EEFF · 200 #E9D8FF · 300 #D4B8FF · 400 #A78BFA
500 #7C3AED (primary) · 600 #6D28D9 (hover) · 700 #5B21B6 · 800 #2D1B69 · 900 #1A0F47
```
**Gradients:** `kind-gradient` `linear-gradient(135deg,#FFF5EE 0%,#FAF0FF 50%,#F0E8FF 100%)` ·
`kind-gradient-vivid` `linear-gradient(135deg,#FFD4B2 0%,#F9C8FF 50%,#C4B5FD 100%)`

**Surfaces & text (CSS vars in `globals.css`, RGB triplets; `.dark` variants defined):**
light: surface gray-50 / raised white / overlay gray-100 · borders gray-200/300 ·
text gray-900 / muted gray-500 / faint gray-400.

**Type:** Inter (400/500/600/700), `font-sans` everywhere.

**Recurring UI constants seen across components:** sidebar dark `#0F0929` / `#1E1152`;
sidebar light bg `#F5F3FF`; muted violet text `#7B6FA0` / `#9B8EC4`; primary buttons
`bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl`; cards
`bg-white rounded-2xl border border-purple-100 shadow-sm`; status pills
`text-[10px]/[11px] font-bold px-2.5 py-1 rounded-full` (emerald=live, purple=info, amber=credits).

**Agent identity colours (for when they return):**
FIGSY violet `#7C3AED` · Milla pink `#F472B6` (portal) / sky `#0ea5e9` (home card) ·
Vida teal `#14B8A6` / emerald `#10b981` · Denise amber `#D97706`.
Agent card pattern: photo top (object-top), dark identity bar `#0F0929` with name + coloured
subtitle, feature checklist with accent-coloured ticks, full-width accent CTA.

---

## 📏 The rule
Any new page or returning agent surface: **start from these tokens and the screenshots — not from
memory, not from a fresh design.** If a component already exists in the portal, reuse it. The look
is locked; only content grows.
