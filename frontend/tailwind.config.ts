import type { Config } from 'tailwindcss';

// Couleurs pilotées par variables CSS (globals.css) : permet le thème clair.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ats: {
          bg: v('ats-bg'),
          bg2: v('ats-bg2'),
          card: v('ats-card'),
          card2: v('ats-card2'),
          text: v('ats-text'),
          muted: v('ats-muted'),
          green: v('ats-green'),
          greendark: v('ats-greendark'),
          blue: v('ats-blue'),
          orange: v('ats-orange'),
          red: v('ats-red'),
          violet: v('ats-violet'),
          gray: v('ats-gray'),
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
