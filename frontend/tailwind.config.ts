import type { Config } from 'tailwindcss'

export default {
  content: [
    './app.vue',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'hsl(var(--canvas) / <alpha-value>)',
        surface: {
          DEFAULT: 'hsl(var(--surface) / <alpha-value>)',
          raised: 'hsl(var(--surface-raised) / <alpha-value>)',
          muted: 'hsl(var(--surface-muted) / <alpha-value>)',
        },
        foreground: {
          DEFAULT: 'hsl(var(--foreground) / <alpha-value>)',
          muted: 'hsl(var(--foreground-muted) / <alpha-value>)',
          subtle: 'hsl(var(--foreground-subtle) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'hsl(var(--border) / <alpha-value>)',
          strong: 'hsl(var(--border-strong) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          hover: 'hsl(var(--primary-hover) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          surface: 'hsl(var(--success-surface) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger) / <alpha-value>)',
          surface: 'hsl(var(--danger-surface) / <alpha-value>)',
          foreground: 'hsl(var(--danger-foreground) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          surface: 'hsl(var(--warning-surface) / <alpha-value>)',
        },
        neutral: {
          DEFAULT: 'hsl(var(--neutral) / <alpha-value>)',
          surface: 'hsl(var(--neutral-surface) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'hsl(var(--info) / <alpha-value>)',
          surface: 'hsl(var(--info-surface) / <alpha-value>)',
        },
        auth: {
          bg: 'hsl(var(--auth-bg) / <alpha-value>)',
          foreground: 'hsl(var(--auth-foreground) / <alpha-value>)',
          muted: 'hsl(var(--auth-muted) / <alpha-value>)',
          accent: 'hsl(var(--auth-accent) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-interface)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        panel: 'var(--radius-panel)',
      },
      boxShadow: {
        card: '0 1px 2px hsl(var(--shadow-card))',
        popover: '0 16px 40px hsl(var(--shadow-popover))',
      },
      transitionDuration: {
        interface: '180ms',
      },
    },
  },
  plugins: [],
} satisfies Config
