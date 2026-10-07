/**
 * Activité partagée par les amis : volume de la semaine, dernières séances
 * (titre d'analyse uniquement) et, s'ils l'ont choisi, niveau de forme.
 * Jamais de valeur physiologique brute : le moteur ne les transmet pas.
 */
import Link from 'next/link';
import { Lock } from 'lucide-react';
import type { FriendFeedItem } from '@/lib/engine';
import {
  ACCENT,
  disciplineIcon,
  fmtDistance,
  fmtDuration,
  relativeDay,
} from '@/components/home/shared';

const READINESS: Record<string, { label: string; dot: string }> = {
  NORMAL: { label: 'En forme', dot: 'bg-ats-green' },
  CAUTION: { label: 'Vigilance', dot: 'bg-ats-orange' },
  REDUCE: { label: 'Récupération', dot: 'bg-ats-red' },
};

function Initial({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ats-card2 text-sm font-semibold text-ats-text">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function FriendBlock({
  friend,
  today,
  compact = false,
}: {
  friend: FriendFeedItem;
  today: string;
  compact?: boolean;
}) {
  const r = friend.readiness ? READINESS[friend.readiness] : null;
  const recent = compact ? friend.recent.slice(0, 1) : friend.recent;
  return (
    <div className="space-y-3 p-5">
      <div className="flex items-center gap-3">
        <Initial name={friend.name} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ats-text">{friend.name}</p>
          {friend.week ? (
            <p className="text-[11px] text-ats-muted">
              {/* Une valeur ne doit jamais être coupée (« 2 h / 35 ») */}
              {[
                `Cette semaine : ${friend.week.sessions} séance${friend.week.sessions > 1 ? 's' : ''}`,
                friend.week.minutes > 0 ? fmtDuration(friend.week.minutes) : null,
                friend.week.distance_m > 0 ? fmtDistance(friend.week.distance_m) : null,
              ]
                .filter(Boolean)
                .map((v, i) => (
                  <span key={i}>
                    {i > 0 && ' · '}
                    <span className="whitespace-nowrap">{v}</span>
                  </span>
                ))}
            </p>
          ) : (
            <p className="flex items-center gap-1 text-[11px] text-ats-gray">
              <Lock className="h-3 w-3" /> Ne partage pas ses séances
            </p>
          )}
        </div>
        {r && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-medium text-ats-text">
            <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />
            {r.label}
          </span>
        )}
      </div>
      {recent.length > 0 && (
        <ul className="space-y-2 pl-12">
          {recent.map((a, i) => {
            const Icon = disciplineIcon(a.icon);
            const acc = ACCENT[a.accent];
            return (
              <li key={i} className="flex items-start gap-2.5">
                <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${acc.text}`} />
                <div className="min-w-0 text-xs">
                  <p className="truncate text-ats-text">
                    {a.title || a.discipline_label}
                    <span className="ml-2 text-[11px] text-ats-gray">{relativeDay(a.date, today)}</span>
                  </p>
                  <p className="metric text-[11px] text-ats-muted">
                    {[a.duration_minutes ? fmtDuration(a.duration_minutes) : null, a.distance_m ? fmtDistance(a.distance_m) : null]
                      .filter(Boolean)
                      .join(' · ')}
                    <span className="ml-2 font-sans text-ats-gray">{a.headline}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {friend.shares_activities && friend.recent.length === 0 && (
        <p className="pl-12 text-[11px] text-ats-gray">Aucune séance ces 14 derniers jours.</p>
      )}
    </div>
  );
}

/** Carte compacte de l'accueil : dernière séance de chaque ami. */
export function FriendsCard({ friends, today }: { friends: FriendFeedItem[]; today: string }) {
  if (friends.length === 0) return null;
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
          Tes amis
        </h2>
        <Link href="/amis" className="text-[11px] text-ats-muted hover:text-ats-text">
          Tout voir
        </Link>
      </div>
      <div className="card divide-y divide-white/5 overflow-hidden">
        {friends.map((f) => (
          <FriendBlock key={f.friendship_id} friend={f} today={today} compact />
        ))}
      </div>
    </section>
  );
}
