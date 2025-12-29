# SKIN & PAPER - Design System Documentation

**Version**: 1.0
**Last Updated**: 2025-12-30
**Design Philosophy**: Editorial Magazine × Street Culture Tattoo Discovery

---

## 🎨 DESIGN VISION

### The Unforgettable Element
**Torn Paper Transitions** + **Oversized Editorial Typography** + **Dual-Tone Rhythm** (white/black alternating sections)

### Aesthetic Direction
This isn't a tech platform—it's a premium tattoo culture magazine that happens to be interactive.

**Tone**: Editorial/Magazine-inspired with modern web polish
**Target User**: 22-35 year olds who communicate in Pinterest boards, not terminology
**Brand Promise**: "Find Your Tattoo Artist by Vibe, Not Vocabulary"

---

## 📐 TYPOGRAPHY SYSTEM

### Font Stack

**Display Font**: Playfair Display (900 weight)
- Usage: Hero headlines, dramatic emphasis
- Character: Editorial, timeless, dramatic
- Example: "FIND YOUR ARTIST"

**Heading Font**: Space Grotesk (700-800 weight)
- Usage: Section headers, card titles
- Character: Modern, geometric, bold
- Example: Section headers, "How It Works"

**Body Font**: Crimson Pro (300-400 weight)
- Usage: Paragraphs, descriptions, readable text
- Character: Elegant, literary, readable
- Example: Body copy, artist descriptions

**Mono/Labels**: JetBrains Mono (100-200 weight)
- Usage: Labels, metadata, technical info
- Character: Technical contrast, lightweight
- Example: "AUSTIN ARTISTS", "188 ARTISTS"

### Typography Scale

```css
Display:  clamp(3rem, 6vw, 6rem)    / line-height: 0.95  / weight: 900
H1:       clamp(2rem, 4vw, 4rem)    / line-height: 1.1   / weight: 800
H2:       clamp(1.5rem, 3vw, 2.5rem)/ line-height: 1.2   / weight: 700
H3:       clamp(1.25rem, 2vw, 1.5rem)/ line-height: 1.3  / weight: 600
Body:     17px (1.0625rem)          / line-height: 1.7   / weight: 300
Small:    14px (0.875rem)           / line-height: 1.5   / weight: 300
Tiny:     11px (0.6875rem)          / line-height: 1.4   / weight: 200
```

### CSS Utility Classes

```css
.font-display        → Playfair Display 900
.font-heading        → Space Grotesk 800
.font-body           → Crimson Pro 300
.font-body-medium    → Crimson Pro 400
.font-mono           → JetBrains Mono 200, uppercase, 0.15em tracking

.text-display        → Responsive hero text
.text-h1, .text-h2, .text-h3
.text-small, .text-tiny
```

---

## 🎨 COLOR PALETTE

### Base System - High Contrast Foundation

```css
/* Pure Colors */
--white-pure: #FFFFFF
--white-warm: #FAFAF8    /* Primary background */
--black-pure: #000000
--black-warm: #0F0F0F    /* Primary dark background */

/* Grays (8 shades) */
--gray-100: #F5F5F3
--gray-200: #E5E5E0
--gray-300: #D0D0C8     /* Borders, dividers */
--gray-400: #A8A8A0
--gray-500: #808078     /* Secondary text */
--gray-600: #606058
--gray-700: #404038     /* Primary text on light */
--gray-800: #252520
--gray-900: #121210
```

### Gold/Amber Accent - Prestige & Warmth

```css
--gold-vibrant: #F59E0B  /* Primary accent, CTAs */
--gold-deep: #D97706     /* Hover states */
--gold-dark: #B45309     /* Active states */
--gold-pale: #FEF3C7     /* Background tint */
```

### Status Colors

```css
--success: #10B981
--error: #EF4444
--warning: #F59E0B
```

### Semantic Tokens

```css
.bg-light    → White warm background + dark text
.bg-dark     → Black warm background + white text
.bg-accent   → Gold pale background + dark text
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

### 1. Torn Paper Edge Transitions

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

### 2. Grain Texture Overlay

**Purpose**: Subtle tactile feel, print-quality depth

```html
<section class="grain-overlay">
  <!-- Content -->
</section>
```

**Details**: Fractal noise filter, 3% opacity, non-interactive overlay

### 3. Shadows - Editorial Drama

```css
--shadow-sm:      0 2px 8px rgba(0,0,0,0.08)      /* Subtle lift */
--shadow-md:      0 4px 16px rgba(0,0,0,0.12)     /* Card default */
--shadow-lg:      0 12px 32px rgba(0,0,0,0.16)    /* Hover state */
--shadow-xl:      0 20px 60px rgba(0,0,0,0.24)    /* Modal, drawer */
--shadow-lifted:  0 30px 80px rgba(0,0,0,0.32)    /* Dramatic hover */
--shadow-gold:    0 8px 32px rgba(245,158,11,0.25)  /* Gold glow */
--shadow-gold-strong: 0 12px 48px rgba(245,158,11,0.4) /* CTA hover */
```

### 4. Hover Effects

```css
.lift-hover         → translateY(-8px) + shadow-lifted
.scale-hover        → scale(1.02)
.gold-glow-hover    → shadow-gold-strong
.grayscale-hover    → grayscale(0.6) → grayscale(0) on hover
```

---

## 🎨 COMPONENT LIBRARY

### Buttons

#### Primary Button (Gold CTA)
```html
<button class="btn btn-primary">Find Artists</button>
```
- Gradient: gold-vibrant → gold-deep
- Hover: Lift -2px + gold glow
- Text: White, JetBrains Mono, uppercase, 0.15em tracking

#### Secondary Button (Outline)
```html
<button class="btn btn-secondary">Learn More</button>
```
- Border: 2px solid black-warm
- Hover: Fill black-warm, white text

#### Ghost Button (Subtle)
```html
<button class="btn btn-ghost">Cancel</button>
```
- Border: 1px gray
- Hover: Gold border

### Cards

#### Standard Card
```html
<div class="card">
  <!-- Content -->
</div>
```
- White background
- 12px border-radius
- Hover: Lift -8px + shadow-lifted

#### Artist Card
```html
<div class="artist-card">
  <img class="artist-card-image" />
  <!-- Content -->
</div>
```
- Gold border appears on hover
- Image scales 1.05x on hover
- Dramatic lift animation

### Inputs

#### Text Input
```html
<input class="input" type="text" placeholder="Search..." />
```
- 2px border (gray-300)
- Focus: Gold border + gold shadow
- Font: Crimson Pro 17px

#### Textarea (Search)
```html
<textarea class="input" rows="3"></textarea>
```
- Same styling as text input
- Italic placeholder text
- Auto-resize functionality

### Section Labels

```html
<div class="section-label">AUSTIN ARTISTS</div>
```
- JetBrains Mono, 11px, uppercase
- 0.2em letter-spacing
- Decorative lines left/right (40% width)

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
--duration-dramatic:  800ms   /* Page load, hero */
```

### Keyframe Animations

```css
.animate-fade-up      → Fade in from 40px below
.animate-fade-in      → Simple opacity fade
.animate-scale-in     → Scale from 0.9 to 1.0
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
1. Hero Section (White bg, grain overlay)
   - Oversized headline (Playfair Display)
   - Search bar (editorial card)
   - Stats bar (188 artists, 1.2K artworks, ATX)

2. Visual Gallery Strip (Black bg, torn edge top)
   - Horizontal scroll
   - Grayscale → color on hover
   - "AUSTIN ARTISTS" label

3. Featured Artists Grid (White bg, torn edge top)
   - Masonry layout
   - Artist cards with portfolio previews

4. How It Works (Gold accent bg, torn edge top, grain)
   - 3 columns
   - Large display numbers (01, 02, 03)
   - CTA button

5. Footer CTA (Black bg, torn edge top)
   - Oversized display headline
   - Gold gradient text accent
   - Social proof
   - Footer metadata
```

---

## ✅ ACCESSIBILITY GUIDELINES

### Color Contrast
- Body text: WCAG AAA (7:1+ ratio)
- Secondary text: WCAG AA (4.5:1+ ratio)
- Interactive elements: Clear focus states

### Focus States
```css
*:focus-visible {
  outline: 2px solid var(--gold-vibrant);
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
- **Image Optimization**: Use Next.js Image component
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
  /globals.css         → Design system variables + utilities
  /layout.tsx          → Font configuration
  /page.tsx            → Homepage (editorial layout)

/components
  /home
    /UnifiedSearchBar.tsx → Main search interface
    /VisualTeaserStrip.tsx → Gallery strip
    /FeaturedArtistsGrid.tsx → Artist cards
  /search
    /TextSearch.tsx
    /ImageUpload.tsx
```

---

## 🔄 VERSION HISTORY

**v1.0** (2025-12-30)
- Initial "SKIN & PAPER" design system
- Editorial magazine aesthetic
- Torn paper transitions
- Gold accent system
- Four-font typography hierarchy
- Responsive mobile-first layouts

---

## 💡 FUTURE ENHANCEMENTS

- [ ] Dark mode variant (optional)
- [ ] Custom cursor on desktop
- [ ] Parallax scroll effects on hero
- [ ] Animated torn paper transitions (beyond static SVG)
- [ ] Artist profile page templates
- [ ] Search results page design
- [ ] Mobile app adaptations

---

**Remember**: This design system prioritizes **BOLD EDITORIAL CHARACTER** over generic tech aesthetics. Every component should feel like it belongs in a premium tattoo culture magazine, not a standard SaaS platform.
