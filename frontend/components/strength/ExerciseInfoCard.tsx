'use client'

import { Dumbbell, ListChecks } from 'lucide-react'

export interface ExerciseInfo {
  id: string
  name: string
  muscle_primary: string
  muscles_secondary?: string[]
  equipment: string[]
  image_url: string | null
  instructions_steps?: string[] | null
}

/**
 * Carte exercice : photo, nom, groupe musculaire ciblé + secondaires,
 * équipement, et repères clés (étapes structurées issues du dataset,
 * pas de texte généré) — utilisée sur les pages de création et d'exécution
 * de séance.
 */
export default function ExerciseInfoCard({
  exercise,
  compact = false,
  hideHeader = false,
  hideSteps = false,
}: {
  exercise: ExerciseInfo | null
  compact?: boolean
  hideHeader?: boolean
  hideSteps?: boolean
}) {
  const secondary = exercise?.muscles_secondary?.slice(1, 3) ?? []
  const steps = exercise?.instructions_steps ?? []

  return (
    <div className="space-y-3">
      {!hideHeader && (
        <div className="card-2 flex items-center gap-4 p-4">
          <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ats-bg2 ${compact ? 'h-16 w-16' : 'h-20 w-20'}`}>
            {exercise?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={exercise.image_url}
                alt={exercise.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
            ) : null}
            <Dumbbell className={`h-6 w-6 text-ats-gray ${exercise?.image_url ? 'hidden' : ''}`} />
          </div>
          <div className="min-w-0 flex-1">
            {exercise ? (
              <>
                <h2 className={`truncate font-bold capitalize ${compact ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
                  {exercise.name}
                </h2>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-ats-green/10 px-2.5 py-0.5 text-xs font-medium capitalize text-ats-green-fg">
                    Cible : {exercise.muscle_primary}
                  </span>
                  {secondary.map((m) => (
                    <span key={m} className="rounded-full bg-ats-bg2 px-2.5 py-0.5 text-xs capitalize text-ats-muted">
                      {m}
                    </span>
                  ))}
                  {exercise.equipment.map((eq) => (
                    <span key={eq} className="rounded-full bg-ats-bg2 px-2.5 py-0.5 text-xs capitalize text-ats-muted">
                      {eq}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-5 w-32 animate-pulse rounded bg-ats-bg2" />
            )}
          </div>
        </div>
      )}

      {!hideSteps && steps.length > 0 && (
        <div className="card-2 p-4">
          <div className="mb-3 flex items-center gap-2 text-ats-gray">
            <ListChecks className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wide">Repères clés</span>
          </div>
          <ol className="space-y-2 text-sm text-ats-muted">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="metric shrink-0 font-bold text-ats-green-fg">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
