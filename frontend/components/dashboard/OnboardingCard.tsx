/**
 * Amorçage premier lancement : guide en 3 étapes (objectif → Garmin → plan).
 * Ne s'affiche que tant qu'une étape n'est pas faite.
 */
import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { generatePlan } from '@/app/actions';
import SubmitButton from '@/components/SubmitButton';

function Row({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      {done ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-ats-green" />
      ) : (
        <Circle className="h-5 w-5 shrink-0 text-ats-gray" />
      )}
      <span className={done ? 'text-ats-muted line-through' : 'text-ats-text/90'}>{children}</span>
    </li>
  );
}

export default function OnboardingCard({
  hasObjective,
  garminLinked,
  hasSessions,
}: {
  hasObjective: boolean;
  garminLinked: boolean;
  hasSessions: boolean;
}) {
  if (hasObjective && garminLinked && hasSessions) return null;

  return (
    <div className="card p-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
        Prise en main
      </p>
      <h3 className="mt-1 text-lg font-bold text-ats-text">
        Configure ton cockpit en 3 étapes
      </h3>
      <ol className="mt-4 space-y-3">
        <Row done={hasObjective}>
          Créer un objectif (ta course cible){' '}
          {!hasObjective && (
            <Link href="/objectives" className="ml-1 font-semibold text-ats-green hover:underline">
              Créer →
            </Link>
          )}
        </Row>
        <Row done={garminLinked}>
          Lier ton compte Garmin (HRV, sommeil, activités){' '}
          {!garminLinked && (
            <Link href="/metrics" className="ml-1 font-semibold text-ats-green hover:underline">
              Lier →
            </Link>
          )}
        </Row>
        <Row done={hasSessions}>
          Générer ton plan d&apos;entraînement
          {hasObjective && !hasSessions && (
            <form action={generatePlan} className="ml-2 inline-block align-middle">
              <SubmitButton className="inline-flex items-center gap-1.5 rounded-lg bg-ats-green px-3 py-1 text-xs font-semibold text-ats-bg disabled:opacity-60">
                Générer →
              </SubmitButton>
            </form>
          )}
          {!hasObjective && (
            <span className="ml-1 text-ats-gray">(après l&apos;objectif)</span>
          )}
        </Row>
      </ol>
    </div>
  );
}
