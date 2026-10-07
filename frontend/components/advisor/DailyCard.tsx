/**
 * « Le point de Perlo » : l'analyse du jour, affichée sans attente.
 *
 * Rédigée à 6h30 par l'IA locale (n8n -> /advisor/daily/run). Tant qu'elle
 * n'existe pas, le moteur fournit une synthèse chiffrée équivalente.
 */
import { MascotAvatar } from '@/components/brand/Mascot';
import AskButton from './AskButton';
import RichText from './RichText';
import type { AdvisorDaily } from '@/lib/engine';

export default function DailyCard({ daily }: { daily: AdvisorDaily }) {
  return (
    <section className="card flex gap-4 p-5">
      <MascotAvatar size={44} className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h2 className="text-sm font-semibold text-ats-text">Le point de Perlo</h2>
          <span className="text-[10px] uppercase tracking-wider text-ats-gray">
            {daily.source === 'llm' ? 'Analyse du jour' : 'Synthèse du jour'}
          </span>
        </div>
        <div className="space-y-1 text-sm leading-relaxed text-ats-muted">
          <RichText text={daily.text} />
        </div>
        <AskButton
          question="Que puis-je faire aujourd'hui pour bien récupérer ?"
          label="Poser une question à Perlo"
        />
      </div>
    </section>
  );
}
