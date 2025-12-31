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
        },

        // Status colors
        status: {
          success: '#10b981',
          error: '#ef4444',
          warning: '#f59e0b',
        },
      },

      // Font Families
      fontFamily: {
        display: ['var(--font-playfair)', 'serif'],
        heading: ['var(--font-libre-baskerville)', 'serif'], // CHANGED from Space Grotesk
        body: ['var(--font-crimson-pro)', 'serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },

      // Font Sizes (with line heights)
      fontSize: {
        display: ['3.5rem', { lineHeight: '0.95', fontWeight: '900' }],
        h1: ['2.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        h2: ['1.75rem', { lineHeight: '1.2', fontWeight: '700' }],
        h3: ['1.25rem', { lineHeight: '1.3', fontWeight: '700' }],
        body: ['0.9375rem', { lineHeight: '1.8', fontWeight: '300' }], // Increased line-height
        small: ['0.8125rem', { lineHeight: '1.5', fontWeight: '300' }],
        tiny: ['0.6875rem', { lineHeight: '1.4', fontWeight: '200', letterSpacing: '0.05em' }],
      },

      // Spacing (8px grid)
      spacing: {
        '1': '0.5rem',   // 8px
        '2': '1rem',     // 16px
        '3': '1.5rem',   // 24px
        '4': '2rem',     // 32px
        '6': '3rem',     // 48px
        '8': '4rem',     // 64px
        '12': '6rem',    // 96px
        '16': '8rem',    // 128px
      },

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
