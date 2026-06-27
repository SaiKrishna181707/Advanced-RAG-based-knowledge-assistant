/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Dark theme palette — from your UI prompt
        bg: {
          primary: '#0a0a0f',      // deepest background
          secondary: '#111118',    // sidebar
          card: '#16161f',         // cards
          hover: '#1e1e2a',        // hover state
          border: '#2a2a3a',       // borders
        },
        accent: {
          purple: '#7c3aed',
          purpleLight: '#a78bfa',
          purpleDim: '#7c3aed33',
        },
        text: {
          primary: '#f8f8ff',
          secondary: '#a0a0b8',
          muted: '#5a5a72',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        card: '14px',
        input: '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
      }
    },
  },
  plugins: [],
}
