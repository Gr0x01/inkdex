# PAPER & INK - Design System Documentation

**Version**: 2.0
**Last Updated**: 2025-12-30
**Design Philosophy**: Editorial Minimal × Tattoo Artist Discovery

---

## 🎨 DESIGN VISION

### The Unforgettable Element
**Dotted Paper Texture** + **Serif Editorial Typography** + **Black & White Minimalism** (portfolio work takes center stage)

### Aesthetic Direction
This isn't a tech platform—it's a paper editorial magazine for tattoo culture that happens to be interactive.

**Tone**: Minimal editorial with refined restraint
**Target User**: 22-35 year olds who communicate in Pinterest boards, not terminology
**Brand Promise**: "Find Your Tattoo Artist by Vibe, Not Vocabulary"

### Design Principles
- **Paper as Background**: Near-white (#F8F7F5) textured background recedes to showcase portfolio work
- **Ink as Accent**: Near-black (#1A1A1A) for text and UI elements - simple, bold, editorial
- **Full-Color Portfolio**: All tattoo work displayed in full vibrant color immediately (no filters)
- **Subtle Interactions**: Refined hover effects (4px lifts max), simple underlines, minimal shadows
- **Traditional Serifs**: Libre Baskerville for headings, Crimson Pro for body - classic editorial feel

---

## 📐 TYPOGRAPHY SYSTEM

### Font Stack

**Display Font**: Playfair Display (900 weight)
- Usage: Hero headlines, dramatic emphasis
- Character: Editorial, timeless, high-contrast serif
- Example: "FIND YOUR ARTIST"

**Heading Font**: Libre Baskerville (700 weight) **[CHANGED in v2.0]**
- Usage: Section headers, card titles, H1-H3
- Character: Traditional, refined, classic editorial serif
- Example: Section headers, "Similar Artists in Austin"

**Body Font**: Crimson Pro (300-400 weight)
- Usage: Paragraphs, descriptions, readable text
- Character: Elegant, literary, highly readable
- Line-height: 1.8 (increased for editorial spacing)
- Example: Body copy, artist descriptions

**Mono/Labels**: JetBrains Mono (200 weight)
- Usage: Labels, metadata, technical info
- Character: Technical contrast, lightweight, uppercase
- Example: "AUSTIN ARTISTS", "188 ARTISTS"

### Typography Scale

```css
Display:  clamp(3rem, 6vw, 6rem)    / line-height: 0.95  / weight: 900
H1:       clamp(2rem, 4vw, 4rem)    / line-height: 1.1   / weight: 700
H2:       clamp(1.5rem, 3vw, 2.5rem)/ line-height: 1.2   / weight: 700
H3:       clamp(1.25rem, 2vw, 1.5rem)/ line-height: 1.3  / weight: 700
Body:     17px (1.0625rem)          / line-height: 1.8   / weight: 300 [INCREASED]
Small:    14px (0.875rem)           / line-height: 1.5   / weight: 300
Tiny:     11px (0.6875rem)          / line-height: 1.4   / weight: 200
```

### CSS Utility Classes

```css
.font-display        → Playfair Display 900
.font-heading        → Libre Baskerville 700 [CHANGED]
.font-body           → Crimson Pro 300, line-height: 1.8
.font-body-medium    → Crimson Pro 400
.font-mono           → JetBrains Mono 200, uppercase, 0.15em tracking

.text-display        → Responsive hero text
.text-h1, .text-h2, .text-h3
.text-small, .text-tiny
```

---

## 🎨 COLOR PALETTE

### Base System - Paper & Ink **[COMPLETELY REVISED in v2.0]**

```css
/* Primary Colors */
--paper-white: #F8F7F5    /* Near-white paper background */
--ink-black: #1A1A1A      /* Near-black ink for text/UI */

/* Grayscale (5 levels - simplified from 9) */
--gray-100: #F0EFEC       /* Lightest gray (subtle backgrounds) */
--gray-300: #D8D6D2       /* Light gray (borders, dividers) */
--gray-500: #8B8985       /* Mid gray (secondary text) */
--gray-700: #4A4845       /* Dark gray (primary text on light) */
--gray-900: #2A2826       /* Darkest gray (emphasis) */

/* Optional Accent */
--warm-gray: #8B7355      /* Subtle warm gray (aged paper feel) */
```

### Removed Colors (v1.0 → v2.0)

```css
/* ❌ REMOVED - No longer part of design system */
--gold-vibrant: #F59E0B   /* Removed - too decorative */
--gold-deep: #D97706      /* Removed - too decorative */
--gold-dark: #B45309      /* Removed - too decorative */
--gold-pale: #FEF3C7      /* Removed - too decorative */
--accent-primary: #3b82f6 /* Removed - blue accent */
```

### Status Colors

```css
--success: #10B981
--error: #EF4444
--warning: #F59E0B  /* Functional only, not decorative */
```

### Semantic Tokens

```css
.bg-light    → Paper white background + dark text
.bg-dark     → Ink black background + white text
```

---

## 🔲 SPACING SYSTEM

8px base grid system:

```css
--space-xs:  4px   (0.25rem)
--space-sm:  8px   (0.5rem)
--space-md:  16px  (1rem)
--space-lg:  24px  (1.5rem)
--space-xl:  32px  (2rem)
--space-2xl: 48px  (3rem)
--space-3xl: 64px  (4rem)
--space-4xl: 96px  (6rem)
--space-5xl: 128px (8rem)
```

**Recommended Usage**:
- Component padding: `xl` (32px)
- Section padding: `3xl` - `4xl` (64px - 96px)
- Element gaps: `lg` (24px)
- Tight spacing: `sm` (8px)

---

## 🎭 VISUAL EFFECTS

### 1. Dotted Background Pattern **[NEW in v2.0]**

**Purpose**: Global paper texture creates editorial magazine feel

**Implementation**:
```css
body {
  background: var(--paper-white);
  background-image: radial-gradient(circle, var(--gray-300) 1px, transparent 1px);
  background-size: 24px 24px;
  background-position: 0 0;
}
```

**Visual**: Subtle 1px dots on 24px grid - paper-like texture without overwhelming content

### 2. Torn Paper Edge Transitions

**Purpose**: Section dividers that evoke tactile print magazine aesthetic

```html
<section class="bg-dark torn-edge-top">
  <!-- Content -->
</section>
```

**Classes**:
- `.torn-edge-top` - Ragged edge at top (60px padding)
- `.torn-edge-bottom` - Ragged edge at bottom (60px padding)

**Visual**: SVG path creates irregular torn paper effect
**Color**: Inherits from `currentColor` (matches section background)

### 3. Grain Texture Overlay

**Purpose**: Subtle tactile feel, print-quality depth

```html
<section class="grain-overlay">
  <!-- Content -->
</section>
```

**Details**: Fractal noise filter, **0.015 opacity** (reduced from 0.03), non-interactive overlay

### 4. Shadows - Minimal Restraint **[REDUCED in v2.0]**

```css
--shadow-sm:  0 1px 3px rgba(26,26,26,0.08)     /* Subtle lift */
--shadow-md:  0 2px 6px rgba(26,26,26,0.12)     /* Card default */
--shadow-lg:  0 4px 12px rgba(26,26,26,0.16)    /* Hover state */
--shadow-xl:  0 8px 24px rgba(26,26,26,0.18)    /* Modal, drawer */

/* ❌ REMOVED from v1.0 */
--shadow-lifted:  /* Was 0.32 opacity - too dramatic */
--shadow-gold:    /* Removed - no gold accents */
--shadow-gold-strong: /* Removed - no gold accents */
```

### 5. Hover Effects **[SIMPLIFIED in v2.0]**

```css
.lift-hover         → translateY(-3px) + shadow-lg [REDUCED from -8px]
.scale-hover        → scale(1.01) [REDUCED from 1.02]

/* ❌ REMOVED from v1.0 */
.gold-glow-hover    /* Removed - no gold effects */
.grayscale-hover    /* Removed - images always full color */
```

**New Principle**: Subtle, refined interactions. Portfolio images display in full color always.

---

## 🎨 COMPONENT LIBRARY

### Buttons

#### Primary Button (Black CTA) **[CHANGED in v2.0]**
```html
<button class="btn btn-primary">Find Artists</button>
```
- Background: Solid ink black (#1A1A1A)
- Text: Paper white
- Hover: Lift -2px + subtle shadow
- Text: JetBrains Mono, uppercase, 0.15em tracking

#### Secondary Button (Outline)
```html
<button class="btn btn-secondary">Learn More</button>
```
- Border: 2px solid ink black
- Hover: Fill ink black, white text

#### Ghost Button (Subtle)
```html
<button class="btn btn-ghost">Cancel</button>
```
- Border: 1px gray
- Hover: Black border

### Cards

#### Standard Card
```html
<div class="card">
  <!-- Content -->
</div>
```
- White background with 2px border (gray-300)
- Hover: Lift -3px + black border **[REDUCED from -8px]**

#### Artist Card **[UPDATED in v2.0]**
```html
<div class="artist-card">
  <img class="artist-card-image" /> <!-- NO grayscale filter -->
  <!-- Content -->
</div>
```
- Images display in **full color always** (no grayscale filters)
- Black border appears on hover (no gold)
- Image scales 1.03x on hover (subtle)
- Lift effect: -3px (refined)

### Inputs

#### Text Input
```html
<input class="input" type="text" placeholder="Search..." />
```
- 2px border (gray-300)
- Focus: Ink black border + subtle shadow (no gold)
- Font: Crimson Pro 17px

### Section Labels

```html
<div class="section-label">AUSTIN ARTISTS</div>
```
- JetBrains Mono, 11px, uppercase
- 0.2em letter-spacing
- Decorative lines left/right (40% width, gray-300)

---

## 🎬 ANIMATION SYSTEM

### Timing Functions

```css
--ease-smooth:    cubic-bezier(0.4, 0, 0.2, 1)
--ease-bounce:    cubic-bezier(0.68, -0.55, 0.265, 1.55)
--ease-dramatic:  cubic-bezier(0.87, 0, 0.13, 1)
```

### Durations

```css
--duration-fast:      150ms   /* Hover, focus */
--duration-medium:    300ms   /* Transitions, slides */
--duration-slow:      500ms   /* Fades, complex */
```

### Keyframe Animations **[UPDATED in v2.0]**

```css
.animate-fade-up      → Fade in from 20px below [REDUCED from 40px]
.animate-fade-in      → Simple opacity fade
.animate-scale-in     → Scale from 0.95 to 1.0
.animate-slide-up     → Slide from bottom
```

### Stagger Children

```html
<div class="stagger-children">
  <div>Item 1</div>  <!-- 0ms delay -->
  <div>Item 2</div>  <!-- 100ms delay -->
  <div>Item 3</div>  <!-- 200ms delay -->
</div>
```

Automatic 100ms stagger delays (up to 10 children)

---

## 📱 RESPONSIVE STRATEGY

### Breakpoints

```css
sm: 640px   /* Mobile */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Wide desktop */
```

### Mobile Adaptations

**Typography**:
- Display: 3rem → 6rem (responsive clamp)
- H1: 2rem → 4rem
- All text scales ~30% down on mobile

**Layout**:
- Hero: Stack vertical
- Grid: 3 columns → 1 column
- Container padding: 32px → 24px

**Interactions**:
- Torn edges: 60px → 40px height
- Touch targets: Minimum 44px
- Hover effects: Reduce or disable on touch

---

## 🎯 PAGE LAYOUTS

### Homepage Structure

```
1. Hero Section (Paper bg, dotted texture, grain overlay)
   - Oversized headline (Playfair Display)
   - Search bar (minimal black/white)
   - Stats bar (188 artists, 1.2K artworks, ATX)

2. Visual Gallery Strip (Light bg, torn edge top)
   - Horizontal scroll
   - Full color images (NO grayscale)
   - "AUSTIN ARTISTS" label

3. Featured Artists Grid (Paper bg, torn edge top)
   - Masonry layout
   - Artist cards with portfolio previews (full color)

4. How It Works (Light bg, torn edge top, grain) [UPDATED]
   - 3 columns
   - Gray step numbers (NOT gold)
   - Black CTA button

5. Footer CTA (Ink bg, torn edge top)
   - Oversized display headline
   - Gray text accent (NOT gold gradient)
   - Social proof
   - Footer metadata
```

---

## ✅ ACCESSIBILITY GUIDELINES

### Color Contrast

- Body text: WCAG AAA (7:1+ ratio) - Ink on Paper
- Secondary text: WCAG AA (4.5:1+ ratio) - Gray-700 on Paper
- Interactive elements: Clear focus states (ink black)

### Focus States

```css
*:focus-visible {
  outline: 2px solid var(--ink-black); /* Changed from gold */
  outline-offset: 3px;
}
```

### Keyboard Navigation

- All interactive elements focusable
- Logical tab order
- Skip links for screen readers

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable animations */
}
```

---

## 🚀 IMPLEMENTATION GUIDELINES

### CSS Architecture

1. **Variables First**: Always use CSS variables, never hardcoded values
2. **Utility Classes**: Leverage Tailwind + custom utilities
3. **Component Classes**: Use `.btn`, `.card`, `.artist-card` for consistency
4. **Responsive**: Mobile-first approach with `md:` and `lg:` prefixes

### Performance

- **Font Loading**: `display: swap` for all fonts
- **Image Optimization**: Use Next.js Image component (preferred over `<img>`)
- **Animations**: CSS-only for performance
- **Critical CSS**: Inline above-fold styles

### Component Development

```tsx
// Example: Editorial Section
<section className="bg-dark torn-edge-top py-16 md:py-24 relative">
  <div className="container mx-auto relative z-10">
    <h2 className="font-mono text-tiny text-gray-400 tracking-widest text-center mb-12">
      SECTION LABEL
    </h2>
    {/* Content */}
  </div>
</section>
```

---

## 🎨 BRAND VOICE

### Messaging Tone

- Friendly, not clinical
- Visual-first, not jargon-heavy
- Confident, not pretentious
- Editorial, not corporate

### Example Copy

✅ "Find Your Artist by Vibe"
❌ "Advanced AI-Powered Tattoo Artist Matching Platform"

✅ "Upload an image or describe your style"
❌ "Submit visual reference or input text query"

✅ "188 artists in Austin"
❌ "188 verified tattoo professionals in the Austin metropolitan area"

---

## 📦 FILE STRUCTURE

```
/app
  /globals.css         → Design system variables + utilities (v2.0)
  /layout.tsx          → Font configuration (Libre Baskerville added)
  /page.tsx            → Homepage (minimal editorial layout)

/components
  /home
    /UnifiedSearchBar.tsx → Main search interface (black/white)
    /VisualTeaserStrip.tsx → Gallery strip (full color images)
    /FeaturedArtistsGrid.tsx → Artist cards (full color)
  /search
    /ArtistCard.tsx → Search result cards (no filters)
  /artist
    /ArtistHero.tsx → Artist profile header (simplified)
    /PortfolioGrid.tsx → Image grid (full color)
  /layout
    /Navbar.tsx → Navigation (paper/ink colors)
```

---

## 🔄 VERSION HISTORY

**v2.0** (2025-12-30) - **"PAPER & INK" Redesign**
- Near-white (#F8F7F5) / near-black (#1A1A1A) color system
- Dotted background texture (global, 24px grid)
- Traditional serif typography (Libre Baskerville for headings)
- Removed all gold (#F59E0B, #D97706) and blue (#3b82f6) accents
- Minimal shadows (0.08-0.18 opacity, reduced from 0.32-0.7)
- Full-color portfolio images always (removed grayscale filters)
- Subtle hover effects (2-4px lift, reduced from 8-16px)
- Increased body line-height to 1.8 for editorial spacing
- Simple interactions: underlines, subtle borders, no glows

**v1.0** (2025-12-30) - **"SKIN & PAPER" Initial Design**
- Editorial magazine aesthetic with warm tones
- Gold accent system (primary CTAs, highlights)
- Blue verification badges
- Dramatic hover effects (8px lifts, gold glows)
- Space Grotesk for headings
- Grayscale image filters on hover
- Four-font typography hierarchy
- Responsive mobile-first layouts

---

## 💡 FUTURE ENHANCEMENTS

### Considered for v3.0

- [ ] Optimize all `<img>` tags → Next.js `<Image>` components
- [ ] Custom cursor on desktop (editorial magazines often have custom cursors)
- [ ] Parallax scroll effects on hero (very subtle, paper-like)
- [ ] Animated torn paper transitions (SVG animation on scroll)
- [ ] Hand-drawn underline animations for links
- [ ] Aged paper texture variations (subtle discoloration)
- [ ] Print-style pull quotes for artist testimonials

### Not Planned

- ❌ Dark mode variant (contradicts paper aesthetic)
- ❌ Gold/blue accents (removed intentionally for minimalism)
- ❌ Dramatic hover effects (contradicts refined editorial approach)

---

## 📊 MIGRATION GUIDE (v1.0 → v2.0)

### Breaking Changes

| v1.0 (SKIN & PAPER) | v2.0 (PAPER & INK) | Reason |
|---------------------|---------------------|---------|
| `--gold-vibrant` | `--ink-black` | Removed decorative gold |
| `--gold-deep` | `--gray-700` | Simplified to grayscale |
| `--accent-primary` (blue) | `--ink-black` | Removed blue accent |
| Space Grotesk headings | Libre Baskerville | Traditional serif |
| `.grayscale-hover` | Removed | Images always full color |
| `-translate-y-8` (32px) | `-translate-y-3` (12px) | Subtle interactions |
| `shadow-lifted` (0.32 opacity) | `shadow-lg` (0.16 opacity) | Minimal shadows |
| `--white-warm: #FAFAF8` | `--paper-white: #F8F7F5` | True near-white |
| `--black-warm: #0F0F0F` | `--ink-black: #1A1A1A` | True near-black |

### Component Updates Required

1. **Images**: Remove ALL `grayscale-hover` classes
2. **Buttons**: Replace `bg-gradient-to-r from-gold-*` → `bg-ink text-paper`
3. **Focus states**: Replace `ring-gold-vibrant` → `ring-ink`
4. **Verification badges**: Replace `bg-accent-primary` (blue) → `bg-ink text-paper`
5. **Typography**: Update `font-heading` CSS classes (auto-updates with CSS vars)

---

**Remember**: This design system prioritizes **REFINED EDITORIAL MINIMALISM** over decorative tech aesthetics. Every component should feel like it belongs in a premium paper magazine, not a standard SaaS platform. The portfolio work is the hero—everything else recedes to support it.
