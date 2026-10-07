import Link from 'next/link';
import { Bike, HeartPulse, Waves, Stethoscope, ChevronRight } from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const DISCIPLINES = [
  {
    slug: 'velo',
    label: 'Vélo',
    icon: Bike,
    description: 'Sorties route, home-trainer, endurance sans coût sur la force.',
    ready: true,
  },
  {
    slug: 'triathlon',
    label: 'Triathlon',
    icon: HeartPulse,
    description: 'Enchaînements vélo-course pour travailler la transition.',
    ready: true,
  },
  {
    slug: 'natation',
    label: 'Natation',
    icon: Waves,
    description: 'Séances piscine et eau libre, impact articulaire quasi nul.',
    ready: true,
  },
  {
    slug: 'kine',
    label: 'Kiné',
    icon: Stethoscope,
    description: 'Suivi de rééducation — migration base de données nécessaire.',
    ready: false,
  },
];

export const metadata = {
  title: 'Autres disciplines - Trena',
};

export default function AutresPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl xl:max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Autres disciplines</h1>
          <p className="mt-1 text-ats-muted">
            Enregistre tes séances : elles alimentent tes totaux sur le
            dashboard, toutes disciplines confondues.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {DISCIPLINES.map(({ slug, label, icon: Icon, description, ready }) => (
            <Link
              key={slug}
              href={`/autres/${slug}`}
              className={`card-2 group flex items-center gap-4 p-5 transition-colors hover:bg-ats-card ${
                ready ? '' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  ready ? 'bg-ats-violet/10' : 'bg-ats-gray/10'
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${ready ? 'text-ats-violet-fg' : 'text-ats-gray'}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">{label}</h3>
                <p className="text-sm text-ats-muted">{description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-ats-gray transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
