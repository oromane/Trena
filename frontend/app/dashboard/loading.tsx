import Nav from '@/components/Nav';

/** Squelette affiché pendant le chargement du cockpit (réponse du moteur). */
export default function DashboardLoading() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="card animate-pulse" style={{ height: 130 }} />
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="card animate-pulse lg:col-span-3" style={{ height: 300 }} />
          <div className="card animate-pulse lg:col-span-2" style={{ height: 300 }} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse" style={{ height: 120 }} />
          ))}
        </div>
        <div className="card animate-pulse" style={{ height: 280 }} />
      </main>
    </>
  );
}
