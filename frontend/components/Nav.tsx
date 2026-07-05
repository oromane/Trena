import Link from 'next/link';
import { signOut } from '@/app/actions';
import Logo from '@/components/Logo';

const LINKS = [
  { href: '/dashboard', label: 'Cockpit' },
  { href: '/objectives', label: 'Objectifs' },
  { href: '/metrics', label: 'Métriques' },
];

export default function Nav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-white/5 bg-ats-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-3.5 text-sm">
        <Link href="/dashboard" className="shrink-0">
          <Logo />
        </Link>
        <div className="flex items-center gap-6">
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
        <form action={signOut} className="ml-auto">
          <button className="text-xs text-ats-gray transition-colors hover:text-ats-muted">
            Déconnexion
          </button>
        </form>
      </div>
    </nav>
  );
}
