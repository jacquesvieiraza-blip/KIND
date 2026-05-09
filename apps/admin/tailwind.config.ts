import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 500: '#0066FF', 600: '#0052cc', 900: '#001f4d' },
      },
    },
  },
  plugins: [],
}

export default config
