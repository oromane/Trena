'use client';

/**
 * Perlo, la mascotte de Trena : une goutte de sueur sportive.
 *
 * La goutte, c'est l'effort ; le bandeau et les chaussures, la course ; la
 * montre, la synchro Garmin. Dessin 100 % SVG (net à toute taille, ~2 Ko),
 * couleurs de la marque, sans orange ni ambre (réservés aux alertes).
 *
 * Humeurs :
 *  - idle     : sourire, cligne des yeux (avatar du conseiller)
 *  - thinking : regarde en l'air, bulle de réflexion (génération en cours)
 *  - happy    : yeux plissés, grand sourire (réponse prête, succès)
 *  - wave     : salue de la main (accueil, état vide)
 *
 * Les animations respectent prefers-reduced-motion.
 */
import { useId } from 'react';

export type MascotMood = 'idle' | 'thinking' | 'happy' | 'wave';

const BODY = 'M60 10 C60 10 20 50 20 84 A40 40 0 0 0 100 84 C100 50 60 10 60 10 Z';
const INK = '#14322B';

export default function Mascot({
  mood = 'idle',
  size = 96,
  animated = true,
  className = '',
  title = 'Perlo, la mascotte de Trena',
  crop = 'full',
}: {
  crop?: 'full' | 'head';
  mood?: MascotMood;
  size?: number;
  animated?: boolean;
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const grad = `perlo-g-${uid}`;
  const clip = `perlo-c-${uid}`;
  const a = animated ? 'perlo-anim' : '';
  // « head » : cadrage visage pour les avatars ronds (le corps reste dessiné).
  const [vb, ratio] = crop === 'head' ? ['10 36 100 100', 1] : ['0 0 120 140', 140 / 120];

  return (
    <svg
      width={size}
      height={size * ratio}
      viewBox={vb}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      className={`${a} perlo-${mood} ${className}`}
    >
      <defs>
        <linearGradient id={grad} x1="40" y1="10" x2="85" y2="124" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4CC38A" />
          <stop offset="1" stopColor="#23764A" />
        </linearGradient>
        <clipPath id={clip}>
          <path d={BODY} />
        </clipPath>
      </defs>

      {/* Ombre au sol */}
      <ellipse cx="60" cy="134" rx="30" ry="4" fill="#000" opacity="0.18" />

      <g className="perlo-body">
        {/* Jambes + chaussures de running */}
        <path d="M48 120 L46 129" stroke="#1B5E3A" strokeWidth="6" strokeLinecap="round" />
        <path d="M72 120 L74 129" stroke="#1B5E3A" strokeWidth="6" strokeLinecap="round" />
        <path d="M36 131 C36 126 41 125 47 126 L53 128 C55 129 55 133 52 133 L39 133 C37 133 36 132 36 131 Z" fill="#fff" />
        <path d="M36.5 132 L54 132" stroke="#2E8B57" strokeWidth="2" strokeLinecap="round" />
        <path d="M84 131 C84 126 79 125 73 126 L67 128 C65 129 65 133 68 133 L81 133 C83 133 84 132 84 131 Z" fill="#fff" />
        <path d="M83.5 132 L66 132" stroke="#2E8B57" strokeWidth="2" strokeLinecap="round" />

        {/* Bras gauche + montre */}
        <path d="M23 92 C15 96 12 102 13 108" stroke="#23764A" strokeWidth="7" strokeLinecap="round" />
        <rect x="8" y="100" width="10" height="8" rx="2.5" fill={INK} transform="rotate(-12 13 104)" />
        <rect x="10" y="101.8" width="6" height="4.4" rx="1.2" fill="#4CC38A" transform="rotate(-12 13 104)" />

        {/* Bras droit (lève la main pour saluer) */}
        <g className="perlo-arm">
          {mood === 'wave' ? (
            <>
              <path d="M97 88 C106 82 109 74 108 66" stroke="#23764A" strokeWidth="7" strokeLinecap="round" />
              <circle cx="108" cy="63" r="5.5" fill="#4CC38A" />
            </>
          ) : (
            <path d="M97 92 C105 96 108 102 107 108" stroke="#23764A" strokeWidth="7" strokeLinecap="round" />
          )}
        </g>

        {/* Corps */}
        <path d={BODY} fill={`url(#${grad})`} />
        {/* Reflet */}
        <path d="M44 40 C38 48 33 58 32 66" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.35" />

        {/* Bandeau (épouse la goutte) + nœud */}
        <g clipPath={`url(#${clip})`}>
          <rect x="10" y="54" width="100" height="11" fill="#fff" />
          <rect x="10" y="58.5" width="100" height="2" fill="#2E8B57" opacity="0.55" />
        </g>
        <path d="M95 57 L106 52 L104 60 Z" fill="#fff" />
        <path d="M95 61 L107 64 L101 69 Z" fill="#E8F2EC" />

        {/* Visage */}
        <g className="perlo-face">
          {mood === 'happy' ? (
            <>
              <path d="M40 82 Q47 74 54 82" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
              <path d="M66 82 Q73 74 80 82" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
            </>
          ) : (
            <g className="perlo-eyes">
              <ellipse cx="47" cy="81" rx="7.5" ry="9" fill="#fff" />
              <ellipse cx="73" cy="81" rx="7.5" ry="9" fill="#fff" />
              {mood === 'thinking' ? (
                <>
                  <circle cx="50" cy="77" r="4.2" fill={INK} />
                  <circle cx="76" cy="77" r="4.2" fill={INK} />
                  <circle cx="51.5" cy="75.5" r="1.4" fill="#fff" />
                  <circle cx="77.5" cy="75.5" r="1.4" fill="#fff" />
                </>
              ) : (
                <>
                  <circle cx="48" cy="83" r="4.2" fill={INK} />
                  <circle cx="74" cy="83" r="4.2" fill={INK} />
                  <circle cx="49.5" cy="81.5" r="1.4" fill="#fff" />
                  <circle cx="75.5" cy="81.5" r="1.4" fill="#fff" />
                </>
              )}
            </g>
          )}

          {/* Joues */}
          <ellipse cx="37" cy="94" rx="5" ry="3" fill="#FF9A8B" opacity="0.6" />
          <ellipse cx="83" cy="94" rx="5" ry="3" fill="#FF9A8B" opacity="0.6" />

          {/* Bouche */}
          {mood === 'thinking' ? (
            <ellipse cx="61" cy="99" rx="3.2" ry="3.8" fill={INK} />
          ) : mood === 'happy' ? (
            <path d="M50 94 Q60 108 70 94 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          ) : (
            <path d="M52 95 Q60 103 68 95" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          )}
        </g>
      </g>

      {/* Bulle de réflexion */}
      {mood === 'thinking' && (
        <g className="perlo-dots" fill="#9ED9B8">
          <circle cx="94" cy="30" r="3" opacity="0.7" />
          <circle cx="103" cy="20" r="4" opacity="0.85" />
          <circle cx="113" cy="8" r="5" />
        </g>
      )}

      <style>{`
        .perlo-anim .perlo-body { animation: perlo-bob 2.6s ease-in-out infinite; transform-origin: 60px 130px; }
        .perlo-anim .perlo-eyes { animation: perlo-blink 4.5s infinite; transform-origin: 60px 81px; }
        .perlo-anim.perlo-wave .perlo-arm { animation: perlo-wave 1.2s ease-in-out infinite; transform-origin: 97px 90px; }
        .perlo-anim.perlo-thinking .perlo-dots circle { animation: perlo-dot 1.2s ease-in-out infinite; }
        .perlo-anim.perlo-thinking .perlo-dots circle:nth-child(2) { animation-delay: .2s; }
        .perlo-anim.perlo-thinking .perlo-dots circle:nth-child(3) { animation-delay: .4s; }
        @keyframes perlo-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
        @keyframes perlo-blink { 0%,92%,100% { transform: scaleY(1) } 95% { transform: scaleY(.1) } }
        @keyframes perlo-wave { 0%,100% { transform: rotate(0) } 50% { transform: rotate(-14deg) } }
        @keyframes perlo-dot { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          .perlo-anim *, .perlo-anim { animation: none !important; }
        }
      `}</style>
    </svg>
  );
}

/** Visage cadré pour un avatar rond (bouton flottant, bulles de réponse). */
export function MascotAvatar({
  size = 32,
  mood = 'idle',
  className = '',
}: {
  size?: number;
  mood?: MascotMood;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DCEFE4] ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Mascot mood={mood} size={size} crop="head" animated={mood === 'thinking'} title="" />
    </span>
  );
}
