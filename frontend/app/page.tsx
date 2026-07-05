import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6">
      <h1 className="text-4xl font-bold tracking-tight">
        Adaptive Training System
      </h1>
      <p className="mt-4 max-w-2xl text-slate-400">
        Plan d&apos;entraînement individualisé, ajusté chaque matin selon votre
        HRV, votre sommeil et votre charge d&apos;entraînement réelle.
        Synchronisé avec votre calendrier.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold hover:bg-emerald-500"
        >
          Commencer
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-slate-700 px-5 py-2.5 text-sm hover:border-slate-500"
        >
          Tableau de bord
        </Link>
      </div>
    </main>
  );
}
