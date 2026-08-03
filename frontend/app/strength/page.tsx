import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StrengthDashboard from '@/components/strength/StrengthDashboard'

export const metadata = {
  title: 'Module Strength - Entraînement Musculaire',
  description: 'Gérez vos séances de musculation et suivez votre progression',
}

export default async function StrengthPage() {
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
        <h1 className="text-4xl font-bold mb-2">Module Strength</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Planifiez, exécutez et suivez vos séances de musculation
        </p>
      </div>

      <StrengthDashboard userId={user.id} />
    </main>
  )
}
