'use client';

import { useFormStatus } from 'react-dom';
import Spinner from './Spinner';

/**
 * Bouton de soumission pour les form actions serveur : affiche un spinner
 * et se désactive automatiquement pendant l'exécution de l'action.
 */
export default function SubmitButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} disabled={pending || rest.disabled} aria-busy={pending}>
      {pending && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
