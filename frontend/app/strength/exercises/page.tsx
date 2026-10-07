'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Spinner from '@/components/Spinner'
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

  if (loading) {
    return (
      <>
        <Nav />
        <main className="mx-auto flex max-w-6xl 2xl:max-w-[88rem] items-center justify-center gap-3 px-6 py-24 text-ats-muted">
          <Spinner className="h-5 w-5" />
          Chargement...
        </main>
      </>
    )
  }
  if (!user) return null

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl 2xl:max-w-[88rem] space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Choisir un exercice</h1>
          <p className="mt-1 text-ats-muted">
            Sélectionne un exercice pour démarrer une nouvelle séance
          </p>
        </div>

        <ExerciseList limit={100} />
      </main>
      <Footer />
    </>
  )
}
