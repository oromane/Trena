import type { Metadata } from 'next';
import { IBM_Plex_Mono, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Adaptive Training System',
  description:
    "Le système intelligent qui maximise les chances d'atteindre un objectif sportif.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${plexMono.variable}`}>
      <body className="min-h-screen bg-ats-bg font-sans text-ats-text antialiased">
        {children}
      </body>
    </html>
  );
}
