import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExerciseList from '@/components/strength/ExerciseList'

export const metadata = {
  title: 'Exercices - Module Strength',
  description: 'Sélectionnez un exercice pour créer une séance',
}

export default async function ExercisesPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Sélectionner un exercice</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Choisissez un exercice pour démarrer une nouvelle séance
        </p>
      </div>

      <ExerciseList limit={100} />
    </main>
  )
}
