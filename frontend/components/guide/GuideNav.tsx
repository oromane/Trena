'use client';

/**
 * Navigation du Guide — publique, indépendante de la navigation applicative.
 * Sur mobile : bandeau de puces défilant horizontalement (pas de menu caché).
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoMark } from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { SECTIONS, SOURCES_PAGE } from '@/components/guide/sections';

export default function GuideNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ats-bg/85 backdrop-blur-xl">
      <div
        className="mx-auto max-w-4xl px-4 sm:px-6 xl:max-w-[76rem]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-4 py-3">
          <Link
            href="/guide"
            className="inline-flex shrink-0 items-center gap-2.5 text-ats-text"
          >
            <LogoMark size={26} />
            <span className="text-sm font-bold tracking-[0.16em]">GUIDE</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="hidden rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-ats-muted transition-colors hover:text-ats-text sm:inline-block"
            >
              Ouvrir Trena
            </Link>
          </div>
        </div>

        <nav
          aria-label="Sections du guide"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {SECTIONS.map((s) => {
            const active = pathname === s.href;
            return (
              <Link
                key={s.slug}
                href={s.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-ats-green/40 bg-ats-green/15 text-ats-green-fg'
                    : 'border-white/10 text-ats-muted hover:border-white/20 hover:text-ats-text'
                }`}
              >
                {s.label}
              </Link>
            );
          })}
          <Link
            href={SOURCES_PAGE.href}
            aria-current={pathname === SOURCES_PAGE.href ? 'page' : undefined}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              pathname === SOURCES_PAGE.href
                ? 'border-ats-blue/40 bg-ats-blue/15 text-ats-blue-fg'
                : 'border-white/10 text-ats-gray hover:border-white/20 hover:text-ats-text'
            }`}
          >
            {SOURCES_PAGE.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}
