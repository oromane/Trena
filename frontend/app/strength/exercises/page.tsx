'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import ExerciseList from '@/components/strength/ExerciseList'

export default function ExercisesPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createSupabaseBrowser()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
      setLoading(false)
    }

    getUser()
  }, [router])

  if (loading) return <div className="text-center py-8">Chargement...</div>
  if (!user) return null

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
