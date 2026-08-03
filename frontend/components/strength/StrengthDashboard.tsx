'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ReadinessData {
  user_id: string
  recovery_status: 'green' | 'yellow' | 'red'
  last_session_date: string | null
  days_since_last_session: number | null
  average_tonnage_weekly: number | null
}

interface StrengthDashboardProps {
  userId: string
}

export default function StrengthDashboard({ userId }: StrengthDashboardProps) {
  const [readiness, setReadiness] = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReadiness = async () => {
      try {
        const response = await fetch(`/api/strength/readiness?user_id=${userId}`)
        if (!response.ok) throw new Error('Failed to fetch readiness')
        const data = await response.json()
        setReadiness(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchReadiness()
  }, [userId])

  if (loading) return <div className="text-center py-8">Chargement du dashboard...</div>
  if (error) return <div className="text-red-500 text-center py-8">Erreur: {error}</div>
  if (!readiness) return <div className="text-gray-500 text-center py-8">Aucune donnée</div>

  const statusColors = {
    green: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
    red: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
  }

  const statusText = {
    green: 'Récupération optimale',
    yellow: 'À surveiller',
    red: 'Repos recommandé',
  }

  return (
    <div className="space-y-6">
      {/* État de récupération */}
      <div className={`p-6 rounded-lg border-2 ${statusColors[readiness.recovery_status]}`}>
        <h2 className="text-2xl font-bold mb-2">État de récupération</h2>
        <p className="text-lg mb-4">{statusText[readiness.recovery_status]}</p>
        <div className="space-y-2 text-sm">
          {readiness.last_session_date && (
            <p>Dernière séance: <span className="font-bold">{readiness.last_session_date}</span></p>
          )}
          {readiness.average_tonnage_weekly && (
            <p>Tonnage moyen/semaine: <span className="font-bold">{readiness.average_tonnage_weekly.toFixed(0)} kg</span></p>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/strength/exercises"
          className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
        >
          <h3 className="font-bold text-lg mb-2">Nouvelle séance</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Sélectionner un exercice</p>
        </Link>

        <Link
          href="/strength/history"
          className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
        >
          <h3 className="font-bold text-lg mb-2">Historique</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Voir vos séances passées</p>
        </Link>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">0</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Séances ce mois</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">0 kg</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tonnage total</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">0</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Exercices</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">0</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Progressions</p>
        </div>
      </div>
    </div>
  )
}
