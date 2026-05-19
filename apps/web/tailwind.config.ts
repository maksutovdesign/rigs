import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand (nature green — active outdoor feel) ───────────────
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },

        // ── Neutral (warm, not cold gray) ────────────────────────────
        neutral: {
          0:   '#ffffff',
          50:  '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },

        // ── Semantic ─────────────────────────────────────────────────
        success: {
          light: '#f0fdf4',
          DEFAULT: '#16a34a',
          dark: '#15803d',
        },
        warning: {
          light: '#fefce8',
          DEFAULT: '#d97706',
          dark: '#92400e',
        },
        danger: {
          light: '#fff1f2',
          DEFAULT: '#e11d48',
          dark: '#be123c',
        },
        info: {
          light: '#eff6ff',
          DEFAULT: '#2563eb',
          dark: '#1d4ed8',
        },
      },

      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs:   ['0.75rem',  { lineHeight: '1rem' }],
        sm:   ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem',     { lineHeight: '1.5rem' }],
        lg:   ['1.125rem', { lineHeight: '1.75rem' }],
        xl:   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':['1.5rem',   { lineHeight: '2rem' }],
        '3xl':['1.875rem', { lineHeight: '2.25rem' }],
        '4xl':['2.25rem',  { lineHeight: '2.5rem' }],
        '5xl':['3rem',     { lineHeight: '1.1' }],
        '6xl':['3.75rem',  { lineHeight: '1.05' }],
      },

      borderRadius: {
        none: '0',
        sm:   '0.375rem',   // 6px  — small elements (badges, tags)
        DEFAULT: '0.5rem',  // 8px  — buttons, inputs
        md:   '0.75rem',    // 12px — cards inner
        lg:   '1rem',       // 16px — cards, modals
        xl:   '1.25rem',    // 20px — large cards, panels
        '2xl':'1.5rem',     // 24px — hero areas
        '3xl':'2rem',       // 32px — very large
        full: '9999px',     // pills, avatars
      },

      boxShadow: {
        xs:   '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        sm:   '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
        md:   '0 4px 16px -2px rgb(0 0 0 / 0.08), 0 2px 8px -4px rgb(0 0 0 / 0.06)',
        lg:   '0 10px 30px -4px rgb(0 0 0 / 0.10), 0 4px 12px -6px rgb(0 0 0 / 0.08)',
        xl:   '0 20px 50px -8px rgb(0 0 0 / 0.12), 0 8px 20px -8px rgb(0 0 0 / 0.08)',
        '2xl':'0 32px 64px -12px rgb(0 0 0 / 0.14)',
        inner:'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        none: 'none',
        // Brand-tinted glow
        'brand-sm': '0 4px 14px 0 rgb(22 163 74 / 0.20)',
        'brand':    '0 8px 24px 0 rgb(22 163 74 / 0.25)',
      },

      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)',
        'gradient-brand-subtle': 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1c1917 0%, #292524 100%)',
        'gradient-hero': 'linear-gradient(160deg, #0f3d20 0%, #15803d 40%, #16a34a 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },

      transitionDuration: {
        DEFAULT: '200ms',
        fast: '100ms',
        normal: '200ms',
        slow: '400ms',
      },

      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
      },

      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },

      animation: {
        'fade-in':   'fade-in 0.2s ease-out',
        'slide-up':  'slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down':'slide-down 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in':  'scale-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        shimmer:     'shimmer 1.8s linear infinite',
      },

      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
      },

      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
        '3xl': '1920px',
      },
    },
  },
  plugins: [],
}

export default config
