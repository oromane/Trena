/**
 * Logo Trena — montagne (relief), route (ligne verticale), trajectoire (courbe).
 * Monochrome via currentColor ; l'accent (trajectoire) hérite ou se force.
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
    >
      {/* A — montagne */}
      <path
        d="M4 24 L12 8 L17 17"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* T — la route : verticale descendant du sommet */}
      <path
        d="M12 8 L12 28"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* S — la trajectoire */}
      <path
        d="M28 9 C21 9 21 15.5 25 17 C29 18.5 29 25 21 25"
        stroke={accent}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-ats-text">
      <LogoMark />
      {withText && (
        <span className="text-sm font-bold tracking-[0.18em] text-ats-text">
          TRENA
        </span>
      )}
    </span>
  );
}
