import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Color System - Inkdex
      colors: {
        // Base colors
        paper: '#F8F7F5',
        ink: '#1A1A1A',

        // Grayscale (5 levels)
        gray: {
          100: '#F0EFEC',
          300: '#D8D6D2',
          500: '#8B8985',
          700: '#4A4845',
          900: '#2A2826',
        },

        // Optional warm gray accent
        'warm-gray': '#8B7355',

        // Accent colors (for featured badges, highlights)
        accent: {
          DEFAULT: '#8B7355',  // Warm gray
          bright: '#A68968',   // Lighter warm gray
          primary: '#8B7355',  // Alias for consistency
        },

        // Amber for featured/premium
        featured: {
          light: '#FFD54F',    // Light amber
          DEFAULT: '#FFC107',  // Amber (between yellow and orange)
          dark: '#FF8F00',     // Dark amber (for text/borders)
        },

        // Status colors
        status: {
          success: '#10b981',
          error: '#ef4444',
          warning: '#f59e0b',
        },

        // Semantic color tokens (match CSS variables)
        bg: {
          primary: '#F8F7F5',    // var(--bg-primary)
          secondary: '#F0EFEC',  // var(--bg-secondary)
          dark: '#1A1A1A',       // var(--bg-dark)
        },

        text: {
          primary: '#1A1A1A',    // var(--text-primary)
          secondary: '#4A4845',  // var(--text-secondary)
          tertiary: '#8B8985',   // var(--text-tertiary)
          inverse: '#F8F7F5',    // var(--text-inverse)
        },

        border: {
          subtle: '#D8D6D2',     // var(--border-subtle)
          medium: '#8B8985',     // var(--border-medium)
          strong: '#1A1A1A',     // var(--border-strong)
        },

        surface: {
          low: '#F0EFEC',        // Subtle surface elevation
          high: '#F8F7F5',       // Higher surface elevation
        },
      },

      // Font Families
      fontFamily: {
        display: ['var(--font-playfair)', 'serif'],
        heading: ['var(--font-libre-baskerville)', 'serif'], // CHANGED from Space Grotesk
        body: ['var(--font-crimson-pro)', 'serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },

      // Font Sizes (with line heights) - v2.1 Readability Update
      fontSize: {
        display: ['3.5rem', { lineHeight: '0.95', fontWeight: '900' }],
        h1: ['2.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        h2: ['1.75rem', { lineHeight: '1.2', fontWeight: '700' }],
        h3: ['1.25rem', { lineHeight: '1.3', fontWeight: '700' }],
        body: ['1rem', { lineHeight: '1.7', fontWeight: '400' }], // 16px @ 400 (WCAG AA compliant)
        small: ['0.875rem', { lineHeight: '1.6', fontWeight: '400' }], // 14px @ 400 (WCAG AA compliant)
        // 'tiny' removed - deprecated in favor of text-xs (12px)
      },

      // Spacing: Using Tailwind defaults (4px grid)
      // No custom spacing - use Tailwind's default scale to avoid conflicts
      // Common values: p-1=4px, p-2=8px, p-4=16px, p-6=24px, p-8=32px, p-12=48px, p-16=64px, p-24=96px

      // Border Radius
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },

      // Box Shadow - Minimal (reduced opacity)
      boxShadow: {
        sm: '0 1px 3px rgba(26, 26, 26, 0.08)',
        md: '0 2px 6px rgba(26, 26, 26, 0.12)',
        lg: '0 4px 12px rgba(26, 26, 26, 0.16)',
        xl: '0 8px 24px rgba(26, 26, 26, 0.18)',
      },

      // Animation
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        dramatic: 'cubic-bezier(0.87, 0, 0.13, 1)',
      },

      transitionDuration: {
        fast: '150ms',
        medium: '300ms',
        slow: '500ms',
      },

      // Keyframe Animations
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' }, // Reduced from 40px
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },

      animation: {
        'fade-up': 'fade-up 0.5s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'shimmer': 'shimmer 2s linear infinite',
      },

      // Background Images
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
        'dotted-pattern': 'radial-gradient(circle, #D8D6D2 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}

export default config
