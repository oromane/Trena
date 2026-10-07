import { redirect } from 'next/navigation';

/**
 * Le contenu de cette page a été fusionné dans /profile (section
 * "Métriques physiologiques"). Redirection pour les liens existants.
 */
export default function MetricsPage() {
  redirect('/profile');
}
