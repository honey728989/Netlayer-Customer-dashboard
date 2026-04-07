/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00d4ff',
          dim: '#0066cc',
          glow: 'rgba(0,212,255,0.15)',
        },
        surface: {
          DEFAULT: '#111318',
          2: '#181b22',
          3: '#1e2330',
        },
        base: '#0a0c10',
        border: {
          DEFAULT: '#1e2330',
          2: '#252b3a',
        },
        status: {
          online: '#00e676',
          offline: '#ff4d4d',
          degraded: '#ffb300',
          info: '#9c7bff',
        },
        muted: '#6b7a99',
        dim: '#3d4860',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
