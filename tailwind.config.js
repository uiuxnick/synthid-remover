/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        onyx: '#0A0A0A',
        pitch: '#000000',
        slateText: '#8F8F8F',
        starkWhite: '#FFFFFF',
        h: {
          bg: 'var(--h-bg)',
          surface: 'var(--h-surface)',
          surface2: 'var(--h-surface2)',
          ink: 'var(--h-ink)',
          muted: 'var(--h-muted)',
          accent: 'var(--h-accent)',
          'accent-ink': 'var(--h-accent-ink)',
          frag: 'var(--h-frag)',
          line: 'var(--h-frag-line)',
          danger: 'var(--h-danger)',
          ok: 'var(--h-ok)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        scrub: 'scrub 5.5s ease-in-out infinite',
        pingSlow: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        pulseGlow: 'pulseGlow 3s ease-in-out infinite',
      },
      keyframes: {
        scrub: {
          '0%': { width: '8%' },
          '50%': { width: '92%' },
          '100%': { width: '8%' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.9' },
        },
      },
    },
  },
  plugins: [],
};
