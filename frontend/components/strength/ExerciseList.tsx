'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Dumbbell, SearchX } from 'lucide-react'

interface Exercise {
  id: string
  name: string
  slug: string
  muscle_primary: string
  muscles_secondary: string[]
  equipment: string[]
  image_url: string | null
  instructions_steps?: string[] | null
}

interface ExerciseListProps {
  muscle?: string
  limit?: number
}

const MUSCLES = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Pectoraux',
  back: 'Dos',
  legs: 'Jambes',
  shoulders: 'Épaules',
  arms: 'Bras',
  core: 'Sangle abdo',
}

export default function ExerciseList({ muscle, limit = 50 }: ExerciseListProps) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMuscle, setSelectedMuscle] = useState(muscle || '')
  // Catalogue en consultation : la fiche se déplie sur place, il n'y a plus
  // de création de séance vers laquelle naviguer.
  const [openId, setOpenId] = useState<string | null>(null)

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

  return (
    <div className="space-y-6">
      {/* Filtres — pilules horizontales scrollables sur mobile */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          onClick={() => setSelectedMuscle('')}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            selectedMuscle === ''
              ? 'bg-ats-green text-white'
              : 'card-2 text-ats-muted hover:text-ats-text'
          }`}
        >
          Tous
        </button>
        {MUSCLES.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMuscle(m)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedMuscle === m
                ? 'bg-ats-green text-white'
                : 'card-2 text-ats-muted hover:text-ats-text'
            }`}
          >
            {MUSCLE_LABELS[m] ?? m}
          </button>
        ))}
      </div>

      {/* Liste des exercices */}
      {loading ? (
        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card-2 animate-pulse p-3" style={{ height: 88 }} />
          ))}
        </div>
      ) : error ? (
        <div className="card border border-ats-red/30 p-6 text-sm text-ats-red-fg">Erreur : {error}</div>
      ) : exercises.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center text-ats-muted">
          <SearchX className="h-6 w-6 text-ats-gray" />
          Aucun exercice trouvé
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {exercises.map((exercise) => (
            <div key={exercise.id} className="card-2 overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setOpenId(openId === exercise.id ? null : exercise.id)
              }
              aria-expanded={openId === exercise.id}
              className="group flex w-full items-center gap-4 p-3 text-left transition-colors hover:bg-ats-card"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ats-bg2">
                {exercise.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={exercise.image_url}
                    alt={exercise.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <Dumbbell className={`h-6 w-6 text-ats-gray ${exercise.image_url ? 'hidden' : ''}`} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold capitalize">{exercise.name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-ats-green/10 px-2.5 py-0.5 text-xs font-medium capitalize text-ats-green-fg">
                    {MUSCLE_LABELS[exercise.muscle_primary] ?? exercise.muscle_primary}
                  </span>
                  {exercise.muscles_secondary.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-ats-bg2 px-2.5 py-0.5 text-xs capitalize text-ats-muted"
                    >
                      {m}
                    </span>
                  ))}
                </div>
                {exercise.equipment.length > 0 && (
                  <p className="mt-1.5 text-xs capitalize text-ats-gray">
                    {exercise.equipment.join(' · ')}
                  </p>
                )}
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-ats-gray transition-transform ${
                  openId === exercise.id ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openId === exercise.id && (
              <div className="border-t border-white/5 px-4 pb-4 pt-3">
                {exercise.instructions_steps?.length ? (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ats-gray">
                      Repères d&apos;exécution
                    </p>
                    <ol className="mt-2 space-y-1.5">
                      {exercise.instructions_steps.map((step, i) => (
                        <li
                          key={i}
                          className="flex gap-2.5 text-[12px] leading-relaxed text-ats-muted"
                        >
                          <span className="metric shrink-0 text-ats-green-fg">
                            {i + 1}.
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <p className="text-[12px] text-ats-gray">
                    Aucun repère d&apos;exécution disponible pour cet exercice.
                  </p>
                )}
              </div>
            )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
