'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SessionCreator from '@/components/strength/SessionCreator'

export default function NewSessionPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const exerciseId = searchParams.get('exercise')
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
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
  if (!exerciseId) {
    return <div className="text-center py-8">Exercice non sélectionné</div>
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Créer une nouvelle séance</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configurez les paramètres de votre séance
        </p>
      </div>

      <SessionCreator
        userId={user.id}
        exerciseId={exerciseId}
        onSuccess={(sessionId) => {
          router.push(`/strength/sessions/${sessionId}`)
        }}
      />
    </main>
  )
}
