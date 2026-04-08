/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../apps/noc/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: ['class', '[class~="light"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand)',
          dim: '#0066cc',
          glow: 'rgba(0,212,255,0.15)',
        },
        surface: {
          DEFAULT: 'var(--bg-surface)',
          2: 'var(--bg-surface-2)',
          3: 'var(--bg-surface-3)',
        },
        base: 'var(--bg-base)',
        border: {
          DEFAULT: 'var(--border)',
          2: 'var(--border-2)',
        },
        status: {
          online:   'var(--status-online)',
          offline:  'var(--status-offline)',
          degraded: 'var(--status-degraded)',
          info:     'var(--status-info)',
        },
        muted: 'var(--text-muted)',
        dim:   'var(--text-dim)',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['IBM Plex Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      boxShadow: {
        card:     'var(--card-shadow)',
        elevated: 'var(--elevated-shadow)',
        dropdown: 'var(--dropdown-shadow)',
      },
      animation: {
        'pulse-slow':    'pulse 2.5s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':       'fadeIn 0.25s ease-out',
        'slide-in-right':'slideInRight 0.25s ease-out',
        'slide-up':      'slideUp 0.22s ease-out',
        'scale-in':      'scaleIn 0.15s ease-out',
        'shimmer':       'shimmer 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0', transform: 'translateY(5px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        slideUp:      { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:      { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        shimmer:      { '0%': { backgroundPosition: '-600px 0' }, '100%': { backgroundPosition: '600px 0' } },
      },
      borderRadius: {
        xl:   '0.75rem',
        '2xl':'1rem',
      },
    },
  },
  plugins: [],
}
