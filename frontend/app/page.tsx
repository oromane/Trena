import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';

// La page d'accueil mène directement à l'authentification (connexion par
// défaut), ou au cockpit si une session est déjà active.
export default async function Home() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? '/dashboard' : '/login');
}
