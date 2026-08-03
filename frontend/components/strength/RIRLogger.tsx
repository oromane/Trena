'use client'

import { useState } from 'react'
import { SubmitButton } from '@/components/SubmitButton'

interface RIRLoggerProps {
  sessionId: string
  prescriptionId: string
  setNumber: number
  targetReps: number
  targetLoad: number
  onSuccess: () => void
}

export default function RIRLogger({
  sessionId,
  prescriptionId,
  setNumber,
  targetReps,
  targetLoad,
  onSuccess,
}: RIRLoggerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    repsCompleted: targetReps,
    rirActual: 2,
    loadKg: targetLoad,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/strength/sessions/${sessionId}/rir?prescription_id=${prescriptionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reps_completed: formData.repsCompleted,
            rir_actual: formData.rirActual,
            load_kg: formData.loadKg,
          }),
        }
      )

      if (!response.ok) throw new Error('Failed to log RIR')

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 border border-gray-300 dark:border-gray-600 rounded-lg space-y-4">
      <h3 className="text-lg font-bold">Série {setNumber}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Reps complétées</label>
          <input
            type="number"
            min="1"
            max="50"
            value={formData.repsCompleted}
            onChange={(e) => setFormData({ ...formData, repsCompleted: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-center text-2xl font-bold"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">RIR</label>
          <input
            type="number"
            min="0"
            max="10"
            value={formData.rirActual}
            onChange={(e) => setFormData({ ...formData, rirActual: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-center text-2xl font-bold"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Charge (kg)</label>
        <input
          type="number"
          step="0.5"
          value={formData.loadKg}
          onChange={(e) => setFormData({ ...formData, loadKg: parseFloat(e.target.value) })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-center text-xl font-bold"
        />
      </div>

      {error && <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">{error}</div>}

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tonnage : <span className="font-bold text-lg">{(formData.repsCompleted * formData.loadKg).toFixed(0)} kg</span>
        </p>
      </div>

      <SubmitButton disabled={loading} className="w-full">
        {loading ? 'Enregistrement...' : 'Enregistrer la série'}
      </SubmitButton>
    </form>
  )
}
