'use client'

import { useState } from 'react'

interface SessionCreatorProps {
  userId: string
  exerciseId?: string
  onSuccess: (sessionId: string) => void
}

export default function SessionCreator({ userId, exerciseId, onSuccess }: SessionCreatorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    sessionDate: new Date().toISOString().split('T')[0],
    setsPlanned: 3,
    repsMin: 6,
    repsMax: 10,
    targetRir: 2,
    loadPlannedKg: 100,
    restSeconds: 120,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!exerciseId) throw new Error('Exercise ID is required')

      const payload = {
        user_id: userId,
        session_date: formData.sessionDate,
        prescriptions: [
          {
            exercise_id: exerciseId,
            exercise_order: 1,
            sets_planned: formData.setsPlanned,
            reps_min: formData.repsMin,
            reps_max: formData.repsMax,
            target_rir: formData.targetRir,
            load_planned_kg: formData.loadPlannedKg,
            rest_seconds: formData.restSeconds,
          },
        ],
      }

      const response = await fetch('/api/strength/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to create session')

      const data = await response.json()
      onSuccess(data.session_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-medium mb-2">Date de la séance</label>
        <input
          type="date"
          value={formData.sessionDate}
          onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Séries prévues</label>
          <input
            type="number"
            min="1"
            max="10"
            value={formData.setsPlanned}
            onChange={(e) => setFormData({ ...formData, setsPlanned: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Reps min-max</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="20"
              value={formData.repsMin}
              onChange={(e) => setFormData({ ...formData, repsMin: parseInt(e.target.value) })}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            <input
              type="number"
              min="1"
              max="20"
              value={formData.repsMax}
              onChange={(e) => setFormData({ ...formData, repsMax: parseInt(e.target.value) })}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Charge prévue (kg)</label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={formData.loadPlannedKg}
            onChange={(e) => setFormData({ ...formData, loadPlannedKg: parseFloat(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">RIR cible</label>
          <input
            type="number"
            min="0"
            max="5"
            value={formData.targetRir}
            onChange={(e) => setFormData({ ...formData, targetRir: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Repos entre séries (secondes)</label>
        <input
          type="number"
          min="30"
          max="300"
          step="15"
          value={formData.restSeconds}
          onChange={(e) => setFormData({ ...formData, restSeconds: parseInt(e.target.value) })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
        />
      </div>

      {error && <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
      >
        {loading ? 'Création...' : 'Créer la séance'}
      </button>
    </form>
  )
}
