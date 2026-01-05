---
Last-Updated: 2026-01-05
Version: 2.1
---

# Design System

## Philosophy
**Editorial Minimal** - Paper magazine aesthetic for tattoo artist discovery.

- **Paper as Background:** Near-white (#F8F7F5) with dotted texture
- **Ink as Accent:** Near-black (#1A1A1A) for text and UI
- **Full-Color Portfolio:** All tattoo work in vibrant color (no filters)
- **Subtle Interactions:** 4px lifts max, simple underlines

---

## Typography

| Use | Font | Weight | Size |
|-----|------|--------|------|
| Display | Playfair Display | 900 | clamp(3rem, 6vw, 6rem) |
| Headings | Libre Baskerville | 700 | H1-H3 responsive |
| Body | Crimson Pro | 400 | 16px, line-height 1.8 |
| Small | Crimson Pro | 400 | 14px |
| Labels | JetBrains Mono | 500 | 12px, uppercase |

**Critical Rules:**
- **NEVER** use text smaller than 14px for body content
- **NEVER** use custom sizes (10px, 11px, 13px)
- Body minimum: 16px / Secondary: 14px / Labels only: 12px

---

## Colors

```css
--paper-white: #F8F7F5   /* Background */
--ink-black: #1A1A1A     /* Text, UI */
--gray-100: #F0EFEC      /* Subtle backgrounds */
--gray-300: #D8D6D2      /* Borders */
--gray-500: #8B8985      /* Secondary text */
--gray-700: #4A4845      /* Primary text on light */
```

**No gold or blue accents.** Grayscale only.

---

## Spacing (Tailwind Default 4px Grid)

**DO NOT add custom spacing to tailwind.config.ts.**

| Use | Value |
|-----|-------|
| Section padding | `py-12` (48px) |
| Component padding | `p-4` (16px) |
| Grid gaps desktop | `gap-4` (16px) |
| Grid gaps mobile | `gap-3` (12px) |

---

## Information Density

**We are an app, not a magazine spread.**

**Targets:**
- Desktop: 8-12 artist cards per viewport
- Mobile: 4-6 cards per viewport
- Above-fold: Show at least 6 artists immediately

**Anti-patterns:**
- ❌ Magazine-style 64-96px section padding
- ❌ Only 3-4 cards visible per viewport
- ❌ Luxurious 32px+ card padding

---

## Components

### Buttons
```html
<button class="btn btn-primary">CTA</button>      <!-- Ink black, white text -->
<button class="btn btn-secondary">Secondary</button>  <!-- Outline -->
<button class="btn btn-ghost">Cancel</button>     <!-- Subtle -->
```

### Cards
```html
<div class="card">...</div>                       <!-- White bg, 2px gray border -->
<div class="artist-card">...</div>                <!-- Full color images always -->
```

### Hover Effects
- Lift: `translateY(-3px)` + shadow (NOT -8px)
- Scale: `1.01` (NOT 1.02)
- No grayscale filters on images

---

## Visual Effects

- **Dotted Background:** `radial-gradient(circle, #D8D6D2 1px, transparent 1px)` 24px grid
- **Torn Paper Edges:** `.torn-edge-top`, `.torn-edge-bottom`
- **Shadows:** 0.08-0.18 opacity (minimal)

---

## Responsive Breakpoints

```css
sm: 640px   /* Mobile */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Wide */
```

---

## Accessibility

- WCAG AAA contrast (ink on paper = 16:1)
- Focus: `outline: 2px solid ink-black`
- Touch targets: minimum 44px
- `@media (prefers-reduced-motion: reduce)` support
