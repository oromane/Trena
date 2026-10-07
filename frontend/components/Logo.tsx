/**
 * Logo Trena : une chaîne de montagnes dont le sommet principal est un
 * battement de cœur. Le terrain (trail, relief) et la physiologie (pouls,
 * HRV) en un seul signe.
 *
 * Tracé principal en currentColor (s'adapte au thème), montagne d'arrière-plan
 * en accent vert. Lisible jusqu'à 16 px.
 */
export function LogoMark({ size = 28, accent = '#2E8B57' }: { size?: number; accent?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Trena"
      role="img"
    >
      {/* Montagne d'arrière-plan */}
      <path
        d="M3 24 L12 11 L16 16.5"
        stroke={accent}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pouls : ligne de base, petite onde, pic-sommet, retour au calme */}
      <path
        d="M3 24 H9 L11.5 20 L14 26 L20 6 L25 24 H29"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-ats-text">
      <LogoMark />
      {withText && (
        <span className="text-[17px] font-extrabold lowercase leading-none tracking-tight text-ats-text">
          trena
        </span>
      )}
    </span>
  );
}
