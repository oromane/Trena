'use client';

/**
 * Navigation basse mobile : pouce-friendly, masquée sur desktop.
 * Safe-area iOS gérée (encoche / barre home).
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Gauge, HeartPulse, Target, UserRound } from 'lucide-react';

const TABS = [
  { href: '/dashboard', label: 'Cockpit', icon: Gauge },
  { href: '/dashboard#calendrier', label: 'Agenda', icon: CalendarDays },
  { href: '/objectives', label: 'Objectifs', icon: Target },
  { href: '/metrics', label: 'Métriques', icon: HeartPulse },
  { href: '/profile', label: 'Profil', icon: UserRound },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === '/login' || pathname === '/') return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ats-bg/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((t) => {
          const active =
            t.href === '/dashboard#calendrier'
              ? false
              : pathname.startsWith(t.href.split('#')[0]) && t.href !== '/dashboard#calendrier';
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex min-w-[56px] flex-col items-center gap-0.5 px-2 pb-1.5 pt-2 text-[10px] font-medium transition-colors ${
                active ? 'text-ats-green' : 'text-ats-muted'
              }`}
            >
              <Icon className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
