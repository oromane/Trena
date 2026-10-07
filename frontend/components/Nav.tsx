import Link from 'next/link';
import { signOut } from '@/app/actions';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import Advisor from '@/components/advisor/Advisor';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/strength', label: 'Musculation' },
  { href: '/autres', label: 'Autres' },
  { href: '/guide', label: 'Guide' },
  { href: '/profile', label: 'Profil' },
];

export default function Nav() {
  return (
    <>
    <nav
      className="sticky top-0 z-40 border-b border-white/5 bg-ats-bg/80 backdrop-blur-xl"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex max-w-6xl 2xl:max-w-[88rem] items-center gap-8 px-4 py-3.5 text-sm sm:px-6">
        <Link href="/dashboard" className="shrink-0">
          <Logo />
        </Link>
        {/* Liens desktop : sur mobile, la navigation passe par la barre basse */}
        <div className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-ats-muted transition-colors hover:text-ats-text"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <form action={signOut}>
            <button className="text-xs text-ats-gray transition-colors hover:text-ats-muted">
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </nav>
    {/* Hors du <nav> : son backdrop-blur piégerait le positionnement fixed.
        Nav n'est rendu que sur les pages authentifiées : le conseiller aussi. */}
    <Advisor />
    </>
  );
}
