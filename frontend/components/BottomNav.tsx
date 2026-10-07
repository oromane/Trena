'use client';

/**
 * Navigation basse mobile : pouce-friendly, masquée sur desktop.
 * Safe-area iOS gérée (encoche / barre home).
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Dumbbell, Gauge, LayoutGrid, UserRound, Users } from 'lucide-react';

const TABS = [
  { href: '/dashboard', label: 'Accueil', icon: Gauge },
  { href: '/strength', label: 'Muscu', icon: Dumbbell },
  { href: '/autres', label: 'Autres', icon: LayoutGrid },
  { href: '/amis', label: 'Amis', icon: Users },
  { href: '/guide', label: 'Guide', icon: BookOpen },
  { href: '/profile', label: 'Profil', icon: UserRound },
];

export default function BottomNav() {
  const pathname = usePathname();
  // Le Guide est public et porte sa propre navigation : la barre applicative
  // (dont tous les liens exigent une session) n'y a pas sa place.
  if (pathname === '/login' || pathname === '/' || pathname.startsWith('/guide'))
    return null;

  return (
    <>
      {/*
        Réserve la hauteur de la barre fixe. Placé ici plutôt qu'en padding sur
        le <body> : la barre est masquée sur l'accueil public, la connexion et
        le guide, où un padding global laissait 64 px de vide en bas de page.
      */}
      <div
        aria-hidden
        className="h-16 md:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      />
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ats-bg/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/*
          `flex-1 min-w-0` plutôt qu'une largeur minimale fixe : à 6 onglets,
          un plancher de 56 px imposait 336 px et débordait sur les écrans de
          320 px (iPhone SE, petits Android).
        */}
        <div className="mx-auto flex max-w-md items-stretch">
        {TABS.map((t, i) => {
          // Chaque onglet a désormais sa propre destination : on garde tout de
          // même la logique « premier match » pour éviter qu'un préfixe commun
          // n'allume deux onglets à la fois.
          const firstMatchIndex = TABS.findIndex((x) => pathname.startsWith(x.href));
          const active = firstMatchIndex === i;
          const Icon = t.icon;
          return (
            <Link
              key={t.label}
              href={t.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-medium transition-colors ${
                active ? 'text-ats-green-fg' : 'text-ats-muted'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="w-full truncate text-center">{t.label}</span>
            </Link>
          );
        })}
        </div>
      </nav>
    </>
  );
}
