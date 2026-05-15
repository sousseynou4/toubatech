import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // TOUBA TECH brand palette
        ink: {
          DEFAULT: '#003366', // Deep blue — trust, professionalism
          50: '#E6EEF5',
          100: '#C2D4E6',
          200: '#94B1D0',
          300: '#5C84B0',
          400: '#2D5A8E',
          500: '#003366',
          600: '#002A55',
          700: '#001F3F',
          800: '#00152B',
          900: '#000A15',
        },
        emerald: {
          DEFAULT: '#339966', // Eco green — circular economy
          50: '#E8F5EE',
          100: '#C5E5D2',
          200: '#94CFAB',
          300: '#5FB785',
          400: '#339966',
          500: '#2A8055',
          600: '#1F6342',
          700: '#15462E',
          800: '#0B2A1C',
          900: '#03100A',
        },
        bone: '#FAFAF7', // Off-white, warmer than pure white
        mist: '#F0F0F0',
        graphite: '#1A1A1A',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Editorial scale — generous for headlines
        'display': ['clamp(2.75rem, 6vw, 5.25rem)', { lineHeight: '0.95', letterSpacing: '-0.035em', fontWeight: '500' }],
        'hero': ['clamp(2rem, 4.5vw, 3.75rem)', { lineHeight: '1.02', letterSpacing: '-0.03em', fontWeight: '500' }],
        'h1': ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '500' }],
        'h2': ['clamp(1.375rem, 2.2vw, 1.75rem)', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '500' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(0, 51, 102, 0.04), 0 4px 16px rgba(0, 51, 102, 0.06)',
        'lift': '0 4px 12px rgba(0, 51, 102, 0.06), 0 16px 48px rgba(0, 51, 102, 0.08)',
        'inset-line': 'inset 0 0 0 1px rgba(0, 51, 102, 0.08)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.5s ease-out both',
        'shimmer': 'shimmer 2.4s linear infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
