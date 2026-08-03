'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import RIRLogger from '@/components/strength/RIRLogger'

interface Prescription {
  id: string
  exercise_id: string
  exercise_order: number
  sets_planned: number
  reps_min: number
  reps_max: number
  target_rir: number
  load_planned_kg: number
}

interface Session {
  session_id: string
  prescriptions: Prescription[]
}

export default function SessionPage() {
  const params = useParams()
  const sessionId = params.id as string
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSetIndex, setCurrentSetIndex] = useState(0)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createSupabaseBrowser()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  useEffect(() => {
    if (!user) return

    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/strength/sessions?session_id=${sessionId}&user_id=${user.id}`)
        if (!response.ok) throw new Error('Failed to fetch session')
        const data = await response.json()
        setSession(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [user, sessionId])

  if (loading) return <div className="text-center py-8">Chargement de la séance...</div>
  if (error) return <div className="text-red-500 text-center py-8">Erreur: {error}</div>
  if (!session) return <div className="text-gray-500 text-center py-8">Séance non trouvée</div>

  const prescription = session.prescriptions[0] // Première prescription pour maintenant
  const setsToLog = prescription.sets_planned
  const nextSetNumber = currentSetIndex + 1

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Séance d'entraînement</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Session {sessionId.substring(0, 8)}...
        </p>
      </div>

      {/* Progression */}
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-4">
          <p className="font-medium">
            Série {nextSetNumber} / {setsToLog}
          </p>
          <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${(nextSetNumber / setsToLog) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Logger RIR */}
      <RIRLogger
        sessionId={sessionId}
        prescriptionId={prescription.id}
        setNumber={nextSetNumber}
        targetReps={prescription.reps_max}
        targetLoad={prescription.load_planned_kg}
        onSuccess={() => {
          if (nextSetNumber < setsToLog) {
            setCurrentSetIndex(currentSetIndex + 1)
          } else {
            alert('Séance terminée!')
          }
        }}
      />

      {/* Détails de la prescription */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2 text-sm">
        <p>
          <strong>Plage de reps:</strong> {prescription.reps_min}-{prescription.reps_max}
        </p>
        <p>
          <strong>Charge prévue:</strong> {prescription.load_planned_kg} kg
        </p>
        <p>
          <strong>RIR cible:</strong> {prescription.target_rir}
        </p>
        <p>
          <strong>Repos:</strong> 120 secondes
        </p>
      </div>
    </main>
  )
}
