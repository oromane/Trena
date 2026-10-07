import type { Metadata } from 'next';
import Link from 'next/link';
import GuideNav from '@/components/guide/GuideNav';

export const metadata: Metadata = {
  title: 'Guide — Comprendre son entraînement | Trena',
  description:
    "Guide fondé sur la littérature scientifique : musculation, endurance, nutrition, cycle menstruel. Comprendre pourquoi on s'entraîne comme on s'entraîne.",
};

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <GuideNav />
      <main>{children}</main>

      <footer className="border-t border-white/5 bg-ats-bg2/40">
        <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6 xl:max-w-[76rem]">
          <div className="rounded-2xl border border-ats-orange/20 bg-ats-orange/[0.06] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ats-orange-fg">
              Avertissement médical
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ats-muted">
              Ce guide est un contenu pédagogique fondé sur la littérature
              scientifique. Il ne constitue{' '}
              <strong className="font-semibold text-ats-text">
                ni un diagnostic, ni une prescription, ni un avis médical
                individualisé
              </strong>{' '}
              et ne remplace pas la consultation d&apos;un professionnel de
              santé. Demande un avis médical avant de commencer, en particulier
              en cas de pathologie cardiovasculaire, d&apos;hypertension non
              contrôlée, de blessure, d&apos;ostéoporose, de chirurgie récente ou
              après une longue période sans activité.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-ats-gray">
            <p>
              Chaque affirmation renvoie à sa source primaire (auteurs, année,
              revue, DOI/PMID).
            </p>
            <Link href="/dashboard" className="hover:text-ats-muted">
              Ouvrir l&apos;application Trena →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
