import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Color System
      colors: {
        // Background colors
        bg: {
          primary: '#0a0a0a',
          secondary: '#141414',
          tertiary: '#1e1e1e',
        },
        // Surface colors
        surface: {
          low: '#1e1e1e',
          mid: '#282828',
          high: '#323232',
        },
        // Text colors
        text: {
          primary: '#f5f5f5',
          secondary: '#a8a8a8',
          tertiary: '#888888', // Updated from #6b6b6b for WCAG AA compliance (4.68:1 contrast)
          inverse: '#0a0a0a',
        },
        // Accent colors
        accent: {
          primary: '#3b82f6',
          'primary-hover': '#2563eb',
          'primary-active': '#1d4ed8',
          secondary: '#f59e0b',
          'secondary-hover': '#d97706',
        },
        // Status colors
        status: {
          success: '#10b981',
          error: '#ef4444',
          warning: '#f59e0b',
        },
        // Borders
        border: {
          subtle: '#2a2a2a',
          medium: '#3a3a3a',
          strong: '#4a4a4a',
        },
      },

      // Font Families
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        body: ['var(--font-jetbrains-mono)', 'monospace'],
        accent: ['var(--font-crimson-pro)', 'serif'],
      },

      // Font Sizes (with line heights)
      fontSize: {
        display: ['3.5rem', { lineHeight: '1.05', fontWeight: '900' }],
        h1: ['2.5rem', { lineHeight: '1.1', fontWeight: '800' }],
        h2: ['1.75rem', { lineHeight: '1.2', fontWeight: '700' }],
        h3: ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.6', fontWeight: '400' }],
        small: ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
        tiny: ['0.6875rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.05em' }],
      },

      // Spacing (8px grid with extreme jumps)
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

      // Box Shadow (dramatic depth)
      boxShadow: {
        sm: '0 2px 8px rgba(0, 0, 0, 0.4)',
        md: '0 4px 16px rgba(0, 0, 0, 0.5)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.6)',
        xl: '0 16px 64px rgba(0, 0, 0, 0.7)',
        // Glow effects
        'glow-accent': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-accent-strong': '0 0 40px rgba(59, 130, 246, 0.5)',
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
        dramatic: '800ms',
      },

      // Keyframe Animations
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
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
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
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
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },

      // Background Images
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #0a0a0a 0%, #1e1e1e 50%, #141414 100%)',
        'gradient-card': 'linear-gradient(180deg, rgba(10, 10, 10, 0) 0%, rgba(10, 10, 10, 0.8) 100%)',
        'gradient-accent': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        'noise': "url('/noise.png')",
      },
    },
  },
  plugins: [],
}

export default config
