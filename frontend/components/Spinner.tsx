import { Loader2 } from 'lucide-react';

/** Icône de chargement (spinner) réutilisable. */
export default function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden="true" />;
}
