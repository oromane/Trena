import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ats: {
          bg: '#050816',
          bg2: '#0B1023',
          card: '#12192C',
          card2: '#1A2238',
          text: '#F8FAFC',
          muted: '#94A3B8',
          green: '#00E676',
          greendark: '#00C853',
          blue: '#3B82F6',
          orange: '#F59E0B',
          red: '#EF4444',
          violet: '#8B5CF6',
          gray: '#334155',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
