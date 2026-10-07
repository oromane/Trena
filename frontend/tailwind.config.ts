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
          // Texte coloré lisible (contraste AA) : à utiliser pour text-*,
          // les accents simples restant réservés aux fonds et bordures.
          'green-fg': v('ats-green-fg'),
          'blue-fg': v('ats-blue-fg'),
          'orange-fg': v('ats-orange-fg'),
          'red-fg': v('ats-red-fg'),
          'violet-fg': v('ats-violet-fg'),
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
