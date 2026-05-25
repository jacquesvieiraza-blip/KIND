import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eff6ff', 100: '#dbeafe', 500: '#0066FF', 600: '#0052cc', 700: '#003d99', 900: '#001f4d' },
        // Design system semantic tokens (maps to CSS vars for light/dark)
        surface:  'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        'surface-overlay': 'rgb(var(--surface-overlay) / <alpha-value>)',
        border:   'rgb(var(--border) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        text:     'rgb(var(--text) / <alpha-value>)',
        'text-muted':  'rgb(var(--text-muted) / <alpha-value>)',
        'text-faint':  'rgb(var(--text-faint) / <alpha-value>)',
      },
      spacing: {
        // Design system spacing scale
        'ds-1': '4px',
        'ds-2': '8px',
        'ds-3': '12px',
        'ds-4': '16px',
        'ds-5': '20px',
        'ds-6': '24px',
        'ds-8': '32px',
        'ds-10': '40px',
        'ds-12': '48px',
        'ds-16': '64px',
      },
      borderRadius: {
        'ds-sm':  '8px',
        'ds-md':  '12px',
        'ds-lg':  '16px',
        'ds-xl':  '20px',
        'ds-2xl': '24px',
      },
      boxShadow: {
        'ds-sm': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'ds-md': '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'ds-lg': '0 10px 30px 0 rgb(0 0 0 / 0.10), 0 4px 8px -4px rgb(0 0 0 / 0.08)',
        'ds-brand': '0 4px 16px 0 rgb(0 102 255 / 0.25)',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}

export default config
