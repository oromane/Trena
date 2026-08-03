'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Exercise {
  id: string
  name: string
  slug: string
  muscle_primary: string
  muscles_secondary: string[]
  equipment: string[]
}

interface ExerciseListProps {
  muscle?: string
  limit?: number
}

export default function ExerciseList({ muscle, limit = 50 }: ExerciseListProps) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMuscle, setSelectedMuscle] = useState(muscle || '')

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true)
        const query = new URLSearchParams()
        if (selectedMuscle) query.append('muscle', selectedMuscle)
        query.append('limit', limit.toString())

        const response = await fetch(`/api/strength/exercises?${query.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch exercises')

        const data = await response.json()
        setExercises(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setExercises([])
      } finally {
        setLoading(false)
      }
    }

    fetchExercises()
  }, [selectedMuscle, limit])

  if (loading) return <div className="text-center py-8">Chargement des exercices...</div>
  if (error) return <div className="text-red-500 text-center py-8">Erreur: {error}</div>

  const muscles = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedMuscle('')}
          className={`px-4 py-2 rounded-lg transition ${
            selectedMuscle === ''
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
        >
          Tous
        </button>
        {muscles.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMuscle(m)}
            className={`px-4 py-2 rounded-lg transition capitalize ${
              selectedMuscle === m
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Liste des exercices */}
      <div className="grid gap-4">
        {exercises.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucun exercice trouvé</p>
        ) : (
          exercises.map((exercise) => (
            <Link
              key={exercise.id}
              href={`/strength/sessions/new?exercise=${exercise.id}`}
              className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
            >
              <h3 className="font-bold text-lg">{exercise.name}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm capitalize">
                  {exercise.muscle_primary}
                </span>
                {exercise.muscles_secondary.map((m) => (
                  <span
                    key={m}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-sm capitalize"
                  >
                    {m}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-1 flex-wrap">
                {exercise.equipment.map((eq) => (
                  <span key={eq} className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {eq}
                  </span>
                ))}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
