import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // K.I.N.D soft brand palette — warm peach → lavender
        brand: {
          50:  '#FFF5EE',   // warm peach (page bg start)
          100: '#F5EEFF',   // soft lavender (page bg end)
          200: '#E9D8FF',   // lavender tint (card borders)
          300: '#D4B8FF',   // mid lavender
          400: '#A78BFA',   // soft violet
          500: '#7C3AED',   // primary violet
          600: '#6D28D9',   // hover violet
          700: '#5B21B6',   // deep violet
          800: '#2D1B69',   // dark violet (sidebar alt)
          900: '#1A0F47',   // sidebar dark
        },
      },
      backgroundImage: {
        // Warm peach → lavender — the hero gradient
        'kind-gradient': 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 50%, #F0E8FF 100%)',
        'kind-gradient-vivid': 'linear-gradient(135deg, #FFD4B2 0%, #F9C8FF 50%, #C4B5FD 100%)',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}

export default config
