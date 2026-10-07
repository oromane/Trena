'use client';

/**
 * Lecteur vidéo à chargement différé.
 *
 * Rien de YouTube n'est chargé tant que l'utilisatrice n'a pas cliqué : on
 * affiche d'abord la vignette, puis on insère l'iframe. Cela évite les
 * traceurs au chargement de page et les kilo-octets inutiles sur mobile.
 * L'iframe pointe sur youtube-nocookie.com.
 */
import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import {
  getVideo,
  VIDEO_FORMAT_LABELS,
  type GuideVideo,
} from '@/components/guide/videos';

const FORMAT_CLS: Record<GuideVideo['format'], string> = {
  lecture: 'border-ats-green/30 bg-ats-green/10 text-ats-green',
  podcast: 'border-ats-violet/30 bg-ats-violet/10 text-ats-violet',
  interview: 'border-ats-blue/30 bg-ats-blue/10 text-ats-blue',
};

export default function VideoEmbed({ id }: { id: string }) {
  const v = getVideo(id);
  const [playing, setPlaying] = useState(false);

  if (!v) {
    return (
      <p className="card p-4 text-sm text-ats-red">
        Vidéo « {id} » introuvable dans le registre.
      </p>
    );
  }

  return (
    <figure className="card overflow-hidden">
      <div className="relative aspect-video w-full bg-ats-bg2">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}?autoplay=1&rel=0`}
            title={v.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 h-full w-full"
            aria-label={`Lire la vidéo : ${v.title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-90"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-ats-bg/80 backdrop-blur-sm transition-transform group-hover:scale-105">
                <Play className="ml-1 h-7 w-7 fill-ats-green text-ats-green" />
              </span>
            </span>
          </button>
        )}
      </div>

      <figcaption className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${FORMAT_CLS[v.format]}`}
          >
            {VIDEO_FORMAT_LABELS[v.format]}
          </span>
          <span className="inline-flex items-center rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium uppercase text-ats-muted">
            {v.language === 'en' ? 'Anglais' : 'Français'}
          </span>
        </div>

        <div>
          <p className="text-sm font-semibold leading-snug text-ats-text">
            {v.title}
          </p>
          <p className="mt-1 text-[11px] text-ats-gray">{v.channel}</p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ats-gray">
            Qui parle
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ats-muted">
            <span className="font-semibold text-ats-text">{v.speaker}</span> —{' '}
            {v.credentials}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ats-gray">
            Pourquoi cette vidéo
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ats-muted">
            {v.why}
          </p>
        </div>

        <a
          href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ats-green hover:underline"
        >
          Ouvrir sur YouTube
          <ExternalLink className="h-3 w-3" />
        </a>
      </figcaption>
    </figure>
  );
}
