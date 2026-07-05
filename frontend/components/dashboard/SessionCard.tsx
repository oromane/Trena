/**
 * Séance recommandée — LA carte de décision.
 * Répond à : quoi, pourquoi, pourquoi aujourd'hui, quel gain, quel risque si ignorée.
 */
import { ArrowRight, Flame, Timer } from 'lucide-react';
import type { DashboardSummary } from '@/lib/engine';
import { runDailyAdjust } from '@/app/actions';

const TYPE_META: Record<string, { label: string; color: string; goal: string }> = {
  INTERVAL: {
    label: 'Fractionné',
    color: '#F59E0B',
    goal: 'Développer la VMA et la capacité anaérobie.',
  },
  TEMPO: {
    label: 'Tempo / Seuil',
    color: '#8B5CF6',
    goal: 'Repousser le seuil lactique — tenir une allure élevée plus longtemps.',
  },
  ENDURANCE: {
    label: 'Endurance fondamentale',
    color: '#3B82F6',
    goal: 'Construire la base aérobie et la densité mitochondriale.',
  },
  RECOVERY: {
    label: 'Récupération active',
    color: '#00E676',
    goal: 'Accélérer la récupération en stimulant la circulation sans charge.',
  },
};

export default function SessionCard({
  session,
  readiness,
  gainPct,
}: {
  session: DashboardSummary['today_session'];
  readiness: DashboardSummary['readiness'];
  gainPct: number;
}) {
  if (!session) {
    return (
      <div className="card flex h-full flex-col justify-center p-8 text-center">
        <p className="text-lg font-semibold text-ats-muted">Jour de repos</p>
        <p className="mx-auto mt-2 max-w-xs text-sm text-ats-muted">
          Aucune séance planifiée — la récupération fait partie du plan.
          C&apos;est aujourd&apos;hui que l&apos;adaptation se produit.
        </p>
      </div>
    );
  }

  const meta = TYPE_META[session.session_type] ?? {
    label: session.session_type,
    color: '#94A3B8',
    goal: '',
  };
  const modified = session.status === 'MODIFIED';

  const why =
    readiness.level === 'REDUCE'
      ? 'Ton HRV est effondré avec une dette de sommeil : maintenir l’intensité prévue aurait dégradé ta récupération pour 3-4 jours. Cette séance protège la trajectoire.'
      : readiness.level === 'CAUTION'
        ? 'HRV sous ta norme : l’intensité est plafonnée mais le volume conservé — le stimulus aérobie reste acquis sans creuser la fatigue.'
        : 'Tes signaux physiologiques sont dans ta norme : ton corps peut absorber le stimulus prévu par le bloc en cours.';

  const ignored =
    readiness.level === 'NORMAL'
      ? 'Séance manquée = stimulus perdu : la progression du bloc est décalée et ton adhérence — premier facteur de réussite — baisse.'
      : 'Même réduite, cette séance entretient la base aérobie. L’ignorer ralentit le retour à ta norme.';

  return (
    <div className="card relative flex h-full flex-col overflow-hidden p-6">
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${meta.color}, transparent)` }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-ats-muted">
          Séance recommandée
        </span>
        {modified && (
          <span className="rounded-full bg-ats-blue/10 px-2.5 py-1 text-[10px] font-semibold text-ats-blue">
            Adaptée par le système ce matin
          </span>
        )}
      </div>

      <h3 className="mt-3 text-2xl font-bold" style={{ color: meta.color }}>
        {meta.label}
      </h3>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-ats-text/90">
          <Timer className="h-4 w-4 text-ats-muted" />
          <span className="metric font-medium">{session.duration_planned_minutes} min</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm text-ats-text/90">
          <Flame className="h-4 w-4 text-ats-muted" />
          <span className="metric font-medium">TRIMP {session.intensity_target_trimp}</span>
        </span>
      </div>

      <dl className="mt-5 space-y-3 text-[13px] leading-relaxed">
        <div>
          <dt className="font-semibold text-ats-text/80">Objectif physiologique</dt>
          <dd className="text-ats-muted">{meta.goal}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ats-text/80">Pourquoi aujourd&apos;hui ?</dt>
          <dd className="text-ats-muted">{why}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ats-text/80">Si tu l&apos;ignores</dt>
          <dd className="text-ats-muted">{ignored}</dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between pt-6">
        {gainPct > 0 ? (
          <span className="text-xs text-ats-muted">
            Gain estimé :{' '}
            <span className="metric font-semibold text-ats-green">+{gainPct} pts</span> de
            probabilité
          </span>
        ) : (
          <span />
        )}
        <form action={runDailyAdjust}>
          <button className="group inline-flex items-center gap-2 rounded-xl bg-ats-green px-5 py-2.5 text-sm font-semibold text-ats-bg transition-transform hover:scale-[1.02] active:scale-[0.98]">
            Réévaluer maintenant
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
