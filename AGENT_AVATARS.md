# K.I.N.D Agent Avatar Generation Prompts

_Last-checked: 24 Jun 2026._

Use these prompts in **Midjourney** (v6) or **DALL-E 3** to generate the 3D avatars.
Save outputs as PNG, ideally 512×512 or 1024×1024. Place in `apps/portal/public/agents/`.

> **⚠️ AUDIT 24 Jun — roster behind reality.** This doc has prompts for only 3 agents, but `apps/portal/public/agents/` now holds **8 avatars**: `figsy` · `milla` · `vida` · `denise` · `casey` · `Alex` · `lena` · `tony`. Prompts for Denise/Casey/Alex/Lena/Tony are **TBD**. *(AI family = FIGSY·Milla·Vida·Denise·Casey; Alex = non-family partner-channel agent (216); Lena/Tony = roadmap (145).)*
>
> **➕ 1 Jul — NORA added (admin agent, #275).** Nora — The Keeper is the **Admin Centre** co-pilot (not a client/portal agent), so her image lives in **`apps/admin/public/agents/Nora.png`** (referenced as `/agents/Nora.png` inside the admin app), NOT the portal folder. Roster now: family (portal) + Alex (partner portal) + **Nora (admin)**.

---

## FIGSY — AI SDR

**Midjourney prompt:**
```
3D cartoon character portrait, professional young woman with confident expression, 
short dark hair with blue highlights, wearing a sharp navy blazer with a small 
lightning bolt pin, holding a subtle glowing tablet, warm smile, 
background is a soft blue gradient sphere, style of modern SaaS product character illustration, 
clean white background, centered composition, high detail, 
Pixar-inspired 3D render, --ar 1:1 --style raw --v 6
```

**DALL-E 3 prompt:**
```
A 3D illustrated character for a SaaS product. A confident young professional woman, 
short dark hair with subtle blue highlights, wearing a navy blazer with a small 
lightning bolt lapel pin. She has a warm, energetic smile and is holding a glowing 
digital tablet. The style is modern Pixar-inspired 3D illustration, clean and polished. 
Soft blue gradient background. Square format, centered portrait. No text.
```

**Color theme:** Blue (#0066FF) — matches K.I.N.D primary brand
**Personality:** Bold, energetic, go-getter. "The hunter who finds your best leads."

---

## Milla — Virtual Assistant

**Midjourney prompt:**
```
3D cartoon character portrait, smart young woman with warm expression, 
auburn hair in a neat bun, wearing a soft purple blazer, 
small round glasses, holding a glowing document or calendar icon, 
organised and thoughtful pose, background is a soft purple gradient sphere, 
style of modern SaaS product character illustration, clean white background, 
centered composition, high detail, Pixar-inspired 3D render, --ar 1:1 --style raw --v 6
```

**DALL-E 3 prompt:**
```
A 3D illustrated character for a SaaS product. A warm, intelligent young woman 
with auburn hair in a neat bun and small round glasses. She wears a soft purple blazer 
and holds a glowing calendar or document. Her expression is thoughtful and organised. 
The style is modern Pixar-inspired 3D illustration, clean and polished. 
Soft purple gradient background. Square format, centered portrait. No text.
```

**Color theme:** Purple (#7c3aed)
**Personality:** Calm, organised, reliable. "The one who keeps everything running smoothly."

---

## Vida — Chatbot Agent

**Midjourney prompt:**
```
3D cartoon character portrait, friendly young woman with open warm expression, 
curly teal-tipped dark hair, wearing a casual teal and white top, 
hands slightly forward in welcoming gesture, chat bubble icon floating nearby, 
bright friendly smile, background is a soft teal-to-cyan gradient sphere, 
style of modern SaaS product character illustration, clean white background, 
centered composition, high detail, Pixar-inspired 3D render, --ar 1:1 --style raw --v 6
```

**DALL-E 3 prompt:**
```
A 3D illustrated character for a SaaS product. A friendly, approachable young woman 
with curly dark hair with teal tips. She wears a casual teal and white top and has 
her hands slightly forward in a welcoming gesture. A small chat bubble icon floats 
near her. Her expression is warm and open. The style is modern Pixar-inspired 3D 
illustration. Soft teal-to-cyan gradient background. Square format, centered portrait. No text.
```

**Color theme:** Teal (#0d9488)
**Personality:** Warm, conversational, always available. "The one your customers talk to first."

---

## Nora — The Keeper (Admin co-pilot · #275)

> Lives in the **admin** app → save as `apps/admin/public/agents/Nora.png` (create the folder), loaded as `/agents/Nora.png`.

**Midjourney prompt:**
```
3D cartoon character portrait, calm composed professional woman with a reassuring 
smile, dark hair in a low ponytail, wearing a deep navy blazer over a white top, 
small pearl earrings, holding a tablet showing a clean admin dashboard, 
poised "in-control" posture, background is a soft blue bokeh gradient sphere, 
style of modern SaaS product character illustration, clean background, 
centered composition, high detail, Pixar-inspired 3D render, --ar 1:1 --style raw --v 6
```

**DALL-E 3 prompt:**
```
A 3D illustrated character for a SaaS product. A calm, composed professional woman 
with dark hair in a low ponytail and small pearl earrings, wearing a deep navy blazer 
over a white top. She holds a tablet showing a tidy admin dashboard and has a 
reassuring, in-control expression. The style is modern Pixar-inspired 3D illustration, 
clean and polished. Soft blue bokeh gradient background. Square format, centered portrait. No text.
```

**Color theme:** Deep navy / admin-slate (with the #6d28d9 admin-purple accent)
**Personality:** Tidy, secure, in control. All-round admin co-pilot — "The one who keeps the whole system in order." Context-aware to whatever admin screen you're on.

---

## Implementation

Once you have the images, update the `AgentAvatar` component in `Sidebar.tsx` to use them:

```tsx
// In AgentAvatar component, replace the gradient div with:
<div className={`${sizes[size]} rounded-xl overflow-hidden ring-2 ${agent.ringColor} shadow-lg`}>
  <img 
    src={`/agents/${agent.id}.png`} 
    alt={agent.name}
    className="w-full h-full object-cover"
  />
</div>
```

And in `dashboard/page.tsx`, replace the FIGSY hero avatar:
```tsx
<img src="/agents/figsy.png" alt="FIGSY" className="w-14 h-14 rounded-2xl object-cover" />
```
