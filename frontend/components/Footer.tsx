import Link from 'next/link';
import { Github } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/5 bg-ats-bg2/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-xs leading-relaxed text-ats-muted">
            Le système intelligent qui maximise tes chances d&apos;atteindre ton
            objectif sportif. Entraînement adaptatif piloté par tes données
            physiologiques.
          </p>
        </div>
        <nav className="flex gap-10 text-sm">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ats-gray">
              Application
            </p>
            <Link href="/dashboard" className="block text-ats-muted hover:text-ats-text">
              Cockpit
            </Link>
            <Link href="/objectives" className="block text-ats-muted hover:text-ats-text">
              Objectifs
            </Link>
            <Link href="/metrics" className="block text-ats-muted hover:text-ats-text">
              Métriques
            </Link>
            <Link href="/profile" className="block text-ats-muted hover:text-ats-text">
              Profil
            </Link>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ats-gray">
              Moteur
            </p>
            <p className="text-ats-muted">Modèle de Banister</p>
            <p className="text-ats-muted">Analyse HRV quotidienne</p>
            <p className="text-ats-muted">Sync Garmin &amp; Google Calendar</p>
          </div>
        </nav>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-4 text-[11px] text-ats-gray sm:flex-row sm:items-center sm:justify-between">
          <p>
            Trena · v1.0 · Tes données restent les tiennes : exportables et
            supprimables depuis ton profil.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://www.buymeacoffee.com/oromane"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Buy Me a Coffee"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                alt="Buy Me a Coffee"
                className="h-[40px] w-[145px]"
              />
            </a>
            <p className="flex items-center gap-1.5">
              Créé par Romane ·
              <a
                href="https://github.com/oromane"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-ats-muted transition-colors hover:text-ats-text"
              >
                <Github className="h-3.5 w-3.5" /> github.com/oromane
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
